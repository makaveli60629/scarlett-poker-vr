// /js/world.js — Scarlett World 4.0 (ALIGN-FIRST GRID ONLY)
// ✅ No solid floors. Only grid helpers.
// ✅ Fully connected: hub + 4 rooms + 4 corridors (sealed exterior).
// ✅ Openings are CLEAR and centered.
// ✅ Hub centerpiece: sunken “pit” + pedestal + table (look-down viewing).
// ✅ West room is Store: named Room_West_Store + StoreAnchor + labeled glass hoods.
// ✅ Lots of lights inside hub to prevent “dark grey wall” bug.

export const World = {
  async init(ctx) {
    const { THREE, scene } = ctx;

    ctx.world = this;
    ctx.colliders = ctx.colliders || [];

    // -------------------------
    // GRID / SNAP
    // -------------------------
    const GRID = 0.5; // alignment step
    const snap = (v) => Math.round(v / GRID) * GRID;
    const snapV3 = (x, y, z) => new THREE.Vector3(snap(x), snap(y), snap(z));

    // -------------------------
    // Materials
    // -------------------------
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b0d16, roughness: 0.85, metalness: 0.08 });
    const neonHub = new THREE.MeshStandardMaterial({
      color: 0x100518,
      emissive: new THREE.Color(0x9b5cff),
      emissiveIntensity: 2.2,
      roughness: 0.25,
      metalness: 0.2
    });

    const neonCyan = new THREE.MeshStandardMaterial({
      color: 0x051018,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 1.8,
      roughness: 0.25,
      metalness: 0.15
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.05,
      metalness: 0.0,
      transmission: 1.0,
      transparent: true,
      opacity: 0.35,
      thickness: 0.08,
      ior: 1.35
    });

    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.55, metalness: 0.22 });
    const feltMat = new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.92, metalness: 0.05 });

    // -------------------------
    // VISUAL GRIDS (no floors)
    // -------------------------
    const gridRoot = new THREE.Group();
    gridRoot.name = "GridRoot";
    scene.add(gridRoot);

    const bigGrid = new THREE.GridHelper(240, 480, 0x133244, 0x0b141b);
    bigGrid.position.y = 0.001;
    gridRoot.add(bigGrid);

    // axis marker
    const axes = new THREE.AxesHelper(5);
    axes.position.y = 0.02;
    gridRoot.add(axes);

    // Invisible plane (optional physical presence later)
    const invisFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(260, 260),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    invisFloor.rotation.x = -Math.PI / 2;
    invisFloor.name = "InvisibleFloor";
    scene.add(invisFloor);

    // -------------------------
    // LIGHTS INSIDE WORLD (extra insurance)
    // (main.js has big lights too — this prevents “world-only darkness”)
    // -------------------------
    const hubLightA = new THREE.PointLight(0x9b5cff, 2.4, 80);
    hubLightA.position.copy(snapV3(0, 8, 0));
    scene.add(hubLightA);

    const hubLightB = new THREE.PointLight(0x00ffff, 2.2, 80);
    hubLightB.position.copy(snapV3(0, 6, -8));
    scene.add(hubLightB);

    // ring of small hub lights
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const px = snap(Math.cos(a) * 8.5);
      const pz = snap(Math.sin(a) * 8.5);
      const pl = new THREE.PointLight(i % 2 ? 0x00ffff : 0x9b5cff, 1.25, 28);
      pl.position.set(px, 3.4, pz);
      scene.add(pl);
    }

    // -------------------------
    // Helpers: colliders + labels
    // -------------------------
    const addCollider = (mesh) => {
      mesh.userData.solid = true;
      ctx.colliders.push(mesh);
      scene.add(mesh);
      return mesh;
    };

    const makeLabelSprite = (text) => {
      const c = document.createElement("canvas");
      c.width = 512; c.height = 128;
      const g = c.getContext("2d");

      g.fillStyle = "rgba(0, 0, 0, 0.0)";
      g.fillRect(0,0,c.width,c.height);

      g.fillStyle = "rgba(0,255,255,0.85)";
      g.font = "bold 48px system-ui, Arial";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(text, c.width/2, c.height/2);

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;

      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const spr = new THREE.Sprite(mat);
      spr.scale.set(3.2, 0.8, 1);
      return spr;
    };

    // -------------------------
    // WORLD GEOMETRY (snap-aligned)
    // -------------------------
    const WALL_H = 3.0;
    const WALL_T = 0.30;

    const HUB_R = 14.0;
    const ROOM_S = 14.0;
    const CORR_L = 10.0;
    const CORR_W = 5.0;

    // Name constants for room centers
    const frontZ = snap(HUB_R + CORR_L + ROOM_S / 2);
    const backZ  = snap(-(HUB_R + CORR_L + ROOM_S / 2));
    const leftX  = snap(-(HUB_R + CORR_L + ROOM_S / 2));
    const rightX = snap( (HUB_R + CORR_L + ROOM_S / 2));

    // Wall builder for clean, sealed walls
    function wallBox(w, h, d, x, y, z, ry = 0, mat = wallMat) {
      const m = addCollider(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
      m.position.set(snap(x), snap(y), snap(z));
      m.rotation.y = ry;
      return m;
    }

    // Build square room with a SINGLE door to the hub
    function makeSquareRoom({ name, x, z, doorSide }) {
      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(snap(x), 0, snap(z));
      scene.add(anchor);

      const half = ROOM_S / 2;
      const doorW = CORR_W;

      // north wall
      if (doorSide === "N") {
        const seg = (ROOM_S - doorW) / 2;
        wallBox(seg, WALL_H, WALL_T, x - (doorW/2 + seg/2), WALL_H/2, z + half);
        wallBox(seg, WALL_H, WALL_T, x + (doorW/2 + seg/2), WALL_H/2, z + half);
      } else wallBox(ROOM_S + WALL_T, WALL_H, WALL_T, x, WALL_H/2, z + half);

      // south wall
      if (doorSide === "S") {
        const seg = (ROOM_S - doorW) / 2;
        wallBox(seg, WALL_H, WALL_T, x - (doorW/2 + seg/2), WALL_H/2, z - half);
        wallBox(seg, WALL_H, WALL_T, x + (doorW/2 + seg/2), WALL_H/2, z - half);
      } else wallBox(ROOM_S + WALL_T, WALL_H, WALL_T, x, WALL_H/2, z - half);

      // east wall
      if (doorSide === "E") {
        const seg = (ROOM_S - doorW) / 2;
        wallBox(WALL_T, WALL_H, seg, x + half, WALL_H/2, z - (doorW/2 + seg/2));
        wallBox(WALL_T, WALL_H, seg, x + half, WALL_H/2, z + (doorW/2 + seg/2));
      } else wallBox(WALL_T, WALL_H, ROOM_S + WALL_T, x + half, WALL_H/2, z);

      // west wall
      if (doorSide === "W") {
        const seg = (ROOM_S - doorW) / 2;
        wallBox(WALL_T, WALL_H, seg, x - half, WALL_H/2, z - (doorW/2 + seg/2));
        wallBox(WALL_T, WALL_H, seg, x - half, WALL_H/2, z + (doorW/2 + seg/2));
      } else wallBox(WALL_T, WALL_H, ROOM_S + WALL_T, x - half, WALL_H/2, z);

      // bottom trim (base)
      makeRoomTrimSquare(x, z, ROOM_S, neonCyan);

      // top trim (ceilingless, but top edge trim)
      makeRoomTopTrimSquare(x, z, ROOM_S, neonCyan, WALL_H - 0.05);

      return anchor;
    }

    function makeRoomTrimSquare(x, z, size, mat) {
      const t = 0.09, h = 0.06;
      const half = size/2;
      scene.add(
        new THREE.Mesh(new THREE.BoxGeometry(size, h, t), mat).position.set(snap(x), 0.03, snap(z + half)),
        new THREE.Mesh(new THREE.BoxGeometry(size, h, t), mat).position.set(snap(x), 0.03, snap(z - half))
      );
      const a = new THREE.Mesh(new THREE.BoxGeometry(t, h, size), mat);
      a.position.set(snap(x + half), 0.03, snap(z));
      const b = new THREE.Mesh(new THREE.BoxGeometry(t, h, size), mat);
      b.position.set(snap(x - half), 0.03, snap(z));
      scene.add(a, b);
    }

    function makeRoomTopTrimSquare(x, z, size, mat, y) {
      const t = 0.09, h = 0.06;
      const half = size/2;
      const m1 = new THREE.Mesh(new THREE.BoxGeometry(size, h, t), mat);
      const m2 = new THREE.Mesh(new THREE.BoxGeometry(size, h, t), mat);
      m1.position.set(snap(x), y, snap(z + half));
      m2.position.set(snap(x), y, snap(z - half));
      scene.add(m1, m2);

      const m3 = new THREE.Mesh(new THREE.BoxGeometry(t, h, size), mat);
      const m4 = new THREE.Mesh(new THREE.BoxGeometry(t, h, size), mat);
      m3.position.set(snap(x + half), y, snap(z));
      m4.position.set(snap(x - half), y, snap(z));
      scene.add(m3, m4);
    }

    // Corridors: connect room door to hub door, fully walled
    function makeCorridor({ name, x, z, yaw }) {
      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(snap(x), 0, snap(z));
      scene.add(anchor);

      // corridor side walls
      // corridor local forward is +Z rotated by yaw
      const halfW = CORR_W / 2;
      const halfL = CORR_L / 2;

      // We build 2 long walls on sides:
      // In local space: walls run length CORR_L, offset +/- halfW.
      // Use boxes rotated by yaw.
      const sideDX = Math.cos(yaw + Math.PI/2);
      const sideDZ = Math.sin(yaw + Math.PI/2);

      const leftX = x + sideDX * halfW;
      const leftZ = z + sideDZ * halfW;
      const rightX = x - sideDX * halfW;
      const rightZ = z - sideDZ * halfW;

      // long wall dimensions: thickness WALL_T, length CORR_L
      const wallLen = CORR_L + WALL_T;

      const w1 = addCollider(new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WALL_H, wallLen), wallMat));
      w1.position.set(snap(leftX), WALL_H/2, snap(leftZ));
      w1.rotation.y = yaw;
      scene.add(w1);

      const w2 = addCollider(new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WALL_H, wallLen), wallMat));
      w2.position.set(snap(rightX), WALL_H/2, snap(rightZ));
      w2.rotation.y = yaw;
      scene.add(w2);

      // trims on corridor sides (base + top)
      const trimBaseGeo = new THREE.BoxGeometry(0.08, 0.06, wallLen);
      const tb1 = new THREE.Mesh(trimBaseGeo, neonCyan);
      const tb2 = new THREE.Mesh(trimBaseGeo, neonCyan);
      tb1.position.set(snap(leftX), 0.03, snap(leftZ));
      tb2.position.set(snap(rightX), 0.03, snap(rightZ));
      tb1.rotation.y = yaw;
      tb2.rotation.y = yaw;
      scene.add(tb1, tb2);

      const tt1 = new THREE.Mesh(trimBaseGeo, neonCyan);
      const tt2 = new THREE.Mesh(trimBaseGeo, neonCyan);
      tt1.position.set(snap(leftX), WALL_H - 0.05, snap(leftZ));
      tt2.position.set(snap(rightX), WALL_H - 0.05, snap(rightZ));
      tt1.rotation.y = yaw;
      tt2.rotation.y = yaw;
      scene.add(tt1, tt2);

      return anchor;
    }

    // Hub: circular wall with 4 clean door gaps aligned to corridor width
    function makeHub() {
      const hubAnchor = new THREE.Object3D();
      hubAnchor.name = "HubPlate";
      hubAnchor.position.set(0, 0, 0);
      scene.add(hubAnchor);

      // Neon ring trim at hub base (visual)
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(HUB_R, 0.12, 16, 160), neonHub);
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.set(0, 0.28, 0);
      scene.add(baseRing);

      // Circular wall from box segments
      const segments = 56;
      const gap = CORR_W; // doorway width
      const gapHalf = gap / 2;

      for (let i = 0; i < segments; i++) {
        const a0 = (i / segments) * Math.PI * 2;
        const a1 = ((i + 1) / segments) * Math.PI * 2;
        const am = (a0 + a1) / 2;

        const cx = Math.cos(am) * HUB_R;
        const cz = Math.sin(am) * HUB_R;

        // Leave doorway gaps at +Z (front), -Z (back), +X (east), -X (west)
        // We remove segments near those axes within gapHalf.
        const nearFront = Math.abs(cx) < gapHalf && cz > HUB_R * 0.65;   // +Z
        const nearBack  = Math.abs(cx) < gapHalf && cz < -HUB_R * 0.65;  // -Z
        const nearEast  = Math.abs(cz) < gapHalf && cx > HUB_R * 0.65;   // +X
        const nearWest  = Math.abs(cz) < gapHalf && cx < -HUB_R * 0.65;  // -X
        if (nearFront || nearBack || nearEast || nearWest) continue;

        const segLen = (2 * Math.PI * HUB_R) / segments;

        const wall = addCollider(new THREE.Mesh(
          new THREE.BoxGeometry(WALL_T, WALL_H, segLen),
          wallMat
        ));
        wall.position.set(snap(cx), WALL_H/2, snap(cz));
        wall.rotation.y = -am;
        scene.add(wall);

        // hub wall top trim (purple)
        const topTrim = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, segLen), neonHub);
        topTrim.position.set(snap(cx), WALL_H - 0.05, snap(cz));
        topTrim.rotation.y = -am;
        scene.add(topTrim);
      }

      // Sunken pedestal pit + table
      makeSunkenTable();

      return hubAnchor;
    }

    function makeSunkenTable() {
      // Pit outer ring (like a “sink” well)
      const pitOuter = new THREE.Mesh(
        new THREE.CylinderGeometry(5.8, 5.8, 0.9, 64),
        darkMetal
      );
      pitOuter.position.set(0, 0.45, 0);
      scene.add(pitOuter);

      // Pit inner floor (lower)
      const pitFloor = new THREE.Mesh(
        new THREE.CylinderGeometry(4.9, 4.9, 0.08, 64),
        new THREE.MeshStandardMaterial({ color: 0x0a0b12, roughness: 0.55, metalness: 0.1 })
      );
      pitFloor.position.set(0, 0.06, 0);
      scene.add(pitFloor);

      // Rim ring (neon)
      const pitRim = new THREE.Mesh(
        new THREE.TorusGeometry(5.8, 0.10, 14, 140),
        neonHub
      );
      pitRim.rotation.x = Math.PI / 2;
      pitRim.position.set(0, 0.92, 0);
      scene.add(pitRim);

      // Boss table lowered into the pit
      const table = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.14, 48), feltMat);
      table.position.set(0, 0.62, 0);
      table.name = "BossTable";
      scene.add(table);

      // Rail ring above table (optional)
      const rail = new THREE.Mesh(
        new THREE.TorusGeometry(4.3, 0.11, 14, 140),
        new THREE.MeshStandardMaterial({
          color: 0x0f1220,
          emissive: new THREE.Color(0x00ffff),
          emissiveIntensity: 0.55,
          roughness: 0.35
        })
      );
      rail.rotation.x = Math.PI / 2;
      rail.position.set(0, 0.88, 0);
      rail.name = "MainRail";
      scene.add(rail);

      // Ceiling ring (no ceiling, but a floating ring light)
      const ringA = new THREE.Mesh(
        new THREE.TorusGeometry(6.6, 0.10, 14, 160),
        new THREE.MeshStandardMaterial({
          color: 0x12051a,
          emissive: new THREE.Color(0xff2d7a),
          emissiveIntensity: 1.8,
          roughness: 0.25
        })
      );
      ringA.rotation.x = Math.PI / 2;
      ringA.position.set(0, 4.2, 0);
      scene.add(ringA);

      const ringB = new THREE.Mesh(
        new THREE.TorusGeometry(7.4, 0.10, 14, 160),
        neonCyan
      );
      ringB.rotation.x = Math.PI / 2;
      ringB.position.set(0, 4.45, 0);
      scene.add(ringB);
    }

    // -------------------------
    // Build hub + rooms + corridors
    // -------------------------
    makeHub();

    // Room naming: South/front is spawn lobby, West is store
    const roomSouth = makeSquareRoom({ name: "Room_South_Lobby", x: 0, z: frontZ, doorSide: "S" }); // door faces hub (south wall open toward hub? actually hub is "south" from that room)
    const roomNorth = makeSquareRoom({ name: "Room_North_Event", x: 0, z: backZ, doorSide: "N" });
    const roomWest  = makeSquareRoom({ name: "Room_West_Store", x: leftX, z: 0, doorSide: "E" });
    const roomEast  = makeSquareRoom({ name: "Room_East_Poker", x: rightX, z: 0, doorSide: "W" });

    // Corridors centers
    makeCorridor({ name: "Corridor_South", x: 0, z: snap(HUB_R + CORR_L/2), yaw: 0 });
    makeCorridor({ name: "Corridor_North", x: 0, z: snap(-(HUB_R + CORR_L/2)), yaw: 0 });
    makeCorridor({ name: "Corridor_West",  x: snap(-(HUB_R + CORR_L/2)), z: 0, yaw: Math.PI/2 });
    makeCorridor({ name: "Corridor_East",  x: snap( (HUB_R + CORR_L/2)), z: 0, yaw: Math.PI/2 });

    // -------------------------
    // SpawnPoint (south/lobby room) — clear path to hub
    // -------------------------
    const sp = new THREE.Object3D();
    sp.name = "SpawnPoint";
    sp.position.set(0, 0, snap(frontZ - 3.0));
    scene.add(sp);

    const spawnMarker = new THREE.Mesh(
      new THREE.CircleGeometry(0.85, 48),
      new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x00ffff, emissiveIntensity: 1.2 })
    );
    spawnMarker.rotation.x = -Math.PI / 2;
    spawnMarker.position.set(0, 0.01, snap(frontZ - 3.0));
    scene.add(spawnMarker);

    // -------------------------
    // Store room anchor + labeled glass hoods
    // -------------------------
    const storeAnchor = new THREE.Object3D();
    storeAnchor.name = "StoreAnchor";
    storeAnchor.position.set(snap(leftX), 0, 0);
    scene.add(storeAnchor);

    function makeGlassHood(label, x, z, facingYaw) {
      const hood = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 0.35), glassMat);
      hood.position.set(snap(x), 1.25, snap(z));
      hood.rotation.y = facingYaw;
      hood.name = `GlassHood_${label.replace(/\s+/g,"_")}`;
      scene.add(hood);

      const glow = new THREE.PointLight(0x00ffff, 1.35, 10);
      glow.position.set(snap(x), 1.35, snap(z));
      scene.add(glow);

      const tag = makeLabelSprite(label);
      tag.position.set(snap(x), 2.2, snap(z));
      tag.material.opacity = 0.95;
      scene.add(tag);
    }

    // Place 3 hoods in Store room near the inner wall (facing inward)
    // Store room center is (leftX, 0). Inner wall is toward hub (east direction).
    makeGlassHood("HOOD A", leftX + 4.8,  2.0, Math.PI / 2);
    makeGlassHood("HOOD B", leftX + 4.8,  0.0, Math.PI / 2);
    makeGlassHood("HOOD C", leftX + 4.8, -2.0, Math.PI / 2);

    // -------------------------
    // Teleport machine moved back (behind spawn)
    // -------------------------
    const tm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 2.2, 22),
      new THREE.MeshStandardMaterial({
        color: 0x090b14,
        emissive: new THREE.Color(0x9b5cff),
        emissiveIntensity: 1.55,
        roughness: 0.35
      })
    );
    tm.name = "TeleportMachineFallback";
    tm.position.set(0, 1.1, snap((frontZ - 3.0) + 3.6));
    scene.add(tm);

    // -------------------------
    // Clear signage / anchors for later HUD walls
    // -------------------------
    const hubHudAnchor = new THREE.Object3D();
    hubHudAnchor.name = "HubHUDAttach";
    hubHudAnchor.position.set(0, 1.8, HUB_R - 0.8);
    scene.add(hubHudAnchor);

    console.log("[world] 4.0 ALIGN-FIRST ✅ grids only, sealed walls, clear doors, sunken table, west store anchor");
  },

  update(ctx, dt) {
    // alignment-first mode keeps update light
    // (your poker sim / bots can be wired back in after alignment is locked)
  }
};
