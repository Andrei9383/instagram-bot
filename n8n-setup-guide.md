# Setting up n8n Workflow for Instagram Summarizer

This guide will help you set up the necessary credentials in n8n to run the Instagram summarizer workflow.

## Prerequisites

1. n8n installed and running (via `npm run start:n8n`)
2. DeepSeek API key
3. Notion API key and database ID

## Step 1: Import the Workflow

1. Open n8n in your browser (usually http://localhost:5678)
2. Click on "Workflows" in the sidebar
3. Click "Import from File"
4. Select the `workflow.json` file from this project

## Step 2: Set up Credentials

### DeepSeek API Credentials

1. In the n8n interface, click on "Credentials" in the sidebar
2. Click "Add Credential"
3. Select "HTTP Header Auth" as the type
4. Fill in the following details:
   - Name: `DeepSeek API`
   - Authentication Type: `Header Auth`
   - Name: `Authorization`
   - Value: `Bearer YOUR_DEEPSEEK_API_KEY` (replace with your actual API key)
5. Click "Create"

### Notion API Credentials

1. In the n8n interface, click on "Credentials" in the sidebar
2. Click "Add Credential"
3. Select "HTTP Header Auth" as the type
4. Fill in the following details:
   - Name: `Notion API`
   - Authentication Type: `Header Auth`
   - Name: `Authorization`
   - Value: `Bearer YOUR_NOTION_API_KEY` (replace with your actual API key)
5. Click "Create"

## Step 3: Set Environment Variables

1. In the n8n interface, click on "Settings" in the sidebar
2. Click on "Environment Variables"
3. Add the following variables:
   - `DEEPSEEK_API_KEY`: Your DeepSeek API key
   - `NOTION_DATABASE_ID`: Your Notion database ID

## Step 4: Activate the Workflow

1. Go back to your imported workflow
2. Click "Activate" in the top right corner
3. The webhook will now be active and ready to receive requests

## Step 5: Test the Workflow

You can test the workflow by sending a POST request to the webhook URL:

```bash
curl -X POST http://localhost:5678/webhook/instagram-summarizer \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.instagram.com/p/YOUR_POST_ID/"}'
```

Replace `YOUR_POST_ID` with an actual Instagram post ID.

## Troubleshooting

- If you see credential errors, make sure your API keys are correctly set up in both the credentials and environment variables.
- If the webhook URL is not working, check that the workflow is activated and that the webhook node is properly configured.
- If you're having issues with the Notion integration, verify that your database has the correct properties (Title, URL, Summary, Tags, Date) and that your integration has access to the database. 