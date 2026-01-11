// /js/world.js — Scarlett Hybrid World v3.2 (FULL, LOCKED ALIGNMENT)
// ✅ Floors are real walk surfaces at y=0 (PlaneGeometry) -> NO gaps, NO raised offsets
// ✅ Walls sit exactly on floors (bottom at y=0)
// ✅ ctx.floorY = 0 for teleport ring/laser correctness
// ✅ SpawnPoint uses authored rotation (perfect facing, snapped stable)
// Layout:
//   [BACK ROOM]
//        |
// [LEFT]-O-[RIGHT]
//        |
//   [FRONT ROOM]  (spawn here, facing hub)
// O = Big circular hub (enclosed) with centerpiece table + rails + 4 pillars + neon trims.
// Includes: demo bots + demo dealing + “jumbotron pads” on walls as placeholders.

export const World = {
  async init(ctx) {
    const { THREE, scene, LOG } = ctx;
    const log  = (m) => LOG?.push?.("log", m)  || console.log(m);
    const warn = (m) => LOG?.push?.("warn", m) || console.warn(m);

    ctx.systems = ctx.systems || {};
    ctx.colliders = ctx.colliders || [];
    ctx.demo = ctx.demo || {};

    // ✅ GLOBAL FLOOR CONTRACT (teleport ring hits this)
    ctx.floorY = 0;

    // ---------- Materials ----------
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95 });
    const wallMat  = new THREE.MeshStandardMaterial({ color: 0x070912, roughness: 0.78, metalness: 0.12 });

    const neonCyan = new THREE.MeshStandardMaterial({
      color: 0x051018,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 2.2,
      roughness: 0.35,
      metalness: 0.15
    });

    const neonPink = new THREE.MeshStandardMaterial({
      color: 0x12050c,
      emissive: new THREE.Color(0xff2d7a),
      emissiveIntensity: 1.8,
      roughness: 0.35,
      metalness: 0.15
    });

    const neonPurple = new THREE.MeshStandardMaterial({
      color: 0x0d0716,
      emissive: new THREE.Color(0x9b5cff),
      emissiveIntensity: 1.6,
      roughness: 0.35,
      metalness: 0.15
    });

    const feltMat = new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.92, metalness: 0.05 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.6, metalness: 0.2 });

    // ---------- Lights ----------
    scene.add(new THREE.HemisphereLight(0xe8f3ff, 0x101018, 1.35));

    const dir = new THREE.DirectionalLight(0xffffff, 1.65);
    dir.position.set(12, 18, 10);
    scene.add(dir);

    const hubA = new THREE.PointLight(0x7fe7ff, 1.8, 70);
    hubA.position.set(0, 7.0, 0);
    scene.add(hubA);

    const hubB = new THREE.PointLight(0xff2d7a, 1.2, 70);
    hubB.position.set(0, 6.0, -10);
    scene.add(hubB);

    // ---------- Helpers ----------
    const addCollider = (mesh) => {
      mesh.userData.solid = true;
      ctx.colliders.push(mesh);
      scene.add(mesh);
      return mesh;
    };

    // Floors are planes at y=0 (no more raised boxes)
    const makeFloorPlane = (w, d, x, z) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0, z);
      m.receiveShadow = true;
      scene.add(m);
      return m;
    };

    // Neon trims at base of rectangular area
    const makeBaseTrimRect = (w, d, x, z, y = 0.02, thickness = 0.08, height = 0.06, mat = neonCyan) => {
      // north/south
      const gx1 = new THREE.Mesh(new THREE.BoxGeometry(w, height, thickness), mat);
      const gx2 = new THREE.Mesh(new THREE.BoxGeometry(w, height, thickness), mat);
      gx1.position.set(x, y, z + d/2);
      gx2.position.set(x, y, z - d/2);
      scene.add(gx1, gx2);

      // east/west
      const gz1 = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, d), mat);
      const gz2 = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, d), mat);
      gz1.position.set(x + w/2, y, z);
      gz2.position.set(x - w/2, y, z);
      scene.add(gz1, gz2);
    };

    const makeNeonCornerPillars = (w, d, x, z, wallH, p = 0.10, mat = neonPink) => {
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

    // Solid wall helper that aligns perfectly to y=0 floor
    const wallBox = (w, h, d, px, pz, mat = wallMat) => {
      const mesh = addCollider(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
      mesh.position.set(px, h/2, pz);
      return mesh;
    };

    // Door frame trim (glow)
    const makeDoorFrame = (side, x, z, doorW, wallH, wallT, mat = neonPurple) => {
      // Small glowing “posts” + top bar around doorway opening
      const postW = 0.10;
      const postD = wallT + 0.02;

      const topH = 0.10;
      const topY = wallH - 0.35;

      if (side === "N" || side === "S") {
        const sign = (side === "N") ? 1 : -1;
        // posts at left/right of doorway
        const p1 = new THREE.Mesh(new THREE.BoxGeometry(postW, wallH, postD), mat);
        const p2 = new THREE.Mesh(new THREE.BoxGeometry(postW, wallH, postD), mat);
        p1.position.set(x - doorW/2, wallH/2, z);
        p2.position.set(x + doorW/2, wallH/2, z);
        scene.add(p1, p2);

        const top = new THREE.Mesh(new THREE.BoxGeometry(doorW + postW*2, topH, postD), mat);
        top.position.set(x, topY, z);
        scene.add(top);
      }

      if (side === "E" || side === "W") {
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

    const makeSquareRoom = ({ name, x, z, size, wallH, wallT, door = null, accent = neonCyan }) => {
      // floor
      makeFloorPlane(size, size, x, z);
      makeBaseTrimRect(size, size, x, z, 0.02, 0.08, 0.06, accent);
      makeNeonCornerPillars(size, size, x, z, wallH, 0.10, neonPink);

      const half = size / 2;
      const doorW = door?.width ?? 3.2;

      // N wall (z + half)
      if (door?.side === "N") {
        const seg = (size - doorW) / 2;
        wallBox(seg, wallH, wallT, x - (doorW/2 + seg/2), z + half);
        wallBox(seg, wallH, wallT, x + (doorW/2 + seg/2), z + half);
        makeDoorFrame("N", x, z + half, doorW, wallH, wallT, neonPurple);
      } else {
        wallBox(size + wallT, wallH, wallT, x, z + half);
      }

      // S wall (z - half)
      if (door?.side === "S") {
        const seg = (size - doorW) / 2;
        wallBox(seg, wallH, wallT, x - (doorW/2 + seg/2), z - half);
        wallBox(seg, wallH, wallT, x + (doorW/2 + seg/2), z - half);
        makeDoorFrame("S", x, z - half, doorW, wallH, wallT, neonPurple);
      } else {
        wallBox(size + wallT, wallH, wallT, x, z - half);
      }

      // E wall (x + half)
      if (door?.side === "E") {
        const seg = (size - doorW) / 2;
        wallBox(wallT, wallH, seg, x + half, z - (doorW/2 + seg/2));
        wallBox(wallT, wallH, seg, x + half, z + (doorW/2 + seg/2));
        makeDoorFrame("E", x + half, z, doorW, wallH, wallT, neonPurple);
      } else {
        wallBox(wallT, wallH, size + wallT, x + half, z);
      }

      // W wall (x - half)
      if (door?.side === "W") {
        const seg = (size - doorW) / 2;
        wallBox(wallT, wallH, seg, x - half, z - (doorW/2 + seg/2));
        wallBox(wallT, wallH, seg, x - half, z + (doorW/2 + seg/2));
        makeDoorFrame("W", x - half, z, doorW, wallH, wallT, neonPurple);
      } else {
        wallBox(wallT, wallH, size + wallT, x - half, z);
      }

      // room anchor
      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x, 0, z);
      scene.add(anchor);
      return anchor;
    };

    // Corridor floor plane + two side walls + base trims
    const makeCorridor = ({ name, x, z, len, w, yaw, wallH, wallT }) => {
      makeFloorPlane(w, len, x, z);

      // side direction in world space
      const side = new THREE.Vector3(Math.cos(yaw + Math.PI/2), 0, Math.sin(yaw + Math.PI/2));
      const leftPos  = new THREE.Vector3(x, 0, z).add(side.clone().multiplyScalar(w/2));
      const rightPos = new THREE.Vector3(x, 0, z).add(side.clone().multiplyScalar(-w/2));

      // corridor walls aligned to floor
      const wallGeo = new THREE.BoxGeometry(wallT, wallH, len);
      const left = addCollider(new THREE.Mesh(wallGeo, wallMat));
      const right = addCollider(new THREE.Mesh(wallGeo, wallMat));
      left.position.set(leftPos.x, wallH/2, leftPos.z);
      right.position.set(rightPos.x, wallH/2, rightPos.z);
      left.rotation.y = yaw;
      right.rotation.y = yaw;

      // neon trims along corridor edges
      const trimGeo = new THREE.BoxGeometry(0.08, 0.06, len);
      const tl = new THREE.Mesh(trimGeo, neonCyan);
      const tr = new THREE.Mesh(trimGeo, neonCyan);
      tl.position.set(leftPos.x, 0.02, leftPos.z);
      tr.position.set(rightPos.x, 0.02, rightPos.z);
      tl.rotation.y = yaw;
      tr.rotation.y = yaw;
      scene.add(tl, tr);

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x, 0, z);
      scene.add(anchor);
      return anchor;
    };

    const makeHub = ({ radius, wallH, wallT, segments = 64, doorWidth = 5.0 }) => {
      // Hub floor is a plane cylinder cap at y=0
      const hubFloor = new THREE.Mesh(
        new THREE.CircleGeometry(radius, 96),
        new THREE.MeshStandardMaterial({ color: 0x0a0b12, roughness: 0.55, metalness: 0.18 })
      );
      hubFloor.rotation.x = -Math.PI / 2;
      hubFloor.position.set(0, 0, 0);
      hubFloor.name = "HubPlate";
      hubFloor.receiveShadow = true;
      scene.add(hubFloor);

      // Neon base ring trim aligned to floor
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.12, 16, 200), neonCyan);
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.set(0, 0.18, 0);
      baseRing.name = "HubNeonBaseRing";
      scene.add(baseRing);

      // Extra outer ring glow (helps “missing trim” feeling)
      const baseRing2 = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.35, 0.07, 14, 200), neonPink);
      baseRing2.rotation.x = Math.PI / 2;
      baseRing2.position.set(0, 0.16, 0);
      scene.add(baseRing2);

      // Solid circular wall segments (bottom at y=0)
      const gapHalf = doorWidth / 2;
      const segLen = (2 * Math.PI * radius) / segments;

      for (let i = 0; i < segments; i++) {
        const a0 = (i / segments) * Math.PI * 2;
        const a1 = ((i + 1) / segments) * Math.PI * 2;
        const am = (a0 + a1) / 2;

        // wall center along circumference
        const cx = Math.cos(am) * (radius + wallT/2);
        const cz = Math.sin(am) * (radius + wallT/2);

        // Door gaps aligned to axes
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

      // Neon trim at base inside hub (visual “krylon edge”)
      const innerRing = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.35, 0.06, 12, 200), neonCyan);
      innerRing.rotation.x = Math.PI / 2;
      innerRing.position.set(0, 0.08, 0);
      scene.add(innerRing);

      // Centerpiece table + rail (aligned to floor)
      const table = new THREE.Mesh(
        new THREE.CylinderGeometry(1.85, 1.85, 0.14, 48),
        feltMat
      );
      table.position.set(0, 0.78, 0);
      table.name = "BossTable";
      scene.add(table);

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(1.85, 0.09, 16, 120),
        darkMetal
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.set(0, 0.86, 0);
      scene.add(rim);

      const rail = new THREE.Mesh(
        new THREE.TorusGeometry(4.4, 0.10, 12, 140),
        new THREE.MeshStandardMaterial({ color: 0x11131c, emissive: 0x132a3a, emissiveIntensity: 0.75 })
      );
      rail.rotation.x = Math.PI / 2;
      rail.position.set(0, 0.68, 0);
      rail.name = "MainRail";
      scene.add(rail);

      // Dealer anchor
      const dealer = new THREE.Object3D();
      dealer.name = "DealerAnchor";
      dealer.position.set(0, 0.92, 1.05);
      scene.add(dealer);

      // 4 Pillars + ring lights
      const pillarR = 5.2;
      const pillarGeo = new THREE.CylinderGeometry(0.22, 0.28, 4.2, 16);

      for (let k = 0; k < 4; k++) {
        const ang = (k / 4) * Math.PI * 2 + Math.PI / 4;
        const px = Math.cos(ang) * pillarR;
        const pz = Math.sin(ang) * pillarR;

        const pillar = new THREE.Mesh(pillarGeo, darkMetal);
        pillar.position.set(px, 2.1, pz);
        pillar.name = `HubPillar_${k}`;
        scene.add(pillar);

        const ringLight = new THREE.Mesh(
          new THREE.TorusGeometry(0.62, 0.08, 14, 60),
          k % 2 === 0 ? neonPink : neonCyan
        );
        ringLight.rotation.x = Math.PI / 2;
        ringLight.position.set(px, 4.15, pz);
        scene.add(ringLight);

        const pl = new THREE.PointLight(k % 2 === 0 ? 0x00ffff : 0xff2d7a, 1.1, 18);
        pl.position.set(px, 4.1, pz);
        scene.add(pl);
      }

      // Jumbotron placeholders on inner wall (4 sides)
      const screenMat = new THREE.MeshStandardMaterial({
        color: 0x0b1322,
        emissive: new THREE.Color(0x00ffff),
        emissiveIntensity: 0.35,
        roughness: 0.25,
        metalness: 0.1
      });

      const mkScreen = (name, x, y, z, ry) => {
        const s = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 2.2), screenMat);
        s.name = name;
        s.position.set(x, y, z);
        s.rotation.y = ry;
        scene.add(s);

        const frame = new THREE.Mesh(new THREE.BoxGeometry(6.25, 2.45, 0.10), neonPurple);
        frame.position.set(x, y, z);
        frame.rotation.y = ry;
        scene.add(frame);
      };

      const screenR = radius - 0.75;
      mkScreen("Jumbotron_Front", 0, 2.0,  screenR, Math.PI);
      mkScreen("Jumbotron_Back",  0, 2.0, -screenR, 0);
      mkScreen("Jumbotron_Left", -screenR, 2.0, 0,  Math.PI/2);
      mkScreen("Jumbotron_Right", screenR, 2.0, 0, -Math.PI/2);
    };

    // ---------- Layout constants ----------
    const WALL_H = 3.0;
    const WALL_T = 0.28;

    const HUB_R = 14.0;
    const ROOM_S = 14.0;
    const CORRIDOR_L = 10.0;
    const CORRIDOR_W = 5.0;

    // Big base floor for outside (optional, helps horizon)
    const base = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), floorMat);
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.001; // just below the real floors to avoid z-fight
    base.receiveShadow = true;
    scene.add(base);

    // Build hub first
    makeHub({ radius: HUB_R, wallH: WALL_H, wallT: WALL_T, segments: 72, doorWidth: CORRIDOR_W });

    // Room centers
    const frontZ = HUB_R + CORRIDOR_L + ROOM_S/2;
    const backZ  = -(HUB_R + CORRIDOR_L + ROOM_S/2);
    const leftX  = -(HUB_R + CORRIDOR_L + ROOM_S/2);
    const rightX =  (HUB_R + CORRIDOR_L + ROOM_S/2);

    // Rooms (doors face hub)
    makeSquareRoom({ name: "Room_Front", x: 0,      z: frontZ, size: ROOM_S, wallH: WALL_H, wallT: WALL_T, door: { side: "S", width: CORRIDOR_W }, accent: neonCyan });
    makeSquareRoom({ name: "Room_Back",  x: 0,      z: backZ,  size: ROOM_S, wallH: WALL_H, wallT: WALL_T, door: { side: "N", width: CORRIDOR_W }, accent: neonPink });
    makeSquareRoom({ name: "Room_Left",  x: leftX,  z: 0,      size: ROOM_S, wallH: WALL_H, wallT: WALL_T, door: { side: "E", width: CORRIDOR_W }, accent: neonPurple });
    makeSquareRoom({ name: "Room_Right", x: rightX, z: 0,      size: ROOM_S, wallH: WALL_H, wallT: WALL_T, door: { side: "W", width: CORRIDOR_W }, accent: neonCyan });

    // Corridors
    makeCorridor({ name: "Corridor_Front", x: 0, z:  (HUB_R + CORRIDOR_L/2), len: CORRIDOR_L, w: CORRIDOR_W, yaw: 0,          wallH: WALL_H, wallT: WALL_T });
    makeCorridor({ name: "Corridor_Back",  x: 0, z: -(HUB_R + CORRIDOR_L/2), len: CORRIDOR_L, w: CORRIDOR_W, yaw: 0,          wallH: WALL_H, wallT: WALL_T });
    makeCorridor({ name: "Corridor_Left",  x: -(HUB_R + CORRIDOR_L/2), z: 0, len: CORRIDOR_L, w: CORRIDOR_W, yaw: Math.PI/2,  wallH: WALL_H, wallT: WALL_T });
    makeCorridor({ name: "Corridor_Right", x:  (HUB_R + CORRIDOR_L/2), z: 0, len: CORRIDOR_L, w: CORRIDOR_W, yaw: Math.PI/2,  wallH: WALL_H, wallT: WALL_T });

    // Spawn pad in FRONT room
    const spawnPadMat = new THREE.MeshStandardMaterial({
      color: 0x0a0b12,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 1.2,
      roughness: 0.35,
      metalness: 0.15,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    const spawnPad = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.06, 36), spawnPadMat);
    spawnPad.name = "SpawnPad";
    spawnPad.position.set(0, 0.03, frontZ - 3.0);
    spawnPad.renderOrder = 10;
    scene.add(spawnPad);

    const sp = new THREE.Object3D();
    sp.name = "SpawnPoint";
    sp.position.set(0, 0, frontZ - 3.0);

    // ✅ Authored facing: from front room toward hub (hub is at z=0 => face -Z => yaw = PI)
    sp.rotation.y = Math.PI;
    sp.userData.useSpawnRotation = true;
    sp.userData.faceTargetName = "HubPlate";
    scene.add(sp);

    // Teleport machine behind spawn (visual landmark)
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
    tm.position.set(0, 1.1, (frontZ - 3.0) + 2.8);
    scene.add(tm);

    // Room labels (for debugging orientation)
    const makeRoomLabel = (txt, x, z, color = 0x00ffff) => {
      const g = new THREE.Group();
      g.position.set(x, 2.2, z);
      scene.add(g);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8), darkMetal);
      post.position.y = -0.7;
      g.add(post);

      const plate = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 0.12), new THREE.MeshStandardMaterial({
        color: 0x0b0d14, emissive: new THREE.Color(color), emissiveIntensity: 0.25, roughness: 0.35
      }));
      g.add(plate);

      plate.name = `Label_${txt}`;
      // We don't render actual text here (keeping it dependency-free)
      return g;
    };

    makeRoomLabel("FRONT", 0, frontZ - 5.5, 0x00ffff);
    makeRoomLabel("HUB",   0, 0,            0xff2d7a);
    makeRoomLabel("LEFT",  leftX, 0,        0x9b5cff);
    makeRoomLabel("RIGHT", rightX, 0,       0x00ffff);
    makeRoomLabel("BACK",  0, backZ + 5.5,  0xff2d7a);

    // Demo bots (with elbows/legs-ish) walking in hub
    const makeBot = (name, tint) => {
      const g = new THREE.Group();
      g.name = name;
      const mat = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.7, metalness: 0.05, flatShading: true });

      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.20, 0.60, 4, 8), mat);
      torso.position.y = 1.15;
      g.add(torso);

      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 1), mat);
      head.position.set(0, 0.48, 0);
      torso.add(head);

      // arms (upper + forearm)
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.28, 3, 6), mat);
      const fore  = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.26, 3, 6), mat);
      upper.position.set(-0.26, 0.18, 0);
      fore.position.set(0, -0.22, 0);
      upper.add(fore);
      torso.add(upper);

      const upper2 = upper.clone();
      upper2.position.x = 0.26;
      torso.add(upper2);

      // legs
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.38, 3, 6), mat);
      const leg2 = leg.clone();
      leg.position.set(-0.12, -0.55, 0);
      leg2.position.set(0.12, -0.55, 0);
      torso.add(leg, leg2);

      g.userData = { torso, upperL: upper, upperR: upper2, legL: leg, legR: leg2 };
      return g;
    };

    ctx.demo.bots = [
      { obj: makeBot("DemoBotA", 0x7fe7ff), t: 0, phase: 0 },
      { obj: makeBot("DemoBotB", 0xff2d7a), t: 0, phase: Math.PI },
    ];
    ctx.demo.bots.forEach((b) => scene.add(b.obj));

    // Demo dealing on center table
    const cardGroup = new THREE.Group();
    cardGroup.name = "DemoCards";
    scene.add(cardGroup);

    ctx.demo.cards = {
      group: cardGroup,
      active: [],
      timer: 0,
      idx: 0,
      deckPos: new THREE.Vector3(0, 0.92, 1.05),
      seatTargets: [
        new THREE.Vector3(-0.55, 0.86, 0.25),
        new THREE.Vector3( 0.55, 0.86, 0.25),
        new THREE.Vector3(-0.55, 0.86,-0.25),
        new THREE.Vector3( 0.55, 0.86,-0.25),
      ]
    };

    log("[world] v3.2 built ✅ LOCKED alignment (floors y=0, walls on floor, trims derived)");
    log("[world] Hub ✅ table+rail+pillars+ring lights + jumbotron pads");
    log("[world] SpawnPoint ✅ authored rotation (perfect facing)");
  },

  update(ctx, dt) {
    // Demo bots orbit + animate limbs
    if (ctx.demo?.bots?.length) {
      const r = 6.8;
      for (const b of ctx.demo.bots) {
        b.t += dt * 0.45;
        const ang = b.t + b.phase;
        const x = Math.cos(ang) * r;
        const z = Math.sin(ang) * r;

        b.obj.position.set(x, 0, z);
        b.obj.rotation.y = Math.atan2(-x, -z);

        // simple walk cycle
        const s = Math.sin(b.t * 5.2);
        const u = b.obj.userData;
        if (u?.upperL) u.upperL.rotation.z = 0.55 * s;
        if (u?.upperR) u.upperR.rotation.z = -0.55 * s;
        if (u?.legL) u.legL.rotation.x = -0.65 * s;
        if (u?.legR) u.legR.rotation.x = 0.65 * s;
      }
    }

    // Demo dealing loop
    const dc = ctx.demo?.cards;
    if (dc) {
      dc.timer += dt;

      if (dc.timer > 0.55) {
        dc.timer = 0;

        const card = new ctx.THREE.Mesh(
          new ctx.THREE.PlaneGeometry(0.07, 0.10),
          new ctx.THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.0, side: ctx.THREE.DoubleSide })
        );
        card.rotation.x = -Math.PI / 2;
        card.position.copy(dc.deckPos);

        const edge = new ctx.THREE.LineSegments(
          new ctx.THREE.EdgesGeometry(card.geometry),
          new ctx.THREE.LineBasicMaterial({ color: 0x00ffff })
        );
        card.add(edge);

        const target = dc.seatTargets[dc.idx % dc.seatTargets.length].clone();
        dc.idx++;

        card.userData.anim = { t: 0, from: dc.deckPos.clone(), to: target };
        dc.group.add(card);
        dc.active.push(card);

        if (dc.active.length > 22) {
          for (const c of dc.active) dc.group.remove(c);
          dc.active.length = 0;
        }
      }

      for (const card of dc.active) {
        const a = card.userData.anim;
        if (!a) continue;
        a.t = Math.min(1, a.t + dt * 2.0);

        const mid = a.from.clone().lerp(a.to, 0.5);
        mid.y += 0.28;

        const p1 = a.from.clone().lerp(mid, a.t);
        const p2 = mid.clone().lerp(a.to, a.t);
        card.position.copy(p1.lerp(p2, a.t));
      }
    }
  }
};
