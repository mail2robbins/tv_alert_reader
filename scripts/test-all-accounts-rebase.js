/**
 * Test script to calculate rebase logic for all accounts
 * This script simulates the multiAccountManager.ts logic to load all configured accounts
 * and test rebase calculations for each one
 */

// Simulate environment variables (replace with your actual .env.local values)
const mockEnvVars = {
  // Account 1
  'DHAN_ACCESS_TOKEN_1': 'token_1',
  'DHAN_CLIENT_ID_1': '1108422445',
  'AVAILABLE_FUNDS_1': '10000',
  'LEVERAGE_1': '2',
  'MAX_POSITION_SIZE_1': '0.1',
  'MIN_ORDER_VALUE_1': '1000',
  'MAX_ORDER_VALUE_1': '40000',
  'STOP_LOSS_PERCENTAGE_1': '0.0075',
  'TARGET_PRICE_PERCENTAGE_1': '0.01',
  'RISK_ON_CAPITAL_1': '2',
  'ENABLE_TRAILING_STOP_LOSS_1': 'true',
  'MIN_TRAIL_JUMP_1': '0.05',
  'REBASE_TP_AND_SL_1': 'true',
  'REBASE_THRESHOLD_PERCENTAGE_1': '0.1',

  // Account 2
  'DHAN_ACCESS_TOKEN_2': 'token_2',
  'DHAN_CLIENT_ID_2': '1107139968',
  'AVAILABLE_FUNDS_2': '10000',
  'LEVERAGE_2': '2',
  'MAX_POSITION_SIZE_2': '0.1',
  'MIN_ORDER_VALUE_2': '1000',
  'MAX_ORDER_VALUE_2': '30000',
  'STOP_LOSS_PERCENTAGE_2': '0.0075',
  'TARGET_PRICE_PERCENTAGE_2': '0.01',
  'RISK_ON_CAPITAL_2': '2',
  'ENABLE_TRAILING_STOP_LOSS_2': 'true',
  'MIN_TRAIL_JUMP_2': '0.05',
  'REBASE_TP_AND_SL_2': 'false',
  'REBASE_THRESHOLD_PERCENTAGE_2': '0.2',

  // Account 3
  'DHAN_ACCESS_TOKEN_3': 'token_3',
  'DHAN_CLIENT_ID_3': '1108626000',
  'AVAILABLE_FUNDS_3': '12000',
  'LEVERAGE_3': '2',
  'MAX_POSITION_SIZE_3': '0.1',
  'MIN_ORDER_VALUE_3': '1000',
  'MAX_ORDER_VALUE_3': '30000',
  'STOP_LOSS_PERCENTAGE_3': '0.0075',
  'TARGET_PRICE_PERCENTAGE_3': '0.009',
  'RISK_ON_CAPITAL_3': '2',
  'ENABLE_TRAILING_STOP_LOSS_3': 'false',
  'MIN_TRAIL_JUMP_3': '0.15',
  'REBASE_TP_AND_SL_3': 'true',
  'REBASE_THRESHOLD_PERCENTAGE_3': '0.05'
};

