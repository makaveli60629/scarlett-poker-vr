// /js/world.js — Scarlett Poker VR — World v1 (Bright + Solid + Crash-Safe)
// - Bright casino lighting (no dark room)
// - Solid 4 walls + bounds + colliders (with userData.box for collision)
// - Table + chairs + gold trim
// - Texture-safe (missing textures fall back to colors)
// - No external dependencies

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const World = {
  _tex: null,

  _safeTexture(file, { repeat = [6, 6] } = {}) {
    if (!this._tex) this._tex = new THREE.TextureLoader();
    const url = `assets/textures/${file}`;

    // Dummy texture so material exists immediately
    const t = new THREE.Texture();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);

    try {
      this._tex.load(
        url,
        (loaded) => {
          loaded.wrapS = loaded.wrapT = THREE.RepeatWrapping;
          loaded.repeat.set(repeat[0], repeat[1]);
          t.image = loaded.image;
          t.needsUpdate = true;
        },
        undefined,
        () => console.warn("Missing texture:", url)
      );
    } catch (e) {
      console.warn("Texture load exception:", url, e);
    }
    return t;
  },

  _mat({ file = null, color = 0x666666, roughness = 0.92, metalness = 0.05, repeat = [6, 6] }) {
    const map = file ? this._safeTexture(file, { repeat }) : null;
    return new THREE.MeshStandardMaterial({ color, roughness, metalness, map });
  },

  _makeColliderBox(scene, w, h, d, x, y, z) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    mesh.position.set(x, y, z);
    scene.add(mesh);

    // Store Box3 on userData for cheap collision checks
    const box = new THREE.Box3().setFromObject(mesh);
    mesh.userData.box = box;
    return mesh;
  },

  build(scene, playerGroup) {
    // ROOM
    const ROOM_W = 34;
    const ROOM_D = 34;
    const WALL_H = 9.5;

    // SPAWN (clear space, forward-facing)
    const spawn = new THREE.Vector3(0, 0, 10);

    // ✅ LIGHTING — Bright “casino” feel
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(8, 14, 8);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xbfe6ff, 0.55);
    fill.position.set(-9, 8, -7);
    scene.add(fill);

    const warmCenter = new THREE.PointLight(0xffd2a0, 1.35, 24);
    warmCenter.position.set(0, 4.6, 0);
    scene.add(warmCenter);

    // Ring of ceiling lights
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = Math.cos(a) * 9;
      const z = Math.sin(a) * 9;
      const p = new THREE.PointLight(0xffffff, 0.65, 26);
      p.position.set(x, 6.8, z);
      scene.add(p);
    }

    // MATERIALS (texture-safe)
    const floorMat = this._mat({
      file: "Marblegold Floors.jpg", // ok if missing
      color: 0x2a2a2a,
      repeat: [7, 7],
      roughness: 0.95,
      metalness: 0.02,
    });

    const wallMat = this._mat({
      file: "brickwall.jpg", // ok if missing
      color: 0x2b2f35,
      repeat: [10, 3],
      roughness: 0.98,
      metalness: 0.01,
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      roughness: 0.35,
      metalness: 0.55,
      emissive: 0x1a1206,
      emissiveIntensity: 0.25,
    });

    // FLOOR (visual)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    // WALLS (visual)
    const wallN = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, WALL_H), wallMat);
    wallN.position.set(0, WALL_H / 2, -ROOM_D / 2);
    scene.add(wallN);

    const wallS = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, WALL_H), wallMat);
    wallS.position.set(0, WALL_H / 2, ROOM_D / 2);
    wallS.rotation.y = Math.PI;
    scene.add(wallS);

    const wallE = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, WALL_H), wallMat);
    wallE.position.set(ROOM_W / 2, WALL_H / 2, 0);
    wallE.rotation.y = -Math.PI / 2;
    scene.add(wallE);

    const wallW = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, WALL_H), wallMat);
    wallW.position.set(-ROOM_W / 2, WALL_H / 2, 0);
    wallW.rotation.y = Math.PI / 2;
    scene.add(wallW);

    // GOLD TRIM (visual)
    const trimH = 0.22;
    const trimY = trimH / 2;
    const t1 = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, trimH, 0.22), trimMat);
    t1.position.set(0, trimY, -ROOM_D / 2 + 0.11);
    scene.add(t1);

    const t2 = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, trimH, 0.22), trimMat);
    t2.position.set(0, trimY, ROOM_D / 2 - 0.11);
    scene.add(t2);

    const t3 = new THREE.Mesh(new THREE.BoxGeometry(0.22, trimH, ROOM_D), trimMat);
    t3.position.set(ROOM_W / 2 - 0.11, trimY, 0);
    scene.add(t3);

    const t4 = new THREE.Mesh(new THREE.BoxGeometry(0.22, trimH, ROOM_D), trimMat);
    t4.position.set(-ROOM_W / 2 + 0.11, trimY, 0);
    scene.add(t4);

    // TABLE + CHAIRS (visual)
    const tableGroup = new THREE.Group();
    tableGroup.position.set(0, 0, 0);

    const feltMat = new THREE.MeshStandardMaterial({
      color: 0x0b3a2a,
      roughness: 0.9,
      metalness: 0.02,
    });

    const railMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.55,
      metalness: 0.1,
    });

    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.18, 48), feltMat);
    tableTop.position.y = 0.95;
    tableGroup.add(tableTop);

    const tableRail = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.14, 18, 56), railMat);
    tableRail.rotation.x = Math.PI / 2;
    tableRail.position.y = 1.05;
    tableGroup.add(tableRail);

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 0.9, 24), railMat);
    pedestal.position.y = 0.45;
    tableGroup.add(pedestal);

    scene.add(tableGroup);

    const chairMat = new THREE.MeshStandardMaterial({
      color: 0x3b3b3b,
      roughness: 0.85,
      metalness: 0.05,
    });

    const chairRadius = 3.1;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const cx = Math.cos(a) * chairRadius;
      const cz = Math.sin(a) * chairRadius;

      const chair = new THREE.Group();
      chair.position.set(cx, 0, cz);
      chair.rotation.y = -a + Math.PI / 2;

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), chairMat);
      seat.position.y = 0.45;
      chair.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.08), chairMat);
      back.position.set(0, 0.75, -0.23);
      chair.add(back);

      const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 10);
      const legPos = [
        [ 0.22, 0.22,  0.22],
        [-0.22, 0.22,  0.22],
        [ 0.22, 0.22, -0.22],
        [-0.22, 0.22, -0.22],
      ];
      for (const [lx, ly, lz] of legPos) {
        const leg = new THREE.Mesh(legGeo, chairMat);
        leg.position.set(lx, ly, lz);
        chair.add(leg);
      }

      scene.add(chair);
    }

    // COLLIDERS (solid)
    const colliders = [];

    // Floor collider (thin)
    colliders.push(this._makeColliderBox(scene, ROOM_W, 0.2, ROOM_D, 0, -0.1, 0));

    // Walls (thin)
    const wallThick = 0.4;
    colliders.push(this._makeColliderBox(scene, ROOM_W, WALL_H, wallThick, 0, WALL_H / 2, -ROOM_D / 2));
    colliders.push(this._makeColliderBox(scene, ROOM_W, WALL_H, wallThick, 0, WALL_H / 2,  ROOM_D / 2));
    colliders.push(this._makeColliderBox(scene, wallThick, WALL_H, ROOM_D,  ROOM_W / 2, WALL_H / 2, 0));
    colliders.push(this._makeColliderBox(scene, wallThick, WALL_H, ROOM_D, -ROOM_W / 2, WALL_H / 2, 0));

    // Bounds (for clamp)
    const bounds = {
      min: new THREE.Vector3(-ROOM_W / 2 + 1.2, 0, -ROOM_D / 2 + 1.2),
      max: new THREE.Vector3( ROOM_W / 2 - 1.2, 0,  ROOM_D / 2 - 1.2),
    };

    return { spawn, colliders, bounds };
  },
};
