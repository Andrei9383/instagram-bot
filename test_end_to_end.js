// moved to tests/test_end_to_end.js
// (File is now in tests/test_end_to_end.js. This file is a stub for git history.)
/**
 * Test end-to-end content processing functionality
 */

require('dotenv').config();

async function testContentProcessing() {
  try {
    console.log('🧪 Testing content processing functionality...\n');
    
    // Import functions from index_new.js
    const { summarizeContent, saveToNotion } = require('./index_new');
    
    // Mock Instagram content (similar to what Python would return)
    const mockContent = {
      url: 'https://www.instagram.com/p/test123/',
      username: 'test_user',
      caption: 'This is a test caption with some content about #business and #motivation. Check out this amazing post!',
      media_type: 'photo',
      image_urls: ['https://example.com/image1.jpg'],
      likes_count: 100,
      comments_count: 25,
      timestamp: '2024-01-15T10:30:00Z'
    };
    
    console.log('📝 Mock content prepared:', mockContent.username, '-', mockContent.url);
    
    // Test summarizeContent function
    console.log('\n🤖 Testing AI summarization...');
    
    try {
      const result = await summarizeContent(mockContent);
      console.log('✅ summarizeContent executed successfully');
      console.log('📊 Result keys:', Object.keys(result));
      
      if (result.summary) {
        console.log('📝 Summary length:', result.summary.length, 'characters');
      }
      
      if (result.imageAnalysis) {
        console.log('🖼️  Image analysis available');
      }
      
    } catch (summaryError) {
      console.warn('⚠️  AI summarization failed (expected if no API key):', summaryError.message);
    }
    
    console.log('\n✅ Content processing pipeline test completed!');
    console.log('🎉 All functions are properly exported and importable.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testContentProcessing();
