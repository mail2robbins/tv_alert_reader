import { TradingViewAlert } from '@/types/alert';
import { DhanOrderResponse } from './dhanApi';
import { PositionCalculation } from './fundManager';
import { isDatabaseAvailable } from './database';
import { 
  storePlacedOrderInDatabase, 
  getAllPlacedOrdersFromDatabase, 
  getOrdersByTickerFromDatabase, 
  getOrdersByStatusFromDatabase, 
  getOrderStatsFromDatabase, 
  updateOrderStatusInDatabase,
  hasTickerBeenOrderedTodayInDatabase,
  addTickerToCacheInDatabase,
  getTickerCacheStatsFromDatabase
} from './orderDatabase';

// Order tracking interface
export interface PlacedOrder {
  id: string;
  alertId: string;
  ticker: string;
  signal: string;
  price: number;
  quantity: number;
  timestamp: string;
  correlationId: string;
  orderId?: string;
  status: 'pending' | 'placed' | 'failed' | 'cancelled';
  error?: string;
  dhanResponse?: DhanOrderResponse;
  positionCalculation?: PositionCalculation;
  orderValue: number;
  leveragedValue: number;
  positionSizePercentage: number;
  stopLossPrice?: number;
  targetPrice?: number;
  accountId?: number;
  clientId?: string;
}

// In-memory order storage for serverless environments (fallback)
let memoryOrders: PlacedOrder[] = [];

// Ticker cache to prevent multiple orders for the same ticker on the same day
export interface TickerCacheEntry {
  ticker: string;
  date: string; // YYYY-MM-DD format
  orderCount: number;
  lastOrderTime: string;
}

let tickerCache: TickerCacheEntry[] = [];

