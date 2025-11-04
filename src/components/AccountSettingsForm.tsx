'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AccountSettings } from '@/app/account-settings/page';

interface AccountSettingsFormProps {
  account: AccountSettings | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (error: string) => void;
}

export default function AccountSettingsForm({
  account,
  onClose,
  onSuccess,
  onError
}: AccountSettingsFormProps) {
  const { getAuthToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<AccountSettings>>({
    dhanClientId: '',
    dhanAccessToken: '',
    availableFunds: 20000,
    leverage: 2,
    maxPositionSize: 0.1,
    minOrderValue: 1000,
    maxOrderValue: 50000,
    stopLossPercentage: 0.01,
    targetPricePercentage: 0.015,
    riskOnCapital: 2.0,
    enableTrailingStopLoss: true,
    minTrailJump: 0.05,
    rebaseTpAndSl: true,
    rebaseThresholdPercentage: 0.02,
    allowDuplicateTickers: false,
    orderType: 'LIMIT',
    isActive: true
  });

  useEffect(() => {
    if (account) {
      setFormData(account);
    }
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = getAuthToken();
      const url = account 
        ? `/api/account-settings/${account.id}`
        : '/api/account-settings';
      
      const method = account ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        onSuccess(data.message || 'Account settings saved successfully');
      } else {
        onError(data.error || 'Failed to save account settings');
        setIsSubmitting(false);
      }
    } catch (err) {
      onError('Failed to save account settings');
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof AccountSettings, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full my-8">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {account ? 'Edit Account Settings' : 'Add New Account'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                DHAN Client ID *
              </label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={formData.dhanClientId || ''}
                onChange={(e) => handleInputChange('dhanClientId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                DHAN Access Token *
              </label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={formData.dhanAccessToken || ''}
                onChange={(e) => handleInputChange('dhanAccessToken', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Available Funds (₹)
              </label>
              <input
                type="number"
                step="0.01"
                disabled={isSubmitting}
                value={formData.availableFunds || 0}
                onChange={(e) => handleInputChange('availableFunds', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Leverage
              </label>
              <input
                type="number"
                step="0.1"
                disabled={isSubmitting}
                value={formData.leverage || 0}
                onChange={(e) => handleInputChange('leverage', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Position Size (0-1)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                disabled={isSubmitting}
                value={formData.maxPositionSize || 0}
                onChange={(e) => handleInputChange('maxPositionSize', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min Order Value (₹)
              </label>
              <input
                type="number"
                step="0.01"
                disabled={isSubmitting}
                value={formData.minOrderValue || 0}
                onChange={(e) => handleInputChange('minOrderValue', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Order Value (₹)
              </label>
              <input
                type="number"
                step="0.01"
                disabled={isSubmitting}
                value={formData.maxOrderValue || 0}
                onChange={(e) => handleInputChange('maxOrderValue', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stop Loss % (0-1)
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                max="1"
                disabled={isSubmitting}
                value={formData.stopLossPercentage || 0}
                onChange={(e) => handleInputChange('stopLossPercentage', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Price % (0-1)
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                max="1"
                disabled={isSubmitting}
                value={formData.targetPricePercentage || 0}
                onChange={(e) => handleInputChange('targetPricePercentage', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Risk on Capital (%)
              </label>
              <input
                type="number"
                step="0.1"
                disabled={isSubmitting}
                value={formData.riskOnCapital || 0}
                onChange={(e) => handleInputChange('riskOnCapital', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min Trail Jump (₹)
              </label>
              <input
                type="number"
                step="0.05"
                disabled={isSubmitting}
                value={formData.minTrailJump || 0}
                onChange={(e) => handleInputChange('minTrailJump', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rebase Threshold % (0-1)
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                max="1"
                disabled={isSubmitting}
                value={formData.rebaseThresholdPercentage || 0}
                onChange={(e) => handleInputChange('rebaseThresholdPercentage', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Order Type
              </label>
              <select
                disabled={isSubmitting}
                value={formData.orderType || 'LIMIT'}
                onChange={(e) => handleInputChange('orderType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="MARKET">MARKET</option>
                <option value="LIMIT">LIMIT</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableTrailingStopLoss"
                disabled={isSubmitting}
                checked={formData.enableTrailingStopLoss || false}
                onChange={(e) => handleInputChange('enableTrailingStopLoss', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <label htmlFor="enableTrailingStopLoss" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable Trailing Stop Loss
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="rebaseTpAndSl"
                disabled={isSubmitting}
                checked={formData.rebaseTpAndSl || false}
                onChange={(e) => handleInputChange('rebaseTpAndSl', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <label htmlFor="rebaseTpAndSl" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Rebase TP and SL
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="allowDuplicateTickers"
                disabled={isSubmitting}
                checked={formData.allowDuplicateTickers || false}
                onChange={(e) => handleInputChange('allowDuplicateTickers', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <label htmlFor="allowDuplicateTickers" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Allow Duplicate Tickers
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                disabled={isSubmitting}
                checked={formData.isActive || false}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Active
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isSubmitting ? 'Saving...' : (account ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
