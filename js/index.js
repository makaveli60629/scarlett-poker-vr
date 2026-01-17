// /js/router.js — ScarlettVR Router + Diagnostics Spine
// BUILD: ROUTER_FULL_DIAG_v1
const BUILD = "ROUTER_FULL_DIAG_v1";

const log = (...a) => console.log("[router]", ...a);
const warn = (...a) => console.warn("[router]", ...a);
const err = (...a) => console.error("[router]", ...a);

// --- Global Scarlett namespace (stable) ---
const Scarlett = (globalThis.Scarlett = globalThis.Scarlett || {});
Scarlett.build = BUILD;
Scarlett.env = Scarlett.env || {};
Scarlett.modules = Scarlett.modules || {};
Scarlett.flags = Scarlett.flags || {};
Scarlett.flags.showDiag = true;   // default ON (you can toggle in-world)
Scarlett.flags.showHud = true;

// --- Diagnostics overlay (DOM, always available) ---
function createDiagOverlay() {
  const el = document.createElement("div");
  el.id = "scarlett-diag";
  el.style.cssText = `
    position:fixed; left:10px; top:10px; z-index:99999;
    max-width:min(520px, calc(100vw - 20px));
    background:rgba(0,0,0,.55);
    color:#ff4d4d;
    font: 12px/1.35 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    padding:10px 12px; border-radius:10px;
    border:1px solid rgba(255,77,77,.35);
    backdrop-filter: blur(6px);
    user-select:text;
    white-space:pre-wrap;
  `;
  document.body.appendChild(el);

  const state = {
    lines: [],
    max: 28,
    el,
    enabled: true
  };

  function write(line) {
    state.lines.push(line);
    if (state.lines.length > state.max) state.lines.shift();
    state.el.textContent = state.lines.join("\n");
  }

  function setEnabled(v) {
    state.enabled = !!v;
    state.el.style.display = state.enabled ? "block" : "none";
  }

  return { write, setEnabled, el, state };
}

const diag = (Scarlett.diag = Scarlett.diag || createDiagOverlay());
diag.setEnabled(!!Scarlett.flags.showDiag);

// --- Environment snapshot ---
(function snapshotEnv() {
  const href = location.href;
  const ua = navigator.userAgent;
  const secureContext = globalThis.isSecureContext;
  const xr = !!navigator.xr;

  Scarlett.env = { href, ua, secureContext, xr };
  diag.write(`[HTML] booting…`);
  diag.write(`[router] build=${BUILD}`);
  diag.write(`[env] href=${href}`);
  diag.write(`[env] secureContext=${secureContext}`);
  diag.write(`[env] navigator.xr=${xr}`);
  diag.write(`[env] ua=${ua}`);
})();

// --- Helper: safe dynamic import with status tracking ---
async function loadModule(name, path) {
  const t0 = performance.now();
  try {
    diag.write(`[mod] loading ${name}…`);
    const mod = await import(path);
    const ms = Math.round(performance.now() - t0);
    Scarlett.modules[name] = { ok: true, path, ms };
    diag.write(`[mod] ok ✅ ${name} (${ms}ms)`);
    return mod;
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    Scarlett.modules[name] = { ok: false, path, ms, error: String(e?.message || e) };
    diag.write(`[mod] fail ❌ ${name} (${ms}ms)`);
    diag.write(`      ${String(e?.message || e)}`);
    warn(`Module failed: ${name}`, e);
    return null;
  }
}

// --- Optional modules list (won't break if missing) ---
const OPTIONAL_MODULES = [
  // Put your existing modules here (router will try; missing is OK)
  ["hud", "./modules/hud.js"],
  ["teleport", "./modules/teleport.js"],
  ["avatars", "./modules/avatars.js"],
  ["audio", "./modules/audio.js"],
  ["poker", "./modules/poker.js"],
];

// --- Boot chain ---
(async function boot() {
  // Load optional modules (non-blocking sequential so diag stays readable)
  for (const [name, path] of OPTIONAL_MODULES) {
    await loadModule(name, path);
  }

  // Load main index (this is required)
  const main = await loadModule("index", "./index.js");
  if (!main || typeof main.boot !== "function") {
    diag.write(`[fatal] index.js missing boot()`);
    err("index.js did not export boot()");
    return;
  }

  // Start
  try {
    await main.boot({ Scarlett, diag });
    diag.write(`[router] started ✅`);
  } catch (e) {
    diag.write(`[fatal] boot crash: ${String(e?.message || e)}`);
    err("Boot crash:", e);
  }
})();

// Quick keyboard fallback (desktop):
window.addEventListener("keydown", (ev) => {
  if (ev.key === "`") { // toggle diagnostics with backtick
    Scarlett.flags.showDiag = !Scarlett.flags.showDiag;
    diag.setEnabled(Scarlett.flags.showDiag);
  }
});
