'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ManualOrderPlacement from '@/components/ManualOrderPlacement';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function ManualOrderPage() {
  const router = useRouter();
  const [orderResult, setOrderResult] = useState<Record<string, unknown> | null>(null);

  const handleOrderPlaced = (result: unknown) => {
    setOrderResult(result as Record<string, unknown>);
    // Optionally redirect back to home after a delay
    // setTimeout(() => {
    //   router.push('/');
    // }, 3000);
  };

  return (
    <ProtectedRoute requireApproval={true}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={() => router.push('/')}
                  className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Dashboard
                </button>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 32 32">
                    <rect width="32" height="32" rx="6" fill="currentColor"/>
                    <path d="M8 12 L16 8 L24 12 L20 16 L12 20 L8 16 Z" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <circle cx="16" cy="14" r="2" fill="#10b981"/>
                  </svg>
                  Manual Order Placement
                </h1>
                <p className="mt-2 text-gray-600">
                  Place manual orders using your configured account settings and position sizing rules.
                </p>
              </div>
            </div>
          </div>

          {/* Manual Order Form */}
          <ManualOrderPlacement onOrderPlaced={handleOrderPlaced} />

          {/* Order Result Details */}
          {orderResult && (
            <div className="mt-8 bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Order Details</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
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
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
                >
                  Place Another Order
                </button>
              </div>
            </div>
          )}

          {/* Information Section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-2">How Manual Orders Work</h3>
            <div className="text-blue-700 space-y-2">
              <p>
                • <strong>Account Selection:</strong> Choose from your configured DHAN accounts (DHAN_CLIENT_ID_1, DHAN_CLIENT_ID_2, etc.)
              </p>
              <p>
                • <strong>Position Sizing:</strong> Orders use the same automatic position sizing as TradingView alerts based on your account&apos;s risk settings
              </p>
              <p>
                • <strong>Stop Loss & Target:</strong> Automatically calculated using your account&apos;s STOP_LOSS_PERCENTAGE and TARGET_PRICE_PERCENTAGE settings
              </p>
              <p>
                • <strong>Trailing Stop Loss:</strong> Enabled if ENABLE_TRAILING_STOP_LOSS is set to true for the selected account
              </p>
              <p>
                • <strong>TP/SL Rebase:</strong> Target and Stop Loss will be rebased based on actual entry price if REBASE_TP_AND_SL is enabled
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}