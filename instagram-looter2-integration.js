/**
 * Instagram Looter2 API Integration
 * This module provides functions to extract Instagram content using the instagram-looter2 RapidAPI
 */
require('dotenv').config();
const fetch = require('node-fetch');

/**
 * Extract content from Instagram post/reel using the instagram-looter2 API
 * @param {string} url - Instagram post/reel URL
 * @returns {Promise<Object>} - Post content data
 */
async function extractInstagramContent(url) {
  console.log(`Extracting content from: ${url} using instagram-looter2 API`);
  
  try {
    // First try the post info endpoint to get metadata
    const infoData = await fetchPostInfo(url);
    
    // If post info succeeded, return the formatted data
    if (infoData && infoData.status === true) {
      return formatPostInfoData(infoData, url);
    }
    
    // If post info failed, try the download endpoint
    const downloadData = await fetchPostDownload(url);
    
    // If download succeeded, return the formatted data
    if (downloadData && downloadData.status === true) {
      return formatPostDownloadData(downloadData, url);
    }
    
    // If both methods failed, throw an error
    throw new Error('Failed to extract Instagram content with instagram-looter2 API');
    
  } catch (error) {
    console.error('Error extracting Instagram content:', error);
    throw error;
  }
}

/**
 * Fetch post info from instagram-looter2 API
 * @param {string} url - Instagram post/reel URL
 * @returns {Promise<Object>} - API response data
 */
async function fetchPostInfo(url) {
  try {
    console.log('Fetching post info...');
    
    const apiUrl = `https://instagram-looter2.p.rapidapi.com/post?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPID_API_KEY || '6996b3d5demsh845e9209f798096p151e87jsn7e7ab501933b',
        'X-RapidAPI-Host': 'instagram-looter2.p.rapidapi.com',
        'Host': 'instagram-looter2.p.rapidapi.com'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('Error fetching post info:', error.message);
    return null;
  }
}

/**
 * Fetch post download data from instagram-looter2 API
 * @param {string} url - Instagram post/reel URL
 * @returns {Promise<Object>} - API response data
 */
async function fetchPostDownload(url) {
  try {
    console.log('Fetching post download data...');
    
    const apiUrl = `https://instagram-looter2.p.rapidapi.com/post-dl?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPID_API_KEY || '6996b3d5demsh845e9209f798096p151e87jsn7e7ab501933b',
        'X-RapidAPI-Host': 'instagram-looter2.p.rapidapi.com',
        'Host': 'instagram-looter2.p.rapidapi.com'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('Error fetching post download data:', error.message);
    return null;
  }
}

/**
 * Format post info data into the expected structure
 * @param {Object} data - API response data
 * @param {string} url - Original Instagram URL
 * @returns {Object} - Formatted post data
 */
function formatPostInfoData(data, url) {
  try {
    // Extract username
    const username = data.owner?.username || 'Unknown';
    
    // Extract caption
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
    console.error('Error formatting post info data:', error.message);
    throw error;
  }
}

/**
 * Format post download data into the expected structure
 * @param {Object} data - API response data
 * @param {string} url - Original Instagram URL
 * @returns {Object} - Formatted post data
 */
function formatPostDownloadData(data, url) {
  try {
    // Extract data from the response
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
    
  } catch (error) {
    console.error('Error formatting post download data:', error.message);
    throw error;
  }
}

module.exports = {
  extractInstagramContent
}; 