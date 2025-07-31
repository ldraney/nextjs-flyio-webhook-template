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

const STATUS_VALUES = {
  QA_PASSED: '11', // Index for "QA Passed" status in EPO board
  TO_DO: '8' // Index for "To Do" status in Bulk board (found from the options)
};

/**
 * Main automation function - checks all bulk batch items and updates status
 */
async function runEPOBulkAutomation() {
  console.log('🚀 Starting EPO → Bulk Batch Automation\n');
  
  try {
    // Get all bulk batch items with their EPO connections using proper board relation query
    const bulkItemsQuery = `
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
    
    const bulkResponse = await monday.api(bulkItemsQuery);
    const bulkItems = bulkResponse.data.boards[0].items_page.items;
    
    console.log(`📋 Processing ${bulkItems.length} bulk batch items...\n`);
    
    let updatedCount = 0;
    
    for (const bulkItem of bulkItems) {
      const result = await processBulkItem(bulkItem);
      if (result.updated) {
        updatedCount++;
        console.log(`✅ Updated: ${bulkItem.name} → To Do`);
      } else if (result.reason) {
        console.log(`⏸️  Skipped: ${bulkItem.name} - ${result.reason}`);
      }
    }
    
    console.log(`\n🎯 Automation Complete: ${updatedCount} bulk items updated to "To Do"\n`);
    
    return { processed: bulkItems.length, updated: updatedCount };
    
  } catch (error) {
    console.error('❌ Automation Error:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Process a single bulk item and check if it should be updated
 */
async function processBulkItem(bulkItem) {
  try {
    // Get current bulk status
    const statusColumn = bulkItem.column_values.find(col => col.id === COLUMN_IDS.BULK_STATUS);
    const currentStatus = statusColumn?.text || 'No status';
    
    // Skip if already "To Do" or "Done"
    if (currentStatus === 'To Do' || currentStatus === 'Done') {
      return { updated: false, reason: `Already ${currentStatus}` };
    }
    
    // Get EPO connections from board relation column
    const epoColumns = bulkItem.column_values.filter(col => col.id === COLUMN_IDS.BULK_EPO_CONNECTION);
    const epoColumn = epoColumns[0]; // Should only be one
    
    if (!epoColumn || !epoColumn.linked_items || epoColumn.linked_items.length === 0) {
      return { updated: false, reason: 'No EPO connections' };
    }
    
    const epoIds = epoColumn.linked_items.map(item => item.id);
    console.log(`   Found ${epoIds.length} EPO connections: ${epoColumn.linked_items.map(i => i.name).join(', ')}`);
    
    // Check all connected EPO statuses
    const allEPOsQAPassed = await checkAllEPOsQAPassed(epoIds);
    
    if (!allEPOsQAPassed.allPassed) {
      return { 
        updated: false, 
        reason: `EPOs not ready: ${allEPOsQAPassed.qaPassedCount}/${allEPOsQAPassed.totalCount} QA Passed` 
      };
    }
    
    // Update bulk item to "To Do"
    await updateBulkItemStatus(bulkItem.id, STATUS_VALUES.TO_DO);
    
    return { updated: true };
    
  } catch (error) {
    console.error(`❌ Error processing ${bulkItem.name}:`, error.message);
    return { updated: false, reason: 'Processing error' };
  }
}

/**
 * Check if all EPO items have "QA Passed" or "Cancelled" status
 */
async function checkAllEPOsQAPassed(epoIds) {
  try {
    const epoItemsQuery = `
      query {
        items(ids: [${epoIds.join(',')}]) {
          id
          name
          column_values(ids: ["${COLUMN_IDS.EPO_STATUS}"]) {
            id
            text
            value
          }
        }
      }
    `;
    
    const epoResponse = await monday.api(epoItemsQuery);
    const epoItems = epoResponse.data.items;
    
    let readyCount = 0;
    const totalCount = epoItems.length;
    
    for (const epo of epoItems) {
      const statusColumn = epo.column_values[0];
      const status = statusColumn?.text;
      // Both "QA Passed" and "Cancelled" count as "ready"
      if (status === 'QA Passed' || status === 'Cancelled') {
        readyCount++;
      }
    }
    
    return {
      allPassed: readyCount === totalCount,
      qaPassedCount: readyCount, // Rename to readyCount in future, keeping for compatibility
      totalCount,
      epoItems
    };
    
  } catch (error) {
    console.error('❌ Error checking EPO statuses:', error.message);
    return { allPassed: false, qaPassedCount: 0, totalCount: 0 };
  }
}

/**
 * Process connections for a specific EPO that changed status
 * Only checks bulk items connected to this specific EPO
 */
async function processEPOConnections(epoId) {
  console.log(`🎯 Processing connections for EPO: ${epoId}\n`);
  
  try {
    // Find all bulk items connected to this specific EPO
    const connectedItemsQuery = `
      query {
        items(ids: [${epoId}]) {
          id
          name
          column_values {
            id
            ... on BoardRelationValue {
              linked_items {
                id
                name
                board {
                  id
                  name
                }
              }
            }
          }
        }
      }
    `;
    
    const epoResponse = await monday.api(connectedItemsQuery);
    const epoItem = epoResponse.data.items[0];
    
    if (!epoItem) {
      console.log(`❌ EPO ${epoId} not found`);
      return { processed: 0, updated: 0 };
    }
    
    console.log(`📋 EPO: ${epoItem.name}`);
    
    // Find all board relations from this EPO
    const connectedItems = [];
    
    for (const column of epoItem.column_values) {
      if (column.linked_items && column.linked_items.length > 0) {
        for (const linkedItem of column.linked_items) {
          // Only process items from the Bulk Batch Traceability board
          if (linkedItem.board.id === BOARD_IDS.BULK_BATCH_TRACEABILITY) {
            connectedItems.push(linkedItem);
          }
        }
      }
    }
    
    if (connectedItems.length === 0) {
      console.log(`⏸️  No bulk batch items connected to EPO ${epoItem.name}`);
      return { processed: 0, updated: 0 };
    }
    
    console.log(`🔗 Found ${connectedItems.length} connected bulk items: ${connectedItems.map(i => i.name).join(', ')}\n`);
    
    // Now get full details for each connected bulk item and process them
    const bulkItemIds = connectedItems.map(item => item.id);
    const bulkItemsQuery = `
      query {
        items(ids: [${bulkItemIds.join(',')}]) {
          id
          name
          column_values {
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
    `;
    
    const bulkResponse = await monday.api(bulkItemsQuery);
    const bulkItems = bulkResponse.data.items;
    
    let updatedCount = 0;
    
    for (const bulkItem of bulkItems) {
      const result = await processBulkItem(bulkItem);
      if (result.updated) {
        updatedCount++;
        console.log(`✅ Updated: ${bulkItem.name} → To Do (triggered by EPO ${epoItem.name})`);
      } else if (result.reason) {
        console.log(`⏸️  Skipped: ${bulkItem.name} - ${result.reason}`);
      }
    }
    
    console.log(`\n🎯 Targeted Processing Complete: ${updatedCount}/${bulkItems.length} bulk items updated\n`);
    
    return { processed: bulkItems.length, updated: updatedCount };
    
  } catch (error) {
    console.error('❌ Targeted Processing Error:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    return { processed: 0, updated: 0 };
  }
}

/**
 * Update bulk item status to "To Do"
 */
async function updateBulkItemStatus(itemId, statusValue) {
  try {
    const mutation = `
      mutation {
        change_column_value(
          item_id: ${itemId},
          board_id: ${BOARD_IDS.BULK_BATCH_TRACEABILITY},
          column_id: "${COLUMN_IDS.BULK_STATUS}",
          value: "{\\"index\\":${statusValue}}"
        ) {
          id
        }
      }
    `;
    
    await monday.api(mutation);
    
  } catch (error) {
    console.error(`❌ Error updating item ${itemId}:`, error.message);
    throw error;
  }
}

/**
 * Dry run mode - check what would be updated without making changes
 */
async function dryRunEPOBulkAutomation() {
  console.log('🔍 DRY RUN - EPO → Bulk Batch Automation (No Changes Made)\n');
  
  try {
    const bulkItemsQuery = `
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
    
    const bulkResponse = await monday.api(bulkItemsQuery);
    const bulkItems = bulkResponse.data.boards[0].items_page.items;
    
    console.log(`📋 Analyzing ${bulkItems.length} bulk batch items...\n`);
    
    let wouldUpdateCount = 0;
    
    for (const bulkItem of bulkItems) {
      const statusColumn = bulkItem.column_values.find(col => col.id === COLUMN_IDS.BULK_STATUS);
      const currentStatus = statusColumn?.text || 'No status';
      
      const epoColumns = bulkItem.column_values.filter(col => col.id === COLUMN_IDS.BULK_EPO_CONNECTION);
      const epoColumn = epoColumns[0]; // Should only be one
      
      if (!epoColumn || !epoColumn.linked_items || epoColumn.linked_items.length === 0) {
        console.log(`⏸️  ${bulkItem.name} - No EPO connections`);
        continue;
      }
      
      const epoIds = epoColumn.linked_items.map(item => item.id);
      console.log(`📦 ${bulkItem.name} - ${epoIds.length} EPOs: ${epoColumn.linked_items.map(i => i.name).join(', ')}`);
      
      if (currentStatus === 'To Do' || currentStatus === 'Done') {
        console.log(`⏸️  ${bulkItem.name} - Already ${currentStatus}`);
        continue;
      }
      
      const allEPOsQAPassed = await checkAllEPOsQAPassed(epoIds);
      
      if (allEPOsQAPassed.allPassed) {
        console.log(`✅ WOULD UPDATE: ${bulkItem.name} (${currentStatus} → To Do)`);
        wouldUpdateCount++;
      } else {
        console.log(`⏸️  ${bulkItem.name} - EPOs: ${allEPOsQAPassed.qaPassedCount}/${allEPOsQAPassed.totalCount} QA Passed`);
      }
    }
    
    console.log(`\n🎯 Dry Run Complete: ${wouldUpdateCount} bulk items would be updated to "To Do"\n`);
    
  } catch (error) {
    console.error('❌ Dry Run Error:', error.message);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || args.includes('-d');
  const targetedIndex = args.indexOf('--targeted');
  
  if (targetedIndex !== -1 && targetedIndex + 1 < args.length) {
    // Targeted processing for specific EPO
    const epoId = args[targetedIndex + 1];
    await processEPOConnections(epoId);
  } else if (isDryRun) {
    await dryRunEPOBulkAutomation();
  } else {
    await runEPOBulkAutomation();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { 
  runEPOBulkAutomation, 
  dryRunEPOBulkAutomation,
  processEPOConnections,
  processBulkItem,
  checkAllEPOsQAPassed 
};