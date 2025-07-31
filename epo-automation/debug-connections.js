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

async function debugBulkConnections() {
  console.log('🔍 Debugging Bulk Item EPO Connections\n');
  
  try {
    // Get first 10 bulk batch items with detailed column data
    const bulkItemsQuery = `
      query {
        boards(ids: "${BOARD_IDS.BULK_BATCH_TRACEABILITY}") {
          columns {
            id
            title
            type
          }
          items_page(limit: 10) {
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
    
    const bulkResponse = await monday.api(bulkItemsQuery);
    console.log('Raw API Response:', JSON.stringify(bulkResponse, null, 2));
    
    if (!bulkResponse.data || !bulkResponse.data.boards || bulkResponse.data.boards.length === 0) {
      throw new Error('No boards found in response');
    }
    
    const board = bulkResponse.data.boards[0];
    const columns = board.columns;
    const bulkItems = board.items_page.items;
    
    // Create column lookup
    const columnLookup = {};
    columns.forEach(col => {
      columnLookup[col.id] = col;
    });
    
    console.log(`📋 Examining first ${bulkItems.length} bulk batch items:\n`);
    
    for (const item of bulkItems) {
      console.log(`\n🎯 Item: ${item.name} (ID: ${item.id})`);
      console.log(`   Columns (${item.column_values.length}):`);
      
      // Look for board relation columns
      const relationColumns = item.column_values.filter(col => col.type === 'board_relation');
      
      console.log(`\n   📎 Board Relations (${relationColumns.length}):`);
      relationColumns.forEach(col => {
        const columnDef = columnLookup[col.id];
        console.log(`   - ${columnDef?.title || 'Unknown'} (${col.id})`);
        console.log(`     Text: "${col.text}"`);
        if (col.value) {
          try {
            console.log(`     Value: ${JSON.stringify(JSON.parse(col.value), null, 6)}`);
          } catch (e) {
            console.log(`     Value: ${col.value}`);
          }
        } else {
          console.log(`     Value: null`);
        }
      });
      
      // Specifically check our target EPO connection column
      const epoColumn = item.column_values.find(col => col.id === COLUMN_IDS.BULK_EPO_CONNECTION);
      if (epoColumn) {
        const epoColumnDef = columnLookup[epoColumn.id];
        console.log(`\n   🎯 Target EPO Connection Column: "${epoColumnDef?.title || 'Unknown'}" (${epoColumn.id})`);
        console.log(`      Text: "${epoColumn.text}"`);
        console.log(`      Value: ${epoColumn.value}`);
        
        if (epoColumn.value) {
          try {
            const parsedValue = JSON.parse(epoColumn.value);
            console.log(`      Parsed Value:`, JSON.stringify(parsedValue, null, 8));
            
            if (parsedValue.linkedPulseIds) {
              console.log(`      ✅ Found ${parsedValue.linkedPulseIds.length} linked EPO IDs: ${parsedValue.linkedPulseIds.join(', ')}`);
              
              // Check the status of these EPO items
              if (parsedValue.linkedPulseIds.length > 0) {
                console.log(`\n      🔍 Checking EPO statuses:`);
                const epoIds = parsedValue.linkedPulseIds;
                
                const epoItemsQuery = `
                  query {
                    items(ids: [${epoIds.join(',')}]) {
                      id
                      name
                      column_values(ids: ["${COLUMN_IDS.EPO_STATUS}"]) {
                        id
                        title
                        text
                        value
                      }
                    }
                  }
                `;
                
                const epoResponse = await monday.api(epoItemsQuery);
                const epoItems = epoResponse.data.items;
                
                epoItems.forEach(epo => {
                  const statusColumn = epo.column_values[0];
                  console.log(`         📦 ${epo.name}: ${statusColumn?.text || 'No status'}`);
                });
              }
            } else {
              console.log(`      ⚠️  No linkedPulseIds found in parsed value`);
            }
          } catch (e) {
            console.log(`      ❌ Error parsing value: ${e.message}`);
          }
        } else {
          console.log(`      ⚠️  No value in EPO connection column`);
        }
      } else {
        console.log(`\n   ❌ Target EPO connection column not found!`);
      }
      
      console.log('\n' + '='.repeat(80));
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
  debugBulkConnections();
}

module.exports = { debugBulkConnections };