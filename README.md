# Morgen Calendar Extension for Claude Desktop

Connect Claude to your Morgen calendars for natural language calendar management across all your calendar providers (Google, Outlook, Apple, Exchange, and more).

## Features

- 📅 **Multi-Provider Support**: Access calendars from Google, Outlook, Apple, Exchange, FastMail, and any CalDAV provider
- 🔍 **Smart Search**: Find events across all calendars with natural language queries
- ✨ **Event Creation**: Create events easily through conversational AI
- 📊 **Daily & Weekly Views**: Get organized views of your schedule
- 🔒 **Secure**: API keys stored securely in Claude Desktop
- 🚫 **Smart Filtering**: Automatically filters out "Busy (via Morgen)" and "Untitled Event" entries

## Architecture

**Claude Desktop** ↔ **MCP Extension (.dxt)** ↔ **Morgen API** (api.morgen.so) ↔ **Calendar Providers**

This extension is built as an MCP (Model Context Protocol) server that integrates with Claude Desktop to provide seamless calendar management through natural language.

## Installation in Claude Desktop

### Prerequisites

1. **Claude Desktop**: Download and install [Claude Desktop](https://claude.ai/download)
2. **Morgen Account**: Create an account at [morgen.so](https://morgen.so)
3. **Connected Calendars**: Connect your calendar providers in Morgen
4. **API Key**: Get a Morgen API key (see setup section below)

### Method 1: Install from .dxt File

1. **Download** the latest `morgen-calendar.dxt` file from the releases
2. **Open Claude Desktop**
3. **Go to Settings** → **Extensions**
4. **Click "Install Extension"** or **"Add Extension"**
5. **Select** the downloaded `morgen-calendar.dxt` file
6. **Enter your Morgen API Key** when prompted
7. **Start using** the extension by asking Claude about your calendar!

### Method 2: Install from Source (Development)

```bash
# Clone the repository
git clone https://github.com/outcastofmusic/morgen-claude-extension.git
cd morgen-claude-extension

# Install dependencies
npm install

# Run tests to verify everything works
npm test

# Build the extension
npm run build

# Package as .dxt extension file
npx @anthropic-ai/dxt init   # First time only
npx @anthropic-ai/dxt pack   # Creates morgen-calendar.dxt

# Install the generated .dxt file in Claude Desktop (see Method 1)
```

## Setup

### Getting Your Morgen API Key

1. **Visit** [Morgen Developer Platform](https://platform.morgen.so/developers-api)
2. **Sign in** or create a Morgen account
3. **Request API access** (currently in early access - contact connect@morgen.so)
4. **Generate your API key** once approved
5. **Copy the API key** for use in the extension

### Connecting Calendar Providers

Before using this extension, connect your calendar providers in Morgen:

1. **Visit** [platform.morgen.so](https://platform.morgen.so)
2. **Connect your calendar accounts**:
   - Google Calendar
   - Microsoft Outlook/Office 365
   - Apple Calendar (iCloud)
   - Microsoft Exchange
   - FastMail
   - Generic CalDAV providers

### Configuring the Extension in Claude Desktop

1. **Open Claude Desktop**
2. **Go to Settings** → **Extensions**
3. **Find "Morgen Calendar"** in your installed extensions
4. **Click "Configure"** or the settings icon
5. **Enter your Morgen API Key**
6. **Save the configuration**

## Usage Examples

### View Your Calendars
```
"Show me all my calendars"
"List my connected calendar accounts"
"What calendar providers do I have connected?"
```

### Check Your Schedule
```
"What's on my calendar today?"
"Show me this week's events"
"What meetings do I have tomorrow?"
"What's my schedule for Monday?"
```

### Search for Events
```
"Find all meetings about budget planning"
"Search for events with John"
"When is my next dentist appointment?"
"Show me all events in my work calendar this week"
```

### Create Events
```
"Schedule a team meeting tomorrow at 2 PM in Conference Room A"
"Add lunch with Sarah on Friday at noon"
"Create a reminder to call mom next Monday at 6 PM"
"Book a dentist appointment for next Tuesday at 3 PM"
```

### Get Events from Specific Calendars
```
"Show me events from my work calendar this week"
"What's on my personal calendar today?"
"List all events from calendar ID cal-123"
```

## Available Commands

The extension provides these tools to Claude:

- **list_calendars**: View all your connected calendars
- **list_accounts**: See your connected calendar providers  
- **get_today_events**: Get all events for today
- **get_week_events**: View this week's schedule organized by day
- **get_events**: Get events with specific filters (calendar IDs, date range)
- **search_events**: Search across all calendars by title/description/location
- **create_event**: Create new calendar events

## How It Was Built

### Architecture & Technologies

This extension is built using several key technologies and external resources:

#### Core Technologies
- **Node.js** (v20+): Runtime environment
- **Model Context Protocol (MCP)**: Claude Desktop extension framework
- **JavaScript/ES6**: Primary programming language

#### External Dependencies

**Production Dependencies:**
```json
{
  "@modelcontextprotocol/sdk": "^0.6.0"  // MCP SDK for Claude Desktop integration
}
```

**Development Dependencies:**
```json
{
  "@anthropic-ai/dxt": "^0.1.0",  // DXT packaging tool for .dxt files
  "esbuild": "^0.24.0"            // Fast JavaScript bundler
}
```

#### External APIs & Services
- **Morgen API** (api.morgen.so/v3): Primary calendar data source
  - Authentication: API Key based
  - Endpoints: /calendars/list, /events/list, /events/create, /integrations/accounts/list
  - Rate limiting: Managed by Morgen service
- **Multiple Calendar Providers** (via Morgen):
  - Google Calendar API
  - Microsoft Graph API (Office 365/Outlook)
  - Apple Calendar (CalDAV)
  - Exchange Web Services (EWS)
  - FastMail API
  - Generic CalDAV protocols

#### Key Components

1. **MCP Server** (`src/index.js`):
   - Implements MCP protocol for Claude Desktop communication
   - Handles tool registration and execution
   - Manages stdio transport layer

2. **API Client** (`src/morgen-api-client.js`):
   - HTTP client for Morgen API integration
   - Implements event filtering logic
   - Handles authentication and error management

3. **Formatters** (`src/formatters.js`):
   - Event and calendar data formatting utilities
   - Date/time formatting with timezone support
   - Structured output for Claude consumption

4. **Build System**:
   - **esbuild**: Bundles all source files into single executable
   - **DXT packaging**: Creates Claude Desktop compatible .dxt extension files
   - **Test suite**: Comprehensive mocking and validation

#### Development Process

1. **API Integration**: Connected to Morgen API v3 with comprehensive error handling
2. **MCP Implementation**: Followed MCP specification for Claude Desktop compatibility
3. **Event Filtering**: Implemented client-side filtering for unwanted events
4. **Testing**: Mock API responses with comprehensive test coverage
5. **Packaging**: DXT toolchain for Claude Desktop distribution

### Build Scripts

```bash
# Development server (runs MCP server directly)
npm run dev

# Production build (creates bundled dist/index.js)
npm run build

# Run test suite with mock API
npm test

# Package as Claude Desktop extension
npx @anthropic-ai/dxt pack
```

The build process uses **esbuild** for fast bundling and the **@anthropic-ai/dxt** toolkit for creating Claude Desktop compatible extension packages.

## File Structure

```
morgen-claude-extension/
├── src/
│   ├── index.js              # Main MCP server implementation
│   ├── morgen-api-client.js  # Morgen API client with filtering
│   └── formatters.js         # Data formatting utilities
├── test/
│   └── test.js              # Comprehensive test suite with mocks
├── dist/
│   └── index.js             # Built bundle (generated)
├── manifest.json            # Extension metadata
├── package.json             # Dependencies and scripts
├── build.js                 # esbuild configuration
├── CLAUDE.md               # Development guidance
└── README.md               # This file
```

## Troubleshooting

### "No calendars found"
- Make sure you've connected calendar providers at [platform.morgen.so](https://platform.morgen.so)
- Verify your API key is valid and has proper permissions
- Check that your Morgen account has active calendar integrations

### "API Error 401: Unauthorized"
- Your API key may be invalid or expired
- Generate a new key at the [Morgen Developer Platform](https://platform.morgen.so/developers-api)
- Ensure the API key is correctly entered in Claude Desktop extension settings

### "Rate limit exceeded"
- You've made too many requests in a short time
- Wait a few minutes before trying again
- Morgen API has built-in rate limiting for fair usage

### Extension Not Working
1. **Check Claude Desktop version**: Ensure you have the latest version
2. **Verify API key**: Check the extension settings in Claude Desktop
3. **Test connection**: Try asking "show me my calendars" to test basic functionality
4. **Reinstall extension**: Remove and reinstall the .dxt file
5. **Check network**: Ensure internet connectivity to api.morgen.so

### Development Issues
```bash
# Clean build
rm -rf dist/ && npm run build

# Reset DXT package
rm -rf .dxt/ && npx @anthropic-ai/dxt init

# Run tests with verbose output
npm test -- --verbose
```

## Privacy & Security

- **API Key Storage**: Securely stored in Claude Desktop's encrypted credential storage
- **Data Access**: Calendar data is only accessed when you explicitly request it
- **No Local Storage**: No calendar information is cached or stored locally
- **HTTPS Encryption**: All API communications use TLS/HTTPS encryption
- **Minimal Permissions**: Extension only requests necessary calendar read/write permissions
- **Event Filtering**: Sensitive placeholder events are automatically filtered out

## Development & Contributing

### Prerequisites for Development
- Node.js v20 or higher
- npm or yarn package manager
- Claude Desktop (for testing)
- Morgen API key (for testing)

### Running Tests
```bash
npm test  # Runs complete test suite with mock API responses
```

### Creating a Release
1. Update version in `package.json`
2. Run `npm run build` to create production bundle
3. Run `npx @anthropic-ai/dxt pack` to create .dxt file
4. Test the .dxt file in Claude Desktop
5. Create GitHub release with .dxt file attached

## Support

- **Extension Issues**: [GitHub Issues](https://github.com/outcastofmusic/morgen-claude-extension/issues)
- **Morgen API Support**: Contact connect@morgen.so
- **Claude Desktop Help**: [Claude Support](https://support.anthropic.com)
- **MCP Documentation**: [Model Context Protocol](https://modelcontextprotocol.io)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

**Built with:**
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io) - Claude Desktop extension framework
- [Morgen API](https://morgen.so) - Universal calendar integration platform
- [Claude Desktop Extensions](https://claude.ai/desktop) - AI assistant platform
- [esbuild](https://esbuild.github.io/) - Fast JavaScript bundler
- [Node.js](https://nodejs.org/) - JavaScript runtime

**Special Thanks:**
- Morgen team for providing early API access
- Anthropic team for MCP framework and Claude Desktop
- The open source community for essential development tools

---

*This extension brings the power of natural language calendar management to Claude Desktop, connecting you to all your calendars through a single, intelligent interface.*