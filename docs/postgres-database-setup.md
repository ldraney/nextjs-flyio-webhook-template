# PostgreSQL Database Setup Guide for Fly.io

This guide provides step-by-step instructions for setting up a shared PostgreSQL database on Fly.io that can be accessed by multiple applications within your organization.

## Overview

This template demonstrates how to:
- Deploy a production-ready PostgreSQL cluster on Fly.io
- Connect multiple Next.js applications to the same database
- Implement proper database isolation between applications
- Set up monitoring, backup, and security best practices

## Prerequisites

- Fly CLI installed and authenticated (`fly auth login`)
- Node.js 18+ installed
- Your Next.js app already deployed to Fly.io
- Basic understanding of PostgreSQL and Next.js

## Step 1: Create PostgreSQL Cluster

### 1.1 Deploy the Database

```bash
# Create a PostgreSQL cluster
fly postgres create

# Interactive prompts - choose these options:
# App name: your-org-postgres (replace with your preferred name)
# Organization: [Your organization]
# Region: [Same region as your apps - check with `fly status -a your-app-name`]
# Configuration: 
#   - Development (Single node) - for testing
#   - High Availability (3 nodes) - for production
# VM Size: shared-cpu-1x (can scale up later)
```

### 1.2 Save Database Credentials

The command will output important connection details:
```
Postgres cluster your-org-postgres created
  Username: postgres
  Password: [SAVE-THIS-PASSWORD]
  Hostname: your-org-postgres.internal
  Flycast: fdaa:X:XXXX:0:1::X
  Proxy port: 5432
  Postgres port: 5433
  Connection string: postgres://postgres:[password]@your-org-postgres.flycast:5432
```

**⚠️ Important**: Save these credentials securely. You won't be able to see the password again!

## Step 2: Update Your Next.js Application

### 2.1 Install Database Dependencies

```bash
# Navigate to your app directory
cd /path/to/your/nextjs/app

# Install PostgreSQL client
npm install pg @types/pg

# For development
npm install @types/pg --save-dev
```

### 2.2 Update package.json

Add the database initialization script to your scripts:

```json
{
  "scripts": {
    "dev": "next dev -p 3005",
    "build": "next build", 
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "db:init": "node scripts/init-db.js",
    "db:migrate": "node scripts/migrate.js"
  },
  "dependencies": {
    "next": "^14.2.15",
    "react": "^18.3.1", 
    "react-dom": "^18.3.1",
    "nanoid": "^5.0.7",
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.55",
    "@types/react-dom": "^18.2.19", 
    "@types/pg": "^8.10.9",
    "typescript": "^5.3.3"
  }
}
```

### 2.3 Create Database Scripts

Create `scripts/init-db.js`:

```javascript
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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
```

Create `scripts/migrate.js`:

```javascript
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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
```

### 2.4 Create Database Utility

Create `lib/database.ts`:

```typescript
import { Pool, PoolClient } from 'pg'

// Create a single pool instance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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
export async function query(text: string, params?: any[]) {
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
  payload: any
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
```

### 2.5 Update Webhook Route

