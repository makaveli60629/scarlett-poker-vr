// /js/boot.js — Quest Fix Boot v2 (FULL)
// ✅ On-screen BOOT log (no devtools needed)
// ✅ Robust base path
// ✅ Imports /js/index.js with cache bust
// ✅ If import fails, prints EXACT failing reason on screen

(() => {
  const stamp = Date.now();
  let log = (...a) => console.log("[BOOT]", ...a);
  let warn = (...a) => console.warn("[BOOT]", ...a);
  let err = (...a) => console.error("[BOOT]", ...a);

  // On-screen overlay
  const overlay = document.createElement("pre");
  overlay.style.position = "fixed";
  overlay.style.left = "0";
  overlay.style.top = "0";
  overlay.style.width = "100%";
  overlay.style.maxHeight = "60%";
  overlay.style.overflow = "auto";
  overlay.style.background = "rgba(0,0,0,0.88)";
  overlay.style.color = "#00ff66";
  overlay.style.fontSize = "12px";
  overlay.style.zIndex = "99999";
  overlay.style.padding = "8px";
  overlay.style.whiteSpace = "pre-wrap";
  overlay.style.pointerEvents = "none";
  overlay.textContent = "[BOOT LOG]\n";

  function screenLine(...a) {
    try {
      overlay.textContent += a.join(" ") + "\n";
      overlay.scrollTop = overlay.scrollHeight;
    } catch {}
  }

  const _log = log, _warn = warn, _err = err;
  log = (...a) => { _log(...a); screenLine(...a); };
  warn = (...a) => { _warn(...a); screenLine("WARN:", ...a); };
  err = (...a) => { _err(...a); screenLine("ERR:", ...a); };

  const ensureBody = () =>
    document.body ? Promise.resolve() : new Promise(r => window.addEventListener("DOMContentLoaded", r, { once: true }));

  // GitHub Pages base detection
  const path = location.pathname;
  const base = (path.includes("/scarlett-poker-vr/"))
    ? "/scarlett-poker-vr/"
    : (path.endsWith("/") ? path : path.replace(/[^/]+$/, ""));

  function setLoaderHint(t) {
    const el = document.getElementById("loaderHint");
    if (el) el.textContent = t;
  }

  async function fetchMeta(url) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const ct = res.headers.get("content-type") || "";
      const txt = await res.text();
      return { ok: res.ok, status: res.status, ct, preview: txt.slice(0, 240).replace(/\s+/g, " ").trim() };
    } catch (e) {
      return { ok: false, status: 0, ct: "", preview: String(e) };
    }
  }

  async function start() {
    await ensureBody();
    document.body.appendChild(overlay);

    log(`href=${location.href}`);
    log(`secureContext=${window.isSecureContext}`);
    log(`ua=${navigator.userAgent}`);
    log(`base=${base}`);

    // Always import index.js from repo base
    const entry = new URL(`${base}js/index.js?v=${stamp}`, location.origin).toString();
    log(`importing ${entry}`);

    try {
      await import(entry);
      log("index.js imported ✅");
      setLoaderHint("Boot OK ✅");
    } catch (e) {
      err("index.js import FAILED ❌", e?.message || e);
      setLoaderHint("Import failed ❌ (see BOOT log)");

      // Fetch info to reveal 404/HTML/MIME issues
      const meta = await fetchMeta(entry);
      err(`index.js fetch: ok=${meta.ok} status=${meta.status} ct=${meta.ct}`);
      if (meta.preview) err(`index.js preview: ${meta.preview}`);

      // Make loader stay visible if failed
      const loader = document.getElementById("loader");
      if (loader) loader.style.display = "flex";
      return;
    }
  }

  start();
})();
