#!/usr/bin/env node

// Check Monday.com API permissions and board access
require('dotenv').config();

// Use fetch polyfill for Node.js
if (!global.fetch) {
  global.fetch = require('node-fetch');
}

const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;
const EPO_BOARD_ID = '9387127195';

async function checkPermissions() {
  console.log('🔍 Checking Monday.com API permissions and board access...\n');
  
  if (!MONDAY_API_TOKEN) {
    console.error('❌ Error: MONDAY_API_TOKEN not found in environment variables');
    process.exit(1);
  }
  
  try {
    // Test basic API access
    console.log('1. Testing basic API access...');
    const meQuery = `{
      me {
        id
        name
        email
      }
    }`;
    
    const meResponse = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Authorization': MONDAY_API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: meQuery })
    });
    
    const meResult = await meResponse.json();
    
    if (meResult.errors) {
      console.error('❌ API Access Error:', meResult.errors);
      return;
    }
    
    console.log(`✅ API Access OK - User: ${meResult.data.me.name} (${meResult.data.me.email})`);
    
    // Test board access
    console.log('\n2. Testing board access...');
    const boardQuery = `{
      boards(ids: [${EPO_BOARD_ID}]) {
        id
        name
        permissions
        columns {
          id
          title
          type
        }
      }
    }`;
    
    const boardResponse = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Authorization': MONDAY_API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: boardQuery })
    });
    
    const boardResult = await boardResponse.json();
    
    if (boardResult.errors) {
      console.error('❌ Board Access Error:', boardResult.errors);
      return;
    }
    
    if (boardResult.data?.boards?.length === 0) {
      console.error('❌ No access to board ' + EPO_BOARD_ID);
      return;
    }
    
    const board = boardResult.data.boards[0];
    console.log(`✅ Board Access OK - "${board.name}" (ID: ${board.id})`);
    console.log(`   Permissions: ${board.permissions}`);
    
    // Find the deal_stage column
    const dealStageColumn = board.columns.find(col => col.id === 'deal_stage');
    if (dealStageColumn) {
      console.log(`✅ Found deal_stage column: "${dealStageColumn.title}" (${dealStageColumn.type})`);
    } else {
      console.log('⚠️  deal_stage column not found in board columns');
      console.log('Available columns:');
      board.columns.forEach(col => {
        console.log(`   - ${col.id}: "${col.title}" (${col.type})`);
      });
    }
    
    // Check existing webhooks
    console.log('\n3. Checking existing webhooks...');
    const webhookQuery = `{
      webhooks (board_id: ${EPO_BOARD_ID}) {
        id
        board_id
        event
      }
    }`;
    
    const webhookResponse = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Authorization': MONDAY_API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: webhookQuery })
    });
    
    const webhookResult = await webhookResponse.json();
    
    if (webhookResult.errors) {
      console.error('❌ Webhook Query Error:', webhookResult.errors);
      return;
    }
    
    if (webhookResult.data?.webhooks?.length > 0) {
      console.log(`Found ${webhookResult.data.webhooks.length} existing webhooks:`);
      webhookResult.data.webhooks.forEach(webhook => {
        console.log(`   - ID: ${webhook.id}, Board: ${webhook.board_id}, Event: ${webhook.event}`);
        console.log(`     URL: ${webhook.url}`);
      });
    } else {
      console.log('No existing webhooks found');
    }
    
    console.log('\n✅ Permission check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the check
checkPermissions();