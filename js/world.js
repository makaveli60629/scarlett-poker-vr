// js/world.js — VIP Lobby World (8.2.5 Permanent Pass)
// FIX:
// - Marble/gold floor texture (safe fallback color if missing)
// - Leaderboard moved + facing spawn
// - Furniture added (couches + fountain placeholder)
// - BossTable + PokerSimulation wired clean

import * as THREE from "./three.js";
import { BossTable } from "./boss_table.js";
import { Leaderboard } from "./leaderboard.js";
import { PokerSimulation } from "./poker_simulation.js";

export const World = {
  root: null,
  floor: null,

  _texLoader: new THREE.TextureLoader(),

  safeFloorMaterial() {
    // If you have a marble+gold texture, put it here:
    // assets/textures/marble_gold.jpg  (rename yours to match if needed)
    const path = "assets/textures/marble_gold.jpg";

    const fallback = new THREE.MeshStandardMaterial({
      color: 0x151419,
      roughness: 0.95,
      metalness: 0.02,
      emissive: 0x040408,
      emissiveIntensity: 0.06,
    });

    try {
      const tex = this._texLoader.load(
        path,
        (t) => {
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.repeat.set(4, 4);
        },
        undefined,
        () => { /* silent fallback */ }
      );

      return new THREE.MeshStandardMaterial({
        map: tex,
        color: 0xffffff,
        roughness: 0.85,
        metalness: 0.05,
      });
    } catch {
      return fallback;
    }
  },

  async build(scene, rig) {
    this.root = new THREE.Group();
    this.root.name = "WorldRoot";
    scene.add(this.root);

    // Safe spawn (front of room, clear)
    if (rig) rig.position.set(0, 0, 6.2);

    // Room (bigger so table never hits wall)
    const roomW = 20;
    const roomD = 26;
    const wallH = 4.5;

    // FLOOR
    const floorMat = this.safeFloorMaterial();
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(28, 28), floorMat);
    this.floor.name = "Floor";
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = 0;
    this.root.add(this.floor);

    // WALLS
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0b0d13,
      roughness: 0.97,
      metalness: 0.03,
    });

    const back = new THREE.Mesh(new THREE.BoxGeometry(roomW, wallH, 0.25), wallMat);
    back.position.set(0, wallH / 2, -roomD / 2);
    this.root.add(back);

    const front = new THREE.Mesh(new THREE.BoxGeometry(roomW, wallH, 0.25), wallMat);
    front.position.set(0, wallH / 2, roomD / 2);
    this.root.add(front);

    const left = new THREE.Mesh(new THREE.BoxGeometry(0.25, wallH, roomD), wallMat);
    left.position.set(-roomW / 2, wallH / 2, 0);
    this.root.add(left);

    const right = new THREE.Mesh(new THREE.BoxGeometry(0.25, wallH, roomD), wallMat);
    right.position.set(roomW / 2, wallH / 2, 0);
    this.root.add(right);

    // GLOW FRAMES (picture placeholders on back wall)
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 0.65,
      roughness: 0.35,
      transparent: true,
      opacity: 0.75,
    });

    for (let i=0;i<3;i++){
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.2), frameMat);
      frame.position.set(-5 + i*5, 2.2, -roomD/2 + 0.14);
      frame.rotation.y = Math.PI; // face inward
      this.root.add(frame);
    }

    // LIGHTING (bright/elegant)
    const hemi = new THREE.HemisphereLight(0xffffff, 0x1f2a3a, 1.25);
    this.root.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.10);
    key.position.set(5, 10, 6);
    this.root.add(key);

    const ceiling = new THREE.PointLight(0x66aaff, 0.6, 34);
    ceiling.position.set(0, 3.8, 0);
    this.root.add(ceiling);

    const neon1 = new THREE.PointLight(0x00ffaa, 0.45, 28);
    neon1.position.set(-6.5, 2.6, -6.0);
    this.root.add(neon1);

    const neon2 = new THREE.PointLight(0xff3366, 0.38, 28);
    neon2.position.set(6.5, 2.6, -6.0);
    this.root.add(neon2);

    // BOSS TABLE + CHAIRS
    BossTable.build(this.root);

    // LEADERBOARD (now visible from spawn)
    Leaderboard.build(this.root);
    if (Leaderboard.group) {
      Leaderboard.group.position.set(0, 3.2, -11.7);
      Leaderboard.group.rotation.y = 0; // Plane faces +Z by default, so this faces the player at +Z
      Leaderboard.group.scale.setScalar(1.35);
    }

    // FURNITURE (simple placeholders)
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x1b1d24, roughness: 0.95 });
    const sofa = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 1.1), sofaMat);
    sofa.position.set(-6.0, 0.45, 5.0);
    this.root.add(sofa);

    const sofa2 = sofa.clone();
    sofa2.position.set(6.0, 0.45, 5.0);
    this.root.add(sofa2);

    // Water fountain placeholder (corner)
    const fountain = new THREE.Group();
    fountain.position.set(8.0, 0, -9.5);

    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.85, 0.35, 24),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })
    );
    bowl.position.y = 0.18;

    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.05, 24),
      new THREE.MeshStandardMaterial({
        color: 0x1177ff,
        roughness: 0.25,
        transparent: true,
        opacity: 0.55,
        emissive: 0x1144aa,
        emissiveIntensity: 0.35
      })
    );
    water.position.y = 0.33;

    const splashLight = new THREE.PointLight(0x1177ff, 0.5, 6);
    splashLight.position.set(0, 1.2, 0);

    fountain.add(bowl, water, splashLight);
    this.root.add(fountain);

    // POKER SIM
    PokerSimulation.build(this.root, new THREE.Vector3(0, 1.02, -6.5));

    Leaderboard._drawData?.({
      title: "BOSS TOURNAMENT • TOP 10",
      rows: [
        { name: "BOT 1", points: 0 },
        { name: "BOT 2", points: 0 },
        { name: "BOT 3", points: 0 },
        { name: "BOT 4", points: 0 },
        { name: "BOT 5", points: 0 },
      ],
      footer: "Spectator-only Boss Table • Winner holds the crown",
    });
  },

  update(dt, camera) {
    PokerSimulation.update(dt, camera);
    Leaderboard.update?.(dt, camera, null);
  },
};
