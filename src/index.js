#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
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

// Extensive logging to debug
console.error('=== MORGEN CALENDAR MCP SERVER STARTING ===');
console.error('Node version:', process.version);

// Create server with minimal configuration
console.error('Creating MCP server...');
const server = new Server(
  {
    name: 'morgen-calendar',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

console.error('Server created successfully');

// Initialize API client
let apiClient = null;
const apiKey = process.env.MORGEN_API_KEY;
console.error(`API Key status: ${apiKey ? 'Found' : 'NOT FOUND'}`);

if (apiKey) {
  try {
    apiClient = new MorgenAPIClient(apiKey);
    console.error('API client initialized successfully');
  } catch (error) {
    console.error('Error initializing API client:', error);
    apiClient = null;
  }
} else {
  console.error('Warning: MORGEN_API_KEY not set, tools will return error messages');
}

// Tool schemas following the exact hello-world pattern
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

console.error('Setting up request handlers...');

// Handler for listing available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('ListTools request received');
  return {
    tools: toolSchemas,
  };
});

// Handler for calling tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  console.error(`Tool call received: ${name}`, args);
  
  // Check if API client is available
  if (!apiClient) {
    console.error('API client not available - returning error message');
    return {
      content: [{
        type: 'text',
        text: 'API key not configured. Please set MORGEN_API_KEY in Claude Desktop extension settings.',
      }],
    };
  }
  
  try {
    switch (name) {
      case 'list_calendars':
        console.error('Handling list_calendars tool call');
        const calendars = await apiClient.listCalendars();
        const calendarContent = calendars.length > 0
          ? `Found ${calendars.length} calendar(s):\n\n${calendars.map(cal => formatCalendar(cal)).join('\n\n')}`
          : 'No calendars found. Please connect your calendars at https://platform.morgen.so';
        
        return {
          content: [{
            type: 'text',
            text: calendarContent,
          }],
        };
        
      case 'list_accounts':
        console.error('Handling list_accounts tool call');
        const accounts = await apiClient.listAccounts();
        const accountContent = accounts.length > 0
          ? `Connected ${accounts.length} account(s):\n\n${accounts.map(acc => formatAccount(acc)).join('\n\n')}`
          : 'No accounts connected. Please connect your calendar accounts at https://platform.morgen.so';
        
        return {
          content: [{
            type: 'text',
            text: accountContent,
          }],
        };
        
      case 'get_today_events':
        console.error('Handling get_today_events tool call');
        const todayEvents = await apiClient.getTodayEvents();
        const today = new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        
        const todayContent = todayEvents.length > 0
          ? `📅 Today's Schedule (${today}) - ${todayEvents.length} event(s):\n\n${todayEvents.map((event, i) => `${i + 1}. ${formatEvent(event)}`).join('\n\n')}`
          : `📅 No events scheduled for today (${today})`;
        
        return {
          content: [{
            type: 'text',
            text: todayContent,
          }],
        };
        
      case 'get_week_events':
        console.error('Handling get_week_events tool call');
        const weekEvents = await apiClient.getWeekEvents();
        const weekContent = weekEvents.length > 0
          ? `📅 This Week's Schedule - ${weekEvents.length} event(s):${formatEventsByDay(weekEvents)}`
          : '📅 No events scheduled for this week';
        
        return {
          content: [{
            type: 'text',
            text: weekContent,
          }],
        };
        
      case 'get_events':
        console.error('Handling get_events tool call');
        if (!args.calendar_ids) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'calendar_ids parameter is required'
          );
        }
        
        const eventParams = {
          calendarIds: args.calendar_ids,
          start: args.start_date,
          end: args.end_date,
          accountId: args.account_id,
        };
        
        const events = await apiClient.listEvents(eventParams);
        const eventsContent = events.length > 0
          ? `📅 Found ${events.length} event(s):\n\n${events.map((event, i) => `${i + 1}. ${formatEvent(event)}`).join('\n\n')}`
          : '📅 No events found for the specified criteria';
        
        return {
          content: [{
            type: 'text',
            text: eventsContent,
          }],
        };
        
      case 'search_events':
        console.error('Handling search_events tool call');
        if (!args.query) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'query parameter is required'
          );
        }
        
        const searchOptions = {
          start_date: args.start_date,
          end_date: args.end_date,
          max_results: args.max_results,
        };
        
        const searchResults = await apiClient.searchEvents(args.query, searchOptions);
        const searchContent = searchResults.length > 0
          ? `🔍 Found ${searchResults.length} event(s) matching '${args.query}':\n\n${searchResults.map((event, i) => `${i + 1}. ${formatEvent(event)}`).join('\n\n')}`
          : `🔍 No events found matching '${args.query}'`;
        
        return {
          content: [{
            type: 'text',
            text: searchContent,
          }],
        };
        
      case 'create_event':
        console.error('Handling create_event tool call');
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
        
        const createdEvent = await apiClient.createEvent(eventData);
        const createContent = `✅ Event created successfully!\n\n${formatEvent(createdEvent)}`;
        
        return {
          content: [{
            type: 'text',
            text: createContent,
          }],
        };
        
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    console.error(`Error in tool ${name}:`, error);
    
    if (error instanceof McpError) {
      throw error;
    }
    
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

console.error('Request handlers set up');

// Main function to start server
async function main() {
  console.error('Starting main function...');
  
  const transport = new StdioServerTransport();
  console.error('Transport created');
  
  try {
    console.error('Connecting server to transport...');
    await server.connect(transport);
    console.error('Morgen Calendar MCP server running on stdio');
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

// Error handlers
process.on('uncaughtException', (error) => {
  console.error('=== UNCAUGHT EXCEPTION ===');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('=== UNHANDLED REJECTION ===');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
console.error('About to call main()...');
main().catch((error) => {
  console.error('=== MAIN FUNCTION ERROR ===');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

console.error('=== MORGEN CALENDAR MCP SERVER SETUP COMPLETE ===');

module.exports = { toolSchemas };