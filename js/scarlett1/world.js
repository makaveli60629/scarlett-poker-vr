// js/scarlett1/world.js — Scarlett1 World (FULL • MODULAR • SAFE)

import { AndroidSpine } from "./spine_android.js";
import { XRSpine } from "./spine_xr.js";
import { ModulesSpine } from "./spine_modules.js";

export async function initWorld(ctx = {}) {
  const THREE = ctx.THREE;
  const log = ctx.log || console.log;
  const status = ctx.status || (() => {});
  const base = ctx.base || "/";

  status("initWorld() start");
  log("initWorld() start");

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  // Camera + Rig
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 700);

  const rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.add(camera);
  scene.add(rig);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Lights
  scene.add(new THREE.HemisphereLight(0xaac7ff, 0x101018, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(10, 20, 10);
  scene.add(key);

  const fill = new THREE.PointLight(0x88aaff, 0.6, 100);
  fill.position.set(0, 6, 0);
  scene.add(fill);

  // Floor meshes for teleport raycast
  const floorMeshes = [];

  // Main floor
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0c1220, roughness: 0.95, metalness: 0.05 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 128), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);
  floorMeshes.push(floor);

  // Lobby ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(6, 22, 128),
    new THREE.MeshStandardMaterial({ color: 0x0f1a33, roughness: 0.9, metalness: 0.05 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  scene.add(ring);
  floorMeshes.push(ring);

  // Center table base (placeholder)
  const tableBase = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.8, 0.35, 48),
    new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.6, metalness: 0.2 })
  );
  tableBase.position.set(0, 0.18, 0);
  scene.add(tableBase);

  // Raised lip (divot hint)
  const lip = new THREE.Mesh(
    new THREE.RingGeometry(3.9, 4.4, 64),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.6, metalness: 0.25 })
  );
  lip.rotation.x = -Math.PI / 2;
  lip.position.set(0, 0.02, 0);
  scene.add(lip);
  floorMeshes.push(lip);

  // Sealed walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x060911, roughness: 0.95, metalness: 0.05 });
  const wallH = 5;
  const wallR = 24;
  const wallGeo = new THREE.CylinderGeometry(wallR, wallR, wallH, 96, 1, true);
  const walls = new THREE.Mesh(wallGeo, wallMat);
  walls.position.y = wallH / 2;
  walls.rotation.y = Math.PI / 16;
  scene.add(walls);

  // Spawn pads (safe)
  const padMat = new THREE.MeshStandardMaterial({
    color: 0x143a8a, roughness: 0.3, metalness: 0.35, emissive: 0x081a44
  });

  const spawnPads = [
    { name: "SPAWN_A", x: 0, z: 12, yaw: Math.PI },
    { name: "SPAWN_B", x: 10, z: 0, yaw: -Math.PI / 2 },
    { name: "SPAWN_C", x: -10, z: 0, yaw: Math.PI / 2 },
    { name: "SPAWN_D", x: 0, z: -12, yaw: 0 }
  ];

  spawnPads.forEach((p) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1.0, 48), padMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(p.x, 0.02, p.z);
    m.name = p.name;
    scene.add(m);
    floorMeshes.push(m);
  });

  // Spawn you at safe pad A (NOT table)
  rig.position.set(0, 1.65, 12);
  rig.rotation.y = Math.PI;

  // Install spines (safe)
  const android = AndroidSpine.install({ THREE, renderer, rig, camera, log });
  const xr = XRSpine.install({ THREE, renderer, scene, rig, camera, floorMeshes, log });

  // Optional external module loading (never breaks core)
  ModulesSpine.load({ base, log });

  // Render loop
  const clock = new THREE.Clock();

  function tick() {
    const dt = Math.min(0.05, clock.getDelta());
    android.update(dt);
    xr.update(dt);
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(tick);

  status("World running ✅");
  log("render loop start ✅");
    }
