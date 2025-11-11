// Client-side service for account settings API calls

export interface AccountSettingsDTO {
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
  limitBufferPercentage: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Fetch all account settings from API
 */
export async function fetchAccountSettings(token: string, activeOnly: boolean = false): Promise<AccountSettingsDTO[]> {
  const url = activeOnly ? '/api/account-settings?activeOnly=true' : '/api/account-settings';
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch account settings: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch account settings');
  }
  
  return data.data;
}

/**
 * Fetch single account settings by ID
 */
export async function fetchAccountSettingsById(token: string, id: number): Promise<AccountSettingsDTO> {
  const response = await fetch(`/api/account-settings/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch account settings: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch account settings');
  }
  
  return data.data;
}

/**
 * Create new account settings
 */
export async function createAccountSettings(token: string, settings: Partial<AccountSettingsDTO>): Promise<AccountSettingsDTO> {
  const response = await fetch('/api/account-settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(settings)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create account settings: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to create account settings');
  }
  
  return data.data;
}

/**
 * Update account settings
 */
export async function updateAccountSettings(token: string, id: number, settings: Partial<AccountSettingsDTO>): Promise<AccountSettingsDTO> {
  const response = await fetch(`/api/account-settings/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(settings)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update account settings: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to update account settings');
  }
  
  return data.data;
}

/**
 * Delete account settings
 */
export async function deleteAccountSettings(token: string, id: number): Promise<void> {
  const response = await fetch(`/api/account-settings/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete account settings: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to delete account settings');
  }
}
