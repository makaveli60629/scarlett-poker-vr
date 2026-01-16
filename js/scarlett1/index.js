// /js/scarlett1/index.js
// SCARLETT1 ENTRY (FULL) — Minimal by default (no green diag), HUD toggle, ABS preflight
const BUILD = "SCARLETT1_INDEX_FULL_v6_HIDEGREEN_DEFAULT_ANDROIDREADY";

const log = (...a) => console.log("[scarlett1]", ...a);

function qs() {
  const p = new URLSearchParams(location.search);
  const o = {};
  for (const [k, v] of p.entries()) o[k] = v === "" ? "1" : v;
  return o;
}
function clip(s, n = 300) {
  s = String(s ?? "");
  return s.length > n ? s.slice(0, n) + "…" : s;
}

let overlay = null;
let toggleBtn = null;

function ensureToggleButton() {
  if (toggleBtn) return toggleBtn;

  toggleBtn = document.createElement("button");
  toggleBtn.textContent = "SHOW HUD";
  toggleBtn.style.cssText =
    "position:fixed;left:10px;top:10px;z-index:999999;" +
    "padding:10px 14px;border-radius:14px;" +
    "background:rgba(0,0,0,.65);border:1px solid rgba(0,255,255,.28);" +
    "color:#8ff;font:14px/1 system-ui;";

  // IMPORTANT: never hide this button when HUD hidden
  toggleBtn.dataset.scarlettHud = "1";
  toggleBtn.dataset.scarlettControls = "1";

  toggleBtn.onclick = () => {
    const cur = window.__scarlettHudVisible === true;
    setHudVisible(!cur);
  };

  document.body.appendChild(toggleBtn);
  return toggleBtn;
}

function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement("pre");
  overlay.id = "scarlettDiagOverlay";
  overlay.dataset.scarlettHud = "1";
  overlay.style.cssText =
    "position:fixed;left:10px;top:56px;z-index:999998;max-width:95vw;max-height:55vh;overflow:auto;" +
    "background:rgba(0,0,0,.75);color:#8ff;font:12px/1.25 monospace;padding:10px;" +
    "border:1px solid rgba(0,255,255,.20);border-radius:12px;white-space:pre-wrap;";
  overlay.textContent = "=== SCARLETT HUD ===\n";
  document.body.appendChild(overlay);
  return overlay;
}

function write(s) {
  ensureOverlay();
  overlay.textContent += s + "\n";
}

function setHudVisible(visible) {
  ensureToggleButton();

  window.__scarlettHudVisible = !!visible;
  toggleBtn.textContent = visible ? "HIDE HUD" : "SHOW HUD";

  // overlay
  const o = document.getElementById("scarlettDiagOverlay");
  if (o) o.style.display = visible ? "block" : "none";

  // hide/show all Scarlett HUD except controllers
  document.querySelectorAll("[data-scarlett-hud='1']").forEach((el) => {
    if (el.dataset.scarlettControls === "1") return; // keep controllers + toggle visible
    if (el.id === "scarlettDiagOverlay") return;      // handled above
    el.style.display = visible ? "" : "none";
  });

  try { localStorage.setItem("SCARLETT_HUD_VISIBLE", visible ? "1" : "0"); } catch {}
}

function hudDefault(p) {
  // URL wins
  if (p.nohud === "1" || p.hud === "0") return false;
  if (p.hud === "1") return true;

  // If trace/diag requested, show HUD
  if (p.trace === "1" || p.diag === "1") return true;

  // Otherwise default OFF (this removes your green diag HUD by default)
  return false;
}

async function preflightAbsolute(absUrl, hudOn) {
  try {
    const res = await fetch(absUrl, { cache: "no-store" });

    if (hudOn) {
      write(`[preflight] GET ${absUrl}`);
      write(`[preflight] status=${res.status} ok=${res.ok}`);
      write(`[preflight] ct=${res.headers.get("content-type") || "?"}`);
    }

    const txt = await res.text();

    if (hudOn) {
      write(`[preflight] bytes=${txt.length}`);
      write(`[preflight] head:\n${clip(txt.slice(0, 320), 320)}`);
    }

    return { ok: res.ok, status: res.status, text: txt };
  } catch (e) {
    if (hudOn) write(`[preflight] FAILED ❌ ${String(e)}`);
    return { ok: false, status: 0, text: "" };
  }
}

export async function start(meta = {}) {
  const p = qs();

  const safeMode = p.safe === "1";
  const noHud = p.nohud === "1";
  const trace = p.trace === "1";
  const v = p.v || String(Date.now());

  ensureToggleButton();

  const hudOn = hudDefault(p);
  setHudVisible(hudOn);

  log(`start()… build=${BUILD}`);
  log("[meta]", meta);
  log("[opts]", { safeMode, noHud, trace, v });

  if (hudOn) {
    write(`[scarlett1] build=${BUILD}`);
    write(`[opts] safe=${safeMode} nohud=${noHud} trace=${trace} v=${v}`);
  }

  // Absolute preflight (silent if HUD hidden)
  const worldAbs = `${location.origin}/scarlett-poker-vr/js/scarlett1/world.js?v=${encodeURIComponent(v)}`;
  const pf = await preflightAbsolute(worldAbs, hudOn);
  if (!pf.ok) throw new Error("world.js preflight failed");

  if (hudOn) write(`[scarlett1] importing ./world.js?v=${v} …`);
  const m = await import(`./world.js?v=${encodeURIComponent(v)}`);

  const make = m?.createWorldOrchestrator;
  if (typeof make !== "function") throw new Error("world.js missing createWorldOrchestrator()");

  if (hudOn) write("[scarlett1] creating orchestrator…");
  const orch = make({ safeMode, noHud, trace });

  if (hudOn) write("[scarlett1] orchestrator created ✅");

  window.__scarlett = { orch, meta, opts: { safeMode, noHud, trace, v } };
  return orch;
}
