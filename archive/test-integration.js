/**
 * Test script for instagram-looter2 API integration
 */
require('dotenv').config();
const { extractInstagramContent } = require('./instagram-looter2-integration');
const util = require('util');

/**
 * Test the Instagram content extraction
 * @param {string} url - Instagram post/reel URL
 */
async function testExtraction(url) {
  console.log(`Testing Instagram content extraction for URL: ${url}`);
  
  try {
    // Extract content using the integration
    console.log('Extracting content...');
    const postData = await extractInstagramContent(url);
    
    // Display the results
    console.log('\n========== EXTRACTION RESULTS ==========');
    console.log('Username:', postData.username);
    console.log('Caption:', postData.caption.substring(0, 100) + (postData.caption.length > 100 ? '...' : ''));
    console.log('Media URLs:', postData.mediaUrls);
    console.log('Timestamp:', postData.timestamp);
    console.log('URL:', postData.url);
    
    // Save the results to a file
    const fs = require('fs').promises;
    const filename = `extraction-results-${Date.now()}.json`;
    await fs.writeFile(filename, JSON.stringify(postData, null, 2));
    console.log(`\nResults saved to ${filename}`);
    
    // Now test the summarization with DeepSeek AI (if API key is available)
    if (process.env.DEEPSEEK_API_KEY) {
      console.log('\n\n========== TESTING SUMMARIZATION ==========');
      const summary = await summarizeContent(postData);
      console.log('\nSummary:');
      console.log(summary);
    }
    
  } catch (error) {
    console.error('Error in test:', error);
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
    const fetch = require('node-fetch');
    
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
    return 'Summarization failed: ' + error.message;
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
    url = "https://www.instagram.com/p/CqIbCzYMi5C/"; // Use the example URL that worked in our tests
    console.log(`No URL provided, using default: ${url}`);
  }
  
  testExtraction(url);
} 