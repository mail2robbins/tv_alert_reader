import { promises as fs } from 'fs';
import path from 'path';
import { AlertLogEntry, TradingViewAlert } from '@/types/alert';

const DATA_DIR = path.join(process.cwd(), 'data');
const ALERTS_LOG_FILE = path.join(DATA_DIR, 'alerts.log');
const ERROR_LOG_FILE = path.join(DATA_DIR, 'errors.log');

// Ensure data directory exists
async function ensureDataDirectory() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Generate unique ID for each alert
function generateAlertId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Format timestamp for logging
function formatTimestamp(): string {
  return new Date().toISOString();
}

// Log an alert to the file
export async function logAlert(alert: TradingViewAlert): Promise<string> {
  await ensureDataDirectory();
  
  const alertEntry: AlertLogEntry = {
    id: generateAlertId(),
    timestamp: formatTimestamp(),
    data: alert
  };

  const logLine = `[${alertEntry.timestamp}] ${JSON.stringify(alertEntry)}\n`;
  
  try {
    await fs.appendFile(ALERTS_LOG_FILE, logLine, 'utf8');
    return alertEntry.id;
  } catch (error) {
    await logError('Failed to log alert', error);
    throw new Error('Failed to save alert');
  }
}

// Log an error to the error file
export async function logError(message: string, error?: unknown): Promise<void> {
  await ensureDataDirectory();
  
  const errorEntry = {
    timestamp: formatTimestamp(),
    message,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  };

  const logLine = `[${errorEntry.timestamp}] ERROR: ${JSON.stringify(errorEntry)}\n`;
  
  try {
    await fs.appendFile(ERROR_LOG_FILE, logLine, 'utf8');
  } catch (writeError) {
    console.error('Failed to write error log:', writeError);
  }
}

// Read alerts from the log file with optional filtering
export async function readAlerts(filters?: {
  startDate?: string;
  endDate?: string;
  ticker?: string;
  signal?: string;
  strategy?: string;
}): Promise<AlertLogEntry[]> {
  try {
    await fs.access(ALERTS_LOG_FILE);
  } catch {
    return []; // File doesn't exist yet
  }

  try {
    const fileContent = await fs.readFile(ALERTS_LOG_FILE, 'utf8');
    const lines = fileContent.trim().split('\n').filter(line => line.trim());
    
    const alerts: AlertLogEntry[] = [];
    
    for (const line of lines) {
      try {
        // Parse the log line format: [timestamp] {json}
        const match = line.match(/^\[([^\]]+)\] (.+)$/);
        if (!match) continue;
        
        const [, , jsonStr] = match;
        const alertEntry: AlertLogEntry = JSON.parse(jsonStr);
        
        // Apply filters
        if (filters) {
          const alertDate = new Date(alertEntry.timestamp);
          
          if (filters.startDate && alertDate < new Date(filters.startDate)) continue;
          if (filters.endDate && alertDate > new Date(filters.endDate)) continue;
          if (filters.ticker && alertEntry.data.ticker !== filters.ticker) continue;
          if (filters.signal && alertEntry.data.signal !== filters.signal) continue;
          if (filters.strategy && alertEntry.data.strategy !== filters.strategy) continue;
        }
        
        alerts.push(alertEntry);
      } catch (parseError) {
        await logError('Failed to parse alert log line', { line, parseError });
      }
    }
    
    // Sort by timestamp (newest first)
    return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    await logError('Failed to read alerts', error);
    throw new Error('Failed to read alerts');
  }
}

// Get alert statistics
export async function getAlertStats(): Promise<{
  totalAlerts: number;
  buySignals: number;
  sellSignals: number;
  uniqueTickers: number;
  strategies: string[];
}> {
  const alerts = await readAlerts();
  
  const buySignals = alerts.filter(a => a.data.signal === 'BUY').length;
  const sellSignals = alerts.filter(a => a.data.signal === 'SELL').length;
  const uniqueTickers = new Set(alerts.map(a => a.data.ticker)).size;
  const strategies = [...new Set(alerts.map(a => a.data.strategy))];
  
  return {
    totalAlerts: alerts.length,
    buySignals,
    sellSignals,
    uniqueTickers,
    strategies
  };
}
