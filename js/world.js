import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { TableFactory } from "./table_factory.js";

const table = TableFactory.build({
  scene,
  position: new THREE.Vector3(0, 0, 0),
  shape: "oval",     // "round" or "oval"
  seats: 8,          // 6 or 8
  theme: "black_gold", // classic_green / emerald_lux / black_gold / custom
  title: "SCARLETT POKER",
});

// later: seat positions for bots
console.log(table.seatPositions);
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

  build(scene, rig) {
    const ROOM_W = 34;
    const ROOM_D = 34;
    const WALL_H = 9.5;
    const floorY = 0;

    // WORLD LIGHTS (strong enough that it never goes black)
    const amb = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(amb);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.05);
    hemi.position.set(0, 20, 0);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(14, 24, 10);
    scene.add(sun);

    // Materials
    const floorMat = this._mat({
      file: "Marblegold Floors.jpg",
      color: 0x2a2d35,
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
      emissiveIntensity: 0.45,
    });

    // Floor (lift a hair to avoid shimmer)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = floorY + 0.0015;
    scene.add(floor);

    // Walls
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

    // Trim
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

    // Elegant Guardrails (glowing)
    const rails = new THREE.Group();
    const railColor = 0x00ffaa;
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x0b0c10,
      emissive: railColor,
      emissiveIntensity: 0.65,
      roughness: 0.4,
      metalness: 0.15,
    });

    const railH = 1.05;
    const railTh = 0.08;
    const railR = 6.3;

    const mkRailSeg = (w, d, x, z) => {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(w, railH, d), railMat);
      seg.position.set(x, railH / 2, z);
      rails.add(seg);
      return seg;
    };

    mkRailSeg(railR * 2, railTh, 0, -railR);
    mkRailSeg(railR * 2, railTh, 0, railR);
    mkRailSeg(railTh, railR * 2, -railR, 0);
    mkRailSeg(railTh, railR * 2, railR, 0);
    scene.add(rails);

    // Table
    const tableGroup = new THREE.Group();
    tableGroup.position.set(0, 0, 0);

    const feltMat = new THREE.MeshStandardMaterial({ color: 0x0b3a2a, roughness: 0.9, metalness: 0.02 });
    const railTopMat = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.55, metalness: 0.1 });

    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.18, 56), feltMat);
    tableTop.position.y = 0.95;
    tableGroup.add(tableTop);

    const tableRail = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.14, 18, 72), railTopMat);
    tableRail.rotation.x = Math.PI / 2;
    tableRail.position.y = 1.05;
    tableGroup.add(tableRail);

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 0.9, 28), railTopMat);
    pedestal.position.y = 0.45;
    tableGroup.add(pedestal);

    // Center chips placeholder (always visible)
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.09, 18),
      new THREE.MeshStandardMaterial({ color: 0xffd27a, roughness: 0.35, metalness: 0.35, emissive: 0x1b1206, emissiveIntensity: 0.25 })
    );
    pot.position.set(0, 1.08, 0);
    tableGroup.add(pot);

    // Table light
    const tableLight = new THREE.PointLight(0xffffff, 1.1, 14);
    tableLight.position.set(0, 3.0, 0);
    tableGroup.add(tableLight);

    scene.add(tableGroup);

    // Chairs + seat anchors (chairs face table correctly)
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x3b3b3b, roughness: 0.85, metalness: 0.05 });
    const chairRadius = 3.15;

    const seats = [];
    const mkChair = () => {
      const g = new THREE.Group();

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), chairMat);
      seat.position.y = 0.45;
      g.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.08), chairMat);
      back.position.set(0, 0.75, -0.23);
      g.add(back);

      const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.42, 10);
      const offsets = [[-0.23, 0.22],[0.23,0.22],[-0.23,-0.22],[0.23,-0.22]];
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
      chair.position.set(cx, 0, cz);

      // Face table center:
      chair.lookAt(0, 0, 0);
      chair.rotation.y += Math.PI; // correct chair facing direction

      scene.add(chair);

      const seatAnchor = new THREE.Object3D();
      seatAnchor.position.set(cx, 0, cz);
      seatAnchor.lookAt(0, 0, 0);
      seats.push({
        index: i,
        position: new THREE.Vector3(cx, 0, cz),
        yaw: seatAnchor.rotation.y,
      });
    }

    // Teleport pads (Lobby spawn must be here)
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

      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1.05, 12),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2 })
      );
      beacon.position.y = 0.55;
      g.add(beacon);

      scene.add(g);

      const pad = { id, position: new THREE.Vector3(x, floorY, z), radius: 0.95, object: g };
      g.userData.teleportPad = pad;
      pads.push(pad);
      padById[id] = pad;
      return pad;
    };

    mkPad("lobby", 0, 11.5, 0x00ffaa);
    mkPad("vip", -11.5, 0, 0xff2bd6);
    mkPad("store", 11.5, 0, 0x2bd7ff);
    mkPad("tournament", 0, -11.5, 0xffd27a);

    // Colliders + bounds
    const colliders = [];
    const wallThick = 0.5;

    const addCollider = (w, h, d, x, y, z) => {
      const m = new THREE.MeshBasicMaterial({ visible: false });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      mesh.userData.box = new THREE.Box3().setFromObject(mesh);
      scene.add(mesh);
      colliders.push(mesh);
      return mesh;
    };

    // Walls
    addCollider(ROOM_W, WALL_H, wallThick, 0, WALL_H / 2, -ROOM_D / 2);
    addCollider(ROOM_W, WALL_H, wallThick, 0, WALL_H / 2, ROOM_D / 2);
    addCollider(wallThick, WALL_H, ROOM_D, ROOM_W / 2, WALL_H / 2, 0);
    addCollider(wallThick, WALL_H, ROOM_D, -ROOM_W / 2, WALL_H / 2, 0);

    // Table blocker (so you can't walk through)
    addCollider(6.4, 2.6, 6.4, 0, 1.0, 0);

    // Guardrail blockers (walkway)
    addCollider(railR * 2, railH, railTh + 0.02, 0, railH / 2, -railR);
    addCollider(railR * 2, railH, railTh + 0.02, 0, railH / 2, railR);
    addCollider(railTh + 0.02, railH, railR * 2, -railR, railH / 2, 0);
    addCollider(railTh + 0.02, railH, railR * 2, railR, railH / 2, 0);

    const bounds = {
      min: new THREE.Vector3(-ROOM_W / 2 + 1.2, floorY, -ROOM_D / 2 + 1.2),
      max: new THREE.Vector3(ROOM_W / 2 - 1.2, floorY, ROOM_D / 2 - 1.2),
    };

    // Lobby “wander zone” for eliminated bots
    const lobbyZone = {
      min: new THREE.Vector3(-12, 0, 7.5),
      max: new THREE.Vector3(12, 0, 15.5),
    };

    // ✅ Default spawn ALWAYS = lobby pad
    const spawn = padById.lobby.position.clone();

    return { spawn, colliders, bounds, pads, padById, floorY, seats, lobbyZone };
  },
};
