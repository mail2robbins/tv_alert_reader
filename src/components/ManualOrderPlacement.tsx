'use client';

import { useState, useEffect } from 'react';
import { DhanAccountConfig } from '@/lib/multiAccountManager';

interface ManualOrderForm {
  accountId: string;
  orderType: 'BUY' | 'SELL';
  ticker: string;
  currentPrice: number;
}

interface ManualOrderPlacementProps {
  onOrderPlaced?: (result: unknown) => void;
}

export default function ManualOrderPlacement({ onOrderPlaced }: ManualOrderPlacementProps) {
  const [formData, setFormData] = useState<ManualOrderForm>({
    accountId: '',
    orderType: 'BUY',
    ticker: '',
    currentPrice: 0
  });
  
  const [accounts, setAccounts] = useState<DhanAccountConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load available accounts on component mount
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/account-config');
        const data = await response.json();
        
        if (data.success && data.data.config && data.data.config.accounts) {
          setAccounts(data.data.config.accounts);
          // Auto-select first account if available
          if (data.data.config.accounts.length > 0) {
            setFormData(prev => ({
              ...prev,
              accountId: data.data.config.accounts[0].accountId.toString()
            }));
          }
        } else {
          setError('Failed to load account configurations');
        }
      } catch (err) {
        console.error('Error loading accounts:', err);
        setError('Failed to load account configurations');
      } finally {
        setIsLoading(false);
      }
    };

    loadAccounts();
  }, []);

  const handleInputChange = (field: keyof ManualOrderForm, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear previous messages when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.accountId) {
      setError('Please select an account');
      return;
    }
    
    if (!formData.ticker.trim()) {
      setError('Please enter a ticker symbol');
      return;
    }
    
    if (formData.currentPrice <= 0) {
      setError('Please enter a valid current price');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/place-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: parseInt(formData.accountId),
          orderType: formData.orderType,
          ticker: formData.ticker.trim().toUpperCase(),
          currentPrice: formData.currentPrice
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Order placed successfully! Order ID: ${result.data.orderId || result.data.correlationId}`);
        
        // Reset form
        setFormData({
          accountId: formData.accountId, // Keep selected account
          orderType: 'BUY',
          ticker: '',
          currentPrice: 0
        });
        
        // Notify parent component
        if (onOrderPlaced) {
          onOrderPlaced(result);
        }
      } else {
        setError(result.error || 'Failed to place order');
      }
    } catch (err) {
      console.error('Error placing order:', err);
      setError('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAccount = accounts.find(acc => acc.accountId.toString() === formData.accountId);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Manual Order Placement</h2>
        <p className="text-gray-600">
          Place a manual order using your configured account settings. The order will use the same 
          position sizing, stop loss, and target price calculations as automatic TradingView alerts.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading account configurations...</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <div className="mt-2 text-sm text-green-700">{success}</div>
            </div>
          </div>
        </div>
      )}

      {!isLoading && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Selection */}
          <div>
            <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 mb-2">
              Select Account
            </label>
            <select
              id="accountId"
              value={formData.accountId}
              onChange={(e) => handleInputChange('accountId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              required
            >
              <option value="">Choose an account...</option>
              {accounts.map((account) => (
                <option key={account.accountId} value={account.accountId}>
                  Account {account.accountId} - {account.clientId} (₹{account.availableFunds.toLocaleString()} available)
                </option>
              ))}
            </select>
          </div>

          {/* Order Type */}
          <div>
            <label htmlFor="orderType" className="block text-sm font-medium text-gray-700 mb-2">
              Order Type
            </label>
            <select
              id="orderType"
              value={formData.orderType}
              onChange={(e) => handleInputChange('orderType', e.target.value as 'BUY' | 'SELL')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            >
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>

          {/* Ticker Input */}
          <div>
            <label htmlFor="ticker" className="block text-sm font-medium text-gray-700 mb-2">
              Ticker Symbol
            </label>
            <input
              type="text"
              id="ticker"
              value={formData.ticker}
              onChange={(e) => handleInputChange('ticker', e.target.value.toUpperCase())}
              placeholder="e.g., RELIANCE, TCS, INFY"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-500"
              required
            />
          </div>

          {/* Current Price */}
          <div>
            <label htmlFor="currentPrice" className="block text-sm font-medium text-gray-700 mb-2">
              Current Price (₹)
            </label>
            <input
              type="number"
              id="currentPrice"
              value={formData.currentPrice || ''}
              onChange={(e) => handleInputChange('currentPrice', parseFloat(e.target.value) || 0)}
              placeholder="e.g., 2500.50"
              step="0.01"
              min="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-500"
              required
            />
          </div>

          {/* Account Configuration Preview */}
          {selectedAccount && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Account Configuration Preview</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Available Funds:</span>
                  <span className="ml-2 font-semibold text-gray-900">₹{selectedAccount.availableFunds.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">Leverage:</span>
                  <span className="ml-2 font-semibold text-gray-900">{selectedAccount.leverage}x</span>
                </div>
                <div>
                  <span className="text-gray-600">Stop Loss:</span>
                  <span className="ml-2 font-semibold text-gray-900">{(selectedAccount.stopLossPercentage * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-gray-600">Target Price:</span>
                  <span className="ml-2 font-semibold text-gray-900">{(selectedAccount.targetPricePercentage * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-gray-600">Risk on Capital:</span>
                  <span className="ml-2 font-semibold text-gray-900">{(selectedAccount.riskOnCapital * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-gray-600">Trailing Stop:</span>
                  <span className="ml-2 font-semibold text-gray-900">{selectedAccount.enableTrailingStopLoss ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !formData.accountId || !formData.ticker || formData.currentPrice <= 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Placing Order...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Place Order
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
