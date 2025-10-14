import { getDatabaseConnection } from './database';
import { PlacedOrder } from './orderTracker';

// Store placed order in database
export async function storePlacedOrderInDatabase(order: PlacedOrder): Promise<void> {
  const client = await getDatabaseConnection();
  
  try {
    await client.query(`
      INSERT INTO placed_orders (
        id, alert_id, ticker, signal, price, quantity, timestamp, correlation_id,
        order_id, status, error, order_value, leveraged_value, position_size_percentage,
        stop_loss_price, target_price, account_id, client_id, dhan_response, position_calculation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    `, [
      order.id,
      order.alertId,
      order.ticker,
      order.signal,
      order.price,
      order.quantity,
      order.timestamp,
      order.correlationId,
      order.orderId || null,
      order.status,
      order.error || null,
      order.orderValue,
      order.leveragedValue,
      order.positionSizePercentage,
      order.stopLossPrice || null,
      order.targetPrice || null,
      order.accountId || null,
      order.clientId || null,
      order.dhanResponse ? JSON.stringify(order.dhanResponse) : null,
      order.positionCalculation ? JSON.stringify(order.positionCalculation) : null
    ]);

    console.log('Order stored in database:', { id: order.id, ticker: order.ticker, status: order.status });
  } catch (error) {
    console.error('Error storing order in database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get all placed orders from database
export async function getAllPlacedOrdersFromDatabase(): Promise<PlacedOrder[]> {
  const client = await getDatabaseConnection();
  
  try {
    const result = await client.query(`
      SELECT id, alert_id, ticker, signal, price, quantity, timestamp, correlation_id,
             order_id, status, error, order_value, leveraged_value, position_size_percentage,
             stop_loss_price, target_price, account_id, client_id, dhan_response, position_calculation
      FROM placed_orders
      ORDER BY timestamp DESC
      LIMIT 1000
    `);
    
    return result.rows.map(row => ({
      id: row.id,
      alertId: row.alert_id,
      ticker: row.ticker,
      signal: row.signal,
      price: parseFloat(row.price),
      quantity: row.quantity,
      timestamp: row.timestamp,
      correlationId: row.correlation_id,
      orderId: row.order_id,
      status: row.status,
      error: row.error,
      orderValue: parseFloat(row.order_value),
      leveragedValue: parseFloat(row.leveraged_value),
      positionSizePercentage: parseFloat(row.position_size_percentage),
      stopLossPrice: row.stop_loss_price ? parseFloat(row.stop_loss_price) : undefined,
      targetPrice: row.target_price ? parseFloat(row.target_price) : undefined,
      accountId: row.account_id,
      clientId: row.client_id,
      dhanResponse: row.dhan_response ? (typeof row.dhan_response === 'string' ? JSON.parse(row.dhan_response) : row.dhan_response) : undefined,
      positionCalculation: row.position_calculation ? (typeof row.position_calculation === 'string' ? JSON.parse(row.position_calculation) : row.position_calculation) : undefined
    }));
  } catch (error) {
    console.error('Error getting orders from database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get orders by ticker from database
export async function getOrdersByTickerFromDatabase(ticker: string): Promise<PlacedOrder[]> {
  const client = await getDatabaseConnection();
  
  try {
    const result = await client.query(`
      SELECT id, alert_id, ticker, signal, price, quantity, timestamp, correlation_id,
             order_id, status, error, order_value, leveraged_value, position_size_percentage,
             stop_loss_price, target_price, account_id, client_id, dhan_response, position_calculation
      FROM placed_orders
      WHERE ticker = $1
      ORDER BY timestamp DESC
    `, [ticker]);
    
    return result.rows.map(row => ({
      id: row.id,
      alertId: row.alert_id,
      ticker: row.ticker,
      signal: row.signal,
      price: parseFloat(row.price),
      quantity: row.quantity,
      timestamp: row.timestamp,
      correlationId: row.correlation_id,
      orderId: row.order_id,
      status: row.status,
      error: row.error,
      orderValue: parseFloat(row.order_value),
      leveragedValue: parseFloat(row.leveraged_value),
      positionSizePercentage: parseFloat(row.position_size_percentage),
      stopLossPrice: row.stop_loss_price ? parseFloat(row.stop_loss_price) : undefined,
      targetPrice: row.target_price ? parseFloat(row.target_price) : undefined,
      accountId: row.account_id,
      clientId: row.client_id,
      dhanResponse: row.dhan_response ? (typeof row.dhan_response === 'string' ? JSON.parse(row.dhan_response) : row.dhan_response) : undefined,
      positionCalculation: row.position_calculation ? (typeof row.position_calculation === 'string' ? JSON.parse(row.position_calculation) : row.position_calculation) : undefined
    }));
  } catch (error) {
    console.error('Error getting orders by ticker from database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get orders by status from database
export async function getOrdersByStatusFromDatabase(status: PlacedOrder['status']): Promise<PlacedOrder[]> {
  const client = await getDatabaseConnection();
  
  try {
    const result = await client.query(`
      SELECT id, alert_id, ticker, signal, price, quantity, timestamp, correlation_id,
             order_id, status, error, order_value, leveraged_value, position_size_percentage,
             stop_loss_price, target_price, account_id, client_id, dhan_response, position_calculation
      FROM placed_orders
      WHERE status = $1
      ORDER BY timestamp DESC
    `, [status]);
    
    return result.rows.map(row => ({
      id: row.id,
      alertId: row.alert_id,
      ticker: row.ticker,
      signal: row.signal,
      price: parseFloat(row.price),
      quantity: row.quantity,
      timestamp: row.timestamp,
      correlationId: row.correlation_id,
      orderId: row.order_id,
      status: row.status,
      error: row.error,
      orderValue: parseFloat(row.order_value),
      leveragedValue: parseFloat(row.leveraged_value),
      positionSizePercentage: parseFloat(row.position_size_percentage),
      stopLossPrice: row.stop_loss_price ? parseFloat(row.stop_loss_price) : undefined,
      targetPrice: row.target_price ? parseFloat(row.target_price) : undefined,
      accountId: row.account_id,
      clientId: row.client_id,
      dhanResponse: row.dhan_response ? (typeof row.dhan_response === 'string' ? JSON.parse(row.dhan_response) : row.dhan_response) : undefined,
      positionCalculation: row.position_calculation ? (typeof row.position_calculation === 'string' ? JSON.parse(row.position_calculation) : row.position_calculation) : undefined
    }));
  } catch (error) {
    console.error('Error getting orders by status from database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get order statistics from database
export async function getOrderStatsFromDatabase(): Promise<{
  totalOrders: number;
  placedOrders: number;
  failedOrders: number;
  pendingOrders: number;
  totalQuantity: number;
  totalValue: number;
  uniqueTickers: number;
}> {
  const client = await getDatabaseConnection();
  
  try {
    const [totalResult, placedResult, failedResult, pendingResult, quantityResult, valueResult, tickerResult] = await Promise.all([
      client.query('SELECT COUNT(*) as count FROM placed_orders'),
      client.query("SELECT COUNT(*) as count FROM placed_orders WHERE status = 'placed'"),
      client.query("SELECT COUNT(*) as count FROM placed_orders WHERE status = 'failed'"),
      client.query("SELECT COUNT(*) as count FROM placed_orders WHERE status = 'pending'"),
      client.query("SELECT SUM(quantity) as total FROM placed_orders WHERE status = 'placed'"),
      client.query("SELECT SUM(order_value) as total FROM placed_orders WHERE status = 'placed'"),
      client.query('SELECT COUNT(DISTINCT ticker) as count FROM placed_orders')
    ]);
    
    return {
      totalOrders: parseInt(totalResult.rows[0].count),
      placedOrders: parseInt(placedResult.rows[0].count),
      failedOrders: parseInt(failedResult.rows[0].count),
      pendingOrders: parseInt(pendingResult.rows[0].count),
      totalQuantity: parseInt(quantityResult.rows[0].total || '0'),
      totalValue: parseFloat(valueResult.rows[0].total || '0'),
      uniqueTickers: parseInt(tickerResult.rows[0].count)
    };
  } catch (error) {
    console.error('Error getting order stats from database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Update order status in database
export async function updateOrderStatusInDatabase(orderId: string, status: PlacedOrder['status'], error?: string): Promise<boolean> {
  const client = await getDatabaseConnection();
  
  try {
    const result = await client.query(`
      UPDATE placed_orders 
      SET status = $1, error = $2 
      WHERE id = $3
    `, [status, error || null, orderId]);
    
    const updated = Boolean(result.rowCount && result.rowCount > 0);
    if (updated) {
      console.log('Order status updated in database:', { orderId, status, error });
    }
    return updated;
  } catch (error) {
    console.error('Error updating order status in database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ticker cache database operations
export async function hasTickerBeenOrderedTodayInDatabase(ticker: string): Promise<boolean> {
  const client = await getDatabaseConnection();
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await client.query(`
      SELECT COUNT(*) as count FROM ticker_cache 
      WHERE ticker = $1 AND date = $2
    `, [ticker.toUpperCase(), today]);
    
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    console.error('Error checking ticker cache in database:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function addTickerToCacheInDatabase(ticker: string): Promise<void> {
  const client = await getDatabaseConnection();
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    
    await client.query(`
      INSERT INTO ticker_cache (ticker, date, order_count, last_order_time)
      VALUES ($1, $2, 1, $3)
      ON CONFLICT (ticker, date)
      DO UPDATE SET 
        order_count = ticker_cache.order_count + 1,
        last_order_time = $3
    `, [ticker.toUpperCase(), today, now]);
    
    console.log(`Ticker ${ticker} added to cache in database for ${today}`);
  } catch (error) {
    console.error('Error adding ticker to cache in database:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getTickerCacheStatsFromDatabase(): Promise<{
  totalEntries: number;
  todayEntries: number;
  tickersOrderedToday: string[];
}> {
  const client = await getDatabaseConnection();
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const [totalResult, todayResult] = await Promise.all([
      client.query('SELECT COUNT(*) as count FROM ticker_cache'),
      client.query('SELECT ticker FROM ticker_cache WHERE date = $1', [today])
    ]);
    
    return {
      totalEntries: parseInt(totalResult.rows[0].count),
      todayEntries: todayResult.rows.length,
      tickersOrderedToday: todayResult.rows.map(row => row.ticker)
    };
  } catch (error) {
    console.error('Error getting ticker cache stats from database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Delete old orders (cleanup function)
export async function deleteOldOrders(daysToKeep: number = 30): Promise<number> {
  const client = await getDatabaseConnection();
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await client.query(`
      DELETE FROM placed_orders WHERE timestamp < $1
    `, [cutoffDate.toISOString()]);
    
    console.log(`Deleted ${result.rowCount} old orders`);
    return result.rowCount || 0;
  } catch (error) {
    console.error('Error deleting old orders from database:', error);
    throw error;
  } finally {
    client.release();
  }
}
