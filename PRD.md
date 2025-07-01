# Morgen Calendar MCP Extension - Product Requirements Document

## Executive Summary

Create a Claude Desktop Extension that integrates with the Morgen Calendar API to provide natural language calendar management across all connected calendar providers (Google, Outlook, Apple, Exchange, etc.). This extension will allow users to query events, create meetings, search calendars, and manage their schedule through conversational AI.

## Project Overview

### Objective
Build a Model Context Protocol (MCP) server packaged as a Claude Desktop Extension (.dxt format) that connects Claude to the Morgen calendar ecosystem, enabling seamless calendar management through natural language interactions.

### Success Criteria
- ✅ One-click installation in Claude Desktop
- ✅ Multi-provider calendar access (Google, Outlook, Apple, etc.)
- ✅ Natural language event creation and querying
- ✅ Real-time calendar data access
- ✅ Secure API key management
- ✅ Enterprise-ready security and permissions

## Technical Specifications

### Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Claude Desktop │    │  MCP Extension   │    │  Morgen API     │
│                 │◄──►│  (.dxt package)  │◄──►│  (api.morgen.so)│
│  - UI Layer     │    │  - Node.js MCP   │    │  - REST API     │
│  - Extensions   │    │  - Server Logic  │    │  - OAuth/Auth   │
│  - Config Mgmt  │    │  - API Client    │    │  - Multi-Provider│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Calendar Providers│
                       │ - Google Calendar │
                       │ - Outlook/O365   │
                       │ - Apple Calendar │
                       │ - Exchange       │
                       │ - FastMail       │
                       │ - CalDAV         │
                       └─────────────────┘
```

### Technology Stack

#### Core Technologies
- **Runtime**: Node.js 18+
- **MCP SDK**: `@modelcontextprotocol/sdk` v1.0+
- **Packaging**: `@anthropic-ai/dxt` CLI tools
- **Transport**: stdio (local MCP server)
- **API Client**: Native `fetch()` API

#### Development Tools
- **Build Tool**: esbuild (for bundling)
- **Package Manager**: npm
- **Testing**: Custom test harness with mock API
- **Documentation**: Markdown with examples

#### Dependencies
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "@anthropic-ai/dxt": "^0.1.0",
    "esbuild": "^0.19.0"
  }
}
```

## API Integration Specifications

### Morgen API Overview

**Base URL**: `https://api.morgen.so/v3`
**Authentication**: API Key (`Authorization: ApiKey <key>`)
**Status**: Early Access (requires developer approval)

#### API Endpoints

##### 1. Calendar Management

**List Calendars**
```http
GET /calendars/list
Authorization: ApiKey <key>
Accept: application/json
```

Response:
```json
{
  "data": {
    "calendars": [
      {
        "id": "calendar-id",
        "name": "Calendar Name",
        "accountId": "account-id",
        "color": "#1E88E5",
        "timeZone": "America/New_York",
        "mimeType": "application/calendar"
      }
    ]
  }
}
```

**List Accounts**
```http
GET /integrations/accounts/list
Authorization: ApiKey <key>
Accept: application/json
```

Response:
```json
{
  "data": {
    "accounts": [
      {
        "id": "account-id",
        "integrationId": "google|o365|apple|exchange",
        "email": "user@example.com"
      }
    ]
  }
}
```

##### 2. Event Operations

**List Events**
```http
GET /events/list?calendarIds=<ids>&start=<iso>&end=<iso>&accountId=<id>
Authorization: ApiKey <key>
Accept: application/json
```

Response:
```json
{
  "data": {
    "events": [
      {
        "id": "event-id",
        "uid": "calendar-uid",
        "calendarId": "calendar-id",
        "accountId": "account-id",
        "title": "Event Title",
        "description": "Event Description",
        "location": "Event Location",
        "start": "2024-01-15T09:00:00Z",
        "end": "2024-01-15T10:00:00Z",
        "timeZone": "America/New_York"
      }
    ]
  }
}
```

