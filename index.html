// /js/boot.js — Scarlett Boot Diagnostics v3 (FULL)
(() => {
  const stamp = Date.now();
  const logEl = () => document.getElementById("logBox");
  const subEl = () => document.getElementById("loaderSub");
  const hintEl = () => document.getElementById("loaderHint");

  function write(line) {
    console.log(line);
    const el = logEl();
    if (el) {
      el.textContent += "\n" + line;
      el.scrollTop = el.scrollHeight;
    }
  }
  function setSub(t){ const el=subEl(); if(el) el.textContent=t; }
  function setHint(t){ const el=hintEl(); if(el) el.textContent=t; }

  const path = location.pathname;
  const base = path.includes("/scarlett-poker-vr/") ? "/scarlett-poker-vr/" :
               (path.endsWith("/") ? path : path.replace(/[^/]+$/, ""));

  write("[BOOT] start ✅");
  write(`href=${location.href}`);
  write(`secureContext=${window.isSecureContext}`);
  write(`ua=${navigator.userAgent}`);
  write(`base=${base}`);
  write(`navigator.xr=${!!navigator.xr}`);

  setSub("Importing index.js…");

  const entry = new URL(`${base}js/index.js?v=${stamp}`, location.origin).toString();
  write(`[BOOT] importing ${entry}`);

  import(entry).then(() => {
    write("[BOOT] index.js imported ✅");
    setSub("Boot OK ✅");
    setHint("If you still see loader, World will kill it when ready.");
  }).catch((e) => {
    write(`[BOOT] import FAILED ❌ ${e?.message || e}`);
    setSub("Import failed ❌");
    setHint("Fix path or syntax. The log above tells you exactly what.");
  });
})();
