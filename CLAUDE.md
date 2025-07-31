# CLAUDE.md - EPO Automation Project

This file provides guidance to Claude Code when working with the EPO → Bulk Batch Traceability automation project.

## 🎯 Project Purpose

This is a **Monday.com cross-board automation service** deployed on Fly.io. The system automatically updates Bulk Batch Traceability tickets to "To Do" status when all connected EPO (Estimated Purchase Order) items reach "QA Passed" status.

## 🚀 CURRENT PROJECT: EPO → Bulk Batch Automation (2025-07-30) - READY FOR DEPLOYMENT ✅

### ✅ **COMPLETED INFRASTRUCTURE:**
Built comprehensive **cross-board automation system** that Monday.com's native automations cannot handle.

**🎯 WHAT WE BUILT:**
- **🔄 Next.js API Routes**: HTTP endpoints for automation triggers (`/api/epo-automation`)
- **📅 Scheduled Automation**: Cron jobs running every 10 minutes during business hours
- **🔗 Cross-Board Logic**: Complex "ALL EPOs must be QA Passed" validation
- **🛡️ Safety Infrastructure**: Dry run mode, comprehensive error handling, detailed logging
- **☁️ Fly.io Deployment**: Auto-scaling, health checks, zero-downtime updates

**📋 BOARD CONFIGURATION CONFIRMED:**
- **EPO Board**: `9387127195` (VRM - Purchasing workspace `11346231`)
  - Status Column: `deal_stage` with "QA Passed" option (index `11`)
  - Connection to Bulk: `board_relation_mks3f4n1` ("Bulk Batch Traceability")
- **Bulk Batch Traceability Board**: `8768285252` (Lab workspace `9736208`)  
  - Status Column: `color_mkpbpmsh` with "To Do" option (index `8`)
  - Connection to EPO: `board_relation_mks3g2kq` ("EPOs - Ingredients")

**⚡ AUTOMATION LOGIC:**
1. Query all Bulk Batch Traceability items
2. Check each item for connected EPO items via board relations
3. Verify ALL connected EPOs have "QA Passed" status
4. Update bulk item to "To Do" when all EPOs pass QA
5. Skip items already "To Do" or "Done"

## 🛠️ Technical Architecture

### Core Components
- **`app/api/epo-automation/route.ts`** - HTTP API endpoint (GET/POST)
- **`epo-automation/epo-bulk-automation.js`** - Core automation logic
- **`scripts/run-epo-automation.js`** - Scheduled runner for cron
- **`epo-automation/verify-epo-bulk-boards.js`** - Board structure validation

### Deployment Configuration
- **`fly.toml`** - Fly.io app configuration with cron scheduling
- **`package.json`** - npm scripts and Monday.com dependencies
- **`DEPLOYMENT.md`** - Complete deployment guide

### API Endpoints

#### `GET /api/epo-automation`
Run automation and return processing summary.
- Query param: `?dry=true` for testing without changes
- Returns: `{ success, timestamp, summary: { processed, updated, skipped }, results }`

#### `POST /api/epo-automation`  
Webhook endpoint for real-time Monday.com status change notifications.
- Triggers automation when EPO status changes to "QA Passed"
- Validates webhook payload for relevant events

### Environment Variables
```bash
MONDAY_API_TOKEN=your_monday_token_here  # Required
NODE_ENV=production                      # Optional
PORT=3000                               # Optional
```

## 📋 Available Commands

### Development & Testing
```bash
npm run epo-automation-dry    # Test automation without making changes
npm run epo-automation        # Run automation live
npm run verify-epo-boards     # Check board structure and connections
```

### Deployment
```bash
fly deploy                    # Deploy to Fly.io
fly secrets set MONDAY_API_TOKEN=token  # Set API token
fly logs                      # View application logs
fly ssh console              # SSH into running machine
```

### Health Checks
```bash
curl https://pel-epo-automation.fly.dev/api/epo-automation?dry=true
curl -X POST https://pel-epo-automation.fly.dev/api/epo-automation
```

## 🔄 Automation Triggers

### 1. Scheduled (Primary)
- **Cron**: Every 10 minutes during business hours (9 AM - 6 PM EST, Mon-Fri)
- **Configuration**: `fly.toml` cron section
- **Command**: `node scripts/run-epo-automation.js`

### 2. Manual (Testing)
- **HTTP API**: GET/POST to `/api/epo-automation`
- **SSH**: `npm run epo-automation` from Fly.io console
- **Local**: Run scripts directly during development

