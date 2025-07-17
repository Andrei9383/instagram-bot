#!/usr/bin/env node
/**
 * Instagram Content Extractor and Summarizer
 * 
 * This script extracts content from an Instagram post/reel using instagram-looter2 API
 * and summarizes it using DeepSeek AI, without saving to Notion.
 */
require('dotenv').config();
const fetch = require('node-fetch');

/**
 * Extract content from Instagram post/reel using instagram-looter2 API
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
 * Main function to process Instagram URL
 * @param {string} url - Instagram post/reel URL
 */
async function processInstagramUrl(url) {
  try {
    // 1. Extract content from Instagram
    console.log('Step 1: Extracting content...');
    const postData = await extractInstagramContent(url);
    console.log('\nExtracted Content:');
    console.log('Username:', postData.username);
    console.log('Caption:', postData.caption.substring(0, 100) + (postData.caption.length > 100 ? '...' : ''));
    console.log('Media URLs:', postData.mediaUrls.length > 0 ? `${postData.mediaUrls.length} URLs found` : 'None');
    
    // 2. Summarize content
    console.log('\nStep 2: Summarizing content...');
    const summary = await summarizeContent(postData);
    
    console.log('\nSummary:');
    console.log('='.repeat(50));
    console.log(summary);
    console.log('='.repeat(50));
    
    return {
      success: true,
      postData,
      summary
    };
  } catch (error) {
    console.error('Error processing Instagram URL:', error);
    return {
      success: false,
      error: error.message
    };
  }
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
  
  // Use default URL if none provided
  if (!url) {
    url = 'https://www.instagram.com/p/CqIbCzYMi5C/';
    console.log(`No URL provided, using default: ${url}`);
  }
  
  console.log(`Processing Instagram URL: ${url}`);
  
  processInstagramUrl(url)
    .then(result => {
      if (result.success) {
        console.log('\n✅ Successfully processed Instagram URL');
        process.exit(0);
      } else {
        console.error(`\n❌ Failed to process Instagram URL: ${result.error}`);
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
  processInstagramUrl
}; 