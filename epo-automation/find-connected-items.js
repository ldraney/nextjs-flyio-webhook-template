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

async function findConnectedBulkItems() {
  console.log('🔍 Searching for Bulk Items with EPO Connections\n');
  
  try {
    let cursor = null;
    let connectedItems = [];
    let totalItems = 0;
    
    while (true) {
      // Use pagination to go through all items
      const bulkItemsQuery = `
        query {
          boards(ids: "${BOARD_IDS.BULK_BATCH_TRACEABILITY}") {
            items_page(limit: 100${cursor ? `, cursor: "${cursor}"` : ''}) {
              cursor
              items {
                id
                name
                column_values(ids: ["${COLUMN_IDS.BULK_STATUS}", "${COLUMN_IDS.BULK_EPO_CONNECTION}"]) {
                  id
                  text
                  value
                }
              }
            }
          }
        }
      `;
      
      const bulkResponse = await monday.api(bulkItemsQuery);
      
      if (!bulkResponse.data || !bulkResponse.data.boards || bulkResponse.data.boards.length === 0) {
        break;
      }
      
      const itemsPage = bulkResponse.data.boards[0].items_page;
      const bulkItems = itemsPage.items;
      
      totalItems += bulkItems.length;
      console.log(`📋 Checking items ${totalItems - bulkItems.length + 1} - ${totalItems}...`);
      
      for (const item of bulkItems) {
        const epoColumn = item.column_values.find(col => col.id === COLUMN_IDS.BULK_EPO_CONNECTION);
        
        if (epoColumn && epoColumn.value && epoColumn.value !== 'null') {
          try {
            const parsedValue = JSON.parse(epoColumn.value);
            if (parsedValue.linkedPulseIds && parsedValue.linkedPulseIds.length > 0) {
              const statusColumn = item.column_values.find(col => col.id === COLUMN_IDS.BULK_STATUS);
              
              connectedItems.push({
                id: item.id,
                name: item.name,
                status: statusColumn?.text || 'Unknown',
                epoIds: parsedValue.linkedPulseIds,
                epoCount: parsedValue.linkedPulseIds.length
              });
              
              console.log(`✅ Found: ${item.name} (Status: ${statusColumn?.text}) - ${parsedValue.linkedPulseIds.length} EPO connections`);
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
      
      // Check if there are more items
      cursor = itemsPage.cursor;
      if (!cursor) {
        break;
      }
    }
    
    console.log(`\n📊 Results:`);
    console.log(`   Total bulk items checked: ${totalItems}`);
    console.log(`   Items with EPO connections: ${connectedItems.length}`);
    
    if (connectedItems.length > 0) {
      console.log(`\n🎯 Items with EPO connections:`);
      
      for (const item of connectedItems) {
        console.log(`\n   📦 ${item.name} (ID: ${item.id})`);
        console.log(`      Status: ${item.status}`);
        console.log(`      EPO Count: ${item.epoCount}`);
        console.log(`      EPO IDs: ${item.epoIds.join(', ')}`);
        
        // Check the status of connected EPO items
        if (item.epoIds.length > 0) {
          const epoItemsQuery = `
            query {
              items(ids: [${item.epoIds.join(',')}]) {
                id
                name
                column_values(ids: ["${COLUMN_IDS.EPO_STATUS}"]) {
                  text
                }
              }
            }
          `;
          
          try {
            const epoResponse = await monday.api(epoItemsQuery);
            const epoItems = epoResponse.data.items;
            
            let qaPassedCount = 0;
            console.log(`      EPO Statuses:`);
            epoItems.forEach(epo => {
              const statusText = epo.column_values[0]?.text || 'No status';
              console.log(`         - ${epo.name}: ${statusText}`);
              if (statusText === 'QA Passed') {
                qaPassedCount++;
              }
            });
            
            const allPassed = qaPassedCount === epoItems.length;
            console.log(`      ✨ ${qaPassedCount}/${epoItems.length} EPOs are QA Passed ${allPassed ? '- READY FOR UPDATE!' : ''}`);
            
            if (allPassed && item.status !== 'To Do' && item.status !== 'Done') {
              console.log(`      🚀 This item would be updated to "To Do" by automation!`);
            }
          } catch (e) {
            console.log(`      ❌ Error checking EPO statuses: ${e.message}`);
          }
        }
      }
    } else {
      console.log(`\n⚠️  No bulk items found with EPO connections.`);
      console.log(`   This suggests that:`);
      console.log(`   - EPO connections need to be manually established in Monday.com`);
      console.log(`   - The workflow may not be fully implemented yet`);
      console.log(`   - Items are using different connection methods`);
    }
    
    return connectedItems;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run if called directly
if (require.main === module) {
  findConnectedBulkItems();
}

module.exports = { findConnectedBulkItems };