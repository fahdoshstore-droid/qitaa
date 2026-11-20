/**
 * QITAA Agents — exports
 *
 * Only the parts-sourcing agents are included in this open-source release.
 * Regional agents (UK/Europe, Asia/China) are stubs inside parts-agent.js.
 */
module.exports = {
  parts: require('./parts-agent'),
  usa: require('./usa-agent'),
};
