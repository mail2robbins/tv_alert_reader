// Fund management and position sizing calculations

import { DhanAccountConfig, getActiveAccountConfigurations } from './multiAccountManager';

export interface FundConfig {
  availableFunds: number;        // Total available funds (e.g., 20000)
  leverage: number;              // Leverage multiplier (e.g., 2x)
  maxPositionSize: number;       // Maximum percentage of funds per position (e.g., 0.1 = 10%)
  minOrderValue: number;         // Minimum order value to place
  maxOrderValue: number;         // Maximum order value per order
  stopLossPercentage: number;    // Stop loss percentage (e.g., 0.01 = 1%)
  targetPricePercentage: number; // Target price percentage (e.g., 0.015 = 1.5%)
  riskOnCapital: number;         // Risk on Capital multiplier for quantity (e.g., 1.5 = 150% of calculated quantity)
}

export interface PositionCalculation {
  stockPrice: number;
  availableFunds: number;
  leverage: number;
  maxPositionSize: number;
  calculatedQuantity: number;
  riskOnCapital: number;
  finalQuantity: number;          // Final quantity after applying risk on capital multiplier
  orderValue: number;
  leveragedValue: number;
  positionSizePercentage: number;
  canPlaceOrder: boolean;
  reason?: string;
  stopLossPrice?: number;
  targetPrice?: number;
  accountId?: number;             // Account ID for multi-account support
  clientId?: string;              // Client ID for multi-account support
}

// Default fund configuration
const DEFAULT_FUND_CONFIG: FundConfig = {
  availableFunds: parseFloat(process.env.AVAILABLE_FUNDS || '20000'),
  leverage: parseFloat(process.env.LEVERAGE || '2'),
  maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '0.1'), // 10% max per position
  minOrderValue: parseFloat(process.env.MIN_ORDER_VALUE || '1000'),    // Minimum ₹1000 order
  maxOrderValue: parseFloat(process.env.MAX_ORDER_VALUE || '20000'),   // Maximum ₹20000 per order
  stopLossPercentage: parseFloat(process.env.STOP_LOSS_PERCENTAGE || '0.01'),    // 1% stop loss
  targetPricePercentage: parseFloat(process.env.TARGET_PRICE_PERCENTAGE || '0.015'), // 1.5% target
  riskOnCapital: parseFloat(process.env.RISK_ON_CAPITAL || '1.0')     // 100% of calculated quantity (no multiplier)
};

// Get current fund configuration
export function getFundConfig(): FundConfig {
  return { ...DEFAULT_FUND_CONFIG };
}

// Update fund configuration
export function updateFundConfig(newConfig: Partial<FundConfig>): FundConfig {
  Object.assign(DEFAULT_FUND_CONFIG, newConfig);
  return { ...DEFAULT_FUND_CONFIG };
}

// Calculate position size based on available funds, leverage, and stock price
export function calculatePositionSize(
  stockPrice: number,
  customConfig?: Partial<FundConfig>
): PositionCalculation {
  const config = { ...DEFAULT_FUND_CONFIG, ...customConfig };
  
  // Calculate quantity based on stock price and available capital
  // The quantity should use the full capital amount, not leveraged amount
  const calculatedQuantity = Math.floor(config.availableFunds / stockPrice);
  
  // Apply risk on capital multiplier to get final quantity (cap at 100% to prevent exceeding available capital)
  const cappedRiskOnCapital = Math.min(config.riskOnCapital, 1.0);
  const finalQuantity = Math.floor(calculatedQuantity * cappedRiskOnCapital);
  
  // Calculate actual order value (total value of stocks bought) using final quantity
  const orderValue = finalQuantity * stockPrice;
  
  // Calculate leveraged value (actual capital used from your account)
  const leveragedValue = orderValue / config.leverage;
  
  // Calculate position size as percentage of available funds (based on actual capital used)
  const positionSizePercentage = (leveragedValue / config.availableFunds) * 100;
  
  // Calculate stop loss and target prices with 2 decimal places
  const stopLossPrice = Math.round(stockPrice * (1 - config.stopLossPercentage) * 100) / 100;
  const targetPrice = Math.round(stockPrice * (1 + config.targetPricePercentage) * 100) / 100;
  
  // Determine if order can be placed
  let canPlaceOrder = true;
  let reason: string | undefined;
  
  if (calculatedQuantity <= 0) {
    canPlaceOrder = false;
    reason = 'Stock price too high for available funds';
  } else if (finalQuantity <= 0) {
    canPlaceOrder = false;
    reason = 'Risk on capital multiplier resulted in zero quantity';
  } else if (leveragedValue < config.minOrderValue) {
    canPlaceOrder = false;
    reason = `Leveraged value (₹${leveragedValue.toFixed(2)}) below minimum (₹${config.minOrderValue})`;
  } else if (leveragedValue > config.maxOrderValue) {
    // Adjust quantity to max leveraged value
    const maxOrderValueWithLeverage = config.maxOrderValue * config.leverage;
    const adjustedFinalQuantity = Math.floor(maxOrderValueWithLeverage / stockPrice);
    const adjustedOrderValue = adjustedFinalQuantity * stockPrice;
    const adjustedLeveragedValue = adjustedOrderValue / config.leverage;
    const adjustedPositionSizePercentage = (adjustedLeveragedValue / config.availableFunds) * 100;
    
    return {
      stockPrice,
      availableFunds: config.availableFunds,
      leverage: config.leverage,
      maxPositionSize: config.maxPositionSize,
      calculatedQuantity,
      riskOnCapital: config.riskOnCapital,
      finalQuantity: adjustedFinalQuantity,
      orderValue: adjustedOrderValue,
      leveragedValue: adjustedLeveragedValue,
      positionSizePercentage: adjustedPositionSizePercentage,
      canPlaceOrder: true,
      reason: `Adjusted to max order value (₹${config.maxOrderValue})`,
      stopLossPrice,
      targetPrice
    };
  } else if (positionSizePercentage > 100) {
    canPlaceOrder = false;
    reason = `Position size (${positionSizePercentage.toFixed(2)}%) exceeds available capital (100%)`;
  }
  
  return {
    stockPrice,
    availableFunds: config.availableFunds,
    leverage: config.leverage,
    maxPositionSize: config.maxPositionSize,
    calculatedQuantity,
    riskOnCapital: config.riskOnCapital,
    finalQuantity,
    orderValue,
    leveragedValue,
    positionSizePercentage,
    canPlaceOrder,
    reason,
    stopLossPrice,
    targetPrice
  };
}

