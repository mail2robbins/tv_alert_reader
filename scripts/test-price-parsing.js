// Test price parsing with different formats

function testPriceParsing() {
  const testCases = [
    "1689.70",      // Normal format
    "₹1689.70",     // With rupee symbol
    "Rs 1689.70",   // With Rs prefix
    "1,689.70",     // With comma separator
    "₹1,689.70",    // With rupee and comma
  ];

  console.log('Testing price parsing:\n');
  
  testCases.forEach(priceStr => {
    const parsed = parseFloat(priceStr);
    console.log(`Input: "${priceStr}"`);
    console.log(`parseFloat result: ${parsed}`);
    console.log(`isNaN: ${isNaN(parsed)}`);
    
    // Clean version
    const cleaned = priceStr.replace(/[₹Rs,\s]/g, '');
    const cleanedParsed = parseFloat(cleaned);
    console.log(`Cleaned: "${cleaned}" -> ${cleanedParsed}`);
    console.log('---');
  });
}

testPriceParsing();
