const SimpleCache = require('./cache.js');

class MorgenAPIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.morgen.so/v3';
    this.headers = {
      'Authorization': `ApiKey ${apiKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'MCP-Morgen-Extension/1.0'
    };
    
    // Initialize cache with custom settings
    this.cache = new SimpleCache({
      maxSize: 100,
      defaultTTL: 120 // 2 minutes default
    });
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: { ...this.headers, ...options.headers }
    };
    
    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = new Error(`API Error ${response.status}: ${response.statusText}`);
        error.status = response.status;
        
        // Try to parse error details from response
        try {
          const errorData = await response.json();
          error.details = errorData;
        } catch (e) {
          // If parsing fails, use the status text
        }
        
        throw error;
      }
      
      return response.json();
    } catch (error) {
      if (error.status) {
        // API error
        throw error;
      }
      // Network or other error
      throw new Error(`Network error: ${error.message}`);
    }
  }

  // Calendar methods
  async listCalendars() {
    const cacheKey = 'calendars';
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from API
    const response = await this.request('/calendars/list');
    const calendars = response.data?.calendars || [];
    
    // Cache for 1 hour (3600 seconds)
    this.cache.set(cacheKey, calendars, 3600);
    
    return calendars;
  }

  async listAccounts() {
    const cacheKey = 'accounts';
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from API
    const response = await this.request('/integrations/accounts/list');
    const accounts = response.data?.accounts || [];
    
    // Cache for 1 hour (3600 seconds)
    this.cache.set(cacheKey, accounts, 3600);
    
    return accounts;
  }
  
  // Event methods  
  async listEvents(params = {}) {
    // Handle the special "all" case by fetching all calendar IDs
    if (params.calendarIds === 'all' || params.calendarIds === 'ALL') {
      // For "all" calendars with date range, use getAllEventsInRange which handles multiple accounts properly
      if (params.start && params.end) {
        return await this.getAllEventsInRange(params.start, params.end);
      }
      
      // For "all" without specific dates, get all calendars and use their IDs
      const calendars = await this.listCalendars();
      if (calendars.length === 0) {
        throw new Error('No calendars available. Please add calendars to your connected accounts.');
      }
      
      // Replace "all" with actual calendar IDs
      params.calendarIds = calendars.map(cal => cal.id).join(',');
    }
    
    // // First try a simple call without parameters to test basic connectivity
    // if (Object.keys(params).length === 0) {
    //   try {
    //     const response = await this.request('/events/list');
    //     const events = response.data?.events || [];
        
    //     // Filter out "Busy (via Morgen)" and "Untitled Event" events
    //     const filtered = events.filter(event => 
    //       event.title !== 'Busy (via Morgen)' && 
    //       event.title !== 'Untitled Event'
    //     );
        
    //     return filtered;
    //   } catch (error) {
    //     throw error;
    //   }
    // }
    
    const queryParams = new URLSearchParams();
    
    // Use the exact parameter names that the Morgen API expects
    if (params.accountId) {
      queryParams.append('accountId', params.accountId);
    }
    if (params.calendarIds) {
      queryParams.append('calendarIds', params.calendarIds);
    }
    if (params.start) {
      queryParams.append('start', params.start);
    }
    if (params.end) {
      queryParams.append('end', params.end);
    }
    
    const queryString = queryParams.toString();
    const endpoint = `/events/list?${queryString}`;
    console.log('endpoint', endpoint);
    const response = await this.request(endpoint);
    const events = response.data?.events || [];
    
    // Filter out "Busy (via Morgen)" and "Untitled Event" events
    const filtered = events.filter(event => 
      event.title !== 'Busy (via Morgen)' && 
      event.title !== 'Untitled Event'
    );
      
    return filtered;
  }

  async createEvent(eventData) {
    try {
      // Validate required fields
      const requiredFields = ['title', 'start_date', 'end_date', 'calendar_id'];
      for (const field of requiredFields) {
        if (!eventData[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      // Calculate duration in minutes
      const startTime = new Date(eventData.start_date);
      const endTime = new Date(eventData.end_date);
      const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
      
      // Get calendar info to extract accountId
      const calendars = await this.listCalendars();
      const calendar = calendars.find(cal => cal.id === eventData.calendar_id);
      if (!calendar) {
        throw new Error(`Calendar with ID ${eventData.calendar_id} not found`);
      }
      
      // Transform event data to match Morgen API format
      const morgenEventData = {
        title: eventData.title,
        description: eventData.description || '',
        start: eventData.start_date,
        duration: `${durationMinutes}m`,
        accountId: calendar.account_id || calendar.accountId,
        calendarId: eventData.calendar_id,
        timeZone: eventData.timezone || 'UTC'
      };
      
      console.log('Creating event with data:', JSON.stringify(morgenEventData, null, 2));
      
      const response = await this.request('/events/create', {
        method: 'POST',
        body: JSON.stringify(morgenEventData)
      });
      
      // Invalidate relevant caches after creating an event
      this.invalidateEventCaches();
      
      return response.data?.event || response.data || response;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }
  
  // Cache invalidation methods
  invalidateEventCaches() {
    // Clear all event-related caches when an event is created/modified
    const keysToDelete = [];
    
    // Get all cache keys
    for (const key of this.cache.cache.keys()) {
      if (key.startsWith('events:') || key.startsWith('search:')) {
        keysToDelete.push(key);
      }
    }
    
    // Delete the keys
    keysToDelete.forEach(key => this.cache.delete(key));
  }
  
  // Get cache statistics
  getCacheStats() {
    return this.cache.stats();
  }
  
  // Clear all cache
  clearCache() {
    this.cache.clear();
  }

  // Helper method to get all events for a date range across all accounts/calendars
  async getAllEventsInRange(start, end) {
    // Get all accounts and calendars first
    const accounts = await this.listAccounts();
    if (accounts.length === 0) {
      throw new Error('No calendar accounts configured. Please connect your calendars at https://platform.morgen.so');
    }
    
    const calendars = await this.listCalendars();
    if (calendars.length === 0) {
      throw new Error('No calendars available. Please add calendars to your connected accounts.');
    }
    
    // Group calendars by account
    const calendarsByAccount = {};
    calendars.forEach(calendar => {
      if (!calendarsByAccount[calendar.accountId]) {
        calendarsByAccount[calendar.accountId] = [];
      }
      calendarsByAccount[calendar.accountId].push(calendar.id);
    });
    
    // Query events for each account
    const allEvents = [];
    const errors = [];
    
    for (const accountId of Object.keys(calendarsByAccount)) {
      const calendarIds = calendarsByAccount[accountId].join(',');
      try {
        const events = await this.listEvents({
          accountId: accountId,
          calendarIds: calendarIds,
          start: start,
          end: end
        });
        allEvents.push(...events);
      } catch (error) {
        console.error(`Error fetching events for account ${accountId}:`, error);
        errors.push(`Account ${accountId}: ${error.message}`);
        // Continue with other accounts
      }
    }
    
    // If all accounts failed, throw an error
    if (allEvents.length === 0 && errors.length > 0) {
      throw new Error(`Failed to fetch events from all accounts:\n${errors.join('\n')}`);
    }
    
    return allEvents;
  }

  async searchEvents(query, options = {}) {
    try {
      // Generate cache key for search
      const cacheKey = `search:${query}:${SimpleCache.hashSearchOptions(options)}`;
      
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Set default date range if not provided (last 30 days to next 30 days)
      const start = options.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const end = options.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      // Get all events in the specified range
      const allEvents = await this.getAllEventsInRange(start, end);
      
      // Filter events based on search query and exclude "Busy (via Morgen)" and "Untitled Event" events
      const searchLower = query.toLowerCase();
      const filtered = allEvents.filter(event => {
        // Skip "Busy (via Morgen)" and "Untitled Event" events
        if (event.title === 'Busy (via Morgen)' || event.title === 'Untitled Event') {
          return false;
        }
        
        const title = (event.title || '').toLowerCase();
        const description = (event.description || '').toLowerCase();
        const location = (event.location || '').toLowerCase();
        
        return title.includes(searchLower) || 
               description.includes(searchLower) || 
               location.includes(searchLower);
      });
      
      // Apply max_results limit
      const maxResults = options.max_results || 20;
      const results = filtered.slice(0, maxResults);
      
      // Cache search results for 30 seconds
      this.cache.set(cacheKey, results, 30);
      
      return results;
    } catch (error) {
      // Re-throw the error for proper error handling at the tool level
      throw error;
    }
  }

  // Helper method to get events for specific date ranges
  async getTodayEvents() {
    try {
      const cacheKey = 'events:today';
      
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const events = await this.getAllEventsInRange(today.toISOString(), tomorrow.toISOString());
      
      // Cache for 2 minutes (120 seconds)
      this.cache.set(cacheKey, events, 120);
      
      return events;
    } catch (error) {
      console.error('Error in getTodayEvents:', error);
      // Return empty array for graceful degradation
      return [];
    }
  }

  async getWeekEvents() {
    try {
      const cacheKey = 'events:week';
      
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get start of week (Monday)
      const dayOfWeek = today.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + daysToMonday);
      
      // Get end of week (Sunday)
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 7);
      
      const allEvents = await this.getAllEventsInRange(monday.toISOString(), sunday.toISOString());
      
      // Organize events by day name
      const eventsByDay = {
        'Monday': [],
        'Tuesday': [],
        'Wednesday': [],
        'Thursday': [],
        'Friday': [],
        'Saturday': [],
        'Sunday': []
      };
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      for (const event of allEvents) {
        const eventDate = new Date(event.start);
        const dayName = dayNames[eventDate.getDay()];
        if (eventsByDay[dayName]) {
          eventsByDay[dayName].push(event);
        }
      }
      
      // Cache for 2 minutes (120 seconds)
      this.cache.set(cacheKey, eventsByDay, 120);
      
      return eventsByDay;
    } catch (error) {
      console.error('Error in getWeekEvents:', error);
      // Return empty object for graceful degradation
      return {
        'Monday': [],
        'Tuesday': [],
        'Wednesday': [],
        'Thursday': [],
        'Friday': [],
        'Saturday': [],
        'Sunday': []
      };
    }
  }

  // New getEvents method with filtering support
  async getEvents(options = {}) {
    try {
      const { account_id, start_date, end_date, calendar_ids } = options;
      
      if (!start_date || !end_date || !calendar_ids) {
        throw new Error('start_date, end_date, account_id, and calendar_ids are required');
      }
      if (!account_id && calendar_ids === 'all') {
        throw new Error('account_id is required when calendar_ids is "all"');
      }
      
      // Generate cache key based on parameters
      const cacheKey = SimpleCache.generateEventKey('events:range', {
        account_id,
        start_date,
        end_date,
        calendar_ids: calendar_ids || 'all'
      });
      
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      let events;
      
      // Handle calendar_ids filtering
      if (!calendar_ids || calendar_ids === 'all' || calendar_ids === 'ALL') {
        // Get events from all calendars
        events = await this.getAllEventsInRange(start_date, end_date);
      } else {
        // Validate and process calendar_ids
        if (typeof calendar_ids !== 'string') {
          throw new Error('calendar_ids must be a string. Use "all" for all calendars or comma-separated IDs like "cal-1,cal-2"');
        }
        events = await this.listEvents({
          accountId: account_id,
          start: start_date,
          end: end_date,
          calendarIds: calendar_ids
        });
      }
      
      // Cache for 1 minute (60 seconds)
      this.cache.set(cacheKey, events, 60);
      
      return events;
    } catch (error) {
      console.error('Error in getEvents:', error);
      throw error;
    }
  }
}

module.exports = MorgenAPIClient;