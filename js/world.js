import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

/**
 * Scarlett Poker VR — World FINAL (Two Rooms + Solids + Portals + Store + Leaderboard + Chairs)
 * GitHub Pages + Oculus Browser + Android
 *
 * World exports:
 * - colliders[] : solid geometry
 * - teleportSurfaces[] : surfaces for laser teleport
 * - markers{} : named locations
 * - portals[] : walk-into portals (auto teleport)
 * - interactables[] : clickable objects (store buttons etc)
 * - leaderboard: { canvas, ctx, texture, mesh }
 */

export const World = {
  colliders: [],
  teleportSurfaces: [],
  interactables: [],
  portals: [],
  markers: {},
  leaderboard: null,

  reset() {
    this.colliders = [];
    this.teleportSurfaces = [];
    this.interactables = [];
    this.portals = [];
    this.markers = {};
    this.leaderboard = null;
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

  addInteractable(mesh, actionId) {
    mesh.userData.interactable = true;
    mesh.userData.actionId = actionId;
    this.interactables.push(mesh);
  },

  addPortal(position, radius, targetMarker) {
    this.portals.push({ position: position.clone(), radius, target: targetMarker });
  },

  // ---------- Materials (stable on Quest) ----------
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

    padRing: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.0,
      roughness: 0.2
    }),

    kioskBase: new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.92, metalness: 0.05 }),
    kioskScreen: new THREE.MeshStandardMaterial({ color: 0x071010, emissive: 0x00ff88, emissiveIntensity: 1.3 }),

    felt: new THREE.MeshStandardMaterial({ color: 0x0f6b3e, roughness: 0.85, metalness: 0.0 }),
    chair: new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.95, metalness: 0.05 }),
    matteBlack: new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.95, metalness: 0.05 }),
    metalDark: new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.55, metalness: 0.35 })
  },

  // ---------- Neon trims ----------
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

  // ---------- Room builder ----------
  buildRoom({ scene, name, center, size, theme }) {
    const group = new THREE.Group();
    group.name = name;
    group.position.copy(center);

    const isPoker = theme === "poker";
    const wallMat = isPoker ? this.mats.wallPoker : this.mats.wallLobby;
    const floorMat = isPoker ? this.mats.floorPoker : this.mats.floorLobby;
    const trimMat = isPoker ? this.mats.neonPurple : this.mats.neonCyan;

    // Floor (solid + teleport)
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

    // Ceiling glow (cheap vibe)
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

    // Lights (Quest-friendly)
    group.add(new THREE.AmbientLight(0xffffff, isPoker ? 0.50 : 0.60));

    const centerLight = new THREE.PointLight(isPoker ? 0xb14cff : 0x00ffff, 1.25, 30);
    centerLight.position.set(0, size.h - 0.2, 0);
    group.add(centerLight);

    const warm = new THREE.PointLight(0xffcc88, 0.65, 26);
    warm.position.set(-size.w * 0.25, size.h - 0.35, size.d * 0.2);
    group.add(warm);

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

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.06, 12, 32), this.mats.padRing);
    ring.position.set(position.x, y + 0.06, position.z);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    this.markers[label] = new THREE.Vector3(position.x, 0, position.z);
    this.addTeleportSurface(pad);
  },

  // ---------- Store kiosk (with clickable buttons) ----------
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

    // Invisible clickable plane on the screen area
    const hit = new THREE.Mesh(
      new THREE.PlaneGeometry(1.25, 0.74),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 })
    );
    hit.position.copy(screen.position);
    kiosk.add(hit);
    this.addInteractable(hit, "STORE_OPEN");

    // Two “buttons” under the screen (visible neon)
    const btnMat = new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 2.2 });
    const buy = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.10), btnMat);
    buy.position.set(-0.36, 0.42, 0.47);
    kiosk.add(buy);
    this.addInteractable(buy, "BUY_CHIPS");

    const reset = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.10), btnMat);
    reset.position.set(0.36, 0.42, 0.47);
    kiosk.add(reset);
    this.addInteractable(reset, "RESET_CHIPS");

    // Glow pad
    const glowPad = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 44),
      new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.18 })
    );
    glowPad.rotation.x = -Math.PI / 2;
    glowPad.position.set(0, 0.02, 0);
    kiosk.add(glowPad);

    scene.add(kiosk);

    // Marker for menu teleport
    this.markers.Store = new THREE.Vector3(position.x, 0, position.z);
  },

  // ---------- Poker Table + Chairs ----------
  addPokerTableWithChairs({ scene, center }) {
    // Table
    const table = new THREE.Group();
    table.position.copy(center);

    const top = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.22, 36), this.mats.felt);
    top.position.set(0, 0.92, 0);
    table.add(top);
    this.addCollider(top);

    const rail = new THREE.Mesh(new THREE.TorusGeometry(2.48, 0.12, 14, 44), this.mats.metalDark);
    rail.position.set(0, 0.98, 0);
    rail.rotation.x = Math.PI / 2;
    table.add(rail);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.60, 0.80, 0.86, 24), this.mats.matteBlack);
    base.position.set(0, 0.43, 0);
    table.add(base);
    this.addCollider(base);

    // Under glow
    const underGlow = new THREE.Mesh(
      new THREE.CircleGeometry(2.9, 44),
      new THREE.MeshBasicMaterial({ color: 0x2a0a55, transparent: true, opacity: 0.20 })
    );
    underGlow.rotation.x = -Math.PI / 2;
    underGlow.position.set(0, 0.03, 0);
    table.add(underGlow);

    scene.add(table);

    // Chairs (6)
    const chairRadius = 3.35;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = center.x + Math.cos(a) * chairRadius;
      const z = center.z + Math.sin(a) * chairRadius;

      const chair = new THREE.Group();

      // seat
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.75), this.mats.chair);
      seat.position.set(0, 0.55, 0);
      chair.add(seat);
      this.addCollider(seat);

      // back
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.10), this.mats.chair);
      back.position.set(0, 0.95, -0.32);
      chair.add(back);
      this.addCollider(back);

      // base
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.55, 12), this.mats.matteBlack);
      leg.position.set(0, 0.25, 0);
      chair.add(leg);
      this.addCollider(leg);

      chair.position.set(x, 0, z);
      chair.lookAt(center.x, 0.6, center.z);

      scene.add(chair);
    }
  },

  // ---------- Leaderboard hologram (hovering) ----------
  makeLeaderboard({ scene, position }) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), mat);
    mesh.position.copy(position);
    mesh.rotation.y = Math.PI; // face player if placed forward
    scene.add(mesh);

    // Floating base glow
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(1.2, 48),
      new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.12 })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(position.x, 0.03, position.z);
    scene.add(glow);

    this.leaderboard = { canvas, ctx, texture, mesh, t: 0 };
  },

  // ---------- Portal frame (visual) ----------
  makePortalFrame({ scene, position, colorHex }) {
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x111115,
      emissive: colorHex,
      emissiveIntensity: 1.6,
      roughness: 0.7,
      metalness: 0.15
    });

    const frame = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.07, 16, 52), frameMat);
    frame.position.copy(position);
    frame.rotation.x = Math.PI / 2;
    scene.add(frame);

    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 48),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.18 })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(position.x, 0.03, position.z);
    scene.add(glow);
  },

  // ---------- Build Everything ----------
  build(scene, playerGroup) {
    this.reset();

    scene.background = new THREE.Color(0x05060a);
    scene.fog = new THREE.Fog(0x05060a, 6, 95);

    // Safe spawn
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

    // Markers (menu teleports)
    this.markers.Lobby = new THREE.Vector3(0, 0, 5);
    this.markers.PokerRoom = new THREE.Vector3(0, 0, -30);

    // Teleport pads (for laser)
    this.makeTeleportPad({ scene, position: new THREE.Vector3(0, 0, 2), label: "Lobby" });
    this.makeTeleportPad({ scene, position: new THREE.Vector3(0, 0, -30), label: "PokerRoom" });

    // Store kiosk (Lobby)
    this.makeStoreKiosk({ scene, position: new THREE.Vector3(-5.6, 0, 5.6) });

    // Poker table + chairs (PokerRoom)
    this.addPokerTableWithChairs({ scene, center: new THREE.Vector3(0, 0, -32) });

    // Leaderboard hologram (Lobby, hovering)
    this.makeLeaderboard({ scene, position: new THREE.Vector3(0, 2.0, 7.2) });

    // Walk-through portals (doorway style)
    // Lobby portal near back wall that sends you to PokerRoom marker
    const lobbyPortalPos = new THREE.Vector3(0, 0, -7.2);
    this.makePortalFrame({ scene, position: lobbyPortalPos, colorHex: 0x00ffff });
    this.addPortal(lobbyPortalPos, 1.25, "PokerRoom");

    // Poker room portal near front that sends you to Lobby marker
    const pokerPortalPos = new THREE.Vector3(0, 0, -24.8);
    this.makePortalFrame({ scene, position: pokerPortalPos, colorHex: 0xb14cff });
    this.addPortal(pokerPortalPos, 1.25, "Lobby");
  }
};
