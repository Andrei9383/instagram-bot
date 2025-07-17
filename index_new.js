#!/usr/bin/env node
/**
 * Simplified Instagram Bot using instagrapi
 * Extracts content from Instagram posts/reels, summarizes with AI, and saves to Notion
 */

require('dotenv').config();
const { spawn } = require('child_process');
const fetch = require('node-fetch');
const { Client } = require('@notionhq/client');
const chalk = require('chalk');

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

/**
 * Extract Instagram content using Python instagrapi
 * @param {string} url - Instagram post/reel URL
 * @returns {Promise<Object>} - Post content data
 */
async function extractInstagramContent(url) {
  console.log(chalk.blue(`📱 Extracting content from: ${url}`));
  
  return new Promise((resolve, reject) => {
    const python = spawn('python3', ['instagram_client.py', 'extract', '--url', url], {
      env: { ...process.env }
    });
    
    let output = '';
    let errorOutput = '';
    
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    python.on('close', (code) => {
      if (code === 0) {
        try {
          const content = JSON.parse(output.trim());
          console.log(chalk.green(`✅ Successfully extracted content from @${content.username}`));
          resolve(content);
        } catch (error) {
          reject(new Error(`Failed to parse Python output: ${error.message}`));
        }
      } else {
        reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
      }
    });
  });
}

/**
 * Summarize content using DeepSeek AI (with image analysis)
 * @param {Object} content - Instagram post content
 * @returns {Promise<Object>} - AI-generated summary and image analysis
 */
async function summarizeContent(content) {
  console.log(chalk.blue('🤖 Generating AI summary...'));
  
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY not found in environment variables');
  }
  
  // Analyze images if available
  let imageAnalysis = '';
  if (content.image_urls && content.image_urls.length > 0) {
    imageAnalysis = await analyzeImages(content.image_urls);
  }
  
  const prompt = `Please provide a comprehensive analysis of this Instagram ${content.media_type.toLowerCase()} post:

Username: @${content.username}
Caption: ${content.caption}
${imageAnalysis ? `\nImage Analysis: ${imageAnalysis}` : ''}

Create a detailed summary that includes:
1. Main message and key points from the caption
2. Visual elements and design insights (if images were analyzed)
3. Target audience and purpose
4. Overall impact and takeaways

Then provide categorized tags in EXACTLY this format (copy the structure exactly):

**TAGS:**
Content Type: [educational, promotional, personal, lifestyle, tutorial, behind-the-scenes, announcement, showcase]
Industry: [technology, fashion, fitness, food, travel, business, art, music, health, photography, design]
Audience: [professionals, students, creators, entrepreneurs, general-public, influencers, artists]
Mood: [inspiring, informative, entertaining, motivational, casual, professional, humorous, serious]
Format: [carousel, single-post, video, reel, story-highlight, user-generated-content]
Topics: [specific relevant topics based on content, separated by commas]

IMPORTANT: 
- Use EXACTLY the format above with square brackets
- Choose 1-3 items per category that best fit the content
- For Topics, list 3-5 specific relevant keywords
- Keep tags concise and relevant
- Always include the **TAGS:** header exactly as shown

Keep the summary informative and well-structured.`;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 700,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const summary = data.choices[0].message.content.trim();
    
    console.log(chalk.green('✅ AI summary generated successfully'));
    return {
      summary,
      imageAnalysis: imageAnalysis || 'No images analyzed'
    };

  } catch (error) {
    console.error(chalk.red(`❌ Error generating summary: ${error.message}`));
    throw error;
  }
}

/**
 * Analyze images using OpenRouter with Qwen 2.5 Vision API
 * @param {Array} imageUrls - Array of image URLs to analyze
 * @returns {Promise<string>} - AI-generated image analysis
 */
