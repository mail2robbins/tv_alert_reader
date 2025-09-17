'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

interface AlertFiltersProps {
  onFiltersChange: (filters: {
    ticker?: string;
    signal?: string;
    strategy?: string;
  }) => void;
  availableStrategies: string[];
}

export default function AlertFilters({ onFiltersChange, availableStrategies }: AlertFiltersProps) {
  const [ticker, setTicker] = useState('');
  const [signal, setSignal] = useState('');
  const [strategy, setStrategy] = useState('');

  // Debounce the ticker input to prevent too many API calls
  const debouncedTicker = useDebounce(ticker, 500);

  useEffect(() => {
    onFiltersChange({
      ticker: debouncedTicker || undefined,
      signal: signal || undefined,
      strategy: strategy || undefined,
    });
  }, [debouncedTicker, signal, strategy, onFiltersChange]);

  const clearFilters = () => {
    setTicker('');
    setSignal('');
    setStrategy('');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Filters</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ticker Symbol
          </label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="e.g., AAPL"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Signal Type
          </label>
          <select
            value={signal}
            onChange={(e) => setSignal(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Signals</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
            <option value="HOLD">HOLD</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Strategy
          </label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Strategies</option>
            {availableStrategies.map((strategyName) => (
              <option key={strategyName} value={strategyName}>
                {strategyName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={clearFilters}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );
}
