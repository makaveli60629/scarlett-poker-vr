// /js/scarlett1/world.js — SCARLETT1 WORLD (FULL • SAFE)
// BUILD: WORLD_FULL_LOBBY_SAFE_v4_3

const BUILD = "WORLD_FULL_LOBBY_SAFE_v4_3";

export async function buildWorld(ctx) {
  const { THREE, scene, player, onRegisterFloors, onStatus } = ctx;

  onStatus?.(`building world…\n${BUILD}`);

  const world = new THREE.Group();
  world.name = "ScarlettWorld";
  scene.add(world);

  // Lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x202030, 0.95);
  world.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(8, 14, 6);
  world.add(dir);

  // Lobby
  const LOBBY_RADIUS = 18;
  const LOBBY_HEIGHT = 7;

  const floorGeo = new THREE.CircleGeometry(LOBBY_RADIUS, 96);
  const floorMat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0.05 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.name = "LobbyFloor";
  world.add(floor);

  const wallGeo = new THREE.CylinderGeometry(LOBBY_RADIUS, LOBBY_RADIUS, LOBBY_HEIGHT, 96, 1, true);
  const wallMat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.05, side: THREE.DoubleSide });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.y = LOBBY_HEIGHT / 2;
  world.add(wall);

  const ceilGeo = new THREE.RingGeometry(LOBBY_RADIUS - 0.5, LOBBY_RADIUS, 96);
  const ceilMat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.08, side: THREE.DoubleSide });
  const ceil = new THREE.Mesh(ceilGeo, ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = LOBBY_HEIGHT;
  world.add(ceil);

  const glowGeo = new THREE.TorusGeometry(LOBBY_RADIUS - 1.4, 0.08, 16, 120);
  const glowMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.65 });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.rotation.x = Math.PI / 2;
  glow.position.y = LOBBY_HEIGHT - 0.2;
  world.add(glow);

  // Poker pit divot
  const pit = new THREE.Group();
  world.add(pit);

  const PIT_RADIUS = 8.5;
  const PIT_DEPTH = 1.4;

  const pitFloorGeo = new THREE.CircleGeometry(PIT_RADIUS, 72);
  const pitFloorMat = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0.03 });
  const pitFloor = new THREE.Mesh(pitFloorGeo, pitFloorMat);
  pitFloor.rotation.x = -Math.PI / 2;
  pitFloor.position.y = -PIT_DEPTH;
  pit.add(pitFloor);

  const rimGeo = new THREE.TorusGeometry(PIT_RADIUS, 0.12, 12, 120);
  const rimMat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.15 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.02;
  pit.add(rim);

  // Stairs
  const stairs = new THREE.Group();
  pit.add(stairs);

  const stepCount = 8;
  const stepW = 2.6;
  const stepH = PIT_DEPTH / stepCount;
  const stepD = 0.55;
  const stepMat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0.02 });

  for (let i = 0; i < stepCount; i++) {
    const g = new THREE.BoxGeometry(stepW, stepH, stepD);
    const m = new THREE.Mesh(g, stepMat);
    m.position.set(0, -stepH / 2 - i * stepH, PIT_RADIUS - 0.8 + i * (stepD * 0.9));
    stairs.add(m);
  }

  // Table + chairs
  const table = buildPokerTable({ THREE });
  table.position.set(0, -PIT_DEPTH + 0.02, 0);
  pit.add(table);

  const chairs = buildChairs({ THREE,  radius: 4.0, count: 6 });
  chairs.position.set(0, -PIT_DEPTH + 0.02, 0);
  pit.add(chairs);

  // Store + mannequins
  const store = new THREE.Group();
  store.position.set(-12, 0, -6);
  world.add(store);

  const storePadGeo = new THREE.PlaneGeometry(7, 5);
  const storePadMat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.05 });
  const storePad = new THREE.Mesh(storePadGeo, storePadMat);
  storePad.rotation.x = -Math.PI / 2;
  storePad.position.y = 0.01;
  store.add(storePad);

  const storeWallGeo = new THREE.BoxGeometry(7, 3, 0.2);
  const storeWallMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.08 });
  const storeWall = new THREE.Mesh(storeWallGeo, storeWallMat);
  storeWall.position.set(0, 1.5, -2.4);
  store.add(storeWall);

  const manA = buildMannequin({ THREE });
  const manB = buildMannequin({ THREE });
  manA.position.set(-1.6, 0, -0.5);
  manB.position.set(1.6, 0, -0.5);
  store.add(manA, manB);

  // Pillars (scale markers)
  const pillars = new THREE.Group();
  world.add(pillars);

  const pGeo = new THREE.CylinderGeometry(0.25, 0.25, 3.2, 18);
  const pMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.08 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const p = new THREE.Mesh(pGeo, pMat);
    p.position.set(Math.cos(a) * (LOBBY_RADIUS - 1.0), 1.6, Math.sin(a) * (LOBBY_RADIUS - 1.0));
    pillars.add(p);
  }

  // Teleport floors
  onRegisterFloors?.([floor, pitFloor, storePad]);

  // Spawn
  player.position.set(0, 1.6, 10);
  player.rotation.set(0, Math.PI, 0);

  onStatus?.(`world ready ✅\n${BUILD}\nLobby radius=${LOBBY_RADIUS}\nPit radius=${PIT_RADIUS}`);

  return {
    update(dt) {
      glow.rotation.z += dt * 0.25;
    },
    dispose() {
      scene.remove(world);
    },
  };
}

