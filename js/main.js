// /js/main.js — Skylark Poker VR (Oculus-safe entrypoint)
// No dynamic import(). No query-string cache busting. Single module entry.

const overlay = document.getElementById("overlay");
const log = (...a) => { if (overlay) overlay.textContent = a.join(" "); console.log(...a); };
const warn = (...a) => { if (overlay) overlay.textContent = "⚠ " + a.join(" "); console.warn(...a); };
const err = (...a) => { if (overlay) overlay.textContent = "❌ " + a.join(" "); console.error(...a); };

// ---- Load THREE (prefer local wrapper for GitHub Pages stability) ----
import * as THREE_LOCAL from "./three.js";

let THREE = THREE_LOCAL;

try {
  if (!THREE || !THREE.WebGLRenderer) throw new Error("Local ./three.js missing WebGLRenderer export");
  log("✅ THREE loaded (local ./js/three.js)");
} catch (e) {
  // Fallback path (rare): CDN
  warn("Local THREE failed, falling back to CDN…");
  // NOTE: Still not dynamic-importing main.js — only an internal fallback attempt.
  // If Oculus blocks CDN, you still get a readable error message.
  try {
    // eslint-disable-next-line no-undef
    THREE = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js");
    log("✅ THREE loaded (CDN fallback)");
  } catch (e2) {
    err("THREE failed to load. Check ./js/three.js exists and is committed.");
    throw e2;
  }
}

// ---- Optional modules (safe-import as static imports) ----
import { World } from "./world.js";
import { Controls } from "./controls.js";
import { UI } from "./ui.js";
import { PokerSimulation } from "./poker_simulation.js";

import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

// ---- App ----
const APP = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  playerGroup: null,
  colliders: [],
  bounds: null,

  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05060a);
    this.scene.fog = new THREE.Fog(0x05060a, 2, 60);

    // Player rig
    this.playerGroup = new THREE.Group();
    this.scene.add(this.playerGroup);

    // Camera
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
    this.camera.position.set(0, 1.65, 3);
    this.playerGroup.add(this.camera);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));

    this.clock = new THREE.Clock();

    this._addLights();
    this._addFloor(); // always visible baseline (not a cube)

    // Build world (safe)
    try {
      const out = World?.build?.(this.scene, this.playerGroup) || null;
      if (out && Array.isArray(out.colliders)) this.colliders = out.colliders;
      if (out && out.bounds) this.bounds = out.bounds;
      log("✅ World built.");
    } catch (e) {
      warn("World build failed (still running baseline floor).");
      console.warn(e);
    }

    // Controls (safe)
    try {
      Controls?.init?.({
        renderer: this.renderer,
        camera: this.camera,
        player: this.playerGroup,
        colliders: this.colliders,
        bounds: this.bounds,
      });
      log("✅ Controls ready.");
    } catch (e) {
      warn("Controls init failed.");
      console.warn(e);
    }

    // UI (safe)
    try {
      UI?.init?.(this.scene, this.camera, {
        onResetSpawn: () => this._resetSpawn(),
      });
      log("✅ UI ready.");
    } catch (e) {
      warn("UI init failed.");
      console.warn(e);
    }

    // Poker sim (safe)
    try {
      PokerSimulation?.build?.({ players: [], bots: [] });
      log("✅ PokerSimulation ready.");
    } catch (e) {
      // This is not fatal; simulation can be wired later
      warn("PokerSimulation init skipped.");
      console.warn(e);
    }

    window.addEventListener("resize", () => this._resize());
    this.renderer.setAnimationLoop(() => this._animate());

    // Clear overlay after success (keep a tiny hint)
    if (overlay) overlay.textContent = "✅ Loaded. Press VR to enter.";
  },

  _addLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222244, 1.05);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(6, 10, 6);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 0.55);
    fill.position.set(-6, 6, -4);
    this.scene.add(fill);

    const warm = new THREE.PointLight(0xffd27a, 0.7, 20);
    warm.position.set(0, 3.5, 0);
    this.scene.add(warm);
  },

  _addFloor() {
    const g = new THREE.PlaneGeometry(30, 30);
    const m = new THREE.MeshStandardMaterial({ color: 0x111217, roughness: 0.95, metalness: 0.0 });
    const floor = new THREE.Mesh(g, m);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = false;
    this.scene.add(floor);
  },

  _resetSpawn() {
    this.playerGroup.position.set(0, 0, 3);
    this.playerGroup.rotation.set(0, 0, 0);
  },

  _resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  _animate() {
    const dt = this.clock.getDelta();
    try { Controls?.update?.(dt); } catch {}
    try { UI?.update?.(dt); } catch {}
    this.renderer.render(this.scene, this.camera);
  }
};

APP.init();
