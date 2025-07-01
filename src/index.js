#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { 
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError
} = require('@modelcontextprotocol/sdk/types.js');

const MorgenAPIClient = require('./morgen-api-client.js');
const {
  formatEvent,
  formatCalendar,
  formatAccount,
  formatEventsByDay
} = require('./formatters.js');

// Server metadata
const SERVER_NAME = 'morgen-calendar';
const SERVER_VERSION = '1.0.0';

class MorgenMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );
    
    this.apiClient = null;
    this.setupHandlers();
  }

  setupHandlers() {
    // Initialize API client with API key from environment
    const apiKey = process.env.MORGEN_API_KEY;
    if (!apiKey) {
      console.error('Error: MORGEN_API_KEY environment variable is not set');
      process.exit(1);
    }
    
    this.apiClient = new MorgenAPIClient(apiKey);

    // Handler for listing available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'morgen://calendars',
          name: 'Calendars',
          description: 'List of all connected calendars',
          mimeType: 'text/plain',
        },
        {
          uri: 'morgen://accounts',
          name: 'Accounts',
          description: 'Connected calendar accounts',
          mimeType: 'text/plain',
        },
        {
          uri: 'morgen://integrations',
          name: 'Integrations',
          description: 'Available calendar integrations',
          mimeType: 'text/plain',
        },
      ],
    }));

    // Handler for reading resources
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      try {
        switch (uri) {
          case 'morgen://calendars': {
            const calendars = await this.apiClient.listCalendars();
            const content = calendars.length > 0
              ? calendars.map(cal => formatCalendar(cal)).join('\n\n')
              : 'No calendars found. Please connect your calendars at https://platform.morgen.so';
            
            return {
              contents: [{
                uri,
                mimeType: 'text/plain',
                text: content,
              }],
            };
          }
          
          case 'morgen://accounts': {
            const accounts = await this.apiClient.listAccounts();
            const content = accounts.length > 0
              ? accounts.map(acc => formatAccount(acc)).join('\n\n')
              : 'No accounts connected. Please connect your calendar accounts at https://platform.morgen.so';
            
            return {
              contents: [{
                uri,
                mimeType: 'text/plain',
                text: content,
              }],
            };
          }
          
          case 'morgen://integrations': {
            const content = `Available Calendar Integrations:

🔗 Google Calendar
🔗 Office 365 / Outlook
🔗 Apple Calendar (iCloud)
🔗 Microsoft Exchange
🔗 FastMail
🔗 CalDAV (Generic)

Connect your calendars at https://platform.morgen.so`;
            
            return {
              contents: [{
                uri,
                mimeType: 'text/plain',
                text: content,
              }],
            };
          }
          
          default:
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Unknown resource: ${uri}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) throw error;
        
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to read resource: ${error.message}`
        );
      }
    });

    // Handler for calling tools
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case 'list_calendars':
            return await this.listCalendars();
            
          case 'list_accounts':
            return await this.listAccounts();
            
          case 'get_today_events':
            return await this.getTodayEvents();
            
          case 'get_week_events':
            return await this.getWeekEvents();
            
          case 'get_events':
            return await this.getEvents(args);
            
          case 'search_events':
            return await this.searchEvents(args);
            
          case 'create_event':
            return await this.createEvent(args);
            
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) throw error;
        
        // Handle API errors
        if (error.status === 401) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            'Invalid API key. Please check your Morgen API key configuration.'
          );
        } else if (error.status === 429) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            'Rate limit exceeded. Please try again later.'
          );
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  // Tool implementations
  async listCalendars() {
    const calendars = await this.apiClient.listCalendars();
    
    const content = calendars.length > 0
      ? `Found ${calendars.length} calendar(s):\n\n${calendars.map(cal => formatCalendar(cal)).join('\n\n')}`
      : 'No calendars found. Please connect your calendars at https://platform.morgen.so';
    
    return {
      content: [{
        type: 'text',
        text: content,
      }],
    };
  }

  async listAccounts() {
    const accounts = await this.apiClient.listAccounts();
    
    const content = accounts.length > 0
      ? `Connected ${accounts.length} account(s):\n\n${accounts.map(acc => formatAccount(acc)).join('\n\n')}`
      : 'No accounts connected. Please connect your calendar accounts at https://platform.morgen.so';
    
    return {
      content: [{
        type: 'text',
        text: content,
      }],
    };
  }

  async getTodayEvents() {
    const events = await this.apiClient.getTodayEvents();
    
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    const content = events.length > 0
      ? `📅 Today's Schedule (${today}) - ${events.length} event(s):\n\n${events.map((event, i) => `${i + 1}. ${formatEvent(event)}`).join('\n\n')}`
      : `📅 No events scheduled for today (${today})`;
    
    return {
      content: [{
        type: 'text',
        text: content,
      }],
    };
  }

  async getWeekEvents() {
    const events = await this.apiClient.getWeekEvents();
    
    const content = events.length > 0
      ? `📅 This Week's Schedule - ${events.length} event(s):${formatEventsByDay(events)}`
      : '📅 No events scheduled for this week';
    
    return {
      content: [{
        type: 'text',
        text: content,
      }],
    };
  }

  async getEvents(args) {
    // Validate required parameters
    if (!args.calendar_ids) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'calendar_ids parameter is required'
      );
    }
    
    const params = {
      calendarIds: args.calendar_ids,
      start: args.start_date,
      end: args.end_date,
      accountId: args.account_id,
    };
    
    const events = await this.apiClient.listEvents(params);
    
    let content;
    if (events.length > 0) {
      content = `📅 Found ${events.length} event(s):\n\n${events.map((event, i) => `${i + 1}. ${formatEvent(event)}`).join('\n\n')}`;
    } else {
      content = '📅 No events found for the specified criteria';
    }
    
    return {
      content: [{
        type: 'text',
        text: content,
      }],
    };
  }

  async searchEvents(args) {
    // Validate required parameters
    if (!args.query) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'query parameter is required'
      );
    }
    
    const options = {
      start_date: args.start_date,
      end_date: args.end_date,
      max_results: args.max_results,
    };
    
    const events = await this.apiClient.searchEvents(args.query, options);
    
    let content;
    if (events.length > 0) {
      content = `🔍 Found ${events.length} event(s) matching '${args.query}':\n\n${events.map((event, i) => `${i + 1}. ${formatEvent(event)}`).join('\n\n')}`;
    } else {
      content = `🔍 No events found matching '${args.query}'`;
    }
    
    return {
      content: [{
        type: 'text',
        text: content,
      }],
    };
  }

  async createEvent(args) {
    // Validate required parameters
    const required = ['account_id', 'calendar_id', 'title', 'start_time'];
    for (const param of required) {
      if (!args[param]) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `${param} parameter is required`
        );
      }
    }
    
    // Calculate end time if not provided (default to 1 hour)
    let endTime = args.end_time;
    if (!endTime) {
      const startDate = new Date(args.start_time);
      startDate.setHours(startDate.getHours() + 1);
      endTime = startDate.toISOString();
    }
    
    const eventData = {
      accountId: args.account_id,
      calendarId: args.calendar_id,
      title: args.title,
      start: args.start_time,
      end: endTime,
      description: args.description,
      location: args.location,
      timeZone: args.time_zone || 'UTC',
    };
    
    const createdEvent = await this.apiClient.createEvent(eventData);
    
    const content = `✅ Event created successfully!\n\n${formatEvent(createdEvent)}`;
    
    return {
      content: [{
        type: 'text',
        text: content,
      }],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`${SERVER_NAME} MCP server running on stdio`);
  }
}

