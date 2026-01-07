// /js/world.js — Scarlett Poker VR — WORLD v11 (Best World Build, GitHub Safe)
// Features:
// - Bright lighting (never black void)
// - Solid floor + 4 walls + rail + table keep-out collider
// - Teleport pads (lobby/vip/store/tournament) with pad IDs
// - Store kiosk placeholder
// - Casino props (columns, ceiling panels, neon accents)
// - Texture-safe loader (won't crash if missing)
// Returns: { spawn, colliders, bounds, pads, padById, floorY, room, table }

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const World = {
  _tex: null,

  _safeTexture(file, { repeat = [6, 6] } = {}) {
    if (!this._tex) this._tex = new THREE.TextureLoader();
    const url = `assets/textures/${file}`;

    // placeholder that becomes real texture if loaded
    const t = new THREE.Texture();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.colorSpace = THREE.SRGBColorSpace;

    try {
      this._tex.load(
        url,
        (loaded) => {
          loaded.wrapS = loaded.wrapT = THREE.RepeatWrapping;
          loaded.repeat.set(repeat[0], repeat[1]);
          loaded.colorSpace = THREE.SRGBColorSpace;

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
    if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
    return m;
  },

  build(scene) {
    // --- Scene baseline ---
    scene.background = new THREE.Color(0x06070a);
    scene.fog = new THREE.Fog(0x06070a, 10, 80);

    // --- Room sizing ---
    const ROOM_W = 34;
    const ROOM_D = 34;
    const WALL_H = 9.5;
    const floorY = 0;

    // --- Lighting (bright, stable) ---
    const amb = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(amb);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.15);
    hemi.position.set(0, 22, 0);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(18, 26, 12);
    scene.add(sun);

    // Ceiling “panel lights”
    const panelLightA = new THREE.RectAreaLight(0xffffff, 4.5, 14, 14);
    panelLightA.position.set(0, 9.2, 0);
    panelLightA.lookAt(0, 0, 0);
    scene.add(panelLightA);

    // Extra point lights around the room so never dark
    const mkPoint = (x, z, intensity = 0.65) => {
      const p = new THREE.PointLight(0xffffff, intensity, 28);
      p.position.set(x, 6.2, z);
      scene.add(p);
      return p;
    };
    mkPoint(-12, -12, 0.7);
    mkPoint(12, -12, 0.7);
    mkPoint(-12, 12, 0.7);
    mkPoint(12, 12, 0.7);

    // --- Materials ---
    const floorMat = this._mat({
      file: "Marblegold Floors.jpg", // ok if missing
      color: 0x2a2f37,
      repeat: [7, 7],
      roughness: 0.92,
      metalness: 0.06,
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
      roughness: 0.33,
      metalness: 0.62,
      emissive: 0x2a1a08,
      emissiveIntensity: 0.45,
    });

    const blackMetal = new THREE.MeshStandardMaterial({
      color: 0x101114,
      roughness: 0.45,
      metalness: 0.35,
    });

    const neonMat = (c) =>
      new THREE.MeshStandardMaterial({
        color: c,
        emissive: c,
        emissiveIntensity: 1.6,
        roughness: 0.25,
        metalness: 0.15,
        transparent: true,
        opacity: 0.95,
      });

    // --- Floor (tiny lift avoids z-fighting/blinking) ---
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = floorY + 0.0015;
    floor.receiveShadow = false;
    floor.userData.isFloor = true; // used by VR rig raycast
    scene.add(floor);

    // --- Walls ---
    const mkWall = (w, h, x, y, z, ry) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
      m.position.set(x, y, z);
      m.rotation.y = ry;
      scene.add(m);
      return m;
    };
    mkWall(ROOM_W, WALL_H, 0, WALL_H / 2, -ROOM_D / 2, 0);
    mkWall(ROOM_W, WALL_H, 0, WALL_H / 2, ROOM_D / 2, Math.PI);
    mkWall(ROOM_D, WALL_H, ROOM_W / 2, WALL_H / 2, 0, -Math.PI / 2);
    mkWall(ROOM_D, WALL_H, -ROOM_W / 2, WALL_H / 2, 0, Math.PI / 2);

    // --- Trim baseboards ---
    const trimH = 0.22;
    const trimY = floorY + trimH / 2 + 0.001;
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

    // --- Ceiling panel (visual) ---
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM_W, ROOM_D),
      new THREE.MeshStandardMaterial({
        color: 0x0d0f14,
        roughness: 0.8,
        metalness: 0.1,
        emissive: 0x05070a,
        emissiveIntensity: 0.35,
      })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, WALL_H + 0.2, 0);
    scene.add(ceiling);

    // --- Neon corner accents ---
    const cornerNeonGeo = new THREE.BoxGeometry(0.18, 3.2, 0.18);
    const cornerPositions = [
      [-ROOM_W / 2 + 0.35, -ROOM_D / 2 + 0.35],
      [ ROOM_W / 2 - 0.35, -ROOM_D / 2 + 0.35],
      [-ROOM_W / 2 + 0.35,  ROOM_D / 2 - 0.35],
      [ ROOM_W / 2 - 0.35,  ROOM_D / 2 - 0.35],
    ];
    cornerPositions.forEach(([x, z], i) => {
      const c = i % 2 === 0 ? 0x00ffaa : 0xff2bd6;
      const n = new THREE.Mesh(cornerNeonGeo, neonMat(c));
      n.position.set(x, 1.6, z);
      scene.add(n);
    });

    // --- Center table area ---
    const table = new THREE.Group();
    table.position.set(0, 0, 0);

    const feltMat = new THREE.MeshStandardMaterial({
      color: 0x0b3a2a,
      roughness: 0.9,
      metalness: 0.02,
    });

    const railMat = new THREE.MeshStandardMaterial({
      color: 0x121212,
      roughness: 0.55,
      metalness: 0.12,
    });

    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.18, 48), feltMat);
    tableTop.position.y = 0.95;
    table.add(tableTop);

    const tableRail = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.14, 18, 56), railMat);
    tableRail.rotation.x = Math.PI / 2;
    tableRail.position.y = 1.05;
    table.add(tableRail);

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 0.9, 24), railMat);
    pedestal.position.y = 0.45;
    table.add(pedestal);

    const tableSpot = new THREE.SpotLight(0xffffff, 1.25, 18, Math.PI / 6, 0.35, 1.0);
    tableSpot.position.set(0, 7.5, 0);
    tableSpot.target = tableTop;
    scene.add(tableSpot);
    scene.add(tableSpot.target);

    scene.add(table);

    // --- Chairs (6) ---
    const chairMat = new THREE.MeshStandardMaterial({
      color: 0x3b3b3b,
      roughness: 0.85,
      metalness: 0.06,
    });

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
        [-0.23, 0.22], [0.23, 0.22],
        [-0.23, -0.22], [0.23, -0.22],
      ];
      for (const [lx, lz] of offsets) {
        const leg = new THREE.Mesh(legGeo, chairMat);
        leg.position.set(lx, 0.22, lz);
        g.add(leg);
      }
      return g;
    };

    const chairRadius = 3.1;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const cx = Math.cos(a) * chairRadius;
      const cz = Math.sin(a) * chairRadius;

      const chair = mkChair();
      chair.position.set(cx, 0, cz);
      chair.rotation.y = -a + Math.PI / 2;
      scene.add(chair);
    }

    // --- Rail around the table (visual boundary) ---
    const rail = new THREE.Group();
    const railR = 6.0;
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.05, 14);
    const barGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.0, 12);

    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const x = Math.cos(a) * railR;
      const z = Math.sin(a) * railR;

      const post = new THREE.Mesh(postGeo, blackMetal);
      post.position.set(x, 0.52, z);
      rail.add(post);

      // small neon caps
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), neonMat(i % 2 ? 0x2bd7ff : 0x00ffaa));
      cap.position.set(x, 1.05, z);
      rail.add(cap);
    }

    // a couple bars
    const bar1 = new THREE.Mesh(barGeo, blackMetal);
    bar1.position.set(0, 0.95, railR);
    bar1.rotation.x = Math.PI / 2;
    rail.add(bar1);

    const bar2 = new THREE.Mesh(barGeo, blackMetal);
    bar2.position.set(0, 0.95, -railR);
    bar2.rotation.x = Math.PI / 2;
    rail.add(bar2);

    scene.add(rail);

    // --- Store kiosk placeholder (front-right) ---
    const kiosk = new THREE.Group();
    kiosk.position.set(10.5, 0, 9.5);

    const kioskBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 1.05, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x0e1014, roughness: 0.65, metalness: 0.2 })
    );
    kioskBase.position.y = 0.52;
    kiosk.add(kioskBase);

    const kioskTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.08, 0.95),
      trimMat
    );
    kioskTop.position.y = 1.05;
    kiosk.add(kioskTop);

    const kioskSign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.35),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.1,
        transparent: true,
        opacity: 0.9,
      })
    );
    kioskSign.position.set(0, 1.55, 0.46);
    kiosk.add(kioskSign);

    const kioskLight = new THREE.PointLight(0x00ffaa, 0.9, 8);
    kioskLight.position.set(0, 2.0, 0.2);
    kiosk.add(kioskLight);

    scene.add(kiosk);

    // --- Teleport pads ---
    const pads = [];
    const padById = {};

    const mkPad = (id, label, x, z, color) => {
      const g = new THREE.Group();
      g.userData.padId = id; // IMPORTANT: VR raycasts find pad
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

      // beacon
      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1.0, 12),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2 })
      );
      beacon.position.y = 0.55;
      g.add(beacon);

      // tiny label plank (no text texture needed)
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(1.45, 0.18, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.9, metalness: 0.05 })
      );
      plank.position.set(0, 1.25, 0);
      g.add(plank);

      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.06, 0.01),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8 })
      );
      stripe.position.set(0, 1.25, 0.04);
      g.add(stripe);

      scene.add(g);

      const pad = { id, label, position: new THREE.Vector3(x, floorY, z), radius: 0.95, object: g };
      pads.push(pad);
      padById[id] = pad;
      return pad;
    };

    mkPad("lobby", "Lobby", 0, 11.5, 0x00ffaa);
    mkPad("vip", "VIP", -11.5, 0, 0xff2bd6);
    mkPad("store", "Store", 11.5, 0, 0x2bd7ff);
    mkPad("tournament", "Tournament", 0, -11.5, 0xffd27a);

    // --- Colliders + bounds ---
    const colliders = [];
    const wallThick = 0.55;

    const addBoxCollider = (w, h, d, x, y, z, tag = "") => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      mesh.position.set(x, y, z);
      mesh.userData.colliderTag = tag;
      scene.add(mesh);
      colliders.push(mesh);
      return mesh;
    };

    // walls
    addBoxCollider(ROOM_W, WALL_H, wallThick, 0, WALL_H / 2, -ROOM_D / 2, "wall");
    addBoxCollider(ROOM_W, WALL_H, wallThick, 0, WALL_H / 2, ROOM_D / 2, "wall");
    addBoxCollider(wallThick, WALL_H, ROOM_D, ROOM_W / 2, WALL_H / 2, 0, "wall");
    addBoxCollider(wallThick, WALL_H, ROOM_D, -ROOM_W / 2, WALL_H / 2, 0, "wall");

    // table keep-out
    const tableCollider = addBoxCollider(6.4, 2.6, 6.4, 0, 1.0, 0, "table");

    // rail keep-out (soft boundary)
    addBoxCollider(13.0, 1.8, 13.0, 0, 0.9, 0, "rail");

    // kiosk keep-out
    addBoxCollider(2.2, 2.2, 1.8, kiosk.position.x, 1.1, kiosk.position.z, "kiosk");

    const bounds = {
      min: new THREE.Vector3(-ROOM_W / 2 + 1.25, floorY, -ROOM_D / 2 + 1.25),
      max: new THREE.Vector3(ROOM_W / 2 - 1.25, floorY, ROOM_D / 2 - 1.25),
    };

    // Default spawn = lobby pad (never in table)
    const spawn = padById.lobby.position.clone();

    return {
      spawn,
      colliders,
      bounds,
      pads,
      padById,
      floorY,
      room: { ROOM_W, ROOM_D, WALL_H },
      table: { group: table, collider: tableCollider },
    };
  },
};
