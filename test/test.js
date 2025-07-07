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
        },
        {
          id: 'evt-4',
          uid: 'uid-4',
          calendarId: 'cal-2',
          accountId: 'acc-2',
          title: 'Untitled Event',
          description: '',
          start: new Date(Date.now() + 21600000).toISOString(),
          end: new Date(Date.now() + 25200000).toISOString(),
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
    testEventFiltering,
    testToolSchemas,
    testErrorHandling,
    testCaching,
    testGetEventsAllCalendars,
    testGetEventsValidation,
    testBase64CalendarIds,
    testToolSchemaUpdates
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
  
  // Should return 2 events (3rd and 4th are filtered out as "Busy (via Morgen)" and "Untitled Event")
  if (events.length !== 2) {
    throw new Error(`Expected 2 events, got ${events.length}`);
  }
  
  // Verify that no "Busy (via Morgen)" events are returned
  const busyEvents = events.filter(event => event.title === 'Busy (via Morgen)');
  if (busyEvents.length > 0) {
    throw new Error('Busy (via Morgen) events should be filtered out');
  }
  
  // Verify that no "Untitled Event" events are returned
  const untitledEvents = events.filter(event => event.title === 'Untitled Event');
  if (untitledEvents.length > 0) {
    throw new Error('Untitled Event events should be filtered out');
  }
  
  // Test today's events
  const todayEvents = await client.getTodayEvents();
  if (!Array.isArray(todayEvents)) {
    throw new Error('getTodayEvents should return an array');
  }
  
  // Test week events
  const weekEvents = await client.getWeekEvents();
  if (typeof weekEvents !== 'object' || weekEvents === null) {
    throw new Error('getWeekEvents should return an object organized by day');
  }
  
  // Test "all" calendar IDs
  const allCalendarEvents = await client.listEvents({ calendarIds: 'all' });
  if (!Array.isArray(allCalendarEvents)) {
    throw new Error('listEvents with "all" should return an array');
  }
  if (allCalendarEvents.length !== 2) {
    throw new Error(`Expected 2 events with "all" calendars, got ${allCalendarEvents.length}`);
  }
  
  // Test "all" with date range
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const allWithDate = await client.listEvents({ 
    calendarIds: 'all', 
    start: tomorrow.toISOString(),
    end: tomorrow.toISOString()
  });
  if (!Array.isArray(allWithDate)) {
    throw new Error('listEvents with "all" and date range should return an array');
  }
}

