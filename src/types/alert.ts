export interface TradingViewAlert {
  ticker: string;
  price: number;
  signal: 'BUY' | 'SELL' | 'HOLD';
  strategy: string;
  timestamp: string;
  custom_note?: string;
  webhook_secret?: string;
}

export interface AlertLogEntry {
  id: string;
  timestamp: string;
  data: TradingViewAlert;
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
