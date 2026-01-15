// /js/scarlett1/boot.js — Scarlett 1.0 Boot (FULL • PERMANENT • WORLD-INIT FLEX)
// ✅ HUD Diagnostics + Hide/Show + Copy Log
// ✅ Loads THREE (CDN) -> world.js (flex init) -> spine_xr.js
// ✅ Safe module loader (bots + store hook) — never breaks core

(() => {
  // ------------------------------
  // Diagnostics + HUD
  // ------------------------------
  const LOGS = [];
  const now = () => {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    return `[${h}:${m}:${s}]`;
  };

  let hudRoot, hudLog, hudStatusLine, btnHide, btnShow, btnCopy;

  function buttonCss() {
    return `
      appearance:none; border:none; cursor:pointer;
      padding: 8px 10px; border-radius: 8px;
      background: rgba(47,107,255,0.18);
      color: #d9e6ff; font-size: 12px;
      border: 1px solid rgba(47,107,255,0.35);
    `;
  }

  function safeJson(x) {
    try { return JSON.stringify(x); } catch { return String(x); }
  }

  function hudAppend(line) {
    if (!hudLog) return;
    const div = document.createElement("div");
    div.textContent = line;
    hudLog.appendChild(div);
    hudLog.scrollTop = hudLog.scrollHeight;
  }

  function hudStatus(s) {
    if (hudStatusLine) hudStatusLine.textContent = `STATUS: ${s}`;
  }

  function buildHUD() {
    hudRoot = document.createElement("div");
    hudRoot.id = "scarlettHud";
    hudRoot.style.cssText = `
      position: fixed; left: 10px; top: 10px; z-index: 999999;
      width: min(520px, calc(100vw - 20px));
      max-height: 55vh; overflow: hidden;
      background: rgba(10,14,28,0.88);
      border: 1px solid rgba(90,140,255,0.35);
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      color: #cfe0ff;
    `;

    const top = document.createElement("div");
    top.style.cssText = `display:flex; gap:8px; align-items:center; padding:10px;`;

    hudStatusLine = document.createElement("div");
    hudStatusLine.textContent = "STATUS: boot.js starting…";
    hudStatusLine.style.cssText = `flex:1; font-size:12px; color:#cfe0ff; opacity:0.95;`;

    btnCopy = document.createElement("button");
    btnCopy.textContent = "Copy Log";
    btnCopy.style.cssText = buttonCss();
    btnCopy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(LOGS.join("\n"));
        alert("Copied diagnostics log ✅");
      } catch {
        alert("Clipboard blocked. Long-press to copy is required on this device.");
      }
    };

    btnHide = document.createElement("button");
    btnHide.textContent = "Hide HUD";
    btnHide.style.cssText = buttonCss();
    btnHide.onclick = () => {
      hudRoot.style.display = "none";
      btnShow.style.display = "block";
    };

    top.appendChild(hudStatusLine);
    top.appendChild(btnCopy);
    top.appendChild(btnHide);

    hudLog = document.createElement("div");
    hudLog.style.cssText = `
      padding: 8px 10px 12px 10px;
      border-top: 1px solid rgba(90,140,255,0.18);
      font-size: 11px;
      line-height: 1.25;
      max-height: 46vh;
      overflow: auto;
      white-space: pre-wrap;
      user-select: text;
    `;

    hudRoot.appendChild(top);
    hudRoot.appendChild(hudLog);

    btnShow = document.createElement("button");
    btnShow.textContent = "Show HUD";
    btnShow.style.cssText = `
      ${buttonCss()}
      position: fixed; left: 10px; top: 10px; z-index: 999999;
      display:none;
    `;
    btnShow.onclick = () => {
      hudRoot.style.display = "block";
      btnShow.style.display = "none";
    };

    document.body.appendChild(hudRoot);
    document.body.appendChild(btnShow);
  }

  const DIAG = {
    log: (...a) => {
      const line = `${now()} ${a.map(x => (typeof x === "string" ? x : safeJson(x))).join(" ")}`;
      LOGS.push(line);
      console.log(...a);
      hudAppend(line);
    },
    warn: (...a) => {
      const line = `${now()} WARN ${a.map(x => (typeof x === "string" ? x : safeJson(x))).join(" ")}`;
      LOGS.push(line);
      console.warn(...a);
      hudAppend(line);
    },
    error: (...a) => {
      const line = `${now()} ERROR ${a.map(x => (typeof x === "string" ? x : safeJson(x))).join(" ")}`;
      LOGS.push(line);
      console.error(...a);
      hudAppend(line);
    },
    status: (s) => hudStatus(s),
    getLogs: () => LOGS.join("\n")
  };

  // ------------------------------
  // World init resolver (PERMANENT)
  // ------------------------------
  function resolveWorldInit(worldMod) {
    if (!worldMod) return null;

    // Preferred
    if (typeof worldMod.initWorld === "function") return worldMod.initWorld;

    // Default export function
    if (typeof worldMod.default === "function") return worldMod.default;

    // Default export object with initWorld/init
    if (worldMod.default && typeof worldMod.default.initWorld === "function") return worldMod.default.initWorld;
    if (worldMod.default && typeof worldMod.default.init === "function") return worldMod.default.init;

    // Named object patterns
    if (worldMod.World && typeof worldMod.World.initWorld === "function") return worldMod.World.initWorld;
    if (worldMod.World && typeof worldMod.World.init === "function") return worldMod.World.init;

    return null;
  }

  // ------------------------------
  // Boot Runner
  // ------------------------------
  async function run() {
    buildHUD();

    // Ensure #app exists
    if (!document.getElementById("app")) {
      const app = document.createElement("div");
      app.id = "app";
      app.style.cssText = "position:fixed; inset:0;";
      document.body.appendChild(app);
    }

    // Surface runtime errors to HUD
    window.addEventListener("error", (e) => DIAG.error("window error:", e?.message || e));
    window.addEventListener("unhandledrejection", (e) => DIAG.error("unhandledrejection:", e?.reason?.message || e?.reason || e));

    // Env
    DIAG.log(`href=${location.href}`);
    DIAG.log(`path=${location.pathname}`);
    DIAG.log(`base=${location.pathname.split("/").slice(0, 2).join("/") + "/"}`);
    DIAG.log(`secureContext=${window.isSecureContext}`);
    DIAG.log(`ua=${navigator.userAgent}`);
    DIAG.log(`navigator.xr=${!!navigator.xr}`);

    DIAG.status("boot.js running…");

    try {
      DIAG.log("boot start ✅");

      // Load THREE
      DIAG.status("Loading three.js (CDN)…");
      const THREE = await import("https://unpkg.com/three@0.158.0/build/three.module.js");
      DIAG.log("three import ✅ https://unpkg.com/three@0.158.0/build/three.module.js");

      // Load world
      DIAG.status("Loading world.js…");
      const worldUrl = `/scarlett-poker-vr/js/scarlett1/world.js?v=${Date.now()}`;
      DIAG.log("world url=", worldUrl);

      const worldMod = await import(worldUrl);
      DIAG.log("world import ✅");

      const initFn = resolveWorldInit(worldMod);
      if (!initFn) {
        DIAG.error("World init not found. Exports=", Object.keys(worldMod));
        if (worldMod.default) DIAG.error("World default export keys=", Object.keys(worldMod.default));
        throw new Error("world module has no initWorld/default init");
      }

      DIAG.status("Starting world…");
      await initFn({ THREE, DIAG });
      DIAG.log("world init ✅");
      DIAG.status("World running ✅");

      // Load XR spine
      DIAG.status("Loading spine_xr.js…");
      const spineUrl = `/scarlett-poker-vr/js/scarlett1/spine_xr.js?v=${Date.now()}`;
      DIAG.log("spine url=", spineUrl);

      const spineMod = await import(spineUrl);
      DIAG.log("spine import ✅");

      if (typeof spineMod.installXR !== "function") {
        DIAG.error("spine_xr missing installXR. Exports=", Object.keys(spineMod));
        throw new Error("spine_xr.installXR missing");
      }

      await spineMod.installXR({ THREE, DIAG });
      DIAG.log("spine install ✅");
      DIAG.status("XR spine ready ✅ (press Enter VR)");

      // Optional modules
      DIAG.status("Loading optional modules…");

      // Bots
      try {
        const botUrl = `/scarlett-poker-vr/js/scarlett1/modules/bots.js?v=${Date.now()}`;
        const botMod = await import(botUrl);
        if (botMod?.Bots?.install) {
          botMod.Bots.install({ THREE, DIAG, WORLD: window.__SCARLETT1__ });
          DIAG.log("module bots ✅");
        } else {
          DIAG.warn("module bots loaded but missing Bots.install");
        }
      } catch (e) {
        DIAG.warn("module bots missing/fail (safe)", e?.message || e);
      }

      // Store hook
      try {
        const storeHookUrl = `/scarlett-poker-vr/js/scarlett1/modules/store_hook.js?v=${Date.now()}`;
        const storeMod = await import(storeHookUrl);
        if (storeMod?.StoreHook?.install) {
          await storeMod.StoreHook.install({ THREE, DIAG, WORLD: window.__SCARLETT1__ });
          DIAG.log("module store_hook ✅");
        } else {
          DIAG.warn("module store_hook loaded but missing StoreHook.install");
        }
      } catch (e) {
        DIAG.warn("module store_hook missing/fail (safe)", e?.message || e);
      }

      DIAG.status("All systems ready ✅");
    } catch (e) {
      DIAG.error("BOOT FAILED:", e?.message || e);
      DIAG.status("BOOT FAILED ❌ (see log)");
    }
  }

  run();
})();
