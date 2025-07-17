// moved to tests/test_tagging.js
// (File is now in tests/test_tagging.js. This file is a stub for git history.)
/**
 * Test script for the new tagging system
 */

// Mock the chalk module for testing
const chalk = {
  yellow: (msg) => `YELLOW: ${msg}`,
  green: (msg) => `GREEN: ${msg}`,
  blue: (msg) => `BLUE: ${msg}`,
  red: (msg) => `RED: ${msg}`,
  gray: (msg) => `GRAY: ${msg}`
};

/**
 * Extract structured tags from AI response
 */
function extractTagsFromAIResponse(aiResponse) {
  const tags = [];
  
  try {
    console.log('AI Response:', aiResponse);
    
    // Look for the TAGS section in the response
    const tagsMatch = aiResponse.match(/\*\*TAGS:\*\*([\s\S]*?)(?=\n\nThe end|\n[A-Z][^:]*:|$)/i);
    console.log('Tags match:', tagsMatch);
    
    if (tagsMatch) {
      const tagsSection = tagsMatch[1];
      console.log('Tags section:', tagsSection);
      
      // Extract different categories
      const categories = {
        'Content Type': /Content Type:\s*\[(.*?)\]/i,
        'Industry': /Industry:\s*\[(.*?)\]/i,
        'Audience': /Audience:\s*\[(.*?)\]/i,
        'Mood': /Mood:\s*\[(.*?)\]/i,
        'Format': /Format:\s*\[(.*?)\]/i,
        'Topics': /Topics:\s*\[(.*?)\]/i
      };
      
      for (const [category, regex] of Object.entries(categories)) {
        const match = tagsSection.match(regex);
        console.log(`${category} match:`, match);
        if (match && match[1]) {
          const categoryTags = match[1]
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0 && tag.length < 50);
          
          console.log(`${category} tags:`, categoryTags);
          
          // Add category prefix for organization
          if (category === 'Topics') {
            categoryTags.forEach(tag => {
              if (tag !== 'general' && tag !== 'misc') {
                tags.push({ name: tag });
              }
            });
          } else {
            categoryTags.forEach(tag => {
              if (tag !== 'general' && tag !== 'other') {
                tags.push({ name: `${category.toLowerCase()}: ${tag}` });
              }
            });
          }
        }
      }
    }
    
    // Fallback: look for any tags in other formats
    if (tags.length === 0) {
      const fallbackTagsMatch = aiResponse.match(/(?:tags|keywords|topics):\s*([^\n]+)/i);
      if (fallbackTagsMatch) {
        const fallbackTags = fallbackTagsMatch[1]
          .split(/[,;]/)
          .map(tag => tag.trim().replace(/^[#-]\s*/, ''))
          .filter(tag => tag.length > 2 && tag.length < 30);
        
        fallbackTags.forEach(tag => {
          tags.push({ name: tag });
        });
      }
    }
    
  } catch (error) {
    console.log(chalk.yellow(`⚠️  Tag extraction failed: ${error.message}`));
  }
  
  return tags.slice(0, 15);
}

/**
 * Extract tags from Instagram caption
 */
function extractTagsFromCaption(caption) {
  const tags = [];
  
  if (!caption || caption.length < 10) return tags;
  
  const lowerCaption = caption.toLowerCase();
  
  // Common Instagram patterns and keywords
  const keywordPatterns = {
    'business': ['entrepreneur', 'startup', 'business', 'company'],
    'fitness': ['workout', 'gym', 'fitness', 'training'],
    'food': ['food', 'recipe', 'cooking', 'delicious'],
    'tutorial': ['tutorial', 'how to', 'guide', 'tips']
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

// Test cases
console.log('Testing AI Tag Extraction:');
console.log('=========================');

const testAIResponse = `This is a great fitness tutorial for beginners.

**TAGS:**
Content Type: [tutorial, educational]
Industry: [fitness, health]
Audience: [beginners, fitness-enthusiasts]
Mood: [motivational, inspiring]
Format: [video, tutorial]
Topics: [workout, exercise, training, health]

The end of the response.`;

const aiTags = extractTagsFromAIResponse(testAIResponse);
console.log('AI Tags:', aiTags.map(t => t.name));

console.log('\nTesting Caption Tag Extraction:');
console.log('===============================');

const testCaption = "Check out this amazing workout tutorial! Perfect for beginners 💪 #fitness #workout #health #gym";
const captionTags = extractTagsFromCaption(testCaption);
console.log('Caption Tags:', captionTags.map(t => t.name));

console.log('\nTest completed successfully! ✅');
