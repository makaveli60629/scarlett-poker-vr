/* /js/scarlett1/index.js
   SCARLETT1_INDEX_FULL_v21_1_PERMA_ENGINE_ORCH_ANDROID_PANEL
   - Always renders (fallback floor + marker)
   - Boots world.js safely (cache-busted)
   - Exposes __scarlettRunModuleTest + __scarlettWorld when world loads
   - Unified Android Panel: sticks + hide HUD + hide panel + module list + enable/disable + reload + module test + copy
   - XR: Move=Right stick (HMD-forward), Teleport=Right grip, Action=Right trigger, Menu=Left Y (auto-bind)
*/

(() => {
  const BUILD = "SCARLETT1_INDEX_FULL_v21_1_PERMA_ENGINE_ORCH_ANDROID_PANEL";
  const log = (...a) => console.log(`[${BUILD}]`, ...a);
  const warn = (...a) => console.warn(`[${BUILD}]`, ...a);
  const err = (...a) => console.error(`[${BUILD}]`, ...a);

  const THREE = window.THREE;
  if (!THREE) return err("THREE missing. Load three.min.js before this file.");

  // Ensure always-available globals (so router module test never breaks)
  window.__scarlett = window.__scarlett || {};
  window.__scarlett.build = BUILD;

  window.__scarlettRunModuleTest =
    window.__scarlettRunModuleTest ||
    (async () => ({
      ok: false,
      time: new Date().toISOString(),
      reason: "world not ready yet",
      build: BUILD,
    }));

  // Canvas / Renderer
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

  // Scene / Camera / Rig
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080a);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 3000);
  const rig = new THREE.Group();
  rig.add(camera);
  scene.add(rig);

  // Fallback lights + floor so NEVER black
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.95);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(6, 12, 4);
  scene.add(key);

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
      max-width: 420px; user-select:none; white-space:pre;
    `;
    document.body.appendChild(d);
    return d;
  })();

  let hudVisible = true;
  function setHudVisible(v) {
    hudVisible = !!v;
    hud.style.display = hudVisible ? "block" : "none";
  }

  function HUD(line) {
    const N = 16;
    const lines = (hud.textContent || "").split("\n").slice(-N);
    lines.push(String(line));
    hud.textContent = lines.join("\n");
  }

  // ENTER VR
  const xrBtn = document.getElementById("enterVrBtn") || (() => {
    const b = document.createElement("button");
    b.id = "enterVrBtn";
    b.textContent = "ENTER VR";
    b.style.cssText = `
      position:fixed;right:12px;top:12px;z-index:99999;
      padding:10px 14px;border-radius:12px;border:0;
      font-weight:900; letter-spacing:.5px;
      background:#e91e63;color:#fff;
    `;
    b.onclick = async () => {
      try {
        if (!navigator.xr) throw new Error("navigator.xr missing");
        const supported = await navigator.xr.isSessionSupported("immersive-vr");
        if (!supported) throw new Error("immersive-vr not supported");
        const session = await navigator.xr.requestSession("immersive-vr", {
          optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking", "layers"],
        });
        renderer.xr.setSession(session);
        HUD("XR session started ✅");
      } catch (e) {
        err("ENTER VR failed:", e);
        HUD(`ENTER VR failed ❌ ${e?.message || e}`);
      }
    };
    document.body.appendChild(b);
    return b;
  })();

  // Android “Everything Panel”
  const isAndroid = /Android/i.test(navigator.userAgent);

  window.__scarlettAndroidInput = window.__scarlettAndroidInput || {
    moveX: 0, moveY: 0, turnX: 0, turnY: 0,
    action: false, teleport: false
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[c]));
  }

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
        <button id="ap_toggleModules" style="padding:8px 10px;border:0;border-radius:12px;background:#e91e63;color:#fff;font-weight:900">MODULES</button>
        <button id="ap_modTest" style="padding:8px 10px;border:0;border-radius:12px;background:#e91e63;color:#fff;font-weight:900">MODULE TEST</button>
        <button id="ap_copy" style="padding:8px 10px;border:0;border-radius:12px;background:#e91e63;color:#fff;font-weight:900">COPY</button>
        <button id="ap_reloadWorld" style="padding:8px 10px;border:0;border-radius:12px;background:#e91e63;color:#fff;font-weight:900">RELOAD WORLD</button>
        <button id="ap_action" style="padding:8px 10px;border:0;border-radius:12px;background:#1976d2;color:#fff;font-weight:900">ACTION</button>
        <button id="ap_teleport" style="padding:8px 10px;border:0;border-radius:12px;background:#0097a7;color:#fff;font-weight:900">TELEPORT</button>
      </div>

      <div id="ap_modulesPanel" style="display:none;margin-bottom:10px;background:rgba(255,255,255,.06);padding:10px;border-radius:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-weight:900">MODULE PANEL</div>
          <button id="ap_modHide" style="padding:6px 10px;border:0;border-radius:10px;background:#444;color:#fff;font-weight:900">HIDE</button>
        </div>
        <div id="ap_modList" style="font-size:12px;line-height:1.35"></div>
      </div>

      <div style="display:flex;justify-content:space-between;gap:10px">
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
    write(`ua=${navigator.userAgent}`);

    panel.querySelector("#ap_hideHud").onclick = () => {
      setHudVisible(!hudVisible);
      panel.querySelector("#ap_hideHud").textContent = hudVisible ? "HIDE HUD" : "SHOW HUD";
    };

    panel.querySelector("#ap_hidePanel").onclick = () => {
      panel.style.display = "none";
      window.__scarlettAndroidPanelHidden = true;
    };

    // Emergency triple-tap to show panel again
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

    const modulesPanel = panel.querySelector("#ap_modulesPanel");
    panel.querySelector("#ap_toggleModules").onclick = () => {
      modulesPanel.style.display = modulesPanel.style.display === "none" ? "block" : "none";
      if (modulesPanel.style.display === "block") refreshModuleList();
    };
    panel.querySelector("#ap_modHide").onclick = () => (modulesPanel.style.display = "none");

    panel.querySelector("#ap_modTest").onclick = async () => {
      write("MODULE TEST pressed…");
      try {
        const rep = await window.__scarlettRunModuleTest();
        write("MODULE TEST done ✅");
        write(JSON.stringify(rep, null, 2));
        refreshModuleList();
      } catch (e) {
        write(`MODULE TEST error ❌ ${e?.message || e}`);
      }
    };

    panel.querySelector("#ap_copy").onclick = async () => {
      try {
        const text =
          `=== SCARLETT ANDROID PANEL ===\n${apLog.textContent}\n\n=== HUD ===\n${hud.textContent}\n`;
        await navigator.clipboard.writeText(text);
        write("Copied ✅");
      } catch (e) {
        write(`Copy failed ❌ ${e?.message || e}`);
      }
    };

    panel.querySelector("#ap_reloadWorld").onclick = async () => {
      write("Reload world pressed…");
      try {
        if (typeof window.__scarlettReloadWorld === "function") {
          await window.__scarlettReloadWorld();
          write("Reload world done ✅");
          refreshModuleList();
        } else {
          write("No __scarlettReloadWorld() found ❌");
        }
      } catch (e) {
        write(`Reload world error ❌ ${e?.message || e}`);
      }
    };

    // Hold buttons
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

    // Joysticks
    function makeJoystick(el, outXKey, outYKey) {
      const knob = document.createElement("div");
      knob.style.cssText = `
        position:absolute;left:50%;top:50%;
        width:64px;height:64px;border-radius:999px;
        transform:translate(-50%,-50%);
        background:rgba(233,30,99,.55);
      `;
      el.appendChild(knob);

      let active = false;
      let baseX = 0, baseY = 0;

      const set = (x, y) => {
        window.__scarlettAndroidInput[outXKey] = x;
        window.__scarlettAndroidInput[outYKey] = y;
        knob.style.left = `${50 + x * 35}%`;
        knob.style.top  = `${50 + y * 35}%`;
      };

      const start = (ev) => {
        ev.preventDefault();
        const t = ev.touches[0];
        const r = el.getBoundingClientRect();
        baseX = t.clientX - r.left;
        baseY = t.clientY - r.top;
        active = true;
      };

      const move = (ev) => {
        if (!active) return;
        ev.preventDefault();
        const t = ev.touches[0];
        const r = el.getBoundingClientRect();
        const dx = (t.clientX - r.left) - baseX;
        const dy = (t.clientY - r.top) - baseY;
        const max = Math.min(r.width, r.height) * 0.35;
        let x = dx / max;
        let y = dy / max;
        const m = Math.hypot(x, y);
        if (m > 1) { x /= m; y /= m; }
        set(x, y);
      };

      const end = (ev) => {
        ev.preventDefault();
        active = false;
        set(0, 0);
      };

      el.addEventListener("touchstart", start, { passive: false });
      el.addEventListener("touchmove", move, { passive: false });
      el.addEventListener("touchend", end, { passive: false });
      el.addEventListener("touchcancel", end, { passive: false });
    }

    makeJoystick(panel.querySelector("#ap_joyL"), "moveX", "moveY");
    makeJoystick(panel.querySelector("#ap_joyR"), "turnX", "turnY");

    // Module list renderer
    const modListEl = panel.querySelector("#ap_modList");
    function refreshModuleList() {
      const W = window.__scarlettWorld;
      if (!W || !W.modules) {
        modListEl.innerHTML = `<div>World not ready yet…</div>`;
        return;
      }
      const mods = W.modules;
      const rows = mods.map((m) => {
        const st = W.status?.[m.id] || {};
        const ok = st.ok ? "✅" : (st.stage === "failed" ? "❌" : "⏳");
        const enabled = (st.enabled !== false);
        const errTxt = st.error ? `<div style="opacity:.85">err: ${escapeHtml(st.error)}</div>` : "";
        const infoTxt = st.info ? `<div style="opacity:.85">info: ${escapeHtml(st.info)}</div>` : "";

        return `
          <div style="padding:8px 10px;border-radius:12px;background:rgba(0,0,0,.25);margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
              <div><b>${ok}</b> ${escapeHtml(m.id)} <span style="opacity:.75">(${escapeHtml(st.stage || "?" )})</span></div>
              <div style="display:flex;gap:6px">
                <button data-act="toggle" data-id="${escapeHtml(m.id)}"
                  style="padding:6px 10px;border:0;border-radius:10px;background:${enabled ? "#444" : "#1976d2"};color:#fff;font-weight:900">
                  ${enabled ? "DISABLE" : "ENABLE"}
                </button>
                <button data-act="reload" data-id="${escapeHtml(m.id)}"
                  style="padding:6px 10px;border:0;border-radius:10px;background:#e91e63;color:#fff;font-weight:900">
                  RELOAD
                </button>
              </div>
            </div>
            ${infoTxt}
            ${errTxt}
          </div>
        `;
      }).join("");

      modListEl.innerHTML = rows || `<div>No modules registered.</div>`;

      modListEl.querySelectorAll("button[data-act]").forEach((b) => {
        b.onclick = async () => {
          const act = b.getAttribute("data-act");
          const id = b.getAttribute("data-id");
          try {
            if (act === "toggle" && typeof W.setEnabled === "function") {
              W.setEnabled(id, !(W.status?.[id]?.enabled !== false));
              refreshModuleList();
            }
            if (act === "reload" && typeof W.reloadModule === "function") {
              await W.reloadModule(id);
              refreshModuleList();
            }
          } catch (e) {
            write(`Module op failed ❌ ${e?.message || e}`);
          }
        };
      });
    }

    window.__scarlettRefreshModuleList = refreshModuleList;
    return panel;
  }

  const androidPanel = makeAndroidPanel();

  // Controllers (XR)
  const controllerL = renderer.xr.getController(0);
  const controllerR = renderer.xr.getController(1);
  rig.add(controllerL, controllerR);

  // Teleport visuals RIGHT only
  const teleportRay = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]),
    new THREE.LineBasicMaterial({ color: 0x00e5ff })
  );
  teleportRay.scale.z = 12;
  teleportRay.visible = false;
  controllerR.add(teleportRay);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.06, 0.01, 10, 24),
    new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.2, metalness: 0.1 })
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.set(0, -0.02, -0.06);
  halo.visible = false;
  controllerR.add(halo);

  const teleportReticle = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.11, 32),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  teleportReticle.rotation.x = -Math.PI / 2;
  teleportReticle.visible = false;
  scene.add(teleportReticle);

  const raycaster = new THREE.Raycaster();
  const tmpMat4 = new THREE.Matrix4();
  const tmpOrigin = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();
  const tmpHit = new THREE.Vector3();
  const vForward = new THREE.Vector3();
  const vRight = new THREE.Vector3();
  const vMove = new THREE.Vector3();
  const camPos = new THREE.Vector3();

  const state = {
    leftMenuIndex: 3,
    leftMenuBound: false,
    rightGripIndex: 1,
    rightTriggerIndex: 0,
    prevButtonsL: [],
    prevButtonsR: [],
    teleportAiming: false,
    teleportValid: false,
    teleportPoint: new THREE.Vector3(),
    moveSpeed: 2.0,
    deadzone: 0.18,
    actionDown: false,
    worldUpdate: null,
    worldFloor: null,
  };

  function inDeadzone(v, dz) { return Math.abs(v) < dz ? 0 : v; }
  function getYawForward(out) { camera.getWorldDirection(out); out.y = 0; out.normalize(); return out; }
  function getYawRight(out) { getYawForward(out); const x = out.x, z = out.z; out.set(z,0,-x).normalize(); return out; }

  function pressedEdge(buttons, prevArr, index) {
    const b = buttons?.[index];
    const prev = prevArr[index] || false;
    const now = !!(b && (b.pressed || b.value > 0.75));
    prevArr[index] = now;
    return now && !prev;
  }
  function releasedEdge(buttons, prevArr, index) {
    const b = buttons?.[index];
    const prev = prevArr[index] || false;
    const now = !!(b && (b.pressed || b.value > 0.75));
    prevArr[index] = now;
    return !now && prev;
  }
  function anyFaceButtonEdgeLeft(gp) {
    const cands = [3,2,4,5];
    for (const idx of cands) {
      const b = gp.buttons[idx];
      const prev = state.prevButtonsL[idx] || false;
      const now = !!(b && (b.pressed || b.value > 0.75));
      state.prevButtonsL[idx] = now;
      if (now && !prev) return idx;
    }
    return null;
  }
  function menuToggle() { setHudVisible(!hudVisible); }

  function onActionDown() { state.actionDown = true; }
  function onActionUp() { state.actionDown = false; }

  function computeTeleportHit() {
    const floor = state.worldFloor || fallbackFloor;
    tmpMat4.identity().extractRotation(controllerR.matrixWorld);
    tmpOrigin.setFromMatrixPosition(controllerR.matrixWorld);
    tmpDir.set(0,0,-1).applyMatrix4(tmpMat4).normalize();
    raycaster.ray.origin.copy(tmpOrigin);
    raycaster.ray.direction.copy(tmpDir);
    const hits = raycaster.intersectObject(floor, false);
    if (hits && hits.length) {
      tmpHit.copy(hits[0].point);
      state.teleportValid = true;
      state.teleportPoint.copy(tmpHit);
      teleportReticle.position.copy(tmpHit);
      teleportReticle.visible = true;
      return true;
    }
    state.teleportValid = false;
    teleportReticle.visible = false;
    return false;
  }

  function startTeleportAim() { state.teleportAiming = true; teleportRay.visible = true; halo.visible = true; computeTeleportHit(); }
  function stopTeleportAim(teleportIfValid = true) {
    state.teleportAiming = false;
    teleportRay.visible = false;
    halo.visible = false;
    teleportReticle.visible = false;
    if (teleportIfValid && state.teleportValid) {
      camera.getWorldPosition(camPos);
      const offset = new THREE.Vector3(camPos.x - rig.position.x, 0, camPos.z - rig.position.z);
      rig.position.set(state.teleportPoint.x - offset.x, rig.position.y, state.teleportPoint.z - offset.z);
    }
  }

  // Boot world safely (cache-bust)
  async function bootWorldSafe() {
    HUD(`boot: ${BUILD}`);
    try {
      const mod = await import(`./world.js?v=${Date.now()}`);
      if (typeof mod.bootWorld !== "function") throw new Error("world.js missing export bootWorld()");
      const world = await mod.bootWorld({ THREE, scene, rig, camera, renderer, HUD, DIAG: log });
      state.worldUpdate = world?.update || null;
      state.worldFloor = scene.getObjectByName("SCARLETT_FLOOR") || fallbackFloor;

      window.__scarlettReloadWorld = async () => bootWorldSafe();

      HUD("world: ready ✅");
      log("world orchestrator ready ✅");

      if (typeof window.__scarlettRefreshModuleList === "function") window.__scarlettRefreshModuleList();
    } catch (e) {
      err("world boot failed ❌", e);
      HUD(`world boot failed ❌ ${e?.message || e}`);
      // fallback world remains visible so never black
    }
  }
  bootWorldSafe();

  // Resize
  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  // Main loop
  let lastT = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    if (typeof state.worldUpdate === "function") {
      try { state.worldUpdate(dt); } catch (e) { warn("world update error", e); }
    }

    const session = renderer.xr.getSession?.();
    const srcs = session?.inputSources || [];
    let leftGP = null, rightGP = null, leftSrc = null, rightSrc = null;

    for (const s of srcs) {
      if (!s?.gamepad) continue;
      if (s.handedness === "left") { leftSrc = s; leftGP = s.gamepad; }
      if (s.handedness === "right") { rightSrc = s; rightGP = s.gamepad; }
    }

    // Left menu toggle
    if (leftGP?.buttons?.length) {
      if (state.leftMenuBound) {
        if (pressedEdge(leftGP.buttons, state.prevButtonsL, state.leftMenuIndex)) menuToggle();
      } else {
        if (pressedEdge(leftGP.buttons, state.prevButtonsL, state.leftMenuIndex)) {
          state.leftMenuBound = true;
          menuToggle();
        } else {
          const idx = anyFaceButtonEdgeLeft(leftGP);
          if (idx != null) {
            state.leftMenuIndex = idx;
            state.leftMenuBound = true;
            menuToggle();
            log("Left menu auto-bound to button index:", idx);
          }
        }
      }
    }

    // Right grip teleport + trigger action
    if (rightGP?.buttons?.length) {
      if (pressedEdge(rightGP.buttons, state.prevButtonsR, state.rightGripIndex)) startTeleportAim();
      if (state.teleportAiming) computeTeleportHit();
      if (releasedEdge(rightGP.buttons, state.prevButtonsR, state.rightGripIndex)) stopTeleportAim(true);

      if (pressedEdge(rightGP.buttons, state.prevButtonsR, state.rightTriggerIndex)) onActionDown();
      if (releasedEdge(rightGP.buttons, state.prevButtonsR, state.rightTriggerIndex)) onActionUp();
    }

    // Android action/teleport + movement
    const A = window.__scarlettAndroidInput;

    if (isAndroid && A) {
      if (A.action && !state.actionDown) onActionDown();
      if (!A.action && state.actionDown) onActionUp();

      if (A.teleport) {
        if (!state.teleportAiming) startTeleportAim();
        if (state.teleportAiming) computeTeleportHit();
      } else {
        if (state.teleportAiming && !rightGP) stopTeleportAim(true);
      }
    }

    // Movement: Android stick OR XR stick
    let axX = 0, axY = 0;
    if (isAndroid && A && (Math.abs(A.moveX) > 0.01 || Math.abs(A.moveY) > 0.01)) {
      axX = A.moveX;
      axY = A.moveY;
    } else if (rightGP?.axes?.length >= 2) {
      axX = rightGP.axes[0] || 0;
      axY = rightGP.axes[1] || 0;
      if (rightGP.axes.length >= 4) {
        const a0 = Math.abs(rightGP.axes[0]) + Math.abs(rightGP.axes[1]);
        const a1 = Math.abs(rightGP.axes[2]) + Math.abs(rightGP.axes[3]);
        if (a1 > a0 + 0.02) { axX = rightGP.axes[2] || 0; axY = rightGP.axes[3] || 0; }
      }
    }

    axX = inDeadzone(axX, state.deadzone);
    axY = inDeadzone(axY, state.deadzone);

    getYawForward(vForward);
    getYawRight(vRight);

    vMove.set(0,0,0);
    if (axX || axY) {
      vMove.addScaledVector(vRight, axX);
      vMove.addScaledVector(vForward, -axY);
      vMove.normalize();
      rig.position.addScaledVector(vMove, state.moveSpeed * dt);
    }

    // HUD
    hud.textContent =
      `SYNC OK ${BUILD}\n` +
      `secure=${window.isSecureContext} xr=${!!navigator.xr} canvas=${!!canvas}\n` +
      `sources=${srcs.length} L=${leftSrc?.handedness || "none"} R=${rightSrc?.handedness || "none"}\n` +
      `MenuIdx=${state.leftMenuIndex}${state.leftMenuBound ? "" : "?"} Action=${state.actionDown}\n` +
      `Move=HMD-forward  Teleport=RightGrip  Trigger=Action\n` +
      `AndroidPanel=${isAndroid ? "ON" : "OFF"} HUD=${hudVisible}`;

    renderer.render(scene, camera);
  });

  log("READY ✅");
})();
