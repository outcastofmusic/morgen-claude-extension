#!/usr/bin/env node

/**
 * Integration Test Suite for Morgen API Client
 * 
 * This file tests all endpoints against the real Morgen API using a real API key.
 * Run with: npm run test:integration
 * 
 * Requires MORGEN_API_KEY environment variable (can be set in .env file)
 */

const dotenv = require('dotenv');
const MorgenAPIClient = require('../src/morgen-api-client.js');

// Load environment variables from .env file
dotenv.config();

// Test configuration
const TEST_CONFIG = {
  apiKey: process.env.MORGEN_API_KEY,
  verbose: process.env.TEST_VERBOSE === 'true',
  timeout: 30000 // 30 seconds
};

class IntegrationTestRunner {
  constructor() {
    this.testResults = [];
    this.client = null;
  }

  log(message, level = 'info') {
    if (TEST_CONFIG.verbose || level === 'error') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    }
  }

  async runTest(testName, testFunction) {
    this.log(`Running test: ${testName}`);
    const startTime = Date.now();
    
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      this.testResults.push({ name: testName, status: 'PASS', duration });
      this.log(`✅ ${testName} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({ name: testName, status: 'FAIL', duration, error: error.message });
      this.log(`❌ ${testName} (${duration}ms): ${error.message}`, 'error');
    }
    
    // Add delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
  }

  async setup() {
    this.log('Setting up integration tests...');
    
    if (!TEST_CONFIG.apiKey) {
      throw new Error('MORGEN_API_KEY environment variable is required. Please set it in .env file or environment.');
    }
    
    this.client = new MorgenAPIClient(TEST_CONFIG.apiKey);
    this.log('API client initialized');
  }

  async testListCalendars() {
    const calendars = await this.client.listCalendars();
    
    if (!Array.isArray(calendars)) {
      throw new Error('Expected calendars to be an array');
    }
    
    this.log(`Found ${calendars.length} calendars`);
    
    if (calendars.length > 0) {
      const firstCalendar = calendars[0];
      const requiredFields = ['id', 'name'];
      
      for (const field of requiredFields) {
        if (!(field in firstCalendar)) {
          throw new Error(`Calendar missing required field: ${field}`);
        }
      }
      
      this.log(`Sample calendar: ${firstCalendar.name} (${firstCalendar.id})`);
    }
  }

  async testListAccounts() {
    const accounts = await this.client.listAccounts();
    
    if (!Array.isArray(accounts)) {
      throw new Error('Expected accounts to be an array');
    }
    
    this.log(`Found ${accounts.length} connected accounts`);
    
    if (accounts.length > 0) {
      const firstAccount = accounts[0];
      this.log(`Sample account fields: ${Object.keys(firstAccount).join(', ')}`);
      
      // Check for either email or identifier field (more flexible)
      if (!firstAccount.id) {
        throw new Error('Account missing required field: id');
      }
      
      const identifier = firstAccount.email || firstAccount.identifier || firstAccount.name || 'Unknown';
      const provider = firstAccount.provider || firstAccount.type || 'Unknown';
      this.log(`Sample account: ${identifier} (${provider})`);
    }
  }

  async testGetTodayEvents() {
    const events = await this.client.getTodayEvents();
    
    if (!Array.isArray(events)) {
      throw new Error('Expected events to be an array');
    }
    
    this.log(`Found ${events.length} events for today`);
    
    if (events.length > 0) {
      const firstEvent = events[0];
      const requiredFields = ['id', 'title', 'start'];
      
      for (const field of requiredFields) {
        if (!(field in firstEvent)) {
          throw new Error(`Event missing required field: ${field}`);
        }
      }
      
      this.log(`Sample event: ${firstEvent.title} at ${firstEvent.start}`);
    }
  }

  async testGetWeekEvents() {
    const weekEvents = await this.client.getWeekEvents();
    
    // Expected format: { "Monday": [...events], "Tuesday": [...events], etc }
    if (typeof weekEvents !== 'object' || weekEvents === null || Array.isArray(weekEvents)) {
      throw new Error('Expected week events to be an object organized by day names');
    }
    
    const days = Object.keys(weekEvents);
    this.log(`Found events organized for ${days.length} days this week`);
    
    for (const day of days) {
      if (!Array.isArray(weekEvents[day])) {
        throw new Error(`Expected events for ${day} to be an array`);
      }
      this.log(`${day}: ${weekEvents[day].length} events`);
    }
    
    // Validate day names are reasonable
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const hasValidDays = days.some(day => validDays.includes(day));
    if (days.length > 0 && !hasValidDays) {
      this.log(`Warning: Expected day names like Monday, Tuesday, etc. Got: ${days.join(', ')}`);
    }
  }

  async testGetEvents() {
    // Test with current date range
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const events = await this.client.getEvents({
      startDate: now.toISOString(),
      endDate: tomorrow.toISOString(),
      calendarIds: 'all'
    });
    
    if (!Array.isArray(events)) {
      throw new Error('Expected events to be an array');
    }
    
    this.log(`Found ${events.length} events in date range`);
    
    // Test with calendar filter
    const calendars = await this.client.listCalendars();
    console.log('calendars', calendars);
    if (calendars.length > 0) {
      const calendarIds = calendars.slice(0,2).map(calendar => calendar.id).join(',');
      console.log('calendar', calendars[0])
      const filteredEvents = await this.client.getEvents({
        accountId: calendars[0].accountId,
        startDate: now.toISOString(),
        endDate: tomorrow.toISOString(),
        calendarIds: calendarIds
      });
      
      if (!Array.isArray(filteredEvents)) {
        throw new Error('Expected filtered events to be an array');
      }
      
      this.log(`Found ${filteredEvents.length} events for specific calendar`);
    }
  }

  async testSearchEvents() {
    // Test search with a simple term and limited date range to reduce API calls
    const searchTerm = 'meeting';
    
    try {
      // Limit search to last 7 days to reduce API load
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const results = await this.client.searchEvents(searchTerm, {
        startDate: weekAgo.toISOString(),
        endDate: now.toISOString(),
        maxResults: 10
      });
      
      if (!Array.isArray(results)) {
        throw new Error(`Expected search results for "${searchTerm}" to be an array`);
      }
      
      this.log(`Search for "${searchTerm}" (last 7 days): ${results.length} results`);
      
      // Verify search results contain the term (check first 3 only)
      for (const event of results.slice(0, 3)) {
        const searchableText = `${event.title} ${event.description || ''} ${event.location || ''}`.toLowerCase();
        if (!searchableText.includes(searchTerm.toLowerCase())) {
          this.log(`Warning: Search result "${event.title}" doesn't contain "${searchTerm}"`);
        }
      }
    } catch (error) {
      if (error.message.includes('429')) {
        this.log('Rate limited during search - this is expected with heavy API usage');
        throw new Error('Search test skipped due to rate limiting');
      }
      throw error;
    }
  }

  async testCreateEvent() {
    const now = new Date();
    const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 minutes duration
    
    // Get calendars to use the first available one
    const calendars = await this.client.listCalendars();
    if (calendars.length === 0) {
      throw new Error('No calendars available for testing event creation');
    }
    
    const testEvent = {
      title: `Integration Test Event - ${now.toISOString().split('T')[0]}`,
      description: 'This is a test event created by the integration test suite. It can be safely deleted.',
      startDate: startTime.toISOString(),
      endDate: endTime.toISOString(),
      calendarId: calendars[0].id,
      timeZone: 'UTC'
    };
    
    this.log(`Creating test event: ${testEvent.title}`);
    this.log(`Event data: ${JSON.stringify(testEvent, null, 2)}`);
    
    try {
      const result = await this.client.createEvent(testEvent);
      
      if (!result || !result.id) {
        throw new Error('Event creation did not return a valid result with ID');
      }
      
      this.log(`✅ Created event with ID: ${result.id}`);
      this.log(`⚠️  Please manually delete the test event: "${testEvent.title}"`);
    } catch (error) {
      this.log(`Event creation failed with error: ${error.message}`);
      if (error.message.includes('400')) {
        this.log('This might be due to incorrect date format or missing required fields');
      }
      throw error;
    }
  }

  async testErrorHandling() {
    // Test with invalid API key
    const invalidClient = new MorgenAPIClient('invalid-key-123');
    
    try {
      await invalidClient.listCalendars();
      throw new Error('Expected API call with invalid key to fail');
    } catch (error) {
      if (error.message.includes('Expected API call')) {
        throw error; // Re-throw our test error
      }
      // Expected authentication error
      this.log(`Correctly handled invalid API key: ${error.message}`);
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('INTEGRATION TEST SUMMARY');
    console.log('='.repeat(60));
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const total = this.testResults.length;
    
    console.log(`Total tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\nFAILED TESTS:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`❌ ${r.name}: ${r.error}`);
        });
    }
    
    console.log('\nDETAILED RESULTS:');
    this.testResults.forEach(r => {
      const status = r.status === 'PASS' ? '✅' : '❌';
      console.log(`${status} ${r.name} (${r.duration}ms)`);
    });
    
    console.log('='.repeat(60));
    
    return failed === 0;
  }

  async run() {
    console.log('🚀 Starting Morgen API Integration Tests\n');
    
    try {
      await this.setup();
      
      // Run all integration tests
      await this.runTest('List Calendars', () => this.testListCalendars());
      await this.runTest('List Accounts', () => this.testListAccounts());
      await this.runTest('Get Today Events', () => this.testGetTodayEvents());
      await this.runTest('Get Week Events', () => this.testGetWeekEvents());
      await this.runTest('Get Events with Filters', () => this.testGetEvents());
      await this.runTest('Search Events', () => this.testSearchEvents());
      await this.runTest('Create Event', () => this.testCreateEvent());
      await this.runTest('Error Handling', () => this.testErrorHandling());
      
    } catch (error) {
      console.error('❌ Test setup failed:', error.message);
      process.exit(1);
    }
    
    const success = this.printSummary();
    process.exit(success ? 0 : 1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new IntegrationTestRunner();
  runner.run().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { IntegrationTestRunner };