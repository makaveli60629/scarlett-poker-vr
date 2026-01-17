// /js/boot.js — Safe boot loader (never white-screen)
// Loads modules via dynamic import so failures are captured and reported.

import { Diagnostics } from './diagnostics.js';

const BOOT_VERSION = Date.now();
const hudEl = document.getElementById('hud');
Diagnostics.mount(hudEl);

Diagnostics.log('BOOT', `v=${BOOT_VERSION}`);
Diagnostics.kv('href', location.href);
Diagnostics.kv('ua', navigator.userAgent);
Diagnostics.kv('navigator.xr', String(!!navigator.xr));

const sessionInit = {
  optionalFeatures: ['local-floor','bounded-floor','hand-tracking','layers']
};
Diagnostics.kv('xr.sessionInit', JSON.stringify(sessionInit));

async function safeImport(label, path) {
  try {
    Diagnostics.log('Import', `${label}: ${path}`);
    const mod = await import(path + `?v=${BOOT_VERSION}`);
    Diagnostics.ok(label);
    return mod;
  } catch (err) {
    Diagnostics.fail(label, err);
    return null;
  }
}

(async () => {
  // Always show HUD on first load so you can see what is happening.
  Diagnostics.show();

  const main = await safeImport('main', './main.js');
  if (!main || !main.start) {
    Diagnostics.log('BOOT', 'main.start missing — cannot continue');
    return;
  }

  // Start app; main will load the rest using safe plumbing.
  await main.start({
    BOOT_VERSION,
    sessionInit,
    Diagnostics,
  });
})();