// Simulate the loadAccountConfigurations function
function loadAccountConfigurations() {
  const accounts = [];
  
  // Check for numbered account configurations (1-5)
  for (let i = 1; i <= 5; i++) {
    const accessToken = mockEnvVars[`DHAN_ACCESS_TOKEN_${i}`];
    const clientId = mockEnvVars[`DHAN_CLIENT_ID_${i}`];
    
    // Only add account if both access token and client ID are provided
    if (accessToken && clientId) {
      const account = {
        accountId: i,
        accessToken,
        clientId,
        availableFunds: parseFloat(mockEnvVars[`AVAILABLE_FUNDS_${i}`] || '20000'),
        leverage: parseFloat(mockEnvVars[`LEVERAGE_${i}`] || '2'),
        maxPositionSize: parseFloat(mockEnvVars[`MAX_POSITION_SIZE_${i}`] || '0.1'),
        minOrderValue: parseFloat(mockEnvVars[`MIN_ORDER_VALUE_${i}`] || '1000'),
        maxOrderValue: parseFloat(mockEnvVars[`MAX_ORDER_VALUE_${i}`] || '5000'),
        stopLossPercentage: parseFloat(mockEnvVars[`STOP_LOSS_PERCENTAGE_${i}`] || '0.01'),
        targetPricePercentage: parseFloat(mockEnvVars[`TARGET_PRICE_PERCENTAGE_${i}`] || '0.015'),
        riskOnCapital: parseFloat(mockEnvVars[`RISK_ON_CAPITAL_${i}`] || '1.0'),
        isActive: true,
        enableTrailingStopLoss: mockEnvVars[`ENABLE_TRAILING_STOP_LOSS_${i}`] === 'true',
        minTrailJump: parseFloat(mockEnvVars[`MIN_TRAIL_JUMP_${i}`] || '0.05'),
        rebaseTpAndSl: mockEnvVars[`REBASE_TP_AND_SL_${i}`] === 'true',
        rebaseThresholdPercentage: parseFloat(mockEnvVars[`REBASE_THRESHOLD_PERCENTAGE_${i}`] || '0.1')
      };
      
      accounts.push(account);
    }
  }
  
  return { accounts, activeAccounts: accounts };
}

// Test rebase calculation for a single account
function testAccountRebase(alertPrice, entryPrice, accountConfig) {
  console.log(`\n🧮 Account ${accountConfig.accountId} - ${accountConfig.clientId}`);
  console.log('='.repeat(60));
  console.log(`Alert Price: ₹${alertPrice}`);
  console.log(`Entry Price: ₹${entryPrice}`);
  console.log(`Rebase Enabled: ${accountConfig.rebaseTpAndSl ? 'YES' : 'NO'}`);
  console.log(`Threshold: ${accountConfig.rebaseThresholdPercentage}%`);
  console.log(`Target %: ${(accountConfig.targetPricePercentage * 100).toFixed(1)}%`);
  console.log(`Stop Loss %: ${(accountConfig.stopLossPercentage * 100).toFixed(2)}%`);
  console.log('');
  
  // Calculate price difference
  const priceDifference = Math.abs(entryPrice - alertPrice);
  const priceDifferencePercentage = (priceDifference / alertPrice) * 100;
  
  console.log('📊 Price Analysis:');
  console.log(`Price Difference: ₹${priceDifference.toFixed(2)}`);
  console.log(`Price Difference %: ${priceDifferencePercentage.toFixed(2)}%`);
  console.log(`Direction: ${entryPrice > alertPrice ? 'UPWARD' : 'DOWNWARD'}`);
  console.log('');
  
  // Check if rebase should be triggered
  const shouldRebase = accountConfig.rebaseTpAndSl && priceDifferencePercentage >= accountConfig.rebaseThresholdPercentage;
  console.log(`🔄 Should Rebase: ${shouldRebase ? 'YES ✅' : 'NO ❌'}`);
  
  if (!accountConfig.rebaseTpAndSl) {
    console.log('❌ Rebase is disabled for this account');
    return { shouldRebase: false, reason: 'Rebase disabled' };
  }
  
  if (priceDifferencePercentage < accountConfig.rebaseThresholdPercentage) {
    console.log(`✅ Price difference (${priceDifferencePercentage.toFixed(2)}%) is below threshold (${accountConfig.rebaseThresholdPercentage}%), skipping rebase`);
    return { 
      shouldRebase: false, 
      reason: 'Price difference below threshold',
      priceDifferencePercentage,
      threshold: accountConfig.rebaseThresholdPercentage
    };
  }

  // Calculate original TP/SL based on alert price
  const originalTargetPrice = alertPrice * (1 + accountConfig.targetPricePercentage);
  const originalStopLossPrice = alertPrice * (1 - accountConfig.stopLossPercentage);

  // Calculate new TP/SL based on actual entry price
  const newTargetPrice = entryPrice * (1 + accountConfig.targetPricePercentage);
  const newStopLossPrice = entryPrice * (1 - accountConfig.stopLossPercentage);

  // Calculate the differences
  const targetPriceDifference = newTargetPrice - originalTargetPrice;
  const stopLossDifference = newStopLossPrice - originalStopLossPrice;

  console.log('\n🎯 Original TP/SL (based on alert price):');
  console.log(`  Target Price: ₹${originalTargetPrice.toFixed(2)}`);
  console.log(`  Stop Loss: ₹${originalStopLossPrice.toFixed(2)}`);

  console.log('\n🎯 New TP/SL (based on entry price):');
  console.log(`  Target Price: ₹${newTargetPrice.toFixed(2)}`);
  console.log(`  Stop Loss: ₹${newStopLossPrice.toFixed(2)}`);

  console.log('\n📈 Rebase Adjustments:');
  console.log(`  Target Price Change: ₹${targetPriceDifference.toFixed(2)} (${((targetPriceDifference/originalTargetPrice)*100).toFixed(2)}%)`);
  console.log(`  Stop Loss Change: ₹${stopLossDifference.toFixed(2)} (${((stopLossDifference/originalStopLossPrice)*100).toFixed(2)}%)`);

  return {
    shouldRebase: true,
    originalTargetPrice,
    originalStopLossPrice,
    newTargetPrice,
    newStopLossPrice,
    targetPriceDifference,
    stopLossDifference,
    priceDifferencePercentage,
    threshold: accountConfig.rebaseThresholdPercentage
  };
}

