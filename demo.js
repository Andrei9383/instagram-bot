#!/usr/bin/env node
/**
 * Instagram Post/Reel Summarizer Demo
 * 
 * This script demonstrates the full workflow of:
 * 1. Extracting content from an Instagram post/reel using instagram-looter2 API
 * 2. Summarizing the content using DeepSeek AI
 * 3. Saving the summary to Notion
 */
require('dotenv').config();
const { processInstagramUrl } = require('./instagram-downloader');
const chalk = require('chalk');

// ASCII art banner
const banner = `
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ██╗███╗   ██╗███████╗████████╗ █████╗  ██████╗ ██████╗     ║
║   ██║████╗  ██║██╔════╝╚══██╔══╝██╔══██╗██╔════╝ ██╔══██╗    ║
║   ██║██╔██╗ ██║███████╗   ██║   ███████║██║  ███╗██████╔╝    ║
║   ██║██║╚██╗██║╚════██║   ██║   ██╔══██║██║   ██║██╔══██╗    ║
║   ██║██║ ╚████║███████║   ██║   ██║  ██║╚██████╔╝██║  ██║    ║
║   ╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝    ║
║                                                              ║
║   ███████╗██╗   ██╗███╗   ███╗███╗   ███╗ █████╗ ██████╗     ║
║   ██╔════╝██║   ██║████╗ ████║████╗ ████║██╔══██╗██╔══██╗    ║
║   ███████╗██║   ██║██╔████╔██║██╔████╔██║███████║██████╔╝    ║
║   ╚════██║██║   ██║██║╚██╔╝██║██║╚██╔╝██║██╔══██║██╔══██╗    ║
║   ███████║╚██████╔╝██║ ╚═╝ ██║██║ ╚═╝ ██║██║  ██║██║  ██║    ║
║   ╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`;

/**
 * Check if required environment variables are set
 * @returns {boolean} - True if all required variables are set
 */
function checkEnvironment() {
  const required = {
    'RAPID_API_KEY': 'RapidAPI Key (for instagram-looter2)',
    'DEEPSEEK_API_KEY': 'DeepSeek AI API Key (for summarization)',
    'NOTION_API_KEY': 'Notion API Key',
    'NOTION_DATABASE_ID': 'Notion Database ID'
  };
  
  let allSet = true;
  const missing = [];
  
  for (const [key, desc] of Object.entries(required)) {
    if (!process.env[key]) {
      allSet = false;
      missing.push(`${key} (${desc})`);
    }
  }
  
  if (!allSet) {
    console.log('❌ Missing required environment variables:');
    missing.forEach(item => console.log(`   - ${item}`));
    console.log('\nPlease add these to your .env file and try again.');
    return false;
  }
  
  console.log('✅ All required environment variables are set.');
  return true;
}

/**
 * Main function to run the demo
 */
async function runDemo() {
  console.log(banner);
  console.log('Instagram Post/Reel Summarizer Demo\n');
  
  // Check environment
  if (!checkEnvironment()) {
    process.exit(1);
  }
  
  // Get URL from command line or use default
  const args = process.argv.slice(2);
  let url = null;
  
  if (args.length > 0 && args[0].includes('instagram.com')) {
    url = args[0];
  } else {
    // Use a default URL if none provided
    url = 'https://www.instagram.com/p/CqIbCzYMi5C/';
    console.log(`No URL provided, using default: ${url}`);
  }
  
  console.log('\n🚀 Starting the demo with URL:', url);
  console.log('\n📋 Process Steps:');
  console.log('1. Extract content from Instagram using instagram-looter2 API');
  console.log('2. Summarize content using DeepSeek AI');
  console.log('3. Save summary to Notion database');
  
  console.log('\n⏳ Processing...');
  
  try {
    const startTime = Date.now();
    const result = await processInstagramUrl(url);
    const endTime = Date.now();
    
    if (result.success) {
      console.log('\n✅ Success!');
      console.log('\n📊 Results:');
      console.log(`⏱️  Processing time: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
      console.log(`📝 Summary length: ${result.summary.length} characters`);
      
      if (result.notionPageUrl) {
        console.log(`🔗 Notion page: ${result.notionPageUrl}`);
      }
      
      console.log('\n📝 Summary:');
      console.log('='.repeat(50));
      console.log(result.summary);
      console.log('='.repeat(50));
    } else {
      console.log(`\n❌ Failed: ${result.error}`);
    }
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
  }
}

// Run the demo
runDemo()
  .then(() => {
    console.log('\n👋 Demo completed!');
  })
  .catch(error => {
    console.error(`\n💥 Unhandled error: ${error.message}`);
    process.exit(1);
  }); 