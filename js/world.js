// /js/world.js — Scarlett VR Poker — Update 9.0 — HARD FIX compatible
// NOTE: Do NOT import THREE here. main.js passes it in.

export async function initWorld(ctx) {
  const { THREE, scene, hubLog } = ctx;
  const log = (m) => { try { hubLog?.(String(m)); } catch {} };

  const loader = new THREE.TextureLoader();
  const loadTex = (url, rx = 1, ry = 1) =>
    new Promise((resolve) => {
      loader.load(
        url,
        (t) => {
          t.wrapS = THREE.RepeatWrapping;
          t.wrapT = THREE.RepeatWrapping;
          t.repeat.set(rx, ry);
          resolve(t);
        },
        undefined,
        () => resolve(null)
      );
    });

  const texCarpet = await loadTex("./assets/textures/lobby_carpet.jpg", 6, 6);

  const ROOM = 34;
  const wallH = 3.9;
  const wallT = 0.45;

  scene.background = new THREE.Color(0x050505);

  const floorMat = new THREE.MeshStandardMaterial({
    color: texCarpet ? 0xffffff : 0x101010,
    map: texCarpet || null,
    roughness: 1.0,
    metalness: 0.0,
  });

  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(ROOM * 2, ROOM * 2), floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  scene.add(floorMesh);

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x141414,
    roughness: 0.95,
    metalness: 0.0,
  });

  addWall(0, wallH / 2, ROOM, ROOM * 2, wallH, wallT);
  addWall(0, wallH / 2, -ROOM, ROOM * 2, wallH, wallT);
  addWall(ROOM, wallH / 2, 0, wallT, wallH, ROOM * 2);
  addWall(-ROOM, wallH / 2, 0, wallT, wallH, ROOM * 2);

  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM * 2, ROOM * 2),
    new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 1 })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = wallH;
  scene.add(ceil);

  // spawn pads
  const spawnPads = [new THREE.Vector3(0, 0, 18), new THREE.Vector3(-2.6, 0, 18), new THREE.Vector3(2.6, 0, 18)];
  for (const p of spawnPads) makePad(p.x, p.z, true);

  // table focus
  const tableFocus = new THREE.Vector3(0, 0, 6);

  // table
  const table = new THREE.Group();
  table.position.copy(tableFocus);
  scene.add(table);

  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(2.35, 2.35, 0.16, 64),
    new THREE.MeshStandardMaterial({ color: 0x2b1d12, roughness: 0.75 })
  );
  tableTop.position.set(0, 0.88, 0);
  table.add(tableTop);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(2.10, 2.10, 0.11, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b4b2e, roughness: 1.0 })
  );
  felt.position.set(0, 0.89, 0);
  table.add(felt);

  // quick bots
  const bots = [];
  const seatCount = 8;
  const radius = 3.05;

  for (let i = 0; i < seatCount; i++) {
    const a = (i / seatCount) * Math.PI * 2;
    const x = tableFocus.x + Math.cos(a) * radius;
    const z = tableFocus.z + Math.sin(a) * radius;

    const chair = makeChair(THREE);
    chair.position.set(x, 0, z);
    yawLookAt(chair, tableFocus);
    scene.add(chair);

    const bot = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.22, 0.52, 6, 14),
      new THREE.MeshStandardMaterial({ color: i === 0 ? 0x666666 : 0x2f2f2f, roughness: 0.92 })
    );
    bot.position.set(x, 1.02, z);
    scene.add(bot);
    bots.push(bot);
  }

  log("✅ world.js loaded (HARD FIX) — if you see room/table/bots, this works.");

  return {
    floorMesh,
    spawnPads,
    tableFocus,
    roomClamp: { minX: -ROOM + 1.2, maxX: ROOM - 1.2, minZ: -ROOM + 1.2, maxZ: ROOM - 1.2 },
    tick: (dt) => {
      // tiny idle motion so you know it's alive
      const t = performance.now() * 0.001;
      for (let i = 0; i < bots.length; i++) {
        bots[i].position.y = 1.02 + Math.sin(t * 1.2 + i) * 0.01;
      }
    },
  };

  function addWall(x, y, z, sx, sy, sz) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), wallMat);
    w.position.set(x, y, z);
    scene.add(w);
  }

  function makePad(x, z, isSpawn) {
    const mat = new THREE.MeshStandardMaterial({
      color: isSpawn ? 0x113018 : 0x0a2a18,
      roughness: 0.8,
      emissive: new THREE.Color(0x22ff55),
      emissiveIntensity: isSpawn ? 0.22 : 0.12,
    });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.09, 32), mat);
    pad.position.set(x, 0.045, z);
    scene.add(pad);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.40, 0.58, 32),
      new THREE.MeshBasicMaterial({ color: 0x33ff66, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.10, z);
    scene.add(ring);
  }
}

function yawLookAt(obj, targetPos) {
  const p = obj.position;
  obj.lookAt(targetPos.x, p.y, targetPos.z);
}

function makeChair(THREE) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x2b1d12, roughness: 0.75 });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.09, 0.62), wood);
  seat.position.set(0, 0.46, 0);
  g.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.09), wood);
  back.position.set(0, 0.78, -0.26);
  g.add(back);

  const legMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
  for (const [lx, lz] of [
    [-0.22, -0.22],
    [0.22, -0.22],
    [-0.22, 0.22],
    [0.22, 0.22],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.46, 10), legMat);
    leg.position.set(lx, 0.23, lz);
    g.add(leg);
  }
  return g;
}
