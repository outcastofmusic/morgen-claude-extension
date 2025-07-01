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

  async searchEvents(query, options = {}) {
    // Note: This endpoint might need adjustment based on actual Morgen API
    // For now, we'll use list events and filter client-side
    const events = await this.listEvents({
      start: options.start_date,
      end: options.end_date,
      accountId: options.account_id
    });
    
    const searchLower = query.toLowerCase();
    const filtered = events.filter(event => {
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
  }

  // Helper method to get events for specific date ranges
  async getTodayEvents() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.listEvents({
      start: today.toISOString(),
      end: tomorrow.toISOString()
    });
  }

  async getWeekEvents() {
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
    
    return this.listEvents({
      start: monday.toISOString(),
      end: sunday.toISOString()
    });
  }
}

module.exports = MorgenAPIClient;