// /js/index.js — Scarlett MASTER Runtime (FAIL-SAFE, VRButton ALWAYS, VIP SPAWN)
// Uses /js/three.js wrapper: exports { THREE, VRButton }

import { THREE, VRButton } from "./three.js";

const VERSION = Date.now();
const log = (...a) => console.log(...a);

// ---------- UI: on-screen log/status ----------
function makeStatus() {
  const el = document.createElement("div");
  el.id = "scarlettStatus";
  el.style.cssText = `
    position:fixed;left:12px;top:12px;z-index:999999;
    font:13px/1.35 system-ui,Segoe UI,Roboto,Arial;
    color:#d7e6ff;background:rgba(0,0,0,.62);
    padding:10px 12px;border-radius:14px;max-width:88vw;
    box-shadow: 0 10px 30px rgba(0,0,0,.35);
    white-space:pre-wrap;
  `;
  el.textContent = "[index] booting…";
  document.body.appendChild(el);
  return (t) => (el.textContent = t);
}
const setStatus = makeStatus();

// ---------- base path helper ----------
const BASE = (() => {
  // supports github pages subfolder
  const p = location.pathname;
  if (p.includes("/scarlett-poker-vr/")) return "/scarlett-poker-vr/";
  return "/";
})();

setStatus(`[index] runtime start ✅ base=${BASE}`);

const S = {
  THREE,
  BASE,
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  player: null,      // player rig (Group)
  head: null,        // camera parent
  controllers: [],   // { obj, ray, line, grip, gamepad }
  pads: [],          // teleport pads registered by world
  world: null,
};

// ---------- safe import ----------
async function safeImport(path) {
  try {
    return await import(`${path}?v=${VERSION}`);
  } catch (e) {
    console.warn("[safeImport] failed:", path, e);
    return null;
  }
}

// ---------- core init ----------
(async function init() {
  try {
    // renderer
    S.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    S.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    S.renderer.setSize(innerWidth, innerHeight);
    S.renderer.xr.enabled = true;
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.style.background = "#05060a";
    document.body.appendChild(S.renderer.domElement);

    // VRButton ALWAYS
    document.body.appendChild(VRButton.createButton(S.renderer));
    log("[index] VRButton appended ✅");

    // scene/camera
    S.scene = new THREE.Scene();
    S.scene.fog = new THREE.Fog(0x05060a, 8, 80);

    S.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.01, 300);

    // Player rig (standing default)
    S.player = new THREE.Group();
    S.player.name = "PlayerRig";
    S.player.position.set(0, 0, 0);

    S.head = new THREE.Group();
    S.head.name = "Head";
    S.head.add(S.camera);
    S.player.add(S.head);
    S.scene.add(S.player);

    // clock
    S.clock = new THREE.Clock();

    // lighting baseline so you never see black
    const amb = new THREE.AmbientLight(0xffffff, 0.8);
    S.scene.add(amb);
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(6, 10, 4);
    S.scene.add(key);

    // controllers + lasers
    setupControllers();

    // WORLD INIT watchdog — NEVER hang the render loop
    S.renderer.setAnimationLoop(tick);

    setStatus("[index] importing world.js…");
    const worldMod = await safeImport("./world.js");
    if (!worldMod?.World?.init) throw new Error("world.js missing export World.init");

    S.world = worldMod.World;

    setStatus("[index] World.init()…");
    const WORLD_TIMEOUT_MS = 12000;

    let timedOut = false;
    await Promise.race([
      (async () => {
        await S.world.init({
          THREE,
          scene: S.scene,
          renderer: S.renderer,
          camera: S.camera,
          player: S.player,
          controllers: S.controllers,
          log: (...a) => console.log("[world]", ...a),
          BASE,
          registerTeleportPad: (pad) => S.pads.push(pad),
          setSpawn: (pos, yawRad = 0) => {
            // yaw rotate player rig
            S.player.position.copy(pos);
            S.player.rotation.set(0, yawRad, 0);
          },
        });
        if (!timedOut) setStatus("[index] world init ✅ (running)");
      })(),
      new Promise((resolve) =>
        setTimeout(() => {
          timedOut = true;
          setStatus("[index] WORLD INIT TIMEOUT ❌ (scene still running)\n→ world.js has a hanging await/import");
          resolve();
        }, WORLD_TIMEOUT_MS)
      ),
    ]);

    addResize();

  } catch (e) {
    console.error(e);
    setStatus(`[index] init FAILED ❌\n${e?.message || e}`);
  }
})();

