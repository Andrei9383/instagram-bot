#!/usr/bin/env node
/**
 * Simplified Instagram Bot using instagrapi
 * Extracts content from Instagram posts/reels, summarizes with AI, and saves to Notion
 */

require('dotenv').config();
const { spawn } = require('child_process');
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
  
  return new Promise((resolve, reject) => {
    const python = spawn('python3', ['instagram_client.py', 'extract', '--url', url], {
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
 * Process a single Instagram URL
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

// Main execution
if (require.main === module) {
  // Check environment
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
    const urlParts = url.split('/');
    const postIndex = urlParts.indexOf('p') !== -1 ? urlParts.indexOf('p') : urlParts.indexOf('reel');
    
    if (postIndex === -1 || postIndex + 1 >= urlParts.length) {
      throw new Error('Invalid Instagram URL format');
    }
    
    const postId = urlParts[postIndex + 1];
    
    if (process.env.RAPID_API_KEY) {
      // First try the post info endpoint
      try {
        console.log('Fetching post info from instagram-looter2...');
        
        const apiUrl = `https://instagram-looter2.p.rapidapi.com/post?url=${encodeURIComponent(url)}`;
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': process.env.RAPID_API_KEY,
            'X-RapidAPI-Host': 'instagram-looter2.p.rapidapi.com',
            'Host': 'instagram-looter2.p.rapidapi.com'
          }
        });
        
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data || !data.status) {
          throw new Error('Invalid response from instagram-looter2 API');
        }
        
        console.log('Successfully retrieved data from instagram-looter2 post info endpoint');
        
        // Extract data
        const username = data.owner?.username || 'Unknown';
        const caption = data.edge_media_to_caption?.edges?.[0]?.node?.text || '';
        
        // Extract media URLs
        let mediaUrls = [];
        
        // For carousel posts (multiple images/videos)
        if (data.edge_sidecar_to_children?.edges) {
          mediaUrls = data.edge_sidecar_to_children.edges.map(edge => {
            return edge.node.display_url;
          });
        } 
        // For single image posts
        else if (data.display_url) {
          mediaUrls = [data.display_url];
        }
        
        return {
          username,
          caption,
          mediaUrls,
          timestamp: new Date().toISOString(),
          url
        };
      } catch (error) {
        console.log(`Post info endpoint failed: ${error.message}`);
        
        // If post info fails, try the download endpoint
        try {
          console.log('Fetching post download data from instagram-looter2...');
          
          const apiUrl = `https://instagram-looter2.p.rapidapi.com/post-dl?url=${encodeURIComponent(url)}`;
          
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'X-RapidAPI-Key': process.env.RAPID_API_KEY,
              'X-RapidAPI-Host': 'instagram-looter2.p.rapidapi.com',
              'Host': 'instagram-looter2.p.rapidapi.com'
            }
          });
          
          if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (!data || !data.status) {
            throw new Error('Invalid response from instagram-looter2 API');
          }
          
          console.log('Successfully retrieved data from instagram-looter2 post download endpoint');
          
          // Extract data
          const { full_name, username, medias, caption } = data.data;
          
          // Extract media URLs
          const mediaUrls = medias.map(media => media.link);
          
          return {
            username: username || full_name || 'Unknown',
            caption: caption || '',
            mediaUrls,
            timestamp: new Date().toISOString(),
            url
          };
        } catch (dlError) {
          console.log(`Post download endpoint failed: ${dlError.message}`);
          // Continue to fallback methods
        }
      }
      
      // Try RapidAPI as a fallback
      try {
        console.log("Attempting to use RapidAPI as a fallback...");
        
        // Use RapidAPI if key is available
        const apiUrl = `https://instagram-data1.p.rapidapi.com/post/info?post=${postId}`;
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': process.env.RAPID_API_KEY,
            'X-RapidAPI-Host': 'instagram-data1.p.rapidapi.com'
          }
        });
        
        const data = await response.json();
        
        if (!data || data.error) {
          throw new Error(data.error || 'Failed to fetch Instagram data');
        }
        
        return {
          username: data.owner?.username || 'Unknown',
          caption: data.caption?.text || '',
          mediaUrls: data.carousel_media 
            ? data.carousel_media.map(media => media.image_versions2?.candidates[0]?.url)
            : [data.image_versions2?.candidates[0]?.url],
          timestamp: new Date().toISOString(),
          url
        };
      } catch (error) {
        console.log("RapidAPI fallback failed, trying Puppeteer...");
      }
    }
  } catch (error) {
    console.log("API methods failed, trying Puppeteer...");
  }
  
  // If API methods fail, fall back to Puppeteer
  const browser = await puppeteer.launch({
    headless: true, // Use headless mode for better compatibility
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1280,720'
    ],
    timeout: 60000 // Increase timeout to 60 seconds
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to Instagram login
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });
    
    // Accept cookies if prompt appears
    try {
      await page.waitForSelector('button[tabindex="0"]', { timeout: 5000 });
      await page.click('button[tabindex="0"]');
    } catch (e) {
      console.log('No cookie prompt found or already accepted');
    }
    
    // Login to Instagram
    await page.waitForSelector('input[name="username"]');
    await page.type('input[name="username"]', process.env.INSTAGRAM_USERNAME);
    await page.type('input[name="password"]', process.env.INSTAGRAM_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    // Navigate to the post URL
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Extract post data
    const postData = await page.evaluate(() => {
      // For posts
      const captionElement = document.querySelector('div._a9zs');
      const caption = captionElement ? captionElement.textContent : '';
      
      // For reels
      const reelCaptionElement = document.querySelector('div._a9zs');
      const reelCaption = reelCaptionElement ? reelCaptionElement.textContent : '';
      
      // Get username
      const usernameElement = document.querySelector('div._aaqt');
      const username = usernameElement ? usernameElement.textContent : '';
      
      // Get images/video
      const mediaElements = Array.from(document.querySelectorAll('img._aagt, video'));
      const mediaUrls = mediaElements.map(el => el.src || el.currentSrc).filter(Boolean);
      
      return {
        username,
        caption: caption || reelCaption,
        mediaUrls,
        timestamp: new Date().toISOString(),
      };
    });
    
    return {
      ...postData,
      url
    };
    
  } catch (error) {
    console.error('Error extracting Instagram content:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Summarize content using DeepSeek AI API
 * @param {Object} postData - Instagram post data
 * @returns {Promise<string>} - Summarized content
 */
async function summarizeContent(postData) {
  console.log('Summarizing content...');
  
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes Instagram posts and reels. Extract key points, topics, and themes.'
          },
          {
            role: 'user',
            content: `Please summarize this Instagram ${postData.url.includes('/reel/') ? 'reel' : 'post'} content:\n\nUsername: ${postData.username}\n\nCaption: ${postData.caption}\n\nURL: ${postData.url}\n\nProvide a concise summary and identify 3-5 key tags/topics.`
          }
        ],
        max_tokens: 500
      })
    });
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      throw new Error('Invalid response from DeepSeek AI API');
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error summarizing content:', error);
    throw error;
  }
}

