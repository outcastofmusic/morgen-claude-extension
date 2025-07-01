// Utility functions for formatting calendar and event data

function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    // Format: "2024-01-15 09:00:00"
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    
    return date.toLocaleString('en-US', options).replace(',', '');
  } catch (error) {
    return dateString;
  }
}

function formatEvent(event) {
  const lines = [`📅 ${event.title || 'Untitled Event'}`];
  
  if (event.start) {
    lines.push(`⏰ Start: ${formatDateTime(event.start)}`);
  }
  
  if (event.end) {
    lines.push(`⏰ End: ${formatDateTime(event.end)}`);
  }
  
  if (event.location) {
    lines.push(`📍 Location: ${event.location}`);
  }
  
  if (event.description) {
    lines.push(`📝 Description: ${event.description}`);
  }
  
  return lines.join('\n');
}

function formatCalendar(calendar) {
  const lines = [`📁 ${calendar.name || 'Unnamed Calendar'}`];
  
  lines.push(`🆔 ID: ${calendar.id}`);
  
  if (calendar.accountId) {
    lines.push(`👤 Account ID: ${calendar.accountId}`);
  }
  
  if (calendar.color) {
    lines.push(`🎨 Color: ${calendar.color}`);
  }
  
  if (calendar.timeZone) {
    lines.push(`🌍 Time Zone: ${calendar.timeZone}`);
  }
  
  return lines.join('\n');
}

function formatAccount(account) {
  const lines = [`👤 ${account.email || 'Unknown Email'}`];
  
  lines.push(`🆔 ID: ${account.id}`);
  
  if (account.integrationId) {
    const providerNames = {
      'google': 'Google Calendar',
      'o365': 'Office 365',
      'apple': 'Apple Calendar',
      'exchange': 'Microsoft Exchange'
    };
    const providerName = providerNames[account.integrationId] || account.integrationId;
    lines.push(`🔗 Provider: ${providerName}`);
  }
  
  return lines.join('\n');
}

function formatEventsByDay(events) {
  // Group events by day
  const eventsByDay = {};
  
  events.forEach(event => {
    if (!event.start) return;
    
    const date = new Date(event.start);
    const dayKey = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    if (!eventsByDay[dayKey]) {
      eventsByDay[dayKey] = [];
    }
    
    eventsByDay[dayKey].push(event);
  });
  
  // Format output
  const output = [];
  
  Object.entries(eventsByDay).forEach(([day, dayEvents]) => {
    output.push(`\n📆 ${day} (${dayEvents.length} event${dayEvents.length !== 1 ? 's' : ''}):`);
    output.push('─'.repeat(50));
    
    dayEvents.forEach((event, index) => {
      if (index > 0) output.push(''); // Add blank line between events
      output.push(formatEvent(event));
    });
  });
  
  return output.join('\n');
}

module.exports = {
  formatDateTime,
  formatEvent,
  formatCalendar,
  formatAccount,
  formatEventsByDay
};