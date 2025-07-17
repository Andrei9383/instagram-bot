# Setting up RapidAPI for Instagram Access

This guide will help you set up a RapidAPI key and subscribe to Instagram API services for more reliable Instagram content extraction.

## Step 1: Create a RapidAPI Account

1. Go to [RapidAPI](https://rapidapi.com/) and sign up for an account
2. Verify your email address

## Step 2: Subscribe to Instagram API Services

### Primary API Service

1. Go to [Instagram120 API](https://rapidapi.com/digiwalls/api/instagram120/)
2. Click "Subscribe to Test"
3. Choose the free basic plan (or a paid plan if you need more requests)
4. Complete the subscription process

### Alternative API Services (Optional but Recommended)

For better reliability, you can also subscribe to these alternative services:

1. [Instagram Data API](https://rapidapi.com/restyler/api/instagram-data1/)
2. [Instagram Scraper 2022](https://rapidapi.com/amrelgarhyy/api/instagram-scraper-2022/)

## Step 3: Get Your API Key

1. Go to your [RapidAPI Dashboard](https://rapidapi.com/developer/dashboard)
2. Click on "Security" in the left sidebar
3. Find your API key under "Application Key"
4. Copy this key

## Step 4: Update Your .env File

1. Open your `.env` file in the Instagram summarizer project
2. Add or update the following line:
   ```
   RAPID_API_KEY=your_rapidapi_key_here
   ```

## Testing Your Setup

After completing these steps, test your setup with:

```
node instagram-downloader.js "https://www.instagram.com/p/XXXX/" --no-notion
```

Replace "XXXX" with an actual Instagram post ID.

## Troubleshooting

If you see errors like:
```
API service instagram120.p.rapidapi.com failed: Failed to fetch Instagram data
```

Check the following:
1. Verify that your RapidAPI key is correct
2. Make sure you've subscribed to the API service
3. Check if you've reached your API request limit
4. Try using the manual caption input option:
   ```
   node instagram-downloader.js "https://www.instagram.com/p/XXXX/" --caption "This is the caption text"
   ``` 