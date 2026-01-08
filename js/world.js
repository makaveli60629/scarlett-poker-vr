// /js/world.js — Scarlett Poker VR WORLD v10.6 (Grid Floor + Alignment Fix)
// Fixes:
// - grid debug floor (no carpet)
// - dealer button positions computed in TABLE-LOCAL space
// - chips/pot visible and on the table
// - panels moved nearer to spawn so you can always see them

export async function initWorld({ THREE, scene, log = console.log, v = "1000" }) {
  const L = (...a) => { try { log(...a); } catch { console.log(...a); } };
  L("[world] init v=" + v);

  const world = {
    v,
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    spawnPads: [new THREE.Vector3(0, 0, 3.6)],
    lobbyZone: { min: new THREE.Vector3(-6, 0, 6), max: new THREE.Vector3(6, 0, 12) },
    roomClamp: { minX: -7.6, maxX: 7.6, minZ: -13.6, maxZ: 7.6 },

    floor: null,
    table: null,
    chairs: [],
    seats: [],

    bots: null,

    panels: { root: null, visible: true },
    togglePanels() {
      if (!world.panels.root) return;
      world.panels.visible = !world.panels.visible;
      world.panels.root.visible = world.panels.visible;
    },

    _playerRig: null,
    _camera: null,

    connect({ playerRig, camera }) {
      world._playerRig = playerRig || null;
      world._camera = camera || null;
      try { world.bots?.setPlayerRig?.(playerRig); } catch {}
    },

    tick: (dt) => {}
  };

  world.group.name = "World";
  scene.add(world.group);

  // ---------- GRID TEXTURE ----------
  function makeGridTexture({ size = 1024, cells = 16 } = {}) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#0c0f18";
    ctx.fillRect(0, 0, size, size);

    // fine grid
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= cells; i++) {
      const p = (i / cells) * size;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
    }

    // bold every 4
    ctx.strokeStyle = "rgba(127,231,255,0.18)";
    ctx.lineWidth = 4;
    for (let i = 0; i <= cells; i += 4) {
      const p = (i / cells) * size;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    tex.needsUpdate = true;
    return tex;
  }

  // ---------- MATERIALS ----------
  const mat = {
    floor: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1.0,
      metalness: 0.0,
      map: makeGridTexture({ cells: 16 })
    }),
    wall: new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 0.95 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x070812, roughness: 0.9, side: THREE.BackSide }),
    felt: new THREE.MeshStandardMaterial({ color: 0x0f5d3a, roughness: 0.92 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.85 }),
    metalDark: new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.85, metalness: 0.15 }),
    chairFrame: new THREE.MeshStandardMaterial({ color: 0x151821, roughness: 0.95 }),
    chairSeat: new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.85 }),
    holo: new THREE.MeshStandardMaterial({
      color: 0x7fe7ff,
      emissive: 0x2bd7ff,
      emissiveIntensity: 1.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85
    }),
    chip: new THREE.MeshStandardMaterial({
      color: 0xff2d7a,
      roughness: 0.35,
      metalness: 0.1,
      emissive: 0x220010,
      emissiveIntensity: 0.35
    }),
    chipStripe: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      emissive: 0x111111,
      emissiveIntensity: 0.25
    })
  };

  // ---------- LIGHTING ----------
  world.group.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.75));
  const key = new THREE.DirectionalLight(0xffffff, 1.65);
  key.position.set(7, 12, 6);
  world.group.add(key);
  world.group.add(new THREE.AmbientLight(0xffffff, 0.25));

  // ---------- FLOOR ----------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.name = "Floor";
  world.group.add(floor);
  world.floor = floor;

  // ---------- WALLS ----------
  const wallH = 6.2;
  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat.wall);
    m.position.set(x, y, z);
    world.group.add(m);
    return m;
  };
  mkWall(16, wallH, 0.3, 0, wallH / 2, -14);
  mkWall(16, wallH, 0.3, 0, wallH / 2, 8);
  mkWall(0.3, wallH, 22, -8, wallH / 2, -3);
  mkWall(0.3, wallH, 22, 8, wallH / 2, -3);

  // ---------- CEILING ----------
  const dome = new THREE.Mesh(new THREE.SphereGeometry(16, 32, 22), mat.ceiling);
  dome.position.set(0, 6.9, -3);
  dome.scale.set(1.3, 0.9, 1.3);
  world.group.add(dome);

  // ---------- SPAWN PAD ----------
  const spawnRing = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.42, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  spawnRing.rotation.x = -Math.PI / 2;
  spawnRing.position.set(world.spawnPads[0].x, 0.02, world.spawnPads[0].z);
  world.group.add(spawnRing);

  // ---------- TABLE (WITH BASE) ----------
  const TABLE_Y = 0.92;
  const table = new THREE.Group();
  table.position.copy(world.tableFocus);
  table.name = "PokerTable";
  world.group.add(table);
  world.table = table;

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.15, 0.70, 32), mat.metalDark);
  pedestal.position.y = 0.35;
  table.add(pedestal);

  const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.18, 64), mat.felt);
  felt.position.y = TABLE_Y;
  table.add(felt);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.18, 18, 80), mat.wood);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = TABLE_Y + 0.09;
  table.add(rim);

  // ---------- CHAIRS + SEATS ----------
  function makeChair() {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.08, 18), mat.chairSeat);
    seat.position.y = 0.50;
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.62, 0.09), mat.chairFrame);
    back.position.set(0, 0.90, -0.24);
    g.add(back);

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.10, 0.48, 12), mat.chairFrame);
    leg.position.y = 0.24;
    g.add(leg);

    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 16), mat.chairFrame);
    foot.position.y = 0.03;
    g.add(foot);

    return g;
  }

  const c = world.tableFocus.clone();
  const seatR = 3.05;
  const SEAT_SURFACE_Y = 0.52;

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const chairPos = new THREE.Vector3(c.x + Math.cos(a) * seatR, 0, c.z + Math.sin(a) * seatR);
    const yaw = Math.atan2(c.x - chairPos.x, c.z - chairPos.z);

    const chair = makeChair();
    chair.position.copy(chairPos);
    chair.rotation.y = yaw;
    world.group.add(chair);
    world.chairs.push(chair);

    const seatAnchor = new THREE.Object3D();
    seatAnchor.position.set(0, SEAT_SURFACE_Y, 0.18);
    chair.add(seatAnchor);

    const seatPos = new THREE.Vector3();
    seatAnchor.getWorldPosition(seatPos);

    world.seats.push({ index: i, position: seatPos, yaw, sitY: SEAT_SURFACE_Y, lookAt: c.clone(), anchor: seatAnchor });
  }

  // ---------- POT CHIPS (table-local, visible) ----------
  function makeChip() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.012, 24), mat.chip);
    body.position.y = 0.006;
    g.add(body);
    const stripe1 = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.006, 10, 40), mat.chipStripe);
    stripe1.rotation.x = Math.PI / 2;
    stripe1.position.y = 0.006;
    g.add(stripe1);
    const stripe2 = stripe1.clone();
    stripe2.scale.setScalar(0.82);
    g.add(stripe2);
    return g;
  }

  const pot = new THREE.Group();
  pot.name = "PotStack";
  pot.position.set(0, TABLE_Y + 0.02, 0);
  table.add(pot);

  for (let i = 0; i < 16; i++) {
    const chip = makeChip();
    chip.position.set((Math.random() - 0.5) * 0.14, i * 0.010, (Math.random() - 0.5) * 0.14);
    pot.add(chip);
  }

  // ---------- DEALER BUTTON (FIX: compute table-local spots) ----------
  const dealerBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 22), mat.holo);
  dealerBtn.rotation.x = Math.PI / 2;
  table.add(dealerBtn);

  const dealerSpotsLocal = world.seats.map((s) => {
    const inward = new THREE.Vector3(c.x - s.position.x, 0, c.z - s.position.z).normalize().multiplyScalar(0.55);
    const worldPos = new THREE.Vector3(s.position.x + inward.x, TABLE_Y + 0.03, s.position.z + inward.z);
    return table.worldToLocal(worldPos.clone()); // ✅ convert to table-local
  });

  let dealerIndex = 0;
  let dealerMoveT = 0;
  let dealerHold = 0;

  // ---------- PANELS (move them near spawn so you always see them) ----------
  function makePanel(lines) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    function draw(txt) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0,0,0,0.70)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#7fe7ff";
      ctx.font = "bold 54px Arial";
      ctx.fillText("SCARLETT VR POKER", 40, 70);

      ctx.fillStyle = "#ffffff";
      ctx.font = "36px Arial";
      let y = 140;
      for (const line of txt) {
        ctx.fillText(line, 40, y);
        y += 54;
      }
    }

    draw(lines);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    mesh.userData._draw = draw;
    mesh.userData._tex = tex;
    return mesh;
  }

  world.panels.root = new THREE.Group();
  world.group.add(world.panels.root);

  const p1 = makePanel(["Grid Floor Debug ON", "Bots aligned to Y=0", "Press M to toggle panels"]);
  p1.position.set(-2.3, 2.1, 4.8);
  p1.rotation.y = 0.10;
  world.panels.root.add(p1);

  const p2 = makePanel(["Table: 6-Max", "Pot: 1,250", "Dealer: seat-to-seat"]);
  p2.position.set(2.3, 2.1, 4.8);
  p2.rotation.y = -0.10;
  world.panels.root.add(p2);

  // ---------- OPTIONAL: BOTS ----------
  try {
    const botsMod = await import(`./bots.js?v=${encodeURIComponent(v)}`);
    if (botsMod?.Bots?.init) {
      botsMod.Bots.init({
        THREE,
        scene: world.group,
        getSeats: () => world.seats,
        getLobbyZone: () => world.lobbyZone,
        tableFocus: world.tableFocus,
        metrics: { tableY: TABLE_Y, seatY: SEAT_SURFACE_Y }
      });

      world.bots = botsMod.Bots;

      const prev = world.tick;
      world.tick = (dt) => { prev(dt); try { botsMod.Bots.update(dt); } catch {} };

      L("[world] ✅ bots.js loaded");
    }
  } catch (e) {
    L("[world] ⚠️ bots import failed:", e?.message || e);
  }

  // ---------- WORLD TICK ----------
  const baseTick = world.tick;
  const tickState = { t: 0 };

  world.tick = (dt) => {
    baseTick(dt);
    tickState.t += dt;

    // spawn pulse
    spawnRing.material.opacity = 0.62 + Math.sin(tickState.t * 3.0) * 0.18;

    // dealer: hold then move
    dealerHold += dt;
    const HOLD = 1.6;
    const MOVE = 0.45;

    if (dealerHold >= HOLD) {
      dealerMoveT += dt / MOVE;

      const from = dealerSpotsLocal[dealerIndex];
      const to = dealerSpotsLocal[(dealerIndex + 1) % dealerSpotsLocal.length];

      const t = Math.min(1, dealerMoveT);
      const e = 1 - Math.pow(1 - t, 3);

      dealerBtn.position.set(
        from.x + (to.x - from.x) * e,
        from.y + (to.y - from.y) * e,
        from.z + (to.z - from.z) * e
      );

      if (t >= 1) {
        dealerIndex = (dealerIndex + 1) % dealerSpotsLocal.length;
        dealerHold = 0;
        dealerMoveT = 0;
      }
    } else {
      dealerBtn.position.copy(dealerSpotsLocal[dealerIndex]);
    }

    // pot pulse
    pot.scale.setScalar(1.0 + Math.sin(tickState.t * 2.4) * 0.03);

    // panel refresh (simple)
    p2.userData._draw([
      "Table: 6-Max",
      "Pot: " + (1250 + Math.floor((Math.sin(tickState.t) * 0.5 + 0.5) * 600)).toLocaleString(),
      "Dealer: seat-to-seat"
    ]);
    p2.userData._tex.needsUpdate = true;
  };

  L("[world] ready ✅ seats=" + world.seats.length);
  return world;
    }
