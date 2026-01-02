'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DhanAccountConfig } from '@/lib/multiAccountManager';

interface BuyOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: {
    symbol: string;
    name: string;
    currentPrice: number;
  } | null;
  onOrderPlaced: (result: OrderResult) => void;
}

interface OrderResult {
  symbol: string;
  success: boolean;
  message: string;
  orderId?: string;
  quantity?: number;
  orderValue?: number;
}

interface OrderFormData {
  executionType: 'MARKET' | 'LIMIT';
  productType: 'CNC' | 'INTRADAY';
  price: number;
}

export default function BuyOrderModal({ isOpen, onClose, stock, onOrderPlaced }: BuyOrderModalProps) {
  const { token, user } = useAuth();
  const [formData, setFormData] = useState<OrderFormData>({
    executionType: 'MARKET',
    productType: 'CNC',
    price: 0
  });
  const [accounts, setAccounts] = useState<DhanAccountConfig[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load accounts when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadAccounts();
    }
  }, [isOpen, user]);

  // Update price when stock changes
  useEffect(() => {
    if (stock) {
      setFormData(prev => ({
        ...prev,
        price: stock.currentPrice
      }));
    }
  }, [stock]);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/account-config');
      const data = await response.json();

      if (data.success && data.data.config && data.data.config.accounts) {
        let filteredAccounts = data.data.config.accounts;

        if (user?.dhanClientId) {
          filteredAccounts = data.data.config.accounts.filter(
            (account: DhanAccountConfig) => account.clientId === user.dhanClientId
          );

          if (filteredAccounts.length === 0) {
            setError(`No accounts found for your DHAN Client ID: ${user.dhanClientId}`);
            return;
          }
        } else {
          setError('Your account does not have a DHAN Client ID assigned.');
          return;
        }

        setAccounts(filteredAccounts);
        if (filteredAccounts.length > 0) {
          setSelectedAccountId(filteredAccounts[0].accountId.toString());
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

  const handleInputChange = (field: keyof OrderFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError(null);
  };

  const handleSubmit = async () => {
    if (!token || !stock || !selectedAccountId) {
      setError('Missing required information');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/quick-buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ticker: stock.symbol,
          currentPrice: formData.executionType === 'LIMIT' ? formData.price : stock.currentPrice,
          productType: formData.productType,
          executionType: formData.executionType,
          accountId: parseInt(selectedAccountId)
        })
      });

      const data = await response.json();

      if (data.success) {
        onOrderPlaced({
          symbol: stock.symbol,
          success: true,
          message: 'Order placed successfully!',
          orderId: data.data.orderId,
          quantity: data.data.quantity,
          orderValue: data.data.orderValue
        });
        onClose();
      } else {
        setError(data.error || 'Order placement failed');
      }
    } catch (err) {
      console.error('Error placing order:', err);
      setError('Failed to connect to the server');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !stock) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Buy {stock.symbol}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stock.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-300">Loading...</span>
              </div>
            ) : (
              <>
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Current Price Display */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Current Price</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      ₹{stock.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Account Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Account
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  >
                    {accounts.map((account) => (
                      <option key={account.accountId} value={account.accountId}>
                        {account.clientId} (₹{account.availableFunds.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Execution Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Execution Type
                  </label>
                  <div className="inline-flex w-full rounded-md shadow-sm border border-gray-300 dark:border-gray-600 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleInputChange('executionType', 'MARKET')}
                      className={`flex-1 px-4 py-2 text-sm font-medium focus:outline-none ${
                        formData.executionType === 'MARKET'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      MARKET
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('executionType', 'LIMIT')}
                      className={`flex-1 px-4 py-2 text-sm font-medium focus:outline-none border-l border-gray-300 dark:border-gray-600 ${
                        formData.executionType === 'LIMIT'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      LIMIT
                    </button>
                  </div>
                </div>

                {/* Limit Price (only shown for LIMIT orders) */}
                {formData.executionType === 'LIMIT' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Limit Price (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.price || ''}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                      step="0.05"
                      min="0.05"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    />
                  </div>
                )}

                {/* Product Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Product Type
                  </label>
                  <div className="inline-flex w-full rounded-md shadow-sm border border-gray-300 dark:border-gray-600 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleInputChange('productType', 'CNC')}
                      className={`flex-1 px-4 py-2 text-sm font-medium focus:outline-none ${
                        formData.productType === 'CNC'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      CNC
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('productType', 'INTRADAY')}
                      className={`flex-1 px-4 py-2 text-sm font-medium focus:outline-none border-l border-gray-300 dark:border-gray-600 ${
                        formData.productType === 'INTRADAY'
                          ? 'bg-orange-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      INTRADAY
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {formData.productType === 'CNC'
                      ? 'Delivery trade - No leverage, full margin required.'
                      : 'Intraday trade - With leverage, must square off before market close.'
                    }
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isLoading || !selectedAccountId}
              className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                  Place BUY Order
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
