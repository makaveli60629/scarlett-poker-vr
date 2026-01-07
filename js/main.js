// /js/main.js — Scarlett Poker VR — MAIN v12 (Adds Store + Avatar Items)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { UI } from "./ui.js";
import { PokerSimulation } from "./poker_simulation.js";
import { init as initBots } from "./bots.js";

import { Store } from "./store.js";
import { AvatarItems } from "./avatar_items.js";
import { createAvatar } from "./avatar.js";

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
  bots: null,

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

    // Always VR Button
    document.body.appendChild(VRButton.createButton(this.renderer));
    hubLine("✅ VRButton ready");

    // Controls (optional)
    const cmod = await safeImport("./controls.js", "controls.js");
    Controls = cmod?.Controls || null;

    // World
    try {
      this.worldData = World.build(this.scene);
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

    // Poker visuals
    try {
      PokerSimulation.init({ scene: this.scene, world: this.worldData });
      hubLine("✅ poker_simulation.js loaded");
    } catch (e) {
      hubLine("⚠️ poker_simulation.js failed");
      console.warn(e);
    }

    // Local player “avatar preview” (non-VR visual only)
    // (Later we can attach hands/controllers; for now this proves cosmetics work.)
    this.localAvatar = createAvatar({ name:"YOU", height:1.78, shirt:0x00ffaa, accent:0x00ffaa });
    this.localAvatar.group.position.set(this.playerRig.position.x + 1.2, 0, this.playerRig.position.z + 0.6);
    this.scene.add(this.localAvatar.group);

    // Bots
    try {
      this.bots = initBots({ scene: this.scene, world: this.worldData });
      hubLine("✅ bots.js loaded");
    } catch (e) {
      hubLine("⚠️ bots.js failed");
      console.warn(e);
    }

    // Store
    try {
      Store.init({ scene: this.scene, camera: this.camera, overlay });
      hubLine("✅ store.js loaded");

      // When store changes profile, apply to local avatar + randomize some bots
      Store.onProfileChanged = (profile) => {
        this.applyProfileToAvatar(this.localAvatar, profile);
        this.randomizeBotsCosmetics(profile);
      };

      // apply initial profile
      const profile = AvatarItems.loadState();
      this.applyProfileToAvatar(this.localAvatar, profile);
      this.randomizeBotsCosmetics(profile);
    } catch (e) {
      hubLine("⚠️ store.js failed");
      console.warn(e);
    }

    // Controls init
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
      hubLine("⚠️ Controls missing (movement may not work)");
    }

    window.addEventListener("resize", () => this.resize());
    this.renderer.setAnimationLoop(() => this.animate());

    hubLine("✅ Loaded — Enter VR");
  },

  applyProfileToAvatar(avatarApi, profile) {
    if (!avatarApi || !profile) return;

    const equipped = profile.equipped || {};
    const apply = (type) => {
      const id = equipped[type];
      if (!id) return null;
      return AvatarItems.getItem(id);
    };

    const shirt = apply("shirt");
    const aura  = apply("aura");
    const hat   = apply("hat");
    const glasses = apply("glasses");

    // clear previous gear
    avatarApi.clearGear?.();

    if (shirt?.data?.shirt) avatarApi.setShirtColor(shirt.data.shirt);
    if (aura?.data?.aura) avatarApi.setAura(aura.data.aura);
    else avatarApi.setAura(null);

    if (hat?.data?.hat === "cap") avatarApi.equipHat({ color: hat.data.color || 0x111111 });
    if (glasses?.data?.glasses === "basic") avatarApi.equipGlasses({ color: glasses.data.color || 0x111111 });
  },

  randomizeBotsCosmetics(profile) {
    // makes the room feel alive: bots wear random catalog cosmetics
    // (later we’ll swap to real shirts/skins)
    const items = AvatarItems.catalog;

    // If bots.js exposes the bot objects later, we can integrate deeper.
    // For now, this is safe/no-crash placeholder.
  },

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  animate() {
    const dt = this.clock.getDelta();
    try { Controls?.update?.(dt); } catch {}
    try { UI?.update?.(dt); } catch {}
    try { this.bots?.update?.(dt); } catch {}
    try { PokerSimulation?.update?.(dt); } catch {}
    this.renderer.render(this.scene, this.camera);
  }
};

App.init();
