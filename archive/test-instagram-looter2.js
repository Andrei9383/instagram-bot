require('dotenv').config();
const fetch = require('node-fetch');
const util = require('util');
const fs = require('fs').promises;

/**
 * Test the Instagram Looter2 API endpoints
 * @param {string} url - Instagram post/reel URL
 */
async function testInstagramLooter2(url) {
  console.log('Testing Instagram Looter2 API endpoints...');
  console.log('URL to process:', url);
  
  // API key from the user's subscription details
  const apiKey = '6996b3d5demsh845e9209f798096p151e87jsn7e7ab501933b';
  const host = 'instagram-looter2.p.rapidapi.com';
  
  // Define the endpoints to test
  const endpoints = [
    {
      name: "Post Info",
      path: `/post?url=${encodeURIComponent(url)}`,
      description: "Get media info by URL"
    },
    {
      name: "Post Download",
      path: `/post-dl?url=${encodeURIComponent(url)}`,
      description: "Download media from URL"
    }
  ];
  
  // Test each endpoint
  for (const endpoint of endpoints) {
    console.log(`\n\n========== Testing ${endpoint.name} ==========`);
    console.log(`Description: ${endpoint.description}`);
    
    const apiUrl = `https://${host}${endpoint.path}`;
    console.log(`URL: ${apiUrl}`);
    
    try {
      console.log('Sending request...');
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': host,
          'Host': host
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:');
      response.headers.forEach((value, name) => {
        console.log(`${name}: ${value}`);
      });
      
      // Check content type to determine how to process the response
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        // Process JSON response
        const data = await response.json();
        console.log('Response data:', util.inspect(data, { colors: true, depth: 4 }));
        
        // Save successful JSON response to file
        if (response.status === 200) {
          const filename = `instagram-looter2-${endpoint.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
          await fs.writeFile(filename, JSON.stringify(data, null, 2));
          console.log(`Response saved to ${filename}`);
          
          // Extract and display important information
          console.log('\nExtracted Information:');
          extractAndDisplayData(data);
        }
      } else if (contentType.includes('image/') || contentType.includes('video/')) {
        // Process binary media response
        console.log('Response contains media data');
        const buffer = await response.buffer();
        
        // Determine file extension based on content type
        let extension = 'bin';
        if (contentType.includes('image/jpeg')) extension = 'jpg';
        else if (contentType.includes('image/png')) extension = 'png';
        else if (contentType.includes('video/mp4')) extension = 'mp4';
        
        // Save media to file
        const filename = `instagram-media-${Date.now()}.${extension}`;
        await fs.writeFile(filename, buffer);
        console.log(`Media saved to ${filename}`);
      } else {
        // Process as text for other content types
        const text = await response.text();
        console.log('Response text preview:', text.substring(0, 500));
        
        // Try to parse as JSON anyway, in case content-type is incorrect
        try {
          const data = JSON.parse(text);
          console.log('Parsed as JSON:', util.inspect(data, { colors: true, depth: 4 }));
        } catch (e) {
          console.log('Not valid JSON');
        }
      }
      
    } catch (error) {
      console.error(`Error testing ${endpoint.name}:`, error.message);
    }
  }
}

/**
 * Extract and display important data from the API response
 * @param {Object} data - API response data
 */
function extractAndDisplayData(data) {
  try {
    // Try to extract username
    let username = 'Not found';
    if (data.user && data.user.username) {
      username = data.user.username;
    } else if (data.owner && data.owner.username) {
      username = data.owner.username;
    } else if (data.username) {
      username = data.username;
    }
    console.log('Username:', username);
    
    // Try to extract caption
    let caption = 'Not found';
    if (data.caption) {
      caption = data.caption;
    } else if (data.edge_media_to_caption && 
              data.edge_media_to_caption.edges && 
              data.edge_media_to_caption.edges.length > 0) {
      caption = data.edge_media_to_caption.edges[0].node.text;
    }
    console.log('Caption:', caption.substring(0, 100) + (caption.length > 100 ? '...' : ''));
    
    // Try to extract media URLs
    let mediaUrls = [];
    if (data.media_url) {
      mediaUrls.push(data.media_url);
    } else if (data.video_url) {
      mediaUrls.push(data.video_url);
    } else if (data.display_url) {
      mediaUrls.push(data.display_url);
    } else if (data.carousel_media) {
      mediaUrls = data.carousel_media
        .map(media => media.image_versions2?.candidates[0]?.url || media.display_url)
        .filter(Boolean);
    } else if (data.children && Array.isArray(data.children)) {
      mediaUrls = data.children
        .map(child => child.media_url || child.video_url || child.display_url)
        .filter(Boolean);
    }
    console.log('Media URLs:', mediaUrls);
    
    // Try to extract post type
    let postType = 'Unknown';
    if (data.media_type) {
      postType = data.media_type;
    } else if (data.is_video !== undefined) {
      postType = data.is_video ? 'VIDEO' : 'IMAGE';
    } else if (data.children && data.children.length > 1) {
      postType = 'CAROUSEL';
    }
    console.log('Post Type:', postType);
    
  } catch (error) {
    console.error('Error extracting data:', error.message);
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
    url = "https://www.instagram.com/p/CqIbCzYMi5C/"; // Use the example URL from the user
    console.log(`No URL provided, using default: ${url}`);
  }
  
  testInstagramLooter2(url);
} 