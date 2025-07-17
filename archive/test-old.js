require('dotenv').config();
const { processInstagramUrl } = require('./index');

// Simple test function to check if all dependencies are working
async function runTests() {
  console.log('🧪 Running tests to verify setup...');
  
  // Check environment variables
  const requiredEnvVars = [
    'NOTION_API_KEY',
    'NOTION_DATABASE_ID',
    'DEEPSEEK_API_KEY',
    'INSTAGRAM_USERNAME',
    'INSTAGRAM_PASSWORD'
  ];
  
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingEnvVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease run `npm run setup` to configure your environment variables.');
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are set.');
  
  // Check if Notion API key is valid
  try {
    const { Client } = require('@notionhq/client');
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    
    // Try to access the database
    await notion.databases.retrieve({ database_id: process.env.NOTION_DATABASE_ID });
    console.log('✅ Successfully connected to Notion database.');
  } catch (error) {
    console.error('❌ Failed to connect to Notion database:');
    console.error(`   ${error.message}`);
    console.error('\nPlease check your NOTION_API_KEY and NOTION_DATABASE_ID in the .env file.');
    process.exit(1);
  }
  
  // Check if DeepSeek API key is valid
  try {
    const fetch = require('node-fetch');
    const response = await fetch('https://api.deepseek.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      }
    });
    
    if (response.status === 200) {
      console.log('✅ Successfully connected to DeepSeek AI API.');
    } else {
      throw new Error(`Status code: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Failed to connect to DeepSeek AI API:');
    console.error(`   ${error.message}`);
    console.error('\nPlease check your DEEPSEEK_API_KEY in the .env file.');
    process.exit(1);
  }
  
  console.log('\n🎉 All tests passed! Your setup is correct.');
  console.log('\nYou can now run one of the following commands:');
  console.log('- `npm start -- --url "https://www.instagram.com/p/XXXX/"` - Process a single Instagram URL via CLI');
  console.log('- `npm run start:web` - Start the web UI server');
  console.log('- `npm run start:n8n` - Start the n8n workflow');
  
  process.exit(0);
}

runTests().catch(error => {
  console.error('❌ An unexpected error occurred during testing:');
  console.error(error);
  process.exit(1);
}); 