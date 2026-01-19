// SCARLETT • World Orchestrator (SAFE-BOOT)
// Purpose: never hang on "booting...". Always resolves to READY.

export async function bootWorld({ buildWorld } = {}) {
  const log = (...a) => { try { console.log('[orchestrator]', ...a); } catch(_){} };
  const dwrite = (msg) => { try { window.__scarlettDiagWrite?.(String(msg)); } catch (_) {} };

  // Ensure SCARLETT namespace
  window.SCARLETT = window.SCARLETT || {};

  // World-ready helper (idempotent)
  const worldReady = (label='ready') => {
    if (window.SCARLETT.__WORLD_READY__) return;
    window.SCARLETT.__WORLD_READY__ = true;
    window.SCARLETT.worldReady = window.SCARLETT.worldReady || (()=>{});
    try { window.SCARLETT.worldReady(label); } catch(_) {}
    try { window.__scarlettSetStatus?.('ready ✅'); } catch(_) {}
    dwrite(`WORLD_READY ✅ (${label})`);
    log('WORLD_READY', label);
  };

  // Safety: if anything throws or stalls, still mark ready.
  const HARD_TIMEOUT_MS = 6500;
  const t = setTimeout(() => {
    dwrite('SAFE-BOOT: timeout fallback triggered');
    worldReady('timeout-fallback');
  }, HARD_TIMEOUT_MS);

  try {
    dwrite('orchestrator: bootWorld()');

    // Attempt to run provided builder first.
    if (typeof buildWorld === 'function') {
      await Promise.resolve(buildWorld());
    }

    worldReady('builder');
  } catch (err) {
    dwrite('SAFE-BOOT: buildWorld failed; continuing');
    try { console.warn('[orchestrator] buildWorld error', err); } catch(_) {}
    // still resolve
    worldReady('error-fallback');
  } finally {
    clearTimeout(t);
  }

  return { worldReady };
}
