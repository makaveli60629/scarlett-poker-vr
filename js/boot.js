// /js/boot.js — Scarlett Boot (FULL RESTORE)
// Responsibilities: diagnostics overlay + import /js/index.js safely (no bare specifiers)

const BUILD = "BOOT_FULL_RESTORE_v1";
const NOW = () => new Date().toISOString().slice(11, 19);

function getBasePath() {
  const parts = location.pathname.split("/").filter(Boolean);
  // GitHub pages: /<repo>/
  if (parts.length === 0) return "/";
  return `/${parts[0]}/`;
}
const BASE = getBasePath();
const Q = new URLSearchParams(location.search);
const V = Q.get("v") || String(Date.now());

function ensureDiag() {
  let box = document.getElementById("scarlettDiag");
  if (box) return box;

  box = document.createElement("div");
  box.id = "scarlettDiag";
  box.style.cssText = `
    position:fixed; left:10px; top:10px; z-index:99999;
    max-width:min(560px, calc(100vw - 20px));
    background:rgba(20,0,0,0.75);
    color:#ff5a5a;
    border:1px solid rgba(255,90,90,0.45);
    border-radius:12px;
    padding:10px;
    backdrop-filter: blur(6px);
    font: 12px/1.3 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace;
    user-select:text;
  `;

  const row = document.createElement("div");
  row.style.cssText = `display:flex; gap:8px; justify-content:space-between; align-items:center; margin-bottom:6px;`;
  row.innerHTML = `
    <div style="font-weight:700;">SCARLETT DIAG</div>
    <div style="display:flex; gap:6px;">
      <button id="diagHide" style="cursor:pointer;border-radius:10px;border:1px solid rgba(255,90,90,0.5);background:rgba(80,0,0,0.5);color:#ff8b8b;padding:3px 10px;">hide</button>
      <button id="diagCopy" style="cursor:pointer;border-radius:10px;border:1px solid rgba(255,90,90,0.5);background:rgba(80,0,0,0.5);color:#ff8b8b;padding:3px 10px;">copy</button>
    </div>
  `;
  box.appendChild(row);

  const pre = document.createElement("pre");
  pre.id = "scarlettDiagPre";
  pre.style.cssText = `margin:0; white-space:pre-wrap; word-break:break-word;`;
  box.appendChild(pre);

  document.body.appendChild(box);

  const lines = [];
  const push = (s) => {
    lines.push(s);
    if (lines.length > 90) lines.shift();
    pre.textContent = lines.join("\n");
  };

  globalThis.SCARLETT_DIAG = {
    push,
    lines,
    show() { box.style.display = "block"; },
    hide() { box.style.display = "none"; },
    toggle() { box.style.display = (box.style.display === "none") ? "block" : "none"; }
  };

  document.getElementById("diagHide").onclick = () => globalThis.SCARLETT_DIAG.toggle();
  document.getElementById("diagCopy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      push(`[${NOW()}] [diag] copied ✅`);
    } catch (e) {
      push(`[${NOW()}] [diag] copy failed ❌ ${String(e?.message || e)}`);
    }
  };

  return box;
}

ensureDiag();
SCARLETT_DIAG.push(`[${NOW()}] [HTML] loaded ✅ (waiting for /js/index.js…)`);
SCARLETT_DIAG.push(`[${NOW()}] [BOOT] build=${BUILD}`);
SCARLETT_DIAG.push(`[${NOW()}] [BOOT] href=${location.href}`);
SCARLETT_DIAG.push(`[${NOW()}] [BOOT] base=${BASE}`);
SCARLETT_DIAG.push(`[${NOW()}] [BOOT] secureContext=${String(globalThis.isSecureContext)}`);
SCARLETT_DIAG.push(`[${NOW()}] [BOOT] ua=${navigator.userAgent}`);
SCARLETT_DIAG.push(`[${NOW()}] [BOOT] navigator.xr=${String(!!navigator.xr)}`);

(async () => {
  const entryUrl = `${BASE}js/index.js?v=${encodeURIComponent(V)}`;
  try {
    SCARLETT_DIAG.push(`[${NOW()}] [BOOT] importing ${entryUrl} …`);
    const mod = await import(entryUrl);
    SCARLETT_DIAG.push(`[${NOW()}] [BOOT] index.js imported ✅`);
    if (typeof mod.boot === "function") {
      await mod.boot({ BASE, V });
      SCARLETT_DIAG.push(`[${NOW()}] [BOOT] boot() complete ✅`);
    } else {
      SCARLETT_DIAG.push(`[${NOW()}] [BOOT] index.js missing boot() ❌`);
    }
  } catch (e) {
    SCARLETT_DIAG.push(`[${NOW()}] [BOOT] import FAILED ❌ ${String(e?.message || e)}`);
  }
})();