// Calculate position size for a specific account
export function calculatePositionSizeForAccount(
  stockPrice: number,
  accountConfig: DhanAccountConfig
): PositionCalculation {
  const fundConfig: FundConfig = {
    availableFunds: accountConfig.availableFunds,
    leverage: accountConfig.leverage,
    maxPositionSize: accountConfig.maxPositionSize,
    minOrderValue: accountConfig.minOrderValue,
    maxOrderValue: accountConfig.maxOrderValue,
    stopLossPercentage: accountConfig.stopLossPercentage,
    targetPricePercentage: accountConfig.targetPricePercentage,
    riskOnCapital: accountConfig.riskOnCapital
  };
  
  const calculation = calculatePositionSize(stockPrice, fundConfig);
  
  // Add account information to the calculation
  return {
    ...calculation,
    accountId: accountConfig.accountId,
    clientId: accountConfig.clientId
  };
}

// Calculate position sizes for all active accounts
export function calculatePositionSizesForAllAccounts(
  stockPrice: number
): Array<PositionCalculation & { accountConfig: DhanAccountConfig }> {
  const activeAccounts: DhanAccountConfig[] = getActiveAccountConfigurations();
  
  return activeAccounts.map((accountConfig: DhanAccountConfig) => ({
    ...calculatePositionSizeForAccount(stockPrice, accountConfig),
    accountConfig
  }));
}

// Calculate multiple position sizes for different scenarios
export function calculatePositionScenarios(stockPrice: number): {
  conservative: PositionCalculation;
  moderate: PositionCalculation;
  aggressive: PositionCalculation;
} {
  return {
    conservative: calculatePositionSize(stockPrice, {
      maxPositionSize: 0.05,  // 5% max position
      leverage: 1.5           // 1.5x leverage
    }),
    moderate: calculatePositionSize(stockPrice, {
      maxPositionSize: 0.1,   // 10% max position
      leverage: 2             // 2x leverage
    }),
    aggressive: calculatePositionSize(stockPrice, {
      maxPositionSize: 0.15,  // 15% max position
      leverage: 3             // 3x leverage
    })
  };
}

// Get fund utilization summary
export function getFundUtilization(): {
  availableFunds: number;
  leverage: number;
  leveragedFunds: number;
  maxPositionSize: number;
  maxPositionValue: number;
  utilizationPercentage: number;
} {
  const config = getFundConfig();
  const leveragedFunds = config.availableFunds * config.leverage;
  const maxPositionValue = leveragedFunds * config.maxPositionSize;
  const utilizationPercentage = (maxPositionValue / config.availableFunds) * 100;
  
  return {
    availableFunds: config.availableFunds,
    leverage: config.leverage,
    leveragedFunds,
    maxPositionSize: config.maxPositionSize,
    maxPositionValue,
    utilizationPercentage
  };
}

// Validate fund configuration
export function validateFundConfig(config: FundConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (config.availableFunds <= 0) {
    errors.push('Available funds must be greater than 0');
  }
  
  if (config.leverage < 1 || config.leverage > 10) {
    errors.push('Leverage must be between 1x and 10x');
  }
  
  if (config.maxPositionSize <= 0 || config.maxPositionSize > 1) {
    errors.push('Max position size must be between 0% and 100%');
  }
  
  if (config.minOrderValue <= 0) {
    errors.push('Minimum order value must be greater than 0');
  }
  
  if (config.maxOrderValue <= config.minOrderValue) {
    errors.push('Maximum order value must be greater than minimum order value');
  }
  
  if (config.stopLossPercentage <= 0 || config.stopLossPercentage > 0.5) {
    errors.push('Stop loss percentage must be between 0% and 50%');
  }
  
  if (config.targetPricePercentage <= 0 || config.targetPricePercentage > 1) {
    errors.push('Target price percentage must be between 0% and 100%');
  }
  
  if (config.riskOnCapital <= 0 || config.riskOnCapital > 5) {
    errors.push('Risk on Capital must be between 0% and 500%');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Calculate risk metrics
export function calculateRiskMetrics(
  stockPrice: number,
  quantity: number,
  stopLossPercentage: number = 0.05 // 5% stop loss
): {
  positionValue: number;
  leveragedValue: number;
  maxLoss: number;
  maxLossPercentage: number;
  riskRewardRatio: number;
} {
  const config = getFundConfig();
  const positionValue = stockPrice * quantity;
  const leveragedValue = positionValue / config.leverage;
  const maxLoss = positionValue * stopLossPercentage;
  const maxLossPercentage = (maxLoss / config.availableFunds) * 100;
  const riskRewardRatio = leveragedValue / maxLoss;
  
  return {
    positionValue,
    leveragedValue,
    maxLoss,
    maxLossPercentage,
    riskRewardRatio
  };
}
