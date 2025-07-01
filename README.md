# Morgen Calendar Extension for Claude Desktop

Connect Claude to your Morgen calendars for natural language calendar management across all your calendar providers (Google, Outlook, Apple, Exchange, and more).

## Features

- 📅 **Multi-Provider Support**: Access calendars from Google, Outlook, Apple, Exchange, FastMail, and any CalDAV provider
- 🔍 **Smart Search**: Find events across all calendars with natural language queries
- ✨ **Event Creation**: Create events easily through conversational AI
- 📊 **Daily & Weekly Views**: Get organized views of your schedule
- 🔒 **Secure**: API keys stored securely in Claude Desktop

## Installation

### One-Click Installation

1. Open Claude Desktop
2. Go to Settings → Extensions
3. Search for "Morgen Calendar"
4. Click "Install"
5. Enter your Morgen API key when prompted
6. Start managing your calendars!

### Manual Installation

If you have the `.dxt` file:

1. Open Claude Desktop
2. Go to Settings → Extensions
3. Click "Install from file"
4. Select the `morgen-calendar.dxt` file
5. Enter your Morgen API key when prompted

## Setup

### Getting Your Morgen API Key

1. Visit [Morgen Developer Platform](https://platform.morgen.so/developers-api)
2. Sign in or create a Morgen account
3. Request API access (currently in early access)
4. Once approved, generate your API key
5. Copy the API key for use in the extension

### Connecting Calendar Providers

Before using this extension, connect your calendar providers in Morgen:

1. Visit [platform.morgen.so](https://platform.morgen.so)
2. Connect your calendar accounts:
   - Google Calendar
   - Microsoft Outlook/Office 365
   - Apple Calendar (iCloud)
   - Microsoft Exchange
   - FastMail
   - Generic CalDAV

## Usage Examples

### View Your Calendars
```
"Show me all my calendars"
"List my connected calendar accounts"
```

### Check Your Schedule
```
"What's on my calendar today?"
"Show me this week's events"
"What meetings do I have tomorrow?"
```

### Search for Events
```
"Find all meetings about budget planning"
"Search for events with John"
"When is my next dentist appointment?"
```

### Create Events
```
"Schedule a team meeting tomorrow at 2 PM"
"Add lunch with Sarah on Friday at noon"
"Create a reminder to call mom next Monday at 6 PM"
```

### Get Events from Specific Calendars
```
"Show me events from my work calendar this week"
"What's on my personal calendar today?"
```

## Available Commands

The extension provides these tools to Claude:

- **list_calendars**: View all your connected calendars
- **list_accounts**: See your connected calendar providers
- **get_today_events**: Get all events for today
- **get_week_events**: View this week's schedule
- **get_events**: Get events with specific filters
- **search_events**: Search across all calendars
- **create_event**: Create new calendar events

## Troubleshooting

### "No calendars found"
- Make sure you've connected calendar providers at [platform.morgen.so](https://platform.morgen.so)
- Verify your API key is valid and has proper permissions

### "API Error 401: Unauthorized"
- Your API key may be invalid or expired
- Generate a new key at the [Morgen Developer Platform](https://platform.morgen.so/developers-api)

### "Rate limit exceeded"
- You've made too many requests in a short time
- Wait a few minutes before trying again

### Extension Not Working
1. Check Claude Desktop is up to date
2. Verify your API key is correctly entered
3. Try reinstalling the extension
4. Check your internet connection

## Privacy & Security

- Your API key is stored securely in Claude Desktop's credential storage
- Calendar data is only accessed when you request it
- No calendar information is stored locally
- All API communications use HTTPS encryption

## Support

- **Extension Issues**: [GitHub Issues](https://github.com/outcastofmusic/morgen-claude-extension/issues)
- **Morgen API**: Contact connect@morgen.so
- **Claude Desktop**: [Claude Support](https://support.anthropic.com)

## Development

To build from source:

```bash
git clone https://github.com/outcastofmusic/morgen-claude-extension.git
cd morgen-claude-extension
npm install
npm run build
npm test
```

To package as .dxt:
```bash
npx @anthropic-ai/dxt init
npx @anthropic-ai/dxt pack
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with:
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io)
- [Morgen API](https://morgen.so)
- [Claude Desktop Extensions](https://anthropic.com/claude/desktop)