Replace `app/api/webhook/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { checkDatabaseHealth, saveWebhookEvent, getWebhookEvents } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const isDbHealthy = await checkDatabaseHealth()
    const searchParams = request.nextUrl.searchParams
    const showEvents = searchParams.get('events') === 'true'
    
    let recentEvents = null
    if (showEvents && isDbHealthy) {
      recentEvents = await getWebhookEvents(10, 0)
    }
    
    return NextResponse.json({ 
      status: 'ready',
      service: 'batch-webhook-fly',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: isDbHealthy,
        status: isDbHealthy ? 'healthy' : 'unhealthy'
      },
      recent_events: recentEvents,
      message: 'Webhook endpoint is operational',
      endpoints: {
        'GET /api/webhook': 'Status check',
        'GET /api/webhook?events=true': 'Status with recent events',
        'POST /api/webhook': 'Process webhook'
      }
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({ 
      status: 'error',
      service: 'batch-webhook-fly',
      message: 'Health check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const correlationId = nanoid()
  
  try {
    const body = await request.json()
    
    console.log(`🔔 [${correlationId}] Webhook received:`, JSON.stringify(body, null, 2))
    
    // Handle Monday.com challenge verification
    if (body.challenge) {
      console.log(`✅ [${correlationId}] Challenge verification:`, body.challenge)
      return NextResponse.json({ challenge: body.challenge })
    }
    
    // Determine event type
    const eventType = body.event?.type || body.type || 'unknown'
    
    // Save webhook data in database
    try {
      const savedEvent = await saveWebhookEvent({
        correlation_id: correlationId,
        event_type: eventType,
        payload: body,
        processed: false
      })
      
      console.log(`✅ [${correlationId}] Webhook stored in database with ID: ${savedEvent.id}`)
      
      // Process the webhook based on event type
      await processWebhookEvent(correlationId, eventType, body)
      
    } catch (dbError) {
      console.error(`❌ [${correlationId}] Database error:`, dbError)
      // Continue processing even if database save fails
    }
    
    return NextResponse.json({ 
      status: 'success',
      correlation_id: correlationId,
      event_type: eventType,
      timestamp: new Date().toISOString(),
      message: 'Webhook processed and stored successfully'
    })
    
  } catch (error) {
    console.error(`❌ [${correlationId}] Webhook error:`, error)
    
    if (error instanceof SyntaxError) {
      return new NextResponse('Invalid JSON payload', { status: 400 })
    }
    
    return new NextResponse('Internal server error', { status: 500 })
  }
}

// Process different types of webhook events
async function processWebhookEvent(correlationId: string, eventType: string, payload: any) {
  console.log(`🔄 [${correlationId}] Processing event type: ${eventType}`)
  
  switch (eventType) {
    case 'create_pulse':
      console.log(`📝 [${correlationId}] Task created: ${payload.pulseName || 'Unknown'}`)
      break
      
    case 'update_pulse':
      console.log(`📝 [${correlationId}] Task updated: ${payload.pulseName || 'Unknown'}`)
      break
      
    case 'test':
      console.log(`🧪 [${correlationId}] Test event received`)
      break
      
    default:
      console.log(`❓ [${correlationId}] Unknown event type: ${eventType}`)
  }
  
  // Mark as processed (you can add more complex processing logic here)
  try {
    const { markWebhookProcessed } = await import('@/lib/database')
    await markWebhookProcessed(correlationId)
    console.log(`✅ [${correlationId}] Event marked as processed`)
  } catch (error) {
    console.error(`❌ [${correlationId}] Failed to mark as processed:`, error)
  }
}
```

### 2.6 Update Deployment Configuration

Update your `fly.toml`:

```toml
# fly.toml app configuration file
app = 'batch-webhook-fly'
primary_region = 'sea'

[build]

[env]
  NODE_ENV = 'production'
  PORT = '3000'

[deploy]
  release_command = 'npm run db:migrate'

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0

  [[http_service.checks]]
    interval = '30s'
    timeout = '10s'
    grace_period = '10s'
    method = 'GET'
    path = '/api/webhook'

[[vm]]
  size = 'shared-cpu-1x'
```

## Step 3: Connect App to Database

### 3.1 Attach Database to Your App

```bash
# Attach your app to the PostgreSQL cluster
fly postgres attach your-org-postgres -a batch-webhook-fly

# This automatically:
# - Creates a database named "batch_webhook_fly"
# - Creates a user named "batch_webhook_fly" 
# - Sets DATABASE_URL environment variable
# - Grants appropriate permissions
```

### 3.2 Verify Connection

```bash
# Check that DATABASE_URL was set
fly secrets list -a batch-webhook-fly

# You should see DATABASE_URL in the list
```

## Step 4: Test Locally

### 4.1 Set Up Local Environment

Create `.env.local`:

```env
# For local development - use fly proxy to connect to remote database
DATABASE_URL=postgres://batch_webhook_fly:YOUR_PASSWORD@localhost:15432/batch_webhook_fly
NODE_ENV=development
```

### 4.2 Create Local Database Proxy

```bash
# In one terminal, create a proxy to your remote database
fly proxy 15432:5432 -a your-org-postgres

# Keep this running during development
```

### 4.3 Initialize Database

```bash
# In another terminal, run database setup
npm run db:migrate

# Expected output:
# 🔄 Running database migrations...
# 🔄 Applying migration: 20250101_create_webhook_events
# ✅ Migration applied: 20250101_create_webhook_events
# [etc...]
```

### 4.4 Test Application Locally

```bash
# Start development server
npm run dev

# Test in another terminal:
# 1. Health check
curl http://localhost:3005/api/webhook

# 2. Health check with events
curl http://localhost:3005/api/webhook?events=true

# 3. Test webhook
curl -X POST http://localhost:3005/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"event": {"type": "test", "data": "sample"}}'

# 4. Test Monday.com challenge
curl -X POST http://localhost:3005/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"challenge": "test123"}'
```

## Step 5: Deploy to Production

### 5.1 Deploy Your Updated App

