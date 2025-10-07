/**
 * Test script to calculate rebase logic for all accounts in env.example
 * Alert Price: ₹250.50, Entry Price: ₹250.15
 */

// Configuration from env.example file
const envExampleConfigs = {
  // Account 1
  'DHAN_ACCESS_TOKEN_1': 'your_dhan_access_token_here',
  'DHAN_CLIENT_ID_1': 'your_dhan_client_id_here',
  'AVAILABLE_FUNDS_1': '20000',
  'LEVERAGE_1': '2',
  'MAX_POSITION_SIZE_1': '0.1',
  'MIN_ORDER_VALUE_1': '1000',
  'MAX_ORDER_VALUE_1': '5000',
  'STOP_LOSS_PERCENTAGE_1': '0.01',
  'TARGET_PRICE_PERCENTAGE_1': '0.015',
  'RISK_ON_CAPITAL_1': '1.0',
  'ENABLE_TRAILING_STOP_LOSS_1': 'true',
  'MIN_TRAIL_JUMP_1': '0.05',
  'REBASE_TP_AND_SL_1': 'true',
  'REBASE_THRESHOLD_PERCENTAGE_1': '0.1',

  // Account 2
  'DHAN_ACCESS_TOKEN_2': '',
  'DHAN_CLIENT_ID_2': '',
  'AVAILABLE_FUNDS_2': '15000',
  'LEVERAGE_2': '1.5',
  'MAX_POSITION_SIZE_2': '0.08',
  'MIN_ORDER_VALUE_2': '1000',
  'MAX_ORDER_VALUE_2': '4000',
  'STOP_LOSS_PERCENTAGE_2': '0.012',
  'TARGET_PRICE_PERCENTAGE_2': '0.018',
  'RISK_ON_CAPITAL_2': '1.2',
  'ENABLE_TRAILING_STOP_LOSS_2': 'false',
  'MIN_TRAIL_JUMP_2': '0.10',
  'REBASE_TP_AND_SL_2': 'false',
  'REBASE_THRESHOLD_PERCENTAGE_2': '0.2',

  // Account 3
  'DHAN_ACCESS_TOKEN_3': '',
  'DHAN_CLIENT_ID_3': '',
  'AVAILABLE_FUNDS_3': '25000',
  'LEVERAGE_3': '2.5',
  'MAX_POSITION_SIZE_3': '0.12',
  'MIN_ORDER_VALUE_3': '1500',
  'MAX_ORDER_VALUE_3': '6000',
  'STOP_LOSS_PERCENTAGE_3': '0.008',
  'TARGET_PRICE_PERCENTAGE_3': '0.02',
  'RISK_ON_CAPITAL_3': '0.8',
  'ENABLE_TRAILING_STOP_LOSS_3': 'true',
  'MIN_TRAIL_JUMP_3': '0.15',
  'REBASE_TP_AND_SL_3': 'true',
  'REBASE_THRESHOLD_PERCENTAGE_3': '0.05',

  // Account 4
  'DHAN_ACCESS_TOKEN_4': '',
  'DHAN_CLIENT_ID_4': '',
  'AVAILABLE_FUNDS_4': '10000',
  'LEVERAGE_4': '1.8',
  'MAX_POSITION_SIZE_4': '0.06',
  'MIN_ORDER_VALUE_4': '800',
  'MAX_ORDER_VALUE_4': '3000',
  'STOP_LOSS_PERCENTAGE_4': '0.015',
  'TARGET_PRICE_PERCENTAGE_4': '0.012',
  'RISK_ON_CAPITAL_4': '1.5',
  'ENABLE_TRAILING_STOP_LOSS_4': 'false',
  'MIN_TRAIL_JUMP_4': '0.05',
  'REBASE_TP_AND_SL_4': 'false',
  'REBASE_THRESHOLD_PERCENTAGE_4': '0.3',

  // Account 5
  'DHAN_ACCESS_TOKEN_5': '',
  'DHAN_CLIENT_ID_5': '',
  'AVAILABLE_FUNDS_5': '30000',
  'LEVERAGE_5': '3',
  'MAX_POSITION_SIZE_5': '0.15',
  'MIN_ORDER_VALUE_5': '2000',
  'MAX_ORDER_VALUE_5': '8000',
  'STOP_LOSS_PERCENTAGE_5': '0.01',
  'TARGET_PRICE_PERCENTAGE_5': '0.025',
  'RISK_ON_CAPITAL_5': '1.0',
  'ENABLE_TRAILING_STOP_LOSS_5': 'true',
  'MIN_TRAIL_JUMP_5': '0.20',
  'REBASE_TP_AND_SL_5': 'true',
  'REBASE_THRESHOLD_PERCENTAGE_5': '0.15'
};

