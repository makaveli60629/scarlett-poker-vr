// /js/world.js — Scarlett WORLD 8.3 (Seated bots+chairs, stairs opening only, rail closer, store front visible, brighter, proper wall openings)
export const World = (() => {
  let floors = [];
  const spawns = new Map();
  const demo = { tableAnchor: null, chipAnchor: null, bots: [], seatPoints: [], pitDepth: 0, storeFront: null };

  function build({ THREE, scene, log }) {
    floors = [];
    spawns.clear();
    demo.tableAnchor = null;
    demo.chipAnchor = null;
    demo.bots = [];
    demo.seatPoints = [];
    demo.storeFront = null;

    const root = new THREE.Group();
    root.name = "WorldRoot";
    scene.add(root);

    // ---------- Materials ----------
    const matFloor = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.92, metalness: 0.06, side: THREE.DoubleSide });
    const matWall  = new THREE.MeshStandardMaterial({ color: 0x14182a, roughness: 0.86, metalness: 0.08 });
    const matTrim  = new THREE.MeshStandardMaterial({ color: 0x222a4a, roughness: 0.55, metalness: 0.18 });
    const matGold  = new THREE.MeshStandardMaterial({ color: 0xd2b46a, roughness: 0.25, metalness: 0.90 });
    const matFelt  = new THREE.MeshStandardMaterial({ color: 0x123018, roughness: 0.90, metalness: 0.06 });
    const matLeather = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.55, metalness: 0.12 });

    const matNeonA = new THREE.MeshStandardMaterial({ color: 0x05060a, emissive: 0x7fe7ff, emissiveIntensity: 3.6, roughness: 0.25 });
    const matNeonP = new THREE.MeshStandardMaterial({ color: 0x05060a, emissive: 0xff2d7a, emissiveIntensity: 3.6, roughness: 0.25 });
    const matBlue  = new THREE.MeshStandardMaterial({ color: 0x2a6bff, emissive: 0x2a6bff, emissiveIntensity: 1.0, roughness: 0.35, metalness: 0.25 });

    // ---------- Dimensions ----------
    const LOBBY_R = 17.5;
    const WALL_H  = 11.0;
    const WALL_T  = 0.35;

    const HALL_W  = 4.6, HALL_L = 11.4;
    const ROOM_W  = 12,  ROOM_D = 12,  ROOM_H = 6.8;

    const pitDepth   = 1.65;
    demo.pitDepth = pitDepth;

    const rimR       = 6.7;
    const rampInnerR = rimR + 0.20;
    const rampOuterR = rimR + 3.3;

    const tableY     = -pitDepth + 0.72;

    // Stairs and opening are on +Z
    const stairsAngle = 0.0;           // +Z
    const railGapArc  = 0.58;          // size of opening
    const railRBase   = rampInnerR + 2.25; // ✅ closer to the “floor circle” to seal the divot visually

    // ---------- SUPER BRIGHT LIGHTING (stable) ----------
    root.add(new THREE.AmbientLight(0xffffff, 1.25));
    const sun = new THREE.DirectionalLight(0xffffff, 1.65);
    sun.position.set(18, 30, 14);
    root.add(sun);

    // Bright ceiling rings (cheap brightness)
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, emissive: 0xffffff, emissiveIntensity: 2.1, roughness: 0.15, metalness: 0.12 });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(10.2, 0.16, 12, 240), ringMat);
    ring1.position.set(0, 9.6, 0); ring1.rotation.x = Math.PI / 2; root.add(ring1);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(7.2, 0.15, 12, 240), ringMat);
    ring2.position.set(0, 8.9, 0); ring2.rotation.x = Math.PI / 2; root.add(ring2);

    // 8 strong fills
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const p = new THREE.PointLight(0xffffff, 2.6, 60);
      p.position.set(Math.sin(a) * 9.6, 7.4, Math.cos(a) * 9.6);
      root.add(p);
    }

    // Extra spotlights (casino bright)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const s = new THREE.SpotLight(0xffffff, 2.2, 80, Math.PI / 10, 0.35, 1.0);
      s.position.set(Math.sin(a) * 8.2, 10.4, Math.cos(a) * 8.2);
      s.target.position.set(0, 0.5, 0);
      root.add(s, s.target);
    }

    const pitSpot = new THREE.SpotLight(0xffffff, 3.2, 55, Math.PI / 7, 0.35, 1.1);
    pitSpot.position.set(0, 10.5, 0);
    pitSpot.target.position.set(0, -pitDepth, 0);
    root.add(pitSpot, pitSpot.target);

    // ---------- Floors ----------
    const topRing = new THREE.Mesh(new THREE.RingGeometry(rampOuterR, LOBBY_R, 160), matFloor);
    topRing.rotation.x = -Math.PI / 2;
    root.add(topRing);
    floors.push(topRing);

    const ramp = new THREE.Mesh(makeRampRing(THREE, rampInnerR, rampOuterR, -pitDepth, 0, 180), matFloor);
    root.add(ramp);
    floors.push(ramp);

    const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(rimR, 120), matFloor);
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.y = -pitDepth;
    root.add(pitFloor);
    floors.push(pitFloor);

    // Rim cap + “seal band” (this makes the divot look fully connected)
    const rimCap = new THREE.Mesh(new THREE.TorusGeometry(rampInnerR, 0.11, 14, 240), matTrim);
    rimCap.position.set(0, 0.07, 0);
    rimCap.rotation.x = Math.PI / 2;
    root.add(rimCap);

    // A thin “skirt” band up top for visual sealing
    const skirt = new THREE.Mesh(new THREE.TorusGeometry(rampOuterR - 0.02, 0.08, 12, 240), matTrim);
    skirt.position.set(0, 0.05, 0);
    skirt.rotation.x = Math.PI / 2;
    root.add(skirt);

    const pitWall = new THREE.Mesh(new THREE.CylinderGeometry(rampInnerR, rampInnerR, pitDepth, 120, 1, true), matWall);
    pitWall.position.set(0, -pitDepth / 2, 0);
    root.add(pitWall);

    // ---------- Table (anchored, used by bots demo) ----------
    const tableAnchor = new THREE.Group();
    tableAnchor.position.set(0, tableY, 0);
    root.add(tableAnchor);
    demo.tableAnchor = tableAnchor;

    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.05, 0.25, 72), matFelt);
    tableAnchor.add(tableTop);

    const tableTrim = new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.17, 18, 200), matLeather);
    tableTrim.position.set(0, 0.22, 0);
    tableTrim.rotation.x = Math.PI / 2;
    tableAnchor.add(tableTrim);

    demo.chipAnchor = new THREE.Group();
    demo.chipAnchor.position.set(0, 0.20, 0);
    tableAnchor.add(demo.chipAnchor);

    // ---------- Stairs (descend toward table) + opening is HERE ONLY ----------
    const stairs = buildStairsSolid(THREE, {
      stepCount: 10,
      stepW: 2.2,
      stepH: pitDepth / 10,
      stepD: 0.60,
      mat: matTrim
    });

    // Place at +Z edge, facing center (toward -Z)
    const stairTop = new THREE.Vector3(0, 0.012, rampOuterR - 0.85);
    stairs.position.copy(stairTop);
    stairs.rotation.y = 0; // our stairs are built going toward -Z already
    root.add(stairs);

    // Smooth collider for walking
    const stairCollider = new THREE.Mesh(new THREE.BoxGeometry(2.6, pitDepth + 0.25, 6.6), new THREE.MeshBasicMaterial({ visible: false }));
    stairCollider.position.copy(stairTop).add(new THREE.Vector3(0, -(pitDepth/2), -3.2));
    root.add(stairCollider);
    floors.push(stairCollider);

    // Guard at top of stairs
    const guard = buildGuardBot(THREE);
    guard.position.copy(stairTop).add(new THREE.Vector3(0, 0, 1.05));
    guard.lookAt(0, 0, 0);
    root.add(guard);

    // ---------- Rails (CLOSER + GAP at stairs) ----------
    // We build one torus with an ARC leaving a GAP centered at +Z.
    const arcLen = (Math.PI * 2) - railGapArc;

    const blueRail = new THREE.Mesh(new THREE.TorusGeometry(railRBase - 0.18, 0.10, 16, 260, arcLen), matBlue);
    blueRail.position.set(0, 0.88, 0);
    blueRail.rotation.x = Math.PI / 2;
    blueRail.rotation.z = railGapArc / 2; // centers the gap at +Z
    root.add(blueRail);

    const goldRail = new THREE.Mesh(new THREE.TorusGeometry(railRBase - 0.06, 0.10, 16, 260, arcLen), matGold);
    goldRail.position.set(0, 1.05, 0);
    goldRail.rotation.x = Math.PI / 2;
    goldRail.rotation.z = railGapArc / 2;
    root.add(goldRail);

    const halo = new THREE.Mesh(new THREE.TorusGeometry(railRBase - 0.06, 0.055, 12, 260, arcLen), matNeonA);
    halo.position.set(0, 1.22, 0);
    halo.rotation.x = Math.PI / 2;
    halo.rotation.z = railGapArc / 2;
    root.add(halo);

    // Posts (skip within gap)
    const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.92, 10);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const d = wrapAngle(a - stairsAngle);
      if (Math.abs(d) < railGapArc * 0.52) continue; // skip near stairs opening
      const x = Math.sin(a) * (railRBase - 0.06);
      const z = Math.cos(a) * (railRBase - 0.06);
      const post = new THREE.Mesh(postGeo, matGold);
      post.position.set(x, 0.62, z);
      root.add(post);
    }

    // ---------- Seats + Chairs + Bots aligned to chairs ----------
    const seatR = 4.25;
    const seatY = tableY + 0.05;

    const chairMat = matTrim;
    const botMat = new THREE.MeshStandardMaterial({ color: 0x3a4a7a, roughness: 0.65, metalness: 0.10 });

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.sin(a) * seatR;
      const z = Math.cos(a) * seatR;

      // Chair
      const chair = new THREE.Group();
      chair.position.set(x, seatY, z);
      chair.lookAt(0, seatY, 0);
      chair.rotateY(Math.PI); // face table

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.7), chairMat);
      seat.position.set(0, 0.06, 0);
      chair.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.75, 0.12), chairMat);
      back.position.set(0, 0.45, -0.29);
      chair.add(back);

      tableAnchor.parent.add(chair);

      // Bot seated exactly on chair
      const bot = new THREE.Group();
      bot.position.copy(chair.position);
      bot.quaternion.copy(chair.quaternion);

      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 6, 12), botMat);
      body.position.set(0, 0.62, 0.08);
      bot.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 18), botMat);
      head.position.set(0, 1.12, 0.12);
      bot.add(head);

      tableAnchor.parent.add(bot);
      demo.bots.push(bot);

      // Seat point for chip spawn
      const seatPoint = new THREE.Vector3(x, seatY, z);
      demo.seatPoints.push(seatPoint);
    }

    // ---------- Lobby walls (SEALED except 4 hall entrances) ----------
    // Build panels around circle, skipping 4 doorway angles
    const doorAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    const doorHalf = 0.28; // opening half-width in radians (tune)

    const nearDoor = (ang) =>
      doorAngles.some(g => Math.abs(Math.atan2(Math.sin(ang - g), Math.cos(ang - g))) < doorHalf);

    // Lower wall panels (leave openings)
    const lowerH = 3.3;
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      if (nearDoor(a)) continue;

      const px = Math.sin(a) * (LOBBY_R + WALL_T / 2);
      const pz = Math.cos(a) * (LOBBY_R + WALL_T / 2);

      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.9, lowerH, WALL_T), matWall);
      panel.position.set(px, lowerH / 2, pz);
      panel.rotation.y = a;
      root.add(panel);
    }

    // Upper continuous band (seals everything above door height)
    const upperBandH = WALL_H - lowerH;
    const upperBand = new THREE.Mesh(
      new THREE.CylinderGeometry(LOBBY_R + WALL_T/2, LOBBY_R + WALL_T/2, upperBandH, 128, 1, true),
      matWall
    );
    upperBand.position.set(0, lowerH + upperBandH/2, 0);
    root.add(upperBand);

    // Neon top band trim
    const topBand = new THREE.Mesh(new THREE.TorusGeometry(LOBBY_R + 0.08, 0.10, 12, 240), matNeonA);
    topBand.position.set(0, WALL_H - 0.55, 0);
    topBand.rotation.x = Math.PI / 2;
    root.add(topBand);

    // ---------- Hallways + rooms + STORE FRONT DISPLAY CASE ----------
    const roomDefs = [
      { label: "STORE",    ax: 0,           neon: matNeonA },
      { label: "SCORPION", ax: Math.PI/2,   neon: matNeonP },
      { label: "SPECTATE", ax: Math.PI,     neon: matNeonA },
      { label: "LOUNGE",   ax: -Math.PI/2,  neon: matNeonP },
    ];

    roomDefs.forEach((r) => {
      const dir = new THREE.Vector3(Math.sin(r.ax), 0, Math.cos(r.ax));

      const hallCenter = dir.clone().multiplyScalar(LOBBY_R + HALL_L/2 - 0.25);

      const hallFloor = new THREE.Mesh(new THREE.BoxGeometry(HALL_W, 0.22, HALL_L), matFloor);
      hallFloor.position.set(hallCenter.x, -0.11, hallCenter.z);
      hallFloor.rotation.y = r.ax;
      root.add(hallFloor);
      floors.push(hallFloor);

      const strip = new THREE.Mesh(new THREE.BoxGeometry(HALL_W - 0.6, 0.14, HALL_L - 0.6), r.neon);
      strip.position.set(hallCenter.x, 4.2, hallCenter.z);
      strip.rotation.y = r.ax;
      root.add(strip);

      // Bright hallway spots
      for (let k = 0; k < 4; k++) {
        const t = (k / 3) - 0.5;
        const p = new THREE.PointLight(0xffffff, 2.6, 26);
        const pos = hallCenter.clone().add(dir.clone().multiplyScalar(t * HALL_L));
        p.position.set(pos.x, 4.1, pos.z);
        root.add(p);
      }

      // Store front display at the LOBBY entrance for STORE
      if (r.label === "STORE") {
        const doorPos = dir.clone().multiplyScalar(LOBBY_R - 1.4);
        const storeFront = buildStoreFront(THREE, { matTrim, matNeonA, matWall });
        storeFront.position.set(doorPos.x, 0, doorPos.z);
        storeFront.rotation.y = r.ax;
        root.add(storeFront);
        demo.storeFront = storeFront;

        const sfLight = new THREE.PointLight(0xffffff, 2.8, 18);
        sfLight.position.set(doorPos.x, 2.2, doorPos.z);
        root.add(sfLight);
      }

      // Room floor + super bright light
      const roomCenter = dir.clone().multiplyScalar(LOBBY_R + HALL_L + ROOM_D/2 - 0.7);

      const roomFloor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.25, ROOM_D), matFloor);
      roomFloor.position.set(roomCenter.x, -0.12, roomCenter.z);
      roomFloor.rotation.y = r.ax;
      root.add(roomFloor);
      floors.push(roomFloor);

      const roomLight1 = new THREE.PointLight(0xffffff, 3.0, 44);
      roomLight1.position.set(roomCenter.x, 5.8, roomCenter.z);
      root.add(roomLight1);

      const roomLight2 = new THREE.PointLight(0xffffff, 2.4, 40);
      roomLight2.position.set(roomCenter.x, 3.1, roomCenter.z);
      root.add(roomLight2);

      // Sign at entrance
      const signPos = dir.clone().multiplyScalar(LOBBY_R - 0.9);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.58, 0.20), r.neon);
      sign.position.set(signPos.x, 3.1, signPos.z);
      sign.rotation.y = r.ax;
      root.add(sign);
    });

    // ---------- VIP spawn (kept) ----------
    const vipBase = new THREE.Vector3(LOBBY_R - 1.8, 0, 6.2);
    const spawnPos = vipBase.clone().add(new THREE.Vector3(0, 0, -1.3));
    const yawToTable = Math.atan2(0 - spawnPos.x, 0 - spawnPos.z);
    spawns.set("vip_cube", { x: spawnPos.x, y: 0, z: spawnPos.z, yaw: yawToTable });

    log?.("[world] built ✅ WORLD 8.3");
  }

  // ---------- Helpers ----------
  function makeRampRing(THREE, innerR, outerR, yInner, yOuter, segments = 128) {
    const positions = [], normals = [], uvs = [], indices = [];
    const addV = (x,y,z,u,v) => { positions.push(x,y,z); normals.push(0,1,0); uvs.push(u,v); };

    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      const cx = Math.sin(t), cz = Math.cos(t);
      addV(cx * innerR, yInner, cz * innerR, 0, i / segments);
      addV(cx * outerR, yOuter, cz * outerR, 1, i / segments);
    }
    for (let i = 0; i < segments; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, b, c, b, d, c);
    }

    const g = new THREE.BufferGeometry();
    g.setIndex(indices);
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.computeVertexNormals();
    return g;
  }

  function buildStairsSolid(THREE, { stepCount, stepW, stepH, stepD, mat }) {
    const g = new THREE.Group();
    g.name = "PitStairsSolid";

    // Steps go toward -Z and down in -Y (descending into pit)
    for (let i = 0; i < stepCount; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), mat);
      step.position.set(0, -stepH/2 - i*stepH, -i*stepD - i*0.001);
      g.add(step);
    }
    return g;
  }

  function buildGuardBot(THREE) {
    const g = new THREE.Group();
    g.name = "GuardBot";
    const mat = new THREE.MeshStandardMaterial({ color: 0x334a7a, roughness: 0.55, metalness: 0.12 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.70, 6, 14), mat);
    body.position.set(0, 1.1, 0); g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.20, 18, 18), mat);
    head.position.set(0, 1.75, 0); g.add(head);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.05), new THREE.MeshStandardMaterial({
      color: 0x0b0d14, emissive: 0x7fe7ff, emissiveIntensity: 2.8
    }));
    badge.position.set(0, 1.25, 0.26); g.add(badge);
    return g;
  }

  function buildStoreFront(THREE, { matTrim, matNeonA, matWall }) {
    const g = new THREE.Group();
    g.name = "StoreFront";

    const base = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.35, 1.6), matTrim);
    base.position.set(0, 0.18, 0);
    g.add(base);

    // glass display
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 1.25, 1.4),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, roughness: 0.05, metalness: 0.0 })
    );
    glass.position.set(0, 0.95, 0);
    g.add(glass);

    // sign
    const sign = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.52, 0.18), matNeonA);
    sign.position.set(0, 2.1, -0.9);
    g.add(sign);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.6, 0.12), matWall);
    frame.position.set(0, 1.3, -1.1);
    g.add(frame);

    return g;
  }

  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function getSpawn() { return spawns.get("vip_cube"); }
  function getFloors() { return floors; }
  function getDemo() { return demo; }

  return { build, getSpawn, getFloors, getDemo };
})();
