// /js/scarlett1/index.js — Scarlett1 Runtime (FULL)
// BUILD: SCARLETT1_FULL_v1_3_CONTROLS_CACHEPROOF
// ✅ Android touch move/look (non-XR)
// ✅ Quest controllers: laser + trigger teleport (XR)
// ✅ NO XRControllerModelFactory (prevents "three" bare import crash)
// ✅ Adds extra diagnostics so we SEE the exact failing import if anything breaks

export function boot() {
  main().catch((e) => {
    console.error("[scarlett1] fatal ❌", e?.stack || e);
    writeHud(`[ERR] ${e?.stack || e?.message || e}`);
  });
}

const BUILD = "SCARLETT1_FULL_v1_3_CONTROLS_CACHEPROOF";
const log = (...a) => console.log("[scarlett1]", ...a);
const err = (...a) => console.error("[scarlett1]", ...a);

function writeHud(line) {
  const el = document.getElementById("scarlett-mini-hud");
  if (!el) return;
  el.textContent += `\n${line}`;
}

async function main() {
  writeHud(`[LOG] scarlett1 starting…`);
  writeHud(`build=${BUILD}`);

  // --- Imports (safe) ---
  let THREE, VRButton;
  try {
    THREE = await import("https://unpkg.com/three@0.158.0/build/three.module.js");
    ({ VRButton } = await import("https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js"));
    writeHud("[LOG] three loaded ✅");
    writeHud("[LOG] VRButton loaded ✅");
  } catch (e) {
    writeHud("[ERR] import failed ❌");
    writeHud("[ERR] " + (e?.stack || e?.message || e));
    throw e;
  }

  // --- Scene ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 200);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  (document.getElementById("app") || document.body).appendChild(renderer.domElement);

  document.body.appendChild(VRButton.createButton(renderer));
  writeHud("[LOG] VRButton appended ✅");

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.0));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(2, 6, 3);
  scene.add(dir);

  // Rig
  const rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.position.set(0, 1.65, 4.2);
  rig.rotation.set(0, 0, 0);
  rig.add(camera);
  scene.add(rig);

  // Floor (teleport target)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
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
      worldMod.buildWorld({ THREE, scene, rig, renderer, camera, log, err, writeHud });
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
  writeHud("[LOG] XR controllers installed ✅");

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Loop
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    if (!renderer.xr.isPresenting) touch.update(dt);
    xr.update();

    renderer.render(scene, camera);
  });

  renderer.xr.addEventListener("sessionstart", () => writeHud("[LOG] XR session start ✅"));
  renderer.xr.addEventListener("sessionend", () => writeHud("[LOG] XR session end ✅"));

  writeHud("[LOG] scarlett1 runtime start ✅");
  log("runtime start ✅", BUILD);

  // -----------------------
  // TOUCH CONTROLS
  // -----------------------
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

  // -----------------------
  // XR CONTROLLERS (laser + teleport)
  // -----------------------
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
    const laserMat = new THREE.LineBasicMaterial();

    const addLaser = (ctrl) => {
      const line = new THREE.Line(laserGeom, laserMat);
      line.name = "laser";
      line.scale.z = 10;
      ctrl.add(line);
      return line;
    };

    const l1 = addLaser(c1);
    const l2 = addLaser(c2);

    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.22, 24),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
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
        aiming = false;
        return;
      }

      if (aiming) {
        const ok = getHit(c1) || getHit(c2);
        marker.visible = ok;
        if (ok) marker.position.copy(hitPoint);
      } else {
        marker.visible = false;
      }
    }

    return { update };
  }
                                                                 }
