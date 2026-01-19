// SCARLETT • World (SAFE-BOOT ENTRY)
// This file guarantees the world mounts and calls WORLD_READY.

import { bootWorld } from './core/world_orchestrator.js';

// Optional modules (keep try/catch so a missing file never breaks boot)
async function safeImport(path) {
  try { return await import(path); } catch (e) {
    try { console.warn('[world] missing module', path, e); } catch(_) {}
    return null;
  }
}

export async function buildWorld() {
  // If your legacy world factory exists, use it.
  if (typeof window.SCARLETT_WORLD_FACTORY === 'function') {
    return await window.SCARLETT_WORLD_FACTORY();
  }

  // Minimal three.js world glue expected by the demo
  const THREE = window.THREE;
  const scene = window.__THREE_SCENE__;
  if (!THREE || !scene) {
    // If renderer/scene are created elsewhere, don't crash.
    return;
  }

  const state = window.SCARLETT_STATE = window.SCARLETT_STATE || {};
  state.scene = scene;

  // Lobby
  const lobby = await safeImport('./modules/world_lobby.js');
  lobby?.buildLobby?.(state);

  // Table + game loop
  const table = await safeImport('./modules/table_poker.js');
  table?.spawnPokerTable?.(state);

  // Bots
  const bots = await safeImport('./modules/avatars_bots.js');
  bots?.spawnDemoBots?.(state);

  // Jumbotron
  const jumbo = await safeImport('./modules/jumbotron.js');
  jumbo?.spawnJumbotron?.(state);
}

// Auto-boot when engine is ready
(async () => {
  const dwrite = (msg) => { try { window.__scarlettDiagWrite?.(String(msg)); } catch (_) {} };
  dwrite('world.js: boot');

  // Wait briefly for engine (renderer/scene) to exist
  const waitFor = async (fn, ms=2500) => {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      if (fn()) return true;
      await new Promise(r => setTimeout(r, 50));
    }
    return false;
  };

  await waitFor(() => window.__THREE_SCENE__ || window.SCARLETT_WORLD_FACTORY, 2500);

  await bootWorld({ buildWorld });
})();
