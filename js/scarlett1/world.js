// /js/scarlett1/world.js — Scarlett World (FULL • MODULAR)
// - Solid lobby shell, floor, walls
// - Divoted center with poker table + chairs
// - 4 hallways out to placeholder rooms
// - Spawn pads (always away from table)
// - Provides colliders + spawnPads for XR/Android modules

export async function initWorld({ THREE, base, log }) {
  const container = document.getElementById("app") || document.body;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040814);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 2000);
  camera.position.set(0, 1.65, 6);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  // Player rig (modules will attach camera/controllers)
  const playerRig = new THREE.Group();
  playerRig.name = "PlayerRig";
  playerRig.position.set(0, 0, 0);
  scene.add(playerRig);
  playerRig.add(camera);

  // Lights
  const hemi = new THREE.HemisphereLight(0xbcd7ff, 0x0a0f22, 0.9);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 0.7);
  key.position.set(8, 14, 6);
  scene.add(key);

  // Materials
  const MAT_FLOOR = new THREE.MeshStandardMaterial({ color: 0x0a1228, roughness: 0.95, metalness: 0.0 });
  const MAT_WALL  = new THREE.MeshStandardMaterial({ color: 0x0d1836, roughness: 0.9, metalness: 0.05 });
  const MAT_TRIM  = new THREE.MeshStandardMaterial({ color: 0x203a86, roughness: 0.5, metalness: 0.2 });
  const MAT_FELT  = new THREE.MeshStandardMaterial({ color: 0x0a6a4b, roughness: 0.95, metalness: 0.0 });
  const MAT_TABLE = new THREE.MeshStandardMaterial({ color: 0x1b2a44, roughness: 0.6, metalness: 0.15 });
  const MAT_CHAIR = new THREE.MeshStandardMaterial({ color: 0x101827, roughness: 0.9, metalness: 0.05 });

  // Colliders list for teleport/ground checks
  const colliders = [];

  // ----- Lobby: floor + circular wall -----
  const LOBBY_R = 12;
  const FLOOR_Y = 0;

  const floor = new THREE.Mesh(new THREE.CircleGeometry(LOBBY_R, 96), MAT_FLOOR);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  floor.receiveShadow = true;
  scene.add(floor);
  colliders.push(floor);

  // Solid circular wall
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(LOBBY_R, LOBBY_R, 4.2, 96, 1, true), MAT_WALL);
  wall.position.y = 2.1;
  scene.add(wall);

  // Top ring trim
  const trim = new THREE.Mesh(new THREE.TorusGeometry(LOBBY_R - 0.1, 0.12, 16, 120), MAT_TRIM);
  trim.rotation.x = Math.PI / 2;
  trim.position.y = 4.18;
  scene.add(trim);

  // ----- Divot area (lowered center) -----
  const divotR = 5.2;
  const divotDepth = 0.35;

  // Ring deck at normal height
  const deckRing = new THREE.Mesh(new THREE.RingGeometry(divotR, LOBBY_R - 0.05, 96), MAT_FLOOR);
  deckRing.rotation.x = -Math.PI / 2;
  deckRing.position.y = FLOOR_Y;
  scene.add(deckRing);
  colliders.push(deckRing);

  // Lowered center disc
  const pit = new THREE.Mesh(new THREE.CircleGeometry(divotR - 0.02, 96), MAT_FLOOR);
  pit.rotation.x = -Math.PI / 2;
  pit.position.y = FLOOR_Y - divotDepth;
  scene.add(pit);
  colliders.push(pit);

  // Gentle “lip” (visual)
  const lip = new THREE.Mesh(new THREE.TorusGeometry(divotR, 0.08, 12, 90), MAT_TRIM);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = FLOOR_Y + 0.03;
  scene.add(lip);

  // ----- Poker table -----
  const table = new THREE.Group();
  table.position.set(0, FLOOR_Y - divotDepth + 0.02, 0);
  scene.add(table);

  const baseCyl = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.3, 0.9, 32), MAT_TABLE);
  baseCyl.position.y = 0.45;
  table.add(baseCyl);

  const topCyl = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.9, 0.18, 64), MAT_TABLE);
  topCyl.position.y = 1.05;
  table.add(topCyl);

  const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.55, 0.06, 64), MAT_FELT);
  felt.position.y = 1.13;
  table.add(felt);

  // Chairs (8)
  const chairCount = 8;
  for (let i = 0; i < chairCount; i++) {
    const a = (i / chairCount) * Math.PI * 2;
    const r = 3.9;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    const chair = new THREE.Group();
    chair.position.set(x, FLOOR_Y - divotDepth, z);
    chair.rotation.y = -a + Math.PI / 2;
    scene.add(chair);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.55), MAT_CHAIR);
    seat.position.y = 0.55;
    chair.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.12), MAT_CHAIR);
    back.position.set(0, 0.87, -0.22);
    chair.add(back);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 18), MAT_CHAIR);
    pole.position.y = 0.28;
    chair.add(pole);

    // collider for “don’t spawn inside chair”
    colliders.push(seat);
  }

  // ----- Hallways (4) -----
  const hallLen = 10;
  const hallW = 3.4;
  const hallH = 3.0;

  function makeHall(dirName, yaw) {
    const hall = new THREE.Group();
    hall.rotation.y = yaw;
    hall.position.set(0, 0, 0);
    scene.add(hall);

    // floor
    const hf = new THREE.Mesh(new THREE.PlaneGeometry(hallW, hallLen), MAT_FLOOR);
    hf.rotation.x = -Math.PI / 2;
    hf.position.set(0, FLOOR_Y + 0.001, -(LOBBY_R - 0.2) - hallLen / 2);
    hall.add(hf);
    colliders.push(hf);

    // walls
    const wallGeo = new THREE.BoxGeometry(0.2, hallH, hallLen);
    const wl = new THREE.Mesh(wallGeo, MAT_WALL);
    wl.position.set(-hallW / 2, hallH / 2, -(LOBBY_R - 0.2) - hallLen / 2);
    hall.add(wl);

    const wr = new THREE.Mesh(wallGeo, MAT_WALL);
    wr.position.set(hallW / 2, hallH / 2, -(LOBBY_R - 0.2) - hallLen / 2);
    hall.add(wr);

    // end room (placeholder)
    const room = new THREE.Mesh(new THREE.BoxGeometry(8, 3.5, 8), MAT_WALL);
    room.position.set(0, 1.75, -(LOBBY_R - 0.2) - hallLen - 4);
    hall.add(room);

    // sign
    const sign = makeSign(THREE, dirName);
    sign.position.set(0, 2.4, -(LOBBY_R - 0.6));
    sign.rotation.y = Math.PI;
    hall.add(sign);

    log?.(`sign: ${dirName}`);
  }

  function makeSign(THREE, text) {
    const g = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.7), MAT_TRIM);
    g.add(plate);

    // simple “text” as stripes (no font loader)
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.02), new THREE.MeshStandardMaterial({ color: 0xcfe2ff }));
    for (let i = 0; i < Math.min(6, text.length); i++) {
      const b = bar.clone();
      b.scale.x = 0.25 + (i % 3) * 0.15;
      b.position.set(-0.85 + i * 0.3, 0, 0.01);
      g.add(b);
    }
    return g;
  }

  makeHall("STORE", 0);
  makeHall("VIP", Math.PI / 2);
  makeHall("SCORP", Math.PI);
  makeHall("GAMES", -Math.PI / 2);

  // ----- Spawn pads (safe spots) -----
  // Always away from the table + not inside objects
  const spawnPads = [
    { x: 0, y: 0, z: 8.5, ry: Math.PI },     // SAFE: faces table from lobby
    { x: -6, y: 0, z: 6, ry: Math.PI / 2 },
    { x: 6, y: 0, z: 6, ry: -Math.PI / 2 },
    { x: 0, y: 0, z: -8.5, ry: 0 }
  ];

  // Visual pads
  for (const p of spawnPads) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.55, 32), MAT_TRIM);
    m.rotation.x = -Math.PI / 2;
    m.position.set(p.x, p.y + 0.01, p.z);
    scene.add(m);
  }

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Render loop (modules may add updaters)
  const updaters = new Set();
  const clock = new THREE.Clock();

  function animate() {
    const dt = Math.min(0.05, clock.getDelta());
    for (const fn of updaters) {
      try { fn(dt); } catch {}
    }
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(animate);

  log?.("render loop start ✅");
  log?.("initWorld() start");

  return {
    scene,
    camera,
    renderer,
    playerRig,
    colliders,
    spawnPads,
    addUpdater: (fn) => updaters.add(fn),
    removeUpdater: (fn) => updaters.delete(fn)
  };
    }
