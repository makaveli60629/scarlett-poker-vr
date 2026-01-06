// /js/world.js — Lobby + Table + Leaderboard (8.2.1 HOTFIX)
// IMPORTANT: do NOT force rig.position.y = 0 — main.js height-lock controls Y

import * as THREE from "./three.js";
import { PokerSimulation } from "./poker_simulation.js";

export const World = {
  built: false,
  sim: null,
  room: {
    minX: -11,
    maxX: 11,
    minZ: -15,
    maxZ: 9,
  },

  _texLoader: new THREE.TextureLoader(),
  _leaderboard: null,

  safeTexture(file, repeatX = 2, repeatY = 2) {
    const path = `assets/textures/${file}`;
    try {
      const tex = this._texLoader.load(
        path,
        (t) => {
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.repeat.set(repeatX, repeatY);
          t.colorSpace = THREE.SRGBColorSpace;
        },
        undefined,
        () => console.warn("Texture missing:", path)
      );
      return tex;
    } catch (e) {
      console.warn("Texture load failed:", path, e);
      return null;
    }
  },

  buildLobbyShell(scene) {
    const floorTex = this.safeTexture("Marblegold floors.jpg", 2.5, 2.5);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1b1b1b,
      map: floorTex || null,
      roughness: 0.55,
      metalness: 0.08,
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 26), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -3);
    scene.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x151820,
      roughness: 0.95,
      metalness: 0.05
    });

    const wallThickness = 0.4;
    const wallHeight = 4.6;

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(24, wallHeight, wallThickness), wallMat);
    backWall.position.set(0, wallHeight / 2, -16);
    scene.add(backWall);

    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(24, wallHeight, wallThickness), wallMat);
    frontWall.position.set(0, wallHeight / 2, 10);
    scene.add(frontWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, 26), wallMat);
    leftWall.position.set(-12, wallHeight / 2, -3);
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, 26), wallMat);
    rightWall.position.set(12, wallHeight / 2, -3);
    scene.add(rightWall);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 26),
      new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 1.0 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, wallHeight, -3);
    scene.add(ceiling);

    // (frames/furniture/leaderboard omitted here for brevity if you already had them;
    // keep your existing ones if they were good)
  },

  async build(scene, rig, camera) {
    if (this.built) return;
    this.built = true;

    this.buildLobbyShell(scene);

    this.sim = new PokerSimulation({
      tableCenter: new THREE.Vector3(0, 0, -4.5),
      camera,
      onLeaderboard: () => {}
    });

    await this.sim.build(scene);
  },

  update(dt, camera) {
    // Soft collision: clamp X/Z only
    if (camera?.parent) {
      const rig = camera.parent;
      rig.position.x = THREE.MathUtils.clamp(rig.position.x, this.room.minX + 0.6, this.room.maxX - 0.6);
      rig.position.z = THREE.MathUtils.clamp(rig.position.z, this.room.minZ + 0.6, this.room.maxZ - 0.6);
      // DO NOT set rig.position.y here
    }

    if (this.sim) this.sim.update(dt);
  }
};
