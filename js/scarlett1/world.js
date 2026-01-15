// /js/scarlett1/world.js — Update 4.0 World Brain (Permanent)
// - Scene init, lighting, floor
// - Module bus (plug-in systems)
// - Hands-only XR input + locomotion
// - Avatar module (placeholder now; future Meta native hook point)
// - Loading stage -> Active game transition

import { ModuleBus } from "./modules/module_bus.js";
import { LoadingStage } from "./modules/loading_stage.js";
import { HandInput } from "./modules/hand_input.js";
import { HandsLocomotion } from "./modules/locomotion_hands.js";
import { AvatarManager } from "./modules/avatar_manager.js";

// OPTIONAL: drop-in “souped” world build (bigger neon lobby, rooms, etc)
import { buildUltimateWorld } from "./world_ultimate.js";

export class World {
  constructor({ THREE, renderer }) {
    this.THREE = THREE;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070a);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 260);
    this.camera.position.set(0, 1.6, 10);

    this.rig = new THREE.Group();
    this.rig.name = "PlayerRig";
    this.rig.position.set(0, 0, 10);
    this.rig.add(this.camera);
    this.scene.add(this.rig);

    this.bus = new ModuleBus();
    this.state = {
      phase: "loading",   // loading -> active
      xrActive: false,
      dt: 0,
      t: 0
    };
  }

  async init() {
    const { THREE } = this;

    // Core lights (cheap, readable)
    const amb = new THREE.AmbientLight(0xffffff, 0.9);
    const hemi = new THREE.HemisphereLight(0x99bbff, 0x05070a, 0.55);
    const key = new THREE.DirectionalLight(0xffffff, 0.55);
    key.position.set(8, 18, 10);
    this.scene.add(amb, hemi, key);

    // Small base floor so it’s never black
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(12, 12, 0.2, 48),
      new THREE.MeshStandardMaterial({ color: 0x070b10, roughness: 0.95, metalness: 0.05 })
    );
    floor.position.set(0, -0.1, 0);
    floor.userData.teleportSurface = true;
    this.scene.add(floor);

    // Build the “ultimate” world (neon lobby + rooms etc)
    // This stays modular and only touches scene objects.
    const worldData = buildUltimateWorld({ THREE, scene: this.scene });
    this.worldData = worldData;

    // --- MODULES (plug-in) ---
    const loading = new LoadingStage({ THREE, scene: this.scene, rig: this.rig, camera: this.camera });
    const hands = new HandInput({ THREE, renderer: this.renderer, rig: this.rig, camera: this.camera, scene: this.scene });
    const loco = new HandsLocomotion({ THREE, renderer: this.renderer, rig: this.rig, camera: this.camera });
    const avatar = new AvatarManager({
      THREE,
      scene: this.scene,
      rig: this.rig,
      camera: this.camera,
      // Future: provide Meta App ID when there is a web pipeline / IWSDK avatar integration
      metaAppId: null,
      // Optional: allow a fallback URL for a GLB avatar you own (ReadyPlayerMe/etc)
      fallbackAvatarUrl: null
    });

    // Register modules
    this.bus.add(loading);
    this.bus.add(hands);
    this.bus.add(loco);
    this.bus.add(avatar);

    // Init modules
    await this.bus.initAll({
      renderer: this.renderer,
      world: this,
      worldData
    });

    // Connect locomotion targets
    loco.setTeleportTargets({
      pads: worldData.pads,
      surfaces: worldData.teleportSurfaces
    });

    // Start in loading phase
    this.state.phase = "loading";
    loading.show("Loading…", "Hands-only XR • pinch to teleport");

    // Begin async “game ready”
    // (This is where you’d load heavy assets, tables, bots, etc.)
    setTimeout(() => {
      this.state.phase = "active";
      loading.hide();
      avatar.setMode("world");
    }, 700);

    return true;
  }

  tick(t, frame) {
    const dt = this.state.t ? Math.min(0.05, (t - this.state.t) / 1000) : 0;
    this.state.t = t;
    this.state.dt = dt;

    const session = this.renderer.xr.getSession?.() || null;
    this.state.xrActive = !!session;

    // Update modules
    this.bus.updateAll({
      t, dt, frame,
      xrSession: session,
      phase: this.state.phase
    });

    // Update world animations (neon pulse)
    if (this.worldData?.update) this.worldData.update(dt);
  }
                 }