**Create Event**
```http
POST /events/create
Authorization: ApiKey <key>
Content-Type: application/json

{
  "accountId": "account-id",
  "calendarId": "calendar-id",
  "title": "Event Title",
  "start": "2024-01-15T09:00:00Z",
  "end": "2024-01-15T10:00:00Z",
  "description": "Optional description",
  "location": "Optional location",
  "timeZone": "America/New_York"
}
```

#### Error Handling
- **401 Unauthorized**: Invalid API key
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### API Client Implementation

```javascript
class MorgenAPIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.morgen.so/v3';
    this.headers = {
      'Authorization': `ApiKey ${apiKey}`,
      'Accept': 'application/json',
      'User-Agent': 'MCP-Morgen-Extension/1.0'
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: { ...this.headers, ...options.headers }
    };
    
    const response = await fetch(url, config);
    if (!response.ok) {
      throw new Error(`API Error ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Calendar methods
  async listCalendars() { /* implementation */ }
  async listAccounts() { /* implementation */ }
  
  // Event methods  
  async listEvents(params) { /* implementation */ }
  async createEvent(eventData) { /* implementation */ }
  async searchEvents(query, options) { /* implementation */ }
}
```

## MCP Server Implementation

### Required MCP Capabilities

```javascript
const serverCapabilities = {
  capabilities: {
    resources: {},  // Calendar metadata
    tools: {},     // Calendar operations
  }
};
```

### MCP Resources

Implement the following resources for contextual information:

```javascript
const resources = [
  {
    uri: "morgen://calendars",
    name: "Calendars",
    description: "List of all connected calendars",
    mimeType: "text/plain"
  },
  {
    uri: "morgen://accounts", 
    name: "Accounts",
    description: "Connected calendar accounts",
    mimeType: "text/plain"
  },
  {
    uri: "morgen://integrations",
    name: "Integrations",
    description: "Available calendar integrations", 
    mimeType: "text/plain"
  }
];
```

### MCP Tools

Implement these tools with proper JSON schemas:

#### 1. `list_calendars`
**Purpose**: View all connected calendars
**Schema**:
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

#### 2. `list_accounts`
**Purpose**: View connected calendar providers
**Schema**:
```json
{
  "type": "object", 
  "properties": {},
  "required": []
}
```

#### 3. `get_today_events`
**Purpose**: Get today's events across all calendars
**Schema**:
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

#### 4. `get_week_events`
**Purpose**: Get this week's events organized by day
**Schema**:
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

#### 5. `get_events`
**Purpose**: Get events from specific calendars/dates
**Schema**:
```json
{
  "type": "object",
  "properties": {
    "calendar_ids": {
      "type": "string",
      "description": "Comma-separated calendar IDs"
    },
    "start_date": {
      "type": "string",
      "description": "Start date (ISO format)"
    },
    "end_date": {
      "type": "string", 
      "description": "End date (ISO format)"
    },
    "account_id": {
      "type": "string",
      "description": "Specific account ID (optional)"
    }
  },
  "required": ["calendar_ids"]
}
```

#### 6. `search_events`
**Purpose**: Search events by title/description/location
**Schema**:
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query"
    },
    "start_date": {
      "type": "string",
      "description": "Search start date (optional)"
    },
    "end_date": {
      "type": "string",
      "description": "Search end date (optional)"
    },
    "max_results": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "description": "Maximum results (default: 20)"
    }
  },
  "required": ["query"]
}
```

#### 7. `create_event`
**Purpose**: Create new calendar events
**Schema**:
```json
{
  "type": "object",
  "properties": {
    "account_id": {
      "type": "string",
      "description": "Account ID for the calendar"
    },
    "calendar_id": {
      "type": "string",
      "description": "Target calendar ID"
    },
    "title": {
      "type": "string",
      "description": "Event title"
    },
    "start_time": {
      "type": "string",
      "description": "Start time (ISO format)"
    },
    "end_time": {
      "type": "string",
      "description": "End time (optional, defaults to +1 hour)"
    },
    "description": {
      "type": "string",
      "description": "Event description (optional)"
    },
    "location": {
      "type": "string", 
      "description": "Event location (optional)"
    },
    "time_zone": {
      "type": "string",
      "description": "Time zone (optional, defaults to UTC)"
    }
  },
  "required": ["account_id", "calendar_id", "title", "start_time"]
}
```

