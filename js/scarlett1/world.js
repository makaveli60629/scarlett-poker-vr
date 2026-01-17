// /js/scarlett1/world.js — Scarlett Lobby World (FULL)
// BUILD: WORLD_FULL_LOBBY_v4_3_FINAL

const BUILD = "WORLD_FULL_LOBBY_v4_3_FINAL";

export async function buildWorld(ctx) {
  const { THREE, scene, player, onRegisterFloors, onStatus } = ctx;

  onStatus?.(`building world…\n${BUILD}`);

  const world = new THREE.Group();
  scene.add(world);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x202030, 0.95);
  world.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(8, 14, 6);
  world.add(dir);

  const LOBBY_RADIUS = 18;
  const LOBBY_HEIGHT = 7;

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(LOBBY_RADIUS, 96),
    new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  world.add(floor);

  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(LOBBY_RADIUS, LOBBY_RADIUS, LOBBY_HEIGHT, 96, 1, true),
    new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.05, side: THREE.DoubleSide })
  );
  wall.position.y = LOBBY_HEIGHT / 2;
  world.add(wall);

  const glow = new THREE.Mesh(
    new THREE.TorusGeometry(LOBBY_RADIUS - 1.4, 0.08, 16, 120),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.65 })
  );
  glow.rotation.x = Math.PI / 2;
  glow.position.y = LOBBY_HEIGHT - 0.2;
  world.add(glow);

  // Poker pit
  const pit = new THREE.Group();
  world.add(pit);

  const PIT_RADIUS = 8.5;
  const PIT_DEPTH = 1.4;

  const pitFloor = new THREE.Mesh(
    new THREE.CircleGeometry(PIT_RADIUS, 72),
    new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0.03 })
  );
  pitFloor.rotation.x = -Math.PI / 2;
  pitFloor.position.y = -PIT_DEPTH;
  pit.add(pitFloor);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(PIT_RADIUS, 0.12, 12, 120),
    new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.15 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.02;
  pit.add(rim);

  // Stairs
  const stepCount = 8;
  const stepW = 2.6;
  const stepH = PIT_DEPTH / stepCount;
  const stepD = 0.55;
  const stepMat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0.02 });

  for (let i = 0; i < stepCount; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), stepMat);
    step.position.set(0, -stepH / 2 - i * stepH, PIT_RADIUS - 0.8 + i * (stepD * 0.9));
    pit.add(step);
  }

  // Table (placeholder)
  const table = buildPokerTable({ THREE });
  table.position.set(0, -PIT_DEPTH + 0.02, 0);
  pit.add(table);

  // Store
  const store = new THREE.Group();
  store.position.set(-12, 0, -6);
  world.add(store);

  const storePad = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 5),
    new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.05 })
  );
  storePad.rotation.x = -Math.PI / 2;
  storePad.position.y = 0.01;
  store.add(storePad);

  const manA = buildMannequin({ THREE });
  const manB = buildMannequin({ THREE });
  manA.position.set(-1.6, 0, -0.5);
  manB.position.set(1.6, 0, -0.5);
  store.add(manA, manB);

  // Teleport floors
  onRegisterFloors?.([floor, pitFloor, storePad]);

  // Spawn
  player.position.set(0, 1.6, 10);
  player.rotation.set(0, Math.PI, 0);

  onStatus?.(`world ready ✅\n${BUILD}`);

  return {
    update(dt) { glow.rotation.z += dt * 0.25; }
  };
}

function buildPokerTable({ THREE }) {
  const g = new THREE.Group();

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 0.18, 48),
    new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.08 })
  );
  top.position.y = 0.95;
  g.add(top);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(2.35, 2.35, 0.08, 48),
    new THREE.MeshStandardMaterial({ roughness: 0.98, metalness: 0.01 })
  );
  felt.position.y = 1.02;
  g.add(felt);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.75, 0.95, 24),
    new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.2 })
  );
  base.position.y = 0.47;
  g.add(base);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.85, 2.05, 64),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 1.07;
  g.add(ring);

  return g;
}

function buildMannequin({ THREE }) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.1 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.7, 16), mat);
  body.position.y = 1.1;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 18), mat);
  head.position.y = 1.65;

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 24), mat);
  base.position.y = 0.025;

  g.add(base, body, head);
  return g;
}
