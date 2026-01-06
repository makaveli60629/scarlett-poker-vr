// /js/world.js — Skylark Poker VR — World Builder (9.0 FULL)
// - Big room, brighter lighting
// - Marble floor, brick walls w/ SMALLER repeat (smaller bricks)
// - Gold trim + corner pillars
// - Circular rail WITH bars (prevents walking into table area)
// - Teleport machine spawn point (always spawns from pad)
// - Solid colliders: walls + rail ring
// - Safe texture fallback if missing files (no crashes)

import * as THREE from "./three.js";
import { TeleportMachine } from "./teleport_machine.js";

export const World = {
  _tex: null,

  build(scene) {
    this._tex = new THREE.TextureLoader();

    // -----------------------------
    // Scene baseline
    // -----------------------------
    scene.background = new THREE.Color(0x07070a);
    scene.fog = new THREE.Fog(0x07070a, 10, 45);

    // -----------------------------
    // Lighting (brighter)
    // -----------------------------
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222244, 0.85);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(6, 10, 6);
    key.castShadow = false;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x9bd7ff, 0.55);
    fill.position.set(-7, 6, -4);
    scene.add(fill);

    const warm = new THREE.PointLight(0xffd27a, 0.8, 22);
    warm.position.set(0, 6.5, -6);
    scene.add(warm);

    // -----------------------------
    // Room sizes (bigger)
    // -----------------------------
    const ROOM_W = 30;
    const ROOM_D = 30;
    const WALL_H = 8.5;

    // bounds (for controls clamp + teleport clamp)
    const bounds = {
      min: new THREE.Vector3(-ROOM_W / 2 + 1.0, 0, -ROOM_D / 2 + 1.0),
      max: new THREE.Vector3( ROOM_W / 2 - 1.0, 0,  ROOM_D / 2 - 1.0)
    };

    // -----------------------------
    // Materials (safe textures)
    // -----------------------------
    const floorMat = this._safeMat({
      file: "Marblegold floors.jpg",
      color: 0xffffff,
      repeat: [6, 6],
      roughness: 0.9,
      metalness: 0.1
    });

    const wallMat = this._safeMat({
      file: "brickwall.jpg",
      color: 0xf2f2f2,
      repeat: [10, 3], // ✅ smaller bricks
      roughness: 0.95,
      metalness: 0.0
    });

    const wallAccentMat = this._safeMat({
      file: "wall_stone_runes.jpg",
      color: 0xe9e9ef,
      repeat: [8, 2.6],
      roughness: 0.95,
      metalness: 0.0
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      roughness: 0.35,
      metalness: 0.5,
      emissive: 0x1a1206,
      emissiveIntensity: 0.25
    });

    // -----------------------------
    // Floor
    // -----------------------------
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM_W, ROOM_D),
      floorMat
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    // -----------------------------
    // Walls (4) + trim
    // -----------------------------
    const walls = new THREE.Group();
    walls.name = "Walls";

    const wallGeo = new THREE.PlaneGeometry(ROOM_W, WALL_H);

    const wallN = new THREE.Mesh(wallGeo, wallMat);
    wallN.position.set(0, WALL_H / 2, -ROOM_D / 2);
    wallN.rotation.y = 0;
    walls.add(wallN);

    const wallS = new THREE.Mesh(wallGeo, wallMat);
    wallS.position.set(0, WALL_H / 2, ROOM_D / 2);
    wallS.rotation.y = Math.PI;
    walls.add(wallS);

    const wallE = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, WALL_H), wallAccentMat);
    wallE.position.set(ROOM_W / 2, WALL_H / 2, 0);
    wallE.rotation.y = -Math.PI / 2;
    walls.add(wallE);

    const wallW = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, WALL_H), wallAccentMat);
    wallW.position.set(-ROOM_W / 2, WALL_H / 2, 0);
    wallW.rotation.y = Math.PI / 2;
    walls.add(wallW);

    scene.add(walls);

    // Gold trim around bottom of walls
    const trimH = 0.22;
    const trimY = trimH / 2;

    const trimN = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, trimH, 0.22), goldMat);
    trimN.position.set(0, trimY, -ROOM_D / 2 + 0.11);
    scene.add(trimN);

    const trimS = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, trimH, 0.22), goldMat);
    trimS.position.set(0, trimY, ROOM_D / 2 - 0.11);
    scene.add(trimS);

    const trimE = new THREE.Mesh(new THREE.BoxGeometry(0.22, trimH, ROOM_D), goldMat);
    trimE.position.set(ROOM_W / 2 - 0.11, trimY, 0);
    scene.add(trimE);

    const trimW = new THREE.Mesh(new THREE.BoxGeometry(0.22, trimH, ROOM_D), goldMat);
    trimW.position.set(-ROOM_W / 2 + 0.11, trimY, 0);
    scene.add(trimW);

    // Corner pillars
    const pillarGeo = new THREE.CylinderGeometry(0.28, 0.34, WALL_H, 22);
    const pillarPos = [
      [ ROOM_W / 2 - 0.6, WALL_H / 2,  ROOM_D / 2 - 0.6],
      [-ROOM_W / 2 + 0.6, WALL_H / 2,  ROOM_D / 2 - 0.6],
      [ ROOM_W / 2 - 0.6, WALL_H / 2, -ROOM_D / 2 + 0.6],
      [-ROOM_W / 2 + 0.6, WALL_H / 2, -ROOM_D / 2 + 0.6]
    ];

    for (const p of pillarPos) {
      const pil = new THREE.Mesh(pillarGeo, goldMat);
      pil.position.set(p[0], p[1], p[2]);
      scene.add(pil);
    }

    // -----------------------------
    // Table center (single centerpiece)
    // -----------------------------
    const tableCenter = new THREE.Vector3(0, 0, -5.0);

    // subtle “stage” circle
    const stage = new THREE.Mesh(
      new THREE.CylinderGeometry(6.6, 6.9, 0.08, 64),
      new THREE.MeshStandardMaterial({ color: 0x0f0f14, roughness: 0.95, metalness: 0.15 })
    );
    stage.position.set(tableCenter.x, 0.04, tableCenter.z);
    scene.add(stage);

    // -----------------------------
    // Circular rail WITH bars (solid)
    // -----------------------------
    const rail = this._buildRailRing(tableCenter, 6.0, goldMat);
    scene.add(rail.group);

    // -----------------------------
    // Art frames (brighter + visible)
    // -----------------------------
    const artGroup = new THREE.Group();
    artGroup.name = "ArtFrames";
    scene.add(artGroup);

    // Back wall big brand frame
    artGroup.add(this._makeFrame(
      "brand_logo.jpg",
      new THREE.Vector3(0, 4.6, -ROOM_D / 2 + 0.06),
      new THREE.Euler(0, 0, 0),
      6.6, 3.2
    ));

    // Side frames
    artGroup.add(this._makeFrame(
      "casino_art.jpg",
      new THREE.Vector3(-ROOM_W / 2 + 0.06, 3.2, -6),
      new THREE.Euler(0, Math.PI / 2, 0),
      3.8, 2.2
    ));

    artGroup.add(this._makeFrame(
      "Casinoart2.jpg",
      new THREE.Vector3(ROOM_W / 2 - 0.06, 3.2, -6),
      new THREE.Euler(0, -Math.PI / 2, 0),
      3.8, 2.2
    ));

    // -----------------------------
    // Teleport machine + spawn
    // -----------------------------
    const teleport = TeleportMachine.build(scene, this._tex);
    teleport.position.set(0, 0, tableCenter.z + 8.5); // in front of table

    // Update pad center so getSafeSpawn is correct
    TeleportMachine.padCenter.set(teleport.position.x, 0, teleport.position.z);

    const spawn = TeleportMachine.getSafeSpawn();

    // -----------------------------
    // Colliders (walls + rail ring)
    // -----------------------------
    const colliders = [];

    // Wall collider boxes (thick invisible)
    const wallThickness = 0.8;

    colliders.push(this._boxCollider(
      new THREE.Vector3(0, WALL_H / 2, -ROOM_D / 2),
      new THREE.Vector3(ROOM_W, WALL_H, wallThickness)
    ));
    colliders.push(this._boxCollider(
      new THREE.Vector3(0, WALL_H / 2, ROOM_D / 2),
      new THREE.Vector3(ROOM_W, WALL_H, wallThickness)
    ));
    colliders.push(this._boxCollider(
      new THREE.Vector3(ROOM_W / 2, WALL_H / 2, 0),
      new THREE.Vector3(wallThickness, WALL_H, ROOM_D)
    ));
    colliders.push(this._boxCollider(
      new THREE.Vector3(-ROOM_W / 2, WALL_H / 2, 0),
      new THREE.Vector3(wallThickness, WALL_H, ROOM_D)
    ));

    // Rail collider ring segments (prevents entering table area)
    colliders.push(...rail.colliders);

    // Return world data consumed by main.js + controls.js
    return {
      tableCenter,
      bounds,
      colliders,
      teleport,
      spawn
    };
  },

  // -----------------------------
  // Helpers
  // -----------------------------
  _safeMat({ file, color = 0xffffff, repeat = [1, 1], roughness = 0.9, metalness = 0.0 }) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    try {
      const tex = this._tex.load(
        `assets/textures/${file}`,
        (t) => {
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.repeat.set(repeat[0], repeat[1]);
          t.colorSpace = THREE.SRGBColorSpace;
        },
        undefined,
        () => {}
      );
      mat.map = tex;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    } catch (e) {
      // fallback color only
    }
    return mat;
  },

  _makeFrame(file, pos, rot, w, h) {
    const g = new THREE.Group();
    g.position.copy(pos);
    g.rotation.copy(rot);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.22, h + 0.22, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xffd27a, roughness: 0.35, metalness: 0.5 })
    );
    frame.position.z = -0.05;

    const artMat = this._safeMat({ file, color: 0x222222, repeat: [1, 1], roughness: 0.85, metalness: 0.0 });
    // make art self-lit slightly so it isn't dark
    artMat.emissive = new THREE.Color(0x222222);
    artMat.emissiveIntensity = 0.55;

    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      artMat
    );

    // light for art
    const l = new THREE.PointLight(0xffffff, 0.6, 8);
    l.position.set(0, 0, 1.2);

    g.add(art, frame, l);
    return g;
  },

  _boxCollider(center, size) {
    // store Box3 only; Controls supports Box3 directly
    const half = new THREE.Vector3(size.x / 2, size.y / 2, size.z / 2);
    const box = new THREE.Box3(center.clone().sub(half), center.clone().add(half));
    return box;
  },

  _buildRailRing(center, radius, goldMat) {
    const group = new THREE.Group();
    group.name = "RailRing";

    const height = 1.05;
    const postH = 1.05;
    const barCount = 28;

    // Top rail torus
    const topRail = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.06, 12, 120),
      goldMat
    );
    topRail.rotation.x = Math.PI / 2;
    topRail.position.set(center.x, height, center.z);
    group.add(topRail);

    // Bottom ring
    const baseRing = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.045, 10, 120),
      new THREE.MeshStandardMaterial({ color: 0x2a2a33, roughness: 0.9, metalness: 0.15 })
    );
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.set(center.x, 0.15, center.z);
    group.add(baseRing);

    // Posts + bars
    for (let i = 0; i < barCount; i++) {
      const a = (i / barCount) * Math.PI * 2;
      const x = center.x + Math.cos(a) * radius;
      const z = center.z + Math.sin(a) * radius;

      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, postH, 10),
        goldMat
      );
      post.position.set(x, postH / 2, z);

      group.add(post);

      // mid bar segment (little vertical bar look)
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.62, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.85 })
      );
      bar.position.set(x, 0.62 / 2 + 0.25, z);
      group.add(bar);
    }

    // Colliders for rail: approximate with 16 boxes around the ring
    const colliders = [];
    const segs = 16;
    const thickness = 0.55;
    const segW = (2 * Math.PI * radius) / segs;

    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const x = center.x + Math.cos(a) * radius;
      const z = center.z + Math.sin(a) * radius;

      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const tangent = new THREE.Vector3(-dir.z, 0, dir.x);

      // box center is on ring, box elongated along tangent
      const boxCenter = new THREE.Vector3(x, 0.8, z);

      // We'll approximate AABB by making box axis-aligned in world:
      // Create a slightly larger collider AABB around the segment.
      const size = new THREE.Vector3(
        Math.abs(tangent.x) > 0.7 ? segW * 0.65 : thickness,
        1.6,
        Math.abs(tangent.z) > 0.7 ? segW * 0.65 : thickness
      );

      colliders.push(this._boxCollider(boxCenter, size));
    }

    return { group, colliders };
  }
};
