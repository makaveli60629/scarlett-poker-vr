// /js/scarlett1/index.js
// SCARLETT1 ENTRY (FULL) — Router start() + on-screen banner proof
const BUILD = "SCARLETT1_INDEX_FULL_v9_BANNER_PROOF";

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

// FORCE DIAG if router is hiding logs
const DIAG = true;

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

function banner() {
  let b = document.getElementById("scarlettBanner");
  if (!b) {
    b = document.createElement("div");
    b.id = "scarlettBanner";
    b.style.position = "fixed";
    b.style.left = "10px";
    b.style.bottom = "10px";
    b.style.zIndex = "999999";
    b.style.padding = "10px 12px";
    b.style.borderRadius = "12px";
    b.style.background = "rgba(0,0,0,0.75)";
    b.style.color = "#fff";
    b.style.font = "12px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial";
    b.style.whiteSpace = "pre-wrap";
    b.style.maxWidth = "85vw";
    b.style.pointerEvents = "none";
    document.body.appendChild(b);
  }
  return (text) => {
    b.textContent = text;
  };
}

function installGuards(setBanner) {
  if (window.__scarlettGuardsInstalled) return;
  window.__scarlettGuardsInstalled = true;

  window.addEventListener("error", (e) => {
    const msg = String(e?.message || e);
    err("window.error:", msg);
    setBanner(`❌ ERROR\n${msg}`);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const msg = String(e?.reason || e);
    err("unhandledrejection:", msg);
    setBanner(`❌ REJECTION\n${msg}`);
  });
}

async function run() {
  if (window.__scarlettStarted) return;
  window.__scarlettStarted = true;

  ensureRoot();
  const setBanner = banner();
  installGuards(setBanner);

  setBanner(`✅ Scarlett start()\n${BUILD}\nstep: begin`);
  log("start begin", BUILD);

  // Force a visible tick (proves JS is executing even if logs hidden)
  let n = 0;
  const iv = setInterval(() => {
    n++;
    if (n <= 3) setBanner(`✅ Scarlett start()\n${BUILD}\nstep: alive (${n})`);
    if (n >= 3) clearInterval(iv);
  }, 250);

  try {
    setBanner(`✅ Scarlett start()\n${BUILD}\nstep: import world.js`);
    const mod = await import(`./world.js?v=${Date.now()}`);

    if (!mod || typeof mod.bootWorld !== "function") {
      throw new Error("world.js missing export bootWorld()");
    }

    setBanner(`✅ Scarlett start()\n${BUILD}\nstep: bootWorld()`);
    await mod.bootWorld({
      DIAG,
      H: (s) => {
        // mirror world progress into banner for proof
        setBanner(`✅ Scarlett start()\n${BUILD}\n${s}`);
        log(s);
      },
    });

    setBanner(`✅ Scarlett start()\n${BUILD}\nstep: world ready`);
    log("world ready");
  } catch (e) {
    const msg = String(e?.message || e);
    err("boot failed:", e);
    setBanner(`❌ BOOT FAILED\n${msg}`);
  }
}

export async function start() {
  return run();
}

// safety fallback
setTimeout(() => {
  try { run(); } catch (e) {}
}, 0);
