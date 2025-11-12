// Debug the calculation that resulted in ₹844.85 leveraged value

const stockPrice = 1689.70;

console.log('=== Debugging MFSL Order Calculation ===\n');
console.log(`Stock Price: ₹${stockPrice}\n`);

// Test different scenarios to get ₹844.85 leveraged value
console.log('Scenario 1: Normal calculation with default values');
const availableFunds1 = 20000;
const riskOnCapital1 = 1.0;
const leverage1 = 2;
const riskAdjustedFunds1 = availableFunds1 * riskOnCapital1;
const quantity1 = Math.floor(riskAdjustedFunds1 / stockPrice);
const orderValue1 = quantity1 * stockPrice;
const leveragedValue1 = orderValue1 / leverage1;
console.log(`  Available Funds: ₹${availableFunds1}`);
console.log(`  Risk on Capital: ${riskOnCapital1}`);
console.log(`  Leverage: ${leverage1}x`);
console.log(`  Quantity: ${quantity1}`);
console.log(`  Order Value: ₹${orderValue1.toFixed(2)}`);
console.log(`  Leveraged Value: ₹${leveragedValue1.toFixed(2)}\n`);

console.log('Scenario 2: What values give us ₹844.85?');
const targetLeveragedValue = 844.85;
const leverage2 = 2;
const orderValue2 = targetLeveragedValue * leverage2;
const quantity2 = Math.floor(orderValue2 / stockPrice);
const actualOrderValue2 = quantity2 * stockPrice;
const actualLeveragedValue2 = actualOrderValue2 / leverage2;
console.log(`  Target Leveraged Value: ₹${targetLeveragedValue}`);
console.log(`  Calculated Order Value: ₹${orderValue2.toFixed(2)}`);
console.log(`  Quantity: ${quantity2}`);
console.log(`  Actual Order Value: ₹${actualOrderValue2.toFixed(2)}`);
console.log(`  Actual Leveraged Value: ₹${actualLeveragedValue2.toFixed(2)}`);
console.log(`  Risk Adjusted Funds needed: ₹${actualOrderValue2.toFixed(2)}\n`);

console.log('Scenario 3: Working backwards from quantity = 1');
const quantity3 = 1;
const orderValue3 = quantity3 * stockPrice;
const leveragedValue3 = orderValue3 / leverage1;
console.log(`  If Quantity = ${quantity3}:`);
console.log(`  Order Value: ₹${orderValue3.toFixed(2)}`);
console.log(`  Leveraged Value: ₹${leveragedValue3.toFixed(2)}`);
console.log(`  This matches! So quantity was 1\n`);

console.log('Scenario 4: What availableFunds * riskOnCapital gives quantity = 1?');
const neededRiskAdjustedFunds = stockPrice * 1; // For quantity = 1
console.log(`  Risk Adjusted Funds needed: ₹${neededRiskAdjustedFunds.toFixed(2)}`);
console.log(`  If riskOnCapital = 1.0, then availableFunds = ₹${neededRiskAdjustedFunds.toFixed(2)}`);
console.log(`  If availableFunds = 20000, then riskOnCapital = ${(neededRiskAdjustedFunds / 20000).toFixed(4)}\n`);

console.log('=== CONCLUSION ===');
console.log('The leveraged value of ₹844.85 means:');
console.log('  - Quantity was calculated as 1');
console.log('  - This happens when availableFunds * riskOnCapital ≈ ₹1689.70');
console.log('  - With default availableFunds = ₹20000, this would need riskOnCapital ≈ 0.0845');
console.log('  - OR availableFunds was set to ≈ ₹1689.70 with riskOnCapital = 1.0');
console.log('\nMost likely: Database returned availableFunds ≈ ₹1689.70 on first load!');
