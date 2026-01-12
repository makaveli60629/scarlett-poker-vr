// /js/boot.js — MINIMAL PROOF BOOT
const say = (m) => (window.__BOOTLOG__ ? window.__BOOTLOG__(m) : console.log(m));

say("[BOOT] boot.js loaded ✅");
say(`[BOOT] path=${location.pathname}`);

// Now import your app
const url = `./index.js?v=${Date.now()}`;
say(`[BOOT] importing ${url} …`);

import(url).then(() => {
  say("[BOOT] index.js imported ✅");
}).catch((e) => {
  say(`[BOOT] index.js import FAILED ❌ ${e?.message || e}`);
  console.error(e);
});
