// Test suite for Morgen Calendar MCP Extension

// Mock fetch globally
global.fetch = createMockFetch();

// Mock environment
process.env.MORGEN_API_KEY = 'test-api-key-123';

const MorgenAPIClient = require('../src/morgen-api-client.js');
const { MorgenMCPServer, toolSchemas } = require('../src/index.js');

// Mock API responses
const mockResponses = {
  '/calendars/list': {
    data: {
      calendars: [
        {
          id: 'cal-1',
          name: 'Personal Calendar',
          accountId: 'acc-1',
          color: '#1E88E5',
          timeZone: 'America/New_York',
          mimeType: 'application/calendar'
        },
        {
          id: 'cal-2',
          name: 'Work Calendar',
          accountId: 'acc-2',
          color: '#4CAF50',
          timeZone: 'America/New_York',
          mimeType: 'application/calendar'
        }
      ]
    }
  },
  '/integrations/accounts/list': {
    data: {
      accounts: [
        {
          id: 'acc-1',
          integrationId: 'google',
          email: 'user@gmail.com'
        },
        {
          id: 'acc-2',
          integrationId: 'o365',
          email: 'user@outlook.com'
        }
      ]
    }
  },
  '/events/list': {
    data: {
      events: [
        {
          id: 'evt-1',
          uid: 'uid-1',
          calendarId: 'cal-1',
          accountId: 'acc-1',
          title: 'Team Meeting',
          description: 'Weekly team sync',
          location: 'Conference Room A',
          start: new Date().toISOString(),
          end: new Date(Date.now() + 3600000).toISOString(),
          timeZone: 'America/New_York'
        },
        {
          id: 'evt-2',
          uid: 'uid-2',
          calendarId: 'cal-2',
          accountId: 'acc-2',
          title: 'Client Review',
          description: 'Quarterly review with ABC Corp',
          start: new Date(Date.now() + 7200000).toISOString(),
          end: new Date(Date.now() + 10800000).toISOString(),
          timeZone: 'America/New_York'
        },
        {
          id: 'evt-3',
          uid: 'uid-3',
          calendarId: 'cal-1',
          accountId: 'acc-1',
          title: 'Busy (via Morgen)',
          description: 'Duplicate busy time sync',
          start: new Date(Date.now() + 14400000).toISOString(),
          end: new Date(Date.now() + 18000000).toISOString(),
          timeZone: 'America/New_York'
        }
      ]
    }
  },
  '/events/create': {
    data: {
      event: {
        id: 'evt-new',
        uid: 'uid-new',
        calendarId: 'cal-1',
        accountId: 'acc-1',
        title: 'New Event',
        description: 'Test event creation',
        start: new Date(Date.now() + 86400000).toISOString(),
        end: new Date(Date.now() + 90000000).toISOString(),
        timeZone: 'UTC'
      }
    }
  }
};

// Create mock fetch function
function createMockFetch() {
  return async (url, options = {}) => {
    // Extract endpoint from URL
    const urlObj = new URL(url);
    const endpoint = urlObj.pathname.replace('/v3', '');
    
    // Remove query parameters for matching
    const baseEndpoint = endpoint.split('?')[0];
    
    // Check if this is a valid endpoint
    const responseData = mockResponses[baseEndpoint];
    
    if (!responseData) {
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Endpoint not found' })
      };
    }
    
    // Check authorization
    const authHeader = options.headers?.['Authorization'];
    if (!authHeader || !authHeader.includes('test-api-key')) {
      return {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid API key' })
      };
    }
    
    // For /events/list endpoint, filter events by account if accountId is provided
    if (baseEndpoint === '/events/list') {
      const params = urlObj.searchParams;
      const accountId = params.get('accountId');
      
      if (accountId) {
        // Filter events by the specified accountId
        const filteredEvents = responseData.data.events.filter(event => event.accountId === accountId);
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({
            data: {
              events: filteredEvents
            }
          })
        };
      }
      // If no accountId, return all events (for backwards compatibility)
    }
    
    // Return successful response
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => responseData
    };
  };
}

