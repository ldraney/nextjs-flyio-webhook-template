import { Pool, PoolClient } from 'pg'

// Create a single pool instance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('postgres:5432') ? false : process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
})

// Database health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

// Get a database client from the pool
export async function getDbClient(): Promise<PoolClient> {
  return await pool.connect()
}

// Execute a query with automatic client release
export async function query(text: string, params?: unknown[]) {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

// Close the pool (useful for graceful shutdown)
export async function closePool(): Promise<void> {
  await pool.end()
}

// Webhook event utilities
export interface WebhookEvent {
  id?: number
  correlation_id: string
  event_type: string
  payload: unknown
  processed?: boolean
  created_at?: Date
  updated_at?: Date
}

export async function saveWebhookEvent(event: Omit<WebhookEvent, 'id' | 'created_at' | 'updated_at'>): Promise<WebhookEvent> {
  const result = await query(
    `INSERT INTO webhook_events (correlation_id, event_type, payload, processed) 
     VALUES ($1, $2, $3, $4) 
     RETURNING *`,
    [event.correlation_id, event.event_type, JSON.stringify(event.payload), event.processed || false]
  )
  return result.rows[0]
}

export async function getWebhookEvents(limit: number = 50, offset: number = 0): Promise<WebhookEvent[]> {
  const result = await query(
    'SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  )
  return result.rows
}

export async function markWebhookProcessed(correlationId: string): Promise<void> {
  await query(
    'UPDATE webhook_events SET processed = TRUE, updated_at = NOW() WHERE correlation_id = $1',
    [correlationId]
  )
}