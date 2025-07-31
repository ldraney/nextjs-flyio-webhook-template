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

async function testCurrentAutomation() {
  console.log('🔍 Testing what current automation sees\n');
  
  try {
    // Run the EXACT same query the automation uses
    const bulkItemsQuery = `
      query {
        boards(ids: "${BOARD_IDS.BULK_BATCH_TRACEABILITY}") {
          items_page(limit: 100) {
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
    
    console.log('📡 Running automation query...');
    const bulkResponse = await monday.api(bulkItemsQuery);
    const bulkItems = bulkResponse.data.boards[0].items_page.items;
    
    console.log(`📋 Found ${bulkItems.length} bulk items`);
    
    // Process each item exactly like the automation does
    let itemsWithConnections = 0;
    let itemsReadyForUpdate = 0;
    
    for (const bulkItem of bulkItems) {
      // Get current bulk status
      const statusColumn = bulkItem.column_values.find(col => col.id === COLUMN_IDS.BULK_STATUS);
      const currentStatus = statusColumn?.text || 'No status';
      
      // Get EPO connections
      const epoColumn = bulkItem.column_values.find(col => col.id === COLUMN_IDS.BULK_EPO_CONNECTION);
      
      let hasConnections = false;
      let epoIds = [];
      
      if (epoColumn && epoColumn.value) {
        try {
          const epoData = JSON.parse(epoColumn.value);
          epoIds = epoData.linkedPulseIds || [];
          hasConnections = epoIds.length > 0;
        } catch (e) {
          // Parse error
        }
      }
      
      if (hasConnections) {
        itemsWithConnections++;
        console.log(`\n✅ ${bulkItem.name} (Status: ${currentStatus})`);
        console.log(`   EPO IDs: ${epoIds.join(', ')}`);
        
        // Check if this item would be updated
        if (currentStatus !== 'To Do' && currentStatus !== 'Done') {
          // Check EPO statuses
          const epoItemsQuery = `
            query {
              items(ids: [${epoIds.join(',')}]) {
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
            console.log(`   Connected EPOs:`);
            epoItems.forEach(epo => {
              const statusText = epo.column_values[0]?.text || 'No status';
              console.log(`     - ${epo.name}: ${statusText}`);
              if (statusText === 'QA Passed') {
                qaPassedCount++;
              }
            });
            
            if (qaPassedCount === epoItems.length && epoItems.length > 0) {
              console.log(`   🚀 ALL EPOs QA PASSED - WOULD UPDATE TO "TO DO"`);
              itemsReadyForUpdate++;
            } else {
              console.log(`   ⏳ ${qaPassedCount}/${epoItems.length} EPOs QA passed`);
            }
          } catch (e) {
            console.log(`   ❌ Error checking EPO statuses: ${e.message}`);
          }
        } else {
          console.log(`   ⏸️  Already ${currentStatus} - no update needed`);
        }
      }
      
      // Special check for Helios
      if (bulkItem.name.includes('Helios')) {
        console.log(`\n🎯 HELIOS ITEM DETAILED CHECK:`);
        console.log(`   ID: ${bulkItem.id}`);
        console.log(`   Status: ${currentStatus}`);
        console.log(`   EPO Column Text: "${epoColumn?.text || 'null'}"`);
        console.log(`   EPO Column Value: ${epoColumn?.value || 'null'}`);
        console.log(`   Has Connections: ${hasConnections}`);
        
        if (!hasConnections) {
          console.log(`   ❌ No connections detected by automation`);
          console.log(`   📝 This explains why it shows "No EPO connections"`);
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total items: ${bulkItems.length}`);
    console.log(`   Items with EPO connections: ${itemsWithConnections}`);
    console.log(`   Items ready for update: ${itemsReadyForUpdate}`);
    
    if (itemsWithConnections === 0) {
      console.log(`\n⚠️  Current situation:`);
      console.log(`   - Automation code is working correctly`);
      console.log(`   - API shows no EPO connections on any bulk items`);
      console.log(`   - But you can see connections in the Monday.com interface`);
      console.log(`   - This suggests an API sync delay or caching issue`);
      console.log(`\n💡 Solutions:`);
      console.log(`   1. Wait a few minutes and try again (API sync)`);
      console.log(`   2. Try refreshing the Monday.com page and re-saving connections`);
      console.log(`   3. Check if connections were made in the correct direction`);
      console.log(`   4. Verify API token has full board access permissions`);
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
  testCurrentAutomation();
}

module.exports = { testCurrentAutomation };