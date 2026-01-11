// /js/world.js — Scarlett MASTER WORLD (Lobby + 4 rooms + hallways + divot + VIP spawn pads)
// Safe, standalone, no external deps.

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
      metalness: opts.metalness ?? 0.08,
      roughness: opts.roughness ?? 0.95,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 0.0,
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
    const matNeon  = _mat(THREE, 0x101820, { roughness: 0.55, metalness: 0.35, emissive: 0x7fe7ff, emissiveIntensity: 0.75 });
    const matPink  = _mat(THREE, 0x101018, { roughness: 0.55, metalness: 0.35, emissive: 0xff2d7a, emissiveIntensity: 0.75 });

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

    const wallRing = new THREE.Mesh(
      new THREE.CylinderGeometry(LOBBY_R, LOBBY_R, 4.2, 96, 1, true),
      matWall
    );
    wallRing.position.y = 2.05;
    lobby.add(wallRing);

    // Neon guidance ring
    lobby.add(_ring(THREE, LOBBY_R - 2.2, LOBBY_R - 2.0, 0.03, matNeon));

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
    // VIP SPAWN ROOM AREA (SPAWN MACHINE + SQUARE PADS)
    // =========================
    const vip = new THREE.Group();
    vip.name = "VIP_SpawnArea";
    lobby.add(vip);

    // Position VIP “corner” inside lobby
    const VIP_X = 6.5;
    const VIP_Z = 8.5;

    // Sub-floor plate
    const vipPlate = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 0.18, 7.5),
      matTrim
    );
    vipPlate.position.set(VIP_X, -0.01, VIP_Z);
    vip.add(vipPlate);
    _addFloor(vipPlate);

    // Spawn machine pedestal
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

    // Glow ring at base of machine
    const machineGlow = _ring(THREE, 1.1, 1.3, 0.06, matPink);
    machineGlow.position.x = VIP_X;
    machineGlow.position.z = VIP_Z;
    vip.add(machineGlow);

    function makePad(ix, iz, mat) {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 1.4), mat);
      pad.position.set(VIP_X + ix, 0.04, VIP_Z + iz);
      pad.userData.isSpawnPad = true;
      vip.add(pad);
      _addFloor(pad);
      return pad;
    }

    const padA = makePad(-2.0,  0.0, matNeon); // primary
    const padB = makePad( 0.0, -2.0, matNeon);
    const padC = makePad( 2.0,  0.0, matNeon);
    const padD = makePad( 0.0,  2.0, matNeon);

    // Spawns
    state.spawns = {
      lobby_vip_A: { x: padA.position.x, y: 0, z: padA.position.z, yaw: Math.PI },
      lobby_vip_B: { x: padB.position.x, y: 0, z: padB.position.z, yaw: Math.PI },
      lobby_vip_C: { x: padC.position.x, y: 0, z: padC.position.z, yaw: Math.PI },
      lobby_vip_D: { x: padD.position.x, y: 0, z: padD.position.z, yaw: Math.PI },
      lobby_center:{ x: 0, y: 0, z: 10, yaw: Math.PI },
    };

    // =========================
    // 4 ROOMS + HALLWAYS
    // =========================
    const roomDefs = [
      { name: "Store",    angle: 0 },              // +Z
      { name: "Scorpion", angle: Math.PI / 2 },    // +X
      { name: "Spectate", angle: Math.PI },        // -Z
      { name: "VIP2",     angle: -Math.PI / 2 },   // -X
    ];

    const HALL_LEN = 14;
    const ROOM_W = 14;
    const ROOM_D = 12;
    const ROOM_H = 4.2;

    function addHallAndRoom(def) {
      const dir = new THREE.Vector3(Math.sin(def.angle), 0, Math.cos(def.angle));
      const hallCenter = dir.clone().multiplyScalar(LOBBY_R - 1.0 + (HALL_LEN / 2));
      const roomCenter = dir.clone().multiplyScalar(LOBBY_R - 1.0 + HALL_LEN + (ROOM_D / 2));

      // Hallway floor
      const hallFloor = new THREE.Mesh(
        new THREE.BoxGeometry(5.2, 0.2, HALL_LEN),
        matFloor
      );
      hallFloor.position.set(hallCenter.x, -0.1, hallCenter.z);
      hallFloor.rotation.y = def.angle;
      root.add(hallFloor);
      _addFloor(hallFloor);

      // Hall walls
      const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.25, ROOM_H, HALL_LEN), matWall);
      const wallR = wallL.clone();
      const side = new THREE.Vector3(dir.z, 0, -dir.x); // perpendicular
      wallL.position.set(hallCenter.x, ROOM_H/2, hallCenter.z);
      wallR.position.set(hallCenter.x, ROOM_H/2, hallCenter.z);
      wallL.position.add(side.clone().multiplyScalar(2.7));
      wallR.position.add(side.clone().multiplyScalar(-2.7));
      wallL.rotation.y = def.angle;
      wallR.rotation.y = def.angle;
      root.add(wallL, wallR);

      // Room floor
      const roomFloor = new THREE.Mesh(
        new THREE.BoxGeometry(ROOM_W, 0.2, ROOM_D),
        matFloor
      );
      roomFloor.position.set(roomCenter.x, -0.1, roomCenter.z);
      roomFloor.rotation.y = def.angle;
      root.add(roomFloor);
      _addFloor(roomFloor);

      // Room shell
      const roomShell = new THREE.Mesh(
        new THREE.BoxGeometry(ROOM_W, ROOM_H, ROOM_D),
        matWall
      );
      roomShell.position.set(roomCenter.x, ROOM_H/2, roomCenter.z);
      roomShell.rotation.y = def.angle;
      root.add(roomShell);

      // Neon strip at room entrance side
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(ROOM_W * 0.6, 0.18, 0.18),
        def.name === "Scorpion" ? matPink : matNeon
      );
      strip.position.set(roomCenter.x, 2.7, roomCenter.z - (ROOM_D/2 - 0.5));
      strip.rotation.y = def.angle;
      root.add(strip);

      // Spawn inside room
      const spawn = roomCenter.clone().add(dir.clone().multiplyScalar(-ROOM_D/2 + 2.0));
      state.spawns[`room_${def.name.toLowerCase()}`] = {
        x: spawn.x, y: 0, z: spawn.z, yaw: def.angle + Math.PI
      };
    }

    roomDefs.forEach(addHallAndRoom);

    log("[world] built ✅ (Lobby + 4 rooms + hallways + divot + VIP spawn pads)");

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

  return { build, getSpawn };
})();
