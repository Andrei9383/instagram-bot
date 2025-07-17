require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { processInstagramUrl } = require('./index');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Serve HTML form
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Instagram Summarizer</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          line-height: 1.6;
          color: #333;
        }
        h1 {
          color: #0095f6;
          margin-bottom: 30px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        input[type="text"] {
          width: 100%;
          padding: 10px;
          border: 1px solid #dbdbdb;
          border-radius: 4px;
          font-size: 16px;
        }
        button {
          background-color: #0095f6;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        button:hover {
          background-color: #0074cc;
        }
        .result {
          margin-top: 30px;
          padding: 20px;
          border: 1px solid #dbdbdb;
          border-radius: 4px;
          background-color: #fafafa;
          display: none;
        }
        .error {
          color: #ed4956;
          margin-top: 10px;
        }
        .loading {
          display: none;
          margin-top: 20px;
          text-align: center;
        }
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #0095f6;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .tags {
          display: flex;
          flex-wrap: wrap;
          margin-top: 10px;
        }
        .tag {
          background-color: #efefef;
          border-radius: 4px;
          padding: 5px 10px;
          margin-right: 5px;
          margin-bottom: 5px;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <h1>Instagram Post/Reel Summarizer</h1>
      
      <div class="form-group">
        <label for="instagram-url">Instagram Post/Reel URL:</label>
        <input type="text" id="instagram-url" placeholder="https://www.instagram.com/p/XXXX/" required>
      </div>
      
      <button id="submit-btn" onclick="processUrl()">Summarize & Save to Notion</button>
      
      <div class="loading" id="loading">
        <p>Processing your request...</p>
        <div class="spinner"></div>
      </div>
      
      <div class="error" id="error"></div>
      
      <div class="result" id="result">
        <h2>Summary</h2>
        <div id="summary-content"></div>
        
        <h3>Tags</h3>
        <div class="tags" id="tags"></div>
        
        <p><strong>Saved to Notion:</strong> <a id="notion-link" href="#" target="_blank">View in Notion</a></p>
      </div>
      
      <script>
        async function processUrl() {
          const url = document.getElementById('instagram-url').value;
          
          if (!url || !url.includes('instagram.com')) {
            document.getElementById('error').textContent = 'Please enter a valid Instagram URL';
            return;
          }
          
          // Show loading spinner
          document.getElementById('loading').style.display = 'block';
          document.getElementById('error').textContent = '';
          document.getElementById('result').style.display = 'none';
          document.getElementById('submit-btn').disabled = true;
          
          try {
            const response = await fetch('/process', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ url })
            });
            
            const data = await response.json();
            
            if (data.success) {
              // Extract summary and tags
              const summaryParts = data.summary.split(/Tags:|Topics:|Keywords:/i);
              const mainSummary = summaryParts[0].trim();
              
              // Display result
              document.getElementById('summary-content').textContent = mainSummary;
              document.getElementById('notion-link').href = data.notionPageUrl;
              
              // Display tags if available
              const tagsContainer = document.getElementById('tags');
              tagsContainer.innerHTML = '';
              
              if (summaryParts.length > 1) {
                const tags = summaryParts[1]
                  .split(/,|\n/)
                  .map(tag => tag.trim())
                  .filter(Boolean);
                
                tags.forEach(tag => {
                  const tagElement = document.createElement('span');
                  tagElement.className = 'tag';
                  tagElement.textContent = tag;
                  tagsContainer.appendChild(tagElement);
                });
              }
              
              document.getElementById('result').style.display = 'block';
            } else {
              document.getElementById('error').textContent = data.error || 'Failed to process Instagram URL';
            }
          } catch (error) {
            document.getElementById('error').textContent = 'An error occurred. Please try again.';
            console.error(error);
          } finally {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('submit-btn').disabled = false;
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Process Instagram URL
app.post('/process', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ success: false, error: 'No URL provided' });
  }
  
  try {
    const result = await processInstagramUrl(url);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 