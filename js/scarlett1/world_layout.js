// /js/scarlett1/world_layout.js
import { C } from "./world_constants.js";

export function buildLayout(THREE, group, mats) {
  const teleportMeshes = [];
  const colliderMeshes = [];
  const spawnPoints = {};

  // --- Floor: lobby disk
  const lobbyFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(C.LOBBY_R, C.LOBBY_R, 0.2, 64),
    mats.floor
  );
  lobbyFloor.position.set(0, C.FLOOR_Y - 0.1, 0);
  lobbyFloor.receiveShadow = false;
  group.add(lobbyFloor);
  teleportMeshes.push(lobbyFloor);

  // --- Lobby walls ring (low-poly)
  const wallRing = new THREE.Mesh(
    new THREE.CylinderGeometry(C.LOBBY_R + C.WALL_T, C.LOBBY_R + C.WALL_T, C.LOBBY_H, 64, 1, true),
    mats.wall
  );
  wallRing.position.set(0, C.LOBBY_H / 2, 0);
  group.add(wallRing);
  colliderMeshes.push(wallRing);

  // --- Grid lines on floor (cheap)
  const grid = new THREE.Group();
  const step = C.GRID_SIZE;
  const extent = C.LOBBY_R * 0.95;
  for (let x = -extent; x <= extent; x += step) {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0.01, -extent), new THREE.Vector3(x, 0.01, extent)]);
    const line = new THREE.Line(g, mats.grid);
    grid.add(line);
  }
  for (let z = -extent; z <= extent; z += step) {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-extent, 0.01, z), new THREE.Vector3(extent, 0.01, z)]);
    const line = new THREE.Line(g, mats.grid);
    grid.add(line);
  }
  group.add(grid);

  // --- Hallways + rooms directions
  // N: STORE, E: VIP, S: SCORP, W: GAMES (you can swap names later)
  const dirs = [
    { key: "N", name: "STORE", dx: 0, dz: -1, signRot: 0 },
    { key: "E", name: "VIP", dx: 1, dz: 0, signRot: -Math.PI / 2 },
    { key: "S", name: "SCORP", dx: 0, dz: 1, signRot: Math.PI },
    { key: "W", name: "GAMES", dx: -1, dz: 0, signRot: Math.PI / 2 },
  ];

  const rooms = {};

  for (const d of dirs) {
    // Hall floor
    const hallFloor = new THREE.Mesh(
      new THREE.BoxGeometry(C.HALL_W, 0.2, C.HALL_L),
      mats.floor
    );
    const hallCenterX = d.dx * (C.LOBBY_R + C.HALL_L / 2);
    const hallCenterZ = d.dz * (C.LOBBY_R + C.HALL_L / 2);
    hallFloor.position.set(hallCenterX, C.FLOOR_Y - 0.1, hallCenterZ);
    hallFloor.rotation.y = (d.dx !== 0) ? Math.PI / 2 : 0;
    group.add(hallFloor);
    teleportMeshes.push(hallFloor);

    // Hall walls (2 boxes)
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(C.HALL_W, C.HALL_H, C.WALL_T), mats.wall);
    const wallR = new THREE.Mesh(new THREE.BoxGeometry(C.HALL_W, C.HALL_H, C.WALL_T), mats.wall);
    wallL.position.set(hallCenterX, C.HALL_H / 2, hallCenterZ);
    wallR.position.set(hallCenterX, C.HALL_H / 2, hallCenterZ);

    if (d.dx !== 0) {
      wallL.rotation.y = Math.PI / 2;
      wallR.rotation.y = Math.PI / 2;
      wallL.position.z += (C.HALL_W / 2);
      wallR.position.z -= (C.HALL_W / 2);
    } else {
      wallL.position.x += (C.HALL_W / 2);
      wallR.position.x -= (C.HALL_W / 2);
    }

    group.add(wallL, wallR);
    colliderMeshes.push(wallL, wallR);

    // Room floor (at end)
    const roomFloor = new THREE.Mesh(
      new THREE.BoxGeometry(C.ROOM_W, 0.2, C.ROOM_D),
      mats.floor
    );
    const roomCenterX = d.dx * (C.LOBBY_R + C.HALL_L + C.ROOM_D / 2);
    const roomCenterZ = d.dz * (C.LOBBY_R + C.HALL_L + C.ROOM_D / 2);
    roomFloor.position.set(roomCenterX, C.FLOOR_Y - 0.1, roomCenterZ);
    group.add(roomFloor);
    teleportMeshes.push(roomFloor);

    // Room walls (simple)
    const rw1 = new THREE.Mesh(new THREE.BoxGeometry(C.ROOM_W, C.ROOM_H, C.WALL_T), mats.wall);
    const rw2 = new THREE.Mesh(new THREE.BoxGeometry(C.ROOM_W, C.ROOM_H, C.WALL_T), mats.wall);
    const rw3 = new THREE.Mesh(new THREE.BoxGeometry(C.WALL_T, C.ROOM_H, C.ROOM_D), mats.wall);
    const rw4 = new THREE.Mesh(new THREE.BoxGeometry(C.WALL_T, C.ROOM_H, C.ROOM_D), mats.wall);

    rw1.position.set(roomCenterX, C.ROOM_H / 2, roomCenterZ - C.ROOM_D / 2);
    rw2.position.set(roomCenterX, C.ROOM_H / 2, roomCenterZ + C.ROOM_D / 2);
    rw3.position.set(roomCenterX - C.ROOM_W / 2, C.ROOM_H / 2, roomCenterZ);
    rw4.position.set(roomCenterX + C.ROOM_W / 2, C.ROOM_H / 2, roomCenterZ);

    group.add(rw1, rw2, rw3, rw4);
    colliderMeshes.push(rw1, rw2, rw3, rw4);

    rooms[d.name] = { center: new THREE.Vector3(roomCenterX, 0, roomCenterZ), dir: d };

    // Spawns near entrances (nice)
    spawnPoints[`SPAWN_${d.key}`] = {
      pos: new THREE.Vector3(d.dx * (C.LOBBY_R * 0.2), 0, d.dz * (C.LOBBY_R * 0.2)),
      yaw: (d.key === "N") ? Math.PI : (d.key === "S" ? 0 : (d.key === "E" ? -Math.PI / 2 : Math.PI / 2))
    };
  }

  // Default spawn north side looking inward
  spawnPoints.SPAWN_N = { pos: new THREE.Vector3(0, 0, C.LOBBY_R * 0.55), yaw: Math.PI };

  // Center “pit” placeholder (we’ll swap to your table pit later)
  const pit = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 0.3, 48), mats.base);
  pit.position.set(0, C.FLOOR_Y - 0.15, 0);
  group.add(pit);
  teleportMeshes.push(pit);

  return { teleportMeshes, colliderMeshes, spawnPoints, rooms };
}
