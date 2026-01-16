// /js/scarlett1/index.js — Scarlett1 Runtime (FULL)
// BUILD: SCARLETT1_FULL_v1_6_STABLE_XR_STICKS_WATCH
// ✅ Android touch move/look (non-XR)
// ✅ Quest: lasers + teleport (trigger)
// ✅ Quest: left stick smooth move, right stick snap-turn 45°
// ✅ Y button toggles watch menu (3D panel) on left controller
// ✅ Calls scene.userData.worldTick(dt) so world glow pulses
// ✅ Global error traps so Quest won't silently hang

export function boot() {
  main().catch((e) => fatal(e));
}

const BUILD = "SCARLETT1_FULL_v1_6_STABLE_XR_STICKS_WATCH";

function hud() { return document.getElementById("scarlett-mini-hud"); }
function writeHud(line) { const el = hud(); if (el) el.textContent += `\n${line}`; }
function fatal(e) {
  const msg = e?.stack || e?.message || String(e);
  console.error("[scarlett1] fatal ❌", msg);
  writeHud(`[ERR] ${msg}`);
}

async function main() {
  // Hard safety: never silent loader hang
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

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 300);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  (document.getElementById("app") || document.body).appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));
  writeHud("[LOG] VRButton appended ✅");

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.0));
  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(2, 6, 3);
  scene.add(dir);

  // Rig
  const rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.position.set(0, 1.65, 4.2);
  rig.rotation.set(0, 0, 0);
  rig.add(camera);
  scene.add(rig);

  // Fallback floor (teleport target)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.name = "FLOOR";
  scene.add(floor);

  // World
  writeHud("[LOG] importing world.js …");
  try {
    const worldMod = await import(`./world.js?v=WORLD_${Date.now()}`);
    if (worldMod?.buildWorld) {
      worldMod.buildWorld({ THREE, scene, rig, renderer, camera, writeHud });
      writeHud("[LOG] world built ✅");
    } else {
      writeHud("[ERR] world.js missing export buildWorld()");
    }
  } catch (e) {
    writeHud("[ERR] world import failed ❌");
    writeHud("[ERR] " + (e?.stack || e?.message || e));
  }

  // Controls
  const touch = installTouchControls({ THREE, camera, rig });
  if (touch.enabled) writeHud("[LOG] android touch controls ✅");

  const xr = installXRControllers({ THREE, scene, rig, renderer, floor });
  writeHud("[LOG] XR lasers+teleport installed ✅");

  const gp = installXRGamepadControls({ THREE, rig, renderer, camera, xr, writeHud });
  writeHud("[LOG] XR sticks+watch installed ✅");

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.xr.addEventListener("sessionstart", () => {
    writeHud("[LOG] XR session start ✅");
    gp.onSessionStart();
  });
  renderer.xr.addEventListener("sessionend", () => {
    writeHud("[LOG] XR session end ✅");
    gp.onSessionEnd();
  });

  // Loop (wrapped so Quest can't hang silently)
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    try {
      const dt = clock.getDelta();

      // Run world tick if provided (glows/pulses/spins)
      scene.userData.worldTick?.(dt);

      if (!renderer.xr.isPresenting) {
        touch.update(dt);
      } else {
        gp.update(dt);
      }

      xr.update();
      renderer.render(scene, camera);
    } catch (e) {
      fatal(e);
      try { renderer.xr.getSession?.()?.end(); } catch (_) {}
    }
  });

  writeHud("[LOG] scarlett1 runtime start ✅");

  // -----------------------------
  // Android Touch Controls
  // -----------------------------
  function installTouchControls({ THREE, camera, rig }) {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const enabled = !!isTouch;
    const ui = enabled ? createTouchUI() : null;

    const state = { moveX: 0, moveY: 0, lookX: 0, lookY: 0, yaw: rig.rotation.y || 0, pitch: 0 };

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    function applyLook() {
      rig.rotation.y = state.yaw;
      camera.rotation.set(state.pitch, 0, 0);
    }

    function update(dt) {
      if (!enabled) return;

      const speed = 2.2;
      const turnSpeed = 2.0;

      state.yaw -= state.lookX * turnSpeed * dt;
      state.pitch -= state.lookY * turnSpeed * dt;
      state.pitch = clamp(state.pitch, -1.2, 1.2);
      applyLook();

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

    if (ui) {
      ui.onMove = (x, y) => { state.moveX = x; state.moveY = y; };
      ui.onLook = (x, y) => { state.lookX = x; state.lookY = y; };
    }

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

    let moveCb = null, lookCb = null;
    bindPad(left, (x, y) => moveCb && moveCb(x, y));
    bindPad(right, (x, y) => lookCb && lookCb(x, y));

    return { set onMove(fn) { moveCb = fn; }, set onLook(fn) { lookCb = fn; } };

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
  // XR Lasers + Teleport
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
      const mat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.95 });
      const line = new THREE.Line(laserGeom, mat);
      line.scale.z = 12;
      ctrl.add(line);

      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 12, 12),
        new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.95 })
      );
      tip.position.set(0, 0, -1);
      line.add(tip);

      return line;
    }

    const l1 = addLaser(c1, 0x00e5ff);
    const l2 = addLaser(c2, 0xff2bd6);

    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.28, 48),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    scene.add(marker);

    const markerLight = new THREE.PointLight(0x00e5ff, 1.1, 2.5);
    markerLight.visible = false;
    scene.add(markerLight);

    let aiming = false;
    const hitPoint = new THREE.Vector3();

    function getHit(ctrl) {
      tempMatrix.identity().extractRotation(ctrl.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

      const hits = raycaster.intersectObject(floor, false);
      if (hits.length) {
        hitPoint.copy(hits[0].point);
        return true;
      }
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
      markerLight.visible = false;
    }

    c1.addEventListener("selectstart", onSelectStart);
    c1.addEventListener("selectend", onSelectEnd);
    c2.addEventListener("selectstart", onSelectStart);
    c2.addEventListener("selectend", onSelectEnd);

    function update() {
      const inXR = renderer.xr.isPresenting;
      l1.visible = inXR;
      l2.visible = inXR;

      if (!inXR) {
        marker.visible = false;
        markerLight.visible = false;
        aiming = false;
        return;
      }

      if (aiming) {
        const ok = getHit(c2) || getHit(c1);
        marker.visible = ok;
        markerLight.visible = ok;
        if (ok) {
          marker.position.copy(hitPoint);
          markerLight.position.set(hitPoint.x, hitPoint.y + 0.25, hitPoint.z);
        }
      } else {
        marker.visible = false;
        markerLight.visible = false;
      }
    }

    return { update, controllers: { c1, c2 } };
  }

  // -----------------------------
  // XR Gamepad Controls (sticks + watch)
  // -----------------------------
  function installXRGamepadControls({ THREE, rig, renderer, camera, xr, writeHud }) {
    const MOVE_SPEED = 2.5;
    const DEADZONE = 0.18;

    const SNAP_ANGLE = Math.PI / 4;
    const SNAP_COOLDOWN = 0.22;
    let snapTimer = 0;

    let watch = null;
    let lastMenuPressed = false;
    let allowExtras = false;

    function onSessionStart() {
      allowExtras = false;
      setTimeout(() => { allowExtras = true; }, 500);
    }
    function onSessionEnd() {
      allowExtras = false;
      lastMenuPressed = false;
      if (watch) watch.visible = false;
    }

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

      // Attach / create watch lazily and safely
      if (allowExtras && !watch && xr?.controllers?.c1) {
        watch = createWatchPanel({ THREE });
        watch.visible = false;
        xr.controllers.c1.add(watch);
        watch.position.set(-0.06, -0.04, -0.10);
        watch.rotation.set(-0.6, 0.3, 0.2);
        writeHud("[LOG] watch menu ready ✅");
      }

      // Move with left stick
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

        // Y toggles watch (try indices 3/4/5)
        const menuPressed = isMenuPressed(left.gamepad);
        if (menuPressed && !lastMenuPressed) {
          if (watch) watch.visible = !watch.visible;
        }
        lastMenuPressed = menuPressed;
      }

      // Snap turn with right stick X
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

    function isMenuPressed(gamepad) {
      const b = gamepad.buttons || [];
      const idxs = [3, 4, 5];
      for (const i of idxs) {
        if (b[i] && b[i].pressed) return true;
      }
      return false;
    }

    function createWatchPanel({ THREE }) {
      const g = new THREE.Group();
      g.name = "WatchMenu";

      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.18, 0.12),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.92 })
      );

      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 384;
      const ctx2d = canvas.getContext("2d");

      ctx2d.fillStyle = "rgba(0,0,0,0.75)";
      ctx2d.fillRect(0, 0, canvas.width, canvas.height);

      ctx2d.strokeStyle = "rgba(0,229,255,0.6)";
      ctx2d.lineWidth = 6;
      ctx2d.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);

      ctx2d.fillStyle = "rgba(0,229,255,0.95)";
      ctx2d.font = "bold 44px monospace";
      ctx2d.fillText("SCARLETT WATCH", 40, 90);

      ctx2d.fillStyle = "rgba(255,255,255,0.92)";
      ctx2d.font = "28px monospace";
      const lines = [
        "Y: Toggle Watch",
        "Left Stick: Move",
        "Right Stick: Snap Turn 45°",
        "Right Trigger: Teleport"
      ];
      let y = 150;
      for (const line of lines) {
        ctx2d.fillText(line, 40, y);
        y += 44;
      }

      const tex = new THREE.CanvasTexture(canvas);
      plane.material.map = tex;
      plane.material.needsUpdate = true;

      g.add(plane);

      const border = new THREE.Mesh(
        new THREE.PlaneGeometry(0.19, 0.13),
        new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.12 })
      );
      border.position.z = -0.001;
      g.add(border);

      return g;
    }

    return { update, onSessionStart, onSessionEnd };
  }
          }
