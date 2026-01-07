// /js/world.js — Scarlett VR Poker — Update 9.0 (World + Teleport Pads + Table + Bots)
// NO imports here. main.js passes THREE in.
// Walls are ONE solid matching color. Uses your textures if present; falls back safely.

export async function initWorld(ctx) {
  const { THREE, scene, hubLog } = ctx;
  const log = (m) => { try { hubLog?.(String(m)); } catch {} };

  // ---------- Texture helpers ----------
  const loader = new THREE.TextureLoader();
  const loadTex = (url, rx=1, ry=1) => new Promise((resolve) => {
    loader.load(url, (t) => {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      resolve(t);
    }, undefined, () => resolve(null));
  });

  // Use your real texture names (from your screenshots)
  const texCarpet = await loadTex("./assets/textures/lobby_carpet.jpg", 4, 4);
  const texRosewood = await loadTex("./assets/textures/rosewood_veneer1_4k.jpg", 2, 2); // if filename differs, it will safely fall back

  // ---------- Room (Lobby) ----------
  const WALL_COLOR = 0x1a1a1a; // single matching wall color
  const wallMat = new THREE.MeshStandardMaterial({
    color: WALL_COLOR,
    roughness: 0.92,
    metalness: 0.0
  });

  const floorMat = new THREE.MeshStandardMaterial({
    color: texCarpet ? 0xffffff : 0x111111,
    map: texCarpet || null,
    roughness: 1.0,
    metalness: 0.0
  });

  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
  floorMesh.rotation.x = -Math.PI/2;
  floorMesh.position.y = 0;
  scene.add(floorMesh);

  // Solid walls + ceiling
  const roomSize = 18;
  const wallH = 3.4;
  const wallT = 0.35;

  addWall(0, wallH/2,  roomSize/2, roomSize, wallH, wallT); // north
  addWall(0, wallH/2, -roomSize/2, roomSize, wallH, wallT); // south
  addWall( roomSize/2, wallH/2, 0, wallT, wallH, roomSize); // east
  addWall(-roomSize/2, wallH/2, 0, wallT, wallH, roomSize); // west

  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomSize),
    new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 1 })
  );
  ceil.rotation.x = Math.PI/2;
  ceil.position.y = wallH;
  scene.add(ceil);

  // ---------- Teleport pads + "teleport machine" ----------
  const teleportPads = [];
  const spawnPads = [];

  const padMat = new THREE.MeshStandardMaterial({ color: 0x0a2a18, roughness: 0.8, metalness: 0.1, emissive: new THREE.Color(0x062010) });
  const padGlowMat = new THREE.MeshStandardMaterial({ color: 0x33ff66, roughness: 0.4, metalness: 0.2, emissive: new THREE.Color(0x22ff55), emissiveIntensity: 0.35 });

  function makePad(x, z, isSpawn = false) {
    const g = new THREE.CylinderGeometry(0.55, 0.55, 0.08, 32);
    const m = isSpawn ? padGlowMat : padMat;
    const pad = new THREE.Mesh(g, m);
    pad.position.set(x, 0.04, z);
    pad.name = isSpawn ? "spawn_pad" : "teleport_pad";
    scene.add(pad);
    teleportPads.push(pad);
    if (isSpawn) spawnPads.push(new THREE.Vector3(x, 0, z));

    // ring detail
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.52, 32),
      new THREE.MeshBasicMaterial({ color: 0x33ff66, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI/2;
    ring.position.set(x, 0.09, z);
    scene.add(ring);

    return pad;
  }

  // Lobby spawn pads (domain spawn teleport sites)
  // You spawn ONLY on these.
  makePad(0, 6.8, true);     // main lobby spawn (faces table)
  makePad(-2.2, 6.8, true);  // alternate spawn
  makePad( 2.2, 6.8, true);  // alternate spawn

  // Extra teleport pads around the space
  makePad(0, 2.6, false);
  makePad(-4.6, 1.6, false);
  makePad( 4.6, 1.6, false);
  makePad(0, -5.8, false);

  // Teleport machine visual near spawn
  const machine = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({
    color: texRosewood ? 0xffffff : 0x2b1d12,
    map: texRosewood || null,
    roughness: 0.75,
    metalness: 0.05
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.22, 32), woodMat);
  base.position.set(0, 0.11, 8.2);
  machine.add(base);

  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.85, 24), new THREE.MeshStandardMaterial({
    color: 0x121212, roughness: 0.4, metalness: 0.6, emissive: new THREE.Color(0x081808), emissiveIntensity: 0.25
  }));
  core.position.set(0, 0.62, 8.2);
  machine.add(core);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 16, 50),
    new THREE.MeshStandardMaterial({ color: 0x33ff66, emissive: new THREE.Color(0x22ff55), emissiveIntensity: 0.4, roughness: 0.4 })
  );
  halo.rotation.x = Math.PI/2;
  halo.position.set(0, 1.05, 8.2);
  machine.add(halo);

  scene.add(machine);

  // ---------- Poker Table (visible from lobby spawn) ----------
  const table = new THREE.Group();
  table.position.set(0, 0, 0);

  const tableWood = woodMat;
  const tableRim = new THREE.Mesh(
    new THREE.CylinderGeometry(2.25, 2.25, 0.14, 64),
    tableWood
  );
  tableRim.position.y = 0.86;
  table.add(tableRim);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(2.02, 2.02, 0.10, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b4b2e, roughness: 1.0 })
  );
  felt.position.y = 0.86;
  table.add(felt);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.65, 0.85, 24),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 })
  );
  pedestal.position.y = 0.42;
  table.add(pedestal);

  scene.add(table);

  // ---------- Bots + simple “playing” loop ----------
  const bots = [];
  const botMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9 });
  const accent = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.8 });

  const seatCount = 8;
  const radius = 2.85;

  for (let i = 0; i < seatCount; i++) {
    const a = (i / seatCount) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;

    const bot = new THREE.Group();

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 6, 12), botMat);
    body.position.y = 1.02;
    bot.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), accent);
    head.position.y = 1.52;
    bot.add(head);

    bot.position.set(x, 0, z);
    bot.lookAt(0, 1.2, 0);
    scene.add(bot);
    bots.push(bot);
  }

  // Cards + pot indicator (simple visual gameplay)
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.08, 24),
    new THREE.MeshStandardMaterial({ color: 0xffd36a, roughness: 0.35, metalness: 0.4 })
  );
  pot.position.set(0, 0.95, 0);
  scene.add(pot);

  const cardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const cardGeo = new THREE.PlaneGeometry(0.22, 0.32);

  const dealCards = [];
  for (let i=0;i<5;i++){
    const c = new THREE.Mesh(cardGeo, cardMat);
    c.rotation.x = -Math.PI/2;
    c.position.set((i-2)*0.26, 0.92, 0);
    c.visible = false;
    scene.add(c);
    dealCards.push(c);
  }

  // ---------- Leaderboard panel (in-lobby visible) ----------
  const board = makeBillboard(THREE, "LEADERBOARD\n1) Player\n2) Bot King\n3) Bot Queen\n\n(placeholder)");
  board.position.set(-6.2, 1.6, 5.2);
  board.rotation.y = Math.PI/2.2;
  scene.add(board);

  // ---------- Animation / Tick ----------
  let t = 0;
  let dealTimer = 0;
  let dealIndex = 0;
  let phase = 0; // 0=shuffle,1=deal,2=show,3=reset

  function tick(dt) {
    t += dt;

    // Subtle bot idle
    for (let i=0;i<bots.length;i++){
      bots[i].position.y = 0.0 + Math.sin(t*1.2 + i)*0.01;
      bots[i].rotation.y += Math.sin(t*0.6 + i)*0.0008;
    }

    // Pot pulse
    pot.scale.setScalar(1 + Math.sin(t*2.2)*0.04);

    // Simple hand loop
    dealTimer += dt;
    if (phase === 0 && dealTimer > 1.0) {
      // start dealing
      dealTimer = 0;
      dealIndex = 0;
      phase = 1;
      for (const c of dealCards) c.visible = false;
    }
    else if (phase === 1 && dealTimer > 0.35) {
      dealTimer = 0;
      if (dealIndex < dealCards.length) {
        dealCards[dealIndex].visible = true;
        dealIndex++;
      } else {
        phase = 2;
        dealTimer = 0;
      }
    }
    else if (phase === 2 && dealTimer > 2.0) {
      phase = 3;
      dealTimer = 0;
    }
    else if (phase === 3 && dealTimer > 0.6) {
      for (const c of dealCards) c.visible = false;
      phase = 0;
      dealTimer = 0;
    }
  }

  log("✅ World 9.0 built: lobby + pads + table + bots + leaderboard");

  return {
    floorMesh,
    teleportPads,
    spawnPads,
    tick,
  };

  function addWall(x,y,z,sx,sy,sz){
    const w = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), wallMat);
    w.position.set(x,y,z);
    scene.add(w);
  }
}

function makeBillboard(THREE, text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  // panel
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(0,0,512,512);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 6;
  ctx.strokeRect(16,16,480,480);

  // text
  ctx.fillStyle = "white";
  ctx.font = "bold 34px system-ui, Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const lines = String(text).split("\n");
  let y = 32;
  for (const line of lines) {
    ctx.fillText(line, 40, y);
    y += 44;
  }

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), mat);
  mesh.position.y = 1.6;
  return mesh;
}
