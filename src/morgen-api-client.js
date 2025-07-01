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
    const response = await this.request('/calendars/list');
    return response.data?.calendars || [];
  }

  async listAccounts() {
    const response = await this.request('/integrations/accounts/list');
    return response.data?.accounts || [];
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
    
    // First try a simple call without parameters to test basic connectivity
    if (Object.keys(params).length === 0) {
      try {
        const response = await this.request('/events/list');
        const events = response.data?.events || [];
        
        // Filter out "Busy (via Morgen)" and "Untitled Event" events
        const filtered = events.filter(event => 
          event.title !== 'Busy (via Morgen)' && 
          event.title !== 'Untitled Event'
        );
        
        return filtered;
      } catch (error) {
        throw error;
      }
    }
    
    const queryParams = new URLSearchParams();
    
    // Use the exact parameter names that the Morgen API expects
    if (params.calendarIds) {
      queryParams.append('calendarIds', params.calendarIds);
    }
    if (params.start) {
      queryParams.append('start', params.start);
    }
    if (params.end) {
      queryParams.append('end', params.end);
    }
    if (params.accountId) {
      queryParams.append('accountId', params.accountId);
    }
    
    const queryString = queryParams.toString();
    const endpoint = `/events/list?${queryString}`;
    
    try {
      const response = await this.request(endpoint);
      const events = response.data?.events || [];
      
      // Filter out "Busy (via Morgen)" and "Untitled Event" events
      const filtered = events.filter(event => 
        event.title !== 'Busy (via Morgen)' && 
        event.title !== 'Untitled Event'
      );
      
      return filtered;
    } catch (error) {
      // If we get a 400 error, it might be due to invalid parameters
      // Let's try a fallback approach
      if (error.status === 400 && params.calendarIds) {
        try {
          // Try with just calendarIds
          const fallbackParams = new URLSearchParams();
          fallbackParams.append('calendarIds', params.calendarIds);
          const fallbackEndpoint = `/events/list?${fallbackParams.toString()}`;
          
          const fallbackResponse = await this.request(fallbackEndpoint);
          const fallbackEvents = fallbackResponse.data?.events || [];
          
          // Filter out "Busy (via Morgen)" and "Untitled Event" events
          const filtered = fallbackEvents.filter(event => 
            event.title !== 'Busy (via Morgen)' && 
            event.title !== 'Untitled Event'
          );
          
          return filtered;
        } catch (fallbackError) {
          throw error; // Throw the original error
        }
      }
      
      throw error;
    }
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
      
      return response.data?.event || response.data || response;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
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
      return filtered.slice(0, maxResults);
    } catch (error) {
      // Re-throw the error for proper error handling at the tool level
      throw error;
    }
  }

  // Helper method to get events for specific date ranges
  async getTodayEvents() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      return await this.getAllEventsInRange(today.toISOString(), tomorrow.toISOString());
    } catch (error) {
      console.error('Error in getTodayEvents:', error);
      // Return empty array for graceful degradation
      return [];
    }
  }

  async getWeekEvents() {
    try {
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
      const { start_date, end_date, calendar_ids } = options;
      
      if (!start_date || !end_date) {
        throw new Error('start_date and end_date are required');
      }
      
      let events = await this.getAllEventsInRange(start_date, end_date);
      
      // Filter by calendar IDs if specified
      if (calendar_ids && Array.isArray(calendar_ids) && calendar_ids.length > 0) {
        events = events.filter(event => calendar_ids.includes(event.calendar_id));
      }
      
      return events;
    } catch (error) {
      console.error('Error in getEvents:', error);
      throw error;
    }
  }
}

module.exports = MorgenAPIClient;