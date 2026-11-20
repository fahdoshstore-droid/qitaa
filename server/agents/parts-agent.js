/**
 * ═══════════════════════════════════════════════════════════════
 *  🦎 PARTS AGENT — QITAA Parts Orchestrator
 *
 *  Routes parts requests to regional agents:
 *  - 🇺🇸 USA Agent (RockAuto, eBay, GMPartsGiant) → REAL
 *  - 🇬🇧 UK/Europe Agent → TODO
 *  - 🇨🇳 Asia/China Agent → TODO
 *
 *  Calculates landed cost + formats WhatsApp message.
 * ═══════════════════════════════════════════════════════════════
 */

const BaseAgent = require('./base-agent');
const USAAgent = require('./usa-agent');

class PartsAgent extends BaseAgent {
  constructor() {
    super('parts', 'Qitaa Parts', '🦎', 'Car parts sourcing orchestrator');
    this.orders = [];
  }

  /**
   * Execute a parts sourcing request.
   *
   * @param {Array|Object} input
   *   Option A: Array of parts [{ partNumber, name, qty, weightKg }]
   *   Option B: { parts: [...], region: 'usa'|'all', car: '2007 Hummer H3', commission: 0.20 }
   * @param {Object} options - { region, car, commission }
   * @returns {Object} - Sourcing results + landed cost + WhatsApp message
   */
  async execute(input, options = {}) {
    this.setStatus('working');

    const parts = Array.isArray(input) ? input : (input.parts || []);
    const region = Array.isArray(input) ? (options.region || 'usa') : (input.region || options.region || 'usa');
    const carInfo = Array.isArray(input) ? (options.car || '') : (input.car || options.car || '');
    const commission = Array.isArray(input) ? options.commission : (input.commission || options.commission);

    if (!parts || parts.length === 0) {
      this.setStatus('idle');
      return { error: 'No parts provided. Send array of { partNumber, name?, qty? }' };
    }

    let result;

    switch (region.toLowerCase()) {
      case 'usa':
      case 'us':
      case 'america':
        result = await USAAgent.execute(
          { parts, car: carInfo, commission },
          { car: carInfo, commission }
        );
        break;

      case 'uk':
      case 'britain':
      case 'europe':
        this.setStatus('idle');
        return {
          error: 'UK/Europe agent not yet built. Use region: "usa" for now.',
          parts,
        };

      case 'asia':
      case 'china':
        this.setStatus('idle');
        return {
          error: 'Asia/China agent not yet built. Use region: "usa" for now.',
          parts,
        };

      case 'all':
      default:
        // For "all": run USA (the only real one), note others as TODO
        result = await USAAgent.execute(
          { parts, car: carInfo, commission },
          { car: carInfo, commission }
        );
        result.regions = {
          usa: '✅ sourced',
          uk: '⏳ not built yet',
          asia: '⏳ not built yet',
        };
        break;
    }

    this.orders.push(result);
    this.setStatus('idle');

    return result;
  }

  /**
   * Quick single-part search across US stores.
   */
  async searchPart(partNum, region = 'usa') {
    if (region === 'usa' || region === 'all') {
      return await USAAgent.searchPart(partNum);
    }
    return { error: `Region "${region}" not yet supported` };
  }
}

module.exports = new PartsAgent();
