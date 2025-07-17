#!/usr/bin/env node
/**
 * Instagram DM Monitor
 * Monitors DMs for Instagram links and automatically processes them
 */

require('dotenv').config();
const { spawn } = require('child_process');
const chalk = require('chalk');

/**
 * Check if all required environment variables are set
 */
function checkEnvironment() {
  const required = [
    'NOTION_API_KEY',
    'NOTION_DATABASE_ID', 
    'DEEPSEEK_API_KEY',
    'INSTAGRAM_USERNAME',
    'INSTAGRAM_PASSWORD'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(chalk.red('❌ Missing required environment variables:'));
    missing.forEach(key => console.error(chalk.red(`   - ${key}`)));
    console.error(chalk.yellow('\nRun "npm run setup" to configure your environment.'));
    process.exit(1);
  }
  
  console.log(chalk.green('✅ All environment variables are set'));
}

/**
 * Start monitoring Instagram DMs for shared posts
 */
async function startDMMonitoring() {
  console.log(chalk.cyan('🚀 Starting Instagram DM monitoring...\n'));
  console.log(chalk.blue('Send Instagram post/reel links to your bot account to process them automatically!'));
  console.log(chalk.gray('Press Ctrl+C to stop monitoring\n'));
  
  const python = spawn('/Users/andreistan/instagram-bot/.venv/bin/python', ['instagram_client.py', 'monitor'], {
    env: { ...process.env },
    stdio: ['inherit', 'pipe', 'inherit']
  });
  
  python.stdout.on('data', async (data) => {
    const output = data.toString().trim();
    
    // Look for content extraction signals from Python
    if (output.startsWith('CONTENT_EXTRACTED:')) {
      try {
        const contentJson = output.replace('CONTENT_EXTRACTED:', '').trim();
        
        // Try to parse JSON, with fallback for corrupted output
        let content;
        try {
          content = JSON.parse(contentJson);
        } catch (parseError) {
          console.error(chalk.red(`❌ JSON parse error: ${parseError.message}`));
          console.error(chalk.gray(`Raw JSON length: ${contentJson.length} characters`));
          console.error(chalk.gray(`First 200 chars: ${contentJson.substring(0, 200)}...`));
          console.error(chalk.gray(`Last 200 chars: ...${contentJson.substring(contentJson.length - 200)}`));
          
          // Try to extract basic info even from corrupted JSON
          const usernameMatch = contentJson.match(/"username":\s*"([^"]+)"/);
          const urlMatch = contentJson.match(/"url":\s*"([^"]+)"/);
          
          if (usernameMatch && urlMatch) {
            console.log(chalk.yellow(`⚠️  Using extracted basic info: @${usernameMatch[1]} from ${urlMatch[1].substring(0, 50)}...`));
            return; // Skip processing this corrupted content
          } else {
            throw parseError; // Re-throw if we can't extract anything
          }
        }
        
        console.log(chalk.cyan(`\n📨 New Instagram content detected from @${content.username}`));
        console.log(chalk.gray(`Processing: ${content.url}`));
        console.log(chalk.blue(`Media type: ${content.media_type}, Images: ${content.image_urls ? content.image_urls.length : 0}\n`));
        
        // Process the content through our existing pipeline
        await processInstagramContent(content);
        
      } catch (error) {
        console.error(chalk.red(`❌ Error processing extracted content: ${error.message}`));
        console.error(chalk.gray(`Raw output length: ${output.length} characters`));
      }
    } else if (output.includes('INFO') || output.includes('ERROR') || output.includes('WARNING')) {
      // Log Python output for debugging with appropriate colors
      if (output.includes('ERROR')) {
        console.log(chalk.red(output));
      } else if (output.includes('WARNING')) {
        console.log(chalk.yellow(output));
      } else {
        console.log(chalk.gray(output));
      }
    } else if (output.includes('Processing new message:') || output.includes('Found Instagram URL') || output.includes('Successfully extracted')) {
      // Important processing messages
      console.log(chalk.blue(output));
    } else if (output.includes('No Instagram URLs found') || output.includes('already processed')) {
      // Less important messages
      console.log(chalk.dim(output));
    } else if (output.trim().length > 0 && !output.includes('Waiting')) {
      // Other non-empty output
      console.log(chalk.gray(output));
    }
  });
  
  python.on('close', (code) => {
    if (code !== 0) {
      console.error(chalk.red(`\n❌ DM monitoring stopped with code ${code}`));
      console.error(chalk.yellow('Check your Instagram credentials and network connection.'));
    } else {
      console.log(chalk.cyan('\n👋 DM monitoring stopped.'));
    }
  });
  
  python.on('error', (error) => {
    console.error(chalk.red(`❌ Failed to start Python monitoring: ${error.message}`));
    process.exit(1);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 Stopping DM monitoring...'));
    python.kill('SIGTERM');
    process.exit(0);
  });
}

/**
 * Process Instagram content that was extracted from DM
 * @param {Object} content - Extracted Instagram content
 */
async function processInstagramContent(content) {
  try {
    // Use the existing processing pipeline from index_new.js
    const { summarizeContent, saveToNotion } = require('./index_new');
    
    // Generate AI summary (includes image analysis)
    console.log(chalk.blue('🤖 Generating AI summary and analyzing images...'));
    const { summary, imageAnalysis } = await summarizeContent(content);
    
    console.log(chalk.green('✅ AI processing completed'));
    console.log(chalk.gray(`📝 Summary length: ${summary.length} characters`));
    if (imageAnalysis) {
      console.log(chalk.gray(`🖼️  Image analysis: ${imageAnalysis.length} characters`));
    }
    
    // Save to Notion
    console.log(chalk.blue('💾 Saving to Notion with enhanced tags...'));
    const notionPage = await saveToNotion(content, { summary, imageAnalysis });
    
    console.log(chalk.green('🎉 Successfully processed Instagram content!'));
    console.log(chalk.gray(`📄 Notion page ID: ${notionPage.id}`));
    console.log(chalk.blue(`🔗 View at: https://notion.so/${notionPage.id.replace(/-/g, '')}\n`));
    
    return {
      content,
      summary,
      imageAnalysis,
      notionPage
    };

  } catch (error) {
    console.error(chalk.red(`❌ Failed to process content: ${error.message}`));
    console.error(chalk.yellow(`🔄 Content that failed: @${content.username} - ${content.url}`));
    throw error;
  }
}

// Main execution
if (require.main === module) {
  // Check environment
  checkEnvironment();
  
  // Start monitoring
  startDMMonitoring().catch(error => {
    console.error(chalk.red(`💥 Fatal error: ${error.message}`));
    process.exit(1);
  });
}

module.exports = {
  startDMMonitoring,
  processInstagramContent
};
