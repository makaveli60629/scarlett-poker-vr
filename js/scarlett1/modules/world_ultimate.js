// /js/scarlett1/world_ultimate.js
export function buildUltimateWorld({ THREE, scene }) {
  const group = new THREE.Group();
  group.name = "UltimateWorld";
  scene.add(group);

  const mats = {
    floor: new THREE.MeshStandardMaterial({ color: 0x070b10, roughness: 0.95, metalness: 0.05 }),
    wall:  new THREE.MeshStandardMaterial({ color: 0x0b0f18, roughness: 0.95, metalness: 0.05 }),
    neonC: new THREE.MeshStandardMaterial({ color: 0x06202a, emissive: 0x00e5ff, emissiveIntensity: 0.9, roughness: 0.65, metalness: 0.2 }),
    neonM: new THREE.MeshStandardMaterial({ color: 0x1a081a, emissive: 0xff2bd6, emissiveIntensity: 0.85, roughness: 0.65, metalness: 0.2 }),
    neonG: new THREE.MeshStandardMaterial({ color: 0x08150d, emissive: 0x33ff66, emissiveIntensity: 0.8, roughness: 0.7, metalness: 0.15 }),
  };

  const teleportSurfaces = [];
  const pads = [];

  const LOBBY_R = 18;
  const HALL_L = 18;
  const HALL_W = 6;
  const ROOM = 18;

  // Lobby floor
  const lobby = new THREE.Mesh(new THREE.CylinderGeometry(LOBBY_R, LOBBY_R, 0.2, 64), mats.floor);
  lobby.position.y = -0.1;
  lobby.userData.teleportSurface = true;
  group.add(lobby);
  teleportSurfaces.push(lobby);

  // Lobby trim
  const trim = new THREE.Mesh(new THREE.TorusGeometry(LOBBY_R - 0.8, 0.18, 10, 64), mats.neonC);
  trim.rotation.x = Math.PI / 2;
  trim.position.y = 0.08;
  group.add(trim);

  // 4 halls + 4 room floors
  const dirs = [
    { name: "STORE", dx: 0, dz: -1, mat: mats.neonC },
    { name: "VIP",   dx: 1, dz: 0,  mat: mats.neonM },
    { name: "SCORP", dx: 0, dz: 1,  mat: mats.neonG },
    { name: "GAMES", dx: -1,dz: 0,  mat: mats.neonC }
  ];

  function makePad(name, x, z, mat) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.12, 20), mat);
    p.position.set(x, 0.06, z);
    p.userData.teleport = true;
    p.userData.target = new THREE.Vector3(x, 0, z);
    group.add(p);
    pads.push(p);
    return p;
  }

  makePad("LOBBY_N", 0,  LOBBY_R * 0.55, mats.neonC);
  makePad("LOBBY_S", 0, -LOBBY_R * 0.55, mats.neonG);
  makePad("LOBBY_E", LOBBY_R * 0.55, 0,  mats.neonM);
  makePad("LOBBY_W",-LOBBY_R * 0.55, 0,  mats.neonC);

  for (const d of dirs) {
    // hall floor
    const hall = new THREE.Mesh(new THREE.BoxGeometry(HALL_W, 0.2, HALL_L), mats.floor);
    hall.position.set(d.dx * (LOBBY_R + HALL_L/2), -0.1, d.dz * (LOBBY_R + HALL_L/2));
    hall.rotation.y = (d.dx !== 0) ? Math.PI/2 : 0;
    hall.userData.teleportSurface = true;
    group.add(hall);
    teleportSurfaces.push(hall);

    // room floor
    const rx = d.dx * (LOBBY_R + HALL_L + ROOM/2);
    const rz = d.dz * (LOBBY_R + HALL_L + ROOM/2);
    const room = new THREE.Mesh(new THREE.BoxGeometry(ROOM, 0.2, ROOM), mats.floor);
    room.position.set(rx, -0.1, rz);
    room.userData.teleportSurface = true;
    group.add(room);
    teleportSurfaces.push(room);

    // portal ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.18, 10, 48), d.mat);
    ring.rotation.x = Math.PI/2;
    ring.position.set(rx, 1.8, rz);
    group.add(ring);

    makePad(d.name, rx, rz, d.mat);
  }

  // Center pit accent
  const pit = new THREE.Mesh(new THREE.CylinderGeometry(7.0, 7.0, 0.25, 48), mats.wall);
  pit.position.set(0, -0.18, 0);
  pit.userData.teleportSurface = true;
  group.add(pit);
  teleportSurfaces.push(pit);

  const pitRing = new THREE.Mesh(new THREE.TorusGeometry(7.0, 0.22, 10, 64), mats.neonM);
  pitRing.rotation.x = Math.PI/2;
  pitRing.position.y = 0.05;
  group.add(pitRing);

  return {
    group,
    teleportSurfaces,
    pads,
    update(dt) {
      const t = (performance.now() || 0) * 0.001;
      trim.material.emissiveIntensity = 0.9 + Math.sin(t * 1.6) * 0.12;
      pitRing.material.emissiveIntensity = 0.9 + Math.sin(t * 2.0) * 0.12;
    }
  };
}
