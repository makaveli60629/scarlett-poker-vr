// /js/world.js — Scarlett WORLD 8.0 (Smooth Pit + Stairs + Guard + Full Walls + SUPER BRIGHT)
// ✅ Smooth “dropped in” pit terrain (longer ramp + rim cap)
// ✅ Pit guardrails correctly dropped + posts
// ✅ Stairs entrance down into pit + guard bot at top
// ✅ Lobby walls restored (no missing gaps except hallway doors)
// ✅ MUCH brighter lighting + bright trim bands

export const World = (() => {
  let floors = [];
  const spawns = new Map();

  function build({ THREE, scene, log }) {
    floors = [];
    spawns.clear();

    const root = new THREE.Group();
    root.name = "WorldRoot";
    scene.add(root);

    // ---------- COLORS / MATERIALS ----------
    const colFloor = 0x0b0d14;
    const colWall  = 0x14182a;
    const colTrim  = 0x222a4a;
    const colGold  = 0xd2b46a;
    const colFelt  = 0x123018;
    const colAqua  = 0x7fe7ff;
    const colPink  = 0xff2d7a;
    const colBlue  = 0x2a6bff;
    const colLeather = 0x3a2418;

    const matFloor = new THREE.MeshStandardMaterial({ color: colFloor, roughness: 0.92, metalness: 0.06, side: THREE.DoubleSide });
    const matWall  = new THREE.MeshStandardMaterial({ color: colWall,  roughness: 0.86, metalness: 0.08 });
    const matTrim  = new THREE.MeshStandardMaterial({ color: colTrim,  roughness: 0.55, metalness: 0.18 });
    const matGold  = new THREE.MeshStandardMaterial({ color: colGold,  roughness: 0.25, metalness: 0.90 });
    const matFelt  = new THREE.MeshStandardMaterial({ color: colFelt,  roughness: 0.90, metalness: 0.06 });
    const matLeather = new THREE.MeshStandardMaterial({ color: colLeather, roughness: 0.55, metalness: 0.12 });

    const matNeonA = new THREE.MeshStandardMaterial({ color: 0x05060a, emissive: colAqua, emissiveIntensity: 3.2, roughness: 0.25 });
    const matNeonP = new THREE.MeshStandardMaterial({ color: 0x05060a, emissive: colPink, emissiveIntensity: 3.2, roughness: 0.25 });
    const matBlue  = new THREE.MeshStandardMaterial({ color: colBlue, emissive: colBlue, emissiveIntensity: 0.9, roughness: 0.35, metalness: 0.25 });

    // ---------- DIMENSIONS ----------
    const LOBBY_R = 17.5;
    const WALL_H  = 11.0;
    const WALL_T  = 0.35;

    const HALL_W  = 4.6;
    const HALL_L  = 11.4;

    const ROOM_W  = 12;
    const ROOM_D  = 12;
    const ROOM_H  = 6.8;

    // PIT
    const pitDepth   = 1.65;
    const rimR       = 6.7;         // pit floor radius (with rim)
    const rampInnerR = rimR + 0.20; // where pit meets ramp
    const rampOuterR = rimR + 3.3;  // LONGER slope = smoother terrain
    const tableY     = -pitDepth + 0.72;

    // ---------- SUPER BRIGHT LIGHTING ----------
    root.add(new THREE.AmbientLight(0xffffff, 1.10));

    const sun = new THREE.DirectionalLight(0xffffff, 1.60);
    sun.position.set(18, 30, 14);
    root.add(sun);

    // Big ceiling rings
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x0b0d14,
      emissive: 0xffffff,
      emissiveIntensity: 1.75,
      roughness: 0.15,
      metalness: 0.12
    });

    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(10.2, 0.16, 12, 240), ringMat);
    ring1.position.set(0, 9.6, 0);
    ring1.rotation.x = Math.PI / 2;
    root.add(ring1);

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(7.2, 0.15, 12, 240), ringMat);
    ring2.position.set(0, 8.9, 0);
    ring2.rotation.x = Math.PI / 2;
    root.add(ring2);

    // Lobby fill lights
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const p = new THREE.PointLight(0xffffff, 2.0, 48);
      p.position.set(Math.sin(a) * 9.8, 7.6, Math.cos(a) * 9.8);
      root.add(p);
    }

    // Pit spotlight (so it’s clearly “dropped”)
    const pitSpot = new THREE.SpotLight(0xffffff, 3.0, 50, Math.PI / 7, 0.35, 1.1);
    pitSpot.position.set(0, 10.5, 0);
    pitSpot.target.position.set(0, -pitDepth, 0);
    root.add(pitSpot);
    root.add(pitSpot.target);

    // ---------- FLOORS: TOP RING + RAMP + PIT FLOOR ----------
    // Top ring (hole in middle)
    const topRing = new THREE.Mesh(new THREE.RingGeometry(rampOuterR, LOBBY_R, 160), matFloor);
    topRing.rotation.x = -Math.PI / 2;
    topRing.position.y = 0;
    root.add(topRing);
    floors.push(topRing);

    // Smooth ramp ring (outer at y=0 → inner at y=-pitDepth)
    const ramp = new THREE.Mesh(makeRampRing(THREE, rampInnerR, rampOuterR, -pitDepth, 0, 180), matFloor);
    root.add(ramp);
    floors.push(ramp);

    // Pit floor
    const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(rimR, 120), matFloor);
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.y = -pitDepth;
    root.add(pitFloor);
    floors.push(pitFloor);

    // Rim cap (makes it feel “built in”)
    const rimCap = new THREE.Mesh(new THREE.TorusGeometry(rampInnerR, 0.10, 14, 240), matTrim);
    rimCap.position.set(0, 0.06, 0);
    rimCap.rotation.x = Math.PI / 2;
    root.add(rimCap);

    // Pit wall (visual)
    const pitWall = new THREE.Mesh(new THREE.CylinderGeometry(rampInnerR, rampInnerR, pitDepth, 120, 1, true), matWall);
    pitWall.position.set(0, -pitDepth / 2, 0);
    root.add(pitWall);

    // ---------- PIT GUARDRAILS (DROPPED + POSTS) ----------
    // Blue rail (slightly lower)
    const railR = rampOuterR - 0.22;
    const blueRail = new THREE.Mesh(new THREE.TorusGeometry(railR - 0.18, 0.10, 16, 260), matBlue);
    blueRail.position.set(0, 0.88, 0);
    blueRail.rotation.x = Math.PI / 2;
    root.add(blueRail);

    // Gold rail (above)
    const goldRail = new THREE.Mesh(new THREE.TorusGeometry(railR - 0.06, 0.10, 16, 260), matGold);
    goldRail.position.set(0, 1.05, 0);
    goldRail.rotation.x = Math.PI / 2;
    root.add(goldRail);

    // Cyan halo accent
    const halo = new THREE.Mesh(new THREE.TorusGeometry(railR - 0.06, 0.055, 12, 260), matNeonA);
    halo.position.set(0, 1.22, 0);
    halo.rotation.x = Math.PI / 2;
    root.add(halo);

    // Posts
    const postMat = matGold;
    const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.92, 10);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const x = Math.sin(a) * (railR - 0.06);
      const z = Math.cos(a) * (railR - 0.06);
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(x, 0.62, z);
      root.add(post);
    }

    // ---------- TABLE (IN PIT, LEATHER TRIM) ----------
    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.05, 0.25, 72), matFelt);
    tableTop.position.set(0, tableY, 0);
    root.add(tableTop);

    const tableTrim = new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.17, 18, 200), matLeather);
    tableTrim.position.copy(tableTop.position).add(new THREE.Vector3(0, 0.22, 0));
    tableTrim.rotation.x = Math.PI / 2;
    root.add(tableTrim);

    // ---------- STAIRS ENTRANCE DOWN INTO PIT + GUARD BOT ----------
    // Place stairs on +Z side
    const stairs = buildStairs(THREE, {
      stepCount: 9,
      stepW: 2.2,
      stepH: pitDepth / 9,
      stepD: 0.55,
      mat: matTrim
    });

    const stairsDir = new THREE.Vector3(0, 0, 1); // +Z
    const stairTop = stairsDir.clone().multiplyScalar(rampOuterR - 0.9);
    stairs.position.set(stairTop.x, 0.0, stairTop.z);
    stairs.rotation.y = Math.PI; // face down into pit
    root.add(stairs);

    // Make stairs walkable: add each step as floor collider
    stairs.children.forEach(step => floors.push(step));

    // Guard bot at top of stairs
    const guard = buildGuardBot(THREE, { mat: new THREE.MeshStandardMaterial({ color: 0x334a7a, roughness: 0.55, metalness: 0.12 }) });
    guard.position.set(stairTop.x, 0, stairTop.z + 1.1);
    guard.lookAt(0, 0, 0);
    root.add(guard);

    const guardLight = new THREE.PointLight(0xffffff, 2.2, 18);
    guardLight.position.copy(guard.position).add(new THREE.Vector3(0, 3.0, 0));
    root.add(guardLight);

    // ---------- LOBBY WALLS RESTORED (NO MISSING WALLS) ----------
    // Continuous outer shell, but we still cut hallway gaps by NOT placing door blockers.
    // This avoids “random openings” while keeping hall entrances.

    // Full outer cylinder wall
    const wallShell = new THREE.Mesh(
      new THREE.CylinderGeometry(LOBBY_R + WALL_T/2, LOBBY_R + WALL_T/2, WALL_H, 128, 1, true),
      matWall
    );
    wallShell.position.set(0, WALL_H/2, 0);
    root.add(wallShell);

    // Bright trim band around top
    const topBand = new THREE.Mesh(
      new THREE.TorusGeometry(LOBBY_R + 0.08, 0.10, 12, 240),
      matNeonA
    );
    topBand.position.set(0, WALL_H - 0.55, 0);
    topBand.rotation.x = Math.PI / 2;
    root.add(topBand);

    // ---------- HALLWAYS + ROOMS (BRIGHTER) ----------
    const roomDefs = [
      { label: "STORE",    ax:  0,           neon: matNeonA },
      { label: "SCORPION", ax:  Math.PI/2,   neon: matNeonP },
      { label: "SPECTATE", ax:  Math.PI,     neon: matNeonA },
      { label: "LOUNGE",   ax: -Math.PI/2,   neon: matNeonP },
    ];

    roomDefs.forEach((r) => {
      const dir = new THREE.Vector3(Math.sin(r.ax), 0, Math.cos(r.ax));

      const hallCenter = dir.clone().multiplyScalar(LOBBY_R + HALL_L/2 - 0.25);

      const hallFloor = new THREE.Mesh(new THREE.BoxGeometry(HALL_W, 0.22, HALL_L), matFloor);
      hallFloor.position.set(hallCenter.x, -0.11, hallCenter.z);
      hallFloor.rotation.y = r.ax;
      root.add(hallFloor);
      floors.push(hallFloor);

      // hallway glow strip + extra lights
      const strip = new THREE.Mesh(new THREE.BoxGeometry(HALL_W - 0.6, 0.14, HALL_L - 0.6), r.neon);
      strip.position.set(hallCenter.x, 4.2, hallCenter.z);
      strip.rotation.y = r.ax;
      root.add(strip);

      for (let k = 0; k < 6; k++) {
        const t = (k / 5) - 0.5;
        const p = new THREE.PointLight(0xffffff, 2.1, 26);
        const pos = hallCenter.clone().add(dir.clone().multiplyScalar(t * HALL_L));
        p.position.set(pos.x, 3.9, pos.z);
        root.add(p);
      }

      // room center
      const roomCenter = dir.clone().multiplyScalar(LOBBY_R + HALL_L + ROOM_D/2 - 0.7);

      const roomFloor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.25, ROOM_D), matFloor);
      roomFloor.position.set(roomCenter.x, -0.12, roomCenter.z);
      roomFloor.rotation.y = r.ax;
      root.add(roomFloor);
      floors.push(roomFloor);

      // Bright room lights (super bright)
      const roomLight1 = new THREE.PointLight(0xffffff, 2.6, 40);
      roomLight1.position.set(roomCenter.x, 5.7, roomCenter.z);
      root.add(roomLight1);

      const roomLight2 = new THREE.PointLight(0xffffff, 2.0, 36);
      roomLight2.position.set(roomCenter.x, 3.0, roomCenter.z);
      root.add(roomLight2);

      // Glowing sign near entrance
      const signPos = dir.clone().multiplyScalar(LOBBY_R - 0.9);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.58, 0.20), r.neon);
      sign.position.set(signPos.x, 3.1, signPos.z);
      sign.rotation.y = r.ax;
      root.add(sign);

      const signLight = new THREE.PointLight(0xffffff, 2.2, 16);
      signLight.position.set(signPos.x, 3.8, signPos.z);
      root.add(signLight);
    });

    // ---------- JUMBOTRONS (slightly lower) ----------
    const screenW = 7.6, screenH = 3.3;
    for (let i = 0; i < 4; i++) {
      const a = i * (Math.PI / 2);
      const sx = Math.sin(a) * (LOBBY_R - 1.0);
      const sz = Math.cos(a) * (LOBBY_R - 1.0);

      const screenMat = new THREE.MeshStandardMaterial({
        color: 0x07080c,
        roughness: 0.25,
        metalness: 0.1,
        emissive: 0x101428,
        emissiveIntensity: 1.25
      });

      const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), screenMat);
      screen.position.set(sx, 8.1, sz);
      screen.lookAt(0, 8.1, 0);
      root.add(screen);

      const glow = new THREE.PointLight(0x7fe7ff, 2.4, 20);
      glow.position.copy(screen.position);
      glow.translateZ(-0.6);
      root.add(glow);
    }

    // ---------- VIP SPAWN ----------
    const vipBase = new THREE.Vector3(LOBBY_R - 1.8, 0, 6.2);
    const spawnPos = vipBase.clone().add(new THREE.Vector3(0, 0, -1.3));
    const yawToTable = Math.atan2(0 - spawnPos.x, 0 - spawnPos.z);
    spawns.set("vip_cube", { x: spawnPos.x, y: 0, z: spawnPos.z, yaw: yawToTable });

    log?.("[world] built ✅ WORLD 8.0 (smooth pit + stairs + guard + bright + walls)");
  }

  // ---------- HELPERS ----------
  function makeRampRing(THREE, innerR, outerR, yInner, yOuter, segments = 128) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    const addV = (x,y,z,u,v) => {
      positions.push(x,y,z);
      normals.push(0,1,0);
      uvs.push(u,v);
    };

    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      const cx = Math.sin(t), cz = Math.cos(t);

      // inner edge (lower)
      addV(cx * innerR, yInner, cz * innerR, 0, i / segments);
      // outer edge (upper)
      addV(cx * outerR, yOuter, cz * outerR, 1, i / segments);
    }

    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }

    const g = new THREE.BufferGeometry();
    g.setIndex(indices);
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.computeVertexNormals();
    return g;
  }

  function buildStairs(THREE, { stepCount, stepW, stepH, stepD, mat }) {
    const g = new THREE.Group();
    g.name = "PitStairs";

    for (let i = 0; i < stepCount; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), mat);
      // stack downward
      step.position.set(0, -stepH/2 - i * stepH, -i * stepD);
      step.name = "StairStep";
      g.add(step);
    }
    return g;
  }

  function buildGuardBot(THREE, { mat }) {
    const g = new THREE.Group();
    g.name = "GuardBot";

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.70, 6, 14), mat);
    body.position.set(0, 1.1, 0);
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.20, 18, 18), mat);
    head.position.set(0, 1.75, 0);
    g.add(head);

    // “badge” glow
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.05), new THREE.MeshStandardMaterial({
      color: 0x0b0d14,
      emissive: 0x7fe7ff,
      emissiveIntensity: 2.6
    }));
    badge.position.set(0, 1.25, 0.26);
    g.add(badge);

    return g;
  }

  function getSpawn() { return spawns.get("vip_cube"); }
  function getFloors() { return floors; }

  return { build, getSpawn, getFloors };
})();
