const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('postgres:5432') ? false : process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function initDatabase() {
  const client = await pool.connect()
  
  try {
    console.log('🔄 Initializing database tables...')
    
    // Create webhook_events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id SERIAL PRIMARY KEY,
        correlation_id VARCHAR(255) NOT NULL,
        event_type VARCHAR(255),
        payload JSONB,
        processed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `)
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_correlation_id 
      ON webhook_events(correlation_id);
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type 
      ON webhook_events(event_type);
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at 
      ON webhook_events(created_at);
    `)
    
    console.log('✅ Database tables and indexes created successfully')
    
    // Test connection
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version')
    console.log('🕐 Database time:', result.rows[0].current_time)
    console.log('🗃️ PostgreSQL version:', result.rows[0].pg_version.split(' ')[0])
    
  } catch (error) {
    console.error('❌ Database initialization error:', error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

// Run if this file is executed directly
if (require.main === module) {
  initDatabase()
}

module.exports = { initDatabase }