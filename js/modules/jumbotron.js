export function init() {
  console.log('[module] jumbotron loaded');
  // Optional: if a screen placeholder exists, we can tag it for future upgrades.
  const scene = document.querySelector('a-scene');
  if (!scene) return;
  // No-op for now — the real stream player lives in your larger repo.
}
