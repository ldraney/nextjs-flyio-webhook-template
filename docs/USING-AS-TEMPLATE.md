# Using Cosmetics Data Hub v2 as a Template

## 🎯 **Overview**

This repository provides a battle-tested foundation for building production-ready data management applications with Next.js 15, PostgreSQL, and Fly.io. It combines proven deployment patterns with real-world features.

## 🚀 **Quick Start**

### **1. Clone and Setup**
```bash
# Clone the repository
git clone https://github.com/your-org/cosmetics-data-hub-v2.git my-data-app
cd my-data-app

# Install dependencies
npm install

# Update package.json
npm pkg set name="my-data-app"
npm pkg set description="My data management application"
```

### **2. Customize for Your Domain**

#### **Update Database Schema**
Replace the cosmetics schema with your domain:

```sql
-- db/migrations/001_create_tables.sql
CREATE TABLE your_entities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE your_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE entity_categories (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES your_entities(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES your_categories(id) ON DELETE CASCADE,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity_id, category_id)
);
```

#### **Update API Endpoints**
Replace cosmetics APIs with your domain:

```typescript
// app/api/entities/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getEntities, createEntity } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const entities = await getEntities()
    return NextResponse.json({ entities })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch entities' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const entity = await createEntity(data)
    return NextResponse.json({ entity })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create entity' }, { status: 500 })
  }
}
```

#### **Update Admin Interface**
Replace cosmetics admin pages:

```tsx
// app/admin/entities/page.tsx
'use client'
import { useState, useEffect } from 'react'

export default function EntitiesPage() {
  const [entities, setEntities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEntities()
  }, [])

  const fetchEntities = async () => {
    try {
      const response = await fetch('/api/entities')
      const data = await response.json()
      setEntities(data.entities)
    } catch (error) {
      console.error('Failed to fetch entities:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Entity Management</h1>
      {loading ? (
        <div className="text-center">Loading...</div>
      ) : (
        <div className="grid gap-6">
          {entities.map(entity => (
            <div key={entity.id} className="p-6 bg-white rounded-lg shadow">
              <h2 className="text-xl font-semibold">{entity.name}</h2>
              <p className="text-gray-600">{entity.description}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
```

#### **Update Database Utilities**
Replace cosmetics database functions:

```typescript
// lib/db.ts
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

export async function getEntities() {
  const result = await pool.query('SELECT * FROM your_entities ORDER BY created_date DESC')
  return result.rows
}

export async function createEntity(data: { name: string; description?: string }) {
  const result = await pool.query(
    'INSERT INTO your_entities (name, description) VALUES ($1, $2) RETURNING *',
    [data.name, data.description]
  )
  return result.rows[0]
}

export async function getEntityById(id: number) {
  const result = await pool.query('SELECT * FROM your_entities WHERE id = $1', [id])
  return result.rows[0]
}

export async function updateEntity(id: number, data: { name?: string; description?: string }) {
  const result = await pool.query(
    'UPDATE your_entities SET name = COALESCE($1, name), description = COALESCE($2, description), updated_date = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
    [data.name, data.description, id]
  )
  return result.rows[0]
}

export async function deleteEntity(id: number) {
  await pool.query('DELETE FROM your_entities WHERE id = $1', [id])
}
```

### **3. Deploy to Fly.io**

#### **Create Database**
```bash
# Create PostgreSQL cluster
fly postgres create --name my-data-postgres --region sea --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 10

# Create app
fly apps create my-data-app

# Attach database
fly postgres attach my-data-postgres -a my-data-app
```

#### **Deploy Application**
```bash
# Update fly.toml
# Change app name to match your app
app = 'my-data-app'

# Deploy
fly deploy --now
```

## 🎨 **Customization Examples**

### **E-commerce Inventory System**
```sql
-- Products and categories
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    price DECIMAL(10,2),
    stock_quantity INTEGER DEFAULT 0,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT
);
```

