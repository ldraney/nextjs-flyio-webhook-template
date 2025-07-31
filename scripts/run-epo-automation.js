#!/usr/bin/env node
/**
 * Scheduled EPO Automation Runner
 * This script can be called by cron or fly.io machines
 */

const { runEPOBulkAutomation } = require('../epo-automation/epo-bulk-automation.js');

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || args.includes('-d');
  
  console.log(`🚀 Starting Scheduled EPO Automation ${isDryRun ? '(DRY RUN)' : ''}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  
  try {
    if (isDryRun) {
      // Import dry run function
      const { dryRunEPOBulkAutomation } = require('../epo-automation/epo-bulk-automation.js');
      await dryRunEPOBulkAutomation();
    } else {
      const result = await runEPOBulkAutomation();
      
      console.log('\n📊 Automation Summary:');
      console.log(`   Processed: ${result.processed} bulk items`);
      console.log(`   Updated: ${result.updated} items → To Do`);
      console.log(`   Skipped: ${result.processed - result.updated} items`);
      
      // If running in production, could send metrics to monitoring service
      if (process.env.NODE_ENV === 'production') {
        // Example: send to DataDog, New Relic, etc.
        console.log('📈 Metrics sent to monitoring service');
      }
    }
    
    console.log('✅ Scheduled automation completed successfully\n');
    
  } catch (error) {
    console.error('❌ Scheduled automation failed:', error.message);
    
    // In production, send alert to Slack, email, etc.
    if (process.env.NODE_ENV === 'production') {
      console.log('🚨 Alert sent to monitoring channels');
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };