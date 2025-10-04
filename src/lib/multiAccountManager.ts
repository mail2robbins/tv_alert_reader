// Multi-account configuration manager for Dhan.co accounts

export interface DhanAccountConfig {
  accountId: number;
  accessToken: string;
  clientId: string;
  availableFunds: number;
  leverage: number;
  maxPositionSize: number;
  minOrderValue: number;
  maxOrderValue: number;
  stopLossPercentage: number;
  targetPricePercentage: number;
  riskOnCapital: number;
  isActive: boolean;
  enableTrailingStopLoss: boolean;
  minTrailJump: number;
}

export interface MultiAccountConfig {
  accounts: DhanAccountConfig[];
  activeAccounts: DhanAccountConfig[];
}

// Load account configuration from environment variables
export function loadAccountConfigurations(): MultiAccountConfig {
  const accounts: DhanAccountConfig[] = [];
  
  // Check for numbered account configurations (1-5)
  for (let i = 1; i <= 5; i++) {
    const accessToken = process.env[`DHAN_ACCESS_TOKEN_${i}`];
    const clientId = process.env[`DHAN_CLIENT_ID_${i}`];
    
    // Only add account if both access token and client ID are provided
    if (accessToken && clientId) {
      const account: DhanAccountConfig = {
        accountId: i,
        accessToken,
        clientId,
        availableFunds: parseFloat(process.env[`AVAILABLE_FUNDS_${i}`] || '20000'),
        leverage: parseFloat(process.env[`LEVERAGE_${i}`] || '2'),
        maxPositionSize: parseFloat(process.env[`MAX_POSITION_SIZE_${i}`] || '0.1'),
        minOrderValue: parseFloat(process.env[`MIN_ORDER_VALUE_${i}`] || '1000'),
        maxOrderValue: parseFloat(process.env[`MAX_ORDER_VALUE_${i}`] || '5000'),
        stopLossPercentage: parseFloat(process.env[`STOP_LOSS_PERCENTAGE_${i}`] || '0.01'),
        targetPricePercentage: parseFloat(process.env[`TARGET_PRICE_PERCENTAGE_${i}`] || '0.015'),
        riskOnCapital: parseFloat(process.env[`RISK_ON_CAPITAL_${i}`] || '1.0'),
        isActive: true,
        enableTrailingStopLoss: process.env[`ENABLE_TRAILING_STOP_LOSS_${i}`] === 'true',
        minTrailJump: parseFloat(process.env[`MIN_TRAIL_JUMP_${i}`] || '0.05')
      };
      
      accounts.push(account);
    }
  }
  
  // Fallback to legacy configuration if no numbered accounts are found
  if (accounts.length === 0) {
    const legacyAccessToken = process.env.DHAN_ACCESS_TOKEN;
    const legacyClientId = process.env.DHAN_CLIENT_ID;
    
    if (legacyAccessToken && legacyClientId) {
      const legacyAccount: DhanAccountConfig = {
        accountId: 1,
        accessToken: legacyAccessToken,
        clientId: legacyClientId,
        availableFunds: parseFloat(process.env.AVAILABLE_FUNDS || '20000'),
        leverage: parseFloat(process.env.LEVERAGE || '2'),
        maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '0.1'),
        minOrderValue: parseFloat(process.env.MIN_ORDER_VALUE || '1000'),
        maxOrderValue: parseFloat(process.env.MAX_ORDER_VALUE || '5000'),
        stopLossPercentage: parseFloat(process.env.STOP_LOSS_PERCENTAGE || '0.01'),
        targetPricePercentage: parseFloat(process.env.TARGET_PRICE_PERCENTAGE || '0.015'),
        riskOnCapital: parseFloat(process.env.RISK_ON_CAPITAL || '1.0'),
        isActive: true,
        enableTrailingStopLoss: process.env.ENABLE_TRAILING_STOP_LOSS === 'true',
        minTrailJump: parseFloat(process.env.MIN_TRAIL_JUMP || '0.05')
      };
      
      accounts.push(legacyAccount);
    }
  }
  
  const activeAccounts = accounts.filter(account => account.isActive);
  
  return {
    accounts,
    activeAccounts
  };
}

// Get all active account configurations
export function getActiveAccountConfigurations(): DhanAccountConfig[] {
  const config = loadAccountConfigurations();
  return config.activeAccounts;
}

// Get account configuration by ID
export function getAccountConfiguration(accountId: number): DhanAccountConfig | null {
  const config = loadAccountConfigurations();
  return config.accounts.find(account => account.accountId === accountId) || null;
}

// Get account configuration by client ID
export function getAccountConfigurationByClientId(clientId: string): DhanAccountConfig | null {
  const config = loadAccountConfigurations();
  return config.accounts.find(account => account.clientId === clientId) || null;
}

// Validate account configuration
export function validateAccountConfiguration(account: DhanAccountConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!account.accessToken || account.accessToken.trim() === '') {
    errors.push(`Account ${account.accountId}: Access token is required`);
  }
  
  if (!account.clientId || account.clientId.trim() === '') {
    errors.push(`Account ${account.accountId}: Client ID is required`);
  }
  
  if (account.availableFunds <= 0) {
    errors.push(`Account ${account.accountId}: Available funds must be greater than 0`);
  }
  
  if (account.leverage < 1 || account.leverage > 10) {
    errors.push(`Account ${account.accountId}: Leverage must be between 1x and 10x`);
  }
  
  if (account.maxPositionSize <= 0 || account.maxPositionSize > 1) {
    errors.push(`Account ${account.accountId}: Max position size must be between 0% and 100%`);
  }
  
  if (account.minOrderValue <= 0) {
    errors.push(`Account ${account.accountId}: Minimum order value must be greater than 0`);
  }
  
  if (account.maxOrderValue <= account.minOrderValue) {
    errors.push(`Account ${account.accountId}: Maximum order value must be greater than minimum order value`);
  }
  
  if (account.stopLossPercentage <= 0 || account.stopLossPercentage > 0.5) {
    errors.push(`Account ${account.accountId}: Stop loss percentage must be between 0% and 50%`);
  }
  
  if (account.targetPricePercentage <= 0 || account.targetPricePercentage > 1) {
    errors.push(`Account ${account.accountId}: Target price percentage must be between 0% and 100%`);
  }
  
  if (account.riskOnCapital <= 0 || account.riskOnCapital > 5) {
    errors.push(`Account ${account.accountId}: Risk on Capital must be between 0% and 500%`);
  }
  
  if (account.minTrailJump < 0.05 || account.minTrailJump > 10) {
    errors.push(`Account ${account.accountId}: Minimum Trail Jump must be between ₹0.05 and ₹10`);
  }
  
  // Validate that minTrailJump is a multiple of 0.05
  if (account.minTrailJump % 0.05 !== 0) {
    errors.push(`Account ${account.accountId}: Minimum Trail Jump must be a multiple of ₹0.05`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate all account configurations
export function validateAllAccountConfigurations(): {
  isValid: boolean;
  errors: string[];
  accountErrors: Record<number, string[]>;
} {
  const config = loadAccountConfigurations();
  const allErrors: string[] = [];
  const accountErrors: Record<number, string[]> = {};
  
  if (config.accounts.length === 0) {
    allErrors.push('No Dhan accounts configured. Please set DHAN_ACCESS_TOKEN_1 and DHAN_CLIENT_ID_1 at minimum.');
    return {
      isValid: false,
      errors: allErrors,
      accountErrors
    };
  }
  
  for (const account of config.accounts) {
    const validation = validateAccountConfiguration(account);
    if (!validation.isValid) {
      accountErrors[account.accountId] = validation.errors;
      allErrors.push(...validation.errors);
    }
  }
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    accountErrors
  };
}

// Get configuration summary
export function getConfigurationSummary(): {
  totalAccounts: number;
  activeAccounts: number;
  totalAvailableFunds: number;
  totalLeveragedFunds: number;
  accounts: Array<{
    accountId: number;
    clientId: string;
    availableFunds: number;
    leverage: number;
    leveragedFunds: number;
    isActive: boolean;
  }>;
} {
  const config = loadAccountConfigurations();
  
  const accounts = config.accounts.map(account => ({
    accountId: account.accountId,
    clientId: account.clientId,
    availableFunds: account.availableFunds,
    leverage: account.leverage,
    leveragedFunds: account.availableFunds * account.leverage,
    isActive: account.isActive
  }));
  
  const totalAvailableFunds = accounts.reduce((sum, account) => sum + account.availableFunds, 0);
  const totalLeveragedFunds = accounts.reduce((sum, account) => sum + account.leveragedFunds, 0);
  
  return {
    totalAccounts: config.accounts.length,
    activeAccounts: config.activeAccounts.length,
    totalAvailableFunds,
    totalLeveragedFunds,
    accounts
  };
}
