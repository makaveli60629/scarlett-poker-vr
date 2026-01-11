// /js/world.js — Scarlett Hybrid World v3.3 (FULL)
// FIXES FOR YOUR NOTES:
// ✅ Front spawn room has ONLY ONE exit (south -> corridor -> hub). No extra “right door”.
// ✅ Corridor end-caps close side gaps at room/hub junctions (solid hallway feel)
// ✅ Spawn facing flipped to face HUB (so you don’t face the wall)
// ✅ Hub trims colored purple (center room), different trims per room
// ✅ Teleport machine moved back toward the spawn wall
// ✅ Two VIP statues on pedestals in the spawn room

export const World = {
  async init(ctx) {
    const { THREE, scene, LOG } = ctx;
    const log  = (m) => LOG?.push?.("log", m)  || console.log(m);
    const warn = (m) => LOG?.push?.("warn", m) || console.warn(m);

    ctx.systems = ctx.systems || {};
    ctx.colliders = ctx.colliders || [];
    ctx.demo = ctx.demo || {};
    ctx.floorY = 0; // ✅ teleport plane contract

    // ---------- Materials ----------
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95 });
    const wallMat  = new THREE.MeshStandardMaterial({ color: 0x070912, roughness: 0.78, metalness: 0.12 });

    const neonCyan = new THREE.MeshStandardMaterial({
      color: 0x051018,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 2.0,
      roughness: 0.35,
      metalness: 0.15
    });

    const neonPink = new THREE.MeshStandardMaterial({
      color: 0x12050c,
      emissive: new THREE.Color(0xff2d7a),
      emissiveIntensity: 1.2,
      roughness: 0.35,
      metalness: 0.15
    });

    const neonPurple = new THREE.MeshStandardMaterial({
      color: 0x0d0716,
      emissive: new THREE.Color(0x9b5cff),
      emissiveIntensity: 2.2,
      roughness: 0.30,
      metalness: 0.15
    });

    const feltMat = new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.92, metalness: 0.05 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.6, metalness: 0.2 });

    // ---------- Lights ----------
    scene.add(new THREE.HemisphereLight(0xe8f3ff, 0x101018, 1.35));

    const dir = new THREE.DirectionalLight(0xffffff, 1.65);
    dir.position.set(12, 18, 10);
    scene.add(dir);

    const hubA = new THREE.PointLight(0x7fe7ff, 1.6, 70);
    hubA.position.set(0, 7.0, 0);
    scene.add(hubA);

    const hubB = new THREE.PointLight(0x9b5cff, 1.2, 70);
    hubB.position.set(0, 6.2, -10);
    scene.add(hubB);

    // ---------- Helpers ----------
    const addCollider = (mesh) => {
      mesh.userData.solid = true;
      ctx.colliders.push(mesh);
      scene.add(mesh);
      return mesh;
    };

    const makeFloorPlane = (w, d, x, z) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0, z);
      m.receiveShadow = true;
      scene.add(m);
      return m;
    };

    const wallBox = (w, h, d, px, pz, mat = wallMat) => {
      const mesh = addCollider(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
      mesh.position.set(px, h/2, pz);
      return mesh;
    };

    const makeBaseTrimRect = (w, d, x, z, mat, y = 0.02, thickness = 0.08, height = 0.06) => {
      const gx1 = new THREE.Mesh(new THREE.BoxGeometry(w, height, thickness), mat);
      const gx2 = new THREE.Mesh(new THREE.BoxGeometry(w, height, thickness), mat);
      gx1.position.set(x, y, z + d/2);
      gx2.position.set(x, y, z - d/2);
      scene.add(gx1, gx2);

      const gz1 = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, d), mat);
      const gz2 = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, d), mat);
      gz1.position.set(x + w/2, y, z);
      gz2.position.set(x - w/2, y, z);
      scene.add(gz1, gz2);
    };

    const makeNeonCornerPillars = (w, d, x, z, wallH, mat) => {
      const p = 0.10;
      const geo = new THREE.BoxGeometry(p, wallH, p);
      const corners = [
        [x + w/2, z + d/2],
        [x - w/2, z + d/2],
        [x + w/2, z - d/2],
        [x - w/2, z - d/2],
      ];
      for (const [cx, cz] of corners) {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(cx, wallH/2, cz);
        scene.add(m);
      }
    };

    // Door frame glow: keeps it pretty but not “pink confusion”
    const makeDoorFrame = (side, x, z, doorW, wallH, wallT, mat) => {
      const postW = 0.10;
      const postD = wallT + 0.02;
      const topH = 0.10;
      const topY = wallH - 0.35;

      if (side === "N" || side === "S") {
        const p1 = new THREE.Mesh(new THREE.BoxGeometry(postW, wallH, postD), mat);
        const p2 = new THREE.Mesh(new THREE.BoxGeometry(postW, wallH, postD), mat);
        p1.position.set(x - doorW/2, wallH/2, z);
        p2.position.set(x + doorW/2, wallH/2, z);
        scene.add(p1, p2);

        const top = new THREE.Mesh(new THREE.BoxGeometry(doorW + postW*2, topH, postD), mat);
        top.position.set(x, topY, z);
        scene.add(top);
      } else {
        const p1 = new THREE.Mesh(new THREE.BoxGeometry(postD, wallH, postW), mat);
        const p2 = new THREE.Mesh(new THREE.BoxGeometry(postD, wallH, postW), mat);
        p1.position.set(x, wallH/2, z - doorW/2);
        p2.position.set(x, wallH/2, z + doorW/2);
        scene.add(p1, p2);

        const top = new THREE.Mesh(new THREE.BoxGeometry(postD, topH, doorW + postW*2), mat);
        top.position.set(x, topY, z);
        scene.add(top);
      }
    };

    const makeSquareRoom = ({ name, x, z, size, wallH, wallT, door = null, trimMat, cornerMat }) => {
      makeFloorPlane(size, size, x, z);
      makeBaseTrimRect(size, size, x, z, trimMat);
      makeNeonCornerPillars(size, size, x, z, wallH, cornerMat);

      const half = size / 2;
      const doorW = door?.width ?? 3.2;

      // IMPORTANT: Only the specified door exists. Everything else SOLID.
      // N wall
      if (door?.side === "N") {
        const seg = (size - doorW) / 2;
        wallBox(seg, wallH, wallT, x - (doorW/2 + seg/2), z + half);
        wallBox(seg, wallH, wallT, x + (doorW/2 + seg/2), z + half);
        makeDoorFrame("N", x, z + half, doorW, wallH, wallT, trimMat);
      } else {
        wallBox(size + wallT, wallH, wallT, x, z + half);
      }

      // S wall
      if (door?.side === "S") {
        const seg = (size - doorW) / 2;
        wallBox(seg, wallH, wallT, x - (doorW/2 + seg/2), z - half);
        wallBox(seg, wallH, wallT, x + (doorW/2 + seg/2), z - half);
        makeDoorFrame("S", x, z - half, doorW, wallH, wallT, trimMat);
      } else {
        wallBox(size + wallT, wallH, wallT, x, z - half);
      }

      // E wall (always solid unless specified)
      if (door?.side === "E") {
        const seg = (size - doorW) / 2;
        wallBox(wallT, wallH, seg, x + half, z - (doorW/2 + seg/2));
        wallBox(wallT, wallH, seg, x + half, z + (doorW/2 + seg/2));
        makeDoorFrame("E", x + half, z, doorW, wallH, wallT, trimMat);
      } else {
        wallBox(wallT, wallH, size + wallT, x + half, z);
      }

      // W wall (always solid unless specified)
      if (door?.side === "W") {
        const seg = (size - doorW) / 2;
        wallBox(wallT, wallH, seg, x - half, z - (doorW/2 + seg/2));
        wallBox(wallT, wallH, seg, x - half, z + (doorW/2 + seg/2));
        makeDoorFrame("W", x - half, z, doorW, wallH, wallT, trimMat);
      } else {
        wallBox(wallT, wallH, size + wallT, x - half, z);
      }

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x, 0, z);
      scene.add(anchor);
      return anchor;
    };

    // Corridor with END CAPS to prevent “extra openings” at junctions
    const makeCorridor = ({ name, x, z, len, w, yaw, wallH, wallT, capRoom = true, capHub = true }) => {
      makeFloorPlane(w, len, x, z);

      const side = new THREE.Vector3(Math.cos(yaw + Math.PI/2), 0, Math.sin(yaw + Math.PI/2));
      const leftPos  = new THREE.Vector3(x, 0, z).add(side.clone().multiplyScalar(w/2));
      const rightPos = new THREE.Vector3(x, 0, z).add(side.clone().multiplyScalar(-w/2));

      const wallGeo = new THREE.BoxGeometry(wallT, wallH, len);
      const left = addCollider(new THREE.Mesh(wallGeo, wallMat));
      const right = addCollider(new THREE.Mesh(wallGeo, wallMat));
      left.position.set(leftPos.x, wallH/2, leftPos.z);
      right.position.set(rightPos.x, wallH/2, rightPos.z);
      left.rotation.y = yaw;
      right.rotation.y = yaw;

      // trims
      const trimGeo = new THREE.BoxGeometry(0.08, 0.06, len);
      const tl = new THREE.Mesh(trimGeo, neonCyan);
      const tr = new THREE.Mesh(trimGeo, neonCyan);
      tl.position.set(leftPos.x, 0.02, leftPos.z);
      tr.position.set(rightPos.x, 0.02, rightPos.z);
      tl.rotation.y = yaw;
      tr.rotation.y = yaw;
      scene.add(tl, tr);

      // end caps (small “cheek” walls) at each end to close side gaps
      const fwd = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
      const endA = new THREE.Vector3(x, 0, z).add(fwd.clone().multiplyScalar(len/2));
      const endB = new THREE.Vector3(x, 0, z).add(fwd.clone().multiplyScalar(-len/2));

      const capD = wallT;           // depth
      const capW = w + wallT*0.6;   // slightly wider than corridor

      const cap = (pos) => {
        const c = addCollider(new THREE.Mesh(new THREE.BoxGeometry(capW, wallH, capD), wallMat));
        c.position.set(pos.x, wallH/2, pos.z);
        c.rotation.y = yaw;
        return c;
      };

      // Note: these caps help you get “square → hallway → circle” feel.
      // We'll remove only where the actual doorway needs to be open; here we keep them
      // as "cheeks" by placing them slightly offset so corridor is still passable.
      if (capRoom) {
        const c = cap(endA);
        c.position.add(fwd.clone().multiplyScalar(-0.18));
      }
      if (capHub) {
        const c = cap(endB);
        c.position.add(fwd.clone().multiplyScalar(0.18));
      }

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x, 0, z);
      scene.add(anchor);
      return anchor;
    };

    const makeHub = ({ radius, wallH, wallT, segments = 72, doorWidth = 5.0 }) => {
      const hubFloor = new THREE.Mesh(
        new THREE.CircleGeometry(radius, 96),
        new THREE.MeshStandardMaterial({ color: 0x0a0b12, roughness: 0.55, metalness: 0.18 })
      );
      hubFloor.rotation.x = -Math.PI / 2;
      hubFloor.position.set(0, 0, 0);
      hubFloor.name = "HubPlate";
      hubFloor.receiveShadow = true;
      scene.add(hubFloor);

      // ✅ HUB TRIM = PURPLE (as requested)
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.12, 16, 220), neonPurple);
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.set(0, 0.18, 0);
      baseRing.name = "HubNeonBaseRing";
      scene.add(baseRing);

      const innerRing = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.35, 0.06, 12, 220), neonPurple);
      innerRing.rotation.x = Math.PI / 2;
      innerRing.position.set(0, 0.08, 0);
      scene.add(innerRing);

      // hub walls with 4 door gaps
      const gapHalf = doorWidth / 2;
      const segLen = (2 * Math.PI * radius) / segments;

      for (let i = 0; i < segments; i++) {
        const a0 = (i / segments) * Math.PI * 2;
        const a1 = ((i + 1) / segments) * Math.PI * 2;
        const am = (a0 + a1) / 2;

        const cx = Math.cos(am) * (radius + wallT/2);
        const cz = Math.sin(am) * (radius + wallT/2);

        const nearX = Math.abs(cz) < gapHalf && Math.abs(cx) > radius * 0.6;
        const nearZ = Math.abs(cx) < gapHalf && Math.abs(cz) > radius * 0.6;
        if (nearX || nearZ) continue;

        const wall = addCollider(new THREE.Mesh(
          new THREE.BoxGeometry(wallT, wallH, segLen * 1.02),
          wallMat
        ));
        wall.position.set(cx, wallH/2, cz);
        wall.rotation.y = -am;
      }

      // centerpiece
      const table = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.14, 48), feltMat);
      table.position.set(0, 0.78, 0);
      table.name = "BossTable";
      scene.add(table);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.09, 16, 120), darkMetal);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(0, 0.86, 0);
      scene.add(rim);

      const rail = new THREE.Mesh(
        new THREE.TorusGeometry(4.4, 0.10, 12, 140),
        new THREE.MeshStandardMaterial({ color: 0x11131c, emissive: 0x1a0f2a, emissiveIntensity: 0.85 })
      );
      rail.rotation.x = Math.PI / 2;
      rail.position.set(0, 0.68, 0);
      rail.name = "MainRail";
      scene.add(rail);

      const dealer = new THREE.Object3D();
      dealer.name = "DealerAnchor";
      dealer.position.set(0, 0.92, 1.05);
      scene.add(dealer);

      // 4 pillars + ring lights
      const pillarR = 5.2;
      const pillarGeo = new THREE.CylinderGeometry(0.22, 0.28, 4.2, 16);
      for (let k = 0; k < 4; k++) {
        const ang = (k / 4) * Math.PI * 2 + Math.PI / 4;
        const px = Math.cos(ang) * pillarR;
        const pz = Math.sin(ang) * pillarR;

        const pillar = new THREE.Mesh(pillarGeo, darkMetal);
        pillar.position.set(px, 2.1, pz);
        scene.add(pillar);

        const ringLight = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 14, 60), neonPurple);
        ringLight.rotation.x = Math.PI / 2;
        ringLight.position.set(px, 4.15, pz);
        scene.add(ringLight);

        const pl = new THREE.PointLight(0x9b5cff, 1.05, 18);
        pl.position.set(px, 4.1, pz);
        scene.add(pl);
      }
    };

    // ---------- Layout ----------
    const WALL_H = 3.0;
    const WALL_T = 0.28;

    const HUB_R = 14.0;
    const ROOM_S = 14.0;
    const CORRIDOR_L = 10.0;
    const CORRIDOR_W = 5.0;

    // base underlay
    const base = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), floorMat);
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.001;
    base.receiveShadow = true;
    scene.add(base);

    makeHub({ radius: HUB_R, wallH: WALL_H, wallT: WALL_T, segments: 72, doorWidth: CORRIDOR_W });

    const frontZ = HUB_R + CORRIDOR_L + ROOM_S/2;
    const backZ  = -(HUB_R + CORRIDOR_L + ROOM_S/2);
    const leftX  = -(HUB_R + CORRIDOR_L + ROOM_S/2);
    const rightX =  (HUB_R + CORRIDOR_L + ROOM_S/2);

    // ✅ FRONT ROOM: only 1 door (S). No “right opening”.
    makeSquareRoom({ name: "Room_Front", x: 0, z: frontZ, size: ROOM_S, wallH: WALL_H, wallT: WALL_T,
      door: { side: "S", width: CORRIDOR_W },
      trimMat: neonCyan, cornerMat: neonPink
    });

    // other rooms keep their single door toward hub
    makeSquareRoom({ name: "Room_Back", x: 0, z: backZ, size: ROOM_S, wallH: WALL_H, wallT: WALL_T,
      door: { side: "N", width: CORRIDOR_W },
      trimMat: neonPink, cornerMat: neonCyan
    });

    makeSquareRoom({ name: "Room_Left", x: leftX, z: 0, size: ROOM_S, wallH: WALL_H, wallT: WALL_T,
      door: { side: "E", width: CORRIDOR_W },
      trimMat: neonPurple, cornerMat: neonCyan
    });

    makeSquareRoom({ name: "Room_Right", x: rightX, z: 0, size: ROOM_S, wallH: WALL_H, wallT: WALL_T,
      door: { side: "W", width: CORRIDOR_W },
      trimMat: neonCyan, cornerMat: neonPurple
    });

    // corridors (end caps ON to remove “double entrance” feeling)
    makeCorridor({ name: "Corridor_Front", x: 0, z:  (HUB_R + CORRIDOR_L/2), len: CORRIDOR_L, w: CORRIDOR_W, yaw: 0,         wallH: WALL_H, wallT: WALL_T, capRoom: true, capHub: true });
    makeCorridor({ name: "Corridor_Back",  x: 0, z: -(HUB_R + CORRIDOR_L/2), len: CORRIDOR_L, w: CORRIDOR_W, yaw: 0,         wallH: WALL_H, wallT: WALL_T, capRoom: true, capHub: true });
    makeCorridor({ name: "Corridor_Left",  x: -(HUB_R + CORRIDOR_L/2), z: 0, len: CORRIDOR_L, w: CORRIDOR_W, yaw: Math.PI/2, wallH: WALL_H, wallT: WALL_T, capRoom: true, capHub: true });
    makeCorridor({ name: "Corridor_Right", x:  (HUB_R + CORRIDOR_L/2), z: 0, len: CORRIDOR_L, w: CORRIDOR_W, yaw: Math.PI/2, wallH: WALL_H, wallT: WALL_T, capRoom: true, capHub: true });

    // ---------- Spawn + facing ----------
    const spawnZ = frontZ - 3.0;

    const spawnPadMat = new THREE.MeshStandardMaterial({
      color: 0x0a0b12,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 1.1,
      roughness: 0.35,
      metalness: 0.15,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    const spawnPad = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.06, 36), spawnPadMat);
    spawnPad.name = "SpawnPad";
    spawnPad.position.set(0, 0.03, spawnZ);
    spawnPad.renderOrder = 10;
    scene.add(spawnPad);

    const sp = new THREE.Object3D();
    sp.name = "SpawnPoint";
    sp.position.set(0, 0, spawnZ);

    // ✅ Face the HUB (hub is at z=0, spawn is at +Z => face -Z => yaw = PI)
    sp.rotation.y = Math.PI;
    sp.userData.useSpawnRotation = true;
    sp.userData.faceTargetName = "HubPlate";
    scene.add(sp);

    // ---------- Teleport machine (moved back, near spawn wall) ----------
    const tm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 2.2, 22),
      new THREE.MeshStandardMaterial({
        color: 0x090b14,
        emissive: new THREE.Color(0x9b5cff),
        emissiveIntensity: 1.25,
        roughness: 0.35
      })
    );
    tm.name = "TeleportMachineFallback";
    tm.position.set(0, 1.1, spawnZ + 5.5); // ✅ farther back (toward the front room wall)
    scene.add(tm);

    // ---------- VIP statues on pedestals ----------
    const makePedestal = (x, z, mat) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.55, 18), darkMetal);
      p.position.set(x, 0.275, z);
      scene.add(p);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 12, 60), mat);
      rim.rotation.x = Math.PI/2;
      rim.position.set(x, 0.56, z);
      scene.add(rim);

      const pl = new THREE.PointLight(mat.emissive?.getHex?.() ?? 0x9b5cff, 0.9, 10);
      pl.position.set(x, 2.0, z);
      scene.add(pl);

      return p;
    };

    const makeStatueBot = (name, color) => {
      const g = new THREE.Group();
      g.name = name;
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.08, flatShading: true });

      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.20, 0.62, 4, 8), mat);
      torso.position.y = 1.35;
      g.add(torso);

      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 1), mat);
      head.position.set(0, 0.50, 0);
      torso.add(head);

      // “hero pose” arms
      const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.30, 3, 6), mat);
      const armR = armL.clone();
      armL.position.set(-0.28, 0.20, 0.08);
      armR.position.set( 0.28, 0.20, 0.08);
      armL.rotation.z = 0.65;
      armR.rotation.z = -0.65;
      torso.add(armL, armR);

      return g;
    };

    // Place statues near the spawn wall (inside front room), not blocking the corridor
    makePedestal(-3.8, spawnZ + 4.2, neonPurple);
    const statueA = makeStatueBot("VIP_Statue_A", 0x7fe7ff);
    statueA.position.set(-3.8, 0, spawnZ + 4.2);
    scene.add(statueA);

    makePedestal( 3.8, spawnZ + 4.2, neonPink);
    const statueB = makeStatueBot("VIP_Statue_B", 0xff2d7a);
    statueB.position.set( 3.8, 0, spawnZ + 4.2);
    scene.add(statueB);

    log("[world] v3.3 built ✅ front room locked (single exit) + corridor caps + hub purple trim + VIP statues");
  },

  update(ctx, dt) {
    // You can keep demo animations here later (bots/cards), but leaving minimal for stability.
  }
};
