// /js/world.js — Scarlett WORLD 7.7 (REAL PIT TERRAIN + ROOM DOORS OPEN + MORE LIGHTS + PIT GUARDRAIL)
// ✅ Top floor is now a RING with a hole (you can see the divot)
// ✅ Adds a sloped ramp ring down into the pit (true “terrain” feel)
// ✅ Pit floor stays down below
// ✅ Adds PIT GUARDRAIL around the pit edge (prevents falling vibe)
// ✅ Cuts door openings into ALL 4 square rooms (hallway -> room entrances open)
// ✅ Adds lots more lights + 2 overhead circles + table/pit lighting
// ✅ Keeps hallways + lobby walls + jumbotrons + signage + store case + bots

export const World = (() => {
  let floors = [];
  const spawns = new Map();

  function build({ THREE, scene, log }) {
    floors = [];
    spawns.clear();

    const root = new THREE.Group();
    root.name = "WorldRoot";
    scene.add(root);

    // ---------- THEME ----------
    const colFloor = 0x0b0d14;
    const colWall  = 0x14182a;
    const colTrim  = 0x222a4a;
    const colGold  = 0xd2b46a;
    const colFelt  = 0x123018;
    const colAqua  = 0x7fe7ff;
    const colPink  = 0xff2d7a;

    const matFloor = new THREE.MeshStandardMaterial({ color: colFloor, roughness: 0.95, metalness: 0.05, side: THREE.DoubleSide });
    const matWall  = new THREE.MeshStandardMaterial({ color: colWall,  roughness: 0.90, metalness: 0.07 });
    const matTrim  = new THREE.MeshStandardMaterial({ color: colTrim,  roughness: 0.65, metalness: 0.10 });
    const matGold  = new THREE.MeshStandardMaterial({ color: colGold,  roughness: 0.25, metalness: 0.90 });
    const matFelt  = new THREE.MeshStandardMaterial({ color: colFelt,  roughness: 0.90, metalness: 0.06 });

    const matNeonA = new THREE.MeshStandardMaterial({ color: 0x05060a, emissive: colAqua, emissiveIntensity: 2.4, roughness: 0.3 });
    const matNeonP = new THREE.MeshStandardMaterial({ color: 0x05060a, emissive: colPink, emissiveIntensity: 2.4, roughness: 0.3 });

    // ---------- DIMENSIONS ----------
    const LOBBY_R = 17;        // lobby radius
    const WALL_H  = 10.5;
    const WALL_T  = 0.35;

    const HALL_W  = 4.4;
    const HALL_L  = 11.2;

    const ROOM_W  = 12;
    const ROOM_D  = 12;
    const ROOM_H  = 6.5;

    // PIT terrain params
    const pitR = 6.4;
    const pitDepth = 1.55;     // deeper so it’s obvious
    const rimR = pitR + 0.20;  // rim radius
    const rampOuterR = pitR + 2.1; // where the slope starts

    // ---------- LIGHTS (LOTS) ----------
    root.add(new THREE.AmbientLight(0xffffff, 0.62));

    const sun = new THREE.DirectionalLight(0xffffff, 1.05);
    sun.position.set(14, 28, 10);
    root.add(sun);

    // Two overhead circular “fixtures”
    const ringLightMat = new THREE.MeshStandardMaterial({
      color: 0x0b0d14,
      emissive: 0xffffff,
      emissiveIntensity: 1.35,
      roughness: 0.2,
      metalness: 0.1
    });

    const ceilingRing1 = new THREE.Mesh(new THREE.TorusGeometry(9.7, 0.16, 12, 200), ringLightMat);
    ceilingRing1.position.set(0, 9.2, 0);
    ceilingRing1.rotation.x = Math.PI / 2;
    root.add(ceilingRing1);

    const ceilingRing2 = new THREE.Mesh(new THREE.TorusGeometry(6.8, 0.15, 12, 200), ringLightMat);
    ceilingRing2.position.set(0, 8.5, 0);
    ceilingRing2.rotation.x = Math.PI / 2;
    root.add(ceilingRing2);

    // Lobby fill lights
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const p = new THREE.PointLight(0xffffff, 1.25, 38);
      p.position.set(Math.sin(a) * 9.2, 7.3, Math.cos(a) * 9.2);
      root.add(p);
    }

    // Pit/table focused lights (so you SEE the divot)
    const pitKey = new THREE.SpotLight(0xffffff, 2.0, 35, Math.PI / 6, 0.45, 1.2);
    pitKey.position.set(0, 9.0, 0);
    pitKey.target.position.set(0, -pitDepth, 0);
    root.add(pitKey);
    root.add(pitKey.target);

    const pitGlow = new THREE.PointLight(0x7fe7ff, 1.4, 18);
    pitGlow.position.set(0, 1.6, 0);
    root.add(pitGlow);

    // ---------- TERRAIN: TOP RING FLOOR (HOLE IN MIDDLE) ----------
    // This is the big fix: you can now SEE the pit and walk to the edge.
    const topRing = new THREE.Mesh(
      new THREE.RingGeometry(rampOuterR, LOBBY_R, 128),
      matFloor
    );
    topRing.rotation.x = -Math.PI / 2;
    topRing.position.y = 0;
    root.add(topRing);
    floors.push(topRing);

    // ---------- TERRAIN: RAMP RING (SLOPED DOWN) ----------
    // Custom geometry: outer edge at y=0, inner edge at y=-pitDepth
    const ramp = new THREE.Mesh(
      makeRampRing(THREE, rimR, rampOuterR, -pitDepth, 0, 140),
      matFloor
    );
    root.add(ramp);
    floors.push(ramp);

    // ---------- TERRAIN: PIT FLOOR ----------
    const pitFloor = new THREE.Mesh(
      new THREE.CircleGeometry(rimR, 96),
      matFloor
    );
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.y = -pitDepth;
    root.add(pitFloor);
    floors.push(pitFloor);

    // Pit inner wall (visual)
    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(rimR, rimR, pitDepth, 96, 1, true),
      matWall
    );
    pitWall.position.set(0, -pitDepth / 2, 0);
    root.add(pitWall);

    // Pit rim trim
    const pitRim = new THREE.Mesh(
      new THREE.TorusGeometry(rimR, 0.09, 14, 200),
      matTrim
    );
    pitRim.position.set(0, 0.05, 0);
    pitRim.rotation.x = Math.PI / 2;
    root.add(pitRim);

    // ---------- TABLE (DOWN IN PIT, VISIBLE) ----------
    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(2.95, 2.95, 0.25, 56),
      matFelt
    );
    tableTop.position.set(0, -pitDepth + 0.70, 0);
    root.add(tableTop);

    const tableRail = new THREE.Mesh(
      new THREE.TorusGeometry(3.05, 0.16, 18, 160),
      matGold
    );
    tableRail.position.copy(tableTop.position).add(new THREE.Vector3(0, 0.22, 0));
    tableRail.rotation.x = Math.PI / 2;
    root.add(tableRail);

    // ---------- PIT GUARDRAIL (THE IMPORTANT ONE) ----------
    // This is the “don’t fall into pit” rail (not the giant lobby ring).
    const pitGuardR = rampOuterR - 0.25;
    const pitGuard = new THREE.Mesh(
      new THREE.TorusGeometry(pitGuardR, 0.10, 16, 220),
      matGold
    );
    pitGuard.position.set(0, 1.05, 0);
    pitGuard.rotation.x = Math.PI / 2;
    root.add(pitGuard);

    // ---------- LOBBY WALL WITH 4 GAPS FOR HALLWAYS ----------
    const gapAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    const gapWidth = 0.28;

    function nearGap(a) {
      return gapAngles.some(g => {
        let d = Math.atan2(Math.sin(a - g), Math.cos(a - g));
        return Math.abs(d) < gapWidth;
      });
    }

    for (let i = 0; i < 56; i++) {
      const a = (i / 56) * Math.PI * 2;
      if (nearGap(a)) continue;

      const px = Math.sin(a) * (LOBBY_R + WALL_T / 2);
      const pz = Math.cos(a) * (LOBBY_R + WALL_T / 2);

      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.0, WALL_H, WALL_T), matWall);
      panel.position.set(px, WALL_H / 2, pz);
      panel.rotation.y = a;
      root.add(panel);

      const trim = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.28, WALL_T + 0.02), matTrim);
      trim.position.set(px, 2.6, pz);
      trim.rotation.y = a;
      root.add(trim);
    }

    // ---------- HALLWAYS + ROOMS ----------
    // We will CUT a doorway in the room wall that faces the hallway.
    const doorW = 2.6;
    const doorH = 2.9;
    const doorT = 0.25;

    const roomDefs = [
      { label: "STORE",    ax:  0,            neon: matNeonA },
      { label: "SCORPION", ax:  Math.PI / 2,  neon: matNeonP },
      { label: "SPECTATE", ax:  Math.PI,      neon: matNeonA },
      { label: "LOUNGE",   ax: -Math.PI / 2,  neon: matNeonP },
    ];

    roomDefs.forEach((r) => {
      const dir = new THREE.Vector3(Math.sin(r.ax), 0, Math.cos(r.ax));

      // hallway
      const hallCenter = dir.clone().multiplyScalar(LOBBY_R + HALL_L / 2 - 0.25);

      const hallFloor = new THREE.Mesh(new THREE.BoxGeometry(HALL_W, 0.22, HALL_L), matFloor);
      hallFloor.position.set(hallCenter.x, -0.11, hallCenter.z);
      hallFloor.rotation.y = r.ax;
      root.add(hallFloor);
      floors.push(hallFloor);

      // hallway walls
      const hWallH = 4.4;
      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.22, hWallH, HALL_L), matWall);
      leftWall.position.set(hallCenter.x, hWallH / 2, hallCenter.z);
      leftWall.rotation.y = r.ax;
      leftWall.translateX(-HALL_W / 2);
      root.add(leftWall);

      const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.22, hWallH, HALL_L), matWall);
      rightWall.position.set(hallCenter.x, hWallH / 2, hallCenter.z);
      rightWall.rotation.y = r.ax;
      rightWall.translateX(HALL_W / 2);
      root.add(rightWall);

      // hallway neon strip + lights
      const strip = new THREE.Mesh(new THREE.BoxGeometry(HALL_W - 0.6, 0.12, HALL_L - 0.6), r.neon);
      strip.position.set(hallCenter.x, hWallH - 0.35, hallCenter.z);
      strip.rotation.y = r.ax;
      root.add(strip);

      for (let k = 0; k < 4; k++) {
        const t = (k / 3) - 0.5;
        const p = new THREE.PointLight(0xffffff, 1.15, 18);
        const pos = hallCenter.clone().add(dir.clone().multiplyScalar(t * HALL_L));
        p.position.set(pos.x, 3.7, pos.z);
        root.add(p);
      }

      // entrance sign at lobby door
      const signPos = dir.clone().multiplyScalar(LOBBY_R - 0.9);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.55, 0.18), r.neon);
      sign.position.set(signPos.x, 3.0, signPos.z);
      sign.rotation.y = r.ax;
      root.add(sign);

      const signLight = new THREE.PointLight(0xffffff, 1.3, 12);
      signLight.position.set(signPos.x, 3.6, signPos.z);
      root.add(signLight);

      // room
      const roomCenter = dir.clone().multiplyScalar(LOBBY_R + HALL_L + ROOM_D / 2 - 0.7);

      const roomFloor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.25, ROOM_D), matFloor);
      roomFloor.position.set(roomCenter.x, -0.12, roomCenter.z);
      roomFloor.rotation.y = r.ax;
      root.add(roomFloor);
      floors.push(roomFloor);

      // room walls: back, sides, and FRONT wall (toward hallway) HAS DOOR OPENING.
      const mkWall = (w,h,d)=> new THREE.Mesh(new THREE.BoxGeometry(w,h,d), matWall);

      // back wall (far side)
      const back = mkWall(ROOM_W, ROOM_H, doorT);
      back.position.set(roomCenter.x, ROOM_H/2, roomCenter.z);
      back.rotation.y = r.ax;
      back.translateZ(ROOM_D/2);
      root.add(back);

      // left/right walls
      const sl = mkWall(doorT, ROOM_H, ROOM_D);
      sl.position.set(roomCenter.x, ROOM_H/2, roomCenter.z);
      sl.rotation.y = r.ax;
      sl.translateX(-ROOM_W/2);
      root.add(sl);

      const sr = mkWall(doorT, ROOM_H, ROOM_D);
      sr.position.set(roomCenter.x, ROOM_H/2, roomCenter.z);
      sr.rotation.y = r.ax;
      sr.translateX(ROOM_W/2);
      root.add(sr);

      // FRONT wall toward hallway: build 3 parts leaving doorway
      const frontCenter = new THREE.Vector3(roomCenter.x, 0, roomCenter.z);
      const doorWallParts = wallWithDoorLocal({
        THREE,
        center: frontCenter,
        rotY: r.ax,
        zEdge: -ROOM_D/2,
        totalW: ROOM_W,
        thickness: doorT,
        height: ROOM_H,
        doorWidth: doorW,
        doorHeight: doorH,
        mat: matWall
      });
      root.add(doorWallParts.top, doorWallParts.left, doorWallParts.right);

      // room light
      const roomLight = new THREE.PointLight(0xffffff, 1.8, 32);
      roomLight.position.set(roomCenter.x, 5.3, roomCenter.z);
      root.add(roomLight);

      // Store display case placeholder
      if (r.label === "STORE") {
        const caseBase = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.35, 2.3), matTrim);
        caseBase.position.set(roomCenter.x, 0.18, roomCenter.z);
        caseBase.rotation.y = r.ax;
        root.add(caseBase);

        const glass = new THREE.Mesh(
          new THREE.BoxGeometry(5.4, 1.6, 2.1),
          new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.0 })
        );
        glass.position.copy(caseBase.position).add(new THREE.Vector3(0, 0.95, 0));
        glass.rotation.y = r.ax;
        root.add(glass);

        const glow = new THREE.PointLight(0x7fe7ff, 1.9, 14);
        glow.position.copy(caseBase.position).add(new THREE.Vector3(0, 1.7, 0));
        root.add(glow);
      }
    });

    // ---------- VIP CUBE ROOM (SPAWN) ----------
    const vipSize = 6.8;
    const vipH = 4.4;
    const vipT = 0.22;

    const vipBase = new THREE.Vector3(LOBBY_R - 1.8, 0, 6.2);
    const vipRoom = new THREE.Group();
    vipRoom.name = "VIPCubeRoom";
    root.add(vipRoom);

    const vipFloor = new THREE.Mesh(new THREE.BoxGeometry(vipSize, 0.25, vipSize), matFloor);
    vipFloor.position.copy(vipBase).add(new THREE.Vector3(0, -0.12, 0));
    vipRoom.add(vipFloor);
    floors.push(vipFloor);

    // VIP walls with a doorway on -Z wall
    const vipDoorW = 2.4;
    const vipDoorH = 2.9;

    const backW = new THREE.Mesh(new THREE.BoxGeometry(vipSize, vipH, vipT), matWall);
    backW.position.copy(vipBase).add(new THREE.Vector3(0, vipH/2, vipSize/2));
    vipRoom.add(backW);

    const frontParts = wallWithDoorSimple({
      THREE,
      base: vipBase.clone().add(new THREE.Vector3(0, 0, -vipSize/2)),
      totalW: vipSize,
      thickness: vipT,
      height: vipH,
      doorWidth: vipDoorW,
      doorHeight: vipDoorH,
      mat: matWall
    });
    vipRoom.add(frontParts.top, frontParts.left, frontParts.right);

    const wR = new THREE.Mesh(new THREE.BoxGeometry(vipT, vipH, vipSize), matWall);
    wR.position.copy(vipBase).add(new THREE.Vector3(vipSize/2, vipH/2, 0));
    vipRoom.add(wR);

    const wL = new THREE.Mesh(new THREE.BoxGeometry(vipT, vipH, vipSize), matWall);
    wL.position.copy(vipBase).add(new THREE.Vector3(-vipSize/2, vipH/2, 0));
    vipRoom.add(wL);

    const vipStrip = new THREE.Mesh(new THREE.BoxGeometry(vipSize - 0.6, 0.12, vipSize - 0.6), matNeonP);
    vipStrip.position.copy(vipBase).add(new THREE.Vector3(0, vipH - 0.35, 0));
    vipRoom.add(vipStrip);

    const vipLight = new THREE.PointLight(0xff2d7a, 2.8, 22);
    vipLight.position.copy(vipBase).add(new THREE.Vector3(0, 3.2, 0));
    vipRoom.add(vipLight);

    // Spawn inside VIP cube facing table (0,0,0)
    const spawnPos = vipBase.clone().add(new THREE.Vector3(0, 0, -1.3));
    const yawToTable = Math.atan2(0 - spawnPos.x, 0 - spawnPos.z);
    spawns.set("vip_cube", { x: spawnPos.x, y: 0, z: spawnPos.z, yaw: yawToTable });

    // ---------- JUMBOTRONS HIGHER ----------
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
        emissiveIntensity: 1.15
      });

      const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), screenMat);
      screen.position.set(sx, 8.7, sz);
      screen.lookAt(0, 8.7, 0);
      root.add(screen);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(screenW + 0.3, screenH + 0.3, 0.18), matTrim);
      frame.position.copy(screen.position);
      frame.quaternion.copy(screen.quaternion);
      frame.translateZ(-0.10);
      root.add(frame);

      const glowLight = new THREE.PointLight(0x7fe7ff, 2.0, 18);
      glowLight.position.copy(screen.position);
      glowLight.translateZ(-0.6);
      root.add(glowLight);
    }

    // ---------- SIMPLE BOTS + CHAIRS (IN PIT LEVEL) ----------
    const chairMat = matTrim;
    const botMat = new THREE.MeshStandardMaterial({ color: 0x3a4a7a, roughness: 0.65, metalness: 0.1 });

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 4.2;
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      const y = -pitDepth + 0.20;

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.6), chairMat);
      seat.position.set(x, y, z);
      seat.lookAt(0, y, 0);
      seat.translateZ(0.55);
      root.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.12), chairMat);
      back.position.copy(seat.position).add(new THREE.Vector3(0, 0.42, 0));
      back.quaternion.copy(seat.quaternion);
      back.translateZ(-0.30);
      root.add(back);

      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 6, 12), botMat);
      body.position.copy(seat.position).add(new THREE.Vector3(0, 0.55, -0.18));
      body.lookAt(0, body.position.y, 0);
      root.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 18), botMat);
      head.position.copy(body.position).add(new THREE.Vector3(0, 0.52, 0));
      root.add(head);
    }

    log?.("[world] built ✅ (7.7: REAL pit terrain + room doors open + more lights)");
  }

  // ----- helpers -----

  // Creates a sloped “terrain” ring: inner edge at yInner, outer edge at yOuter
  function makeRampRing(THREE, innerR, outerR, yInner, yOuter, segments = 128) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    const addV = (x,y,z, nx,ny,nz, u,v) => {
      positions.push(x,y,z);
      normals.push(nx,ny,nz);
      uvs.push(u,v);
    };

    // We'll build quads around the ring: (inner_i, outer_i, inner_{i+1}, outer_{i+1})
    // Approx normal: we’ll compute from two edges (good enough visually)
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      const cx = Math.sin(t), cz = Math.cos(t);

      const xi = cx * innerR, zi = cz * innerR;
      const xo = cx * outerR, zo = cz * outerR;

      // approximate normal points “up-ish” and outward; OK for our slope
      const nx = 0, ny = 1, nz = 0;

      // inner vertex
      addV(xi, yInner, zi, nx, ny, nz, 0, i / segments);
      // outer vertex
      addV(xo, yOuter, zo, nx, ny, nz, 1, i / segments);
    }

    // indices
    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;

      // two triangles: a-b-c and b-d-c
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

  // Room wall doorway in local space (rotY + zEdge)
  function wallWithDoorLocal({ THREE, center, rotY, zEdge, totalW, thickness, height, doorWidth, doorHeight, mat }) {
    const sideW = (totalW - doorWidth) / 2;
    const topH = Math.max(0.1, height - doorHeight);

    const top = new THREE.Mesh(new THREE.BoxGeometry(totalW, topH, thickness), mat);
    const left = new THREE.Mesh(new THREE.BoxGeometry(sideW, doorHeight, thickness), mat);
    const right = new THREE.Mesh(new THREE.BoxGeometry(sideW, doorHeight, thickness), mat);

    // start at room center
    top.position.copy(center);
    left.position.copy(center);
    right.position.copy(center);

    top.rotation.y = rotY;
    left.rotation.y = rotY;
    right.rotation.y = rotY;

    // move to wall edge
    top.translateZ(zEdge);
    left.translateZ(zEdge);
    right.translateZ(zEdge);

    // set heights
    top.position.y = doorHeight + topH / 2;
    left.position.y = doorHeight / 2;
    right.position.y = doorHeight / 2;

    // split left/right
    left.translateX(-(doorWidth/2 + sideW/2));
    right.translateX((doorWidth/2 + sideW/2));

    return { top, left, right };
  }

  // Simple wall-with-door for VIP cube front (no rotation needed)
  function wallWithDoorSimple({ THREE, base, totalW, thickness, height, doorWidth, doorHeight, mat }) {
    const sideW = (totalW - doorWidth) / 2;
    const topH = Math.max(0.1, height - doorHeight);

    const top = new THREE.Mesh(new THREE.BoxGeometry(totalW, topH, thickness), mat);
    const left = new THREE.Mesh(new THREE.BoxGeometry(sideW, doorHeight, thickness), mat);
    const right = new THREE.Mesh(new THREE.BoxGeometry(sideW, doorHeight, thickness), mat);

    top.position.copy(base).add(new THREE.Vector3(0, doorHeight + topH/2, 0));
    left.position.copy(base).add(new THREE.Vector3(-(doorWidth/2 + sideW/2), doorHeight/2, 0));
    right.position.copy(base).add(new THREE.Vector3((doorWidth/2 + sideW/2), doorHeight/2, 0));

    return { top, left, right };
  }

  function getSpawn() {
    return spawns.get("vip_cube");
  }

  function getFloors() { return floors; }

  return { build, getSpawn, getFloors };
})();
