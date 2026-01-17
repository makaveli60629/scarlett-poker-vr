// /js/index.js — Scarlett Prime Entry (RESTORE)
// Responsibilities: create global state + load /js/scarlett1/index.js (router)

const BUILD = "INDEX_SPINE_RESTORE_v1";
const NOW = () => new Date().toISOString().slice(11, 19);

export async function boot({ BASE, V }) {
  const push = (s) => globalThis.SCARLETT_DIAG?.push?.(`[${NOW()}] ${s}`);

  // global Scarlett namespace
  const Scarlett = (globalThis.Scarlett = globalThis.Scarlett || {});
  Scarlett.BUILD = Scarlett.BUILD || {};
  Scarlett.BUILD.index = BUILD;
  Scarlett.BASE = BASE;
  Scarlett.V = V;

  push?.(`[index] build=${BUILD}`);
  push?.(`[index] base=${BASE}`);

  // Android HUD (always available; router will also add XR HUD)
  ensureAndroidHud();

  // Load Scarlett1 router (this is your real system)
  const routerUrl = `${BASE}js/scarlett1/index.js?v=${encodeURIComponent(V)}`;
  try {
    push?.(`[index] importing router ${routerUrl}`);
    const router = await import(routerUrl);
    push?.(`[index] router imported ✅`);
    if (typeof router.boot === "function") {
      await router.boot({ Scarlett, BASE, V });
      push?.(`[index] router boot ✅`);
    } else {
      push?.(`[index] router missing boot() ❌`);
    }
  } catch (e) {
    push?.(`[index] router import FAILED ❌ ${String(e?.message || e)}`);
  }
}

function ensureAndroidHud() {
  if (document.getElementById("androidHud")) return;

  const hud = document.createElement("div");
  hud.id = "androidHud";
  hud.style.cssText = `
    position:fixed; left:10px; right:10px; bottom:10px; z-index:99999;
    display:flex; gap:8px; flex-wrap:wrap; align-items:center; justify-content:space-between;
    pointer-events:auto;
    font: 12px/1.2 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace;
  `;

  const mkBtn = (id, label) => {
    const b = document.createElement("button");
    b.id = id;
    b.textContent = label;
    b.style.cssText = `
      cursor:pointer;
      border-radius:12px;
      border:1px solid rgba(255,255,255,0.22);
      background:rgba(0,0,0,0.35);
      color:#eaeaea;
      padding:8px 12px;
      font-size:12px;
    `;
    return b;
  };

  const left = document.createElement("div");
  left.style.cssText = "display:flex; gap:8px; flex-wrap:wrap; align-items:center;";
  const right = document.createElement("div");
  right.style.cssText = "display:flex; gap:8px; flex-wrap:wrap; align-items:center; justify-content:flex-end;";

  const bDiag = mkBtn("btnDiag", "DIAG");
  const bHud  = mkBtn("btnHud", "HUD");
  const bMods = mkBtn("btnMods", "MODULES");
  const bTP   = mkBtn("btnTP", "TELEPORT");

  left.appendChild(bDiag);
  left.appendChild(bHud);
  left.appendChild(bMods);
  right.appendChild(bTP);

  hud.appendChild(left);
  hud.appendChild(right);

  document.body.appendChild(hud);

  bDiag.onclick = () => globalThis.SCARLETT_DIAG?.toggle?.();
  bHud.onclick  = () => globalThis.Scarlett?.UI?.toggleHud?.();
  bMods.onclick = () => globalThis.Scarlett?.UI?.toggleModules?.();
  bTP.onclick   = () => globalThis.Scarlett?.UI?.toggleTeleport?.();
}