### Response Formatting

Implement consistent response formatting:

```javascript
// Event formatting
function formatEvent(event) {
  return `📅 ${event.title}
⏰ Start: ${formatDateTime(event.start)}
⏰ End: ${formatDateTime(event.end)}
${event.location ? `📍 Location: ${event.location}` : ''}
${event.description ? `📝 Description: ${event.description}` : ''}`;
}

// Calendar formatting
function formatCalendar(calendar) {
  return `📁 ${calendar.name}
🆔 ID: ${calendar.id}
👤 Account ID: ${calendar.accountId}
${calendar.color ? `🎨 Color: ${calendar.color}` : ''}
${calendar.timeZone ? `🌍 Time Zone: ${calendar.timeZone}` : ''}`;
}
```

## Desktop Extension Package Structure

### Project Structure
```
morgen-calendar-extension/
├── src/
│   └── index.js              # Main MCP server
├── dist/                     # Built files (generated)
├── assets/
│   ├── icon-light.svg        # Extension icon (light theme)
│   ├── icon-dark.svg         # Extension icon (dark theme)
│   ├── icon-16.png          # Various icon sizes
│   ├── icon-32.png
│   ├── icon-48.png
│   ├── icon-64.png
│   ├── icon-128.png
│   └── screenshots/
│       ├── calendar-view.png
│       ├── event-creation.png
│       └── search-results.png
├── test/
│   └── test.js              # Test suite
├── manifest.json            # Extension manifest
├── package.json             # Node.js package config
├── build.js                 # Build script
├── README.md                # User documentation
├── SETUP.md                 # Setup instructions
└── LICENSE                  # MIT license
```

### Manifest.json Specification

```json
{
  "name": "morgen-calendar",
  "displayName": "Morgen Calendar",
  "description": "Connect Claude to your Morgen calendars for natural language calendar management",
  "version": "1.0.0",
  "author": {
    "name": "Extension Developer",
    "email": "developer@example.com"
  },
  "license": "MIT",
  "keywords": ["calendar", "morgen", "scheduling", "productivity"],
  "categories": ["productivity", "calendar"],
  "runtime": {
    "type": "node",
    "version": ">=18.0.0"
  },
  "main": "index.js",
  "mcpServers": {
    "morgen-calendar": {
      "command": "node",
      "args": ["index.js"],
      "env": {
        "MORGEN_API_KEY": "${MORGEN_API_KEY}"
      }
    }
  },
  "configuration": {
    "properties": {
      "MORGEN_API_KEY": {
        "type": "string",
        "title": "Morgen API Key",
        "description": "Your Morgen API key from https://platform.morgen.so/developers-api",
        "required": true,
        "secret": true,
        "validation": {
          "pattern": "^[A-Za-z0-9_-]+$",
          "minLength": 10,
          "maxLength": 200
        }
      }
    }
  },
  "permissions": {
    "network": {
      "allowed": true,
      "domains": ["api.morgen.so"]
    }
  },
  "icon": {
    "light": "assets/icon-light.svg",
    "dark": "assets/icon-dark.svg"
  }
}
```

### Build Configuration

Create `build.js` with esbuild configuration:

```javascript
const esbuild = require('esbuild');

async function build() {
  await esbuild.build({
    entryPoints: ['src/index.js'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: 'dist/index.js',
    external: ['@modelcontextprotocol/sdk'],
    format: 'cjs',
    banner: { js: '#!/usr/bin/env node' }
  });
  
  // Make executable and copy assets
  // ... additional build steps
}
```

## User Experience Specifications

### Installation Flow
1. User opens Claude Desktop → Settings → Extensions
2. User finds "Morgen Calendar" in directory
3. User clicks "Install"
4. System prompts for Morgen API key
5. User enters key and saves configuration
6. Extension validates connection
7. User can immediately start using calendar features

