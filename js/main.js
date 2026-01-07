// /js/main.js — Scarlett Poker VR — MAIN vNext (Quest + GitHub Pages safe)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { createHub } from "./diagnostics.js";
import { safeImport } from "./safe_import.js";
import { ShirtSystem } from "./shirt.js";

const hub = createHub();
hub.addLine("✅ main.js started");

const App = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,

  rig: null,        // player rig group
  worldData: null,  // from world.build
  systems: {},      // loaded modules

  // XR grips
  leftGrip: null,
  rightGrip: null,

  // shirts
  shirts: null,

  fpsT: 0,
  fpsC: 0,

  async init() {
    this.clock = new THREE.Clock();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.xr.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    // ✅ VR button always (Quest)
    document.body.appendChild(VRButton.createButton(this.renderer));
    hub.addLine("✅ VRButton attached");

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07080c);
    this.scene.fog = new THREE.Fog(0x07080c, 4, 70);

    // Rig + Camera
    this.rig = new THREE.Group();
    this.scene.add(this.rig);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
    this.camera.position.set(0, 1.65, 0);
    this.rig.add(this.camera);

    // Backup lighting (prevents black void even if world fails)
    this.addBackupLights();

    // Headlamp attached to camera (helps a LOT on Quest)
    this.addHeadlamp();

    // --- Create XR controller grips (these are the anchors for hands/laser/shirts) ---
    this.leftGrip = this.renderer.xr.getControllerGrip(0);
    this.rightGrip = this.renderer.xr.getControllerGrip(1);
    this.scene.add(this.leftGrip, this.rightGrip);
    hub.addLine("✅ Controller grips created");

    // --- Shirts (attach to grips) ---
    try {
      this.shirts = ShirtSystem.create({ textureUrl: "assets/textures/shirt_diffuse.png" });
      const okL = this.shirts.attachToControllerGrip(this.leftGrip);
      const okR = this.shirts.attachToControllerGrip(this.rightGrip);
      hub.addLine(okL && okR ? "✅ Shirt attached to grips" : "⚠️ Shirt attach partial");
    } catch (e) {
      hub.addLine("⚠️ ShirtSystem failed");
      hub.addLine(`   ↳ ${String(e?.message || e)}`.slice(0, 180));
    }

    // --- Safe imports (everything optional except world/controls) ---
    const WorldI  = await safeImport(hub, "world", "./world.js");
    const CtrlsI  = await safeImport(hub, "controls", "./controls.js");
    const VRI     = await safeImport(hub, "vrcontroller", "./vrcontroller.js");
    const AndI    = await safeImport(hub, "android_controls", "./android_controls.js");
    const UII     = await safeImport(hub, "ui", "./ui.js");
    const AudioI  = await safeImport(hub, "audio", "./audio.js");
    const PokerI  = await safeImport(hub, "poker_simulation", "./poker_simulation.js");
    const BotsI   = await safeImport(hub, "bots", "./bots.js");
    const StoreI  = await safeImport(hub, "store", "./store.js");
    const InvI    = await safeImport(hub, "inventory", "./inventory.js");
    const AvatarI = await safeImport(hub, "avatar", "./avatar.js");

    this.systems.World = WorldI.mod?.World || null;
    this.systems.Controls = CtrlsI.mod?.Controls || null;
    this.systems.VRController = VRI.mod?.VRController || null;
    this.systems.AndroidControls = AndI.mod?.AndroidControls || null;
    this.systems.UI = UII.mod?.UI || null;
    this.systems.Audio = AudioI.mod?.AudioSystem || null;
    this.systems.Poker = PokerI.mod?.PokerSimulation || null;
    this.systems.Bots = BotsI.mod?.Bots || null;
    this.systems.Store = StoreI.mod?.Store || null;
    this.systems.Inventory = InvI.mod?.Inventory || null;
    this.systems.Avatar = AvatarI.mod?.Avatar || null;

    // --- World build (spawn MUST be on lobby pad) ---
    try {
      if (this.systems.World?.build) {
        this.worldData = this.systems.World.build(this.scene, this.rig);
        hub.addLine("✅ World built");
      } else {
        hub.addLine("⚠️ World missing build() — using fallback floor");
        this.addFallbackFloor();
      }
    } catch (e) {
      hub.addLine("❌ World build error — using fallback floor");
      hub.addLine(`   ↳ ${String(e?.message || e)}`.slice(0, 180));
      hub.set({ lastErr: String(e?.message || e) });
      this.addFallbackFloor();
    }

    // Spawn safely on lobby pad if present
    this.applySpawn(true);

    // --- Controls init (movement/collision) ---
    try {
      this.systems.Controls?.init?.({
        renderer: this.renderer,
        camera: this.camera,
        rig: this.rig,
        colliders: this.worldData?.colliders || [],
        bounds: this.worldData?.bounds || null,
        floorY: this.worldData?.floorY ?? 0,
      });
      hub.addLine("✅ Controls init");
    } catch (e) {
      hub.addLine("⚠️ Controls init failed");
      hub.addLine(`   ↳ ${String(e?.message || e)}`.slice(0, 180));
    }

    // --- VR controller rig: hands + laser + teleport ring ---
    // IMPORTANT: pass grips so the laser does NOT get stuck at world center
    try {
      this.systems.VRController?.init?.({
        renderer: this.renderer,
        scene: this.scene,
        rig: this.rig,
        camera: this.camera,
        leftGrip: this.leftGrip,
        rightGrip: this.rightGrip,
        getWorld: () => this.worldData,
      });
      hub.addLine("✅ VRController init");
    } catch (e) {
      hub.addLine("⚠️ VRController init failed");
      hub.addLine(`   ↳ ${String(e?.message || e)}`.slice(0, 180));
    }

    // --- Android touch controls (two thumb pads) ---
    try {
      this.systems.AndroidControls?.init?.({
        renderer: this.renderer,
        rig: this.rig,
        camera: this.camera,
        // phone: look = left finger drag, move = right thumb pad
        onTeleport: (pos) => this.systems.Controls?.teleportTo?.(pos),
        getBounds: () => this.worldData?.bounds || null,
        getFloorY: () => this.worldData?.floorY ?? 0,
      });
      hub.addLine("✅ AndroidControls init");
    } catch (e) {
      hub.addLine("⚠️ AndroidControls init failed");
      hub.addLine(`   ↳ ${String(e?.message || e)}`.slice(0, 180));
    }

    // --- UI ---
    try {
      this.systems.UI?.init?.({
        scene: this.scene,
        camera: this.camera,
        rig: this.rig,
        hub,
        onRecenter: () => this.applySpawn(true),
        onToggleHeightLock: () => this.systems.Controls?.toggleHeightLock?.(),
      });
      hub.addLine("✅ UI init");
    } catch (e) {
      hub.addLine("⚠️ UI init failed");
      hub.addLine(`   ↳ ${String(e?.message || e)}`.slice(0, 180));
    }

    // --- Inventory + Store ---
    try {
      this.systems.Inventory?.init?.();
      this.systems.Store?.init?.({ inventory: this.systems.Inventory });
      hub.addLine("✅ Store+Inventory init");
    } catch (e) {
      hub.addLine("⚠️ Store/Inventory init failed");
      hub.addLine(`   ↳ ${String(e?.message || e)}`.slice(0, 180));
    }

    // --- Audio ---
    try {
      this.systems.Audio?.init?.({ camera: this.camera, hub });
      hub.addLine("✅ Audio init");
    } catch (e) {
      hub.addLine("⚠️ Audio init failed");
    }

    // --- Poker + Bots ---
    try {
      this.systems.Poker?.build?.();
      hub.addLine("✅ PokerSimulation init");
    } catch (e) {
      hub.addLine("⚠️ PokerSimulation init failed");
    }

    try {
      this.systems.Bots?.init?.({
        scene: this.scene,
        rig: this.rig,
        getSeats: () => this.worldData?.seats || [],
        getLobbyZone: () => this.worldData?.lobbyZone || null,
      });
      hub.addLine("✅ Bots init");
    } catch (e) {
      hub.addLine("⚠️ Bots init failed");
    }

    window.addEventListener("resize", () => this.resize());
    this.renderer.setAnimationLoop(() => this.animate());
    hub.addLine("✅ Animation loop started");
  },

  addBackupLights() {
    const amb = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(amb);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.75);
    hemi.position.set(0, 12, 0);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(8, 18, 8);
    this.scene.add(key);
  },

  addHeadlamp() {
    // A small point light attached to camera to prevent “void darkness”
    const lamp = new THREE.PointLight(0xffffff, 1.2, 12);
    lamp.position.set(0, 0.2, -0.2);
    this.camera.add(lamp);

    const lamp2 = new THREE.SpotLight(0xffffff, 0.9, 18, Math.PI / 7, 0.4, 1.0);
    lamp2.position.set(0, 0.15, 0.1);
    lamp2.target.position.set(0, 0.1, -1.0);
    this.camera.add(lamp2);
    this.camera.add(lamp2.target);

    hub.addLine("✅ Headlamp on camera");
  },

  addFallbackFloor() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x15161b, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.001;
    this.scene.add(floor);
  },

  applySpawn(force = false) {
    if (!this.worldData?.spawn) return;
    if (force || this.rig.position.lengthSq() < 0.001) {
      this.rig.position.set(this.worldData.spawn.x, 0, this.worldData.spawn.z);
      this.rig.rotation.y = 0;
      hub.addLine(`✅ Spawned @ lobby pad (${this.worldData.spawn.x.toFixed(2)}, ${this.worldData.spawn.z.toFixed(2)})`);
    }
  },

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  animate() {
    const dt = this.clock.getDelta();

    // FPS
    this.fpsT += dt; this.fpsC++;
    if (this.fpsT > 0.5) {
      hub.set({ fps: this.fpsC / this.fpsT });
      this.fpsT = 0; this.fpsC = 0;
    }

    // XR + controller detect
    const session = this.renderer.xr.getSession?.();
    let left = false, right = false;
    if (session?.inputSources) {
      for (const s of session.inputSources) {
        if (!s?.gamepad) continue;
        if (s.handedness === "left") left = true;
        if (s.handedness === "right") right = true;
      }
    }

    hub.set({
      xr: !!session,
      left,
      right,
      rig: { x: this.rig.position.x, y: this.rig.position.y, z: this.rig.position.z },
    });

    // Update systems
    this.systems.Controls?.update?.(dt);
    this.systems.VRController?.update?.(dt);
    this.systems.AndroidControls?.update?.(dt);
    this.systems.UI?.update?.(dt);
    this.systems.Audio?.update?.(dt);
    this.systems.Bots?.update?.(dt);

    this.renderer.render(this.scene, this.camera);
  },
};

App.init();
