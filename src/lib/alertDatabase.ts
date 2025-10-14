import { getDatabaseConnection } from './database';
import { AlertLogEntry, TradingViewAlert, ChartInkProcessedAlert } from '@/types/alert';

// Store alert in database
export async function storeAlertInDatabase(
  alert: TradingViewAlert | ChartInkProcessedAlert, 
  alertType: 'TradingView' | 'ChartInk' = 'TradingView'
): Promise<string> {
  const client = await getDatabaseConnection();
  
  try {
    const alertId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    await client.query(`
      INSERT INTO alerts (
        id, timestamp, alert_type, ticker, price, signal, strategy, 
        custom_note, webhook_secret, original_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      alertId,
      timestamp,
      alertType,
      alert.ticker,
      alert.price,
      alert.signal,
      alert.strategy,
      alert.custom_note || null,
      'webhook_secret' in alert ? alert.webhook_secret || null : null,
      JSON.stringify(alert)
    ]);

    console.log('Alert stored in database:', { id: alertId, ticker: alert.ticker, signal: alert.signal });
    return alertId;
  } catch (error) {
    console.error('Error storing alert in database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Read alerts from database with optional filtering
export async function readAlertsFromDatabase(filters?: {
  startDate?: string;
  endDate?: string;
  ticker?: string;
  signal?: string;
  strategy?: string;
}): Promise<AlertLogEntry[]> {
  const client = await getDatabaseConnection();
  
  try {
    let query = `
      SELECT id, timestamp, alert_type, ticker, price, signal, strategy, 
             custom_note, webhook_secret, original_data
      FROM alerts
    `;
    
    const queryParams: unknown[] = [];
    const conditions: string[] = [];
    
    if (filters) {
      if (filters.startDate) {
        conditions.push(`timestamp >= $${queryParams.length + 1}`);
        queryParams.push(filters.startDate);
      }
      
      if (filters.endDate) {
        conditions.push(`timestamp <= $${queryParams.length + 1}`);
        queryParams.push(filters.endDate);
      }
      
      if (filters.ticker) {
        conditions.push(`ticker = $${queryParams.length + 1}`);
        queryParams.push(filters.ticker);
      }
      
      if (filters.signal) {
        conditions.push(`signal = $${queryParams.length + 1}`);
        queryParams.push(filters.signal);
      }
      
      if (filters.strategy) {
        conditions.push(`strategy = $${queryParams.length + 1}`);
        queryParams.push(filters.strategy);
      }
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY timestamp DESC LIMIT 1000`;
    
    const result = await client.query(query, queryParams);
    
    return result.rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      alertType: row.alert_type,
      data: row.original_data
    }));
  } catch (error) {
    console.error('Error reading alerts from database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get alert statistics from database
export async function getAlertStatsFromDatabase(): Promise<{
  totalAlerts: number;
  buySignals: number;
  sellSignals: number;
  uniqueTickers: number;
  strategies: string[];
}> {
  const client = await getDatabaseConnection();
  
  try {
    const [totalResult, buyResult, sellResult, tickerResult, strategyResult] = await Promise.all([
      client.query('SELECT COUNT(*) as count FROM alerts'),
      client.query("SELECT COUNT(*) as count FROM alerts WHERE signal = 'BUY'"),
      client.query("SELECT COUNT(*) as count FROM alerts WHERE signal = 'SELL'"),
      client.query('SELECT COUNT(DISTINCT ticker) as count FROM alerts'),
      client.query('SELECT DISTINCT strategy FROM alerts WHERE strategy IS NOT NULL')
    ]);
    
    return {
      totalAlerts: parseInt(totalResult.rows[0].count),
      buySignals: parseInt(buyResult.rows[0].count),
      sellSignals: parseInt(sellResult.rows[0].count),
      uniqueTickers: parseInt(tickerResult.rows[0].count),
      strategies: strategyResult.rows.map(row => row.strategy)
    };
  } catch (error) {
    console.error('Error getting alert stats from database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get alert by ID
export async function getAlertById(alertId: string): Promise<AlertLogEntry | null> {
  const client = await getDatabaseConnection();
  
  try {
    const result = await client.query(`
      SELECT id, timestamp, alert_type, ticker, price, signal, strategy, 
             custom_note, webhook_secret, original_data
      FROM alerts WHERE id = $1
    `, [alertId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      timestamp: row.timestamp,
      alertType: row.alert_type,
      data: row.original_data
    };
  } catch (error) {
    console.error('Error getting alert by ID from database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Delete old alerts (cleanup function)
export async function deleteOldAlerts(daysToKeep: number = 30): Promise<number> {
  const client = await getDatabaseConnection();
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await client.query(`
      DELETE FROM alerts WHERE timestamp < $1
    `, [cutoffDate.toISOString()]);
    
    console.log(`Deleted ${result.rowCount} old alerts`);
    return result.rowCount || 0;
  } catch (error) {
    console.error('Error deleting old alerts from database:', error);
    throw error;
  } finally {
    client.release();
  }
}
