// /js/world.js — Scarlett Hybrid World v4.3 (FULL)
// FIXES:
// ✅ Hallways are REAL + sealed (no outside leaks)
// ✅ Hub entrances are open + centered + single opening
// ✅ Hub walls are 2x taller (elegant grand room)
// ✅ Table pit is DOWN + now has a PIT LIP RAIL (safety rail at top edge)
// ✅ 8-player grand table + trims + visible rail
// ✅ 3 seated bots + 3 wandering bots
// ✅ VIP spawn moved back ~3 grid blocks + floating Welcome HUD

export const World = {
  async init(ctx) {
    const { THREE, scene, LOG } = ctx;
    ctx.worldVersion = "v4.3";

    const log  = (m) => LOG?.push?.("log", m)  || console.log(m);
    const warn = (m) => LOG?.push?.("warn", m) || console.warn(m);

    // -------------------------
    // Materials
    // -------------------------
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0a0b12, roughness: 0.78, metalness: 0.12 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.55, metalness: 0.22 });
    const feltMat   = new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.92, metalness: 0.05 });

    const neon = (hex, intensity = 2.0) =>
      new THREE.MeshStandardMaterial({
        color: 0x05060a,
        emissive: new THREE.Color(hex),
        emissiveIntensity: intensity,
        roughness: 0.35,
        metalness: 0.15
      });

    const trimHub  = neon(0x9b5cff, 2.25);
    const trimCyan = neon(0x00ffff, 2.0);
    const trimPink = neon(0xff2d7a, 1.95);
    const trimGold = neon(0xffd36b, 1.85);

    // -------------------------
    // GRID ONLY
    // -------------------------
    const grid = new THREE.GridHelper(200, 200, 0x2b8cff, 0x14213a);
    grid.position.y = 0.001;
    scene.add(grid);

    // -------------------------
    // Lighting (world-side “grand room”)
    // -------------------------
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a3a, 1.35));

    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(50, 90, 60);
    scene.add(sun);

    // Hub “ceiling” ring lights (no ceiling mesh, just lights)
    const hubLightR = 11.0;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = Math.cos(a) * hubLightR;
      const z = Math.sin(a) * hubLightR;

      const pl = new THREE.PointLight(0xffffff, 1.6, 80);
      pl.position.set(x, 8.5, z);
      scene.add(pl);

      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 14), neon(0x00ffff, 1.2));
      bead.position.copy(pl.position);
      scene.add(bead);
    }

    // Accent colors
    const accentA = new THREE.PointLight(0x9b5cff, 1.5, 70); accentA.position.set(0, 7.5, 0); scene.add(accentA);
    const accentB = new THREE.PointLight(0x00ffff, 1.2, 70); accentB.position.set(-12, 6.5, 0); scene.add(accentB);
    const accentC = new THREE.PointLight(0xff2d7a, 1.2, 70); accentC.position.set( 12, 6.5, 0); scene.add(accentC);
    const accentD = new THREE.PointLight(0xffd36b, 1.0, 70); accentD.position.set(0, 6.0, -12); scene.add(accentD);

    // -------------------------
    // Layout constants (grid aligned)
    // -------------------------
    const WALL_H_ROOM = 3.0;
    const WALL_H_HUB  = 6.0;      // ✅ “twice as big” hub walls
    const WALL_T = 0.28;

    const HUB_R = 14.0;
    const ROOM_S = 14.0;
    const CORRIDOR_L = 10.0;
    const CORRIDOR_W = 5.0;

    // Room centers
    const frontZ = HUB_R + CORRIDOR_L + ROOM_S / 2; // 31
    const backZ  = -(HUB_R + CORRIDOR_L + ROOM_S / 2);
    const leftX  = -(HUB_R + CORRIDOR_L + ROOM_S / 2);
    const rightX = (HUB_R + CORRIDOR_L + ROOM_S / 2);

    // Corridor spans (axis-aligned)
    const zHubFront =  HUB_R;               // hub boundary front (+Z)
    const zHubBack  = -HUB_R;
    const zRoomDoorFront = frontZ - ROOM_S/2; // 24
    const zRoomDoorBack  = backZ + ROOM_S/2;

    const xHubRight =  HUB_R;
    const xHubLeft  = -HUB_R;
    const xRoomDoorRight = rightX - ROOM_S/2;
    const xRoomDoorLeft  = leftX + ROOM_S/2;

    // Collider list optional
    ctx.colliders = ctx.colliders || [];
    const addCollider = (m) => { m.userData.solid = true; ctx.colliders.push(m); scene.add(m); return m; };

    // Trims for straight spans
    function addSpanTrim({ x, z, len, yaw, mat, yBottom, yTop }) {
      const geo = new THREE.BoxGeometry(0.10, 0.06, len);
      const b = new THREE.Mesh(geo, mat);
      const t = new THREE.Mesh(geo, mat);
      b.position.set(x, yBottom, z);
      t.position.set(x, yTop, z);
      b.rotation.y = yaw;
      t.rotation.y = yaw;
      scene.add(b, t);
    }

    // Canvas label
    function makeNeonLabel(text, pos, colorHex = "#00ffff", scale = 1.0) {
      const canvas = document.createElement("canvas");
      canvas.width = 768;
      canvas.height = 192;
      const g = canvas.getContext("2d");

      g.clearRect(0,0,768,192);
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.fillRect(0,0,768,192);

      g.font = "900 86px system-ui,Segoe UI,Arial";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = colorHex;
      g.shadowColor = colorHex;
      g.shadowBlur = 22;
      g.fillText(text, 384, 105);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;

      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6.2 * scale, 1.55 * scale), mat);
      mesh.position.copy(pos);
      scene.add(mesh);
      return mesh;
    }

    // -------------------------
    // HUB WALL (circle segments with 4 openings)
    // -------------------------
    const segments = 72;
    const segLen = (2 * Math.PI * HUB_R) / segments;
    const halfDoorAngle = (CORRIDOR_W / HUB_R) * 0.62; // tuned

    const doorAngles = [
      Math.PI/2,       // +Z (front)
      3*Math.PI/2,     // -Z (back)
      Math.PI,         // -X (left)
      0                // +X (right)
    ];

    const angleDiff = (a, b) => {
      let d = a - b;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return Math.abs(d);
    };

    for (let i = 0; i < segments; i++) {
      const am = ((i + 0.5) / segments) * Math.PI * 2;

      let inDoor = false;
      for (const da of doorAngles) {
        if (angleDiff(am, da) < halfDoorAngle) { inDoor = true; break; }
      }
      if (inDoor) continue;

      const cx = Math.cos(am) * HUB_R;
      const cz = Math.sin(am) * HUB_R;

      const wall = addCollider(new THREE.Mesh(
        new THREE.BoxGeometry(WALL_T, WALL_H_HUB, segLen),
        wallMat
      ));
      wall.position.set(cx, WALL_H_HUB/2, cz);
      wall.rotation.y = -am;

      // hub trims bottom + top
      addSpanTrim({ x: cx, z: cz, len: segLen, yaw: -am, mat: trimHub, yBottom: 0.03, yTop: WALL_H_HUB - 0.05 });
    }

    // Hub base ring (visual)
    const baseRing = new THREE.Mesh(new THREE.TorusGeometry(HUB_R, 0.13, 16, 180), trimHub);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.set(0, 0.08, 0);
    scene.add(baseRing);

    // Hub center anchor
    const hubCenter = new THREE.Object3D();
    hubCenter.name = "HubCenter";
    hubCenter.position.set(0, 0, 0);
    scene.add(hubCenter);

    // -------------------------
    // SUNK PIT + LIP RAIL (your request)
    // -------------------------
    const pitR = 6.9;
    const pitH = 1.55;

    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitR, pitR, pitH, 72, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.75, metalness: 0.10, side: THREE.DoubleSide })
    );
    pitWall.position.set(0, -pitH/2, 0);
    scene.add(pitWall);

    const pitFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(pitR - 0.25, pitR - 0.25, 0.08, 72),
      new THREE.MeshStandardMaterial({ color: 0x070912, roughness: 0.95 })
    );
    pitFloor.position.set(0, -pitH + 0.02, 0);
    scene.add(pitFloor);

    // ✅ Safety rail at the TOP LIP of the pit
    const pitLipRail = new THREE.Mesh(
      new THREE.TorusGeometry(pitR + 0.35, 0.11, 14, 160),
      neon(0x00ffff, 1.25)
    );
    pitLipRail.rotation.x = Math.PI / 2;
    pitLipRail.position.set(0, 0.22, 0);
    pitLipRail.name = "PitLipRail";
    scene.add(pitLipRail);

    // -------------------------
    // GRAND 8-PLAYER TABLE (bigger, elegant)
    // -------------------------
    const tableR = 2.65;
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(tableR, tableR, 0.16, 64),
      feltMat
    );
    table.position.set(0, -0.58, 0);
    table.name = "BossTable";
    scene.add(table);

    const tableBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 1.05, 0.85, 28),
      darkMetal
    );
    tableBase.position.set(0, -1.00, 0);
    scene.add(tableBase);

    // Table rim trim
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(tableR, 0.10, 16, 140),
      neon(0x9b5cff, 0.95)
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, -0.48, 0);
    scene.add(rim);

    // Main rail inside the pit (keeps people from entering)
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(5.05, 0.11, 12, 160),
      new THREE.MeshStandardMaterial({ color: 0x0e1018, emissive: 0x18344a, emissiveIntensity: 1.0 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.set(0, -0.72, 0);
    rail.name = "MainRail";
    scene.add(rail);

    // Dealer anchor (down)
    const dealer = new THREE.Object3D();
    dealer.name = "DealerAnchor";
    dealer.position.set(0, -0.45, tableR * 0.65);
    scene.add(dealer);

    // -------------------------
    // CORRIDORS (sealed boxes: no outside leaks)
    // Each corridor has two side walls + two outer connector walls (cheeks)
    // -------------------------
    function makeCorridorZ(zFrom, zTo, trimMat) {
      // side walls at x = ±CORRIDOR_W/2
      const len = Math.abs(zTo - zFrom);
      const midZ = (zFrom + zTo) / 2;

      const wallGeo = new THREE.BoxGeometry(WALL_T, WALL_H_ROOM, len);
      const wl = addCollider(new THREE.Mesh(wallGeo, wallMat));
      const wr = addCollider(new THREE.Mesh(wallGeo, wallMat));

      wl.position.set( CORRIDOR_W/2, WALL_H_ROOM/2, midZ);
      wr.position.set(-CORRIDOR_W/2, WALL_H_ROOM/2, midZ);

      // trims
      addSpanTrim({ x:  CORRIDOR_W/2, z: midZ, len, yaw: 0, mat: trimMat, yBottom: 0.03, yTop: WALL_H_ROOM - 0.05 });
      addSpanTrim({ x: -CORRIDOR_W/2, z: midZ, len, yaw: 0, mat: trimMat, yBottom: 0.03, yTop: WALL_H_ROOM - 0.05 });

      // cheeks near hub seam to hide outside
      const cheekLen = 3.4;
      const cheekGeo = new THREE.BoxGeometry(WALL_T, WALL_H_ROOM, cheekLen);

      const zCheek = zFrom; // near hub
      const cl = addCollider(new THREE.Mesh(cheekGeo, wallMat));
      const cr = addCollider(new THREE.Mesh(cheekGeo, wallMat));

      cl.position.set( CORRIDOR_W/2 + 0.55, WALL_H_ROOM/2, zCheek);
      cr.position.set(-CORRIDOR_W/2 - 0.55, WALL_H_ROOM/2, zCheek);
    }

    function makeCorridorX(xFrom, xTo, trimMat) {
      const len = Math.abs(xTo - xFrom);
      const midX = (xFrom + xTo) / 2;

      const wallGeo = new THREE.BoxGeometry(len, WALL_H_ROOM, WALL_T);
      const wt = addCollider(new THREE.Mesh(wallGeo, wallMat));
      const wb = addCollider(new THREE.Mesh(wallGeo, wallMat));

      wt.position.set(midX, WALL_H_ROOM/2,  CORRIDOR_W/2);
      wb.position.set(midX, WALL_H_ROOM/2, -CORRIDOR_W/2);

      // trims
      // yaw = PI/2 for spans along X
      addSpanTrim({ x: midX, z:  CORRIDOR_W/2, len, yaw: Math.PI/2, mat: trimMat, yBottom: 0.03, yTop: WALL_H_ROOM - 0.05 });
      addSpanTrim({ x: midX, z: -CORRIDOR_W/2, len, yaw: Math.PI/2, mat: trimMat, yBottom: 0.03, yTop: WALL_H_ROOM - 0.05 });

      // cheeks near hub seam
      const cheekLen = 3.4;
      const cheekGeo = new THREE.BoxGeometry(cheekLen, WALL_H_ROOM, WALL_T);

      const xCheek = xFrom; // near hub
      const ct = addCollider(new THREE.Mesh(cheekGeo, wallMat));
      const cb = addCollider(new THREE.Mesh(cheekGeo, wallMat));

      ct.position.set(xCheek, WALL_H_ROOM/2,  CORRIDOR_W/2 + 0.55);
      cb.position.set(xCheek, WALL_H_ROOM/2, -CORRIDOR_W/2 - 0.55);
    }

    // Front corridor: from hub +Z edge to front room door
    makeCorridorZ(zHubFront, zRoomDoorFront, trimHub);
    // Back corridor
    makeCorridorZ(zHubBack, zRoomDoorBack, trimHub);
    // Left corridor
    makeCorridorX(xHubLeft, xRoomDoorLeft, trimHub);
    // Right corridor
    makeCorridorX(xHubRight, xRoomDoorRight, trimHub);

    // -------------------------
    // ROOMS (walls only, door facing hub)
    // -------------------------
    function makeSquareRoom({ x, z, doorSide, trimMat }) {
      const half = ROOM_S / 2;
      const doorW = CORRIDOR_W;

      const wallSeg = (w, h, d, px, py, pz) => {
        const m = addCollider(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat));
        m.position.set(px, py, pz);
        return m;
      };

      // North (+Z)
      if (doorSide === "N") {
        const seg = (ROOM_S - doorW) / 2;
        wallSeg(seg, WALL_H_ROOM, WALL_T, x - (doorW/2 + seg/2), WALL_H_ROOM/2, z + half);
        wallSeg(seg, WALL_H_ROOM, WALL_T, x + (doorW/2 + seg/2), WALL_H_ROOM/2, z + half);
      } else {
        wallSeg(ROOM_S + WALL_T, WALL_H_ROOM, WALL_T, x, WALL_H_ROOM/2, z + half);
      }

      // South (-Z)
      if (doorSide === "S") {
        const seg = (ROOM_S - doorW) / 2;
        wallSeg(seg, WALL_H_ROOM, WALL_T, x - (doorW/2 + seg/2), WALL_H_ROOM/2, z - half);
        wallSeg(seg, WALL_H_ROOM, WALL_T, x + (doorW/2 + seg/2), WALL_H_ROOM/2, z - half);
      } else {
        wallSeg(ROOM_S + WALL_T, WALL_H_ROOM, WALL_T, x, WALL_H_ROOM/2, z - half);
      }

      // East (+X)
      if (doorSide === "E") {
        const seg = (ROOM_S - doorW) / 2;
        wallSeg(WALL_T, WALL_H_ROOM, seg, x + half, WALL_H_ROOM/2, z - (doorW/2 + seg/2));
        wallSeg(WALL_T, WALL_H_ROOM, seg, x + half, WALL_H_ROOM/2, z + (doorW/2 + seg/2));
      } else {
        wallSeg(WALL_T, WALL_H_ROOM, ROOM_S + WALL_T, x + half, WALL_H_ROOM/2, z);
      }

      // West (-X)
      if (doorSide === "W") {
        const seg = (ROOM_S - doorW) / 2;
        wallSeg(WALL_T, WALL_H_ROOM, seg, x - half, WALL_H_ROOM/2, z - (doorW/2 + seg/2));
        wallSeg(WALL_T, WALL_H_ROOM, seg, x - half, WALL_H_ROOM/2, z + (doorW/2 + seg/2));
      } else {
        wallSeg(WALL_T, WALL_H_ROOM, ROOM_S + WALL_T, x - half, WALL_H_ROOM/2, z);
      }

      // trims around room perimeter (bottom + top)
      addSpanTrim({ x, z: z + half, len: ROOM_S, yaw: 0, mat: trimMat, yBottom: 0.03, yTop: WALL_H_ROOM - 0.05 });
      addSpanTrim({ x, z: z - half, len: ROOM_S, yaw: 0, mat: trimMat, yBottom: 0.03, yTop: WALL_H_ROOM - 0.05 });
      addSpanTrim({ x: x + half, z, len: ROOM_S, yaw: Math.PI/2, mat: trimMat, yBottom: 0.03, yTop: WALL_H_ROOM - 0.05 });
      addSpanTrim({ x: x - half, z, len: ROOM_S, yaw: Math.PI/2, mat: trimMat, yBottom: 0.03, yTop: WALL_H_ROOM - 0.05 });
    }

    // Front room = VIP spawn
    makeSquareRoom({ x: 0, z: frontZ, doorSide: "S", trimMat: trimCyan });
    makeSquareRoom({ x: 0, z: backZ,  doorSide: "N", trimMat: trimGold });
    makeSquareRoom({ x: leftX,  z: 0,  doorSide: "E", trimMat: trimCyan });
    makeSquareRoom({ x: rightX, z: 0,  doorSide: "W", trimMat: trimPink });

    // Hub wall labels (higher, because hub walls are taller)
    makeNeonLabel("VIP",   new THREE.Vector3(0, 4.7, HUB_R - 0.8), "#ff2d7a");
    makeNeonLabel("EVENT", new THREE.Vector3(0, 4.7, -(HUB_R - 0.8)), "#ffcc66");
    makeNeonLabel("STORE", new THREE.Vector3(-(HUB_R - 0.8), 4.7, 0), "#00ffff");
    makeNeonLabel("POKER", new THREE.Vector3((HUB_R - 0.8), 4.7, 0), "#9b5cff");

    // -------------------------
    // Spawn moved back ~3 grid blocks (your request)
    // -------------------------
    const spawnZ = frontZ + 3.0; // ✅ moved back 3 “blocks” deeper into VIP room
    const spawnPoint = new THREE.Object3D();
    spawnPoint.name = "SpawnPoint";
    spawnPoint.position.set(0, 0, spawnZ);
    spawnPoint.userData.faceTargetName = "BossTable";
    scene.add(spawnPoint);

    const spawnPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.06, 36),
      neon(0x00ffff, 1.2)
    );
    spawnPad.name = "SpawnPad";
    spawnPad.position.set(0, 0.03, spawnZ);
    scene.add(spawnPad);

    // Teleporter behind spawn (so you never spawn facing it)
    const teleporter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 2.2, 22),
      new THREE.MeshStandardMaterial({
        color: 0x090b14,
        emissive: new THREE.Color(0x9b5cff),
        emissiveIntensity: 1.6,
        roughness: 0.35
      })
    );
    teleporter.name = "TeleportMachine";
    teleporter.position.set(0, 1.1, spawnZ + 4.2);
    scene.add(teleporter);

    // Welcome HUD sign (floating in view when you spawn)
    makeNeonLabel("WELCOME • BOSS\nNAME: PLAYER • CHIPS: 100000", new THREE.Vector3(0, 2.35, spawnZ - 2.6), "#00ffff", 0.95);

    // -------------------------
    // Seats (8) + Seated Bots + Walkers
    // -------------------------
    function makeBot(matColor) {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: matColor, roughness: 0.7, metalness: 0.05, flatShading: true });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 0.22), mat);
      torso.position.y = 1.25;
      g.add(torso);

      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 1), mat);
      head.position.set(0, 0.45, 0);
      torso.add(head);

      // arms with “elbows”
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.28, 4, 8), mat);
      const arm2 = arm.clone();
      arm.position.set(-0.25, 1.22, 0.05);
      arm2.position.set(0.25, 1.22, 0.05);
      arm.rotation.z = 0.35;
      arm2.rotation.z = -0.35;
      g.add(arm, arm2);

      // legs
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.38, 4, 8), mat);
      const leg2 = leg.clone();
      leg.position.set(-0.10, 0.70, 0);
      leg2.position.set(0.10, 0.70, 0);
      g.add(leg, leg2);

      return g;
    }

    // seat markers around pit (standing ring)
    const seatR = 5.65;
    const seatY = -0.98;
    const seatPadMat = neon(0x18344a, 0.6);

    const seatedBots = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = Math.cos(a) * seatR;
      const z = Math.sin(a) * seatR;

      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 18), seatPadMat);
      pad.position.set(x, seatY, z);
      scene.add(pad);

      if (i < 3) {
        const bot = makeBot(i === 0 ? 0x7fe7ff : i === 1 ? 0xff2d7a : 0xffd36b);
        bot.position.set(x, seatY - 0.02, z);
        bot.rotation.y = Math.atan2(-x, -z);
        scene.add(bot);
        seatedBots.push(bot);
      }
    }

    // 3 walkers in hub
    ctx.demo = ctx.demo || {};
    ctx.demo.walkers = [
      { obj: makeBot(0x7fe7ff), t: 0.0, phase: 0.0 },
      { obj: makeBot(0xff2d7a), t: 0.0, phase: Math.PI * 0.66 },
      { obj: makeBot(0xffd36b), t: 0.0, phase: Math.PI * 1.33 },
    ];
    ctx.demo.walkers.forEach(w => scene.add(w.obj));

    log("[world] v4.3 built ✅ sealed corridors + taller hub + pit lip rail + bigger table + bots + welcome HUD");
  },

  update(ctx, dt) {
    // walkers orbit around the hub edge
    const walkers = ctx.demo?.walkers;
    if (walkers?.length) {
      const r = 10.2;
      for (const w of walkers) {
        w.t += dt * 0.25;
        const a = w.t + w.phase;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        w.obj.position.set(x, 0, z);
        w.obj.rotation.y = Math.atan2(-x, -z);
      }
    }
  }
};
