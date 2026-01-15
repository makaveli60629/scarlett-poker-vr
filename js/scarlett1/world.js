// /js/scarlett1/world.js — Update 4.0 World Brain (Permanent)
// ✅ Hands-only XR
// ✅ Modular ModuleBus
// ✅ LoadingStage (camera-attached)
// ✅ HandInput (WebXR Hands)
// ✅ HandsLocomotion (pinch teleport + pinch snap turn)
// ✅ MetaStyleAvatar (Quest-like toon avatar: NOT user-private)
// ✅ Ultimate World builder (big lobby + rooms + pads + pit)

import { ModuleBus } from "./modules/module_bus.js";
import { LoadingStage } from "./modules/loading_stage.js";
import { HandInput } from "./modules/hand_input.js";
import { HandsLocomotion } from "./modules/locomotion_hands.js";
import { MetaStyleAvatar } from "./modules/meta_style_avatar.js";

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

    // pointers to modules
    this.loading = null;
    this.hands = null;
    this.loco = null;
    this.avatar = null;

    this.worldData = null;
  }

  async init() {
    const { THREE } = this;

    // --- Lighting: bright enough to read geometry but still neon vibe
    const amb = new THREE.AmbientLight(0xffffff, 0.92);
    const hemi = new THREE.HemisphereLight(0x99bbff, 0x05070a, 0.6);
    const key = new THREE.DirectionalLight(0xffffff, 0.55);
    key.position.set(8, 18, 10);
    this.scene.add(amb, hemi, key);

    // Fog (Quest-safe)
    this.scene.fog = new THREE.Fog(0x05070a, 18, 120);

    // Safety floor so nothing is black even if world builder fails
    const safetyFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(12, 12, 0.2, 48),
      new THREE.MeshStandardMaterial({ color: 0x070b10, roughness: 0.95, metalness: 0.05 })
    );
    safetyFloor.position.set(0, -0.1, 0);
    safetyFloor.userData.teleportSurface = true;
    this.scene.add(safetyFloor);

    // --- Build Ultimate World (souped up)
    // returns: { group, teleportSurfaces, pads, update(dt) }
    this.worldData = buildUltimateWorld({ THREE, scene: this.scene });

    // --- Modules (plug-in)
    this.loading = new LoadingStage({ THREE, scene: this.scene, rig: this.rig, camera: this.camera });
    this.hands = new HandInput({ THREE, renderer: this.renderer, rig: this.rig, camera: this.camera, scene: this.scene });
    this.loco = new HandsLocomotion({ THREE, renderer: this.renderer, rig: this.rig, camera: this.camera });

    // ✅ Quest-like Meta Style Avatar (NOT user-private avatar)
    this.avatar = new MetaStyleAvatar({
      THREE,
      scene: this.scene,
      rig: this.rig,
      camera: this.camera
    });

    // register in bus
    this.bus.add(this.loading);
    this.bus.add(this.hands);
    this.bus.add(this.loco);
    this.bus.add(this.avatar);

    // init modules
    await this.bus.initAll({
      renderer: this.renderer,
      world: this,
      worldData: this.worldData
    });

    // connect locomotion targets (pads + teleport surfaces)
    this.loco.setTeleportTargets({
      pads: this.worldData?.pads || [],
      surfaces: this.worldData?.teleportSurfaces || [safetyFloor]
    });

    // --- LOADING PHASE
    this.state.phase = "loading";

    // show loading panel
    this.loading.show("Loading…", "Hands-only XR • pinch to teleport");

    // show avatar in loading mode
    this.avatar.setMode("loading");

    // "Game ready" transition (replace with real async loads later)
    // When ready:
    setTimeout(() => {
      this.state.phase = "active";
      this.loading.hide();

      // avatar enters world mode (stays active)
      this.avatar.setMode("world");
    }, 900);

    return true;
  }

  tick(t, frame) {
    const dt = this.state.t ? Math.min(0.05, (t - this.state.t) / 1000) : 0;
    this.state.t = t;
    this.state.dt = dt;

    const session = this.renderer.xr.getSession?.() || null;
    this.state.xrActive = !!session;

    // update world visuals
    if (this.worldData?.update) this.worldData.update(dt);

    // update modules
    this.bus.updateAll({
      t, dt, frame,
      xrSession: session,
      phase: this.state.phase
    });
  }
  }
