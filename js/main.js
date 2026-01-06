// /js/main.js — Skylark Poker VR — Update 9.2 (NO BLUE CUBE, STABLE)
// Goals:
// - No debug cube on table
// - Consistent Three instance (CDN) to match world.js / controls.js / ui.js
// - Never black-screen: errors are caught and shown in console / UI toast if available
// - Boots: World -> Controls -> UI -> Bots -> PokerSimulation

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { Controls } from "./controls.js";
import { UI } from "./ui.js";

// Optional modules (if present in your repo)
import { Bots } from "./bots.js";
import { PokerSimulation } from "./poker_simulation.js";

const APP = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,

  playerGroup: null,
  colliders: [],
  bounds: null,
  spawn: { position: new THREE.Vector3(0, 0, 5), yaw: 0 },

  // state
  started: false,

  init() {
    // ----- Renderer -----
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.xr.enabled = true;

    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));

    // ----- Scene -----
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07070a);
    this.scene.fog = new THREE.Fog(0x07070a, 6, 70);

    // ----- Player Rig -----
    this.playerGroup = new THREE.Group();
    this.scene.add(this.playerGroup);

    // ----- Camera -----
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
    this.camera.position.set(0, 1.65, 0);
    this.playerGroup.add(this.camera);

    // ----- Clock -----
    this.clock = new THREE.Clock();

    // ----- Base Lighting (prevents "all black") -----
    this.addBaseLighting();

    // ----- Build World (safe) -----
    this.safeBuildWorld();

    // ----- Controls (safe) -----
    this.safeInitControls();

    // ----- UI (safe) -----
    this.safeInitUI();

    // ----- Bots + Poker (safe) -----
    this.safeInitBotsAndPoker();

    // ----- Loop -----
    window.addEventListener("resize", () => this.onResize());
    this.renderer.setAnimationLoop(() => this.animate());

    this.started = true;
    console.log("✅ APP started");
  },

  addBaseLighting() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222244, 1.05);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(6, 10, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xb9d7ff, 0.55);
    fill.position.set(-7, 6, -4);
    this.scene.add(fill);

    const warm = new THREE.PointLight(0xffd27a, 0.85, 35);
    warm.position.set(0, 7, -7);
    this.scene.add(warm);
  },

  safeBuildWorld() {
    try {
      // Your world.js exports World.build(scene) in the screenshot
      const result = World?.build?.(this.scene, this.playerGroup);

      // Optional: if your World.build returns colliders/spawn/bounds we accept them
      if (result && typeof result === "object") {
        if (Array.isArray(result.colliders)) this.colliders = result.colliders;
        if (result.bounds) this.bounds = result.bounds;
        if (result.spawn) this.spawn = result.spawn;
      }

      // If spawn was set in World, apply it
      if (this.spawn?.position?.isVector3) {
        this.playerGroup.position.copy(this.spawn.position);
      } else {
        this.playerGroup.position.set(0, 0, 5);
      }

      if (typeof this.spawn?.yaw === "number") this.playerGroup.rotation.y = this.spawn.yaw;

      console.log("✅ World built");
    } catch (e) {
      console.warn("❌ World build failed (still running):", e);

      // Minimal fallback floor so you don't see nothing — NOT a cube.
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(40, 40),
        new THREE.MeshStandardMaterial({ color: 0x121218, roughness: 0.95, metalness: 0.0 })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      this.scene.add(floor);

      this.playerGroup.position.set(0, 0, 5);
    }
  },

  safeInitControls() {
    try {
      // controls.js in your screenshot expects:
      // Controls.init({ renderer, camera, player, colliders, bounds, teleport, spawn })
      Controls?.init?.({
        renderer: this.renderer,
        camera: this.camera,
        player: this.playerGroup,
        colliders: this.colliders || [],
        bounds: this.bounds || null,
        teleport: null,
        spawn: this.spawn || null
      });
      console.log("✅ Controls init OK");
    } catch (e) {
      console.warn("❌ Controls init failed (still running):", e);
    }
  },

  safeInitUI() {
    try {
      // ui.js in your screenshot: UI.init(scene, camera, opts)
      UI?.init?.(this.scene, this.camera, {
        onNavigate: (route) => {
          console.log("UI navigate:", route);
        },
        onResetSpawn: () => {
          this.playerGroup.position.set(0, 0, 5);
          this.playerGroup.rotation.y = 0;
        },
        onToggleTeleport: () => {
          // Optional hook if your controls support it
          try {
            if (Controls?.toggleTeleport) Controls.toggleTeleport();
          } catch {}
        }
      });
      console.log("✅ UI init OK");
    } catch (e) {
      console.warn("❌ UI init failed (still running):", e);
    }
  },

  safeInitBotsAndPoker() {
    // Bots are optional. If bots.js exists, we wire it.
    try {
      if (Bots?.init && Bots?.createBots && Bots?.spawnMeshes) {
        // Table center is (0,0,0) in your current world/table builds.
        Bots.init({
          scene: this.scene,
          tableCenter: new THREE.Vector3(0, 0, 0)
        });

        Bots.createBots(16);
        Bots.spawnMeshes();
        console.log("✅ Bots spawned:", Bots.bots?.length || 0);
      }
    } catch (e) {
      console.warn("❌ Bots init failed (still running):", e);
    }

    // Poker sim is optional. If poker_simulation.js exists, wire it to bots.
    try {
      if (PokerSimulation?.build && Bots?.bots) {
        PokerSimulation.build({
          players: [],
          bots: Bots.bots,
          hooks: {
            onSetSeated: (ids) => { try { Bots.setSeated(ids); } catch {} },
            onSendToLobby: (ids) => { try { Bots.sendToLobby(ids); } catch {} },
            onSetWinner: (id) => { try { Bots.setWinner(id); } catch {} },
            onToast: (t) => { try { UI?.showToast?.(t); } catch {} }
          }
        });
        console.log("✅ PokerSimulation running");
      }
    } catch (e) {
      console.warn("❌ PokerSimulation init failed (still running):", e);
    }
  },

  animate() {
    const dt = Math.min(0.05, this.clock.getDelta());

    // Controls update (if any)
    try { Controls?.update?.(dt); } catch {}

    // Bots update
    try { Bots?.update?.(dt); } catch {}

    // Poker sim update
    try { PokerSimulation?.update?.(dt); } catch {}

    this.renderer.render(this.scene, this.camera);
  },

  onResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
};

window.addEventListener("DOMContentLoaded", () => {
  try {
    APP.init();
  } catch (e) {
    console.error("❌ APP init crashed:", e);
    document.body.innerHTML = `
      <div style="font-family: monospace; padding: 16px; color: #fff; background: #000;">
        <h2 style="color:#ff4d4d;">APP crashed</h2>
        <pre style="white-space: pre-wrap;">${String(e?.stack || e)}</pre>
      </div>
    `;
  }
});
