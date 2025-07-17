const fs = require('fs');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

console.log('🔧 Instagram Bot Setup Wizard 🔧');
console.log('================================');
console.log('This script will help you configure your environment variables.\n');

// Read the example env file
const envExample = fs.readFileSync(envExamplePath, 'utf8');
const envLines = envExample.split('\n').filter(line => line.trim() && !line.startsWith('#'));

const envConfig = {};

// Function to prompt for each environment variable
const promptForEnvVar = (index) => {
  if (index >= envLines.length) {
    // All variables collected, write to .env file
    const envContent = Object.entries(envConfig)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ Environment variables saved to .env file!');
    console.log('\n📋 Next steps:');
    console.log('1. Run `npm install` to install dependencies');
    console.log('2. Run one of the following commands to start the application:');
    console.log('   - `npm start` - Run the CLI tool');
    console.log('   - `npm run start:web` - Start the web UI');
    console.log('   - `npm run start:n8n` - Start the n8n workflow');
    console.log('   - `npm run start:serverless` - Run the serverless version');
    console.log('\n🔗 Remember to set up your Notion integration and database as described in the README.md');
    
    rl.close();
    return;
  }
  
  const line = envLines[index];
  const [key, defaultValue] = line.split('=');
  
  const description = getVarDescription(key);
  
  console.log(`\n${description}`);
  rl.question(`${key} (${defaultValue || 'no default'}): `, (answer) => {
    envConfig[key] = answer || defaultValue;
    promptForEnvVar(index + 1);
  });
};

// Function to get description for each environment variable
function getVarDescription(key) {
  const descriptions = {
    'NOTION_API_KEY': 'Your Notion API key (from https://www.notion.so/my-integrations)',
    'NOTION_DATABASE_ID': 'Your Notion database ID (the part of the URL after the workspace name and before the question mark)',
    'DEEPSEEK_API_KEY': 'Your DeepSeek AI API key (from https://platform.deepseek.com/account/api-keys)',
    'INSTAGRAM_USERNAME': 'Your Instagram username',
    'INSTAGRAM_PASSWORD': 'Your Instagram password',
    'N8N_WEBHOOK_URL': 'The webhook URL for n8n (will be generated when you start n8n)',
    'RAPID_API_KEY': 'Your RapidAPI key (optional, for serverless implementation)'
  };
  
  return descriptions[key] || `Enter value for ${key}`;
}

// Check if .env already exists
if (fs.existsSync(envPath)) {
  rl.question('An .env file already exists. Do you want to overwrite it? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      promptForEnvVar(0);
    } else {
      console.log('Setup cancelled. Your existing .env file was not modified.');
      rl.close();
    }
  });
} else {
  promptForEnvVar(0);
} 