# Setting up Notion Integration for Instagram Summarizer

This guide will help you correctly set up your Notion integration to work with the Instagram summarizer.

## Step 1: Create a Notion Integration

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Fill in the details:
   - Name: "Instagram Summarizer" (or any name you prefer)
   - Logo: Optional
   - Associated workspace: Select your workspace
4. Click "Submit"
5. On the next page, copy your "Internal Integration Token" (this is your `NOTION_API_KEY`)

## Step 2: Create a Notion Database

1. In Notion, create a new page
2. Add a new database by typing `/database` and selecting "Table - Full page"
3. Add the following properties to your database:
   - Title (default, already exists)
   - URL (URL type)
   - Summary (Text type)
   - Tags (Multi-select type)
   - Date (Date type)
4. Name your database (e.g., "Instagram Summaries")

## Step 3: Share the Database with Your Integration

1. Open your database
2. Click the "..." menu in the top right corner
3. Select "Add connections"
4. Find and select your "Instagram Summarizer" integration
5. Click "Confirm"

## Step 4: Get Your Database ID

1. Open your database in a web browser
2. Look at the URL, which will look something like:
   ```
   https://www.notion.so/workspace-name/1234567890abcdef1234567890abcdef?v=...
   ```
3. The part after your workspace name and before the question mark is your database ID:
   ```
   1234567890abcdef1234567890abcdef
   ```

## Step 5: Update Your .env File

1. Open your `.env` file in the Instagram summarizer project
2. Update or add the following lines:
   ```
   NOTION_API_KEY=your_integration_token_here
   NOTION_DATABASE_ID=your_database_id_here
   ```

## Troubleshooting

If you see an error like:
```
Could not find database with ID: ... Make sure the relevant pages and databases are shared with your integration.
```

Check the following:
1. Verify that your database ID is correct
2. Make sure you've shared the database with your integration
3. Ensure your integration token is correct
4. Try running the script with the `--no-notion` flag to test extraction and summarization without Notion:
   ```
   npm run summary -- "https://www.instagram.com/p/XXXX/"
   ```

## Testing Your Setup

After completing these steps, test your setup with:

```
node test.js
```

This will verify that your Notion API key and database ID are correctly configured. 