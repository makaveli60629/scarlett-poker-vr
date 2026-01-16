// /js/scarlett1/index.js
// SCARLETT1 ENTRY (FULL) — Start + Diagnostics + Options
// Exported start() is called by /js/index.js router.
// Supports URL params:
// - safe=1    -> call orchestrator with "safe" options (if you use them)
// - nohud=1   -> skip Android dev HUD if your orchestrator honors it
// - trace=1   -> extra logs
// - v=...     -> cacheproof

const BUILD = "SCARLETT1_INDEX_FULL_DIAG_v1";

const log = (...a) => console.log("[scarlett1]", ...a);
const err = (...a) => console.error("[scarlett1]", ...a);

function qs() {
  const p = new URLSearchParams(location.search);
  const o = {};
  for (const [k, v] of p.entries()) o[k] = v === "" ? "1" : v;
  return o;
}

let overlay, body;
let lines = [];
function ensureOverlay() {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.setAttribute("data-hud", "1");
  overlay.style.position = "fixed";
  overlay.style.left = "10px";
  overlay.style.top = "10px";
  overlay.style.right = "10px";
  overlay.style.maxWidth = "920px";
  overlay.style.zIndex = "999998";
  overlay.style.padding = "12px";
  overlay.style.borderRadius = "16px";
  overlay.style.border = "1px solid rgba(255,255,255,0.18)";
  overlay.style.background = "rgba(0,0,0,0.45)";
  overlay.style.color = "white";
  overlay.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";
  overlay.style.fontSize = "12px";
  overlay.style.lineHeight = "1.25";
  overlay.style.whiteSpace = "pre-wrap";
  overlay.style.backdropFilter = "blur(8px)";
  overlay.style.webkitBackdropFilter = "blur(8px)";

  const header = document.createElement("div");
  header.style.fontWeight = "900";
  header.style.letterSpacing = "0.08em";
  header.textContent = `SCARLETT1 ENTRY • ${BUILD}`;
  overlay.appendChild(header);

  const btns = document.createElement("div");
  btns.style.display = "flex";
  btns.style.gap = "6px";
  btns.style.flexWrap = "wrap";
  btns.style.marginTop = "8px";
  overlay.appendChild(btns);

  const mkBtn = (label, fn) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.padding = "8px 10px";
    b.style.borderRadius = "12px";
    b.style.border = "1px solid rgba(255,255,255,0.18)";
    b.style.background = "rgba(20,20,30,0.75)";
    b.style.color = "white";
    b.style.cursor = "pointer";
    b.onclick = fn;
    return b;
  };

  btns.appendChild(mkBtn("COPY", async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      write("[copy] COPIED ✅");
    } catch (e) {
      write("[copy] FAILED ❌ " + String(e));
    }
  }));

  btns.appendChild(mkBtn("SAFE=1", () => {
    const u = new URL(location.href);
    u.searchParams.set("safe", "1");
    u.searchParams.set("v", String(Date.now()));
    location.href = u.toString();
  }));

  btns.appendChild(mkBtn("SAFE=0", () => {
    const u = new URL(location.href);
    u.searchParams.delete("safe");
    u.searchParams.set("v", String(Date.now()));
    location.href = u.toString();
  }));

  btns.appendChild(mkBtn("RELOAD", () => location.reload(true)));

  body = document.createElement("div");
  body.style.marginTop = "10px";
  overlay.appendChild(body);

  document.body.appendChild(overlay);
}

function clip(s, n = 1400) {
  s = String(s || "");
  if (s.length <= n) return s;
  return s.slice(0, n) + "…";
}

function write(line) {
  ensureOverlay();
  lines.push(String(line));
  if (lines.length > 200) lines.shift();
  body.textContent = lines.join("\n");
}

function hookErrors() {
  if (window.__scarlettEntryHooked) return;
  window.__scarlettEntryHooked = true;

  window.addEventListener("error", (ev) => {
    write(`[window.error] ${ev?.message || "error"}`);
    write(clip(`${ev?.filename || ""}:${ev?.lineno || ""}:${ev?.colno || ""}`));
    if (ev?.error?.stack) write(clip(ev.error.stack));
  });

  window.addEventListener("unhandledrejection", (ev) => {
    const r = ev?.reason;
    write(`[unhandledrejection] ${String(r?.message || r || "unknown")}`);
    if (r?.stack) write(clip(r.stack));
  });
}

// Exported start() for router
export async function start(meta = {}) {
  ensureOverlay();
  hookErrors();

  const q = qs();
  const trace = q.trace === "1";
  const safe = q.safe === "1";

  write(`[scarlett1] start()… build=${BUILD}`);
  write(`[meta] routerBuild=${meta.routerBuild || "?"}`);
  write(`[env] href=${location.href}`);
  write(`[env] ua=${navigator.userAgent}`);
  write(`[env] secureContext=${String(window.isSecureContext)}`);
  write(`[env] navigator.xr=${String(!!navigator.xr)}`);
  write(`[opts] safe=${String(safe)} trace=${String(trace)} nohud=${String(q.nohud === "1")}`);

  // IMPORTANT: this is where your world must load
  // If this import fails, it means /js/scarlett1/world.js path/case or an import inside it is broken.
  write(`[scarlett1] importing ./world.js …`);
  try {
    const world = await import("./world.js");
    write(`[scarlett1] world.js import OK ✅`);

    if (typeof world.createWorldOrchestrator !== "function") {
      throw new Error("world.js missing export createWorldOrchestrator()");
    }

    // Start the world
    write(`[scarlett1] creating orchestrator…`);
    const api = world.createWorldOrchestrator({
      // You can read safe/nohud inside world.js if you want,
      // but even if you don’t, it won’t break anything.
      safeMode: safe,
      noHud: q.nohud === "1",
    });

    write(`[scarlett1] orchestrator created ✅`);
    if (trace) log("world api:", api);

    return api;
  } catch (e) {
    err("world start failed", e);
    write(`[ERR] world start failed ❌`);
    write(`[ERR] ${String(e?.message || e)}`);
    if (e?.stack) write(clip(e.stack));
    write(`\nHINT: If router fetch was 200 but this fails, a nested import inside world.js is broken.`);
    throw e;
  }
}

// Optional auto-start when loaded directly (not via router)
if (import.meta && import.meta.url) {
  // Do nothing unless explicitly asked. Router calls start().
  log("index loaded ✅ (waiting for router start())");
}
