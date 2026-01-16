// /js/scarlett1/index.js — Scarlett1 Runtime (FULL)
// BUILD: SCARLETT1_FULL_v1_1_CONTROLS
// Adds: Android touch move/look + Quest XR controllers (laser + teleport) baseline.

export function boot() {
  main().catch((e) => {
    console.error("[scarlett1] fatal ❌", e?.stack || e);
    writeHud(`[ERR] ${e?.stack || e?.message || e}`);
  });
}

const BUILD = "SCARLETT1_FULL_v1_1_CONTROLS";
const log = (...a) => console.log("[scarlett1]", ...a);
const err = (...a) => console.error("[scarlett1]", ...a);

function writeHud(line) {
  const el = document.getElementById("scarlett-mini-hud");
  if (!el) return;
  el.textContent += `\n${line}`;
}

async function main() {
  writeHud(`[LOG] scarlett1 starting… build=${BUILD}`);

  // --- Three.js imports (CDN) ---
  const THREE = await import("https://unpkg.com/three@0.158.0/build/three.module.js");
  const { VRButton } = await import("https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js");
  const { XRControllerModelFactory } = await import("https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRControllerModelFactory.js");

  writeHud("[LOG] three loaded ✅");
  writeHud("[LOG] VRButton loaded ✅");

  // --- Scene setup ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 200);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  const mount = document.getElementById("app") || document.body;
  mount.appendChild(renderer.domElement);

  document.body.appendChild(VRButton.createButton(renderer));
  writeHud("[LOG] VRButton appended ✅");

  // --- Lights ---
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.0));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(2, 6, 3);
  scene.add(dir);

  // --- Player rig ---
  const rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.position.set(0, 1.65, 3.8);
  rig.add(camera);
  scene.add(rig);

  // --- Always-visible floor fallback ---
  const floorGeo = new THREE.PlaneGeometry(60, 60);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 1, metalness: 0 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.name = "FLOOR";
  scene.add(floor);

  // --- Load world module ---
  writeHud("[LOG] importing world.js …");
  const worldMod = await import("./world.js");
  if (worldMod?.buildWorld) {
    worldMod.buildWorld({ THREE, scene, rig, renderer, camera, log, err, writeHud });
    writeHud("[LOG] world built ✅");
  } else {
    writeHud("[ERR] world.js missing export buildWorld()");
  }

  // ====== ANDROID TOUCH CONTROLS (NON-XR) ======
  const touch = installTouchControls({ THREE, camera, rig, renderer });
  if (touch.enabled) writeHud("[LOG] android touch controls ✅");

  // ====== QUEST CONTROLLERS + LASERS + TELEPORT ======
  const xr = installXRControllers({ THREE, scene, rig, renderer, floor });
  writeHud("[LOG] XR controllers installed ✅ (if controllers available)");

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Render loop
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    // Only move with touch when NOT in XR
    if (!renderer.xr.isPresenting) {
      touch.update(dt);
    }

    // XR teleport updates
    xr.update();

    renderer.render(scene, camera);
  });

  if (navigator.xr) {
    renderer.xr.addEventListener("sessionstart", () => writeHud("[LOG] XR session start ✅"));
    renderer.xr.addEventListener("sessionend", () => writeHud("[LOG] XR session end ✅"));
  }

  writeHud("[LOG] scarlett1 runtime start ✅");
  log("runtime start ✅", BUILD);

  // ---- helpers ----

  function installTouchControls({ THREE, camera, rig, renderer }) {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const enabled = isTouch;

    // Create simple on-screen joystick + look pad
    const ui = enabled ? createTouchUI() : null;

    const state = {
      enabled,
      moveX: 0,
      moveY: 0,
      lookX: 0,
      lookY: 0,
      yaw: 0,
      pitch: 0
    };

    // Initialize yaw from rig
    state.yaw = rig.rotation.y;

    // Apply look to camera (pitch) + rig (yaw)
    function applyLook() {
      rig.rotation.y = state.yaw;
      camera.rotation.x = state.pitch;
    }

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    function update(dt) {
      if (!enabled) return;
      const speed = 2.0; // m/s
      const turnSpeed = 1.8; // rad/s

      // Look
      state.yaw -= state.lookX * turnSpeed * dt;
      state.pitch -= state.lookY * turnSpeed * dt;
      state.pitch = clamp(state.pitch, -1.2, 1.2);
      applyLook();

      // Move relative to yaw
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

    // Bind UI
    if (ui) {
      ui.onMove = (x, y) => { state.moveX = x; state.moveY = y; };
      ui.onLook = (x, y) => { state.lookX = x; state.lookY = y; };
    }

    return { enabled, update };
  }

  function createTouchUI() {
    // left joystick (move) + right pad (look)
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

    return {
      set onMove(fn) { moveCb = fn; },
      set onLook(fn) { lookCb = fn; }
    };

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

  function installXRControllers({ THREE, scene, rig, renderer, floor }) {
    const raycaster = new THREE.Raycaster();
    const tempMatrix = new THREE.Matrix4();

    const controllerModelFactory = new XRControllerModelFactory();

    // Grip models
    const grip1 = renderer.xr.getControllerGrip(0);
    grip1.add(controllerModelFactory.createControllerModel(grip1));
    rig.add(grip1);

    const grip2 = renderer.xr.getControllerGrip(1);
    grip2.add(controllerModelFactory.createControllerModel(grip2));
    rig.add(grip2);

    // Controllers (for ray)
    const c1 = renderer.xr.getController(0);
    const c2 = renderer.xr.getController(1);
    rig.add(c1);
    rig.add(c2);

    // Laser visuals
    const laserGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const laserMat = new THREE.LineBasicMaterial();
    function addLaser(ctrl) {
      const line = new THREE.Line(laserGeom, laserMat);
      line.name = "laser";
      line.scale.z = 10;
      ctrl.add(line);
      return line;
    }
    const l1 = addLaser(c1);
    const l2 = addLaser(c2);

    // Teleport target marker
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.22, 24),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    scene.add(marker);

    let aiming = false;
    let hitPoint = new THREE.Vector3();

    function getHitFromController(ctrl) {
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
      if (getHitFromController(ctrl)) {
        // Move rig to the hit point, keep Y (player height)
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
      // Only show teleport marker when in XR and aiming
      if (!renderer.xr.isPresenting) {
        marker.visible = false;
        return;
      }

      if (aiming) {
        // Prefer controller 0 hit, else controller 1
        const ok = getHitFromController(c1) || getHitFromController(c2);
        marker.visible = ok;
        if (ok) marker.position.copy(hitPoint);
      } else {
        marker.visible = false;
      }

      // Keep lasers visible only in XR
      l1.visible = renderer.xr.isPresenting;
      l2.visible = renderer.xr.isPresenting;
    }

    return { update };
  }
                                 }
