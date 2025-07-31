# EPO Automation Deployment Guide

## Quick Deploy to Fly.io

### 1. Prerequisites
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly.io
fly auth login
```

### 2. Environment Setup
```bash
# Set Monday.com API token
fly secrets set MONDAY_API_TOKEN=your_monday_token_here

# Verify secrets
fly secrets list
```

### 3. Deploy Application
```bash
# Deploy to Fly.io
fly deploy

# Check deployment status
fly status

# View logs
fly logs
```

### 4. Test Automation

#### Via HTTP API:
```bash
# Dry run test
curl https://pel-epo-automation.fly.dev/api/epo-automation?dry=true

# Live test
curl https://pel-epo-automation.fly.dev/api/epo-automation

# Webhook test (POST)
curl -X POST https://pel-epo-automation.fly.dev/api/epo-automation \
  -H "Content-Type: application/json" \
  -d '{"event": {"type": "update_column_value", "columnId": "deal_stage"}}'
```

#### Via SSH:
```bash
# SSH into Fly machine
fly ssh console

# Run automation manually
npm run epo-automation-dry
npm run epo-automation

# Check board configuration
npm run verify-epo-boards
```

## Automation Features

### 🔄 **Automatic Triggers**
- **Scheduled**: Every 10 minutes during business hours
- **Webhook**: Real-time when EPO status changes (optional)
- **Manual**: Via API endpoint or SSH commands

### 📊 **Monitoring**
- Health checks every 30 seconds
- Detailed logs via `fly logs`
- API returns processing summary
- Error alerts in production

### 🛡️ **Safety Features**
- Dry run mode for testing
- Only updates items when ALL EPOs are "QA Passed"
- Skips items already "To Do" or "Done"
- Comprehensive error handling

## API Endpoints

### GET `/api/epo-automation`
Run automation and return results.

**Query Parameters:**
- `dry=true` - Run in dry mode (no changes)

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-07-30T15:30:00.000Z",
  "dryRun": false,
  "summary": {
    "processed": 95,
    "updated": 3,
    "skipped": 92
  },
  "results": [
    {
      "item": "WO-001306 - Anchor",
      "itemId": "9700177008",
      "updated": false,
      "reason": "No EPO connections"
    }
  ]
}
```

### POST `/api/epo-automation`
Webhook endpoint for Monday.com status change notifications.

## Configuration

### Monday.com Setup
1. **EPO Board** (9387127195): VRM - Purchasing workspace
2. **Bulk Board** (8768285252): Lab workspace
3. **Webhook** (optional): Configure in Monday.com to POST to `/api/epo-automation`

### Environment Variables
```bash
MONDAY_API_TOKEN=your_token_here
NODE_ENV=production
PORT=3000
```

### Fly.io Configuration
```toml
# fly.toml
app = 'pel-epo-automation'
primary_region = 'ord'

[cron]
  "*/10 * * * *" = "node scripts/run-epo-automation.js"
```

## Monitoring & Troubleshooting

### Check System Health
```bash
# Application status
fly status

# Recent logs
fly logs

# Resource usage
fly dashboard pel-epo-automation
```

### Common Issues

1. **No EPO Connections Found**
   ```bash
   # Check board structure
   fly ssh console
   npm run verify-epo-boards
   ```

2. **Authentication Errors**
   ```bash
   # Verify API token
   fly secrets list
   fly secrets set MONDAY_API_TOKEN=new_token
   ```

3. **Automation Not Running**
   ```bash
   # Check cron logs
   fly logs | grep cron
   
   # Manual test
   fly ssh console
   npm run epo-automation-dry
   ```

### Deployment Updates

```bash
# Update code
git add .
git commit -m "Update EPO automation"
git push

# Redeploy
fly deploy

# Zero-downtime deployment
fly deploy --strategy rolling
```

## Cost Optimization

- **Auto-stop**: Machines stop when idle
- **Auto-start**: Machines start on requests
- **Min running**: 0 machines (cost-efficient)
- **Shared CPU**: Small resource footprint

Estimated monthly cost: $5-15 depending on usage.

## Security

- API token stored as encrypted secret
- HTTPS enforced
- No sensitive data in logs
- Webhook signature verification (optional)