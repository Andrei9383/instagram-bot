require('dotenv').config();
const fetch = require('node-fetch');
const { Client } = require('@notionhq/client');

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

/**
 * Extract content from Instagram post/reel using a public API
 * @param {string} url - Instagram post/reel URL
 * @returns {Promise<Object>} - Post content data
 */
async function extractInstagramContent(url) {
  console.log(`Extracting content from: ${url}`);
  
  try {
    // Extract post ID from URL
    const urlParts = url.split('/');
    const postIndex = urlParts.indexOf('p') !== -1 ? urlParts.indexOf('p') : urlParts.indexOf('reel');
    
    if (postIndex === -1 || postIndex + 1 >= urlParts.length) {
      throw new Error('Invalid Instagram URL format');
    }
    
    const postId = urlParts[postIndex + 1];
    
    // First try the instagram-looter2 API
    if (process.env.RAPID_API_KEY) {
      try {
        console.log('Trying instagram-looter2 API...');
        
        // Try the post info endpoint
        const infoResponse = await fetch(`https://instagram-looter2.p.rapidapi.com/post?url=${encodeURIComponent(url)}`, {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': process.env.RAPID_API_KEY,
            'X-RapidAPI-Host': 'instagram-looter2.p.rapidapi.com',
            'Host': 'instagram-looter2.p.rapidapi.com'
          }
        });
        
        if (infoResponse.ok) {
          const data = await infoResponse.json();
          
          if (data && data.status === true) {
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
          }
        }
        
        // If post info fails, try the download endpoint
        console.log('Post info failed, trying post-dl endpoint...');
        const dlResponse = await fetch(`https://instagram-looter2.p.rapidapi.com/post-dl?url=${encodeURIComponent(url)}`, {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': process.env.RAPID_API_KEY,
            'X-RapidAPI-Host': 'instagram-looter2.p.rapidapi.com',
            'Host': 'instagram-looter2.p.rapidapi.com'
          }
        });
        
        if (dlResponse.ok) {
          const data = await dlResponse.json();
          
          if (data && data.status === true) {
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
          }
        }
      } catch (error) {
        console.error('Error using instagram-looter2 API:', error);
        // Continue to fallback methods
      }
    }
    
    // Use a public Instagram post API (fallback)
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
    console.error('Error extracting Instagram content:', error);
    throw error;
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
    return {
      success: false,
      error: error.message
    };
  }
}

// For serverless function export
exports.handler = async (event, context) => {
  // Check if this is a valid request
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No request body' })
    };
  }
  
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON in request body' })
    };
  }
  
  const { url } = body;
  
  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No URL provided' })
    };
  }
  
  try {
    const result = await processInstagramUrl(url);
    
    if (result.success) {
      return {
        statusCode: 200,
        body: JSON.stringify(result)
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify(result)
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// For local testing
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
    console.error('Example: node serverless.js --url "https://www.instagram.com/p/XXXX/"');
    console.error('   or: node serverless.js "https://www.instagram.com/p/XXXX/"');
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
  processInstagramUrl
}; 