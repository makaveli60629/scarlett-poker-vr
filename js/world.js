// /js/world.js — Scarlett Hybrid World v3.0 (FULL)
// Layout:
//   [BACK ROOM]
//        |
// [LEFT]-O-[RIGHT]
//        |
//   [FRONT ROOM]  (spawn here, facing hub)
// O = Big circular hub (enclosed) with centerpiece table + rails + 4 pillars + neon trims.

export const World = {
  async init(ctx) {
    const { THREE, scene, LOG } = ctx;
    const log  = (m) => LOG?.push?.("log", m)  || console.log(m);
    const warn = (m) => LOG?.push?.("warn", m) || console.warn(m);

    ctx.systems = ctx.systems || {};
    ctx.colliders = ctx.colliders || [];
    ctx.demo = ctx.demo || {};

    // ---------- Materials ----------
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95 });
    const wallMat  = new THREE.MeshStandardMaterial({ color: 0x070912, roughness: 0.78, metalness: 0.12 });

    // "Krylon neon" trim
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

    const feltMat = new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.92, metalness: 0.05 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.6, metalness: 0.2 });

    // ---------- Lights ----------
    scene.add(new THREE.HemisphereLight(0xe8f3ff, 0x101018, 1.35));

    const dir = new THREE.DirectionalLight(0xffffff, 1.65);
    dir.position.set(10, 16, 8);
    scene.add(dir);

    const hubA = new THREE.PointLight(0x7fe7ff, 1.7, 60);
    hubA.position.set(0, 7.5, 0);
    scene.add(hubA);

    const hubB = new THREE.PointLight(0xff2d7a, 1.2, 60);
    hubB.position.set(0, 6.0, -8);
    scene.add(hubB);

    // ---------- Helpers ----------
    const addCollider = (mesh) => {
      mesh.userData.solid = true;
      ctx.colliders.push(mesh);
      scene.add(mesh);
      return mesh;
    };

    const makeFloorBox = (w, d, x, z, y = 0.09) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, d), floorMat);
      m.position.set(x, y, z);
      scene.add(m);
      return m;
    };

    const makeNeonBaseTrim = (w, d, x, z, y = 0.03) => {
      // Thin “edge glow” strip around base of a square room
      const t = 0.08;
      const h = 0.06;
      const gx1 = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), neonCyan);
      const gx2 = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), neonCyan);
      gx1.position.set(x, y, z + d/2);
      gx2.position.set(x, y, z - d/2);
      scene.add(gx1, gx2);

      const gz1 = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), neonCyan);
      const gz2 = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), neonCyan);
      gz1.position.set(x + w/2, y, z);
      gz2.position.set(x - w/2, y, z);
      scene.add(gz1, gz2);
    };

    const makeNeonCornerPillars = (w, d, x, z, wallH) => {
      // vertical neon trims at the four corners
      const p = 0.10;
      const h = wallH;
      const geo = new THREE.BoxGeometry(p, h, p);
      const corners = [
        [x + w/2, z + d/2],
        [x - w/2, z + d/2],
        [x + w/2, z - d/2],
        [x - w/2, z - d/2],
      ];
      for (const [cx, cz] of corners) {
        const m = new THREE.Mesh(geo, neonPink);
        m.position.set(cx, h/2, cz);
        scene.add(m);
      }
    };

    const makeSquareRoom = ({ name, x, z, size, wallH, wallT, door = null }) => {
      // door: { side: "N"|"S"|"E"|"W", width }
      makeFloorBox(size, size, x, z);
      makeNeonBaseTrim(size, size, x, z);
      makeNeonCornerPillars(size, size, x, z, wallH);

      const half = size / 2;
      const doorW = door?.width ?? 3.2;

      function wallSegmentBox(w, h, d, px, py, pz) {
        const mesh = addCollider(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat));
        mesh.position.set(px, py, pz);
        return mesh;
      }

      // Build 4 walls, with optional opening on one side
      // North wall (z + half)
      if (door?.side === "N") {
        const seg = (size - doorW) / 2;
        wallSegmentBox(seg, wallH, wallT, x - (doorW/2 + seg/2), wallH/2, z + half);
        wallSegmentBox(seg, wallH, wallT, x + (doorW/2 + seg/2), wallH/2, z + half);
      } else {
        wallSegmentBox(size + wallT, wallH, wallT, x, wallH/2, z + half);
      }

      // South wall (z - half)
      if (door?.side === "S") {
        const seg = (size - doorW) / 2;
        wallSegmentBox(seg, wallH, wallT, x - (doorW/2 + seg/2), wallH/2, z - half);
        wallSegmentBox(seg, wallH, wallT, x + (doorW/2 + seg/2), wallH/2, z - half);
      } else {
        wallSegmentBox(size + wallT, wallH, wallT, x, wallH/2, z - half);
      }

      // East wall (x + half)
      if (door?.side === "E") {
        const seg = (size - doorW) / 2;
        wallSegmentBox(wallT, wallH, seg, x + half, wallH/2, z - (doorW/2 + seg/2));
        wallSegmentBox(wallT, wallH, seg, x + half, wallH/2, z + (doorW/2 + seg/2));
      } else {
        wallSegmentBox(wallT, wallH, size + wallT, x + half, wallH/2, z);
      }

      // West wall (x - half)
      if (door?.side === "W") {
        const seg = (size - doorW) / 2;
        wallSegmentBox(wallT, wallH, seg, x - half, wallH/2, z - (doorW/2 + seg/2));
        wallSegmentBox(wallT, wallH, seg, x - half, wallH/2, z + (doorW/2 + seg/2));
      } else {
        wallSegmentBox(wallT, wallH, size + wallT, x - half, wallH/2, z);
      }

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x, 0, z);
      scene.add(anchor);

      return anchor;
    };

    const makeCorridor = ({ name, x, z, len, w, yaw, wallH, wallT }) => {
      // yaw in radians; corridor length along forward direction (0,0,1 rotated by yaw)
      makeFloorBox(w, len, x, z);

      const wallGeo = new THREE.BoxGeometry(wallT, wallH, len);
      const left = addCollider(new THREE.Mesh(wallGeo, wallMat));
      const right = addCollider(new THREE.Mesh(wallGeo, wallMat));

      // left/right offset is +/- w/2 in corridor local X
      const side = new THREE.Vector3(Math.cos(yaw + Math.PI/2), 0, Math.sin(yaw + Math.PI/2));
      const leftPos = new THREE.Vector3(x, 0, z).add(side.clone().multiplyScalar(w/2));
      const rightPos = new THREE.Vector3(x, 0, z).add(side.clone().multiplyScalar(-w/2));

      left.position.set(leftPos.x, wallH/2, leftPos.z);
      right.position.set(rightPos.x, wallH/2, rightPos.z);
      left.rotation.y = yaw;
      right.rotation.y = yaw;

      // neon base trims along corridor sides (simple)
      const trimGeo = new THREE.BoxGeometry(0.08, 0.06, len);
      const tl = new THREE.Mesh(trimGeo, neonCyan);
      const tr = new THREE.Mesh(trimGeo, neonCyan);
      tl.position.set(leftPos.x, 0.03, leftPos.z);
      tr.position.set(rightPos.x, 0.03, rightPos.z);
      tl.rotation.y = yaw;
      tr.rotation.y = yaw;
      scene.add(tl, tr);

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x, 0, z);
      scene.add(anchor);
      return anchor;
    };

    const makeHub = ({ radius, wallH, wallT, segments = 36, doorWidth = 4.0 }) => {
      // Hub floor
      const hubFloor = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, 0.22, 96),
        new THREE.MeshStandardMaterial({ color: 0x0a0b12, roughness: 0.5, metalness: 0.15 })
      );
      hubFloor.position.set(0, 0.11, 0);
      hubFloor.name = "HubPlate";
      scene.add(hubFloor);

      // Neon base ring trim (edge of the circle, as you requested)
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.12, 16, 160), neonCyan);
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.set(0, 0.28, 0);
      baseRing.name = "HubNeonBaseRing";
      scene.add(baseRing);

      // Solid circular wall (approximated with many box segments)
      // We leave 4 “door gaps” at +Z (front), -Z (back), +X (right), -X (left).
      const gapHalf = doorWidth / 2;

      for (let i = 0; i < segments; i++) {
        const a0 = (i / segments) * Math.PI * 2;
        const a1 = ((i + 1) / segments) * Math.PI * 2;
        const am = (a0 + a1) / 2;

        // Segment center on ring
        const cx = Math.cos(am) * radius;
        const cz = Math.sin(am) * radius;

        // Check if this segment is within a doorway gap
        // Doorways centered at angles: 0 (+X), 90° (+Z), 180° (-X), 270° (-Z)
        // Convert point to see if it's near axis and within gap
        const nearX = Math.abs(cz) < gapHalf && Math.abs(cx) > radius * 0.6;
        const nearZ = Math.abs(cx) < gapHalf && Math.abs(cz) > radius * 0.6;
        if (nearX || nearZ) continue; // leave opening

        // Segment length approximated
        const segLen = (2 * Math.PI * radius) / segments;

        const wall = addCollider(new THREE.Mesh(
          new THREE.BoxGeometry(wallT, wallH, segLen),
          wallMat
        ));

        wall.position.set(cx, wallH/2, cz);
        wall.rotation.y = -am; // face inward-ish
      }

      // Centerpiece table + rail
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
        new THREE.MeshStandardMaterial({ color: 0x11131c, emissive: 0x132a3a, emissiveIntensity: 0.65 })
      );
      rail.rotation.x = Math.PI / 2;
      rail.position.set(0, 0.68, 0);
      rail.name = "MainRail";
      scene.add(rail);

      // Dealer anchor (for dealing / animations)
      const dealer = new THREE.Object3D();
      dealer.name = "DealerAnchor";
      dealer.position.set(0, 0.92, 1.05);
      scene.add(dealer);

      // 4 Pillars around the table with neon ring lights on top
      const pillarR = 4.9;
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
          neonPink
        );
        ringLight.rotation.x = Math.PI / 2;
        ringLight.position.set(px, 4.15, pz);
        scene.add(ringLight);

        const pl = new THREE.PointLight(k % 2 === 0 ? 0x00ffff : 0xff2d7a, 1.1, 16);
        pl.position.set(px, 4.1, pz);
        scene.add(pl);
      }
    };

    // ---------- Base ground ----------
    const base = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), floorMat);
    base.rotation.x = -Math.PI / 2;
    base.receiveShadow = true;
    scene.add(base);

    // ---------- Geometry plan ----------
    const WALL_H = 3.0;
    const WALL_T = 0.28;

    const HUB_R = 14.0;         // big circle
    const ROOM_S = 14.0;        // big squares
    const CORRIDOR_L = 10.0;
    const CORRIDOR_W = 5.0;

    // Build hub
    makeHub({ radius: HUB_R, wallH: WALL_H, wallT: WALL_T, segments: 48, doorWidth: CORRIDOR_W });

    // Compute room centers
    // front square is +Z of hub, back is -Z, left is -X, right is +X
    const frontZ = HUB_R + CORRIDOR_L + ROOM_S/2;
    const backZ  = -(HUB_R + CORRIDOR_L + ROOM_S/2);
    const leftX  = -(HUB_R + CORRIDOR_L + ROOM_S/2);
    const rightX = (HUB_R + CORRIDOR_L + ROOM_S/2);

    // Rooms (doors face hub)
    makeSquareRoom({ name: "Room_Front", x: 0,      z: frontZ, size: ROOM_S, wallH: WALL_H, wallT: WALL_T, door: { side: "S", width: CORRIDOR_W } });
    makeSquareRoom({ name: "Room_Back",  x: 0,      z: backZ,  size: ROOM_S, wallH: WALL_H, wallT: WALL_T, door: { side: "N", width: CORRIDOR_W } });
    makeSquareRoom({ name: "Room_Left",  x: leftX,  z: 0,      size: ROOM_S, wallH: WALL_H, wallT: WALL_T, door: { side: "E", width: CORRIDOR_W } });
    makeSquareRoom({ name: "Room_Right", x: rightX, z: 0,      size: ROOM_S, wallH: WALL_H, wallT: WALL_T, door: { side: "W", width: CORRIDOR_W } });

    // Corridors between hub and rooms
    makeCorridor({ name: "Corridor_Front", x: 0, z: (HUB_R + CORRIDOR_L/2), len: CORRIDOR_L, w: CORRIDOR_W, yaw: 0,            wallH: WALL_H, wallT: WALL_T }); // along +Z
    makeCorridor({ name: "Corridor_Back",  x: 0, z: -(HUB_R + CORRIDOR_L/2), len: CORRIDOR_L, w: CORRIDOR_W, yaw: 0,           wallH: WALL_H, wallT: WALL_T }); // along -Z (same yaw ok)
    makeCorridor({ name: "Corridor_Left",  x: -(HUB_R + CORRIDOR_L/2), z: 0, len: CORRIDOR_L, w: CORRIDOR_W, yaw: Math.PI/2,   wallH: WALL_H, wallT: WALL_T }); // along -X
    makeCorridor({ name: "Corridor_Right", x: (HUB_R + CORRIDOR_L/2),  z: 0, len: CORRIDOR_L, w: CORRIDOR_W, yaw: Math.PI/2,   wallH: WALL_H, wallT: WALL_T }); // along +X

    // Spawn pad in FRONT room (you’re in the front of the circle)
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

    const spawnPad = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.16, 36), spawnPadMat);
    spawnPad.name = "SpawnPad";
    spawnPad.position.set(0, 0.14, frontZ - 3.0);
    spawnPad.renderOrder = 10;
    scene.add(spawnPad);

    const sp = new THREE.Object3D();
    sp.name = "SpawnPoint";
    sp.position.set(0, 0, frontZ - 3.0);
    // ✅ tell main.js what to face
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

    // Demo bots (2) walking in hub for liveliness
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

    log("[world] v3.0 built ✅ front room -> big hub -> left/right/back rooms (enclosed)");
    log("[world] Neon trims ✅ corners + base + hub ring ✅");
    log("[world] Centerpiece ✅ table + rail + 4 pillars + ring lights ✅");
    log("[world] SpawnPoint ✅ in front room facing hub");

    // If you have extra systems, load them safely (optional)
    async function safeImport(url) {
      try { const m = await import(url); log(`import ok: ${url}`); return m; }
      catch (e) { warn(`import fail: ${url} — ${e?.message || e}`); return null; }
    }

    // (Optional) keep your existing module loaders if you want:
    // const rm = await safeImport("./room_manager.js"); rm?.RoomManager?.init?.(ctx);
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
