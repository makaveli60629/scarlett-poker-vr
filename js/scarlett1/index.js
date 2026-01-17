/* /js/scarlett1/index.js
   SCARLETT1_INDEX_FULL_v19_0_WORLD_START_CONTROLS_FINAL
   - Right grip teleport (halo+ray on RIGHT only)
   - Right trigger action (grab hook)
   - Left Y menu toggle (robust + auto-bind)
   - Movement relative to HMD forward (yaw)
   - Modular world bootstrap + self-test hooks
*/

(() => {
  const BUILD = "SCARLETT1_INDEX_FULL_v19_0_WORLD_START_CONTROLS_FINAL";
  const log = (...a) => console.log(`[${BUILD}]`, ...a);
  const warn = (...a) => console.warn(`[${BUILD}]`, ...a);
  const err = (...a) => console.error(`[${BUILD}]`, ...a);

  // --- THREE bootstrap (three.min.js is already loaded globally in your HTML) ---
  const THREE = window.THREE;
  if (!THREE) {
    err("THREE not found on window. Make sure three.min.js is loaded before this file.");
    return;
  }

  // --- Basic DOM/canvas ---
  const canvas = document.querySelector("canvas") || (() => {
    const c = document.createElement("canvas");
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.appendChild(c);
    return c;
  })();

  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  // --- Scene / Camera / Rig ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080a);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 2000);

  // Player rig: move this for locomotion/teleport (camera is driven by XR pose)
  const rig = new THREE.Group();
  rig.position.set(0, 0, 0);
  rig.add(camera);
  scene.add(rig);

  // --- Lights (so world is never black even at night) ---
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.9);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 2);
  scene.add(dir);

  // --- Floor (guaranteed) ---
  const floorGeo = new THREE.PlaneGeometry(200, 200);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1b1e24, roughness: 1, metalness: 0 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = false;
  floor.name = "SCARLETT_FLOOR";
  scene.add(floor);

  // --- Minimal world “start up” placeholder (you can swap later to world.js/modules) ---
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 0.08, 48),
    new THREE.MeshStandardMaterial({ color: 0x173a2a, roughness: 0.9 })
  );
  table.position.set(0, 0.75, -1.2);
  scene.add(table);

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.05, 16, 64),
    new THREE.MeshStandardMaterial({ color: 0x2b1c12, roughness: 0.8 })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.copy(table.position).add(new THREE.Vector3(0, 0.06, 0));
  scene.add(rail);

  // --- Simple HUD (HTML overlay) ---
  const hud = document.getElementById("scarlettHud") || (() => {
    const d = document.createElement("div");
    d.id = "scarlettHud";
    d.style.cssText = `
      position:fixed;left:10px;top:10px;z-index:99999;
      font-family:ui-monospace,Menlo,Consolas,monospace;
      font-size:12px;line-height:1.3;
      padding:8px 10px;border-radius:10px;
      background:rgba(0,0,0,.55);color:#fff;
      max-width: 360px; user-select:none; white-space:pre;
    `;
    document.body.appendChild(d);
    return d;
  })();

  let hudVisible = true;
  function setHudVisible(v) {
    hudVisible = !!v;
    hud.style.display = hudVisible ? "block" : "none";
  }

  // --- XR Button (simple, no external dependency) ---
  const xrBtn = document.getElementById("enterVrBtn") || (() => {
    const b = document.createElement("button");
    b.id = "enterVrBtn";
    b.textContent = "ENTER VR";
    b.style.cssText = `
      position:fixed;right:12px;top:12px;z-index:99999;
      padding:10px 14px;border-radius:12px;border:0;
      font-weight:700; letter-spacing:.5px;
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

  // --- Controllers ---
  const controllerL = renderer.xr.getController(0);
  const controllerR = renderer.xr.getController(1);
  rig.add(controllerL);
  rig.add(controllerR);

  // Teleport visuals: ALWAYS attach to RIGHT controller only
  const rayMat = new THREE.LineBasicMaterial({ color: 0x00e5ff });
  const rayGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
  const teleportRay = new THREE.Line(rayGeom, rayMat);
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

  // --- Input state ---
  const state = {
    left: { src: null, gp: null },
    right: { src: null, gp: null },
    // Button indices (robust)
    leftMenuIndex: 3,         // common Y
    leftMenuBound: false,     // becomes true once we confirm a working index
    rightGripIndex: 1,        // common grip
    rightTriggerIndex: 0,     // common trigger
    // Edge detect
    prevButtonsL: [],
    prevButtonsR: [],
    // Locomotion
    moveSpeed: 2.0,           // m/s
    deadzone: 0.18,
    // Teleport
    teleportAiming: false,
    teleportValid: false,
    teleportPoint: new THREE.Vector3(),
    // Action
    actionDown: false,
  };

  function inDeadzone(v, dz) {
    return Math.abs(v) < dz ? 0 : v;
  }

  function getYawForward(outVec3) {
    // Always use camera yaw as forward (wherever you're looking is forward)
    camera.getWorldDirection(outVec3);
    outVec3.y = 0;
    outVec3.normalize();
    return outVec3;
  }

  function getYawRight(outVec3) {
    // Right vector in XZ plane
    getYawForward(outVec3);
    const x = outVec3.x, z = outVec3.z;
    outVec3.set(z, 0, -x); // rotate 90 deg
    outVec3.normalize();
    return outVec3;
  }

  function updateInputSources() {
    const session = renderer.xr.getSession?.();
    if (!session) return;

    let leftSrc = null, rightSrc = null;

    for (const src of session.inputSources) {
      if (!src) continue;
      if (!src.gamepad) continue;
      if (src.handedness === "left") leftSrc = src;
      else if (src.handedness === "right") rightSrc = src;
    }

    // Fallback: if handedness is weird, just pick by order
    // (Quest usually gives correct handedness, but we keep it safe)
    if (!leftSrc || !rightSrc) {
      const gps = session.inputSources.filter(s => s && s.gamepad);
      if (!leftSrc && gps[0]) leftSrc = gps[0];
      if (!rightSrc && gps[1]) rightSrc = gps[1] || gps[0];
    }

    state.left.src = leftSrc;
    state.right.src = rightSrc;
    state.left.gp = leftSrc?.gamepad || null;
    state.right.gp = rightSrc?.gamepad || null;
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

  function anyFaceButtonEdgeLeft() {
    // Face buttons commonly: 2,3,4,5. We avoid trigger(0) + grip(1).
    const buttons = state.left.gp?.buttons;
    if (!buttons) return null;
    const candidates = [3, 2, 4, 5]; // prefer Y(3) then X(2)
    for (const idx of candidates) {
      const b = buttons[idx];
      const prev = state.prevButtonsL[idx] || false;
      const now = !!(b && (b.pressed || b.value > 0.75));
      state.prevButtonsL[idx] = now;
      if (now && !prev) return idx;
    }
    return null;
  }

  function menuToggle() {
    // Your menu system can plug in here later
    setHudVisible(!hudVisible);
  }

  function onActionDown() {
    // Hook for grabbing cards, interacting, etc.
    state.actionDown = true;
    // placeholder feedback
    // log("ACTION DOWN");
  }
  function onActionUp() {
    state.actionDown = false;
    // log("ACTION UP");
  }

  function computeTeleportHitFromRightController() {
    // Ray from RIGHT controller forward (-Z in local space)
    tmpMat4.identity().extractRotation(controllerR.matrixWorld);

    tmpOrigin.setFromMatrixPosition(controllerR.matrixWorld);
    tmpDir.set(0, 0, -1).applyMatrix4(tmpMat4).normalize();

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
    } else {
      state.teleportValid = false;
      teleportReticle.visible = false;
      return false;
    }
  }

  function startTeleportAim() {
    state.teleportAiming = true;
    teleportRay.visible = true;
    halo.visible = true;
    computeTeleportHitFromRightController();
  }

  function stopTeleportAim(teleportIfValid = true) {
    state.teleportAiming = false;
    teleportRay.visible = false;
    halo.visible = false;
    teleportReticle.visible = false;

    if (teleportIfValid && state.teleportValid) {
      // Keep current head height, move rig so the camera ends up at target
      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);

      // offset between rig and camera in XZ
      const offset = new THREE.Vector3(camPos.x - rig.position.x, 0, camPos.z - rig.position.z);

      rig.position.set(
        state.teleportPoint.x - offset.x,
        rig.position.y, // keep floor reference stable (local-floor handles head height)
        state.teleportPoint.z - offset.z
      );
    }
  }

  // --- Resize ---
  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  // --- XR loop ---
  const vForward = new THREE.Vector3();
  const vRight = new THREE.Vector3();
  const vMove = new THREE.Vector3();

  let lastT = performance.now();

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    // Update XR input sources
    updateInputSources();

    // Read gamepads
    const gpL = state.left.gp;
    const gpR = state.right.gp;

    // Menu toggle (LEFT Y) – robust:
    // 1) try configured index (default 3)
    // 2) if not bound yet, auto-bind to first face-button press on left
    if (gpL?.buttons?.length) {
      // If we already bound a working index, use it
      if (state.leftMenuBound) {
        if (pressedEdge(gpL.buttons, state.prevButtonsL, state.leftMenuIndex)) {
          menuToggle();
        }
      } else {
        // Try default Y first
        const yPressed = pressedEdge(gpL.buttons, state.prevButtonsL, state.leftMenuIndex);
        if (yPressed) {
          state.leftMenuBound = true;
          menuToggle();
        } else {
          // Auto-bind to any face button edge
          const idx = anyFaceButtonEdgeLeft();
          if (idx !== null) {
            state.leftMenuIndex = idx;
            state.leftMenuBound = true;
            menuToggle();
            log("Left menu auto-bound to button index:", idx);
          }
        }
      }
    }

    // Teleport on RIGHT grip
    if (gpR?.buttons?.length) {
      const gripDown = pressedEdge(gpR.buttons, state.prevButtonsR, state.rightGripIndex);
      const gripUp = releasedEdge(gpR.buttons, state.prevButtonsR, state.rightGripIndex);

      if (gripDown) startTeleportAim();
      if (state.teleportAiming) computeTeleportHitFromRightController();
      if (gripUp) stopTeleportAim(true);

      // Action on RIGHT trigger
      const trigDown = pressedEdge(gpR.buttons, state.prevButtonsR, state.rightTriggerIndex);
      const trigUp = releasedEdge(gpR.buttons, state.prevButtonsR, state.rightTriggerIndex);
      if (trigDown) onActionDown();
      if (trigUp) onActionUp();
    }

    // Locomotion on RIGHT stick (axes)
    // Common mapping: axes[2]=x, axes[3]=y on some; but on many WebXR gamepads: axes[0]=x, axes[1]=y.
    // We’ll detect best candidate by using whichever pair exists and changes.
    let axX = 0, axY = 0;
    if (gpR?.axes?.length >= 2) {
      // Prefer first pair
      axX = gpR.axes[0] || 0;
      axY = gpR.axes[1] || 0;

      // If a second pair exists and looks more “alive”, use it
      if (gpR.axes.length >= 4) {
        const a0 = Math.abs(gpR.axes[0]) + Math.abs(gpR.axes[1]);
        const a1 = Math.abs(gpR.axes[2]) + Math.abs(gpR.axes[3]);
        if (a1 > a0 + 0.02) {
          axX = gpR.axes[2] || 0;
          axY = gpR.axes[3] || 0;
        }
      }
    }

    axX = inDeadzone(axX, state.deadzone);
    axY = inDeadzone(axY, state.deadzone);

    // Move relative to HMD yaw (camera forward is always forward)
    // Stick forward is usually -Y
    getYawForward(vForward);
    getYawRight(vRight);

    vMove.set(0, 0, 0);
    if (axX || axY) {
      vMove.addScaledVector(vRight, axX);
      vMove.addScaledVector(vForward, -axY);
      vMove.normalize();

      const speed = state.moveSpeed;
      rig.position.addScaledVector(vMove, speed * dt);
    }

    // HUD text
    const session = renderer.xr.getSession?.();
    const srcCount = session?.inputSources?.length ?? 0;

    let lInfo = "L: none";
    if (state.left.src && gpL) {
      const pressed = [];
      gpL.buttons?.forEach((b, i) => {
        if (b && (b.pressed || b.value > 0.75)) pressed.push(i);
      });
      lInfo = `L: gp ✅ hand=${state.left.src.handedness} menuIdx=${state.leftMenuIndex}${state.leftMenuBound ? "" : "?"} pressed=[${pressed.join(",")}]`;
    }

    let rInfo = "R: none";
    if (state.right.src && gpR) {
      const pressed = [];
      gpR.buttons?.forEach((b, i) => {
        if (b && (b.pressed || b.value > 0.75)) pressed.push(i);
      });
      rInfo = `R: gp ✅ hand=${state.right.src.handedness} gripIdx=${state.rightGripIndex} trigIdx=${state.rightTriggerIndex} pressed=[${pressed.join(",")}]`;
    }

    hud.textContent =
      `SYNC OK ${BUILD}\n` +
      `secure=${window.isSecureContext} xr=${!!navigator.xr} canvas=${!!canvas}\n` +
      `ua=${navigator.userAgent}\n` +
      `sources=${srcCount}\n` +
      `${lInfo}\n` +
      `${rInfo}\n` +
      `Right stick = move (HMD-forward)\n` +
      `Right Grip = teleport hold/release\n` +
      `Right Trigger = action\n` +
      `Left Y = menu toggle (auto-bind fallback)\n` +
      `HUD visible=${hudVisible}`;

    renderer.render(scene, camera);
  });

  // --- Kickoff log ---
  log("READY ✅");
  log("Right stick = move (HMD-forward)");
  log("Left Y = menu toggle (robust)");
  log("Right Grip = teleport hold/release (halo+ray right)");
  log("Right Trigger = action");

})();
