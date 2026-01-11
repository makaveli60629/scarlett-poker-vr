// /js/world.js — Scarlett MASTER WORLD (FULL) 4.9.0
export const World = (() => {
  function buildLobbyRing({ THREE, group, r=10, tube=0.85, y=0.08, mat }) {
    const torus = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 16, 90), mat);
    torus.rotation.x = Math.PI * 0.5;
    torus.position.y = y;
    group.add(torus);
    return torus;
  }

  function buildHallway({ THREE, group, from, to, w=3.2, h=3.0, wallT=0.18, floorT=0.12, matWall, matFloor }) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    if (len < 0.05) return;

    dir.normalize();
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), dir);
    const up = new THREE.Vector3(0,1,0);
    const right = new THREE.Vector3().crossVectors(up, dir).normalize();

    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, floorT, len), matFloor);
    floor.position.copy(mid);
    floor.position.y = 0.01;
    floor.quaternion.copy(q);
    group.add(floor);

    const ceil = new THREE.Mesh(new THREE.BoxGeometry(w, wallT, len), matWall);
    ceil.position.copy(mid);
    ceil.position.y = h + 0.01;
    ceil.quaternion.copy(q);
    group.add(ceil);

    const wallGeo = new THREE.BoxGeometry(wallT, h, len);

    const left = new THREE.Mesh(wallGeo, matWall);
    left.position.copy(mid);
    left.position.addScaledVector(right, -w*0.5);
    left.position.y = h*0.5;
    left.quaternion.copy(q);
    group.add(left);

    const rightWall = new THREE.Mesh(wallGeo, matWall);
    rightWall.position.copy(mid);
    rightWall.position.addScaledVector(right, w*0.5);
    rightWall.position.y = h*0.5;
    rightWall.quaternion.copy(q);
    group.add(rightWall);
  }

  function buildRoomShell({ THREE, group, center, size=10, h=4.0, matWall, matFloor, doorSide }) {
    const half = size * 0.5;
    const wallT = 0.22;

    const floor = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, size), matFloor);
    floor.position.copy(center);
    floor.position.y = 0;
    group.add(floor);

    const addWall = (pos, sx, sy, sz) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), matWall);
      m.position.copy(pos);
      group.add(m);
    };

    // Skip the wall facing the lobby => never boxed in
    if (doorSide !== 0) addWall(new THREE.Vector3(center.x, h*0.5, center.z - half), size, h, wallT);
    if (doorSide !== 1) addWall(new THREE.Vector3(center.x + half, h*0.5, center.z), wallT, h, size);
    if (doorSide !== 2) addWall(new THREE.Vector3(center.x, h*0.5, center.z + half), size, h, wallT);
    if (doorSide !== 3) addWall(new THREE.Vector3(center.x - half, h*0.5, center.z), wallT, h, size);

    const ceil = new THREE.Mesh(new THREE.BoxGeometry(size, 0.16, size), matWall);
    ceil.position.set(center.x, h + 0.02, center.z);
    group.add(ceil);
  }

  function buildCenterpieceDivot({ THREE, group, matFloor, matTrim }) {
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
    pit.position.y = -0.35;
    group.add(pit);

    const table = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.35, 48), matTrim);
    table.position.set(0, -0.15, 0);
    group.add(table);

    const rail = new THREE.Mesh(new THREE.TorusGeometry(2.85, 0.08, 10, 80), matTrim);
    rail.rotation.x = Math.PI * 0.5;
    rail.position.y = 0.2;
    group.add(rail);
  }

  function build({ THREE, world, player, tag, BUILD }) {
    tag?.("world", `LOADED world.js ✅`);
    tag?.("world", `BUILD=${BUILD}`);

    while (world.group.children.length) world.group.remove(world.group.children[0]);

    const matWall = new THREE.MeshStandardMaterial({ color: 0x0f1528, roughness: 0.9, metalness: 0.05 });
    const matFloor= new THREE.MeshStandardMaterial({ color: 0x070a14, roughness: 0.98, metalness: 0.0 });
    const matTrim = new THREE.MeshStandardMaterial({ color: 0x14224a, roughness: 0.65, metalness: 0.15 });

    // spawn safe: lobby center
    player.position.set(0,0,0);

    // Lobby + divot
    buildCenterpieceDivot({ THREE, group: world.group, matFloor, matTrim });

    const LOBBY_R = 10;
    buildLobbyRing({ THREE, group: world.group, r: LOBBY_R, tube: 0.85, y: 0.08, mat: matTrim });

    // Rooms + hallways
    const ROOM_SIZE = 10;
    const ROOM_H = 4.0;
    const offset = LOBBY_R + 8;

    const roomCenters = [
      new THREE.Vector3(0, 0, -(offset)), // north
      new THREE.Vector3((offset), 0, 0),  // east
      new THREE.Vector3(0, 0, (offset)),  // south
      new THREE.Vector3(-(offset), 0, 0)  // west
    ];

    // door wall skipped (faces lobby)
    const doorSides = [2, 3, 0, 1];

    for (let i=0;i<4;i++){
      buildRoomShell({
        THREE, group: world.group,
        center: roomCenters[i],
        size: ROOM_SIZE, h: ROOM_H,
        matWall, matFloor,
        doorSide: doorSides[i]
      });
    }

    const HALL_PAD = 1.2;
    for (let i=0;i<4;i++){
      const c = roomCenters[i];
      const dir = new THREE.Vector3(c.x, 0, c.z).normalize();
      const from = dir.clone().multiplyScalar(LOBBY_R + 0.5);
      const to   = dir.clone().multiplyScalar(offset - (ROOM_SIZE*0.5) + HALL_PAD);
      buildHallway({ THREE, group: world.group, from, to, w: 3.2, h: 3.0, matWall, matFloor });
    }

    tag?.("world", "built ✅ (Lobby + 4 rooms + hallways + divot)");
  }

  function update(){}

  return { build, update };
})();
