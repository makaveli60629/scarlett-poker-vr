// /js/world.js — Scarlett Hybrid World v3.4 (FULL, GRID-ALIGNED)
// Goals:
// ✅ Remove big floors, use grids for perfect alignment
// ✅ Hub entrances actually OPEN (no wall segments blocking)
// ✅ Square doors connect via hallways/corridors into hub doors
// ✅ Everything snapped to grid lines

export const World = {
  async init(ctx) {
    const { THREE, scene, LOG } = ctx;
    const log  = (m) => LOG?.push?.("log", m)  || console.log(m);
    const warn = (m) => LOG?.push?.("warn", m) || console.warn(m);

    ctx.systems = ctx.systems || {};
    ctx.colliders = ctx.colliders || [];
    ctx.demo = ctx.demo || {};

    // =========================
    // GRID SETTINGS (IMPORTANT)
    // =========================
    const GRID = 1.0;           // 1m grid. Change to 0.5 if you want tighter snaps.
    const GRID_Y = 0.005;       // tiny lift so it renders cleanly

    const snap = (v) => Math.round(v / GRID) * GRID;
    const snapV3 = (v3) => (v3.set(snap(v3.x), snap(v3.y), snap(v3.z)), v3);

    // =========================
    // MATERIALS
    // =========================
    const wallMat  = new THREE.MeshStandardMaterial({ color: 0x070912, roughness: 0.78, metalness: 0.12 });

    const neonCyan = new THREE.MeshStandardMaterial({
      color: 0x051018,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 2.1,
      roughness: 0.35,
      metalness: 0.12
    });

    const neonPink = new THREE.MeshStandardMaterial({
      color: 0x12050c,
      emissive: new THREE.Color(0xff2d7a),
      emissiveIntensity: 1.7,
      roughness: 0.35,
      metalness: 0.12
    });

    // Hub trim purple (your request)
    const neonPurple = new THREE.MeshStandardMaterial({
      color: 0x0c0614,
      emissive: new THREE.Color(0x9b5cff),
      emissiveIntensity: 2.0,
      roughness: 0.35,
      metalness: 0.12
    });

    const feltMat = new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.92, metalness: 0.05 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.6, metalness: 0.2 });

    // =========================
    // LIGHTS (BRIGHTER)
    // =========================
    scene.add(new THREE.HemisphereLight(0xe8f3ff, 0x101018, 1.55));

    const dir = new THREE.DirectionalLight(0xffffff, 1.85);
    dir.position.set(12, 18, 10);
    scene.add(dir);

    const hubA = new THREE.PointLight(0x7fe7ff, 1.9, 70);
    hubA.position.set(0, 8.0, 0);
    scene.add(hubA);

    const hubB = new THREE.PointLight(0x9b5cff, 1.5, 70);
    hubB.position.set(0, 7.0, -10);
    scene.add(hubB);

    // =========================
    // HELPERS
    // =========================
    const addCollider = (mesh) => {
      mesh.userData.solid = true;
      ctx.colliders.push(mesh);
      scene.add(mesh);
      return mesh;
    };

    const addGrid = (size, x, z, color = 0x00ffff) => {
      const g = new THREE.GridHelper(size, Math.floor(size / GRID), color, 0x123040);
      g.position.set(snap(x), GRID_Y, snap(z));
      g.material.opacity = 0.35;
      g.material.transparent = true;
      g.name = "GridHelper";
      scene.add(g);
      return g;
    };

    const addNeonTopTrimSquare = (w, d, x, z, y, mat) => {
      const t = 0.08, h = 0.06;
      const gx1 = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), mat);
      const gx2 = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), mat);
      gx1.position.set(x, y, z + d/2);
      gx2.position.set(x, y, z - d/2);
      scene.add(gx1, gx2);

      const gz1 = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), mat);
      const gz2 = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), mat);
      gz1.position.set(x + w/2, y, z);
      gz2.position.set(x - w/2, y, z);
      scene.add(gz1, gz2);
    };

    const makeNeonBaseTrimSquare = (w, d, x, z, y, mat) => {
      const t = 0.08, h = 0.06;
      const gx1 = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), mat);
      const gx2 = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), mat);
      gx1.position.set(x, y, z + d/2);
      gx2.position.set(x, y, z - d/2);
      scene.add(gx1, gx2);

      const gz1 = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), mat);
      const gz2 = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), mat);
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

    function wallSegmentBox(w, h, d, px, py, pz) {
      const mesh = addCollider(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat));
      mesh.position.set(snap(px), py, snap(pz));
      return mesh;
    }

    // =========================
    // ROOM + CORRIDOR BUILDERS
    // =========================
    const makeSquareRoom = ({ name, x, z, size, wallH, wallT, door }) => {
      x = snap(x); z = snap(z);
      size = snap(size);

      // grid instead of floor slab
      addGrid(size + 2, x, z, 0x00ffff);

      // trims (base + top) and corner pillars
      makeNeonBaseTrimSquare(size, size, x, z, 0.03, neonCyan);
      addNeonTopTrimSquare(size, size, x, z, wallH - 0.03, neonPink);
      makeNeonCornerPillars(size, size, x, z, wallH, neonPink);

      const half = size / 2;
      const doorW = snap(door?.width ?? 4.0);
      const seg = (size - doorW) / 2;

      // North (z+)
      if (door?.side === "N") {
        wallSegmentBox(seg, wallH, wallT, x - (doorW/2 + seg/2), wallH/2, z + half);
        wallSegmentBox(seg, wallH, wallT, x + (doorW/2 + seg/2), wallH/2, z + half);
      } else wallSegmentBox(size + wallT, wallH, wallT, x, wallH/2, z + half);

      // South (z-)
      if (door?.side === "S") {
        wallSegmentBox(seg, wallH, wallT, x - (doorW/2 + seg/2), wallH/2, z - half);
        wallSegmentBox(seg, wallH, wallT, x + (doorW/2 + seg/2), wallH/2, z - half);
      } else wallSegmentBox(size + wallT, wallH, wallT, x, wallH/2, z - half);

      // East (x+)
      if (door?.side === "E") {
        wallSegmentBox(wallT, wallH, seg, x + half, wallH/2, z - (doorW/2 + seg/2));
        wallSegmentBox(wallT, wallH, seg, x + half, wallH/2, z + (doorW/2 + seg/2));
      } else wallSegmentBox(wallT, wallH, size + wallT, x + half, wallH/2, z);

      // West (x-)
      if (door?.side === "W") {
        wallSegmentBox(wallT, wallH, seg, x - half, wallH/2, z - (doorW/2 + seg/2));
        wallSegmentBox(wallT, wallH, seg, x - half, wallH/2, z + (doorW/2 + seg/2));
      } else wallSegmentBox(wallT, wallH, size + wallT, x - half, wallH/2, z);

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x, 0, z);
      scene.add(anchor);
      return anchor;
    };

    const makeCorridor = ({ name, x, z, len, w, yaw, wallH, wallT }) => {
      x = snap(x); z = snap(z);
      len = snap(len); w = snap(w);

      addGrid(Math.max(w + 2, len + 2), x, z, 0x7fe7ff);

      // corridor walls: two long walls
      const wallGeo = new THREE.BoxGeometry(wallT, wallH, len);
      const left = addCollider(new THREE.Mesh(wallGeo, wallMat));
      const right = addCollider(new THREE.Mesh(wallGeo, wallMat));

      const side = new THREE.Vector3(Math.cos(yaw + Math.PI/2), 0, Math.sin(yaw + Math.PI/2));
      const leftPos = new THREE.Vector3(x, 0, z).add(side.clone().multiplyScalar(w/2));
      const rightPos = new THREE.Vector3(x, 0, z).add(side.clone().multiplyScalar(-w/2));

      left.position.set(snap(leftPos.x), wallH/2, snap(leftPos.z));
      right.position.set(snap(rightPos.x), wallH/2, snap(rightPos.z));
      left.rotation.y = yaw;
      right.rotation.y = yaw;

      // base neon trims along corridor
      const trimGeo = new THREE.BoxGeometry(0.08, 0.06, len);
      const tl = new THREE.Mesh(trimGeo, neonCyan);
      const tr = new THREE.Mesh(trimGeo, neonCyan);
      tl.position.set(left.position.x, 0.03, left.position.z);
      tr.position.set(right.position.x, 0.03, right.position.z);
      tl.rotation.y = yaw;
      tr.rotation.y = yaw;
      scene.add(tl, tr);

      // TOP trims
      const tl2 = new THREE.Mesh(trimGeo, neonPink);
      const tr2 = new THREE.Mesh(trimGeo, neonPink);
      tl2.position.set(left.position.x, wallH - 0.03, left.position.z);
      tr2.position.set(right.position.x, wallH - 0.03, right.position.z);
      tl2.rotation.y = yaw;
      tr2.rotation.y = yaw;
      scene.add(tl2, tr2);

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x, 0, z);
      scene.add(anchor);
      return anchor;
    };

    // =========================
    // HUB BUILDER (FIXED DOORS)
    // =========================
    const makeHub = ({ radius, wallH, wallT, segments = 64, doorWidth = 5.0 }) => {
      radius = snap(radius);
      doorWidth = snap(doorWidth);

      // grid for hub
      addGrid(radius * 2 + 6, 0, 0, 0x9b5cff);

      // Neon base ring trim (edge of the circle)
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.12, 16, 180), neonPurple);
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.set(0, 0.28, 0);
      baseRing.name = "HubNeonBaseRing";
      scene.add(baseRing);

      // Top ring trim at wall height (ceiling-line glow)
      const topRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.10, 16, 180), neonCyan);
      topRing.rotation.x = Math.PI / 2;
      topRing.position.set(0, wallH - 0.10, 0);
      topRing.name = "HubNeonTopRing";
      scene.add(topRing);

      // Door gaps: compute angular width from linear door width at radius
      const halfAng = Math.asin(Math.min(0.999, (doorWidth / 2) / radius)); // half-angle window

      const doorCenters = [
        0,                 // +X
        Math.PI / 2,       // +Z
        Math.PI,           // -X
        (3 * Math.PI) / 2  // -Z
      ];

      const angDiff = (a, b) => {
        let d = a - b;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        return Math.abs(d);
      };

      const isInDoorGap = (am) => doorCenters.some(c => angDiff(am, c) < halfAng);

      // Circular wall segments (skip door gaps cleanly)
      for (let i = 0; i < segments; i++) {
        const a0 = (i / segments) * Math.PI * 2;
        const a1 = ((i + 1) / segments) * Math.PI * 2;
        const am = (a0 + a1) / 2;

        if (isInDoorGap(am)) continue;

        const cx = Math.cos(am) * radius;
        const cz = Math.sin(am) * radius;

        const segLen = (2 * Math.PI * radius) / segments;

        const wall = addCollider(new THREE.Mesh(
          new THREE.BoxGeometry(wallT, wallH, segLen),
          wallMat
        ));

        wall.position.set(snap(cx), wallH/2, snap(cz));
        wall.rotation.y = -am;
      }

      // Hub anchor for spawn-facing targeting
      const hubPlate = new THREE.Object3D();
      hubPlate.name = "HubPlate";
      hubPlate.position.set(0, 0, 0);
      scene.add(hubPlate);

      // Centerpiece table (with stand)
      const tableTop = new THREE.Mesh(
        new THREE.CylinderGeometry(1.85, 1.85, 0.14, 48),
        feltMat
      );
      tableTop.position.set(0, 0.92, 0);
      tableTop.name = "BossTable";
      scene.add(tableTop);

      const tableStand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.85, 0.85, 24),
        darkMetal
      );
      tableStand.position.set(0, 0.42, 0);
      tableStand.name = "BossTableStand";
      scene.add(tableStand);

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(1.85, 0.09, 16, 120),
        darkMetal
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.set(0, 1.00, 0);
      scene.add(rim);

      // Rail
      const rail = new THREE.Mesh(
        new THREE.TorusGeometry(4.4, 0.12, 12, 160),
        new THREE.MeshStandardMaterial({
          color: 0x11131c,
          emissive: 0x132a3a,
          emissiveIntensity: 0.75
        })
      );
      rail.rotation.x = Math.PI / 2;
      rail.position.set(0, 0.68, 0);
      rail.name = "MainRail";
      scene.add(rail);

      // Ceiling ring above rail (two crayon colors)
      const ceilingRingA = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.10, 16, 200), neonPink);
      ceilingRingA.rotation.x = Math.PI / 2;
      ceilingRingA.position.set(0, wallH - 0.25, 0);
      scene.add(ceilingRingA);

      const ceilingRingB = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.06, 16, 200), neonCyan);
      ceilingRingB.rotation.x = Math.PI / 2;
      ceilingRingB.position.set(0, wallH - 0.38, 0);
      scene.add(ceilingRingB);

      // Dealer anchor
      const dealer = new THREE.Object3D();
      dealer.name = "DealerAnchor";
      dealer.position.set(0, 1.05, 1.05);
      scene.add(dealer);

      // 4 Pillars + ring lights
      const pillarR = 4.9;
      const pillarGeo = new THREE.CylinderGeometry(0.22, 0.28, 4.2, 16);
      for (let k = 0; k < 4; k++) {
        const ang = (k / 4) * Math.PI * 2 + Math.PI / 4;
        const px = snap(Math.cos(ang) * pillarR);
        const pz = snap(Math.sin(ang) * pillarR);

        const pillar = new THREE.Mesh(pillarGeo, darkMetal);
        pillar.position.set(px, 2.1, pz);
        pillar.name = `HubPillar_${k}`;
        scene.add(pillar);

        const ringLight = new THREE.Mesh(
          new THREE.TorusGeometry(0.62, 0.08, 14, 60),
          (k % 2 === 0) ? neonCyan : neonPink
        );
        ringLight.rotation.x = Math.PI / 2;
        ringLight.position.set(px, 4.15, pz);
        scene.add(ringLight);

        const pl = new THREE.PointLight(k % 2 === 0 ? 0x00ffff : 0xff2d7a, 1.15, 18);
        pl.position.set(px, 4.1, pz);
        scene.add(pl);
      }

      // Simple seats (8) around the table for alignment testing
      const seatR = 3.0;
      const chairMat = new THREE.MeshStandardMaterial({ color: 0x0a0b12, roughness: 0.7, metalness: 0.15 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const sx = snap(Math.cos(a) * seatR);
        const sz = snap(Math.sin(a) * seatR);

        const chair = new THREE.Group();
        chair.name = `Chair_${i}`;

        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.10, 0.55), chairMat);
        seat.position.set(0, 0.45, 0);
        chair.add(seat);

        const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.10), chairMat);
        back.position.set(0, 0.75, -0.22);
        chair.add(back);

        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.14, 0.45, 10), chairMat);
        base.position.set(0, 0.22, 0);
        chair.add(base);

        chair.position.set(sx, 0, sz);
        chair.rotation.y = Math.atan2(-sx, -sz);
        scene.add(chair);
      }
    };

    // =========================
    // PLAN DIMENSIONS (SNAPPED)
    // =========================
    const WALL_H = 3.0;
    const WALL_T = 0.28;

    const HUB_R = snap(14.0);           // big hub circle radius
    const ROOM_S = snap(14.0);          // square room size
    const CORRIDOR_L = snap(10.0);
    const CORRIDOR_W = snap(5.0);

    // Build hub with correct openings
    makeHub({ radius: HUB_R, wallH: WALL_H, wallT: WALL_T, segments: 72, doorWidth: CORRIDOR_W });

    // Room centers
    const frontZ = snap(HUB_R + CORRIDOR_L + ROOM_S / 2);
    const backZ  = snap(-(HUB_R + CORRIDOR_L + ROOM_S / 2));
    const leftX  = snap(-(HUB_R + CORRIDOR_L + ROOM_S / 2));
    const rightX = snap((HUB_R + CORRIDOR_L + ROOM_S / 2));

    // Rooms (ONE EXIT EACH, facing hub)
    makeSquareRoom({ name: "Room_Front", x: 0,      z: frontZ, size: ROOM_S, wallH: WALL_H, wallT: WALL_T, door: { side: "S", width: CORRIDOR_W } });
    makeSquareRoom({ name: "Room_Back",  x: 0,      z: backZ,  size: ROOM_S, wallH: WALL_H, wallT: WALL_T, door: { side: "N", width: CORRIDOR_W } });
    makeSquareRoom({ name: "Room_Left",  x: leftX,  z: 0,      size: ROOM_S, wallH: WALL_H, wallT: WALL_T, door: { side: "E", width: CORRIDOR_W } });
    makeSquareRoom({ name: "Room_Right", x: rightX, z: 0,      size: ROOM_S, wallH: WALL_H, wallT: WALL_T, door: { side: "W", width: CORRIDOR_W } });

    // Corridors: Square door -> Hub door (aligned)
    // +Z corridor center is between hub rim and front room
    makeCorridor({ name: "Corridor_Front", x: 0, z: snap(HUB_R + CORRIDOR_L/2), len: CORRIDOR_L, w: CORRIDOR_W, yaw: 0,          wallH: WALL_H, wallT: WALL_T });
    makeCorridor({ name: "Corridor_Back",  x: 0, z: snap(-(HUB_R + CORRIDOR_L/2)), len: CORRIDOR_L, w: CORRIDOR_W, yaw: 0,         wallH: WALL_H, wallT: WALL_T });
    makeCorridor({ name: "Corridor_Left",  x: snap(-(HUB_R + CORRIDOR_L/2)), z: 0, len: CORRIDOR_L, w: CORRIDOR_W, yaw: Math.PI/2, wallH: WALL_H, wallT: WALL_T });
    makeCorridor({ name: "Corridor_Right", x: snap((HUB_R + CORRIDOR_L/2)),  z: 0, len: CORRIDOR_L, w: CORRIDOR_W, yaw: Math.PI/2, wallH: WALL_H, wallT: WALL_T });

    // =========================
    // SPAWN (FRONT ROOM)
    // =========================
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

    const spawnZ = snap(frontZ - 3.0);

    const spawnPad = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.16, 36), spawnPadMat);
    spawnPad.name = "SpawnPad";
    spawnPad.position.set(0, 0.14, spawnZ);
    spawnPad.renderOrder = 10;
    scene.add(spawnPad);

    // SpawnPoint rotation is the source of truth for facing
    const sp = new THREE.Object3D();
    sp.name = "SpawnPoint";
    sp.position.set(0, 0, spawnZ);
    sp.rotation.y = Math.PI; // face "down the corridor" toward hub
    sp.userData.faceTargetName = "HubPlate";
    scene.add(sp);

    // Teleport machine behind spawn (landmark)
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
    tm.position.set(0, 1.1, snap(spawnZ + 4.0));
    scene.add(tm);

    // =========================
    // VIP STATUES (FRONT ROOM)
    // =========================
    const makeStatue = (name, x, z, tint) => {
      const g = new THREE.Group();
      g.name = name;

      const mat = new THREE.MeshStandardMaterial({
        color: tint,
        roughness: 0.55,
        metalness: 0.25,
        flatShading: true,
        emissive: new THREE.Color(tint),
        emissiveIntensity: 0.15
      });

      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.75, 0.35, 18), darkMetal);
      pedestal.position.set(0, 0.18, 0);
      g.add(pedestal);

      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.65, 4, 8), mat);
      torso.position.set(0, 0.95, 0);
      g.add(torso);

      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), mat);
      head.position.set(0, 0.55, 0);
      torso.add(head);

      g.position.set(snap(x), 0, snap(z));
      scene.add(g);
      return g;
    };

    makeStatue("VIP_Statue_A", -4.0, spawnZ + 2.0, 0x7fe7ff);
    makeStatue("VIP_Statue_B",  4.0, spawnZ + 2.0, 0xff2d7a);

    // =========================
    // DEMO BOTS + DEMO DEALING (HUB)
    // =========================
    const makeBot = (name, tint) => {
      const g = new THREE.Group();
      g.name = name;
      const mat = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.7, metalness: 0.05, flatShading: true });

      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 4, 8), mat);
      torso.position.y = 1.15;
      g.add(torso);

      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 1), mat);
      head.position.set(0, 0.45, 0);
      torso.add(head);

      // simple legs
      const legGeo = new THREE.CapsuleGeometry(0.07, 0.42, 4, 6);
      const L = new THREE.Mesh(legGeo, mat);
      const R = new THREE.Mesh(legGeo, mat);
      L.position.set(-0.12, 0.35, 0);
      R.position.set( 0.12, 0.35, 0);
      torso.add(L, R);

      return g;
    };

    ctx.demo.bots = [
      { obj: makeBot("DemoBotA", 0x7fe7ff), t: 0, phase: 0 },
      { obj: makeBot("DemoBotB", 0xff2d7a), t: 0, phase: Math.PI },
    ];
    ctx.demo.bots.forEach((b) => scene.add(b.obj));

    const cardGroup = new THREE.Group();
    cardGroup.name = "DemoCards";
    scene.add(cardGroup);

    ctx.demo.cards = {
      group: cardGroup,
      active: [],
      timer: 0,
      idx: 0,
      deckPos: new THREE.Vector3(0, 1.05, 1.05),
      seatTargets: [
        new THREE.Vector3(-0.55, 0.98, 0.25),
        new THREE.Vector3( 0.55, 0.98, 0.25),
        new THREE.Vector3(-0.55, 0.98,-0.25),
        new THREE.Vector3( 0.55, 0.98,-0.25),
      ]
    };

    log("[world] v3.4 built ✅ GRID mode (no big floors), hub doors OPEN, corridors aligned");
    log("[world] Use grid lines to place everything precisely ✅");
    log("[world] SpawnPoint rotation is authoritative for facing ✅");

    // (Optional) you can still load other systems here with safeImport if needed
  },

  update(ctx, dt) {
    // Demo bots orbit around hub center
    if (ctx.demo?.bots?.length) {
      const r = 6.8;
      for (const b of ctx.demo.bots) {
        b.t += dt * 0.45;
        const ang = b.t + b.phase;
        const x = Math.cos(ang) * r;
        const z = Math.sin(ang) * r;
        b.obj.position.set(x, 0, z);
        b.obj.rotation.y = Math.atan2(-x, -z);
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
          new ctx.THREE.MeshStandardMaterial({
            color: 0xffffff, roughness: 0.35, metalness: 0.0, side: ctx.THREE.DoubleSide
          })
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
