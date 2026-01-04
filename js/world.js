import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

/**
 * Scarlett Poker VR — World vNext (Solid + Neon + Two Rooms + Store)
 * Works on: GitHub Pages + Oculus Browser + Android Chrome
 *
 * Features:
 * - Lobby room + PokerRoom
 * - Solid floor/walls/ceiling colliders
 * - Neon trim borders (corners + ceiling rails)
 * - Better lighting so Quest doesn't look "dead"
 * - Teleport pads (Lobby, PokerRoom) + Store kiosk marker
 * - Poker props: poker table + stage + LED strips
 */

export const World = {
  colliders: [],
  teleportSurfaces: [],
  markers: {},

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

  // ---------- Materials (no textures; stable on Quest) ----------
  mats: {
    floorLobby: new THREE.MeshStandardMaterial({ color: 0x1b1d24, roughness: 0.95, metalness: 0.05 }),
    floorPoker: new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.92, metalness: 0.06 }),

    wallLobby: new THREE.MeshStandardMaterial({ color: 0x262a36, roughness: 0.90, metalness: 0.05 }),
    wallPoker: new THREE.MeshStandardMaterial({ color: 0x1f2430, roughness: 0.88, metalness: 0.06 }),

    ceiling: new THREE.MeshStandardMaterial({ color: 0x0f1117, roughness: 0.88, metalness: 0.05 }),

    neonCyan: new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 2.2,
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
      emissiveIntensity: 1.45,
      roughness: 0.25,
      metalness: 0.1
    }),

    padWhiteRing: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.0,
      roughness: 0.2
    }),

    kioskBase: new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.92, metalness: 0.05 }),
    kioskScreen: new THREE.MeshStandardMaterial({ color: 0x071010, emissive: 0x00ff88, emissiveIntensity: 1.4 }),

    felt: new THREE.MeshStandardMaterial({ color: 0x0f6b3e, roughness: 0.85, metalness: 0.0 }),

    metalDark: new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.55, metalness: 0.35 }),
    matteBlack: new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.95, metalness: 0.05 })
  },

  // ---------- Helpers ----------
  addNeonCornerPosts(group, size, height, trimMat) {
    const trimW = 0.06;
    const corners = [
      new THREE.Vector3(-size.w / 2 + trimW, height / 2, -size.d / 2 + trimW),
      new THREE.Vector3( size.w / 2 - trimW, height / 2, -size.d / 2 + trimW),
      new THREE.Vector3(-size.w / 2 + trimW, height / 2,  size.d / 2 - trimW),
      new THREE.Vector3( size.w / 2 - trimW, height / 2,  size.d / 2 - trimW)
    ];
    for (const p of corners) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(trimW, height, trimW), trimMat);
      post.position.copy(p);
      group.add(post);
    }
  },

  addNeonCeilingRails(group, size, yTop, trimMat) {
    const trimW = 0.06;

    const edgeN = new THREE.Mesh(new THREE.BoxGeometry(size.w, trimW, trimW), trimMat);
    edgeN.position.set(0, yTop, -size.d / 2 + trimW);

    const edgeS = new THREE.Mesh(new THREE.BoxGeometry(size.w, trimW, trimW), trimMat);
    edgeS.position.set(0, yTop, size.d / 2 - trimW);

    const edgeW = new THREE.Mesh(new THREE.BoxGeometry(trimW, trimW, size.d), trimMat);
    edgeW.position.set(-size.w / 2 + trimW, yTop, 0);

    const edgeE = new THREE.Mesh(new THREE.BoxGeometry(trimW, trimW, size.d), trimMat);
    edgeE.position.set(size.w / 2 - trimW, yTop, 0);

    group.add(edgeN, edgeS, edgeW, edgeE);
  },

  // ---------- Build Room ----------
  buildRoom({ scene, name, center, size, theme }) {
    const group = new THREE.Group();
    group.name = name;
    group.position.copy(center);

    const isPoker = theme === "poker";
    const wallMat = isPoker ? this.mats.wallPoker : this.mats.wallLobby;
    const floorMat = isPoker ? this.mats.floorPoker : this.mats.floorLobby;
    const trimMat = isPoker ? this.mats.neonPurple : this.mats.neonCyan;

    // Floor (solid + teleportable)
    const floor = new THREE.Mesh(new THREE.BoxGeometry(size.w, 0.22, size.d), floorMat);
    floor.position.set(0, -0.11, 0);
    group.add(floor);
    this.addCollider(floor);
    this.addTeleportSurface(floor);

    // Walls (solid)
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

    // Ceiling (solid)
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(size.w, 0.18, size.d), this.mats.ceiling);
    ceiling.position.set(0, size.h + 0.06, 0);
    group.add(ceiling);
    this.addCollider(ceiling);

    // Ceiling glow panel (vibe, lightweight)
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(size.w * 0.85, size.d * 0.85),
      new THREE.MeshBasicMaterial({
        color: isPoker ? 0x1b1230 : 0x0b2230,
        transparent: true,
        opacity: 0.35
      })
    );
    glow.rotation.x = Math.PI / 2;
    glow.position.set(0, size.h + 0.01, 0);
    group.add(glow);

    // Neon trims
    this.addNeonCornerPosts(group, size, size.h, trimMat);
    this.addNeonCeilingRails(group, size, size.h + 0.02, trimMat);

    // Lights per-room (Quest-friendly)
    group.add(new THREE.AmbientLight(0xffffff, isPoker ? 0.50 : 0.60));

    const centerLight = new THREE.PointLight(isPoker ? 0xb14cff : 0x00ffff, 1.25, 30);
    centerLight.position.set(0, size.h - 0.2, 0);
    group.add(centerLight);

    const warm = new THREE.PointLight(0xffcc88, 0.65, 26);
    warm.position.set(-size.w * 0.25, size.h - 0.35, size.d * 0.2);
    group.add(warm);

    // Door frame / portal hint (visual only, still solid rooms)
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x111115,
      emissive: isPoker ? 0x4b1a7a : 0x004a6a,
      emissiveIntensity: 0.8,
      roughness: 0.75,
      metalness: 0.15
    });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.8, 0.12), frameMat);
    frame.position.set(0, 1.45, -size.d / 2 + 0.25);
    group.add(frame);

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

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.06, 12, 32), this.mats.padWhiteRing);
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

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.25, 0.95), this.mats.kioskBase);
    base.position.y = 0.62;
    kiosk.add(base);
    this.addCollider(base);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.74), this.mats.kioskScreen);
    screen.position.set(0, 1.08, 0.49);
    kiosk.add(screen);

    const header = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.14, 0.10),
      new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 2.2 })
    );
    header.position.set(0, 1.32, 0.24);
    kiosk.add(header);

    const glowPad = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 44),
      new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.22 })
    );
    glowPad.rotation.x = -Math.PI / 2;
    glowPad.position.set(0, 0.02, 0);
    kiosk.add(glowPad);

    scene.add(kiosk);

    // Store marker for menu teleports
    this.markers.Store = new THREE.Vector3(position.x, 0, position.z);
  },

  // ---------- Poker Table Prop ----------
  addPokerTable({ scene, pos }) {
    const table = new THREE.Group();
    table.position.copy(pos);

    const top = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.22, 36), this.mats.felt);
    top.position.set(0, 0.92, 0);
    table.add(top);
    this.addCollider(top);

    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(2.48, 0.12, 14, 44),
      this.mats.metalDark
    );
    rail.position.set(0, 0.98, 0);
    rail.rotation.x = Math.PI / 2;
    table.add(rail);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.60, 0.80, 0.86, 24), this.mats.matteBlack);
    base.position.set(0, 0.43, 0);
    table.add(base);
    this.addCollider(base);

    // Under glow for "casino vibe"
    const underGlow = new THREE.Mesh(
      new THREE.CircleGeometry(2.9, 44),
      new THREE.MeshBasicMaterial({ color: 0x2a0a55, transparent: true, opacity: 0.22 })
    );
    underGlow.rotation.x = -Math.PI / 2;
    underGlow.position.set(0, 0.03, 0);
    table.add(underGlow);

    scene.add(table);
  },

  // ---------- Poker Stage / Back Wall Accent ----------
  addPokerStage({ scene, pos }) {
    const stage = new THREE.Group();
    stage.position.copy(pos);

    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(6.8, 0.5, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x0f1016, roughness: 0.9, metalness: 0.05 })
    );
    platform.position.y = 0.25;
    stage.add(platform);
    this.addCollider(platform);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: 0xb14cff, emissiveIntensity: 2.0 })
    );
    sign.position.set(0, 1.6, -1.15);
    stage.add(sign);

    // LED strips
    const stripMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xb14cff, emissiveIntensity: 2.2 });
    const strip1 = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.06, 0.06), stripMat);
    strip1.position.set(0, 0.55, 1.25);
    const strip2 = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.06, 0.06), stripMat);
    strip2.position.set(0, 0.55, -1.25);
    stage.add(strip1, strip2);

    scene.add(stage);
  },

  // ---------- Build Everything ----------
  build(scene, playerGroup) {
    this.reset();

    // Atmosphere
    scene.background = new THREE.Color(0x05060a);
    scene.fog = new THREE.Fog(0x05060a, 6, 95);

    // Safe spawn (no objects on top)
    playerGroup.position.set(0, 0, 5);

    // Rooms
    this.buildRoom({
      scene,
      name: "Lobby",
      center: new THREE.Vector3(0, 0, 0),
      size: { w: 18, h: 4.2, d: 18 },
      theme: "lobby"
    });

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

    // Store kiosk (Lobby)
    this.makeStoreKiosk({ scene, position: new THREE.Vector3(-5.6, 0, 5.6) });

    // Poker props (PokerRoom)
    this.addPokerTable({ scene, pos: new THREE.Vector3(0, 0, -32) });
    this.addPokerStage({ scene, pos: new THREE.Vector3(0, 0, -41.5) });

    // Markers for menu teleports
    this.markers.Lobby = new THREE.Vector3(0, 0, 5);
    this.markers.PokerRoom = new THREE.Vector3(0, 0, -30);
  }
};
