// /js/world.js — Scarlett MASTER WORLD v6.2
// ✅ Circular lobby with perimeter walls (segmented) + 4 doorway openings
// ✅ Hallways + rooms with real doorway gaps (no blocked entrances)
// ✅ Strong lighting + neon strips
// ✅ Divot + table zone + VIP spawn machine + pads
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

  function build({ THREE, scene, log = console.log }) {
    // Root
    const root = new THREE.Group();
    root.name = "ScarlettWorld";
    scene.add(root);
    state.group = root;

    // Materials
    const matFloor = _mat(THREE, 0x0b0f1a, { roughness: 0.98 });
    const matWall  = _mat(THREE, 0x121a2b, { roughness: 0.92 });
    const matTrim  = _mat(THREE, 0x1a2a44, { roughness: 0.75, metalness: 0.25 });
    const matNeon  = _mat(THREE, 0x101820, { roughness: 0.55, metalness: 0.35, emissive: 0x7fe7ff, emissiveIntensity: 1.2 });
    const matPink  = _mat(THREE, 0x101018, { roughness: 0.55, metalness: 0.35, emissive: 0xff2d7a, emissiveIntensity: 1.25 });

    // =========================
    // LIGHTING PACK (BRIGHT)
    // =========================
    const hemi = new THREE.HemisphereLight(0xbfd5ff, 0x141526, 0.55);
    root.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 1.25);
    sun.position.set(10, 18, 8);
    root.add(sun);

    // Lobby lights (bright, soft)
    const lobbyLightA = new THREE.PointLight(0xbfd5ff, 12.0, 60, 2.0);
    lobbyLightA.position.set(0, 8.5, 0);
    root.add(lobbyLightA);

    const lobbyLightB = new THREE.PointLight(0x7fe7ff, 7.0, 45, 2.0);
    lobbyLightB.position.set(0, 4.5, 10);
    root.add(lobbyLightB);

    const lobbyLightC = new THREE.PointLight(0xff2d7a, 5.0, 35, 2.0);
    lobbyLightC.position.set(6.5, 3.0, 8.5);
    root.add(lobbyLightC);

    // =========================
    // MAIN LOBBY (CIRCLE)
    // =========================
    const lobby = new THREE.Group();
    lobby.name = "Lobby";
    root.add(lobby);

    const LOBBY_R = 18;

    const lobbyFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(LOBBY_R, LOBBY_R, 0.2, 96),
      matFloor
    );
    lobbyFloor.position.y = -0.1;
    lobby.add(lobbyFloor);
    _addFloor(lobbyFloor);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(LOBBY_R - 0.6, 0.22, 16, 96),
      matTrim
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.02;
    lobby.add(rim);

    // Neon guidance ring
    lobby.add(_ring(THREE, LOBBY_R - 2.2, LOBBY_R - 2.0, 0.03, matNeon));

    // =========================
    // PERIMETER WALLS (SEGMENTS WITH 4 OPEN DOORS)
    // =========================
    // We build many wall panels around the circle and SKIP panels near the 4 hallway directions.
    const WALL_H = 4.2;
    const WALL_T = 0.35;
    const PANEL_COUNT = 40;
    const doorAngles = [0, Math.PI/2, Math.PI, -Math.PI/2]; // +Z, +X, -Z, -X
    const doorHalfWidth = 0.23; // radians (~ door opening width)

    for (let i = 0; i < PANEL_COUNT; i++) {
      const a = (i / PANEL_COUNT) * Math.PI * 2;
      // skip panels near door angles
      let skip = false;
      for (const da of doorAngles) {
        const d = wrapAngle(a - da);
        if (Math.abs(d) < doorHalfWidth) { skip = true; break; }
      }
      if (skip) continue;

      // panel size approximates arc length
      const arc = (2 * Math.PI * LOBBY_R) / PANEL_COUNT;
      const panelW = arc * 0.98;

      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(panelW, WALL_H, WALL_T),
        matWall
      );

      const r = LOBBY_R - 0.15;
      panel.position.set(Math.sin(a) * r, WALL_H/2, Math.cos(a) * r);

      // face inward
      panel.rotation.y = a;
      lobby.add(panel);

      // neon trim strip on top
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(panelW * 0.92, 0.14, 0.12),
        matNeon
      );
      strip.position.set(panel.position.x, WALL_H - 0.35, panel.position.z);
      strip.rotation.y = a;
      lobby.add(strip);
    }

    function wrapAngle(x){
      while (x > Math.PI) x -= Math.PI*2;
      while (x < -Math.PI) x += Math.PI*2;
      return x;
    }

    // =========================
    // CENTER DIVOT + TABLE ZONE
    // =========================
    const divot = new THREE.Mesh(
      new THREE.CylinderGeometry(7.2, 9.2, 1.4, 96),
      matFloor
    );
    divot.position.set(0, -0.7, 0);
    lobby.add(divot);
    _addFloor(divot);

    const divotRim = new THREE.Mesh(
      new THREE.TorusGeometry(9.2, 0.14, 14, 96),
      matTrim
    );
    divotRim.rotation.x = Math.PI / 2;
    divotRim.position.y = -0.02;
    lobby.add(divotRim);

    // extra downlight into divot (so you SEE it)
    const divotLight = new THREE.SpotLight(0xbfd5ff, 18, 50, Math.PI/6, 0.35, 1.6);
    divotLight.position.set(0, 10, 0);
    divotLight.target.position.set(0, -0.6, 0);
    lobby.add(divotLight);
    lobby.add(divotLight.target);

    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.6, 0.35, 48),
      _mat(THREE, 0x1b2233, { roughness: 0.65, metalness: 0.2 })
    );
    table.position.set(0, -0.35, 0);
    lobby.add(table);

    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(3.6, 0.08, 12, 96),
      matNeon
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.y = -0.18;
    lobby.add(rail);

    state.tableZone = { x: 0, z: 0, r: 4.3 };

    // =========================
    // VIP SPAWN AREA (Machine + Pads)
    // =========================
    const vip = new THREE.Group();
    vip.name = "VIP_SpawnArea";
    lobby.add(vip);

    const VIP_X = 6.5;
    const VIP_Z = 8.5;

    const vipPlate = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 0.18, 7.5),
      matTrim
    );
    vipPlate.position.set(VIP_X, -0.01, VIP_Z);
    vip.add(vipPlate);
    _addFloor(vipPlate);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.45, 0.45, 32),
      matTrim
    );
    pedestal.position.set(VIP_X, 0.225, VIP_Z);
    vip.add(pedestal);

    const machine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.85, 1.8, 24),
      matPink
    );
    machine.position.set(VIP_X, 1.35, VIP_Z);
    vip.add(machine);

    const machineGlow = _ring(THREE, 1.1, 1.3, 0.06, matPink);
    machineGlow.position.x = VIP_X;
    machineGlow.position.z = VIP_Z;
    vip.add(machineGlow);

    function makePad(ix, iz, mat) {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 1.4), mat);
      pad.position.set(VIP_X + ix, 0.04, VIP_Z + iz);
      vip.add(pad);
      _addFloor(pad);
      return pad;
    }

    const padA = makePad(-2.0,  0.0, matNeon);
    const padB = makePad( 0.0, -2.0, matNeon);
    const padC = makePad( 2.0,  0.0, matNeon);
    const padD = makePad( 0.0,  2.0, matNeon);

    state.spawns = {
      lobby_vip_A: { x: padA.position.x, y: 0, z: padA.position.z, yaw: Math.PI },
      lobby_vip_B: { x: padB.position.x, y: 0, z: padB.position.z, yaw: Math.PI },
      lobby_vip_C: { x: padC.position.x, y: 0, z: padC.position.z, yaw: Math.PI },
      lobby_vip_D: { x: padD.position.x, y: 0, z: padD.position.z, yaw: Math.PI },
      lobby_center:{ x: 0, y: 0, z: 10, yaw: Math.PI },
    };

    // =========================
    // 4 ROOMS + HALLWAYS (WITH REAL DOOR OPENINGS)
    // =========================
    const roomDefs = [
      { name: "Store",    angle: 0,             color: matNeon },
      { name: "Scorpion", angle: Math.PI / 2,   color: matPink },
      { name: "Spectate", angle: Math.PI,       color: matNeon },
      { name: "VIP2",     angle: -Math.PI / 2,  color: matNeon },
    ];

    const HALL_LEN = 14;
    const ROOM_W = 14;
    const ROOM_D = 12;
    const ROOM_H = 4.2;

    function addHallAndRoom(def) {
      const dir = new THREE.Vector3(Math.sin(def.angle), 0, Math.cos(def.angle));
      const side = new THREE.Vector3(dir.z, 0, -dir.x);

      const hallCenter = dir.clone().multiplyScalar(LOBBY_R - 1.0 + (HALL_LEN / 2));
      const roomCenter = dir.clone().multiplyScalar(LOBBY_R - 1.0 + HALL_LEN + (ROOM_D / 2));

      // Hall floor
      const hallFloor = new THREE.Mesh(
        new THREE.BoxGeometry(5.4, 0.2, HALL_LEN),
        matFloor
      );
      hallFloor.position.set(hallCenter.x, -0.1, hallCenter.z);
      hallFloor.rotation.y = def.angle;
      root.add(hallFloor);
      _addFloor(hallFloor);

      // Hall walls (left/right)
      const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.25, ROOM_H, HALL_LEN), matWall);
      const wallR = wallL.clone();
      wallL.position.set(hallCenter.x, ROOM_H/2, hallCenter.z);
      wallR.position.set(hallCenter.x, ROOM_H/2, hallCenter.z);
      wallL.position.add(side.clone().multiplyScalar(2.85));
      wallR.position.add(side.clone().multiplyScalar(-2.85));
      wallL.rotation.y = def.angle;
      wallR.rotation.y = def.angle;
      root.add(wallL, wallR);

      // Hall neon ceiling strips + lights
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(4.9, 0.12, HALL_LEN * 0.92),
        def.color
      );
      strip.position.set(hallCenter.x, 3.8, hallCenter.z);
      strip.rotation.y = def.angle;
      root.add(strip);

      const hallLight = new THREE.PointLight(def.name === "Scorpion" ? 0xff2d7a : 0x7fe7ff, 6.0, 28, 2.0);
      hallLight.position.set(hallCenter.x, 3.2, hallCenter.z);
      root.add(hallLight);

      // ROOM FLOOR
      const roomFloor = new THREE.Mesh(
        new THREE.BoxGeometry(ROOM_W, 0.2, ROOM_D),
        matFloor
      );
      roomFloor.position.set(roomCenter.x, -0.1, roomCenter.z);
      roomFloor.rotation.y = def.angle;
      root.add(roomFloor);
      _addFloor(roomFloor);

      // ROOM WALLS (build 4 walls with a DOOR GAP on the hallway-facing side)
      // Door is centered on the "front" side facing the hallway.
      const doorW = 3.4;
      const doorH = 3.0;
      const t = 0.3;

      // Helper to place wall segment on front face with gap
      function addFrontWallWithDoorGap() {
        // front face center
        const frontCenter = roomCenter.clone().add(dir.clone().multiplyScalar(-ROOM_D/2));
        // left segment
        const leftW = (ROOM_W - doorW) / 2;
        const segL = new THREE.Mesh(new THREE.BoxGeometry(leftW, ROOM_H, t), matWall);
        segL.position.copy(frontCenter).add(side.clone().multiplyScalar((doorW/2 + leftW/2)));
        segL.position.y = ROOM_H/2;
        segL.rotation.y = def.angle;
        root.add(segL);

        // right segment
        const segR = new THREE.Mesh(new THREE.BoxGeometry(leftW, ROOM_H, t), matWall);
        segR.position.copy(frontCenter).add(side.clone().multiplyScalar(-(doorW/2 + leftW/2)));
        segR.position.y = ROOM_H/2;
        segR.rotation.y = def.angle;
        root.add(segR);

        // top lintel
        const lintelH = ROOM_H - doorH;
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, lintelH, t), matWall);
        lintel.position.copy(frontCenter);
        lintel.position.y = doorH + lintelH/2;
        lintel.rotation.y = def.angle;
        root.add(lintel);

        // neon frame
        const frame = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.5, 0.18, 0.18), def.color);
        frame.position.copy(frontCenter);
        frame.position.y = doorH + 0.15;
        frame.rotation.y = def.angle;
        root.add(frame);
      }

      function addBackWall() {
        const backCenter = roomCenter.clone().add(dir.clone().multiplyScalar(ROOM_D/2));
        const wall = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, ROOM_H, t), matWall);
        wall.position.copy(backCenter); wall.position.y = ROOM_H/2;
        wall.rotation.y = def.angle;
        root.add(wall);
      }

      function addSideWalls() {
        const leftCenter  = roomCenter.clone().add(side.clone().multiplyScalar(ROOM_W/2));
        const rightCenter = roomCenter.clone().add(side.clone().multiplyScalar(-ROOM_W/2));

        const wall = new THREE.Mesh(new THREE.BoxGeometry(t, ROOM_H, ROOM_D), matWall);

        const wl = wall.clone();
        wl.position.copy(leftCenter); wl.position.y = ROOM_H/2;
        wl.rotation.y = def.angle;
        root.add(wl);

        const wr = wall.clone();
        wr.position.copy(rightCenter); wr.position.y = ROOM_H/2;
        wr.rotation.y = def.angle;
        root.add(wr);
      }

      addFrontWallWithDoorGap();
      addBackWall();
      addSideWalls();

      // room lighting
      const roomLight = new THREE.PointLight(def.name === "Scorpion" ? 0xff2d7a : 0x7fe7ff, 8.0, 40, 2.0);
      roomLight.position.set(roomCenter.x, 3.4, roomCenter.z);
      root.add(roomLight);

      const roomCeil = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W * 0.8, 0.12, ROOM_D * 0.8), def.color);
      roomCeil.position.set(roomCenter.x, 4.05, roomCenter.z);
      roomCeil.rotation.y = def.angle;
      root.add(roomCeil);

      // Spawn inside room (just inside door)
      const spawn = roomCenter.clone().add(dir.clone().multiplyScalar(-ROOM_D/2 + 2.0));
      state.spawns[`room_${def.name.toLowerCase()}`] = {
        x: spawn.x, y: 0, z: spawn.z, yaw: def.angle + Math.PI
      };
    }

    roomDefs.forEach(addHallAndRoom);

    log("[world] built ✅ (Perimeter walls + Doorways + Lighting + Divot)");

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
