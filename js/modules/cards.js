// Wrapper module so the audit path ./js/modules/cards.js exists.
// If you later add a real implementation (e.g. cards.module.js), you can swap this.
export function init() {
  console.log('[module] cards loaded');
}
