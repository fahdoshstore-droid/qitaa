/**
 * ═══════════════════════════════════════════════════════════════
 *  QITAA — Car Parts Sourcing Agent (Open Source)
 *
 *  Express server exposing the parts-sourcing REST API.
 *  Port: process.env.PORT || 3456
 * ═══════════════════════════════════════════════════════════════
 */
const express = require('express');
const cors = require('cors');

const agents = require('./agents');
const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : true, // allow all in dev
}));
app.use(express.json());

// ── Parts Sourcing API ─────────────────────────────────────────
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// ── Agent status ───────────────────────────────────────────────
const agentsStatus = {};
for (const [key, agent] of Object.entries(agents)) {
  agentsStatus[key] = {
    id: key,
    name: agent.name,
    icon: agent.icon,
    description: agent.description,
    status: agent.status,
  };
}

app.get('/api/agents', (req, res) => {
  res.json(agentsStatus);
});

// ── Health check ───────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'qitaa' });
});

// ── Start ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 3456;
app.listen(PORT, () => {
  console.log(`🦎 QITAA Parts Sourcing on port ${PORT}`);
});
