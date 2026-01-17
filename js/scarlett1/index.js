/* /js/scarlett1/index.js
   SCARLETT1_INDEX_FULL_v22_0_PERMA_ENGINE_ANDROID_PANEL
   - Never-black fallback scene
   - Android full panel (sticks + hide HUD + hide panel + module panel + test + copy)
   - XR: Move=Right stick (HMD-forward), Teleport=Right grip, Action=Right trigger, Menu=Left Y (auto-bind)
   - Boots ./world.js and attaches __scarlettRunModuleTest for real
*/

(() => {
  const BUILD = "SCARLETT1_INDEX_FULL_v22_0_PERMA_ENGINE_ANDROID_PANEL";
  const THREE = window.THREE;
  const log = (...a) => console.log(`[${BUILD}]`, ...a);
  const err = (...a) => console.error(`[${BUILD}]`, ...a);

  if (!THREE) {
    window.__scarlettDiagWrite?.("THREE missing ❌ (three.min.js not loaded)");
    return err("THREE missing");
  }

  // Always-available globals (so router DIAG never breaks)
  window.__scarlett = window.__scarlett || {};
  window.__scarlett.build = BUILD;

  window.__scarlettRunModuleTest =
    window.__scarlettRunModuleTest ||
    (async () => ({
      ok: false,
      time: new Date().toISOString(),
      build: BUILD,
      reason: "world not ready yet",
    }));

  // Canvas/renderer
  const canvas = document.querySelector("canvas") || (() => {
    const c = document.createElement("canvas");
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.appendChild(c);
    return c;
  })();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  // Scene / camera / rig
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080a);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 3000);
  const rig = new THREE.Group();
  rig.add(camera);
  scene.add(rig);

  // Fallback lights + floor (never black)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.95));
  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(6, 12, 4);
  scene.add(dir);

  const fallbackFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240),
    new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 1, metalness: 0 })
  );
  fallbackFloor.rotation.x = -Math.PI / 2;
  fallbackFloor.position.y = 0;
  fallbackFloor.name = "SCARLETT_FLOOR_FALLBACK";
  scene.add(fallbackFloor);

  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.15, 0.15),
    new THREE.MeshStandardMaterial({ color: 0xe91e63 })
  );
  marker.position.set(0, 1.2, -1.5);
  scene.add(marker);

  // HUD
  const hud = document.getElementById("scarlettHud") || (() => {
    const d = document.createElement("div");
    d.id = "scarlettHud";
    d.style.cssText = `
      position:fixed;left:10px;top:10px;z-index:99999;
      font-family:ui-monospace,Menlo,Consolas,monospace;
      font-size:12px;line-height:1.3;
      padding:8px 10px;border-radius:10px;
      background:rgba(0,0,0,.55);color:#fff;
      max-width: 440px; user-select:none; white-space:pre;
    `;
    document.body.appendChild(d);
    return d;
  })();

  let hudVisible = true;
  const setHudVisible = (v) => {
    hudVisible = !!v;
    hud.style.display = hudVisible ? "block" : "none";
  };
  const HUD = (s) => window.__scarlettDiagWrite?.(String(s));

  // Android full panel
  const isAndroid = /Android/i.test(navigator.userAgent);
  window.__scarlettAndroidInput = window.__scarlettAndroidInput || {
    moveX: 0, moveY: 0, action: false, teleport: false
  };

  function makeAndroidPanel() {
    if (!isAndroid) return null;
    if (document.getElementById("scarlettAndroidPanel")) return document.getElementById("scarlettAndroidPanel");

    const panel = document.createElement("div");
    panel.id = "scarlettAndroidPanel";
    panel.style.cssText = `
      position:fixed;left:10px;right:10px;bottom:10px;z-index:999999;
      background:rgba(0,0,0,.75);color:#fff;border-radius:14px;
      padding:10px;font-family:ui-monospace,Menlo,Consolas,monospace;
      font-size:12px;line-height:1.25;
    `;
    panel.innerHTML = `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;align-items:center">
        <button id="ap_hideHud" style="padding:8px 10px;border:0;border-radius:12px;background:#444;color:#fff;font-weight:900">HIDE HUD</button>
        <button id="ap_hidePanel" style="padding:8px 10px;border:0;border-radius:12px;background:#444;color:#fff;font-weight:900">HIDE PANEL</button>
        <button id="ap_modules" style="padding:8px 10px;border:0;border-radius:12px;background:#e91e63;color:#fff;font-weight:900">MODULES</button>
        <button id="ap_modTest" style="padding:8px 10px;border:0;border-radius:12px;background:#e91e63;color:#fff;font-weight:900">MODULE TEST</button>
        <button id="ap_copy" style="padding:8px 10px;border:0;border-radius:12px;background:#e91e63;color:#fff;font-weight:900">COPY</button>
        <button id="ap_reload" style="padding:8px 10px;border:0;border-radius:12px;background:#e91e63;color:#fff;font-weight:900">RELOAD WORLD</button>
        <button id="ap_action" style="padding:8px 10px;border:0;border-radius:12px;background:#1976d2;color:#fff;font-weight:900">ACTION</button>
        <button id="ap_teleport" style="padding:8px 10px;border:0;border-radius:12px;background:#0097a7;color:#fff;font-weight:900">TELEPORT</button>
      </div>

      <div id="ap_modPanel" style="display:none;margin-bottom:10px;background:rgba(255,255,255,.06);padding:10px;border-radius:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-weight:900">MODULE PANEL</div>
          <button id="ap_modHide" style="padding:6px 10px;border:0;border-radius:10px;background:#444;color:#fff;font-weight:900">HIDE</button>
        </div>
        <div id="ap_modList" style="opacity:.9">World not ready…</div>
      </div>

      <div style="display:flex;gap:10px">
        <div id="ap_joyL" style="width:44vw;max-width:220px;height:160px;border-radius:14px;background:rgba(255,255,255,.06);position:relative;touch-action:none"></div>
        <div id="ap_joyR" style="width:44vw;max-width:220px;height:160px;border-radius:14px;background:rgba(255,255,255,.06);position:relative;touch-action:none"></div>
      </div>

      <pre id="ap_log" style="margin:10px 0 0 0;white-space:pre-wrap;word-break:break-word;background:rgba(255,255,255,.06);padding:10px;border-radius:12px;max-height:22vh;overflow:auto"></pre>
    `;
    document.body.appendChild(panel);

    const apLog = panel.querySelector("#ap_log");
    const write = (s) => {
      const lines = (apLog.textContent || "").split("\n").slice(-80);
      lines.push(String(s));
      apLog.textContent = lines.join("\n");
      apLog.scrollTop = apLog.scrollHeight;
    };

    write(`ANDROID PANEL ✅ build=${BUILD}`);

    panel.querySelector("#ap_hideHud").onclick = () => {
      setHudVisible(!hudVisible);
      panel.querySelector("#ap_hideHud").textContent = hudVisible ? "HIDE HUD" : "SHOW HUD";
    };

    panel.querySelector("#ap_hidePanel").onclick = () => {
      panel.style.display = "none";
      window.__scarlettAndroidPanelHidden = true;
    };

    // triple-tap to re-show
    let taps = 0;
    window.addEventListener("touchstart", () => {
      if (!window.__scarlettAndroidPanelHidden) return;
      taps++;
      setTimeout(() => (taps = 0), 800);
      if (taps >= 3) {
        panel.style.display = "block";
        window.__scarlettAndroidPanelHidden = false;
        taps = 0;
      }
    }, { passive: true });

    const modPanel = panel.querySelector("#ap_modPanel");
    panel.querySelector("#ap_modules").onclick = () => {
      modPanel.style.display = modPanel.style.display === "none" ? "block" : "none";
      if (modPanel.style.display === "block") window.__scarlettRefreshModuleList?.();
    };
    panel.querySelector("#ap_modHide").onclick = () => (modPanel.style.display = "none");

    panel.querySelector("#ap_modTest").onclick = async () => {
      write("MODULE TEST pressed…");
      const rep = await window.__scarlettRunModuleTest();
      write("MODULE TEST done ✅");
      write(JSON.stringify(rep, null, 2));
      window.__scarlettRefreshModuleList?.();
    };

    panel.querySelector("#ap_copy").onclick = async () => {
      const text = `=== ANDROID PANEL ===\n${apLog.textContent}\n\n=== HUD ===\n${hud.textContent}\n`;
      try { await navigator.clipboard.writeText(text); write("Copied ✅"); }
      catch (e) { write(`Copy failed ❌ ${e?.message || e}`); }
    };

    panel.querySelector("#ap_reload").onclick = async () => {
      write("Reload world…");
      if (typeof window.__scarlettReloadWorld === "function") await window.__scarlettReloadWorld();
      else write("No __scarlettReloadWorld() ❌");
    };

    const bindHold = (sel, key) => {
      const b = panel.querySelector(sel);
      const down = (ev) => { ev.preventDefault(); window.__scarlettAndroidInput[key] = true; };
      const up = (ev) => { ev.preventDefault(); window.__scarlettAndroidInput[key] = false; };
      b.addEventListener("touchstart", down, { passive: false });
      b.addEventListener("touchend", up, { passive: false });
      b.addEventListener("touchcancel", up, { passive: false });
    };
    bindHold("#ap_action", "action");
    bindHold("#ap_teleport", "teleport");

    // Joysticks (left=move, right=unused for now)
    function makeJoystick(el, setXY) {
      const knob = document.createElement("div");
      knob.style.cssText = `
        position:absolute;left:50%;top:50%;
        width:64px;height:64px;border-radius:999px;
        transform:translate(-50%,-50%);
        background:rgba(233,30,99,.55);
      `;
      el.appendChild(knob);

      let active = false, baseX = 0, baseY = 0;

      const apply = (x, y) => {
        setXY(x, y);
        knob.style.left = `${50 + x * 35}%`;
        knob.style.top  = `${50 + y * 35}%`;
      };

      el.addEventListener("touchstart", (ev) => {
        ev.preventDefault();
        const t = ev.touches[0];
        const r = el.getBoundingClientRect();
        baseX = t.clientX - r.left;
        baseY = t.clientY - r.top;
        active = true;
      }, { passive: false });

      el.addEventListener("touchmove", (ev) => {
        if (!active) return;
        ev.preventDefault();
        const t = ev.touches[0];
        const r = el.getBoundingClientRect();
        const dx = (t.clientX - r.left) - baseX;
        const dy = (t.clientY - r.top) - baseY;
        const max = Math.min(r.width, r.height) * 0.35;
        let x = dx / max, y = dy / max;
        const m = Math.hypot(x, y);
        if (m > 1) { x /= m; y /= m; }
        apply(x, y);
      }, { passive: false });

      const end = (ev) => { ev.preventDefault(); active = false; apply(0, 0); };
      el.addEventListener("touchend", end, { passive: false });
      el.addEventListener("touchcancel", end, { passive: false });

      apply(0, 0);
    }

    makeJoystick(panel.querySelector("#ap_joyL"), (x, y) => {
      window.__scarlettAndroidInput.moveX = x;
      window.__scarlettAndroidInput.moveY = y;
    });
    makeJoystick(panel.querySelector("#ap_joyR"), () => {});

    // Module list render
    window.__scarlettRefreshModuleList = () => {
      const list = panel.querySelector("#ap_modList");
      const W = window.__scarlettWorld;
      if (!W) { list.textContent = "World not ready…"; return; }
      const mods = W.modules || [];
      const st = W.status || {};
      list.innerHTML = mods.map((m) => {
        const s = st[m.id] || {};
        const badge = s.ok ? "✅" : (s.stage === "failed" ? "❌" : "⏳");
        return `<div style="margin-bottom:6px">${badge} <b>${m.id}</b> <span style="opacity:.75">(${s.stage || "?"})</span>${s.error ? `<div style="opacity:.8">err: ${String(s.error)}</div>` : ""}</div>`;
      }).join("") || "No modules registered.";
    };

    return panel;
  }

  makeAndroidPanel();

  // XR controllers (optional; Android can run without)
  const controllerL = renderer.xr.getController(0);
  const controllerR = renderer.xr.getController(1);
  rig.add(controllerL, controllerR);

  // World boot
  const state = { worldUpdate: null, worldFloor: null };

  async function bootWorldSafe() {
    window.__scarlettDiagWrite?.("boot world…");
    try {
      const mod = await import(`./world.js?v=${Date.now()}`);
      const world = await mod.bootWorld({ THREE, scene, rig, camera, renderer, HUD, DIAG: log });
      state.worldUpdate = world?.update || null;
      state.worldFloor = scene.getObjectByName("SCARLETT_FLOOR") || fallbackFloor;

      window.__scarlettReloadWorld = bootWorldSafe;

      window.__scarlettDiagWrite?.("world ready ✅");
      window.__scarlettRefreshModuleList?.();
    } catch (e) {
      window.__scarlettDiagWrite?.(`world boot failed ❌ ${e?.message || e}`);
      err(e);
    }
  }

  bootWorldSafe();

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  // Loop
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (typeof state.worldUpdate === "function") state.worldUpdate(dt);

    hud.textContent =
      `SYNC OK ${BUILD}\n` +
      `secure=${window.isSecureContext} xr=${!!navigator.xr}\n` +
      `AndroidPanel=${isAndroid ? "ON" : "OFF"} HUD=${hudVisible}\n`;

    renderer.render(scene, camera);
  });

  log("engine ready ✅");
})();
