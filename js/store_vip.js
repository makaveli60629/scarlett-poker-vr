// /js/store_vip.js — Store stub + VIP entrance + Spawn Arch (FULL)

export function buildSpawnArch({ THREE, root, pos = [0, 0, 10] }) {
  const g = new THREE.Group();
  g.name = "SpawnArch";
  g.position.set(pos[0], pos[1], pos[2]);
  root.add(g);

  const mat = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.5, metalness: 0.35 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.3, metalness: 0.1, emissive: 0x224466, emissiveIntensity: 0.8 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.18, 32), mat);
  base.position.y = 0.09;
  g.add(base);

  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.08, 16, 64, Math.PI), glow);
  arch.rotation.x = Math.PI / 2;
  arch.position.y = 1.45;
  g.add(arch);

  const pL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.8, 0.22), mat);
  const pR = pL.clone();
  pL.position.set(-0.9, 0.9, 0);
  pR.position.set( 0.9, 0.9, 0);
  g.add(pL, pR);

  return g;
}

export function buildStoreStub({ THREE, root, pos = [10, 0, 0] }) {
  const g = new THREE.Group();
  g.name = "StoreStub";
  g.position.set(pos[0], pos[1], pos[2]);
  root.add(g);

  const matWall = new THREE.MeshStandardMaterial({ color: 0x333741, roughness: 0.9, metalness: 0.05 });
  const matGlass = new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.18 });

  const kiosk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 1.3), matWall);
  kiosk.position.set(0, 0.7, 0);
  g.add(kiosk);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 0.08), matGlass);
  glass.position.set(0, 1.1, 0.68);
  g.add(glass);

  // 3 display pedestals
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.35, 20), matWall);
    p.position.set(-1.2 + i * 1.2, 0.18, -2.0);
    g.add(p);
  }

  return g;
}

export function buildVIPEntrance({ THREE, root, start = [-14, 0, 0] }) {
  const g = new THREE.Group();
  g.name = "VIPEntrance";
  g.position.set(start[0], start[1], start[2]);
  root.add(g);

  const mat = new THREE.MeshStandardMaterial({ color: 0x2a2c32, roughness: 0.95, metalness: 0.05 });

  // hallway
  const hall = new THREE.Mesh(new THREE.BoxGeometry(10, 3.8, 4.5), mat);
  hall.position.set(5, 1.9, 0);
  g.add(hall);

  // VIP room
  const room = new THREE.Mesh(new THREE.BoxGeometry(8.5, 4.2, 8.5), mat);
  room.position.set(14.5, 2.1, 0);
  g.add(room);

  // spawn point inside VIP
  const vipSpawn = new THREE.Object3D();
  vipSpawn.name = "VIPSpawn";
  vipSpawn.position.set(14.5, 0, 0);
  g.add(vipSpawn);

  return { group: g, vipSpawn };
}
