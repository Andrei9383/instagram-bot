# Instagram Post/Reel Summarizer

A tool that extracts content from Instagram posts/reels, summarizes it using DeepSeek AI, and saves the summaries to Notion.

## Features

- Extract content from Instagram posts and reels
- Summarize content using DeepSeek AI
- Save summaries to Notion database
- Multiple extraction methods for reliability:
  - **instagram-looter2 API** (primary method)
  - RapidAPI fallback
  - Puppeteer browser automation (last resort)
- Manual input option when automatic extraction fails
- Archive post processor for older posts

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   # Required for Notion integration
   NOTION_API_KEY=your_notion_api_key
   NOTION_DATABASE_ID=your_notion_database_id
   
   # Required for DeepSeek AI summarization
   DEEPSEEK_API_KEY=your_deepseek_api_key
   
   # Required for RapidAPI integration (primary method)
   RAPID_API_KEY=your_rapidapi_key
   
   # Only required for Puppeteer fallback
   INSTAGRAM_USERNAME=your_instagram_username
   INSTAGRAM_PASSWORD=your_instagram_password
   ```

## API Integration

This tool uses the following RapidAPI services for extracting Instagram content:

1. **instagram-looter2** (Primary method)
   - Endpoints:
     - `/post` - Get post information
     - `/post-dl` - Download post media
   - Subscribe at: [instagram-looter2 on RapidAPI](https://rapidapi.com/search/instagram-looter2)

2. **instagram-data1** (Fallback)
   - Subscribe at: [instagram-data1 on RapidAPI](https://rapidapi.com/search/instagram-data1)

If both API methods fail, the tool falls back to Puppeteer browser automation.

## Usage

### Command Line

Process a single Instagram post/reel:

```
node index.js https://www.instagram.com/p/XXXX/
```

Or with explicit parameter:

```
node index.js --url https://www.instagram.com/p/XXXX/
```

### Serverless

For serverless environments:

```
node serverless.js https://www.instagram.com/p/XXXX/
```

### Archive Post Processor

For older posts that APIs can't access:

```
node archive-post-processor.js
```

### Automatic Processing via DM Sharing

To enable automatic processing of shared Instagram posts:

1. Create a dedicated Instagram account for the bot.

2. Add the following to your `.env` file:

```
IG_BOT_USERNAME=your_bot_instagram_username
IG_BOT_PASSWORD=your_bot_instagram_password
```

3. Start the DM monitor:

```
npm run dm-monitor
```

4. Share Instagram posts or reels to this bot account via direct message.

The bot will automatically detect shared content, extract details, summarize, and save to Notion.

**Note:** This feature uses the instagram-private-api library to interact with Instagram's private API. Use at your own risk, as it may violate Instagram's terms of service and could result in account restrictions.

## How It Works

1. The tool first attempts to extract content using the instagram-looter2 API
2. If that fails, it tries the instagram-data1 API
3. If both API methods fail, it falls back to Puppeteer browser automation
4. If all automatic extraction methods fail, it offers manual input
5. The extracted content is summarized using DeepSeek AI
6. The summary is saved to a Notion database

## Files

- `index.js` - Main CLI tool with all extraction methods
- `serverless.js` - Serverless version for cloud functions
- `instagram-downloader.js` - Standalone downloader with multiple extraction methods
- `archive-post-processor.js` - Tool for processing older posts
- `test-integration.js` - Test script for the instagram-looter2 API integration
- `instagram-looter2-integration.js` - Module for instagram-looter2 API integration

## Troubleshooting

If you encounter issues with the API integration:

1. Check your RapidAPI subscription status
2. Verify your API key is correct in the `.env` file
3. Try the manual input option if automatic extraction fails
4. Use the archive post processor for older posts

## License

MIT # instagram-bot
