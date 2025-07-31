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

async function deepInspectHelios() {
  console.log('🔍 Deep inspection of WO-001297 Helios\n');
  
  try {
    // Get the specific item with ALL column values
    const itemQuery = `
      query {
        items(ids: [9689735970]) {
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
    `;
    
    console.log('📡 Querying item directly by ID...');
    const response = await monday.api(itemQuery);
    const item = response.data.items[0];
    
    console.log(`✅ Item: ${item.name} (ID: ${item.id})`);
    console.log(`\n📋 ALL Column Values (${item.column_values.length}):`);
    
    item.column_values.forEach((col, index) => {
      console.log(`\n${index + 1}. Column ID: ${col.id}`);
      console.log(`   Type: ${col.type}`);
      console.log(`   Text: "${col.text}"`);
      console.log(`   Value: ${col.value}`);
      
      if (col.type === 'board_relation' && col.value && col.value !== 'null') {
        try {
          const parsed = JSON.parse(col.value);
          console.log(`   ✨ PARSED:`, JSON.stringify(parsed, null, 6));
        } catch (e) {
          console.log(`   Parse error: ${e.message}`);
        }
      }
    });
    
    // Also try a broader search to see if there's a connection we're missing
    console.log('\n\n🔍 Checking if any EPO items reference this bulk item...');
    
    // Search EPO items that might reference this bulk item
    const epoSearchQuery = `
      query {
        boards(ids: "${BOARD_IDS.EPO_INGREDIENTS}") {
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
    
    const epoResponse = await monday.api(epoSearchQuery);
    const epoItems = epoResponse.data.boards[0].items_page.items;
    
    console.log(`📦 Checking ${epoItems.length} EPO items for connections...`);
    
    let foundConnections = 0;
    epoItems.forEach(epoItem => {
      const relationColumns = epoItem.column_values.filter(col => col.type === 'board_relation');
      
      relationColumns.forEach(col => {
        if (col.value && col.value !== 'null') {
          try {
            const parsed = JSON.parse(col.value);
            if (parsed.linkedPulseIds && parsed.linkedPulseIds.includes('9689735970')) {
              console.log(`\n🎯 FOUND CONNECTION! EPO "${epoItem.name}" (${epoItem.id}) links to Helios`);
              console.log(`   Column: ${col.id}`);
              console.log(`   Connection data:`, JSON.stringify(parsed, null, 4));
              foundConnections++;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      });
    });
    
    if (foundConnections === 0) {
      console.log('\n❌ No EPO items found linking to Helios');
      console.log('\nThis could mean:');
      console.log('1. The connection is very recent and API needs time to sync');
      console.log('2. The connection is on a different board or column');
      console.log('3. The connection is one-way (Bulk→EPO but not EPO→Bulk)');
      console.log('4. The API token might need additional permissions');
    } else {
      console.log(`\n✅ Found ${foundConnections} EPO connections to Helios`);
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
  deepInspectHelios();
}

module.exports = { deepInspectHelios };