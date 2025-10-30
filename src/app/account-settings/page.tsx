'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import AccountSettingsForm from '@/components/AccountSettingsForm';
import AccountSettingsList from '@/components/AccountSettingsList';

export interface AccountSettings {
  id: number;
  dhanClientId: string;
  dhanAccessToken: string;
  availableFunds: number;
  leverage: number;
  maxPositionSize: number;
  minOrderValue: number;
  maxOrderValue: number;
  stopLossPercentage: number;
  targetPricePercentage: number;
  riskOnCapital: number;
  enableTrailingStopLoss: boolean;
  minTrailJump: number;
  rebaseTpAndSl: boolean;
  rebaseThresholdPercentage: number;
  allowDuplicateTickers: boolean;
  orderType: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const { getAuthToken } = useAuth();
  const [accounts, setAccounts] = useState<AccountSettings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      
      const response = await fetch('/api/account-settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAccounts(data.data);
      } else {
        setError(data.error || 'Failed to fetch account settings');
      }
    } catch (err) {
      setError('Failed to fetch account settings');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = async (account?: AccountSettings) => {
    if (account) {
      // Fetch full account details including unmasked token
      try {
        const token = getAuthToken();
        const response = await fetch(`/api/account-settings/${account.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        
        if (data.success) {
          setEditingAccount(data.data);
        } else {
          setError(data.error || 'Failed to fetch account details');
        }
      } catch (err) {
        setError('Failed to fetch account details');
        console.error(err);
      }
    } else {
      setEditingAccount(null);
    }
    setShowModal(true);
    setError(null);
    setSuccessMessage(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAccount(null);
    setError(null);
    setSuccessMessage(null);
  };

  const handleSaveSuccess = (message: string) => {
    setSuccessMessage(message);
    fetchAccounts();
    setTimeout(() => {
      handleCloseModal();
    }, 1500);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this account configuration?')) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/account-settings/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('Account settings deleted successfully');
        await fetchAccounts();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.error || 'Failed to delete account settings');
      }
    } catch (err) {
      setError('Failed to delete account settings');
      console.error(err);
    }
  };

  return (
    <ProtectedRoute requireApproval={true}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  Manage DHAN account configurations and trading parameters
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleOpenModal()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Account
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Home
                </button>
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-800 dark:text-green-200">{successMessage}</p>
            </div>
          )}
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Accounts List */}
          <AccountSettingsList
            accounts={accounts}
            isLoading={isLoading}
            onEdit={handleOpenModal}
            onDelete={handleDelete}
            onAdd={() => handleOpenModal()}
          />
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <AccountSettingsForm
          account={editingAccount}
          onClose={handleCloseModal}
          onSuccess={handleSaveSuccess}
          onError={setError}
        />
      )}
    </ProtectedRoute>
  );
}
