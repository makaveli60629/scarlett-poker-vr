// /js/main.js — Skylark Poker VR — Update 9.0 (CDN SAFE + NO BLACK SCREEN)
//
// Key goals:
// - Never silent-fail: always shows something even if World/UI fails
// - Uses CDN Three + VRButton so GitHub paths don't break
// - Adds guaranteed lighting + a visible "test cube" fallback

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { Controls } from "./controls.js";
import { UI } from "./ui.js";
import { PokerSimulation } from "./poker_simulation.js";

const APP = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  playerGroup: null,
  colliders: [],
  bots: [],
  testCube: null,

  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05060a);
    this.scene.fog = new THREE.Fog(0x05060a, 2, 90);

    // Player rig
    this.playerGroup = new THREE.Group();
    this.scene.add(this.playerGroup);

    // Camera
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
    this.camera.position.set(0, 1.65, 0);
    this.playerGroup.add(this.camera);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.xr.enabled = true;

    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));

    this.clock = new THREE.Clock();

    // ✅ GUARANTEED LIGHTING (prevents "black world")
    this.addBaseLighting();

    // ✅ GUARANTEED VISIBLE OBJECT (so you know rendering works)
    this.addFallbackFloorAndCube();

    // World build (safe)
    try {
      const worldResult = World?.build?.(this.scene, this.playerGroup) || {};
      this.colliders = Array.isArray(worldResult.colliders) ? worldResult.colliders : [];

      if (worldResult.spawn?.isVector3) this.playerGroup.position.copy(worldResult.spawn);
      else this.playerGroup.position.set(0, 0, 5);

      console.log("World built. Colliders:", this.colliders.length);
    } catch (e) {
      console.warn("World.build failed (fallback still visible):", e);
    }

    // Controls (safe)
    try {
      Controls?.init?.({
        renderer: this.renderer,
        camera: this.camera,
        playerGroup: this.playerGroup,
        colliders: this.colliders
      });
      console.log("Controls init OK");
    } catch (e) {
      console.warn("Controls init failed:", e);
    }

    // UI (safe)
    try {
      UI?.init?.({
        renderer: this.renderer,
        camera: this.camera,
        playerGroup: this.playerGroup,
      });
      console.log("UI init OK");
    } catch (e) {
      console.warn("UI init failed:", e);
    }

    // Bots (16 total: 8 seated + 8 roaming later)
    this.bots = this.createBots(16);

    // Poker sim (safe; always pass arrays)
    try {
      PokerSimulation?.build?.({ players: [], bots: this.bots });
      console.log("PokerSimulation started:", this.bots.length, "bots");
    } catch (e) {
      console.warn("PokerSimulation build failed:", e);
    }

    window.addEventListener("resize", () => this.onResize());

    this.renderer.setAnimationLoop(() => this.animate());
  },

  addBaseLighting() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.05);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(6, 10, 4);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 1024;
    dir.shadow.mapSize.height = 1024;
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 60;
    this.scene.add(dir);

    const fill = new THREE.PointLight(0xffffff, 0.35);
    fill.position.set(-6, 3, 6);
    this.scene.add(fill);
  },

  addFallbackFloorAndCube() {
    const floorGeo = new THREE.PlaneGeometry(40, 40);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1b22, roughness: 0.95, metalness: 0.0 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const cubeGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const cubeMat = new THREE.MeshStandardMaterial({ color: 0x66aaff, roughness: 0.4, metalness: 0.1 });
    this.testCube = new THREE.Mesh(cubeGeo, cubeMat);
    this.testCube.position.set(0, 1.4, -2);
    this.testCube.castShadow = true;
    this.scene.add(this.testCube);
  },

  createBots(count = 16) {
    const bots = [];
    for (let i = 0; i < count; i++) {
      bots.push({
        id: `bot_${i + 1}`,
        name: `Bot ${i + 1}`,
        chips: 10000,
        hand: [],
        state: i < 8 ? "seated" : "lobby_roam",
        seatIndex: i < 8 ? i : -1
      });
    }
    return bots;
  },

  animate() {
    const dt = this.clock.getDelta();

    // Spin cube so you can see motion even if other modules fail
    if (this.testCube) this.testCube.rotation.y += dt * 0.8;

    try { Controls?.update?.(dt); } catch {}
    try { PokerSimulation?.update?.(dt); } catch {}
    try { UI?.update?.(dt); } catch {}

    this.renderer.render(this.scene, this.camera);
  },

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
};

APP.init();
