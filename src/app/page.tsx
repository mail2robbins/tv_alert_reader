'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertLogEntry } from '@/types/alert';
import AlertTable from '@/components/AlertTable';
import DateFilter from '@/components/DateFilter';
import AlertFilters from '@/components/AlertFilters';
import StatsCard from '@/components/StatsCard';
import OrdersTable from '@/components/OrdersTable';
import OrderStatsCard from '@/components/OrderStatsCard';
import FundManager from '@/components/FundManager';
import AccountConfigCard from '@/components/AccountConfigCard';
import ExternalWebhookConfig from '@/components/ExternalWebhookConfig';
import TickerInput from '@/components/TickerInput';
import ProtectedRoute from '@/components/ProtectedRoute';
import ChangePassword from '@/components/ChangePassword';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { useAuth } from '@/contexts/AuthContext';
import { PlacedOrder } from '@/lib/orderTracker';

interface Stats {
  totalAlerts: number;
  buySignals: number;
  sellSignals: number;
  uniqueTickers: number;
  strategies: string[];
}

export default function Home() {
  const { user, logout } = useAuth();
  const router = useRouter();
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
  const [orderStartDate, setOrderStartDate] = useState<Date | null>(null);
  const [orderEndDate, setOrderEndDate] = useState<Date | null>(null);
  const [orderTicker, setOrderTicker] = useState<string>('');
  const [showChangePassword, setShowChangePassword] = useState(false);
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
    console.log('Date change received:', { newStartDate, newEndDate });
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  }, []);

  const handleOrderDateChange = useCallback((newStartDate: Date | null, newEndDate: Date | null) => {
    console.log('Order date change received:', { newStartDate, newEndDate });
    setOrderStartDate(newStartDate);
    setOrderEndDate(newEndDate);
  }, []);

  const handleOrderTickerChange = useCallback((ticker: string) => {
    console.log('Order ticker change received:', ticker);
    setOrderTicker(ticker);
  }, []);


  const handleLoadData = useCallback(() => {
    // Apply the current filter inputs to the actual filters
    const newFilters = {
      ticker: filterInputs.ticker || undefined,
      signal: filterInputs.signal || undefined,
      strategy: filterInputs.strategy || undefined,
    };

    console.log('Load Data clicked - Current filters:', newFilters);
    console.log('Load Data clicked - Date range:', { startDate, endDate });

    // Fetch data with filters
    setIsLoading(true);
    const fetchFilteredData = async () => {
      try {
        const params = new URLSearchParams();

        if (startDate) {
          const startDateStr = startDate.toISOString().split('T')[0];
          console.log('Sending startDate:', startDateStr);
          params.append('startDate', startDateStr);
        }
        if (endDate) {
          const endDateStr = endDate.toISOString().split('T')[0];
          console.log('Sending endDate:', endDateStr);
          params.append('endDate', endDateStr);
        }
        if (newFilters.ticker) {
          console.log('Searching for ticker containing:', newFilters.ticker);
          params.append('ticker', newFilters.ticker);
        }
        if (newFilters.signal) {
          params.append('signal', newFilters.signal);
        }
        if (newFilters.strategy) {
          params.append('strategy', newFilters.strategy);
        }
        params.append('includeStats', 'true');
        // Add cache-busting parameter to ensure fresh data
        params.append('_t', Date.now().toString());

        const response = await fetch(`/api/alerts?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          console.log('API Response:', { alertsCount: data.data.alerts.length, stats: data.data.stats });
          // Force state update by creating new arrays
          setAlerts([...data.data.alerts]);
          setStats({ ...data.data.stats });
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
    // Load all data without any filters - clear all filters including dates
    setFilterInputs({ ticker: '', signal: '', strategy: '' });
    setStartDate(null);
    setEndDate(null);

    // Fetch data directly without filters
    setIsLoading(true);
    const fetchAllData = async () => {
      try {
        const params = new URLSearchParams();
        params.append('includeStats', 'true');
        // Add cache-busting parameter to ensure fresh data
        params.append('_t', Date.now().toString());

        const response = await fetch(`/api/alerts?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          // Force state update by creating new arrays
          setAlerts([...data.data.alerts]);
          setStats({ ...data.data.stats });
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
    console.log('Filter inputs changed:', newInputs);
    setFilterInputs(newInputs);
  }, []);

  const fetchOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    try {
      const params = new URLSearchParams();
      params.append('includeStats', 'true');

      // Add date filters if they exist
      if (orderStartDate) {
        const startDateStr = orderStartDate.toISOString().split('T')[0];
        params.append('startDate', startDateStr);
      }
      if (orderEndDate) {
        const endDateStr = orderEndDate.toISOString().split('T')[0];
        params.append('endDate', endDateStr);
      }

      // Add ticker filter if it exists
      if (orderTicker.trim()) {
        params.append('ticker', orderTicker.trim());
      }

      // Add cache-busting parameter
      params.append('_t', Date.now().toString());

      const response = await fetch(`/api/orders?${params.toString()}`);
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
  }, [orderStartDate, orderEndDate, orderTicker]);

  const handleLoadAllOrders = useCallback(() => {
    // Clear all order filters and load all orders
    setOrderStartDate(null);
    setOrderEndDate(null);
    setOrderTicker('');

    // Fetch all orders without any filters
    setIsLoadingOrders(true);
    const fetchAllOrders = async () => {
      try {
        const params = new URLSearchParams();
        params.append('includeStats', 'true');
        params.append('_t', Date.now().toString());

        const response = await fetch(`/api/orders?${params.toString()}`);
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
    };

    fetchAllOrders();
  }, []);

  return (
    <ProtectedRoute requireApproval={true}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                      <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 32 32">
                        <rect width="32" height="32" rx="6" fill="currentColor" />
                        <path d="M4 24 L8 20 L12 22 L16 16 L20 18 L24 12 L28 14" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        <circle cx="8" cy="20" r="2" fill="#10b981" />
                        <circle cx="16" cy="16" r="2" fill="#10b981" />
                        <circle cx="24" cy="12" r="2" fill="#10b981" />
                        <path d="M24 6 C24.5 6 25 6.5 25 7 L25 9 C25 9.5 24.5 10 24 10 L22 10 C21.5 10 21 9.5 21 9 L21 7 C21 6.5 21.5 6 22 6 L24 6 Z" fill="#f59e0b" />
                        <circle cx="26" cy="4" r="2" fill="#ef4444" />
                      </svg>
                      TradingView Alert Reader
                    </h1>
                    <ThemeSwitch />
                  </div>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    Monitor and analyze your TradingView alerts in real-time
                  </p>
                  {user && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Welcome, {user.fullName} ({user.username})
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 lg:flex-shrink-0 flex-wrap mt-4">
                <button
                  onClick={() => router.push('/top-gainers')}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center justify-center gap-2 text-sm"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  NSE-50 Top Gainers
                </button>
                <button
                  onClick={() => router.push('/manual-order')}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center gap-2 text-sm"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Manual Order Placement
                </button>
                <button
                  onClick={() => router.push('/advanced-order')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2 text-sm"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Advanced Order
                </button>
                <button
                  onClick={() => router.push('/account-settings')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center justify-center gap-2 text-sm"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Account Settings
                </button>
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2 text-sm"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Change Password
                </button>
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center gap-2 text-sm"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
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
              onLoadData={handleLoadData}
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

          {/* Alerts Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Trading Alerts</h2>
              <button
                onClick={() => {
                  // Build query parameters based on current filters
                  const params = new URLSearchParams();
                  if (startDate) params.append('startDate', startDate.toISOString().split('T')[0]);
                  if (endDate) params.append('endDate', endDate.toISOString().split('T')[0]);
                  if (filterInputs.ticker) params.append('ticker', filterInputs.ticker);
                  if (filterInputs.signal) params.append('signal', filterInputs.signal);
                  if (filterInputs.strategy) params.append('strategy', filterInputs.strategy);
                  params.append('format', 'csv');

                  const link = document.createElement('a');
                  link.href = `/api/alerts/export?${params.toString()}`;
                  link.download = `trading_alerts_${new Date().toISOString().slice(0, 10)}.csv`;
                  link.click();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Alerts CSV
              </button>
            </div>
            <AlertTable alerts={alerts} isLoading={isLoading} />
          </div>

          {/* Account Configuration Section */}
          <div className="mt-8">
            <AccountConfigCard />
          </div>

          {/* Fund Management Section */}
          <div className="mt-8">
            <FundManager />
          </div>

          {/* Orders Section */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Trading Orders</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/api/orders/export?format=csv';
                    link.download = `placed_orders_${new Date().toISOString().slice(0, 10)}.csv`;
                    link.click();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
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

            {/* Order Filters */}
            <div className="mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Date Filter */}
                <DateFilter
                  onDateChange={handleOrderDateChange}
                  onLoadAllData={handleLoadAllOrders}
                  onLoadData={fetchOrders}
                  isLoading={isLoadingOrders}
                  startDate={orderStartDate}
                  endDate={orderEndDate}
                />

                {/* Ticker Filter */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Filter by Ticker</h3>
                  <TickerInput
                    value={orderTicker}
                    onChange={handleOrderTickerChange}
                    placeholder="Enter ticker symbol (e.g., RELIANCE)"
                    className="mb-4"
                  />
                  <div className="flex gap-2">
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          Apply Filters
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setOrderTicker('');
                        fetchOrders();
                      }}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Clear Ticker
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <OrdersTable orders={orders} isLoading={isLoadingOrders} />
          </div>

          {/* External Webhook Configuration */}
          <div className="mt-8">
            <ExternalWebhookConfig />
          </div>

          {/* Webhook Info */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-2">TradingView Webhook Configuration</h3>
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

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePassword onClose={() => setShowChangePassword(false)} />
      )}
    </ProtectedRoute>
  );
}