### **Scientific Data Management**
```sql
-- Experiments and samples
CREATE TABLE experiments (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'planning',
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE samples (
    id SERIAL PRIMARY KEY,
    experiment_id INTEGER REFERENCES experiments(id),
    sample_code VARCHAR(100) UNIQUE,
    data JSONB,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Content Management System**
```sql
-- Articles and tags
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    slug VARCHAR(255) UNIQUE,
    published BOOLEAN DEFAULT FALSE,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#3B82F6'
);
```

## 🔧 **Key Features to Keep**

### **1. Database Migrations**
The migration system automatically handles schema changes:
```javascript
// scripts/migrate.js - Keep this pattern
const migrations = [
  {
    version: '20250101_create_your_tables',
    sqlFile: 'db/migrations/001_create_your_tables.sql'
  }
]
```

### **2. Health Checks**
Keep the health check system for Fly.io:
```typescript
// app/api/health/route.ts
export async function GET() {
  const isDbHealthy = await checkDatabaseHealth()
  return NextResponse.json({
    status: 'healthy',
    database: isDbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  })
}
```

### **3. Static File Serving**
Keep the Dockerfile fix for CSS loading:
```dockerfile
# Copy static files for standalone mode
RUN cp -r .next/static .next/standalone/.next/static
```

### **4. CSV Import Pattern**
The CSV import system can be adapted for any data:
```typescript
// lib/csv-import.ts - Modify for your data format
const processRecord = (record: any) => {
  return {
    name: record['Name'],
    description: record['Description'],
    category: record['Category']
  }
}
```

## 🚀 **Advanced Customizations**

### **Add Authentication**
```typescript
// app/api/auth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()
  
  // Verify user credentials
  const user = await getUserByEmail(email)
  if (!user || !await bcrypt.compare(password, user.password)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  
  // Generate JWT token
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' })
  
  return NextResponse.json({ token, user: { id: user.id, email: user.email } })
}
```

### **Add File Upload**
```typescript
// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }
  
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  
  const filename = `${Date.now()}-${file.name}`
  const filepath = path.join(process.cwd(), 'public/uploads', filename)
  
  await writeFile(filepath, buffer)
  
  return NextResponse.json({ filename, url: `/uploads/${filename}` })
}
```

### **Add Real-time Updates**
```typescript
// app/api/ws/route.ts
import { NextRequest } from 'next/server'
import { WebSocketServer } from 'ws'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const upgrade = request.headers.get('upgrade')
  
  if (upgrade !== 'websocket') {
    return new Response('Expected websocket', { status: 400 })
  }
  
  // Handle WebSocket connection
  // Implementation depends on your hosting platform
}
```

## 📊 **Performance Optimization**

### **Database Indexing**
```sql
-- Add indexes for your queries
CREATE INDEX idx_entities_name ON your_entities(name);
CREATE INDEX idx_entities_created_date ON your_entities(created_date);
CREATE INDEX idx_entities_status ON your_entities(status);
```

### **Connection Pooling**
```typescript
// lib/db.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000, // 30 seconds
  connectionTimeoutMillis: 2000, // 2 seconds
})
```

### **Caching Strategy**
```typescript
// lib/cache.ts
const cache = new Map()

export function getCached<T>(key: string, fetcher: () => Promise<T>, ttl = 300000): Promise<T> {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < ttl) {
    return Promise.resolve(cached.data)
  }
  
  return fetcher().then(data => {
    cache.set(key, { data, timestamp: Date.now() })
    return data
  })
}
```

## 🔒 **Security Considerations**

### **Input Validation**
```typescript
import { z } from 'zod'

const EntitySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(['type1', 'type2', 'type3'])
})

// Use in API routes
const validatedData = EntitySchema.parse(requestData)
```

### **SQL Injection Prevention**
```typescript
// Always use parameterized queries
const result = await pool.query(
  'SELECT * FROM your_entities WHERE name = $1 AND category = $2',
  [name, category]
)

// Never do this:
// const result = await pool.query(`SELECT * FROM your_entities WHERE name = '${name}'`)
```

### **Environment Variables**
```bash
# .env.local
DATABASE_URL=postgres://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key
API_KEY=your-api-key
```

## 🎉 **Success Checklist**

### **Development**
- [ ] Database schema updated for your domain
- [ ] API endpoints customized
- [ ] Admin interface updated
- [ ] CSV import logic modified (if needed)
- [ ] Local development working

### **Deployment**
- [ ] PostgreSQL cluster created
- [ ] App created and database attached
- [ ] Environment variables configured
- [ ] Migrations run successfully
- [ ] Health checks passing

### **Production**
- [ ] CSS and static files loading
- [ ] All API endpoints responding
- [ ] Database queries working
- [ ] Auto-scaling functional
- [ ] SSL certificates active

## 📚 **Resources**

- **Original Template**: [nextjs-flyio-webhook-template](https://github.com/ldraney/nextjs-flyio-webhook-template)
- **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)
- **PostgreSQL Documentation**: [postgresql.org/docs](https://www.postgresql.org/docs/)
- **Fly.io Documentation**: [fly.io/docs](https://fly.io/docs/)
- **Tailwind CSS**: [tailwindcss.com](https://tailwindcss.com/)

## 🤝 **Contributing**

If you build something interesting with this template, consider:
- Sharing your customizations
- Reporting any issues you encounter
- Contributing improvements back to the template
- Creating examples for different use cases

---

**Happy building! This template provides a solid foundation for your data management applications.**