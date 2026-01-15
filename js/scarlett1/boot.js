// /js/scarlett1/boot.js — Scarlett 1.0 Boot (FULL)
// Loads THREE (CDN), World, XR Spine. Adds diagnostic HUD with Hide/Show + Copy Log.

(() => {
  const LOGS = [];
  const now = () => {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    return `[${h}:${m}:${s}]`;
  };

  const DIAG = {
    log: (...a) => {
      const line = `${now()} ${a.map(x => (typeof x === "string" ? x : JSON.stringify(x))).join(" ")}`;
      LOGS.push(line);
      console.log(...a);
      hudAppend(line);
    },
    warn: (...a) => {
      const line = `${now()} WARN ${a.map(x => (typeof x === "string" ? x : JSON.stringify(x))).join(" ")}`;
      LOGS.push(line);
      console.warn(...a);
      hudAppend(line);
    },
    error: (...a) => {
      const line = `${now()} ERROR ${a.map(x => (typeof x === "string" ? x : JSON.stringify(x))).join(" ")}`;
      LOGS.push(line);
      console.error(...a);
      hudAppend(line);
    },
    status: (s) => hudStatus(s),
    getLogs: () => LOGS.join("\n")
  };

  // --- HUD ---
  let hudRoot, hudLog, hudStatusLine, btnHide, btnShow, btnCopy;
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

    btnHide = document.createElement("button");
    btnHide.textContent = "Hide HUD";
    btnHide.style.cssText = buttonCss();
    btnHide.onclick = () => {
      hudRoot.style.display = "none";
      btnShow.style.display = "block";
    };

    btnCopy = document.createElement("button");
    btnCopy.textContent = "Copy Log";
    btnCopy.style.cssText = buttonCss();
    btnCopy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(DIAG.getLogs());
        alert("Copied diagnostics log ✅");
      } catch (e) {
        alert("Clipboard blocked. Long-press to copy is required on this device.");
      }
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

  function buttonCss() {
    return `
      appearance:none; border:none; cursor:pointer;
      padding: 8px 10px; border-radius: 8px;
      background: rgba(47,107,255,0.18);
      color: #d9e6ff; font-size: 12px;
      border: 1px solid rgba(47,107,255,0.35);
    `;
  }

  function hudAppend(line) {
    if (!hudLog) return;
    const div = document.createElement("div");
    div.textContent = line;
    hudLog.appendChild(div);
    // Keep scrolled to bottom
    hudLog.scrollTop = hudLog.scrollHeight;
  }

  function hudStatus(s) {
    if (hudStatusLine) hudStatusLine.textContent = `STATUS: ${s}`;
  }

  // --- Boot ---
  async function run() {
    buildHUD();

    // env
    DIAG.log(`${now()} href=${location.href}`);
    DIAG.log(`${now()} path=${location.pathname}`);
    DIAG.log(`${now()} base=${location.pathname.split("/").slice(0, 2).join("/") + "/"}`);
    DIAG.log(`${now()} secureContext=${window.isSecureContext}`);
    DIAG.log(`${now()} ua=${navigator.userAgent}`);
    DIAG.log(`${now()} navigator.xr=${!!navigator.xr}`);

    DIAG.status("boot.js running…");

    try {
      DIAG.log("boot start ✅");

      // Load THREE from CDN
      DIAG.status("Loading three.js (CDN)…");
      const THREE = await import("https://unpkg.com/three@0.158.0/build/three.module.js");
      DIAG.log("three import ✅", "https://unpkg.com/three@0.158.0/build/three.module.js");

      // World
      DIAG.status("Loading world.js…");
      const worldUrl = `/scarlett-poker-vr/js/scarlett1/world.js?v=${Date.now()}`;
      DIAG.log("world url=", worldUrl);
      const worldMod = await import(worldUrl);
      DIAG.log("world import ✅");

      DIAG.status("Starting world…");
      await worldMod.initWorld({ THREE, DIAG });
      DIAG.log("world init ✅");
      DIAG.status("World running ✅");

      // XR Spine
      DIAG.status("Loading spine_xr.js…");
      const spineUrl = `/scarlett-poker-vr/js/scarlett1/spine_xr.js?v=${Date.now()}`;
      const spineMod = await import(spineUrl);
      DIAG.log("spine import ✅");

      await spineMod.installXR({ THREE, DIAG });
      DIAG.log("spine install ✅");
      DIAG.status("XR spine ready ✅ (press Enter VR)");

      // Safety: surface unhandled errors into HUD
      window.addEventListener("error", (e) => {
        DIAG.error("window error:", e?.message || e);
      });
      window.addEventListener("unhandledrejection", (e) => {
        DIAG.error("unhandledrejection:", e?.reason?.message || e?.reason || e);
      });

    } catch (e) {
      DIAG.error("BOOT FAILED:", e?.message || e);
      DIAG.status("BOOT FAILED ❌ (see log)");
    }
  }

  // Ensure #app exists
  if (!document.getElementById("app")) {
    const app = document.createElement("div");
    app.id = "app";
    app.style.cssText = "position:fixed; inset:0;";
    document.body.appendChild(app);
  }

  run();
})();
