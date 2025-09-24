'use client';

import { useState, useEffect } from 'react';

interface DhanAccountConfig {
  accountId: number;
  accessToken: string;
  clientId: string;
  availableFunds: number;
  leverage: number;
  maxPositionSize: number;
  minOrderValue: number;
  maxOrderValue: number;
  stopLossPercentage: number;
  targetPricePercentage: number;
  riskOnCapital: number;
  isActive: boolean;
}

interface MultiAccountConfig {
  accounts: DhanAccountConfig[];
  activeAccounts: DhanAccountConfig[];
}

interface ConfigurationSummary {
  totalAccounts: number;
  activeAccounts: number;
  totalAvailableFunds: number;
  totalLeveragedFunds: number;
  accounts: Array<{
    accountId: number;
    clientId: string;
    availableFunds: number;
    leverage: number;
    leveragedFunds: number;
    isActive: boolean;
  }>;
}

interface AccountConfigCardProps {
  className?: string;
}

export default function AccountConfigCard({ className = '' }: AccountConfigCardProps) {
  const [config, setConfig] = useState<MultiAccountConfig | null>(null);
  const [summary, setSummary] = useState<ConfigurationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccountConfig();
  }, []);

  const fetchAccountConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Add cache-busting parameter to force fresh data
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/account-config?includeSummary=true&t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        console.log('Account config loaded:', data.data.config);
        console.log('Account details:', data.data.config.accounts.map((acc: DhanAccountConfig) => ({
          id: acc.accountId,
          clientId: acc.clientId,
          availableFunds: acc.availableFunds,
          leverage: acc.leverage,
          maxPositionSize: acc.maxPositionSize,
          riskOnCapital: acc.riskOnCapital,
          minOrderValue: acc.minOrderValue,
          maxOrderValue: acc.maxOrderValue,
          stopLossPercentage: acc.stopLossPercentage,
          targetPricePercentage: acc.targetPricePercentage
        })));
        setConfig(data.data.config);
        setSummary(data.data.summary);
      } else {
        setError(data.error || 'Failed to fetch account configuration');
      }
    } catch (err) {
      setError('Failed to fetch account configuration');
      console.error('Error fetching account config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Account Configuration</h3>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Account Configuration</h3>
        </div>
        <div className="p-6 text-center">
          <div className="text-red-500">
            <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading configuration</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <button
              onClick={fetchAccountConfig}
              className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!config || !summary) {
    return (
      <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Account Configuration</h3>
        </div>
        <div className="p-6 text-center">
          <div className="text-gray-500">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No configuration data</h3>
            <p className="mt-1 text-sm text-gray-500">Unable to load account configuration.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Account Configuration</h3>
            <p className="mt-1 text-sm text-gray-500">
              {summary.activeAccounts} of {summary.totalAccounts} accounts active
            </p>
          </div>
          <button
            onClick={fetchAccountConfig}
            disabled={isLoading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </>
            ) : (
              <>
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              ₹{summary.totalAvailableFunds.toLocaleString()}
            </div>
            <div className="text-sm text-blue-600">Total Available Funds</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              ₹{summary.totalLeveragedFunds.toLocaleString()}
            </div>
            <div className="text-sm text-green-600">Total Leveraged Funds</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {summary.activeAccounts}
            </div>
            <div className="text-sm text-purple-600">Active Accounts</div>
          </div>
        </div>

        {/* Account Details */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Account Details</h4>
          {config.accounts.map((account) => (
            <div
              key={account.accountId}
              className={`border rounded-lg p-4 ${
                account.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <h5 className="font-medium text-gray-900">
                    Account #{account.accountId}
                  </h5>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    account.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {account.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {account.clientId}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-white p-3 rounded border">
                  <div className="text-gray-500 text-xs">Available Funds</div>
                  <div className="font-bold text-lg text-gray-900">₹{(account.availableFunds || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-gray-500 text-xs">Leverage</div>
                  <div className="font-bold text-lg text-gray-900">{(account.leverage || 0)}x</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-gray-500 text-xs">Max Position</div>
                  <div className="font-bold text-lg text-gray-900">{((account.maxPositionSize || 0) * 100).toFixed(1)}%</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-gray-500 text-xs">Risk on Capital</div>
                  <div className="font-bold text-lg text-gray-900">{((account.riskOnCapital || 0) * 100).toFixed(0)}%</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-gray-500 text-xs">Min Order Value</div>
                  <div className="font-bold text-lg text-gray-900">₹{(account.minOrderValue || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-gray-500 text-xs">Max Order Value</div>
                  <div className="font-bold text-lg text-gray-900">₹{(account.maxOrderValue || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-gray-500 text-xs">Stop Loss</div>
                  <div className="font-bold text-lg text-gray-900">{((account.stopLossPercentage || 0) * 100).toFixed(2)}%</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-gray-500 text-xs">Target Price</div>
                  <div className="font-bold text-lg text-gray-900">{((account.targetPricePercentage || 0) * 100).toFixed(2)}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
