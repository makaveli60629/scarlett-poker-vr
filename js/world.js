import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

/**
 * WORLD (Visual Upgrade)
 * - Lobby + PokerRoom rooms
 * - Solid walls/floor + ceiling panels (no black void)
 * - Neon trim on corners + ceiling edges
 * - Better lighting so Quest never looks “dead”
 * - Teleport pads + store kiosk kept
 */
export const World = {
  colliders: [],
  teleportSurfaces: [],
  markers: {},

  // reset between loads
  reset() {
    this.colliders = [];
    this.teleportSurfaces = [];
    this.markers = {};
  },

  addCollider(mesh) {
    mesh.userData.isCollider = true;
    mesh.geometry?.computeBoundingBox?.();
    this.colliders.push(mesh);
  },

  addTeleportSurface(mesh) {
    mesh.userData.teleportable = true;
    mesh.geometry?.computeBoundingBox?.();
    this.teleportSurfaces.push(mesh);
  },

  // ---------- Materials ----------
  mats: {
    floorDark: new THREE.MeshStandardMaterial({ color: 0x1a1b22, roughness: 0.95, metalness: 0.0 }),
    floorPoker: new THREE.MeshStandardMaterial({ color: 0x121318, roughness: 0.92, metalness: 0.05 }),
    wallLobby: new THREE.MeshStandardMaterial({ color: 0x262a35, roughness: 0.90, metalness: 0.05 }),
    wallPoker: new THREE.MeshStandardMaterial({ color: 0x1f2430, roughness: 0.88, metalness: 0.06 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x0e1016, roughness: 0.85, metalness: 0.05 }),

    neonCyan: new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 2.3,
      roughness: 0.2,
      metalness: 0.1
    }),

    neonPurple: new THREE.MeshStandardMaterial({
      color: 0xb14cff,
      emissive: 0xb14cff,
      emissiveIntensity: 2.0,
      roughness: 0.25,
      metalness: 0.1
    }),

    padBlue: new THREE.MeshStandardMaterial({
      color: 0x2f7dff,
      emissive: 0x2f7dff,
      emissiveIntensity: 1.5,
      roughness: 0.25
    }),

    kioskBase: new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.92, metalness: 0.05 }),
    kioskScreen: new THREE.MeshStandardMaterial({ color: 0x071010, emissive: 0x00ff88, emissiveIntensity: 1.4 }),
    felt: new THREE.MeshStandardMaterial({ color: 0x0f6b3e, roughness: 0.85, metalness: 0.0 }),
  },

  // ---------- Room Builder ----------
  buildRoom({ scene, name, center, size, theme = "lobby" }) {
    const group = new THREE.Group();
    group.name = name;
    group.position.copy(center);

    const isPoker = theme === "poker";
    const wallMat = isPoker ? this.mats.wallPoker : this.mats.wallLobby;
    const floorMat = isPoker ? this.mats.floorPoker : this.mats.floorDark;

    // FLOOR (solid + teleportable)
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(size.w, 0.22, size.d),
      floorMat
    );
    floor.position.set(0, -0.11, 0);
    floor.receiveShadow = false;
    group.add(floor);
    this.addCollider(floor);
    this.addTeleportSurface(floor);

    // WALLS (solid)
    const t = 0.36;
    const north = new THREE.Mesh(new THREE.BoxGeometry(size.w, size.h, t), wallMat);
    north.position.set(0, size.h / 2, -size.d / 2);

    const south = new THREE.Mesh(new THREE.BoxGeometry(size.w, size.h, t), wallMat);
    south.position.set(0, size.h / 2, size.d / 2);

    const west = new THREE.Mesh(new THREE.BoxGeometry(t, size.h, size.d), wallMat);
    west.position.set(-size.w / 2, size.h / 2, 0);

    const east = new THREE.Mesh(new THREE.BoxGeometry(t, size.h, size.d), wallMat);
    east.position.set(size.w / 2, size.h / 2, 0);

    for (const w of [north, south, west, east]) {
      group.add(w);
      this.addCollider(w);
    }

    // CEILING (so it’s not a black void)
    const ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(size.w, 0.18, size.d),
      this.mats.ceiling
    );
    ceiling.position.set(0, size.h + 0.05, 0);
    group.add(ceiling);
    this.addCollider(ceiling);

    // SOFT “CEILING GLOW” panel (adds vibe on Quest)
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(size.w * 0.85, size.d * 0.85),
      new THREE.MeshBasicMaterial({ color: isPoker ? 0x1b1230 : 0x0c2030, transparent: true, opacity: 0.35 })
    );
    glow.rotation.x = Math.PI / 2;
    glow.position.set(0, size.h + 0.01, 0);
    group.add(glow);

    // NEON TRIM (corners + ceiling edges)
    const trimMat = isPoker ? this.mats.neonPurple : this.mats.neonCyan;
    const trimW = 0.06;

    // corner posts
    const corners = [
      new THREE.Vector3(-size.w / 2 + trimW, size.h / 2, -size.d / 2 + trimW),
      new THREE.Vector3( size.w / 2 - trimW, size.h / 2, -size.d / 2 + trimW),
      new THREE.Vector3(-size.w / 2 + trimW, size.h / 2,  size.d / 2 - trimW),
      new THREE.Vector3( size.w / 2 - trimW, size.h / 2,  size.d / 2 - trimW)
    ];
    for (const p of corners) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(trimW, size.h, trimW), trimMat);
      post.position.copy(p);
      group.add(post);
    }

    // ceiling edge rails
    const yTop = size.h + 0.02;
    const edgeN = new THREE.Mesh(new THREE.BoxGeometry(size.w, trimW, trimW), trimMat);
    edgeN.position.set(0, yTop, -size.d / 2 + trimW);

    const edgeS = new THREE.Mesh(new THREE.BoxGeometry(size.w, trimW, trimW), trimMat);
    edgeS.position.set(0, yTop, size.d / 2 - trimW);

    const edgeW = new THREE.Mesh(new THREE.BoxGeometry(trimW, trimW, size.d), trimMat);
    edgeW.position.set(-size.w / 2 + trimW, yTop, 0);

    const edgeE = new THREE.Mesh(new THREE.BoxGeometry(trimW, trimW, size.d), trimMat);
    edgeE.position.set(size.w / 2 - trimW, yTop, 0);

    group.add(edgeN, edgeS, edgeW, edgeE);

    // LIGHTS (per-room; bright enough for Quest)
    // 1) ambient fill
    group.add(new THREE.AmbientLight(0xffffff, isPoker ? 0.55 : 0.65));

    // 2) center light
    const centerLight = new THREE.PointLight(isPoker ? 0xb14cff : 0x00ffff, 1.35, 30);
    centerLight.position.set(0, size.h - 0.2, 0);
    group.add(centerLight);

    // 3) warm spot for depth
    const warm = new THREE.PointLight(0xffcc88, 0.65, 26);
    warm.position.set(-size.w * 0.25, size.h - 0.35, size.d * 0.2);
    group.add(warm);

    // 4) small floor accent lights
    const accent1 = new THREE.PointLight(isPoker ? 0x7f3bff : 0x2f7dff, 0.45, 14);
    accent1.position.set(size.w * 0.35, 0.35, -size.d * 0.25);
    const accent2 = new THREE.PointLight(isPoker ? 0x7f3bff : 0x2f7dff, 0.45, 14);
    accent2.position.set(-size.w * 0.35, 0.35, size.d * 0.25);
    group.add(accent1, accent2);

    scene.add(group);
    return group;
  },

  // ---------- Teleport Pad ----------
  makeTeleportPad({ scene, position, label }) {
    const y = 0.035;

    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.08, 32), this.mats.padBlue);
    pad.position.set(position.x, y, position.z);
    pad.userData.teleportTarget = label;
    scene.add(pad);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.98, 0.06, 12, 32),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.0, roughness: 0.2 })
    );
    ring.position.set(position.x, y + 0.06, position.z);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    this.markers[label] = new THREE.Vector3(position.x, 0, position.z);
    this.addTeleportSurface(pad);
  },

  // ---------- Store Kiosk ----------
  makeStoreKiosk({ scene, position }) {
    const kiosk = new THREE.Group();
    kiosk.position.copy(position);

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.25, 0.9), this.mats.kioskBase);
    base.position.y = 0.62;
    kiosk.add(base);
    this.addCollider(base);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), this.mats.kioskScreen);
    screen.position.set(0, 1.08, 0.46);
    kiosk.add(screen);

    const header = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.14, 0.10),
      new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 2.2 })
    );
    header.position.set(0, 1.32, 0.22);
    kiosk.add(header);

    const glowPad = new THREE.Mesh(
      new THREE.CircleGeometry(1.25, 40),
      new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.25 })
    );
    glowPad.rotation.x = -Math.PI / 2;
    glowPad.position.set(0, 0.02, 0);
    kiosk.add(glowPad);

    scene.add(kiosk);

    this.markers.Store = new THREE.Vector3(position.x, 0, position.z);
  },

  // ---------- Props ----------
  addPokerTable({ scene, pos }) {
    const table = new THREE.Group();

    const top = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.22, 36), this.mats.felt);
    top.position.set(0, 0.9, 0);
    table.add(top);
    this.addCollider(top);

    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(2.45, 0.12, 14, 42),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.05 })
    );
    rail.position.set(0, 0.95, 0);
    rail.rotation.x = Math.PI / 2;
    table.add(rail);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.75, 0.8, 22),
      new THREE.MeshStandardMaterial({ color: 0x101015, roughness: 0.9, metalness: 0.05 })
    );
    base.position.set(0, 0.4, 0);
    table.add(base);
    this.addCollider(base);

    table.position.copy(pos);
    scene.add(table);
  },

  // ---------- Main Build ----------
  build(scene, playerGroup) {
    this.reset();

    // Keep background subtle (not full black)
    scene.background = new THREE.Color(0x05060a);
    scene.fog = new THREE.Fog(0x05060a, 6, 90);

    // safe spawn
    playerGroup.position.set(0, 0, 5);

    // Lobby
    this.buildRoom({
      scene,
      name: "Lobby",
      center: new THREE.Vector3(0, 0, 0),
      size: { w: 18, h: 4.2, d: 18 },
      theme: "lobby"
    });

    // Poker Room
    this.buildRoom({
      scene,
      name: "PokerRoom",
      center: new THREE.Vector3(0, 0, -32),
      size: { w: 22, h: 4.6, d: 22 },
      theme: "poker"
    });

    // Teleport pads
    this.makeTeleportPad({ scene, position: new THREE.Vector3(0, 0, 2), label: "Lobby" });
    this.makeTeleportPad({ scene, position: new THREE.Vector3(0, 0, -30), label: "PokerRoom" });

    // Store kiosk in Lobby
    this.makeStoreKiosk({ scene, position: new THREE.Vector3(-5.6, 0, 5.6) });

    // Poker table in poker room
    this.addPokerTable({ scene, pos: new THREE.Vector3(0, 0, -32) });

    // Helpful markers
    this.markers.Lobby = new THREE.Vector3(0, 0, 5);
    this.markers.PokerRoom = new THREE.Vector3(0, 0, -30);
  }
};
