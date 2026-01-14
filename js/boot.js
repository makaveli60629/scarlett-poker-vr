// /js/boot.js — Scarlett Boot Diagnostics v2 (FULL)
// ✅ Logs base path + UA + secureContext + import status
// ✅ Writes to #logBox
// ✅ Imports /js/index.js with cache-buster
(() => {
  const stamp = Date.now();

  const logEl = () => document.getElementById("logBox");
  const loaderSub = () => document.getElementById("loaderSub");

  function write(line) {
    console.log(line);
    const el = logEl();
    if (el) {
      el.textContent += "\n" + line;
      el.scrollTop = el.scrollHeight;
    }
  }

  function setSub(t) {
    const el = loaderSub();
    if (el) el.textContent = t;
  }

  const path = location.pathname;
  const base = path.includes("/scarlett-poker-vr/") ? "/scarlett-poker-vr/" :
               (path.endsWith("/") ? path : path.replace(/[^/]+$/, ""));

  write("[BOOT LOG]");
  write(`href=${location.href}`);
  write(`secureContext=${window.isSecureContext}`);
  write(`ua=${navigator.userAgent}`);
  write(`base=${base}`);

  setSub("Importing index.js…");

  const entry = new URL(`${base}js/index.js?v=${stamp}`, location.origin).toString();
  write(`importing ${entry}`);

  import(entry)
    .then(() => {
      write("index.js imported ✅");
      setSub("Boot OK ✅");
      // index.js/world.js will hide loader when ready
    })
    .catch((e) => {
      write(`ERR: index.js import FAILED ❌ ${e?.message || e}`);
      setSub("Import failed ❌ (see BOOT log)");
    });
})();
