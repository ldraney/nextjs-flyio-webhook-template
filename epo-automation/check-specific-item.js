// Polyfill fetch for Node.js environments
if (!global.fetch) {
  global.fetch = require('node-fetch');
}

const mondaySDK = require('monday-sdk-js');
require('dotenv').config();

const monday = mondaySDK();
monday.setToken(process.env.MONDAY_API_TOKEN);

const BOARD_IDS = {
  EPO_INGREDIENTS: '9387127195',
  BULK_BATCH_TRACEABILITY: '8768285252'
};

const COLUMN_IDS = {
  EPO_STATUS: 'deal_stage',
  BULK_STATUS: 'color_mkpbpmsh',
  BULK_EPO_CONNECTION: 'board_relation_mks3g2kq'
};

async function checkSpecificItem() {
  console.log('🔍 Checking WO-001297 Helios specifically\n');
  
  try {
    // First, search for the item by name
    const searchQuery = `
      query {
        boards(ids: "${BOARD_IDS.BULK_BATCH_TRACEABILITY}") {
          items_page(limit: 100) {
            items {
              id
              name
              column_values {
                id
                text
                value
                type
              }
            }
          }
        }
      }
    `;
    
    const response = await monday.api(searchQuery);
    const items = response.data.boards[0].items_page.items;
    
    // Find the Helios item
    const heliosItem = items.find(item => item.name.includes('WO-001297 Helios'));
    
    if (!heliosItem) {
      console.log('❌ Could not find WO-001297 Helios');
      return;
    }
    
    console.log(`✅ Found item: ${heliosItem.name} (ID: ${heliosItem.id})`);
    console.log('\n📋 All column values:');
    
    heliosItem.column_values.forEach(col => {
      if (col.type === 'board_relation') {
        console.log(`\n🔗 Board Relation: ${col.id}`);
        console.log(`   Text: "${col.text}"`);
        console.log(`   Value: ${col.value}`);
        
        if (col.value && col.value !== 'null') {
          try {
            const parsed = JSON.parse(col.value);
            console.log(`   Parsed:`, JSON.stringify(parsed, null, 4));
          } catch (e) {
            console.log(`   Parse error: ${e.message}`);
          }
        }
      }
    });
    
    // Specifically check the EPO connection column
    const epoColumn = heliosItem.column_values.find(col => col.id === COLUMN_IDS.BULK_EPO_CONNECTION);
    console.log(`\n🎯 Target EPO Connection Column (${COLUMN_IDS.BULK_EPO_CONNECTION}):`);
    console.log(`   Found: ${epoColumn ? 'Yes' : 'No'}`);
    
    if (epoColumn) {
      console.log(`   Text: "${epoColumn.text}"`);
      console.log(`   Value: ${epoColumn.value}`);
      console.log(`   Type: ${epoColumn.type}`);
    }
    
    // Let me also get the board columns to see their titles
    console.log('\n📊 Getting board column definitions...');
    const columnsQuery = `
      query {
        boards(ids: "${BOARD_IDS.BULK_BATCH_TRACEABILITY}") {
          columns {
            id
            title
            type
            settings_str
          }
        }
      }
    `;
    
    const columnsResponse = await monday.api(columnsQuery);
    const columns = columnsResponse.data.boards[0].columns;
    
    console.log('\n🔗 All Board Relation columns:');
    columns.filter(col => col.type === 'board_relation').forEach(col => {
      console.log(`\n   - ${col.title} (${col.id})`);
      if (col.settings_str) {
        try {
          const settings = JSON.parse(col.settings_str);
          console.log(`     Connected boards: ${settings.boardIds?.join(', ') || 'None'}`);
        } catch (e) {
          // Ignore
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run if called directly
if (require.main === module) {
  checkSpecificItem();
}

module.exports = { checkSpecificItem };