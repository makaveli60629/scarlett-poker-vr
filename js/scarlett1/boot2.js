// /js/scarlett1/boot2.js — Scarlett 1.0 Boot (FULL • DIAGNOSTIC) v2.3
// ✅ Never silent. If world fails, it prints the exact reason on HUD + console.
// ✅ Hard-checks world.js availability (fetch) BEFORE import.
// ✅ Works on GitHub Pages path /scarlett-poker-vr/

const TAG = "[boot2]";
const now = () => new Date().toLocaleTimeString();
const v = Date.now();

function L(...a) { console.log(now(), TAG, ...a); }
function E(...a) { console.error(now(), TAG, ...a); }

// ----------------------
// Minimal HUD
// ----------------------
let hud = null;
let hudBody = null;

function ensureHUD() {
  if (hud) return;
  hud = document.createElement("div");
  hud.id = "scarlett_boot_hud";
  hud.style.cssText = `
    position: fixed;
    left: 10px; top: 10px;
    width: min(92vw, 720px);
    max-height: 72vh;
    overflow: auto;
    z-index: 999999;
    background: rgba(0,0,0,0.72);
    border: 1px solid rgba(120,180,255,0.25);
    border-radius: 14px;
    padding: 10px 12px;
    font: 12px/1.35 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    color: #dcecff;
    white-space: pre-wrap;
  `;
  const head = document.createElement("div");
  head.style.cssText = `font-weight:900; margin-bottom:8px; color:#9fd1ff;`;
  head.textContent = "SCARLETT BOOT2 DIAGNOSTICS";
  hudBody = document.createElement("div");
  hud.appendChild(head);
  hud.appendChild(hudBody);

  const btn = document.createElement("button");
  btn.textContent = "Hide";
  btn.style.cssText = `
    position:absolute; right:10px; top:10px;
    padding:6px 10px; border-radius:10px;
    border:1px solid rgba(120,180,255,0.25);
    background: rgba(40,70,130,0.55);
    color:#eaf3ff; font-weight:800;
  `;
  btn.onclick = () => {
    if (hudBody.style.display !== "none") { hudBody.style.display = "none"; btn.textContent = "Show"; }
    else { hudBody.style.display = "block"; btn.textContent = "Hide"; }
  };
  hud.appendChild(btn);

  document.body.appendChild(hud);
}

function H(msg) {
  ensureHUD();
  const line = document.createElement("div");
  line.textContent = msg;
  hudBody.appendChild(line);
  hud.scrollTop = hud.scrollHeight;
}

// ----------------------
// Base path helpers
// ----------------------
function getBase() {
  // your repo is /scarlett-poker-vr/
  const p = location.pathname || "/";
  if (p.includes("/scarlett-poker-vr/")) return "/scarlett-poker-vr/";
  // fallback
  return "/";
}

function urlJoin(a, b) {
  if (a.endsWith("/") && b.startsWith("/")) return a + b.slice(1);
  if (!a.endsWith("/") && !b.startsWith("/")) return a + "/" + b;
  return a + b;
}

async function fetchCheck(url) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    return { ok: r.ok, status: r.status, ct: r.headers.get("content-type") || "" };
  } catch (e) {
    return { ok: false, status: 0, ct: "", err: e };
  }
}

// ----------------------
// Boot main
// ----------------------
(async function main() {
  ensureHUD();

  const href = location.href;
  const base = getBase();
  const ua = navigator.userAgent || "";

  H(`[${now()}] diag start ✅`);
  H(`[${now()}] href=${href}`);
  H(`[${now()}] path=${location.pathname}`);
  H(`[${now()}] base=${base}`);
  H(`[${now()}] secureContext=${window.isSecureContext}`);
  H(`[${now()}] ua=${ua}`);
  H(`[${now()}] navigator.xr=${!!navigator.xr}`);

  // 1) import THREE from CDN
  const threeURL = `https://unpkg.com/three@0.158.0/build/three.module.js?v=${v}`;
  H(`[${now()}] import three: ${threeURL}`);
  let THREE = null;
  try {
    THREE = await import(threeURL);
    H(`[${now()}] three import ✅ r${THREE.REVISION}`);
  } catch (e) {
    H(`[${now()}] BOOT ERROR: three import failed`);
    H(String(e?.stack || e));
    E("three import failed", e);
    return;
  }

  // 2) world URL resolution (ALWAYS absolute under repo base)
  const worldURL = urlJoin(base, `js/scarlett1/world.js?v=${v}`);
  H(`[${now()}] world url=${worldURL}`);

  // 3) fetch check world.js exists
  const chk = await fetchCheck(worldURL);
  if (!chk.ok) {
    H(`[${now()}] BOOT ERROR: world.js not found ❌ status=${chk.status}`);
    H(`Check path: /js/scarlett1/world.js (in repo)`);
    return;
  }
  H(`[${now()}] world fetch ✅ status=${chk.status} ct=${chk.ct}`);

  // 4) import world.js
  H(`[${now()}] importing world…`);
  let worldMod = null;
  try {
    worldMod = await import(worldURL);
    H(`[${now()}] world import ✅`);
  } catch (e) {
    H(`[${now()}] BOOT ERROR: world import failed ❌`);
    H(String(e?.stack || e));
    E("world import failed", e);
    return;
  }

  // 5) validate initWorld
  const initWorld = worldMod?.initWorld;
  if (typeof initWorld !== "function") {
    H(`[${now()}] BOOT ERROR: worldMod.initWorld is not a function ❌`);
    H(`Exports found: ${Object.keys(worldMod || {}).join(", ") || "(none)"}`);
    return;
  }

  // 6) run initWorld
  H(`[${now()}] initWorld() start`);
  try {
    await initWorld({
      THREE,
      log: (...a) => {
        const s = a.map(x => (typeof x === "string" ? x : JSON.stringify(x))).join(" ");
        H(`[${now()}] ${s}`);
        console.log(now(), "[world]", ...a);
      }
    });
    H(`[${now()}] initWorld() completed ✅`);
  } catch (e) {
    H(`[${now()}] BOOT ERROR: initWorld threw ❌`);
    H(String(e?.stack || e));
    E("initWorld error", e);
    return;
  }

  H(`[${now()}] boot2 done ✅`);
})();
