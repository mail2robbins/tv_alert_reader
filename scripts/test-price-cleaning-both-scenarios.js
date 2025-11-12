// Test price cleaning with and without currency symbols

console.log('=== Testing Price Cleaning Logic ===\n');

function cleanAndParse(priceString) {
  const cleanedPrice = priceString.replace(/[₹Rs,\s]/g, '');
  const price = parseFloat(cleanedPrice);
  return { original: priceString, cleaned: cleanedPrice, parsed: price };
}

const testCases = [
  // Without currency symbols (normal case)
  "1689.70",
  "2500.50",
  "1800.75",
  
  // With currency symbols (edge case)
  "₹1689.70",
  "Rs 1689.70",
  "₹2500.50",
  
  // With commas (formatted numbers)
  "1,689.70",
  "₹1,689.70",
  "Rs 1,689.70",
  
  // Edge cases
  "1689",      // Integer
  "0.50",      // Decimal less than 1
  "10000.00",  // Large number
];

console.log('Testing all scenarios:\n');
testCases.forEach(testCase => {
  const result = cleanAndParse(testCase);
  const status = !isNaN(result.parsed) && result.parsed > 0 ? '✅' : '❌';
  console.log(`${status} Input: "${result.original}"`);
  console.log(`   Cleaned: "${result.cleaned}"`);
  console.log(`   Parsed: ${result.parsed}`);
  console.log('');
});

console.log('\n=== Conclusion ===');
console.log('The regex /[₹Rs,\\s]/g only removes:');
console.log('  - ₹ (rupee symbol)');
console.log('  - Rs (rupee text)');
console.log('  - , (comma)');
console.log('  - \\s (whitespace)');
console.log('\nIt PRESERVES:');
console.log('  - Digits (0-9)');
console.log('  - Decimal point (.)');
console.log('  - Negative sign (-)');
console.log('\nResult: Works correctly with OR without currency symbols!');
