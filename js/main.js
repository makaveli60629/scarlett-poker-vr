// /js/main.js — Scarlett Poker VR — Spawn-to-Pad + Safety Unstuck (GitHub Pages Safe)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { Controls } from "./controls.js";
import { UI } from "./ui.js";
import { PokerSimulation } from "./poker_simulation.js";

const overlay = document.getElementById("overlay");
const log = (msg) => { if (overlay) overlay.textContent += `\n${msg}`; };

function getRoomFromURL() {
  const u = new URL(location.href);
  const room = (u.searchParams.get("room") || "lobby").toLowerCase();
  const ok = ["lobby", "vip", "store", "tournament"];
  return ok.includes(room) ? room : "lobby";
}

// If a spawn is inside a collider, push it out in small steps
function resolveSpawnOutOfColliders(pos, colliders, bounds) {
  const p = pos.clone();
  const r = 0.28; // player radius
  const maxSteps = 80;

  const clampBounds = () => {
    if (!bounds) return;
    p.x = THREE.MathUtils.clamp(p.x, bounds.min.x, bounds.max.x);
    p.z = THREE.MathUtils.clamp(p.z, bounds.min.z, bounds.max.z);
  };

  const isBlocked = () => {
    for (const c of colliders || []) {
      const box = c?.userData?.box;
      if (!box) continue;
      if (
        p.x > box.min.x - r && p.x < box.max.x + r &&
        p.z > box.min.z - r && p.z < box.max.z + r
      ) return true;
    }
    return false;
  };

  clampBounds();

  if (!isBlocked()) return p;

  // Spiral push outward away from center (table is center)
  for (let i = 0; i < maxSteps; i++) {
    const a = i * 0.45;
    const step = 0.18 + i * 0.01;
    p.x += Math.cos(a) * step;
    p.z += Math.sin(a) * step;
    clampBounds();
    if (!isBlocked()) return p;
  }

  // last resort: lobby fallback
  p.set(0, 0, 11.5);
  clampBounds();
  return p;
}

const App = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  player: null,

  init() {
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05060a);
    this.scene.fog = new THREE.Fog(0x05060a, 2, 70);

    this.player = new THREE.Group();
    this.scene.add(this.player);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
    this.camera.position.set(0, 1.65, 0);
    this.player.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;

    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));
    log("✅ Renderer + VRButton ready");

    this.addLights();
    this.addSafetyFloor();

    // Build world
    let worldData = null;
    try {
      worldData = World.build(this.scene, this.player);
      log("✅ World built");
    } catch (e) {
      console.warn(e);
      log("❌ World build failed (console)");
    }

    // --- Spawn to teleport pad ALWAYS ---
    const room = getRoomFromURL();
    const pad = worldData?.padById?.[room] || worldData?.padById?.lobby;
    let spawnPos = (pad?.position ? pad.position.clone() : (worldData?.spawn?.clone?.() || new THREE.Vector3(0, 0, 11.5)));
    spawnPos = resolveSpawnOutOfColliders(spawnPos, worldData?.colliders || [], worldData?.bounds || null);

    // IMPORTANT: move rig BEFORE controls init so you don’t start inside anything
    this.player.position.set(spawnPos.x, 0, spawnPos.z);
    this.player.rotation.y = pad?.yaw ?? 0;
    log(`✅ Spawned on pad: ${room}`);

    // Controls (pass colliders + bounds)
    try {
      Controls.init({
        renderer: this.renderer,
        camera: this.camera,
        player: this.player,
        colliders: worldData?.colliders || [],
        bounds: worldData?.bounds || null,
        spawn: { position: spawnPos, yaw: pad?.yaw ?? 0 },
      });
      log("✅ Controls.init OK");
    } catch (e) {
      console.warn(e);
      log("❌ Controls.init failed (console)");
    }

    // UI
    try {
      UI.init(this.scene, this.camera);
      log("✅ UI.init OK");
    } catch (e) {
      console.warn(e);
      log("⚠️ UI skipped");
    }

    // Poker sim (safe)
    try {
      PokerSimulation.build({ bots: [] });
      log("✅ PokerSimulation built");
    } catch (e) {
      console.warn(e);
      log("⚠️ PokerSimulation skipped");
    }

    // Quick helper: call from console to jump rooms without crashing paths
    window.SPV_go = (roomId) => {
      const u = new URL(location.href);
      u.searchParams.set("room", String(roomId || "lobby"));
      location.href = u.toString();
    };

    window.addEventListener("resize", () => this.resize());
    this.renderer.setAnimationLoop(() => this.animate());

    log("✅ Boot complete. Enter VR.");
  },

  addLights() {
    // Bright mode so the room isn’t dark
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x333355, 1.35));

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(6, 10, 6);
    this.scene.add(key);

    const fill = new THREE.PointLight(0xffffff, 0.75, 60);
    fill.position.set(-6, 5, -6);
    this.scene.add(fill);
  },

  addSafetyFloor() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.scene.add(floor);
  },

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  animate() {
    const dt = this.clock.getDelta();
    try { Controls.update(dt); } catch {}
    try { UI.update(dt); } catch {}
    this.renderer.render(this.scene, this.camera);
  },
};

App.init();
