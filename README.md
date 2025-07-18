# Cosmetics Data Hub v2

A centralized PostgreSQL database and web application for managing cosmetic laboratory data including formulas, ingredients, and pricing information. Built with Next.js 15, PostgreSQL, and deployed on Fly.io.

🎉 **Live Production Site**: [cosmetics-data-hub-v2.fly.dev](https://cosmetics-data-hub-v2.fly.dev)

## 🎯 **Purpose**

This application serves as a complete data management system for cosmetics laboratories, providing:

- **Formula Management** - Store and organize cosmetic formulas with ingredients and percentages
- **Ingredient Database** - Maintain a comprehensive catalog of cosmetic ingredients with INCI names
- **CSV Import System** - Bulk import formula data with preview and validation
- **Laboratory Interface** - User-friendly admin interface for lab technicians
- **API Access** - RESTful APIs for integration with other laboratory systems

## ✅ **What's Working**

🔥 **Core Features:**
- **CSV Import with Preview** - Upload and preview formulas before importing
- **Formula Management** - Complete CRUD operations for cosmetic formulas
- **Ingredient Database** - Manage ingredient catalog with INCI names and suppliers
- **Admin Interface** - Beautiful Tailwind CSS interface for data management
- **Real-time Validation** - Formula percentage validation with visual indicators

🚀 **Infrastructure:**
- **PostgreSQL Cluster** - Shared database supporting multiple applications
- **Automatic Migrations** - Database schema updates deploy automatically
- **Auto-scaling** - Scales to 0 when idle, auto-starts on requests
- **Health Monitoring** - Database connectivity and application health checks
- **SSL/TLS** - Automatic certificate management
- **Static File Serving** - Properly configured for Next.js standalone mode

## 🎯 **Live Application**

### **Main Features**
- **Homepage**: https://cosmetics-data-hub-v2.fly.dev
- **CSV Import**: https://cosmetics-data-hub-v2.fly.dev/admin/import
- **Formula Management**: https://cosmetics-data-hub-v2.fly.dev/admin/formulas
- **Ingredient Database**: https://cosmetics-data-hub-v2.fly.dev/admin/ingredients

### **API Endpoints**
- **Health Check**: https://cosmetics-data-hub-v2.fly.dev/api/webhook
- **Formula API**: https://cosmetics-data-hub-v2.fly.dev/api/formulas
- **Ingredient API**: https://cosmetics-data-hub-v2.fly.dev/api/ingredients
- **Import API**: https://cosmetics-data-hub-v2.fly.dev/api/import

## 🛠 **Technical Architecture**

### **Database Schema**
```sql
-- Core cosmetics data tables
CREATE TABLE formulas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    version VARCHAR(50) DEFAULT '1.0',
    status VARCHAR(20) DEFAULT 'needs_review',
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    inci_name VARCHAR(255),
    supplier_code VARCHAR(100),
    category VARCHAR(100),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE formula_ingredients (
    id SERIAL PRIMARY KEY,
    formula_id INTEGER REFERENCES formulas(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(formula_id, ingredient_id)
);
```

### **Infrastructure**
- **PostgreSQL Cluster**: `cosmetics-postgres` (shared across applications)
- **App Database**: `cosmetics_data_hub_v2` (isolated within cluster)
- **Deployment**: Rolling updates with health checks
- **Scaling**: Auto-stop/start based on traffic

## 🔧 **Key Technical Solutions**

### **1. Static File Serving Fix**
**Problem**: Tailwind CSS not loading in production (404 errors)
**Solution**: Updated Dockerfile for Next.js standalone mode:
```dockerfile
# Copy static files for standalone mode
RUN cp -r .next/static .next/standalone/.next/static
```

### **2. Database Migration System**
**Problem**: Multiple SQL migration files not being executed
**Solution**: Enhanced migration script to read SQL files:
```javascript
const migrations = [
  {
    version: '20250101_create_tables',
    sqlFile: 'db/migrations/001_create_tables.sql'
  },
  // ...
]

// Read and execute SQL files
const sqlFilePath = path.join(__dirname, '..', migration.sqlFile)
const sql = fs.readFileSync(sqlFilePath, 'utf8')
await client.query(sql)
```

### **3. Shared PostgreSQL Architecture**
**Problem**: Multiple applications needing shared database access
**Solution**: Fly.io unmanaged PostgreSQL with app-specific isolation:
```bash
# Create shared cluster
fly postgres create --name cosmetics-postgres

# Attach multiple apps (each gets own database)
fly postgres attach cosmetics-postgres -a cosmetics-data-hub-v2
fly postgres attach cosmetics-postgres -a formula-review-service
```

## 🚀 **Deployment Guide**

### **1. Prerequisites**
```bash
# Install Fly CLI and login
fly auth login

# Clone and setup
git clone https://github.com/your-org/cosmetics-data-hub-v2.git
cd cosmetics-data-hub-v2
npm install
```

### **2. Database Setup**
```bash
# Create PostgreSQL cluster
fly postgres create --name cosmetics-postgres --region sea --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 10

# Create app
fly apps create cosmetics-data-hub-v2

# Attach database (creates isolated database and user)
fly postgres attach cosmetics-postgres -a cosmetics-data-hub-v2
```

### **3. Deploy**
```bash
# Deploy with automatic migrations
fly deploy --now

# Verify deployment
curl https://cosmetics-data-hub-v2.fly.dev/api/webhook
```

## 📊 **Project Structure**

```
cosmetics-data-hub-v2/
├── app/
│   ├── admin/                    # Admin interface
│   │   ├── formulas/            # Formula management
│   │   ├── import/              # CSV import with preview
│   │   └── ingredients/         # Ingredient database
│   ├── api/                     # API endpoints
│   │   ├── formulas/           # Formula CRUD
│   │   ├── ingredients/        # Ingredient CRUD
│   │   ├── import/             # CSV import processing
│   │   ├── preview/            # CSV preview
│   │   └── webhook/            # Health checks
│   ├── globals.css             # Tailwind CSS
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Homepage
├── db/
│   └── migrations/             # SQL migration files
├── lib/
│   ├── database.ts             # Database utilities (template)
│   ├── db.ts                   # Database utilities (cosmetics)
│   ├── csv-import.ts           # CSV import logic
│   └── csv-preview.ts          # CSV preview logic
├── scripts/
│   ├── init-db.js              # Database initialization
│   └── migrate.js              # Migration runner
├── fly.toml                    # Fly.io configuration
├── Dockerfile                  # Production container
└── docker-compose.yml          # Local development
```

## 🔧 **Using This as a Template**

This project demonstrates production-ready patterns for complex applications and can serve as a foundation for similar projects. 

**📖 For detailed template usage, see**: [docs/USING-AS-TEMPLATE.md](docs/USING-AS-TEMPLATE.md)

### **Template Benefits**
- **Proven deployment pipeline** with Next.js 15 + PostgreSQL + Fly.io
- **Real-world feature integration** with CSV import and admin interfaces
- **Production-ready solutions** for common issues (CSS loading, database migrations)
- **Scalable architecture** with multi-app database sharing

### **Perfect For**
- Laboratory data management systems
- Inventory and catalog management
- CSV import/export applications
- Admin interfaces with database backends
- Multi-tenant SaaS platforms

### **Key Technical Solutions**
- **Static file serving fix** for Next.js standalone mode
- **SQL file-based migrations** for maintainable schema changes
- **Multi-app PostgreSQL** sharing with isolated databases
- **TypeScript strict mode** compliance for production reliability

## 📄 **License**

MIT License - feel free to use for any project!

---

**Built with** ❤️ **using Next.js 15, PostgreSQL, and Fly.io**