/**
 * API Routes for QITAA Parts Sourcing
 */
const express = require('express');
const router = express.Router();
const agents = require('../agents');

// ── Parts Sourcing (USA Agent) ────────────────────────────────

/**
 * POST /api/parts/source
 * Body: {
 *   parts: [{ partNumber, name, qty, weightKg }],
 *   car: "2007 Hummer H3 3.7L L5",
 *   region: "usa",        // usa | uk | asia | all
 *   commission: 0.20       // optional, default 20%
 * }
 */
router.post('/parts/source', async (req, res) => {
  try {
    const { parts, car, region, commission } = req.body;

    if (!parts || !Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({
        error: 'parts array required. Each: { partNumber, name?, qty?, weightKg? }',
      });
    }

    const result = await agents.parts.execute(
      { parts, car, region, commission },
      { car, region, commission }
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/parts/search/:partNumber
 * Quick search for a single part across US stores.
 */
router.get('/parts/search/:partNumber', async (req, res) => {
  try {
    const result = await agents.parts.searchPart(req.params.partNumber, req.query.region || 'usa');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/parts/add-to-cart
 * Add parts to RockAuto cart using Puppeteer browser automation.
 * Body: {
 *   parts: [{ partNumber, name, qty }],
 *   headless: true,    // false = open visible browser for review & payment
 *   preferOEM: true     // prefer OEM/branded parts over cheapest
 * }
 */
router.post('/parts/add-to-cart', async (req, res) => {
  try {
    const { parts, headless, preferOEM } = req.body;

    if (!parts || !Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({
        error: 'parts array required. Each: { partNumber, name?, qty? }',
      });
    }

    const result = await agents.usa.addToCart(parts, {
      headless: headless !== false,
      preferOEM: preferOEM !== false,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/agents
 * List all agents and their status.
 */
router.get('/agents', (req, res) => {
  const status = {};
  for (const [key, agent] of Object.entries(agents)) {
    status[key] = {
      id: agent.id,
      name: agent.name,
      icon: agent.icon,
      description: agent.description,
      status: agent.status,
    };
  }
  res.json(status);
});

module.exports = router;
