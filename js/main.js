// /js/main.js — Scarlett Poker VR (Recovery Boot 9.0)
// GitHub Pages + Oculus safe (CDN Three.js).
// Hard rule: This file must be valid ES module, no mixed HTML, no extra text.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

const overlay = document.getElementById("overlay");
const setLine = (t) => { if (overlay) overlay.textContent = t; };
const addLine = (t) => { if (overlay) overlay.textContent += "\n" + t; };

setLine("Scarlett Poker VR — loading…");

// ---- Small helpers ----
function nowTag(){ return new Date().toISOString().slice(11,19); }
function ok(t){ addLine(`✅ [${nowTag()}] ${t}`); }
function warn(t){ addLine(`⚠️ [${nowTag()}] ${t}`); }
function fail(t){ addLine(`❌ [${nowTag()}] ${t}`); }

async function safeImport(path){
  try{
    const m = await import(path);
    ok(`Loaded ${path}`);
    return m;
  }catch(e){
    warn(`Skipped ${path} (${String(e?.message || e)})`);
    return null;
  }
}

// Some modules moved around in your repo; we try both common locations.
async function tryAny(paths){
  for (const p of paths){
    const m = await safeImport(p);
    if (m) return m;
  }
  return null;
}

// ---- Core App ----
const App = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,

  playerRig: null,       // rig group (moves around)
  worldData: null,       // spawn/bounds/colliders if world returns it

  mods: {
    World: null,
    Controls: null,
    UI: null,
    PokerSimulation: null,

    // optional packs
    Audio: null,
    LightsPack: null,
    XRRigFix: null,
    VRLocomotion: null,
    XRLocomotion: null,
    WatchUI: null,
    StoreKiosk: null,
    Store: null,
    Tournament: null,
    VIPRoom: null,
  },

  async init(){
    this.clock = new THREE.Clock();

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x04050a);
    this.scene.fog = new THREE.Fog(0x04050a, 3, 70);

    // Player rig
    this.playerRig = new THREE.Group();
    this.scene.add(this.playerRig);

    // Camera
    this.camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.05, 250);
    this.camera.position.set(0, 1.65, 3);
    this.playerRig.add(this.camera);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.xr.enabled = true;

    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));

    ok("Renderer + VRButton ready");

    // Bright lights (fix dark room)
    this.addBrightLighting();

    // Basic fallback floor (in case World fails)
    this.addFallbackFloor();

    // ---- Load modules (audit style; keep running no matter what) ----
    // Core (preferred local /js/)
    const worldM = await tryAny(["./world.js", "../js/world.js"]);
    const controlsM = await tryAny(["./controls.js", "../js/controls.js"]);
    const uiM = await tryAny(["./ui.js", "../js/ui.js"]);
    const pokerSimM = await tryAny(["./poker_simulation.js", "../js/poker_simulation.js"]);

    this.mods.World = worldM?.World || null;
    this.mods.Controls = controlsM?.Controls || null;
    this.mods.UI = uiM?.UI || null;
    this.mods.PokerSimulation = pokerSimM?.PokerSimulation || null;

    // Optional packs you have in your folder list
    this.mods.Audio        = (await tryAny(["./audio.js"]))?.Audio || null;
    this.mods.LightsPack   = (await tryAny(["./lights_pack.js"]))?.LightsPack || null;
    this.mods.XRRigFix     = (await tryAny(["./xr_rig_fix.js"]))?.XRRigFix || null;
    this.mods.VRLocomotion = (await tryAny(["./vr_locomotion.js"]))?.VRLocomotion || null;
    this.mods.XRLocomotion = (await tryAny(["./xr_locomotion.js"]))?.XRLocomotion || null;
    this.mods.WatchUI      = (await tryAny(["./watch_ui.js"]))?.WatchUI || null;
    this.mods.StoreKiosk   = (await tryAny(["./store_kiosk.js"]))?.StoreKiosk || null;
    this.mods.Store        = (await tryAny(["./store.js"]))?.Store || null;
    this.mods.Tournament   = (await tryAny(["./tournament.js"]))?.Tournament || null;
    this.mods.VIPRoom      = (await tryAny(["./vip_room.js"]))?.VIPRoom || null;

    // ---- Build World ----
    this.buildWorld();

    // ---- Init Controllers / Locomotion ----
    this.initControls();

    // ---- UI ----
    this.initUI();

    // ---- Poker simulation ----
    this.initPoker();

    // ---- Optional systems ----
    this.initOptionalSystems();

    // Resize
    addEventListener("resize", () => this.onResize());

    // Render loop
    this.renderer.setAnimationLoop(() => this.update());

    ok("Boot complete. Enter VR.");
  },

  addBrightLighting(){
    // Strong ambient base
    const hemi = new THREE.HemisphereLight(0xffffff, 0x1b2244, 1.35);
    this.scene.add(hemi);

    // Key light
    const key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(8, 12, 6);
    this.scene.add(key);

    // Fill
    const fill = new THREE.DirectionalLight(0xcfe6ff, 0.65);
    fill.position.set(-7, 8, -6);
    this.scene.add(fill);

    // Ceiling glow (makes dark rooms readable)
    const ceilingGlow = new THREE.PointLight(0xffffff, 1.25, 55, 2);
    ceilingGlow.position.set(0, 7.5, 0);
    this.scene.add(ceilingGlow);

    ok("Lighting added (bright mode)");
  },

  addFallbackFloor(){
    const mat = new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.95, metalness: 0.02 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60,60), mat);
    floor.rotation.x = -Math.PI/2;
    floor.position.y = 0;
    this.scene.add(floor);
  },

  buildWorld(){
    if (!this.mods.World?.build){
      warn("World.build() not found. Using fallback floor only.");
      // spawn safe
      this.playerRig.position.set(0, 0, 8);
      this.playerRig.rotation.y = Math.PI;
      return;
    }

    try{
      // World may return {spawn, colliders, bounds}
      this.worldData = this.mods.World.build(this.scene, this.playerRig) || null;

      // If world provided spawn, use it
      const spawn = this.worldData?.spawn;
      if (spawn?.isVector3){
        this.playerRig.position.set(spawn.x, 0, spawn.z);
      }

      ok("World built");
    }catch(e){
      fail("World build crashed: " + String(e?.message || e));
      this.playerRig.position.set(0, 0, 8);
      this.playerRig.rotation.y = Math.PI;
    }
  },

  initControls(){
    const bounds = this.worldData?.bounds || null;
    const colliders = this.worldData?.colliders || [];

    // Priority: Controls.js (your current working teleport/move system)
    if (this.mods.Controls?.init){
      try{
        this.mods.Controls.init({
          renderer: this.renderer,
          camera: this.camera,
          player: this.playerRig,
          colliders,
          bounds,
          spawn: this.worldData?.spawn ? { position: this.worldData.spawn, yaw: this.playerRig.rotation.y } : null,
        });
        ok("Controls.init() OK");
        return;
      }catch(e){
        warn("Controls.init failed: " + String(e?.message || e));
      }
    }

    // Fallback: if you have VRLocomotion / XRLocomotion modules
    if (this.mods.VRLocomotion?.init){
      try{
        this.mods.VRLocomotion.init({ renderer:this.renderer, camera:this.camera, player:this.playerRig, bounds, colliders });
        ok("VRLocomotion.init() OK");
        return;
      }catch(e){
        warn("VRLocomotion.init failed: " + String(e?.message || e));
      }
    }
    if (this.mods.XRLocomotion?.init){
      try{
        this.mods.XRLocomotion.init({ renderer:this.renderer, camera:this.camera, player:this.playerRig, bounds, colliders });
        ok("XRLocomotion.init() OK");
        return;
      }catch(e){
        warn("XRLocomotion.init failed: " + String(e?.message || e));
      }
    }

    warn("No locomotion module initialized (you may be stuck).");
  },

  initUI(){
    if (!this.mods.UI?.init){
      warn("UI.init not found (menu/watch may be missing).");
      return;
    }
    try{
      this.mods.UI.init(this.scene, this.camera, this.renderer);
      ok("UI.init() OK");
    }catch(e){
      warn("UI.init failed: " + String(e?.message || e));
    }
  },

  initPoker(){
    if (!this.mods.PokerSimulation?.build){
      warn("PokerSimulation.build not found (bots/cards not running yet).");
      return;
    }
    try{
      // Crash-safe build; your module already guards empty players/bots
      this.mods.PokerSimulation.build({ players: [], bots: [] });
      ok("PokerSimulation built");
    }catch(e){
      warn("PokerSimulation failed: " + String(e?.message || e));
    }
  },

  initOptionalSystems(){
    // Audio (optional)
    if (this.mods.Audio?.init){
      try{
        this.mods.Audio.init({ scene:this.scene, camera:this.camera });
        ok("Audio init OK");
      }catch(e){
        warn("Audio init failed: " + String(e?.message || e));
      }
    }

    // Lights pack (optional, may add neon/signage)
    if (this.mods.LightsPack?.build){
      try{
        this.mods.LightsPack.build(this.scene);
        ok("LightsPack built");
      }catch(e){
        warn("LightsPack build failed: " + String(e?.message || e));
      }
    }

    // XR rig fix (optional)
    if (this.mods.XRRigFix?.apply){
      try{
        this.mods.XRRigFix.apply({ renderer:this.renderer, camera:this.camera, player:this.playerRig });
        ok("XRRigFix applied");
      }catch(e){
        warn("XRRigFix failed: " + String(e?.message || e));
      }
    }

    // Watch UI (optional)
    if (this.mods.WatchUI?.init){
      try{
        this.mods.WatchUI.init({ scene:this.scene, camera:this.camera, renderer:this.renderer });
        ok("WatchUI init OK");
      }catch(e){
        warn("WatchUI init failed: " + String(e?.message || e));
      }
    }

    // Store kiosk/shop (optional)
    if (this.mods.StoreKiosk?.build){
      try{
        this.mods.StoreKiosk.build(this.scene);
        ok("StoreKiosk built");
      }catch(e){
        warn("StoreKiosk build failed: " + String(e?.message || e));
      }
    }
  },

  onResize(){
    this.camera.aspect = innerWidth/innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  },

  update(){
    const dt = this.clock.getDelta();

    // Update whichever locomotion system is running
    if (this.mods.Controls?.update){
      try{ this.mods.Controls.update(dt); }catch{}
    }
    if (this.mods.VRLocomotion?.update){
      try{ this.mods.VRLocomotion.update(dt); }catch{}
    }
    if (this.mods.XRLocomotion?.update){
      try{ this.mods.XRLocomotion.update(dt); }catch{}
    }

    // UI update if present
    if (this.mods.UI?.update){
      try{ this.mods.UI.update(dt); }catch{}
    }
    if (this.mods.WatchUI?.update){
      try{ this.mods.WatchUI.update(dt); }catch{}
    }

    this.renderer.render(this.scene, this.camera);
  },
};

// Start
try{
  await App.init();
}catch(e){
  fail("Fatal boot error: " + String(e?.stack || e));
}
