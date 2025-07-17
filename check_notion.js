const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

async function checkDatabase() {
  try {
    const database = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID,
    });
    
    console.log('Available properties in Notion database:');
    Object.keys(database.properties).forEach(prop => {
      console.log(`  - "${prop}" (${database.properties[prop].type})`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDatabase();
