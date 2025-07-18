const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('postgres:5432') ? false : process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function runMigrations() {
  const client = await pool.connect()
  
  try {
    console.log('🔄 Running database migrations...')
    
    // Create migrations table to track applied migrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      );
    `)
    
    // Read and execute SQL migration files
    const fs = require('fs')
    const path = require('path')
    
    const migrations = [
      {
        version: '20250101_create_tables',
        sqlFile: 'db/migrations/001_create_tables.sql'
      },
      {
        version: '20250102_add_formula_status',
        sqlFile: 'db/migrations/002_add_formula_status.sql'
      },
      {
        version: '20250103_add_review_reasons',
        sqlFile: 'db/migrations/003_add_review_reasons.sql'
      }
    ]
    
    for (const migration of migrations) {
      const { rows } = await client.query(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [migration.version]
      )
      
      if (rows.length === 0) {
        console.log(`🔄 Applying migration: ${migration.version}`)
        
        // Read SQL file
        const sqlFilePath = path.join(__dirname, '..', migration.sqlFile)
        const sql = fs.readFileSync(sqlFilePath, 'utf8')
        
        // Execute SQL
        await client.query(sql)
        
        // Mark as applied
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [migration.version]
        )
        console.log(`✅ Migration applied: ${migration.version}`)
      } else {
        console.log(`⏭️ Migration already applied: ${migration.version}`)
      }
    }
    
    console.log('✅ All migrations completed successfully')
    
  } catch (error) {
    console.error('❌ Migration error:', error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

if (require.main === module) {
  runMigrations()
}

module.exports = { runMigrations }