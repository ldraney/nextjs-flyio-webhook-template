import { parse } from 'csv-parse';
import pool from './db';
import { z } from 'zod';

const FormulaCsvRowSchema = z.object({
  'Formula Name': z.string().min(1, 'Formula name is required'),
  'Ingredient': z.string().min(1, 'Ingredient name is required'),
  'Percentage': z.string().transform((val) => {
    // Remove % sign and quotes, then convert to number
    const cleanVal = val.replace(/["%]/g, '').trim();
    return parseFloat(cleanVal) || 0;
  })
});

export type FormulaCsvRow = z.infer<typeof FormulaCsvRowSchema>;

export interface ImportResult {
  success: boolean;
  formulasImported: number;
  formulasUpdated: number;
  formulasWithIssues: number;
  ingredientsImported: number;
  errors: string[];
  warnings: string[];
}

export async function importFormulasFromCsv(csvContent: string): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    formulasImported: 0,
    formulasUpdated: 0,
    formulasWithIssues: 0,
    ingredientsImported: 0,
    errors: [],
    warnings: []
  };

  try {
    const records = await new Promise<any[]>((resolve, reject) => {
      parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }, (err, records) => {
        if (err) reject(err);
        else resolve(records);
      });
    });

    // Validate CSV structure
    if (records.length === 0) {
      result.errors.push('CSV file is empty');
      return result;
    }

    // Group records by formula
    const formulaGroups = new Map<string, FormulaCsvRow[]>();
    const ingredientSet = new Set<string>();

    for (const record of records) {
      try {
        const validatedRow = FormulaCsvRowSchema.parse(record);
        
        // Include all rows, even with 0% (some formulas might have trace amounts)

        const formulaName = validatedRow['Formula Name'];
        if (!formulaGroups.has(formulaName)) {
          formulaGroups.set(formulaName, []);
        }
        formulaGroups.get(formulaName)!.push(validatedRow);
        ingredientSet.add(validatedRow.Ingredient);
      } catch (error) {
        result.warnings.push(`Invalid row: ${JSON.stringify(record)} - ${error}`);
      }
    }

    // Start database transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Insert ingredients first
      for (const ingredientName of Array.from(ingredientSet)) {
        await client.query(`
          INSERT INTO ingredients (name, inci_name) 
          VALUES ($1, $2) 
          ON CONFLICT (name) DO NOTHING
        `, [ingredientName, '']);
      }

      // Insert formulas and their ingredients
      for (const [formulaName, ingredients] of Array.from(formulaGroups.entries())) {
        // Skip formulas with no valid ingredients
        if (ingredients.length === 0) {
          continue;
        }

        // Validate percentage total and determine status
        const totalPercentage = ingredients.reduce((sum, ing) => sum + ing.Percentage, 0);
        const isValid = totalPercentage >= 99.5 && totalPercentage <= 100.5;
        const status = 'needs_review'; // All imported formulas need review initially
        
        if (totalPercentage > 100.1) {
          result.warnings.push(`Formula "${formulaName}" has total percentage of ${totalPercentage.toFixed(2)}% (over 100%)`);
        }
        
        const formulaResult = await client.query(`
          INSERT INTO formulas (name, status) 
          VALUES ($1, $2) 
          ON CONFLICT (name) DO UPDATE SET 
            updated_date = CURRENT_TIMESTAMP,
            status = CASE 
              WHEN formulas.status = 'approved' THEN 'needs_review'  -- Re-review if formula changed
              ELSE formulas.status  -- Keep existing status for other cases
            END
          RETURNING id, name, status, (xmax = 0) AS is_new_formula
        `, [formulaName, status]);

        const formulaId = formulaResult.rows[0].id;
        const isNewFormula = formulaResult.rows[0].is_new_formula;

        // Track new vs updated formulas
        if (isNewFormula) {
          result.formulasImported++;
        } else {
          result.formulasUpdated++;
        }

        // Clear existing ingredients for this formula
        await client.query('DELETE FROM formula_ingredients WHERE formula_id = $1', [formulaId]);

        // Analyze formula for review reasons
        const reviewReasons: string[] = [];
        
        // Check for duplicate ingredients
        const ingredientNames = ingredients.map(ing => ing.Ingredient);
        const duplicates = ingredientNames.filter((name, index) => ingredientNames.indexOf(name) !== index);
        if (duplicates.length > 0) {
          reviewReasons.push(`Duplicate ingredients: ${Array.from(new Set(duplicates)).join(', ')}`);
        }

        // Check percentage total
        if (totalPercentage > 100.1) {
          reviewReasons.push(`Total percentage: ${totalPercentage.toFixed(2)}% (over 100%)`);
        } else if (totalPercentage < 99.5) {
          reviewReasons.push(`Total percentage: ${totalPercentage.toFixed(2)}% (under 100%)`);
        }

        // Update formula with review reasons
        await client.query(`
          UPDATE formulas 
          SET review_reasons = $1 
          WHERE id = $2
        `, [reviewReasons, formulaId]);

        // Track formulas with issues
        if (reviewReasons.length > 0) {
          result.formulasWithIssues++;
          result.warnings.push(`Formula "${formulaName}": ${reviewReasons.join(', ')}`);
        }

        // Insert formula ingredients with error handling
        for (const ingredient of ingredients) {
          try {
            const ingredientResult = await client.query(
              'SELECT id FROM ingredients WHERE name = $1',
              [ingredient.Ingredient]
            );

            if (ingredientResult.rows.length > 0) {
              const ingredientId = ingredientResult.rows[0].id;

              await client.query(`
                INSERT INTO formula_ingredients (formula_id, ingredient_id, percentage)
                VALUES ($1, $2, $3)
                ON CONFLICT (formula_id, ingredient_id) 
                DO UPDATE SET percentage = EXCLUDED.percentage
              `, [formulaId, ingredientId, ingredient.Percentage]);
            }
          } catch (ingredientError) {
            // Don't fail entire import for ingredient issues
            result.warnings.push(`Formula "${formulaName}" ingredient "${ingredient.Ingredient}": ${ingredientError}`);
          }
        }
      }

      result.ingredientsImported = ingredientSet.size;
      await client.query('COMMIT');
      result.success = true;

    } catch (error) {
      await client.query('ROLLBACK');
      result.errors.push(`Database error: ${error}`);
    } finally {
      client.release();
    }

  } catch (error) {
    result.errors.push(`CSV parsing error: ${error}`);
  }

  return result;
}