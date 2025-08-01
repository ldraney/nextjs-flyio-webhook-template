#!/usr/bin/env node

// Simple webhook creation for Monday.com
require('dotenv').config();

// Use fetch polyfill for Node.js
if (!global.fetch) {
  global.fetch = require('node-fetch');
}

const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;
const EPO_BOARD_ID = '9387127195';
const WEBHOOK_URL = 'https://pel-epo-automation.fly.dev/api/epo-automation';

async function createWebhook() {
  console.log('🚀 Creating Monday.com webhook...\n');
  
  try {
    // Try different webhook events that might work
    const events = ['change_column_value', 'change_status_column_value', 'update_column_value'];
    
    for (const event of events) {
      console.log(`Trying event: ${event}`);
      
      const createQuery = `mutation {
        create_webhook (
          board_id: ${EPO_BOARD_ID},
          url: "${WEBHOOK_URL}",
          event: ${event}
        ) {
          id
          board_id
          event
        }
      }`;
      
      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Authorization': MONDAY_API_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: createQuery })
      });
      
      const result = await response.json();
      
      if (result.data?.create_webhook?.id) {
        console.log(`\n✅ Webhook created successfully!`);
        console.log(`   Webhook ID: ${result.data.create_webhook.id}`);
        console.log(`   Board ID: ${result.data.create_webhook.board_id}`);
        console.log(`   Event: ${result.data.create_webhook.event}`);
        console.log(`   URL: ${WEBHOOK_URL}`);
        return;
      } else if (result.errors) {
        console.log(`❌ ${event} failed:`, result.errors[0]?.message || 'Unknown error');
      }
    }
    
    console.log('\n❌ All webhook creation attempts failed.');
    console.log('\n💡 Alternative: Set up webhook manually in Monday.com UI:');
    console.log('   1. Go to your EPO board');
    console.log('   2. Click "Integrate" button');
    console.log('   3. Search for "Webhook"');
    console.log('   4. Configure with:');
    console.log(`      - URL: ${WEBHOOK_URL}`);
    console.log('      - Event: When status changes');
    console.log('      - Column: Status (deal_stage)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the creation
createWebhook();