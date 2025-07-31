const mondaySDK = require('monday-sdk-js');
require('dotenv').config();

const monday = mondaySDK();
monday.setToken(process.env.MONDAY_API_TOKEN);

async function verifyEPOAndBulkBoards() {
  console.log('🔍 Verifying EPO and Bulk Batch Traceability Boards\n');
  
  try {
    // Based on the trace data:
    // EPO - Ingredients board: 9387127195 (VRM - Purchasing workspace: 11346231)
    // Bulk Batch Traceability board: 8768285252 (Lab workspace: 9736208)
    
    const boardIds = {
      epoIngredients: '9387127195',
      bulkBatchTraceability: '8768285252'
    };
    
    // Query to get board details and columns
    const boardQuery = `
      query($boardIds: [ID!]) {
        boards(ids: $boardIds) {
          id
          name
          workspace {
            id
            name
          }
          columns {
            id
            title
            type
            settings_str
          }
        }
      }
    `;
    
    const response = await monday.api(boardQuery, {
      variables: { boardIds: Object.values(boardIds) }
    });
    
    const boards = response.data.boards;
    
    // Display board information
    boards.forEach(board => {
      console.log(`📋 Board: ${board.name}`);
      console.log(`   ID: ${board.id}`);
      console.log(`   Workspace: ${board.workspace.name} (${board.workspace.id})`);
      console.log(`   Total Columns: ${board.columns.length}`);
      
      // Find status columns
      const statusColumns = board.columns.filter(col => col.type === 'status');
      console.log(`\n   Status Columns (${statusColumns.length}):`);
      statusColumns.forEach(col => {
        console.log(`   - ${col.title} (${col.id})`);
        if (col.settings_str) {
          try {
            const settings = JSON.parse(col.settings_str);
            if (settings.labels) {
              console.log(`     Options: ${Object.values(settings.labels).join(', ')}`);
            }
          } catch (e) {
            // Settings parsing failed
          }
        }
      });
      
      // Find board relation columns
      const relationColumns = board.columns.filter(col => col.type === 'board_relation');
      console.log(`\n   Board Relations (${relationColumns.length}):`);
      relationColumns.forEach(col => {
        console.log(`   - ${col.title} (${col.id})`);
        if (col.settings_str) {
          try {
            const settings = JSON.parse(col.settings_str);
            if (settings.boardIds) {
              console.log(`     Connected to boards: ${settings.boardIds.join(', ')}`);
            }
          } catch (e) {
            // Settings parsing failed
          }
        }
      });
      console.log('\n' + '='.repeat(60) + '\n');
    });
    
    // Verify the connection between boards
    const epoBoard = boards.find(b => b.id === boardIds.epoIngredients);
    const bulkBoard = boards.find(b => b.id === boardIds.bulkBatchTraceability);
    
    if (epoBoard && bulkBoard) {
      console.log('✅ Both boards found!\n');
      
      // Check if EPO board has connection to Bulk Batch
      const epoBulkRelation = epoBoard.columns.find(col => 
        col.type === 'board_relation' && col.title.toLowerCase().includes('bulk')
      );
      
      if (epoBulkRelation) {
        console.log(`✅ EPO board has connection to Bulk: "${epoBulkRelation.title}"`);
      }
      
      // Check if Bulk board has connection to EPO
      const bulkEpoRelation = bulkBoard.columns.find(col => 
        col.type === 'board_relation' && col.title.toLowerCase().includes('epo')
      );
      
      if (bulkEpoRelation) {
        console.log(`✅ Bulk board has connection to EPO: "${bulkEpoRelation.title}"`);
      }
      
      // Find QA Passed status option
      const epoStatusColumn = epoBoard.columns.find(col => 
        col.type === 'status' && col.title.toLowerCase().includes('status')
      );
      
      if (epoStatusColumn) {
        console.log(`\n📊 EPO Status Column: "${epoStatusColumn.title}" (${epoStatusColumn.id})`);
        try {
          const settings = JSON.parse(epoStatusColumn.settings_str);
          const qaPassedLabel = Object.entries(settings.labels || {}).find(([key, value]) => 
            value.toLowerCase().includes('qa passed')
          );
          if (qaPassedLabel) {
            console.log(`   ✅ Found "QA Passed" status: ${qaPassedLabel[1]} (index: ${qaPassedLabel[0]})`);
          } else {
            console.log(`   ⚠️  No "QA Passed" status found. Available statuses:`);
            Object.values(settings.labels || {}).forEach(label => {
              console.log(`      - ${label}`);
            });
          }
        } catch (e) {
          console.log('   ❌ Could not parse status settings');
        }
      }
    }
    
    return { boards, boardIds };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run if called directly
if (require.main === module) {
  verifyEPOAndBulkBoards();
}

module.exports = { verifyEPOAndBulkBoards };