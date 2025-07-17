require('dotenv').config();
const fs = require('fs');
const { IgApiClient, IgCheckpointError } = require('instagram-private-api');
const { processInstagramUrl } = require('./index');

const ig = new IgApiClient();
let processedItems = new Set();

async function loadProcessed() {
  try {
    const data = fs.readFileSync('processed.json', 'utf8');
    processedItems = new Set(JSON.parse(data));
  } catch (error) {
    // File doesn't exist or invalid, start fresh
  }
}

function saveProcessed() {
  fs.writeFileSync('processed.json', JSON.stringify(Array.from(processedItems)));
}

async function main() {
  loadProcessed();

  ig.state.generateDevice(process.env.IG_BOT_USERNAME);
  // Set device to iPhone 15 Pro
  ig.state.deviceString = 'iPhone15,2/17.0.0';

  const loggedInUser = await ig.account.login(process.env.IG_BOT_USERNAME, process.env.IG_BOT_PASSWORD).catch(async err => {
    if (err instanceof IgCheckpointError) {
      console.log('Checkpoint challenge required');
      console.log(ig.state.checkpoint); // Log checkpoint state for debugging

      const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const choiceStr = await new Promise(resolve => {
        rl.question('Enter verification method (1 for email, 0 for phone): ', resolve);
      });

      const choice = parseInt(choiceStr);

      console.log('Selected method:', choice);
      await ig.challenge.selectVerifyMethod(choice);

      console.log('After select:', ig.state.checkpoint);

      const code = await new Promise(resolve => {
        rl.question('Enter the verification code: ', resolve);
      });

      rl.close();

      return await ig.challenge.sendSecurityCode(code);
    } else if (err.name === 'IgLoginRequiredError') {
      console.log('Login approval required. Please check your phone and approve the login attempt.');
      const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
      await new Promise(resolve => { rl.question('Press enter after approving: ', () => { rl.close(); resolve(); }); });
      // Retry login
      return ig.account.login(process.env.IG_BOT_USERNAME, process.env.IG_BOT_PASSWORD);
    } else {
      throw err;
    }
  });

  if (!loggedInUser || !loggedInUser.pk) {
    throw new Error('Login failed');
  }

  console.log(`Logged in as: ${loggedInUser.username}`);

  // Poll every 30 seconds
  setInterval(async () => {
    try {
      const inboxFeed = ig.feed.directInbox();
      const threads = await inboxFeed.items();

      for (const thread of threads) {
        if (thread.unseen_count > 0) {
          let latestItemId = null;
          let hasNew = false;

          for (const item of thread.items) {
            if (processedItems.has(item.item_id)) continue;

            processedItems.add(item.item_id);
            hasNew = true;

            // Process based on item type
            if (item.item_type === 'media_share' && item.media_share && item.media_share.code) {
              const postUrl = `https://www.instagram.com/p/${item.media_share.code}/`;
              console.log(`Processing shared media: ${postUrl}`);
              await processInstagramUrl(postUrl);
            } else if (item.item_type === 'link' && item.link && item.link.link_context && item.link.link_context.link_url) {
              const linkUrl = item.link.link_context.link_url;
              if (linkUrl.includes('instagram.com/p/') || linkUrl.includes('instagram.com/reel/')) {
                console.log(`Processing shared link: ${linkUrl}`);
                await processInstagramUrl(linkUrl);
              }
            } else if (item.item_type === 'text') {
              const urlMatch = item.text.match(/https:\/\/www\.instagram\.com\/(?:p|reel)\/[^\/]+/);
              if (urlMatch) {
                const postUrl = urlMatch[0];
                console.log(`Processing URL from text: ${postUrl}`);
                await processInstagramUrl(postUrl);
              }
            }

            // Track the latest item for marking seen
            if (!latestItemId || parseInt(item.timestamp) > parseInt(latestItemId.timestamp)) {
              latestItemId = item;
            }
          }

          // Mark the latest item as seen if we processed new items
          if (hasNew && latestItemId) {
            const threadEntity = ig.directThread.entity(thread.thread_id);
            await threadEntity.markItemSeen(latestItemId.item_id);
            console.log(`Marked thread ${thread.thread_id} as seen up to item ${latestItemId.item_id}`);
          }
        }
      }

      saveProcessed();
    } catch (error) {
      console.error('Error processing inbox:', error);
    }
  }, 30000); // Poll every 30 seconds
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 