/**
 * Save summary to Notion database
 * @param {Object} postData - Instagram post data
 * @param {string} summary - Summarized content
 * @returns {Promise<Object>} - Notion page object
 */
async function saveToNotion(postData, summary) {
  console.log('Saving to Notion...');
  
  try {
    // Extract tags from summary (assuming the summary ends with tags)
    const summaryParts = summary.split(/Tags:|Topics:|Keywords:/i);
    const mainSummary = summaryParts[0].trim();
    
    // Extract tags if they exist
    let tags = [];
    if (summaryParts.length > 1) {
      tags = summaryParts[1]
        .split(/,|\n/)
        .map(tag => tag.trim())
        .filter(Boolean);
    }
    
    // Create Notion page
    const response = await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_DATABASE_ID,
      },
      properties: {
        Title: {
          title: [
            {
              text: {
                content: `${postData.username}'s ${postData.url.includes('/reel/') ? 'Reel' : 'Post'} - ${new Date().toLocaleDateString()}`,
              },
            },
          ],
        },
        URL: {
          url: postData.url,
        },
        Summary: {
          rich_text: [
            {
              text: {
                content: mainSummary.substring(0, 2000), // Notion has a 2000 character limit for rich_text
              },
            },
          ],
        },
        Tags: {
          multi_select: tags.slice(0, 10).map(tag => ({ name: tag })),
        },
        Date: {
          date: {
            start: new Date().toISOString(),
          },
        },
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: 'Original Caption:',
                  link: null,
                },
                annotations: {
                  bold: true,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: 'default',
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
                  content: postData.caption || 'No caption available',
                  link: null,
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
                  content: 'Summary:',
                  link: null,
                },
                annotations: {
                  bold: true,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: 'default',
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
                  link: null,
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
                  content: 'Media:',
                  link: null,
                },
                annotations: {
                  bold: true,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: 'default',
                },
              },
            ],
          },
        },
        ...postData.mediaUrls.map(url => ({
          object: 'block',
          type: 'image',
          image: {
            type: 'external',
            external: {
              url
            }
          }
        }))
      ],
    });
    
    return response;
  } catch (error) {
    console.error('Error saving to Notion:', error);
    throw error;
  }
}

