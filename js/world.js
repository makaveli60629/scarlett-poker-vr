// /js/world.js — Scarlett Poker VR — WORLD v11 (Full Extension Mode)
// GitHub Pages safe (CDN three.module.js)
// Returns: {
//   spawn, floorY, bounds, colliders,
//   pads, padById,
//   chairs, anchors
// }

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
    if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
    return m;
  },

  build(scene) {
    // ---------- GLOBAL LOOK ----------
    scene.background = new THREE.Color(0x05070c);
    scene.fog = new THREE.Fog(0x05070c, 10, 70);

    const floorY = 0;

    // ---------- ROOM ----------
    const ROOM_W = 36;
    const ROOM_D = 36;
    const WALL_H = 10;

    // ---------- LIGHTING (BRIGHT + ELEGANT) ----------
    const amb = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(amb);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.95);
    hemi.position.set(0, 20, 0);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 1.35);
    sun.position.set(14, 26, 12);
    scene.add(sun);

    // Ceiling ring lights (soft + premium)
    const ceiling = new THREE.Group();
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x10131a,
      roughness: 0.25,
      metalness: 0.35,
      emissive: 0x0a0f14,
      emissiveIntensity: 0.75
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(9.2, 0.10, 12, 96), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 7.6;
    ceiling.add(ring);

    const ceilingGlow = new THREE.PointLight(0xffffff, 0.8, 40);
    ceilingGlow.position.set(0, 7.5, 0);
    ceiling.add(ceilingGlow);

    scene.add(ceiling);

    // ---------- MATERIALS ----------
    const floorMat = this._mat({
      file: "Marblegold Floors.jpg",
      color: 0x2b2f38,
      repeat: [7, 7],
      roughness: 0.92,
      metalness: 0.04,
    });

    const wallMat = this._mat({
      file: "brickwall.jpg",
      color: 0x1a202a,
      repeat: [10, 3],
      roughness: 0.98,
      metalness: 0.01,
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      roughness: 0.28,
      metalness: 0.68,
      emissive: 0x2a1a08,
      emissiveIntensity: 0.55,
    });

    // ---------- FLOOR (NO BLINK) ----------
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = floorY + 0.0015; // prevents z-fight
    floor.receiveShadow = false;
    floor.userData.isFloor = true;
    scene.add(floor);

    // Decorative “carpet” in center to help orientation
    const carpet = new THREE.Mesh(
      new THREE.CircleGeometry(8.2, 72),
      new THREE.MeshStandardMaterial({
        color: 0x0b0f16,
        roughness: 0.95,
        metalness: 0.0,
        emissive: 0x010203,
        emissiveIntensity: 0.25
      })
    );
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.y = floorY + 0.0025;
    scene.add(carpet);

    // ---------- WALLS ----------
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

    // ---------- GOLD TRIM ----------
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

    // ---------- TABLE ----------
    const tableGroup = new THREE.Group();
    tableGroup.name = "PokerTable";
    tableGroup.position.set(0, floorY, 0);

    const feltMat = new THREE.MeshStandardMaterial({ color: 0x0b3a2a, roughness: 0.9, metalness: 0.02 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.55, metalness: 0.1 });

    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.18, 64), feltMat);
    tableTop.position.y = 0.95;
    tableGroup.add(tableTop);

    const tableRail = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.14, 18, 80), railMat);
    tableRail.rotation.x = Math.PI / 2;
    tableRail.position.y = 1.05;
    tableGroup.add(tableRail);

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.65, 0.92, 28), railMat);
    pedestal.position.y = 0.46;
    tableGroup.add(pedestal);

    const tableLight = new THREE.PointLight(0xffffff, 1.05, 18);
    tableLight.position.set(0, 2.8, 0);
    tableGroup.add(tableLight);

    scene.add(tableGroup);

    // ---------- GUARDRAILS (GLOWING + PREMIUM) ----------
    const rails = new THREE.Group();
    rails.name = "GuardRails";

    const railColor = 0x00ffaa; // pleasing neon green
    const railMatGlow = new THREE.MeshStandardMaterial({
      color: 0x0c0f12,
      roughness: 0.35,
      metalness: 0.25,
      emissive: railColor,
      emissiveIntensity: 0.9
    });

    const postMat = new THREE.MeshStandardMaterial({
      color: 0x0a0b0f,
      roughness: 0.45,
      metalness: 0.65
    });

    const railH = 1.05;
    const railR = 8.6;      // radius of rail ring
    const railSegments = 20;

    // Posts
    for (let i = 0; i < railSegments; i++) {
      const a = (i / railSegments) * Math.PI * 2;
      const x = Math.cos(a) * railR;
      const z = Math.sin(a) * railR;

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, railH, 12), postMat);
      post.position.set(x, floorY + railH / 2, z);
      rails.add(post);

      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), railMatGlow);
      cap.position.set(x, floorY + railH, z);
      rails.add(cap);
    }

    // Rail ring
    const ringRail = new THREE.Mesh(new THREE.TorusGeometry(railR, 0.035, 12, 160), railMatGlow);
    ringRail.rotation.x = Math.PI / 2;
    ringRail.position.y = floorY + railH;
    rails.add(ringRail);

    const railGlowLight = new THREE.PointLight(railColor, 0.35, 18);
    railGlowLight.position.set(0, floorY + railH, 0);
    rails.add(railGlowLight);

    scene.add(rails);

    // ---------- CHAIRS + SEAT EXPORT ----------
    const chairs = [];
    const chairRadius = 3.12;
    const seatCount = 8; // match bots (8) — can change later

    const chairMat = new THREE.MeshStandardMaterial({ color: 0x3b3b3b, roughness: 0.85, metalness: 0.05 });

    const mkChair = () => {
      const g = new THREE.Group();

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.56), chairMat);
      seat.position.y = 0.45;
      g.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.58, 0.08), chairMat);
      back.position.set(0, 0.78, -0.25);
      g.add(back);

      const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.44, 10);
      const offsets = [
        [-0.23, 0.23], [0.23, 0.23],
        [-0.23, -0.23], [0.23, -0.23],
      ];
      for (const [lx, lz] of offsets) {
        const leg = new THREE.Mesh(legGeo, chairMat);
        leg.position.set(lx, 0.22, lz);
        g.add(leg);
      }
      return g;
    };

    for (let i = 0; i < seatCount; i++) {
      const a = (i / seatCount) * Math.PI * 2;
      const x = Math.cos(a) * chairRadius;
      const z = Math.sin(a) * chairRadius;

      // face toward table
      const yaw = Math.atan2(-x, -z);

      const chair = mkChair();
      chair.position.set(x, floorY, z);
      chair.rotation.y = yaw;
      chair.name = `Chair_${i + 1}`;
      scene.add(chair);

      // seat anchor slightly closer to table and slightly raised
      const seatPos = new THREE.Vector3(
        Math.cos(a) * (chairRadius - 0.18),
        floorY + 0.0015,
        Math.sin(a) * (chairRadius - 0.18)
      );

      chairs.push({
        index: i,
        position: seatPos,
        yaw,
      });
    }

    // ---------- TELEPORT PADS ----------
    const pads = [];
    const padById = {};

    const mkPad = (id, label, x, z, color) => {
      const g = new THREE.Group();
      g.position.set(x, floorY, z);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 0.95, 0.045, 48),
        new THREE.MeshStandardMaterial({ color: 0x0e0f12, roughness: 0.85, metalness: 0.08 })
      );
      base.position.y = 0.022;
      g.add(base);

      const ring1 = new THREE.Mesh(
        new THREE.TorusGeometry(0.78, 0.045, 12, 80),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 2.0,
          roughness: 0.2,
          metalness: 0.2,
        })
      );
      ring1.rotation.x = Math.PI / 2;
      ring1.position.y = 0.07;
      g.add(ring1);

      const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(0.56, 0.03, 12, 80),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 1.4,
          roughness: 0.2,
          metalness: 0.2,
          transparent: true,
          opacity: 0.9,
        })
      );
      ring2.rotation.x = Math.PI / 2;
      ring2.position.y = 0.075;
      g.add(ring2);

      // beacon
      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1.05, 14),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.1 })
      );
      beacon.position.y = 0.56;
      g.add(beacon);

      scene.add(g);

      const pad = { id, label, position: new THREE.Vector3(x, floorY, z), yaw: 0, radius: 0.95, object: g };
      pads.push(pad);
      padById[id] = pad;
      return pad;
    };

    mkPad("lobby", "Lobby", 0, 12.0, 0x00ffaa);
    mkPad("vip", "VIP", -12.0, 0, 0xff2bd6);
    mkPad("store", "Store", 12.0, 0, 0x2bd7ff);
    mkPad("tournament", "Tournament", 0, -12.0, 0xffd27a);

    // ---------- COLLIDERS + BOUNDS ----------
    const colliders = [];
    const wallThick = 0.55;

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

    // walls
    addBoxCollider(ROOM_W, WALL_H, wallThick, 0, WALL_H / 2, -ROOM_D / 2);
    addBoxCollider(ROOM_W, WALL_H, wallThick, 0, WALL_H / 2, ROOM_D / 2);
    addBoxCollider(wallThick, WALL_H, ROOM_D, ROOM_W / 2, WALL_H / 2, 0);
    addBoxCollider(wallThick, WALL_H, ROOM_D, -ROOM_W / 2, WALL_H / 2, 0);

    // table collider (prevents walking through table)
    addBoxCollider(6.8, 2.8, 6.8, 0, 1.05, 0);

    const bounds = {
      min: new THREE.Vector3(-ROOM_W / 2 + 1.4, floorY, -ROOM_D / 2 + 1.4),
      max: new THREE.Vector3(ROOM_W / 2 - 1.4, floorY, ROOM_D / 2 - 1.4),
    };

    // ---------- ANCHORS (chips/cards placement) ----------
    const anchors = {
      tableCenter: new THREE.Vector3(0, floorY, 0),
      cardRow: new THREE.Vector3(0, floorY + 1.11, -0.35), // community card line
      chipArea: new THREE.Vector3(0, floorY + 1.10, 0.55), // pot/chips area
      dealerButton: new THREE.Vector3(0.85, floorY + 1.105, 0.18),
    };

    // Spawn = lobby pad (safe, never in table)
    const spawn = padById.lobby.position.clone();

    return { spawn, floorY, bounds, colliders, pads, padById, chairs, anchors };
  },
};
