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

async function testFixedQuery() {
  console.log('🔍 Testing fixed GraphQL query\n');
  
  try {
    // Test the exact query from automation
    const bulkItemsQuery = `
      query {
        boards(ids: "${BOARD_IDS.BULK_BATCH_TRACEABILITY}") {
          items_page(limit: 10) {
            items {
              id
              name
              column_values(ids: ["${COLUMN_IDS.BULK_STATUS}"]) {
                id
                text
                value
              }
              column_values(ids: ["${COLUMN_IDS.BULK_EPO_CONNECTION}"]) {
                id
                text
                value
                ... on BoardRelationValue {
                  linked_items {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    console.log('📡 Running query...');
    const bulkResponse = await monday.api(bulkItemsQuery);
    
    console.log('Raw response:', JSON.stringify(bulkResponse, null, 2));
    
    if (bulkResponse.data && bulkResponse.data.boards && bulkResponse.data.boards[0]) {
      const bulkItems = bulkResponse.data.boards[0].items_page.items;
      console.log(`\n✅ Found ${bulkItems.length} items`);
      
      // Check first item with connections
      for (const item of bulkItems) {
        const epoColumns = item.column_values.filter(col => col.id === COLUMN_IDS.BULK_EPO_CONNECTION);
        const epoColumn = epoColumns[0];
        
        if (epoColumn && epoColumn.linked_items && epoColumn.linked_items.length > 0) {
          console.log(`\n📦 ${item.name}`);
          console.log(`   EPO connections: ${epoColumn.linked_items.map(i => i.name).join(', ')}`);
          break;
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run if called directly
if (require.main === module) {
  testFixedQuery();
}

module.exports = { testFixedQuery };