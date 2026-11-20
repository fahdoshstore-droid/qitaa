# 🦎 QITAA — Car Parts Sourcing Agent

**QITAA** is an open-source car parts sourcing agent that automates the workflow of finding, pricing, and ordering auto parts from US stores and delivering them to Saudi Arabia with full landed-cost calculation and Arabic WhatsApp quote formatting.

## What It Does

1. **Searches** US auto parts stores — RockAuto, eBay, and GMPartsGiant — in parallel for any list of part numbers.
2. **Compares** prices across stores and picks the best (lowest) price per part.
3. **Calculates landed cost** including:
   - Parts subtotal (USD → SAR)
   - Shipping (weight-based, ~$18/kg US → Saudi)
   - Saudi customs duty (5% on auto parts)
   - VAT (15%)
   - Commission markup (default 20%)
4. **Formats a WhatsApp message** in Arabic with the full quote breakdown.
5. **Automates cart checkout** on RockAuto using Puppeteer browser automation with brand-matching (OEM preference) and automatic quantity updates.

## Quick Start

```bash
# Clone
git clone https://github.com/qitaa/qitaa.git
cd qitaa

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your preferred rates

# Start the API server
npm start          # → http://localhost:3456
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/parts/source` | Source parts across US stores, get landed cost + WhatsApp message |
| `GET` | `/api/parts/search/:partNumber` | Quick search for a single part |
| `POST` | `/api/parts/add-to-cart` | Add parts to RockAuto cart via Puppeteer |
| `GET` | `/api/agents` | List agent status |
| `GET` | `/health` | Health check |

### Example: Source Parts

```bash
curl -X POST http://localhost:3456/api/parts/source \
  -H "Content-Type: application/json" \
  -d '{
    "parts": [
      { "partNumber": "PF61E", "name": "Oil Filter", "brand": "ACDelco", "qty": 1, "weightKg": 0.2 },
      { "partNumber": "41103", "name": "Spark Plug", "brand": "ACDelco", "qty": 5, "weightKg": 0.1 }
    ],
    "car": "2007 Hummer H3 3.7L L5",
    "region": "usa",
    "commission": 0.20
  }'
```

Response includes per-part results from each store, the best price, full landed-cost breakdown (USD + SAR), and a formatted Arabic WhatsApp message.

### Example: Add to Cart (Puppeteer)

```bash
curl -X POST http://localhost:3456/api/parts/add-to-cart \
  -H "Content-Type: application/json" \
  -d '{
    "parts": [
      { "partNumber": "20832044", "name": "Parking Brake Lever", "brand": "GM Genuine", "qty": 1 },
      { "partNumber": "PF61E", "name": "Oil Filter", "brand": "ACDelco", "qty": 1 }
    ],
    "headless": false,
    "preferOEM": true
  }'
```

Set `"headless": false` to open a visible browser for manual review and payment.

## Configuration

All constants are defined in `server/agents/usa-agent.js` and can be overridden via environment variables (see `.env.example`):

| Constant | Default | Description |
|----------|---------|-------------|
| `USD_TO_SAR` | 3.75 | USD to SAR exchange rate |
| `CUSTOMS_DUTY` | 5% | Saudi customs duty on auto parts |
| `VAT` | 15% | Saudi VAT |
| `COMMISSION` | 20% | Default commission markup |
| `SHIPPING_PER_KG` | $18 | Shipping rate per kg (US → Saudi) |
| `PUPPETEER_HEADLESS` | true | Run Puppeteer in headless mode |

## Example Use Case: 2007 Hummer H3

The repo includes a real-world example: sourcing 14 parts for a 2007 Hummer H3 3.7L L5.

- **Parts list:** `server/agents/hummer-h3-parts.json` (7 RockAuto parts + 7 GM parts)
- **Run the sourcing test:**
  ```bash
  npm run test:usa
  ```
- **Open RockAuto with all parts in a visible browser:**
  ```bash
  npm run open:rockauto
  ```
- **Run the full cart test (all 14 parts):**
  ```bash
  npm run test:complete-cart
  ```

## Architecture

```
qitaa/
├── server/
│   ├── index.js                 # Express server (port 3456)
│   ├── routes/
│   │   └── api.js               # REST API endpoints
│   └── agents/
│       ├── base-agent.js        # Base agent class
│       ├── usa-agent.js         # USA sourcing agent (RockAuto, eBay, GMPartsGiant)
│       ├── parts-agent.js       # Parts orchestrator (routes to regional agents)
│       ├── index.js             # Agent exports
│       ├── hummer-h3-parts.json # Example: 14 parts for 2007 Hummer H3
│       ├── open-rockauto.js     # Script: open RockAuto with visible browser
│       ├── open-gmpartsgiant.js # Script: open GMPartsGiant with visible browser
│       ├── test-usa-agent.js    # Test: sourcing + landed cost + WhatsApp
│       ├── test-add-to-cart.js  # Test: add 2 parts to cart
│       ├── test-full-cart.js    # Test: add 7 RockAuto parts to cart
│       └── test-complete-cart.js# Test: add all 14 parts to cart
├── package.json
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

## Tech Stack

- **Node.js** (≥18)
- **Express** 5 — REST API server
- **Puppeteer** — browser automation for RockAuto cart checkout
- **Axios** + **Cheerio** — HTTP fetching and HTML parsing for price extraction

## Key Design Decisions

- **Brand matching via `tbody` DOM traversal** — RockAuto lists parts in nested tables. The Add to Cart button and brand name are in different rows within the same `<tbody>`. The agent walks up to `link.closest('tbody')` to match both part number and brand, then picks the cheapest brand-matched listing.
- **No `waitForTimeout`** — uses a custom `sleep()` helper for Puppeteer delays (more reliable across Puppeteer versions).
- **Headless mode configurable** — `headless: false` opens a visible browser so the operator can review the cart and pay manually.
- **Parallel store search** — all three stores (RockAuto, eBay, GMPartsGiant) are searched in parallel per part, and all parts are searched in parallel.

## Regional Agents

Currently only the **USA agent** is implemented. The parts orchestrator (`parts-agent.js`) has stubs for:
- 🇬🇧 UK/Europe agent — TODO
- 🇨🇳 Asia/China agent — TODO

Contributions for additional regions are welcome!

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

MIT — see [LICENSE](LICENSE).

## Disclaimer

QITAA is an automation tool for sourcing auto parts. It is not affiliated with RockAuto, eBay, or GMPartsGiant. Use responsibly and respect each store's terms of service.
