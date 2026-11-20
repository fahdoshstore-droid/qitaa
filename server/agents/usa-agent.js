/**
 * ═══════════════════════════════════════════════════════════════
 *  🇺🇸 USA SOURCING AGENT — Real Parts Sourcing from US Stores
 *
 *  Automates the workflow of sourcing parts from US auto parts stores:
 *  1. Search RockAuto + eBay + GMPartsGiant for part numbers
 *  2. Compare prices across stores
 *  3. Calculate landed cost (parts + shipping + customs + VAT)
 *  4. Add commission markup
 *  5. Convert to SAR
 *  6. Format WhatsApp message in Arabic
 * ═══════════════════════════════════════════════════════════════
 */

const BaseAgent = require('./base-agent');
const axios = require('axios');
const cheerio = require('cheerio');

// ── Constants ──────────────────────────────────────────────────
const USD_TO_SAR = 3.75;
const CUSTOMS_DUTY = 0.05;      // 5% on auto parts
const VAT = 0.15;                // 15% Saudi VAT
const DEFAULT_COMMISSION = 0.20; // 20% markup
const SHIPPING_PER_KG = 18;      // Shop & Ship ~$18/kg US→Saudi
const DEFAULT_PART_WEIGHT_KG = 0.5; // estimate if unknown

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const STORES = {
  rockauto: {
    name: 'RockAuto',
    searchUrl: (partNum) => `https://www.rockauto.com/en/partsearch/?partnum=${encodeURIComponent(partNum)}`,
    currency: 'USD',
  },
  ebay: {
    name: 'eBay',
    searchUrl: (partNum) => `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(partNum)}&_sop=15`,
    currency: 'USD',
  },
  gmpartsgiant: {
    name: 'GMPartsGiant',
    searchUrl: (partNum) => `https://www.gmpartsgiant.com/oem-parts/${encodeURIComponent(partNum)}.html`,
    currency: 'USD',
  },
};

// ── HTTP helper with retries ───────────────────────────────────
async function fetchPage(url, retries = 2) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await axios.get(url, {
        headers,
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: (s) => s < 500,
      });
      return resp.data;
    } catch (err) {
      if (attempt === retries) return null;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return null;
}

// ── Price extraction ───────────────────────────────────────────
function extractPrice(text) {
  if (!text) return null;
  const match = text.match(/\$([\d,]+\.?\d*)/);
  if (!match) return null;
  return parseFloat(match[1].replace(/,/g, ''));
}

// ── RockAuto search ────────────────────────────────────────────
async function searchRockAuto(partNum) {
  const html = await fetchPage(STORES.rockauto.searchUrl(partNum));
  if (!html) return { store: 'RockAuto', found: false };

  const $ = cheerio.load(html);
  const results = [];

  // RockAuto lists parts in table rows with class 'listing-line'
  $('tr.listing-line, [id^="listing-"]').slice(0, 5).each((_, el) => {
    const $el = $(el);
    const text = $el.text();
    const price = extractPrice(text);
    const brand = $el.find('.listing-brand, [id^="brand-"]').text().trim() ||
                  text.match(/([A-Za-z]+)\s/)?.[1] || '';
    const partNumber = $el.find('.listing-part-number, [id^="partnum-"]').text().trim() || partNum;
    const availability = text.includes('In Stock') ? 'in_stock' : 'check';

    if (price && price > 0) {
      results.push({
        store: 'RockAuto',
        brand: brand.substring(0, 30),
        partNumber: partNumber.substring(0, 50),
        price: price,
        currency: 'USD',
        availability,
        url: STORES.rockauto.searchUrl(partNum),
      });
    }
  });

  // Fallback: look for any price on the page
  if (results.length === 0) {
    const allText = $('body').text();
    const price = extractPrice(allText);
    if (price && price > 0 && price < 10000) {
      results.push({
        store: 'RockAuto',
        brand: '',
        partNumber: partNum,
        price: price,
        currency: 'USD',
        availability: 'check',
        url: STORES.rockauto.searchUrl(partNum),
      });
    }
  }

  return results.length > 0
    ? { store: 'RockAuto', found: true, results }
    : { store: 'RockAuto', found: false, url: STORES.rockauto.searchUrl(partNum) };
}

