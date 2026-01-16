// /js/index.js — ScarlettVR Router Boot (FULL)
// BUILD: ROUTER_FULL_v1_0
// Purpose: load a module route (scarlett1) with strong diagnostics.

const BUILD = "ROUTER_FULL_v1_0";

const log = (...a) => console.log("[router]", ...a);
const err = (...a) => console.error("[router]", ...a);

(function start() {
  try {
    log("booting… build=", BUILD);
    log("href=", location.href);
    log("secureContext=", window.isSecureContext);
    log("navigator.xr=", !!navigator.xr);

    // Default route (your log shows this exact path)
    const route = "./scarlett1/index.js";
    const v = "SCARLETT1_REAL_V1";
    const url = `${route}?v=${encodeURIComponent(v)}`;

    log("router booting…");
    log("router -> importing:", url);

    import(url)
      .then((mod) => {
        log("router import OK ✅");
        if (mod && typeof mod.boot === "function") {
          mod.boot();
        } else {
          log("module loaded (no boot export) ✅");
        }
      })
      .catch((e) => {
        err("scarlett1 runtime FAILED ❌");
        err(e?.stack || e?.message || e);
        showFatal(e);
      });

    // tiny HUD for black-screen situations
    initMiniHud();
  } catch (e) {
    err("router hard crash ❌", e?.stack || e);
    showFatal(e);
  }
})();

function initMiniHud() {
  // If your index.html already has HUD, this is harmless.
  const id = "scarlett-mini-hud";
  if (document.getElementById(id)) return;

  const el = document.createElement("div");
  el.id = id;
  el.style.cssText = `
    position: fixed; left: 10px; top: 10px; z-index: 99999;
    background: rgba(0,0,0,.65); color: #fff; font: 12px/1.35 monospace;
    padding: 10px 12px; border-radius: 10px; max-width: 92vw;
    white-space: pre-wrap; user-select: text;
  `;
  el.textContent = `[HTML] booting…
[LOG] href= ${location.href}
[LOG] secureContext= ${window.isSecureContext}
[LOG] navigator.xr= ${!!navigator.xr}
[LOG] router booting…`;
  document.body.appendChild(el);
}

function showFatal(e) {
  const el = document.getElementById("scarlett-mini-hud");
  const msg = (e?.stack || e?.message || String(e)).trim();
  if (el) {
    el.textContent += `

[ERR] ${msg}`;
  } else {
    alert(msg);
  }
}