// Tool schemas for the manifest
const toolSchemas = [
  {
    name: 'list_calendars',
    description: 'View all connected calendars',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'list_accounts',
    description: 'View connected calendar providers',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_today_events',
    description: 'Get today\'s events across all calendars',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_week_events',
    description: 'Get this week\'s events organized by day',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_events',
    description: 'Get events from specific calendars/dates',
    inputSchema: {
      type: 'object',
      properties: {
        calendar_ids: {
          type: 'string',
          description: 'Comma-separated calendar IDs'
        },
        start_date: {
          type: 'string',
          description: 'Start date (ISO format)'
        },
        end_date: {
          type: 'string',
          description: 'End date (ISO format)'
        },
        account_id: {
          type: 'string',
          description: 'Specific account ID (optional)'
        }
      },
      required: ['calendar_ids']
    }
  },
  {
    name: 'search_events',
    description: 'Search events by title/description/location',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query'
        },
        start_date: {
          type: 'string',
          description: 'Search start date (optional)'
        },
        end_date: {
          type: 'string',
          description: 'Search end date (optional)'
        },
        max_results: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          description: 'Maximum results (default: 20)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'create_event',
    description: 'Create new calendar events',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: {
          type: 'string',
          description: 'Account ID for the calendar'
        },
        calendar_id: {
          type: 'string',
          description: 'Target calendar ID'
        },
        title: {
          type: 'string',
          description: 'Event title'
        },
        start_time: {
          type: 'string',
          description: 'Start time (ISO format)'
        },
        end_time: {
          type: 'string',
          description: 'End time (optional, defaults to +1 hour)'
        },
        description: {
          type: 'string',
          description: 'Event description (optional)'
        },
        location: {
          type: 'string',
          description: 'Event location (optional)'
        },
        time_zone: {
          type: 'string',
          description: 'Time zone (optional, defaults to UTC)'
        }
      },
      required: ['account_id', 'calendar_id', 'title', 'start_time']
    }
  }
];

// Main entry point
if (require.main === module) {
  const server = new MorgenMCPServer();
  server.run().catch(console.error);
}

module.exports = { MorgenMCPServer, toolSchemas };