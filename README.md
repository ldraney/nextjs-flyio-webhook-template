# Next.js + Fly.io Webhook Template

Production-ready webhook service template using Next.js 14 and Fly.io deployment with built-in observability.

## Features

✅ **Next.js 14** with App Router and TypeScript  
✅ **Fly.io deployment** with auto-scaling  
✅ **Docker + docker-compose** for local development  
✅ **Webhook endpoint** with GET/POST handling  
✅ **Test scripts** for validation  
✅ **Production observability** with Sentry + Fly.io metrics  
✅ **Structured logging** with correlation IDs  
✅ **Template-ready** for any webhook service  

## Quick Start

### 1. Use This Template
```bash
# Clone or use as GitHub template
git clone https://github.com/ldraney/nextjs-flyio-webhook-template.git my-webhook
cd my-webhook
```

### 2. Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Visit: http://localhost:3005

# Test webhook
chmod +x scripts/test-webhook.sh
./scripts/test-webhook.sh
```

### 3. Docker Testing
```bash
# Build and run container
docker-compose up --build

# Test containerized version
./scripts/test-webhook.sh http://localhost:3005
```

### 4. Deploy to Fly.io
```bash
# Install Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
# Login: fly auth login

# Launch app (choose unique name)
fly launch

# Deploy
fly deploy

# Test live deployment
./scripts/test-webhook.sh https://your-app-name.fly.dev
```

### 5. Set Up Observability
```bash
# Enable error tracking and performance monitoring
flyctl ext sentry create

# View your monitoring dashboard
flyctl apps errors

# Live tail logs
flyctl logs
```

## Observability & Monitoring

This template includes production-ready observability out of the box:

### 🚨 Error Tracking (Sentry)
- **Automatic setup**: `flyctl ext sentry create`
- **Free for 1 year**: Team plan worth $26/month
- **Webhook failure alerts**: Get notified when webhooks fail
- **Performance monitoring**: Track response times and bottlenecks
- **Access**: `flyctl apps errors` opens Sentry dashboard

### 📊 Infrastructure Metrics (Fly.io)
- **Automatic monitoring**: No setup required
- **HTTP metrics**: Request counts, response times, error rates
- **Resource usage**: CPU, memory, network utilization
- **Health checks**: Built-in endpoint monitoring
- **Access**: Fly.io dashboard or `https://api.fly.io/prometheus/personal`

### 📝 Structured Logging
- **JSON formatted**: Easy parsing and searching
- **Correlation IDs**: Track individual requests end-to-end
- **Webhook context**: Payload details, processing time, errors
- **Access**: `flyctl logs` for live tail, `flyctl logs --app your-app` for history

### 🔍 What You Can Monitor
- ✅ Webhook delivery success/failure rates
- ✅ Response times and performance trends  
- ✅ Error details with stack traces
- ✅ Request volume and traffic patterns
- ✅ Service uptime and availability
- ✅ Resource usage under load

### Accessing Your Monitoring
```bash
# Real-time error tracking
flyctl apps errors

# Live application logs  
flyctl logs

# Infrastructure metrics
# Visit: https://fly.io/dashboard/{your-org}/metrics

# Health check status
flyctl status
```

## Project Structure

```
├── fly.toml                 # Fly.io configuration with health checks
├── Dockerfile              # Production container
├── docker-compose.yml      # Local development
├── next.config.js          # Next.js configuration
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Homepage with status
│   └── api/
│       └── webhook/
│           └── route.ts    # Main webhook endpoint with logging
└── scripts/
    └── test-webhook.sh     # Testing script for all environments
```

## Webhook Endpoints

### `GET /api/webhook`
Returns service status and monitoring information.

**Response:**
```json
{
  "status": "ready",
  "service": "batch-webhook-fly",
  "timestamp": "2025-07-13T15:30:00.000Z",
  "environment": "production",
  "message": "Webhook endpoint is operational"
}
```

### `POST /api/webhook`
Handles webhook payloads with comprehensive logging:

- **Challenge verification**: Echoes `{"challenge": "value"}` for service setup
- **Payload processing**: Accepts and processes JSON data
- **Error handling**: Structured error responses with correlation IDs
- **Monitoring**: Automatic error tracking and performance metrics

## Customization

### 1. Modify Webhook Logic
Edit `app/api/webhook/route.ts` to add your specific webhook processing:

```typescript
// Add your business logic here
console.log(`🔔 [${correlationId}] Processing webhook:`, event.type)

if (event?.type === 'your_event_type') {
  // Process your event
  await processYourEvent(event)
  console.log(`✅ [${correlationId}] Successfully processed ${event.type}`)
}
```

### 2. Environment Variables
Set in Fly.io:
```bash
fly secrets set YOUR_API_KEY=your_value
fly secrets set YOUR_CONFIG=your_value

# Sentry DSN is set automatically by flyctl ext sentry create
```

### 3. Customize Monitoring
```bash
# Add custom Sentry tags for different webhook types
# Edit app/api/webhook/route.ts:

import * as Sentry from "@sentry/nextjs"

Sentry.setTag("webhook.type", event.type)
Sentry.setContext("webhook.payload", { size: JSON.stringify(body).length })
```

### 4. App Settings
- **App name**: Edit `app = "your-app-name"` in `fly.toml`
- **Region**: Change `primary_region` in `fly.toml`
- **Port**: Modify ports in `docker-compose.yml` and `package.json`

## Example Use Cases

This template works perfectly for:
- **Monday.com webhooks**: Task creation, status updates
- **GitHub webhooks**: Repository events, PR notifications  
- **Stripe webhooks**: Payment processing, subscription events
- **Slack webhooks**: Message processing, slash commands
- **Custom API webhooks**: Any service that sends HTTP callbacks

## Testing & Validation

The included test script validates all monitoring components:

```bash
# Test any deployment with full observability
./scripts/test-webhook.sh https://your-deployment.fly.dev

# Check logs for correlation IDs and structured data
flyctl logs

# Verify error tracking (test with invalid payload)
curl -X POST https://your-app.fly.dev/api/webhook -d "invalid-json"
```

## Production Features

- **Auto-scaling**: Scales to 0 when idle, auto-starts on requests
- **Health checks**: Built-in monitoring for Fly.io load balancer  
- **HTTPS**: Automatic SSL/TLS termination
- **Error tracking**: Production-grade error monitoring with Sentry
- **Performance monitoring**: Request timing, throughput, and bottleneck detection
- **Structured logging**: JSON logs with correlation IDs for easy debugging
- **Container optimization**: Minimal Alpine Linux image

## Troubleshooting

### Observability Issues
```bash
# Check if Sentry is working
flyctl apps errors

# Verify webhook logs are structured  
flyctl logs | grep "🔔"

# Test error tracking
curl -X POST https://your-app.fly.dev/api/webhook \
  -H "Content-Type: application/json" \
  -d "invalid-json"
```

### Common Monitoring Questions
- **"Where are my metrics?"** → Fly.io dashboard + `flyctl apps errors`
- **"How do I track specific webhook types?"** → Add custom Sentry tags
- **"Can I export logs?"** → Yes, Fly.io supports log aggregation services
- **"What's my uptime?"** → Check Fly.io dashboard health checks

## Support

- **Fly.io docs**: https://fly.io/docs/
- **Sentry docs**: https://docs.sentry.io/
- **Next.js docs**: https://nextjs.org/docs
- **Template issues**: Open an issue on this repository

## License

MIT License - feel free to use for any project!
