import { AccountSettings } from '@/app/account-settings/page';

interface AccountSettingsListProps {
  accounts: AccountSettings[];
  isLoading: boolean;
  onEdit: (account: AccountSettings) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
}

export default function AccountSettingsList({
  accounts,
  isLoading,
  onEdit,
  onDelete,
  onAdd
}: AccountSettingsListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No accounts configured</h3>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Get started by adding your first DHAN account.</p>
        <button
          onClick={onAdd}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add Account
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {accounts.map((account) => (
        <div key={account.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Client ID: {account.dhanClientId}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  account.isActive 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {account.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Available Funds</p>
                  <p className="font-medium text-gray-900 dark:text-white">₹{account.availableFunds.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Leverage</p>
                  <p className="font-medium text-gray-900 dark:text-white">{account.leverage}x</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Max Position Size</p>
                  <p className="font-medium text-gray-900 dark:text-white">{(account.maxPositionSize * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Order Type</p>
                  <p className="font-medium text-gray-900 dark:text-white">{account.orderType}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">LIMIT Buffer</p>
                  <p className="font-medium text-gray-900 dark:text-white">{account.limitBufferPercentage.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Stop Loss (INTRADAY)</p>
                  <p className="font-medium text-gray-900 dark:text-white">{(account.stopLossPercentage * 100).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Target Price (INTRADAY)</p>
                  <p className="font-medium text-gray-900 dark:text-white">{(account.targetPricePercentage * 100).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">CNC Stop Loss</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {account.cncStopLossPercentage ? `${(account.cncStopLossPercentage * 100).toFixed(2)}%` : 'Not Set'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">CNC Target Price</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {account.cncTargetPricePercentage ? `${(account.cncTargetPricePercentage * 100).toFixed(2)}%` : 'Not Set'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Trailing SL</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {account.enableTrailingStopLoss ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Duplicate Tickers</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {account.allowDuplicateTickers ? 'Allowed' : 'Not Allowed'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => onEdit(account)}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                title="Edit"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(account.id)}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                title="Delete"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
