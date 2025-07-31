// Polyfill fetch for Node.js environments
if (!global.fetch) {
  global.fetch = require('node-fetch');
}

const mondaySDK = require('monday-sdk-js');
require('dotenv').config();

const monday = mondaySDK();
monday.setToken(process.env.MONDAY_API_TOKEN);

async function queryHeliosDirect() {
  console.log('🔍 Direct Query of WO-001297 Helios\n');
  
  try {
    // Method 1: Query by exact name
    console.log('Method 1: Searching by name...');
    const searchByNameQuery = `
      query {
        items_page_by_column_values(
          board_id: 8768285252,
          columns: [{column_id: "name", column_values: ["WO-001297 Helios"]}]
        ) {
          items {
            id
            name
            column_values {
              id
              text
              value
            }
          }
        }
      }
    `;
    
    const nameResponse = await monday.api(searchByNameQuery);
    console.log('Name search response:', JSON.stringify(nameResponse, null, 2));
    
    // Method 2: Get a fresh list and find Helios
    console.log('\n\nMethod 2: Fresh query of board items...');
    const freshQuery = `
      query {
        boards(ids: "8768285252") {
          items_page(limit: 10) {
            items {
              id
              name
              updated_at
              column_values(ids: ["board_relation_mks3g2kq", "color_mkpbpmsh"]) {
                id
                text
                value
              }
            }
          }
        }
      }
    `;
    
    const freshResponse = await monday.api(freshQuery);
    const items = freshResponse.data.boards[0].items_page.items;
    
    // Find Helios
    const helios = items.find(item => item.name.includes('Helios'));
    if (helios) {
      console.log('\n✅ Found Helios:');
      console.log(`   Name: ${helios.name}`);
      console.log(`   ID: ${helios.id}`);
      console.log(`   Last Updated: ${helios.updated_at}`);
      console.log('\n   Column Values:');
      helios.column_values.forEach(col => {
        console.log(`   - ${col.id}:`);
        console.log(`     Text: "${col.text}"`);
        console.log(`     Value: ${col.value}`);
      });
    }
    
    // Method 3: Try GraphQL complexity API
    console.log('\n\nMethod 3: Using complexity query...');
    const complexityQuery = `
      query {
        complexity {
          query
        }
        items(ids: [9689735970]) {
          id
          name
          board {
            id
            name
          }
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
    
    try {
      const complexityResponse = await monday.api(complexityQuery);
      console.log('Complexity response:', JSON.stringify(complexityResponse, null, 2));
    } catch (e) {
      console.log('Complexity query error:', e.message);
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
  queryHeliosDirect();
}

module.exports = { queryHeliosDirect };