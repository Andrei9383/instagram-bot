require('dotenv').config();
const fetch = require('node-fetch');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');

/**
 * Test various Instagram API endpoints and save results
 */
class InstagramAPITester {
  constructor() {
    this.rapidApiKey = process.env.RAPID_API_KEY;
    if (!this.rapidApiKey) {
      throw new Error('RAPID_API_KEY not found in environment variables. Please add it to your .env file.');
    }
    
    this.results = {
      timestamp: new Date().toISOString(),
      url: '',
      postId: '',
      apiResults: []
    };
  }
  
  /**
   * Extract post ID from Instagram URL
   * @param {string} url - Instagram URL
   * @returns {string} - Post ID
   */
  extractPostId(url) {
    const urlParts = url.split('/');
    const postIndex = urlParts.indexOf('p') !== -1 ? urlParts.indexOf('p') : urlParts.indexOf('reel');
    
    if (postIndex === -1 || postIndex + 1 >= urlParts.length) {
      throw new Error('Invalid Instagram URL format');
    }
    
    return urlParts[postIndex + 1];
  }
  
  /**
   * Test a specific RapidAPI endpoint
   * @param {Object} service - API service configuration
   * @returns {Promise<Object>} - Test results
   */
  async testApiEndpoint(service) {
    console.log(`\n\n========== Testing ${service.name} ==========`);
    console.log(`Endpoint: ${service.url}`);
    
    try {
      const startTime = Date.now();
      
      const response = await fetch(service.url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': this.rapidApiKey,
          'X-RapidAPI-Host': service.host
        }
      });
      
      const responseTime = Date.now() - startTime;
      
      const data = await response.json();
      
      console.log('\nResponse Status:', response.status);
      console.log('Response Time:', responseTime, 'ms');
      
      const headers = {};
      response.headers.forEach((value, name) => {
        headers[name] = value;
        console.log(`${name}: ${value}`);
      });
      
      console.log('\nResponse Data:');
      console.log(util.inspect(data, { colors: true, depth: 3 }));
      
      // Extract important fields
      const extracted = this.extractFields(data);
      
      console.log('\nExtracted Important Fields:');
      console.log('Username:', extracted.username);
      console.log('Caption:', extracted.caption.substring(0, 100) + (extracted.caption.length > 100 ? '...' : ''));
      console.log('Media URLs:', extracted.mediaUrls);
      
      return {
        service: service.name,
        endpoint: service.url,
        status: response.status,
        responseTime,
        headers,
        success: response.status >= 200 && response.status < 300,
        data,
        extracted
      };
    } catch (error) {
      console.log(`Error with ${service.name}: ${error.message}`);
      return {
        service: service.name,
        endpoint: service.url,
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Extract important fields from API response
   * @param {Object} data - API response data
   * @returns {Object} - Extracted fields
   */
  extractFields(data) {
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
    
    return {
      username,
      caption,
      mediaUrls
    };
  }
  
  /**
   * Test all RapidAPI endpoints for Instagram
   * @param {string} url - Instagram URL to test
   */
  async testAllEndpoints(url) {
    console.log(`Testing all endpoints for URL: ${url}`);
    
    this.results.url = url;
    
    try {
      const postId = this.extractPostId(url);
      console.log(`Extracted post ID: ${postId}`);
      this.results.postId = postId;
      
      // Define all API services to test
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
          name: "instagram120 (post)",
          url: `https://instagram120.p.rapidapi.com/api/instagram/post?url=${encodeURIComponent(url)}`,
          host: 'instagram120.p.rapidapi.com'
        },
        {
          name: "instagram120 (hls)",
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
        },
        {
          name: "instagram-downloader",
          url: `https://instagram-downloader-download-instagram-videos-stories.p.rapidapi.com/index?url=${encodeURIComponent(url)}`,
          host: 'instagram-downloader-download-instagram-videos-stories.p.rapidapi.com'
        },
        {
          name: "instagram-post-comments",
          url: `https://instagram-post-comments.p.rapidapi.com/post/comments?shortcode=${postId}`,
          host: 'instagram-post-comments.p.rapidapi.com'
        }
      ];
      
      // Test each API service
      for (const service of apiServices) {
        const result = await this.testApiEndpoint(service);
        this.results.apiResults.push(result);
      }
      
      // Save results to file
      await this.saveResults();
      
      // Display summary
      this.displaySummary();
      
    } catch (error) {
      console.error('Error testing endpoints:', error);
    }
  }
  
  /**
   * Save test results to file
   */
  async saveResults() {
    try {
      const filename = `api-test-results-${this.results.postId}-${Date.now()}.json`;
      await fs.writeFile(filename, JSON.stringify(this.results, null, 2));
      console.log(`\nResults saved to ${filename}`);
    } catch (error) {
      console.error('Error saving results:', error);
    }
  }
  
  /**
   * Display summary of test results
   */
  displaySummary() {
    console.log('\n\n========== TEST SUMMARY ==========');
    console.log(`URL: ${this.results.url}`);
    console.log(`Post ID: ${this.results.postId}`);
    console.log(`Timestamp: ${this.results.timestamp}`);
    console.log('\nAPI Results:');
    
    const table = this.results.apiResults.map(result => ({
      'Service': result.service,
      'Status': result.status || 'Error',
      'Success': result.success ? '✅' : '❌',
      'Response Time': result.responseTime ? `${result.responseTime}ms` : 'N/A'
    }));
    
    console.table(table);
    
    // Display successful APIs
    const successfulApis = this.results.apiResults.filter(result => result.success);
    if (successfulApis.length > 0) {
      console.log('\nSuccessful APIs:');
      successfulApis.forEach(api => {
        console.log(`- ${api.service}`);
        console.log(`  Username: ${api.extracted.username}`);
        console.log(`  Caption: ${api.extracted.caption.substring(0, 50)}...`);
        console.log(`  Media URLs: ${api.extracted.mediaUrls.length} found`);
      });
    } else {
      console.log('\nNo successful API calls. Please check your RapidAPI subscriptions.');
    }
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
    console.error('Example: node api-tester.js --url "https://www.instagram.com/p/XXXX/"');
    console.error('   or: node api-tester.js "https://www.instagram.com/p/XXXX/"');
    process.exit(1);
  }
  
  const tester = new InstagramAPITester();
  tester.testAllEndpoints(url);
} 