// Load account configurations from env.example
function loadAccountConfigurations() {
  const accounts = [];
  
  // Check for numbered account configurations (1-5)
  for (let i = 1; i <= 5; i++) {
    const accessToken = envExampleConfigs[`DHAN_ACCESS_TOKEN_${i}`];
    const clientId = envExampleConfigs[`DHAN_CLIENT_ID_${i}`];
    
    // Only add account if both access token and client ID are provided and not empty
    if (accessToken && clientId && accessToken !== 'your_dhan_access_token_here' && clientId !== 'your_dhan_client_id_here') {
      const account = {
        accountId: i,
        accessToken,
        clientId,
        availableFunds: parseFloat(envExampleConfigs[`AVAILABLE_FUNDS_${i}`] || '20000'),
        leverage: parseFloat(envExampleConfigs[`LEVERAGE_${i}`] || '2'),
        maxPositionSize: parseFloat(envExampleConfigs[`MAX_POSITION_SIZE_${i}`] || '0.1'),
        minOrderValue: parseFloat(envExampleConfigs[`MIN_ORDER_VALUE_${i}`] || '1000'),
        maxOrderValue: parseFloat(envExampleConfigs[`MAX_ORDER_VALUE_${i}`] || '5000'),
        stopLossPercentage: parseFloat(envExampleConfigs[`STOP_LOSS_PERCENTAGE_${i}`] || '0.01'),
        targetPricePercentage: parseFloat(envExampleConfigs[`TARGET_PRICE_PERCENTAGE_${i}`] || '0.015'),
        riskOnCapital: parseFloat(envExampleConfigs[`RISK_ON_CAPITAL_${i}`] || '1.0'),
        isActive: true,
        enableTrailingStopLoss: envExampleConfigs[`ENABLE_TRAILING_STOP_LOSS_${i}`] === 'true',
        minTrailJump: parseFloat(envExampleConfigs[`MIN_TRAIL_JUMP_${i}`] || '0.05'),
        rebaseTpAndSl: envExampleConfigs[`REBASE_TP_AND_SL_${i}`] === 'true',
        rebaseThresholdPercentage: parseFloat(envExampleConfigs[`REBASE_THRESHOLD_PERCENTAGE_${i}`] || '0.1')
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

  // Calculate potential profit/loss impact
  const quantity = 100; // Assume 100 shares for calculation
  const originalProfit = (originalTargetPrice - alertPrice) * quantity;
  const newProfit = (newTargetPrice - entryPrice) * quantity;
  const originalLoss = (alertPrice - originalStopLossPrice) * quantity;
  const newLoss = (entryPrice - newStopLossPrice) * quantity;

  console.log('\n💰 Impact Analysis (assuming 100 shares):');
  console.log(`  Original Expected Profit: ₹${originalProfit.toFixed(2)}`);
  console.log(`  New Expected Profit: ₹${newProfit.toFixed(2)}`);
  console.log(`  Profit Difference: ₹${(newProfit - originalProfit).toFixed(2)}`);
  console.log(`  Original Max Loss: ₹${originalLoss.toFixed(2)}`);
  console.log(`  New Max Loss: ₹${newLoss.toFixed(2)}`);
  console.log(`  Loss Difference: ₹${(newLoss - originalLoss).toFixed(2)}`);

  return {
    shouldRebase: true,
    originalTargetPrice,
    originalStopLossPrice,
    newTargetPrice,
    newStopLossPrice,
    targetPriceDifference,
    stopLossDifference,
    priceDifferencePercentage,
    threshold: accountConfig.rebaseThresholdPercentage,
    profitImpact: newProfit - originalProfit,
    lossImpact: newLoss - originalLoss
  };
}

console.log('🚀 Rebase Logic Test - env.example Configuration');
console.log('===============================================');
console.log('');

// Your specific test scenario
const alertPrice = 250.50;
const entryPrice = 250.15;
const priceDifferencePercentage = ((Math.abs(entryPrice - alertPrice) / alertPrice) * 100).toFixed(2);

console.log(`📊 Test Scenario:`);
console.log(`Alert Price: ₹${alertPrice}`);
console.log(`Entry Price: ₹${entryPrice}`);
console.log(`Price Difference: ₹${Math.abs(entryPrice - alertPrice).toFixed(2)} (${priceDifferencePercentage}%)`);
console.log(`Direction: ${entryPrice > alertPrice ? 'UPWARD' : 'DOWNWARD'}`);
console.log('');

// Load all configured accounts from env.example
const config = loadAccountConfigurations();

if (config.accounts.length === 0) {
  console.log('❌ No active accounts found in env.example configuration');
  console.log('💡 Note: Only accounts with valid DHAN_ACCESS_TOKEN and DHAN_CLIENT_ID are considered active');
  console.log('   The env.example file contains placeholder values that are not considered active accounts.');
} else {
  console.log(`📋 Found ${config.accounts.length} active account(s) in env.example`);
  console.log('');

  const results = [];
  
  config.accounts.forEach(account => {
    const result = testAccountRebase(alertPrice, entryPrice, account);
    results.push({ account: account.clientId, accountId: account.accountId, ...result });
  });
  
  // Summary
  console.log('\n📋 SUMMARY');
  console.log('==========');
  console.log(`Test Scenario: Alert ₹${alertPrice} → Entry ₹${entryPrice} (${priceDifferencePercentage}% difference)`);
  console.log('');
  
  results.forEach(result => {
    const status = result.shouldRebase ? '✅ REBASE' : '❌ NO REBASE';
    const reason = result.reason ? ` (${result.reason})` : '';
    console.log(`${status} - Account ${result.accountId} (${result.account})${reason}`);
  });
  
  console.log('\n💡 Key Insights:');
  const rebaseResults = results.filter(r => r.shouldRebase);
  if (rebaseResults.length > 0) {
    console.log(`- ${rebaseResults.length} account(s) will trigger rebase:`);
    rebaseResults.forEach(r => {
      console.log(`  • Account ${r.accountId}: TP ₹${r.originalTargetPrice.toFixed(2)} → ₹${r.newTargetPrice.toFixed(2)}, SL ₹${r.originalStopLossPrice.toFixed(2)} → ₹${r.newStopLossPrice.toFixed(2)}`);
    });
  } else {
    console.log('- No accounts will trigger rebase with current configuration');
  }
  
  const noRebaseResults = results.filter(r => !r.shouldRebase);
  if (noRebaseResults.length > 0) {
    console.log(`- ${noRebaseResults.length} account(s) will NOT trigger rebase:`);
    noRebaseResults.forEach(r => {
      console.log(`  • Account ${r.accountId}: ${r.reason}`);
    });
  }
}

console.log('\n🔧 env.example Configuration Analysis:');
console.log('=====================================');
console.log('Account 1: REBASE_TP_AND_SL_1=true, REBASE_THRESHOLD_PERCENTAGE_1=0.1%');
console.log('Account 2: REBASE_TP_AND_SL_2=false (disabled)');
console.log('Account 3: REBASE_TP_AND_SL_3=true, REBASE_THRESHOLD_PERCENTAGE_3=0.05%');
console.log('Account 4: REBASE_TP_AND_SL_4=false (disabled)');
console.log('Account 5: REBASE_TP_AND_SL_5=true, REBASE_THRESHOLD_PERCENTAGE_5=0.15%');
console.log('');
console.log('💡 Note: Only accounts with valid tokens and client IDs are considered active.');
console.log('   To test with actual accounts, update the mockEnvVars with real values.');
