import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { State } from "./state.js";
import { World } from "./world.js";
import { Table } from "./table.js";
import { Chairs } from "./chair.js";
import { UI } from "./ui.js";
import { Store } from "./store.js";
import { AudioSys } from "./audio.js";
import { createMobileJoystick, applyMovement } from "./controls.js";

const statusLine = document.getElementById("statusLine");
const canvasWrap = document.getElementById("canvasWrap");

const btnReset = document.getElementById("btnReset");
const btnAudio = document.getElementById("btnAudio");
const btnMenu  = document.getElementById("btnMenu");

const joyWrap = document.getElementById("joyWrap");
const joyKnob = document.getElementById("joyKnob");
const joy = createMobileJoystick(joyWrap, joyKnob);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.xr.enabled = true;
canvasWrap.appendChild(renderer.domElement);

// Scene / camera / rig
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 200);

const rig = new THREE.Group();
rig.position.set(State.anchors.lobby.x, 0, State.anchors.lobby.z);
rig.add(camera);
scene.add(rig);

// VR button
document.body.appendChild(VRButton.createButton(renderer));

// Texture loader
const textureLoader = new THREE.TextureLoader();

// Build world + table + chairs + store + UI
World.build(scene, textureLoader);
Table.build(scene, textureLoader);
Chairs.build(scene);
Store.build(scene, textureLoader);
UI.build(scene);

statusLine.textContent = "Status: Running ✅ (XR + Mobile ready)";

// --- Teleport halo (visual preview) ---
const halo = new THREE.Mesh(
  new THREE.RingGeometry(0.2, 0.28, 32),
  new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x003355, side: THREE.DoubleSide })
);
halo.rotation.x = -Math.PI/2;
halo.visible = false;
scene.add(halo);

function goAnchor(name){
  const a = State.anchors[name];
  if (!a) return;
  rig.position.set(a.x, 0, a.z);
  // close menu after teleport
  UI.close();
}

function toggleAudio(){
  AudioSys.toggle(statusLine);
}

// Mobile buttons
btnReset.addEventListener("click", ()=>{
  goAnchor("lobby");
  statusLine.textContent = "Status: Reset to Lobby ✅";
});

btnAudio.addEventListener("click", ()=> toggleAudio());
btnMenu.addEventListener("click", ()=> UI.toggle(rig));

// Basic collision list (simple)
const colliders = [
  ...World.colliders,
  ...Table.colliders,
  ...Chairs.colliders
].filter(Boolean);

// Keep player above floor and within simple bounds
function clampRig(){
  rig.position.y = 0;
  rig.position.x = Math.max(-13.5, Math.min(13.5, rig.position.x));
  rig.position.z = Math.max(-9.0,  Math.min(9.0,  rig.position.z));
}

// --- XR Controllers ---
const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);
scene.add(controller1);
scene.add(controller2);

const rayLineMat = new THREE.LineBasicMaterial({ color: 0x00aaff });
const rayGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
const ray1 = new THREE.Line(rayGeom, rayLineMat);
ray1.scale.z = 6;
controller1.add(ray1);

const ray2 = new THREE.Line(rayGeom, rayLineMat);
ray2.scale.z = 6;
controller2.add(ray2);

// Snap turn state
let snapCooldown = 0;

// Pointer helpers
const tmpOrigin = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const tmpMat4 = new THREE.Matrix4();
const raycaster = new THREE.Raycaster();

// Controller select = interact / teleport
controller1.addEventListener("selectstart", ()=> onSelect(controller1));
controller2.addEventListener("selectstart", ()=> onSelect(controller2));

function getRayFromController(ctrl){
  ctrl.updateMatrixWorld(true);
  tmpMat4.identity().extractRotation(ctrl.matrixWorld);
  tmpOrigin.setFromMatrixPosition(ctrl.matrixWorld);
  tmpDir.set(0,0,-1).applyMatrix4(tmpMat4).normalize();
  return { origin: tmpOrigin.clone(), dir: tmpDir.clone() };
}

function hitFloor(origin, dir){
  // floor plane y=0
  const t = (0 - origin.y) / dir.y;
  if (!isFinite(t) || t < 0) return null;
  return origin.clone().add(dir.clone().multiplyScalar(t));
}