/**
 * Main function to process Instagram URL
 * @param {string} url - Instagram post/reel URL
 */
async function processInstagramUrl(url) {
  try {
    // 1. Extract content from Instagram
    const postData = await extractInstagramContent(url);
    
    // 2. Summarize content
    const summary = await summarizeContent(postData);
    
    // 3. Save to Notion
    const notionPage = await saveToNotion(postData, summary);
    
    console.log(`✅ Successfully processed Instagram URL: ${url}`);
    console.log(`📝 Notion page created: ${notionPage.url}`);
    
    return {
      success: true,
      notionPageUrl: notionPage.url,
      summary
    };
  } catch (error) {
    console.error('❌ Error processing Instagram URL:', error);
    
    // If extraction failed, prompt for manual input
    if (error.message.includes('extract')) {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise((resolve) => {
        rl.question('Would you like to enter the post details manually? (y/n) ', resolve);
      });
      
      if (answer.toLowerCase() === 'y') {
        const username = await new Promise((resolve) => {
          rl.question('Username: ', resolve);
        });
        
        const caption = await new Promise((resolve) => {
          rl.question('Caption: ', resolve);
        });
        
        rl.close();
        
        const manualData = {
          username,
          caption,
          mediaUrls: [],
          timestamp: new Date().toISOString(),
          url
        };
        
        const summary = await summarizeContent(manualData);
        const notionPage = await saveToNotion(manualData, summary);
        
        console.log(`✅ Successfully processed Instagram URL with manual input: ${url}`);
        console.log(`📝 Notion page created: ${notionPage.url}`);
        
        return {
          success: true,
          notionPageUrl: notionPage.url,
          summary,
          manual: true
        };
      } else {
        rl.close();
      }
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Handle CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  let url = null;
  
  // Check for --url parameter
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
    console.error('Please provide an Instagram URL using --url parameter or as the first argument');
    console.error('Example: node index.js --url "https://www.instagram.com/p/XXXX/"');
    console.error('   or: node index.js "https://www.instagram.com/p/XXXX/"');
    process.exit(1);
  }
  
  console.log(`Processing Instagram URL: ${url}`);
  
  processInstagramUrl(url)
    .then(result => {
      if (result.success) {
        console.log(`✅ Successfully processed Instagram URL: ${url}`);
        console.log(`📝 Summary: ${result.summary.substring(0, 100)}...`);
        if (result.notionPageUrl) {
          console.log(`📝 Notion page created: ${result.notionPageUrl}`);
        }
        process.exit(0);
      } else {
        console.error(`❌ Failed to process Instagram URL: ${result.error}`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = {
  extractInstagramContent,
  summarizeContent,
  saveToNotion,
  processInstagramUrl
}; 