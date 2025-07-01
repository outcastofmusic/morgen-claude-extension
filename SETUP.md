# Morgen Calendar Extension Setup Guide

This guide will walk you through setting up the Morgen Calendar Extension for Claude Desktop.

## Prerequisites

- Claude Desktop (latest version)
- A Morgen account
- At least one connected calendar provider in Morgen

## Step 1: Get Your Morgen Account Ready

### Create a Morgen Account

1. Visit [morgen.so](https://morgen.so)
2. Click "Get Started" or "Sign Up"
3. Create your account using email or OAuth providers
4. Download the Morgen desktop app (optional but recommended)

### Connect Your Calendar Providers

1. Log in to [platform.morgen.so](https://platform.morgen.so)
2. Navigate to "Integrations" or "Calendar Accounts"
3. Click "Add Calendar" and choose your provider:
   - **Google Calendar**: Click "Connect Google" and authorize access
   - **Microsoft/Outlook**: Click "Connect Microsoft" and sign in
   - **Apple Calendar**: Follow the iCloud calendar setup
   - **Exchange**: Enter your Exchange server details
   - **Other CalDAV**: Enter your CalDAV server URL and credentials

4. Repeat for all calendar providers you want to access through Claude

## Step 2: Get Your API Key

### Request API Access

1. Visit [platform.morgen.so/developers-api](https://platform.morgen.so/developers-api)
2. Click "Request Early Access" (Morgen API is currently in beta)
3. Fill out the access request form:
   - Describe your use case (e.g., "Claude Desktop calendar integration")
   - Provide your contact information
4. Wait for approval (usually within 1-2 business days)

### Generate Your API Key

Once approved:

1. Return to [platform.morgen.so/developers-api](https://platform.morgen.so/developers-api)
2. Click "Generate API Key"
3. **Important**: Copy your API key immediately and store it securely
4. The key will look something like: `mg_prod_abcdef123456789...`

## Step 3: Install the Extension

### Option A: From Claude Desktop Extension Directory

1. Open Claude Desktop
2. Click the menu (☰) → Settings → Extensions
3. Search for "Morgen Calendar"
4. Click "Install"
5. When prompted, paste your API key
6. Click "Save" or "Connect"

### Option B: Manual Installation

1. Download the `morgen-calendar.dxt` file
2. Open Claude Desktop
3. Click the menu (☰) → Settings → Extensions
4. Click "Install from file" or drag the .dxt file
5. When prompted, paste your API key
6. Click "Save" or "Connect"

## Step 4: Verify Installation

### Test Basic Functions

Try these commands in Claude to verify everything works:

1. **Check calendars**: "Show me my calendars"
   - You should see a list of your connected calendars

2. **View today's events**: "What's on my calendar today?"
   - You should see today's events (if any)

3. **List accounts**: "Show my calendar accounts"
   - You should see your connected providers (Google, Outlook, etc.)

### Troubleshooting Connection Issues

If you see "No calendars found" or similar errors:

1. **Verify API Key**:
   - Go to Claude Desktop Settings → Extensions
   - Find Morgen Calendar
   - Click "Configure" 
   - Re-enter your API key

2. **Check Calendar Connections**:
   - Visit [platform.morgen.so](https://platform.morgen.so)
   - Ensure calendars show as "Connected"
   - Try disconnecting and reconnecting problematic calendars

3. **Test API Access**:
   - Use a tool like curl or Postman
   - Send a GET request to `https://api.morgen.so/v3/calendars/list`
   - Include header: `Authorization: ApiKey YOUR_API_KEY`
   - You should get a JSON response with your calendars

## Step 5: Configure Permissions (Optional)

### Calendar-Specific Permissions

In Morgen, you can control which calendars the API can access:

1. Go to [platform.morgen.so](https://platform.morgen.so)
2. Navigate to API Settings or Developer Settings
3. Select which calendars to expose via API
4. Save your preferences

### Rate Limits

The Morgen API has rate limits:
- Standard: 1000 requests per hour
- Burst: 100 requests per minute

Plan your usage accordingly.

## Common Setup Issues

### "Invalid API Key"
- Ensure you copied the entire key
- Check for extra spaces or line breaks
- Verify the key starts with `mg_prod_` or similar

### "No calendars available"
- Wait 5-10 minutes after connecting calendars in Morgen
- Try refreshing your calendar connections
- Ensure calendars are set to sync in Morgen settings

### "Network error"
- Check your internet connection
- Verify Claude Desktop can access external APIs
- Check if you're behind a corporate firewall

### "Rate limit exceeded"
- Wait 5-10 minutes before trying again
- Contact Morgen support if this persists

## Getting Help

### Extension Support
- GitHub Issues: [github.com/outcastofmusic/morgen-claude-extension/issues](https://github.com/outcastofmusic/morgen-claude-extension/issues)
- Include your Claude Desktop version and error messages

### Morgen API Support
- Email: connect@morgen.so
- Include your account email and API key prefix (first 10 characters only)

### Claude Desktop Support
- Visit: [support.anthropic.com](https://support.anthropic.com)
- Check the MCP/Extensions documentation

## Next Steps

Once setup is complete, you can:

1. Ask Claude about your schedule
2. Create events with natural language
3. Search across all your calendars
4. Get daily and weekly summaries
5. Integrate calendar management into your Claude workflows

Enjoy seamless calendar management with Claude! 🎉