// js/scarlett1/mod_world_upgrade.js — World Upgrade Module (FULL • SAFE)
// Loads AFTER core world. Adds: divot pit, guardrail, chairs, hallways, store shell + balcony + stairs.
// Usage: import and call init({ THREE, scene, floorMeshes, log })

export function init(ctx) {
  const { THREE, scene, floorMeshes } = ctx;
  const log = ctx.log || console.log;

  if (!THREE || !scene) {
    log("[mod_world_upgrade] missing THREE/scene");
    return;
  }

  log("[mod_world_upgrade] init ✅");

  const grp = new THREE.Group();
  grp.name = "MOD_WORLD_UPGRADE";
  scene.add(grp);

  // Materials
  const MAT_WALL = new THREE.MeshStandardMaterial({ color: 0x05070e, roughness: 0.95, metalness: 0.05 });
  const MAT_FLOOR = new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95, metalness: 0.05 });
  const MAT_METAL = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.55 });
  const MAT_SEAT  = new THREE.MeshStandardMaterial({ color: 0x141b2c, roughness: 0.85, metalness: 0.1 });
  const MAT_FELT  = new THREE.MeshStandardMaterial({ color: 0x0e4b2a, roughness: 0.95, metalness: 0.02 });

  // ---------- TABLE PIT / DIVOT ----------
  // Inner lowered floor
  const pitR = 7.2;
  const pit = new THREE.Mesh(new THREE.CircleGeometry(pitR, 96), MAT_FLOOR);
  pit.rotation.x = -Math.PI / 2;
  pit.position.y = -0.55;
  grp.add(pit);
  floorMeshes && floorMeshes.push(pit);

  // Pit wall (cylinder)
  const pitWall = new THREE.Mesh(
    new THREE.CylinderGeometry(pitR, pitR, 1.1, 96, 1, true),
    MAT_WALL
  );
  pitWall.position.y = -0.0;
  grp.add(pitWall);

  // Ramp ring (walkable)
  const ramp = new THREE.Mesh(new THREE.RingGeometry(pitR, pitR + 2.2, 128), MAT_FLOOR);
  ramp.rotation.x = -Math.PI / 2;
  ramp.position.y = 0.01;
  grp.add(ramp);
  floorMeshes && floorMeshes.push(ramp);

  // Guardrail
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(pitR + 1.2, 0.08, 16, 140),
    MAT_METAL
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 1.05;
  grp.add(rail);

  // ---------- TABLE ----------
  const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.9, 0.5, 64), MAT_METAL);
  tableBase.position.set(0, -0.3, 0);
  grp.add(tableBase);

  const felt = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.18, 64), MAT_FELT);
  felt.position.set(0, -0.02, 0);
  grp.add(felt);

  // ---------- CHAIRS ----------
  const chairCount = 8;
  for (let i = 0; i < chairCount; i++) {
    const a = (i / chairCount) * Math.PI * 2;

    const c = new THREE.Group();
    c.position.set(Math.cos(a) * 5.3, -0.45, Math.sin(a) * 5.3);
    c.rotation.y = -a + Math.PI;

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 0.65), MAT_SEAT);
    seat.position.set(0, 0.55, 0);
    c.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.12), MAT_SEAT);
    back.position.set(0, 0.83, -0.28);
    c.add(back);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.55, 16), MAT_METAL);
    post.position.set(0, 0.28, 0);
    c.add(post);

    grp.add(c);
  }

  // ---------- HALLWAYS (4 openings) ----------
  // We create simple hallway corridors at N/E/S/W (visual + navigable floors)
  const halls = [
    { x: 0, z: 24, rot: Math.PI, name: "HALL_N" },
    { x: 24, z: 0, rot: -Math.PI / 2, name: "HALL_E" },
    { x: 0, z: -24, rot: 0, name: "HALL_S" },
    { x: -24, z: 0, rot: Math.PI / 2, name: "HALL_W" },
  ];

  halls.forEach(h => {
    const hall = new THREE.Group();
    hall.name = h.name;
    hall.position.set(h.x, 0, h.z);
    hall.rotation.y = h.rot;
    grp.add(hall);

    const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.04, 22), MAT_FLOOR);
    floor.position.set(0, 0.02, -11);
    hall.add(floor);
    floorMeshes && floorMeshes.push(floor);

    const left = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.5, 22), MAT_WALL);
    left.position.set(-5, 2.25, -11);
    hall.add(left);

    const right = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.5, 22), MAT_WALL);
    right.position.set(5, 2.25, -11);
    hall.add(right);

    const top = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 22), MAT_WALL);
    top.position.set(0, 4.5, -11);
    hall.add(top);
  });

  // ---------- STORE SHELL (east hall end) ----------
  // Simple store room off the E hallway
  const store = new THREE.Group();
  store.name = "STORE_ROOM";
  store.position.set(42, 0, 0);
  grp.add(store);

  const storeFloor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.04, 18), MAT_FLOOR);
  storeFloor.position.set(0, 0.02, 0);
  store.add(storeFloor);
  floorMeshes && floorMeshes.push(storeFloor);

  // store walls
  const w1 = new THREE.Mesh(new THREE.BoxGeometry(18, 5, 0.35), MAT_WALL); w1.position.set(0, 2.5, -9);
  const w2 = new THREE.Mesh(new THREE.BoxGeometry(18, 5, 0.35), MAT_WALL); w2.position.set(0, 2.5, 9);
  const w3 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5, 18), MAT_WALL); w3.position.set(-9, 2.5, 0);
  const w4 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5, 18), MAT_WALL); w4.position.set(9, 2.5, 0);
  store.add(w1, w2, w3, w4);

  // Balcony above store
  const balc = new THREE.Mesh(new THREE.BoxGeometry(18, 0.25, 7), MAT_METAL);
  balc.position.set(0, 3.2, -5.5);
  store.add(balc);
  floorMeshes && floorMeshes.push(balc);

  // Stairs to balcony (simple stepped ramp)
  const stairs = new THREE.Group();
  stairs.position.set(-7, 0, -2);
  store.add(stairs);

  for (let i = 0; i < 10; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 0.7), MAT_METAL);
    step.position.set(i * 0.55, 0.09 + i * 0.28, -i * 0.35);
    stairs.add(step);
    floorMeshes && floorMeshes.push(step);
  }

  // Extra lighting for store
  const storeLight = new THREE.PointLight(0x88aaff, 0.85, 40);
  storeLight.position.set(0, 4.4, 0);
  store.add(storeLight);
}
