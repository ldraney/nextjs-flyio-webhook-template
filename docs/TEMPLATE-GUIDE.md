# Template Guide: Building Production-Ready Applications

## 🚀 **Overview**

This template demonstrates how to build complex, production-ready applications using Next.js 15, PostgreSQL, and Fly.io. It combines a proven deployment pipeline with real-world application features.

## 🎯 **Template Goals**

### **Primary Objectives**
1. **Prove deployment pipeline works** with complex applications
2. **Demonstrate production-ready patterns** for database, CSS, and API development
3. **Provide reusable foundation** for similar projects
4. **Document common issues** and their solutions

### **Secondary Benefits**
1. **Reduce time-to-production** for new projects
2. **Establish best practices** for Next.js + PostgreSQL + Fly.io
3. **Create reference implementation** for common features
4. **Build confidence** in deployment processes

## 🏗️ **Architecture Patterns**

### **1. Database-First Design**
```sql
-- Define clear schema with relationships
CREATE TABLE entities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Use proper constraints and indexes
CREATE INDEX idx_entities_name ON entities(name);
CREATE INDEX idx_entities_created_at ON entities(created_at);
```

**Benefits**:
- Clear data relationships
- Automatic constraint enforcement
- Performance optimized with indexes
- Easy to reason about and modify

### **2. API-First Development**
```typescript
// app/api/entities/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = searchParams.get('limit') || '50'
  
  try {
    const entities = await getEntities(parseInt(limit))
    return NextResponse.json({ entities })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch entities' }, { status: 500 })
  }
}
```

**Benefits**:
- Clear separation of concerns
- Testable business logic
- Consistent error handling
- Easy to consume from frontend

### **3. Component-Based UI**
```tsx
// app/admin/entities/page.tsx
export default function EntitiesPage() {
  const [entities, setEntities] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchEntities()
  }, [])
  
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Entities</h1>
      {loading ? <LoadingSpinner /> : <EntitiesTable entities={entities} />}
    </main>
  )
}
```

**Benefits**:
- Reusable components
- Consistent styling with Tailwind
- Clear loading states
- Easy to extend and modify

## 🔧 **Production-Ready Features**

### **1. Database Migrations**
```javascript
// scripts/migrate.js
const migrations = [
  {
    version: '20250101_create_entities',
    sqlFile: 'db/migrations/001_create_entities.sql'
  },
  {
    version: '20250102_add_indexes',
    sqlFile: 'db/migrations/002_add_indexes.sql'
  }
]

// Automatic version tracking
for (const migration of migrations) {
  const { rows } = await client.query(
    'SELECT version FROM schema_migrations WHERE version = $1',
    [migration.version]
  )
  
  if (rows.length === 0) {
    const sql = fs.readFileSync(migration.sqlFile, 'utf8')
    await client.query(sql)
    await client.query(
      'INSERT INTO schema_migrations (version) VALUES ($1)',
      [migration.version]
    )
  }
}
```

**Benefits**:
- Automatic deployment with migrations
- Version tracking prevents duplicates
- SQL files are more maintainable
- Easy rollback capability

### **2. Health Checks**
```typescript
// app/api/health/route.ts
export async function GET() {
  try {
    const isDbHealthy = await checkDatabaseHealth()
    
    return NextResponse.json({
      status: 'healthy',
      database: isDbHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: error.message },
      { status: 500 }
    )
  }
}
```

**Benefits**:
- Fly.io load balancer integration
- Database connectivity verification
- Automatic failure detection
- Debugging information

### **3. Static File Serving**
```dockerfile
# Dockerfile
RUN npm run build
RUN cp -r .next/static .next/standalone/.next/static

CMD ["node", ".next/standalone/server.js"]
```

**Benefits**:
- CSS and assets load correctly
- Proper cache headers
- CDN-ready static files
- Next.js standalone mode compatible

## 📊 **Feature Categories**

### **Data Management**
- **CSV Import/Export**: File processing with preview
- **CRUD Operations**: Create, Read, Update, Delete
- **Data Validation**: Form and API validation
- **Bulk Operations**: Batch processing capabilities

### **User Interface**
- **Admin Dashboards**: Management interfaces
- **Form Handling**: Data input with validation
- **Data Tables**: Sortable, filterable lists
- **File Upload**: Document and image handling

### **API Design**
- **RESTful Endpoints**: Standard HTTP methods
- **Error Handling**: Consistent error responses
- **Authentication**: User access control
- **Rate Limiting**: API protection

### **Infrastructure**
- **Database Connection**: Pooling and optimization
- **Auto-scaling**: Traffic-based scaling
- **SSL/TLS**: Automatic certificates
- **Monitoring**: Health checks and logs

## 🎨 **Styling and UX**

### **Tailwind CSS Integration**
```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom components */
@layer components {
  .btn-primary {
    @apply bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded;
  }
}
```

### **Responsive Design**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => (
    <Card key={item.id} className="p-6">
      <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
      <p className="text-gray-600">{item.description}</p>
    </Card>
  ))}
</div>
```

### **Loading States**
```tsx
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
)
```

## 🔒 **Security Best Practices**

### **Input Validation**
```typescript
import { z } from 'zod'

const EntitySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(['type1', 'type2', 'type3'])
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = EntitySchema.parse(body)
    
    // Process validated data
    const result = await createEntity(validatedData)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    throw error
  }
}
```

### **Database Security**
```typescript
// Use parameterized queries
const result = await client.query(
  'SELECT * FROM entities WHERE name = $1 AND category = $2',
  [name, category]
)

