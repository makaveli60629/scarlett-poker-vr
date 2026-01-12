// /js/boot.js — Scarlett BOOT MASTER (ImportMap + Diagnostics + Safe Import)
// ✅ Fixes: "Failed to resolve module specifier 'three'"
// by installing an importmap BEFORE importing /js/index.js

(() => {
  const stamp = Date.now();
  const log = (msg) => {
    try {
      const t = new Date().toLocaleTimeString();
      console.log(`[${t}] ${msg}`);
    } catch {
      console.log(msg);
    }
  };

  log("[BOOT] boot.js loaded ✅");
  log(`[BOOT] href=${location.href}`);
  log(`[BOOT] secureContext=${window.isSecureContext}`);
  log(`[BOOT] ua=${navigator.userAgent}`);
  log(`[BOOT] navigator.xr=${!!navigator.xr}`);

  // 1) Install import map (MUST happen before module import)
  // If the page already has one, we keep it.
  const hasImportMap = !!document.querySelector('script[type="importmap"]');

  // es-module-shims enables importmap on more browsers and guarantees ordering
  const hasShims = [...document.scripts].some(s => (s.src || "").includes("es-module-shims"));

  function addShims() {
    return new Promise((resolve) => {
      if (hasShims) return resolve();
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://unpkg.com/es-module-shims@1.10.0/dist/es-module-shims.js";
      s.onload = () => resolve();
      s.onerror = () => resolve(); // still try
      document.head.appendChild(s);
    });
  }

  function addImportMap() {
    if (hasImportMap) return;
    const im = document.createElement("script");
    im.type = "importmap";
    im.textContent = JSON.stringify({
      imports: {
        "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
        "three/examples/jsm/": "https://unpkg.com/three@0.160.0/examples/jsm/"
      }
    }, null, 2);
    // Put it as early as possible in <head>
    document.head.prepend(im);
    log("[BOOT] importmap installed ✅ (three + examples)");
  }

  // 2) Ping helper
  async function ping(url) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      log(`[PING] ${url} -> ${r.status}`);
      return r.ok;
    } catch (e) {
      log(`[PING] ${url} -> FAILED`);
      return false;
    }
  }

  // 3) After importmap is installed, import index.js as a module
  async function run() {
    await addShims();
    addImportMap();

    // optional pings (diagnostic only)
    await ping(`${location.origin}${location.pathname.replace(/\/[^/]*$/, "")}/js/index.js`);
    await ping(`${location.origin}${location.pathname.replace(/\/[^/]*$/, "")}/js/world.js`);
    await ping(`${location.origin}${location.pathname.replace(/\/[^/]*$/, "")}/js/VRButton.js`);

    const url = `${location.origin}${location.pathname.replace(/\/[^/]*$/, "")}/js/index.js?v=${stamp}`;
    log(`[BOOT] importing ${url} …`);

    try {
      await import(url);
      log("[BOOT] index.js imported ✅");
    } catch (e) {
      log(`[BOOT] index.js import FAILED ❌ ${e?.message || e}`);
      console.error(e);
    }
  }

  run();
})();
