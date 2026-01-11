// /js/world.js — Scarlett Hybrid World v4.1 (FULL)
// Key changes:
// - NO floors at all (grid only)
// - Hallways are actual geometry (walls + open path), NOT hidden
// - Entrances are OPEN (no blocking wall at spawn)
// - Hub is enclosed except 4 cardinal openings
// - Table is SUNK DOWN into a pit/pedestal (spectator look-down vibe)
// - Rail + teleporter machine restored
// - Extra lights in-world (helps outside not go black)

export const World = {
  version: "v4.1",

  async init(ctx) {
    const { THREE, scene } = ctx;
    const log  = (m) => ctx.LOG?.push?.("log", m)  || console.log(m);
    const warn = (m) => ctx.LOG?.push?.("warn", m) || console.warn(m);

    ctx.colliders = ctx.colliders || [];

    // -------------------------
    // Materials (simple colors for now)
    // -------------------------
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 0.85, metalness: 0.05 });
    const hubTrim = new THREE.MeshStandardMaterial({
      color: 0x120a18,
      emissive: new THREE.Color(0x9b5cff),
      emissiveIntensity: 2.2,
      roughness: 0.35,
      metalness: 0.15
    });
    const neonCyan = new THREE.MeshStandardMaterial({
      color: 0x051018,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 1.9,
      roughness: 0.35,
      metalness: 0.15
    });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x151722, roughness: 0.55, metalness: 0.25 });
    const feltMat = new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.9, metalness: 0.05 });

    // -------------------------
    // Grid-only ground (NO floors)
    // -------------------------
    const grid = new THREE.GridHelper(260, 260, 0x00ffff, 0x1c2740);
    grid.position.y = 0;
    scene.add(grid);

    // Add a faint “horizon” fog to stop black void feeling
    scene.fog = new THREE.Fog(0x05060a, 20, 170);

    // -------------------------
    // World lights (extra so “outside” isn't black)
    // -------------------------
    const worldLight = new THREE.Group();
    worldLight.name = "WorldLights";
    scene.add(worldLight);

    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    worldLight.add(ambient);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1a28, 1.2);
    worldLight.add(hemi);

    const fill1 = new THREE.PointLight(0x7fe7ff, 1.3, 65);
    fill1.position.set(0, 8, 0);
    worldLight.add(fill1);

    const fill2 = new THREE.PointLight(0x9b5cff, 1.0, 55);
    fill2.position.set(0, 6, -12);
    worldLight.add(fill2);

    // -------------------------
    // Helpers
    // -------------------------
    const addCollider = (mesh) => {
      mesh.userData.solid = true;
      ctx.colliders.push(mesh);
      scene.add(mesh);
      return mesh;
    };

    const box = (w, h, d, x, y, z, mat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      return m;
    };

    // “Trim” strips: base + top
    const addTrimRect = (w, d, x, z, yBase, yTop, matBase, matTop) => {
      const t = 0.08;
      const h = 0.06;

      // base
      const gx1 = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), matBase);
      const gx2 = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), matBase);
      gx1.position.set(x, yBase, z + d/2);
      gx2.position.set(x, yBase, z - d/2);
      scene.add(gx1, gx2);

      const gz1 = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), matBase);
      const gz2 = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), matBase);
      gz1.position.set(x + w/2, yBase, z);
      gz2.position.set(x - w/2, yBase, z);
      scene.add(gz1, gz2);

      // top
      const tx1 = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), matTop);
      const tx2 = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), matTop);
      tx1.position.set(x, yTop, z + d/2);
      tx2.position.set(x, yTop, z - d/2);
      scene.add(tx1, tx2);

      const tz1 = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), matTop);
      const tz2 = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), matTop);
      tz1.position.set(x + w/2, yTop, z);
      tz2.position.set(x - w/2, yTop, z);
      scene.add(tz1, tz2);
    };

    // -------------------------
    // Layout constants
    // -------------------------
    const WALL_H = 3.0;
    const WALL_T = 0.28;

    const HUB_R = 14.0;
    const ROOM_S = 14.0;
    const CORRIDOR_L = 10.0;
    const CORRIDOR_W = 5.0;

    // Centers
    const frontZ = HUB_R + CORRIDOR_L + ROOM_S/2;
    const backZ  = -(HUB_R + CORRIDOR_L + ROOM_S/2);
    const leftX  = -(HUB_R + CORRIDOR_L + ROOM_S/2);
    const rightX = (HUB_R + CORRIDOR_L + ROOM_S/2);

    // -------------------------
    // Square rooms (WALLS ONLY, no floors)
    // -------------------------
    function makeSquareRoom({ name, x, z, size, door }) {
      const half = size / 2;
      const doorW = door?.width ?? 3.2;

      // trims (base + top)
      addTrimRect(size, size, x, z, 0.03, WALL_H - 0.03, neonCyan, neonCyan);

      function wallSeg(w, px, pz, rotY = 0) {
        const m = addCollider(box(w, WALL_H, WALL_T, px, WALL_H/2, pz, wallMat));
        m.rotation.y = rotY;
        return m;
      }

      // north (+z)
      if (door?.side === "N") {
        const seg = (size - doorW) / 2;
        wallSeg(seg, x - (doorW/2 + seg/2), z + half);
        wallSeg(seg, x + (doorW/2 + seg/2), z + half);
      } else {
        wallSeg(size + WALL_T, x, z + half);
      }

      // south (-z)
      if (door?.side === "S") {
        const seg = (size - doorW) / 2;
        wallSeg(seg, x - (doorW/2 + seg/2), z - half);
        wallSeg(seg, x + (doorW/2 + seg/2), z - half);
      } else {
        wallSeg(size + WALL_T, x, z - half);
      }

      // east (+x)
      if (door?.side === "E") {
        const seg = (size - doorW) / 2;
        // IMPORTANT: build segments ABOVE/below doorway, leaving center open
        const m1 = addCollider(box(WALL_T, WALL_H, seg, x + half, WALL_H/2, z - (doorW/2 + seg/2), wallMat));
        const m2 = addCollider(box(WALL_T, WALL_H, seg, x + half, WALL_H/2, z + (doorW/2 + seg/2), wallMat));
        m1.rotation.y = 0;
        m2.rotation.y = 0;
      } else {
        const m = addCollider(box(WALL_T, WALL_H, size + WALL_T, x + half, WALL_H/2, z, wallMat));
        m.rotation.y = 0;
      }

      // west (-x)
      if (door?.side === "W") {
        const seg = (size - doorW) / 2;
        const m1 = addCollider(box(WALL_T, WALL_H, seg, x - half, WALL_H/2, z - (doorW/2 + seg/2), wallMat));
        const m2 = addCollider(box(WALL_T, WALL_H, seg, x - half, WALL_H/2, z + (doorW/2 + seg/2), wallMat));
        m1.rotation.y = 0;
        m2.rotation.y = 0;
      } else {
        const m = addCollider(box(WALL_T, WALL_H, size + WALL_T, x - half, WALL_H/2, z, wallMat));
        m.rotation.y = 0;
      }

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x, 0, z);
      scene.add(anchor);
      return anchor;
    }

    // -------------------------
    // Corridor (HALLWAY) walls + trims (NO floor)
    // -------------------------
    function makeCorridor({ name, x, z, len, w, yaw, wallH, wallT }) {
      // corridor runs along +Z when yaw=0; along +/-X when yaw=PI/2
      const side = new THREE.Vector3(Math.cos(yaw + Math.PI/2), 0, Math.sin(yaw + Math.PI/2));

      const leftPos  = new THREE.Vector3(x, 0, z).add(side.clone().multiplyScalar(w/2));
      const rightPos = new THREE.Vector3(x, 0, z).add(side.clone().multiplyScalar(-w/2));

      // two long walls
      const wallGeo = new THREE.BoxGeometry(wallT, wallH, len);

      const left = addCollider(new THREE.Mesh(wallGeo, wallMat));
      left.position.set(leftPos.x, wallH/2, leftPos.z);
      left.rotation.y = yaw;
      scene.add(left);

      const right = addCollider(new THREE.Mesh(wallGeo, wallMat));
      right.position.set(rightPos.x, wallH/2, rightPos.z);
      right.rotation.y = yaw;
      scene.add(right);

      // trims along corridor edges (base + top)
      const trimGeo = new THREE.BoxGeometry(0.08, 0.06, len);
      const baseL = new THREE.Mesh(trimGeo, neonCyan);
      const baseR = new THREE.Mesh(trimGeo, neonCyan);
      baseL.position.set(leftPos.x, 0.03, leftPos.z);
      baseR.position.set(rightPos.x, 0.03, rightPos.z);
      baseL.rotation.y = yaw;
      baseR.rotation.y = yaw;
      scene.add(baseL, baseR);

      const topL = new THREE.Mesh(trimGeo, neonCyan);
      const topR = new THREE.Mesh(trimGeo, neonCyan);
      topL.position.set(leftPos.x, wallH - 0.03, leftPos.z);
      topR.position.set(rightPos.x, wallH - 0.03, rightPos.z);
      topL.rotation.y = yaw;
      topR.rotation.y = yaw;
      scene.add(topL, topR);

      // hallway lights (so you always see the corridor)
      const mid = new THREE.PointLight(0x7fe7ff, 1.1, 18);
      mid.position.set(x, 2.2, z);
      scene.add(mid);

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x, 0, z);
      scene.add(anchor);
      return anchor;
    }

    // -------------------------
    // Hub: ring wall w/ 4 openings + trims
    // -------------------------
    function makeHub({ radius, wallH, wallT, segments = 56, doorWidth = 5.0 }) {
      // hub plate marker (not a floor, but used for target/reference)
      const hubPlate = new THREE.Object3D();
      hubPlate.name = "HubPlate";
      scene.add(hubPlate);

      // neon ring trim at base + top
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.12, 16, 180), hubTrim);
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.set(0, 0.28, 0);
      baseRing.name = "HubNeonBaseRing";
      scene.add(baseRing);

      const topRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.10, 16, 160), hubTrim);
      topRing.rotation.x = Math.PI / 2;
      topRing.position.set(0, wallH - 0.25, 0);
      topRing.name = "HubNeonTopRing";
      scene.add(topRing);

      // enclosed circular wall segments, leave open at N/S/E/W
      const gapHalf = doorWidth / 2;
      const segLen = (2 * Math.PI * radius) / segments;

      for (let i = 0; i < segments; i++) {
        const a0 = (i / segments) * Math.PI * 2;
        const a1 = ((i + 1) / segments) * Math.PI * 2;
        const am = (a0 + a1) / 2;

        const cx = Math.cos(am) * radius;
        const cz = Math.sin(am) * radius;

        // Skip segments in door gap zones around +Z,-Z,+X,-X
        // Use axis proximity test for a clean opening
        const nearX = Math.abs(cz) < gapHalf && Math.abs(cx) > radius * 0.65;
        const nearZ = Math.abs(cx) < gapHalf && Math.abs(cz) > radius * 0.65;
        if (nearX || nearZ) continue;

        const wall = addCollider(new THREE.Mesh(
          new THREE.BoxGeometry(wallT, wallH, segLen),
          wallMat
        ));
        wall.position.set(cx, wallH/2, cz);
        wall.rotation.y = -am;
        scene.add(wall);
      }

      // Hub lighting ring (soft points)
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2;
        const px = Math.cos(ang) * (radius - 1.0);
        const pz = Math.sin(ang) * (radius - 1.0);
        const pl = new THREE.PointLight(k % 2 ? 0x9b5cff : 0x00ffff, 1.0, 20);
        pl.position.set(px, 2.4, pz);
        scene.add(pl);
      }

      // Sunken pedestal pit for the table (divot)
      // Outer rim (what people stand around)
      const pitOuter = new THREE.Mesh(
        new THREE.CylinderGeometry(6.0, 6.0, 0.25, 64),
        darkMetal
      );
      pitOuter.position.set(0, 0.12, 0);
      scene.add(pitOuter);

      // Inner “down” bowl
      const pitInner = new THREE.Mesh(
        new THREE.CylinderGeometry(4.3, 4.3, 1.05, 64),
        new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.9, metalness: 0.08 })
      );
      pitInner.position.set(0, -0.40, 0);
      scene.add(pitInner);

      // Table placed DOWN inside pit
      const table = new THREE.Mesh(
        new THREE.CylinderGeometry(1.85, 1.85, 0.14, 48),
        feltMat
      );
      table.position.set(0, 0.20, 0); // lowered
      table.name = "BossTable";
      scene.add(table);

      // Table rim
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(1.85, 0.09, 16, 120),
        darkMetal
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.set(0, 0.28, 0);
      scene.add(rim);

      // Table stand (fix floating feeling)
      const stand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.55, 0.85, 22),
        darkMetal
      );
      stand.position.set(0, -0.25, 0);
      scene.add(stand);

      // Rail restored
      const rail = new THREE.Mesh(
        new THREE.TorusGeometry(4.4, 0.10, 12, 140),
        new THREE.MeshStandardMaterial({
          color: 0x121428,
          emissive: new THREE.Color(0x132a3a),
          emissiveIntensity: 0.9
        })
      );
      rail.rotation.x = Math.PI / 2;
      rail.position.set(0, 0.65, 0);
      rail.name = "MainRail";
      scene.add(rail);

      // Dealer anchor for future
      const dealer = new THREE.Object3D();
      dealer.name = "DealerAnchor";
      dealer.position.set(0, 0.35, 1.05);
      scene.add(dealer);
    }

    // -------------------------
    // Build hub + rooms + hallways
    // -------------------------
    makeHub({ radius: HUB_R, wallH: WALL_H, wallT: WALL_T, segments: 64, doorWidth: CORRIDOR_W });

    // Rooms: doors face hub
    makeSquareRoom({ name: "Room_Front", x: 0,      z: frontZ, size: ROOM_S, door: { side: "S", width: CORRIDOR_W } });
    makeSquareRoom({ name: "Room_Back",  x: 0,      z: backZ,  size: ROOM_S, door: { side: "N", width: CORRIDOR_W } });
    makeSquareRoom({ name: "Room_Left",  x: leftX,  z: 0,      size: ROOM_S, door: { side: "E", width: CORRIDOR_W } });
    makeSquareRoom({ name: "Room_Right", x: rightX, z: 0,      size: ROOM_S, door: { side: "W", width: CORRIDOR_W } });

    // Hallways between hub and rooms (walls only)
    makeCorridor({ name: "Corridor_Front", x: 0, z: (HUB_R + CORRIDOR_L/2), len: CORRIDOR_L, w: CORRIDOR_W, yaw: 0,          wallH: WALL_H, wallT: WALL_T });
    makeCorridor({ name: "Corridor_Back",  x: 0, z: -(HUB_R + CORRIDOR_L/2), len: CORRIDOR_L, w: CORRIDOR_W, yaw: 0,         wallH: WALL_H, wallT: WALL_T });
    makeCorridor({ name: "Corridor_Left",  x: -(HUB_R + CORRIDOR_L/2), z: 0, len: CORRIDOR_L, w: CORRIDOR_W, yaw: Math.PI/2, wallH: WALL_H, wallT: WALL_T });
    makeCorridor({ name: "Corridor_Right", x: (HUB_R + CORRIDOR_L/2),  z: 0, len: CORRIDOR_L, w: CORRIDOR_W, yaw: Math.PI/2, wallH: WALL_H, wallT: WALL_T });

    // -------------------------
    // Spawn: SOUTH/FRONT room (you spawn and walk straight into corridor -> hub)
    // Ensure NOTHING blocks this.
    // -------------------------
    const spawnZ = frontZ - 3.0;

    const spawnPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.08, 36),
      new THREE.MeshStandardMaterial({ color: 0x071018, emissive: 0x00ffff, emissiveIntensity: 1.2 })
    );
    spawnPad.name = "SpawnPad";
    spawnPad.position.set(0, 0.04, spawnZ);
    scene.add(spawnPad);

    const sp = new THREE.Object3D();
    sp.name = "SpawnPoint";
    sp.position.set(0, 0, spawnZ);
    sp.userData.faceTargetName = "BossTable"; // force facing table
    scene.add(sp);

    // -------------------------
    // Teleport machine restored (behind spawn, not blocking corridor)
    // -------------------------
    const tm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 2.2, 22),
      new THREE.MeshStandardMaterial({
        color: 0x090b14,
        emissive: new THREE.Color(0x9b5cff),
        emissiveIntensity: 1.35,
        roughness: 0.35
      })
    );
    tm.name = "TeleportMachineFallback";
    tm.position.set(0, 1.1, spawnZ + 3.6); // behind spawn
    scene.add(tm);

    // small point light so it’s always visible
    const tmLight = new THREE.PointLight(0x9b5cff, 1.2, 14);
    tmLight.position.set(0, 1.8, spawnZ + 3.6);
    scene.add(tmLight);

    log("[world] v4.1 built ✅ GRID only + hallways + open entrances + enclosed hub + sunk pedestal table + rail + teleporter");
  },

  update(ctx, dt) {
    // no-op for now (stable baseline)
  }
};
