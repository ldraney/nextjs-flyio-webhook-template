import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    
    let query = `
      SELECT 
        i.id,
        i.name,
        i.inci_name,
        i.supplier_code,
        i.category,
        i.created_date,
        COUNT(fi.formula_id) as formula_count
      FROM ingredients i
      LEFT JOIN formula_ingredients fi ON i.id = fi.ingredient_id
    `;
    
    const params: string[] = [];
    
    if (search) {
      query += ` WHERE i.name ILIKE $1 OR i.inci_name ILIKE $1`;
      params.push(`%${search}%`);
    }
    
    query += ` GROUP BY i.id, i.name, i.inci_name, i.supplier_code, i.category, i.created_date ORDER BY i.name`;
    
    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to fetch ingredients' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, inci_name, supplier_code, category } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Ingredient name is required' }, { status: 400 });
    }

    const result = await pool.query(`
      INSERT INTO ingredients (name, inci_name, supplier_code, category)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, inci_name, supplier_code, category, created_date
    `, [name, inci_name || null, supplier_code || null, category || null]);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Database error:', error);
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json({ error: 'Ingredient name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create ingredient' }, { status: 500 });
  }
}