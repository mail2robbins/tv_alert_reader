import { AlertLogEntry, TradingViewAlert } from '@/types/alert';

// In-memory storage for serverless environments
let memoryAlerts: AlertLogEntry[] = [];

// Generate unique ID for each alert
function generateAlertId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Format timestamp for logging
function formatTimestamp(): string {
  return new Date().toISOString();
}

// Store alert in memory
export function storeAlertInMemory(alert: TradingViewAlert): string {
  const alertEntry: AlertLogEntry = {
    id: generateAlertId(),
    timestamp: formatTimestamp(),
    data: alert
  };

  memoryAlerts.push(alertEntry);
  
  // Keep only the last 1000 alerts to prevent memory issues
  if (memoryAlerts.length > 1000) {
    memoryAlerts = memoryAlerts.slice(-1000);
  }

  console.log('Alert stored in memory:', alertEntry);
  return alertEntry.id;
}

// Read alerts from memory with optional filtering
export function readAlertsFromMemory(filters?: {
  startDate?: string;
  endDate?: string;
  ticker?: string;
  signal?: string;
  strategy?: string;
}): AlertLogEntry[] {
  let filteredAlerts = [...memoryAlerts];

  if (filters) {
    filteredAlerts = filteredAlerts.filter(alert => {
      const alertDate = new Date(alert.timestamp);
      
      if (filters.startDate && alertDate < new Date(filters.startDate)) return false;
      if (filters.endDate && alertDate > new Date(filters.endDate)) return false;
      if (filters.ticker && alert.data.ticker !== filters.ticker) return false;
      if (filters.signal && alert.data.signal !== filters.signal) return false;
      if (filters.strategy && alert.data.strategy !== filters.strategy) return false;
      
      return true;
    });
  }

  // Sort by timestamp (newest first)
  return filteredAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Get alert statistics from memory
export function getAlertStatsFromMemory(): {
  totalAlerts: number;
  buySignals: number;
  sellSignals: number;
  uniqueTickers: number;
  strategies: string[];
} {
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
