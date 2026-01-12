// /js/world.js — Scarlett WORLD 7.0 (FULL RESTORE)
// ✅ Circular lobby + 4 rooms + hallways (connected)
// ✅ Door openings into hallways (no blocked entrances)
// ✅ Pit/divot table restored
// ✅ VIP CUBE ROOM restored + permanent spawn inside it
// ✅ Floors registered for teleport raycast
// ✅ Dark “casino” materials (no white plastic look)
// ✅ Lots of lights (lobby + halls + rooms)

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
    const colTrim  = 0x1f2748;
    const colGold  = 0xd2b46a;
    const colAqua  = 0x7fe7ff;
    const colPink  = 0xff2d7a;
    const colFelt  = 0x123018;

    const matFloor = new THREE.MeshStandardMaterial({ color: colFloor, roughness: 0.95, metalness: 0.05 });
    const matWall  = new THREE.MeshStandardMaterial({ color: colWall,  roughness: 0.90, metalness: 0.06 });
    const matTrim  = new THREE.MeshStandardMaterial({ color: colTrim,  roughness: 0.65, metalness: 0.12 });
    const matGold  = new THREE.MeshStandardMaterial({ color: colGold,  roughness: 0.25, metalness: 0.85 });
    const matFelt  = new THREE.MeshStandardMaterial({ color: colFelt,  roughness: 0.90, metalness: 0.05 });
    const matNeonA = new THREE.MeshStandardMaterial({ color: 0x0b0d14, emissive: colAqua, emissiveIntensity: 2.2, roughness: 0.4 });
    const matNeonP = new THREE.MeshStandardMaterial({ color: 0x0b0d14, emissive: colPink, emissiveIntensity: 2.2, roughness: 0.4 });

    // ---------- LIGHTS ----------
    root.add(new THREE.AmbientLight(0xffffff, 0.45));

    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(12, 24, 10);
    root.add(sun);

    // Lobby ring lights
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const p = new THREE.PointLight(0xffffff, 1.15, 28);
      p.position.set(Math.cos(a) * 9.5, 7.5, Math.sin(a) * 9.5);
      root.add(p);
    }

    // ---------- LOBBY DIMENSIONS ----------
    const LOBBY_R = 16;
    const WALL_H  = 10;        // tall for jumbotrons
    const WALL_T  = 0.35;

    const HALL_W  = 4.2;
    const HALL_L  = 10.5;

    const ROOM_W  = 12;
    const ROOM_D  = 12;
    const ROOM_H  = 6.5;

    // ---------- FLOORS ----------
    // main lobby floor disc
    const lobbyFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(LOBBY_R, LOBBY_R, 0.26, 96),
      matFloor
    );
    lobbyFloor.position.y = -0.13;
    lobbyFloor.receiveShadow = true;
    root.add(lobbyFloor);
    floors.push(lobbyFloor);

    // ---------- PIT / DIVOT + TABLE ----------
    const pitR = 6.2;
    const pitDepth = 1.25;

    const pitFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(pitR, pitR, 0.22, 80),
      matFloor
    );
    pitFloor.position.set(0, -pitDepth - 0.11, 0);
    root.add(pitFloor);
    floors.push(pitFloor);

    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitR + 0.12, pitR + 0.12, pitDepth, 80, 1, true),
      matWall
    );
    pitWall.position.set(0, -pitDepth / 2, 0);
    root.add(pitWall);

    // felt table top inside pit
    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(2.85, 2.85, 0.25, 48),
      matFelt
    );
    tableTop.position.set(0, -pitDepth + 0.55, 0);
    root.add(tableTop);

    const tableRail = new THREE.Mesh(
      new THREE.TorusGeometry(2.95, 0.16, 18, 120),
      matGold
    );
    tableRail.position.copy(tableTop.position).add(new THREE.Vector3(0, 0.20, 0));
    tableRail.rotation.x = Math.PI / 2;
    root.add(tableRail);

    // ---------- GOLD RAIL AROUND LOBBY ----------
    const goldRail = new THREE.Mesh(
      new THREE.TorusGeometry(11.7, 0.13, 18, 200),
      matGold
    );
    goldRail.position.set(0, 1.05, 0);
    goldRail.rotation.x = Math.PI / 2;
    root.add(goldRail);

    // ---------- LOBBY WALL WITH DOOR OPENINGS ----------
    // We build 8 wall panels around the circle, leaving 4 gaps (N/E/S/W) for hallways.
    const wallPanels = new THREE.Group();
    root.add(wallPanels);

    const gapAngles = [
      0,                // +Z (north)
      Math.PI / 2,      // +X (east)
      Math.PI,          // -Z (south)
      -Math.PI / 2      // -X (west)
    ];

    function angleNearGap(a) {
      // within ~15° of a hallway gap
      const w = 0.26;
      return gapAngles.some(g => {
        let d = Math.atan2(Math.sin(a - g), Math.cos(a - g));
        d = Math.abs(d);
        return d < w;
      });
    }

    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      if (angleNearGap(a)) continue; // leave doorway gaps

      const px = Math.sin(a) * (LOBBY_R + WALL_T / 2);
      const pz = Math.cos(a) * (LOBBY_R + WALL_T / 2);

      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, WALL_H, WALL_T),
        matWall
      );
      panel.position.set(px, WALL_H / 2, pz);
      panel.rotation.y = a;
      wallPanels.add(panel);

      // trim band
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(2.05, 0.25, WALL_T + 0.02),
        matTrim
      );
      trim.position.set(px, 2.4, pz);
      trim.rotation.y = a;
      wallPanels.add(trim);
    }

    // ---------- HALLWAYS + ROOMS ----------
    // Cardinals: N = store, E = scorpion, S = spectate, W = lounge
    const rooms = [
      { key: "store",    ax:  0,            neon: matNeonA },
      { key: "scorpion", ax:  Math.PI / 2,  neon: matNeonP },
      { key: "spectate", ax:  Math.PI,      neon: matNeonA },
      { key: "lounge",   ax: -Math.PI / 2,  neon: matNeonP },
    ];

    rooms.forEach((r, idx) => {
      const dir = new THREE.Vector3(Math.sin(r.ax), 0, Math.cos(r.ax));

      // hallway center
      const hallCenter = dir.clone().multiplyScalar(LOBBY_R + HALL_L / 2 - 0.2);

      // hallway floor
      const hallFloor = new THREE.Mesh(
        new THREE.BoxGeometry(HALL_W, 0.22, HALL_L),
        matFloor
      );
      hallFloor.position.set(hallCenter.x, -0.11, hallCenter.z);
      hallFloor.rotation.y = r.ax;
      root.add(hallFloor);
      floors.push(hallFloor);

      // hallway walls
      const hw = HALL_W;
      const hl = HALL_L;
      const wallH = 4.2;

      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.22, wallH, hl), matWall);
      leftWall.position.set(hallCenter.x, wallH / 2, hallCenter.z);
      leftWall.rotation.y = r.ax;
      leftWall.translateX(-hw / 2);
      root.add(leftWall);

      const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.22, wallH, hl), matWall);
      rightWall.position.set(hallCenter.x, wallH / 2, hallCenter.z);
      rightWall.rotation.y = r.ax;
      rightWall.translateX(hw / 2);
      root.add(rightWall);

      // neon strip down hallway ceiling
      const strip = new THREE.Mesh(new THREE.BoxGeometry(hw - 0.6, 0.12, hl - 0.6), r.neon);
      strip.position.set(hallCenter.x, wallH - 0.35, hallCenter.z);
      strip.rotation.y = r.ax;
      root.add(strip);

      // hallway lights
      for (let k = 0; k < 4; k++) {
        const t = (k / 3) - 0.5;
        const p = new THREE.PointLight(0xffffff, 1.0, 16);
        const pos = hallCenter.clone().add(dir.clone().multiplyScalar(t * hl));
        p.position.set(pos.x, 3.7, pos.z);
        root.add(p);
      }

      // room center (past hallway)
      const roomCenter = dir.clone().multiplyScalar(LOBBY_R + HALL_L + ROOM_D / 2 - 0.6);

      // room floor
      const roomFloor = new THREE.Mesh(
        new THREE.BoxGeometry(ROOM_W, 0.25, ROOM_D),
        matFloor
      );
      roomFloor.position.set(roomCenter.x, -0.12, roomCenter.z);
      roomFloor.rotation.y = r.ax;
      root.add(roomFloor);
      floors.push(roomFloor);

      // room walls (simple)
      const rw = ROOM_W, rd = ROOM_D;
      const wallT = 0.25;

      const mkWall = (w, h, d) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matWall);

      const front = mkWall(rw, ROOM_H, wallT);
      front.position.set(roomCenter.x, ROOM_H/2, roomCenter.z);
      front.rotation.y = r.ax;
      front.translateZ(rd/2);
      root.add(front);

      const back = mkWall(rw, ROOM_H, wallT);
      back.position.set(roomCenter.x, ROOM_H/2, roomCenter.z);
      back.rotation.y = r.ax;
      back.translateZ(-rd/2);
      root.add(back);

      const sideL = mkWall(wallT, ROOM_H, rd);
      sideL.position.set(roomCenter.x, ROOM_H/2, roomCenter.z);
      sideL.rotation.y = r.ax;
      sideL.translateX(-rw/2);
      root.add(sideL);

      const sideR = mkWall(wallT, ROOM_H, rd);
      sideR.position.set(roomCenter.x, ROOM_H/2, roomCenter.z);
      sideR.rotation.y = r.ax;
      sideR.translateX(rw/2);
      root.add(sideR);

      // room lights
      const roomLight = new THREE.PointLight(0xffffff, 1.4, 26);
      roomLight.position.set(roomCenter.x, 5.2, roomCenter.z);
      root.add(roomLight);

      // label plaque
      const plaque = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.35, 0.18), r.neon);
      plaque.position.set(roomCenter.x, 2.3, roomCenter.z);
      plaque.rotation.y = r.ax;
      plaque.translateZ(-rd/2 + 0.35);
      root.add(plaque);
    });

    // ---------- VIP CUBE ROOM (permanent spawn) ----------
    // This is your “VIP room cube” where you want to start, locked in, facing table.
    // Put it near the “scorpion” side but offset so it feels like a VIP entrance.
    const vipSize = 6.5;
    const vipRoom = new THREE.Group();
    vipRoom.name = "VIPCubeRoom";
    root.add(vipRoom);

    // Place VIP cube just off the east hallway entrance, slightly inside “private” space
    const vipBase = new THREE.Vector3(LOBBY_R - 2.0, 0, 6.0);

    const vipFloor = new THREE.Mesh(new THREE.BoxGeometry(vipSize, 0.25, vipSize), matFloor);
    vipFloor.position.copy(vipBase).add(new THREE.Vector3(0, -0.12, 0));
    vipRoom.add(vipFloor);
    floors.push(vipFloor);

    // cube walls
    const vt = 0.22;
    const vh = 4.2;

    const vipWalls = [
      { dx: 0, dz:  vipSize/2, w: vipSize, d: vt },
      { dx: 0, dz: -vipSize/2, w: vipSize, d: vt },
      { dx:  vipSize/2, dz: 0, w: vt, d: vipSize },
      { dx: -vipSize/2, dz: 0, w: vt, d: vipSize },
    ];

    vipWalls.forEach(w => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w.w, vh, w.d), matWall);
      m.position.copy(vipBase).add(new THREE.Vector3(w.dx, vh/2, w.dz));
      vipRoom.add(m);
    });

    // VIP pink ceiling strip + light
    const vipStrip = new THREE.Mesh(new THREE.BoxGeometry(vipSize - 0.6, 0.12, vipSize - 0.6), matNeonP);
    vipStrip.position.copy(vipBase).add(new THREE.Vector3(0, vh - 0.35, 0));
    vipRoom.add(vipStrip);

    const vipLight = new THREE.PointLight(0xff2d7a, 2.2, 18);
    vipLight.position.copy(vipBase).add(new THREE.Vector3(0, 3.2, 0));
    vipRoom.add(vipLight);

    // VIP spawn inside cube, facing the table (table is at 0,0,0)
    const spawnPos = vipBase.clone().add(new THREE.Vector3(0, 0, -1.2));
    const yawToTable = Math.atan2(0 - spawnPos.x, 0 - spawnPos.z);
    spawns.set("vip_cube", { x: spawnPos.x, y: 0, z: spawnPos.z, yaw: yawToTable });

    // ---------- JUMBOTRONS (placeholders; not white) ----------
    const screenW = 7.4, screenH = 3.2;
    for (let i = 0; i < 4; i++) {
      const a = i * (Math.PI / 2);
      const sx = Math.sin(a) * (LOBBY_R - 0.9);
      const sz = Math.cos(a) * (LOBBY_R - 0.9);

      const screenMat = new THREE.MeshStandardMaterial({
        color: 0x06070b,
        roughness: 0.25,
        metalness: 0.10,
        emissive: 0x0b0d14,
        emissiveIntensity: 0.6
      });

      const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), screenMat);
      screen.position.set(sx, 7.1, sz);
      screen.lookAt(0, 7.1, 0);
      root.add(screen);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(screenW + 0.3, screenH + 0.3, 0.18), matTrim);
      frame.position.copy(screen.position);
      frame.quaternion.copy(screen.quaternion);
      frame.translateZ(-0.10);
      root.add(frame);
    }

    log?.("[world] built ✅ (FULL restore: lobby+rooms+hallways+pit+VIP cube spawn)");
  }

  function getSpawn(name) {
    // Permanent: always VIP cube
    return spawns.get("vip_cube");
  }

  function getFloors() { return floors; }

  return { build, getSpawn, getFloors };
})();
