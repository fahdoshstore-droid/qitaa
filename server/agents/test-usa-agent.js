/**
 * Test USA Agent with the REAL Hummer H3 use case from Claude Desktop.
 * Parts: 2007 Hummer H3 3.7L L5
 */
const USAAgent = require('./usa-agent');
const PartsAgent = require('./parts-agent');

async function test() {
  console.log('═══════════════════════════════════════════');
  console.log('🇺🇸 USA AGENT TEST — Real Hummer H3 Use Case');
  console.log('═══════════════════════════════════════════\n');

  // Canonical RockAuto parts from hummer-h3-parts.json (2007 Hummer H3 3.7L L5)
  const parts = [
    { partNumber: '20832044', name: 'Parking Brake Lever',         brand: 'GM Genuine', qty: 1, weightKg: 0.5 },
    { partNumber: 'PF61E',    name: 'Oil Filter',                   brand: 'ACDelco',    qty: 1, weightKg: 0.2 },
    { partNumber: '19540439', name: 'Power Steering Pressure Hose', brand: 'GM Genuine', qty: 1, weightKg: 0.5 },
    { partNumber: '32110',    name: 'Exhaust Manifold Stud & Nut Kit', brand: 'Dorman',  qty: 2, weightKg: 0.3 },
    { partNumber: '896341',   name: 'Leak Sealant',                 brand: 'Elring',     qty: 1, weightKg: 0.2 },
    { partNumber: '41103',    name: 'Spark Plug',                   brand: 'ACDelco',    qty: 5, weightKg: 0.1 },
    { partNumber: '11562588', name: 'Oil Drain Plug',               brand: 'GM Genuine', qty: 1, weightKg: 0.2 },
  ];

  const result = await PartsAgent.execute({
    parts,
    car: '2007 Hummer H3 3.7L L5',
    commission: 0.20,
  });

  console.log('\n📋 RESULTS PER PART:');
  console.log('─────────────────────────────');
  for (const part of result.parts) {
    console.log(`\n#${part.partNumber} — ${part.name}`);
    console.log(`  Best: $${part.bestPrice} from ${part.bestStore}`);
    console.log(`  Results found: ${part.allResults}`);
    console.log(`  RockAuto: ${part.stores.rockauto.found ? '✅' : '❌'}`);
    console.log(`  eBay: ${part.stores.ebay.found ? '✅' : '❌'}`);
    console.log(`  GMPartsGiant: ${part.stores.gmpartsgiant.found ? '✅' : '❌'}`);
  }

  console.log('\n💰 LANDED COST:');
  console.log('─────────────────────────────');
  const c = result.cost;
  console.log(`Parts:      $${c.parts.usd.toFixed(2)} / ${Math.round(c.parts.sar)} SAR`);
  console.log(`Shipping:    $${c.shipping.usd.toFixed(2)} / ${Math.round(c.shipping.sar)} SAR (${c.weight.totalKg.toFixed(1)} kg)`);
  console.log(`Customs (5%): $${c.customs.dutyUsd.toFixed(2)} / ${Math.round(c.customs.dutySar)} SAR`);
  console.log(`VAT (15%):   $${c.customs.vatUsd.toFixed(2)} / ${Math.round(c.customs.vatSar)} SAR`);
  console.log(`Landed:      $${c.landedCost.usd.toFixed(2)} / ${Math.round(c.landedCost.sar)} SAR`);
  console.log(`Commission:  $${c.commission.usd.toFixed(2)} / ${Math.round(c.commission.sar)} SAR (${c.commission.rate})`);
  console.log(`SELLING:     $${c.sellingPrice.usd.toFixed(2)} / ${Math.round(c.sellingPrice.sar)} SAR`);

  console.log('\n📱 WHATSAPP MESSAGE:');
  console.log('─────────────────────────────');
  console.log(result.whatsapp);

  console.log('\n✅ Test complete.');
}

test().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
