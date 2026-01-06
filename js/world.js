// /js/world.js — Skylark Poker VR — Stable Lobby World (No Dependencies)
// Goals:
// - Solid floor + 4 walls (colliders)
// - Texture-safe (falls back to color if texture missing)
// - No imports from table/chair/etc. (prevents chain failures)
// - No debug cubes

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const World = {
  _tex: null,

  _safeTexture(file, { repeat = [6, 6] } = {}) {
    if (!this._tex) this._tex = new THREE.TextureLoader();
    const url = `assets/textures/${file}`;

    // Create a dummy texture so material exists immediately
    const t = new THREE.Texture();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);

    try {
      this._tex.load(
        url,
        (loaded) => {
          loaded.wrapS = loaded.wrapT = THREE.RepeatWrapping;
          loaded.repeat.set(repeat[0], repeat[1]);
          // swap image data into our dummy texture
          t.image = loaded.image;
          t.needsUpdate = true;
        },
        undefined,
        () => {
          // Missing texture = keep dummy (material will fall back to color)
          console.warn("Missing texture:", url);
        }
      );
    } catch (e) {
      console.warn("Texture load exception:", url, e);
    }
    return t;
  },

  _mat({ file = null, color = 0x666666, roughness = 0.92, metalness = 0.05, repeat = [6, 6] }) {
    const map = file ? this._safeTexture(file, { repeat }) : null;
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      map,
    });

    // If texture fails, still looks good via color
    return m;
  },

  build(scene, playerGroup) {
    // Room sizing
    const ROOM_W = 34;
    const ROOM_D = 34;
    const WALL_H = 9.5;

    // Spawn (safe, empty area)
    const spawn = new THREE.Vector3(0, 0, 10);

    // Materials (use your filenames if you have them; otherwise colors still work)
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

    // Floor (visual + collider)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = false;
    scene.add(floor);

    // Walls (visual)
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

    // Gold trim along floor edges (visual)
    const trimH = 0.22;
    const trimY = trimH / 2;

    const trim1 = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, trimH, 0.22), trimMat);
    trim1.position.set(0, trimY, -ROOM_D / 2 + 0.11);
    scene.add(trim1);

    const trim2 = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, trimH, 0.22), trimMat);
    trim2.position.set(0, trimY, ROOM_D / 2 - 0.11);
    scene.add(trim2);

    const trim3 = new THREE.Mesh(new THREE.BoxGeometry(0.22, trimH, ROOM_D), trimMat);
    trim3.position.set(ROOM_W / 2 - 0.11, trimY, 0);
    scene.add(trim3);

    const trim4 = new THREE.Mesh(new THREE.BoxGeometry(0.22, trimH, ROOM_D), trimMat);
    trim4.position.set(-ROOM_W / 2 + 0.11, trimY, 0);
    scene.add(trim4);

    // Simple center poker table (no external deps, can be swapped later)
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

    // Chairs (simple ring)
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
      const leg1 = new THREE.Mesh(legGeo, chairMat);
      const leg2 = new THREE.Mesh(legGeo, chairMat);
      const leg3 = new THREE.Mesh(legGeo, chairMat);
      const leg4 = new THREE.Mesh(legGeo, chairMat);
      leg1.position.set(0.22, 0.22, 0.22);
      leg2.position.set(-0.22, 0.22, 0.22);
      leg3.position.set(0.22, 0.22, -0.22);
      leg4.position.set(-0.22, 0.22, -0.22);
      chair.add(leg1, leg2, leg3, leg4);

      scene.add(chair);
    }

    // Colliders (solid walls + floor bounds)
    // These are simple Box colliders you can use later in controls.js
    const colliders = [];

    // floor collider (thin box)
    const floorCol = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.2, ROOM_D), new THREE.MeshBasicMaterial({ visible: false }));
    floorCol.position.set(0, -0.1, 0);
    scene.add(floorCol);
    colliders.push(floorCol);

    // wall colliders (thin boxes)
    const wallThick = 0.4;

    const colN = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, WALL_H, wallThick), new THREE.MeshBasicMaterial({ visible: false }));
    colN.position.set(0, WALL_H / 2, -ROOM_D / 2);
    scene.add(colN);
    colliders.push(colN);

    const colS = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, WALL_H, wallThick), new THREE.MeshBasicMaterial({ visible: false }));
    colS.position.set(0, WALL_H / 2, ROOM_D / 2);
    scene.add(colS);
    colliders.push(colS);

    const colE = new THREE.Mesh(new THREE.BoxGeometry(wallThick, WALL_H, ROOM_D), new THREE.MeshBasicMaterial({ visible: false }));
    colE.position.set(ROOM_W / 2, WALL_H / 2, 0);
    scene.add(colE);
    colliders.push(colE);

    const colW = new THREE.Mesh(new THREE.BoxGeometry(wallThick, WALL_H, ROOM_D), new THREE.MeshBasicMaterial({ visible: false }));
    colW.position.set(-ROOM_W / 2, WALL_H / 2, 0);
    scene.add(colW);
    colliders.push(colW);

    return {
      spawn,
      colliders,
      bounds: {
        min: new THREE.Vector3(-ROOM_W / 2 + 1.2, 0, -ROOM_D / 2 + 1.2),
        max: new THREE.Vector3(ROOM_W / 2 - 1.2, 0, ROOM_D / 2 - 1.2),
      },
    };
  },
};