### 3. Webhook (Optional)
- **Monday.com**: Configure webhook to POST to `/api/epo-automation`
- **Real-time**: Triggers when EPO status changes
- **Event filtering**: Only processes "QA Passed" status changes

## 🚨 Current Status & Next Steps

### ✅ **READY FOR DEPLOYMENT**
All components are built and tested:
- ✅ Board connections verified (EPO ↔ Bulk Batch)
- ✅ Automation logic implemented and tested
- ✅ API endpoints created with proper error handling
- ✅ Fly.io configuration completed
- ✅ Cron scheduling configured
- ✅ Documentation and deployment guides written

### 📋 **DEPLOYMENT CHECKLIST**
1. **Set API Token**: `fly secrets set MONDAY_API_TOKEN=your_token`
2. **Deploy App**: `fly deploy` to launch service
3. **Test Automation**: Run dry mode to verify connections
4. **Monitor Logs**: Check `fly logs` for processing results
5. **Verify Cron**: Ensure scheduled runs are working

### ⚠️ **IMPORTANT DISCOVERY**
Initial testing showed most bulk batch items don't currently have EPO connections established. This could be because:
- EPO connections need manual setup in Monday.com
- The EPO → Bulk workflow isn't consistently used yet
- Different connection method is used

**Recommendation**: Start with manual testing using items that DO have EPO connections, then expand workflow adoption.

## 🛡️ Safety Features

### Dry Run Mode
- Test automation without making changes
- Validates all logic and connections
- Reports what WOULD be updated
- Essential for testing and validation

### Error Handling
- Comprehensive try/catch blocks
- Detailed error logging with context
- Graceful degradation on API failures
- Connection timeouts and retries

### Status Validation
- Only updates items when ALL EPOs are "QA Passed" 
- Skips items already "To Do" or "Done"
- Validates board connections before processing
- Logs all decisions and reasons

## 💡 Development Tips

### Testing New Changes
1. Always test with `--dry-run` first
2. Use `verify-epo-boards.js` to check board structure
3. Test locally before deploying to Fly.io
4. Monitor logs during initial deployment

### Debugging Connection Issues
- Check Monday.com API token permissions
- Verify board IDs haven't changed
- Confirm status column option indices
- Test with items that have known EPO connections

## 🔍 **CRITICAL: Monday.com Board Relations**

### ⚠️ **Board Relations Require Special GraphQL Syntax**
**DISCOVERED 2025-07-30**: Monday.com board relation columns **DO NOT** work with standard GraphQL queries.

❌ **This FAILS** (returns `value: null`):
```graphql
column_values {
  id
  value  # ← Always null for board relations!
}
```

✅ **This WORKS** (returns actual connections):
```graphql
column_values {
  id
  ... on BoardRelationValue {
    linked_items {
      id
      name
    }
  }
}
```

### **Implementation Pattern**
```javascript
// ❌ WRONG: This will always fail
const epoData = JSON.parse(epoColumn.value); // value is null!

// ✅ CORRECT: Use linked_items from GraphQL fragment
const epoIds = epoColumn.linked_items.map(item => item.id);
```

**See `docs/monday-board-relations-guide.md` for complete documentation.**

### Monitoring Production
- Check `fly logs` for processing summaries
- Monitor automation frequency and success rate
- Set up alerts for consecutive failures
- Track items updated vs. skipped ratios

## 🎯 Business Value

### Problem Solved
Monday.com's native automations cannot handle complex cross-board logic like "when ALL EPOs are QA Passed". This automation bridges that gap.

### Workflow Improvement
- **Before**: Manual checking of multiple EPOs per batch
- **After**: Automatic status updates when all dependencies complete
- **Result**: Reduced manual work, faster batch processing, fewer missed updates

### Scalability
- Handles any number of EPO connections per bulk item
- Processes all bulk items in single automation run
- Auto-scales with Fly.io based on usage
- Logs all actions for audit trails

## 📁 Key Files Reference

### Automation Logic
- `epo-automation/epo-bulk-automation.js` - Core automation functions
- `app/api/epo-automation/route.ts` - HTTP API wrapper
- `scripts/run-epo-automation.js` - Scheduled execution wrapper

### Configuration
- `fly.toml` - Fly.io deployment and cron configuration
- `package.json` - Dependencies and npm scripts
- `epo-automation/DEPLOYMENT.md` - Complete deployment guide

### Documentation
- `epo-automation/README-EPO-Automation.md` - Technical documentation
- `CLAUDE.md` (this file) - Project context and guidance

The system is ready for production deployment and will provide reliable automation for the EPO → Bulk Batch workflow!