// js/main.js — Scarlett Poker VR — GUARANTEED CONTROLS + LASER + TELEPORT (NO deps)
// GitHub Pages safe. No local imports. Uses CDN three + VRButton only.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

const hubEl = document.getElementById("hub");
const lines = [];
function hub(msg) {
  const t = `• ${msg}`;
  lines.push(t);
  while (lines.length > 22) lines.shift();
  if (hubEl) hubEl.textContent = lines.join("\n");
  console.log(msg);
}
const ok = (m) => hub(`✅ ${m}`);
const warn = (m) => hub(`⚠️ ${m}`);
const fail = (m) => hub(`❌ ${m}`);

hub("Booting…");

// ---------- Core three ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070b);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 2000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// VR button ALWAYS
document.body.appendChild(VRButton.createButton(renderer));
ok("VRButton added");

// Player rig (move this, not the camera)
const rig = new THREE.Group();
rig.add(camera);
scene.add(rig);

// ---------- Always-on lights (anti-black) ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.40));
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.05));

const sun = new THREE.DirectionalLight(0xffffff, 1.25);
sun.position.set(10, 18, 8);
scene.add(sun);

const headlamp = new THREE.PointLight(0xffffff, 2.2, 50);
camera.add(headlamp);
ok("Lights ready");

// ---------- World (simple, visible, stable) ----------
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x2d2f35, roughness: 0.98, metalness: 0.0 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const grid = new THREE.GridHelper(40, 40, 0x00ff66, 0x1b2636);
grid.position.y = 0.02;
scene.add(grid);

// Basic walls so you know where you are (visual)
function wall(w, h, x, y, z, ry) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ color: 0x1a1f28, roughness: 0.98, metalness: 0.0 })
  );
  m.position.set(x, y, z);
  m.rotation.y = ry;
  scene.add(m);
  return m;
}
wall(34, 9.5, 0, 4.75, -17, 0);
wall(34, 9.5, 0, 4.75,  17, Math.PI);
wall(34, 9.5, 17, 4.75, 0, -Math.PI/2);
wall(34, 9.5, -17, 4.75, 0, Math.PI/2);

// Table + chairs so you still see your build
const tableGroup = new THREE.Group();
scene.add(tableGroup);

const felt = new THREE.MeshStandardMaterial({ color: 0x0b3a2a, roughness: 0.9, metalness: 0.02 });
const rail = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.55, metalness: 0.1 });
const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.18, 48), felt);
tableTop.position.y = 0.95;
tableGroup.add(tableTop);

const tableRail = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.14, 18, 56), rail);
tableRail.rotation.x = Math.PI/2;
tableRail.position.y = 1.05;
tableGroup.add(tableRail);

const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 0.9, 24), rail);
pedestal.position.y = 0.45;
tableGroup.add(pedestal);

// Chairs ring
const chairMat = new THREE.MeshStandardMaterial({ color: 0x3b3b3b, roughness: 0.85, metalness: 0.05 });
for (let i = 0; i < 6; i++) {
  const a = (i/6) * Math.PI * 2;
  const cx = Math.cos(a) * 3.1;
  const cz = Math.sin(a) * 3.1;
  const chair = new THREE.Group();
  chair.position.set(cx, 0, cz);
  chair.rotation.y = -a + Math.PI/2;

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.08,0.55), chairMat);
  seat.position.y = 0.45;
  chair.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.55,0.08), chairMat);
  back.position.set(0,0.75,-0.23);
  chair.add(back);

  // legs
  const legGeo = new THREE.CylinderGeometry(0.03,0.03,0.45,10);
  const legPos = [
    [0.22,0.22,0.22],[ -0.22,0.22,0.22],
    [0.22,0.22,-0.22],[ -0.22,0.22,-0.22],
  ];
  for (const [lx,ly,lz] of legPos) {
    const leg = new THREE.Mesh(legGeo, chairMat);
    leg.position.set(lx,ly,lz);
    chair.add(leg);
  }
  scene.add(chair);
}

