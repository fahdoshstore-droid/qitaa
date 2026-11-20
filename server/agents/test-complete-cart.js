/**
 * Add ALL Hummer H3 parts — RockAuto + GM parts (originally from GMPartsGiant).
 * Since GMPartsGiant is blocked by Cloudflare, we search RockAuto for the GM parts too.
 */
const USAAgent = require('./usa-agent');

async function test() {
  console.log('═══════════════════════════════════════════');
  console.log('🛒 COMPLETE CART — All Hummer H3 Parts');
  console.log('═══════════════════════════════════════════\n');

  // ALL parts: canonical RockAuto list + canonical GM parts (from GMPartsGiant list)
  // Source: server/agents/hummer-h3-parts.json
  const allParts = [
    // Canonical RockAuto parts (7)
    { partNumber: '20832044', name: 'Parking Brake Lever',              brand: 'GM Genuine', qty: 1 },
    { partNumber: 'PF61E',    name: 'Oil Filter',                        brand: 'ACDelco',    qty: 1 },
    { partNumber: '19540439', name: 'Power Steering Pressure Hose',      brand: 'GM Genuine', qty: 1 },
    { partNumber: '32110',    name: 'Exhaust Manifold Stud & Nut Kit',   brand: 'Dorman',     qty: 2 },
    { partNumber: '896341',   name: 'Leak Sealant',                      brand: 'Elring',     qty: 1 },
    { partNumber: '41103',    name: 'Spark Plug',                        brand: 'ACDelco',    qty: 5 },
    { partNumber: '11562588', name: 'Oil Drain Plug',                    brand: 'GM Genuine', qty: 1 },
    // Canonical GM parts from GMPartsGiant list (7)
    { partNumber: '19301783', name: 'Steering Gear Bushing',             brand: 'GM', qty: 1 },
    { partNumber: '89018220', name: 'Camshaft Cover Gasket Kit',         brand: 'GM', qty: 1 },
    { partNumber: '12575463', name: 'Throttle Body Gasket',              brand: 'GM', qty: 1 },
    { partNumber: '24504031', name: 'Oil Level Indicator O-Ring',        brand: 'GM', qty: 1 },
    { partNumber: '12611636', name: 'Serpentine Belt',                   brand: 'GM', qty: 1 },
    { partNumber: '15105884', name: 'Exhaust Manifold Pipe Seal',        brand: 'GM', qty: 1 },
    { partNumber: '11589040', name: 'Torque Converter Bolt',             brand: 'GM', qty: 3 },
  ];

  console.log(`📦 Total parts to add: ${allParts.length}`);
  console.log('   RockAuto original: 7');
  console.log('   GM (from GMPartsGiant list): 7');
  console.log('\n⏳ Adding all to RockAuto cart...\n');

  const result = await USAAgent.addToCart(allParts, {
    headless: true,
    preferOEM: true,
  });

  console.log('\n═══════════════════════════════════════════');
  console.log('COMPLETE CART RESULT:');
  console.log('═══════════════════════════════════════════');
  console.log(`Cart URL: ${result.cartUrl}`);
  console.log(`Added: ${result.addedCount}/${result.totalCount}`);
  console.log(`Subtotal: $${result.subtotal}`);
  console.log('\nItems:');
  for (const item of result.items) {
    if (item.added) {
      console.log(`  ✅ ${item.partNumber} (${item.brand}) — $${item.price} ${item.isOEM ? '[OEM]' : ''}`);
    } else {
      console.log(`  ❌ ${item.partNumber} — ${item.reason}`);
    }
  }

  // Calculate landed cost
  const partsWithPrice = result.items.filter(i => i.added && i.price);
  const partsTotal = partsWithPrice.reduce((s, p) => s + p.price, 0);
  const shipping = 30; // estimated
  const customs = (partsTotal + shipping) * 0.05;
  const vat = (partsTotal + shipping + customs) * 0.15;
  const landed = partsTotal + shipping + customs + vat;
  const commission = landed * 0.20;
  const selling = landed + commission;
  const sar = 3.75;

  console.log('\n💰 LANDED COST (SAR):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`القطع:      ${Math.round(partsTotal * sar)} ريال ($${partsTotal.toFixed(2)})`);
  console.log(`الشحن:      ${Math.round(shipping * sar)} ريال ($${shipping})`);
  console.log(`الجمارك 5%: ${Math.round(customs * sar)} ريال`);
  console.log(`الضريبة 15%: ${Math.round(vat * sar)} ريال`);
  console.log(`التكلفة:    ${Math.round(landed * sar)} ريال`);
  console.log(`العمولة 20%: ${Math.round(commission * sar)} ريال`);
  console.log(`سعر البيع:   ${Math.round(selling * sar)} ريال ($${selling.toFixed(2)})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log(`\n${result.summary}`);
}

test().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
