// /js/main.js — Scarlett Poker VR — GitHub Pages SAFE BOOT (Dynamic Imports)
// - Shows WHY a module fails (world.js, controls.js, etc.)
// - WebXR local-floor (fixes looking down/pose issues)
// - Spawns to teleport pads always (?room=lobby|vip|store|tournament)
// - Height offset default +0.20 (taller). Override: ?height=0.35

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

const overlay = document.getElementById("overlay");
const line = (s) => { if (overlay) overlay.textContent += `${s}\n`; console.log(s); };
const now = () => new Date().toLocaleTimeString();

function getParam(name, fallback) {
  try {
    const u = new URL(location.href);
    const v = u.searchParams.get(name);
    if (v === null || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  } catch { return fallback; }
}

function getRoomFromURL() {
  const u = new URL(location.href);
  const room = (u.searchParams.get("room") || "lobby").toLowerCase();
  const ok = ["lobby", "vip", "store", "tournament"];
  return ok.includes(room) ? room : "lobby";
}

async function safeImport(relPath) {
  const v = Date.now();
  const url = `${relPath}?v=${v}`;
  try {
    const mod = await import(url);
    line(`✅ [${now()}] Loaded ${relPath}`);
    return mod;
  } catch (e) {
    line(`⚠️ [${now()}] Skipped ${relPath} (${e?.message || e})`);
    return null;
  }
}

// If spawn is inside a collider, push it outward until free.
function resolveSpawn(pos, colliders, bounds) {
  const p = pos.clone();
  const r = 0.30;
  const maxSteps = 90;

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

  // spiral escape
  for (let i = 0; i < maxSteps; i++) {
    const a = i * 0.45;
    const step = 0.16 + i * 0.01;
    p.x += Math.cos(a) * step;
    p.z += Math.sin(a) * step;
    clamp();
    if (!blocked()) return p;
  }

  // fallback: lobby pad
  p.set(0, 0, 11.5);
  clamp();
  return p;
}

line("Scarlett Poker VR — loading…");
line("Tip: add ?room=vip (or store/tournament) and ?height=0.30");

const App = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  player: null,

  async init() {
    this.clock = new THREE.Clock();

    // --- Scene / Rig ---
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05060a);
    this.scene.fog = new THREE.Fog(0x05060a, 2, 70);

    this.player = new THREE.Group();
    this.scene.add(this.player);

    // IMPORTANT: camera local position should be 0,0,0 in XR
    // WebXR supplies head pose. We set reference space to local-floor.
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
    this.camera.position.set(0, 0, 0);
    this.player.add(this.camera);

    // --- Renderer / XR ---
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;

    // local-floor fixes “can’t look down / weird alignment” on Quest browser
    try { this.renderer.xr.setReferenceSpaceType("local-floor"); } catch {}

    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));
    line(`✅ [${now()}] Renderer + VRButton ready`);

    // Bright lights so it’s not dark
    this.addLights();

    // Always add a fallback floor so you see *something* even if world fails
    this.addSafetyFloor();

    // --- Dynamic imports (GitHub safe) ---
    const WorldMod = await safeImport("./js/world.js");
    const ControlsMod = await safeImport("./js/controls.js");
    const UIMod = await safeImport("./js/ui.js");
    const PokerMod = await safeImport("./js/poker_simulation.js");

    const World = WorldMod?.World;
    const Controls = ControlsMod?.Controls;
    const UI = UIMod?.UI;
    const PokerSimulation = PokerMod?.PokerSimulation;

    // --- Build World ---
    let worldData = null;
    if (World?.build) {
      try {
        worldData = World.build(this.scene, this.player);
        line(`✅ [${now()}] World built`);
      } catch (e) {
        line(`❌ [${now()}] World build failed: ${e?.message || e}`);
      }
    } else {
      line(`❌ [${now()}] World missing (world.js did not load or export World)`);
    }

    // --- Spawn to pad ALWAYS ---
    const room = getRoomFromURL();
    const heightOffset = getParam("height", 0.20); // make you taller by default

    const pad = worldData?.padById?.[room] || worldData?.padById?.lobby;
    let spawnPos = (pad?.position?.clone?.() || worldData?.spawn?.clone?.() || new THREE.Vector3(0, 0, 11.5));

    spawnPos = resolveSpawn(spawnPos, worldData?.colliders || [], worldData?.bounds || null);

    // Move rig to spawn. Add small height offset to make you taller.
    this.player.position.set(spawnPos.x, heightOffset, spawnPos.z);
    this.player.rotation.y = pad?.yaw ?? 0;

    line(`✅ [${now()}] Spawned on pad: ${room} (height +${heightOffset.toFixed(2)})`);

    // --- Controls ---
    if (Controls?.init) {
      try {
        Controls.init({
          renderer: this.renderer,
          camera: this.camera,
          player: this.player,
          colliders: worldData?.colliders || [],
          bounds: worldData?.bounds || null,
          spawn: { position: spawnPos, yaw: pad?.yaw ?? 0 },
        });
        line(`✅ [${now()}] Controls.init OK`);
      } catch (e) {
        line(`❌ [${now()}] Controls.init failed: ${e?.message || e}`);
      }
    } else {
      line(`⚠️ [${now()}] Controls missing (controls.js did not load)`);
    }

    // --- UI ---
    if (UI?.init) {
      try { UI.init(this.scene, this.camera); line(`✅ [${now()}] UI.init OK`); }
      catch (e) { line(`⚠️ [${now()}] UI skipped: ${e?.message || e}`); }
    }

    // --- Poker ---
    if (PokerSimulation?.build) {
      try { PokerSimulation.build({ bots: [] }); line(`✅ [${now()}] PokerSimulation built`); }
      catch (e) { line(`⚠️ [${now()}] PokerSimulation skipped: ${e?.message || e}`); }
    }

    window.addEventListener("resize", () => this.resize());
    this.renderer.setAnimationLoop(() => this.animate(Controls, UI));

    line(`✅ [${now()}] Boot complete. Press ENTER VR.`);
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

  animate(Controls, UI) {
    const dt = this.clock.getDelta();
    try { Controls?.update?.(dt); } catch {}
    try { UI?.update?.(dt); } catch {}
    this.renderer.render(this.scene, this.camera);
  },
};

App.init();