// Generate unique order ID
function generateOrderId(): string {
  return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get current date in YYYY-MM-DD format
function getCurrentDateString(): string {
  return new Date().toISOString().split('T')[0];
}

// Check if ticker has already been ordered today
export async function hasTickerBeenOrderedToday(ticker: string): Promise<boolean> {
  if (await isDatabaseAvailable()) {
    try {
      return await hasTickerBeenOrderedTodayInDatabase(ticker);
    } catch (error) {
      console.error('Failed to check ticker cache in database, falling back to memory:', error);
    }
  }

  // Fallback to memory storage
  const today = getCurrentDateString();
  const cacheEntry = tickerCache.find(entry => 
    entry.ticker.toUpperCase() === ticker.toUpperCase() && 
    entry.date === today
  );
  return !!cacheEntry;
}

// Add ticker to cache for today
export async function addTickerToCache(ticker: string): Promise<void> {
  if (await isDatabaseAvailable()) {
    try {
      await addTickerToCacheInDatabase(ticker);
      return;
    } catch (error) {
      console.error('Failed to add ticker to cache in database, falling back to memory:', error);
    }
  }

  // Fallback to memory storage
  const today = getCurrentDateString();
  const now = new Date().toISOString();
  
  const existingEntry = tickerCache.find(entry => 
    entry.ticker.toUpperCase() === ticker.toUpperCase() && 
    entry.date === today
  );
  
  if (existingEntry) {
    existingEntry.orderCount += 1;
    existingEntry.lastOrderTime = now;
  } else {
    tickerCache.push({
      ticker: ticker.toUpperCase(),
      date: today,
      orderCount: 1,
      lastOrderTime: now
    });
  }
  
  // Clean up old cache entries (keep only last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
  
  tickerCache = tickerCache.filter(entry => entry.date >= cutoffDate);
  
  console.log(`Ticker ${ticker} added to cache for ${today}`);
}

// Get ticker cache statistics
export async function getTickerCacheStats(): Promise<{
  totalEntries: number;
  todayEntries: number;
  tickersOrderedToday: string[];
}> {
  if (await isDatabaseAvailable()) {
    try {
      return await getTickerCacheStatsFromDatabase();
    } catch (error) {
      console.error('Failed to get ticker cache stats from database, falling back to memory:', error);
    }
  }

  // Fallback to memory storage
  const today = getCurrentDateString();
  const todayEntries = tickerCache.filter(entry => entry.date === today);
  
  return {
    totalEntries: tickerCache.length,
    todayEntries: todayEntries.length,
    tickersOrderedToday: todayEntries.map(entry => entry.ticker)
  };
}

// Get cache entry for a specific ticker and date
export function getTickerCacheEntry(ticker: string, date?: string): TickerCacheEntry | null {
  const targetDate = date || getCurrentDateString();
  return tickerCache.find(entry => 
    entry.ticker.toUpperCase() === ticker.toUpperCase() && 
    entry.date === targetDate
  ) || null;
}

// Store placed order
export async function storePlacedOrder(
  alert: TradingViewAlert,
  alertId: string,
  quantity: number,
  dhanResponse: DhanOrderResponse,
  positionCalculation?: PositionCalculation
): Promise<PlacedOrder> {
  const orderValue = alert.price * quantity;
  const leveragedValue = positionCalculation?.leveragedValue || (orderValue / 2); // Default to 2x leverage
  const positionSizePercentage = positionCalculation?.positionSizePercentage || 0;
  const stopLossPrice = positionCalculation?.stopLossPrice;
  const targetPrice = positionCalculation?.targetPrice;
  
  const order: PlacedOrder = {
    id: generateOrderId(),
    alertId,
    ticker: alert.ticker,
    signal: alert.signal,
    price: alert.price,
    quantity,
    timestamp: new Date().toISOString(),
    correlationId: dhanResponse.correlationId || '',
    orderId: dhanResponse.orderId,
    status: dhanResponse.success ? 'placed' : 'failed',
    error: dhanResponse.error,
    dhanResponse,
    positionCalculation,
    orderValue,
    leveragedValue,
    positionSizePercentage,
    stopLossPrice,
    targetPrice,
    accountId: dhanResponse.accountId,
    clientId: dhanResponse.clientId
  };

  // Store in database if available
  if (await isDatabaseAvailable()) {
    try {
      await storePlacedOrderInDatabase(order);
    } catch (error) {
      console.error('Failed to store order in database, falling back to memory:', error);
      memoryOrders.push(order);
    }
  } else {
    memoryOrders.push(order);
  }
  
  // Add ticker to cache if order was successfully placed
  if (dhanResponse.success) {
    await addTickerToCache(alert.ticker);
  }
  
  // Keep only the last 1000 orders to prevent memory issues (fallback only)
  if (memoryOrders.length > 1000) {
    memoryOrders = memoryOrders.slice(-1000);
  }

  console.log('Order stored:', order);
  return order;
}

// Store multiple placed orders (for multi-account support)
export async function storeMultiplePlacedOrders(
  alert: TradingViewAlert,
  alertId: string,
  dhanResponses: DhanOrderResponse[],
  positionCalculations?: PositionCalculation[]
): Promise<PlacedOrder[]> {
  const orders: PlacedOrder[] = [];
  
  for (const dhanResponse of dhanResponses) {
    const index = dhanResponses.indexOf(dhanResponse);
    // Find matching position calculation by account ID
    const positionCalculation = positionCalculations?.find(calc => 
      calc.accountId === dhanResponse.accountId && 
      calc.clientId === dhanResponse.clientId
    ) || positionCalculations?.[index]; // Fallback to index-based matching
    
    const quantity = positionCalculation?.finalQuantity || 1;
    
    const order = await storePlacedOrder(alert, alertId, quantity, dhanResponse, positionCalculation);
    orders.push(order);
  }
  
  return orders;
}

// Get all placed orders
export async function getAllPlacedOrders(): Promise<PlacedOrder[]> {
  if (await isDatabaseAvailable()) {
    try {
      return await getAllPlacedOrdersFromDatabase();
    } catch (error) {
      console.error('Failed to get orders from database, falling back to memory:', error);
    }
  }

  // Fallback to memory storage
  return [...memoryOrders].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// Get orders by ticker
export async function getOrdersByTicker(ticker: string): Promise<PlacedOrder[]> {
  if (await isDatabaseAvailable()) {
    try {
      return await getOrdersByTickerFromDatabase(ticker);
    } catch (error) {
      console.error('Failed to get orders by ticker from database, falling back to memory:', error);
    }
  }

  // Fallback to memory storage
  return memoryOrders
    .filter(order => order.ticker.toUpperCase() === ticker.toUpperCase())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Get orders by status
export async function getOrdersByStatus(status: PlacedOrder['status']): Promise<PlacedOrder[]> {
  if (await isDatabaseAvailable()) {
    try {
      return await getOrdersByStatusFromDatabase(status);
    } catch (error) {
      console.error('Failed to get orders by status from database, falling back to memory:', error);
    }
  }

  // Fallback to memory storage
  return memoryOrders
    .filter(order => order.status === status)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Get order statistics
export async function getOrderStats(): Promise<{
  totalOrders: number;
  placedOrders: number;
  failedOrders: number;
  pendingOrders: number;
  totalQuantity: number;
  totalValue: number;
  uniqueTickers: number;
}> {
  if (await isDatabaseAvailable()) {
    try {
      return await getOrderStatsFromDatabase();
    } catch (error) {
      console.error('Failed to get order stats from database, falling back to memory:', error);
    }
  }

  // Fallback to memory storage
  const placedOrders = memoryOrders.filter(o => o.status === 'placed');
  const failedOrders = memoryOrders.filter(o => o.status === 'failed');
  const pendingOrders = memoryOrders.filter(o => o.status === 'pending');
  
  const totalQuantity = placedOrders.reduce((sum, order) => sum + order.quantity, 0);
  const totalValue = placedOrders.reduce((sum, order) => sum + (order.price * order.quantity), 0);
  const uniqueTickers = new Set(memoryOrders.map(o => o.ticker)).size;

  return {
    totalOrders: memoryOrders.length,
    placedOrders: placedOrders.length,
    failedOrders: failedOrders.length,
    pendingOrders: pendingOrders.length,
    totalQuantity,
    totalValue,
    uniqueTickers
  };
}

// Get orders by date range
export function getOrdersByDateRange(startDate: Date, endDate: Date): PlacedOrder[] {
  return memoryOrders
    .filter(order => {
      const orderDate = new Date(order.timestamp);
      return orderDate >= startDate && orderDate <= endDate;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Get orders with custom filters
export async function getOrdersWithFilters(filters: {
  tickers?: string[];
  statuses?: PlacedOrder['status'][];
  startDate?: Date;
  endDate?: Date;
}): Promise<PlacedOrder[]> {
  // Get all orders first (from database or memory)
  const allOrders = await getAllPlacedOrders();
  let filteredOrders = [...allOrders];
  
  if (filters.tickers && filters.tickers.length > 0) {
    filteredOrders = filteredOrders.filter(order => 
      filters.tickers!.some(ticker => 
        order.ticker.toUpperCase().includes(ticker.toUpperCase())
      )
    );
  }
  
  if (filters.statuses && filters.statuses.length > 0) {
    filteredOrders = filteredOrders.filter(order => 
      filters.statuses!.includes(order.status)
    );
  }
  
  if (filters.startDate) {
    filteredOrders = filteredOrders.filter(order => {
      const orderDate = new Date(order.timestamp);
      const startDate = new Date(filters.startDate!);
      startDate.setHours(0, 0, 0, 0); // Start of day
      return orderDate >= startDate;
    });
  }
  
  if (filters.endDate) {
    filteredOrders = filteredOrders.filter(order => {
      const orderDate = new Date(order.timestamp);
      const endDate = new Date(filters.endDate!);
      endDate.setHours(23, 59, 59, 999); // End of day
      return orderDate <= endDate;
    });
  }
  
  return filteredOrders.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// Update order status
export async function updateOrderStatus(orderId: string, status: PlacedOrder['status'], error?: string): Promise<boolean> {
  if (await isDatabaseAvailable()) {
    try {
      return await updateOrderStatusInDatabase(orderId, status, error);
    } catch (error) {
      console.error('Failed to update order status in database, falling back to memory:', error);
    }
  }

  // Fallback to memory storage
  const order = memoryOrders.find(o => o.id === orderId);
  if (order) {
    order.status = status;
    if (error) {
      order.error = error;
    }
    console.log('Order status updated:', { orderId, status, error });
    return true;
  }
  return false;
}
