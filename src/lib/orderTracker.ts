import { TradingViewAlert } from '@/types/alert';
import { DhanOrderResponse } from './dhanApi';
import { PositionCalculation } from './fundManager';

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
}

// In-memory order storage for serverless environments
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
export function hasTickerBeenOrderedToday(ticker: string): boolean {
  const today = getCurrentDateString();
  const cacheEntry = tickerCache.find(entry => 
    entry.ticker.toUpperCase() === ticker.toUpperCase() && 
    entry.date === today
  );
  return !!cacheEntry;
}

// Add ticker to cache for today
export function addTickerToCache(ticker: string): void {
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
export function getTickerCacheStats(): {
  totalEntries: number;
  todayEntries: number;
  tickersOrderedToday: string[];
} {
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
export function storePlacedOrder(
  alert: TradingViewAlert,
  alertId: string,
  quantity: number,
  dhanResponse: DhanOrderResponse,
  positionCalculation?: PositionCalculation
): PlacedOrder {
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
    targetPrice
  };

  memoryOrders.push(order);
  
  // Add ticker to cache if order was successfully placed
  if (dhanResponse.success) {
    addTickerToCache(alert.ticker);
  }
  
  // Keep only the last 1000 orders to prevent memory issues
  if (memoryOrders.length > 1000) {
    memoryOrders = memoryOrders.slice(-1000);
  }

  console.log('Order stored:', order);
  return order;
}

// Get all placed orders
export function getAllPlacedOrders(): PlacedOrder[] {
  return [...memoryOrders].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// Get orders by ticker
export function getOrdersByTicker(ticker: string): PlacedOrder[] {
  return memoryOrders
    .filter(order => order.ticker.toUpperCase() === ticker.toUpperCase())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Get orders by status
export function getOrdersByStatus(status: PlacedOrder['status']): PlacedOrder[] {
  return memoryOrders
    .filter(order => order.status === status)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Get order statistics
export function getOrderStats(): {
  totalOrders: number;
  placedOrders: number;
  failedOrders: number;
  pendingOrders: number;
  totalQuantity: number;
  totalValue: number;
  uniqueTickers: number;
} {
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
export function getOrdersWithFilters(filters: {
  tickers?: string[];
  statuses?: PlacedOrder['status'][];
  startDate?: Date;
  endDate?: Date;
}): PlacedOrder[] {
  let filteredOrders = [...memoryOrders];
  
  if (filters.tickers && filters.tickers.length > 0) {
    filteredOrders = filteredOrders.filter(order => 
      filters.tickers!.some(ticker => 
        order.ticker.toUpperCase() === ticker.toUpperCase()
      )
    );
  }
  
  if (filters.statuses && filters.statuses.length > 0) {
    filteredOrders = filteredOrders.filter(order => 
      filters.statuses!.includes(order.status)
    );
  }
  
  if (filters.startDate) {
    filteredOrders = filteredOrders.filter(order => 
      new Date(order.timestamp) >= filters.startDate!
    );
  }
  
  if (filters.endDate) {
    filteredOrders = filteredOrders.filter(order => 
      new Date(order.timestamp) <= filters.endDate!
    );
  }
  
  return filteredOrders.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// Update order status
export function updateOrderStatus(orderId: string, status: PlacedOrder['status'], error?: string): boolean {
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
