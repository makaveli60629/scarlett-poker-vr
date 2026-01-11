// /js/world.js — Scarlett MASTER WORLD Update 4.8.4 (FULL)
// ✅ Circular lobby + 4 rooms + hallways between them
// ✅ Spawn-safe (lobby center)
// ✅ Simple “table divot” centerpiece placeholder

export const World = (() => {
  let _ctx = null;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function buildLobbyRing({ THREE, group, r=10, tube=0.9, y=0, mat }) {
    const geo = new THREE.TorusGeometry(r, tube, 16, 90);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI * 0.5;
    mesh.position.y = y + 0.08;
    mesh.receiveShadow = false;
    group.add(mesh);
    return mesh;
  }

  function buildHallway({ THREE, group, from, to, w=3.2, h=3.0, wallT=0.18, floorT=0.12, matWall, matFloor }) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    if (len < 0.05) return null;
    dir.normalize();

    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);

    const up = new THREE.Vector3(0,1,0);
    const right = new THREE.Vector3().crossVectors(up, dir).normalize();

    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), dir);

    // floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, floorT, len), matFloor);
    floor.position.copy(mid);
    floor.position.y = 0.01;
    floor.quaternion.copy(q);
    group.add(floor);

    // ceiling
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(w, wallT, len), matWall);
    ceil.position.copy(mid);
    ceil.position.y = h + 0.01;
    ceil.quaternion.copy(q);
    group.add(ceil);

    // walls
    const wallGeo = new THREE.BoxGeometry(wallT, h, len);

    const left = new THREE.Mesh(wallGeo, matWall);
    left.position.copy(mid);
    left.position.addScaledVector(right, -w * 0.5);
    left.position.y = h * 0.5;
    left.quaternion.copy(q);
    group.add(left);

    const rightWall = new THREE.Mesh(wallGeo, matWall);
    rightWall.position.copy(mid);
    rightWall.position.addScaledVector(right,  w * 0.5);
    rightWall.position.y = h * 0.5;
    rightWall.quaternion.copy(q);
    group.add(rightWall);

    return { floor, ceil, left, right: rightWall };
  }

  function buildRoomShell({ THREE, group, center, size=10, h=4.0, matWall, matFloor, doorSide /* 0=N,1=E,2=S,3=W */ }) {
    const half = size * 0.5;
    const wallT = 0.22;

    // floor
    const rf = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, size), matFloor);
    rf.position.copy(center);
    rf.position.y = 0;
    group.add(rf);

    const addWall = (pos, sx, sy, sz) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), matWall);
      m.position.copy(pos);
      group.add(m);
      return m;
    };

    // IMPORTANT: we SKIP the wall that faces the lobby so you never get boxed in.
    // doorSide map: 0 skip NORTH wall, 1 skip EAST wall, 2 skip SOUTH wall, 3 skip WEST wall
    if (doorSide !== 0) addWall(new THREE.Vector3(center.x, h*0.5, center.z - half), size, h, wallT); // north
    if (doorSide !== 1) addWall(new THREE.Vector3(center.x + half, h*0.5, center.z), wallT, h, size); // east
    if (doorSide !== 2) addWall(new THREE.Vector3(center.x, h*0.5, center.z + half), size, h, wallT); // south
    if (doorSide !== 3) addWall(new THREE.Vector3(center.x - half, h*0.5, center.z), wallT, h, size); // west

    // back cap ceiling (optional)
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(size, 0.16, size), matWall);
    ceil.position.set(center.x, h + 0.02, center.z);
    group.add(ceil);

    return rf;
  }

  function buildCenterpieceDivot({ THREE, group, matFloor, matTrim }) {
    // “divot” illusion: large floor + inset ring + lowered center pad
    const floor = new THREE.Mesh(new THREE.CircleGeometry(20, 64), matFloor);
    floor.rotation.x = -Math.PI/2;
    floor.position.y = 0;
    group.add(floor);

    const rim = new THREE.Mesh(new THREE.RingGeometry(3.2, 4.2, 64), matTrim);
    rim.rotation.x = -Math.PI/2;
    rim.position.y = 0.02;
    group.add(rim);

    const pit = new THREE.Mesh(new THREE.CircleGeometry(3.1, 48), matFloor);
    pit.rotation.x = -Math.PI/2;
    pit.position.y = -0.35; // lowered center
    group.add(pit);

    // placeholder “table”
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.4, 0.35, 48),
      matTrim
    );
    table.position.set(0, -0.15, 0);
    group.add(table);

    // guardrail ring
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(2.85, 0.08, 10, 80),
      matTrim
    );
    rail.rotation.x = Math.PI * 0.5;
    rail.position.y = 0.2;
    group.add(rail);

    return { floor, rim, pit, table, rail };
  }

  function build({ THREE, scene, renderer, camera, player, controllers, world, logTag, BUILD }) {
    _ctx = { THREE, scene, renderer, camera, player, controllers, world, logTag, BUILD };

    const log = (m) => logTag?.("world", m);

    // Materials
    const matWall = new THREE.MeshStandardMaterial({ color: 0x0f1528, roughness: 0.9, metalness: 0.05 });
    const matFloor= new THREE.MeshStandardMaterial({ color: 0x070a14, roughness: 0.98, metalness: 0.0 });
    const matTrim = new THREE.MeshStandardMaterial({ color: 0x14224a, roughness: 0.65, metalness: 0.15 });

    // Reset group
    while (world.group.children.length) world.group.remove(world.group.children[0]);

    // Spawn safe: lobby center
    player.position.set(0, 0, 0);

    // Lobby visuals
    buildCenterpieceDivot({ THREE, group: world.group, matFloor, matTrim });
    const LOBBY_R = 10;
    buildLobbyRing({ THREE, group: world.group, r: LOBBY_R, tube: 0.85, y: 0, mat: matTrim });

    // Rooms N/E/S/W
    const ROOM_SIZE = 10;
    const ROOM_H = 4.0;
    const offset = LOBBY_R + 8;

    const roomCenters = [
      new THREE.Vector3(0, 0, -(offset)), // north
      new THREE.Vector3((offset), 0, 0),  // east
      new THREE.Vector3(0, 0, (offset)),  // south
      new THREE.Vector3(-(offset), 0, 0)  // west
    ];

    // doorSide values (faces lobby)
    // north room faces lobby toward +Z => skip SOUTH wall => doorSide=2
    // east  room faces lobby toward -X => skip WEST  wall => doorSide=3
    // south room faces lobby toward -Z => skip NORTH wall => doorSide=0
    // west  room faces lobby toward +X => skip EAST  wall => doorSide=1
    const doorSides = [2, 3, 0, 1];

    for (let i = 0; i < roomCenters.length; i++) {
      buildRoomShell({
        THREE,
        group: world.group,
        center: roomCenters[i],
        size: ROOM_SIZE,
        h: ROOM_H,
        matWall,
        matFloor,
        doorSide: doorSides[i]
      });
    }

    // Hallways from lobby rim -> room opening line
    const HALL_W = 3.2;
    const HALL_H = 3.0;
    const HALL_PAD = 1.2;

    for (let i = 0; i < roomCenters.length; i++) {
      const c = roomCenters[i];
      const dir = new THREE.Vector3(c.x, 0, c.z).normalize();

      const from = dir.clone().multiplyScalar(LOBBY_R + 0.5);
      const to = dir.clone().multiplyScalar(offset - (ROOM_SIZE * 0.5) + HALL_PAD);

      buildHallway({
        THREE,
        group: world.group,
        from,
        to,
        w: HALL_W,
        h: HALL_H,
        matWall,
        matFloor
      });
    }

    // Small markers so you can SEE cardinal directions quickly
    const mk = (x, z, txtColor) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 14), new THREE.MeshStandardMaterial({ color: txtColor }));
      m.position.set(x, 1.2, z);
      world.group.add(m);
    };
    mk(0, -6, 0x00ff88);
    mk(6, 0, 0x7fe7ff);
    mk(0, 6, 0xff2d7a);
    mk(-6, 0, 0xffcc00);

    log(`LOADED world.js Update 4.8.4 ✅`);
    log(`Update 4.8.4 built ✅ (HALLWAYS + lobby spawn fixed)`);
    log(`build complete ✅ (Update 4.8.4)`);
  }

  function update({ dt, t }) {
    // optional later
  }

  return { build, update };
})();
