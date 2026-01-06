// /js/world.js — Skylark Lobby + VIP + Boss Rails + Casino Art (8.2.2)
// Restores: VIP room build, BossTable rail, poker simulation, and wall art glow.
// IMPORTANT: do NOT force rig.position.y here (main.js handles height lock)

import * as THREE from "./three.js";
import { VIPRoom } from "./vip_room.js";
import { BossTable } from "./boss_table.js";
import { PokerSimulation } from "./poker_simulation.js";

export const World = {
  built: false,
  sim: null,
  _tex: new THREE.TextureLoader(),

  room: { minX: -11, maxX: 11, minZ: -15, maxZ: 9 },

  safeTexture(file, repeatX = 1, repeatY = 1) {
    const path = `assets/textures/${file}`;
    try {
      const t = this._tex.load(
        path,
        (tex) => {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          tex.repeat.set(repeatX, repeatY);
          tex.colorSpace = THREE.SRGBColorSpace;
        },
        undefined,
        () => console.warn("Texture missing:", path)
      );
      return t;
    } catch (e) {
      console.warn("Texture failed:", path, e);
      return null;
    }
  },

  buildShell(scene) {
    // FLOOR (marble & gold)
    const floorTex = this.safeTexture("Marblegold floors.jpg", 2.2, 2.2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1b1b1b,
      map: floorTex || null,
      roughness: 0.55,
      metalness: 0.08,
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 26), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -3);
    floor.receiveShadow = true;
    scene.add(floor);

    // WALLS
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x121521,
      roughness: 0.92,
      metalness: 0.05,
    });

    const wallT = 0.4;
    const wallH = 4.6;

    const back = new THREE.Mesh(new THREE.BoxGeometry(24, wallH, wallT), wallMat);
    back.position.set(0, wallH / 2, -16);
    scene.add(back);

    const front = new THREE.Mesh(new THREE.BoxGeometry(24, wallH, wallT), wallMat);
    front.position.set(0, wallH / 2, 10);
    scene.add(front);

    const left = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, 26), wallMat);
    left.position.set(-12, wallH / 2, -3);
    scene.add(left);

    const right = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, 26), wallMat);
    right.position.set(12, wallH / 2, -3);
    scene.add(right);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 26),
      new THREE.MeshStandardMaterial({ color: 0x07080c, roughness: 1.0 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, wallH, -3);
    scene.add(ceiling);

    // Casino wall art (glow frames)
    this.addWallArt(scene);
  },

  addWallArt(scene) {
    // Textures you showed: "casino_art.jpg" and "Casinoart2.jpg"
    const artA = this.safeTexture("casino_art.jpg", 1, 1);
    const artB = this.safeTexture("Casinoart2.jpg", 1, 1);

    const makeFrame = (tex, w, h) => {
      const frame = new THREE.Group();

      const border = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.18, h + 0.18, 0.08),
        new THREE.MeshStandardMaterial({
          color: 0x1a0f04,
          roughness: 0.45,
          metalness: 0.25,
          emissive: 0x402000,
          emissiveIntensity: 0.35,
        })
      );
      border.position.z = 0;

      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshStandardMaterial({
          map: tex || null,
          color: tex ? 0xffffff : 0x333333,
          roughness: 0.65,
          metalness: 0.05,
          emissive: 0x111111,
          emissiveIntensity: 0.35,
        })
      );
      panel.position.z = 0.05;

      const glow = new THREE.PointLight(0xffb347, 0.35, 6);
      glow.position.set(0, 0, 0.6);

      frame.add(border, panel, glow);
      return frame;
    };

    // Left wall set
    const f1 = makeFrame(artA, 3.6, 2.0);
    f1.position.set(-11.55, 2.2, -5.5);
    f1.rotation.y = Math.PI / 2;
    scene.add(f1);

    const f2 = makeFrame(artB, 3.6, 2.0);
    f2.position.set(-11.55, 2.2, -1.0);
    f2.rotation.y = Math.PI / 2;
    scene.add(f2);

    // Right wall set
    const f3 = makeFrame(artB, 3.6, 2.0);
    f3.position.set(11.55, 2.2, -5.5);
    f3.rotation.y = -Math.PI / 2;
    scene.add(f3);

    const f4 = makeFrame(artA, 3.6, 2.0);
    f4.position.set(11.55, 2.2, -1.0);
    f4.rotation.y = -Math.PI / 2;
    scene.add(f4);
  },

  async build(scene, rig, camera) {
    if (this.built) return;
    this.built = true;

    // 1) Lobby shell + wall art
    this.buildShell(scene);

    // 2) VIP room build (your module)
    try {
      if (VIPRoom?.build) VIPRoom.build(scene);
    } catch (e) {
      console.warn("VIPRoom build failed:", e);
    }

    // 3) Boss table area (this also builds the spectator rail)
    try {
      if (BossTable?.build) BossTable.build(scene);
    } catch (e) {
      console.warn("BossTable build failed:", e);
    }

    // 4) Poker sim (centered and visible)
    try {
      this.sim = new PokerSimulation({
        tableCenter: new THREE.Vector3(0, 0, -4.5),
        camera,
      });
      await this.sim.build(scene);
    } catch (e) {
      console.warn("PokerSimulation build failed:", e);
    }
  },

  update(dt, camera) {
    // clamp rig x/z only (no y here!)
    if (camera?.parent) {
      const rig = camera.parent;
      rig.position.x = THREE.MathUtils.clamp(rig.position.x, this.room.minX + 0.6, this.room.maxX - 0.6);
      rig.position.z = THREE.MathUtils.clamp(rig.position.z, this.room.minZ + 0.6, this.room.maxZ - 0.6);
    }

    if (this.sim?.update) this.sim.update(dt);
  }
};
