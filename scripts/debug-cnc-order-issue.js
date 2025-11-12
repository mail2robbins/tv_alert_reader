// Debug CNC order issue with riskOnCapital = 0

const stockPrice = 312.05;
const availableFunds = 3000;
const leverage = 1;

console.log('=== Debugging CNC Order Issue ===\n');
console.log(`Stock Price: ₹${stockPrice}`);
console.log(`Available Funds: ₹${availableFunds}`);
console.log(`Leverage: ${leverage}x\n`);

console.log('Scenario 1: riskOnCapital = 0 (CURRENT - BROKEN)');
const riskOnCapital1 = 0;
const riskAdjustedFunds1 = availableFunds * riskOnCapital1;
const quantity1 = Math.floor(riskAdjustedFunds1 / stockPrice);
console.log(`  riskOnCapital: ${riskOnCapital1}`);
console.log(`  riskAdjustedFunds: ₹${availableFunds} × ${riskOnCapital1} = ₹${riskAdjustedFunds1}`);
console.log(`  quantity: Math.floor(₹${riskAdjustedFunds1} / ₹${stockPrice}) = ${quantity1}`);
console.log(`  ❌ Result: quantity = 0 → "Stock price too high for available funds"\n`);

console.log('Scenario 2: riskOnCapital = 1.0 (CORRECT)');
const riskOnCapital2 = 1.0;
const riskAdjustedFunds2 = availableFunds * riskOnCapital2;
const quantity2 = Math.floor(riskAdjustedFunds2 / stockPrice);
const orderValue2 = quantity2 * stockPrice;
const leveragedValue2 = orderValue2 / leverage;
console.log(`  riskOnCapital: ${riskOnCapital2}`);
console.log(`  riskAdjustedFunds: ₹${availableFunds} × ${riskOnCapital2} = ₹${riskAdjustedFunds2}`);
console.log(`  quantity: Math.floor(₹${riskAdjustedFunds2} / ₹${stockPrice}) = ${quantity2}`);
console.log(`  orderValue: ${quantity2} × ₹${stockPrice} = ₹${orderValue2.toFixed(2)}`);
console.log(`  leveragedValue: ₹${orderValue2.toFixed(2)} / ${leverage} = ₹${leveragedValue2.toFixed(2)}`);
console.log(`  ✅ Result: quantity = ${quantity2}, order can be placed!\n`);

console.log('=== EXPLANATION ===');
console.log('riskOnCapital is a multiplier that determines how much of your');
console.log('available funds to use for the trade.');
console.log('');
console.log('  riskOnCapital = 0   → Use 0% of funds → quantity = 0 ❌');
console.log('  riskOnCapital = 0.5 → Use 50% of funds');
console.log('  riskOnCapital = 1.0 → Use 100% of funds ✅ (DEFAULT)');
console.log('  riskOnCapital = 2.0 → Use 200% of funds (aggressive)');
console.log('');
console.log('For CNC orders with leverage = 1, you typically want riskOnCapital = 1.0');