// Test runner
async function runTests() {
  let passed = 0;
  let failed = 0;
  
  const tests = [
    testAPIClient,
    testListCalendars,
    testListAccounts,
    testGetEvents,
    testCreateEvent,
    testSearchEvents,
    testToolSchemas,
    testErrorHandling
  ];
  
  console.log('🧪 Running Morgen Calendar Extension Tests\n');
  
  for (const test of tests) {
    try {
      await test();
      passed++;
      console.log(`✅ ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`❌ ${test.name}: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Individual test functions
async function testAPIClient() {
  const client = new MorgenAPIClient('test-api-key-123');
  
  // Test list calendars
  const calendars = await client.listCalendars();
  if (calendars.length !== 2) {
    throw new Error(`Expected 2 calendars, got ${calendars.length}`);
  }
  
  // Test list accounts
  const accounts = await client.listAccounts();
  if (accounts.length !== 2) {
    throw new Error(`Expected 2 accounts, got ${accounts.length}`);
  }
}

async function testListCalendars() {
  const client = new MorgenAPIClient('test-api-key-123');
  const calendars = await client.listCalendars();
  
  // Verify calendar structure
  const cal = calendars[0];
  if (!cal.id || !cal.name || !cal.accountId) {
    throw new Error('Calendar missing required fields');
  }
}

async function testListAccounts() {
  const client = new MorgenAPIClient('test-api-key-123');
  const accounts = await client.listAccounts();
  
  // Verify account structure
  const acc = accounts[0];
  if (!acc.id || !acc.integrationId || !acc.email) {
    throw new Error('Account missing required fields');
  }
}

async function testGetEvents() {
  const client = new MorgenAPIClient('test-api-key-123');
  const events = await client.listEvents();
  
  // Should return 2 events (the 3rd is filtered out as "Busy (via Morgen)")
  if (events.length !== 2) {
    throw new Error(`Expected 2 events, got ${events.length}`);
  }
  
  // Verify that no "Busy (via Morgen)" events are returned
  const busyEvents = events.filter(event => event.title === 'Busy (via Morgen)');
  if (busyEvents.length > 0) {
    throw new Error('Busy (via Morgen) events should be filtered out');
  }
  
  // Test today's events
  const todayEvents = await client.getTodayEvents();
  if (!Array.isArray(todayEvents)) {
    throw new Error('getTodayEvents should return an array');
  }
  
  // Test week events
  const weekEvents = await client.getWeekEvents();
  if (!Array.isArray(weekEvents)) {
    throw new Error('getWeekEvents should return an array');
  }
}

async function testCreateEvent() {
  const client = new MorgenAPIClient('test-api-key-123');
  
  const eventData = {
    accountId: 'acc-1',
    calendarId: 'cal-1',
    title: 'New Event',
    start: new Date(Date.now() + 86400000).toISOString(),
    end: new Date(Date.now() + 90000000).toISOString(),
    description: 'Test event creation',
    timeZone: 'UTC'
  };
  
  const created = await client.createEvent(eventData);
  if (!created.id || created.title !== 'New Event') {
    throw new Error('Event creation failed');
  }
}

async function testSearchEvents() {
  const client = new MorgenAPIClient('test-api-key-123');
  
  // Search for "team"
  const results = await client.searchEvents('team');
  if (results.length !== 1 || !results[0].title.toLowerCase().includes('team')) {
    throw new Error('Search results incorrect');
  }
  
  // Search with max results
  const limited = await client.searchEvents('meeting', { max_results: 1 });
  if (limited.length > 1) {
    throw new Error('Max results not respected');
  }
}

async function testToolSchemas() {
  // Verify all tools have proper schemas
  const requiredTools = [
    'list_calendars',
    'list_accounts',
    'get_today_events',
    'get_week_events',
    'get_events',
    'search_events',
    'create_event'
  ];
  
  const toolNames = toolSchemas.map(t => t.name);
  
  for (const required of requiredTools) {
    if (!toolNames.includes(required)) {
      throw new Error(`Missing required tool: ${required}`);
    }
  }
  
  // Verify schema structure
  for (const tool of toolSchemas) {
    if (!tool.name || !tool.description || !tool.inputSchema) {
      throw new Error(`Tool ${tool.name} missing required schema fields`);
    }
    
    if (tool.inputSchema.type !== 'object') {
      throw new Error(`Tool ${tool.name} input schema must be object type`);
    }
  }
}

async function testErrorHandling() {
  // Test with invalid API key
  const badClient = new MorgenAPIClient('invalid-key');
  
  try {
    await badClient.listCalendars();
    throw new Error('Should have thrown error for invalid API key');
  } catch (error) {
    if (!error.message.includes('401')) {
      throw new Error('Unexpected error for invalid API key');
    }
  }
  
  // Test network error
  global.fetch = async () => {
    throw new Error('Network failure');
  };
  
  try {
    await badClient.listCalendars();
    throw new Error('Should have thrown network error');
  } catch (error) {
    if (!error.message.includes('Network error')) {
      throw new Error('Unexpected error for network failure');
    }
  }
  
  // Restore mock fetch
  global.fetch = createMockFetch();
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, mockResponses };