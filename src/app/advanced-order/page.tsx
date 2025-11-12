'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import AdvancedManualOrderPlacement from '@/components/AdvancedManualOrderPlacement';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ThemeSwitch } from '@/components/ThemeSwitch';

export default function AdvancedOrderPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [orderResult, setOrderResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOrderPlaced = (result: unknown) => {
    setOrderResult(result as Record<string, unknown>);
  };

  return (
    <ProtectedRoute requireApproval={true}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <button
                  onClick={() => router.push('/')}
                  className="flex items-center font-semibold text-black dark:text-gray-300 hover:text-blue-600 dark:hover:text-white mb-4 cursor-pointer"
                  style={{ color: mounted && resolvedTheme === 'dark' ? '#d1d5db' : '#000000' }}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span style={{ color: mounted && resolvedTheme === 'dark' ? '#d1d5db' : '#000000' }}>Back to Dashboard</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 32 32">
                    <rect width="32" height="32" rx="6" fill="currentColor"/>
                    <path d="M8 12 L16 8 L24 12 L20 16 L12 20 L8 16 Z" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <circle cx="16" cy="14" r="2" fill="#10b981"/>
                    <path d="M20 8 L24 10 L24 14 L20 12 Z" fill="#f59e0b" opacity="0.7"/>
                  </svg>
                  Advanced Manual Order Placement
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  Place orders with CNC/INTRADAY product types and customizable account settings.
                </p>
              </div>
              <ThemeSwitch />
            </div>
          </div>

          {/* Advanced Order Form */}
          <AdvancedManualOrderPlacement onOrderPlaced={handleOrderPlaced} />

          {/* Order Result Details */}
          {orderResult && (
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Order Details</h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {JSON.stringify(orderResult, null, 2)}
                </pre>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Back to Dashboard
                </button>
                <button
                  onClick={() => setOrderResult(null)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Place Another Order
                </button>
              </div>
            </div>
          )}

          {/* Information Section */}
          <div className="mt-8 bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-purple-900 mb-2">How Advanced Orders Work</h3>
            <div className="text-purple-700 space-y-2">
              <p>
                • <strong>Product Type Selection:</strong> Choose between CNC (delivery) or INTRADAY (same-day) trading
              </p>
              <p>
                • <strong>CNC Orders:</strong> Used for delivery trades in NSE EQ segment. No leverage - full margin required. <strong>Only BUY orders allowed</strong> (cannot short sell). If you select SELL, product type will auto-switch to INTRADAY.
              </p>
              <p>
                • <strong>INTRADAY Orders:</strong> Supports both BUY and SELL orders with leverage, trailing stop loss, and risk on capital settings. Position must be squared off before market close.
              </p>
              <p>
                • <strong>Auto-Switching:</strong> Selecting SELL order type will automatically switch to INTRADAY. Selecting CNC product type will automatically switch to BUY order type.
              </p>
              <p>
                • <strong>Editable Settings:</strong> Modify available funds, leverage, stop loss, target price, and other parameters temporarily for this session
              </p>
              <p>
                • <strong>Dual Input Fields:</strong> Enter stop loss and target price as percentage or absolute amount - both fields sync automatically
              </p>
              <p>
                • <strong>Session-Only Changes:</strong> All modifications are temporary and will not update your account settings in the database
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
