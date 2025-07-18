import { parse } from 'csv-parse';
import { z } from 'zod';
import pool from './db';

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

export interface FormulaPreview {
  name: string;
  ingredients: {
    name: string;
    inci_name: string;
    percentage: number;
  }[];
  totalPercentage: number;
  isValid: boolean;
  warnings: string[];
  isNew: boolean;
  currentStatus?: string;
}

export interface CsvPreviewResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  formulas: FormulaPreview[];
  uniqueIngredients: string[];
  newFormulas: number;
  updatedFormulas: number;
  errors: string[];
  warnings: string[];
}

export async function previewCsvImport(csvContent: string): Promise<CsvPreviewResult> {
  const result: CsvPreviewResult = {
    success: false,
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    formulas: [],
    uniqueIngredients: [],
    newFormulas: 0,
    updatedFormulas: 0,
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

    result.totalRows = records.length;

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
        result.validRows++;
      } catch (error) {
        result.invalidRows++;
        result.warnings.push(`Invalid row: ${JSON.stringify(record)} - ${error}`);
      }
    }

    // Get existing formulas from database
    const existingFormulas = new Map<string, { id: number; status: string }>();
    try {
      const formulaNames = Array.from(formulaGroups.keys());
      if (formulaNames.length > 0) {
        const existingResult = await pool.query(
          'SELECT id, name, status FROM formulas WHERE name = ANY($1)',
          [formulaNames]
        );
        
        for (const row of existingResult.rows) {
          existingFormulas.set(row.name, { id: row.id, status: row.status });
        }
      }
    } catch (error) {
      result.warnings.push(`Warning: Could not check existing formulas - ${error}`);
    }

    // Process formulas
    for (const [formulaName, ingredients] of Array.from(formulaGroups.entries())) {
      if (ingredients.length === 0) continue;

      const totalPercentage = ingredients.reduce((sum, ing) => sum + ing.Percentage, 0);
      const warnings: string[] = [];

      if (totalPercentage > 100.1) {
        warnings.push(`Total percentage is ${totalPercentage.toFixed(2)}% (over 100%)`);
      } else if (totalPercentage < 99.5) {
        warnings.push(`Total percentage is ${totalPercentage.toFixed(2)}% (under 100%)`);
      }

      const existingFormula = existingFormulas.get(formulaName);
      const isNew = !existingFormula;

      if (isNew) {
        result.newFormulas++;
      } else {
        result.updatedFormulas++;
        if (existingFormula.status === 'approved') {
          warnings.push('Currently approved - will need re-review after import');
        }
      }

      const formulaPreview: FormulaPreview = {
        name: formulaName,
        ingredients: ingredients.map(ing => ({
          name: ing.Ingredient,
          inci_name: '',  // No INCI in this CSV format
          percentage: ing.Percentage
        })),
        totalPercentage,
        isValid: totalPercentage >= 99.5 && totalPercentage <= 100.5,
        warnings,
        isNew,
        currentStatus: existingFormula?.status
      };

      result.formulas.push(formulaPreview);
      
      if (warnings.length > 0) {
        result.warnings.push(`Formula "${formulaName}": ${warnings.join(', ')}`);
      }
    }

    result.uniqueIngredients = Array.from(ingredientSet).sort();
    result.success = true;

  } catch (error) {
    result.errors.push(`CSV parsing error: ${error}`);
  }

  return result;
}