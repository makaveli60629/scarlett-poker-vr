// /js/world.js — Scarlett WORLD 9.2 (VIP spawn + remove outer rails + sealed divot + proper stairs opening + jumbotrons + VIP hallway start + inward storefronts + dome trim + brighter)
export const World = (() => {
  let floors = [];
  const spawns = new Map();

  const demo = {
    tableAnchor: null,
    seatAnchors: [],
    vipPads: [],
    vipWelcomeSign: null,
    vipHallStart: null,
    alcoves: [],
  };

  function build({ THREE, scene, log }) {
    floors = [];
    spawns.clear();

    demo.tableAnchor = null;
    demo.seatAnchors = [];
    demo.vipPads = [];
    demo.vipWelcomeSign = null;
    demo.vipHallStart = null;
    demo.alcoves = [];

    const root = new THREE.Group();
    root.name = "WorldRoot";
    scene.add(root);

    // ---------- Materials (brighter floor so you can see) ----------
    const matFloor = new THREE.MeshStandardMaterial({ color: 0x1a1d28, roughness: 0.92, metalness: 0.05, side: THREE.DoubleSide });
    const matPit   = new THREE.MeshStandardMaterial({ color: 0x0f121a, roughness: 0.95, metalness: 0.04, side: THREE.DoubleSide });
    const matWall  = new THREE.MeshStandardMaterial({ color: 0x14182a, roughness: 0.86, metalness: 0.08 });
    const matTrim  = new THREE.MeshStandardMaterial({ color: 0x222a4a, roughness: 0.55, metalness: 0.18 });
    const matGold  = new THREE.MeshStandardMaterial({ color: 0xd2b46a, roughness: 0.25, metalness: 0.90 });
    const matFelt  = new THREE.MeshStandardMaterial({ color: 0x123018, roughness: 0.90, metalness: 0.06 });
    const matLeather = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.55, metalness: 0.12 });

    const matNeonA = new THREE.MeshStandardMaterial({ color: 0x070810, emissive: 0x7fe7ff, emissiveIntensity: 3.8, roughness: 0.25 });
    const matNeonP = new THREE.MeshStandardMaterial({ color: 0x070810, emissive: 0xff2d7a, emissiveIntensity: 3.8, roughness: 0.25 });

    const matGlass = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, transparent: true, opacity: 0.18,
      roughness: 0.06, metalness: 0.0, transmission: 0.65, thickness: 0.12
    });

    // ---------- Dimensions ----------
    const LOBBY_R = 18.2;
    const WALL_H  = 11.5;
    const WALL_T  = 0.35;

    const pitDepth   = 1.65;
    const rimR       = 6.7;
    const rampInnerR = rimR + 0.20;
    const rampOuterR = rimR + 3.3;

    // Table + seats live in the PIT, so align to pit floor
    const pitFloorY = -pitDepth;
    const tableY    = pitFloorY + 0.72;     // table top sits above pit floor
    const seatBaseY = pitFloorY + 0.02;     // chair legs touch pit floor

    // Stairs at +Z
    const stairsAngle = 0.0;
    const railGapArc  = 0.58;

    // IMPORTANT: You asked to remove “gold/blue/white/outer rails”.
    // We will NOT create any outer lobby rails anymore.
    // Only table guardrail is created around the table.

    // ---------- Lighting (make it clearly visible) ----------
    root.add(new THREE.AmbientLight(0xffffff, 1.35));

    const sun = new THREE.DirectionalLight(0xffffff, 1.65);
    sun.position.set(18, 30, 14);
    root.add(sun);

    // Bright ceiling rings
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x10131b, emissive: 0xffffff, emissiveIntensity: 2.25, roughness: 0.15, metalness: 0.08 });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(10.8, 0.16, 12, 240), ringMat);
    ring1.position.set(0, 9.9, 0); ring1.rotation.x = Math.PI / 2; root.add(ring1);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(7.6, 0.15, 12, 240), ringMat);
    ring2.position.set(0, 9.1, 0); ring2.rotation.x = Math.PI / 2; root.add(ring2);

    // 10 fill lights
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const p = new THREE.PointLight(0xffffff, 2.8, 72);
      p.position.set(Math.sin(a) * 10.1, 7.8, Math.cos(a) * 10.1);
      root.add(p);
    }

    // Pit spotlight
    const pitSpot = new THREE.SpotLight(0xffffff, 3.3, 60, Math.PI / 7, 0.35, 1.1);
    pitSpot.position.set(0, 11.1, 0);
    pitSpot.target.position.set(0, pitFloorY, 0);
    root.add(pitSpot, pitSpot.target);

    // ---------- Floors + Pit ----------
    const topRing = new THREE.Mesh(new THREE.RingGeometry(rampOuterR, LOBBY_R, 180), matFloor);
    topRing.rotation.x = -Math.PI / 2;
    root.add(topRing); floors.push(topRing);

    const ramp = new THREE.Mesh(makeRampRing(THREE, rampInnerR, rampOuterR, pitFloorY, 0, 220), matFloor);
    root.add(ramp); floors.push(ramp);

    const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(rimR, 140), matPit);
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.y = pitFloorY;
    root.add(pitFloor); floors.push(pitFloor);

    // Pit wall
    const pitWall = new THREE.Mesh(new THREE.CylinderGeometry(rampInnerR, rampInnerR, pitDepth, 140, 1, true), matWall);
    pitWall.position.set(0, pitFloorY + pitDepth / 2, 0);
    root.add(pitWall);

    // Rim cap
    const rimCap = new THREE.Mesh(new THREE.TorusGeometry(rampInnerR, 0.11, 14, 240), matTrim);
    rimCap.position.set(0, 0.07, 0);
    rimCap.rotation.x = Math.PI / 2;
    root.add(rimCap);

    // ✅ SEAL GAP between divot rim area and table zone with a clean “cap ring”
    // This covers that empty space you pointed at.
    const sealRing = new THREE.Mesh(new THREE.RingGeometry(rimR + 0.05, rampInnerR + 2.2, 180), matTrim);
    sealRing.rotation.x = -Math.PI / 2;
    sealRing.position.y = pitFloorY + 0.02;
    root.add(sealRing);

    // ---------- Stairs (aligned, only entrance) ----------
    const stairs = buildStairsSolid(THREE, {
      stepCount: 10,
      stepW: 2.4,
      stepH: pitDepth / 10,
      stepD: 0.62,
      mat: matTrim
    });

    // Place at top rim going down into pit
    const stairTop = new THREE.Vector3(0, 0.012, rampOuterR - 0.9);
    stairs.position.copy(stairTop);
    stairs.rotation.y = 0;
    root.add(stairs);

    // Collider for walking
    const stairCollider = new THREE.Mesh(new THREE.BoxGeometry(2.8, pitDepth + 0.25, 6.8), new THREE.MeshBasicMaterial({ visible: false }));
    stairCollider.position.copy(stairTop).add(new THREE.Vector3(0, -(pitDepth / 2), -3.4));
    root.add(stairCollider);
    floors.push(stairCollider);

    // Guard stands at stairs
    const guard = buildGuardBot(THREE);
    guard.position.copy(stairTop).add(new THREE.Vector3(0, 0, 1.1));
    guard.lookAt(0, 0, 0);
    root.add(guard);

    // ---------- TABLE + TABLE GUARDRAIL (KEEP THIS ONE) ----------
    const tableAnchor = new THREE.Group();
    tableAnchor.position.set(0, tableY, 0);
    tableAnchor.name = "TableAnchor";
    root.add(tableAnchor);
    demo.tableAnchor = tableAnchor;

    // Table top
    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.05, 0.25, 72), matFelt);
    tableAnchor.add(tableTop);

    // Leather trim
    const tableTrim = new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.17, 18, 200), matLeather);
    tableTrim.position.set(0, 0.22, 0);
    tableTrim.rotation.x = Math.PI / 2;
    tableAnchor.add(tableTrim);

    // Table pedestal/stand so it looks anchored
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.90, 0.95, 36), matTrim);
    pedestal.position.set(0, -0.60, 0);
    tableAnchor.add(pedestal);

    // ✅ The ONLY guardrail we keep: around the table/pit edge inside
    const tableRailR = 4.95;
    const tableRail = new THREE.Mesh(new THREE.TorusGeometry(tableRailR, 0.10, 16, 220), matGold);
    tableRail.position.set(0, -0.05, 0);
    tableRail.rotation.x = Math.PI / 2;
    tableAnchor.add(tableRail);

    // Neon halo above rail
    const tableHalo = new THREE.Mesh(new THREE.TorusGeometry(tableRailR, 0.055, 12, 220), matNeonA);
    tableHalo.position.set(0, 0.18, 0);
    tableHalo.rotation.x = Math.PI / 2;
    tableAnchor.add(tableHalo);

    // ---------- Chairs + seat anchors (aligned to pit floor) ----------
    const chairMat = matTrim;
    const seatR = 4.25;

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.sin(a) * seatR;
      const z = Math.cos(a) * seatR;

      const chair = new THREE.Group();
      chair.position.set(x, seatBaseY - tableY, z); // local to tableAnchor (tableAnchor already at tableY)
      chair.lookAt(0, seatBaseY - tableY, 0);
      chair.rotateY(Math.PI);

      // chair seat sits a bit above floor
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.7), chairMat);
      seat.position.set(0, 0.30, 0);
      chair.add(seat);

      // back
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.75, 0.12), chairMat);
      back.position.set(0, 0.70, -0.29);
      chair.add(back);

      // legs touch floor
      const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.55, 10);
      const legOffsets = [
        [-0.28, 0.02, -0.28], [0.28, 0.02, -0.28],
        [-0.28, 0.02,  0.28], [0.28, 0.02,  0.28]
      ];
      for (const [lx, ly, lz] of legOffsets) {
        const leg = new THREE.Mesh(legGeo, chairMat);
        leg.position.set(lx, 0.02, lz);
        chair.add(leg);
      }

      tableAnchor.add(chair);

      const seatAnchor = new THREE.Group();
      seatAnchor.name = `SeatAnchor_${i}`;
      seatAnchor.position.copy(chair.position);
      seatAnchor.quaternion.copy(chair.quaternion);
      tableAnchor.add(seatAnchor);
      demo.seatAnchors.push(seatAnchor);
    }

    // ---------- Dome walls + trims ----------
    const wallShell = new THREE.Mesh(
      new THREE.CylinderGeometry(LOBBY_R + WALL_T / 2, LOBBY_R + WALL_T / 2, WALL_H, 140, 1, true),
      matWall
    );
    wallShell.position.set(0, WALL_H / 2, 0);
    root.add(wallShell);

    // Krylon trim top + bottom
    const topTrim = new THREE.Mesh(new THREE.TorusGeometry(LOBBY_R + 0.08, 0.10, 12, 240), matNeonA);
    topTrim.position.set(0, WALL_H - 0.55, 0);
    topTrim.rotation.x = Math.PI / 2;
    root.add(topTrim);

    const bottomTrim = new THREE.Mesh(new THREE.TorusGeometry(LOBBY_R + 0.06, 0.08, 12, 240), matNeonP);
    bottomTrim.position.set(0, 0.35, 0);
    bottomTrim.rotation.x = Math.PI / 2;
    root.add(bottomTrim);

    // ---------- Jumbotrons (back) ----------
    const screenW = 7.8, screenH = 3.4;
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x07080c,
      roughness: 0.25,
      metalness: 0.1,
      emissive: 0x101428,
      emissiveIntensity: 1.35
    });

    for (let i = 0; i < 4; i++) {
      const a = i * (Math.PI / 2);
      const sx = Math.sin(a) * (LOBBY_R - 1.1);
      const sz = Math.cos(a) * (LOBBY_R - 1.1);

      const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), screenMat);
      screen.position.set(sx, 8.2, sz);
      screen.lookAt(0, 8.2, 0);
      root.add(screen);
    }

    // ---------- VIP hallway “start” visible from center ----------
    // A short, visible hallway strip that points toward VIP so you can see it from the lobby
    const vipDir = new THREE.Vector3(1, 0, 0.45).normalize();
    const vipStart = vipDir.clone().multiplyScalar(rampOuterR + 1.0);

    const vipHallFloor = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.22, 6.6), matFloor);
    vipHallFloor.position.set(vipStart.x, -0.11, vipStart.z);
    vipHallFloor.lookAt(vipStart.x + vipDir.x, -0.11, vipStart.z + vipDir.z);
    root.add(vipHallFloor);
    floors.push(vipHallFloor);
    demo.vipHallStart = vipHallFloor;

    const vipHallStrip = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.14, 6.0), matNeonP);
    vipHallStrip.position.set(vipStart.x, 3.9, vipStart.z);
    vipHallStrip.quaternion.copy(vipHallFloor.quaternion);
    root.add(vipHallStrip);

    // ---------- VIP cube (spawn here) ----------
    const vipCenter = new THREE.Vector3(LOBBY_R - 2.0, 0, 6.2);

    const vipFloor = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.25, 6.8), matFloor);
    vipFloor.position.set(vipCenter.x, -0.12, vipCenter.z);
    root.add(vipFloor);
    floors.push(vipFloor);

    // Welcome HUD SIGN in world (above VIP hall direction)
    const welcome = buildWelcomeSign(THREE, matNeonA, matNeonP, matTrim);
    welcome.position.set(vipCenter.x, 3.4, vipCenter.z - 3.1);
    welcome.lookAt(vipCenter.x, 3.4, vipCenter.z);
    root.add(welcome);
    demo.vipWelcomeSign = welcome;

    // Spawn in VIP facing table
    const spawnPos = vipCenter.clone().add(new THREE.Vector3(0, 0, -1.2));
    const yawToTable = Math.atan2(0 - spawnPos.x, 0 - spawnPos.z);
    spawns.set("vip_cube", { x: spawnPos.x, y: 0, z: spawnPos.z, yaw: yawToTable });

    // VIP teleport pads (visual anchors)
    const pads = [
      { name: "TP_STORE", color: matNeonA, off: new THREE.Vector3(-1.8, 0.0, 1.6) },
      { name: "TP_SCORPION", color: matNeonP, off: new THREE.Vector3(0.0, 0.0, 1.6) },
      { name: "TP_SPECTATE", color: matNeonA, off: new THREE.Vector3(1.8, 0.0, 1.6) },
    ];

    pads.forEach((p) => {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 36), matTrim);
      pad.position.copy(vipCenter).add(p.off).add(new THREE.Vector3(0, 0.05, 0));
      root.add(pad);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 10, 60), p.color);
      ring.position.copy(pad.position).add(new THREE.Vector3(0, 0.06, 0));
      ring.rotation.x = Math.PI / 2;
      root.add(ring);

      const anchor = new THREE.Group();
      anchor.name = p.name;
      anchor.position.copy(pad.position);
      root.add(anchor);
      demo.vipPads.push(anchor);
    });

    // ---------- Store / Poker facades (face INWARD toward the table) ----------
    // They are “built into the wall” but oriented toward center (table)
    const STORE_ANG = 0;
    const POKER_ANG = Math.PI / 2;

    const storePos = polar(STORE_ANG, LOBBY_R - 0.70);
    const pokerPos = polar(POKER_ANG, LOBBY_R - 0.70);

    const storeFront = buildFrontFacade(THREE, {
      title: "STORE",
      neonMat: matNeonA,
      wallMat: matWall,
      trimMat: matTrim,
      glassMat: matGlass
    });
    storeFront.position.set(storePos.x, 0, storePos.z);
    storeFront.lookAt(0, 0, 0); // ✅ face inward
    root.add(storeFront);

    const pokerFront = buildFrontFacade(THREE, {
      title: "POKER ROOM",
      neonMat: matNeonP,
      wallMat: matWall,
      trimMat: matTrim,
      glassMat: matGlass
    });
    pokerFront.position.set(pokerPos.x, 0, pokerPos.z);
    pokerFront.lookAt(0, 0, 0); // ✅ face inward
    root.add(pokerFront);

    log?.("[world] built ✅ WORLD 9.2");
  }

  // ---------- Helpers ----------
  function makeRampRing(THREE, innerR, outerR, yInner, yOuter, segments = 128) {
    const positions = [], normals = [], uvs = [], indices = [];
    const addV = (x, y, z, u, v) => { positions.push(x, y, z); normals.push(0, 1, 0); uvs.push(u, v); };
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
    for (let i = 0; i < stepCount; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), mat);
      step.position.set(0, -stepH / 2 - i * stepH, -i * stepD - i * 0.001);
      g.add(step);
    }
    return g;
  }

  function buildGuardBot(THREE) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x334a7a, roughness: 0.55, metalness: 0.12 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.70, 6, 14), mat);
    body.position.set(0, 1.1, 0); g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.20, 18, 18), mat);
    head.position.set(0, 1.75, 0); g.add(head);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, emissive: 0x7fe7ff, emissiveIntensity: 2.8 }));
    badge.position.set(0, 1.25, 0.26); g.add(badge);
    return g;
  }

  function buildFrontFacade(THREE, { title, neonMat, wallMat, trimMat, glassMat }) {
    const g = new THREE.Group();
    g.name = `Front_${title}`;

    // frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(6.9, 3.3, 0.22), wallMat);
    frame.position.set(0, 1.65, -0.35);
    g.add(frame);

    // two mannequin display cases
    const left = buildMannequinCase(THREE, { glassMat, trimMat, neonMat });
    left.position.set(-2.2, 0.0, 0.35);
    g.add(left);

    const right = buildMannequinCase(THREE, { glassMat, trimMat, neonMat });
    right.position.set(2.2, 0.0, 0.35);
    g.add(right);

    // title plate
    const sign = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.58, 0.18), neonMat);
    sign.position.set(0, 2.70, -0.18);
    g.add(sign);

    // “label bars” to read as text
    const bar = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.10, 0.12), trimMat);
    bar.position.set(0, 2.42, -0.12);
    g.add(bar);

    return g;
  }

  function buildMannequinCase(THREE, { glassMat, trimMat, neonMat }) {
    const g = new THREE.Group();

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.26, 0.95), trimMat);
    base.position.set(0, 0.13, 0);
    g.add(base);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.56, 1.85, 0.86), glassMat);
    glass.position.set(0, 1.05, 0);
    g.add(glass);

    // mannequin (full-body)
    const man = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.65, metalness: 0.05 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 6, 12), mat);
    torso.position.set(0, 1.00, 0);
    man.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), mat);
    head.position.set(0, 1.45, 0);
    man.add(head);

    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.55, 10);
    const l1 = new THREE.Mesh(legGeo, mat); l1.position.set(-0.08, 0.55, 0);
    const l2 = new THREE.Mesh(legGeo, mat); l2.position.set(0.08, 0.55, 0);
    man.add(l1, l2);

    const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.45, 10);
    const a1 = new THREE.Mesh(armGeo, mat); a1.position.set(-0.26, 1.05, 0); a1.rotation.z = 0.35;
    const a2 = new THREE.Mesh(armGeo, mat); a2.position.set(0.26, 1.05, 0); a2.rotation.z = -0.35;
    man.add(a1, a2);

    man.position.set(0, 0.0, 0);
    g.add(man);

    // internal light strip
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.40, 0.12, 0.12), neonMat);
    strip.position.set(0, 1.90, 0.35);
    g.add(strip);

    return g;
  }

  function buildWelcomeSign(THREE, matA, matP, matTrim) {
    const g = new THREE.Group();
    g.name = "WelcomeSign";

    const plate = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.2, 0.14), matTrim);
    plate.position.set(0, 0, 0);
    g.add(plate);

    const glow = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.0, 0.10), matA);
    glow.position.set(0, 0, 0.08);
    g.add(glow);

    // “chips/rank/time” bars (visual placeholders for now)
    const rowY = [0.28, 0.0, -0.28];
    rowY.forEach((y, i) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 0.08), i === 1 ? matP : matA);
      bar.position.set(0, y, 0.10);
      g.add(bar);
    });

    return g;
  }

  function polar(a, r) { return { x: Math.sin(a) * r, z: Math.cos(a) * r }; }

  // ---------- API ----------
  function getSpawn() { return spawns.get("vip_cube"); }
  function getFloors() { return floors; }
  function getDemo() { return demo; }

  return { build, getSpawn, getFloors, getDemo };
})();
