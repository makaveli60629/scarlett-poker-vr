// /js/world.js — Scarlett MASTER WORLD (FAIL-SAFE, VIP SPAWN DEFAULT)
// Builds: bright sealed lobby + 4 rooms + hallway openings + pit + stairs + table + chairs + bots + teleport pads + labels
// Safe: does not require optional modules. If you later wire PokerSim/Bots modules, this world still works.

export const World = (() => {
  let ctx = null;

  // Scene nodes
  const state = {
    root: null,
    lobby: null,
    pit: null,
    tableGroup: null,
    bots: [],
    pads: [],
    labels: [],
    t: 0,
  };

  // Colors
  const COL = {
    bg: 0x05060a,
    aqua: 0x7fe7ff,
    pink: 0xff2d7a,
    gold: 0xffd36a,
    floor: 0x1a1f2a,
    wall: 0x2b3140,
    carpet: 0x1b2533,
  };

  // Textures helper (fail-safe)
  function tryLoadTexture(path) {
    const { THREE, BASE } = ctx;
    try {
      const loader = new THREE.TextureLoader();
      const tex = loader.load(
        `${BASE}${path}`,
        () => {},
        undefined,
        () => {}
      );
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      return tex;
    } catch (e) {
      return null;
    }
  }

  // Basic text label (CanvasTexture)
  function makeLabel(text, color = "#7fe7ff") {
    const { THREE } = ctx;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 192;
    const g = canvas.getContext("2d");

    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = "rgba(0,0,0,0.55)";
    roundRect(g, 16, 16, 480, 160, 22);
    g.fill();

    g.strokeStyle = "rgba(127,231,255,0.9)";
    g.lineWidth = 6;
    roundRect(g, 16, 16, 480, 160, 22);
    g.stroke();

    g.fillStyle = color;
    g.font = "bold 64px system-ui,Segoe UI,Roboto,Arial";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 256, 96);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.82), mat);
    mesh.renderOrder = 10;
    return mesh;
  }

  function roundRect(ctx2d, x, y, w, h, r) {
    ctx2d.beginPath();
    ctx2d.moveTo(x + r, y);
    ctx2d.arcTo(x + w, y, x + w, y + h, r);
    ctx2d.arcTo(x + w, y + h, x, y + h, r);
    ctx2d.arcTo(x, y + h, x, y, r);
    ctx2d.arcTo(x, y, x + w, y, r);
    ctx2d.closePath();
  }

  // Teleport pad
  function makePad(name, pos, target, yaw = 0) {
    const { THREE } = ctx;

    const tex = tryLoadTexture("assets/textures/teleporter/teleporter_portal_trans.png")
      || tryLoadTexture("assets/textures/teleporter/teleporter_portal_scene.png");

    const mat = new THREE.MeshStandardMaterial({
      color: COL.aqua,
      emissive: COL.aqua,
      emissiveIntensity: 1.1,
      roughness: 0.25,
      metalness: 0.2,
      map: tex || null,
      transparent: !!tex,
      opacity: tex ? 0.95 : 1,
    });

    const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.55, 48), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(pos);
    mesh.position.y += 0.01;
    mesh.name = `Pad_${name}`;

    // glow ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.7, 48),
      new THREE.MeshBasicMaterial({ color: COL.pink, transparent: true, opacity: 0.7 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(mesh.position);
    ring.position.y += 0.005;

    state.root.add(mesh);
    state.root.add(ring);

    const pad = { name, mesh, ring, target, yaw };
    state.pads.push(pad);
    ctx.registerTeleportPad?.(pad);
    return pad;
  }

  // Build world
  async function init(_ctx) {
    ctx = _ctx;
    const { THREE, scene, log } = ctx;

    state.root = new THREE.Group();
    state.root.name = "ScarlettWorldRoot";
    scene.add(state.root);

    // --------- SUPER BRIGHT LIGHT PACK ----------
    const amb = new THREE.AmbientLight(0xffffff, 1.25);
    state.root.add(amb);

    const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x0b0d14, 1.2);
    state.root.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(8, 14, 6);
    key.castShadow = false;
    state.root.add(key);

    const fill = new THREE.PointLight(COL.aqua, 2.5, 60);
    fill.position.set(0, 6.5, 0);
    state.root.add(fill);

    // 2 circular “ring” lights above pit
    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(4.0 + i * 1.1, 0.06, 16, 96),
        new THREE.MeshStandardMaterial({
          color: COL.aqua,
          emissive: COL.aqua,
          emissiveIntensity: 2.2,
          roughness: 0.2,
          metalness: 0.2,
        })
      );
      ring.position.set(0, 7.0 + i * 1.0, 0);
      ring.rotation.x = Math.PI / 2;
      state.root.add(ring);
    }

    // ---------- LOBBY FLOOR (sealed) + CARPET ----------
    const carpetTex = tryLoadTexture("assets/textures/lobby_carpet.jpg");
    if (carpetTex) {
      carpetTex.repeat.set(6, 6);
    }

    const floorMat = new THREE.MeshStandardMaterial({
      color: COL.carpet,
      map: carpetTex || null,
      roughness: 0.85,
      metalness: 0.0,
    });

    const floor = new THREE.Mesh(new THREE.CircleGeometry(10.5, 96), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = false;
    floor.name = "LobbyFloor";
    state.root.add(floor);

    // ---------- PIT (sunken table area) ----------
    buildPit();

    // ---------- LOBBY WALL (sealed cylinder, 4 door cutouts) ----------
    buildLobbyWalls();

    // ---------- 4 ROOMS (VIP, STORE, EVENT, POKER) ----------
    const rooms = buildRooms();

    // ---------- TELEPORT PADS IN FRONT OF ENTRANCES ----------
    // entrances positions are just inside lobby at each doorway
    makePad("VIP",   new THREE.Vector3(0, 0, -7.8), rooms.vipSpawn.clone(), rooms.vipYaw);
    makePad("STORE", new THREE.Vector3(7.8, 0, 0),  rooms.storeSpawn.clone(), rooms.storeYaw);
    makePad("EVENT", new THREE.Vector3(0, 0, 7.8),  rooms.eventSpawn.clone(), rooms.eventYaw);
    makePad("POKER", new THREE.Vector3(-7.8, 0, 0), rooms.pokerSpawn.clone(), rooms.pokerYaw);

    // ---------- LABELS ABOVE DOORS ----------
    placeDoorLabel("VIP",   new THREE.Vector3(0, 2.6, -9.6), 0);
    placeDoorLabel("STORE", new THREE.Vector3(9.6, 2.6, 0), -Math.PI / 2);
    placeDoorLabel("EVENT", new THREE.Vector3(0, 2.6, 9.6), Math.PI);
    placeDoorLabel("POKER", new THREE.Vector3(-9.6, 2.6, 0), Math.PI / 2);

    // ---------- SPAWN: VIP ROOM (facing table) ----------
    // This is the big one you asked for.
    ctx.setSpawn?.(rooms.vipSpawn.clone(), rooms.vipYaw);

    log("build complete ✅ (VIP spawn, pads, pit, table, bots)");
  }

  function buildPit() {
    const { THREE } = ctx;

    // Pit parameters
    const pitRadius = 4.2;
    const pitDepth = 1.1;

    // Create a “hole” by placing a lowered inner floor + a slightly raised rim
    const pitFloorMat = new THREE.MeshStandardMaterial({
      color: 0x0d121c,
      roughness: 0.6,
      metalness: 0.15,
    });

    const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(pitRadius, 96), pitFloorMat);
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.y = -pitDepth;
    pitFloor.name = "PitFloor";
    state.root.add(pitFloor);

    // rim ring
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(pitRadius, pitRadius + 0.55, 96),
      new THREE.MeshStandardMaterial({
        color: 0x2a3346,
        roughness: 0.35,
        metalness: 0.2,
      })
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = -0.02;
    rim.name = "PitRim";
    state.root.add(rim);

    // guard rail (the only rail we keep): gray double rail
    const rail1 = new THREE.Mesh(
      new THREE.TorusGeometry(pitRadius + 0.3, 0.06, 16, 120),
      new THREE.MeshStandardMaterial({ color: 0xaab2c2, roughness: 0.35, metalness: 0.6 })
    );
    rail1.position.set(0, 0.55, 0);
    rail1.rotation.x = Math.PI / 2;
    state.root.add(rail1);

    const rail2 = new THREE.Mesh(
      new THREE.TorusGeometry(pitRadius + 0.42, 0.045, 16, 120),
      new THREE.MeshStandardMaterial({ color: 0x6f7a90, roughness: 0.35, metalness: 0.6 })
    );
    rail2.position.set(0, 0.68, 0);
    rail2.rotation.x = Math.PI / 2;
    state.root.add(rail2);

    // stairs opening at "guard" location: south-east-ish
    buildStairs(pitRadius, pitDepth);

    // table + chairs + bots placed in pit
    buildTableAndSeats(pitDepth);
  }

  function buildStairs(pitRadius, pitDepth) {
    const { THREE } = ctx;

    // Stairs start at lobby floor (y=0) and go down to pit floor (-pitDepth)
    const steps = 7;
    const stepW = 1.8;
    const stepD = 0.55;
    const stepH = pitDepth / steps;

    // Place stairs at +Z side (towards EVENT door) but slightly offset so it doesn't collide with bots
    const baseZ = pitRadius + 0.1;
    const baseX = 1.7; // offset away from seat area

    const mat = new THREE.MeshStandardMaterial({
      color: 0x212a3a,
      roughness: 0.65,
      metalness: 0.15,
    });

    for (let i = 0; i < steps; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), mat);
      step.position.set(baseX, -stepH * (i + 0.5), baseZ - stepD * (i + 1));
      state.root.add(step);
    }

    // small “guard post” platform at top
    const plat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.5), mat);
    plat.position.set(baseX, 0.06, baseZ + 0.6);
    state.root.add(plat);

    // Guard bot placeholder
    const guard = makeBotMesh(0.95, COL.gold);
    guard.position.set(baseX, 0.55, baseZ + 0.6);
    guard.rotation.y = Math.PI; // face inward
    guard.name = "GuardBot";
    state.root.add(guard);
  }

  function buildTableAndSeats(pitDepth) {
    const { THREE } = ctx;

    state.tableGroup = new THREE.Group();
    state.tableGroup.name = "PokerTableGroup";
    state.tableGroup.position.set(0, -pitDepth + 0.02, 0); // sits on pit floor
    state.root.add(state.tableGroup);

    // Table felt texture
    const felt = tryLoadTexture("assets/textures/table_felt_green.jpg");
    if (felt) felt.repeat.set(2, 2);

    // Leather trim texture (optional)
    const leather = tryLoadTexture("assets/textures/Table leather trim.jpg");

    // Table top
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(1.9, 1.9, 0.15, 48),
      new THREE.MeshStandardMaterial({
        color: 0x12301f,
        map: felt || null,
        roughness: 0.85,
        metalness: 0.0,
      })
    );
    top.position.y = 0.78;
    state.tableGroup.add(top);

    // trim ring
    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(1.92, 0.08, 16, 80),
      new THREE.MeshStandardMaterial({
        color: 0x3b2b20,
        map: leather || null,
        roughness: 0.65,
        metalness: 0.1,
      })
    );
    trim.position.y = 0.80;
    trim.rotation.x = Math.PI / 2;
    state.tableGroup.add(trim);

    // table base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.9, 0.75, 32),
      new THREE.MeshStandardMaterial({ color: 0x2a3346, roughness: 0.5, metalness: 0.25 })
    );
    base.position.y = 0.38;
    state.tableGroup.add(base);

    // community cards placeholder (big + higher)
    const cards = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.9),
      new THREE.MeshBasicMaterial({ color: 0x0b0d14, transparent: true, opacity: 0.75 })
    );
    cards.position.set(0, 1.8, 0);
    cards.rotation.x = -Math.PI / 2;
    state.tableGroup.add(cards);

    // seats (6)
    const seatR = 2.75;
    const seatCount = 6;

    for (let i = 0; i < seatCount; i++) {
      const a = (i / seatCount) * Math.PI * 2;
      const sx = Math.cos(a) * seatR;
      const sz = Math.sin(a) * seatR;

      // chair
      const chair = makeChair();
      chair.position.set(sx, 0, sz);
      chair.rotation.y = -a + Math.PI; // FACE table (fix backwards)
      state.tableGroup.add(chair);

      // bot seated
      const bot = makeBotMesh(1.0, COL.aqua);
      bot.position.set(sx, 0.95, sz);
      bot.rotation.y = -a + Math.PI;
      bot.name = `Bot_${i}`;
      state.tableGroup.add(bot);

      state.bots.push(bot);

      // name tag (billboarded later in update)
      const tag = makeLabel(`BOT ${i + 1}`, "#ff2d7a");
      tag.position.set(sx, 2.1, sz);
      tag.rotation.y = -a + Math.PI;
      tag.name = `Tag_${i}`;
      state.tableGroup.add(tag);
      state.labels.push(tag);
    }
  }

  function makeChair() {
    const { THREE } = ctx;

    const g = new THREE.Group();
    g.name = "Chair";

    const mat = new THREE.MeshStandardMaterial({
      color: 0x1e2532,
      roughness: 0.75,
      metalness: 0.1,
    });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), mat);
    seat.position.y = 0.45;
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.08), mat);
    back.position.set(0, 0.75, -0.235);
    g.add(back);

    // legs
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 10);
    for (const lx of [-0.22, 0.22]) {
      for (const lz of [-0.22, 0.22]) {
        const leg = new THREE.Mesh(legGeo, mat);
        leg.position.set(lx, 0.22, lz);
        g.add(leg);
      }
    }

    return g;
  }

  function makeBotMesh(scale = 1, emissiveColor = 0x7fe7ff) {
    const { THREE } = ctx;

    const root = new THREE.Group();
    root.name = "Bot";

    const mat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.65,
      metalness: 0.15,
      emissive: emissiveColor,
      emissiveIntensity: 0.25,
    });

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 20), mat);
    head.position.y = 0.28;
    root.add(head);

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.38, 6, 18), mat);
    body.position.y = 0.05;
    root.add(body);

    root.scale.setScalar(scale);
    return root;
  }

  function buildLobbyWalls() {
    const { THREE } = ctx;

    // Cylinder wall
    const radius = 10.2;
    const height = 4.5;

    const wallTex = tryLoadTexture("assets/textures/casino_wall_diffuse.jpg");
    if (wallTex) wallTex.repeat.set(6, 2);

    const wallMat = new THREE.MeshStandardMaterial({
      color: COL.wall,
      map: wallTex || null,
      roughness: 0.95,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    // Use a cylinder + add 4 “door frames” (we keep walls sealed and build openings with frames)
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 96, 1, true), wallMat);
    cyl.position.y = height / 2;
    state.root.add(cyl);

    // Door frames (visual openings)
    const doorW = 3.2;
    const doorH = 2.8;
    const frameD = 0.25;

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x0f1622,
      roughness: 0.5,
      metalness: 0.2,
      emissive: COL.aqua,
      emissiveIntensity: 0.08,
    });

    const doorPositions = [
      { name: "VIP",   pos: new THREE.Vector3(0, 1.4, -radius), rot: 0 },
      { name: "STORE", pos: new THREE.Vector3(radius, 1.4, 0),  rot: -Math.PI / 2 },
      { name: "EVENT", pos: new THREE.Vector3(0, 1.4, radius),  rot: Math.PI },
      { name: "POKER", pos: new THREE.Vector3(-radius, 1.4, 0), rot: Math.PI / 2 },
    ];

    for (const d of doorPositions) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, frameD), frameMat);
      frame.position.copy(d.pos);
      frame.rotation.y = d.rot;
      frame.name = `DoorFrame_${d.name}`;
      state.root.add(frame);
    }
  }

  function buildRooms() {
    const { THREE } = ctx;

    const roomSize = 6.5;
    const wallH = 3.5;
    const offset = 15.2;

    const roomMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.9,
      metalness: 0.05,
    });

    function roomAt(name, center, yaw) {
      const grp = new THREE.Group();
      grp.name = `Room_${name}`;
      grp.position.copy(center);
      state.root.add(grp);

      // floor
      const floorTex = tryLoadTexture("assets/textures/scarlett_floor_tile_sea.png");
      if (floorTex) floorTex.repeat.set(3, 3);

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(roomSize, roomSize),
        new THREE.MeshStandardMaterial({
          color: 0x0b0d14,
          map: floorTex || null,
          roughness: 0.9,
          metalness: 0.05,
        })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = 0;
      grp.add(floor);

      // walls (simple box perimeter)
      const thick = 0.25;
      const w1 = new THREE.Mesh(new THREE.BoxGeometry(roomSize, wallH, thick), roomMat);
      w1.position.set(0, wallH / 2, -roomSize / 2);
      grp.add(w1);

      const w2 = new THREE.Mesh(new THREE.BoxGeometry(roomSize, wallH, thick), roomMat);
      w2.position.set(0, wallH / 2, roomSize / 2);
      grp.add(w2);

      const w3 = new THREE.Mesh(new THREE.BoxGeometry(thick, wallH, roomSize), roomMat);
      w3.position.set(-roomSize / 2, wallH / 2, 0);
      grp.add(w3);

      const w4 = new THREE.Mesh(new THREE.BoxGeometry(thick, wallH, roomSize), roomMat);
      w4.position.set(roomSize / 2, wallH / 2, 0);
      grp.add(w4);

      // bright light in room
      const pl = new THREE.PointLight(COL.aqua, 2.3, 30);
      pl.position.set(0, 2.4, 0);
      grp.add(pl);

      // label inside room
      const label = makeLabel(name, "#7fe7ff");
      label.position.set(0, 2.2, -roomSize / 2 + 0.2);
      label.rotation.y = Math.PI;
      grp.add(label);

      // spawn point inside room
      const spawn = new THREE.Vector3(center.x, 0, center.z);
      // shift slightly away from walls
      spawn.add(new THREE.Vector3(0, 0, 1.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw));

      return { grp, spawn, yaw };
    }

    // Place rooms around lobby
    const vip   = roomAt("VIP",   new THREE.Vector3(0, 0, -offset), 0);
    const store = roomAt("STORE", new THREE.Vector3(offset, 0, 0), -Math.PI / 2);
    const event = roomAt("EVENT", new THREE.Vector3(0, 0, offset), Math.PI);
    const poker = roomAt("POKER", new THREE.Vector3(-offset, 0, 0), Math.PI / 2);

    // VIP “welcome HUD” style banner above “hallway” area (inside VIP)
    const banner = makeLabel("WELCOME • CASH: 100,000 • RANK: VIP", "#ff2d7a");
    banner.position.copy(vip.spawn).add(new THREE.Vector3(0, 2.6, -1.2));
    vip.grp.add(banner);

    return {
      vipSpawn: vip.spawn,
      vipYaw: Math.PI, // face “towards lobby/table direction”
      storeSpawn: store.spawn,
      storeYaw: Math.PI / 2,
      eventSpawn: event.spawn,
      eventYaw: 0,
      pokerSpawn: poker.spawn,
      pokerYaw: -Math.PI / 2,
    };
  }

  function placeDoorLabel(name, pos, yaw) {
    const label = makeLabel(name, "#7fe7ff");
    label.position.copy(pos);
    label.rotation.y = yaw;
    state.root.add(label);
    state.labels.push(label);
  }

  // Update: billboard labels to face camera (player)
  function update(dt) {
    if (!ctx) return;
    const { camera } = ctx;

    state.t += dt;

    // subtle pad animation
    for (const p of state.pads) {
      if (!p?.ring) continue;
      p.ring.material.opacity = 0.55 + Math.sin(state.t * 2.2) * 0.2;
      p.ring.rotation.z += dt * 0.4;
    }

    // billboard labels
    for (const l of state.labels) {
      if (!l) continue;
      l.lookAt(camera.position);
    }
  }

  return { init, update };
})();
