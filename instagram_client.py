#!/usr/bin/env python3
"""
Instagram Client using instagrapi
Handles Instagram operations including DM monitoring and content extraction
"""

import os
import json
import sys
import time
import logging
from datetime import datetime
from instagrapi import Client
from instagrapi.exceptions import LoginRequired, ChallengeRequired, PleaseWaitFewMinutes
from instagrapi.extractors import extract_media_v1
import argparse

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Patch for instagrapi validation error with clips_metadata.original_sound_info
def patched_extract_media_v1(media):
    """Patched version of extract_media_v1 that handles validation issues"""
    try:
        # Fix clips_metadata.original_sound_info being None or missing fields
        if "clips_metadata" in media and media["clips_metadata"]:
            clips_meta = media["clips_metadata"]
            if "original_sound_info" in clips_meta:
                sound_info = clips_meta["original_sound_info"]
                
                if sound_info is None:
                    # Remove the field entirely if it's None
                    del clips_meta["original_sound_info"]
                elif isinstance(sound_info, dict):
                    # Handle malformed sound info objects
                    if '_proxy____args' in sound_info or not sound_info:
                        # Remove problematic sound info
                        del clips_meta["original_sound_info"]
                    else:
                        # Try to fix missing required fields
                        required_fields = [
                            'audio_asset_id', 'dash_manifest', 'duration_in_ms', 
                            'original_media_id', 'progressive_download_url', 'time_created',
                            'ig_artist', 'consumption_info', 'fb_downstream_use_xpost_metadata'
                        ]
                        for field in required_fields:
                            if field not in sound_info:
                                sound_info[field] = {} if field in ['ig_artist', 'consumption_info', 'fb_downstream_use_xpost_metadata'] else ""
                        
                        # Handle ig_artist specifically
                        if 'ig_artist' in sound_info and isinstance(sound_info['ig_artist'], dict):
                            ig_artist = sound_info['ig_artist']
                            if 'profile_pic_id' not in ig_artist:
                                ig_artist['profile_pic_id'] = ""
                        
                        # Handle problematic title field
                        if 'original_audio_title' in sound_info and isinstance(sound_info['original_audio_title'], dict):
                            if '_proxy____args' in sound_info['original_audio_title']:
                                sound_info['original_audio_title'] = "Unknown"
        
        # Call the original extractor
        return extract_media_v1(media)
    except Exception as e:
        logger.debug(f"Failed to extract media, skipping: {e}")
        return None

# Monkey patch the extractor
import instagrapi.extractors
instagrapi.extractors.extract_media_v1 = patched_extract_media_v1

