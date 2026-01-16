// /js/scarlett1/index.js
// SCARLETT1 ENTRY (FULL) — Start + Diagnostics + Options + ABS WORLD PREFLIGHT + HUD MASTER SWITCH
const BUILD = "SCARLETT1_INDEX_FULL_DIAG_v5_HUDMASTER";

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

let overlay;
function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement("pre");
  overlay.id = "scarlettDiagOverlay";
  overlay.style.cssText =
    "position:fixed;left:8px;top:8px;z-index:99999;max-width:95vw;max-height:55vh;overflow:auto;" +
    "background:rgba(0,0,0,.75);color:#8ff;font:12px/1.25 monospace;padding:10px;border:1px solid rgba(0,255,255,.25);" +
    "border-radius:10px;white-space:pre-wrap;";
  overlay.textContent = "=== SCARLETT LOADER ===\n";
  document.body.appendChild(overlay);
  return overlay;
}
function write(s) {
  ensureOverlay();
  overlay.textContent += s + "\n";
}

function setHudVisible(visible) {
  // 1) our loader overlay
  const o = document.getElementById("scarlettDiagOverlay");
  if (o) o.style.display = visible ? "block" : "none";

  // 2) Android dev HUD + module panel (anything we tagged)
  document.querySelectorAll("[data-scarlett-hud='1']").forEach((el) => {
    el.style.display = visible ? "" : "none";
  });

  // 3) legacy toggles (if any old HUDs exist)
  document.querySelectorAll(".scarlett-hud, .hud, #hud, #HUD, #debugHud").forEach((el) => {
    el.style.display = visible ? "" : "none";
  });

  // save state
  try { localStorage.setItem("SCARLETT_HUD_VISIBLE", visible ? "1" : "0"); } catch {}
  window.__scarlettHudVisible = !!visible;
}

function getHudVisibleDefault(p) {
  // URL wins
  if (p.nohud === "1") return false;
  if (p.hud === "0") return false;
  if (p.hud === "1") return true;

  // localstorage fallback
  try {
    const v = localStorage.getItem("SCARLETT_HUD_VISIBLE");
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {}
  return true;
}

function installHudToggleHotkey() {
  if (window.__scarlettHudHotkeyInstalled) return;
  window.__scarlettHudHotkeyInstalled = true;

  window.addEventListener("keydown", (e) => {
    if (e.key?.toLowerCase() === "h") {
      const cur = window.__scarlettHudVisible !== false;
      setHudVisible(!cur);
      console.log("[scarlett1] HUD toggle ->", !cur);
    }
  });
}

async function preflightAbsolute(absUrl) {
  try {
    write(`[preflight] GET ${absUrl}`);
    const res = await fetch(absUrl, { cache: "no-store" });
    write(`[preflight] status=${res.status} ok=${res.ok}`);
    write(`[preflight] ct=${res.headers.get("content-type") || "?"}`);
    const txt = await res.text();
    write(`[preflight] bytes=${txt.length}`);
    write(`[preflight] head:\n${clip(txt.slice(0, 300), 300)}`);
    return { ok: res.ok, status: res.status, text: txt };
  } catch (e) {
    write(`[preflight] FAILED ❌ ${String(e)}`);
    return { ok: false, status: 0, text: "" };
  }
}

export async function start(meta = {}) {
  const p = qs();
  const safeMode = p.safe === "1";
  const noHud = p.nohud === "1";
  const trace = p.trace === "1";
  const v = p.v || String(Date.now());

  log(`start()… build=${BUILD}`);
  log("[meta]", meta);
  log("[opts]", { safeMode, noHud, trace, v });

  // HUD initial state
  installHudToggleHotkey();
  const hudVisible = getHudVisibleDefault(p);
  setHudVisible(hudVisible);

  // Absolute preflight for world.js
  const worldAbs = `${location.origin}/scarlett-poker-vr/js/scarlett1/world.js?v=${encodeURIComponent(v)}`;
  if (hudVisible) {
    write("\n[scarlett1] preflight world.js (ABS) …");
  }
  const pf = await preflightAbsolute(worldAbs);
  if (!pf.ok) throw new Error("world.js preflight failed");

  if (hudVisible) write(`\n[scarlett1] importing ./world.js?v=${v} …`);
  const m = await import(`./world.js?v=${encodeURIComponent(v)}`);

  const make = m?.createWorldOrchestrator;
  if (typeof make !== "function") throw new Error("world.js missing createWorldOrchestrator()");

  if (hudVisible) write("[scarlett1] creating orchestrator…");
  const orch = make({ safeMode, noHud, trace });

  if (hudVisible) write("[scarlett1] orchestrator created ✅");

  window.__scarlett = { orch, meta, opts: { safeMode, noHud, trace, v } };
  return orch;
}