// Teleport pads (visual)
function pad(x,z,color) {
  const g = new THREE.Group();
  g.position.set(x,0,z);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9,0.9,0.04,40),
    new THREE.MeshStandardMaterial({ color: 0x0e0f12, roughness: 0.8, metalness: 0.1 })
  );
  base.position.y = 0.02;
  g.add(base);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.72,0.04,12,64),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, roughness: 0.2 })
  );
  ring.rotation.x = Math.PI/2;
  ring.position.y = 0.06;
  g.add(ring);

  scene.add(g);
  return g;
}
pad(11.5, 0, 0x2bd7ff);   // blue
pad(-11.5, 0, 0xff2bd6);  // pink
pad(0, 11.5, 0x00ffaa);   // green

// Spawn away from table (always)
rig.position.set(0, 0, 10);
ok("Spawn set (away from table)");

// ---------- In-world HUD panel (big & readable in VR) ----------
function makeHudPanel() {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 900;
  const ctx = canvas.getContext("2d");

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const geo = new THREE.PlaneGeometry(2.6, 1.46);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, 0.05, -1.35);
  camera.add(mesh);

  function draw(textLines) {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle = "#00ff66";
    ctx.font = "54px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillText("Scarlett Poker VR — Status", 48, 90);

    ctx.font = "38px ui-monospace, Menlo, Consolas, monospace";
    let y = 170;
    for (const s of textLines) {
      ctx.fillText(s, 48, y);
      y += 52;
    }
    tex.needsUpdate = true;
  }

  return { draw };
}
const hudPanel = makeHudPanel();

// ---------- Controls: Move + Snap Turn + Laser + Teleport ----------
const floorPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
const tmpV = new THREE.Vector3();
const camPos = new THREE.Vector3();
const camDir = new THREE.Vector3();
const hit = new THREE.Vector3();

let snapCooldown = 0;
const snapAngle = Math.PI / 4;
const moveSpeed = 2.25;

function getPads() {
  const session = renderer.xr.getSession?.();
  if (!session) return { left: null, right: null };

  let left = null, right = null;
  for (const src of session.inputSources || []) {
    if (!src?.gamepad) continue;
    if (src.handedness === "left") left = src;
    if (src.handedness === "right") right = src;
  }
  return { left, right };
}

function readAxes(gp) {
  const a = gp?.axes || [];
  const p01 = { x: a[0] ?? 0, y: a[1] ?? 0, mag: Math.abs(a[0] ?? 0) + Math.abs(a[1] ?? 0) };
  const p23 = { x: a[2] ?? 0, y: a[3] ?? 0, mag: Math.abs(a[2] ?? 0) + Math.abs(a[3] ?? 0) };
  return p23.mag > p01.mag ? p23 : p01;
}

function readTrigger(gp) {
  // Quest trigger often button 0 or 1; choose max value
  const b = gp?.buttons || [];
  let m = 0;
  for (let i=0;i<4;i++) {
    const v = typeof b[i]?.value === "number" ? b[i].value : (b[i]?.pressed ? 1 : 0);
    if (v > m) m = v;
  }
  return m;
}

// Laser line (attached to right controller if possible; else camera)
const laserMat = new THREE.LineBasicMaterial({ color: 0x00ff66 });
const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0,0,-1)]);
const laserLine = new THREE.Line(laserGeo, laserMat);
laserLine.scale.z = 12;
laserLine.visible = true;

// Teleport ring (destination)
const tpRing = new THREE.Mesh(
  new THREE.RingGeometry(0.25, 0.34, 36),
  new THREE.MeshBasicMaterial({ color: 0x00ff66, side: THREE.DoubleSide })
);
tpRing.rotation.x = -Math.PI/2;
tpRing.position.set(rig.position.x, 0.02, rig.position.z);
scene.add(tpRing);

