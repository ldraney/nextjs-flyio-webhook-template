# Next.js + Fly.io Webhook Template

Production-ready webhook service template using Next.js 14 and Fly.io deployment.

## Features

✅ **Next.js 14** with App Router and TypeScript  
✅ **Fly.io deployment** with auto-scaling  
✅ **Docker + docker-compose** for local development  
✅ **Webhook endpoint** with GET/POST handling  
✅ **Test scripts** for validation  
✅ **Production optimized** with standalone output  

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

## Project Structure

```
├── fly.toml                 # Fly.io configuration
├── Dockerfile              # Production container
├── docker-compose.yml      # Local development
├── next.config.js          # Next.js configuration
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Homepage
│   └── api/
│       └── webhook/
│           └── route.ts    # Webhook endpoint
└── scripts/
    └── test-webhook.sh     # Testing script
```

## Webhook Endpoints

### `GET /api/webhook`
Returns service status and information.

### `POST /api/webhook`
Handles webhook payloads:
- **Challenge verification**: Echoes `{"challenge": "value"}` for service setup
- **Payload processing**: Accepts and processes JSON data

## Customization

### 1. Modify Webhook Logic
Edit `app/api/webhook/route.ts` to add your specific webhook processing:

```typescript
// Add your business logic here
if (event?.type === 'your_event_type') {
  // Process your event
  await processYourEvent(event)
}
```

### 2. Environment Variables
Set in Fly.io:
```bash
fly secrets set YOUR_API_KEY=your_value
fly secrets set YOUR_CONFIG=your_value
```

### 3. Customize App Settings
- **App name**: Edit `app = "your-app-name"` in `fly.toml`
- **Region**: Change `primary_region` in `fly.toml`
- **Port**: Modify ports in `docker-compose.yml` and `package.json`

## Example Use Cases

- **Monday.com webhooks**: Task creation, status updates
- **GitHub webhooks**: Repository events, PR notifications  
- **Stripe webhooks**: Payment processing, subscription events
- **Slack webhooks**: Message processing, slash commands
- **Generic API webhooks**: Any service that sends HTTP callbacks

## Testing

The included test script validates:
1. ✅ Service health check
2. ✅ Challenge/verification handling  
3. ✅ Webhook payload processing

```bash
# Test any deployment
./scripts/test-webhook.sh https://your-deployment.fly.dev
```

## Production Features

- **Auto-scaling**: Scales to 0 when idle, auto-starts on requests
- **Health checks**: Built-in monitoring for Fly.io load balancer  
- **HTTPS**: Automatic SSL/TLS termination
- **Container optimization**: Minimal Alpine Linux image
- **Structured logging**: Production-ready logging format

## Current Status ✅

This template has been **successfully deployed and tested** on Fly.io:
- ✅ **Live deployment**: https://fly-webhook-template.fly.dev
- ✅ **Webhook endpoints tested**: All three test cases pass
- ✅ **Production ready**: Auto-scaling, health checks, HTTPS working
- ✅ **GitHub template**: Ready for reuse

## Next Steps

### Phase 1: Observability (Recommended)
Add production monitoring and logging:
- **Error tracking** (Sentry integration)
- **Metrics collection** (Prometheus/Grafana or Fly.io native)
- **Structured logging** (JSON logs, log aggregation)
- **Alerting** (Uptime, error rate monitoring)
- **Request tracing** (Performance insights)

### Phase 2: Feature Development
Clone this template for specific webhook projects:
- Monday.com batch code generation
- GitHub automation webhooks
- Stripe payment processing
- Custom business logic

## Support

- **Fly.io docs**: https://fly.io/docs/
- **Next.js docs**: https://nextjs.org/docs
- **Template issues**: Open an issue on this repository

## License

MIT License - feel free to use for any project!
