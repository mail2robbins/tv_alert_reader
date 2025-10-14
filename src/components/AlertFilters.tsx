'use client';

import { useState } from 'react';

interface AlertFiltersProps {
  onLoadData: () => void;
  isLoading: boolean;
  availableStrategies: string[];
  onFilterInputChange?: (inputs: {
    ticker: string;
    signal: string;
    strategy: string;
  }) => void;
}

export default function AlertFilters({ onLoadData, isLoading, availableStrategies, onFilterInputChange }: AlertFiltersProps) {
  const [ticker, setTicker] = useState('');
  const [signal, setSignal] = useState('');
  const [strategy, setStrategy] = useState('');

  const clearFilters = () => {
    setTicker('');
    setSignal('');
    setStrategy('');
    
    // Notify parent component that filters have been cleared
    if (onFilterInputChange) {
      onFilterInputChange({
        ticker: '',
        signal: '',
        strategy: '',
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    let newTicker = ticker;
    let newSignal = signal;
    let newStrategy = strategy;
    
    switch (field) {
      case 'ticker':
        newTicker = value;
        setTicker(value);
        break;
      case 'signal':
        newSignal = value;
        setSignal(value);
        break;
      case 'strategy':
        newStrategy = value;
        setStrategy(value);
        break;
    }
    
    // Notify parent component of filter input changes with the new values
    if (onFilterInputChange) {
      onFilterInputChange({
        ticker: newTicker,
        signal: newSignal,
        strategy: newStrategy,
      });
    }
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
            onChange={(e) => handleInputChange('ticker', e.target.value.toUpperCase())}
            placeholder="e.g., AAPL (partial match)"
            className="w-full px-3 py-2 border border-gray-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Signal Type
          </label>
          <select
            value={signal}
            onChange={(e) => handleInputChange('signal', e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
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
            onChange={(e) => handleInputChange('strategy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
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

      <div className="mt-4 flex gap-3">
        <button
          onClick={onLoadData}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Load Data
            </>
          )}
        </button>
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
