// /js/scarlett1/world.js — Update 4.1 World Brain (FULL)
// ✅ Modular bus
// ✅ Hands-only XR (WebXR Hands)
// ✅ LoadingStage + MetaStyleAvatar (Quest-like toon)
// ✅ HandsLocomotion (pinch teleport + snap turn)
// ✅ Ultimate World + Ultimate Props
// ✅ Poker Layer: Table + Dealer Button + Chips + Cards + Turn UI (CanvasTexture, no Sprites)

import { ModuleBus } from "./modules/module_bus.js";
import { LoadingStage } from "./modules/loading_stage.js";
import { HandInput } from "./modules/hand_input.js";
import { HandsLocomotion } from "./modules/locomotion_hands.js";
import { MetaStyleAvatar } from "./modules/meta_style_avatar.js";

import { PokerTableSystem } from "./modules/poker_table_system.js";
import { DealerSystem } from "./modules/dealer_system.js";
import { ChipsSystem } from "./modules/chips_system.js";
import { CardsSystem } from "./modules/cards_system.js";
import { TurnUISystem } from "./modules/turn_ui_system.js";

import { buildUltimateWorld } from "./world_ultimate.js";
import { buildUltimateProps } from "./world_props_ultimate.js";

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
      phase: "loading",
      xrActive: false,
      dt: 0,
      t: 0
    };

    // world builders
    this.worldData = null;
    this.propsData = null;

    // module refs
    this.loading = null;
    this.hands = null;
    this.loco = null;
    this.avatar = null;

    this.tableSys = null;
    this.dealerSys = null;
    this.chipsSys = null;
    this.cardsSys = null;
    this.turnUISys = null;

    // shared namespace for systems to find each other
    this.poker = {};
  }

  async init() {
    const { THREE } = this;

    // --- Lighting (Quest-safe but readable)
    const amb = new THREE.AmbientLight(0xffffff, 0.92);
    const hemi = new THREE.HemisphereLight(0x99bbff, 0x05070a, 0.6);
    const key = new THREE.DirectionalLight(0xffffff, 0.55);
    key.position.set(8, 18, 10);
    this.scene.add(amb, hemi, key);

    // Fog (nice depth, still cheap)
    this.scene.fog = new THREE.Fog(0x05070a, 18, 120);

    // Safety floor (never black)
    const safetyFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(12, 12, 0.2, 48),
      new THREE.MeshStandardMaterial({ color: 0x070b10, roughness: 0.95, metalness: 0.05 })
    );
    safetyFloor.position.set(0, -0.1, 0);
    safetyFloor.userData.teleportSurface = true;
    this.scene.add(safetyFloor);

    // --- Build world + props (Ultimate)
    this.worldData = buildUltimateWorld({ THREE, scene: this.scene });
    this.propsData = buildUltimateProps({ THREE, scene: this.scene, worldData: this.worldData });

    // --- Modules (core)
    this.loading = new LoadingStage({ THREE, scene: this.scene, rig: this.rig, camera: this.camera });
    this.hands = new HandInput({ THREE, renderer: this.renderer, rig: this.rig, camera: this.camera, scene: this.scene });
    this.loco = new HandsLocomotion({ THREE, renderer: this.renderer, rig: this.rig, camera: this.camera });

    this.avatar = new MetaStyleAvatar({
      THREE,
      scene: this.scene,
      rig: this.rig,
      camera: this.camera
    });

    // --- Modules (poker)
    this.tableSys = new PokerTableSystem({ THREE, scene: this.scene });
    this.dealerSys = new DealerSystem({ THREE, scene: this.scene });
    this.chipsSys = new ChipsSystem({ THREE, scene: this.scene });
    this.cardsSys = new CardsSystem({ THREE, scene: this.scene });
    this.turnUISys = new TurnUISystem({ THREE, scene: this.scene, camera: this.camera });

    // Register modules (order matters: hands before listeners, table before dealer/cards/chips)
    this.bus.add(this.loading);
    this.bus.add(this.hands);
    this.bus.add(this.loco);
    this.bus.add(this.avatar);

    this.bus.add(this.tableSys);
    this.bus.add(this.dealerSys);
    this.bus.add(this.chipsSys);
    this.bus.add(this.cardsSys);
    this.bus.add(this.turnUISys);

    // Init modules
    await this.bus.initAll({
      renderer: this.renderer,
      world: this,
      worldData: this.worldData
    });

    // Connect locomotion targets
    this.loco.setTeleportTargets({
      pads: this.worldData?.pads || [],
      surfaces: this.worldData?.teleportSurfaces?.length ? this.worldData.teleportSurfaces : [safetyFloor]
    });

    // --- Loading phase
    this.state.phase = "loading";
    this.loading.show("Loading…", "Hands-only XR • pinch to teleport");
    this.avatar.setMode("loading");

    // Transition to active (replace later with real asset loading)
    setTimeout(() => {
      this.state.phase = "active";
      this.loading.hide();
      this.avatar.setMode("world");

      // Ensure the Turn UI draws at least once
      if (this.turnUISys?._draw) this.turnUISys._draw(this);
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
    if (this.propsData?.update) this.propsData.update(dt);

    // update modules
    this.bus.updateAll({
      t, dt, frame,
      xrSession: session,
      phase: this.state.phase,
      world: this
    });
  }
  }
