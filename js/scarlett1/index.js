/* /js/scarlett1/index.js
   SCARLETT1_INDEX_FULL_v20_0_ORCH_WORLD_ANDROID_DIAG
   - Boots world orchestrator (/js/scarlett1/world.js)
   - Keeps: HMD-forward locomotion, teleport on RIGHT grip, action on RIGHT trigger
   - Adds: permanent Android diag + virtual sticks input channel
*/

(() => {
  const BUILD = "SCARLETT1_INDEX_FULL_v20_0_ORCH_WORLD_ANDROID_DIAG";
  const log = (...a) => console.log(`[${BUILD}]`, ...a);
  const err = (...a) => console.error(`[${BUILD}]`, ...a);

  const THREE = window.THREE;
  if (!THREE) return err("THREE missing. Load three.min.js before this file.");

  // Canvas / renderer
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

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 2500);
  const rig = new THREE.Group();
  rig.add(camera);
  scene.add(rig);

  // HUD (HTML)
  const hud = document.getElementById("scarlettHud") || (() => {
    const d = document.createElement("div");
    d.id = "scarlettHud";
    d.style.cssText = `
      position:fixed;left:10px;top:10px;z-index:99999;
      font-family:ui-monospace,Menlo,Consolas,monospace;
      font-size:12px;line-height:1.3;
      padding:8px 10px;border-radius:10px;
      background:rgba(0,0,0,.55);color:#fff;
      max-width: 380px; user-select:none; white-space:pre;
    `;
    document.body.appendChild(d);
    return d;
  })();

  let hudVisible = true;
  function setHudVisible(v) {
    hudVisible = !!v;
    hud.style.display = hudVisible ? "block" : "none";
  }

  const HUD = (s) => {
    // single-line append style (keeps last ~14 lines)
    const lines = (hud.textContent || "").split("\n").slice(-14);
    lines.push(String(s));
    hud.textContent = lines.join("\n");
  };

  // ENTER VR button
  const xrBtn = document.getElementById("enterVrBtn") || (() => {
    const b = document.createElement("button");
    b.id = "enterVrBtn";
    b.textContent = "ENTER VR";
    b.style.cssText = `
      position:fixed;right:12px;top:12px;z-index:99999;
      padding:10px 14px;border-radius:12px;border:0;
      font-weight:800; letter-spacing:.5px;
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
        log("XR session started ✅");
      } catch (e) {
        err("ENTER VR failed:", e);
      }
    };
    document.body.appendChild(b);
    return b;
  })();

  // ---------- PERMANENT ANDROID DIAGNOSTICS + VIRTUAL STICKS ----------
  // This is always on for Android/mobile; optional on desktop.
  // Exposes: window.__scarlettAndroidInput = { moveX, moveY, turnX, turnY, action, teleport }
  (function androidDiagAndSticks() {
    const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    window.__scarlettAndroidInput = window.__scarlettAndroidInput || {
      moveX: 0, moveY: 0, turnX: 0, turnY: 0,
      action: false, teleport: false
    };

    // Always create diag panel on mobile
    if (!isMobile) return;

    const panel = document.getElementById("scarlettAndroidDiag") || (() => {
      const d = document.createElement("div");
      d.id = "scarlettAndroidDiag";
      d.style.cssText = `
        position:fixed;left:10px;right:10px;bottom:10px;z-index:999999;
        background:rgba(0,0,0,.72);color:#fff;border-radius:14px;
        padding:10px;font-family:ui-monospace,Menlo,Consolas,monospace;
        font-size:12px;line-height:1.25;
      `;
      d.innerHTML = `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;align-items:center">
          <button id="btnModTest" style="padding:8px 10px;border:0;border-radius:12px;background:#e91e63;color:#fff;font-weight:900">MODULE TEST</button>
          <button id="btnCopy" style="padding:8px 10px;border:0;border-radius:12px;background:#e91e63;color:#fff;font-weight:900">COPY</button>
          <button id="btnHideHud" style="padding:8px 10px;border:0;border-radius:12px;background:#444;color:#fff;font-weight:900">HIDE HUD</button>
          <button id="btnAction" style="padding:8px 10px;border:0;border-radius:12px;background:#1976d2;color:#fff;font-weight:900">ACTION</button>
          <button id="btnTeleport" style="padding:8px 10px;border:0;border-radius:12px;background:#0097a7;color:#fff;font-weight:900">TELEPORT</button>
        </div>
        <div style="display:flex;justify-content:space-between;gap:10px">
          <div id="joyL" style="width:44vw;max-width:220px;height:160px;border-radius:14px;background:rgba(255,255,255,.06);position:relative;touch-action:none"></div>
          <div id="joyR" style="width:44vw;max-width:220px;height:160px;border-radius:14px;background:rgba(255,255,255,.06);position:relative;touch-action:none"></div>
        </div>
        <pre id="andLog" style="margin:10px 0 0 0;white-space:pre-wrap;word-break:break-word;background:rgba(255,255,255,.06);padding:10px;border-radius:12px;max-height:20vh;overflow:auto"></pre>
      `;
      document.body.appendChild(d);
      return d;
    })();

    const andLog = panel.querySelector("#andLog");
    const write = (s) => {
      const lines = (andLog.textContent || "").split("\n").slice(-60);
      lines.push(String(s));
      andLog.textContent = lines.join("\n");
      andLog.scrollTop = andLog.scrollHeight;
    };
    write(`ANDROID DIAG ✅ build=${BUILD}`);
    write(`ua=${navigator.userAgent}`);

    panel.querySelector("#btnHideHud").onclick = () => {
      setHudVisible(!hudVisible);
      panel.querySelector("#btnHideHud").textContent = hudVisible ? "HIDE HUD" : "SHOW HUD";
    };

    panel.querySelector("#btnModTest").onclick = async () => {
      write("MODULE TEST pressed…");
      try {
        if (typeof window.__scarlettRunModuleTest === "function") {
          const rep = await window.__scarlettRunModuleTest();
          write("MODULE TEST done ✅");
          write(JSON.stringify(rep, null, 2));
        } else {
          write("No __scarlettRunModuleTest() yet ❌");
        }
      } catch (e) {
        write(`MODULE TEST error ❌ ${e?.message || e}`);
      }
    };

    panel.querySelector("#btnCopy").onclick = async () => {
      try {
        const text = `=== SCARLETT ANDROID DIAG ===\n${andLog.textContent}\n\n=== HUD ===\n${hud.textContent}\n`;
        await navigator.clipboard.writeText(text);
        write("Copied ✅");
      } catch (e) {
        write(`Copy failed ❌ ${e?.message || e}`);
      }
    };

    // ACTION / TELEPORT as “hold” buttons (touchstart = down, touchend = up)
    const bindHold = (sel, key) => {
      const b = panel.querySelector(sel);
      const down = (ev) => { ev.preventDefault(); window.__scarlettAndroidInput[key] = true; };
      const up = (ev) => { ev.preventDefault(); window.__scarlettAndroidInput[key] = false; };
      b.addEventListener("touchstart", down, { passive: false });
      b.addEventListener("touchend", up, { passive: false });
      b.addEventListener("touchcancel", up, { passive: false });
    };
    bindHold("#btnAction", "action");
    bindHold("#btnTeleport", "teleport");

    // Joystick helper
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

    makeJoystick(panel.querySelector("#joyL"), "moveX", "moveY");
    makeJoystick(panel.querySelector("#joyR"), "turnX", "turnY");
  })();

  // ---------- CONTROLLERS (XR) ----------
  const controllerL = renderer.xr.getController(0);
  const controllerR = renderer.xr.getController(1);
  rig.add(controllerL, controllerR);

  // Teleport visuals forced to RIGHT controller only
  const teleportRay = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]),
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
  };

  function inDeadzone(v, dz) { return Math.abs(v) < dz ? 0 : v; }

  function getYawForward(out) {
    camera.getWorldDirection(out);
    out.y = 0;
    out.normalize();
    return out;
  }

  function getYawRight(out) {
    getYawForward(out);
    const x = out.x, z = out.z;
    out.set(z, 0, -x).normalize();
    return out;
  }

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
    const cands = [3, 2, 4, 5]; // prefer Y then X
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

  // Floor reference for teleport hits: pulled from world once booted
  let worldFloor = null;
  let worldUpdate = null;

  function computeTeleportHit() {
    if (!worldFloor) return false;
    tmpMat4.identity().extractRotation(controllerR.matrixWorld);
    tmpOrigin.setFromMatrixPosition(controllerR.matrixWorld);
    tmpDir.set(0, 0, -1).applyMatrix4(tmpMat4).normalize();
    raycaster.ray.origin.copy(tmpOrigin);
    raycaster.ray.direction.copy(tmpDir);

    const hits = raycaster.intersectObject(worldFloor, false);
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

  function startTeleportAim() {
    state.teleportAiming = true;
    teleportRay.visible = true;
    halo.visible = true;
    computeTeleportHit();
  }

  function stopTeleportAim(teleportIfValid = true) {
    state.teleportAiming = false;
    teleportRay.visible = false;
    halo.visible = false;
    teleportReticle.visible = false;

    if (teleportIfValid && state.teleportValid) {
      camera.getWorldPosition(camPos);
      const offset = new THREE.Vector3(camPos.x - rig.position.x, 0, camPos.z - rig.position.z);
      rig.position.set(
        state.teleportPoint.x - offset.x,
        rig.position.y,
        state.teleportPoint.z - offset.z
      );
    }
  }

  // Boot world orchestrator
  (async () => {
    try {
      HUD(`boot: ${BUILD}`);
      const mod = await import("./world.js");
      const DIAG = (...a) => console.log("[diag]", ...a);

      const world = await mod.bootWorld({ THREE, scene, rig, camera, renderer, HUD, DIAG });
      worldUpdate = world?.update || null;

      worldFloor = scene.getObjectByName("SCARLETT_FLOOR") || null;

      HUD("world: orchestrator ready ✅");
      log("world orchestrator loaded ✅");
    } catch (e) {
      err("world boot failed ❌", e);
      HUD(`world boot failed ❌ ${e?.message || e}`);
    }
  })();

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

    // Update modules
    if (typeof worldUpdate === "function") worldUpdate(dt);

    // XR inputs
    const session = renderer.xr.getSession?.();
    const srcs = session?.inputSources || [];

    let leftGP = null, rightGP = null, leftSrc = null, rightSrc = null;

    for (const s of srcs) {
      if (!s?.gamepad) continue;
      if (s.handedness === "left") { leftSrc = s; leftGP = s.gamepad; }
      if (s.handedness === "right") { rightSrc = s; rightGP = s.gamepad; }
    }

    // Menu toggle (LEFT Y with auto-bind fallback)
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

    // Teleport on RIGHT grip + action on RIGHT trigger
    if (rightGP?.buttons?.length) {
      if (pressedEdge(rightGP.buttons, state.prevButtonsR, state.rightGripIndex)) startTeleportAim();
      if (state.teleportAiming) computeTeleportHit();
      if (releasedEdge(rightGP.buttons, state.prevButtonsR, state.rightGripIndex)) stopTeleportAim(true);

      if (pressedEdge(rightGP.buttons, state.prevButtonsR, state.rightTriggerIndex)) onActionDown();
      if (releasedEdge(rightGP.buttons, state.prevButtonsR, state.rightTriggerIndex)) onActionUp();
    }

    // Movement:
    // XR: right stick; Android: virtual joystick (always available)
    let axX = 0, axY = 0;

    // Android virtual stick (move)
    const A = window.__scarlettAndroidInput;
    const hasAndroidMove = !!(A && (Math.abs(A.moveX) > 0.01 || Math.abs(A.moveY) > 0.01));
    if (hasAndroidMove) {
      axX = A.moveX;
      axY = A.moveY;
    } else if (rightGP?.axes?.length >= 2) {
      // XR stick
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

    vMove.set(0, 0, 0);
    if (axX || axY) {
      vMove.addScaledVector(vRight, axX);
      vMove.addScaledVector(vForward, -axY);
      vMove.normalize();
      rig.position.addScaledVector(vMove, state.moveSpeed * dt);
    }

    // Android “teleport” hold button can reuse teleport aim:
    if (A?.teleport) {
      if (!state.teleportAiming) startTeleportAim();
      if (state.teleportAiming) computeTeleportHit();
    } else if (!A?.teleport && state.teleportAiming && !rightGP) {
      // If in Android mode and we were aiming, release teleports
      stopTeleportAim(true);
    }

    // HUD top lines (keep it informative)
    hud.textContent =
      `SYNC OK ${BUILD}\n` +
      `secure=${window.isSecureContext} xr=${!!navigator.xr} canvas=${!!canvas}\n` +
      `sources=${srcs.length} L=${leftSrc?.handedness || "none"} R=${rightSrc?.handedness || "none"}\n` +
      `LeftMenuIdx=${state.leftMenuIndex}${state.leftMenuBound ? "" : "?"}  Action=${state.actionDown}\n` +
      `Move=HMD-forward  Teleport=RightGrip  Trigger=Action\n` +
      `AndroidStick=${!!window.__scarlettAndroidInput ? "ON" : "OFF"}  HUD=${hudVisible}`;

    renderer.render(scene, camera);
  });

  log("READY ✅");
})();
