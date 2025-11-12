'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DhanAccountConfig } from '@/lib/multiAccountManager';

interface AdvancedOrderForm {
  accountId: string;
  orderType: 'BUY' | 'SELL';
  executionType: 'MARKET' | 'LIMIT';
  productType: 'CNC' | 'INTRADAY';
  ticker: string;
  currentPrice: number;
  availableFunds: number;
  leverage: number;
  stopLossPercentage: number;
  stopLossAmount: number;
  targetPricePercentage: number;
  targetPriceAmount: number;
  riskOnCapital: number;
  trailingStopEnabled: boolean;
}

interface AdvancedManualOrderPlacementProps {
  onOrderPlaced?: (result: unknown) => void;
}

export default function AdvancedManualOrderPlacement({ onOrderPlaced }: AdvancedManualOrderPlacementProps) {
  const { token, user } = useAuth();
  const [formData, setFormData] = useState<AdvancedOrderForm>({
    accountId: '',
    orderType: 'BUY',
    executionType: 'MARKET',
    productType: 'CNC',
    ticker: '',
    currentPrice: 0,
    availableFunds: 2000,
    leverage: 2,
    stopLossPercentage: 0.55,
    stopLossAmount: 0,
    targetPricePercentage: 3.50,
    targetPriceAmount: 0,
    riskOnCapital: 150.0,
    trailingStopEnabled: true
  });
  
  const [accounts, setAccounts] = useState<DhanAccountConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load available accounts and settings on component mount
  useEffect(() => {
    const loadAccountsAndSettings = async () => {
      try {
        setIsLoading(true);
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
            setError('Your account does not have a DHAN Client ID assigned. Please contact the administrator.');
            return;
          }
          
          setAccounts(filteredAccounts);
          
          // Auto-select first account and load its settings
          if (filteredAccounts.length > 0) {
            const firstAccount = filteredAccounts[0];
            setFormData(prev => ({
              ...prev,
              accountId: firstAccount.accountId.toString(),
              availableFunds: firstAccount.availableFunds,
              leverage: firstAccount.leverage,
              stopLossPercentage: firstAccount.stopLossPercentage * 100,
              targetPricePercentage: firstAccount.targetPricePercentage * 100,
              riskOnCapital: firstAccount.riskOnCapital * 100,
              trailingStopEnabled: firstAccount.enableTrailingStopLoss
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

    if (user) {
      loadAccountsAndSettings();
    }
  }, [user]);

  const handleInputChange = (field: keyof AdvancedOrderForm, value: string | number | boolean) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      // Auto-switch logic for CNC/SELL restriction
      // If Order Type is changed to SELL and Product Type is CNC, switch to INTRADAY
      if (field === 'orderType' && value === 'SELL' && prev.productType === 'CNC') {
        newData.productType = 'INTRADAY';
      }
      
      // If Product Type is changed to CNC and Order Type is SELL, switch to BUY
      if (field === 'productType' && value === 'CNC' && prev.orderType === 'SELL') {
        newData.orderType = 'BUY';
      }

      // If Product Type is changed to CNC, set leverage to 1 and riskOnCapital to 100%
      // CNC orders don't use leverage (delivery trading)
      if (field === 'productType' && value === 'CNC') {
        newData.leverage = 1;
        newData.riskOnCapital = 100.0; // 100% for CNC (will be converted to 1.0 when sending)
      }

      return newData;
    });
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  // Helper function to round to nearest tick size (0.05)
  const roundToTickSize = (price: number): number => {
    const tickSize = 0.05;
    return Math.round(price / tickSize) * tickSize;
  };

  // Calculate SL amount from percentage
  const calculateStopLossAmount = () => {
    if (formData.currentPrice > 0) {
      const slAmount = formData.orderType === 'BUY'
        ? formData.currentPrice * (1 - formData.stopLossPercentage / 100)
        : formData.currentPrice * (1 + formData.stopLossPercentage / 100);
      
      const roundedAmount = roundToTickSize(slAmount);
      setFormData(prev => ({
        ...prev,
        stopLossAmount: parseFloat(roundedAmount.toFixed(2))
      }));
    }
  };

  // Calculate Target amount from percentage
  const calculateTargetAmount = () => {
    if (formData.currentPrice > 0) {
      const targetAmount = formData.orderType === 'BUY'
        ? formData.currentPrice * (1 + formData.targetPricePercentage / 100)
        : formData.currentPrice * (1 - formData.targetPricePercentage / 100);
      
      const roundedAmount = roundToTickSize(targetAmount);
      setFormData(prev => ({
        ...prev,
        targetPriceAmount: parseFloat(roundedAmount.toFixed(2))
      }));
    }
  };

  // Calculate SL percentage from amount
  const calculateStopLossPercentage = () => {
    if (formData.currentPrice > 0 && formData.stopLossAmount > 0) {
      const percentage = formData.orderType === 'BUY'
        ? ((formData.currentPrice - formData.stopLossAmount) / formData.currentPrice) * 100
        : ((formData.stopLossAmount - formData.currentPrice) / formData.currentPrice) * 100;
      
      setFormData(prev => ({
        ...prev,
        stopLossPercentage: parseFloat(percentage.toFixed(2))
      }));
    }
  };

  // Calculate Target percentage from amount
  const calculateTargetPercentage = () => {
    if (formData.currentPrice > 0 && formData.targetPriceAmount > 0) {
      const percentage = formData.orderType === 'BUY'
        ? ((formData.targetPriceAmount - formData.currentPrice) / formData.currentPrice) * 100
        : ((formData.currentPrice - formData.targetPriceAmount) / formData.currentPrice) * 100;
      
      setFormData(prev => ({
        ...prev,
        targetPricePercentage: parseFloat(percentage.toFixed(2))
      }));
    }
  };

  const handleGetCurrentPrice = async () => {
    if (!formData.ticker.trim()) {
      setError('Please enter a ticker symbol first');
      return;
    }

    try {
      setIsFetchingPrice(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/get-stock-price?ticker=${encodeURIComponent(formData.ticker.trim())}`);
      const result = await response.json();

      if (result.success && result.data.price) {
        const price = result.data.price;
        
        // Calculate Stop Loss and Target amounts based on current percentages
        const slAmount = formData.orderType === 'BUY'
          ? price * (1 - formData.stopLossPercentage / 100)
          : price * (1 + formData.stopLossPercentage / 100);
        
        const targetAmount = formData.orderType === 'BUY'
          ? price * (1 + formData.targetPricePercentage / 100)
          : price * (1 - formData.targetPricePercentage / 100);
        
        // Round to nearest tick size (0.05)
        const roundedSL = roundToTickSize(slAmount);
        const roundedTarget = roundToTickSize(targetAmount);
        
        setFormData(prev => ({
          ...prev,
          currentPrice: price,
          stopLossAmount: parseFloat(roundedSL.toFixed(2)),
          targetPriceAmount: parseFloat(roundedTarget.toFixed(2))
        }));
        setSuccess(`Price fetched successfully: ₹${price.toFixed(2)}`);
      } else {
        setError(result.error || 'Failed to fetch stock price');
      }
    } catch (err) {
      console.error('Error fetching stock price:', err);
      setError('Failed to fetch stock price. Please try again.');
    } finally {
      setIsFetchingPrice(false);
    }
  };

  const handleAccountChange = (accountId: string) => {
    const selectedAccount = accounts.find(acc => acc.accountId.toString() === accountId);
    if (selectedAccount) {
      setFormData(prev => ({
        ...prev,
        accountId,
        availableFunds: selectedAccount.availableFunds,
        leverage: selectedAccount.leverage,
        stopLossPercentage: selectedAccount.stopLossPercentage * 100,
        targetPricePercentage: selectedAccount.targetPricePercentage * 100,
        riskOnCapital: selectedAccount.riskOnCapital * 100,
        trailingStopEnabled: selectedAccount.enableTrailingStopLoss
      }));
    }
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

    // CNC validation - cannot short sell
    if (formData.productType === 'CNC' && formData.orderType === 'SELL') {
      setError('Cannot short sell using CNC product type. Please use INTRADAY for short selling.');
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
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          accountId: parseInt(formData.accountId),
          orderType: formData.orderType,
          executionType: formData.executionType,
          productType: formData.productType,
          ticker: formData.ticker.trim().toUpperCase(),
          currentPrice: formData.currentPrice,
          // Pass custom settings
          customSettings: {
            availableFunds: formData.availableFunds,
            leverage: formData.productType === 'INTRADAY' ? formData.leverage : 1,
            stopLossPercentage: formData.stopLossPercentage / 100,
            targetPricePercentage: formData.targetPricePercentage / 100,
            riskOnCapital: formData.productType === 'INTRADAY' ? formData.riskOnCapital / 100 : 1.0,
            enableTrailingStopLoss: formData.productType === 'INTRADAY' ? formData.trailingStopEnabled : false
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Order placed successfully! Order ID: ${result.data.orderId || result.data.correlationId}`);
        
        // Reset form but keep account and settings
        setFormData(prev => ({
          ...prev,
          ticker: '',
          currentPrice: 0,
          stopLossAmount: 0,
          targetPriceAmount: 0
        }));
        
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

  const handleSubmitAllAccounts = async () => {
    // Validation
    if (!formData.ticker.trim()) {
      setError('Please enter a ticker symbol');
      return;
    }
    
    if (formData.currentPrice <= 0) {
      setError('Please enter a valid current price');
      return;
    }

    // CNC validation - cannot short sell
    if (formData.productType === 'CNC' && formData.orderType === 'SELL') {
      setError('Cannot short sell using CNC product type. Please use INTRADAY for short selling.');
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
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          placeInAllAccounts: true,
          orderType: formData.orderType,
          executionType: formData.executionType,
          productType: formData.productType,
          ticker: formData.ticker.trim().toUpperCase(),
          currentPrice: formData.currentPrice,
          // Pass custom settings
          customSettings: {
            availableFunds: formData.availableFunds,
            leverage: formData.productType === 'INTRADAY' ? formData.leverage : 1,
            stopLossPercentage: formData.stopLossPercentage / 100,
            targetPricePercentage: formData.targetPricePercentage / 100,
            riskOnCapital: formData.productType === 'INTRADAY' ? formData.riskOnCapital / 100 : 1.0,
            enableTrailingStopLoss: formData.productType === 'INTRADAY' ? formData.trailingStopEnabled : false
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        const summary = result.data.summary;
        setSuccess(
          `Orders placed in ${summary.successfulOrders} of ${summary.totalAccounts} accounts! ` +
          (summary.failedOrders > 0 ? `${summary.failedOrders} failed.` : '')
        );
        
        // Reset form but keep account and settings
        setFormData(prev => ({
          ...prev,
          ticker: '',
          currentPrice: 0,
          stopLossAmount: 0,
          targetPriceAmount: 0
        }));
        
        if (onOrderPlaced) {
          onOrderPlaced(result);
        }
      } else {
        setError(result.error || 'Failed to place orders');
      }
    } catch (err) {
      console.error('Error placing orders:', err);
      setError('Failed to place orders. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Advanced Manual Order Placement</h2>
        <p className="text-gray-600">
          Place orders with customizable settings. Modify account parameters temporarily for this session only.
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
        <form className="space-y-6">
          {/* Account Selection */}
          <div>
            <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 mb-2">
              Select Account
            </label>
            <select
              id="accountId"
              value={formData.accountId}
              onChange={(e) => handleAccountChange(e.target.value)}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order Type
            </label>
            <div className={[
              'inline-flex w-full sm:w-auto rounded-md shadow-sm border overflow-hidden',
              formData.orderType === 'BUY' ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
            ].join(' ')}>
              <button
                type="button"
                onClick={() => handleInputChange('orderType', 'BUY')}
                className={[
                  'px-4 py-2 text-sm font-medium focus:outline-none inline-flex items-center gap-2 w-1/2 sm:w-auto',
                  formData.orderType === 'BUY'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-white text-gray-900 hover:bg-gray-50'
                ].join(' ')}
              >
                <span>BUY</span>
              </button>
              <button
                type="button"
                onClick={() => handleInputChange('orderType', 'SELL')}
                className={[
                  'px-4 py-2 text-sm font-medium focus:outline-none border-l border-gray-300 inline-flex items-center gap-2 w-1/2 sm:w-auto',
                  formData.orderType === 'SELL'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-white text-gray-900 hover:bg-gray-50'
                ].join(' ')}
              >
                <span>SELL</span>
              </button>
            </div>
          </div>

          {/* Execution Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Execution Type
            </label>
            <div className={[
              'inline-flex w-full sm:w-auto rounded-md shadow-sm border overflow-hidden',
              formData.executionType === 'MARKET' ? 'border-blue-300 bg-blue-50' : 'border-indigo-300 bg-indigo-50'
            ].join(' ')}>
              <button
                type="button"
                onClick={() => handleInputChange('executionType', 'MARKET')}
                className={[
                  'px-4 py-2 text-sm font-medium focus:outline-none inline-flex items-center gap-2 w-1/2 sm:w-auto',
                  formData.executionType === 'MARKET'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-white text-gray-900 hover:bg-gray-50'
                ].join(' ')}
              >
                <span>MARKET</span>
              </button>
              <button
                type="button"
                onClick={() => handleInputChange('executionType', 'LIMIT')}
                className={[
                  'px-4 py-2 text-sm font-medium focus:outline-none border-l border-gray-300 inline-flex items-center gap-2 w-1/2 sm:w-auto',
                  formData.executionType === 'LIMIT'
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-white text-gray-900 hover:bg-gray-50'
                ].join(' ')}
              >
                <span>LIMIT</span>
              </button>
            </div>
          </div>

          {/* Product Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Type
            </label>
            <div className={[
              'inline-flex w-full sm:w-auto rounded-md shadow-sm border overflow-hidden',
              formData.productType === 'CNC' ? 'border-purple-300 bg-purple-50' : 'border-orange-300 bg-orange-50'
            ].join(' ')}>
              <button
                type="button"
                onClick={() => handleInputChange('productType', 'CNC')}
                className={[
                  'px-4 py-2 text-sm font-medium focus:outline-none inline-flex items-center gap-2 w-1/2 sm:w-auto',
                  formData.productType === 'CNC'
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-white text-gray-900 hover:bg-gray-50'
                ].join(' ')}
              >
                <span>CNC</span>
              </button>
              <button
                type="button"
                onClick={() => handleInputChange('productType', 'INTRADAY')}
                className={[
                  'px-4 py-2 text-sm font-medium focus:outline-none border-l border-gray-300 inline-flex items-center gap-2 w-1/2 sm:w-auto',
                  formData.productType === 'INTRADAY'
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-white text-gray-900 hover:bg-gray-50'
                ].join(' ')}
              >
                <span>INTRADAY</span>
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {formData.productType === 'CNC' 
                ? 'Delivery trades in NSE EQ segment. No leverage - full margin required. Only BUY orders allowed (cannot short sell).'
                : 'Intraday trades with leverage support. Both BUY and SELL orders allowed. Position must be squared off before market close.'
              }
            </p>
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
            <div className="flex gap-2">
              <input
                type="number"
                id="currentPrice"
                value={formData.currentPrice || ''}
                onChange={(e) => handleInputChange('currentPrice', parseFloat(e.target.value) || 0)}
                placeholder="e.g., 2500.50"
                step="0.01"
                min="0.01"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-500"
                required
              />
              <button
                type="button"
                onClick={handleGetCurrentPrice}
                disabled={!formData.ticker.trim() || isFetchingPrice}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
              >
                {isFetchingPrice ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Fetching...
                  </>
                ) : (
                  'Get Current Price'
                )}
              </button>
            </div>
          </div>

          {/* Editable Account Settings Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-3">Account Settings (Editable for this session)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Available Funds */}
              <div>
                <label htmlFor="availableFunds" className="block text-xs font-medium text-gray-700 mb-1">
                  Available Funds (₹)
                </label>
                <input
                  type="number"
                  id="availableFunds"
                  value={formData.availableFunds}
                  onChange={(e) => handleInputChange('availableFunds', parseFloat(e.target.value) || 0)}
                  step="100"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                />
              </div>

              {/* Leverage - only for INTRADAY */}
              {formData.productType === 'INTRADAY' && (
                <div>
                  <label htmlFor="leverage" className="block text-xs font-medium text-gray-700 mb-1">
                    Leverage (x)
                  </label>
                  <input
                    type="number"
                    id="leverage"
                    value={formData.leverage}
                    onChange={(e) => handleInputChange('leverage', parseFloat(e.target.value) || 1)}
                    step="0.1"
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                  />
                </div>
              )}

              {/* CNC Info - show leverage is fixed at 1x */}
              {formData.productType === 'CNC' && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <svg className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-xs text-blue-800">
                      <p className="font-semibold mb-1">CNC Order Settings</p>
                      <p>• Leverage: <span className="font-semibold">1x</span> (No leverage - full margin required)</p>
                      <p>• Risk on Capital: <span className="font-semibold">100%</span> (Uses full available funds)</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stop Loss Percentage */}
              <div>
                <label htmlFor="stopLossPercentage" className="block text-xs font-medium text-gray-700 mb-1">
                  Stop Loss (%)
                </label>
                <input
                  type="number"
                  id="stopLossPercentage"
                  value={formData.stopLossPercentage}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow typing but limit to 2 decimal places
                    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                      handleInputChange('stopLossPercentage', value === '' ? 0 : parseFloat(value));
                    }
                  }}
                  onBlur={calculateStopLossAmount}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                />
              </div>

              {/* Stop Loss Amount (Calculated) */}
              <div>
                <label htmlFor="stopLossAmount" className="block text-xs font-medium text-gray-700 mb-1">
                  Stop Loss Amount (₹)
                </label>
                <input
                  type="number"
                  id="stopLossAmount"
                  value={formData.stopLossAmount}
                  onChange={(e) => {
                    const amount = parseFloat(e.target.value) || 0;
                    handleInputChange('stopLossAmount', amount);
                  }}
                  onBlur={() => {
                    // Round to nearest tick size and recalculate percentage
                    const rounded = roundToTickSize(formData.stopLossAmount);
                    setFormData(prev => ({ ...prev, stopLossAmount: parseFloat(rounded.toFixed(2)) }));
                    calculateStopLossPercentage();
                  }}
                  step="0.05"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                />
              </div>

              {/* Target Price Percentage */}
              <div>
                <label htmlFor="targetPricePercentage" className="block text-xs font-medium text-gray-700 mb-1">
                  Target Price (%)
                </label>
                <input
                  type="number"
                  id="targetPricePercentage"
                  value={formData.targetPricePercentage}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow typing but limit to 2 decimal places
                    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                      handleInputChange('targetPricePercentage', value === '' ? 0 : parseFloat(value));
                    }
                  }}
                  onBlur={calculateTargetAmount}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                />
              </div>

              {/* Target Price Amount (Calculated) */}
              <div>
                <label htmlFor="targetPriceAmount" className="block text-xs font-medium text-gray-700 mb-1">
                  Target Price Amount (₹)
                </label>
                <input
                  type="number"
                  id="targetPriceAmount"
                  value={formData.targetPriceAmount}
                  onChange={(e) => {
                    const amount = parseFloat(e.target.value) || 0;
                    handleInputChange('targetPriceAmount', amount);
                  }}
                  onBlur={() => {
                    // Round to nearest tick size and recalculate percentage
                    const rounded = roundToTickSize(formData.targetPriceAmount);
                    setFormData(prev => ({ ...prev, targetPriceAmount: parseFloat(rounded.toFixed(2)) }));
                    calculateTargetPercentage();
                  }}
                  step="0.05"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                />
              </div>

              {/* Risk on Capital - only for INTRADAY */}
              {formData.productType === 'INTRADAY' && (
                <div>
                  <label htmlFor="riskOnCapital" className="block text-xs font-medium text-gray-700 mb-1">
                    Risk on Capital (%)
                  </label>
                  <input
                    type="number"
                    id="riskOnCapital"
                    value={formData.riskOnCapital}
                    onChange={(e) => handleInputChange('riskOnCapital', parseFloat(e.target.value) || 0)}
                    step="0.1"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                  />
                </div>
              )}

              {/* Trailing Stop - only for INTRADAY */}
              {formData.productType === 'INTRADAY' && (
                <div>
                  <label htmlFor="trailingStopEnabled" className="block text-xs font-medium text-gray-700 mb-1">
                    Trailing Stop
                  </label>
                  <div className="flex items-center h-10">
                    <input
                      type="checkbox"
                      id="trailingStopEnabled"
                      checked={formData.trailingStopEnabled}
                      onChange={(e) => handleInputChange('trailingStopEnabled', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="trailingStopEnabled" className="ml-2 text-sm text-gray-700">
                      {formData.trailingStopEnabled ? 'Enabled' : 'Disabled'}
                    </label>
                  </div>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-blue-600">
              Note: These values are loaded from your account settings but can be modified for this order only. Changes will not be saved to the database.
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            {/* <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.accountId || !formData.ticker || formData.currentPrice <= 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            </button> */}
            <button
              type="button"
              onClick={handleSubmitAllAccounts}
              disabled={isSubmitting || !formData.ticker || formData.currentPrice <= 0 || accounts.length <= 0}
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              title={accounts.length <= 1 ? 'You need multiple accounts to use this feature' : 'Place order in all your configured accounts'}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Placing Orders...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Place Order in All Accounts
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
