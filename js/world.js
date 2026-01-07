// /js/world.js — Scarlet VR Poker World (Lobby + Table + Bots)
// Exports initWorld(ctx) used by main.js.
// This file builds a full visible world even if textures fail to load.

export async function initWorld(ctx) {
  const { THREE, scene, hubLog, hubStatus } = ctx;

  hubLog("🌍 world.js: initWorld()");

  // -------- Texture helper (never fatal) --------
  const loader = new THREE.TextureLoader();
  const loadTex = (url, opts = {}) =>
    new Promise((resolve) => {
      loader.load(
        url,
        (t) => {
          if (opts.repeat) {
            t.wrapS = THREE.RepeatWrapping;
            t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(opts.repeat[0], opts.repeat[1]);
          }
          if (opts.anisotropy) t.anisotropy = opts.anisotropy;
          resolve(t);
        },
        undefined,
        () => resolve(null)
      );
    });

  // Try to use your existing textures if paths match.
  // If your folder names differ, update these strings to match your repo.
  const texCarpet = await loadTex("./assets/textures/lobby_carpet.jpg", { repeat: [4, 4] });
  const texBrick  = await loadTex("./assets/textures/brickwall.jpg", { repeat: [3, 2] });
  const texFelt   = await loadTex("./assets/textures/table_felt_green.jpg", { repeat: [2, 2] });

  if (texCarpet) hubLog("✅ Loaded carpet texture");
  else hubLog("⚠ Carpet texture not found (using solid color)");

  if (texBrick) hubLog("✅ Loaded brick wall texture");
  else hubLog("⚠ Brick texture not found (using solid color)");

  if (texFelt) hubLog("✅ Loaded felt texture");
  else hubLog("⚠ Felt texture not found (using solid color)");

  hubStatus("world: building lobby…");

  // -------- Floor --------
  const floorMat = new THREE.MeshStandardMaterial({
    color: texCarpet ? 0xffffff : 0x121212,
    map: texCarpet || null,
    roughness: 1,
    metalness: 0,
  });

  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0;
  floorMesh.name = "FLOOR";
  scene.add(floorMesh);

  // -------- Walls (4) --------
  const wallMat = new THREE.MeshStandardMaterial({
    color: texBrick ? 0xffffff : 0x1a1a1a,
    map: texBrick || null,
    roughness: 0.9,
    metalness: 0,
  });

  const roomSize = 14;
  const wallH = 3.2;
  const wallT = 0.3;

  addWall(THREE, scene, 0, wallH / 2, roomSize / 2, roomSize, wallH, wallT, wallMat);   // +Z
  addWall(THREE, scene, 0, wallH / 2, -roomSize / 2, roomSize, wallH, wallT, wallMat);  // -Z
  addWall(THREE, scene, roomSize / 2, wallH / 2, 0, wallT, wallH, roomSize, wallMat);   // +X
  addWall(THREE, scene, -roomSize / 2, wallH / 2, 0, wallT, wallH, roomSize, wallMat);  // -X

  // A subtle ceiling
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomSize),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, wallH + 0.02, 0);
  scene.add(ceil);

  // A center rug highlight (helps depth)
  const rug = new THREE.Mesh(
    new THREE.CircleGeometry(3.7, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b1a12, roughness: 1, metalness: 0 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.01;
  scene.add(rug);

  hubStatus("world: building table…");
  const tableGroup = createPokerTable(THREE, texFelt);
  tableGroup.position.set(0, 0, 0);
  scene.add(tableGroup);

  hubStatus("world: spawning bots…");
  const bots = spawnBots(THREE, scene, 8);

  // Animate bots (simple idle) using renderer loop from main.js:
  // We can't hook into main's animation loop directly here without extra plumbing,
  // so we add a lightweight frame callback on window (optional).
  // main.js can ignore this; the world still works.
  window.__worldTick = (dt) => {
    const t = performance.now() / 1000;
    for (const bot of bots) {
      const ud = bot.userData;
      bot.position.y = 0.95 + Math.sin(t * 2 + ud.phase) * ud.bob;
    }
  };

  // Bounds used by main.js for movement/teleport
  const bounds = { minX: -6.6, maxX: 6.6, minZ: -6.6, maxZ: 6.6 };

  hubLog("✅ world.js: lobby ready");
  hubStatus("world ready");

  return { floorMesh, bounds };
}

function addWall(THREE, scene, x, y, z, sx, sy, sz, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  mesh.position.set(x, y, z);
  mesh.name = "WALL";
  scene.add(mesh);
  return mesh;
}

function createPokerTable(THREE, feltTexture) {
  const table = new THREE.Group();
  table.name = "POKER_TABLE";

  // Base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.6, 0.75, 24),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.85 })
  );
  base.position.y = 0.375;
  table.add(base);

  // Top rim
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(2.05, 2.05, 0.12, 64),
    new THREE.MeshStandardMaterial({ color: 0x2d241a, roughness: 0.7 })
  );
  rim.position.y = 0.82;
  table.add(rim);

  // Felt
  const feltMat = new THREE.MeshStandardMaterial({
    color: feltTexture ? 0xffffff : 0x0b4b2e,
    map: feltTexture || null,
    roughness: 1.0,
    metalness: 0.0,
  });

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(1.85, 1.85, 0.10, 64),
    feltMat
  );
  felt.position.y = 0.82;
  table.add(felt);

  // Seats
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 0.95 });
  const seatGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 20);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 2.7;

    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(Math.cos(a) * r, 0.45, Math.sin(a) * r);
    seat.rotation.y = -a + Math.PI / 2;
    table.add(seat);
  }

  return table;
}

function spawnBots(THREE, scene, count) {
  const bots = [];
  const botGeo = new THREE.CapsuleGeometry(0.18, 0.55, 6, 12);
  const colors = [0x7b1e1e, 0x1e3a7b, 0x2a7b1e, 0x7b6a1e, 0x5a1e7b, 0x1e7b6f, 0x7b3f1e, 0x3f3f3f];

  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.9 });
    const bot = new THREE.Mesh(botGeo, mat);

    const a = (i / count) * Math.PI * 2;
    const r = 2.9;
    bot.position.set(Math.cos(a) * r, 0.95, Math.sin(a) * r);
    bot.rotation.y = -a + Math.PI / 2;

    bot.userData = { phase: Math.random() * Math.PI * 2, bob: 0.02 + Math.random() * 0.02 };
    bot.name = "BOT_" + i;

    scene.add(bot);
    bots.push(bot);
  }
  return bots;
    }
