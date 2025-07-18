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
    
    // Example migration - add this pattern for future schema changes
    const migrations = [
      {
        version: '20250101_create_webhook_events',
        sql: `
          CREATE TABLE IF NOT EXISTS webhook_events (
            id SERIAL PRIMARY KEY,
            correlation_id VARCHAR(255) NOT NULL,
            event_type VARCHAR(255),
            payload JSONB,
            processed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `
      },
      {
        version: '20250102_add_webhook_indexes',
        sql: `
          CREATE INDEX IF NOT EXISTS idx_webhook_events_correlation_id 
          ON webhook_events(correlation_id);
          
          CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type 
          ON webhook_events(event_type);
          
          CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at 
          ON webhook_events(created_at);
        `
      }
    ]
    
    for (const migration of migrations) {
      const { rows } = await client.query(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [migration.version]
      )
      
      if (rows.length === 0) {
        console.log(`🔄 Applying migration: ${migration.version}`)
        await client.query(migration.sql)
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