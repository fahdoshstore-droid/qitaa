/**
 * Test the addToCart feature with real Hummer H3 parts.
 */
const USAAgent = require('./usa-agent');

async function test() {
  console.log('═══════════════════════════════════════════');
  console.log('🛒 ADD TO CART TEST — Hummer H3 Parts');
  console.log('═══════════════════════════════════════════\n');

  const result = await USAAgent.addToCart(
    [
      { partNumber: '20832044', name: 'Parking Brake Lever', qty: 1 },
      { partNumber: 'PF61E', name: 'Oil Filter AC Delco', qty: 1 },
    ],
    {
      headless: true,   // headless for test
      preferOEM: true,  // prefer OEM parts
    }
  );

  console.log('\n═══════════════════════════════════════════');
  console.log('RESULT:');
  console.log('═══════════════════════════════════════════');
  console.log(`Cart URL: ${result.cartUrl}`);
  console.log(`Added: ${result.addedCount}/${result.totalCount} parts`);
  console.log(`Subtotal: $${result.subtotal}`);
  console.log(`Browser open: ${result.browserOpen}`);
  console.log('\nItems:');
  for (const item of result.items) {
    if (item.added) {
      console.log(`  ✅ ${item.partNumber} (${item.brand}) — $${item.price} ${item.isOEM ? '[OEM]' : ''}`);
    } else {
      console.log(`  ❌ ${item.partNumber} — ${item.reason}`);
    }
  }
  console.log(`\nSummary: ${result.summary}`);
}

test().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