class InstagramClient:
    def __init__(self, username, password):
        self.client = Client()
        self.username = username
        self.password = password
        self.logged_in = False
        self.processed_messages = set()
        self.load_processed_messages()
        self._login_time = None
        
    def is_login_valid(self):
        """Check if current session is still valid"""
        if not self.logged_in:
            return False
            
        try:
            # Simple API call to test if session is valid
            user_info = self.client.user_info_by_username(self.username)
            return user_info is not None
        except Exception:
            return False
    
    def load_processed_messages(self):
        """Load previously processed message IDs from file"""
        try:
            with open('processed_messages.json', 'r') as f:
                self.processed_messages = set(json.load(f))
        except FileNotFoundError:
            self.processed_messages = set()
    
    def save_processed_messages(self):
        """Save processed message IDs to file"""
        with open('processed_messages.json', 'w') as f:
            json.dump(list(self.processed_messages), f)
    
    def login(self):
        """Login to Instagram with improved session management"""
        try:
            session_file = f"{self.username}_session.json"
            
            # Try to load existing session first
            if os.path.exists(session_file):
                try:
                    logger.info("Loading existing session...")
                    self.client.load_settings(session_file)
                    self.client.login(self.username, self.password)
                    self.logged_in = True
                    logger.info(f"Successfully logged in using existing session for {self.username}")
                    return True
                except Exception as session_error:
                    logger.warning(f"Existing session failed: {session_error}")
                    logger.info("Creating new session...")
                    # Remove corrupted session file
                    os.remove(session_file)
            else:
                logger.info("No existing session found, creating new session...")
            
            # Create new session if no existing session or it failed
            self.client.login(self.username, self.password)
            self.client.dump_settings(session_file)
            
            self.logged_in = True
            logger.info(f"Successfully logged in with new session for {self.username}")
            return True
            
        except LoginRequired:
            logger.error("Login required - please check credentials")
            return False
        except ChallengeRequired as e:
            logger.error(f"Challenge required: {e}")
            return False
        except PleaseWaitFewMinutes:
            logger.error("Instagram asked to wait - trying again later")
            return False
        except Exception as e:
            logger.error(f"Login failed: {e}")
            return False
    
    def clean_instagram_url(self, raw_url):
        """Clean and validate Instagram URL from various formats"""
        try:
            # Handle string representation of complex objects
            if isinstance(raw_url, str):
                # Extract URL from metadata string if present
                if 'text=' in raw_url:
                    import re
                    url_match = re.search(r"text='([^']+)'", raw_url)
                    if url_match:
                        raw_url = url_match.group(1)
                
                # Remove URL parameters that might cause issues
                if '?' in raw_url:
                    clean_url = raw_url.split('?')[0]
                else:
                    clean_url = raw_url
                
                # Validate it's an Instagram URL
                if 'instagram.com' in clean_url and ('/p/' in clean_url or '/reel/' in clean_url):
                    # Ensure it ends with /
                    if not clean_url.endswith('/'):
                        clean_url += '/'
                    return clean_url
            
            logger.warning(f"Could not clean URL: {raw_url}")
            return str(raw_url)
            
        except Exception as e:
            logger.error(f"Error cleaning URL: {e}")
            return str(raw_url)
    
    def extract_post_content(self, url):
        """Extract content from Instagram post/reel URL"""
        try:
            # Clean URL if it contains metadata
            url = self.clean_instagram_url(url)
            
            logger.info(f"Extracting content from: {url}")
            
            # Check if we need to login
            if not self.is_login_valid():
                logger.info("Session invalid or expired, logging in...")
                if not self.login():
                    logger.error("Login failed, cannot extract content")
                    return None
            else:
                logger.info("Using existing valid session")
            
            # Extract media ID from URL
            
            # Extract media ID from URL
            if '/p/' in url:
                shortcode = url.split('/p/')[1].split('/')[0]
            elif '/reel/' in url:
                shortcode = url.split('/reel/')[1].split('/')[0]
            else:
                raise ValueError("Invalid Instagram URL format")
            
            # Get media info with multiple fallback approaches
            media_info = None
            try:
                # Primary method: Get media by shortcode
                media_pk = self.client.media_pk_from_code(shortcode)
                media_info = self.client.media_info(media_pk)
                logger.info("Used primary media_info method")
            except Exception as media_error:
                logger.warning(f"Primary method failed: {media_error}")
                
                # Fallback 1: Try with media_pk_from_url
                try:
                    logger.info("Trying media_pk_from_url...")
                    media_pk = self.client.media_pk_from_url(url)
                    media_info = self.client.media_info(media_pk)
                    logger.info("Used media_pk_from_url method")
                except Exception as url_error:
                    logger.warning(f"URL method failed: {url_error}")
                    
                    # Fallback 2: Try with media_info_v1
                    try:
                        logger.info("Trying media_info_v1...")
                        media_pk = self.client.media_pk_from_code(shortcode)
                        media_info = self.client.media_info_v1(media_pk)
                        logger.info("Used media_info_v1 method")
                    except Exception as v1_error:
                        logger.warning(f"V1 method failed: {v1_error}")
                        
                        # Final fallback: Return basic info
                        logger.info("Using basic fallback method...")
                        try:
                            # Create basic content structure for testing
                            content = {
                                "username": "unknown",
                                "caption": f"Content from {url} (extracted using shortcode: {shortcode})",
                                "media_type": "UNKNOWN",
                                "media_url": "",
                                "image_urls": [],
                                "timestamp": datetime.now().isoformat(),
                                "url": url,
                                "pk": shortcode
                            }
                            logger.info("Created basic content info as fallback")
                            return content
                        except Exception as basic_error:
                            logger.error(f"All extraction methods failed: {basic_error}")
                            return None
            
            if not media_info:
                logger.error("No media info available")
                return None
            
            # Safely extract information with fallbacks
            try:
                username = media_info.user.username if hasattr(media_info, 'user') and media_info.user else "unknown"
                caption = media_info.caption_text if hasattr(media_info, 'caption_text') else ""
                
                # Handle media type extraction safely
                media_type = "UNKNOWN"
                if hasattr(media_info, 'media_type'):
                    if hasattr(media_info.media_type, 'name'):
                        media_type = media_info.media_type.name
                    elif isinstance(media_info.media_type, str):
                        media_type = media_info.media_type
                    elif isinstance(media_info.media_type, int):
                        # Map integer types to names
                        type_mapping = {1: "PHOTO", 2: "VIDEO", 8: "CAROUSEL"}
                        media_type = type_mapping.get(media_info.media_type, "UNKNOWN")
                
                # Handle media URL and image extraction safely
                media_url = ""
                image_urls = []
                
                # Extract video URL if available
                if hasattr(media_info, 'video_url') and media_info.video_url:
                    media_url = str(media_info.video_url)
                
                # Handle carousel posts (multiple images) - CHECK THIS FIRST
                if hasattr(media_info, 'resources') and media_info.resources:
                    logger.info(f"Found carousel with {len(media_info.resources)} resources")
                    carousel_images = []
                    for i, resource in enumerate(media_info.resources):
                        try:
                            # Method 1: image_versions2 (standard)
                            if hasattr(resource, 'image_versions2') and resource.image_versions2:
                                if hasattr(resource.image_versions2, 'candidates') and resource.image_versions2.candidates:
                                    best_candidate = resource.image_versions2.candidates[0]
                                    if hasattr(best_candidate, 'url'):
                                        resource_url = str(best_candidate.url)
                                        carousel_images.append(resource_url)
                                        continue
                            
                            # Method 2: thumbnail_url (works for most carousels)
                            if hasattr(resource, 'thumbnail_url') and resource.thumbnail_url:
                                resource_url = str(resource.thumbnail_url)
                                carousel_images.append(resource_url)
                                continue
                            
                            # Method 3: display_url
                            if hasattr(resource, 'display_url') and resource.display_url:
                                resource_url = str(resource.display_url)
                                carousel_images.append(resource_url)
                                continue
                                
                        except Exception as resource_error:
                            logger.error(f"Error processing carousel resource {i+1}: {resource_error}")
                    
                    if carousel_images:
                        image_urls = carousel_images  # Use carousel images as primary image URLs
                        logger.info(f"Successfully extracted {len(carousel_images)} carousel images")
                    else:
                        logger.warning("No carousel images extracted despite finding resources")
                    
                # If not a carousel, extract single post images
                elif hasattr(media_info, 'image_versions2') and media_info.image_versions2:
                    if hasattr(media_info.image_versions2, 'candidates'):
                        for candidate in media_info.image_versions2.candidates:
                            if hasattr(candidate, 'url'):
                                image_urls.append(str(candidate.url))
                        logger.info(f"Extracted {len(image_urls)} images from single post")
                
                # If no specific media URL and we have images, use first image
                if not media_url and image_urls:
                    media_url = image_urls[0]
                
                # Fallback image URL extraction
                if not image_urls:
                    if hasattr(media_info, 'thumbnail_url') and media_info.thumbnail_url:
                        image_urls.append(str(media_info.thumbnail_url))
                    elif hasattr(media_info, 'display_url') and media_info.display_url:
                        image_urls.append(str(media_info.display_url))
                
                # Remove duplicates while preserving order
                image_urls = list(dict.fromkeys(image_urls))
                
                timestamp = media_info.taken_at.isoformat() if hasattr(media_info, 'taken_at') and media_info.taken_at else datetime.now().isoformat()
                pk = str(media_info.pk) if hasattr(media_info, 'pk') else shortcode
                
            except Exception as extract_error:
                logger.error(f"Error extracting media fields: {extract_error}")
                # Return basic structure even if extraction fails
                username = "unknown"
                caption = f"Content from {url}"
                media_type = "UNKNOWN"
                media_url = ""
                image_urls = []
                timestamp = datetime.now().isoformat()
                pk = shortcode
            
            # Extract relevant information
            content = {
                "username": username,
                "caption": caption or "",
                "media_type": media_type,
                "media_url": media_url,
                "image_urls": image_urls,  # New field for image URLs
                "timestamp": timestamp,
                "url": url,  # Use the original clean URL
                "pk": pk
            }
            
            logger.info(f"Successfully extracted content from @{content['username']}")
            return content
            
        except Exception as e:
            logger.error(f"Failed to extract content: {e}")
            return None
    
    def monitor_dms(self, callback=None):
        """Monitor direct messages for shared Instagram content"""
        logger.info("Starting DM monitoring...")
        
        # Get user ID for more targeted monitoring
        user_id = self.client.user_id
        logger.info(f"Monitoring DMs for user ID: {user_id}")
        
        consecutive_errors = 0
        max_consecutive_errors = 3
        
        while True:
            try:
                # Use a different approach to avoid the validation error
                try:
                    logger.info("Fetching recent DMs...")
                    # Try to get threads using a more basic approach
                    
                    # Use the direct_pending_inbox method which might be more stable
                    threads = []
                    try:
                        # Try different approaches to get DM threads
                        logger.info("Attempting to get DM threads...")
                        threads = self.client.direct_threads(amount=5)
                        logger.info(f"Successfully fetched {len(threads)} threads")
                        consecutive_errors = 0  # Reset error counter on success
                        
                    except Exception as thread_fetch_error:
                        logger.error(f"Failed to fetch threads: {thread_fetch_error}")
                        
                        # Skip validation errors and continue
                        if "validation error" in str(thread_fetch_error).lower() or "clips_metadata" in str(thread_fetch_error).lower():
                            consecutive_errors += 1
                            logger.warning(f"Validation error #{consecutive_errors}, continuing without processing threads...")
                            
                            if consecutive_errors >= max_consecutive_errors:
                                logger.error("Too many consecutive validation errors, waiting longer...")
                                time.sleep(300)  # Wait 5 minutes
                                consecutive_errors = 0
                                continue
                            else:
                                # Wait shorter time and continue
                                time.sleep(60)
                                continue
                        else:
                            # For other errors, try re-login
                            if not self.login():
                                logger.error("Re-login failed, waiting longer...")
                                time.sleep(300)
                                continue
                    
                    # Process available threads if we got any
                    if threads:
                        for thread in threads[:2]:  # Only process first 2 threads
                            try:
                                thread_id = thread.id
                                logger.info(f"Checking thread: {thread_id}")
                                
                                # Get recent messages with minimal amount
                                messages = self.client.direct_messages(thread_id, amount=3)
                                
                                for message in messages:
                                    try:
                                        message_id = str(message.id)
                                        
                                        # Skip if already processed
                                        if message_id in self.processed_messages:
                                            continue
                                        
                                        logger.info(f"Processing new message: {message_id}")
                                        logger.info(f"Message type: {type(message)}")
                                        logger.info(f"Message text: {getattr(message, 'text', 'No text')}")
                                        logger.info(f"Message timestamp: {getattr(message, 'timestamp', 'No timestamp')}")
                                        logger.info(f"Message has media_share: {hasattr(message, 'media_share')}")
                                        
                                        # Log all message attributes for debugging
                                        message_attrs = [attr for attr in dir(message) if not attr.startswith('_')]
                                        logger.info(f"Message attributes: {message_attrs}")
                                        
                                        # Check for media_share with detailed logging
                                        if hasattr(message, 'media_share'):
                                            media_share = getattr(message, 'media_share')
                                            logger.info(f"Media share value: {media_share}, type: {type(media_share)}")
                                            
                                            if media_share is not None:
                                                logger.info(f"Media share attributes: {[attr for attr in dir(media_share) if not attr.startswith('_')]}")
                                                if hasattr(media_share, '__dict__'):
                                                    logger.info(f"Media share dict keys: {list(media_share.__dict__.keys())}")
                                        
                                        # Check if message contains Instagram link
                                        instagram_urls = self.extract_instagram_urls(message)
                                        logger.info(f"Extracted URLs: {instagram_urls}")
                                        
                                        if instagram_urls:
                                            logger.info(f"Found Instagram URL(s) in DM: {instagram_urls}")
                                            
                                            for url in instagram_urls:
                                                try:
                                                    logger.info(f"Extracting content from: {url}")
                                                    # Extract content
                                                    content = self.extract_post_content(url)
                                                    
                                                    if content:
                                                        logger.info(f"Successfully extracted content from @{content.get('username', 'unknown')}")
                                                        logger.info(f"Content keys: {list(content.keys())}")
                                                        logger.info(f"Media type: {content.get('media_type', 'unknown')}")
                                                        logger.info(f"Image count: {len(content.get('image_urls', []))}")
                                                        
                                                        # Output for Node.js processing with sanitization
                                                        try:
                                                            # Sanitize content before JSON output to prevent parsing issues
                                                            sanitized_content = {
                                                                **content,
                                                                # Ensure URL is clean string
                                                                'url': content['url'] if isinstance(content['url'], str) else str(content['url']),
                                                                # Truncate very long image URLs for JSON output (Instagram URLs can be extremely long)
                                                                'image_urls': [
                                                                    img_url[:400] + '...' if len(img_url) > 400 else img_url 
                                                                    for img_url in content.get('image_urls', [])
                                                                ],
                                                                # Truncate caption if extremely long
                                                                'caption': content.get('caption', '')[:1000] + ('...' if len(content.get('caption', '')) > 1000 else '')
                                                            }
                                                            
                                                            # Use ensure_ascii=True to avoid Unicode issues in JSON
                                                            content_json = json.dumps(sanitized_content, ensure_ascii=True, separators=(',', ':'))
                                                            
                                                            # Log size for debugging
                                                            logger.info(f"JSON output size: {len(content_json)} characters")
                                                            
                                                            print("CONTENT_EXTRACTED:", content_json)
                                                            sys.stdout.flush()
                                                        except Exception as json_error:
                                                            logger.error(f"Failed to serialize content to JSON: {json_error}")
                                                            # Fallback with minimal content
                                                            basic_content = {
                                                                'username': content.get('username', 'unknown'),
                                                                'caption': content.get('caption', '')[:200],  # Very short caption
                                                                'media_type': content.get('media_type', 'UNKNOWN'),
                                                                'url': str(content.get('url', ''))[:200],  # Very short URL
                                                                'pk': str(content.get('pk', '')),
                                                                'image_urls': [f"Image {i+1}" for i in range(min(len(content.get('image_urls', [])), 3))]  # Placeholder names
                                                            }
                                                            print("CONTENT_EXTRACTED:", json.dumps(basic_content, ensure_ascii=True))
                                                            sys.stdout.flush()
                                                        
                                                        if callback:
                                                            # Process the content using callback
                                                            callback(content)
                                                    else:
                                                        logger.error(f"Failed to extract content from: {url}")
                                                    
                                                    # Mark as processed
                                                    self.processed_messages.add(message_id)
                                                except Exception as extraction_error:
                                                    logger.error(f"Error extracting content from {url}: {extraction_error}")
                                                    # Still mark as processed to avoid infinite retries
                                                    self.processed_messages.add(message_id)
                                        else:
                                            logger.info("No Instagram URLs found in message")
                                            # Mark message as processed even if no URLs found
                                            self.processed_messages.add(message_id)
                                            
                                    except Exception as message_error:
                                        logger.error(f"Error processing message: {message_error}")
                                        # Mark as processed to avoid reprocessing
                                        if hasattr(message, 'id'):
                                            self.processed_messages.add(str(message.id))
                                        continue
                                        
                            except Exception as thread_error:
                                logger.error(f"Error processing thread: {thread_error}")
                                continue
                    else:
                        logger.info("No threads available for processing")
                    
                except Exception as fetch_error:
                    logger.error(f"Critical error in DM fetching: {fetch_error}")
                    time.sleep(120)
                    continue
                
                # Save processed messages
                self.save_processed_messages()
                
                # Wait before next check
                logger.info("Waiting 60 seconds before next check...")
                time.sleep(60)
                
            except Exception as e:
                logger.error(f"Critical error in DM monitoring: {e}")
                consecutive_errors += 1
                
                if consecutive_errors >= max_consecutive_errors:
                    logger.error("Too many consecutive critical errors, waiting longer...")
                    time.sleep(300)  # Wait 5 minutes
                    consecutive_errors = 0
                else:
                    logger.info("Waiting 120 seconds before retrying...")
                    time.sleep(120)
    
    def extract_instagram_urls(self, message):
        """Extract Instagram URLs from message text and media shares"""
        urls = []
        
        # Check message text first
        if hasattr(message, 'text') and message.text and 'instagram.com' in message.text:
            # Simple URL extraction (could be improved with regex)
            words = message.text.split()
            for word in words:
                if 'instagram.com' in word and ('/p/' in word or '/reel/' in word):
                    urls.append(word)
                    logger.info(f"Found URL in text: {word}")
        
        # Check for media shares (Instagram native sharing) - this is the main case for DMs
        logger.info(f"Checking for media_share: hasattr={hasattr(message, 'media_share')}")
        
        if hasattr(message, 'media_share'):
            media_share = getattr(message, 'media_share')
            logger.info(f"Media share value: {media_share}, type: {type(media_share)}")
            
            if media_share is not None:
                logger.info("Found media_share, attempting to extract URL...")
                try:
                    # This is a shared Instagram post
                    media = media_share
                    logger.info(f"Media share object type: {type(media)}")
                    
                    # Try different ways to get the shortcode/code
                    shortcode = None
                    
                    # Method 1: Direct code attribute
                    if hasattr(media, 'code') and media.code:
                        shortcode = media.code
                        logger.info(f"Found shortcode via 'code': {shortcode}")
                    
                    # Method 2: Try pk attribute
                    elif hasattr(media, 'pk') and media.pk:
                        shortcode = str(media.pk)
                        logger.info(f"Found shortcode via 'pk': {shortcode}")
                    
                    # Method 3: Try id attribute
                    elif hasattr(media, 'id') and media.id:
                        shortcode = str(media.id)
                        logger.info(f"Found shortcode via 'id': {shortcode}")
                    
                    # Method 4: Try direct attribute access without hasattr check
                    if not shortcode:
                        try:
                            if media.code:
                                shortcode = media.code
                                logger.info(f"Found shortcode via direct 'code' access: {shortcode}")
                        except:
                            pass
                    
                    # Method 5: Try to extract from media info directly
                    if not shortcode:
                        try:
                            # Sometimes the media object has the info we need
                            if hasattr(media, 'taken_at') and hasattr(media, 'user'):
                                # This looks like a valid media object, try to get media info
                                media_pk = getattr(media, 'pk', None)
                                if media_pk:
                                    logger.info(f"Attempting to fetch media info for pk: {media_pk}")
                                    try:
                                        media_info = self.client.media_info(media_pk)
                                        if hasattr(media_info, 'code') and media_info.code:
                                            shortcode = media_info.code
                                            logger.info(f"Found shortcode via media_info: {shortcode}")
                                    except Exception as media_info_error:
                                        logger.warning(f"Failed to get media_info: {media_info_error}")
                        except Exception as extract_error:
                            logger.warning(f"Failed to extract from media object: {extract_error}")
                    
                    # Method 6: Last resort - use pk directly as shortcode if it looks valid
                    if not shortcode:
                        media_pk = getattr(media, 'pk', None)
                        if media_pk and len(str(media_pk)) > 10:  # Instagram pks are long numbers
                            # Convert pk to shortcode format
                            try:
                                # Instagram media ID to shortcode conversion
                                import base64
                                
                                def media_id_to_shortcode(media_id):
                                    """Convert Instagram media ID to shortcode"""
                                    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
                                    shortcode = ""
                                    while media_id > 0:
                                        shortcode = alphabet[media_id % 64] + shortcode
                                        media_id //= 64
                                    return shortcode
                                
                                shortcode = media_id_to_shortcode(int(media_pk))
                                logger.info(f"Converted pk {media_pk} to shortcode: {shortcode}")
                            except Exception as conversion_error:
                                logger.warning(f"Failed to convert pk to shortcode: {conversion_error}")
                    
                    # Log all available attributes for debugging
                    logger.info(f"Media attributes: {[attr for attr in dir(media) if not attr.startswith('_')]}")
                    logger.info(f"Media code value: {getattr(media, 'code', 'NOT_FOUND')}")
                    logger.info(f"Media pk value: {getattr(media, 'pk', 'NOT_FOUND')}")
                    logger.info(f"Media id value: {getattr(media, 'id', 'NOT_FOUND')}")
                    
                    if shortcode:
                        url = f"https://www.instagram.com/p/{shortcode}/"
                        urls.append(url)
                        logger.info(f"Successfully extracted URL from media_share: {url}")
                    else:
                        logger.warning(f"Could not extract shortcode from media_share despite multiple attempts")
                        # Try to use the media object itself to construct URL
                        if hasattr(media, '__dict__'):
                            logger.info(f"Media object dict keys: {list(media.__dict__.keys()) if hasattr(media, '__dict__') else 'No __dict__'}")
                            
                except Exception as e:
                    logger.error(f"Error processing media_share: {e}")
                    import traceback
                    logger.error(f"Full traceback: {traceback.format_exc()}")
            else:
                logger.info("media_share attribute exists but is None - checking other message attributes")
                
                # Sometimes the shared content might be in other attributes
                logger.info(f"Message attributes: {[attr for attr in dir(message) if not attr.startswith('_')]}")
                
                # Check for other potential sharing mechanisms
                if hasattr(message, 'visual_media') and message.visual_media:
                    logger.info("Found visual_media, checking for Instagram content...")
                elif hasattr(message, 'media') and message.media:
                    logger.info("Found media attribute, checking for Instagram content...")
                elif hasattr(message, 'link') and message.link:
                    logger.info(f"Found link attribute: {message.link}")
                    if 'instagram.com' in str(message.link):
                        urls.append(str(message.link))
        else:
            logger.info("No media_share attribute found on message")
        
        # If no URLs found, log the message structure for debugging
        if not urls:
            logger.info("No Instagram URLs found in message")
            logger.info(f"Message type: {type(message)}")
            logger.info(f"Message attributes: {[attr for attr in dir(message) if not attr.startswith('_')]}")
            if hasattr(message, '__dict__'):
                logger.info(f"Message dict keys: {list(message.__dict__.keys())}")
        
        return urls

