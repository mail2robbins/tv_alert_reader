'use client';

import { useState, useCallback } from 'react';
import { AlertLogEntry } from '@/types/alert';
import AlertTable from '@/components/AlertTable';
import DateFilter from '@/components/DateFilter';
import AlertFilters from '@/components/AlertFilters';
import StatsCard from '@/components/StatsCard';
import OrdersTable from '@/components/OrdersTable';
import OrderStatsCard from '@/components/OrderStatsCard';
import FundManager from '@/components/FundManager';
import { PlacedOrder } from '@/lib/orderTracker';

interface Stats {
  totalAlerts: number;
  buySignals: number;
  sellSignals: number;
  uniqueTickers: number;
  strategies: string[];
}

export default function Home() {
  const [alerts, setAlerts] = useState<AlertLogEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [orderStats, setOrderStats] = useState<{
    totalOrders: number;
    placedOrders: number;
    failedOrders: number;
    pendingOrders: number;
    totalQuantity: number;
    totalValue: number;
    uniqueTickers: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [filterInputs, setFilterInputs] = useState<{
    ticker: string;
    signal: string;
    strategy: string;
  }>({
    ticker: '',
    signal: '',
    strategy: ''
  });


  const handleDateChange = useCallback((newStartDate: Date | null, newEndDate: Date | null) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  }, []);


  const handleLoadData = useCallback(() => {
    // Apply the current filter inputs to the actual filters
    const newFilters = {
      ticker: filterInputs.ticker || undefined,
      signal: filterInputs.signal || undefined,
      strategy: filterInputs.strategy || undefined,
    };
    
    // Fetch data with filters
    setIsLoading(true);
    const fetchFilteredData = async () => {
      try {
        const params = new URLSearchParams();
        
        if (startDate) {
          params.append('startDate', startDate.toISOString().split('T')[0]);
        }
        if (endDate) {
          params.append('endDate', endDate.toISOString().split('T')[0]);
        }
        if (newFilters.ticker) {
          params.append('ticker', newFilters.ticker);
        }
        if (newFilters.signal) {
          params.append('signal', newFilters.signal);
        }
        if (newFilters.strategy) {
          params.append('strategy', newFilters.strategy);
        }
        params.append('includeStats', 'true');

        const response = await fetch(`/api/alerts?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          setAlerts(data.data.alerts);
          setStats(data.data.stats);
        } else {
          console.error('Failed to fetch alerts:', data.error);
        }
      } catch (error) {
        console.error('Error fetching alerts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFilteredData();
  }, [filterInputs, startDate, endDate]);

  const handleLoadAllData = useCallback(() => {
    // Load all data without any filters
    setFilterInputs({ ticker: '', signal: '', strategy: '' });
    
    // Fetch data directly without filters
    setIsLoading(true);
    const fetchAllData = async () => {
      try {
        const params = new URLSearchParams();
        params.append('includeStats', 'true');

        const response = await fetch(`/api/alerts?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          setAlerts(data.data.alerts);
          setStats(data.data.stats);
        } else {
          console.error('Failed to fetch alerts:', data.error);
        }
      } catch (error) {
        console.error('Error fetching alerts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllData();
  }, []);

  const handleFilterInputChange = useCallback((newInputs: {
    ticker: string;
    signal: string;
    strategy: string;
  }) => {
    setFilterInputs(newInputs);
  }, []);

  const fetchOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    try {
      const response = await fetch('/api/orders?includeStats=true');
      const data = await response.json();

      if (data.success) {
        setOrders(data.data.orders);
        setOrderStats(data.data.stats);
      } else {
        console.error('Failed to fetch orders:', data.error);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">TradingView Alert Reader</h1>
              <p className="mt-2 text-gray-600">
                Monitor and analyze your TradingView alerts in real-time
              </p>
            </div>
            <button
              onClick={handleLoadData}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Alerts"
              value={stats.totalAlerts}
              color="blue"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6zM4 5h6V1H4v4zM15 3h5v6h-5V3z" />
                </svg>
              }
            />
            <StatsCard
              title="Buy Signals"
              value={stats.buySignals}
              color="green"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />
            <StatsCard
              title="Sell Signals"
              value={stats.sellSignals}
              color="red"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              }
            />
            <StatsCard
              title="Unique Tickers"
              value={stats.uniqueTickers}
              color="yellow"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
            />
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <DateFilter
            onDateChange={handleDateChange}
            onLoadAllData={handleLoadAllData}
            isLoading={isLoading}
            startDate={startDate}
            endDate={endDate}
          />
          <AlertFilters
            onLoadData={handleLoadData}
            isLoading={isLoading}
            availableStrategies={stats?.strategies || []}
            onFilterInputChange={handleFilterInputChange}
          />
        </div>

        {/* Alerts Table */}
        <AlertTable alerts={alerts} isLoading={isLoading} />

        {/* Fund Management Section */}
        <div className="mt-8">
          <FundManager />
        </div>

        {/* Orders Section */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Trading Orders</h2>
            <button
              onClick={fetchOrders}
              disabled={isLoadingOrders}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoadingOrders ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Orders
                </>
              )}
            </button>
          </div>

          {/* Order Stats */}
          {orderStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <OrderStatsCard
                title="Total Orders"
                value={orderStats.totalOrders}
                color="blue"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
              <OrderStatsCard
                title="Placed Orders"
                value={orderStats.placedOrders}
                color="green"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                }
              />
              <OrderStatsCard
                title="Failed Orders"
                value={orderStats.failedOrders}
                color="red"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                }
              />
              <OrderStatsCard
                title="Total Value"
                value={`₹${orderStats.totalValue.toLocaleString()}`}
                color="yellow"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                }
              />
            </div>
          )}

          {/* Orders Table */}
          <OrdersTable orders={orders} isLoading={isLoadingOrders} />
        </div>

        {/* Webhook Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">Webhook Configuration</h3>
          <p className="text-blue-700 mb-4">
            Configure your TradingView alerts to send data to this webhook endpoint:
          </p>
          <div className="bg-blue-100 rounded-md p-3 font-mono text-sm text-blue-800">
            POST {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/tradingview-alert
          </div>
          <p className="text-blue-600 text-sm mt-2">
            Make sure to include your webhook secret in the payload for authentication.
          </p>
        </div>
      </div>
    </div>
  );
}