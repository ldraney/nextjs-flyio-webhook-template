'use client';
import { useState } from 'react';
import Link from 'next/link';

interface ImportResult {
  success: boolean;
  formulasImported: number;
  formulasUpdated: number;
  formulasWithIssues: number;
  ingredientsImported: number;
  errors: string[];
  warnings: string[];
}

interface FormulaPreview {
  name: string;
  ingredients: {
    name: string;
    inci_name: string;
    percentage: number;
  }[];
  totalPercentage: number;
  isValid: boolean;
  warnings: string[];
}

interface PreviewResult {
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

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setPreview(null);
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    setPreviewing(true);
    setPreview(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/preview', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        setPreview({
          success: false,
          totalRows: 0,
          validRows: 0,
          invalidRows: 0,
          formulas: [],
          uniqueIngredients: [],
          newFormulas: 0,
          updatedFormulas: 0,
          errors: [data.error || 'Failed to preview CSV', ...(data.details ? [data.details] : [])],
          warnings: []
        });
      } else {
        setPreview(data);
      }
    } catch (error) {
      console.error('Preview error:', error);
      setPreview({
        success: false,
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        formulas: [],
        uniqueIngredients: [],
        newFormulas: 0,
        updatedFormulas: 0,
        errors: [`Network error: ${error instanceof Error ? error.message : 'Failed to preview file'}`],
        warnings: []
      });
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        formulasImported: 0,
        formulasUpdated: 0,
        formulasWithIssues: 0,
        ingredientsImported: 0,
        errors: ['Network error: Failed to upload file'],
        warnings: []
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to Home
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-8">CSV Import</h1>
      
      <div className="max-w-2xl bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Select CSV File
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-full file:border-0
                       file:text-sm file:font-semibold
                       file:bg-blue-50 file:text-blue-700
                       hover:file:bg-blue-100"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {file.name} ({Math.round(file.size / 1024)}KB)
            </p>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={handlePreview}
            disabled={!file || previewing}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg
                       hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {previewing ? 'Previewing...' : 'Preview CSV'}
          </button>

          <button
            onClick={handleImport}
            disabled={!file || importing || !preview?.success}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg
                       hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {importing ? 'Importing...' : 'Import CSV'}
          </button>

          {preview && !preview.success && (
            <p className="text-sm text-red-600 text-center">
              Please preview the CSV first and fix any issues before importing
            </p>
          )}
        </div>
      </div>

      {result && (
        <div className="max-w-2xl mt-6">
          <div className={`rounded-lg p-6 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h2 className="text-xl font-semibold mb-4">
              {result.success ? '✅ Import Successful' : '❌ Import Failed'}
            </h2>
            
            <div className="space-y-2">
              <p><strong>New Formulas:</strong> {result.formulasImported}</p>
              <p><strong>Updated Formulas:</strong> {result.formulasUpdated}</p>
              <p><strong>Formulas with Issues:</strong> <span className="text-orange-600">{result.formulasWithIssues}</span></p>
              <p><strong>Total Formulas:</strong> {result.formulasImported + result.formulasUpdated}</p>
              <p><strong>Ingredients Imported:</strong> {result.ingredientsImported}</p>
            </div>

            {result.errors.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-red-700 mb-2">Errors:</h3>
                <ul className="list-disc list-inside text-sm text-red-600">
                  {result.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-yellow-700 mb-2">Warnings:</h3>
                <ul className="list-disc list-inside text-sm text-yellow-600 max-h-40 overflow-y-auto">
                  {result.warnings.slice(0, 10).map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                  {result.warnings.length > 10 && (
                    <li className="font-medium">... and {result.warnings.length - 10} more warnings</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {preview && (
        <div className="max-w-6xl mt-6">
          <div className={`rounded-lg p-6 ${preview.success ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'}`}>
            <h2 className="text-xl font-semibold mb-4">
              📊 CSV Preview Results
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{preview.totalRows}</div>
                <div className="text-sm text-gray-600">Total Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{preview.validRows}</div>
                <div className="text-sm text-gray-600">Valid Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">{preview.newFormulas}</div>
                <div className="text-sm text-gray-600">New Formulas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{preview.updatedFormulas}</div>
                <div className="text-sm text-gray-600">Updated Formulas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{preview.formulas.length}</div>
                <div className="text-sm text-gray-600">Total Formulas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{preview.uniqueIngredients.length}</div>
                <div className="text-sm text-gray-600">Unique Ingredients</div>
              </div>
            </div>

            {preview.errors.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-red-700 mb-2">Errors:</h3>
                <ul className="list-disc list-inside text-sm text-red-600">
                  {preview.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {preview.warnings.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-yellow-700 mb-2">Warnings:</h3>
                <ul className="list-disc list-inside text-sm text-yellow-600 max-h-40 overflow-y-auto">
                  {preview.warnings.slice(0, 5).map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                  {preview.warnings.length > 5 && (
                    <li className="font-medium">... and {preview.warnings.length - 5} more warnings</li>
                  )}
                </ul>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700">Formula Preview:</h3>
              <div className="max-h-96 overflow-y-auto">
                {preview.formulas.slice(0, 10).map((formula, index) => (
                  <div key={index} className="border rounded-lg p-4 mb-4 bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{formula.name}</h4>
                      <span className={`text-sm px-2 py-1 rounded ${
                        formula.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {formula.totalPercentage.toFixed(2)}%
                      </span>
                    </div>
                    
                    {formula.warnings.length > 0 && (
                      <div className="mb-2">
                        <p className="text-sm text-yellow-600">⚠️ {formula.warnings.join(', ')}</p>
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-600">
                      {formula.ingredients.length} ingredients: {formula.ingredients.slice(0, 3).map(ing => ing.name).join(', ')}
                      {formula.ingredients.length > 3 && ` + ${formula.ingredients.length - 3} more`}
                    </div>
                  </div>
                ))}
                {preview.formulas.length > 10 && (
                  <div className="text-center text-gray-500 text-sm">
                    ... and {preview.formulas.length - 10} more formulas
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Sample Ingredients ({preview.uniqueIngredients.length} total):</h4>
              <div className="text-sm text-gray-600">
                {preview.uniqueIngredients.slice(0, 15).join(', ')}
                {preview.uniqueIngredients.length > 15 && ` + ${preview.uniqueIngredients.length - 15} more`}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">CSV Format Expected:</h3>
        <p className="text-sm text-gray-600 mb-2">
          The CSV should have the following columns:
        </p>
        <ul className="list-disc list-inside text-sm text-gray-600">
          <li><strong>Formula Name:</strong> Name of the cosmetic formula</li>
          <li><strong>Ingredient:</strong> Name of the ingredient</li>
          <li><strong>INCI:</strong> INCI name (optional)</li>
          <li><strong>Percentage:</strong> Percentage of ingredient (with or without % symbol)</li>
        </ul>
      </div>
    </div>
  );
}