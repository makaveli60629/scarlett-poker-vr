// /js/scarlett1/world.js — SCARLETT ULTIMATE WORLD (FULL)
// BUILD: WORLD_ULTIMATE_FULL_v4_3_ULT
//
// Goals:
// - Big lobby (2x feel), poker pit divot, stairs, table, chairs
// - Store zone with mannequins + simple shelves
// - Teleport floors registered
// - World returns a "registry" of modules that diag can list
// - SAFE geometry (no CapsuleGeometry), Quest/Android safe
//
// NOTE: This file does NOT depend on any other modules. It provides "hooks"
// for modules to attach later without breaking boot.

const BUILD = "WORLD_ULTIMATE_FULL_v4_3_ULT";

export async function buildWorld(ctx) {
  const { THREE, scene, player, renderer, onRegisterFloors, onStatus, log } = ctx;

  onStatus?.(`building world…\n${BUILD}`);

  // ---- Module registry (for your diag panel) ----
  // The idea: every “feature” registers itself here so you can inspect quickly.
  // You can add/remove entries without touching index/boot.
  const registry = createRegistry();
  registry.add("WORLD_CORE", "World root group + lighting + update loop", "ok");
  registry.add("LOBBY", "Circular lobby shell + floor + ceiling glow", "ok");
  registry.add("POKER_PIT", "Divot pit + rim + stairs", "ok");
  registry.add("TABLE", "Poker table + pass line ring + dealer puck", "ok");
  registry.add("CHAIRS", "6 chairs around table", "ok");
  registry.add("STORE", "Store pad + back wall + mannequins + shelves", "ok");
  registry.add("TELEPORT_FLOORS", "Floor meshes registered for teleport raycast", "ok");

  // ---- World root ----
  const world = new THREE.Group();
  world.name = "ScarlettWorld";
  scene.add(world);

  // ---- Lighting (more contrast than flat gray) ----
  const hemi = new THREE.HemisphereLight(0xffffff, 0x202030, 0.55);
  world.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(10, 16, 8);
  world.add(key);

  const fill = new THREE.PointLight(0xffffff, 1.0, 60);
  fill.position.set(0, 6.5, 0);
  world.add(fill);

  // ---- Lobby ----
  const LOBBY_RADIUS = 18;
  const LOBBY_HEIGHT = 7;

  const floorMat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0.04 });
  const wallMat  = new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0.06, side: THREE.DoubleSide });

  const lobbyFloor = new THREE.Mesh(new THREE.CircleGeometry(LOBBY_RADIUS, 96), floorMat);
  lobbyFloor.rotation.x = -Math.PI / 2;
  lobbyFloor.receiveShadow = true;
  lobbyFloor.name = "LobbyFloor";
  world.add(lobbyFloor);

  const lobbyWall = new THREE.Mesh(
    new THREE.CylinderGeometry(LOBBY_RADIUS, LOBBY_RADIUS, LOBBY_HEIGHT, 96, 1, true),
    wallMat
  );
  lobbyWall.position.y = LOBBY_HEIGHT / 2;
  lobbyWall.name = "LobbyWall";
  world.add(lobbyWall);

  // Ceiling ring + glow for vibe
  const ceiling = new THREE.Mesh(
    new THREE.RingGeometry(LOBBY_RADIUS - 0.8, LOBBY_RADIUS, 96),
    new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.08, side: THREE.DoubleSide })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = LOBBY_HEIGHT;
  ceiling.name = "CeilingRing";
  world.add(ceiling);

  const glow = new THREE.Mesh(
    new THREE.TorusGeometry(LOBBY_RADIUS - 1.7, 0.1, 16, 140),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55 })
  );
  glow.rotation.x = Math.PI / 2;
  glow.position.y = LOBBY_HEIGHT - 0.35;
  glow.name = "CeilingGlow";
  world.add(glow);

  // Center marker (debug landmark; remove later if you want)
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0xff3333, roughness: 0.4, metalness: 0.1 })
  );
  marker.position.set(0, 1.5, 0);
  marker.name = "CenterMarker";
  world.add(marker);

  // ---- Poker pit divot ----
  const pit = new THREE.Group();
  pit.name = "PokerPit";
  world.add(pit);

  const PIT_RADIUS = 8.5;
  const PIT_DEPTH = 1.4;

  const pitFloor = new THREE.Mesh(
    new THREE.CircleGeometry(PIT_RADIUS, 72),
    new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0.03 })
  );
  pitFloor.rotation.x = -Math.PI / 2;
  pitFloor.position.y = -PIT_DEPTH;
  pitFloor.name = "PitFloor";
  pit.add(pitFloor);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(PIT_RADIUS, 0.14, 12, 140),
    new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.18 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.02;
  rim.name = "PitRim";
  pit.add(rim);

  // Stairs (front)
  const stairs = new THREE.Group();
  stairs.name = "PitStairs";
  pit.add(stairs);

  const stepCount = 9;
  const stepW = 3.0;
  const stepH = PIT_DEPTH / stepCount;
  const stepD = 0.55;
  const stepMat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0.02 });

  for (let i = 0; i < stepCount; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), stepMat);
    step.position.set(0, -stepH / 2 - i * stepH, PIT_RADIUS - 0.8 + i * (stepD * 0.9));
    stairs.add(step);
  }

  // ---- Table + chairs ----
  const table = buildPokerTable({ THREE });
  table.position.set(0, -PIT_DEPTH + 0.02, 0);
  pit.add(table);

  const chairs = buildChairs({ THREE, radius: 4.25, count: 6 });
  chairs.position.set(0, -PIT_DEPTH + 0.02, 0);
  pit.add(chairs);

  // ---- Rail ring around pit (visual boundary) ----
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(PIT_RADIUS + 2.2, 0.12, 12, 160),
    new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.22 })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.95;
  rail.name = "PitRail";
  world.add(rail);
  registry.add("RAIL", "Rail torus boundary around pit", "ok");

  // ---- Store Zone ----
  const store = new THREE.Group();
  store.name = "StoreZone";
  store.position.set(-12, 0, -6);
  world.add(store);

  const storePad = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 5),
    new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.05 })
  );
  storePad.rotation.x = -Math.PI / 2;
  storePad.position.y = 0.01;
  storePad.name = "StorePad";
  store.add(storePad);

  const storeBackWall = new THREE.Mesh(
    new THREE.BoxGeometry(7, 3, 0.2),
    new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.08 })
  );
  storeBackWall.position.set(0, 1.5, -2.4);
  storeBackWall.name = "StoreBackWall";
  store.add(storeBackWall);

  // Shelves
  const shelfMat = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.12 });
  for (let i = 0; i < 3; i++) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.12, 0.5), shelfMat);
    shelf.position.set(0, 0.8 + i * 0.65, -2.1);
    shelf.name = `StoreShelf_${i}`;
    store.add(shelf);
  }

  // Mannequins
  const manA = buildMannequin({ THREE });
  const manB = buildMannequin({ THREE });
  manA.position.set(-1.6, 0, -0.5);
  manB.position.set( 1.6, 0, -0.5);
  store.add(manA, manB);

  // ---- Teleport floors ----
  onRegisterFloors?.([lobbyFloor, pitFloor, storePad]);

  // ---- Spawn: face the center and NOT inside wall ----
  player.position.set(0, 1.6, 14);
  player.rotation.set(0, 0, 0);

  onStatus?.(`world ready ✅\n${BUILD}\nmodules=${registry.items.length}`);

  // Return world API to runtime
  return {
    registry,                 // diag panel can read this
    anchors: { world, pit, table, store }, // helpful for modules to attach
    update(dt) {
      glow.rotation.z += dt * 0.25;
    },
    dispose() {
      scene.remove(world);
    },
  };
}

