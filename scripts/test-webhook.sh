#!/bin/bash

# # Test local dev server
# ./scripts/test-webhook.sh http://localhost:3005
#
# # Test containerized version  
# ./scripts/test-webhook.sh http://localhost:3005
#
# # Later, test Fly.io deployment
# ./scripts/test-webhook.sh https://batch-webhook-fly.fly.dev

# Default to localhost:3005, but allow override
URL=${1:-"http://localhost:3005"}

echo "🧪 Testing webhook at: $URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "1️⃣ Testing GET /api/webhook (status check)..."
curl -s "$URL/api/webhook" | jq . || curl -s "$URL/api/webhook"

echo ""
echo ""
echo "2️⃣ Testing POST /api/webhook (Monday.com challenge)..."
curl -s -X POST "$URL/api/webhook" \
  -H "Content-Type: application/json" \
  -d '{"challenge": "test123"}' | jq . || curl -s -X POST "$URL/api/webhook" -H "Content-Type: application/json" -d '{"challenge": "test123"}'

echo ""
echo ""
echo "3️⃣ Testing POST /api/webhook (sample task creation)..."
curl -s -X POST "$URL/api/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "type": "create_pulse", 
      "pulseName": "Test Task",
      "pulseId": 12345,
      "boardId": 67890
    }
  }' | jq . || curl -s -X POST "$URL/api/webhook" -H "Content-Type: application/json" -d '{"event": {"type": "create_pulse", "pulseName": "Test Task", "pulseId": 12345, "boardId": 67890}}'

echo ""
echo ""
echo "✅ Webhook testing complete!"
