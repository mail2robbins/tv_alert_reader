'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ThemeSwitch } from '@/components/ThemeSwitch';

interface StockData {
  symbol: string;
  name: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
}

export default function TopGainersPage() {
  const router = useRouter();
  const [topGainers, setTopGainers] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const fetchTopGainers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/nse-top-gainers');
      const data = await response.json();

      if (data.success) {
        setTopGainers(data.data.topGainers);
        setFetchedAt(data.data.fetchedAt);
      } else {
        setError(data.error || 'Failed to fetch top gainers');
      }
    } catch (err) {
      setError('Failed to connect to the server');
      console.error('Error fetching top gainers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 10000000) {
      return (volume / 10000000).toFixed(2) + ' Cr';
    } else if (volume >= 100000) {
      return (volume / 100000).toFixed(2) + ' L';
    } else if (volume >= 1000) {
      return (volume / 1000).toFixed(2) + ' K';
    }
    return volume.toString();
  };

  return (
    <ProtectedRoute requireApproval={true}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    NSE-50 Top Gainers
                  </h1>
                  <ThemeSwitch />
                </div>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  View the top 10 gaining stocks from NIFTY 50 in real-time
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2 text-sm"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Home
                </button>
              </div>
            </div>
          </div>

          {/* Fetch Button */}
          <div className="mb-8 flex justify-center">
            <button
              onClick={fetchTopGainers}
              disabled={isLoading}
              className="px-8 py-4 bg-green-600 text-white text-lg font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg transition-all transform hover:scale-105"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Fetching Live Data...
                </>
              ) : (
                <>
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Fetch Top 10 Gainers
                </>
              )}
            </button>
          </div>

          {/* Last Fetched Time */}
          {fetchedAt && (
            <div className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Last updated: {new Date(fetchedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Top Gainers Table */}
          {topGainers.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Symbol
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Current Price
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Change
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        % Change
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Day High
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Day Low
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Volume
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {topGainers.map((stock, index) => (
                      <tr key={stock.symbol} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 font-bold">
                            {index + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {stock.symbol}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {stock.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(stock.currentPrice)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            +{formatCurrency(stock.change)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                            +{stock.changePercent.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {formatCurrency(stock.dayHigh)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {formatCurrency(stock.dayLow)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {formatVolume(stock.volume)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && topGainers.length === 0 && !error && (
            <div className="text-center py-16">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No data yet</h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Click the button above to fetch the top 10 gainers from NSE-50
              </p>
            </div>
          )}

          {/* Info Card */}
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">About This Feature</h3>
            <p className="text-blue-700 dark:text-blue-300">
              This page fetches live stock data from Yahoo Finance for all NIFTY 50 stocks and displays the top 10 gainers 
              based on percentage change from the previous close. Data is fetched on-demand when you click the button.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