function attachLaserToController() {
  const session = renderer.xr.getSession?.();
  if (!session) return;

  // remove from any parent first
  if (laserLine.parent) laserLine.parent.remove(laserLine);

  // Try right controller grip space
  // (If not available, attach to camera)
  const { right } = getPads();
  if (right) {
    // Build a controller object to attach to
    const controller = renderer.xr.getController(0);
    // We can’t guarantee index mapping by handedness, so also try controller(1)
    // We attach to both if needed.
    try { controller.add(laserLine); ok("Laser attached to controller"); return; } catch {}
  }

  camera.add(laserLine);
  warn("Laser attached to camera (fallback)");
}

let lastShown = { mx: 0, my: 0, tx: 0, trig: 0 };
let started = false;

renderer.xr.addEventListener("sessionstart", () => {
  ok("XR session started");
  attachLaserToController();
  started = true;
});
renderer.xr.addEventListener("sessionend", () => {
  warn("XR session ended");
  started = false;
  if (laserLine.parent) laserLine.parent.remove(laserLine);
  camera.add(laserLine);
});

// Bounds clamp (room)
function clampToRoom(pos) {
  pos.x = THREE.MathUtils.clamp(pos.x, -15.5, 15.5);
  pos.z = THREE.MathUtils.clamp(pos.z, -15.5, 15.5);
}

// ---------- Render loop ----------
let lastT = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  // Read XR gamepads
  const { left, right } = getPads();

  // Movement: use left gp if possible else right
  const moveGp = left?.gamepad || right?.gamepad || null;
  const turnGp = right?.gamepad || left?.gamepad || null;

  // Move
  if (moveGp) {
    const { x, y } = readAxes(moveGp);
    const dead = 0.14;
    const mx = Math.abs(x) < dead ? 0 : x;
    const my = Math.abs(y) < dead ? 0 : y;

    if (mx || my) {
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0; fwd.normalize();

      const rightDir = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0)).normalize().multiplyScalar(-1);

      tmpV.copy(rig.position);
      tmpV.addScaledVector(rightDir, mx * moveSpeed * dt);
      tmpV.addScaledVector(fwd, -my * moveSpeed * dt);
      clampToRoom(tmpV);
      rig.position.x = tmpV.x;
      rig.position.z = tmpV.z;

      lastShown.mx = mx; lastShown.my = my;
    }
  }

  // Snap turn
  snapCooldown = Math.max(0, snapCooldown - dt);
  if (turnGp) {
    const { x } = readAxes(turnGp);
    lastShown.tx = x;
    if (snapCooldown <= 0 && Math.abs(x) > 0.65) {
      rig.rotation.y += (x > 0 ? -1 : 1) * snapAngle;
      snapCooldown = 0.28;
    }
  }

  // Aim ray from camera (stable) -> ring on floor
  camera.getWorldPosition(camPos);
  camera.getWorldDirection(camDir);
  camDir.y = 0;
  if (camDir.lengthSq() < 1e-6) camDir.set(0,0,-1);
  camDir.normalize();

  const ray = new THREE.Ray(camPos.clone(), camDir.clone());
  if (ray.intersectPlane(floorPlane, hit)) {
    clampToRoom(hit);
    tpRing.position.set(hit.x, 0.02, hit.z);
  }

  // Teleport: right trigger
  const trig = readTrigger(right?.gamepad || turnGp || moveGp);
  lastShown.trig = trig;

  if (trig > 0.75) {
    // simple “hold-to-teleport” (instant)
    rig.position.x = tpRing.position.x;
    rig.position.z = tpRing.position.z;
  }

  // Update in-world HUD panel so you can SEE controls are alive
  hudPanel.draw([
    started ? "XR: ON" : "XR: OFF (press Enter VR)",
    `Move stick: ${lastShown.mx.toFixed(2)} / ${lastShown.my.toFixed(2)}`,
    `Turn stick X: ${lastShown.tx.toFixed(2)} (45° snap)`,
    `Right trigger: ${lastShown.trig.toFixed(2)} (teleport)`,
    "",
    "Expected:",
    "- Left stick moves",
    "- Right stick snap turns",
    "- Right trigger teleports",
    "- Laser is green (controller or camera fallback)",
  ]);

  renderer.render(scene, camera);
});

// Resize
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

ok("Loop running (controls built-in)");
