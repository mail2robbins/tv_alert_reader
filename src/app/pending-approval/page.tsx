'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ThemeSwitch } from '@/components/ThemeSwitch';

export default function PendingApprovalPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check if user is approved (in case they were approved in another session)
    if (user && user.isApproved) {
      router.push('/');
    }
  }, [user, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-end mb-4">
          <ThemeSwitch />
        </div>
        <div className="flex justify-center">
          <svg className="w-16 h-16 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Account Pending Approval
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
          Your account is waiting for administrator approval
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              Approval Required
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Your account has been created successfully, but it requires manual approval from an administrator before you can access the trading platform.
            </p>
            
            {user && (
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Account Details:</h4>
                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <p><strong>Username:</strong> {user.username}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Full Name:</strong> {user.fullName}</p>
                  <p><strong>Registered:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            )}

            <div className="mt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Please contact the administrator to request approval, or check back later.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Check Status
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
