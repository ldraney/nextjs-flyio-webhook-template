import { NextRequest, NextResponse } from 'next/server';
import { previewCsvImport } from '@/lib/csv-preview';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
    }

    const csvContent = await file.text();
    const result = await previewCsvImport(csvContent);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json({ 
      error: 'Failed to preview CSV',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'CSV Preview API',
    usage: 'POST with multipart/form-data containing a CSV file'
  });
}