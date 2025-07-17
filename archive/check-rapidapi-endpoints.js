require('dotenv').config();
const fetch = require('node-fetch');
const util = require('util');

/**
 * Check available endpoints for RapidAPI Instagram service
 */
async function checkRapidApiEndpoints() {
  console.log('Checking available RapidAPI endpoints...');
  
  // API key from the user's subscription details
  const apiKey = '6996b3d5demsh845e9209f798096p151e87jsn7e7ab501933b';
  const host = 'instagram120.p.rapidapi.com';
  
  // List of potential endpoints to test
  const endpoints = [
    '/api/instagram/get',
    '/api/instagram/post',
    '/api/instagram/hls',
    '/api/instagram/info',
    '/api/instagram/media',
    '/api/instagram/user',
    '/api/instagram/profile',
    '/api/instagram/stories',
    '/api/instagram/highlights',
    '/api/instagram/feed',
    '/api/instagram/explore',
    '/api/instagram/search',
    '/api/instagram/download',
    '/api/instagram/reels'
  ];
  
  console.log(`Testing ${endpoints.length} potential endpoints for host: ${host}`);
  
  // Test each endpoint
  for (const endpoint of endpoints) {
    try {
      console.log(`\n\n========== Testing ${endpoint} ==========`);
      
      const url = `https://${host}${endpoint}`;
      console.log(`URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': host
        }
      });
      
      const data = await response.json();
      
      console.log('Status:', response.status);
      console.log('Response:', util.inspect(data, { colors: true, depth: 2 }));
      
      // Check if the endpoint is available or requires parameters
      if (response.status === 200) {
        console.log('✅ ENDPOINT AVAILABLE');
      } else if (response.status === 400 && data.message && data.message.includes('parameter')) {
        console.log('✅ ENDPOINT AVAILABLE (requires parameters)');
      } else if (response.status === 401 && data.message && data.message.includes('disabled')) {
        console.log('❌ ENDPOINT DISABLED for your subscription');
      } else {
        console.log('❓ ENDPOINT STATUS UNKNOWN');
      }
      
    } catch (error) {
      console.log(`Error testing ${endpoint}: ${error.message}`);
    }
  }
  
  // Now try to get the API documentation
  try {
    console.log('\n\n========== Attempting to fetch API documentation ==========');
    
    const response = await fetch(`https://${host}/`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': host
      }
    });
    
    const data = await response.text();
    
    console.log('Status:', response.status);
    console.log('Response type:', typeof data);
    
    // Check if the response contains HTML documentation
    if (data.includes('<html>') || data.includes('<!DOCTYPE html>')) {
      console.log('Response appears to be HTML documentation');
      
      // Extract endpoint information if possible
      const endpointMatches = data.match(/api\/instagram\/\w+/g);
      if (endpointMatches && endpointMatches.length > 0) {
        const uniqueEndpoints = [...new Set(endpointMatches)];
        console.log('\nDetected endpoints in documentation:');
        uniqueEndpoints.forEach(endpoint => console.log(`- /${endpoint}`));
      }
    } else {
      console.log('Response preview:', data.substring(0, 200));
    }
    
  } catch (error) {
    console.log(`Error fetching API documentation: ${error.message}`);
  }
  
  console.log('\n\nEndpoint check complete.');
}

// Execute if run directly
if (require.main === module) {
  checkRapidApiEndpoints();
} 