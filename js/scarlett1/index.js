// /js/scarlett1/index.js
// SCARLETT1 ENTRY (FULL) — Router-compatible: exports start() + idempotent run
const BUILD = "SCARLETT1_INDEX_FULL_v8_ROUTER_START_EXPORT";

const log = (...a) => console.log("[scarlett1]", ...a);
const warn = (...a) => console.warn("[scarlett1]", ...a);
const err = (...a) => console.error("[scarlett1]", ...a);

function qs() {
  const p = new URLSearchParams(location.search);
  const o = {};
  for (const [k, v] of p.entries()) o[k] = v === "" ? true : v;
  return o;
}
const Q = qs();
const DIAG = !!(Q.diag || Q.debug || Q.green);

function isQuest() {
  const ua = navigator.userAgent || "";
  return /OculusBrowser|Quest/i.test(ua);
}
function isAndroidPhone() {
  const ua = navigator.userAgent || "";
  return /Android/i.test(ua) && !isQuest();
}

function ensureRoot() {
  let root = document.getElementById("app");
  if (!root) {
    root = document.createElement("div");
    root.id = "app";
    root.style.position = "fixed";
    root.style.inset = "0";
    root.style.overflow = "hidden";
    document.body.style.margin = "0";
    document.body.appendChild(root);
  }
  return root;
}

function makeHud() {
  // avoid duplicates
  const existing = document.getElementById("scarlettHud");
  if (existing) return { hudLine: (s) => {}, hud: existing };

  const hud = document.createElement("div");
  hud.id = "scarlettHud";
  hud.style.position = "fixed";
  hud.style.left = "10px";
  hud.style.top = "10px";
  hud.style.zIndex = "99999";
  hud.style.padding = "10px 12px";
  hud.style.borderRadius = "10px";
  hud.style.font = "12px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial";
  hud.style.whiteSpace = "pre-wrap";
  hud.style.maxWidth = "80vw";
  hud.style.background = "rgba(0,0,0,0.65)";
  hud.style.color = "#fff";
  hud.style.backdropFilter = "blur(4px)";
  hud.style.pointerEvents = "auto";

  const bar = document.createElement("div");
  bar.style.display = "flex";
  bar.style.gap = "8px";
  bar.style.marginBottom = "8px";

  const btn = (txt, on) => {
    const b = document.createElement("button");
    b.textContent = txt;
    b.style.border = "0";
    b.style.borderRadius = "10px";
    b.style.padding = "8px 10px";
    b.style.cursor = "pointer";
    b.style.font = "12px system-ui";
    b.onclick = on;
    return b;
  };

  const body = document.createElement("div");
  body.id = "scarlettHudBody";

  const toggle = btn("Hide HUD", () => {
    const visible = hud.dataset.visible !== "0";
    hud.dataset.visible = visible ? "0" : "1";
    body.style.display = visible ? "none" : "block";
    bar.style.display = visible ? "none" : "flex";
    if (visible) {
      hud.style.padding = "0";
      hud.style.background = "transparent";
      const pill = document.createElement("button");
      pill.id = "scarlettShowHud";
      pill.textContent = "Show HUD";
      pill.style.border = "0";
      pill.style.borderRadius = "999px";
      pill.style.padding = "10px 12px";
      pill.style.background = "rgba(0,0,0,0.65)";
      pill.style.color = "#fff";
      pill.style.cursor = "pointer";
      pill.onclick = () => {
        pill.remove();
        hud.dataset.visible = "1";
        body.style.display = "block";
        bar.style.display = "flex";
        hud.style.padding = "10px 12px";
        hud.style.background = "rgba(0,0,0,0.65)";
      };
      hud.appendChild(pill);
    }
  });

  const copy = btn("Copy Logs", async () => {
    try {
      const text = body.textContent || "";
      await navigator.clipboard.writeText(text);
      log("HUD logs copied");
    } catch (e) {
      warn("copy failed", e);
    }
  });

  bar.appendChild(toggle);
  bar.appendChild(copy);
  hud.appendChild(bar);
  hud.appendChild(body);

  document.body.appendChild(hud);

  function hudLine(s) {
    body.textContent = (body.textContent ? body.textContent + "\n" : "") + s;
    const lines = body.textContent.split("\n");
    if (lines.length > 220) body.textContent = lines.slice(lines.length - 220).join("\n");
  }

  return { hud, hudLine };
}

function installGlobalGuards(H) {
  if (window.__scarlettGuardsInstalled) return;
  window.__scarlettGuardsInstalled = true;

  window.addEventListener("error", (e) => {
    err("window.error:", e?.message, e?.filename, e?.lineno, e?.colno);
    const msg = String(e?.message || e);
    window.__scarlettLastError = msg;
    window.dispatchEvent(new CustomEvent("scarlett:error", { detail: msg }));
    if (H) H(`❌ ERROR: ${msg}`);
  });

  window.addEventListener("unhandledrejection", (e) => {
    err("unhandledrejection:", e?.reason);
    const msg = String(e?.reason || e);
    window.__scarlettLastError = msg;
    window.dispatchEvent(new CustomEvent("scarlett:error", { detail: msg }));
    if (H) H(`❌ REJECTION: ${msg}`);
  });
}

async function run() {
  // Idempotent guard (router may call start multiple times)
  if (window.__scarlettStarted) {
    log("start() ignored — already started");
    return;
  }
  window.__scarlettStarted = true;

  ensureRoot();
  const { hudLine } = makeHud();

  const stamp = () => new Date().toLocaleTimeString();
  const H = (s) => {
    if (DIAG) hudLine(`[${stamp()}] ${s}`);
    log(s);
  };

  installGlobalGuards(H);

  H(`boot ✅ build=${BUILD}`);
  H(`env ua=${navigator.userAgent}`);
  H(`env secureContext=${window.isSecureContext}`);
  H(`env navigator.xr=${!!navigator.xr}`);
  H(`mode quest=${isQuest()} androidPhone=${isAndroidPhone()}`);

  // Import world orchestrator
  try {
    const mod = await import(`./world.js?v=${Date.now()}`);
    if (typeof mod.bootWorld === "function") {
      H("world.js imported ✅ bootWorld()");
      await mod.bootWorld({ DIAG, H });
      H("world boot complete ✅");
    } else {
      throw new Error("world.js missing export bootWorld()");
    }
  } catch (e) {
    err("world import failed", e);
    H(`❌ world import failed: ${String(e?.message || e)}`);
  }

  if (!DIAG) {
    const body = document.getElementById("scarlettHudBody");
    if (body) body.textContent = `Scarlett loaded ✅ (${BUILD})\nTip: add ?diag=1 to the URL for green logs.`;
  }
}

/**
 * Router contract:
 * The router imports this module then calls start().
 */
export async function start() {
  return run();
}

// Safety: if router DOESN'T call start(), we still try once on next tick.
// (Idempotent guard prevents double-run)
setTimeout(() => {
  try { run(); } catch (e) {}
}, 0);
