require('dotenv').config();
const fetch = require('node-fetch');
const util = require('util');

/**
 * Test the specific instagram120 RapidAPI endpoint with active subscription
 * @param {string} url - Instagram post/reel URL
 */
async function testInstagram120Specific(url) {
  console.log(`Testing instagram120 API for URL: ${url}`);
  
  try {
    // Extract post ID from URL
    const urlParts = url.split('/');
    const postIndex = urlParts.indexOf('p') !== -1 ? urlParts.indexOf('p') : urlParts.indexOf('reel');
    
    if (postIndex === -1 || postIndex + 1 >= urlParts.length) {
      throw new Error('Invalid Instagram URL format');
    }
    
    const postId = urlParts[postIndex + 1];
    console.log(`Extracted post ID: ${postId}`);
    
    // Test the specific endpoint from the subscription details
    console.log(`\n========== Testing instagram120 GET /api/instagram/get ==========`);
    
    // First, let's try without parameters
    try {
      console.log(`Testing without parameters:`);
      const response = await fetch('https://instagram120.p.rapidapi.com/api/instagram/get', {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': '6996b3d5demsh845e9209f798096p151e87jsn7e7ab501933b',
          'X-RapidAPI-Host': 'instagram120.p.rapidapi.com'
        }
      });
      
      const data = await response.json();
      
      console.log('\nResponse Status:', response.status);
      console.log('\nResponse Headers:');
      response.headers.forEach((value, name) => {
        console.log(`${name}: ${value}`);
      });
      
      console.log('\nResponse Data:');
      console.log(util.inspect(data, { colors: true, depth: 4 }));
    } catch (error) {
      console.log(`Error with no parameters: ${error.message}`);
    }
    
    // Now let's try with the URL parameter
    try {
      console.log(`\nTesting with URL parameter:`);
      const response = await fetch(`https://instagram120.p.rapidapi.com/api/instagram/get?url=${encodeURIComponent(url)}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': '6996b3d5demsh845e9209f798096p151e87jsn7e7ab501933b',
          'X-RapidAPI-Host': 'instagram120.p.rapidapi.com'
        }
      });
      
      const data = await response.json();
      
      console.log('\nResponse Status:', response.status);
      console.log('\nResponse Headers:');
      response.headers.forEach((value, name) => {
        console.log(`${name}: ${value}`);
      });
      
      console.log('\nResponse Data:');
      console.log(util.inspect(data, { colors: true, depth: 4 }));
      
      // Try to extract important information
      console.log('\nExtracted Important Fields:');
      
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
      
    } catch (error) {
      console.log(`Error with URL parameter: ${error.message}`);
    }
    
    // Try with post ID parameter
    try {
      console.log(`\nTesting with post ID parameter:`);
      const response = await fetch(`https://instagram120.p.rapidapi.com/api/instagram/get?post=${postId}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': '6996b3d5demsh845e9209f798096p151e87jsn7e7ab501933b',
          'X-RapidAPI-Host': 'instagram120.p.rapidapi.com'
        }
      });
      
      const data = await response.json();
      
      console.log('\nResponse Status:', response.status);
      console.log('\nResponse Headers:');
      response.headers.forEach((value, name) => {
        console.log(`${name}: ${value}`);
      });
      
      console.log('\nResponse Data:');
      console.log(util.inspect(data, { colors: true, depth: 4 }));
      
    } catch (error) {
      console.log(`Error with post ID parameter: ${error.message}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
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
    console.error('Example: node test-instagram120-specific.js --url "https://www.instagram.com/p/XXXX/"');
    console.error('   or: node test-instagram120-specific.js "https://www.instagram.com/p/XXXX/"');
    process.exit(1);
  }
  
  testInstagram120Specific(url);
} 