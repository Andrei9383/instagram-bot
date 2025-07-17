require('dotenv').config();
const fetch = require('node-fetch');
const util = require('util');

/**
 * Test the Instagram API using the exact format from RapidAPI subscription
 */
async function testExactApi(url) {
  console.log('Testing Instagram API with exact format from subscription details...');
  console.log('URL to process:', url);
  
  try {
    // Using the exact format from the subscription details
    const apiUrl = 'https://instagram120.p.rapidapi.com/api/instagram/get';
    console.log(`API URL: ${apiUrl}`);
    
    // Extract post ID from URL if available
    let postId = '';
    if (url) {
      const urlParts = url.split('/');
      const postIndex = urlParts.indexOf('p') !== -1 ? urlParts.indexOf('p') : urlParts.indexOf('reel');
      
      if (postIndex !== -1 && postIndex + 1 < urlParts.length) {
        postId = urlParts[postIndex + 1];
        console.log(`Extracted post ID: ${postId}`);
      }
    }
    
    // Using the exact headers from the subscription details
    const headers = {
      'X-Rapidapi-Key': '6996b3d5demsh845e9209f798096p151e87jsn7e7ab501933b',
      'X-Rapidapi-Host': 'instagram120.p.rapidapi.com',
      'Host': 'instagram120.p.rapidapi.com'
    };
    
    console.log('Request headers:', headers);
    
    // Try different parameter combinations
    const parameterSets = [
      { name: 'No parameters', params: '' },
      { name: 'URL parameter', params: `?url=${encodeURIComponent(url)}` },
      { name: 'Post ID parameter', params: `?post=${postId}` },
      { name: 'ID parameter', params: `?id=${postId}` },
      { name: 'Code parameter', params: `?code=${postId}` },
      { name: 'Shortcode parameter', params: `?shortcode=${postId}` }
    ];
    
    for (const paramSet of parameterSets) {
      console.log(`\n\n========== Testing with ${paramSet.name} ==========`);
      
      const fullUrl = apiUrl + paramSet.params;
      console.log(`Full URL: ${fullUrl}`);
      
      try {
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: headers
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:');
        response.headers.forEach((value, name) => {
          console.log(`${name}: ${value}`);
        });
        
        // Try to parse as JSON
        try {
          const data = await response.json();
          console.log('Response data:', util.inspect(data, { colors: true, depth: 4 }));
          
          // Check if we got a successful response
          if (response.status === 200 || (data && !data.message)) {
            console.log('\n✅ SUCCESS! Found working parameter combination');
            console.log('Parameter format:', paramSet.name);
            console.log('URL:', fullUrl);
            
            // Try to extract important information
            console.log('\nExtracted data:');
            extractAndDisplayData(data);
            
            // Save the successful response to a file
            await saveResponseToFile(data, `instagram-api-response-${Date.now()}.json`);
          }
        } catch (parseError) {
          console.log('Failed to parse response as JSON:', parseError.message);
          
          // Try to get text response
          const textResponse = await response.text();
          console.log('Response as text:', textResponse.substring(0, 500));
        }
      } catch (fetchError) {
        console.log(`Error fetching with ${paramSet.name}:`, fetchError.message);
      }
    }
    
  } catch (error) {
    console.error('Error in test:', error.message);
  }
}

/**
 * Extract and display important data from the API response
 * @param {Object} data - API response data
 */
function extractAndDisplayData(data) {
  // Try to extract username
  let username = 'Not found';
  if (data.owner && data.owner.username) {
    username = data.owner.username;
  } else if (data.user && data.user.username) {
    username = data.user.username;
  } else if (data.author_name) {
    username = data.author_name;
  } else if (data.data && data.data.user && data.data.user.username) {
    username = data.data.user.username;
  }
  console.log('Username:', username);
  
  // Try to extract caption
  let caption = 'Not found';
  if (data.caption && data.caption.text) {
    caption = data.caption.text;
  } else if (data.edge_media_to_caption && 
            data.edge_media_to_caption.edges && 
            data.edge_media_to_caption.edges.length > 0) {
    caption = data.edge_media_to_caption.edges[0].node.text;
  } else if (data.caption) {
    caption = data.caption;
  } else if (data.data && data.data.caption) {
    caption = data.data.caption;
  }
  console.log('Caption:', caption.substring(0, 100) + (caption.length > 100 ? '...' : ''));
  
  // Try to extract media URLs
  let mediaUrls = [];
  if (data.carousel_media) {
    mediaUrls = data.carousel_media
      .map(media => media.image_versions2?.candidates[0]?.url)
      .filter(Boolean);
  } else if (data.image_versions2 && data.image_versions2.candidates) {
    mediaUrls = [data.image_versions2.candidates[0].url];
  } else if (data.display_url) {
    mediaUrls = [data.display_url];
  } else if (data.data && data.data.display_url) {
    mediaUrls = [data.data.display_url];
  } else if (data.data && data.data.carousel_media) {
    mediaUrls = data.data.carousel_media
      .map(media => media.image_versions2?.candidates[0]?.url || media.display_url)
      .filter(Boolean);
  }
  console.log('Media URLs:', mediaUrls);
}

/**
 * Save API response to a file
 * @param {Object} data - API response data
 * @param {string} filename - Output filename
 */
async function saveResponseToFile(data, filename) {
  try {
    const fs = require('fs').promises;
    await fs.writeFile(filename, JSON.stringify(data, null, 2));
    console.log(`Response saved to ${filename}`);
  } catch (error) {
    console.error('Error saving response to file:', error.message);
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
  
  if (!url) {
    console.error('Please provide an Instagram URL using --url parameter or as the first argument');
    console.error('Example: node test-exact-api.js --url "https://www.instagram.com/p/XXXX/"');
    console.error('   or: node test-exact-api.js "https://www.instagram.com/p/XXXX/"');
    process.exit(1);
  }
  
  testExactApi(url);
} 