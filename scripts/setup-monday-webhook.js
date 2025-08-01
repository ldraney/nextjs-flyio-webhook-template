#!/usr/bin/env node

// Setup Monday.com webhook for EPO status changes
require('dotenv').config();

// Use fetch polyfill for Node.js
if (!global.fetch) {
  global.fetch = require('node-fetch');
}

const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;
const EPO_BOARD_ID = '9387127195';
const WEBHOOK_URL = 'https://pel-epo-automation.fly.dev/api/epo-automation';

async function setupWebhook() {
  console.log('🚀 Setting up Monday.com webhook for EPO automation...\n');
  
  if (!MONDAY_API_TOKEN) {
    console.error('❌ Error: MONDAY_API_TOKEN not found in environment variables');
    process.exit(1);
  }
  
  // First, check existing webhooks
  const checkQuery = `{
    webhooks {
      id
      board_id
      url
      event
    }
  }`;
  
  try {
    console.log('📋 Checking existing webhooks...');
    const checkResponse = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Authorization': MONDAY_API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: checkQuery })
    });
    
    const existingWebhooks = await checkResponse.json();
    
    if (existingWebhooks.data?.webhooks) {
      console.log(`Found ${existingWebhooks.data.webhooks.length} existing webhooks:`);
      existingWebhooks.data.webhooks.forEach(webhook => {
        console.log(`- ID: ${webhook.id}, Board: ${webhook.board_id}, Event: ${webhook.event}`);
        console.log(`  URL: ${webhook.url}`);
      });
      
      // Check if webhook already exists for our board and URL
      const existing = existingWebhooks.data.webhooks.find(
        w => w.board_id === EPO_BOARD_ID && w.url === WEBHOOK_URL
      );
      
      if (existing) {
        console.log(`\n⚠️  Webhook already exists for EPO board with our URL (ID: ${existing.id})`);
        console.log('No need to create a new one.');
        return;
      }
    }
    
    // Create new webhook
    console.log('\n🔨 Creating new webhook...');
    const createQuery = `mutation {
      create_webhook (
        board_id: ${EPO_BOARD_ID},
        url: "${WEBHOOK_URL}",
        event: change_column_value
      ) {
        id
      }
    }`;
    
    const createResponse = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Authorization': MONDAY_API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: createQuery })
    });
    
    const result = await createResponse.json();
    
    if (result.errors) {
      console.error('❌ Error creating webhook:', result.errors);
      process.exit(1);
    }
    
    if (result.data?.create_webhook?.id) {
      console.log(`\n✅ Webhook successfully created!`);
      console.log(`   Webhook ID: ${result.data.create_webhook.id}`);
      console.log(`   Board ID: ${EPO_BOARD_ID} (EPO Board)`);
      console.log(`   URL: ${WEBHOOK_URL}`);
      console.log(`   Event: change_column_value`);
      console.log('\n📝 The webhook will trigger when ANY column value changes on the EPO board.');
      console.log('   Your endpoint filters for "deal_stage" column changes to "QA Passed" or "Cancelled".');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupWebhook();