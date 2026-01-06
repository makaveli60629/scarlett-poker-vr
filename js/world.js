// /js/world.js — Scarlett Poker VR — World + Teleport Pads + Safe Spawn
// GitHub Pages safe (CDN three.module.js)
// Returns: { spawn, colliders, bounds, pads, padById }

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const World = {
  _tex: null,

  _safeTexture(file, { repeat = [6, 6] } = {}) {
    if (!this._tex) this._tex = new THREE.TextureLoader();
    const url = `assets/textures/${file}`;

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

  build(scene, playerGroup) {
    // ----- ROOM -----
    const ROOM_W = 34;
    const ROOM_D = 34;
    const WALL_H = 9.5;

    const floorMat = this._mat({
      file: "Marblegold Floors.jpg", // ok if missing
      color: 0x15161a,
      repeat: [7, 7],
      roughness: 0.98,
      metalness: 0.02,
    });

    const wallMat = this._mat({
      file: "brickwall.jpg", // ok if missing
      color: 0x1b2028,
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

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Walls
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

    // Trim
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

    // ----- TABLE (center) -----
    const tableGroup = new THREE.Group();
    tableGroup.position.set(0, 0, 0);

    const feltMat = new THREE.MeshStandardMaterial({ color: 0x0b3a2a, roughness: 0.9, metalness: 0.02 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.55, metalness: 0.1 });

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

    // Chairs
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x3b3b3b, roughness: 0.85, metalness: 0.05 });
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

      scene.add(chair);
    }

    // ----- TELEPORT PADS -----
    const pads = [];
    const padById = {};

    const mkPad = (id, label, x, z, color) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);

      // base + glow rings
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 0.9, 0.04, 40),
        new THREE.MeshStandardMaterial({ color: 0x0e0f12, roughness: 0.8, metalness: 0.1 })
      );
      base.position.y = 0.02;
      g.add(base);

      const ring1 = new THREE.Mesh(
        new THREE.TorusGeometry(0.72, 0.04, 12, 64),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 1.6,
          roughness: 0.2,
          metalness: 0.2,
        })
      );
      ring1.rotation.x = Math.PI / 2;
      ring1.position.y = 0.06;
      g.add(ring1);

      const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(0.52, 0.03, 12, 64),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 1.2,
          roughness: 0.2,
          metalness: 0.2,
          transparent: true,
          opacity: 0.9,
        })
      );
      ring2.rotation.x = Math.PI / 2;
      ring2.position.y = 0.065;
      g.add(ring2);

      // simple in-world label plank
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.22, 0.07),
        new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.9, metalness: 0.05 })
      );
      plank.position.set(0, 1.25, 0);
      g.add(plank);

      // “fake text” stripes (super-safe; no canvas textures needed)
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(1.35, 0.06, 0.01),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8 })
      );
      stripe.position.set(0, 1.25, 0.041);
      g.add(stripe);

      // store metadata
      const pad = {
        id,
        label,
        position: new THREE.Vector3(x, 0, z),
        yaw: 0,
        radius: 0.95,
        object: g
      };
      g.userData.teleportPad = pad;

      scene.add(g);
      pads.push(pad);
      padById[id] = pad;
      return pad;
    };

    // Layout: pads placed away from table so spawn is never blocked
    mkPad("lobby", "Lobby", 0, 11.5, 0x00ffaa);
    mkPad("vip", "VIP Room", -11.5, 0, 0xff2bd6);
    mkPad("store", "Store", 11.5, 0, 0x2bd7ff);
    mkPad("tournament", "Tournament", 0, -11.5, 0xffd27a);

    // ----- COLLIDERS + BOUNDS -----
    const colliders = [];
    const wallThick = 0.4;

    const addBoxCollider = (w, h, d, x, y, z) => {
      const m = new THREE.MeshBasicMaterial({ visible: false });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      mesh.userData.box = new THREE.Box3().setFromObject(mesh);
      scene.add(mesh);
      colliders.push(mesh);
      return mesh;
    };

    // Walls colliders
    addBoxCollider(ROOM_W, WALL_H, wallThick, 0, WALL_H / 2, -ROOM_D / 2);
    addBoxCollider(ROOM_W, WALL_H, wallThick, 0, WALL_H / 2, ROOM_D / 2);
    addBoxCollider(wallThick, WALL_H, ROOM_D, ROOM_W / 2, WALL_H / 2, 0);
    addBoxCollider(wallThick, WALL_H, ROOM_D, -ROOM_W / 2, WALL_H / 2, 0);

    // Table collider (THIS is what was trapping you)
    // A simple box around table area so you can't walk through it
    addBoxCollider(6.4, 2.6, 6.4, 0, 1.0, 0);

    const bounds = {
      min: new THREE.Vector3(-ROOM_W / 2 + 1.2, 0, -ROOM_D / 2 + 1.2),
      max: new THREE.Vector3(ROOM_W / 2 - 1.2, 0, ROOM_D / 2 - 1.2),
    };

    // Default spawn = lobby pad (never inside the table)
    const spawn = padById.lobby.position.clone();

    return { spawn, colliders, bounds, pads, padById };
  },
};
