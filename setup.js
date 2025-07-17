#!/usr/bin/env node
/**
 * Simplified setup wizard for Instagram Bot
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');
const chalk = require('chalk');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Environment variables configuration
const envConfig = [
  {
    key: 'NOTION_API_KEY',
    description: 'Your Notion API key',
    help: 'Get it from: https://www.notion.so/my-integrations'
  },
  {
    key: 'NOTION_DATABASE_ID', 
    description: 'Your Notion database ID',
    help: 'The ID from your Notion database URL (after workspace name, before ?)'
  },
  {
    key: 'DEEPSEEK_API_KEY',
    description: 'Your DeepSeek AI API key',
    help: 'Get it from: https://platform.deepseek.com/account/api-keys'
  },
  {
    key: 'IG_BOT_USERNAME',
    description: 'Instagram username for the bot account',
    help: 'Create a dedicated Instagram account for automation'
  },
  {
    key: 'IG_BOT_PASSWORD',
    description: 'Instagram password for the bot account',
    help: 'Use a strong, unique password'
  }
];

console.log(chalk.cyan('🔧 Instagram Bot Setup Wizard'));
console.log(chalk.cyan('================================\n'));

console.log(chalk.yellow('This wizard will help you configure your environment variables.\n'));

/**
 * Prompt for environment variable input
 */
function promptForVariable(index, values = {}) {
  if (index >= envConfig.length) {
    // All variables collected, save to .env file
    saveEnvironmentFile(values);
    return;
  }
  
  const config = envConfig[index];
  
  console.log(chalk.blue(`\n${config.description}`));
  console.log(chalk.gray(`💡 ${config.help}`));
  
  rl.question(chalk.white(`${config.key}: `), (answer) => {
    if (answer.trim()) {
      values[config.key] = answer.trim();
    } else {
      console.log(chalk.red('❌ This field is required. Please try again.'));
      return promptForVariable(index, values);
    }
    
    promptForVariable(index + 1, values);
  });
}

/**
 * Save environment variables to .env file
 */
function saveEnvironmentFile(values) {
  const envPath = path.join(__dirname, '.env');
  const envContent = Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(envPath, envContent);
  
  console.log(chalk.green('\n✅ Environment variables saved to .env file!'));
  
  console.log(chalk.cyan('\n📋 Next steps:'));
  console.log(chalk.gray('1. Install Python dependencies: pip3 install instagrapi'));
  console.log(chalk.gray('2. Test your setup: npm test'));
  console.log(chalk.gray('3. Process a single URL: npm start -- "https://www.instagram.com/p/XXXX/"'));
  console.log(chalk.gray('4. Start DM monitoring: npm run monitor'));
  
  console.log(chalk.yellow('\n⚠️  Important: Keep your .env file secure and never commit it to version control!'));
  
  rl.close();
}

/**
 * Check if .env file already exists
 */
function checkExistingEnv() {
  const envPath = path.join(__dirname, '.env');
  
  if (fs.existsSync(envPath)) {
    console.log(chalk.yellow('⚠️  An .env file already exists.'));
    rl.question(chalk.white('Do you want to overwrite it? (y/n): '), (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log(chalk.blue('\nLet\'s configure your environment variables:\n'));
        promptForVariable(0);
      } else {
        console.log(chalk.gray('Setup cancelled. Your existing .env file was not modified.'));
        rl.close();
      }
    });
  } else {
    console.log(chalk.blue('Let\'s configure your environment variables:\n'));
    promptForVariable(0);
  }
}

// Start setup
checkExistingEnv();