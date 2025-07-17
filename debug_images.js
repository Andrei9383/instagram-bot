#!/usr/bin/env node

require('dotenv').config();
const fetch = require('node-fetch');

// Test image URLs from the Instagram post
const testUrls = [
  "https://instagram.fotp3-4.fna.fbcdn.net/v/t51.2885-15/517373246_18014228711758066_6376026780008055600_n.jpg?se=7&stp=dst-jpg_e35_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0uaW1hZ2VfdXJsZ2VuLjEwODB4MTM1MC5zZHIuZjgyNzg3LmRlZmF1bHRfaW1hZ2UifQ&_nc_ht=instagram.fotp3-4.fna.fbcdn.net&_nc_cat=110&_nc_oc=Q6cZ2QFU3dSBYQ3idaUKb0mCychPLhz5WbD-Bx_6aeyT4oyqyRlUJmNG0_-XdfP3qrL0P8g&_nc_ohc=ps4v2nm0lSgQ7kNvwH2h39Q&_nc_gid=qDIVQCUA7B6TuH3BaXfovA&edm=ALQROFkBAAAA&ccb=7-5&ig_cache_key=MzY3MzgwOTE5MzYxOTI3OTA4NQ%3D%3D.3-ccb7-5&oh=00_AfQPonkVkzzeoNgiS8d1adLXI-_fnIEx0alFzdn5V6H7bA&oe=687F31AF&_nc_sid=fc8dfb",
  "https://instagram.fotp3-4.fna.fbcdn.net/v/t51.2885-15/517376687_18014228684758066_1849326911310771054_n.jpg?se=7&stp=dst-jpg_e35_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0uaW1hZ2VfdXJsZ2VuLjEwODB4MTM1MC5zZHIuZjgyNzg3LmRlZmF1bHRfaW1hZ2UifQ&_nc_ht=instagram.fotp3-4.fna.fbcdn.net&_nc_cat=110&_nc_oc=Q6cZ2QFU3dSBYQ3idaUKb0mCychPLhz5WbD-Bx_6aeyT4oyqyRlUJmNG0_-XdfP3qrL0P8g&_nc_ohc=-3yUpXEu2YsQ7kNvwFbrWnF&_nc_gid=qDIVQCUA7B6TuH3BaXfovA&edm=ALQROFkBAAAA&ccb=7-5&ig_cache_key=MzY3MzgwOTE5MjMxODkzNDQ1MQ%3D%3D.3-ccb7-5&oh=00_AfQwq9WgEs51XufzClHHBAayzDD7Dubxgrl0tnbE7YaBvA&oe=687F2E33&_nc_sid=fc8dfb"
];

async function testImageAccess() {
  console.log('Testing image URL accessibility...');
  
  for (let i = 0; i < testUrls.length; i++) {
    try {
      console.log(`\nTesting image ${i + 1}:`);
      const response = await fetch(testUrls[i], { method: 'HEAD' });
      console.log(`Status: ${response.status}`);
      console.log(`Content-Type: ${response.headers.get('content-type')}`);
      console.log(`Content-Length: ${response.headers.get('content-length')}`);
    } catch (error) {
      console.log(`Error accessing image ${i + 1}: ${error.message}`);
    }
  }
}

async function testQwenAPI() {
  console.log('\n\nTesting Qwen API with the images...');
  
  const imageMessages = testUrls.map(url => ({
    type: "image_url",
    image_url: {
      url: url
    }
  }));

  const prompt = `These images are from an Instagram post about color palettes. Please describe what you see in each image specifically, including:
1. Colors visible in each image
2. Text or graphics present
3. Design layout
4. Any color palette information

Be specific about what you actually see in the images.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'https://localhost:3000',
        'X-Title': process.env.SITE_NAME || 'Instagram Content Analyzer'
      },
      body: JSON.stringify({
        model: 'qwen/qwen2.5-vl-32b-instruct:free',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: "text",
                text: prompt
              },
              ...imageMessages
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`API Error ${response.status}: ${errorText}`);
      return;
    }

    const data = await response.json();
    console.log('\nQwen Response:');
    console.log(data.choices[0].message.content);

  } catch (error) {
    console.error(`Error calling Qwen API: ${error.message}`);
  }
}

async function main() {
  await testImageAccess();
  await testQwenAPI();
}

main().catch(console.error);
