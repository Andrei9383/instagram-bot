// ...moved to tests/test_image_limits.js...
// (File is now in tests/test_image_limits.js. This file is a stub for git history.)
const testUrls = [
  "https://instagram.fotp3-4.fna.fbcdn.net/v/t51.2885-15/517373246_18014228711758066_6376026780008055600_n.jpg?se=7&stp=dst-jpg_e35_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0uaW1hZ2VfdXJsZ2VuLjEwODB4MTM1MC5zZHIuZjgyNzg3LmRlZmF1bHRfaW1hZ2UifQ&_nc_ht=instagram.fotp3-4.fna.fbcdn.net&_nc_cat=110&_nc_oc=Q6cZ2QFU3dSBYQ3idaUKb0mCychPLhz5WbD-Bx_6aeyT4oyqyRlUJmNG0_-XdfP3qrL0P8g&_nc_ohc=ps4v2nm0lSgQ7kNvwH2h39Q&_nc_gid=qDIVQCUA7B6TuH3BaXfovA&edm=ALQROFkBAAAA&ccb=7-5&ig_cache_key=MzY3MzgwOTE5MzYxOTI3OTA4NQ%3D%3D.3-ccb7-5&oh=00_AfQPonkVkzzeoNgiS8d1adLXI-_fnIEx0alFzdn5V6H7bA&oe=687F31AF&_nc_sid=fc8dfb",
  "https://instagram.fotp3-4.fna.fbcdn.net/v/t51.2885-15/517376687_18014228684758066_1849326911310771054_n.jpg?se=7&stp=dst-jpg_e35_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0uaW1hZ2VfdXJsZ2VuLjEwODB4MTM1MC5zZHIuZjgyNzg3LmRlZmF1bHRfaW1hZ2UifQ&_nc_ht=instagram.fotp3-4.fna.fbcdn.net&_nc_cat=110&_nc_oc=Q6cZ2QFU3dSBYQ3idaUKb0mCychPLhz5WbD-Bx_6aeyT4oyqyRlUJmNG0_-XdfP3qrL0P8g&_nc_ohc=-3yUpXEu2YsQ7kNvwFbrWnF&_nc_gid=qDIVQCUA7B6TuH3BaXfovA&edm=ALQROFkBAAAA&ccb=7-5&ig_cache_key=MzY3MzgwOTE5MjMxODkzNDQ1MQ%3D%3D.3-ccb7-5&oh=00_AfQwq9WgEs51XufzClHHBAayzDD7Dubxgrl0tnbE7YaBvA&oe=687F2E33&_nc_sid=fc8dfb",
  "https://instagram.fotp3-4.fna.fbcdn.net/v/t51.2885-15/518181352_18014228723758066_8720443618909902588_n.jpg?se=7&stp=dst-jpg_e35_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0uaW1hZ2VfdXJsZ2VuLjEwODB4MTM1MC5zZHIuZjgyNzg3LmRlZmF1bHRfaW1hZ2UifQ&_nc_ht=instagram.fotp3-4.fna.fbcdn.net&_nc_cat=110&_nc_oc=Q6cZ2QFU3dSBYQ3idaUKb0mCychPLhz5WbD-Bx_6aeyT4oyqyRlUJmNG0_-XdfP3qrL0P8g&_nc_ohc=lwuLqI8V_VEQ7kNvwHgKecb&_nc_gid=qDIVQCUA7B6TuH3BaXfovA&edm=ALQROFkBAAAA&ccb=7-5&ig_cache_key=MzY3MzgwOTE5NTc4MzQ1OTc0Mw%3D%3D.3-ccb7-5&oh=00_AfTXJ8dr6HBzYkm_CE6ulHovazc8h5n8Xxrt6oiKXyrGpQ&oe=687F4B78&_nc_sid=fc8dfb",
  "https://instagram.fotp3-4.fna.fbcdn.net/v/t51.2885-15/515930270_18014228693758066_2181262508213512068_n.jpg?se=7&stp=dst-jpg_e35_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0uaW1hZ2VfdXJsZ2VuLjEwODB4MTM1MC5zZHIuZjgyNzg3LmRlZmF1bHRfaW1hZ2UifQ&_nc_ht=instagram.fotp3-4.fna.fbcdn.net&_nc_cat=110&_nc_oc=Q6cZ2QFU3dSBYQ3idaUKb0mCychPLhz5WbD-Bx_6aeyT4oyqyRlUJmNG0_-XdfP3qrL0P8g&_nc_ohc=RxfYl4hrAcAQ7kNvwHzc_sy&_nc_gid=qDIVQCUA7B6TuH3BaXfovA&edm=ALQROFkBAAAA&ccb=7-5&ig_cache_key=MzY3MzgwOTE5MjYzNzc5ODY1NQ%3D%3D.3-ccb7-5&oh=00_AfSFafMhO4_1QhCjAWKK4R_G1ShdWozxzoEW7kFMmQPecg&oe=687F4863&_nc_sid=fc8dfb"
];

async function testImageCounts() {
  
  for (let count = 1; count <= 4; count++) {
    console.log(`\n=== Testing with ${count} image(s) ===`);
    
    const imagesToTest = testUrls.slice(0, count);
    const imageMessages = imagesToTest.map(url => ({
      type: "image_url",
      image_url: { url: url }
    }));

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
                  text: `Analyze image ${count > 1 ? 's' : ''} ${Array.from({length: count}, (_, i) => i + 1).join(', ')}. Just give me a brief description of what you see.`
                },
                ...imageMessages
              ]
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Failed with ${count} images: ${response.status} - ${errorText.substring(0, 200)}`);
        continue;
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.log(`❌ Invalid response structure with ${count} images:`, JSON.stringify(data, null, 2).substring(0, 200));
        continue;
      }
      
      console.log(`✅ Success with ${count} images: ${data.choices[0].message.content.substring(0, 100)}...`);
      
    } catch (error) {
      console.log(`❌ Error with ${count} images: ${error.message}`);
    }
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testImageCounts().catch(console.error);
