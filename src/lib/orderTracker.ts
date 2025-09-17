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

// Generate unique order ID
function generateOrderId(): string {
  return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
