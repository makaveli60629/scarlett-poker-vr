// /js/main.js — Scarlett VR Poker — Update 9.0 — HARD FIX (no bare imports)
//
// This file MUST NOT import "three" (bare specifier) on GitHub Pages.
// We load THREE + addons from CDN and then load world.js.

import * as THREE from "https://unpkg.com/three@0.159.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.159.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://unpkg.com/three@0.159.0/examples/jsm/webxr/XRControllerModelFactory.js";

import { initWorld } from "./world.js";

const hubLog = (m) => {
  try { window.__hubLog?.(String(m)); } catch {}
  console.log(m);
};

hubLog("[ScarlettVR] main.js booting (HARD FIX) ✅");

let scene, camera, renderer, rig, clock;
let world;

const MOVE_SPEED = 2.2;
const SNAP_DEG = 45;
const SNAP_COOLDOWN = 0.22;
let snapCooldown = 0;

let rightController, leftController;
let rightRayLine, rightTargetRing;
let teleportHitPoint = new THREE.Vector3();
let hasTeleportTarget = false;

const raycaster = new THREE.Raycaster();
const tempMat4 = new THREE.Matrix4();
const tempVec3 = new THREE.Vector3();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

boot().catch((e) => {
  hubLog("[ScarlettVR] ❌ BOOT FAILED: " + (e?.message || e));
  console.error(e);
});

async function boot() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.04, 140);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // VR button (Quest)
  document.body.appendChild(VRButton.createButton(renderer));
  hubLog("[ScarlettVR] VRButton injected ✅");

  rig = new THREE.Group();
  rig.add(camera);
  scene.add(rig);

  addLights();
  setupControllers();

  clock = new THREE.Clock();

  world = await initWorld({ THREE, scene, hubLog });
  hubLog("[ScarlettVR] World init OK ✅");

  // spawn on spawn pad + face table
  doSpawn();

  window.addEventListener("resize", onResize);
  renderer.setAnimationLoop(tick);
}

function addLights() {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 0.75));

  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(8, 10, 4);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-8, 6, -6);
  scene.add(fill);

  const glow = new THREE.PointLight(0x33ff66, 0.35, 18);
  glow.position.set(0, 2.2, 22);
  scene.add(glow);
}

function setupControllers() {
  leftController = renderer.xr.getController(0);
  rightController = renderer.xr.getController(1);
  scene.add(leftController);
  scene.add(rightController);

  const factory = new XRControllerModelFactory();
  const lg = renderer.xr.getControllerGrip(0);
  lg.add(factory.createControllerModel(lg));
  scene.add(lg);

  const rg = renderer.xr.getControllerGrip(1);
  rg.add(factory.createControllerModel(rg));
  scene.add(rg);

  // laser
  const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)];
  const geom = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color: 0x33ff66 });
  rightRayLine = new THREE.Line(geom, mat);
  rightRayLine.scale.z = 10;
  rightController.add(rightRayLine);

  rightTargetRing = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.26, 32),
    new THREE.MeshBasicMaterial({ color: 0x33ff66, side: THREE.DoubleSide })
  );
  rightTargetRing.rotation.x = -Math.PI / 2;
  rightTargetRing.visible = false;
  scene.add(rightTargetRing);

  // trigger teleport
  rightController.addEventListener("selectstart", () => {
    if (!hasTeleportTarget) return;
    rig.position.set(teleportHitPoint.x, 0, teleportHitPoint.z);
    faceLookAt(world?.tableFocus || new THREE.Vector3(0, 0, 0));
  });
}

function doSpawn() {
  const pads = world?.spawnPads?.length ? world.spawnPads : [new THREE.Vector3(0, 0, 18)];
  const pos = pads[0];
  rig.position.set(pos.x, 0, pos.z);
  faceLookAt(world?.tableFocus || new THREE.Vector3(0, 0, 6));
}

function faceLookAt(target) {
  const dx = target.x - rig.position.x;
  const dz = target.z - rig.position.z;
  const yaw = Math.atan2(dx, dz);
  rig.rotation.set(0, yaw, 0);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  world?.tick?.(dt);
  updateMovement(dt);
  updateTeleportTarget();
  renderer.render(scene, camera);
}

function updateMovement(dt) {
  const session = renderer.xr.getSession();
  if (!session) return;

  let leftGP = null, rightGP = null;
  for (const s of session.inputSources) {
    if (!s.gamepad) continue;
    if (s.handedness === "left") leftGP = s.gamepad;
    if (s.handedness === "right") rightGP = s.gamepad;
  }

  // LEFT stick move (✅ forward/back fixed)
  if (leftGP?.axes?.length >= 2) {
    const x = leftGP.axes[2] ?? leftGP.axes[0] ?? 0;
    const y = leftGP.axes[3] ?? leftGP.axes[1] ?? 0;

    const strafe = x;
    const forward = -y;

    const dead = 0.12;
    const ax = Math.abs(strafe) < dead ? 0 : strafe;
    const ay = Math.abs(forward) < dead ? 0 : forward;

    if (ax || ay) {
      const yaw = rig.rotation.y;
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);

      rig.position.x += (ax * cos + ay * sin) * MOVE_SPEED * dt;
      rig.position.z += (ay * cos - ax * sin) * MOVE_SPEED * dt;

      const c = world?.roomClamp;
      if (c) {
        rig.position.x = Math.max(c.minX, Math.min(c.maxX, rig.position.x));
        rig.position.z = Math.max(c.minZ, Math.min(c.maxZ, rig.position.z));
      }
    }
  }

  // RIGHT stick snap turn
  if (rightGP?.axes?.length >= 2) {
    snapCooldown = Math.max(0, snapCooldown - dt);
    const rx = rightGP.axes[2] ?? rightGP.axes[0] ?? 0;
    const dead = 0.55;

    if (snapCooldown === 0) {
      if (rx > dead) {
        rig.rotation.y -= THREE.MathUtils.degToRad(SNAP_DEG);
        snapCooldown = SNAP_COOLDOWN;
      } else if (rx < -dead) {
        rig.rotation.y += THREE.MathUtils.degToRad(SNAP_DEG);
        snapCooldown = SNAP_COOLDOWN;
      }
    }
  }
}

function updateTeleportTarget() {
  hasTeleportTarget = false;
  rightTargetRing.visible = false;
  if (!rightController) return;

  tempMat4.identity().extractRotation(rightController.matrixWorld);
  tempVec3.set(0, 0, -1).applyMatrix4(tempMat4).normalize();

  const origin = new THREE.Vector3().setFromMatrixPosition(rightController.matrixWorld);
  raycaster.ray.origin.copy(origin);
  raycaster.ray.direction.copy(tempVec3);

  const hit = new THREE.Vector3();
  const ok = raycaster.ray.intersectPlane(floorPlane, hit);
  if (!ok) return;

  const c = world?.roomClamp;
  if (c) {
    if (hit.x < c.minX || hit.x > c.maxX || hit.z < c.minZ || hit.z > c.maxZ) return;
  }

  teleportHitPoint.copy(hit);
  hasTeleportTarget = true;

  const dist = origin.distanceTo(hit);
  rightRayLine.scale.z = Math.max(0.2, dist);

  rightTargetRing.position.set(hit.x, 0.02, hit.z);
  rightTargetRing.visible = true;
                            }