function buildPokerTable({ THREE }) {
  const g = new THREE.Group();

  const topGeo = new THREE.CylinderGeometry(2.6, 2.6, 0.18, 48);
  const topMat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.08 });
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.y = 0.95;
  g.add(top);

  const feltGeo = new THREE.CylinderGeometry(2.35, 2.35, 0.08, 48);
  const feltMat = new THREE.MeshStandardMaterial({ roughness: 0.98, metalness: 0.01 });
  const felt = new THREE.Mesh(feltGeo, feltMat);
  felt.position.y = 1.02;
  g.add(felt);

  const baseGeo = new THREE.CylinderGeometry(0.55, 0.75, 0.95, 24);
  const baseMat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.2 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.47;
  g.add(base);

  // Dealer chip (flat)
  const chipGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 24);
  const chipMat = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.05 });
  const chip = new THREE.Mesh(chipGeo, chipMat);
  chip.position.set(0.0, 1.08, 0.9);
  chip.rotation.x = Math.PI / 2;
  g.add(chip);

  // Pass line ring
  const ringGeo = new THREE.RingGeometry(1.85, 2.05, 64);
  const ringMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 1.07;
  g.add(ring);

  return g;
}

function buildChairs({ THREE, radius = 4, count = 6 }) {
  const g = new THREE.Group();
  const seatGeo = new THREE.BoxGeometry(0.55, 0.08, 0.55);
  const backGeo = new THREE.BoxGeometry(0.55, 0.6, 0.08);
  const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 10);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.05 });

  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const chair = new THREE.Group();

    const seat = new THREE.Mesh(seatGeo, mat);
    seat.position.y = 0.55;

    const back = new THREE.Mesh(backGeo, mat);
    back.position.set(0, 0.85, -0.24);

    chair.add(seat, back);

    for (let k = 0; k < 4; k++) {
      const leg = new THREE.Mesh(legGeo, mat);
      const sx = k < 2 ? -0.22 : 0.22;
      const sz = k % 2 === 0 ? -0.22 : 0.22;
      leg.position.set(sx, 0.225, sz);
      chair.add(leg);
    }

    chair.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    chair.lookAt(0, 0.6, 0);
    g.add(chair);
  }

  return g;
}

function buildMannequin({ THREE }) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.1 });

  const bodyGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.7, 16);
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = 1.1;

  const headGeo = new THREE.SphereGeometry(0.18, 18, 18);
  const head = new THREE.Mesh(headGeo, mat);
  head.position.y = 1.65;

  const baseGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.05, 24);
  const base = new THREE.Mesh(baseGeo, mat);
  base.position.y = 0.025;

  g.add(base, body, head);
  return g;
}
