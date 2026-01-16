// /js/scarlett1/index.js — Scarlett1 Runtime (FULL)
// BUILD: SCARLETT1_FULL_v1_8_XR_NO_BLACKSCREEN
// ✅ Always renders immediately (prevents Quest XR black-screen kickout)
// ✅ World loads async after render loop starts (world errors won't kill XR)
// ✅ Android: touch move/look
// ✅ Quest: lasers + teleport + left stick move + right stick snap 45°
// ✅ HUD shows world/module load status clearly

export function boot() {
  main().catch((e) => fatal(e));
}

const BUILD = "SCARLETT1_FULL_v1_8_XR_NO_BLACKSCREEN";

function hud() { return document.getElementById("scarlett-mini-hud"); }
function writeHud(line) { const el = hud(); if (el) el.textContent += `\n${line}`; }
function fatal(e) {
  const msg = e?.stack || e?.message || String(e);
  console.error("[scarlett1] fatal ❌", msg);
  writeHud(`[ERR] ${msg}`);
}

async function main() {
  // Global traps so Quest doesn't silently die
  window.addEventListener("error", (e) => {
    const msg = e?.error?.stack || e?.message || String(e);
    writeHud(`[ERR] window.error: ${msg}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const msg = e?.reason?.stack || e?.reason?.message || String(e?.reason || e);
    writeHud(`[ERR] unhandledrejection: ${msg}`);
  });

  writeHud("[LOG] scarlett1 starting…");
  writeHud(`build=${BUILD}`);

  const THREE = await import("https://unpkg.com/three@0.158.0/build/three.module.js");
  const { VRButton } = await import("https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js");
  writeHud("[LOG] three loaded ✅");
  writeHud("[LOG] VRButton loaded ✅");

  // Scene (ultra safe)
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 250);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false
  });
  renderer.shadowMap.enabled = false;

  // Cap pixel ratio for Quest stability
  const basePR = Math.min(1.25, window.devicePixelRatio || 1);
  renderer.setPixelRatio(basePR);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  (document.getElementById("app") || document.body).appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));
  writeHud("[LOG] VRButton appended ✅");

  // Basic lighting (cheap)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.95));
  const dir = new THREE.DirectionalLight(0xffffff, 0.65);
  dir.position.set(2, 6, 3);
  scene.add(dir);

  // Rig
  const rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.position.set(0, 1.65, 4.2);
  rig.rotation.set(0, 0, 0);
  rig.add(camera);
  scene.add(rig);

  // Floor (always present so teleport + visuals always exist)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.name = "FLOOR";
  scene.add(floor);

  // Fallback object so you NEVER see pure black in XR
  const fallback = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.4, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.6, metalness: 0.2, emissive: new THREE.Color(0x00333a) })
  );
  fallback.position.set(0, 1.3, 0);
  fallback.name = "FALLBACK_BOX";
  scene.add(fallback);

  // Controls: Android touch + XR controllers
  const touch = installTouchControls({ THREE, camera, rig });
  writeHud(touch.enabled ? "[LOG] Android touch controls ✅" : "[LOG] Android touch controls (no touch device)");

  const xr = installXRControllers({ THREE, scene, rig, renderer, floor });
  writeHud("[LOG] XR lasers+teleport installed ✅");

  const gp = installXRGamepadControls({ THREE, rig, renderer, camera, xr });
  writeHud("[LOG] XR sticks installed ✅");

  // XR lifecycle
  renderer.xr.addEventListener("sessionstart", () => {
    writeHud("[LOG] XR session start ✅");
    renderer.setPixelRatio(1.0); // stabilize in XR
  });

  renderer.xr.addEventListener("sessionend", () => {
    writeHud("[LOG] XR session end ⚠️ (kicked out or exited)");
    renderer.setPixelRatio(basePR);
  });

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ✅ START RENDERING IMMEDIATELY (critical for Quest)
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    try {
      const dt = clock.getDelta();

      // tick world if loaded
      scene.userData.worldTick?.(dt);

      // Android touch movement outside XR
      if (!renderer.xr.isPresenting) touch.update(dt);

      // XR thumbsticks in XR
      if (renderer.xr.isPresenting) gp.update(dt);

      xr.update();
      renderer.render(scene, camera);
    } catch (e) {
      fatal(e);
      try { renderer.xr.getSession?.()?.end(); } catch (_) {}
    }
  });

  writeHud("[LOG] render loop started ✅");

  // ✅ NOW load world async (so world can't kill XR rendering)
  loadWorldAsync();

  async function loadWorldAsync() {
    writeHud("[LOG] world async load starting…");
    try {
      const worldMod = await import(`./world.js?v=WORLD_${Date.now()}`);
      if (typeof worldMod?.buildWorld === "function") {
        worldMod.buildWorld({ THREE, scene, rig, renderer, camera, writeHud });
        // hide fallback once world is in
        fallback.visible = false;
        writeHud("[LOG] world loaded ✅ modules active ✅");
      } else {
        writeHud("[ERR] world.js missing export buildWorld()");
        writeHud("[LOG] using fallback scene only (still playable)");
      }
    } catch (e) {
      writeHud("[ERR] world import failed ❌");
      writeHud("[ERR] " + (e?.stack || e?.message || e));
      writeHud("[LOG] using fallback scene only (still playable)");
    }
  }

  // -----------------------------
  // Touch controls (Android)
  // -----------------------------
  function installTouchControls({ THREE, camera, rig }) {
    const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
    const enabled = !!isTouch;
    if (!enabled) return { enabled: false, update: () => {} };

    const ui = createTouchUI();
    const state = { moveX: 0, moveY: 0, lookX: 0, lookY: 0, yaw: rig.rotation.y || 0, pitch: 0 };

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    function update(dt) {
      const speed = 2.2;
      const turnSpeed = 2.0;

      state.yaw -= state.lookX * turnSpeed * dt;
      state.pitch -= state.lookY * turnSpeed * dt;
      state.pitch = clamp(state.pitch, -1.2, 1.2);

      rig.rotation.y = state.yaw;
      camera.rotation.set(state.pitch, 0, 0);

      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);

      const move = new THREE.Vector3();
      move.addScaledVector(forward, state.moveY);
      move.addScaledVector(right, state.moveX);

      if (move.lengthSq() > 0.0001) {
        move.normalize().multiplyScalar(speed * dt);
        rig.position.add(move);
      }
    }

    ui.onMove = (x, y) => { state.moveX = x; state.moveY = y; };
    ui.onLook = (x, y) => { state.lookX = x; state.lookY = y; };

    return { enabled, update };
  }

  function createTouchUI() {
    const wrap = document.createElement("div");
    wrap.style.cssText = `
      position: fixed; left: 0; top: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 99998;
    `;
    document.body.appendChild(wrap);

    const makePad = (side) => {
      const pad = document.createElement("div");
      pad.style.cssText = `
        position: fixed; bottom: 18px; ${side}: 18px;
        width: 140px; height: 140px; border-radius: 18px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        pointer-events: auto; touch-action: none;
      `;
      wrap.appendChild(pad);
      return pad;
    };

    const left = makePad("left");
    const right = makePad("right");

    const api = { onMove: null, onLook: null };

    bindPad(left, (x, y) => api.onMove && api.onMove(x, y));
    bindPad(right, (x, y) => api.onLook && api.onLook(x, y));

    return api;

    function bindPad(el, cb) {
      let active = false;
      let sx = 0, sy = 0;

      const norm = (dx, dy) => {
        const max = 60;
        const x = Math.max(-max, Math.min(max, dx)) / max;
        const y = Math.max(-max, Math.min(max, dy)) / max;
        return [x, y];
      };

      el.addEventListener("pointerdown", (e) => {
        active = true;
        sx = e.clientX; sy = e.clientY;
        el.setPointerCapture(e.pointerId);
      });

      el.addEventListener("pointermove", (e) => {
        if (!active) return;
        const [x, y] = norm(e.clientX - sx, e.clientY - sy);
        cb(x, -y);
      });

      const end = () => { active = false; cb(0, 0); };
      el.addEventListener("pointerup", end);
      el.addEventListener("pointercancel", end);
      el.addEventListener("pointerleave", end);
    }
  }

  // -----------------------------
  // XR controllers: lasers + teleport
  // -----------------------------
  function installXRControllers({ THREE, scene, rig, renderer, floor }) {
    const raycaster = new THREE.Raycaster();
    const tempMatrix = new THREE.Matrix4();

    const c1 = renderer.xr.getController(0);
    const c2 = renderer.xr.getController(1);
    rig.add(c1);
    rig.add(c2);

    const laserGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);

    function addLaser(ctrl, colorHex) {
      const mat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.9 });
      const line = new THREE.Line(laserGeom, mat);
      line.scale.z = 10;
      ctrl.add(line);
      return line;
    }

    const l1 = addLaser(c1, 0x00e5ff);
    const l2 = addLaser(c2, 0xff2bd6);

    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.28, 32),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    scene.add(marker);

    let aiming = false;
    const hitPoint = new THREE.Vector3();

    function getHit(ctrl) {
      tempMatrix.identity().extractRotation(ctrl.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
      const hits = raycaster.intersectObject(floor, false);
      if (hits.length) { hitPoint.copy(hits[0].point); return true; }
      return false;
    }

    function onSelectStart() { aiming = true; }
    function onSelectEnd(e) {
      if (!aiming) return;
      aiming = false;
      const ctrl = e.target;
      if (getHit(ctrl)) {
        rig.position.x = hitPoint.x;
        rig.position.z = hitPoint.z;
      }
      marker.visible = false;
    }

    c1.addEventListener("selectstart", onSelectStart);
    c1.addEventListener("selectend", onSelectEnd);
    c2.addEventListener("selectstart", onSelectStart);
    c2.addEventListener("selectend", onSelectEnd);

    function update() {
      const inXR = renderer.xr.isPresenting;
      l1.visible = inXR;
      l2.visible = inXR;

      if (!inXR) { marker.visible = false; aiming = false; return; }

      if (aiming) {
        const ok = getHit(c2) || getHit(c1);
        marker.visible = ok;
        if (ok) marker.position.copy(hitPoint);
      } else {
        marker.visible = false;
      }
    }

    return { update, controllers: { c1, c2 } };
  }

  // -----------------------------
  // XR thumbsticks (Quest)
  // -----------------------------
  function installXRGamepadControls({ THREE, rig, renderer, camera, xr }) {
    const MOVE_SPEED = 2.4;
    const DEADZONE = 0.18;
    const SNAP_ANGLE = Math.PI / 4;
    const SNAP_COOLDOWN = 0.22;
    let snapTimer = 0;

    function update(dt) {
      if (!renderer.xr.isPresenting) return;

      snapTimer = Math.max(0, snapTimer - dt);
      const session = renderer.xr.getSession();
      if (!session) return;

      const sources = session.inputSources || [];
      let left = null, right = null;
      for (const s of sources) {
        if (!s?.gamepad) continue;
        if (s.handedness === "left") left = s;
        if (s.handedness === "right") right = s;
      }
      if (!left || !right) {
        const gps = sources.filter(s => s?.gamepad);
        if (!left && gps[0]) left = gps[0];
        if (!right && gps[1]) right = gps[1];
      }

      // Left stick move
      if (left?.gamepad) {
        const { x, y } = readStick(left.gamepad);
        if (Math.abs(x) > DEADZONE || Math.abs(y) > DEADZONE) {
          const yaw = getCameraYaw();
          const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
          const rightv = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
          const move = new THREE.Vector3();
          move.addScaledVector(forward, -y);
          move.addScaledVector(rightv, x);
          if (move.lengthSq() > 0.0001) {
            move.normalize().multiplyScalar(MOVE_SPEED * dt);
            rig.position.add(move);
          }
        }
      }

      // Right stick snap turn
      if (right?.gamepad) {
        const { x } = readStick(right.gamepad);
        if (Math.abs(x) > 0.6 && snapTimer === 0) {
          rig.rotation.y += (x > 0 ? -SNAP_ANGLE : SNAP_ANGLE);
          snapTimer = SNAP_COOLDOWN;
        }
      }
    }

    function readStick(gamepad) {
      const a = gamepad.axes || [];
      let x = 0, y = 0;
      if (a.length >= 4) { x = a[2]; y = a[3]; }
      else if (a.length >= 2) { x = a[0]; y = a[1]; }
      x = (Math.abs(x) < DEADZONE) ? 0 : x;
      y = (Math.abs(y) < DEADZONE) ? 0 : y;
      return { x, y };
    }

    function getCameraYaw() {
      const q = new THREE.Quaternion();
      camera.getWorldQuaternion(q);
      const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
      return e.y;
    }

    return { update };
  }
        }
