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
    const queryParams = new URLSearchParams();
    
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
    const endpoint = queryString ? `/events/list?${queryString}` : '/events/list';
    
    const response = await this.request(endpoint);
    return response.data?.events || [];
  }

  async createEvent(eventData) {
    const response = await this.request('/events/create', {
      method: 'POST',
      body: JSON.stringify(eventData)
    });
    return response.data?.event || response.data;
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
      
      // Filter events based on search query
      const searchLower = query.toLowerCase();
      const filtered = allEvents.filter(event => {
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
      console.error('Error in searchEvents:', error);
      // Return empty array for graceful degradation
      return [];
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
      
      return await this.getAllEventsInRange(monday.toISOString(), sunday.toISOString());
    } catch (error) {
      console.error('Error in getWeekEvents:', error);
      // Return empty array for graceful degradation
      return [];
    }
  }
}

module.exports = MorgenAPIClient;