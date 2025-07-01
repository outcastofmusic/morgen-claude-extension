# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Claude Desktop Extension (MCP server) that integrates with the Morgen Calendar API to provide natural language calendar management across multiple providers (Google, Outlook, Apple, Exchange, etc.).

**Architecture**: Claude Desktop ↔ MCP Extension (.dxt) ↔ Morgen API (api.morgen.so) ↔ Calendar Providers

## Development Commands

```bash
npm install                    # Install dependencies
npm run dev                    # Run MCP server directly for development
npm run build                  # Build with esbuild for distribution
npm test                       # Run test suite with mock API
```

### Packaging Commands
```bash
npx @anthropic-ai/dxt init     # Initialize DXT package structure
npx @anthropic-ai/dxt pack     # Create .dxt extension file
```

## High-Level Architecture

### MCP Server Structure
The main entry point (`src/index.js`) implements:
- MCP server using `@modelcontextprotocol/sdk`
- stdio transport for local communication
- Resources for calendar metadata
- Tools for calendar operations

### Key Files
- `src/index.js`: Main MCP server implementation
- `src/morgen-api-client.js`: API client for Morgen service
- `src/formatters.js`: Response formatting utilities
- `manifest.json`: Desktop Extension configuration
- `build.js`: Build script using esbuild
- `test/test.js`: Test suite with mock API

### API Integration
- Base URL: `https://api.morgen.so/v3`
- Authentication: API Key header (`Authorization: ApiKey <key>`)
- Key endpoints: `/calendars/list`, `/events/list`, `/events/create`, `/integrations/accounts/list`

### MCP Tools Implemented
1. `list_calendars` - View all connected calendars
2. `list_accounts` - View connected calendar providers  
3. `get_today_events` - Get today's events
4. `get_week_events` - Get this week's events organized by day
5. `get_events` - Get events with filters (calendar IDs, date range)
6. `search_events` - Search by title/description/location
7. `create_event` - Create new calendar events

## Testing

Run the test suite with:
```bash
npm test
```

Tests use mock API responses and validate:
- Tool schema compliance
- API response handling
- Error scenarios
- Date/time formatting

## Building and Packaging

1. Build the extension:
   ```bash
   npm run build
   ```

2. Package as .dxt:
   ```bash
   npx @anthropic-ai/dxt init   # First time only
   npx @anthropic-ai/dxt pack   # Creates .dxt file
   ```

## Important Notes

- The extension requires a valid Morgen API key (currently in early access)
- All calendar providers must be connected through Morgen first
- The API client implements client-side search filtering as Morgen doesn't have a dedicated search endpoint
- Icons are currently placeholder PNGs - replace with proper icons for production
- The extension uses secure credential storage in Claude Desktop for API keys