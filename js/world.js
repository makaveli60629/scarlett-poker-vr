// /js/world.js — Full lobby world with textures (safe fallbacks)
// Export: initWorld(ctx) -> { floorMesh, bounds }

export async function initWorld(ctx) {
  const { THREE, scene, hubLog } = ctx;

  const log = (m) => { try { hubLog?.(String(m)); } catch {} };

  log("🌍 world.js: initWorld() starting");

  const loader = new THREE.TextureLoader();

  const loadTex = (url, repeatX=1, repeatY=1) => new Promise((resolve) => {
    loader.load(url, (t) => {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeatX, repeatY);
      resolve(t);
    }, undefined, () => resolve(null));
  });

  // Update these paths if your folder names differ
  const carpet = await loadTex("./assets/textures/lobby_carpet.jpg", 4, 4);
  const brick  = await loadTex("./assets/textures/brickwall.jpg", 3, 2);
  const felt   = await loadTex("./assets/textures/table_felt_green.jpg", 2, 2);

  if (carpet) log("✅ carpet loaded"); else log("⚠ carpet missing");
  if (brick)  log("✅ brick loaded");  else log("⚠ brick missing");
  if (felt)   log("✅ felt loaded");   else log("⚠ felt missing");

  // Floor (textured carpet)
  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({
      color: carpet ? 0xffffff : 0x121212,
      map: carpet || null,
      roughness: 1,
      metalness: 0,
    })
  );
  floorMesh.rotation.x = -Math.PI/2;
  floorMesh.position.y = 0;
  scene.add(floorMesh);

  // Room walls
  const roomSize = 14;
  const wallH = 3.2;
  const wallT = 0.3;

  const wallMat = new THREE.MeshStandardMaterial({
    color: brick ? 0xffffff : 0x1a1a1a,
    map: brick || null,
    roughness: 0.9,
    metalness: 0,
  });

  addWall(THREE, scene, 0, wallH/2,  roomSize/2, roomSize, wallH, wallT, wallMat);
  addWall(THREE, scene, 0, wallH/2, -roomSize/2, roomSize, wallH, wallT, wallMat);
  addWall(THREE, scene,  roomSize/2, wallH/2, 0, wallT, wallH, roomSize, wallMat);
  addWall(THREE, scene, -roomSize/2, wallH/2, 0, wallT, wallH, roomSize, wallMat);

  // Ceiling
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomSize),
    new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI/2;
  ceiling.position.set(0, wallH + 0.02, 0);
  scene.add(ceiling);

  // Poker table
  const table = createTable(THREE, felt);
  scene.add(table);

  // Bots
  const bots = spawnBots(THREE, scene, 8);
  window.__worldTick = () => {
    const t = performance.now()/1000;
    for (const bot of bots) bot.position.y = 0.95 + Math.sin(t*2 + bot.userData.phase) * bot.userData.bob;
  };

  log("✅ world.js: built lobby/table/bots");

  const bounds = { minX: -6.6, maxX: 6.6, minZ: -6.6, maxZ: 6.6 };
  return { floorMesh, bounds };
}

function addWall(THREE, scene, x,y,z, sx,sy,sz, mat){
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), mat);
  mesh.position.set(x,y,z);
  scene.add(mesh);
}

function createTable(THREE, feltTex){
  const g = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.6, 0.75, 24),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.85 })
  );
  base.position.y = 0.375;
  g.add(base);

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(2.05, 2.05, 0.12, 64),
    new THREE.MeshStandardMaterial({ color: 0x2d241a, roughness: 0.7 })
  );
  rim.position.y = 0.82;
  g.add(rim);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(1.85, 1.85, 0.10, 64),
    new THREE.MeshStandardMaterial({
      color: feltTex ? 0xffffff : 0x0b4b2e,
      map: feltTex || null,
      roughness: 1,
      metalness: 0
    })
  );
  felt.position.y = 0.82;
  g.add(felt);

  // Seats
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 0.95 });
  const seatGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 20);
  for (let i=0;i<8;i++){
    const a = (i/8)*Math.PI*2;
    const r = 2.7;
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(Math.cos(a)*r, 0.45, Math.sin(a)*r);
    g.add(seat);
  }

  g.position.set(0,0,0);
  return g;
}

function spawnBots(THREE, scene, count){
  const bots = [];
  const botGeo = new THREE.CapsuleGeometry(0.18, 0.55, 6, 12);
  const colors = [0x7b1e1e,0x1e3a7b,0x2a7b1e,0x7b6a1e,0x5a1e7b,0x1e7b6f,0x7b3f1e,0x3f3f3f];

  for (let i=0;i<count;i++){
    const bot = new THREE.Mesh(
      botGeo,
      new THREE.MeshStandardMaterial({ color: colors[i%colors.length], roughness: 0.9 })
    );
    const a = (i/count)*Math.PI*2;
    bot.position.set(Math.cos(a)*2.9, 0.95, Math.sin(a)*2.9);
    bot.rotation.y = -a + Math.PI/2;
    bot.userData = { phase: Math.random()*Math.PI*2, bob: 0.02 + Math.random()*0.02 };
    scene.add(bot);
    bots.push(bot);
  }
  return bots;
  }
