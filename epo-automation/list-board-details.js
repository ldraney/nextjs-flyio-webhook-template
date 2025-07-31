// Polyfill fetch for Node.js environments
if (!global.fetch) {
  global.fetch = require('node-fetch');
}

const mondaySDK = require('monday-sdk-js');
require('dotenv').config();

const monday = mondaySDK();
monday.setToken(process.env.MONDAY_API_TOKEN);

const BOARD_ID = '8768285252'; // Bulk Batch Traceability

async function listBoardDetails() {
  console.log('📋 Bulk Batch Traceability Board Details\n');
  
  try {
    // Get board info and all columns
    const boardQuery = `
      query {
        boards(ids: "${BOARD_ID}") {
          id
          name
          description
          workspace {
            id
            name
          }
          columns {
            id
            title
            type
            description
            settings_str
          }
        }
      }
    `;
    
    const response = await monday.api(boardQuery);
    const board = response.data.boards[0];
    
    console.log(`Board: ${board.name}`);
    console.log(`ID: ${board.id}`);
    console.log(`Workspace: ${board.workspace.name} (${board.workspace.id})`);
    console.log(`Description: ${board.description || 'None'}`);
    
    console.log(`\n📊 Columns (${board.columns.length}):\n`);
    
    board.columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col.title}`);
      console.log(`   ID: ${col.id}`);
      console.log(`   Type: ${col.type}`);
      
      if (col.description) {
        console.log(`   Description: ${col.description}`);
      }
      
      // Parse settings for board relation columns
      if (col.type === 'board_relation' && col.settings_str) {
        try {
          const settings = JSON.parse(col.settings_str);
          console.log(`   Connected Board IDs: ${settings.boardIds?.join(', ') || 'None'}`);
          if (settings.linkedColumnId) {
            console.log(`   Linked Column: ${settings.linkedColumnId}`);
          }
        } catch (e) {
          console.log(`   Settings: ${col.settings_str}`);
        }
      }
      
      // Parse settings for status columns
      if (col.type === 'status' && col.settings_str) {
        try {
          const settings = JSON.parse(col.settings_str);
          if (settings.labels) {
            const labels = Object.entries(settings.labels).map(([index, label]) => `${index}: "${label}"`);
            console.log(`   Options: ${labels.join(', ')}`);
          }
        } catch (e) {
          // Ignore
        }
      }
      
      console.log('');
    });
    
    // Focus on board relation columns
    const boardRelations = board.columns.filter(col => col.type === 'board_relation');
    console.log(`\n🔗 Board Relation Columns (${boardRelations.length}):\n`);
    
    boardRelations.forEach(col => {
      console.log(`- ${col.title} (${col.id})`);
      if (col.settings_str) {
        try {
          const settings = JSON.parse(col.settings_str);
          if (settings.boardIds && settings.boardIds.length > 0) {
            console.log(`  → Connects to board(s): ${settings.boardIds.join(', ')}`);
          }
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
  listBoardDetails();
}

module.exports = { listBoardDetails };