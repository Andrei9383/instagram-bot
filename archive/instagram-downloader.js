require('dotenv').config();
const fetch = require('node-fetch');
const { Client } = require('@notionhq/client');

/**
 * Simple Instagram content extractor that uses public data without requiring login
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
    
    // Try multiple methods to get Instagram content
    const methods = [
      tryInstagramLooter2,
      tryRapidAPI,
      tryInstagramOembed,
      tryPublicAPI
    ];
    
    let lastError = null;
    
    for (const method of methods) {
      try {
        const result = await method(url, postId);
        if (result) return result;
      } catch (error) {
        console.log(`Method failed: ${error.message}`);
        lastError = error;
      }
    }
    
    throw lastError || new Error('All methods failed to extract Instagram content');
    
  } catch (error) {
    console.error('Error extracting Instagram content:', error);
    throw error;
  }
}

/**
 * Try to get Instagram content using instagram-looter2 API
 * @param {string} url - Instagram post URL
 * @param {string} postId - Instagram post ID
 * @returns {Promise<Object>} - Post data
 */
async function tryInstagramLooter2(url, postId) {
  if (!process.env.RAPID_API_KEY) {
    throw new Error('No RAPID_API_KEY in environment variables');
  }
  
  console.log('Trying instagram-looter2 API method...');
  
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
      throw error; // Re-throw the original error
    }
  }
}

/**
 * Try to get Instagram content using RapidAPI
 */
async function tryRapidAPI(url, postId) {
  if (!process.env.RAPID_API_KEY) {
    throw new Error('No RAPID_API_KEY in environment variables');
  }
  
  console.log('Trying RapidAPI method...');
  
  // First try the specific endpoint you mentioned
  try {
    console.log('Trying instagram120.p.rapidapi.com/api/instagram/hls...');
    
    // This endpoint might need the full URL or just the post ID
    const response = await fetch('https://instagram120.p.rapidapi.com/api/instagram/hls', {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPID_API_KEY,
        'X-RapidAPI-Host': 'instagram120.p.rapidapi.com'
      }
    });
    
    const data = await response.json();
    
    if (data && !data.error) {
      console.log('Successfully retrieved data from instagram120.p.rapidapi.com');
      
      // Extract post data from the response
      // This is a generic parser since we don't know the exact structure
      let username = 'Unknown';
      let caption = '';
      let mediaUrls = [];
      
      // Try to extract information from various possible structures
      if (data.user) {
        username = data.user.username || data.user.full_name || 'Unknown';
      }
      
      if (data.caption) {
        caption = data.caption.text || data.caption;
      } else if (data.edge_media_to_caption && data.edge_media_to_caption.edges && data.edge_media_to_caption.edges.length > 0) {
        caption = data.edge_media_to_caption.edges[0].node.text || '';
      }
      
      if (data.display_url) {
        mediaUrls.push(data.display_url);
      } else if (data.image_versions2 && data.image_versions2.candidates && data.image_versions2.candidates.length > 0) {
        mediaUrls.push(data.image_versions2.candidates[0].url);
      }
      
      return {
        username,
        caption,
        mediaUrls,
        timestamp: new Date().toISOString(),
        url
      };
    }
  } catch (error) {
    console.log(`Primary API endpoint failed: ${error.message}`);
  }
  
  // If the primary endpoint fails, try these alternative services
  const apiServices = [
    {
      url: `https://instagram-data1.p.rapidapi.com/post/info?post=${postId}`,
      host: 'instagram-data1.p.rapidapi.com',
      parser: (data) => {
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
      }
    },
    {
      url: `https://instagram-scraper-2022.p.rapidapi.com/ig/post_info/?shortcode=${postId}`,
      host: 'instagram-scraper-2022.p.rapidapi.com',
      parser: (data) => {
        if (!data || data.error) {
          throw new Error(data.error || 'Failed to fetch Instagram data');
        }
        
        return {
          username: data.owner?.username || 'Unknown',
          caption: data.edge_media_to_caption?.edges?.[0]?.node?.text || '',
          mediaUrls: data.display_url ? [data.display_url] : [],
          timestamp: new Date().toISOString(),
          url
        };
      }
    },
    // Try the instagram120 endpoint with a different parameter format
    {
      url: `https://instagram120.p.rapidapi.com/api/instagram/post?url=${encodeURIComponent(url)}`,
      host: 'instagram120.p.rapidapi.com',
      parser: (data) => {
        if (!data || data.error) {
          throw new Error(data.error || 'Failed to fetch Instagram data');
        }
        
        // Extract post data from the response
        let username = 'Unknown';
        let caption = '';
        let mediaUrls = [];
        
        // Try to extract information from various possible structures
        if (data.user) {
          username = data.user.username || data.user.full_name || 'Unknown';
        }
        
        if (data.caption) {
          caption = data.caption.text || data.caption;
        } else if (data.edge_media_to_caption && data.edge_media_to_caption.edges && data.edge_media_to_caption.edges.length > 0) {
          caption = data.edge_media_to_caption.edges[0].node.text || '';
        }
        
        if (data.display_url) {
          mediaUrls.push(data.display_url);
        } else if (data.image_versions2 && data.image_versions2.candidates && data.image_versions2.candidates.length > 0) {
          mediaUrls.push(data.image_versions2.candidates[0].url);
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
  ];
  
  let lastError = null;
  
  // Try each API service
  for (const service of apiServices) {
    try {
      console.log(`Trying RapidAPI service: ${service.host}...`);
      
      const response = await fetch(service.url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': process.env.RAPID_API_KEY,
          'X-RapidAPI-Host': service.host
        }
      });
      
      const data = await response.json();
      return service.parser(data);
    } catch (error) {
      console.log(`API service ${service.host} failed: ${error.message}`);
      lastError = error;
    }
  }
  
  throw lastError || new Error('All RapidAPI services failed');
}