### Usage Examples

#### Daily Planning
**User**: "What's on my calendar today?"
**Expected Response**: 
```
📅 Today's Schedule (2024-01-15) - 3 event(s):

1. 📅 Team Standup
   ⏰ Start: 2024-01-15 09:00:00
   ⏰ End: 2024-01-15 09:30:00
   📍 Location: Conference Room A

2. 📅 Client Review Meeting
   ⏰ Start: 2024-01-15 14:00:00
   ⏰ End: 2024-01-15 15:00:00
   📝 Description: Quarterly review with ABC Corp
```

#### Event Creation
**User**: "Schedule a marketing meeting tomorrow at 2 PM"
**Expected Flow**:
1. Claude requests calendar selection
2. User chooses target calendar
3. Claude creates event with smart defaults
4. Confirmation with event details

#### Smart Search
**User**: "Find all meetings about budget planning"
**Expected Response**:
```
🔍 Found 2 event(s) matching 'budget planning':

1. 📅 Q4 Budget Planning Session
   ⏰ Start: 2024-01-10 10:00:00
   📍 Location: Board Room
```

## Security & Privacy Requirements

### Data Handling
- ✅ **No Local Storage**: Extension doesn't persist calendar data
- ✅ **API Key Encryption**: Stored securely in Claude Desktop
- ✅ **HTTPS Only**: All API communication encrypted
- ✅ **Minimal Permissions**: Only request necessary API access

### Authentication Flow
1. User obtains API key from Morgen platform
2. User enters key in extension configuration
3. Extension validates key with test API call
4. Key stored in Claude Desktop's secure storage
5. All subsequent API calls use encrypted key

### Permission Model
```json
{
  "permissions": {
    "network": {
      "allowed": true,
      "domains": ["api.morgen.so"],
      "description": "Required for calendar data access"
    },
    "filesystem": {
      "read": false,
      "write": false
    }
  }
}
```

## Testing Requirements

### Test Categories

#### 1. Unit Tests
- API client methods
- Data formatting functions
- Date/time utilities
- Error handling

#### 2. Integration Tests
- MCP protocol compliance
- Tool schema validation
- Resource access
- End-to-end workflows

#### 3. Mock Testing
```javascript
// Mock API responses for testing
const mockResponses = {
  calendars: { data: { calendars: [...] } },
  events: { data: { events: [...] } },
  accounts: { data: { accounts: [...] } }
};
```

#### 4. User Acceptance Tests
- Installation process
- Configuration setup
- Basic calendar queries
- Event creation
- Error scenarios

### Test Implementation

Create `test/test.js`:
```javascript
const { server } = require('../src/index.js');

// Mock environment
process.env.MORGEN_API_KEY = 'test-key';

// Mock fetch globally
global.fetch = createMockFetch();

// Test runner
async function runTests() {
  const tests = [
    testListCalendars,
    testGetTodayEvents,
    testCreateEvent,
    testSearchEvents
  ];
  
  for (const test of tests) {
    await test();
  }
}
```

## Development Resources

