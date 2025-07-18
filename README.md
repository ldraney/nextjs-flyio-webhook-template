# Next.js + Fly.io Webhook Template with PostgreSQL

Production-ready webhook service template using Next.js 15, PostgreSQL, and Fly.io deployment with built-in observability.

## Features

✅ **Next.js 15** with App Router and TypeScript  
✅ **PostgreSQL** database integration with connection pooling  
✅ **Fly.io deployment** with auto-scaling  
✅ **Docker + docker-compose** for local development with PostgreSQL  
✅ **Webhook endpoint** with GET/POST handling and database persistence  
✅ **Database migrations** with automatic deployment  
✅ **Health checks** with database connectivity monitoring  
✅ **Structured logging** with correlation IDs  
✅ **Template-ready** for any webhook service

## Quick Start

### 1. Use This Template
```bash
# Clone or use as GitHub template
git clone https://github.com/ldraney/nextjs-flyio-webhook-template.git my-webhook
cd my-webhook
npm install
```

### 2. Local Development with Docker
```bash
# Start with PostgreSQL database
docker-compose up --build

# Test webhook endpoints
curl http://localhost:3005/api/webhook
curl -X POST http://localhost:3005/api/webhook -H "Content-Type: application/json" -d '{"event": {"type": "test", "data": "sample"}}'

# View events with database data
curl 'http://localhost:3005/api/webhook?events=true'
```

### 3. Deploy to Fly.io

#### Create PostgreSQL Database
```bash
# Install Fly CLI and login
fly auth login

# Create PostgreSQL cluster
fly postgres create
# Choose:
# - App name: your-org-postgres
# - Organization: Your organization
# - Region: Same as your app (e.g., sea)
# - Configuration: High Availability for production
# - VM Size: shared-cpu-1x (can scale later)

# Save the database credentials shown after creation!
```

#### Deploy Application
```bash
# Launch app (choose unique name)
fly launch

# Attach database to your app
fly postgres attach your-org-postgres -a your-app-name

# Deploy with automatic migrations
fly deploy

# Test live deployment
curl https://your-app-name.fly.dev/api/webhook
```

### 4. Test Production Deployment
```bash
# Health check
curl https://your-app-name.fly.dev/api/webhook

# Test webhook processing
curl -X POST https://your-app-name.fly.dev/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"event": {"type": "create_pulse", "pulseName": "Test Task"}}'

# View stored events
curl 'https://your-app-name.fly.dev/api/webhook?events=true'
```

## Database Features

### Webhook Event Storage
All webhook events are automatically stored in PostgreSQL with:
- **Correlation IDs** for request tracking
- **Event type** classification  
- **Full payload** as JSONB
- **Processing status** tracking
- **Timestamps** for created/updated times

### Database Health Monitoring
The application includes:
- **Connection pooling** for optimal performance
- **Health checks** exposed via API endpoints
- **Automatic reconnection** handling
- **Environment-specific SSL** configuration

### Migration System
- **Automatic migrations** on deployment
- **Version tracking** to prevent duplicate runs
- **Rollback safety** with transaction handling

## API Endpoints

### `GET /api/webhook`
Health check with database status:
```json
{
  "status": "ready",
  "service": "batch-webhook-fly",
  "timestamp": "2025-07-18T13:56:11.058Z",
  "environment": "production",
  "database": {
    "connected": true,
    "status": "healthy"
  },
  "message": "Webhook endpoint is operational"
}
```

### `GET /api/webhook?events=true`
Health check with recent events from database:
```json
{
  "status": "ready",
  "database": {
    "connected": true,
    "status": "healthy"
  },
  "recent_events": [
    {
      "id": 1,
      "correlation_id": "abc123",
      "event_type": "test",
      "payload": {"event": {"type": "test", "data": "sample"}},
      "processed": true,
      "created_at": "2025-07-18T13:56:16.514Z"
    }
  ]
}
```

### `POST /api/webhook`
Process webhook events with database persistence:
```json
{
  "status": "success",
  "correlation_id": "abc123",
  "event_type": "test",
  "timestamp": "2025-07-18T13:56:16.530Z",
  "message": "Webhook processed and stored successfully"
}
```

## Project Structure

```
├── app/
│   ├── api/
│   │   └── webhook/
│   │       └── route.ts          # Enhanced webhook API with database
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Homepage with status
├── lib/
│   └── database.ts              # PostgreSQL utilities and connection
├── scripts/
│   ├── init-db.js              # Database initialization
│   └── migrate.js              # Database migrations
├── docker-compose.yml          # Local development with PostgreSQL
├── Dockerfile                  # Production container
├── fly.toml                    # Fly.io configuration with migrations
└── README.md
```

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string (set automatically by Fly.io)
- `NODE_ENV` - Environment (development/production)

### Optional
- `PORT` - Server port (default: 3000)

## Database Schema

### `webhook_events` Table
```sql
CREATE TABLE webhook_events (
  id SERIAL PRIMARY KEY,
  correlation_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(255),
  payload JSONB,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes
- `correlation_id` - For tracking specific requests
- `event_type` - For filtering by event type
- `created_at` - For chronological queries

## Development Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run type-check      # Run TypeScript checking

# Database
npm run db:init         # Initialize database (development)
npm run db:migrate      # Run database migrations

# Docker
docker-compose up       # Start with PostgreSQL
docker-compose down     # Stop containers
```

## Production Deployment

### Database Setup
1. Create PostgreSQL cluster: `fly postgres create`
2. Attach to app: `fly postgres attach your-postgres-app -a your-app`
3. Deploy with migrations: `fly deploy`

### Scaling
```bash
# Scale application
fly scale count 2
fly scale vm shared-cpu-2x

# Scale database
fly machine update MACHINE_ID --vm-size shared-cpu-2x -a your-postgres-app
```

### Monitoring
```bash
# Application logs
fly logs -a your-app-name

# Database logs  
fly logs -a your-postgres-app

# Connection to database
fly postgres connect -a your-postgres-app
```

## Example Use Cases

This template works perfectly for:
- **Monday.com webhooks** - Task creation, status updates with database tracking
- **GitHub webhooks** - Repository events, PR notifications with audit trail
- **Stripe webhooks** - Payment processing, subscription events with persistence
- **Slack webhooks** - Message processing, slash commands with history
- **Custom API webhooks** - Any service that sends HTTP callbacks

## Production Features

- **Auto-scaling** - Scales to 0 when idle, auto-starts on requests
- **Database persistence** - All webhook events stored with metadata
- **Health monitoring** - Database connectivity and application health
- **Automatic migrations** - Schema updates deployed with application
- **SSL/TLS** - Automatic certificate management
- **Error tracking** - Structured logging with correlation IDs
- **Connection pooling** - Optimized database performance

## Troubleshooting

### Database Connection Issues
```bash
# Check database status
fly status -a your-postgres-app

# Check app secrets
fly secrets list -a your-app-name

# Test database connection
fly postgres connect -a your-postgres-app
```

### Migration Issues
```bash
# Run migrations manually
fly ssh console -a your-app-name
npm run db:migrate
```

### Local Development
```bash
# For local development with Fly.io database
fly proxy 15432:5432 -a your-postgres-app

# Update .env.local
DATABASE_URL=postgres://username:password@localhost:15432/database_name
```

## Support

- **Fly.io docs**: https://fly.io/docs/
- **PostgreSQL docs**: https://www.postgresql.org/docs/
- **Next.js docs**: https://nextjs.org/docs
- **Template issues**: Open an issue on this repository

## License

MIT License - feel free to use for any project!