def main():
    parser = argparse.ArgumentParser(description='Instagram Client Operations')
    parser.add_argument('action', choices=['extract', 'monitor'], help='Action to perform')
    parser.add_argument('--url', help='Instagram URL (for extract action)')
    parser.add_argument('--username', help='Instagram username')
    parser.add_argument('--password', help='Instagram password')
    
    args = parser.parse_args()
    
    # Get credentials from environment or arguments
    username = args.username or os.getenv('INSTAGRAM_USERNAME')
    password = args.password or os.getenv('INSTAGRAM_PASSWORD')
    
    if not username or not password:
        logger.error("Instagram credentials not provided")
        sys.exit(1)
    
    # Create client
    client = InstagramClient(username, password)
    
    # Only login if needed (session validation will happen in methods)
    logger.info("Initializing Instagram client...")
    
    if args.action == 'extract':
        if not args.url:
            logger.error("URL required for extract action")
            sys.exit(1)
        
        content = client.extract_post_content(args.url)
        if content:
            print(json.dumps(content, indent=2))
        else:
            sys.exit(1)
    
    elif args.action == 'monitor':
        # For monitoring, we do need to ensure login
        if not client.is_login_valid():
            if not client.login():
                logger.error("Failed to login")
                sys.exit(1)
        def process_content(content):
            # Output the content as JSON for Node.js to process
            print("CONTENT_EXTRACTED:", json.dumps(content))
            sys.stdout.flush()
        
        client.monitor_dms(callback=process_content)

if __name__ == "__main__":
    main()