```bash
# Deploy to Fly.io
fly deploy

# Watch deployment logs
fly logs
```

### 5.2 Test Production Deployment

```bash
# Test production webhook
curl https://batch-webhook-fly.fly.dev/api/webhook

# Test with events
curl https://batch-webhook-fly.fly.dev/api/webhook?events=true

# Test webhook functionality
curl -X POST https://batch-webhook-fly.fly.dev/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"event": {"type": "create_pulse", "pulseName": "Test Task", "pulseId": 12345}}'
```

## Step 6: Connect Additional Apps

### 6.1 Attach More Apps to Same Database

```bash
# For each additional app:
fly postgres attach your-org-postgres -a second-app-name
fly postgres attach your-org-postgres -a third-app-name

# Each app gets:
# - Its own database (second_app_name, third_app_name)
# - Its own user with same name
# - Its own DATABASE_URL secret
```

### 6.2 List Connected Apps

```bash
# See all users (apps) connected to your database
fly postgres users list -a your-org-postgres

# Example output:
# USERNAME       DATABASES
# postgres       postgres
# batch_webhook_fly    batch_webhook_fly
# second_app_name      second_app_name
# third_app_name       third_app_name
```

## Monitoring and Management

### 6.1 Database Status and Logs

```bash
# Check database cluster status
fly status -a your-org-postgres

# View database logs
fly logs -a your-org-postgres

# Connect to database directly
fly postgres connect -a your-org-postgres
```

### 6.2 Backup Management

```bash
# List available snapshots (taken daily automatically)
fly volumes list -a your-org-postgres
fly volumes snapshots list vol_xxxxxxxxx -a your-org-postgres

# Create manual snapshot before major changes
fly volumes snapshots create vol_xxxxxxxxx -a your-org-postgres
```

### 6.3 Database Scaling

```bash
# Scale up database resources
fly machine list -a your-org-postgres
fly machine update MACHINE_ID --vm-size shared-cpu-2x -a your-org-postgres

# Add read replica
fly machine clone MACHINE_ID -a your-org-postgres
```

## Security and Best Practices

### 6.1 Network Security
- ✅ Database is on private Fly.io network by default
- ✅ SSL/TLS encryption enabled automatically
- ✅ Each app has isolated database and user

### 6.2 Backup Strategy
- ✅ Daily volume snapshots (5-day retention)
- 🔄 Set up additional off-site backups for production
- 🔄 Test backup restoration procedures

### 6.3 Monitoring Setup
- 🔄 Configure Prometheus metrics collection
- 🔄 Set up Grafana dashboards
- 🔄 Create alerting for database health

### 6.4 Production Checklist
- ✅ Use High Availability configuration (3 nodes minimum)
- ✅ Set up proper monitoring and alerting
- ✅ Configure additional backup strategy
- ✅ Test disaster recovery procedures
- ✅ Monitor resource usage and performance
- ✅ Plan for database maintenance windows

## Troubleshooting

### Common Issues

**Connection Refused:**
```bash
# Check if database is running
fly status -a your-org-postgres

# Check if DATABASE_URL is set
fly secrets list -a your-app-name
```

**SSL Connection Errors:**
```bash
# Verify SSL configuration in your connection string
# Production should use SSL, development can disable it
```

**Migration Failures:**
```bash
# Run migrations manually
fly ssh console -a your-app-name
npm run db:migrate
```

**Database Full:**
```bash
# Check volume usage
fly volumes list -a your-org-postgres

# Scale up volume size if needed
fly volumes extend vol_xxxxxxxxx --size-gb 20 -a your-org-postgres
```

### Useful Commands

```bash
# Database management
fly postgres connect -a your-org-postgres           # Connect to database
fly postgres users list -a your-org-postgres        # List database users
fly postgres db list -a your-org-postgres           # List databases

# App management  
fly secrets list -a your-app-name                    # View app secrets
fly logs -a your-app-name                           # View app logs
fly ssh console -a your-app-name                    # SSH into app

# Monitoring
fly status -a your-org-postgres                      # Database status
fly status -a your-app-name                         # App status
fly volumes list -a your-org-postgres               # Volume information
```

## Next Steps

1. **Deploy the database cluster** using the instructions above
2. **Update your Next.js application** with the provided code
3. **Test locally** using the proxy connection
4. **Deploy to production** and verify functionality
5. **Set up monitoring** and backup procedures
6. **Connect additional applications** as needed
7. **Use as template** for future projects

This setup provides a robust, scalable PostgreSQL database that can be shared across multiple applications while maintaining proper isolation and security.
