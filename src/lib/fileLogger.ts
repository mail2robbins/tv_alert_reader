import { promises as fs } from 'fs';
import path from 'path';
import { AlertLogEntry, TradingViewAlert } from '@/types/alert';
import { storeAlertInMemory, readAlertsFromMemory, getAlertStatsFromMemory } from './memoryStorage';

// Check if we're in a serverless environment
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;

const DATA_DIR = isServerless ? '/tmp' : path.join(process.cwd(), 'data');
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
  // In serverless environments, use memory storage
  if (isServerless) {
    return storeAlertInMemory(alert);
  }

  const alertEntry: AlertLogEntry = {
    id: generateAlertId(),
    timestamp: formatTimestamp(),
    data: alert
  };

  const logLine = `[${alertEntry.timestamp}] ${JSON.stringify(alertEntry)}\n`;
  
  // Always log to console for debugging
  console.log('Alert received:', alertEntry);
  
  // Try to write to file
  try {
    await ensureDataDirectory();
    await fs.appendFile(ALERTS_LOG_FILE, logLine, 'utf8');
    return alertEntry.id;
  } catch (error) {
    await logError('Failed to log alert', error);
    throw new Error('Failed to save alert');
  }
}

// Log an error to the error file
export async function logError(message: string, error?: unknown): Promise<void> {
  // Safely serialize error information
  let errorInfo: string;
  let stackInfo: string | undefined;
  
  if (error instanceof Error) {
    errorInfo = error.message;
    stackInfo = error.stack;
  } else if (error && typeof error === 'object') {
    // Handle objects safely to avoid circular references
    try {
      errorInfo = JSON.stringify(error, null, 2);
    } catch (jsonError) {
      errorInfo = `[Object that could not be serialized: ${Object.prototype.toString.call(error)}]`;
    }
  } else {
    errorInfo = String(error);
  }

  const errorEntry = {
    timestamp: formatTimestamp(),
    message,
    error: errorInfo,
    stack: stackInfo
  };

  const logLine = `[${errorEntry.timestamp}] ERROR: ${JSON.stringify(errorEntry)}\n`;
  
  // Always log to console for serverless environments
  console.error(logLine);
  
  // Try to write to file if possible
  try {
    await ensureDataDirectory();
    await fs.appendFile(ERROR_LOG_FILE, logLine, 'utf8');
  } catch (writeError) {
    // In serverless environments, file writing might fail
    // This is expected and we just log to console instead
    if (isServerless) {
      console.warn('File logging not available in serverless environment, using console logging only');
    } else {
      console.error('Failed to write error log:', writeError);
    }
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
  // In serverless environments, use memory storage
  if (isServerless) {
    return readAlertsFromMemory(filters);
  }

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
        // In serverless environments, don't try to log errors to file
        if (isServerless) {
          console.error('Failed to parse alert log line:', { line, parseError });
        } else {
          await logError('Failed to parse alert log line', { line, parseError });
        }
      }
    }
    
    // Sort by timestamp (newest first)
    return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    // Handle read-only file system errors gracefully
    if (error instanceof Error && (error.message.includes('EROFS') || error.message.includes('read-only'))) {
      console.warn('File system is read-only, falling back to memory storage');
      return readAlertsFromMemory(filters);
    }
    
    // In serverless environments, don't try to log errors to file
    if (isServerless) {
      console.error('Failed to read alerts:', error);
      return []; // Return empty array instead of throwing
    } else {
      await logError('Failed to read alerts', error);
      throw new Error('Failed to read alerts');
    }
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
  // In serverless environments, use memory storage
  if (isServerless) {
    return getAlertStatsFromMemory();
  }

  try {
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
  } catch (error) {
    // Handle read-only file system errors gracefully
    if (error instanceof Error && (error.message.includes('EROFS') || error.message.includes('read-only'))) {
      console.warn('File system is read-only, falling back to memory storage for stats');
      return getAlertStatsFromMemory();
    }
    
    // In serverless environments, fall back to memory storage
    if (isServerless) {
      console.warn('Failed to read alerts for stats, falling back to memory storage');
      return getAlertStatsFromMemory();
    }
    
    throw error;
  }
}
