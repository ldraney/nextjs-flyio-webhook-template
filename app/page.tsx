import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Cosmetics Data Hub</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link 
          href="/admin/import" 
          className="block p-6 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2">CSV Import</h2>
          <p className="text-gray-600">Upload and import formula data from CSV files</p>
        </Link>
        
        <Link 
          href="/admin/formulas" 
          className="block p-6 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2">Formulas</h2>
          <p className="text-gray-600">View and manage cosmetic formulas</p>
        </Link>
        
        <Link 
          href="/admin/ingredients" 
          className="block p-6 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2">Ingredients</h2>
          <p className="text-gray-600">Manage ingredient database</p>
        </Link>
      </div>
      
      <div className="mt-12 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">API Status</h3>
        <p className="text-sm text-gray-600">
          API endpoints available at:
        </p>
        <ul className="list-disc list-inside mt-2 text-sm text-gray-600">
          <li><code>/api/import</code> - CSV import endpoint</li>
          <li><code>/api/formulas</code> - Formula management</li>
          <li><code>/api/ingredients</code> - Ingredient management</li>
        </ul>
      </div>
    </main>
  );
}