/**
 * Try to get Instagram content using oEmbed API
 */
async function tryInstagramOembed(url) {
  console.log('Trying oEmbed API method...');
  
  const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`;
  
  const response = await fetch(oembedUrl);
  const data = await response.json();
  
  if (!data || data.error) {
    throw new Error('Failed to fetch Instagram data from oEmbed API');
  }
  
  return {
    username: data.author_name || 'Unknown',
    caption: data.title || '',
    mediaUrls: [],
    timestamp: new Date().toISOString(),
    url
  };
}

/**
 * Try to get Instagram content by parsing public page
 */
async function tryPublicAPI(url) {
  console.log('Trying public API method...');
  
  const response = await fetch(url);
  const html = await response.text();
  
  // Try to extract JSON data from the page
  const jsonMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/);
  
  if (!jsonMatch || jsonMatch.length < 2) {
    throw new Error('Failed to extract JSON data from Instagram page');
  }
  
  try {
    const jsonData = JSON.parse(jsonMatch[1]);
    
    return {
      username: jsonData.author?.name || 'Unknown',
      caption: jsonData.caption || '',
      mediaUrls: jsonData.thumbnail?.contentUrl ? [jsonData.thumbnail.contentUrl] : [],
      timestamp: new Date().toISOString(),
      url
    };
  } catch (e) {
    throw new Error('Failed to parse JSON data from Instagram page');
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
      console.log('Would you like to enter the post details manually? (y/n)');
      const answer = await readUserInput('> ');
      
      if (answer.toLowerCase() === 'y') {
        const manualData = await promptManualInput(url);
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
      }
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Prompt for manual input of post details
 * @param {string} url - Instagram post/reel URL
 * @returns {Promise<Object>} - Post data
 */
async function promptManualInput(url) {
  console.log('\nEnter the post details manually:');
  
  const username = await readUserInput('Username: ');
  const caption = await readUserInput('Caption: ');
  
  return {
    username,
    caption,
    mediaUrls: [],
    timestamp: new Date().toISOString(),
    url
  };
}

/**
 * Read user input from the command line
 * @param {string} question - Question to ask
 * @returns {Promise<string>} - User input
 */
function readUserInput(question) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Main execution
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
    console.error('Example: node instagram-downloader.js --url "https://www.instagram.com/p/XXXX/"');
    console.error('   or: node instagram-downloader.js "https://www.instagram.com/p/XXXX/"');
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