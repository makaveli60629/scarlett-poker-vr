// /js/main.js — Scarlett Poker VR — Core Boot (Oculus-safe)
// - No debug cube on table
// - Uses local ./three.js wrapper
// - Loads World/Controls/UI safely, but never blacks out

import * as THREE from "./three.js";

import { World } from "./world.js";
import { Controls } from "./controls.js";
import { UI } from "./ui.js";

import { buildBasicAvatar } from "./avatar_basic.js";
import { ShopCatalog } from "./shop_catalog.js";

const APP = {
  name: "Scarlett Poker VR",
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  player: null,
  colliders: [],
  controllers: { left: null, right: null },
};

function addBaseLighting(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(6, 10, 6);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xb0d7ff, 0.55);
  fill.position.set(-7, 6, -4);
  scene.add(fill);

  const warm = new THREE.PointLight(0xffd27a, 0.9, 28);
  warm.position.set(0, 7, -7);
  scene.add(warm);
}

function addAlwaysVisibleFloor(scene) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), mat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);
}

function createRenderer() {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  r.setSize(window.innerWidth, window.innerHeight);
  r.xr.enabled = true;
  r.shadowMap.enabled = true;
  document.body.appendChild(r.domElement);
  return r;
}

// Minimal VR button (no external VRButton import needed)
function addVRButton(renderer) {
  const btn = document.createElement("button");
  btn.textContent = "ENTER VR";
  btn.style.position = "fixed";
  btn.style.right = "14px";
  btn.style.bottom = "14px";
  btn.style.padding = "12px 14px";
  btn.style.borderRadius = "14px";
  btn.style.border = "1px solid #333";
  btn.style.background = "#111";
  btn.style.color = "#fff";
  btn.style.zIndex = 9999;

  btn.onclick = async () => {
    if (!navigator.xr) {
      alert("WebXR not available in this browser.");
      return;
    }
    const supported = await navigator.xr.isSessionSupported("immersive-vr");
    if (!supported) {
      alert("Immersive VR not supported on this device/browser.");
      return;
    }
    const session = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking", "layers"],
    });
    renderer.xr.setSession(session);
  };

  document.body.appendChild(btn);
}

function createPlayerRig(scene) {
  const player = new THREE.Group();
  player.position.set(0, 0, 5);
  scene.add(player);
  return player;
}

function createCamera(player) {
  const cam = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
  cam.position.set(0, 1.65, 0);
  player.add(cam);
  return cam;
}

function onResize() {
  if (!APP.camera || !APP.renderer) return;
  APP.camera.aspect = window.innerWidth / window.innerHeight;
  APP.camera.updateProjectionMatrix();
  APP.renderer.setSize(window.innerWidth, window.innerHeight);
}

function buildControllers(renderer) {
  const left = renderer.xr.getController(0);
  const right = renderer.xr.getController(1);
  left.name = "leftController";
  right.name = "rightController";
  APP.player.add(left);
  APP.player.add(right);
  APP.controllers.left = left;
  APP.controllers.right = right;

  // In-VR menu toggle (left controller select)
  left.addEventListener("selectstart", () => UI.toggle());

  return { left, right };
}

function buildStarterAvatar(scene) {
  // Place a mannequin in the lobby as a “shop preview”
  const mannequin = buildBasicAvatar({
    shirtLabel: "SCARLETT",
    shirtColor: 0x111111,
    accentColor: 0xff2d7a,
  });
  mannequin.position.set(6.5, 0, -3.5);
  mannequin.rotation.y = -Math.PI * 0.75;
  scene.add(mannequin);
}

function init() {
  APP.scene = new THREE.Scene();
  APP.scene.background = new THREE.Color(0x040506);
  APP.scene.fog = new THREE.Fog(0x040506, 2, 90);

  APP.renderer = createRenderer();
  addVRButton(APP.renderer);

  APP.player = createPlayerRig(APP.scene);
  APP.camera = createCamera(APP.player);

  APP.clock = new THREE.Clock();

  // Always visible baseline (prevents “black void”)
  addBaseLighting(APP.scene);
  addAlwaysVisibleFloor(APP.scene);

  // World build (safe)
  try {
    const result = World.build(APP.scene, APP.player);
    APP.colliders = Array.isArray(result?.colliders) ? result.colliders : [];
    if (result?.spawn?.isVector3) APP.player.position.copy(result.spawn);
  } catch (e) {
    console.warn("World.build failed — staying with baseline floor/lighting.", e);
  }

  // Controls init (safe)
  try {
    Controls.init({
      renderer: APP.renderer,
      camera: APP.camera,
      player: APP.player,
      colliders: APP.colliders,
      // IMPORTANT: face forward by default
      spawn: { position: APP.player.position.clone(), yaw: 0 },
    });
  } catch (e) {
    console.warn("Controls.init failed", e);
  }

  // UI init (safe) — make sure branding is Scarlett
  try {
    UI.init(APP.scene, APP.camera, { title: APP.name });
  } catch (e) {
    console.warn("UI.init failed", e);
  }

  // Build controllers AFTER renderer XR is enabled
  buildControllers(APP.renderer);

  // Starter shop content (catalog exists even if you haven’t wired purchases yet)
  console.log("🛒 ShopCatalog items:", ShopCatalog.items.length);

  // Temporary mannequin avatar preview (t-shirt + face)
  buildStarterAvatar(APP.scene);

  window.addEventListener("resize", onResize);
  APP.renderer.setAnimationLoop(animate);
}

function animate() {
  const dt = APP.clock.getDelta();

  try { Controls.update(dt); } catch {}
  try { UI.update(dt, APP.controllers); } catch {}

  APP.renderer.render(APP.scene, APP.camera);
}

// Boot
init();
