/**
 * Open RockAuto with ALL 7 correct parts, brand-matched, visible browser for the operator to pay.
 * Uses the canonical parts list from hummer-h3-parts.json.
 * Stays alive until the operator closes the browser.
 */
const USAAgent = require('./usa-agent');
const fs = require('fs');
const path = require('path');

// Load canonical parts list
const partsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'hummer-h3-parts.json'), 'utf8'));

(async () => {
  const rockautoParts = partsData.rockauto.map(p => ({
    partNumber: p.partNumber,
    name: p.description,
    brand: p.brand,
    qty: p.qty
  }));

  console.log('═══════════════════════════════════════════');
  console.log('🛒 RockAuto — 2007 Hummer H3 3.7L L5');
  console.log('═══════════════════════════════════════════');
  console.log(`📦 ${rockautoParts.length} parts to add (brand-matched):\n`);
  rockautoParts.forEach((p, i) => {
    console.log(`  ${i+1}. ${p.brand} ${p.partNumber} — ${p.name} — Qty ${p.qty}`);
  });
  console.log('\n⏳ Opening browser and adding parts...\n');

  const result = await USAAgent.addToCart(rockautoParts, {
    headless: false,
    preferOEM: true,
  });

  console.log('\n═══════════════════════════════════════════');
  console.log('ROCKAUTO CART — FINAL');
  console.log('═══════════════════════════════════════════');
  console.log(`URL: ${result.cartUrl}`);
  console.log(`Added: ${result.addedCount}/${result.totalCount}`);
  console.log(`Subtotal: $${result.subtotal}`);
  console.log('\nItems:');
  for (const item of result.items) {
    if (item.added) {
      console.log(`  ✅ ${item.brand} ${item.partNumber} — $${item.price} [OEM]`);
    } else {
      console.log(`  ❌ ${item.partNumber} — ${item.reason}`);
    }
  }

  const expected = 315.96;
  console.log(`\nSubtotal: $${result.subtotal}`);
  console.log(`Expected: $${expected}`);
  console.log(`Match: ${Math.abs(parseFloat(result.subtotal) - expected) < 1 ? '✅ YES' : '❌ CHECK'}`);

  console.log('\n✅ Browser OPEN — review and pay at rockauto.com/en/cart/');
  console.log('   Process stays alive until browser is closed.\n');

  // Keep alive
  process.stdin.resume();
  setInterval(() => {
    console.log(`[${new Date().toLocaleTimeString()}] Browser open. Cart: $${result.subtotal}`);
  }, 60000);
})();
