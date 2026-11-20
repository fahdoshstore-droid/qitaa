class BaseAgent {
  constructor(id, name, icon, description) {
    this.id = id;
    this.name = name;
    this.icon = icon;
    this.description = description;
    this.status = 'idle';
  }

  async execute(prompt, options = {}) {
    throw new Error('Execute method must be implemented');
  }

  setStatus(status) {
    this.status = status;
  }
}

module.exports = BaseAgent;
