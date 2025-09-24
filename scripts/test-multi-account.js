// Test script for multi-account functionality
// This script tests the multi-account configuration by checking environment variables

console.log('🧪 Testing Multi-Account Configuration...\n');

// Load environment variables
require('dotenv').config();

// Test 1: Check environment variables
console.log('1. Checking environment variables...');

const accounts = [];
for (let i = 1; i <= 5; i++) {
  const accessToken = process.env[`DHAN_ACCESS_TOKEN_${i}`];
  const clientId = process.env[`DHAN_CLIENT_ID_${i}`];
  
  if (accessToken && clientId) {
    const account = {
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
      isActive: true
    };
    accounts.push(account);
  }
}

// Check legacy configuration if no numbered accounts found
if (accounts.length === 0) {
  const legacyAccessToken = process.env.DHAN_ACCESS_TOKEN;
  const legacyClientId = process.env.DHAN_CLIENT_ID;
  
  if (legacyAccessToken && legacyClientId) {
    const legacyAccount = {
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
      isActive: true
    };
    accounts.push(legacyAccount);
    console.log('   📋 Using legacy configuration (single account)');
  }
}

console.log(`   ✅ Found ${accounts.length} total accounts`);

if (accounts.length > 0) {
  console.log('   📋 Account details:');
  accounts.forEach(account => {
    console.log(`      Account #${account.accountId}: ${account.clientId} (Active)`);
    console.log(`         Funds: ₹${account.availableFunds.toLocaleString()}, Leverage: ${account.leverage}x`);
    console.log(`         Max Position: ${(account.maxPositionSize * 100).toFixed(1)}%, Risk on Capital: ${(account.riskOnCapital * 100).toFixed(0)}%`);
  });
} else {
  console.log('   ❌ No accounts configured');
  console.log('   💡 Please set DHAN_ACCESS_TOKEN_1 and DHAN_CLIENT_ID_1 at minimum');
}

// Test 2: Validate configurations
console.log('\n2. Validating account configurations...');
const errors = [];

accounts.forEach(account => {
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
});

if (errors.length === 0) {
  console.log('   ✅ All account configurations are valid');
} else {
  console.log('   ❌ Configuration validation failed:');
  errors.forEach(error => {
    console.log(`      - ${error}`);
  });
}

// Test 3: Get configuration summary
console.log('\n3. Configuration summary...');
const totalAvailableFunds = accounts.reduce((sum, account) => sum + account.availableFunds, 0);
const totalLeveragedFunds = accounts.reduce((sum, account) => sum + (account.availableFunds * account.leverage), 0);

console.log(`   📊 Total accounts: ${accounts.length}`);
console.log(`   📊 Active accounts: ${accounts.length}`);
console.log(`   💰 Total available funds: ₹${totalAvailableFunds.toLocaleString()}`);
console.log(`   💰 Total leveraged funds: ₹${totalLeveragedFunds.toLocaleString()}`);

// Test 4: Test position calculation for a sample stock price
console.log('\n4. Testing position calculations...');
const stockPrice = 100; // Sample stock price

accounts.forEach(account => {
  // Calculate quantity based on stock price and available capital
  const calculatedQuantity = Math.floor(account.availableFunds / stockPrice);
  
  // Apply risk on capital multiplier to get final quantity
  const finalQuantity = Math.floor(calculatedQuantity * account.riskOnCapital);
  
  // Calculate actual order value (total value of stocks bought) using final quantity
  const orderValue = finalQuantity * stockPrice;
  
  // Calculate leveraged value (actual capital used from your account)
  const leveragedValue = orderValue / account.leverage;
  
  // Calculate position size as percentage of available funds (based on actual capital used)
  const positionSizePercentage = (leveragedValue / account.availableFunds) * 100;
  
  // Calculate stop loss and target prices with 2 decimal places
  const stopLossPrice = Math.round(stockPrice * (1 - account.stopLossPercentage) * 100) / 100;
  const targetPrice = Math.round(stockPrice * (1 + account.targetPricePercentage) * 100) / 100;
  
  // Determine if order can be placed
  let canPlaceOrder = true;
  let reason = '';
  
  if (calculatedQuantity <= 0) {
    canPlaceOrder = false;
    reason = 'Stock price too high for available funds';
  } else if (finalQuantity <= 0) {
    canPlaceOrder = false;
    reason = 'Risk on capital multiplier resulted in zero quantity';
  } else if (leveragedValue < account.minOrderValue) {
    canPlaceOrder = false;
    reason = `Leveraged value (₹${leveragedValue.toFixed(2)}) below minimum (₹${account.minOrderValue})`;
  } else if (leveragedValue > account.maxOrderValue) {
    canPlaceOrder = false;
    reason = `Leveraged value (₹${leveragedValue.toFixed(2)}) above maximum (₹${account.maxOrderValue})`;
  } else if (positionSizePercentage > 100) {
    canPlaceOrder = false;
    reason = `Position size (${positionSizePercentage.toFixed(2)}%) exceeds available capital (100%)`;
  }
  
  const status = canPlaceOrder ? '✅' : '❌';
  console.log(`   ${status} Account #${account.accountId} (${account.clientId}):`);
  console.log(`      Quantity: ${finalQuantity}, Order Value: ₹${orderValue.toFixed(2)}`);
  console.log(`      Leveraged Value: ₹${leveragedValue.toFixed(2)}, Position Size: ${positionSizePercentage.toFixed(2)}%`);
  console.log(`      Stop Loss: ₹${stopLossPrice.toFixed(2)}, Target: ₹${targetPrice.toFixed(2)}`);
  if (!canPlaceOrder && reason) {
    console.log(`      Reason: ${reason}`);
  }
});

console.log('\n🎉 Multi-account configuration test completed!');

if (accounts.length === 0) {
  console.log('\n💡 To configure accounts, set the following environment variables:');
  console.log('   DHAN_ACCESS_TOKEN_1=your_access_token');
  console.log('   DHAN_CLIENT_ID_1=your_client_id');
  console.log('   AVAILABLE_FUNDS_1=20000');
  console.log('   LEVERAGE_1=2');
  console.log('   MAX_POSITION_SIZE_1=0.1');
  console.log('   MIN_ORDER_VALUE_1=1000');
  console.log('   MAX_ORDER_VALUE_1=5000');
  console.log('   STOP_LOSS_PERCENTAGE_1=0.01');
  console.log('   TARGET_PRICE_PERCENTAGE_1=0.015');
  console.log('   RISK_ON_CAPITAL_1=1.0');
}
