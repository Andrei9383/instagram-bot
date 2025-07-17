#!/usr/bin/env node
/**
 * Simplified Instagram Bot using instagrapi
 * Automatically processes Instagram posts sent via DM, summarizes with AI, and saves to Notion
 */

require('dotenv').config();
const fetch = require('node-fetch');
const { Client } = require('@notionhq/client');
const chalk = require('chalk');

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

/**
 * Extract Instagram content using Python instagrapi
 * @param {string} url - Instagram post/reel URL
 * @returns {Promise<Object>} - Post content data
 */
async function extractInstagramContent(url) {
  console.log(chalk.blue(`📱 Extracting content from: ${url}`));
  
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const python = spawn('/Users/andreistan/instagram-bot/.venv/bin/python', ['instagram_client.py', 'extract', '--url', url], {
      env: { ...process.env }
    });
    
    let output = '';
    let errorOutput = '';
    
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    python.on('close', (code) => {
      if (code === 0) {
        try {
          const content = JSON.parse(output.trim());
          console.log(chalk.green(`✅ Successfully extracted content from @${content.username}`));
          resolve(content);
        } catch (error) {
          reject(new Error(`Failed to parse Python output: ${error.message}`));
        }
      } else {
        reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
      }
    });
  });
}

/**
 * Summarize content using DeepSeek AI
 * @param {Object} content - Instagram post content
 * @returns {Promise<string>} - AI-generated summary
 */
async function summarizeContent(content) {
  console.log(chalk.blue('🤖 Generating AI summary...'));
  
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY not found in environment variables');
  }
  
  const prompt = `Please provide a concise and engaging summary of this Instagram ${content.media_type.toLowerCase()} post:

Username: @${content.username}
Caption: ${content.caption}

Focus on the main message, key points, and any interesting insights. Keep it informative but brief.`;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const summary = data.choices[0].message.content.trim();
    
    console.log(chalk.green('✅ AI summary generated successfully'));
    return summary;

  } catch (error) {
    console.error(chalk.red(`❌ Error generating summary: ${error.message}`));
    throw error;
  }
}

/**
 * Save content and summary to Notion
 * @param {Object} content - Instagram post content
 * @param {string} summary - AI-generated summary
 * @returns {Promise<Object>} - Notion page object
 */
async function saveToNotion(content, summary) {
  console.log(chalk.blue('💾 Saving to Notion...'));
  
  if (!process.env.NOTION_DATABASE_ID) {
    throw new Error('NOTION_DATABASE_ID not found in environment variables');
  }

  try {
    const page = await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_DATABASE_ID,
      },
      properties: {
        Title: {
          title: [
            {
              text: {
                content: `@${content.username} - ${content.media_type}`,
              },
            },
          ],
        },
        Username: {
          rich_text: [
            {
              text: {
                content: content.username,
              },
            },
          ],
        },
        'Media Type': {
          select: {
            name: content.media_type,
          },
        },
        URL: {
          url: content.url,
        },
        'Date Processed': {
          date: {
            start: new Date().toISOString().split('T')[0],
          },
        },
      },
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: 'AI Summary',
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: summary,
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: 'Original Caption',
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: content.caption || 'No caption provided',
                },
              },
            ],
          },
        },
      ],
    });

    console.log(chalk.green('✅ Successfully saved to Notion'));
    return page;

  } catch (error) {
    console.error(chalk.red(`❌ Error saving to Notion: ${error.message}`));
    throw error;
  }
}

/**
 * Process a single Instagram URL (simplified version)
 * @param {string} url - Instagram post/reel URL
 */
async function processInstagramUrl(url) {
  try {
    console.log(chalk.cyan('\n🚀 Starting Instagram post processing...\n'));
    
    // Extract content
    const content = await extractInstagramContent(url);
    
    // Generate summary
    const summary = await summarizeContent(content);
    
    // Save to Notion
    const notionPage = await saveToNotion(content, summary);
    
    console.log(chalk.green('\n🎉 Processing completed successfully!'));
    console.log(chalk.gray(`Notion page ID: ${notionPage.id}`));
    
    return {
      content,
      summary,
      notionPage
    };

  } catch (error) {
    console.error(chalk.red(`\n❌ Processing failed: ${error.message}`));
    throw error;
  }
}

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

// Simplified main execution for command line usage
if (require.main === module) {
  checkEnvironment();
  
  const args = process.argv.slice(2);
  let url = null;
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && i + 1 < args.length) {
      url = args[i + 1];
      break;
    }
  }
  
  // If no --url parameter, check if first argument is a URL
  if (!url && args.length > 0 && args[0].includes('instagram.com')) {
    url = args[0];
  }
  
  if (!url) {
    console.error(chalk.red('❌ Please provide an Instagram URL'));
    console.error(chalk.yellow('Usage: npm start -- --url "https://www.instagram.com/p/XXXX/"'));
    console.error(chalk.yellow('   or: npm start -- "https://www.instagram.com/p/XXXX/"'));
    console.error(chalk.cyan('\nFor automatic DM monitoring, use: npm run monitor'));
    process.exit(1);
  }
  
  // Process the URL
  processInstagramUrl(url)
    .then(() => {
      console.log(chalk.cyan('\n👋 Done!'));
      process.exit(0);
    })
    .catch(error => {
      console.error(chalk.red(`\n💥 Fatal error: ${error.message}`));
      process.exit(1);
    });
}

module.exports = {
  extractInstagramContent,
  summarizeContent, 
  saveToNotion,
  processInstagramUrl
};
