// moved to tests/test_tags.js
// (File is now in tests/test_tags.js. This file is a stub for git history.)
/**
 * Test script for AI-generated tags system
 * This tests the entire tagging pipeline to ensure it works correctly
 */

require('dotenv').config();
const chalk = require('chalk');

// Import the functions we want to test
const { extractTagsFromAIResponse, extractTagsFromCaption, generateMetadataTags } = (() => {
  // Copy the functions from index_new.js for testing
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
      
      const finalTags = tags.slice(0, 15);
      console.log(chalk.green(`✅ Extracted ${finalTags.length} AI tags`));
      return finalTags;
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Tag extraction failed: ${error.message}`));
      return [];
    }
  }

  function extractTagsFromCaption(caption) {
    const tags = [];
    
    if (!caption || caption.length < 10) return tags;
    
    const lowerCaption = caption.toLowerCase();
    
    // Common Instagram patterns and keywords
    const keywordPatterns = {
      'business': ['entrepreneur', 'startup', 'business', 'company', 'corporate'],
      'fitness': ['workout', 'gym', 'fitness', 'training', 'exercise', 'health'],
      'food': ['food', 'recipe', 'cooking', 'delicious', 'tasty', 'restaurant'],
      'travel': ['travel', 'vacation', 'trip', 'explore', 'adventure'],
      'tutorial': ['tutorial', 'how to', 'guide', 'step by step', 'learn', 'tips'],
      'inspiration': ['inspire', 'motivation', 'motivational', 'inspiring'],
    };
    
    // Check for keyword patterns
    for (const [category, keywords] of Object.entries(keywordPatterns)) {
      const matchCount = keywords.filter(keyword => lowerCaption.includes(keyword)).length;
      if (matchCount >= 1) {
        tags.push({ name: category });
      }
    }
    
    // Extract hashtags
    const hashtags = caption.match(/#[\w]+/g);
    if (hashtags && hashtags.length > 0) {
      hashtags.slice(0, 3).forEach(hashtag => {
        const cleanTag = hashtag.substring(1).toLowerCase();
        if (cleanTag.length > 2 && cleanTag.length < 20) {
          tags.push({ name: `hashtag: ${cleanTag}` });
        }
      });
    }
    
    return tags.slice(0, 8);
  }

  function generateMetadataTags(content) {
    const tags = [];
    
    try {
      // Time-based tags
      if (content.timestamp) {
        const postDate = new Date(content.timestamp);
        tags.push({ name: 'timing: recent' });
        tags.push({ name: `posted: ${postDate.toLocaleDateString()}` });
      }
      
      // Media type specific tags
      if (content.media_type) {
        tags.push({ name: `media: ${content.media_type.toLowerCase()}` });
      }
      
      // Image analysis tags
      if (content.image_urls && content.image_urls.length > 0) {
        tags.push({ name: `images: ${content.image_urls.length} count` });
      }
      
      // Processing metadata
      tags.push({ name: 'processed: dm-monitor' });
      
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Metadata tag generation failed: ${error.message}`));
    }
    
    return tags.slice(0, 10);
  }

  return { extractTagsFromAIResponse, extractTagsFromCaption, generateMetadataTags };
})();

// Test data
const testAIResponse = `
This Instagram post showcases a beautiful morning workout routine. The user demonstrates excellent form and technique while providing motivational content for fitness enthusiasts.

**TAGS:**
Content Type: [fitness, motivational, tutorial]
Industry: [health, fitness, wellness]
Audience: [fitness enthusiasts, beginners, health-conscious]
Mood: [inspiring, energetic, positive]
Format: [video, demonstration]
Topics: [morning workout, fitness routine, exercise form, motivation, healthy lifestyle]

The post effectively combines visual demonstration with motivational messaging.
`;

const testContent = {
  username: 'fitnessguru',
  caption: 'Start your day right! 🌅 Here\'s my morning workout routine that will energize your body and mind. #morningworkout #fitness #motivation #healthy #lifestyle #exercise',
  media_type: 'VIDEO',
  image_urls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  timestamp: new Date().toISOString(),
  url: 'https://instagram.com/p/ABC123/'
};

console.log(chalk.cyan('🧪 Testing AI Tag Generation System\n'));

// Test 1: AI Response Tag Extraction
console.log(chalk.blue('Test 1: AI Response Tag Extraction'));
console.log(chalk.gray('Testing with sample AI response...'));
const aiTags = extractTagsFromAIResponse(testAIResponse);
console.log(chalk.green(`✅ AI Tags (${aiTags.length}):`), aiTags.map(t => t.name).join(', '));
console.log();

// Test 2: Caption Tag Extraction
console.log(chalk.blue('Test 2: Caption Tag Extraction'));
console.log(chalk.gray(`Testing with caption: "${testContent.caption.substring(0, 50)}..."`));
const captionTags = extractTagsFromCaption(testContent.caption);
console.log(chalk.green(`✅ Caption Tags (${captionTags.length}):`), captionTags.map(t => t.name).join(', '));
console.log();

// Test 3: Metadata Tag Generation
console.log(chalk.blue('Test 3: Metadata Tag Generation'));
console.log(chalk.gray('Testing with sample content metadata...'));
const metadataTags = generateMetadataTags(testContent);
console.log(chalk.green(`✅ Metadata Tags (${metadataTags.length}):`), metadataTags.map(t => t.name).join(', '));
console.log();

// Test 4: Combined Tags (simulate full pipeline)
console.log(chalk.blue('Test 4: Combined Tag System'));
const allTags = [
  { name: testContent.media_type },
  { name: `@${testContent.username}` },
  ...aiTags,
  ...captionTags,
  ...metadataTags
];

// Remove duplicates
const uniqueTags = [];
const seenTags = new Set();
allTags.forEach(tag => {
  if (!seenTags.has(tag.name.toLowerCase())) {
    seenTags.add(tag.name.toLowerCase());
    uniqueTags.push(tag);
  }
});

console.log(chalk.green(`✅ Total Unique Tags (${uniqueTags.length}):`));
uniqueTags.forEach((tag, index) => {
  console.log(chalk.gray(`  ${index + 1}. ${tag.name}`));
});

console.log(chalk.cyan('\n🎉 Tag generation test completed successfully!'));
console.log(chalk.yellow(`💡 This shows that the AI will generate ${uniqueTags.length} structured tags for Notion`));
