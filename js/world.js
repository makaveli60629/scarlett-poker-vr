// /js/world.js — Scarlett MASTER WORLD v6.4 (GO-TIME)
// ✅ Spawn in VIP (pink hallway) facing table
// ✅ Teleport machine in VIP
// ✅ Divot pit table visible + lit
// ✅ Perimeter walls 2x taller (jumbotron-ready)
// ✅ Gold rail line + neon trims
// ✅ 3 circular ceiling lights + spotlights (elegant)
// ✅ Store/Scorpion/Spectate/VIP rooms present
// ✅ Exposes floors[] for teleport raycast

export const World = (() => {
  const state = {
    group: null,
    floors: [],
    spawns: {},
    tableZone: null,
  };

  function _mat(THREE, hex, opts = {}) {
    return new THREE.MeshStandardMaterial({
      color: hex,
      metalness: opts.metalness ?? 0.12,
      roughness: opts.roughness ?? 0.9,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 0.0,
      side: opts.side ?? THREE.FrontSide,
      transparent: !!opts.transparent,
      opacity: opts.opacity ?? 1.0,
    });
  }

  function _addFloor(mesh) {
    mesh.userData.isFloor = true;
    state.floors.push(mesh);
  }

  function _ring(THREE, r1, r2, y, mat) {
    const g = new THREE.RingGeometry(r1, r2, 96);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mat);
    m.position.y = y;
    return m;
  }

  function wrapAngle(x){
    while (x > Math.PI) x -= Math.PI*2;
    while (x < -Math.PI) x += Math.PI*2;
    return x;
  }

  function yawToward(x, z, tx=0, tz=0) {
    // yaw that faces target tx,tz
    return Math.atan2(tx - x, tz - z);
  }

  function build({ THREE, scene, log = console.log }) {
    const root = new THREE.Group();
    root.name = "ScarlettWorld";
    scene.add(root);
    state.group = root;

    // Mood fog (still bright)
    scene.fog = new THREE.FogExp2(0x05060a, 0.012);

    // Materials
    const matFloor = _mat(THREE, 0x0b0f1a, { roughness: 0.98 });
    const matWall  = _mat(THREE, 0x121a2b, { roughness: 0.92 });
    const matTrim  = _mat(THREE, 0x1a2a44, { roughness: 0.72, metalness: 0.28 });
    const matNeon  = _mat(THREE, 0x101820, { roughness: 0.55, metalness: 0.35, emissive: 0x7fe7ff, emissiveIntensity: 1.25 });
    const matPink  = _mat(THREE, 0x101018, { roughness: 0.55, metalness: 0.35, emissive: 0xff2d7a, emissiveIntensity: 1.35 });
    const matGold  = _mat(THREE, 0x2a2414, { roughness: 0.45, metalness: 0.78, emissive: 0xffcc66, emissiveIntensity: 0.12 });

    // =========================
    // LIGHTING (BRIGHT + ELEGANT)
    // =========================
    root.add(new THREE.HemisphereLight(0xbfd5ff, 0x141526, 0.70));

    const sun = new THREE.DirectionalLight(0xffffff, 1.45);
    sun.position.set(10, 18, 8);
    root.add(sun);

    // lobby fill
    const fillA = new THREE.PointLight(0xbfd5ff, 10.5, 80, 2.0);
    fillA.position.set(0, 9.0, 0);
    root.add(fillA);

    const fillB = new THREE.PointLight(0x7fe7ff, 6.5, 55, 2.0);
    fillB.position.set(-10, 4.8, 7);
    root.add(fillB);

    const fillC = new THREE.PointLight(0xff2d7a, 5.0, 50, 2.0);
    fillC.position.set(10, 4.0, 7);
    root.add(fillC);

    // =========================
    // MAIN LOBBY (CIRCLE)
    // =========================
    const lobby = new THREE.Group();
    lobby.name = "Lobby";
    root.add(lobby);

    const LOBBY_R = 18;

    // WALLS NEED TO BE TWICE AS HIGH (for jumbotrons)
    const WALL_H = 8.4;         // (was ~4.2)
    const WALL_T = 0.35;

    const lobbyFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(LOBBY_R, LOBBY_R, 0.2, 96),
      matFloor
    );
    lobbyFloor.position.y = -0.1;
    lobby.add(lobbyFloor);
    _addFloor(lobbyFloor);

    // Rim + gold rail line
    const rim = new THREE.Mesh(new THREE.TorusGeometry(LOBBY_R - 0.6, 0.22, 16, 96), matTrim);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.02;
    lobby.add(rim);

    const goldRail = new THREE.Mesh(new THREE.TorusGeometry(LOBBY_R - 1.0, 0.07, 12, 128), matGold);
    goldRail.rotation.x = Math.PI / 2;
    goldRail.position.y = 0.06;
    lobby.add(goldRail);

    // Guidance rings (aqua + pink)
    lobby.add(_ring(THREE, LOBBY_R - 2.2, LOBBY_R - 2.0, 0.03, matNeon));
    lobby.add(_ring(THREE, 12.2, 12.0, 0.03, matPink));

    // =========================
    // ELEGANT CEILING: 3 CIRCULAR LIGHTS + SPOTLIGHTS
    // =========================
    const ceilingY = 8.9;

    const canopy = new THREE.Mesh(
      new THREE.CylinderGeometry(LOBBY_R - 1.0, LOBBY_R - 1.0, 0.18, 96),
      _mat(THREE, 0x0c101c, { roughness: 0.75, metalness: 0.15 })
    );
    canopy.position.y = ceilingY;
    lobby.add(canopy);

    // 3 ring lights
    const ringA = _ring(THREE, 12.2, 12.45, ceilingY - 0.12, matNeon);
    const ringB = _ring(THREE, 8.3, 8.55, ceilingY - 0.12, matPink);
    const ringC = _ring(THREE, 4.6, 4.8, ceilingY - 0.12, matGold);
    lobby.add(ringA, ringB, ringC);

    // small spotlights around the table for elegance
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = Math.sin(a) * 6.5;
      const z = Math.cos(a) * 6.5;
      const s = new THREE.SpotLight(0xfff3dd, 3.2, 35, Math.PI/8, 0.45, 1.7);
      s.position.set(x, ceilingY - 0.4, z);
      s.target.position.set(0, -0.6, 0);
      lobby.add(s);
      lobby.add(s.target);
    }

    // =========================
    // PERIMETER WALLS (SEGMENTS WITH 4 DOORS)
    // =========================
    const PANEL_COUNT = 44;
    const doorAngles = [0, Math.PI/2, Math.PI, -Math.PI/2]; // +Z, +X, -Z, -X
    const doorHalfWidth = 0.23;

    for (let i = 0; i < PANEL_COUNT; i++) {
      const a = (i / PANEL_COUNT) * Math.PI * 2;

      let skip = false;
      for (const da of doorAngles) {
        const d = wrapAngle(a - da);
        if (Math.abs(d) < doorHalfWidth) { skip = true; break; }
      }
      if (skip) continue;

      const arc = (2 * Math.PI * LOBBY_R) / PANEL_COUNT;
      const panelW = arc * 0.98;

      const panel = new THREE.Mesh(new THREE.BoxGeometry(panelW, WALL_H, WALL_T), matWall);
      const r = LOBBY_R - 0.15;
      panel.position.set(Math.sin(a) * r, WALL_H/2, Math.cos(a) * r);
      panel.rotation.y = a;
      lobby.add(panel);

      // neon trim up high (jumbotron deck feel)
      const strip = new THREE.Mesh(new THREE.BoxGeometry(panelW * 0.92, 0.16, 0.14), matNeon);
      strip.position.set(panel.position.x, WALL_H - 0.60, panel.position.z);
      strip.rotation.y = a;
      lobby.add(strip);

      // gold cap line (lux)
      const cap = new THREE.Mesh(new THREE.BoxGeometry(panelW * 0.92, 0.10, 0.10), matGold);
      cap.position.set(panel.position.x, WALL_H - 0.25, panel.position.z);
      cap.rotation.y = a;
      lobby.add(cap);
    }

    // =========================
    // CENTER DIVOT + PIT TABLE
    // =========================
    const divot = new THREE.Mesh(
      new THREE.CylinderGeometry(7.2, 9.2, 1.6, 96),
      matFloor
    );
    divot.position.set(0, -0.8, 0);
    lobby.add(divot);
    _addFloor(divot);

    const divotRim = new THREE.Mesh(new THREE.TorusGeometry(9.2, 0.14, 14, 96), matTrim);
    divotRim.rotation.x = Math.PI / 2;
    divotRim.position.y = -0.02;
    lobby.add(divotRim);

    const divotGold = new THREE.Mesh(new THREE.TorusGeometry(9.2, 0.06, 12, 128), matGold);
    divotGold.rotation.x = Math.PI / 2;
    divotGold.position.y = 0.05;
    lobby.add(divotGold);

    // downlight so you SEE the pit table
    const divotLight = new THREE.SpotLight(0xbfd5ff, 22, 60, Math.PI/7, 0.35, 1.7);
    divotLight.position.set(0, ceilingY - 0.2, 0);
    divotLight.target.position.set(0, -0.9, 0);
    lobby.add(divotLight);
    lobby.add(divotLight.target);

    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 2.8, 0.35, 64),
      _mat(THREE, 0x1b2233, { roughness: 0.62, metalness: 0.22 })
    );
    table.position.set(0, -0.45, 0);
    lobby.add(table);

    const rail = new THREE.Mesh(new THREE.TorusGeometry(3.85, 0.09, 12, 128), matGold);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = -0.22;
    lobby.add(rail);

    const railNeon = new THREE.Mesh(new THREE.TorusGeometry(3.55, 0.06, 12, 128), matNeon);
    railNeon.rotation.x = Math.PI / 2;
    railNeon.position.y = -0.18;
    lobby.add(railNeon);

    state.tableZone = { x: 0, z: 0, r: 4.8 };

    // =========================
    // VIP ROOM AREA (PINK) + TELEPORT MACHINE MOVED HERE
    // =========================
    const vip = new THREE.Group();
    vip.name = "VIP_SpawnArea";
    lobby.add(vip);

    const VIP_X = 6.5;
    const VIP_Z = 8.5;

    const vipPlate = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.18, 7.8), matTrim);
    vipPlate.position.set(VIP_X, -0.01, VIP_Z);
    vip.add(vipPlate);
    _addFloor(vipPlate);

    // Pink “teleport room” halo
    const vipHalo = _ring(THREE, 3.4, 3.65, 0.05, matPink);
    vipHalo.position.set(VIP_X, 0.06, VIP_Z);
    vip.add(vipHalo);

    // Teleport machine (pink)
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.55, 0.55, 32), matTrim);
    pedestal.position.set(VIP_X, 0.275, VIP_Z);
    vip.add(pedestal);

    const machine = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.90, 1.95, 28), matPink);
    machine.position.set(VIP_X, 1.45, VIP_Z);
    vip.add(machine);

    const machineGlow = _ring(THREE, 1.15, 1.38, 0.06, matPink);
    machineGlow.position.set(VIP_X, 0.08, VIP_Z);
    vip.add(machineGlow);

    const vipLight = new THREE.PointLight(0xff2d7a, 8.5, 40, 2.0);
    vipLight.position.set(VIP_X, 3.8, VIP_Z);
    vip.add(vipLight);

    // VIP pads (spawn points)
    function makePad(ix, iz, mat) {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 1.4), mat);
      pad.position.set(VIP_X + ix, 0.04, VIP_Z + iz);
      vip.add(pad);
      _addFloor(pad);
      return pad;
    }

    const padA = makePad(-2.0,  0.0, matPink); // make VIP A pink so you KNOW
    const padB = makePad( 0.0, -2.0, matNeon);
    const padC = makePad( 2.0,  0.0, matNeon);
    const padD = makePad( 0.0,  2.0, matNeon);

    // Spawn facing the pit table (0,0)
    state.spawns = {
      lobby_vip_A: { x: padA.position.x, y: 0, z: padA.position.z, yaw: yawToward(padA.position.x, padA.position.z, 0, 0) },
      lobby_vip_B: { x: padB.position.x, y: 0, z: padB.position.z, yaw: yawToward(padB.position.x, padB.position.z, 0, 0) },
      lobby_vip_C: { x: padC.position.x, y: 0, z: padC.position.z, yaw: yawToward(padC.position.x, padC.position.z, 0, 0) },
      lobby_vip_D: { x: padD.position.x, y: 0, z: padD.position.z, yaw: yawToward(padD.position.x, padD.position.z, 0, 0) },
      lobby_center:{ x: 0, y: 0, z: 10, yaw: yawToward(0, 10, 0, 0) },
    };

    // =========================
    // 4 ROOMS + HALLWAYS (WITH DOORS) + PINK VIP HALLWAY
    // =========================
    const roomDefs = [
      { name: "STORE",    angle: 0,            neon: matNeon },
      { name: "SCORPION", angle: Math.PI/2,    neon: matPink },
      { name: "SPECTATE", angle: Math.PI,      neon: matNeon },
      { name: "VIP",      angle: -Math.PI/2,   neon: matPink }, // pink hallway vibe
    ];

    const HALL_LEN = 14;
    const ROOM_W = 14;
    const ROOM_D = 12;
    const ROOM_H = 5.0;

    function addHallAndRoom(def) {
      const angle = def.angle;
      const dir = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
      const side = new THREE.Vector3(dir.z, 0, -dir.x);

      const hallCenter = dir.clone().multiplyScalar(LOBBY_R - 1.0 + (HALL_LEN / 2));
      const roomCenter = dir.clone().multiplyScalar(LOBBY_R - 1.0 + HALL_LEN + (ROOM_D / 2));

      // hall floor
      const hallFloor = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.2, HALL_LEN), matFloor);
      hallFloor.position.set(hallCenter.x, -0.1, hallCenter.z);
      hallFloor.rotation.y = angle;
      root.add(hallFloor);
      _addFloor(hallFloor);

      // hall walls
      const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.25, ROOM_H, HALL_LEN), matWall);
      const wallR = wallL.clone();
      wallL.position.set(hallCenter.x, ROOM_H/2, hallCenter.z);
      wallR.position.set(hallCenter.x, ROOM_H/2, hallCenter.z);
      wallL.position.add(side.clone().multiplyScalar(2.85));
      wallR.position.add(side.clone().multiplyScalar(-2.85));
      wallL.rotation.y = angle;
      wallR.rotation.y = angle;
      root.add(wallL, wallR);

      // neon strip
      const strip = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.12, HALL_LEN * 0.92), def.neon);
      strip.position.set(hallCenter.x, 4.15, hallCenter.z);
      strip.rotation.y = angle;
      root.add(strip);

      // hall light
      const hallLight = new THREE.PointLight(def.neon === matPink ? 0xff2d7a : 0x7fe7ff, 6.8, 30, 2.0);
      hallLight.position.set(hallCenter.x, 3.5, hallCenter.z);
      root.add(hallLight);

      // room floor
      const roomFloor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.2, ROOM_D), matFloor);
      roomFloor.position.set(roomCenter.x, -0.1, roomCenter.z);
      roomFloor.rotation.y = angle;
      root.add(roomFloor);
      _addFloor(roomFloor);

      // room walls with door gap on front
      const doorW = 3.6;
      const doorH = 3.2;
      const t = 0.3;

      function addFrontWallWithDoorGap() {
        const frontCenter = roomCenter.clone().add(dir.clone().multiplyScalar(-ROOM_D/2));
        const leftW = (ROOM_W - doorW) / 2;

        const segL = new THREE.Mesh(new THREE.BoxGeometry(leftW, ROOM_H, t), matWall);
        segL.position.copy(frontCenter).add(side.clone().multiplyScalar((doorW/2 + leftW/2)));
        segL.position.y = ROOM_H/2; segL.rotation.y = angle; root.add(segL);

        const segR = new THREE.Mesh(new THREE.BoxGeometry(leftW, ROOM_H, t), matWall);
        segR.position.copy(frontCenter).add(side.clone().multiplyScalar(-(doorW/2 + leftW/2)));
        segR.position.y = ROOM_H/2; segR.rotation.y = angle; root.add(segR);

        const lintelH = ROOM_H - doorH;
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, lintelH, t), matWall);
        lintel.position.copy(frontCenter);
        lintel.position.y = doorH + lintelH/2;
        lintel.rotation.y = angle;
        root.add(lintel);

        const frame = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.6, 0.18, 0.18), def.neon);
        frame.position.copy(frontCenter);
        frame.position.y = doorH + 0.15;
        frame.rotation.y = angle;
        root.add(frame);
      }

      function addBackWall() {
        const backCenter = roomCenter.clone().add(dir.clone().multiplyScalar(ROOM_D/2));
        const wall = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, ROOM_H, t), matWall);
        wall.position.copy(backCenter); wall.position.y = ROOM_H/2;
        wall.rotation.y = angle;
        root.add(wall);
      }

      function addSideWalls() {
        const leftCenter  = roomCenter.clone().add(side.clone().multiplyScalar(ROOM_W/2));
        const rightCenter = roomCenter.clone().add(side.clone().multiplyScalar(-ROOM_W/2));
        const wall = new THREE.Mesh(new THREE.BoxGeometry(t, ROOM_H, ROOM_D), matWall);

        const wl = wall.clone();
        wl.position.copy(leftCenter); wl.position.y = ROOM_H/2; wl.rotation.y = angle; root.add(wl);

        const wr = wall.clone();
        wr.position.copy(rightCenter); wr.position.y = ROOM_H/2; wr.rotation.y = angle; root.add(wr);
      }

      addFrontWallWithDoorGap();
      addBackWall();
      addSideWalls();

      // room neon ceiling + light
      const roomLight = new THREE.PointLight(def.neon === matPink ? 0xff2d7a : 0x7fe7ff, 8.6, 44, 2.0);
      roomLight.position.set(roomCenter.x, 3.8, roomCenter.z);
      root.add(roomLight);

      const roomCeil = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W * 0.8, 0.12, ROOM_D * 0.8), def.neon);
      roomCeil.position.set(roomCenter.x, 4.55, roomCenter.z);
      roomCeil.rotation.y = angle;
      root.add(roomCeil);

      // simple “return” content
      if (def.name === "STORE") {
        const kiosk = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 2.2), matTrim);
        kiosk.position.set(roomCenter.x, 0.6, roomCenter.z);
        kiosk.rotation.y = angle;
        root.add(kiosk);
        const glow = new THREE.PointLight(0x7fe7ff, 4.5, 18, 2.0);
        glow.position.set(roomCenter.x, 2.2, roomCenter.z);
        root.add(glow);
      }
      if (def.name === "SCORPION") {
        const throne = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 1.2, 24), matPink);
        throne.position.set(roomCenter.x, 0.6, roomCenter.z);
        root.add(throne);
        const glow = new THREE.PointLight(0xff2d7a, 5.5, 22, 2.0);
        glow.position.set(roomCenter.x, 2.6, roomCenter.z);
        root.add(glow);
      }
      if (def.name === "SPECTATE") {
        const deck = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.2, 4.5), matTrim);
        deck.position.set(roomCenter.x, 0.1, roomCenter.z);
        deck.rotation.y = angle;
        root.add(deck);
      }

      // spawn inside room
      const spawn = roomCenter.clone().add(dir.clone().multiplyScalar(-ROOM_D/2 + 2.2));
      state.spawns[`room_${def.name.toLowerCase()}`] = { x: spawn.x, y: 0, z: spawn.z, yaw: angle + Math.PI };
    }

    roomDefs.forEach(addHallAndRoom);

    log("[world] built ✅ (VIP pink spawn + tall walls + gold rails + elegant ceiling lights)");

    return {
      group: state.group,
      floors: state.floors,
      spawns: state.spawns,
      tableZone: state.tableZone,
    };
  }

  function getSpawn(name = "lobby_vip_A") {
    return state.spawns?.[name] || state.spawns?.lobby_vip_A || { x: 0, y: 0, z: 10, yaw: Math.PI };
  }

  function getFloors() {
    return state.floors || [];
  }

  return { build, getSpawn, getFloors };
})();
