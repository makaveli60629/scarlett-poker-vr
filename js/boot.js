// /js/boot.js — Scarlett Boot (FULL RESTORE, GREEN DIAG + HIDE ALL)
// BUILD: BOOT_FULL_RESTORE_GREEN_v2

const BUILD = "BOOT_FULL_RESTORE_GREEN_v2";
const NOW = () => new Date().toISOString().slice(11, 19);

function getBasePath() {
  const parts = location.pathname.split("/").filter(Boolean);
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
    background:rgba(0,10,0,0.70);
    color:#56ff7a;
    border:1px solid rgba(86,255,122,0.35);
    border-radius:12px;
    padding:10px;
    backdrop-filter: blur(6px);
    font: 12px/1.3 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace;
    user-select:text;
  `;

  const row = document.createElement("div");
  row.style.cssText = `display:flex; gap:8px; justify-content:space-between; align-items:center; margin-bottom:6px;`;
  row.innerHTML = `
    <div style="font-weight:800;">SCARLETT DIAG</div>
    <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
      <button id="diagHide" style="cursor:pointer;border-radius:10px;border:1px solid rgba(86,255,122,0.45);background:rgba(0,40,0,0.45);color:#a8ffbb;padding:4px 10px;">hide</button>
      <button id="diagAll"  style="cursor:pointer;border-radius:10px;border:1px solid rgba(86,255,122,0.45);background:rgba(0,40,0,0.45);color:#a8ffbb;padding:4px 10px;">hide all</button>
      <button id="diagCopy" style="cursor:pointer;border-radius:10px;border:1px solid rgba(86,255,122,0.45);background:rgba(0,40,0,0.45);color:#a8ffbb;padding:4px 10px;">copy</button>
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

  function hideAll() {
    globalThis.SCARLETT_DIAG?.hide?.();
    document.getElementById("androidHud")?.style && (document.getElementById("androidHud").style.display = "none");
    document.getElementById("scarlettModsPanel")?.style && (document.getElementById("scarlettModsPanel").style.display = "none");
    document.getElementById("scarlettRestoreChip")?.remove?.();
    // give user a tiny restore chip
    let chip = document.getElementById("scarlettRestoreChip");
    if (!chip) {
      chip = document.createElement("button");
      chip.id = "scarlettRestoreChip";
      chip.textContent = "SHOW UI";
      chip.style.cssText = `
        position:fixed; right:10px; top:10px; z-index:99999;
        cursor:pointer; border-radius:999px;
        border:1px solid rgba(86,255,122,0.45);
        background:rgba(0,20,0,0.55);
        color:#b6ffca;
        padding:8px 12px;
        font: 12px/1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace;
      `;
      chip.onclick = () => {
        globalThis.SCARLETT_DIAG?.show?.();
        const hud = document.getElementById("androidHud");
        if (hud) hud.style.display = "flex";
        chip.remove();
      };
      document.body.appendChild(chip);
    }
  }

  document.getElementById("diagHide").onclick = () => globalThis.SCARLETT_DIAG.toggle();
  document.getElementById("diagAll").onclick = () => hideAll();
  document.getElementById("diagCopy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      push(`[${NOW()}] [diag] copied ✅`);
    } catch (e) {
      push(`[${NOW()}] [diag] copy failed ❌ ${String(e?.message || e)}`);
    }
  };

  // keyboard fallback: ` toggles diag, \ toggles hide all (desktop)
  window.addEventListener("keydown", (e) => {
    if (e.key === "`") globalThis.SCARLETT_DIAG?.toggle?.();
    if (e.key === "\\") hideAll();
  });

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
