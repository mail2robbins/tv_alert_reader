'use client';

import { useState, useEffect } from 'react';
import { calculatePositionSize, validateFundConfig, FundConfig } from '@/lib/fundManager';

interface FundManagerProps {
  onConfigUpdate?: () => void;
}

export default function FundManager({ onConfigUpdate }: FundManagerProps) {
  const [config, setConfig] = useState<FundConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [testPrice, setTestPrice] = useState(100);
  const [positionCalculation, setPositionCalculation] = useState<ReturnType<typeof calculatePositionSize> | null>(null);
  const [utilization, setUtilization] = useState<{
    availableFunds: number;
    leverage: number;
    leveragedFunds: number;
    maxPositionSize: number;
    maxPositionValue: number;
    utilizationPercentage: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load fund configuration from API
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/fund-config');
        const data = await response.json();
        
        if (data.success) {
          setConfig(data.data);
        } else {
          console.error('Failed to load fund config:', data.error);
        }
      } catch (error) {
        console.error('Error loading fund config:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadConfig();
  }, []);

  useEffect(() => {
    if (config) {
      // Calculate utilization from the loaded config
      const leveragedFunds = config.availableFunds * config.leverage;
      const maxPositionValue = leveragedFunds * config.maxPositionSize;
      const utilizationPercentage = (maxPositionValue / config.availableFunds) * 100;
      
      setUtilization({
        availableFunds: config.availableFunds,
        leverage: config.leverage,
        leveragedFunds,
        maxPositionSize: config.maxPositionSize,
        maxPositionValue,
        utilizationPercentage
      });
      
      setPositionCalculation(calculatePositionSize(testPrice, config));
    }
  }, [testPrice, config]);

  const handleSave = async () => {
    if (!config) return;
    
    const validation = validateFundConfig(config);
    if (!validation.isValid) {
      alert('Configuration errors:\n' + validation.errors.join('\n'));
      return;
    }

    try {
      const response = await fetch('/api/fund-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.data);
        setIsEditing(false);
        if (onConfigUpdate) {
          onConfigUpdate();
        }
      } else {
        alert('Failed to save configuration: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration');
    }
  };

  const handleReset = async () => {
    try {
      const response = await fetch('/api/fund-config');
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.data);
        setIsEditing(false);
      } else {
        console.error('Failed to reset config:', data.error);
      }
    } catch (error) {
      console.error('Error resetting config:', error);
    }
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Fund Management</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading configuration...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Fund Management</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-red-500">Failed to load configuration</div>
          </div>
        </div>
      </div>
    );
  }

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
                className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
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
                className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
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
                className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
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
                className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="1000"
              />
            ) : (
              <div className="text-2xl font-semibold text-gray-900">
                {formatCurrency(config.minOrderValue)}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stop Loss %
            </label>
            {isEditing ? (
              <input
                type="number"
                step="0.001"
                min="0.001"
                max="0.5"
                value={config.stopLossPercentage}
                onChange={(e) => setConfig({ ...config, stopLossPercentage: parseFloat(e.target.value) || 0.01 })}
                className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="0.01"
              />
            ) : (
              <div className="text-2xl font-semibold text-gray-900">
                {formatPercentage(config.stopLossPercentage * 100)}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Price %
            </label>
            {isEditing ? (
              <input
                type="number"
                step="0.001"
                min="0.001"
                max="1"
                value={config.targetPricePercentage}
                onChange={(e) => setConfig({ ...config, targetPricePercentage: parseFloat(e.target.value) || 0.015 })}
                className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="0.015"
              />
            ) : (
              <div className="text-2xl font-semibold text-gray-900">
                {formatPercentage(config.targetPricePercentage * 100)}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Risk on Capital
            </label>
            {isEditing ? (
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="5"
                value={config.riskOnCapital}
                onChange={(e) => setConfig({ ...config, riskOnCapital: parseFloat(e.target.value) || 1.0 })}
                className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="1.0"
              />
            ) : (
              <div className="text-2xl font-semibold text-gray-900">
                {config.riskOnCapital || 1}x
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
                <div className="text-gray-700 font-medium">Leveraged Funds</div>
                <div className="font-semibold text-gray-900">{formatCurrency(utilization.leveragedFunds)}</div>
              </div>
              <div>
                <div className="text-gray-700 font-medium">Max Position Value</div>
                <div className="font-semibold text-gray-900">{formatCurrency(utilization.maxPositionValue)}</div>
              </div>
              <div>
                <div className="text-gray-700 font-medium">Utilization</div>
                <div className="font-semibold text-gray-900">{formatPercentage(utilization.utilizationPercentage)}</div>
              </div>
              <div>
                <div className="text-gray-700 font-medium">Max Position Size</div>
                <div className="font-semibold text-gray-900">{formatPercentage(utilization.maxPositionSize * 100)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Position Size Calculator */}
        <div className="border-t pt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Position Size Calculator</h4>
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm text-gray-700 font-medium">Test Stock Price:</label>
            <input
              type="number"
              value={testPrice}
              onChange={(e) => setTestPrice(parseFloat(e.target.value) || 0)}
              className="px-3 py-1 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
              placeholder="100"
            />
            <span className="text-sm text-gray-700 font-medium">₹</span>
          </div>

          {positionCalculation && config && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 text-sm">
                <div>
                  <div className="text-gray-700 font-medium">Base Quantity</div>
                  <div className="font-semibold text-lg text-gray-900">
                    {config.riskOnCapital && config.riskOnCapital > 0 
                      ? Math.floor(positionCalculation.finalQuantity / config.riskOnCapital)
                      : positionCalculation.finalQuantity}
                  </div>
                </div>
                <div>
                  <div className="text-gray-700 font-medium">Risk Multiplier</div>
                  <div className="font-semibold text-lg text-blue-600">{config.riskOnCapital || 1}x</div>
                </div>
                <div>
                  <div className="text-gray-700 font-medium">Final Quantity</div>
                  <div className="font-semibold text-lg text-green-600">{positionCalculation.finalQuantity}</div>
                </div>
                <div>
                  <div className="text-gray-700 font-medium">Order Value</div>
                  <div className="font-semibold text-lg text-gray-900">₹{positionCalculation.orderValue.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-700 font-medium">Leveraged Value</div>
                  <div className="font-semibold text-lg text-gray-900">₹{positionCalculation.leveragedValue.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-700 font-medium">Position Size</div>
                  <div className="font-semibold text-lg text-gray-900">{formatPercentage(positionCalculation.positionSizePercentage)}</div>
                </div>
                <div>
                  <div className="text-gray-700 font-medium">Stop Loss</div>
                  <div className="font-semibold text-lg text-red-600">₹{(positionCalculation.stopLossPrice || 0).toFixed(2)}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <div className="text-gray-700 font-medium">Target Price</div>
                  <div className="font-semibold text-lg text-green-600">₹{(positionCalculation.targetPrice || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-700 font-medium">Risk Calculation</div>
                  <div className="font-semibold text-sm text-gray-600">
                    {config.riskOnCapital && config.riskOnCapital > 0 
                      ? `${Math.floor(positionCalculation.finalQuantity / config.riskOnCapital)} × ${config.riskOnCapital} = ${positionCalculation.finalQuantity} shares`
                      : `${positionCalculation.finalQuantity} shares`}
                  </div>
                </div>
              </div>
              
              {positionCalculation.canPlaceOrder ? (
                <div className="mt-3 text-sm text-green-600 font-medium">
                  ✅ Order can be placed with {positionCalculation.finalQuantity} shares (Risk: {config.riskOnCapital || 1}x)
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
