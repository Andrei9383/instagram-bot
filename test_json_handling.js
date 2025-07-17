// moved to tests/test_json_handling.js
// (File is now in tests/test_json_handling.js. This file is a stub for git history.)
/**
 * Test script for JSON error handling improvements
 */

const chalk = require('chalk');

function testJSONErrorHandling() {
  console.log(chalk.cyan('🧪 Testing JSON Error Handling Improvements\n'));

  // Test 1: Valid JSON
  console.log(chalk.blue('Test 1: Valid JSON'));
  const validJSON = `CONTENT_EXTRACTED: {"username": "test", "url": "https://instagram.com/p/ABC123/"}`;
  processOutput(validJSON);

  // Test 2: Corrupted JSON (like the one in the error)
  console.log(chalk.blue('\nTest 2: Corrupted JSON'));
  const corruptedJSON = `CONTENT_EXTRACTED: {"username": "this.girl.tech", "caption": "Without DevOps, it's just dev-oops 😬⚠️\\n\\n#devops", "url": "text='https://www.instagram.com/p/DMNisoEteD0/?igsh=MWtka3o0cDh3M2MzNQ==' link_context=LinkContext(link_url='', link_title='') client_context='123'"}`;
  processOutput(corruptedJSON);

  // Test 3: Partially corrupted JSON
  console.log(chalk.blue('\nTest 3: Partially corrupted JSON'));
  const partialJSON = `CONTENT_EXTRACTED: {"username": "test_user"`;
  processOutput(partialJSON);

  console.log(chalk.cyan('\n🎉 JSON error handling test completed!'));
}

function processOutput(output) {
  if (output.startsWith('CONTENT_EXTRACTED:')) {
    try {
      const contentJson = output.replace('CONTENT_EXTRACTED:', '').trim();
      
      // Try to parse JSON, with fallback for corrupted output
      let content;
      try {
        content = JSON.parse(contentJson);
        console.log(chalk.green(`✅ Successfully parsed: @${content.username}`));
      } catch (parseError) {
        console.log(chalk.red(`❌ JSON parse error: ${parseError.message}`));
        console.log(chalk.gray(`Raw JSON length: ${contentJson.length} characters`));
        
        // Try to extract basic info even from corrupted JSON
        const usernameMatch = contentJson.match(/"username":\s*"([^"]+)"/);
        const urlMatch = contentJson.match(/"url":\s*"([^"]+)"/);
        
        if (usernameMatch) {
          console.log(chalk.yellow(`⚠️  Extracted username: @${usernameMatch[1]}`));
        }
        if (urlMatch) {
          console.log(chalk.yellow(`⚠️  Extracted URL snippet: ${urlMatch[1].substring(0, 50)}...`));
        }
        
        if (!usernameMatch && !urlMatch) {
          console.log(chalk.red(`❌ Could not extract any useful info`));
        }
      }
      
    } catch (error) {
      console.log(chalk.red(`❌ Processing error: ${error.message}`));
    }
  }
}

// Run the test
testJSONErrorHandling();