### Official Documentation
- **MCP Specification**: [spec.modelcontextprotocol.io](https://spec.modelcontextprotocol.io)
- **MCP SDK Docs**: [modelcontextprotocol.io](https://modelcontextprotocol.io)
- **Desktop Extensions**: [anthropic.com/engineering/desktop-extensions](https://www.anthropic.com/engineering/desktop-extensions)
- **DXT Specification**: [github.com/anthropics/dxt](https://github.com/anthropics/dxt)

### Morgen Resources
- **API Documentation**: [docs.morgen.so](https://docs.morgen.so)
- **Developer Platform**: [platform.morgen.so/developers-api](https://platform.morgen.so/developers-api)
- **Morgen App**: [morgen.so](https://morgen.so)

### Development Tools
- **DXT CLI**: `npm install -g @anthropic-ai/dxt`
- **MCP Inspector**: `npx @modelcontextprotocol/inspector`
- **Node.js**: v18+ required
- **esbuild**: For efficient bundling

### Code References
- **MCP Server Examples**: [github.com/modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)
- **TypeScript SDK**: [github.com/modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- **Python SDK**: [github.com/modelcontextprotocol/python-sdk](https://github.com/modelcontextprotocol/python-sdk)

## Deployment & Distribution

### Development Workflow
1. **Setup Environment**:
   ```bash
   npm install -g @anthropic-ai/dxt
   git clone <repository>
   cd morgen-calendar-extension
   npm install
   ```

2. **Development**:
   ```bash
   npm run dev          # Run server directly
   npm run build        # Build for testing
   npm run test         # Run test suite
   ```

3. **Packaging**:
   ```bash
   dxt init             # Initialize DXT package
   dxt pack             # Create .dxt file
   ```

4. **Testing Installation**:
   ```bash
   dxt install morgen-calendar.dxt
   ```

### Distribution Channels

#### 1. Claude Desktop Extensions Directory
- Submit to Anthropic for inclusion
- Requires review and approval
- Provides maximum reach to users

#### 2. GitHub Releases
- Distribute .dxt files directly
- Users manually install
- Good for beta testing

#### 3. Third-Party Marketplaces
- MCPapps.net
- Community registries
- Docker MCP Catalog

### Version Management
- **Semantic Versioning**: Use semver (1.0.0, 1.1.0, etc.)
- **Changelog**: Maintain CHANGELOG.md
- **Migration**: Handle API changes gracefully
- **Backwards Compatibility**: Support older Morgen API versions

## Success Metrics

### User Adoption
- Extension installations
- Active daily users
- Calendar operations per user
- User retention rates

### Technical Performance
- API response times < 2 seconds
- Error rates < 1%
- Extension load time < 5 seconds
- Memory usage < 100MB

### User Satisfaction
- User feedback scores
- Feature request tracking
- Bug report resolution time
- Documentation completeness

## Risk Assessment & Mitigation

### Technical Risks
- **Morgen API Changes**: Monitor API stability, implement graceful degradation
- **MCP Protocol Updates**: Stay current with MCP specification changes
- **Claude Desktop Changes**: Test with beta versions, maintain compatibility

### Business Risks
- **API Access Revocation**: Maintain good relationship with Morgen team
- **Competition**: Focus on superior user experience and integration quality
- **User Privacy Concerns**: Implement transparent privacy practices

### Mitigation Strategies
- Regular communication with Morgen API team
- Comprehensive error handling and fallbacks
- Clear documentation of data usage
- Responsive user support channel

## Future Enhancements

### Phase 2 Features
- **Real-time Notifications**: Event reminders and updates
- **Smart Scheduling**: AI-powered meeting suggestions
- **Calendar Conflict Resolution**: Automatic conflict detection
- **Multi-timezone Support**: Enhanced timezone handling

### Phase 3 Features
- **Task Integration**: Connect with Morgen's task management
- **Meeting Analytics**: Calendar usage insights
- **Team Calendar Sharing**: Collaborative features
- **Mobile Support**: When Claude mobile supports MCP

### Integration Opportunities
- **Email Integration**: Parse meeting invites
- **CRM Connections**: Sync with customer data
- **Project Management**: Link with task tools
- **Time Tracking**: Automatic time logging

---

## Conclusion

This PRD provides comprehensive specifications for building a Morgen Calendar MCP Extension for Claude Desktop. The extension will bridge natural language AI with powerful calendar management, making schedule management more intuitive and efficient for users across all their calendar providers.

**Key Success Factors**:
- Seamless one-click installation experience
- Robust API integration with comprehensive error handling
- Intuitive natural language interface
- Secure and private data handling
- Comprehensive testing and quality assurance

**Next Steps**:
1. Set up development environment
2. Obtain Morgen API access
3. Implement core MCP server functionality
4. Build and test extension package
5. Submit for distribution approval

The completed extension will demonstrate the power of MCP to connect AI assistants with real-world productivity tools, setting a standard for calendar management through conversational AI.
