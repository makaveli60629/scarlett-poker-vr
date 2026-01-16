// /js/index.js — ScarlettVR Router Boot (FULL)
// BUILD: ROUTER_FULL_v1_1_CACHEPROOF

const BUILD = "ROUTER_FULL_v1_1_CACHEPROOF";
const log = (...a) => console.log("[router]", ...a);
const err = (...a) => console.error("[router]", ...a);

(function start() {
  try {
    initMiniHud();

    log("booting… build=", BUILD);
    log("href=", location.href);
    log("secureContext=", window.isSecureContext);
    log("navigator.xr=", !!navigator.xr);

    // 🔥 Hard cache-bust Scarlett1 every load
    const v = "SCARLETT1_CACHEPROOF_" + Date.now();
    const url = `./scarlett1/index.js?v=${encodeURIComponent(v)}`;

    writeHud(`[LOG] router booting…`);
    writeHud(`[LOG] router -> importing: ${url}`);

    import(url)
      .then((mod) => {
        writeHud("[LOG] router import OK ✅");
        if (mod && typeof mod.boot === "function") mod.boot();
        else writeHud("[LOG] module loaded (no boot export) ✅");
      })
      .catch((e) => {
        err("scarlett1 runtime FAILED ❌", e);
        writeHud("[ERR] scarlett1 runtime FAILED ❌");
        writeHud("[ERR] " + (e?.stack || e?.message || e));
      });
  } catch (e) {
    err("router hard crash ❌", e);
    writeHud("[ERR] router hard crash ❌");
    writeHud("[ERR] " + (e?.stack || e?.message || e));
  }
})();

function initMiniHud() {
  const id = "scarlett-mini-hud";
  if (document.getElementById(id)) return;

  const el = document.createElement("div");
  el.id = id;
  el.style.cssText = `
    position: fixed; left: 10px; top: 10px; z-index: 99999;
    background: rgba(0,0,0,.70); color: #fff;
    font: 12px/1.35 monospace;
    padding: 10px 12px; border-radius: 10px;
    max-width: 92vw; white-space: pre-wrap; user-select: text;
    border: 1px solid rgba(0,255,255,.22);
  `;
  el.textContent = `[HTML] booting…`;
  document.body.appendChild(el);

  writeHud(`[LOG] href= ${location.href}`);
  writeHud(`[LOG] secureContext= ${window.isSecureContext}`);
  writeHud(`[LOG] navigator.xr= ${!!navigator.xr}`);
}

function writeHud(line) {
  const el = document.getElementById("scarlett-mini-hud");
  if (!el) return;
  el.textContent += `\n${line}`;
}