// ---------------- Helpers ----------------

function createRegistry() {
  const items = [];
  return {
    items,
    add(id, desc, status = "ok", extra = "") {
      items.push({ id, desc, status, extra });
    },
  };
}

function buildPokerTable({ THREE }) {
  const g = new THREE.Group();
  g.name = "PokerTable";

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

  // Dealer chip (flat)
  const chip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.02, 24),
    new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.05 })
  );
  chip.position.set(0.0, 1.08, 0.9);
  chip.rotation.x = Math.PI / 2;
  chip.name = "DealerChip";
  g.add(chip);

  // Pass line ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.85, 2.05, 64),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 1.07;
  ring.name = "PassLineRing";
  g.add(ring);

  return g;
}

function buildChairs({ THREE, radius = 4, count = 6 }) {
  const g = new THREE.Group();
  g.name = "Chairs";

  const seatGeo = new THREE.BoxGeometry(0.55, 0.08, 0.55);
  const backGeo = new THREE.BoxGeometry(0.55, 0.6, 0.08);
  const legGeo  = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 10);
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
  g.name = "Mannequin";

  const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.1 });

  // Quest-safe (no CapsuleGeometry)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.7, 16), mat);
  body.position.y = 1.1;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 18), mat);
  head.position.y = 1.65;

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 24), mat);
  base.position.y = 0.025;

  g.add(base, body, head);
  return g;
      }
