#!/usr/bin/env node
/**
 * Simplified test script to verify the setup
 */

require('dotenv').config();
const chalk = require('chalk');

/**
 * Check if all required environment variables are set
 */
function checkEnvironmentVariables() {
  console.log(chalk.blue('🔍 Checking environment variables...\n'));
  
  const required = [
    'NOTION_API_KEY',
    'NOTION_DATABASE_ID',
    'DEEPSEEK_API_KEY',
    'IG_BOT_USERNAME',
    'IG_BOT_PASSWORD'
  ];
  
  let allSet = true;
  
  for (const varName of required) {
    if (process.env[varName]) {
      console.log(chalk.green(`✅ ${varName}: Set`));
    } else {
      console.log(chalk.red(`❌ ${varName}: Missing`));
      allSet = false;
    }
  }
  
  if (!allSet) {
    console.log(chalk.red('\n❌ Some environment variables are missing.'));
    console.log(chalk.yellow('Run "npm run setup" to configure them.'));
    return false;
  }
  
  console.log(chalk.green('\n✅ All environment variables are set!'));
  return true;
}

/**
 * Test Notion connection
 */
async function testNotionConnection() {
  console.log(chalk.blue('\n🔍 Testing Notion connection...\n'));
  
  try {
    const { Client } = require('@notionhq/client');
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    
    await notion.databases.retrieve({ database_id: process.env.NOTION_DATABASE_ID });
    console.log(chalk.green('✅ Notion connection successful!'));
    return true;
    
  } catch (error) {
    console.log(chalk.red(`❌ Notion connection failed: ${error.message}`));
    return false;
  }
}

/**
 * Test DeepSeek AI connection
 */
async function testDeepSeekConnection() {
  console.log(chalk.blue('\n🔍 Testing DeepSeek AI connection...\n'));
  
  try {
    const fetch = require('node-fetch');
    const response = await fetch('https://api.deepseek.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      }
    });
    
    if (response.ok) {
      console.log(chalk.green('✅ DeepSeek AI connection successful!'));
      return true;
    } else {
      console.log(chalk.red(`❌ DeepSeek AI connection failed: ${response.status} ${response.statusText}`));
      return false;
    }
    
  } catch (error) {
    console.log(chalk.red(`❌ DeepSeek AI connection failed: ${error.message}`));
    return false;
  }
}

/**
 * Test Python and instagrapi availability
 */
async function testPythonSetup() {
  console.log(chalk.blue('\n🔍 Testing Python and instagrapi setup...\n'));
  
  return new Promise((resolve) => {
    const { spawn } = require('child_process');
    const python = spawn('/Users/andreistan/instagram-bot/.venv/bin/python', ['-c', 'import instagrapi; print("instagrapi available")']);
    
    let output = '';
    let errorOutput = '';
    
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    python.on('close', (code) => {
      if (code === 0 && output.includes('instagrapi available')) {
        console.log(chalk.green('✅ Python and instagrapi are properly installed!'));
        resolve(true);
      } else {
        console.log(chalk.red('❌ Python or instagrapi not available'));
        console.log(chalk.yellow('Please install instagrapi: pip3 install instagrapi'));
        resolve(false);
      }
    });
  });
}

/**
 * Run all tests
 */
async function runTests() {
  console.log(chalk.cyan('🧪 Running setup verification tests...\n'));
  
  const results = {
    environment: checkEnvironmentVariables(),
    notion: false,
    deepseek: false,
    python: false
  };
  
  if (results.environment) {
    results.notion = await testNotionConnection();
    results.deepseek = await testDeepSeekConnection();
  }
  
  results.python = await testPythonSetup();
  
  console.log(chalk.cyan('\n📊 Test Results Summary:'));
  console.log(chalk.cyan('========================'));
  
  const tests = [
    { name: 'Environment Variables', passed: results.environment },
    { name: 'Notion Connection', passed: results.notion },
    { name: 'DeepSeek AI Connection', passed: results.deepseek },
    { name: 'Python & instagrapi', passed: results.python }
  ];
  
  let allPassed = true;
  for (const test of tests) {
    const status = test.passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
    console.log(`${status} ${test.name}`);
    if (!test.passed) allPassed = false;
  }
  
  if (allPassed) {
    console.log(chalk.green('\n🎉 All tests passed! Your setup is ready to use.'));
    console.log(chalk.cyan('\n📖 Usage:'));
    console.log(chalk.gray('  Process a single URL: npm start -- "https://www.instagram.com/p/XXXX/"'));
    console.log(chalk.gray('  Start DM monitoring:  npm run monitor'));
  } else {
    console.log(chalk.red('\n❌ Some tests failed. Please fix the issues above.'));
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error(chalk.red(`\n💥 Test error: ${error.message}`));
    process.exit(1);
  });
}