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

// ── Stats (for Theeb Capital dashboard) ─────────────────────────
/**
 * GET /api/stats
 * Returns aggregate QITAA stats (no customer data, just numbers).
 * Used by Theeb Capital portfolio dashboard — read-only, no auth.
 */
router.get('/stats', async (req, res) => {
  try {
    const supabaseUrl = process.env.QITAA_SUPABASE_URL || 'https://ujjmhqpyehymaavkawiv.supabase.co';
    const supabaseKey = process.env.QITAA_SUPABASE_ANON_KEY || process.env.QITAA_SUPABASE_KEY;
    if (!supabaseKey) {
      return res.json({
        total_orders: 0,
        total_usd: 0,
        total_sar: 0,
        by_status: {},
        note: 'Supabase key not configured',
      });
    }

    const axios = require('axios');
    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    };

    // Fetch all orders (just status + amounts, no customer data)
    const ordersResp = await axios.get(
      `${supabaseUrl}/rest/v1/qitaa_orders?select=status,total_usd,total_sar`,
      { headers, timeout: 10000 }
    );
    const orders = ordersResp.data || [];

    const totalUsd = orders.reduce((sum, o) => sum + (parseFloat(o.total_usd) || 0), 0);
    const totalSar = orders.reduce((sum, o) => sum + (parseFloat(o.total_sar) || 0), 0);
    const byStatus = {};
    for (const o of orders) {
      const s = o.status || 'unknown';
      byStatus[s] = (byStatus[s] || 0) + 1;
    }

    // Count customers
    let customerCount = 0;
    try {
      const custResp = await axios.get(
        `${supabaseUrl}/rest/v1/qitaa_customers?select=id`,
        { headers, timeout: 10000 }
      );
      customerCount = (custResp.data || []).length;
    } catch (_) {}

    res.json({
      total_orders: orders.length,
      total_usd: Math.round(totalUsd * 100) / 100,
      total_sar: Math.round(totalSar * 100) / 100,
      total_customers: customerCount,
      by_status: byStatus,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