function onSelect(ctrl){
  // If menu open, click menu button
  if (UI.menuOpen) {
    const { origin, dir } = getRayFromController(ctrl);
    const btn = UI.hitTest(origin, dir);
    if (btn) {
      UI.doAction(btn.userData.action, { goAnchor, toggleAudio });
      return;
    }
  }

  // Store buy click
  {
    const { origin, dir } = getRayFromController(ctrl);
    const token = Store.hitTest(origin, dir);
    if (token?.userData?.storeItemId) {
      const res = Store.tryBuy(token.userData.storeItemId);
      statusLine.textContent = `Status: ${res.ok ? "✅" : "❌"} ${res.msg} | Chips: ${State.chips} | Event: ${State.eventChips}`;
      return;
    }
  }

  // Chair join
  {
    const { origin, dir } = getRayFromController(ctrl);
    const ring = Chairs.hitTest(origin, dir);
    if (ring?.userData?.seatIndex != null) {
      const seatIndex = ring.userData.seatIndex;
      const t = Chairs.getSeatTransform(seatIndex);
      if (t) {
        rig.position.set(t.position.x, 0, t.position.z);
        // face table
        rig.lookAt(t.lookAt.x, 0, t.lookAt.z);
        State.mode = "seated";
        State.seatedIndex = seatIndex;
        Chairs.setSeatOpen(seatIndex, false);
        statusLine.textContent = `Status: Seated at chair ${seatIndex} ✅`;
      }
      return;
    }
  }

  // Teleport (floor halo)
  {
    const { origin, dir } = getRayFromController(ctrl);
    const p = hitFloor(origin, dir);
    if (p) {
      rig.position.set(p.x, 0, p.z);
      statusLine.textContent = `Status: Teleported ✅`;
    }
  }
}

// Mobile tap interaction (menu/store/chairs)
renderer.domElement.addEventListener("pointerdown", (e)=>{
  // Build a screen ray
  const x = (e.clientX / window.innerWidth) * 2 - 1;
  const y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera({x,y}, camera);

  const origin = raycaster.ray.origin.clone();
  const dir = raycaster.ray.direction.clone();

  if (UI.menuOpen) {
    const btn = UI.hitTest(origin, dir);
    if (btn) UI.doAction(btn.userData.action, { goAnchor, toggleAudio });
    return;
  }

  const token = Store.hitTest(origin, dir);
  if (token?.userData?.storeItemId) {
    const res = Store.tryBuy(token.userData.storeItemId);
    statusLine.textContent = `Status: ${res.ok ? "✅" : "❌"} ${res.msg} | Chips: ${State.chips} | Event: ${State.eventChips}`;
    return;
  }

  const ring = Chairs.hitTest(origin, dir);
  if (ring?.userData?.seatIndex != null) {
    const seatIndex = ring.userData.seatIndex;
    const t = Chairs.getSeatTransform(seatIndex);
    if (t) {
      rig.position.set(t.position.x, 0, t.position.z);
      State.mode = "seated";
      State.seatedIndex = seatIndex;
      Chairs.setSeatOpen(seatIndex, false);
      statusLine.textContent = `Status: Seated ✅`;
    }
  }
});

// XR gamepad movement + snap turn + halo preview
function handleXRInput(dt){
  const session = renderer.xr.getSession();
  if (!session) return;

  const sources = session.inputSources || [];
  let leftStick = null;
  let rightStick = null;

  for (const src of sources) {
    if (!src.gamepad) continue;
    const axes = src.gamepad.axes || [];
    // Most Quest controllers: axes[2],axes[3] is right; [0],[1] is left
    if (axes.length >= 2) {
      // Heuristic: first source seen as left
      if (!leftStick) leftStick = axes;
      else if (!rightStick) rightStick = axes;
    }
  }

  // Move with left stick
  if (leftStick) {
    const lx = leftStick[0] || 0;
    const ly = leftStick[1] || 0;

    // deadzone
    const dz = 0.15;
    const mx = Math.abs(lx) > dz ? lx : 0;
    const mz = Math.abs(ly) > dz ? ly : 0;

    // forward from camera
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).normalize();

    const vel = new THREE.Vector3()
      .addScaledVector(right, mx)
      .addScaledVector(forward, -mz);

    if (vel.lengthSq() > 0.0001) {
      vel.normalize().multiplyScalar(2.1 * dt);
      rig.position.add(vel);
    }
  }

  // Snap turn with right stick x
  if (rightStick && snapCooldown <= 0) {
    const rx = rightStick[2] ?? rightStick[0] ?? 0; // fallback
    if (rx > 0.7) { rig.rotation.y -= THREE.MathUtils.degToRad(45); snapCooldown = 0.22; }
    if (rx < -0.7) { rig.rotation.y += THREE.MathUtils.degToRad(45); snapCooldown = 0.22; }
  }
  snapCooldown -= dt;

  // Halo preview from controller2 (or 1)
  const ctrl = controller2 || controller1;
  const { origin, dir } = getRayFromController(ctrl);
  const p = hitFloor(origin, dir);
  if (p) {
    halo.visible = true;
    halo.position.set(p.x, 0.02, p.z);
  } else {
    halo.visible = false;
  }
}

let last = performance.now();

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const session = renderer.xr.getSession();

  // Mobile movement
  applyMovement({
    dt,
    rig,
    camera,
    xrSession: session,
    joy,
    speed: 2.2
  });

  // XR movement + snap turn + halo
  handleXRInput(dt);

  clampRig();
  renderer.render(scene, camera);
});

window.addEventListener("resize", ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
