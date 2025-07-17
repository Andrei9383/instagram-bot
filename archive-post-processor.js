require('dotenv').config();
const fetch = require('node-fetch');
const readline = require('readline');
const { Client } = require('@notionhq/client');

/**
 * Process an archived Instagram post with minimal information
 */
async function processArchivedPost() {
  // Create readline interface for user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  try {
    console.log('📷 Instagram Archive Post Processor 📷');
    console.log('====================================');
    console.log('This tool helps you process older Instagram posts that APIs cannot access.\n');

    // Collect information about the post
    const url = await question('Enter the Instagram post URL: ');
    const username = await question('Enter the username of the post creator: ');
    
    console.log('\nPlease describe the post content. What is visible in the image/video?');
    const imageDescription = await question('Post content description: ');
    
    console.log('\nIf there was a caption, please paste it here:');
    const caption = await question('Caption (press Enter if none): ');
    
    console.log('\nWhen was this post published?');
    const datePosted = await question('Date (e.g., "June 2018" or just press Enter for unknown): ');
    
    // Combine all information
    const postData = {
      url,
      username,
      caption: caption || '',
      mediaDescription: imageDescription,
      timestamp: datePosted ? new Date(datePosted).toISOString() : new Date().toISOString(),
      isArchived: true
    };

    console.log('\n✅ Post information collected.');
    
    // Ask if user wants to summarize
    const shouldSummarize = await question('\nWould you like to summarize this post? (y/n): ');
    
    if (shouldSummarize.toLowerCase() === 'y' || shouldSummarize.toLowerCase() === 'yes') {
      // Prepare content for summarization
      const enhancedCaption = `${caption ? 'Caption: ' + caption + '\n\n' : ''}Image/Video Description: ${imageDescription}`;
      
      // Create enhanced post data for summarization
      const enhancedPostData = {
        ...postData,
        caption: enhancedCaption
      };
      
      // Summarize content
      console.log('\nSummarizing content...');
      const summary = await summarizeContent(enhancedPostData);
      
      console.log('\n✅ Summary:');
      console.log('===========');
      console.log(summary);
      console.log('===========');
      
      // Ask if user wants to save to Notion
      const saveToNotionAnswer = await question('\nWould you like to save this to Notion? (y/n): ');
      
      if (saveToNotionAnswer.toLowerCase() === 'y' || saveToNotionAnswer.toLowerCase() === 'yes') {
        try {
          console.log('\nSaving to Notion...');
          const notionPage = await saveToNotion(enhancedPostData, summary);
          console.log(`✅ Successfully saved to Notion: ${notionPage.url}`);
        } catch (error) {
          console.error(`❌ Error saving to Notion: ${error.message}`);
        }
      }
    }
    
    console.log('\nThank you for using the Instagram Archive Post Processor!');
    rl.close();
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    rl.close();
    process.exit(1);
  }
}

/**
 * Summarize content using DeepSeek AI API
 * @param {Object} postData - Instagram post data
 * @returns {Promise<string>} - Summarized content
 */
async function summarizeContent(postData) {
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
            content: `Please summarize this archived Instagram post:\n\nUsername: ${postData.username}\n\n${postData.caption}\n\nURL: ${postData.url}\n\nProvide a concise summary and identify 3-5 key tags/topics.`
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
  try {
    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });
    
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
                content: `${postData.username}'s Archived Post - ${new Date().toLocaleDateString()}`,
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
            start: postData.timestamp,
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
                  content: 'Original Content:',
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
      ],
    });
    
    return response;
  } catch (error) {
    console.error('Error saving to Notion:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  processArchivedPost().catch(console.error);
}

module.exports = {
  processArchivedPost
}; 