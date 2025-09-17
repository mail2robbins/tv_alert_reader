'use client';

import { useState, useEffect } from 'react';
import { getFundConfig, updateFundConfig, calculatePositionSize, getFundUtilization, validateFundConfig } from '@/lib/fundManager';

interface FundManagerProps {
  onConfigUpdate?: () => void;
}

export default function FundManager({ onConfigUpdate }: FundManagerProps) {
  const [config, setConfig] = useState(getFundConfig());
  const [isEditing, setIsEditing] = useState(false);
  const [testPrice, setTestPrice] = useState(100);
  const [positionCalculation, setPositionCalculation] = useState<ReturnType<typeof calculatePositionSize> | null>(null);
  const [utilization, setUtilization] = useState<ReturnType<typeof getFundUtilization> | null>(null);

  useEffect(() => {
    setUtilization(getFundUtilization());
    setPositionCalculation(calculatePositionSize(testPrice));
  }, [testPrice, config]);

  const handleSave = () => {
    const validation = validateFundConfig(config);
    if (!validation.isValid) {
      alert('Configuration errors:\n' + validation.errors.join('\n'));
      return;
    }

    updateFundConfig(config);
    setIsEditing(false);
    if (onConfigUpdate) {
      onConfigUpdate();
    }
  };

  const handleReset = () => {
    setConfig(getFundConfig());
    setIsEditing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Fund Management</h3>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={handleReset}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Fund Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Funds
            </label>
            {isEditing ? (
              <input
                type="number"
                value={config.availableFunds}
                onChange={(e) => setConfig({ ...config, availableFunds: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="20000"
              />
            ) : (
              <div className="text-2xl font-semibold text-gray-900">
                {formatCurrency(config.availableFunds)}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Leverage
            </label>
            {isEditing ? (
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={config.leverage}
                onChange={(e) => setConfig({ ...config, leverage: parseFloat(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="2"
              />
            ) : (
              <div className="text-2xl font-semibold text-gray-900">
                {config.leverage}x
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Position Size
            </label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="1"
                value={config.maxPositionSize}
                onChange={(e) => setConfig({ ...config, maxPositionSize: parseFloat(e.target.value) || 0.1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.1"
              />
            ) : (
              <div className="text-2xl font-semibold text-gray-900">
                {formatPercentage(config.maxPositionSize * 100)}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Min Order Value
            </label>
            {isEditing ? (
              <input
                type="number"
                value={config.minOrderValue}
                onChange={(e) => setConfig({ ...config, minOrderValue: parseFloat(e.target.value) || 1000 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1000"
              />
            ) : (
              <div className="text-2xl font-semibold text-gray-900">
                {formatCurrency(config.minOrderValue)}
              </div>
            )}
          </div>
        </div>

        {/* Fund Utilization Summary */}
        {utilization && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Fund Utilization</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Leveraged Funds</div>
                <div className="font-semibold">{formatCurrency(utilization.leveragedFunds)}</div>
              </div>
              <div>
                <div className="text-gray-500">Max Position Value</div>
                <div className="font-semibold">{formatCurrency(utilization.maxPositionValue)}</div>
              </div>
              <div>
                <div className="text-gray-500">Utilization</div>
                <div className="font-semibold">{formatPercentage(utilization.utilizationPercentage)}</div>
              </div>
              <div>
                <div className="text-gray-500">Max Position Size</div>
                <div className="font-semibold">{formatPercentage(utilization.maxPositionSize * 100)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Position Size Calculator */}
        <div className="border-t pt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Position Size Calculator</h4>
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm text-gray-600">Test Stock Price:</label>
            <input
              type="number"
              value={testPrice}
              onChange={(e) => setTestPrice(parseFloat(e.target.value) || 0)}
              className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="100"
            />
            <span className="text-sm text-gray-500">₹</span>
          </div>

          {positionCalculation && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Calculated Quantity</div>
                  <div className="font-semibold text-lg">{positionCalculation.calculatedQuantity}</div>
                </div>
                <div>
                  <div className="text-gray-500">Order Value</div>
                  <div className="font-semibold text-lg">{formatCurrency(positionCalculation.orderValue)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Leveraged Value</div>
                  <div className="font-semibold text-lg">{formatCurrency(positionCalculation.leveragedValue)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Position Size</div>
                  <div className="font-semibold text-lg">{formatPercentage(positionCalculation.positionSizePercentage)}</div>
                </div>
              </div>
              
              {positionCalculation.canPlaceOrder ? (
                <div className="mt-3 text-sm text-green-600 font-medium">
                  ✅ Order can be placed
                </div>
              ) : (
                <div className="mt-3 text-sm text-red-600 font-medium">
                  ❌ {positionCalculation.reason}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
