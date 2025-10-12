export interface TradingViewAlert {
  ticker: string;
  price: number;
  signal: 'BUY' | 'SELL' | 'HOLD';
  strategy: string;
  timestamp: string;
  custom_note?: string;
  webhook_secret?: string;
}

export interface ChartInkAlert {
  stocks: string;
  trigger_prices: string;
  triggered_at: string;
  scan_name: string;
  scan_url: string;
  alert_name: string;
  webhook_url: string;
}

export interface ChartInkProcessedAlert {
  ticker: string;
  price: number;
  signal: 'BUY' | 'SELL' | 'HOLD';
  strategy: string;
  timestamp: string;
  custom_note?: string;
  originalAlert: ChartInkAlert;
}

export interface AlertLogEntry {
  id: string;
  timestamp: string;
  data: TradingViewAlert | ChartInkProcessedAlert;
  alertType: 'TradingView' | 'ChartInk';
}

export interface AlertFilters {
  startDate?: string;
  endDate?: string;
  ticker?: string;
  signal?: string;
  strategy?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
