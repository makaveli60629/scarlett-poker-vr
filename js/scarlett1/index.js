// /js/scarlett1/index.js
// SCARLETT1 ENTRY (FULL) — Start + Diagnostics + Options + WORLD PREFLIGHT
// Called by /js/index.js router via start().
// URL params:
//  - safe=1   : safe mode (passed to world orchestrator)
//  - nohud=1  : no hud (passed to world orchestrator)
//  - trace=1  : verbose console logs
//  - v=...    : cacheproof

const BUILD = "SCARLETT1_INDEX_FULL_DIAG_v2_WORLD_PREFLIGHT";

const log = (...a) => console.log("[scarlett1]", ...a);
const err = (...a) => console.error("[scarlett1]", ...a);

function qs() {
  const p = new URLSearchParams(location.search);
  const o = {};
  for (const [k, v] of p.entries()) o[k] = v === "" ? "1" : v;
  return o;
}

function clip(s, n = 1400) {
  s = String(s || "");
  if (s.length <= n) return s;
  return s.slice(0, n) + "…";
}

let overlay, body, btns;
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
  overlay.style.fontFamily =
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";
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

  btns = document.createElement("div");
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

  btns.appendChild(
    mkBtn("COPY", async () => {
      try {
        await navigator.clipboard.writeText(lines.join("\n"));
        write("[copy] COPIED ✅");
      } catch (e) {
        write("[copy] FAILED ❌ " + String(e));
      }
    })
  );

  btns.appendChild(
    mkBtn("RELOAD", () => {
      const u = new URL(location.href);
      u.searchParams.set("v", String(Date.now()));
      location.href = u.toString();
    })
  );

  btns.appendChild(
    mkBtn("SAFE=1", () => {
      const u = new URL(location.href);
      u.searchParams.set("safe", "1");
      u.searchParams.set("v", String(Date.now()));
      location.href = u.toString();
    })
  );

  btns.appendChild(
    mkBtn("SAFE=0", () => {
      const u = new URL(location.href);
      u.searchParams.delete("safe");
      u.searchParams.set("v", String(Date.now()));
      location.href = u.toString();
    })
  );

  btns.appendChild(
    mkBtn("TRACE=1", () => {
      const u = new URL(location.href);
      u.searchParams.set("trace", "1");
      u.searchParams.set("v", String(Date.now()));
      location.href = u.toString();
    })
  );

  btns.appendChild(
    mkBtn("TRACE=0", () => {
      const u = new URL(location.href);
      u.searchParams.delete("trace");
      u.searchParams.set("v", String(Date.now()));
      location.href = u.toString();
    })
  );

  body = document.createElement("div");
  body.style.marginTop = "10px";
  overlay.appendChild(body);

  document.body.appendChild(overlay);
}

function write(line) {
  ensureOverlay();
  lines.push(String(line));
  if (lines.length > 220) lines.shift();
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

async function preflight(urlRel) {
  try {
    const abs = new URL(urlRel, location.href).toString();
    write(`[preflight] GET ${abs}`);
    const res = await fetch(abs, { cache: "no-store" });
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

// Exported start() for router
export async function start(meta = {}) {
  ensureOverlay();
  hookErrors();

  const q = qs();
  const trace = q.trace === "1";
  const safe = q.safe === "1";
  const noHud = q.nohud === "1";

  write(`[scarlett1] start()… build=${BUILD}`);
  write(`[meta] routerBuild=${meta.routerBuild || "?"}`);
  write(`[env] href=${location.href}`);
  write(`[env] ua=${navigator.userAgent}`);
  write(`[env] secureContext=${String(window.isSecureContext)}`);
  write(`[env] navigator.xr=${String(!!navigator.xr)}`);
  write(`[opts] safe=${String(safe)} trace=${String(trace)} nohud=${String(noHud)}`);

  // ✅ Prefetch world.js so we KNOW if it's missing or wrong-case
  write(`[scarlett1] preflight ./world.js …`);
  const pf = await preflight("./world.js");

  if (!pf.ok) {
    write(`\nFIX REQUIRED: /js/scarlett1/world.js is missing OR wrong-case OR not deployed.`);
    write(`Required path: js/scarlett1/world.js (lowercase)`);
    throw new Error("world.js preflight failed");
  }

  write(`\n[scarlett1] importing ./world.js …`);
  try {
    const world = await import("./world.js");
    write(`[scarlett1] world.js import OK ✅`);

    if (typeof world.createWorldOrchestrator !== "function") {
      throw new Error("world.js missing export createWorldOrchestrator()");
    }

    write(`[scarlett1] creating orchestrator…`);
    const api = world.createWorldOrchestrator({
      safeMode: safe,
      noHud,
      trace,
    });

    write(`[scarlett1] orchestrator created ✅`);
    if (trace) log("world api:", api);
    return api;
  } catch (e) {
    err("world start failed", e);
    write(`[ERR] world start failed ❌`);
    write(`[ERR] ${String(e?.message || e)}`);
    if (e?.stack) write(clip(e.stack));
    throw e;
  }
            }
