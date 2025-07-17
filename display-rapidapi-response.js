require('dotenv').config();
const fetch = require('node-fetch');
const util = require('util');

/**
 * Display raw response from RapidAPI Instagram endpoints
 * @param {string} url - Instagram post/reel URL
 */
async function displayRapidAPIResponse(url) {
  console.log(`Fetching data for URL: ${url}`);
  
  try {
    // Extract post ID from URL
    const urlParts = url.split('/');
    const postIndex = urlParts.indexOf('p') !== -1 ? urlParts.indexOf('p') : urlParts.indexOf('reel');
    
    if (postIndex === -1 || postIndex + 1 >= urlParts.length) {
      throw new Error('Invalid Instagram URL format');
    }
    
    const postId = urlParts[postIndex + 1];
    console.log(`Extracted post ID: ${postId}`);
    
    if (!process.env.RAPID_API_KEY) {
      throw new Error('RAPID_API_KEY not found in environment variables. Please add it to your .env file.');
    }
    
    // Try multiple RapidAPI services
    const apiServices = [
      {
        name: "instagram-data1",
        url: `https://instagram-data1.p.rapidapi.com/post/info?post=${postId}`,
        host: 'instagram-data1.p.rapidapi.com'
      },
      {
        name: "instagram-scraper-2022",
        url: `https://instagram-scraper-2022.p.rapidapi.com/ig/post_info/?shortcode=${postId}`,
        host: 'instagram-scraper-2022.p.rapidapi.com'
      },
      {
        name: "instagram120 (with URL)",
        url: `https://instagram120.p.rapidapi.com/api/instagram/post?url=${encodeURIComponent(url)}`,
        host: 'instagram120.p.rapidapi.com'
      },
      {
        name: "instagram120 (HLS endpoint)",
        url: `https://instagram120.p.rapidapi.com/api/instagram/hls?url=${encodeURIComponent(url)}`,
        host: 'instagram120.p.rapidapi.com'
      },
      {
        name: "instagram-bulk-scraper",
        url: `https://instagram-bulk-scraper-latest.p.rapidapi.com/media_info_v2?shortcode=${postId}`,
        host: 'instagram-bulk-scraper-latest.p.rapidapi.com'
      },
      {
        name: "instagram-looter",
        url: `https://instagram-looter.p.rapidapi.com/post?link=${encodeURIComponent(url)}`,
        host: 'instagram-looter.p.rapidapi.com'
      }
    ];
    
    // Try each API service
    for (const service of apiServices) {
      try {
        console.log(`\n\n========== Testing ${service.name} ==========`);
        console.log(`Endpoint: ${service.url}`);
        
        const response = await fetch(service.url, {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': process.env.RAPID_API_KEY,
            'X-RapidAPI-Host': service.host
          }
        });
        
        const data = await response.json();
        
        console.log('\nResponse Status:', response.status);
        console.log('\nResponse Headers:');
        response.headers.forEach((value, name) => {
          console.log(`${name}: ${value}`);
        });
        
        console.log('\nResponse Data:');
        // Pretty print the JSON with colors and proper indentation
        console.log(util.inspect(data, { colors: true, depth: null }));
        
        // Extract and display important fields
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
        console.log('Caption:', caption);
        
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
        console.log(`Error with ${service.name}: ${error.message}`);
      }
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
    console.error('Example: node display-rapidapi-response.js --url "https://www.instagram.com/p/XXXX/"');
    console.error('   or: node display-rapidapi-response.js "https://www.instagram.com/p/XXXX/"');
    process.exit(1);
  }
  
  displayRapidAPIResponse(url);
} 