async function testCreateEvent() {
  const client = new MorgenAPIClient('test-api-key-123');
  
  const eventData = {
    calendarId: 'cal-1',
    title: 'New Event',
    startDate: new Date(Date.now() + 86400000).toISOString(),
    endDate: new Date(Date.now() + 90000000).toISOString(),
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
  const limited = await client.searchEvents('meeting', { maxResults: 1 });
  if (limited.length > 1) {
    throw new Error('Max results not respected');
  }
}

async function testEventFiltering() {
  const client = new MorgenAPIClient('test-api-key-123');
  
  // Test that filtered events are excluded from all methods
  const allEvents = await client.listEvents();
  
  // Verify no filtered events in results
  const busyEvents = allEvents.filter(event => event.title === 'Busy (via Morgen)');
  const untitledEvents = allEvents.filter(event => event.title === 'Untitled Event');
  
  if (busyEvents.length > 0) {
    throw new Error('listEvents should filter out "Busy (via Morgen)" events');
  }
  
  if (untitledEvents.length > 0) {
    throw new Error('listEvents should filter out "Untitled Event" events');
  }
  
  // Test search filtering
  const searchResults = await client.searchEvents('event'); // Should match "Untitled Event" but it should be filtered
  const searchUntitled = searchResults.filter(event => event.title === 'Untitled Event');
  const searchBusy = searchResults.filter(event => event.title === 'Busy (via Morgen)');
  
  if (searchUntitled.length > 0) {
    throw new Error('searchEvents should filter out "Untitled Event" events');
  }
  
  if (searchBusy.length > 0) {
    throw new Error('searchEvents should filter out "Busy (via Morgen)" events');
  }
  
  // Verify we still get valid events
  if (allEvents.length !== 2) {
    throw new Error(`Expected 2 valid events after filtering, got ${allEvents.length}`);
  }
  
  // Verify the returned events are the expected ones
  const eventTitles = allEvents.map(event => event.title).sort();
  const expectedTitles = ['Client Review', 'Team Meeting'];
  
  if (JSON.stringify(eventTitles) !== JSON.stringify(expectedTitles)) {
    throw new Error(`Expected events [${expectedTitles.join(', ')}], got [${eventTitles.join(', ')}]`);
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

async function testCaching() {
  const client = new MorgenAPIClient('test-api-key-123');
  
  // Test cache functionality by checking if data is cached
  let fetchCallCount = 0;
  const originalFetch = global.fetch;
  
  global.fetch = async (...args) => {
    fetchCallCount++;
    return originalFetch(...args);
  };
  
  // First call should make network request
  await client.listCalendars();
  const firstCallCount = fetchCallCount;
  
  // Second call should use cache
  await client.listCalendars();
  const secondCallCount = fetchCallCount;
  
  // Should not have made additional network calls
  if (secondCallCount !== firstCallCount) {
    throw new Error(`Caching not working: expected ${firstCallCount} calls, got ${secondCallCount}`);
  }
  
  // Test cache stats
  const stats = client.getCacheStats();
  if (!stats || typeof stats.size !== 'number') {
    throw new Error('Cache stats not working');
  }
  
  // Test cache invalidation after event creation
  const eventData = {
    calendarId: 'cal-1',
    title: 'Cache Test Event',
    startDate: new Date(Date.now() + 86400000).toISOString(),
    endDate: new Date(Date.now() + 90000000).toISOString()
  };
  
  // Get events to populate cache
  await client.getTodayEvents();
  const statsBefore = client.getCacheStats();
  
  // Create event (should invalidate event caches)
  await client.createEvent(eventData);
  const statsAfter = client.getCacheStats();
  
  // Event caches should be cleared, but calendar/account caches should remain
  if (statsAfter.size >= statsBefore.size) {
    throw new Error('Cache invalidation not working properly');
  }
  
  // Restore original fetch
  global.fetch = originalFetch;
}

async function testGetEventsAllCalendars() {
  const client = new MorgenAPIClient('test-api-key-123');
  
  // Test the exact failing scenario from Claude
  const params = {
    endDate: '2025-07-02T23:59:59.999Z',
    startDate: '2025-07-02T00:00:00.000Z',
    calendarIds: 'all',
    accountId: 'acc-1'
  };
  
  try {
    const events = await client.getEvents(params);
    
    // Should return an array
    if (!Array.isArray(events)) {
      throw new Error('getEvents should return an array');
    }
    
    // Should filter out "Busy (via Morgen)" and "Untitled Event" events
    const busyEvents = events.filter(event => event.title === 'Busy (via Morgen)');
    if (busyEvents.length > 0) {
      throw new Error('Should filter out "Busy (via Morgen)" events');
    }
    
    const untitledEvents = events.filter(event => event.title === 'Untitled Event');
    if (untitledEvents.length > 0) {
      throw new Error('Should filter out "Untitled Event" events');
    }
    
    // Test with specific calendar IDs as string
    const specificParams = {
      endDate: '2025-07-02T23:59:59.999Z',
      startDate: '2025-07-02T00:00:00.000Z',
      calendarIds: 'cal-1,cal-2'
    };
    
    const specificEvents = await client.getEvents(specificParams);
    if (!Array.isArray(specificEvents)) {
      throw new Error('getEvents with specific calendar_ids should return an array');
    }
    
    // Test with calendar IDs as array
    const arrayParams = {
      endDate: '2025-07-02T23:59:59.999Z',
      startDate: '2025-07-02T00:00:00.000Z',
      calendarIds: ['cal-1', 'cal-2']
    };
    
    const arrayEvents = await client.getEvents(arrayParams);
    if (!Array.isArray(arrayEvents)) {
      throw new Error('getEvents with array calendar_ids should return an array');
    }
    
  } catch (error) {
    throw new Error(`Failed exact Claude scenario: ${error.message}`);
  }
}

async function testGetEventsValidation() {
  const client = new MorgenAPIClient('test-api-key-123');
  
  // Test the problematic base64-encoded input from Claude
  const problematicParams = {
    endDate: '2025-07-02T23:59:59.999Z',
    startDate: '2025-07-02T00:00:00.000Z',
    calendarIds: ['cal-1', 'cal-2']
  };
  
  try {
    await client.getEvents(problematicParams);
    throw new Error('Should have thrown error for base64 encoded calendar_ids');
  } catch (error) {
    if (!error.message.includes('calendarIds must be a string')) {
      throw new Error(`Expected calendarIds must be a string error message, got: ${error.message}`);
    }
  }
  
  // Test JSON array string input (another common mistake)
  const jsonArrayParams = {
    endDate: '2025-07-02T23:59:59.999Z',
    startDate: '2025-07-02T00:00:00.000Z',
    calendarIds: '["cal-1","cal-2"]'
  };
  
  try {
    await client.getEvents(jsonArrayParams);
    throw new Error('Should have thrown error for JSON array string calendar_ids');
  } catch (error) {
    if (!error.message.includes('JSON array string')) {
      throw new Error(`Expected JSON array error message, got: ${error.message}`);
    }
  }
  
  // Test empty calendar_ids
  const emptyParams = {
    endDate: '2025-07-02T23:59:59.999Z',
    startDate: '2025-07-02T00:00:00.000Z',
    calendarIds: null
  };
  
  try {
    await client.getEvents(emptyParams);
    throw new Error('Should have thrown error for empty calendar_ids');
  } catch (error) {
    if (!error.message.includes('startDate, endDate, and calendarIds are required')) {
      throw new Error(`Expected startDate, endDate, and calendarIds are required error message, got: ${error.message}`);
    }
  }
  
  // Test that valid comma-separated input works
  const validParams = {
    endDate: '2025-07-02T23:59:59.999Z',
    startDate: '2025-07-02T00:00:00.000Z',
    calendarIds: 'cal-1,cal-2'
  };
  
  const events = await client.getEvents(validParams);
  if (!Array.isArray(events)) {
    throw new Error('Valid calendar_ids should return events array');
  }
}

async function testBase64CalendarIds() {
  const client = new MorgenAPIClient('test-api-key-123');
  
  // Test the exact base64-encoded calendar IDs that Claude Desktop was sending
  const base64CalendarIds = 'WyI2ODAyMmM5OGRjY2JmMjk3NzU1MTFjY2YiLCJhLm9pa29ub21vdUBrYWl6ZW5nYW1pbmcuY29tIl0,WyI2ODAyMmNjMjllNWQwZDMwNWIzYWI1YzUiLCJhZ2lzLnBvZkBnbWFpbC5jb20iXQ,WyI2ODAyMmNjMjllNWQwZDMwNWIzYWI1YzUiLCJhZ2lzQG9pa29ub21vdS5lbmdpbmVlciJd';
  
  const claudeParams = {
    endDate: '2025-07-06',
    startDate: '2025-07-05',
    calendarIds: base64CalendarIds
  };
  
  try {
    // This should work now that we handle the base64 calendar IDs as-is
    const events = await client.getEvents(claudeParams);
    
    if (!Array.isArray(events)) {
      throw new Error('Expected events array for base64 calendar IDs');
    }
    
    // Should filter out "Busy (via Morgen)" and "Untitled Event" events
    const busyEvents = events.filter(event => event.title === 'Busy (via Morgen)');
    if (busyEvents.length > 0) {
      throw new Error('Should filter out "Busy (via Morgen)" events');
    }
    
    const untitledEvents = events.filter(event => event.title === 'Untitled Event');
    if (untitledEvents.length > 0) {
      throw new Error('Should filter out "Untitled Event" events');
    }
    
    // Test that we get the correct non-filtered events
    if (events.length !== 2) {
      throw new Error(`Expected 2 filtered events, got ${events.length}`);
    }
    
  } catch (error) {
    throw new Error(`Base64 calendar IDs test failed: ${error.message}`);
  }
}

async function testToolSchemaUpdates() {
  // Test that tool schemas reflect our changes - account_id should be optional
  const getEventsSchema = toolSchemas.find(t => t.name === 'get_events');
  const createEventSchema = toolSchemas.find(t => t.name === 'create_event');
  
  if (!getEventsSchema) {
    throw new Error('get_events schema not found');
  }
  
  if (!createEventSchema) {
    throw new Error('create_event schema not found');
  }
  
  // get_events should only require calendar_ids now
  const getEventsRequired = getEventsSchema.inputSchema.required;
  if (!getEventsRequired.includes('calendar_ids')) {
    throw new Error('get_events should require calendar_ids');
  }
  
  if (getEventsRequired.includes('account_id')) {
    throw new Error('get_events should not require account_id');
  }
  
  if (getEventsRequired.includes('start_date') || getEventsRequired.includes('end_date')) {
    throw new Error('get_events should not require start_date or end_date (can default to today)');
  }
  
  // create_event should not require account_id anymore
  const createEventRequired = createEventSchema.inputSchema.required;
  if (createEventRequired.includes('account_id')) {
    throw new Error('create_event should not require account_id (can be looked up from calendar_id)');
  }
  
  if (!createEventRequired.includes('calendar_id')) {
    throw new Error('create_event should require calendar_id');
  }
  
  if (!createEventRequired.includes('title')) {
    throw new Error('create_event should require title');
  }
  
  if (!createEventRequired.includes('start_time')) {
    throw new Error('create_event should require start_time');
  }
  
  // Test that account_id is still present as optional parameter
  const getEventsProperties = getEventsSchema.inputSchema.properties;
  const createEventProperties = createEventSchema.inputSchema.properties;
  
  if (!getEventsProperties.account_id) {
    throw new Error('get_events should have account_id as optional parameter');
  }
  
  if (!createEventProperties.account_id) {
    throw new Error('create_event should have account_id as optional parameter');
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, mockResponses };