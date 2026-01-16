// /js/scarlett1/index.js
// SCARLETT1 ENTRY — SYNC PROOF BEFORE ASYNC (router-safe)
const BUILD = "SCARLETT1_INDEX_FULL_v10_SYNC_PROOF";

const log = (...a) => console.log("[scarlett1]", ...a);
const err = (...a) => console.error("[scarlett1]", ...a);

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

function setBannerText(text) {
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
    b.style.background = "rgba(0,0,0,0.80)";
    b.style.color = "#fff";
    b.style.font = "12px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial";
    b.style.whiteSpace = "pre-wrap";
    b.style.maxWidth = "90vw";
    b.style.pointerEvents = "none";
    document.body.appendChild(b);
  }
  b.textContent = text;
}

function setPanicLabel(text) {
  let p = document.getElementById("scarlettPanic");
  if (!p) {
    p = document.createElement("div");
    p.id = "scarlettPanic";
    p.style.position = "fixed";
    p.style.right = "10px";
    p.style.top = "10px";
    p.style.zIndex = "1000000";
    p.style.padding = "10px 12px";
    p.style.borderRadius = "12px";
    p.style.background = "rgba(160,0,0,0.85)";
    p.style.color = "#fff";
    p.style.font = "12px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial";
    p.style.whiteSpace = "pre-wrap";
    p.style.maxWidth = "70vw";
    p.style.pointerEvents = "none";
    document.body.appendChild(p);
  }
  p.textContent = text;
}

function installGuards() {
  if (window.__scarlettGuardsInstalled) return;
  window.__scarlettGuardsInstalled = true;

  window.addEventListener("error", (e) => {
    const msg = String(e?.message || e);
    err("window.error:", msg);
    setPanicLabel("❌ ERROR\n" + msg);
    setBannerText("❌ ERROR\n" + msg);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const msg = String(e?.reason || e);
    err("unhandledrejection:", msg);
    setPanicLabel("❌ REJECTION\n" + msg);
    setBannerText("❌ REJECTION\n" + msg);
  });
}

async function bootAsync() {
  try {
    setBannerText(`✅ Scarlett\n${BUILD}\nstep: import world.js`);
    const mod = await import(`./world.js?v=${Date.now()}`);

    if (!mod || typeof mod.bootWorld !== "function") {
      throw new Error("world.js missing export bootWorld()");
    }

    setBannerText(`✅ Scarlett\n${BUILD}\nstep: bootWorld()`);
    await mod.bootWorld({
      DIAG: true,
      H: (s) => setBannerText(`✅ Scarlett\n${BUILD}\n${s}`),
    });

    setBannerText(`✅ Scarlett\n${BUILD}\nstep: world ready ✅`);
    setPanicLabel(`✅ STARTED\n${BUILD}`);
  } catch (e) {
    const msg = String(e?.message || e);
    setPanicLabel("❌ BOOT FAILED\n" + msg);
    setBannerText("❌ BOOT FAILED\n" + msg);
    err("boot failed:", e);
  }
}

/**
 * Router calls this. MUST DO SYNC SIDE EFFECTS FIRST.
 */
export function start() {
  // --- SYNC PROOF ---
  window.__scarlettSyncProof = true;
  ensureRoot();
  installGuards();
  setBannerText(`✅ Scarlett\n${BUILD}\nstep: SYNC start() ran`);
  setPanicLabel(`SYNC OK\n${BUILD}`);

  // --- ASYNC CONTINUE ---
  // Use microtask + setTimeout to survive weird router lifecycles
  Promise.resolve().then(() => bootAsync());
  setTimeout(() => { bootAsync(); }, 0);

  // return something router will accept
  return true;
}

// fallback if router doesn't call start
try { start(); } catch (e) {}
