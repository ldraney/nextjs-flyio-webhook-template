import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeIngredients = searchParams.get('include_ingredients') === 'true';
    
    if (includeIngredients) {
      // Get formulas with their ingredients
      const result = await pool.query(`
        SELECT 
          f.id as formula_id,
          f.name as formula_name,
          f.version,
          f.created_date,
          COALESCE(
            json_agg(
              json_build_object(
                'ingredient_id', i.id,
                'ingredient_name', i.name,
                'inci_name', i.inci_name,
                'percentage', fi.percentage
              ) ORDER BY fi.percentage DESC
            ) FILTER (WHERE i.id IS NOT NULL),
            '[]'
          ) as ingredients
        FROM formulas f
        LEFT JOIN formula_ingredients fi ON f.id = fi.formula_id
        LEFT JOIN ingredients i ON fi.ingredient_id = i.id
        GROUP BY f.id, f.name, f.version, f.created_date
        ORDER BY f.name
      `);

      return NextResponse.json(result.rows);
    } else {
      // Get formulas only
      const result = await pool.query(`
        SELECT id, name, version, created_date, updated_date
        FROM formulas
        ORDER BY name
      `);

      return NextResponse.json(result.rows);
    }
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to fetch formulas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, version } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Formula name is required' }, { status: 400 });
    }

    const result = await pool.query(`
      INSERT INTO formulas (name, version)
      VALUES ($1, $2)
      RETURNING id, name, version, created_date
    `, [name, version || '1.0']);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Database error:', error);
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json({ error: 'Formula name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create formula' }, { status: 500 });
  }
}