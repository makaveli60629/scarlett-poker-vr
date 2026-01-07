// /js/main.js — Scarlett Poker VR — MAIN v13 (VR + Android Touch)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { UI } from "./ui.js";
import { PokerSimulation } from "./poker_simulation.js";

import { Store } from "./store.js";
import { AvatarItems } from "./avatar_items.js";
import { createAvatar } from "./avatar.js";
import { MobileTouch } from "./mobile_touch.js";

// Optional controls module (VR movement)
let Controls = null;

const overlay = document.getElementById("overlay");

function hubLine(s){
  if (!overlay) return;
  const lines = (overlay.textContent || "").split("\n");
  lines.push(s);
  overlay.textContent = lines.slice(-22).join("\n");
}

async function safeImport(path, label){
  try{
    const mod = await import(path);
    hubLine(`✅ ${label}`);
    return mod;
  }catch(e){
    hubLine(`⚠️ ${label} (skipped)`);
    console.warn("Import failed:", path, e);
    return null;
  }
}

hubLine("Scarlett Poker VR — booting…");

const App = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,

  playerRig: null,
  worldData: null,

  localAvatar: null,

  async init() {
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();

    this.playerRig = new THREE.Group();
    this.scene.add(this.playerRig);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 220);
    this.camera.position.set(0, 1.65, 3);
    this.playerRig.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    // ALWAYS keep VR Button
    document.body.appendChild(VRButton.createButton(this.renderer));
    hubLine("✅ VRButton ready");

    // Try to import VR controls (if missing, Android still works)
    const cmod = await safeImport("./controls.js", "controls.js");
    Controls = cmod?.Controls || null;

    // World
    try {
      this.worldData = World.build(this.scene, this.playerRig);
      hubLine("✅ world.js loaded");
    } catch (e) {
      hubLine("❌ world.js failed");
      console.error(e);
      this.worldData = null;
    }

    // Spawn on lobby pad
    if (this.worldData?.spawn) {
      this.playerRig.position.set(this.worldData.spawn.x, 0, this.worldData.spawn.z);
      hubLine("✅ Spawn on telepad");
    } else {
      this.playerRig.position.set(0, 0, 10);
      hubLine("⚠️ Spawn fallback");
    }

    // UI
    try {
      UI.init({ scene: this.scene, camera: this.camera, renderer: this.renderer, overlay });
      hubLine("✅ ui.js loaded");
    } catch (e) {
      hubLine("⚠️ ui.js failed");
      console.warn(e);
    }

    // Poker
    try {
      PokerSimulation.init?.({ scene: this.scene, world: this.worldData });
      hubLine("✅ poker_simulation.js loaded");
    } catch (e) {
      hubLine("⚠️ poker_simulation.js failed");
      console.warn(e);
    }

    // Local avatar preview (to see cosmetics on Android)
    this.localAvatar = createAvatar({ name:"YOU", height:1.78, shirt:0x00ffaa, accent:0x00ffaa });
    this.localAvatar.group.position.set(this.playerRig.position.x + 1.2, 0, this.playerRig.position.z + 0.6);
    this.scene.add(this.localAvatar.group);

    // Store
    try {
      Store.init({ scene: this.scene, camera: this.camera, overlay });
      hubLine("✅ store.js loaded");

      Store.onProfileChanged = (profile) => {
        this.applyProfileToAvatar(this.localAvatar, profile);
      };

      // initial profile apply
      const profile = AvatarItems.loadState();
      this.applyProfileToAvatar(this.localAvatar, profile);
    } catch (e) {
      hubLine("⚠️ store.js failed");
      console.warn(e);
    }

    // Mobile touch controls (Android)
    try {
      MobileTouch.init({
        renderer: this.renderer,
        camera: this.camera,
        player: this.playerRig,
        overlay
      });
      hubLine("✅ mobile_touch.js loaded");
    } catch (e) {
      hubLine("⚠️ mobile_touch.js failed");
      console.warn(e);
    }

    // VR Controls init (if present)
    if (Controls?.init) {
      try {
        Controls.init({
          renderer: this.renderer,
          camera: this.camera,
          player: this.playerRig,
          colliders: this.worldData?.colliders || [],
          bounds: this.worldData?.bounds || null,
          spawn: { position: this.worldData?.spawn || new THREE.Vector3(0,0,10), yaw: 0 }
        });
        hubLine("✅ Controls init OK");
      } catch (e) {
        hubLine("⚠️ Controls init failed");
        console.warn(e);
      }
    } else {
      hubLine("⚠️ VR Controls missing (VR move may not work)");
    }

    window.addEventListener("resize", () => this.resize());
    this.renderer.setAnimationLoop(() => this.animate());

    hubLine("✅ Loaded — Android: use 2 thumbs • Oculus: Enter VR");
  },

  applyProfileToAvatar(avatarApi, profile) {
    if (!avatarApi || !profile) return;

    const equipped = profile.equipped || {};
    const shirtItem = equipped.shirt ? AvatarItems.getItem(equipped.shirt) : null;
    const auraItem  = equipped.aura  ? AvatarItems.getItem(equipped.aura)  : null;
    const hatItem   = equipped.hat   ? AvatarItems.getItem(equipped.hat)   : null;
    const gItem     = equipped.glasses ? AvatarItems.getItem(equipped.glasses) : null;

    avatarApi.clearGear?.();

    if (shirtItem?.data?.shirt) avatarApi.setShirtColor(shirtItem.data.shirt);

    if (auraItem?.data?.aura) avatarApi.setAura(auraItem.data.aura);
    else avatarApi.setAura(null);

    if (hatItem?.data?.hat === "cap") avatarApi.equipHat({ color: hatItem.data.color || 0x111111 });
    if (gItem?.data?.glasses === "basic") avatarApi.equipGlasses({ color: gItem.data.color || 0x111111 });
  },

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  animate() {
    const dt = this.clock.getDelta();

    // Android touch (non-VR)
    try { MobileTouch.update(dt); } catch {}

    // VR controls (VR only)
    try { Controls?.update?.(dt); } catch {}

    try { UI?.update?.(dt); } catch {}
    try { PokerSimulation?.update?.(dt); } catch {}

    this.renderer.render(this.scene, this.camera);
  }
};

App.init();
