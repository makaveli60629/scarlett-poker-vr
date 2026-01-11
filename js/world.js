// /js/world.js — Scarlett Hybrid World v3.4 (FULL)
// v3.4 adds:
// ✅ fully enclosed exterior (rooms + hub + corridors capped)
// ✅ aligned neon trims (bottom + TOP trims)
// ✅ brighter lighting pass (ceiling ring lights + perimeter)
// ✅ table pedestal (no floating)
// ✅ chairs/seats around table with correct spacing
// ✅ big ring spanning pillars + ceiling ring above rail (two "crayon" neon colors)
// ✅ Spawn faces AWAY from teleport machine (set in SpawnPoint.userData)

export const World = {
  async init(ctx) {
    const { THREE, scene, LOG } = ctx;
    const log  = (m) => LOG?.push?.("log", m)  || console.log(m);
    const warn = (m) => LOG?.push?.("warn", m) || console.warn(m);

    ctx.systems = ctx.systems || {};
    ctx.colliders = ctx.colliders || [];
    ctx.floors = ctx.floors || [];
    ctx.demo = ctx.demo || {};

    // ---------- Materials ----------
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95 });
    const wallMat  = new THREE.MeshStandardMaterial({ color: 0x070912, roughness: 0.78, metalness: 0.12 });

    // neon trims
    const neonCyan = new THREE.MeshStandardMaterial({
      color: 0x051018, emissive: new THREE.Color(0x00ffff), emissiveIntensity: 2.2,
      roughness: 0.35, metalness: 0.15
    });
    const neonPink = new THREE.MeshStandardMaterial({
      color: 0x12050c, emissive: new THREE.Color(0xff2d7a), emissiveIntensity: 2.0,
      roughness: 0.35, metalness: 0.15
    });
    const neonPurple = new THREE.MeshStandardMaterial({
      color: 0x0a0512, emissive: new THREE.Color(0x9b5cff), emissiveIntensity: 2.2,
      roughness: 0.35, metalness: 0.15
    });

    const feltMat = new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.92, metalness: 0.05 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.6, metalness: 0.25 });

    // ---------- Lights (brighter, readable) ----------
    scene.add(new THREE.HemisphereLight(0xe8f3ff, 0x0a0a12, 1.55));

    const dir = new THREE.DirectionalLight(0xffffff, 2.15);
    dir.position.set(12, 18, 10);
    scene.add(dir);

    // hub ambience
    const hubA = new THREE.PointLight(0x7fe7ff, 2.0, 80);
    hubA.position.set(0, 8.2, 0);
    scene.add(hubA);

    const hubB = new THREE.PointLight(0xff2d7a, 1.4, 80);
    hubB.position.set(0, 7.2, -10);
    scene.add(hubB);

    // ---------- Helpers ----------
    const addCollider = (mesh) => {
      mesh.userData.solid = true;
      ctx.colliders.push(mesh);
      scene.add(mesh);
      return mesh;
    };

    const addFloor = (mesh) => {
      mesh.userData.isFloor = true;
      ctx.floors.push(mesh);
      scene.add(mesh);
      return mesh;
    };

    const makeFloorBox = (w, d, x, z, y = 0.09) => {
      const m = addFloor(new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, d), floorMat));
      m.position.set(x, y, z);
      m.name = "FloorBox";
      return m;
    };

    const makeNeonTrimSquare = (w, d, x, z, y, mat) => {
      // Perfectly aligned strip on room footprint edges
      const t = 0.08;
      const h = 0.06;
      const gx1 = new THREE.Mesh(new THREE.BoxGeometry(w + t, h, t), mat);
      const gx2 = new THREE.Mesh(new THREE.BoxGeometry(w + t, h, t), mat);
      gx1.position.set(x, y, z + d/2);
      gx2.position.set(x, y, z - d/2);
      scene.add(gx1, gx2);

      const gz1 = new THREE.Mesh(new THREE.BoxGeometry(t, h, d + t), mat);
      const gz2 = new THREE.Mesh(new THREE.BoxGeometry(t, h, d + t), mat);
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

    const makeSquareRoom = ({ name, x, z, size, wallH, wallT, trimMat, door = null, capOutside = true }) => {
      makeFloorBox(size, size, x, z);

      // bottom + top trims
      makeNeonTrimSquare(size, size, x, z, 0.03, trimMat);
      makeNeonTrimSquare(size, size, x, z, wallH - 0.05, trimMat);
      makeNeonCornerPillars(size, size, x, z, wallH, trimMat);

      const half = size / 2;
      const doorW = door?.width ?? 3.2;

      function wallSeg(w, h, d, px, py, pz) {
        const mesh = addCollider(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat));
        mesh.position.set(px, py, pz);
        return mesh;
      }

      // North wall (z + half)
      if (door?.side === "N") {
        const seg = (size - doorW) / 2;
        wallSeg(seg, wallH, wallT, x - (doorW/2 + seg/2), wallH/2, z + half);
        wallSeg(seg, wallH, wallT, x + (doorW/2 + seg/2), wallH/2, z + half);
      } else {
        wallSeg(size + wallT, wallH, wallT, x, wallH/2, z + half);
      }

      // South wall (z - half)
      if (door?.side === "S") {
        const seg = (size - doorW) / 2;
        wallSeg(seg, wallH, wallT, x - (doorW/2 + seg/2), wallH/2, z - half);
        wallSeg(seg, wallH, wallT, x + (doorW/2 + seg/2), wallH/2, z - half);
      } else {
        wallSeg(size + wallT, wallH, wallT, x, wallH/2, z - half);
      }

      // East wall (x + half)
      if (door?.side === "E") {
        const seg = (size - doorW) / 2;
        wallSeg(wallT, wallH, seg, x + half, wallH/2, z - (doorW/2 + seg/2));
        wallSeg(wallT, wallH, seg, x + half, wallH/2, z + (doorW/2 + seg/2));
      } else {
        wallSeg(wallT, wallH, size + wallT, x + half, wallH/2, z);
      }

      // West wall (x - half)
      if (door?.side === "W") {
        const seg = (size - doorW) / 2;
        wallSeg(wallT, wallH, seg, x - half, wallH/2, z - (doorW/2 + seg/2));
        wallSeg(wallT, wallH, seg, x - half, wallH/2, z + (doorW/2 + seg/2));
      } else {
        wallSeg(wallT, wallH, size + wallT, x - half, wallH/2, z);
      }

      // Optional: ensure NO exterior openings beyond the door (room itself is already sealed)
      if (capOutside) {
        // nothing needed: room has full walls except its one door to corridor.
      }

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x, 0, z);
      scene.add(anchor);
      return anchor;
    };

    const makeCorridor = ({ name, x, z, len, w, yaw, wallH, wallT, trimMat, capEnds = true }) => {
      makeFloorBox(w, len, x, z);

      // side walls
      const wallGeo = new THREE.BoxGeometry(wallT, wallH, len + wallT);
      const left = addCollider(new THREE.Mesh(wallGeo, wallMat));
      const right = addCollider(new THREE.Mesh(wallGeo, wallMat));

      const side = new THREE.Vector3(Math.cos(yaw + Math.PI/2), 0, Math.sin(yaw + Math.PI/2));
      const leftPos = new THREE.Vector3(x, 0, z).add(side.clone().multiplyScalar(w/2));
      const rightPos = new THREE.Vector3(x, 0, z).add(side.clone().multiplyScalar(-w/2));

      left.position.set(leftPos.x, wallH/2, leftPos.z);
      right.position.set(rightPos.x, wallH/2, rightPos.z);
      left.rotation.y = yaw;
      right.rotation.y = yaw;

      // bottom + top trims (corridor)
      const trimGeo = new THREE.BoxGeometry(0.08, 0.06, len);
      const tl = new THREE.Mesh(trimGeo, trimMat);
      const tr = new THREE.Mesh(trimGeo, trimMat);
      tl.position.set(leftPos.x, 0.03, leftPos.z);
      tr.position.set(rightPos.x, 0.03, rightPos.z);
      tl.rotation.y = yaw;
      tr.rotation.y = yaw;
      scene.add(tl, tr);

      const ttl = new THREE.Mesh(trimGeo, trimMat);
      const ttr = new THREE.Mesh(trimGeo, trimMat);
      ttl.position.set(leftPos.x, wallH - 0.05, leftPos.z);
      ttr.position.set(rightPos.x, wallH - 0.05, rightPos.z);
      ttl.rotation.y = yaw;
      ttr.rotation.y = yaw;
      scene.add(ttl, ttr);

      // cap both ends so there are NO “outside leaks”
      if (capEnds) {
        const capGeo = new THREE.BoxGeometry(w + wallT, wallH, wallT);
        const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        const endA = new THREE.Vector3(x, 0, z).add(fwd.clone().multiplyScalar(len/2));
        const endB = new THREE.Vector3(x, 0, z).add(fwd.clone().multiplyScalar(-len/2));

        const capA = addCollider(new THREE.Mesh(capGeo, wallMat));
        const capB = addCollider(new THREE.Mesh(capGeo, wallMat));
        capA.position.set(endA.x, wallH/2, endA.z);
        capB.position.set(endB.x, wallH/2, endB.z);
        capA.rotation.y = yaw;
        capB.rotation.y = yaw;
      }

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x, 0, z);
      scene.add(anchor);
      return anchor;
    };

    const makeHub = ({ radius, wallH, wallT, segments = 48, doorWidth = 5.0 }) => {
      // Hub floor
      const hubFloor = addFloor(new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, 0.22, 120),
        new THREE.MeshStandardMaterial({ color: 0x0a0b12, roughness: 0.55, metalness: 0.18 })
      ));
      hubFloor.position.set(0, 0.11, 0);
      hubFloor.name = "HubPlate";

      // Neon base ring trim (aligned)
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.12, 16, 200), neonPurple);
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.set(0, 0.28, 0);
      baseRing.name = "HubNeonBaseRing";
      scene.add(baseRing);

      // Circular wall with 4 internal doors (to corridors) ONLY
      const gapHalf = doorWidth / 2;
      for (let i = 0; i < segments; i++) {
        const a0 = (i / segments) * Math.PI * 2;
        const a1 = ((i + 1) / segments) * Math.PI * 2;
        const am = (a0 + a1) / 2;

        const cx = Math.cos(am) * radius;
        const cz = Math.sin(am) * radius;

        // Door gaps on axes
        const nearX = Math.abs(cz) < gapHalf && Math.abs(cx) > radius * 0.6;
        const nearZ = Math.abs(cx) < gapHalf && Math.abs(cz) > radius * 0.6;
        if (nearX || nearZ) continue;

        const segLen = (2 * Math.PI * radius) / segments;
        const wall = addCollider(new THREE.Mesh(
          new THREE.BoxGeometry(wallT, wallH, segLen + 0.05),
          wallMat
        ));
        wall.position.set(cx, wallH/2, cz);
        wall.rotation.y = -am;
      }

      // Add TOP trim ring (ceiling edge of hub wall)
      const topRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.08, 12, 220), neonPurple);
      topRing.rotation.x = Math.PI / 2;
      topRing.position.set(0, wallH - 0.02, 0);
      scene.add(topRing);

      // Center table (felt)
      const table = new THREE.Mesh(
        new THREE.CylinderGeometry(1.85, 1.85, 0.14, 64),
        feltMat
      );
      table.position.set(0, 0.78, 0);
      table.name = "BossTable";
      scene.add(table);

      // Table pedestal (no floating)
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.75, 0.78, 32),
        darkMetal
      );
      pedestal.position.set(0, 0.39, 0);
      pedestal.name = "TablePedestal";
      scene.add(pedestal);

      // Rim
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(1.85, 0.09, 16, 140),
        darkMetal
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.set(0, 0.86, 0);
      scene.add(rim);

      // Rail
      const rail = new THREE.Mesh(
        new THREE.TorusGeometry(4.4, 0.10, 12, 180),
        new THREE.MeshStandardMaterial({
          color: 0x11131c,
          emissive: new THREE.Color(0x132a3a),
          emissiveIntensity: 0.85
        })
      );
      rail.rotation.x = Math.PI / 2;
      rail.position.set(0, 0.68, 0);
      rail.name = "MainRail";
      scene.add(rail);

      // Ceiling ring directly above rail (two crayon colors)
      const ringA = new THREE.Mesh(new THREE.TorusGeometry(4.55, 0.10, 14, 200), neonCyan);
      ringA.rotation.x = Math.PI / 2;
      ringA.position.set(0, wallH - 0.25, 0);
      scene.add(ringA);

      const ringB = new THREE.Mesh(new THREE.TorusGeometry(4.25, 0.08, 14, 200), neonPink);
      ringB.rotation.x = Math.PI / 2;
      ringB.position.set(0, wallH - 0.25, 0);
      scene.add(ringB);

      // Dealer anchor
      const dealer = new THREE.Object3D();
      dealer.name = "DealerAnchor";
      dealer.position.set(0, 0.92, 1.05);
      scene.add(dealer);

      // 4 Pillars + BIG spanning ring
      const pillarR = 4.9;
      const pillarGeo = new THREE.CylinderGeometry(0.22, 0.28, 4.2, 16);

      const pillarPositions = [];
      for (let k = 0; k < 4; k++) {
        const ang = (k / 4) * Math.PI * 2 + Math.PI / 4;
        const px = Math.cos(ang) * pillarR;
        const pz = Math.sin(ang) * pillarR;
        pillarPositions.push([px, pz]);

        const pillar = new THREE.Mesh(pillarGeo, darkMetal);
        pillar.position.set(px, 2.1, pz);
        pillar.name = `HubPillar_${k}`;
        scene.add(pillar);

        const pl = new THREE.PointLight(k % 2 === 0 ? 0x00ffff : 0xff2d7a, 1.35, 18);
        pl.position.set(px, 4.1, pz);
        scene.add(pl);
      }

      // Big ring spanning pillars (crayon neon)
      const bigRing1 = new THREE.Mesh(new THREE.TorusGeometry(5.35, 0.12, 16, 240), neonCyan);
      bigRing1.rotation.x = Math.PI / 2;
      bigRing1.position.set(0, 4.25, 0);
      scene.add(bigRing1);

      const bigRing2 = new THREE.Mesh(new THREE.TorusGeometry(5.05, 0.10, 16, 240), neonPink);
      bigRing2.rotation.x = Math.PI / 2;
      bigRing2.position.set(0, 4.25, 0);
      scene.add(bigRing2);

      // Seats (8 chairs) spaced outside the rail
      const seatCount = 8;
      const seatR = 5.9; // outside rail (4.4) + clearance
      const chair = (i) => {
        const g = new THREE.Group();
        g.name = `Chair_${i}`;

        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.08, 12), darkMetal);
        base.position.y = 0.04;
        g.add(base);

        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.42, 10), darkMetal);
        post.position.y = 0.29;
        g.add(post);

        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), new THREE.MeshStandardMaterial({ color: 0x0d0f18, roughness: 0.7 }));
        seat.position.y = 0.52;
        g.add(seat);

        const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.52, 0.10), new THREE.MeshStandardMaterial({ color: 0x101322, roughness: 0.7 }));
        back.position.set(0, 0.82, -0.23);
        g.add(back);

        return g;
      };

      for (let i = 0; i < seatCount; i++) {
        const ang = (i / seatCount) * Math.PI * 2;
        const x = Math.cos(ang) * seatR;
        const z = Math.sin(ang) * seatR;

        const c = chair(i);
        c.position.set(x, 0, z);
        // face toward center table
        c.rotation.y = Math.atan2(-x, -z);
        scene.add(c);
      }

      // Small ceiling lights to brighten “dark corners”
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const lx = Math.cos(a) * (radius - 2.0);
        const lz = Math.sin(a) * (radius - 2.0);
        const p = new THREE.PointLight(0x7fe7ff, 0.35, 18);
        p.position.set(lx, wallH - 0.4, lz);
        scene.add(p);
      }
    };

    // ---------- Base ground ----------
    const base = addFloor(new THREE.Mesh(new THREE.PlaneGeometry(260, 260), floorMat));
    base.rotation.x = -Math.PI / 2;
    base.name = "BaseFloor";

    // ---------- Geometry plan ----------
    const WALL_H = 3.0;
    const WALL_T = 0.28;

    const HUB_R = 14.0;
    const ROOM_S = 14.0;
    const CORRIDOR_L = 10.0;
    const CORRIDOR_W = 5.0;

    // Build hub
    makeHub({ radius: HUB_R, wallH: WALL_H, wallT: WALL_T, segments: 56, doorWidth: CORRIDOR_W });

    // Room centers
    const frontZ = HUB_R + CORRIDOR_L + ROOM_S/2;
    const backZ  = -(HUB_R + CORRIDOR_L + ROOM_S/2);
    const leftX  = -(HUB_R + CORRIDOR_L + ROOM_S/2);
    const rightX = (HUB_R + CORRIDOR_L + ROOM_S/2);

    // Rooms (different trim colors per room)
    makeSquareRoom({ name: "Room_Front", x: 0,      z: frontZ, size: ROOM_S, wallH: WALL_H, wallT: WALL_T, trimMat: neonCyan,   door: { side: "S", width: CORRIDOR_W } });
    makeSquareRoom({ name: "Room_Back",  x: 0,      z: backZ,  size: ROOM_S, wallH: WALL_H, wallT: WALL_T, trimMat: neonPink,   door: { side: "N", width: CORRIDOR_W } });
    makeSquareRoom({ name: "Room_Left",  x: leftX,  z: 0,      size: ROOM_S, wallH: WALL_H, wallT: WALL_T, trimMat: neonCyan,   door: { side: "E", width: CORRIDOR_W } });
    makeSquareRoom({ name: "Room_Right", x: rightX, z: 0,      size: ROOM_S, wallH: WALL_H, wallT: WALL_T, trimMat: neonPink,   door: { side: "W", width: CORRIDOR_W } });

    // Corridors (trim purple, capped ends to prevent outside holes)
    makeCorridor({ name: "Corridor_Front", x: 0, z: (HUB_R + CORRIDOR_L/2), len: CORRIDOR_L, w: CORRIDOR_W, yaw: 0,          wallH: WALL_H, wallT: WALL_T, trimMat: neonPurple, capEnds: true });
    makeCorridor({ name: "Corridor_Back",  x: 0, z: -(HUB_R + CORRIDOR_L/2), len: CORRIDOR_L, w: CORRIDOR_W, yaw: 0,         wallH: WALL_H, wallT: WALL_T, trimMat: neonPurple, capEnds: true });
    makeCorridor({ name: "Corridor_Left",  x: -(HUB_R + CORRIDOR_L/2), z: 0, len: CORRIDOR_L, w: CORRIDOR_W, yaw: Math.PI/2, wallH: WALL_H, wallT: WALL_T, trimMat: neonPurple, capEnds: true });
    makeCorridor({ name: "Corridor_Right", x: (HUB_R + CORRIDOR_L/2),  z: 0, len: CORRIDOR_L, w: CORRIDOR_W, yaw: Math.PI/2, wallH: WALL_H, wallT: WALL_T, trimMat: neonPurple, capEnds: true });

    // Spawn pad in FRONT room
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

    const spawnPad = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.16, 36), spawnPadMat);
    spawnPad.name = "SpawnPad";
    spawnPad.position.set(0, 0.14, frontZ - 3.0);
    scene.add(spawnPad);

    const sp = new THREE.Object3D();
    sp.name = "SpawnPoint";
    sp.position.set(0, 0, frontZ - 3.0);
    sp.userData.faceTargetName = "HubPlate";
    sp.userData.faceAwayFromName = "TeleportMachineFallback"; // ✅ main.js uses this to face opposite
    scene.add(sp);

    // Teleport machine behind spawn (moved back more, not blocking)
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
    tm.position.set(0, 1.1, (frontZ - 3.0) + 4.2);
    scene.add(tm);

    // VIP statues on pedestals in spawn room (2)
    const makeVIP = (name, x, z, tint) => {
      const g = new THREE.Group();
      g.name = name;
      const mat = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.7, metalness: 0.05, flatShading: true });

      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.28, 20), darkMetal);
      ped.position.set(x, 0.14, z);
      scene.add(ped);

      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.62, 4, 8), mat);
      torso.position.set(x, 1.15, z);
      g.add(torso);

      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 1), mat);
      head.position.set(0, 0.48, 0);
      torso.add(head);

      scene.add(g);
    };

    makeVIP("VIP_StatueA", -3.2, frontZ - 6.2, 0x7fe7ff);
    makeVIP("VIP_StatueB",  3.2, frontZ - 6.2, 0xff2d7a);

    log("[world] v3.4 built ✅ enclosed + aligned trims (bottom/top) + brighter hub + table pedestal + chairs + ceiling rings");
  },

  update(ctx, dt) {
    // keep your existing demo systems if you want; leaving update minimal for stability.
  }
};
