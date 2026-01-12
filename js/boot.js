// /js/boot.js — Scarlett Boot v2.2 (YES: full boot.js)
// ✅ Always shows bootlog overlay (unless Clean Mode hides it)
// ✅ Detects repo base path (GitHub Pages subfolder safe)
// ✅ Imports /js/index.js with cache-bust
// ✅ Catches and prints import errors clearly

(() => {
  const now = () => new Date().toLocaleTimeString();
  const stamp = Date.now();

  function ensureBootlog() {
    let el = document.getElementById("bootlog");
    if (el) return el;

    el = document.createElement("div");
    el.id = "bootlog";
    el.style.position = "fixed";
    el.style.left = "12px";
    el.style.top = "12px";
    el.style.right = "12px";
    el.style.maxWidth = "720px";
    el.style.zIndex = "999999";
    el.style.background = "rgba(10,12,18,0.72)";
    el.style.color = "#e8ecff";
    el.style.border = "1px solid rgba(127,231,255,0.22)";
    el.style.borderRadius = "16px";
    el.style.padding = "12px 14px";
    el.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    el.style.fontSize = "12px";
    el.style.whiteSpace = "pre-wrap";
    el.style.backdropFilter = "blur(10px)";
    el.style.pointerEvents = "auto";
    document.body.appendChild(el);
    return el;
  }

  const bootlog = ensureBootlog();

  function line(s) {
    bootlog.textContent += s + "\n";
    console.log(s);
  }

  line(`[HTML] loaded ✅ (waiting for /js/boot.js…)\n[${now()}] href=${location.href}`);
  line(`[${now()}] secureContext=${String(isSecureContext)}`);
  line(`[${now()}] ua=${navigator.userAgent}`);
  line(`[${now()}] importing ./js/boot.js?v=${stamp} …`);
  line(`[${now()}] [BOOT] boot.js loaded ✅`);

  // Derive base path for GitHub Pages subfolder deployments
  // Example: https://user.github.io/scarlett-poker-vr/ -> base "/scarlett-poker-vr/"
  const parts = location.pathname.split("/").filter(Boolean);
  const base = parts.length ? `/${parts[0]}/` : "/";
  line(`[${now()}] [BOOT] path=${base}`);

  // Build URL to index.js relative to base
  const indexURL = `${base}js/index.js?v=${stamp}`;

  // Import index.js
  line(`[${now()}] [BOOT] importing ${indexURL} …`);

  import(indexURL)
    .then(() => {
      line(`[${now()}] [BOOT] index.js imported ✅`);
    })
    .catch((err) => {
      line(`[${now()}] [BOOT] index.js import FAILED ❌ ${err?.message || err}`);
      if (err?.stack) line(err.stack);
    });
})();
