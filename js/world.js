// /js/world.js — Scarlett Poker VR — WORLD v11 (Bright + Seats + Kiosk + Chips/Cards)
// GitHub Pages safe (CDN three.module.js)
// Returns: { spawn, colliders, bounds, pads, padById, floorY, seats, kiosk }

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
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, map });
    if (map) m.map.colorSpace = THREE.SRGBColorSpace;
    return m;
  },

  build(scene, playerGroup) {
    const ROOM_W = 34;
    const ROOM_D = 34;
    const WALL_H = 9.5;
    const floorY = 0;

    // ---------- LIGHTS (brighter + stable) ----------
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));

    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.0);
    hemi.position.set(0, 18, 0);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 1.7);
    sun.position.set(16, 22, 10);
    scene.add(sun);

    // ---------- MATERIALS ----------
    const floorMat = this._mat({
      file: "Marblegold Floors.jpg",
      color: 0x2b2f38,
      repeat: [6, 6],
      roughness: 0.95,
      metalness: 0.02,
    });

    const wallMat = this._mat({
      file: "brickwall.jpg",
      color: 0x1b2028,
      repeat: [10, 3],
      roughness: 0.98,
      metalness: 0.01,
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      roughness: 0.35,
      metalness: 0.55,
      emissive: 0x2a1a08,
      emissiveIntensity: 0.55,
    });

    // ---------- FLOOR (anti-blink lift) ----------
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = floorY + 0.002;
    floor.userData.isFloor = true;
    scene.add(floor);

    // ---------- WALLS ----------
    const mkWall = (w, h, x, y, z, ry) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
      m.position.set(x, y, z);
      m.rotation.y = ry;
      scene.add(m);
      return m;
    };
    mkWall(ROOM_W, WALL_H, 0, WALL_H / 2, -ROOM_D / 2, 0);
    mkWall(ROOM_W, WALL_H, 0, WALL_H / 2,  ROOM_D / 2, Math.PI);
    mkWall(ROOM_D, WALL_H,  ROOM_W / 2, WALL_H / 2, 0, -Math.PI / 2);
    mkWall(ROOM_D, WALL_H, -ROOM_W / 2, WALL_H / 2, 0,  Math.PI / 2);

    // ---------- TRIM ----------
    const trimH = 0.22;
    const trimY = floorY + trimH / 2 + 0.002;
    const t1 = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, trimH, 0.22), trimMat);
    t1.position.set(0, trimY, -ROOM_D / 2 + 0.11);
    scene.add(t1);
    const t2 = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, trimH, 0.22), trimMat);
    t2.position.set(0, trimY,  ROOM_D / 2 - 0.11);
    scene.add(t2);
    const t3 = new THREE.Mesh(new THREE.BoxGeometry(0.22, trimH, ROOM_D), trimMat);
    t3.position.set( ROOM_W / 2 - 0.11, trimY, 0);
    scene.add(t3);
    const t4 = new THREE.Mesh(new THREE.BoxGeometry(0.22, trimH, ROOM_D), trimMat);
    t4.position.set(-ROOM_W / 2 + 0.11, trimY, 0);
    scene.add(t4);

    // ---------- TABLE ----------
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

    // brighter local table light
    const tableLight = new THREE.PointLight(0xffffff, 1.25, 14);
    tableLight.position.set(0, 2.9, 0);
    tableGroup.add(tableLight);

    scene.add(tableGroup);

    // ---------- CHIPS + CARDS (static preview) ----------
    const chipMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.2 });
    const chipGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 22);

    const chips = new THREE.Group();
    chips.position.set(0.35, 1.06, 0.25);
    for (let i = 0; i < 18; i++) {
      const c = new THREE.Mesh(chipGeo, chipMat);
      c.position.set((i % 6) * 0.1, (Math.floor(i / 6)) * 0.022, 0);
      chips.add(c);
    }
    tableGroup.add(chips);

    const cardMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.85, metalness: 0.0 });
    const cardGeo = new THREE.PlaneGeometry(0.16, 0.22);
    const cards = new THREE.Group();
    cards.position.set(-0.35, 1.06, -0.15);
    for (let i = 0; i < 5; i++) {
      const card = new THREE.Mesh(cardGeo, cardMat);
      card.rotation.x = -Math.PI / 2;
      card.position.set(i * 0.18, 0.002, 0);
      cards.add(card);
    }
    tableGroup.add(cards);

    // ---------- CHAIRS (face TABLE correctly) + SEATS ARRAY ----------
    const seats = [];
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x3b3b3b, roughness: 0.85, metalness: 0.05 });
    const chairRadius = 3.1;

    const mkChair = () => {
      const g = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), chairMat);
      seat.position.y = 0.45;
      g.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.08), chairMat);
      back.position.set(0, 0.75, -0.23);
      g.add(back);

      const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.42, 10);
      const offsets = [
        [-0.23, 0.23], [0.23, 0.23],
        [-0.23,-0.23], [0.23,-0.23],
      ];
      for (const [lx, lz] of offsets) {
        const leg = new THREE.Mesh(legGeo, chairMat);
        leg.position.set(lx, 0.22, lz);
        g.add(leg);
      }
      return g;
    };

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const cx = Math.cos(a) * chairRadius;
      const cz = Math.sin(a) * chairRadius;

      const chair = mkChair();
      chair.position.set(cx, floorY, cz);

      // FACE the center of the table
      const yawToCenter = Math.atan2(0 - cx, 0 - cz);
      chair.rotation.y = yawToCenter;

      scene.add(chair);

      // seat position: a bit forward from chair, at standing floor Y
      const seatPos = new THREE.Vector3(cx, floorY, cz).add(
        new THREE.Vector3(0, 0, 0.55).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawToCenter)
      );

      seats.push({
        id: `seat_${i}`,
        position: seatPos,
        yaw: yawToCenter,
      });
    }

    // ---------- TELEPORT PADS ----------
    const pads = [];
    const padById = {};

    const mkPad = (id, x, z, color) => {
      const g = new THREE.Group();
      g.position.set(x, floorY, z);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 0.9, 0.04, 40),
        new THREE.MeshStandardMaterial({ color: 0x0e0f12, roughness: 0.8, metalness: 0.1 })
      );
      base.position.y = 0.02;
      g.add(base);

      const ring1 = new THREE.Mesh(
        new THREE.TorusGeometry(0.72, 0.04, 12, 64),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.0, roughness: 0.2, metalness: 0.2 })
      );
      ring1.rotation.x = Math.PI / 2;
      ring1.position.y = 0.06;
      g.add(ring1);

      const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(0.52, 0.03, 12, 64),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5, roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.9 })
      );
      ring2.rotation.x = Math.PI / 2;
      ring2.position.y = 0.065;
      g.add(ring2);

      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1.0, 12),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.1 })
      );
      beacon.position.y = 0.55;
      g.add(beacon);

      scene.add(g);

      const pad = { id, position: new THREE.Vector3(x, floorY, z), radius: 0.95, object: g };
      pads.push(pad);
      padById[id] = pad;
      return pad;
    };

    mkPad("lobby", 0, 11.5, 0x00ffaa);
    mkPad("vip", -11.5, 0, 0xff2bd6);
    mkPad("store", 11.5, 0, 0x2bd7ff);
    mkPad("tournament", 0, -11.5, 0xffd27a);

    // ---------- STORE KIOSK (ray target) ----------
    const kiosk = new THREE.Group();
    kiosk.position.set(11.5, floorY, 2.8);

    const kioskBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.4, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x0f1014, roughness: 0.75, metalness: 0.15 })
    );
    kioskBody.position.y = 0.7;
    kiosk.add(kioskBody);

    const kioskScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 0.65),
      new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x003322, emissiveIntensity: 0.9 })
    );
    kioskScreen.position.set(0, 1.05, 0.41);
    kiosk.add(kioskScreen);

    kiosk.userData.isStoreKiosk = true;
    kiosk.userData.rayTargets = [kioskBody, kioskScreen];
    scene.add(kiosk);

    // ---------- COLLIDERS + BOUNDS ----------
    const colliders = [];
    const wallThick = 0.5;

    const addBoxCollider = (w, h, d, x, y, z) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      mesh.position.set(x, y, z);
      scene.add(mesh);
      colliders.push(mesh);
      return mesh;
    };

    addBoxCollider(ROOM_W, WALL_H, wallThick, 0, WALL_H / 2, -ROOM_D / 2);
    addBoxCollider(ROOM_W, WALL_H, wallThick, 0, WALL_H / 2,  ROOM_D / 2);
    addBoxCollider(wallThick, WALL_H, ROOM_D,  ROOM_W / 2, WALL_H / 2, 0);
    addBoxCollider(wallThick, WALL_H, ROOM_D, -ROOM_W / 2, WALL_H / 2, 0);

    // table collider
    addBoxCollider(6.4, 2.6, 6.4, 0, 1.0, 0);

    // kiosk collider
    addBoxCollider(1.4, 1.6, 1.0, kiosk.position.x, 0.8, kiosk.position.z);

    const bounds = {
      min: new THREE.Vector3(-ROOM_W / 2 + 1.2, floorY, -ROOM_D / 2 + 1.2),
      max: new THREE.Vector3( ROOM_W / 2 - 1.2, floorY,  ROOM_D / 2 - 1.2),
    };

    // spawn = lobby pad
    const spawn = padById.lobby.position.clone();

    return { spawn, colliders, bounds, pads, padById, floorY, seats, kiosk };
  },
};
