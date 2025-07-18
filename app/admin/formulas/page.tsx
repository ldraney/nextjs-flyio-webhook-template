'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface Formula {
  formula_id: number;
  formula_name: string;
  version: string;
  created_date: string;
  ingredients: {
    ingredient_id: number;
    ingredient_name: string;
    inci_name: string;
    percentage: number;
  }[];
}

export default function FormulasPage() {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFormulas();
  }, []);

  const fetchFormulas = async () => {
    try {
      const response = await fetch('/api/formulas?include_ingredients=true');
      if (!response.ok) {
        throw new Error('Failed to fetch formulas');
      }
      const data = await response.json();
      setFormulas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading formulas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to Home
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-8">Formulas ({formulas.length})</h1>
      
      <div className="space-y-6">
        {formulas.map((formula) => {
          const totalPercentage = formula.ingredients.reduce((sum, ing) => sum + ing.percentage, 0);
          const isValidTotal = totalPercentage >= 99.5 && totalPercentage <= 100.5;
          
          return (
            <div key={formula.formula_id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{formula.formula_name}</h2>
                  <p className="text-sm text-gray-600">Version: {formula.version}</p>
                  <p className="text-sm text-gray-600">Created: {new Date(formula.created_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${isValidTotal ? 'text-green-600' : 'text-red-600'}`}>
                    Total: {totalPercentage.toFixed(2)}%
                  </p>
                  <p className="text-sm text-gray-600">
                    {formula.ingredients.length} ingredients
                  </p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Ingredient</th>
                      <th className="text-left py-2">INCI Name</th>
                      <th className="text-right py-2">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formula.ingredients.map((ingredient) => (
                      <tr key={ingredient.ingredient_id} className="border-b border-gray-100">
                        <td className="py-2">{ingredient.ingredient_name}</td>
                        <td className="py-2 text-gray-600">{ingredient.inci_name || '-'}</td>
                        <td className="py-2 text-right">{ingredient.percentage.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
      
      {formulas.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No formulas found.</p>
          <Link href="/admin/import" className="text-blue-600 hover:underline">
            Import some formulas from CSV
          </Link>
        </div>
      )}
    </div>
  );
}