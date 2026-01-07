// /js/main.js — Scarlett Poker VR — MAIN v15 (All systems: World + Controls + VR Ray + Android + Store + Bots + Poker)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { Controls } from "./controls.js";
import { VRController } from "./vrcontroller.js";
import { MobileTouch } from "./mobile_touch.js";
import { UI } from "./ui.js";
import { Store } from "./store.js";
import { AvatarItems } from "./avatar_items.js";
import { createAvatar } from "./avatar.js";
import { BotManager } from "./bot.js";
import { PokerSimulation } from "./poker_simulation.js";

const overlay = document.getElementById("overlay");
const btnStore = document.getElementById("btnStore");
const btnCal = document.getElementById("btnCal");
const btnMusic = document.getElementById("btnMusic");

function hubReset(){
  if (!overlay) return;
  overlay.textContent = "Scarlett Poker VR — hub\n";
}
function hubLine(s){
  if (!overlay) return;
  overlay.textContent += s + "\n";
}

hubReset();
hubLine("Booting…");

const App = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,

  rig: null,
  world: null,
  localAvatar: null,

  music: null,
  musicOn: false,

  async init() {
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07080c);
    this.scene.fog = new THREE.Fog(0x07080c, 2, 85);

    this.rig = new THREE.Group();
    this.scene.add(this.rig);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 220);
    this.camera.position.set(0, 1.65, 3);
    this.rig.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    // ✅ VR button ALWAYS
    document.body.appendChild(VRButton.createButton(this.renderer));
    hubLine("✅ VRButton");

    // World
    try {
      this.world = World.build(this.scene, this.rig);
      hubLine("✅ world.js");
    } catch (e) {
      hubLine("❌ world.js FAILED");
      console.error(e);
      this.world = null;
    }

    // Spawn on lobby pad ALWAYS
    if (this.world?.spawn) {
      this.rig.position.set(this.world.spawn.x, 0, this.world.spawn.z);
      hubLine("✅ Spawn on telepad");
    } else {
      this.rig.position.set(0, 0, 10);
      hubLine("⚠️ Spawn fallback");
    }

    // Controls (VR locomotion + teleport + height lock)
    try {
      Controls.init({
        renderer: this.renderer,
        camera: this.camera,
        player: this.rig,
        colliders: this.world?.colliders || [],
        bounds: this.world?.bounds || null,
        floorY: this.world?.floorY ?? 0,
      });
      hubLine("✅ controls.js");
    } catch (e) {
      hubLine("❌ controls.js FAILED");
      console.error(e);
    }

    // Android touch
    try {
      MobileTouch.init({
        camera: this.camera,
        rig: this.rig,
        padLookId: "padLook",
        padMoveId: "padMove",
      });
      hubLine("✅ mobile_touch.js");
    } catch (e) {
      hubLine("⚠️ mobile_touch.js failed");
      console.warn(e);
    }

    // UI
    try {
      UI.init({ overlay });
      hubLine("✅ ui.js");
    } catch (e) {
      hubLine("⚠️ ui.js failed");
    }

    // Store + items
    try {
      AvatarItems.ensureDefaults();
      Store.init({
        onEquip: (state) => {
          AvatarItems.saveState(state);
          this.applyAvatarState(this.localAvatar, state);
        },
        onRequestState: () => AvatarItems.loadState(),
      });
      hubLine("✅ store.js + avatar_items.js");
    } catch (e) {
      hubLine("⚠️ store.js / avatar_items.js failed");
      console.warn(e);
    }

    // Local avatar preview by kiosk
    try {
      this.localAvatar = createAvatar({ name: "YOU", height: 1.78 });
      const k = this.world?.kioskPos || new THREE.Vector3(11.5, 0, 2.8);
      this.localAvatar.group.position.set(k.x - 1.6, this.world?.floorY ?? 0, k.z);
      this.scene.add(this.localAvatar.group);
      this.applyAvatarState(this.localAvatar, AvatarItems.loadState());
      hubLine("✅ avatar.js preview");
    } catch (e) {
      hubLine("⚠️ avatar.js failed");
      console.warn(e);
    }

    // VR controller ray (laser + ring follows HAND)
    try {
      VRController.init({
        renderer: this.renderer,
        scene: this.scene,
        camera: this.camera,
        floorY: this.world?.floorY ?? 0,
        getRayTargets: () => (this.world?.rayTargets || []),
        onPrimaryAction: (hit) => {
          // If hit kiosk => toggle store
          if (hit?.object?.userData?.isKioskPart || hit?.object?.parent?.userData?.isKioskPart) {
            Store.toggle();
            hubLine("🛍️ Store toggled (VR)");
          }
        }
      });
      hubLine("✅ vrcontroller.js");
    } catch (e) {
      hubLine("⚠️ vrcontroller.js failed");
      console.warn(e);
    }

    // Bots + tournament behavior
    try {
      BotManager.init({ scene: this.scene, world: this.world });
      BotManager.spawnBots({ count: 8 });
      hubLine("✅ bot.js");
    } catch (e) {
      hubLine("⚠️ bot.js failed");
      console.warn(e);
    }

    // Poker simulation (wires to bots)
    try {
      PokerSimulation.init({ bots: BotManager, world: this.world });
      hubLine("✅ poker_simulation.js");
    } catch (e) {
      hubLine("⚠️ poker_simulation.js failed");
      console.warn(e);
    }

    // Buttons (Android)
    if (btnStore) btnStore.onclick = () => Store.toggle();
    if (btnCal) btnCal.onclick = () => {
      Controls.calibrateHeight();
      hubLine("📏 Height calibrated");
    };
    if (btnMusic) btnMusic.onclick = () => this.toggleMusic();

    window.addEventListener("resize", () => this.resize());

    this.renderer.setAnimationLoop(() => this.animate());
    hubLine("✅ Loaded. Android: pads. Oculus: Enter VR.");
  },

  applyAvatarState(avatarApi, state) {
    if (!avatarApi || !state) return;
    avatarApi.clearGear();

    const shirt = AvatarItems.getItem(state.equipped.shirt);
    const hat = AvatarItems.getItem(state.equipped.hat);
    const glasses = AvatarItems.getItem(state.equipped.glasses);
    const aura = AvatarItems.getItem(state.equipped.aura);
    const face = AvatarItems.getItem(state.equipped.face);

    if (shirt?.data?.color) avatarApi.setShirtColor(shirt.data.color);
    if (face?.data?.type) avatarApi.setFace(face.data.type);
    if (hat?.data?.type) avatarApi.equipHat(hat.data);
    if (glasses?.data?.type) avatarApi.equipGlasses(glasses.data);
    if (aura?.data?.type) avatarApi.setAura(aura.data);
  },

  toggleMusic() {
    // Simple: no external assets needed. If you add assets/audio/lobby_ambience.mp3 later, we can wire it.
    this.musicOn = !this.musicOn;
    hubLine(this.musicOn ? "🎵 Music ON (placeholder)" : "🔇 Music OFF");
  },

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  animate() {
    const dt = this.clock.getDelta();

    // Android touch always available
    MobileTouch.update(dt);

    // VR controls only when XR session active
    Controls.update(dt);

    // VR ray follows controller when in VR
    VRController.update(dt);

    // bots + poker sim
    BotManager.update(dt);
    PokerSimulation.update(dt);

    UI.update(dt);
    this.renderer.render(this.scene, this.camera);
  }
};

App.init();