// Never concatenate user input
// DON'T DO: `SELECT * FROM entities WHERE name = '${name}'`
```

### **Environment Variables**
```bash
# .env.local
DATABASE_URL=postgres://user:password@localhost:5432/dbname
NODE_ENV=development
API_SECRET=your-secret-key

# fly.toml
[env]
  NODE_ENV = "production"
  PORT = "3000"
```

## 🚀 **Deployment Strategies**

### **1. Development Environment**
```bash
# Local development with Docker
docker-compose up --build

# Local development with fly proxy
fly proxy 15432:5432 -a your-postgres-cluster
npm run dev
```

### **2. Staging Environment**
```bash
# Deploy to staging
fly deploy --app your-app-staging

# Test staging
curl https://your-app-staging.fly.dev/api/health
```

### **3. Production Environment**
```bash
# Deploy to production
fly deploy --app your-app-production

# Monitor deployment
fly logs --app your-app-production
fly status --app your-app-production
```

## 📈 **Performance Optimization**

### **Database Performance**
```typescript
// Connection pooling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})

// Query optimization
const result = await pool.query(`
  SELECT e.*, COUNT(r.id) as relation_count
  FROM entities e
  LEFT JOIN relations r ON e.id = r.entity_id
  WHERE e.created_at >= $1
  GROUP BY e.id
  ORDER BY e.created_at DESC
  LIMIT $2
`, [startDate, limit])
```

### **Frontend Performance**
```tsx
// Lazy loading
const LazyComponent = lazy(() => import('./HeavyComponent'))

// Memoization
const MemoizedList = memo(({ items }) => (
  <ul>
    {items.map(item => (
      <li key={item.id}>{item.name}</li>
    ))}
  </ul>
))

// Proper loading states
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)
```

## 🧪 **Testing Strategies**

### **API Testing**
```bash
# Test health endpoint
curl https://your-app.fly.dev/api/health

# Test CRUD operations
curl -X POST https://your-app.fly.dev/api/entities \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Entity", "category": "type1"}'
```

### **Database Testing**
```sql
-- Test migrations
SELECT * FROM schema_migrations ORDER BY applied_at DESC;

-- Test constraints
INSERT INTO entities (name) VALUES (''); -- Should fail
INSERT INTO entities (name) VALUES ('Test'); -- Should succeed
```

### **Frontend Testing**
```typescript
// Component testing
import { render, screen } from '@testing-library/react'

test('renders entity list', () => {
  render(<EntityList entities={mockEntities} />)
  expect(screen.getByText('Test Entity')).toBeInTheDocument()
})
```

## 🎯 **Use Cases for This Template**

### **Perfect For**
- **Laboratory Data Systems**: Scientific data management
- **Inventory Management**: Product and asset tracking
- **Recipe/Formula Databases**: Complex ingredient relationships
- **Content Management**: Document and media management
- **E-commerce Admin**: Product catalog management
- **CRM Systems**: Customer relationship management

### **Adaptable For**
- **SaaS Applications**: Multi-tenant platforms
- **Educational Platforms**: Course and content management
- **Healthcare Systems**: Patient and record management
- **Financial Applications**: Transaction and account management
- **IoT Dashboards**: Device and sensor data management

## 🔧 **Customization Examples**

### **1. Change Database Schema**
```sql
-- Replace cosmetics tables with your domain
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE product_categories (
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
);
```

### **2. Customize Admin Interface**
```tsx
// app/admin/products/page.tsx
export default function ProductsPage() {
  const [products, setProducts] = useState([])
  
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Product Management</h1>
      <ProductTable products={products} />
      <AddProductForm onAdd={handleAddProduct} />
    </main>
  )
}
```

### **3. Add New API Endpoints**
```typescript
// app/api/products/route.ts
export async function GET(request: NextRequest) {
  const products = await getProducts()
  return NextResponse.json({ products })
}

export async function POST(request: NextRequest) {
  const data = await request.json()
  const product = await createProduct(data)
  return NextResponse.json({ product })
}
```

## 🌟 **Best Practices Checklist**

### **Development**
- [ ] Use TypeScript for type safety
- [ ] Implement proper error handling
- [ ] Add input validation with schemas
- [ ] Use environment variables for configuration
- [ ] Implement logging with correlation IDs

### **Database**
- [ ] Use migrations for schema changes
- [ ] Add proper indexes for performance
- [ ] Use connection pooling
- [ ] Implement health checks
- [ ] Use parameterized queries

### **Frontend**
- [ ] Implement responsive design
- [ ] Add loading states
- [ ] Handle error states gracefully
- [ ] Use semantic HTML
- [ ] Optimize for accessibility

### **Deployment**
- [ ] Configure health checks
- [ ] Set up SSL/TLS
- [ ] Test static file serving
- [ ] Configure auto-scaling
- [ ] Set up monitoring

## 🚀 **Next Steps**

### **After Using This Template**
1. **Customize the database schema** for your domain
2. **Update the admin interface** with your entities
3. **Modify API endpoints** for your business logic
4. **Add authentication and authorization**
5. **Implement additional features** as needed

### **Contributing Back**
1. **Document any issues** you encounter
2. **Share solutions** for common problems
3. **Submit improvements** to the template
4. **Create examples** for different use cases

## 📚 **Resources**

### **Documentation**
- [Next.js Documentation](https://nextjs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Fly.io Documentation](https://fly.io/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### **Community**
- [Next.js Discord](https://discord.com/invite/nextjs)
- [Fly.io Community](https://community.fly.io/)
- [PostgreSQL Community](https://www.postgresql.org/community/)

---

**This template represents battle-tested patterns for building production-ready applications. Use it as a foundation for your projects and contribute improvements back to the community.**