// /js/world.js — Scarlett WORLD 7.6 (FULL: doors + bigger lobby + pit + rail aligned + signs + jumbotrons + bots)

export const World = (() => {
  let floors = [];
  const spawns = new Map();
  const state = { root: null };

  function build({ THREE, scene, log }) {
    floors = [];
    spawns.clear();

    const root = new THREE.Group();
    root.name = "WorldRoot";
    scene.add(root);
    state.root = root;

    // ---------- COLORS / MATS ----------
    const colFloor = 0x0b0d14;
    const colWall  = 0x14182a;
    const colTrim  = 0x222a4a;
    const colGold  = 0xd2b46a;
    const colFelt  = 0x123018;
    const colAqua  = 0x7fe7ff;
    const colPink  = 0xff2d7a;

    const matFloor = new THREE.MeshStandardMaterial({ color: colFloor, roughness: 0.95, metalness: 0.05 });
    const matWall  = new THREE.MeshStandardMaterial({ color: colWall,  roughness: 0.90, metalness: 0.07 });
    const matTrim  = new THREE.MeshStandardMaterial({ color: colTrim,  roughness: 0.65, metalness: 0.10 });
    const matGold  = new THREE.MeshStandardMaterial({ color: colGold,  roughness: 0.25, metalness: 0.90 });
    const matFelt  = new THREE.MeshStandardMaterial({ color: colFelt,  roughness: 0.90, metalness: 0.06 });

    const matNeonA = new THREE.MeshStandardMaterial({ color: 0x05060a, emissive: colAqua, emissiveIntensity: 2.4, roughness: 0.3 });
    const matNeonP = new THREE.MeshStandardMaterial({ color: 0x05060a, emissive: colPink, emissiveIntensity: 2.4, roughness: 0.3 });

    // ---------- LIGHTS (BRIGHTER + ELEGANT) ----------
    root.add(new THREE.AmbientLight(0xffffff, 0.55));

    const sun = new THREE.DirectionalLight(0xffffff, 0.95);
    sun.position.set(14, 28, 10);
    root.add(sun);

    // Two big circular ring lights above the lobby
    const ringLightMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, emissive: 0xffffff, emissiveIntensity: 1.25, roughness: 0.2, metalness: 0.1 });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(9.4, 0.15, 12, 180), ringLightMat);
    ring1.position.set(0, 8.8, 0);
    ring1.rotation.x = Math.PI / 2;
    root.add(ring1);

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(6.6, 0.14, 12, 180), ringLightMat);
    ring2.position.set(0, 8.2, 0);
    ring2.rotation.x = Math.PI / 2;
    root.add(ring2);

    // Extra fill lights
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const p = new THREE.PointLight(0xffffff, 1.2, 34);
      p.position.set(Math.sin(a) * 8.6, 7.0, Math.cos(a) * 8.6);
      root.add(p);
    }

    // ---------- LOBBY DIMENSIONS ----------
    const LOBBY_R = 17;        // +1 bigger than before (you asked)
    const WALL_H  = 10.5;      // tall for jumbotrons
    const WALL_T  = 0.35;

    const HALL_W  = 4.4;
    const HALL_L  = 11.2;

    const ROOM_W  = 12;
    const ROOM_D  = 12;
    const ROOM_H  = 6.5;

    // ---------- MAIN LOBBY FLOOR ----------
    const lobbyFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(LOBBY_R, LOBBY_R, 0.26, 96),
      matFloor
    );
    lobbyFloor.position.y = -0.13;
    root.add(lobbyFloor);
    floors.push(lobbyFloor);

    // ---------- PIT / DIVOT + TABLE (VISIBLE) ----------
    const pitR = 6.4;
    const pitDepth = 1.35;

    const pitFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(pitR, pitR, 0.22, 90),
      matFloor
    );
    pitFloor.position.set(0, -pitDepth - 0.11, 0);
    root.add(pitFloor);
    floors.push(pitFloor);

    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitR + 0.14, pitR + 0.14, pitDepth, 90, 1, true),
      matWall
    );
    pitWall.position.set(0, -pitDepth / 2, 0);
    root.add(pitWall);

    // pit rim trim
    const pitRim = new THREE.Mesh(
      new THREE.TorusGeometry(pitR + 0.17, 0.08, 12, 180),
      matTrim
    );
    pitRim.position.set(0, 0.02, 0);
    pitRim.rotation.x = Math.PI / 2;
    root.add(pitRim);

    // felt table top inside pit
    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(2.95, 2.95, 0.25, 56),
      matFelt
    );
    tableTop.position.set(0, -pitDepth + 0.62, 0);
    root.add(tableTop);

    const tableRail = new THREE.Mesh(
      new THREE.TorusGeometry(3.05, 0.16, 18, 160),
      matGold
    );
    tableRail.position.copy(tableTop.position).add(new THREE.Vector3(0, 0.22, 0));
    tableRail.rotation.x = Math.PI / 2;
    root.add(tableRail);

    // ---------- GOLD GUARD RAIL (FIXED SIZE + ALIGNED) ----------
    // Smaller and centered so it does NOT intersect walls.
    const guardR = 12.2; // tuned for LOBBY_R=17
    const goldRail = new THREE.Mesh(
      new THREE.TorusGeometry(guardR, 0.12, 18, 220),
      matGold
    );
    goldRail.position.set(0, 1.05, 0);
    goldRail.rotation.x = Math.PI / 2;
    root.add(goldRail);

    // ---------- LOBBY WALL WITH 4 DOOR GAPS ----------
    const gapAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    const gapWidth = 0.28; // slightly wider doorways

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

    // ---------- HALLWAYS + ROOMS + GLOW SIGNS ----------
    const rooms = [
      { key: "STORE",    ax:  0,            neon: matNeonA },
      { key: "SCORPION", ax:  Math.PI / 2,  neon: matNeonP },
      { key: "SPECTATE", ax:  Math.PI,      neon: matNeonA },
      { key: "LOUNGE",   ax: -Math.PI / 2,  neon: matNeonP },
    ];

    rooms.forEach((r) => {
      const dir = new THREE.Vector3(Math.sin(r.ax), 0, Math.cos(r.ax));

      const hallCenter = dir.clone().multiplyScalar(LOBBY_R + HALL_L / 2 - 0.25);

      // hallway floor
      const hallFloor = new THREE.Mesh(new THREE.BoxGeometry(HALL_W, 0.22, HALL_L), matFloor);
      hallFloor.position.set(hallCenter.x, -0.11, hallCenter.z);
      hallFloor.rotation.y = r.ax;
      root.add(hallFloor);
      floors.push(hallFloor);

      // hallway walls
      const wallH = 4.4;
      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.22, wallH, HALL_L), matWall);
      leftWall.position.set(hallCenter.x, wallH / 2, hallCenter.z);
      leftWall.rotation.y = r.ax;
      leftWall.translateX(-HALL_W / 2);
      root.add(leftWall);

      const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.22, wallH, HALL_L), matWall);
      rightWall.position.set(hallCenter.x, wallH / 2, hallCenter.z);
      rightWall.rotation.y = r.ax;
      rightWall.translateX(HALL_W / 2);
      root.add(rightWall);

      // neon ceiling strip
      const strip = new THREE.Mesh(new THREE.BoxGeometry(HALL_W - 0.6, 0.12, HALL_L - 0.6), r.neon);
      strip.position.set(hallCenter.x, wallH - 0.35, hallCenter.z);
      strip.rotation.y = r.ax;
      root.add(strip);

      // entrance sign (glowing) right at the lobby doorway
      const sign = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.5, 0.18), r.neon);
      const signPos = dir.clone().multiplyScalar(LOBBY_R - 0.9);
      sign.position.set(signPos.x, 3.0, signPos.z);
      sign.rotation.y = r.ax;
      root.add(sign);

      // small light above sign
      const signLight = new THREE.PointLight(0xffffff, 1.2, 12);
      signLight.position.set(signPos.x, 3.5, signPos.z);
      root.add(signLight);

      // room center
      const roomCenter = dir.clone().multiplyScalar(LOBBY_R + HALL_L + ROOM_D / 2 - 0.7);

      const roomFloor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.25, ROOM_D), matFloor);
      roomFloor.position.set(roomCenter.x, -0.12, roomCenter.z);
      roomFloor.rotation.y = r.ax;
      root.add(roomFloor);
      floors.push(roomFloor);

      // room walls
      const vt = 0.25;
      const mk = (w,h,d)=> new THREE.Mesh(new THREE.BoxGeometry(w,h,d), matWall);

      const front = mk(ROOM_W, ROOM_H, vt);
      front.position.set(roomCenter.x, ROOM_H/2, roomCenter.z);
      front.rotation.y = r.ax;
      front.translateZ(ROOM_D/2);
      root.add(front);

      const back = mk(ROOM_W, ROOM_H, vt);
      back.position.set(roomCenter.x, ROOM_H/2, roomCenter.z);
      back.rotation.y = r.ax;
      back.translateZ(-ROOM_D/2);
      root.add(back);

      const sl = mk(vt, ROOM_H, ROOM_D);
      sl.position.set(roomCenter.x, ROOM_H/2, roomCenter.z);
      sl.rotation.y = r.ax;
      sl.translateX(-ROOM_W/2);
      root.add(sl);

      const sr = mk(vt, ROOM_H, ROOM_D);
      sr.position.set(roomCenter.x, ROOM_H/2, roomCenter.z);
      sr.rotation.y = r.ax;
      sr.translateX(ROOM_W/2);
      root.add(sr);

      // room light
      const roomLight = new THREE.PointLight(0xffffff, 1.6, 30);
      roomLight.position.set(roomCenter.x, 5.3, roomCenter.z);
      root.add(roomLight);

      // store display case placeholder in STORE room
      if (r.key === "STORE") {
        const caseBase = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.35, 2.2), matTrim);
        caseBase.position.set(roomCenter.x, 0.18, roomCenter.z);
        caseBase.rotation.y = r.ax;
        root.add(caseBase);

        const glass = new THREE.Mesh(
          new THREE.BoxGeometry(5.2, 1.6, 2.0),
          new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.0 })
        );
        glass.position.copy(caseBase.position).add(new THREE.Vector3(0, 0.95, 0));
        glass.rotation.y = r.ax;
        root.add(glass);

        const glow = new THREE.PointLight(0x7fe7ff, 1.6, 14);
        glow.position.copy(caseBase.position).add(new THREE.Vector3(0, 1.7, 0));
        root.add(glow);
      }
    });

    // ---------- VIP CUBE ROOM (WITH DOOR OPENING) ----------
    // Put VIP cube near east side, with an opening toward the lobby (you asked: cube VIP spawn).
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

    // Door opening on the -Z wall (toward lobby-ish)
    const doorW = 2.2;
    const doorH = 2.6;

    // Helper: build wall as two segments leaving a doorway gap
    function wallWithDoor({ center, axis, totalW, thickness, height, doorWidth, doorHeight, mat }) {
      // axis: "x" wall spans X, placed at Z edge; "z" spans Z, placed at X edge
      const topH = Math.max(0.1, height - doorHeight);
      const sideW = (totalW - doorWidth) / 2;

      // top piece
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(totalW, topH, thickness),
        mat
      );
      top.position.copy(center).add(new THREE.Vector3(0, doorHeight + topH/2, 0));

      // left piece
      const left = new THREE.Mesh(
        new THREE.BoxGeometry(sideW, doorHeight, thickness),
        mat
      );
      left.position.copy(center).add(new THREE.Vector3(-(doorWidth/2 + sideW/2), doorHeight/2, 0));

      // right piece
      const right = new THREE.Mesh(
        new THREE.BoxGeometry(sideW, doorHeight, thickness),
        mat
      );
      right.position.copy(center).add(new THREE.Vector3((doorWidth/2 + sideW/2), doorHeight/2, 0));

      return { top, left, right };
    }

    // Back wall (no door)
    const wBack = new THREE.Mesh(new THREE.BoxGeometry(vipSize, vipH, vipT), matWall);
    wBack.position.copy(vipBase).add(new THREE.Vector3(0, vipH/2, vipSize/2));
    vipRoom.add(wBack);

    // Front wall with door opening (at -Z edge)
    const wallCenterFront = vipBase.clone().add(new THREE.Vector3(0, 0, -vipSize/2));
    const frontParts = wallWithDoor({
      center: wallCenterFront, axis: "x",
      totalW: vipSize, thickness: vipT, height: vipH,
      doorWidth: doorW, doorHeight: doorH,
      mat: matWall
    });
    vipRoom.add(frontParts.top, frontParts.left, frontParts.right);

    // Side walls
    const wR = new THREE.Mesh(new THREE.BoxGeometry(vipT, vipH, vipSize), matWall);
    wR.position.copy(vipBase).add(new THREE.Vector3(vipSize/2, vipH/2, 0));
    vipRoom.add(wR);

    const wL = new THREE.Mesh(new THREE.BoxGeometry(vipT, vipH, vipSize), matWall);
    wL.position.copy(vipBase).add(new THREE.Vector3(-vipSize/2, vipH/2, 0));
    vipRoom.add(wL);

    // VIP neon ceiling + light
    const vipStrip = new THREE.Mesh(new THREE.BoxGeometry(vipSize - 0.6, 0.12, vipSize - 0.6), matNeonP);
    vipStrip.position.copy(vipBase).add(new THREE.Vector3(0, vipH - 0.35, 0));
    vipRoom.add(vipStrip);

    const vipLight = new THREE.PointLight(0xff2d7a, 2.8, 20);
    vipLight.position.copy(vipBase).add(new THREE.Vector3(0, 3.2, 0));
    vipRoom.add(vipLight);

    // VIP spawn inside cube, facing the table
    const spawnPos = vipBase.clone().add(new THREE.Vector3(0, 0, -1.3));
    const yawToTable = Math.atan2(0 - spawnPos.x, 0 - spawnPos.z);
    spawns.set("vip_cube", { x: spawnPos.x, y: 0, z: spawnPos.z, yaw: yawToTable });

    // ---------- JUMBOTRONS (HIGHER + “CONTENT”) ----------
    // Put them higher and add a glowing “panel” behind to look active.
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
        emissiveIntensity: 1.1
      });

      const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), screenMat);
      screen.position.set(sx, 8.4, sz); // higher than before
      screen.lookAt(0, 8.4, 0);
      root.add(screen);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(screenW + 0.3, screenH + 0.3, 0.18), matTrim);
      frame.position.copy(screen.position);
      frame.quaternion.copy(screen.quaternion);
      frame.translateZ(-0.10);
      root.add(frame);

      // glow bar under screen
      const glowBar = new THREE.Mesh(new THREE.BoxGeometry(screenW, 0.18, 0.20), matNeonA);
      glowBar.position.copy(screen.position);
      glowBar.quaternion.copy(screen.quaternion);
      glowBar.translateY(-screenH/2 - 0.25);
      glowBar.translateZ(-0.08);
      root.add(glowBar);

      const glowLight = new THREE.PointLight(0x7fe7ff, 1.8, 16);
      glowLight.position.copy(screen.position);
      glowLight.translateZ(-0.5);
      root.add(glowLight);
    }

    // ---------- BOTS + CHAIRS (PLACEHOLDERS) ----------
    // Simple seated bots around the pit table so it feels alive.
    const chairMat = matTrim;
    const botMat = new THREE.MeshStandardMaterial({ color: 0x3a4a7a, roughness: 0.65, metalness: 0.1 });

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 4.2;
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      const y = -pitDepth + 0.20;

      // chair
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

      // bot body
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 6, 12), botMat);
      body.position.copy(seat.position).add(new THREE.Vector3(0, 0.55, -0.18));
      body.lookAt(0, body.position.y, 0);
      root.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 18), botMat);
      head.position.copy(body.position).add(new THREE.Vector3(0, 0.52, 0));
      root.add(head);
    }

    log?.("[world] built ✅ (FULL: doors+larger lobby+pit+rail aligned+signs+jumbotrons+bots)");
  }

  function getSpawn() {
    return spawns.get("vip_cube");
  }

  function getFloors() { return floors; }

  return { build, getSpawn, getFloors };
})();
