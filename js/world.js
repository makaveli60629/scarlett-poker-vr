import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const World = {
  // Arrays used by controls.js
  teleportSurfaces: [],
  interactables: [],
  portals: [],
  markers: {},
  leaderboard: null,

  textureLoader: new THREE.TextureLoader(),

  // Safe material (never breaks load)
  safeMat({ color = 0x888888, emissive = 0x000000, roughness = 0.9, metalness = 0.05 } = {}) {
    return new THREE.MeshStandardMaterial({ color, emissive, roughness, metalness });
  },

  // Helper to create a collider box (invisible but solid for teleport logic, etc.)
  makeBox({ w, h, d, x, y, z, mat, name, userData = {} }) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.name = name || "";
    mesh.userData = userData;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return mesh;
  },

  build(scene, playerGroup) {
    // Reset arrays so hot reload / multiple calls don't duplicate
    this.teleportSurfaces = [];
    this.interactables = [];
    this.portals = [];
    this.markers = {};
    this.leaderboard = null;

    // ---------- Spawn ----------
    playerGroup.position.set(0, 0, 5);

    // ---------- Background / fog (stops shimmering + looks richer) ----------
    scene.background = new THREE.Color(0x05060a);
    scene.fog = new THREE.Fog(0x05060a, 5, 55);

    // ---------- Lighting ----------
    const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1f2b, 0.85);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 0.75);
    key.position.set(6, 10, 4);
    scene.add(key);

    // Soft ceiling glow rings (fake)
    const ceilingGlow = new THREE.Mesh(
      new THREE.RingGeometry(5.2, 5.8, 48),
      new THREE.MeshBasicMaterial({ color: 0x22ffff, transparent: true, opacity: 0.10, side: THREE.DoubleSide })
    );
    ceilingGlow.position.set(0, 3.0, 0);
    ceilingGlow.rotation.x = Math.PI / 2;
    scene.add(ceilingGlow);

    // ---------- Materials ----------
    const floorMat = this.safeMat({ color: 0x1b1f2a, roughness: 0.95 });
    const wallMat  = this.safeMat({ color: 0x2a2f3a, roughness: 0.98 });
    const trimMat  = this.safeMat({ color: 0x11131a, emissive: 0x00ffee, roughness: 0.6, metalness: 0.1 });
    const neonMat  = new THREE.MeshStandardMaterial({ color: 0x00ffee, emissive: 0x00ffee, emissiveIntensity: 1.7, roughness: 0.25, metalness: 0.05 });
    const kioskMat = this.safeMat({ color: 0x20263a, roughness: 0.6, metalness: 0.15 });
    const padMat   = new THREE.MeshStandardMaterial({ color: 0x2255ff, emissive: 0x2255ff, emissiveIntensity: 1.3, roughness: 0.25 });
    const portalMat= new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 1.6, roughness: 0.2 });

    // ---------- ROOM LAYOUT ----------
    // We'll build a simple lobby room, poker room area, and store corner in one big space.
    // Center is lobby. Poker room is "north" (negative z). Store is "east" (positive x).

    const ROOM_W = 18;
    const ROOM_D = 18;
    const WALL_H = 3.2;
    const WALL_T = 0.35;

    // Floor
    const floor = this.makeBox({
      w: ROOM_W, h: 0.2, d: ROOM_D,
      x: 0, y: -0.1, z: 0,
      mat: floorMat,
      name: "Floor",
      userData: { teleport: true }
    });
    scene.add(floor);
    this.teleportSurfaces.push(floor);

    // Ceiling (visual)
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), this.safeMat({ color: 0x0c0f16, roughness: 1 }));
    ceiling.position.set(0, WALL_H, 0);
    ceiling.rotation.x = Math.PI / 2;
    scene.add(ceiling);

    // Walls (solid)
    const walls = [
      // north
      this.makeBox({ w: ROOM_W, h: WALL_H, d: WALL_T, x: 0, y: WALL_H/2, z: -ROOM_D/2, mat: wallMat, name: "WallN" }),
      // south
      this.makeBox({ w: ROOM_W, h: WALL_H, d: WALL_T, x: 0, y: WALL_H/2, z:  ROOM_D/2, mat: wallMat, name: "WallS" }),
      // west
      this.makeBox({ w: WALL_T, h: WALL_H, d: ROOM_D, x: -ROOM_W/2, y: WALL_H/2, z: 0, mat: wallMat, name: "WallW" }),
      // east
      this.makeBox({ w: WALL_T, h: WALL_H, d: ROOM_D, x:  ROOM_W/2, y: WALL_H/2, z: 0, mat: wallMat, name: "WallE" }),
    ];
    walls.forEach(w => scene.add(w));

    // Neon corner trims (vertical)
    const cornerTrim = (x, z) => {
      const t = this.makeBox({ w: 0.12, h: WALL_H, d: 0.12, x, y: WALL_H/2, z, mat: neonMat });
      scene.add(t);
    };
    cornerTrim(-ROOM_W/2 + 0.15, -ROOM_D/2 + 0.15);
    cornerTrim( ROOM_W/2 - 0.15, -ROOM_D/2 + 0.15);
    cornerTrim(-ROOM_W/2 + 0.15,  ROOM_D/2 - 0.15);
    cornerTrim( ROOM_W/2 - 0.15,  ROOM_D/2 - 0.15);

    // Baseboard trim (around edges)
    const baseH = 0.12;
    const baseT = 0.10;
    const baseZ1 = this.makeBox({ w: ROOM_W-0.2, h: baseH, d: baseT, x:0, y: baseH/2, z:-ROOM_D/2 + 0.18, mat: trimMat });
    const baseZ2 = this.makeBox({ w: ROOM_W-0.2, h: baseH, d: baseT, x:0, y: baseH/2, z: ROOM_D/2 - 0.18, mat: trimMat });
    const baseX1 = this.makeBox({ w: baseT, h: baseH, d: ROOM_D-0.2, x:-ROOM_W/2 + 0.18, y: baseH/2, z:0, mat: trimMat });
    const baseX2 = this.makeBox({ w: baseT, h: baseH, d: ROOM_D-0.2, x: ROOM_W/2 - 0.18, y: baseH/2, z:0, mat: trimMat });
    scene.add(baseZ1, baseZ2, baseX1, baseX2);

    // ---------- MARKERS (teleport targets) ----------
    // Keep these names exactly (controls/ui uses them)
    this.markers.Lobby = { x: 0, z: 5 };
    this.markers.PokerRoom = { x: 0, z: -5 };
    this.markers.Store = { x: 6, z: 2 };

    // ---------- TELEPORT PADS (visible + clickable) ----------
    const makePad = (name, x, z) => {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.10, 32), padMat);
      pad.position.set(x, 0.05, z);
      pad.name = name + "_Pad";
      pad.userData.teleportTarget = name;
      scene.add(pad);
      this.teleportSurfaces.push(pad);

      // ring glow
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.25, 40), new THREE.MeshBasicMaterial({ color: 0x22aaff, transparent:true, opacity:0.35, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.06, z);
      scene.add(ring);
    };

    makePad("Lobby", this.markers.Lobby.x, this.markers.Lobby.z);
    makePad("PokerRoom", this.markers.PokerRoom.x, this.markers.PokerRoom.z);
    makePad("Store", this.markers.Store.x, this.markers.Store.z);

    // ---------- PORTAL RINGS (walk-through) ----------
    const makePortal = (label, x, z, target) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.10, 18, 48), portalMat);
      ring.position.set(x, 1.25, z);
      ring.rotation.y = Math.PI / 2;
      scene.add(ring);

      // glow plane
      const plane = new THREE.Mesh(
        new THREE.CircleGeometry(0.85, 36),
        new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.16 })
      );
      plane.position.set(x, 1.25, z);
      plane.rotation.y = Math.PI / 2;
      scene.add(plane);

      // Register for portal checks
      this.portals.push({ position: new THREE.Vector3(x, 0, z), radius: 1.15, target });

      // Label sprite-ish (canvas plane)
      const c = document.createElement("canvas");
      c.width = 512; c.height = 256;
      const g = c.getContext("2d");
      g.fillStyle = "rgba(0,0,0,0.55)"; g.fillRect(0,0,512,256);
      g.fillStyle = "rgba(255,255,255,0.95)";
      g.font = "bold 58px Arial";
      g.fillText(label, 40, 110);
      g.fillStyle = "rgba(180,255,255,0.85)";
      g.font = "36px Arial";
      g.fillText("walk through", 40, 175);

      const tex = new THREE.CanvasTexture(c);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.85), new THREE.MeshBasicMaterial({ map: tex, transparent:true }));
      sign.position.set(x, 2.05, z);
      sign.rotation.y = Math.PI / 2;
      scene.add(sign);
    };

    makePortal("To Poker Room", -6, 0, "PokerRoom");
    makePortal("To Lobby", -6, -6, "Lobby");
    makePortal("To Store", 6, -2, "Store");

    // ---------- BIG POKER TABLE PLACEHOLDER (visible) ----------
    // Oval table
    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.18, 48), this.safeMat({ color: 0x0b3b2a, roughness: 0.85 }));
    tableTop.scale.set(1.35, 1, 1.0);
    tableTop.position.set(0, 0.85, -5);
    scene.add(tableTop);

    // Table base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 0.9, 36), this.safeMat({ color: 0x12151e, roughness: 0.7 }));
    base.position.set(0, 0.40, -5);
    scene.add(base);

    // Chairs ring (simple placeholders if your chair GLTF isn't loaded)
    const chairMat = this.safeMat({ color: 0x666666, roughness: 0.9 });
    const chairPos = [
      [ 0.0, -1.9], [ 1.7, -1.1], [ 1.7,  1.1],
      [ 0.0,  1.9], [-1.7,  1.1], [-1.7, -1.1]
    ];
    chairPos.forEach(([dx, dz], i) => {
      const chair = this.makeBox({ w:0.55, h:1.05, d:0.55, x: dx, y:0.55, z: -5 + dz, mat: chairMat, name:`Chair_${i}` });
      scene.add(chair);
    });

    // ---------- STORE KIOSK (big + obvious) ----------
    const kiosk = this.makeBox({ w: 2.2, h: 1.4, d: 0.8, x: 6, y: 0.7, z: 2, mat: kioskMat, name:"StoreKiosk" });
    scene.add(kiosk);

    // Kiosk screen
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.9),
      new THREE.MeshBasicMaterial({ color: 0x0a0f18 })
    );
    screen.position.set(6, 1.05, 2 - 0.41);
    scene.add(screen);

    // Kiosk screen text (CanvasTexture)
    const kc = document.createElement("canvas");
    kc.width = 1024; kc.height = 512;
    const kctx = kc.getContext("2d");
    kctx.fillStyle = "rgba(0,0,0,0.75)"; kctx.fillRect(0,0,1024,512);
    kctx.fillStyle = "rgba(0,255,255,0.95)";
    kctx.font = "bold 72px Arial";
    kctx.fillText("STORE", 60, 110);
    kctx.fillStyle = "rgba(255,255,255,0.92)";
    kctx.font = "44px Arial";
    kctx.fillText("Click buttons below:", 60, 180);
    kctx.fillStyle = "rgba(180,255,255,0.9)";
    kctx.font = "40px Arial";
    kctx.fillText("BUY CHIPS / SPAWN CHIPS", 60, 250);
    const ktex = new THREE.CanvasTexture(kc);
    screen.material.map = ktex;
    screen.material.needsUpdate = true;

    // Kiosk buttons (interactables)
    const btnMat = new THREE.MeshStandardMaterial({ color: 0x2255ff, emissive: 0x2255ff, emissiveIntensity: 1.4, roughness: 0.35 });
    const btn1 = this.makeBox({ w: 0.75, h: 0.18, d: 0.35, x: 5.6, y: 0.28, z: 2.05, mat: btnMat, name:"BuyChipsBtn", userData:{ actionId:"BUY_CHIPS" }});
    const btn2 = this.makeBox({ w: 0.75, h: 0.18, d: 0.35, x: 6.4, y: 0.28, z: 2.05, mat: btnMat, name:"SpawnChipsBtn", userData:{ actionId:"SPAWN_CHIPS" }});
    scene.add(btn1, btn2);
    this.interactables.push(btn1, btn2);

    // Add a "Store Open" trigger area so you can aim and click it too
    kiosk.userData.actionId = "STORE_OPEN";
    this.interactables.push(kiosk);

    // ---------- CHIP SPAWN ZONE ----------
    // We'll spawn chips on the poker table when SPAWN_CHIPS is clicked.
    // controls.js already routes actionId to ui.handleWorldAction;
    // We'll ALSO expose a helper so ui.js can call World.spawnChips() if you want.
    this._chipSpawnPoint = new THREE.Vector3(0, 1.05, -5);

    // ---------- LEADERBOARD HOLO ----------
    const lcan = document.createElement("canvas");
    lcan.width = 1024;
    lcan.height = 512;
    const lctx = lcan.getContext("2d");
    const ltex = new THREE.CanvasTexture(lcan);

    const lmat = new THREE.MeshBasicMaterial({ map: ltex, transparent: true, opacity: 0.95 });
    const lmesh = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.5), lmat);
    lmesh.position.set(0, 2.0, 2.2);
    lmesh.rotation.y = Math.PI;
    scene.add(lmesh);

    // frame glow
    const frame = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.25, 48), new THREE.MeshBasicMaterial({ color: 0x00ffee, transparent:true, opacity:0.22, side: THREE.DoubleSide }));
    frame.position.set(0, 2.0, 2.18);
    frame.rotation.y = Math.PI;
    scene.add(frame);

    this.leaderboard = { canvas: lcan, ctx: lctx, texture: ltex, mesh: lmesh, t: 0 };

    // ---------- ADD SOME DECOR (so it looks less empty) ----------
    // Lounge couch blocks (placeholder sofas)
    const sofaMat = this.safeMat({ color: 0x2b2f45, roughness: 0.7, metalness: 0.05 });
    const sofa1 = this.makeBox({ w: 2.6, h: 0.7, d: 1.0, x: -4, y: 0.35, z: 4, mat: sofaMat });
    const sofa2 = this.makeBox({ w: 2.6, h: 0.7, d: 1.0, x: -1, y: 0.35, z: 4, mat: sofaMat });
    scene.add(sofa1, sofa2);

    const coffee = this.makeBox({ w: 1.4, h: 0.25, d: 0.8, x: -2.5, y: 0.12, z: 2.9, mat: this.safeMat({ color: 0x141820, roughness: 0.8 }) });
    scene.add(coffee);

    // Decorative neon strips on walls
    const stripGeo = new THREE.BoxGeometry(6.0, 0.08, 0.08);
    const strip1 = new THREE.Mesh(stripGeo, neonMat);
    strip1.position.set(0, 2.4, -ROOM_D/2 + 0.20);
    scene.add(strip1);

    const strip2 = new THREE.Mesh(stripGeo, neonMat);
    strip2.position.set(0, 2.4, ROOM_D/2 - 0.20);
    scene.add(strip2);

    // ---------- Register: main floor already in teleportSurfaces ----------
    // NOTE: Walls are "solid" visually; for true collision stopping movement,
    // we'd add movement constraints in controls (Stage 2). Teleport already respects surfaces.
  },

  // Optional helper for Stage 2 (chip stacks)
  spawnChips(scene) {
    const chipMat = new THREE.MeshStandardMaterial({ color: 0xff2255, emissive: 0x330011, roughness: 0.35, metalness: 0.2 });
    const stack = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 24), chipMat);
      chip.position.y = i * 0.032;
      stack.add(chip);
    }
    stack.position.copy(this._chipSpawnPoint || new THREE.Vector3(0, 1.05, -5));
    scene.add(stack);
    return stack;
  }
};