console.log('🚀 Rebase Logic Calculation for All Accounts');
console.log('============================================');
console.log('');

// Load all configured accounts
const config = loadAccountConfigurations();
console.log(`📋 Found ${config.accounts.length} configured account(s)`);
console.log('');

// Test scenarios
const testScenarios = [
  {
    name: 'Scenario 1: Small Downward Movement',
    alertPrice: 250.50,
    entryPrice: 250.15
  },
  {
    name: 'Scenario 2: Small Upward Movement',
    alertPrice: 250.50,
    entryPrice: 250.85
  },
  {
    name: 'Scenario 3: Larger Downward Movement',
    alertPrice: 250.50,
    entryPrice: 249.75
  },
  {
    name: 'Scenario 4: Larger Upward Movement',
    alertPrice: 250.50,
    entryPrice: 251.25
  }
];

// Test each scenario for all accounts
testScenarios.forEach(scenario => {
  console.log(`\n🎯 ${scenario.name}`);
  console.log(`Alert: ₹${scenario.alertPrice} → Entry: ₹${scenario.entryPrice} (${((Math.abs(scenario.entryPrice - scenario.alertPrice) / scenario.alertPrice) * 100).toFixed(2)}% difference)`);
  console.log('='.repeat(80));
  
  const results = [];
  
  config.accounts.forEach(account => {
    const result = testAccountRebase(scenario.alertPrice, scenario.entryPrice, account);
    results.push({ account: account.clientId, ...result });
  });
  
  // Summary for this scenario
  console.log('\n📋 Scenario Summary:');
  results.forEach(result => {
    const status = result.shouldRebase ? '✅ REBASE' : '❌ NO REBASE';
    const reason = result.reason ? ` (${result.reason})` : '';
    console.log(`  ${status} - Account ${result.account}${reason}`);
  });
});

console.log('\n🔧 Configuration Summary:');
console.log('========================');
config.accounts.forEach(account => {
  console.log(`Account ${account.accountId} (${account.clientId}):`);
  console.log(`  Rebase: ${account.rebaseTpAndSl ? 'Enabled' : 'Disabled'}`);
  console.log(`  Threshold: ${account.rebaseThresholdPercentage}%`);
  console.log(`  Target: ${(account.targetPricePercentage * 100).toFixed(1)}%`);
  console.log(`  Stop Loss: ${(account.stopLossPercentage * 100).toFixed(2)}%`);
  console.log('');
});

console.log('💡 To use with your actual .env.local file:');
console.log('1. Copy your .env.local values into the mockEnvVars object at the top of this script');
console.log('2. Run: node scripts/test-all-accounts-rebase.js');
console.log('3. Or modify this script to read from your actual environment variables');
