/**
 * Add ALL Hummer H3 parts to RockAuto cart (full list from Claude Desktop use case).
 */
const USAAgent = require('./usa-agent');

async function test() {
  console.log('═══════════════════════════════════════════');
  console.log('🛒 FULL CART TEST — All Hummer H3 Parts');
  console.log('═══════════════════════════════════════════\n');

  // Canonical RockAuto parts from hummer-h3-parts.json (2007 Hummer H3 3.7L L5)
  const rockautoParts = [
    { partNumber: '20832044', name: 'Parking Brake Lever',            brand: 'GM Genuine', qty: 1 },
    { partNumber: 'PF61E',    name: 'Oil Filter',                      brand: 'ACDelco',    qty: 1 },
    { partNumber: '19540439', name: 'Power Steering Pressure Hose',    brand: 'GM Genuine', qty: 1 },
    { partNumber: '32110',    name: 'Exhaust Manifold Stud & Nut Kit', brand: 'Dorman',     qty: 2 },
    { partNumber: '896341',   name: 'Leak Sealant',                    brand: 'Elring',     qty: 1 },
    { partNumber: '41103',    name: 'Spark Plug',                      brand: 'ACDelco',    qty: 5 },
    { partNumber: '11562588', name: 'Oil Drain Plug',                  brand: 'GM Genuine', qty: 1 },
  ];

  // Canonical GMPartsGiant parts from hummer-h3-parts.json
  const gmpartsParts = [
    { partNumber: '19301783', name: 'Steering Gear Bushing',         brand: 'GM', qty: 1 },
    { partNumber: '89018220', name: 'Camshaft Cover Gasket Kit',     brand: 'GM', qty: 1 },
    { partNumber: '12575463', name: 'Throttle Body Gasket',          brand: 'GM', qty: 1 },
    { partNumber: '24504031', name: 'Oil Level Indicator O-Ring',    brand: 'GM', qty: 1 },
    { partNumber: '12611636', name: 'Serpentine Belt',               brand: 'GM', qty: 1 },
    { partNumber: '15105884', name: 'Exhaust Manifold Pipe Seal',    brand: 'GM', qty: 1 },
    { partNumber: '11589040', name: 'Torque Converter Bolt',         brand: 'GM', qty: 3 },
  ];

  console.log('📦 RockAuto parts (7):');
  rockautoParts.forEach(p => console.log(`   ${p.partNumber} — ${p.name} x${p.qty}`));
  console.log('\n📦 GMPartsGiant parts (7):');
  gmpartsParts.forEach(p => console.log(`   ${p.partNumber} — ${p.name} x${p.qty}`));
  console.log('\n⏳ Adding to RockAuto cart...\n');

  const result = await USAAgent.addToCart(rockautoParts, {
    headless: true,
    preferOEM: true,
  });

  console.log('\n═══════════════════════════════════════════');
  console.log('ROCKAUTO CART RESULT:');
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
  console.log(`\n${result.summary}`);
}

test().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