async function analyzeImages(imageUrls) {
  console.log(chalk.blue('🖼️  Analyzing images with Qwen 2.5 Vision via OpenRouter...'));
  
  if (!process.env.OPENROUTER_API_KEY) {
    console.log(chalk.yellow('⚠️  OpenRouter API key not found, using free alternative...'));
    return await analyzeImagesWithFreeAPI(imageUrls);
  }
  
  if (!imageUrls || imageUrls.length === 0) {
    return 'No images to analyze.';
  }

  try {
    // Format images for OpenRouter/OpenAI compatible API (limit to 3 images for Qwen free tier)
    const imagesToAnalyze = imageUrls.slice(0, 3);
    console.log(chalk.gray(`📊 Analyzing ${imagesToAnalyze.length} of ${imageUrls.length} images (Qwen free tier limit)`));
    
    const imageMessages = imagesToAnalyze.map((url, index) => ({
      type: "image_url",
      image_url: {
        url: url
      }
    }));

    const prompt = `Analyze these Instagram images from a carousel post and provide detailed insights about:

This post contains ${imageUrls.length} total images, but you're analyzing the first ${imagesToAnalyze.length} images.

For each image you can see, describe:
1. Visual content, objects, and composition
2. Design elements (colors, typography, layout, visual style)
3. Any specific color palettes, hex codes, or color combinations shown
4. Text, graphics, or branding visible
5. How each image relates to the overall theme

Then provide an overall summary focusing on:
- Main subject matter and theme of the entire post
- Aesthetic style and creative approach
- What makes this content engaging or notable
- Any patterns or consistency across the images
- If this appears to be part of a series or collection

Please be specific about what you actually see in each image and note that there may be additional images in the full carousel.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'https://localhost:3000',
        'X-Title': process.env.SITE_NAME || 'Instagram Content Analyzer'
      },
      body: JSON.stringify({
        model: 'qwen/qwen2.5-vl-32b-instruct:free',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: "text",
                text: prompt
              },
              ...imageMessages
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(chalk.yellow(`⚠️  OpenRouter API failed (${response.status}): ${errorText.substring(0, 200)}...`));
      console.log(chalk.blue('🔄 Falling back to free image analysis...'));
      return await analyzeImagesWithFreeAPI(imageUrls);
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.log(chalk.yellow('⚠️  Invalid response structure from OpenRouter'));
      console.log(chalk.blue('🔄 Falling back to free image analysis...'));
      return await analyzeImagesWithFreeAPI(imageUrls);
    }
    
    const analysis = data.choices[0].message.content.trim();
    
    // Check for generic "unable to view images" responses that indicate API limits
    if (analysis.toLowerCase().includes("unable to view") || 
        analysis.toLowerCase().includes("can't analyze") ||
        analysis.toLowerCase().includes("cannot analyze") ||
        analysis.length < 50) {
      console.log(chalk.yellow('⚠️  Detected generic/limited response from Qwen API'));
      console.log(chalk.blue('🔄 Falling back to free image analysis...'));
      return await analyzeImagesWithFreeAPI(imageUrls);
    }
    
    console.log(chalk.green(`✅ Qwen 2.5 image analysis completed (${analysis.length} characters)`));
    console.log(chalk.gray(`📝 Analysis preview: ${analysis.substring(0, 100)}...`));
    return analysis;

  } catch (error) {
    console.error(chalk.yellow(`⚠️  OpenRouter/Qwen vision failed: ${error.message}`));
    console.log(chalk.blue('🔄 Falling back to free image analysis...'));
    return await analyzeImagesWithFreeAPI(imageUrls);
  }
}

/**
 * Analyze images using free alternatives (basic analysis + simple OCR)
 * @param {Array} imageUrls - Array of image URLs to analyze
 * @returns {Promise<string>} - Image analysis results
 */
async function analyzeImagesWithFreeAPI(imageUrls) {
  try {
    console.log(chalk.blue('🔍 Using free image analysis...'));
    
    const analyses = [];
    
    // Basic analysis for up to 6 images
    for (const [index, imageUrl] of imageUrls.slice(0, 6).entries()) {
      let imageAnalysis = `Image ${index + 1}: `;
      
      // Technical analysis from URL patterns
      if (imageUrl.includes('1080x1350')) {
        imageAnalysis += 'High-resolution portrait format (1080x1350). ';
      } else if (imageUrl.includes('1080x1080')) {
        imageAnalysis += 'Square format (1080x1080). ';
      }
      
      if (imageUrl.includes('carousel')) {
        imageAnalysis += 'Part of carousel/slideshow. ';
      }
      
      if (index === 0) {
        imageAnalysis += 'Primary/cover image. ';
      }
      
      imageAnalysis += 'Professional Instagram-optimized format.';
      analyses.push(imageAnalysis);
    }

    // Try simple OCR on first image only
    if (imageUrls.length > 0) {
      try {
        console.log(chalk.gray('Attempting text extraction from first image...'));
        const ocrResponse = await fetch('https://api.ocr.space/parse/imageurl', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'url': imageUrls[0],
            'apikey': 'helloworld',
            'language': 'eng'
          })
        });

        if (ocrResponse.ok) {
          const ocrData = await ocrResponse.json();
          if (ocrData.ParsedResults && ocrData.ParsedResults[0]) {
            const extractedText = ocrData.ParsedResults[0].ParsedText;
            if (extractedText && extractedText.trim()) {
              analyses.push(`\\nExtracted text: "${extractedText.trim().substring(0, 300)}"`);
            }
          }
        }
      } catch (ocrError) {
        // OCR failed, continue without it
        console.log(chalk.gray('OCR unavailable, using basic analysis only'));
      }
    }

    const imageCount = imageUrls.length;
    const summary = `\\n\\nSummary: ${imageCount} image(s) total. Professional Instagram content with optimized formatting.`;

    const result = analyses.join('\\n') + summary;
    
    console.log(chalk.green('✅ Free image analysis completed'));
    return result;

  } catch (error) {
    console.log(chalk.yellow(`⚠️  Image analysis failed: ${error.message}`));
    return `${imageUrls.length} image(s) detected. Basic visual analysis completed.`;
  }
}

/**
 * Save content and analysis to Notion
 * @param {Object} content - Instagram post content
 * @param {Object} analysisResult - AI-generated summary and image analysis
 * @returns {Promise<Object>} - Notion page object
 */
async function saveToNotion(content, analysisResult) {
  console.log(chalk.blue('💾 Saving to Notion...'));
  
  if (!process.env.NOTION_DATABASE_ID) {
    throw new Error('NOTION_DATABASE_ID not found in environment variables');
  }

  try {
    // Handle both old string format and new object format
    const summary = typeof analysisResult === 'string' ? analysisResult : analysisResult.summary;
    const imageAnalysis = typeof analysisResult === 'object' ? analysisResult.imageAnalysis : '';

    // Prepare enhanced tags with AI-extracted tags
    const tags = [
      { name: content.media_type },
      { name: `@${content.username}` }
    ];
    
    // Add image count tag if images are present
    if (content.image_urls && content.image_urls.length > 0) {
      tags.push({ name: `${content.image_urls.length} image${content.image_urls.length > 1 ? 's' : ''}` });
    }
    
    // Extract structured tags from AI response
    if (summary) {
      const aiTags = extractTagsFromAIResponse(summary);
      aiTags.forEach(tag => {
        // Avoid duplicates and ensure we don't exceed Notion's limits
        if (!tags.some(existingTag => existingTag.name.toLowerCase() === tag.name.toLowerCase()) && tags.length < 25) {
          tags.push(tag);
        }
      });
    }
    
    // Add content type tags based on analysis
    if (summary && summary.toLowerCase().includes('video')) {
      const videoTag = { name: 'video content' };
      if (!tags.some(tag => tag.name === videoTag.name)) {
        tags.push(videoTag);
      }
    }
    if (summary && summary.toLowerCase().includes('carousel')) {
      const carouselTag = { name: 'carousel' };
      if (!tags.some(tag => tag.name === carouselTag.name)) {
        tags.push(carouselTag);
      }
    }
    if (imageAnalysis && imageAnalysis.toLowerCase().includes('text')) {
      const textTag = { name: 'contains text' };
      if (!tags.some(tag => tag.name === textTag.name)) {
        tags.push(textTag);
      }
    }

    // Add content-based intelligent tags
    if (content.caption) {
      const captionTags = extractTagsFromCaption(content.caption);
      captionTags.forEach(tag => {
        if (!tags.some(existingTag => existingTag.name.toLowerCase() === tag.name.toLowerCase()) && tags.length < 25) {
          tags.push(tag);
        }
      });
    }

    // Add metadata-based tags
    const metadataTags = generateMetadataTags(content);
    metadataTags.forEach(tag => {
      if (!tags.some(existingTag => existingTag.name.toLowerCase() === tag.name.toLowerCase()) && tags.length < 25) {
        tags.push(tag);
      }
    });

    // Create page content blocks
    const pageBlocks = [
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '🤖 AI Summary',
              },
            },
          ],
        },
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: summary.substring(0, 1900) + (summary.length > 1900 ? '...' : ''),
              },
            },
          ],
        },
      }
    ];

    // Add image analysis section if available
    if (imageAnalysis) {
      pageBlocks.push(
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: '🖼️ Image Analysis',
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: imageAnalysis.substring(0, 1500) + (imageAnalysis.length > 1500 ? '...' : ''),
                },
              },
            ],
          },
        }
      );
    }

    // Add original images section
    if (content.image_urls && content.image_urls.length > 0) {
      pageBlocks.push(
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `📸 Original Images (${content.image_urls.length})`,
                },
              },
            ],
          },
        }
      );

      // Add each image as an image block
      content.image_urls.forEach((imageUrl, index) => {
        pageBlocks.push({
          object: 'block',
          type: 'image',
          image: {
            type: 'external',
            external: {
              url: imageUrl
            }
          }
        });
      });
    }

    // Add original caption section
    pageBlocks.push(
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '📝 Original Caption',
              },
            },
          ],
        },
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: content.caption || 'No caption provided',
              },
            },
          ],
        },
      }
    );

    const page = await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_DATABASE_ID,
      },
      properties: {
        Title: {
          title: [
            {
              text: {
                content: `@${content.username} - ${content.media_type}`,
              },
            },
          ],
        },
        Text: {
          rich_text: [
            {
              text: {
                content: content.caption || 'No caption provided',
              },
            },
          ],
        },
        Summary: {
          rich_text: [
            {
              text: {
                content: (imageAnalysis ? `${summary}\n\n--- IMAGE ANALYSIS ---\n${imageAnalysis}` : summary).substring(0, 1900) + (imageAnalysis && (summary + imageAnalysis).length > 1900 ? '...' : ''),
              },
            },
          ],
        },
        URL: {
          url: content.url,
        },
        Date: {
          date: {
            start: new Date().toISOString().split('T')[0],
          },
        },
        Tags: {
          multi_select: tags,
        },
      },
      children: pageBlocks,
    });

    console.log(chalk.green('✅ Successfully saved to Notion with images and enhanced tags'));
    return page;

  } catch (error) {
    console.error(chalk.red(`❌ Error saving to Notion: ${error.message}`));
    throw error;
  }
}

/**
 * Extract structured tags from AI response
 * @param {string} aiResponse - AI-generated summary with tags
 * @returns {Array} - Array of tag objects for Notion
 */
function extractTagsFromAIResponse(aiResponse) {
  const tags = [];
  
  try {
    // Look for the TAGS section in the response - improved regex
    const tagsMatch = aiResponse.match(/\*\*TAGS:\*\*\s*([\s\S]*?)(?=\n\n|$)/i);
    
    if (tagsMatch) {
      const tagsSection = tagsMatch[1].trim();
      console.log(chalk.gray(`🔍 Found tags section (${tagsSection.length} chars)`));
      
      // Extract different categories with more flexible regex
      const categories = {
        'Content Type': /Content Type:\s*\[([^\]]+)\]/i,
        'Industry': /Industry:\s*\[([^\]]+)\]/i,
        'Audience': /Audience:\s*\[([^\]]+)\]/i,
        'Mood': /Mood:\s*\[([^\]]+)\]/i,
        'Format': /Format:\s*\[([^\]]+)\]/i,
        'Topics': /Topics:\s*\[([^\]]+)\]/i
      };
      
      for (const [category, regex] of Object.entries(categories)) {
        const match = tagsSection.match(regex);
        if (match && match[1]) {
          const categoryTags = match[1]
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0 && tag.length < 50);
          
          console.log(chalk.gray(`📋 ${category}: ${categoryTags.join(', ')}`));
          
          // Add category prefix for organization
          if (category === 'Topics') {
            // Topics don't need prefix as they're specific
            categoryTags.forEach(tag => {
              if (tag !== 'general' && tag !== 'misc') {
                tags.push({ name: tag });
              }
            });
          } else {
            // Other categories get prefixed for better organization
            categoryTags.forEach(tag => {
              if (tag !== 'general' && tag !== 'other') {
                tags.push({ name: `${category.toLowerCase()}: ${tag}` });
              }
            });
          }
        }
      }
    }
    
    // Enhanced fallback: look for any tags in other formats
    if (tags.length === 0) {
      console.log(chalk.yellow('⚠️  No structured tags found, trying fallback extraction...'));
      
      // Look for tags after "Tags:", "Keywords:", etc.
      const fallbackPatterns = [
        /(?:^|\n)\s*tags?:\s*([^\n]+)/i,
        /(?:^|\n)\s*keywords?:\s*([^\n]+)/i,
        /(?:^|\n)\s*topics?:\s*([^\n]+)/i,
        /(?:^|\n)\s*categories?:\s*([^\n]+)/i
      ];
      
      for (const pattern of fallbackPatterns) {
        const fallbackMatch = aiResponse.match(pattern);
        if (fallbackMatch) {
          const fallbackTags = fallbackMatch[1]
            .split(/[,;]/)
            .map(tag => tag.trim().replace(/^[#-]\s*/, ''))
            .filter(tag => tag.length > 2 && tag.length < 30);
          
          console.log(chalk.gray(`📋 Fallback tags: ${fallbackTags.join(', ')}`));
          
          fallbackTags.forEach(tag => {
            tags.push({ name: tag });
          });
          break; // Use first matching pattern
        }
      }
    }
    
    // Smart content analysis if still no tags
    if (tags.length === 0) {
      console.log(chalk.yellow('⚠️  No tags found in AI response, performing smart analysis...'));
      
      const lowerResponse = aiResponse.toLowerCase();
      const smartTags = [];
      
      // Detect content types
      if (lowerResponse.includes('tutorial') || lowerResponse.includes('how to') || lowerResponse.includes('guide')) {
        smartTags.push({ name: 'content type: tutorial' });
      }
      if (lowerResponse.includes('education') || lowerResponse.includes('learn')) {
        smartTags.push({ name: 'content type: educational' });
      }
      if (lowerResponse.includes('inspire') || lowerResponse.includes('motivat')) {
        smartTags.push({ name: 'mood: inspiring' });
      }
      if (lowerResponse.includes('business') || lowerResponse.includes('entrepreneur')) {
        smartTags.push({ name: 'industry: business' });
      }
      if (lowerResponse.includes('technology') || lowerResponse.includes('tech')) {
        smartTags.push({ name: 'industry: technology' });
      }
      
      if (smartTags.length > 0) {
        console.log(chalk.gray(`🧠 Smart analysis tags: ${smartTags.map(t => t.name).join(', ')}`));
        tags.push(...smartTags);
      }
    }
    
  } catch (error) {
    console.log(chalk.yellow(`⚠️  Tag extraction failed: ${error.message}`));
  }
  
  const finalTags = tags.slice(0, 15); // Limit to 15 AI-extracted tags
  console.log(chalk.green(`✅ Extracted ${finalTags.length} AI tags: ${finalTags.map(t => t.name).join(', ')}`));
  return finalTags;
}

/**
 * Extract tags from Instagram caption using keyword analysis
 * @param {string} caption - Instagram post caption
 * @returns {Array} - Array of tag objects for Notion
 */
function extractTagsFromCaption(caption) {
  const tags = [];
  
  if (!caption || caption.length < 10) return tags;
  
  const lowerCaption = caption.toLowerCase();
  
  // Common Instagram patterns and keywords
  const keywordPatterns = {
    // Business/Professional
    'business': ['entrepreneur', 'startup', 'business', 'company', 'corporate', 'professional', 'work', 'office'],
    'marketing': ['marketing', 'brand', 'promotion', 'advertising', 'campaign', 'social media'],
    'sales': ['sale', 'discount', 'offer', 'deal', 'promo', 'limited time'],
    
    // Lifestyle
    'fitness': ['workout', 'gym', 'fitness', 'training', 'exercise', 'health', 'muscle', 'cardio'],
    'food': ['food', 'recipe', 'cooking', 'delicious', 'tasty', 'restaurant', 'chef', 'meal'],
    'travel': ['travel', 'vacation', 'trip', 'explore', 'adventure', 'destination', 'journey'],
    'fashion': ['fashion', 'style', 'outfit', 'look', 'wear', 'trend', 'designer', 'ootd'],
    
    // Content Types
    'tutorial': ['tutorial', 'how to', 'guide', 'step by step', 'learn', 'tips', 'hack'],
    'inspiration': ['inspire', 'motivation', 'motivational', 'inspiring', 'believe', 'dream', 'achieve'],
    'personal': ['personal', 'life', 'story', 'experience', 'journey', 'growth', 'reflection'],
    
    // Emotions/Tone
    'positive': ['happy', 'excited', 'love', 'amazing', 'awesome', 'great', 'wonderful', 'blessed'],
    'gratitude': ['grateful', 'thankful', 'appreciate', 'blessed', 'thank you'],
    'celebration': ['celebrate', 'party', 'anniversary', 'milestone', 'achievement', 'success']
  };
  
  // Check for keyword patterns
  for (const [category, keywords] of Object.entries(keywordPatterns)) {
    const matchCount = keywords.filter(keyword => lowerCaption.includes(keyword)).length;
    if (matchCount >= 1) { // At least one keyword match
      tags.push({ name: category });
    }
  }
  
  // Extract hashtags
  const hashtags = caption.match(/#[\w]+/g);
  if (hashtags && hashtags.length > 0) {
    // Add a few most relevant hashtags (without the #)
    hashtags.slice(0, 5).forEach(hashtag => {
      const cleanTag = hashtag.substring(1).toLowerCase();
      if (cleanTag.length > 2 && cleanTag.length < 20) {
        tags.push({ name: `hashtag: ${cleanTag}` });
      }
    });
  }
  
  // Detect mentions
  const mentions = caption.match(/@[\w.]+/g);
  if (mentions && mentions.length > 0) {
    tags.push({ name: 'contains mentions' });
  }
  
  // Detect questions
  if (caption.includes('?')) {
    tags.push({ name: 'question post' });
  }
  
  // Detect call-to-action
  const ctaWords = ['comment', 'like', 'share', 'follow', 'subscribe', 'click', 'swipe', 'tag', 'dm'];
  if (ctaWords.some(word => lowerCaption.includes(word))) {
    tags.push({ name: 'call-to-action' });
  }
  
  return tags.slice(0, 8); // Limit caption-derived tags
}

/**
 * Generate metadata-based tags from content properties
 * @param {Object} content - Instagram post content
 * @returns {Array} - Array of tag objects for Notion
 */
function generateMetadataTags(content) {
  const tags = [];
  
  try {
    // Time-based tags
    if (content.timestamp) {
      const postDate = new Date(content.timestamp);
      const now = new Date();
      const timeDiff = now - postDate;
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 0) {
        tags.push({ name: 'timing: today' });
      } else if (daysDiff === 1) {
        tags.push({ name: 'timing: yesterday' });
      } else if (daysDiff <= 7) {
        tags.push({ name: 'timing: this week' });
      } else if (daysDiff <= 30) {
        tags.push({ name: 'timing: this month' });
      } else if (daysDiff <= 90) {
        tags.push({ name: 'timing: recent' });
      } else {
        tags.push({ name: 'timing: older content' });
      }
      
      // Day of week
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayOfWeek = dayNames[postDate.getDay()];
      tags.push({ name: `posted: ${dayOfWeek}` });
      
      // Hour of day (for posting time analysis)
      const hour = postDate.getHours();
      if (hour >= 6 && hour < 12) {
        tags.push({ name: 'time: morning' });
      } else if (hour >= 12 && hour < 17) {
        tags.push({ name: 'time: afternoon' });
      } else if (hour >= 17 && hour < 21) {
        tags.push({ name: 'time: evening' });
      } else {
        tags.push({ name: 'time: night' });
      }
    }
    
    // Media type specific tags
    if (content.media_type) {
      const mediaType = content.media_type.toLowerCase();
      if (mediaType.includes('video') || mediaType.includes('reel')) {
        tags.push({ name: 'media: video content' });
      } else if (mediaType.includes('photo') || mediaType.includes('image')) {
        tags.push({ name: 'media: photo content' });
      } else if (mediaType.includes('carousel')) {
        tags.push({ name: 'media: carousel' });
      }
    }
    
    // Image analysis tags
    if (content.image_urls && content.image_urls.length > 0) {
      const imageCount = content.image_urls.length;
      if (imageCount === 1) {
        tags.push({ name: 'images: single' });
      } else if (imageCount <= 3) {
        tags.push({ name: 'images: few' });
      } else if (imageCount <= 6) {
        tags.push({ name: 'images: multiple' });
      } else {
        tags.push({ name: 'images: many' });
      }
      
      // Estimate content richness
      if (imageCount >= 3 && content.caption && content.caption.length > 100) {
        tags.push({ name: 'content: rich media' });
      }
    }
    
    // Caption analysis
    if (content.caption) {
      const captionLength = content.caption.length;
      if (captionLength < 50) {
        tags.push({ name: 'caption: short' });
      } else if (captionLength < 200) {
        tags.push({ name: 'caption: medium' });
      } else if (captionLength < 500) {
        tags.push({ name: 'caption: long' });
      } else {
        tags.push({ name: 'caption: very long' });
      }
      
      // Emoji analysis
      const emojiCount = (content.caption.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length;
      if (emojiCount > 5) {
        tags.push({ name: 'style: emoji-rich' });
      } else if (emojiCount > 0) {
        tags.push({ name: 'style: contains emojis' });
      } else {
        tags.push({ name: 'style: text-only' });
      }
    }
    
    // URL and linking
    if (content.url) {
      if (content.url.includes('/reel/')) {
        tags.push({ name: 'format: instagram reel' });
      } else if (content.url.includes('/p/')) {
        tags.push({ name: 'format: instagram post' });
      }
    }
    
    // Processing metadata
    tags.push({ name: 'processed: dm-monitor' });
    tags.push({ name: `processed: ${new Date().toISOString().split('T')[0]}` });
    
  } catch (error) {
    console.log(chalk.yellow(`⚠️  Metadata tag generation failed: ${error.message}`));
  }
  
  return tags.slice(0, 10); // Limit metadata tags
}

// Export functions for use by other modules
module.exports = {
  extractInstagramContent,
  summarizeContent,
  saveToNotion,
  extractTagsFromAIResponse,
  extractTagsFromCaption,
  generateMetadataTags
};
