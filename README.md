# Instagram AI Summarizer Bot

A streamlined Instagram bot that automatically processes shared posts/reels, generates AI summaries, and saves them to Notion using the reliable `instagrapi` framework.

## ✨ Features

- 🤖 **Automatic DM Monitoring**: Send Instagram links to your bot account via DM for automatic processing
- 📱 **Content Extraction**: Uses `instagrapi` for reliable Instagram content extraction
- 🧠 **AI Summarization**: Powered by DeepSeek AI for intelligent content summaries
- 📝 **Notion Integration**: Automatically saves summaries to your Notion database
- 🎯 **Simple Setup**: Streamlined codebase with minimal dependencies

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip3 install instagrapi
```

### 2. Configure Environment

```bash
npm run setup
```

This will guide you through setting up:
- Notion API key and database ID
- DeepSeek AI API key
- Instagram bot account credentials

### 3. Test Your Setup

```bash
npm test
```

### 4. Usage

#### Process a Single URL
```bash
npm start -- "https://www.instagram.com/p/XXXX/"
```

#### Start DM Monitoring (Recommended)
```bash
npm run monitor
```

Then simply send Instagram post/reel links to your bot account via DM and they'll be processed automatically!

## 📋 Setup Requirements

### Instagram Bot Account
1. Create a dedicated Instagram account for the bot
2. Use this account's credentials in the setup
3. **Important**: This account will be used for automation - don't use your personal account

### Notion Database
Create a Notion database with these properties:
- **Title** (Title)
- **Username** (Text)
- **Media Type** (Select: Photo, Video, Carousel)
- **URL** (URL)
- **Date Processed** (Date)

### DeepSeek AI
1. Sign up at [DeepSeek Platform](https://platform.deepseek.com)
2. Generate an API key from the account settings

## 🏗️ Architecture

This bot uses a hybrid Node.js + Python approach:

- **Python (`instagram_client.py`)**: Handles Instagram operations using `instagrapi`
- **Node.js (`index.js`)**: Manages AI summarization and Notion integration
- **DM Monitor (`dm-monitor.js`)**: Bridges Python and Node.js for automatic processing

## 📁 File Structure

```
instagram-bot/
├── index.js              # Main processing script
├── dm-monitor.js          # DM monitoring service
├── instagram_client.py    # Python Instagram client
├── setup.js              # Environment setup wizard
├── test.js               # Setup verification
└── package.json          # Node.js dependencies
```

## 🔧 Commands

| Command | Description |
|---------|-------------|
| `npm run setup` | Configure environment variables |
| `npm test` | Verify setup and connections |
| `npm start -- "URL"` | Process a single Instagram URL |
| `npm run monitor` | Start automatic DM monitoring |

## 🛡️ Security & Best Practices

- **Dedicated Account**: Always use a separate Instagram account for automation
- **Environment Variables**: Keep your `.env` file secure and never commit it
- **Rate Limiting**: The bot includes built-in delays to respect Instagram's limits
- **Session Management**: Instagram sessions are saved to avoid frequent logins

## 🔄 How It Works

1. **DM Monitoring**: Python script monitors your bot account's DMs
2. **Content Detection**: Detects shared Instagram posts/reels in messages
3. **Extraction**: Uses `instagrapi` to extract post content (caption, media, etc.)
4. **AI Summary**: Sends content to DeepSeek AI for summarization
5. **Notion Save**: Creates a new page in your Notion database with the summary

## 🏷️ Advanced AI Tagging System

The bot now features a sophisticated AI-powered tagging system that automatically categorizes content for better organization in Notion:

### Structured Tag Categories

The AI generates tags in the following categories:

- **Content Type**: educational, promotional, personal, lifestyle, tutorial, behind-the-scenes, etc.
- **Industry**: technology, fashion, fitness, food, travel, business, art, music, etc.
- **Audience**: professionals, students, creators, entrepreneurs, general-public, etc.
- **Mood**: inspiring, informative, entertaining, motivational, casual, professional, etc.
- **Format**: carousel, single-post, video, reel, story-highlight, etc.
- **Topics**: Specific relevant keywords based on content

### Smart Tag Generation

1. **AI-Generated Tags**: Extracted from structured AI response using natural language processing
2. **Caption Analysis**: Intelligent keyword detection and hashtag extraction
3. **Metadata Tags**: Automatic generation based on posting time, media type, and processing context
4. **Deduplication**: Smart removal of duplicate tags while preserving the most relevant ones

### Example Tag Output

For a fitness tutorial video, the system might generate:
```
- VIDEO
- @username
- content type: tutorial
- content type: fitness
- industry: health
- industry: wellness  
- audience: fitness enthusiasts
- mood: motivational
- format: video
- morning workout
- exercise routine
- hashtag: fitness
- timing: recent
- media: video
- processed: dm-monitor
```

## 🆘 Troubleshooting

### DM Processing Issues
- **JSON parsing errors**: The system now includes robust error handling for malformed JSON output
- **URL extraction problems**: Enhanced URL cleaning for complex Instagram share formats
- **Content extraction failures**: Multiple fallback methods with detailed logging

### Instagram Login Issues
- Use app passwords if 2FA is enabled
- Check for rate limiting (wait and try again)
- Verify Instagram account credentials

### Python Import Errors
```bash
pip3 install instagrapi
```

### Notion Connection Issues
- Verify your Notion API key and database ID
- Ensure your integration has access to the database

### Common Issues and Solutions

**Error: "Unexpected non-whitespace character after JSON"**
- This has been fixed with improved JSON sanitization
- The system now truncates very long URLs and handles Unicode properly

**Error: "media_share attribute exists but is None"**
- Enhanced media share extraction with 6 different fallback methods
- Improved debugging with comprehensive logging

**Error: "No Instagram URLs found"**
- Verify the shared content is an Instagram post/reel (not story)
- Check that the bot account can access the shared content

## 📄 License

MIT License - feel free to modify and use as needed!

---

**⚠️ Disclaimer**: This tool is for educational purposes. Use responsibly and in accordance with Instagram's Terms of Service.
