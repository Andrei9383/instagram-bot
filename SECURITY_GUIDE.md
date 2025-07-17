# Instagram Bot - Security Best Practices

## Avoiding Login Security Notifications

### 1. Session Management
- ✅ Sessions are now reused (implemented)
- ✅ Only login when session expires
- ✅ Validate sessions before making API calls

### 2. Usage Patterns
- **Recommended:** Use bot 2-3 times per day maximum
- **Avoid:** Rapid-fire testing/multiple logins per hour
- **Best:** Let the DM monitoring run continuously instead of restarting

### 3. Account Safety
- Use the bot moderately (not 24/7 intensive usage)
- Take breaks between heavy usage periods
- Monitor Instagram notifications and pause if needed

### 4. Alternative Testing
Instead of testing with real Instagram posts frequently:
- Use the same URL multiple times for testing
- Test individual components (AI, Notion) separately
- Use mock data for development

### 5. If You Get Locked Out
1. Wait 2-4 hours before trying again
2. Clear all session files: `rm *_session.json`
3. Log in manually on your phone/browser first
4. Then try the bot again

### 6. Long-term Recommendations
- Consider using a dedicated automation account
- Keep your main account for personal use
- Use the bot during normal hours (not late night)

## Current Status
✅ Session management improved
✅ Reduced login frequency
✅ Better error handling
