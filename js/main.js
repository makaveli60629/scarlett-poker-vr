// /js/main.js — Scarlett Poker VR — FIXED PATHS + Pad Spawn + Local-Floor + Height
// IMPORTANT: This file is in /js/, so imports must be "./world.js" not "./js/world.js"

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

const overlay = document.getElementById("overlay");
const log = (msg) => { if (overlay) overlay.textContent += `\n${msg}`; console.log(msg); };

function qs(name, fallback) {
  try {
    const u = new URL(location.href);
    const v = u.searchParams.get(name);
    if (v == null || v === "") return fallback;
    if (typeof fallback === "number") {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    }
    return v;
  } catch { return fallback; }
}

function roomFromURL() {
  const room = String(qs("room", "lobby")).toLowerCase();
  return ["lobby","vip","store","tournament"].includes(room) ? room : "lobby";
}

// Push spawn out of colliders if it lands inside something
function resolveSpawn(pos, colliders, bounds) {
  const p = pos.clone();
  const r = 0.30;

  const clamp = () => {
    if (!bounds) return;
    p.x = THREE.MathUtils.clamp(p.x, bounds.min.x, bounds.max.x);
    p.z = THREE.MathUtils.clamp(p.z, bounds.min.z, bounds.max.z);
  };

  const blocked = () => {
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

  clamp();
  if (!blocked()) return p;

  for (let i = 0; i < 90; i++) {
    const a = i * 0.45;
    const step = 0.16 + i * 0.01;
    p.x += Math.cos(a) * step;
    p.z += Math.sin(a) * step;
    clamp();
    if (!blocked()) return p;
  }

  // fallback to lobby area
  p.set(0, 0, 11.5);
  clamp();
  return p;
}

log("Scarlett Poker VR — booting...");
log("Tip: ?room=vip and ?height=0.25");

const App = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  player: null,

  // modules
  World: null,
  Controls: null,
  UI: null,
  PokerSimulation: null,

  async init() {
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05060a);
    this.scene.fog = new THREE.Fog(0x05060a, 2, 80);

    this.player = new THREE.Group();
    this.scene.add(this.player);

    // In XR, camera should be (0,0,0) — headset pose drives it
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
    this.camera.position.set(0, 0, 0);
    this.player.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;

    // This fixes “can’t look down / alignment weird” on Quest
    try { this.renderer.xr.setReferenceSpaceType("local-floor"); } catch {}

    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));
    log("✅ Renderer + VRButton ready");

    this.addLights();
    this.addSafetyFloor();

    // ✅ FIXED RELATIVE IMPORTS (NO /js/js/ paths)
    try {
      this.World = (await import(`./world.js?v=${Date.now()}`)).World;
      log("✅ world.js loaded");
    } catch (e) {
      log(`❌ world.js failed: ${e?.message || e}`);
    }

    try {
      this.Controls = (await import(`./controls.js?v=${Date.now()}`)).Controls;
      log("✅ controls.js loaded");
    } catch (e) {
      log(`❌ controls.js failed: ${e?.message || e}`);
    }

    try {
      this.UI = (await import(`./ui.js?v=${Date.now()}`)).UI;
      log("✅ ui.js loaded");
    } catch (e) {
      log(`⚠️ ui.js skipped: ${e?.message || e}`);
    }

    try {
      this.PokerSimulation = (await import(`./poker_simulation.js?v=${Date.now()}`)).PokerSimulation;
      log("✅ poker_simulation.js loaded");
    } catch (e) {
      log(`⚠️ poker_simulation.js skipped: ${e?.message || e}`);
    }

    // Build world
    let worldData = null;
    if (this.World?.build) {
      try {
        worldData = this.World.build(this.scene, this.player);
        log("✅ World.build OK");
      } catch (e) {
        log(`❌ World.build failed: ${e?.message || e}`);
      }
    }

    // Spawn to pad
    const room = roomFromURL();
    const pad = worldData?.padById?.[room] || worldData?.padById?.lobby;

    let spawn = pad?.position?.clone?.()
      || worldData?.spawn?.clone?.()
      || new THREE.Vector3(0, 0, 11.5);

    spawn = resolveSpawn(spawn, worldData?.colliders || [], worldData?.bounds || null);

    // Height tweak: default +0.20 (taller). Try: ?height=0.30
    const height = Number(qs("height", 0.20));

    this.player.position.set(spawn.x, height, spawn.z);
    this.player.rotation.y = pad?.yaw ?? 0;

    log(`✅ Spawned: ${room} | height +${height.toFixed(2)}`);

    // Controls init (movement ONLY works after you press Enter VR)
    if (this.Controls?.init) {
      try {
        this.Controls.init({
          renderer: this.renderer,
          camera: this.camera,
          player: this.player,
          colliders: worldData?.colliders || [],
          bounds: worldData?.bounds || null,
          spawn: { position: spawn, yaw: pad?.yaw ?? 0 },
        });
        log("✅ Controls.init OK");
      } catch (e) {
        log(`❌ Controls.init failed: ${e?.message || e}`);
      }
    } else {
      log("❌ Controls missing — movement cannot work");
    }

    // UI init
    try { this.UI?.init?.(this.scene, this.camera); } catch {}

    // Poker init
    try { this.PokerSimulation?.build?.({ bots: [] }); } catch {}

    window.addEventListener("resize", () => this.resize());
    this.renderer.setAnimationLoop(() => this.animate());
    log("✅ Boot complete. ENTER VR to enable movement.");
  },

  addLights() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x303050, 1.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(6, 10, 6);
    this.scene.add(key);
    const fill = new THREE.PointLight(0xffffff, 0.85, 80);
    fill.position.set(-6, 5, -6);
    this.scene.add(fill);
  },

  addSafetyFloor() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 90),
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
    try { this.Controls?.update?.(dt); } catch {}
    try { this.UI?.update?.(dt); } catch {}
    this.renderer.render(this.scene, this.camera);
  },
};

App.init();
