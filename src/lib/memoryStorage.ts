import { AlertLogEntry, TradingViewAlert, ChartInkProcessedAlert } from '@/types/alert';
import { storeAlertInDatabase, readAlertsFromDatabase, getAlertStatsFromDatabase } from './alertDatabase';
import { isDatabaseAvailable } from './database';

// In-memory storage for serverless environments (fallback)
let memoryAlerts: AlertLogEntry[] = [];

// Generate unique ID for each alert
function generateAlertId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Format timestamp for logging
function formatTimestamp(): string {
  return new Date().toISOString();
}

// Store alert in memory or database
export async function storeAlertInMemory(alert: TradingViewAlert | ChartInkProcessedAlert, alertType: 'TradingView' | 'ChartInk' = 'TradingView'): Promise<string> {
  if (await isDatabaseAvailable()) {
    try {
      return await storeAlertInDatabase(alert, alertType);
    } catch (error) {
      console.error('Failed to store alert in database, falling back to memory:', error);
    }
  }

  // Fallback to memory storage
  const alertEntry: AlertLogEntry = {
    id: generateAlertId(),
    timestamp: formatTimestamp(),
    data: alert,
    alertType
  };

  memoryAlerts.push(alertEntry);
  
  // Keep only the last 1000 alerts to prevent memory issues
  if (memoryAlerts.length > 1000) {
    memoryAlerts = memoryAlerts.slice(-1000);
  }

  console.log('Alert stored in memory:', alertEntry);
  return alertEntry.id;
}

// Read alerts from memory or database with optional filtering
export async function readAlertsFromMemory(filters?: {
  startDate?: string;
  endDate?: string;
  ticker?: string;
  signal?: string;
  strategy?: string;
}): Promise<AlertLogEntry[]> {
  if (await isDatabaseAvailable()) {
    try {
      return await readAlertsFromDatabase(filters);
    } catch (error) {
      console.error('Failed to read alerts from database, falling back to memory:', error);
    }
  }

  // Fallback to memory storage
  let filteredAlerts = [...memoryAlerts];

  if (filters) {
    filteredAlerts = filteredAlerts.filter(alert => {
      const alertDate = new Date(alert.timestamp);
      
      // For start date, we want alerts >= startDate (inclusive)
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0); // Start of day
        if (alertDate < startDate) return false;
      }
      
      // For end date, we want alerts <= endDate (inclusive)
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        if (alertDate > endDate) return false;
      }
      
      if (filters.ticker && !alert.data.ticker.toUpperCase().includes(filters.ticker.toUpperCase())) return false;
      if (filters.signal && alert.data.signal !== filters.signal) return false;
      if (filters.strategy && alert.data.strategy !== filters.strategy) return false;
      
      return true;
    });
  }

  // Sort by timestamp (newest first)
  return filteredAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Get alert statistics from memory or database
export async function getAlertStatsFromMemory(): Promise<{
  totalAlerts: number;
  buySignals: number;
  sellSignals: number;
  uniqueTickers: number;
  strategies: string[];
}> {
  if (await isDatabaseAvailable()) {
    try {
      return await getAlertStatsFromDatabase();
    } catch (error) {
      console.error('Failed to get alert stats from database, falling back to memory:', error);
    }
  }

  // Fallback to memory storage
  const buySignals = memoryAlerts.filter(a => a.data.signal === 'BUY').length;
  const sellSignals = memoryAlerts.filter(a => a.data.signal === 'SELL').length;
  const uniqueTickers = new Set(memoryAlerts.map(a => a.data.ticker)).size;
  const strategies = [...new Set(memoryAlerts.map(a => a.data.strategy))];
  
  return {
    totalAlerts: memoryAlerts.length,
    buySignals,
    sellSignals,
    uniqueTickers,
    strategies
  };
}
