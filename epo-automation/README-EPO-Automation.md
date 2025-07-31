# EPO → Bulk Batch Traceability Automation

## Overview

This automation monitors EPO (Estimated Purchase Order) items in the VRM workspace and automatically updates related Bulk Batch Traceability tickets in the Lab workspace to "To Do" status when all connected EPOs reach "QA Passed" status.

## Board Configuration Confirmed

### EPO Board (EPOs - Ingredients)
- **Board ID**: `9387127195`
- **Workspace**: VRM - Purchasing (`11346231`)
- **Status Column**: `deal_stage` (with "QA Passed" option)
- **Connection to Bulk**: `board_relation_mks3f4n1` ("Bulk Batch Traceability")

### Bulk Batch Traceability Board
- **Board ID**: `8768285252`
- **Workspace**: Lab (`9736208`)
- **Status Column**: `color_mkpbpmsh` (with "To Do" option)
- **Connection to EPO**: `board_relation_mks3g2kq` ("EPOs - Ingredients")

## Automation Logic

1. **Query** all Bulk Batch Traceability items
2. **Check** each item for connected EPO items
3. **Verify** all connected EPOs have "QA Passed" status
4. **Update** bulk item to "To Do" when all EPOs pass QA
5. **Skip** items that are already "To Do" or "Done"

## Usage

### Test Mode (Dry Run)
```bash
node src/monday/epo-bulk-automation.js --dry-run
```

### Live Mode (Makes Changes)
```bash
node src/monday/epo-bulk-automation.js
```

### Add to package.json
```json
{
  "scripts": {
    "epo-automation": "node src/monday/epo-bulk-automation.js",
    "epo-automation-dry": "node src/monday/epo-bulk-automation.js --dry-run"
  }
}
```

## Current Status

⚠️ **Initial Analysis**: Most bulk batch items don't currently have EPO connections established. This could be because:

1. **Manual Setup Required**: EPO connections need to be manually linked in Monday.com
2. **Workflow Not Yet Established**: The EPO → Bulk connection process isn't consistently used
3. **Different Connection Method**: EPOs might be connected through a different relationship

## Setup Requirements

### 1. Environment Variables
Ensure `.env` file contains:
```
MONDAY_API_TOKEN=your_token_here
```

### 2. Monday.com Permissions
The API token needs permissions to:
- Read items from both EPO and Bulk boards
- Update status columns on Bulk Batch Traceability board

### 3. Board Connections
For the automation to work, bulk batch items must have EPO items connected via the "EPOs - Ingredients" board relation column.

## Deployment Options

### Option 1: Scheduled GitHub Action
```yaml
name: EPO Bulk Automation
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
jobs:
  run-automation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run epo-automation
        env:
          MONDAY_API_TOKEN: ${{ secrets.MONDAY_API_TOKEN }}
```

### Option 2: Fly.io Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "src/monday/epo-bulk-automation.js"]
```

With cron job:
```bash
# Run every 5 minutes
*/5 * * * * cd /app && node src/monday/epo-bulk-automation.js
```

### Option 3: Local Cron Job
```bash
# Add to crontab
*/5 * * * * cd /path/to/dev-tools && npm run epo-automation
```

## Testing Plan

1. **Manual Test**: Create EPO items and link them to a bulk batch item
2. **Status Change**: Update EPO items to "QA Passed"
3. **Verify Automation**: Run script and confirm bulk item updates to "To Do"
4. **Edge Cases**: Test with multiple EPOs, some passed/some not

## Monitoring

The script outputs detailed logs showing:
- Items processed
- Items skipped (with reasons)
- Items updated
- Any errors encountered

For production monitoring, consider adding:
- Log aggregation (e.g., Winston + CloudWatch)
- Alert notifications (e.g., Slack webhook on errors)
- Metrics tracking (items processed, success rate)

## Troubleshooting

### Common Issues

1. **No EPO Connections Found**
   - Verify board relation columns are set up correctly
   - Check that EPO items are actually linked to bulk items

2. **API Token Permissions**
   - Ensure token has read/write access to both boards
   - Check workspace permissions

3. **Status Value Mismatches**
   - Verify status column option indices in the code
   - Test with different status values

### Debug Commands

```bash
# Check board structure
node src/monday/verify-epo-bulk-boards.js

# Check item connections
node src/monday/check-epo-bulk-items.js

# Dry run automation
node src/monday/epo-bulk-automation.js --dry-run
```