// ---------- controllers ----------
function setupControllers() {
  const makeLaser = () => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
    const m = new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.9 });
    const line = new THREE.Line(g, m);
    line.name = "laser";
    line.scale.z = 8;
    return line;
  };

  for (let i = 0; i < 2; i++) {
    const c = S.renderer.xr.getController(i);
    c.name = `Controller${i}`;
    c.userData.index = i;

    const laser = makeLaser();
    c.add(laser);

    // cursor dot
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x7fe7ff })
    );
    dot.position.z = -1;
    dot.visible = false;
    c.add(dot);

    c.addEventListener("selectstart", () => onSelectStart(i));
    S.scene.add(c);

    S.controllers.push({ obj: c, laser, dot });
  }

  log("[index] controllers ready ✅");
}

// ---------- teleport selection ----------
const raycaster = new THREE.Raycaster();
const tempMat = new THREE.Matrix4();
const tempDir = new THREE.Vector3();

function onSelectStart(handIndex) {
  const ctrl = S.controllers[handIndex];
  if (!ctrl) return;

  // build ray from controller
  tempMat.identity().extractRotation(ctrl.obj.matrixWorld);
  tempDir.set(0, 0, -1).applyMatrix4(tempMat).normalize();
  const origin = new THREE.Vector3().setFromMatrixPosition(ctrl.obj.matrixWorld);
  raycaster.set(origin, tempDir);

  // intersect pads
  const padMeshes = S.pads.map((p) => p.mesh).filter(Boolean);
  const hits = raycaster.intersectObjects(padMeshes, false);
  if (!hits?.length) return;

  const hit = hits[0].object;
  const pad = S.pads.find((p) => p.mesh === hit);
  if (!pad) return;

  // teleport: set player rig to target
  if (pad.target) {
    S.player.position.copy(pad.target);
    if (typeof pad.yaw === "number") S.player.rotation.y = pad.yaw;
    console.log("[teleport] ->", pad.name, pad.target.toArray());
  }
}

// ---------- locomotion (sticks) ----------
function applyLocomotion(dt) {
  // Quest/VR controllers: inputSources contain gamepads
  const session = S.renderer.xr.getSession?.();
  if (!session) return;

  // gather gamepads
  const sources = session.inputSources || [];
  let left = null, right = null;

  for (const src of sources) {
    if (!src?.gamepad) continue;
    // heuristics: left = handedness left
    if (src.handedness === "left") left = src.gamepad;
    if (src.handedness === "right") right = src.gamepad;
  }

  // move with left stick
  if (left?.axes?.length >= 2) {
    const x = dead(left.axes[0]);
    const y = dead(left.axes[1]);

    // FIX: forward should move forward (invert y because many pads give -1 forward)
    const forward = -y;
    const strafe = x;

    const speed = 2.2; // m/s
    const move = new THREE.Vector3(strafe, 0, -forward).multiplyScalar(speed * dt);

    // rotate move by player yaw
    move.applyAxisAngle(new THREE.Vector3(0, 1, 0), S.player.rotation.y);
    S.player.position.add(move);
  }

  // rotate with right stick (snap-ish smooth)
  if (right?.axes?.length >= 2) {
    const rx = dead(right.axes[0]);
    const rotSpeed = 1.6; // rad/s
    S.player.rotation.y -= rx * rotSpeed * dt;
  }
}

function dead(v, dz = 0.15) {
  return Math.abs(v) < dz ? 0 : v;
}

// ---------- tick ----------
function tick() {
  const dt = Math.min(S.clock?.getDelta?.() || 0.016, 0.05);

  applyLocomotion(dt);

  // update lasers to show hit dots on pads
  updateLasers();

  // world update if exists
  try {
    S.world?.update?.(dt);
  } catch (e) {
    console.warn("[world.update] error", e);
  }

  S.renderer.render(S.scene, S.camera);
}

function updateLasers() {
  // show dot when aiming at a pad
  const padMeshes = S.pads.map((p) => p.mesh).filter(Boolean);
  if (!padMeshes.length) return;

  for (const ctrl of S.controllers) {
    tempMat.identity().extractRotation(ctrl.obj.matrixWorld);
    tempDir.set(0, 0, -1).applyMatrix4(tempMat).normalize();
    const origin = new THREE.Vector3().setFromMatrixPosition(ctrl.obj.matrixWorld);
    raycaster.set(origin, tempDir);

    const hits = raycaster.intersectObjects(padMeshes, false);
    if (hits?.length) {
      const p = hits[0].point;
      ctrl.dot.visible = true;
      ctrl.dot.position.copy(ctrl.obj.worldToLocal(p.clone()));
    } else {
      ctrl.dot.visible = false;
    }
  }
}

// ---------- resize ----------
function addResize() {
  addEventListener("resize", () => {
    S.camera.aspect = innerWidth / innerHeight;
    S.camera.updateProjectionMatrix();
    S.renderer.setSize(innerWidth, innerHeight);
  });
                                                           }