// ── eBay search ────────────────────────────────────────────────
async function searchEbay(partNum) {
  // eBay blocks simple HTTP scraping — use their search results page
  // with a mobile-like user agent that returns server-rendered HTML
  const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(partNum)}&_sop=15&_ipg=25`;
  const html = await fetchPage(url);
  if (!html) return { store: 'eBay', found: false, url };

  const $ = cheerio.load(html);
  const results = [];

  // eBay uses multiple selector patterns across versions
  const selectors = [
    'li.s-item',
    'div.s-item',
    '[data-testid="s-item"]',
    '.srp-results .s-item',
  ];

  let items = $();
  for (const sel of selectors) {
    items = $(sel);
    if (items.length > 0) break;
  }

  items.slice(0, 5).each((_, el) => {
    const $el = $(el);
    const title = $el.find('.s-item__title, [role="heading"] span, h3').text().trim();
    const priceText = $el.find('.s-item__price, .x-price-undo, span[class*="price"]').text().trim();
    const price = extractPrice(priceText);
    const link = $el.find('.s-item__link, a').first().attr('href');

    if (title && price && price > 0 && !title.includes('Shop on eBay') && !title.includes('Browse these')) {
      results.push({
        store: 'eBay',
        brand: title.substring(0, 50),
        partNumber: partNum,
        price: price,
        currency: 'USD',
        availability: 'buy_now',
        url: link || url,
        condition: title.toLowerCase().includes('used') ? 'used' : 'new',
      });
    }
  });

  return results.length > 0
    ? { store: 'eBay', found: true, results }
    : { store: 'eBay', found: false, url };
}

// ── GMPartsGiant search ───────────────────────────────────────
async function searchGMPartsGiant(partNum) {
  const html = await fetchPage(STORES.gmpartsgiant.searchUrl(partNum));
  if (!html) return { store: 'GMPartsGiant', found: false };

  const $ = cheerio.load(html);
  const results = [];

  // GMPartsGiant product pages have price in .price or .product-price
  const priceText = $('.price, .product-price, .special-price, .price-box .price').first().text();
  const price = extractPrice(priceText);
  const title = $('h1.product-name, .product-name h1, h1').first().text().trim();

  if (price && price > 0) {
    results.push({
      store: 'GMPartsGiant',
      brand: 'Genuine GM',
      partNumber: partNum,
      price: price,
      currency: 'USD',
      availability: 'in_stock',
      url: STORES.gmpartsgiant.searchUrl(partNum),
    });
  }

  return results.length > 0
    ? { store: 'GMPartsGiant', found: true, results }
    : { store: 'GMPartsGiant', found: false, url: STORES.gmpartsgiant.searchUrl(partNum) };
}

// ── Landed cost calculation ───────────────────────────────────
function calculateLandedCost(parts, options = {}) {
  const commission = options.commission || DEFAULT_COMMISSION;
  const partsTotalUSD = parts.reduce((sum, p) => sum + (p.bestPrice || 0), 0);
  const totalWeightKg = parts.reduce((sum, p) => sum + (p.weightKg || DEFAULT_PART_WEIGHT_KG), 0);

  // Shipping (Shop & Ship style)
  const shippingUSD = Math.max(25, totalWeightKg * SHIPPING_PER_KG);

  // Customs: 5% duty on (parts + shipping), then 15% VAT on everything
  const customsBase = partsTotalUSD + shippingUSD;
  const customsDuty = customsBase * CUSTOMS_DUTY;
  const vatBase = customsBase + customsDuty;
  const vat = vatBase * VAT;

  // Landed cost in USD
  const landedCostUSD = partsTotalUSD + shippingUSD + customsDuty + vat;

  // Commission
  const commissionUSD = landedCostUSD * commission;

  // Selling price
  const sellingPriceUSD = landedCostUSD + commissionUSD;

  // Convert to SAR
  const sarRate = USD_TO_SAR;
  const partsTotalSAR = partsTotalUSD * sarRate;
  const shippingSAR = shippingUSD * sarRate;
  const customsSAR = customsDuty * sarRate;
  const vatSAR = vat * sarRate;
  const landedCostSAR = landedCostUSD * sarRate;
  const commissionSAR = commissionUSD * sarRate;
  const sellingPriceSAR = sellingPriceUSD * sarRate;

  return {
    currency: 'SAR',
    exchangeRate: sarRate,
    weight: { totalKg: totalWeightKg },
    parts: {
      usd: partsTotalUSD,
      sar: partsTotalSAR,
    },
    shipping: {
      usd: shippingUSD,
      sar: shippingSAR,
      perKg: SHIPPING_PER_KG,
    },
    customs: {
      dutyRate: `${CUSTOMS_DUTY * 100}%`,
      dutyUsd: customsDuty,
      dutySar: customsSAR,
      vatRate: `${VAT * 100}%`,
      vatUsd: vat,
      vatSar: vatSAR,
    },
    landedCost: {
      usd: landedCostUSD,
      sar: landedCostSAR,
    },
    commission: {
      rate: `${commission * 100}%`,
      usd: commissionUSD,
      sar: commissionSAR,
    },
    sellingPrice: {
      usd: sellingPriceUSD,
      sar: sellingPriceSAR,
    },
  };
}

// ── WhatsApp message formatter ─────────────────────────────────
function formatWhatsAppMessage(order, cost, carInfo) {
  const lines = [];
  lines.push(`*${carInfo || 'قطع غيار'}*`);
  lines.push('');

  order.forEach((item, i) => {
    const num = i + 1;
    const name = item.name || item.partNumber;
    const brand = item.brand || '';
    const priceSAR = Math.round((item.bestPrice || 0) * USD_TO_SAR);
    lines.push(`${num}. ${name}${brand ? ' (' + brand + ')' : ''}`);
    lines.push(`   ${item.partNumber} | Qty ${item.qty || 1} | ${priceSAR} ريال`);
  });

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━');
  lines.push(`القطع: ${Math.round(cost.parts.sar)} ريال`);
  lines.push(`الشحن: ${Math.round(cost.shipping.sar)} ريال`);
  lines.push(`الجمارك: ${Math.round(cost.customs.dutySar)} ريال`);
  lines.push(`ضريبة (${cost.customs.vatRate}): ${Math.round(cost.customs.vatSar)} ريال`);
  lines.push(`العمولة (${cost.commission.rate}): ${Math.round(cost.commission.sar)} ريال`);
  lines.push('━━━━━━━━━━━━━━━');
  lines.push(`*الإجمالي: ${Math.round(cost.sellingPrice.sar)} ريال*`);
  lines.push('');
  lines.push(`الوزن التقديري: ${cost.weight.totalKg.toFixed(1)} كجم`);
  lines.push(`الدولار: ${cost.exchangeRate} ريال`);

  return lines.join('\n');
}

// ── USA Agent Class ────────────────────────────────────────────
class USAAgent extends BaseAgent {
  constructor() {
    super('usa', 'USA Sourcing', '🇺🇸', 'Real US auto parts sourcing (RockAuto, eBay, GMPartsGiant)');
    this.orders = [];
  }

  /**
   * Execute a sourcing request.
   * @param {Array|Object} input - Part numbers list or { parts: [...], car: '...', commission: 0.20 }
   *   Each part: { partNumber, name?, qty?, weightKg? }
   * @returns {Object} - Sourcing results + landed cost + WhatsApp message
   */
  async execute(input, options = {}) {
    this.setStatus('working');

    const parts = Array.isArray(input) ? input : (input.parts || []);
    const carInfo = Array.isArray(input) ? options.car : (input.car || options.car || '');
    const commission = Array.isArray(input) ? options.commission : (input.commission || options.commission);

    if (!parts || parts.length === 0) {
      this.setStatus('idle');
      return { error: 'No parts provided. Send array of { partNumber, name?, qty? }' };
    }

    console.log(`🇺🇸 USA Agent: sourcing ${parts.length} parts...`);

    // Search each part across all US stores (parallel)
    const searchResults = await Promise.all(
      parts.map(async (part) => {
        const pn = part.partNumber;
        console.log(`  🔍 Searching: ${pn}`);

        const [rockauto, ebay, gmparts] = await Promise.all([
          searchRockAuto(pn),
          searchEbay(pn),
          searchGMPartsGiant(pn),
        ]);

        // Collect all found results
        const allResults = [];
        for (const storeResult of [rockauto, ebay, gmparts]) {
          if (storeResult.found && storeResult.results) {
            allResults.push(...storeResult.results);
          }
        }

        // Pick best (lowest) price
        let best = null;
        if (allResults.length > 0) {
          best = allResults.reduce((min, r) => r.price < min.price ? r : min, allResults[0]);
        }

        return {
          partNumber: pn,
          name: part.name || pn,
          qty: part.qty || 1,
          weightKg: part.weightKg || DEFAULT_PART_WEIGHT_KG,
          bestPrice: best ? best.price : null,
          bestStore: best ? best.store : null,
          bestUrl: best ? best.url : null,
          allResults: allResults.length,
          stores: {
            rockauto: { found: rockauto.found, url: rockauto.url || null, results: rockauto.results || null },
            ebay: { found: ebay.found, url: ebay.url || null, results: ebay.results || null },
            gmpartsgiant: { found: gmparts.found, url: gmparts.url || null, results: gmparts.results || null },
          },
        };
      })
    );

    // Calculate landed cost
    const cost = calculateLandedCost(searchResults, { commission });

    // Format WhatsApp message
    const whatsappMsg = formatWhatsAppMessage(searchResults, cost, carInfo);

    const result = {
      car: carInfo,
      parts: searchResults,
      cost,
      whatsapp: whatsappMsg,
      summary: `Sourced ${parts.length} parts from US stores. Total: ${Math.round(cost.sellingPrice.sar)} SAR`,
      timestamp: new Date().toISOString(),
    };

    this.orders.push(result);
    this.setStatus('idle');

    return result;
  }

  /**
   * Quick search for a single part number.
   */
  async searchPart(partNum) {
    this.setStatus('working');
    const [rockauto, ebay, gmparts] = await Promise.all([
      searchRockAuto(partNum),
      searchEbay(partNum),
      searchGMPartsGiant(partNum),
    ]);
    this.setStatus('idle');
    return { rockauto, ebay, gmparts };
  }

  /**
   * Add parts to RockAuto cart using Puppeteer (browser automation).
   * Returns cart URL + summary. If headless=false, opens a visible browser
   * so the operator can review and pay directly.
   *
   * @param {Array} parts - [{ partNumber, name, qty }]
   * @param {Object} options - { headless: true, preferOEM: true }
   * @returns {Object} - { cartUrl, items, subtotal, browserOpen }
   */
  async addToCart(parts, options = {}) {
    this.setStatus('working');
    const headless = options.headless !== false; // default true
    const preferOEM = options.preferOEM !== false; // prefer OEM/branded parts

    let puppeteer;
    try {
      puppeteer = require('puppeteer');
    } catch {
      this.setStatus('idle');
      return { error: 'puppeteer not installed. Run: npm install puppeteer' };
    }

    console.log(`🛒 USA Agent: adding ${parts.length} parts to RockAuto cart (headless=${headless})...`);

    const browser = await puppeteer.launch({
      headless: headless ? 'new' : false,
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    const addedItems = [];
    let subtotal = 0;

    for (const part of parts) {
      const pn = part.partNumber;
      const requestedBrand = (part.brand || '').trim();
      console.log(`  🔍 Searching RockAuto for: ${pn}${requestedBrand ? ' (' + requestedBrand + ')' : ''}`);

      try {
        // Search by part number
        await page.goto(`https://www.rockauto.com/en/partsearch/?partnum=${encodeURIComponent(pn)}`, {
          waitUntil: 'domcontentloaded',
          timeout: 20000,
        });
        await sleep(2000);

        // Find all "Add to Cart" buttons. RockAuto triggers Add to Cart via
        // <a onclick="RA.Click('addpart[N]')"> links that sit inside nested tables.
        // We query those links, walk up to the parent table, and check whether the
        // table text contains BOTH the part number AND the requested brand name.
        const buttons = await page.evaluate((pn, requestedBrand) => {
          const partNumUpper = pn.toUpperCase();
          const brandUpper = (requestedBrand || '').toUpperCase().trim();
          const results = [];
          const seenIds = new Set();

          // Primary: <a> elements with onclick="RA.Click('addpart[N]')"
          const links = document.querySelectorAll("a[onclick*=\"RA.Click('addpart\"]");
          for (const link of links) {
            const onclickAttr = link.getAttribute('onclick') || '';
            const idMatch = onclickAttr.match(/addpart\[(\d+)\]/);
            if (!idMatch) continue;
            const num = idMatch[1] || idMatch[2];
            const btnId = `addpart[${num}]`;
            if (seenIds.has(btnId)) continue;
            seenIds.add(btnId);

            // Walk up the DOM to the immediate TBODY — this contains both the
            // brand name row AND the Add to Cart button row for ONE listing.
            // Using TR is too narrow (button is in a different row than the brand).
            // Using TABLE is too wide (contains ALL listings).
            let row = link.closest('tbody');
            if (!row) {
              // Fallback: try tr, then parent
              row = link.closest('tr') || link.parentElement;
            }
            if (!row) continue;

            const text = row.innerText || '';
            const textUpper = text.toUpperCase();

            // Extract price
            const priceMatch = text.match(/\$([\d,]+\.?\d*)/);
            const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null;

            // Extract brand (first uppercase word sequence on its own line)
            const brandMatch = text.match(/^([A-Z][A-Za-z\s\-/.]+)/m);
            const brand = brandMatch ? brandMatch[1].trim() : '';

            const hasPartNum = textUpper.includes(partNumUpper);
            const hasBrand = brandUpper ? textUpper.includes(brandUpper) : true;

            results.push({
              id: btnId,
              price,
              brand,
              hasPartNum,
              hasBrand,
              text: text.substring(0, 300).replace(/\n/g, ' '),
            });
          }

          // Fallback: hidden <input id="addpart[N]"> buttons (older DOM structure)
          const inputBtns = document.querySelectorAll('input[id^="addpart"]');
          for (const btn of inputBtns) {
            if (seenIds.has(btn.id)) continue;
            seenIds.add(btn.id);

            let row = btn.closest('tbody');
            if (!row) {
              row = btn.closest('tr') || btn.parentElement;
            }
            if (!row) continue;

            const text = row.innerText || '';
            const textUpper = text.toUpperCase();
            const priceMatch = text.match(/\$([\d,]+\.?\d*)/);
            const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null;
            const brandMatch = text.match(/^([A-Z][A-Za-z\s\-/.]+)/m);
            const brand = brandMatch ? brandMatch[1].trim() : '';
            const hasPartNum = textUpper.includes(partNumUpper);
            const hasBrand = brandUpper ? textUpper.includes(brandUpper) : true;

            results.push({
              id: btn.id,
              price,
              brand,
              hasPartNum,
              hasBrand,
              text: text.substring(0, 300).replace(/\n/g, ' '),
            });
          }

          return results;
        }, pn, requestedBrand);

        if (buttons.length === 0) {
          console.log(`  ⚠️ No results found for ${pn}`);
          addedItems.push({ partNumber: pn, name: part.name, brand: requestedBrand || null, added: false, reason: 'not found' });
          continue;
        }

        // Filter candidates: must contain the part number, and if a brand was
        // requested, the table text MUST contain that brand (case-insensitive).
        let candidates = buttons.filter(b => b.hasPartNum);
        if (requestedBrand) {
          candidates = candidates.filter(b => b.hasBrand);
        }

        if (candidates.length === 0) {
          if (requestedBrand) {
            const foundBrands = [...new Set(buttons.map(b => b.brand).filter(Boolean))].join(', ');
            console.log(`  ⚠️ No exact brand match for ${pn}: requested "${requestedBrand}", found brands: [${foundBrands}] — SKIPPING (no fallback)`);
          } else {
            console.log(`  ⚠️ No part-number match for ${pn} — SKIPPING`);
          }
          addedItems.push({
            partNumber: pn,
            name: part.name,
            brand: requestedBrand || null,
            added: false,
            reason: requestedBrand
              ? `no match for brand "${requestedBrand}" (not falling back to another brand)`
              : 'part number not found in any listing',
          });
          continue;
        }

        // Among brand-matched candidates, pick the cheapest
        candidates.sort((a, b) => (a.price || 9999) - (b.price || 9999));
        const best = candidates[0];
        console.log(`  ✅ Adding: ${best.brand} ${pn} at $${best.price} (brand match: ${requestedBrand || 'any'})`);

        await page.evaluate((btnId) => {
          // Prefer clicking the <a onclick="RA.Click('addpart[N]')"> link,
          // fall back to the hidden <input id="addpart[N]"> button.
          const link = document.querySelector(`a[onclick*="RA.Click('${btnId}')"]`);
          if (link) {
            link.click();
            return;
          }
          const btn = document.getElementById(btnId);
          if (btn) btn.click();
        }, best.id);

        await sleep(2000);
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});

        addedItems.push({
          partNumber: pn,
          name: part.name,
          brand: best.brand || requestedBrand,
          price: best.price,
          added: true,
          isOEM: requestedBrand ? true : false,
        });

        if (best.price) subtotal += best.price;

      } catch (err) {
        console.log(`  ❌ Error adding ${pn}: ${err.message}`);
        addedItems.push({ partNumber: pn, name: part.name, added: false, reason: err.message });
      }
    }

    // Navigate to cart page
    await page.goto('https://www.rockauto.com/en/cart/', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await sleep(2000);

    // Update quantities on the cart page for parts that need qty > 1
    const partsWithQty = parts.filter(p => p.qty && p.qty > 1);
    if (partsWithQty.length > 0) {
      console.log('   Updating quantities on cart page...');
      await page.evaluate((qtyParts) => {
        const qtyInputs = document.querySelectorAll('input[name^="raquantity"]');
        for (const el of qtyInputs) {
          // Walk up to tbody to find the part number in this cart row
          let container = el.closest('tbody') || el.closest('tr') || el.parentElement;
          if (!container) continue;
          const rowText = container.innerText.toUpperCase();
          for (const qp of qtyParts) {
            if (rowText.includes(String(qp.partNumber).toUpperCase())) {
              el.value = String(qp.qty);
              el.setAttribute('value', String(qp.qty));
              break;
            }
          }
        }
        // Click Update Cart
        const updateBtn = document.getElementById('updatecart_maincart');
        if (updateBtn) updateBtn.click();
      }, partsWithQty);
      await sleep(3000);
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
      console.log('   Quantities updated.');
    }

    // Get cart subtotal from page
    const cartSubtotal = await page.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/Subtotal\s*\$([\d,]+\.?\d*)/);
      return match ? parseFloat(match[1].replace(/,/g, '')) : null;
    });

    const finalSubtotal = cartSubtotal || subtotal;
    const cartUrl = page.url();

    console.log(`\n🛒 Cart ready: ${cartUrl}`);
    console.log(`   Items: ${addedItems.filter(i => i.added).length}/${parts.length}`);
    console.log(`   Subtotal: $${finalSubtotal}`);

    const result = {
      cartUrl,
      items: addedItems,
      subtotal: finalSubtotal,
      currency: 'USD',
      addedCount: addedItems.filter(i => i.added).length,
      totalCount: parts.length,
      browserOpen: !headless,
      summary: `Cart ready: ${addedItems.filter(i => i.added).length}/${parts.length} parts added. Subtotal: $${finalSubtotal}`,
    };

    if (headless) {
      await browser.close();
    } else {
      // Keep browser open so the operator can review and pay
      console.log('   Browser left open for review & payment.');
    }

    this.orders.push(result);
    this.setStatus('idle');

    return result;
  }
}

module.exports = new USAAgent();
