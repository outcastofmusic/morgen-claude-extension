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
  getCurrentTimeString,
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
    description: 'Get events from calendars with flexible filtering options. Can get all events or filter by specific calendars, dates, and accounts.',
    inputSchema: {
      type: 'object',
      properties: {
        calendar_ids: {
          type: 'string',
          description: 'Calendar IDs to filter by. IMPORTANT: Use one of these exact formats:\n- "all" (for all calendars)\n- "cal-123" (single calendar ID)\n- "cal-123,cal-456,cal-789" (comma-separated list of calendar IDs)\nDO NOT use base64 encoding or arrays. Examples:\n✓ "all"\n✓ "68022c98dccbf29775511ccf"\n✓ "68022c98dccbf29775511ccf,68022cb09e5d0d305b3ab5c4"\n✗ WyI2ODAyMmM5OGRjY2JmMjk3NzU1MTFjY2YiXQ== (base64)\n✗ ["cal-1","cal-2"] (array)'
        },
        start_date: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format (e.g., "2025-07-02"). If only start_date is provided, gets events for that single day.'
        },
        end_date: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format (e.g., "2025-07-05"). Used with start_date to define a date range.'
        },
        account_id: {
          type: 'string',
          description: 'Provide a specific account ID. Use with specific calendar_ids, not with "all".'
        }
      },
      required: []
    }
  },
  {
    name: 'search_events',
    description: 'Search events by title/description/location across all calendars',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to match against event title, description, or location (e.g., "meeting", "standup", "lunch")'
        },
        start_date: {
          type: 'string',
          description: 'Search start date in YYYY-MM-DD format (optional, defaults to 30 days ago)'
        },
        end_date: {
          type: 'string',
          description: 'Search end date in YYYY-MM-DD format (optional, defaults to 30 days from now)'
        },
        max_results: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          description: 'Maximum number of results to return (default: 20)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'create_event',
    description: 'Create new calendar events. First use list_calendars and list_accounts to get the required IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: {
          type: 'string',
          description: 'Account ID for the calendar (get from list_accounts)'
        },
        calendar_id: {
          type: 'string',
          description: 'Target calendar ID (get from list_calendars)'
        },
        title: {
          type: 'string',
          description: 'Event title (e.g., "Team Meeting", "Lunch with John")'
        },
        start_time: {
          type: 'string',
          description: 'Start time in ISO format (e.g., "2025-07-02T15:30:00Z")'
        },
        end_time: {
          type: 'string',
          description: 'End time in ISO format (optional, defaults to +1 hour from start_time)'
        },
        description: {
          type: 'string',
          description: 'Event description (optional)'
        },
        location: {
          type: 'string',
          description: 'Event location (optional, e.g., "Conference Room A", "Zoom")'
        },
        time_zone: {
          type: 'string',
          description: 'Time zone (optional, defaults to UTC, e.g., "America/New_York")'
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
          ? `📅 Today's Schedule (${today}) - ${todayEvents.length} event(s):\n${getCurrentTimeString()}\n\n${todayEvents.map((event, i) => `${i + 1}. ${formatEvent(event)}`).join('\n\n')}`
          : `📅 No events scheduled for today (${today})\n${getCurrentTimeString()}`;
        
        return {
          content: [{
            type: 'text',
            text: todayContent,
          }],
        };
        
      case 'get_week_events':
        console.error('Handling get_week_events tool call');
        const weekEvents = await apiClient.getWeekEvents();
        
        // weekEvents is now an object organized by day names
        const allWeekEvents = Object.values(weekEvents).flat();
        const hasEvents = allWeekEvents.length > 0;
        
        let weekContent;
        if (hasEvents) {
          weekContent = `📅 This Week's Schedule - ${allWeekEvents.length} event(s):\n${getCurrentTimeString()}`;
          for (const [day, dayEvents] of Object.entries(weekEvents)) {
            if (dayEvents.length > 0) {
              weekContent += `\n\n**${day}** (${dayEvents.length} event${dayEvents.length !== 1 ? 's' : ''}):\n`;
              weekContent += formatEvents(dayEvents);
            }
          }
        } else {
          weekContent = `📅 No events scheduled for this week\n${getCurrentTimeString()}`;
        }
        
        return {
          content: [{
            type: 'text',
            text: weekContent,
          }],
        };
        
      case 'get_events':
        console.error('Handling get_events tool call');
        
        let eventParams = {};
        
        // Handle date parameters - use new getEvents method format
        if (args.start_date) {
          eventParams.start_date = `${args.start_date}T00:00:00.000Z`;
        }
        
        if (args.end_date) {
          eventParams.end_date = `${args.end_date}T23:59:59.999Z`;
        } else if (args.start_date && !args.end_date) {
          // If only start_date provided, use it as both start and end (single day)
          eventParams.end_date = `${args.start_date}T23:59:59.999Z`;
        }
        
        if (args.calendar_ids) {
          eventParams.calendar_ids = args.calendar_ids;
        }
        
        let events;
        
        // If no date parameters, get today's events
        if (!eventParams.start_date && !eventParams.end_date) {
          events = await apiClient.getTodayEvents();
        } else {
          try {
            events = await apiClient.getEvents(eventParams);
          } catch (error) {
            console.error('get_events error:', error.message);
            throw error;
          }
        }
        const eventsContent = events.length > 0
          ? `📅 Found ${events.length} event(s):\n${getCurrentTimeString()}\n\n${events.map((event, i) => `${i + 1}. ${formatEvent(event)}`).join('\n\n')}`
          : `📅 No events found for the specified criteria\n${getCurrentTimeString()}`;
        
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
        
        try {
          const searchResults = await apiClient.searchEvents(args.query, searchOptions);
          
          const searchContent = searchResults.length > 0
            ? `🔍 Found ${searchResults.length} event(s) matching '${args.query}':\n${getCurrentTimeString()}\n\n${searchResults.map((event, i) => `${i + 1}. ${formatEvent(event)}`).join('\n\n')}`
            : `🔍 No events found matching '${args.query}'\n${getCurrentTimeString()}\n\n` +
              `Searched in date range: ${searchOptions.start_date || 'last 30 days'} to ${searchOptions.end_date || 'next 30 days'}`;
          
          return {
            content: [{
              type: 'text',
              text: searchContent,
            }],
          };
        } catch (error) {
          // Provide helpful error message
          let errorMessage = `🔍 Search failed for '${args.query}': ${error.message}`;
          
          if (error.message.includes('No calendar accounts')) {
            errorMessage += '\n\nPlease connect your calendar accounts at https://platform.morgen.so';
          } else if (error.message.includes('No calendars available')) {
            errorMessage += '\n\nPlease add calendars to your connected accounts.';
          }
          
          return {
            content: [{
              type: 'text',
              text: errorMessage,
            }],
          };
        }
        
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