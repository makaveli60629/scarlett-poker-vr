// /js/world.js — SCARLETT VR POKER — WORLD MASTER v14.2 (FULL)
// ✅ Flat poker table (FIXED)
// ✅ Full-body seated bots (legs/arms/hands)
// ✅ Scorpion room: neon gold/yellow corners + wall end strips + guardrails + leaderboard + tags + logo wall + logo felt + neon pass line
// ✅ Lobby: live demo table + arch teleporter + pads
// ✅ Store: doorway displays on both sides
// ✅ VR teleport + VR stick locomotion + Android click + Android teleportFromCamera()

export const World = (() => {
  let THREE, scene, renderer, camera, player, log;
  let controllers = [];

  const S = {
    ready: false,
    root: null,

    raycaster: null,
    tmpMat: null,

    lasers: [],
    move: { speed: 2.1, snap: Math.PI / 6, snapCooldown: 0 },

    tp: { aiming: false, marker: null, arc: null, hit: null, lastValid: false, cooldown: 0 },

    rooms: { current: "lobby", groups: {}, pads: [] },
    clickables: [],
    hovered: null,

    lobby: {
      t: 0,
      walkers: [],
      teleporter: null,
      demo: makePokerState(-2.4)
    },

    poker: makePokerState(-2.8)
  };

  function makePokerState(tableZ) {
    return {
      t: 0,
      tableZ,
      tableGroup: null,
      felt: null,
      shoe: null,
      pot: null,
      bots: [],
      seats: [],
      handState: "idle",
      stepT: 0,
      community: [],
      hole: []
    };
  }

  async function init(ctx) {
    ({ THREE, scene, renderer, camera, player, log } = ctx);

    const raw = ctx.controllers;
    controllers = Array.isArray(raw) ? raw : (raw ? [raw.left, raw.right].filter(Boolean) : []);
    if (!controllers) controllers = [];

    S.root = new THREE.Group();
    scene.add(S.root);

    S.raycaster = new THREE.Raycaster();
    S.tmpMat = new THREE.Matrix4();

    addLights();
    buildShell();
    buildRooms();

    buildLasers();
    buildTeleport();
    wireControllerEvents();

    setRoom("lobby");
    forceSpawnForRoom("lobby");

    startDemoHandLoop();

    S.ready = true;
    log?.("ready ✅ (v14.2 FULL)");
  }

  function update(dt) {
    if (!S.ready) return;

    S.move.snapCooldown = Math.max(0, S.move.snapCooldown - dt);
    S.tp.cooldown = Math.max(0, S.tp.cooldown - dt);

    locomotion(dt);
    updateRays();
    if (S.tp.aiming) updateTeleportAim();

    // ambient
    S.lobby.t += dt;

    // lobby demo always runs
    S.lobby.demo.t += dt;
    animatePokerBots(S.lobby.demo);
    updatePokerDealing(dt, S.lobby.demo);
    animateTeleporter(dt);

    if (S.rooms.current === "lobby") updateLobbyWalkers(dt);

    // scorpion poker
    S.poker.t += dt;
    if (S.rooms.current === "scorpion") {
      animatePokerBots(S.poker);
      updatePokerDealing(dt, S.poker);
    }
  }

  // =========================================================
  // ANDROID TELEPORT (camera ray to ground)
  // =========================================================
  function teleportFromCamera() {
    const origin = new THREE.Vector3();
    camera.getWorldPosition(origin);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();

    if (Math.abs(dir.y) < 0.0001) return;
    const t = -origin.y / dir.y;
    if (t < 0.2 || t > 60) return;

    const hit = origin.clone().addScaledVector(dir, t);
    player.position.set(hit.x, 0, hit.z);
    log?.("[tp-cam] ✅", hit.x.toFixed(2), hit.z.toFixed(2));
  }

  // =========================================================
  // LIGHTING + SHELL
  // =========================================================
  function addLights() {
    scene.add(new THREE.HemisphereLight(0xffffff, 0x273045, 1.15));

    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(7, 12, 6);
    scene.add(key);

    const fill = new THREE.PointLight(0x88ccff, 0.75, 70);
    fill.position.set(-7, 3.2, -7);
    scene.add(fill);

    const warm = new THREE.PointLight(0xff88cc, 0.6, 70);
    warm.position.set(7, 3.2, -7);
    scene.add(warm);

    const ringLight = new THREE.PointLight(0x7fe7ff, 0.35, 90);
    ringLight.position.set(0, 6.3, 0);
    scene.add(ringLight);
  }

  function buildShell() {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(22, 96),
      new THREE.MeshStandardMaterial({ color: 0x0e0f16, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    S.root.add(floor);

    const walls = new THREE.Mesh(
      new THREE.CylinderGeometry(22, 22, 7, 96, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x090b12, roughness: 0.9 })
    );
    walls.position.y = 3.5;
    S.root.add(walls);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(13, 0.28, 18, 120),
      new THREE.MeshStandardMaterial({
        color: 0x7fe7ff,
        roughness: 0.25,
        metalness: 0.1,
        emissive: 0x052128
      })
    );
    ring.position.set(0, 6.1, 0);
    ring.rotation.x = Math.PI / 2;
    S.root.add(ring);

    // spectator guardrail ring (global)
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(9.5, 0.10, 16, 140),
      new THREE.MeshStandardMaterial({ color: 0x1b1c26, roughness: 0.65, metalness: 0.15 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 0.05;
    S.root.add(rail);

    const sign = makeBillboard("SCARLETT VR POKER", 2.1);
    sign.position.set(0, 2.45, -12.5);
    S.root.add(sign);
  }

  // =========================================================
  // ROOMS
  // =========================================================
  function buildRooms() {
    S.rooms.groups.lobby = new THREE.Group();
    S.rooms.groups.store = new THREE.Group();
    S.rooms.groups.scorpion = new THREE.Group();
    S.rooms.groups.spectate = new THREE.Group();

    S.root.add(S.rooms.groups.lobby);
    S.root.add(S.rooms.groups.store);
    S.root.add(S.rooms.groups.scorpion);
    S.root.add(S.rooms.groups.spectate);

    buildLobby(S.rooms.groups.lobby);
    buildStore(S.rooms.groups.store);
    buildScorpion(S.rooms.groups.scorpion);
    buildSpectate(S.rooms.groups.spectate);

    makeRoomTeleportPads(S.rooms.groups.lobby);
  }

  function setRoom(name) {
    S.rooms.current = name;
    for (const k of Object.keys(S.rooms.groups)) S.rooms.groups[k].visible = (k === name);

    S.tp.aiming = false;
    S.tp.lastValid = false;
    if (S.tp.marker) S.tp.marker.visible = false;
    if (S.tp.arc) S.tp.arc.visible = false;

    log?.(`[hud] room=${name}`);
  }

  function forceSpawnForRoom(room) {
    if (room === "lobby") {
      player.position.set(0, 0, 7.6);
      faceYawToward(new THREE.Vector3(0, 1.6, -2.2));
    } else if (room === "store") {
      player.position.set(8.5, 0, 4.2);
      faceYawToward(new THREE.Vector3(8.5, 1.6, 0));
    } else if (room === "scorpion") {
      player.position.set(-8.5, 0, 5.2);
      faceYawToward(new THREE.Vector3(-8.5, 1.6, S.poker.tableZ));
    } else if (room === "spectate") {
      player.position.set(0, 0, -9.8);
      faceYawToward(new THREE.Vector3(0, 1.6, -2));
    }
  }

  function faceYawToward(target) {
    const pos = new THREE.Vector3(player.position.x, 1.6, player.position.z);
    const dir = target.clone().sub(pos);
    dir.y = 0;
    dir.normalize();
    player.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
  }

  // =========================================================
  // LOBBY
  // =========================================================
  function buildLobby(g) {
    const title = makeBillboard("LOBBY — LIVE TABLE", 1.2);
    title.position.set(0, 2.35, 2.4);
    g.add(title);

    const prompt = makeBillboard("Watch the bots play. Pads to travel.", 0.85);
    prompt.position.set(0, 1.55, 1.0);
    g.add(prompt);

    // Arch teleporter center
    const tp = buildArchTeleporter();
    tp.position.set(0, 0, 0);
    tp.userData.onClick = () => { setRoom("scorpion"); forceSpawnForRoom("scorpion"); };
    g.add(tp);
    S.clickables.push(tp);
    S.lobby.teleporter = tp;

    // Demo table
    buildPokerTableSet(g, S.lobby.demo, {
      tableZ: S.lobby.demo.tableZ,
      title: "BOSS TABLE",
      accent: 0x7fe7ff,
      logoText: "BOSS"
    });

    // Walkers
    spawnLobbyWalkers(g, 6);
  }

  function buildArchTeleporter() {
    const g = new THREE.Group();

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.35, 0.12, 72),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.85, metalness: 0.15 })
    );
    base.position.y = 0.06;
    g.add(base);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x10131e, roughness: 0.6, metalness: 0.25 });
    const pillarGeom = new THREE.BoxGeometry(0.18, 2.25, 0.18);
    const p1 = new THREE.Mesh(pillarGeom, frameMat);
    const p2 = new THREE.Mesh(pillarGeom, frameMat);
    p1.position.set(-0.78, 1.125, 0);
    p2.position.set(0.78, 1.125, 0);
    g.add(p1, p2);

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.80, 0.18, 0.18), frameMat);
    top.position.set(0, 2.25, 0);
    g.add(top);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.06, 14, 120),
      new THREE.MeshStandardMaterial({
        color: 0x7fe7ff,
        roughness: 0.25,
        metalness: 0.15,
        emissive: 0x052128,
        emissiveIntensity: 1.0
      })
    );
    ring.position.set(0, 1.35, 0);
    ring.rotation.y = Math.PI / 2;
    g.add(ring);
    g.userData._ring = ring;

    const coil = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.55, 0.035, 140, 16),
      new THREE.MeshBasicMaterial({ color: 0xff2d7a, transparent: true, opacity: 0.22 })
    );
    coil.position.set(0, 1.35, 0);
    coil.rotation.x = Math.PI / 2;
    g.add(coil);
    g.userData._coil = coil;

    const label = makeBillboard("ARCH TELEPORT → SCORPION", 0.7);
    label.position.set(0, 2.95, 0);
    g.add(label);

    g.userData.onClick = () => {};
    return g;
  }

  function animateTeleporter(dt) {
    const tp = S.lobby.teleporter;
    if (!tp) return;
    const ring = tp.userData._ring;
    const coil = tp.userData._coil;
    if (ring) ring.rotation.z += dt * 0.55;
    if (coil) {
      coil.rotation.z -= dt * 0.75;
      coil.rotation.y += dt * 0.35;
    }
  }

  function spawnLobbyWalkers(g, count) {
    S.lobby.walkers.length = 0;
    for (let i = 0; i < count; i++) {
      const bot = makeWalkerBot(i);
      bot.position.set((Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10);
      bot.userData.walk = {
        r: 7 + Math.random() * 3,
        a: Math.random() * Math.PI * 2,
        s: 0.18 + Math.random() * 0.22,
        wobble: Math.random() * 10
      };
      g.add(bot);
      S.lobby.walkers.push(bot);
    }
  }

  function updateLobbyWalkers(dt) {
    for (const b of S.lobby.walkers) {
      const w = b.userData.walk;
      w.a += dt * w.s;
      const x = Math.cos(w.a) * w.r;
      const z = Math.sin(w.a) * w.r;
      b.position.x = x;
      b.position.z = z;
      b.rotation.y = Math.atan2(-Math.sin(w.a), -Math.cos(w.a));
      b.position.y = 0.02 * Math.sin((S.lobby.t * 2.1) + w.wobble);
    }
  }

  // =========================================================
  // STORE (doorway displays both sides)
  // =========================================================
  function buildStore(g) {
    g.position.set(8.5, 0, 0);

    const title = makeBillboard("STORE — COSMETICS", 1.1);
    title.position.set(0, 2.4, -6.0);
    g.add(title);

    const plat = new THREE.Mesh(
      new THREE.CylinderGeometry(6.8, 6.8, 0.08, 72),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95 })
    );
    plat.position.set(0, 0.04, -6.0);
    g.add(plat);

    // "Door" frame area
    const doorX = 0, doorZ = -3.2;

    // ✅ Display boards on both sides of the door
    const leftDisplay = makeBillboard("FEATURED\nCROWNS\nSKINS\nEMOTES", 0.85);
    leftDisplay.position.set(doorX - 1.55, 1.55, doorZ);
    g.add(leftDisplay);

    const rightDisplay = makeBillboard("LIMITED\nNEON SETS\nVIP PASS\nBUNDLES", 0.85);
    rightDisplay.position.set(doorX + 1.55, 1.55, doorZ);
    g.add(rightDisplay);

    const kiosk = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.05, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.7, metalness: 0.2 })
    );
    kiosk.position.set(0, 0.55, -5.0);
    g.add(kiosk);

    const panel = makeBillboard("STORE ONLINE\n(Inventory wiring next)", 0.8);
    panel.position.set(0, 1.6, -4.2);
    g.add(panel);

    const back = makePad("BACK → LOBBY", 0x7fe7ff);
    back.position.set(0, 0.01, -1.2);
    back.userData.onClick = () => { setRoom("lobby"); forceSpawnForRoom("lobby"); };
    g.add(back);
    S.clickables.push(back);
  }

  // =========================================================
  // SPECTATE
  // =========================================================
  function buildSpectate(g) {
    g.position.set(0, 0, -10.5);

    const title = makeBillboard("SPECTATE", 1.2);
    title.position.set(0, 2.2, 0);
    g.add(title);

    const note = makeBillboard("Spectator mode baseline\n(Polish next)", 0.8);
    note.position.set(0, 1.55, 0.75);
    g.add(note);

    const back = makePad("BACK → LOBBY", 0x7fe7ff);
    back.position.set(0, 0.01, 2.6);
    back.userData.onClick = () => { setRoom("lobby"); forceSpawnForRoom("lobby"); };
    g.add(back);
    S.clickables.push(back);
  }

  // =========================================================
  // SCORPION — beautified + full table UI
  // =========================================================
  function buildScorpion(g) {
    g.position.set(-8.5, 0, 0);

    buildScorpionRoomBox(g);

    // Wall logo sign
    const logo = makeBillboard("🦂  SCORPION LOUNGE  🦂", 1.15);
    logo.position.set(0, 3.0, S.poker.tableZ - 5.9);
    g.add(logo);

    // Leaderboard panel
    const lb = makeBillboard("LEADERBOARD\n1) Scarlett — 120K\n2) KingBot — 98K\n3) Viper — 77K", 0.95);
    lb.position.set(4.6, 2.1, S.poker.tableZ - 1.0);
    g.add(lb);

    // Tags panel
    const tags = makeBillboard("TABLE TAGS\n• No-Limit Hold’em\n• VIP Room\n• Neon Stakes\n• Spectate Allowed", 0.95);
    tags.position.set(-4.6, 2.1, S.poker.tableZ - 1.0);
    g.add(tags);

    // Guardrails around scorpion table zone
    buildScorpionGuardrails(g, S.poker.tableZ);

    // Table set with SCORPION logo on felt + pass line
    buildPokerTableSet(g, S.poker, {
      tableZ: S.poker.tableZ,
      title: "SCORPION TABLE",
      accent: 0xff2d7a,
      logoText: "SCORPION"
    });

    // Start hand button
    const start = makeButton("START HAND");
    start.position.set(0, 1.2, S.poker.tableZ + 3.1);
    start.userData.onClick = () => startHand(S.poker);
    g.add(start);
    S.clickables.push(start);

    const back = makePad("BACK → LOBBY", 0x7fe7ff);
    back.position.set(0, 0.01, S.poker.tableZ + 6.6);
    back.userData.onClick = () => { setRoom("lobby"); forceSpawnForRoom("lobby"); };
    g.add(back);
    S.clickables.push(back);
  }

  function buildScorpionRoomBox(g) {
    const w = 12.5, h = 6.6, d = 13.0;
    const z0 = S.poker.tableZ + 1.6;

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x07080e, roughness: 0.92, metalness: 0.05 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x090b12, roughness: 0.95, metalness: 0.02 });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.01, z0);
    g.add(floor);

    const wallN = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
    wallN.position.set(0, h/2, z0 - d/2);
    g.add(wallN);

    const wallS = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
    wallS.position.set(0, h/2, z0 + d/2);
    wallS.rotation.y = Math.PI;
    g.add(wallS);

    const wallE = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wallMat);
    wallE.position.set(w/2, h/2, z0);
    wallE.rotation.y = -Math.PI / 2;
    g.add(wallE);

    const wallW = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wallMat);
    wallW.position.set(-w/2, h/2, z0);
    wallW.rotation.y = Math.PI / 2;
    g.add(wallW);

    // Neon corner pillars
    const neonMat = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      emissive: 0xffcc00,
      emissiveIntensity: 0.95,
      roughness: 0.25,
      metalness: 0.05
    });

    const tubeGeom = new THREE.CylinderGeometry(0.055, 0.055, h, 20);
    const corners = [
      [ w/2 - 0.05, h/2, z0 - d/2 + 0.05],
      [-w/2 + 0.05, h/2, z0 - d/2 + 0.05],
      [ w/2 - 0.05, h/2, z0 + d/2 - 0.05],
      [-w/2 + 0.05, h/2, z0 + d/2 - 0.05],
    ];

    for (const [x,y,z] of corners) {
      const p = new THREE.Mesh(tubeGeom, neonMat);
      p.position.set(x,y,z);
      g.add(p);

      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffee55, transparent: true, opacity: 0.55 })
      );
      cap.position.set(x, h - 0.05, z);
      g.add(cap);

      const cap2 = cap.clone();
      cap2.position.y = 0.12;
      g.add(cap2);
    }

    // Wall-end neon strips
    const stripMat = new THREE.MeshBasicMaterial({ color: 0xffee55, transparent: true, opacity: 0.18 });
    const stripGeomNS = new THREE.PlaneGeometry(w, 0.18);
    const stripGeomEW = new THREE.PlaneGeometry(d, 0.18);

    const stripTopN = new THREE.Mesh(stripGeomNS, stripMat);
    stripTopN.position.set(0, h - 0.35, z0 - d/2 + 0.02);
    g.add(stripTopN);

    const stripTopS = stripTopN.clone();
    stripTopS.position.z = z0 + d/2 - 0.02;
    stripTopS.rotation.y = Math.PI;
    g.add(stripTopS);

    const stripTopE = new THREE.Mesh(stripGeomEW, stripMat);
    stripTopE.position.set(w/2 - 0.02, h - 0.35, z0);
    stripTopE.rotation.y = -Math.PI/2;
    g.add(stripTopE);

    const stripTopW = stripTopE.clone();
    stripTopW.position.x = -w/2 + 0.02;
    stripTopW.rotation.y = Math.PI/2;
    g.add(stripTopW);
  }

  function buildScorpionGuardrails(g, tableZ) {
    // simple squared guard rail around table zone
    const railMat = new THREE.MeshStandardMaterial({ color: 0x1b1c26, roughness: 0.65, metalness: 0.12 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.8, metalness: 0.2 });

    const z0 = tableZ + 1.6;
    const w = 8.8, d = 8.8;
    const y = 0.75;

    // posts
    const postGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.9, 14);
    const corners = [
      [ w/2, 0.45, z0 - d/2],
      [-w/2, 0.45, z0 - d/2],
      [ w/2, 0.45, z0 + d/2],
      [-w/2, 0.45, z0 + d/2],
    ];
    for (const [x,py,z] of corners) {
      const post = new THREE.Mesh(postGeom, postMat);
      post.position.set(x, py, z);
      g.add(post);
    }

    // rails (4)
    const railGeomH = new THREE.BoxGeometry(w, 0.08, 0.08);
    const railGeomV = new THREE.BoxGeometry(0.08, 0.08, d);

    const rN = new THREE.Mesh(railGeomH, railMat);
    rN.position.set(0, y, z0 - d/2);
    g.add(rN);

    const rS = rN.clone();
    rS.position.z = z0 + d/2;
    g.add(rS);

    const rE = new THREE.Mesh(railGeomV, railMat);
    rE.position.set(w/2, y, z0);
    g.add(rE);

    const rW = rE.clone();
    rW.position.x = -w/2;
    g.add(rW);
  }

  // =========================================================
  // POKER TABLE SET (flat felt + logo + pass line)
  // =========================================================
  function buildPokerTableSet(roomGroup, P, opts) {
    const { tableZ, title, accent, logoText } = opts;

    const table = new THREE.Group();
    table.position.set(0, 0, tableZ);
    roomGroup.add(table);
    P.tableGroup = table;

    const sign = makeBillboard(title, 0.85);
    sign.position.set(0, 2.15, tableZ - 3.9);
    roomGroup.add(sign);

    // ✅ FLAT FELT: Cylinder top is already horizontal. No rotation.
    const feltTex = makeFeltTexture({ text: logoText || "SCARLETT", accent });
    const feltMat = new THREE.MeshStandardMaterial({
      map: feltTex,
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0.0
    });

    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(2.35, 2.35, 0.10, 72),
      feltMat
    );
    felt.rotation.set(0, 0, 0);
    felt.scale.set(1.25, 1.0, 0.78);
    felt.position.y = 1.02;
    table.add(felt);
    P.felt = felt;

    // Neon pass line (thin glowing ring)
    const pass = new THREE.Mesh(
      new THREE.RingGeometry(1.52, 1.56, 120),
      new THREE.MeshBasicMaterial({ color: 0xffee55, transparent: true, opacity: 0.22 })
    );
    pass.rotation.x = -Math.PI / 2;
    pass.position.y = 1.031;
    pass.scale.set(1.35, 1.0, 0.92);
    table.add(pass);

    // Felt line
    const feltLine = new THREE.Mesh(
      new THREE.RingGeometry(1.25, 1.32, 96),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14 })
    );
    feltLine.rotation.x = -Math.PI / 2;
    feltLine.position.y = 1.03;
    feltLine.scale.set(1.42, 1.0, 0.96);
    table.add(feltLine);

    // Rail
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(2.55, 0.20, 18, 140),
      new THREE.MeshStandardMaterial({ color: 0x241c16, roughness: 0.82, metalness: 0.08 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 1.03;
    rail.scale.set(1.12, 1.0, 0.86);
    table.add(rail);

    // Pedestal
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.68, 1.05, 28),
      new THREE.MeshStandardMaterial({ color: 0x101019, roughness: 0.85, metalness: 0.2 })
    );
    ped.position.y = 0.52;
    table.add(ped);

    // Shoe
    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.40, 0.20, 0.58),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.65, metalness: 0.25 })
    );
    shoe.position.set(0, 1.06, -0.60);
    table.add(shoe);
    P.shoe = shoe;

    // Pot
    const pot = makeChipPot(18);
    pot.position.set(0, 1.045, 0.02);
    table.add(pot);
    P.pot = pot;

    // Accent glow ring
    const glow = new THREE.Mesh(
      new THREE.RingGeometry(2.25, 2.45, 96),
      new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.10 })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 1.035;
    glow.scale.set(1.25, 1.0, 0.78);
    table.add(glow);

    // Seats/bots/chairs/chips/cards
    buildPokerSeatsBotsAndChips(roomGroup, table, P);
    buildCardMeshes(table, P);
  }

  function buildPokerSeatsBotsAndChips(roomGroup, table, P) {
    P.bots.length = 0;
    P.seats.length = 0;
    P.hole.length = 0;

    const botCount = 8;
    const radius = 3.05;
    const center = new THREE.Vector3(0, 0, table.position.z);

    for (let i = 0; i < botCount; i++) {
      const ang = (i / botCount) * Math.PI * 2;

      const chair = makeChair();
      const x = Math.cos(ang) * radius;
      const z = table.position.z + Math.sin(ang) * radius;
      chair.position.set(x, 0, z);
      faceObjectYawAt(chair, center);
      roomGroup.add(chair);

      const SEAT_Y = 0.48; // chair seat height
      const seatPos = new THREE.Vector3(
        Math.cos(ang) * (radius - 0.55),
        SEAT_Y,
        table.position.z + Math.sin(ang) * (radius - 0.55)
      );
      P.seats.push({ pos: seatPos, ang });

      const bot = makeFullBodySeatedBot(i);
      bot.position.copy(seatPos);
      faceObjectYawAt(bot, center);
      roomGroup.add(bot);
      P.bots.push(bot);

      const stack = makeChipStack(14 + (i % 6), { dark: false });
      stack.position.set(Math.cos(ang) * 1.7, 1.05, table.position.z + Math.sin(ang) * 1.25);
      table.add(stack);

      P.hole.push([]);
    }
  }

  function faceObjectYawAt(obj, targetWorld) {
    const pos = new THREE.Vector3(obj.position.x, 0, obj.position.z);
    const dir = targetWorld.clone().sub(pos);
    dir.y = 0;
    if (dir.lengthSq() < 0.000001) return;
    dir.normalize();
    obj.rotation.y = Math.atan2(dir.x, dir.z);
  }

  function animatePokerBots(P) {
    for (let i = 0; i < P.bots.length; i++) {
      const b = P.bots[i];
      const t = P.t + i * 0.6;

      const head = b.getObjectByName("head");
      if (head) {
        head.rotation.y = 0.12 * Math.sin(t * 0.7);
        head.rotation.x = 0.06 * Math.sin(t * 0.9);
      }
      b.position.y = (b.userData.baseY ?? b.position.y) + 0.008 * Math.sin(t * 1.2);
    }
  }

  function buildCardMeshes(table, P) {
    for (const m of P.community) table.remove(m);
    P.community.length = 0;

    for (let i = 0; i < 5; i++) {
      const card = makeCardMesh();
      card.position.set(-0.55 + i * 0.275, 1.045, 0.30);
      card.rotation.x = -Math.PI / 2;
      card.visible = false;
      table.add(card);
      P.community.push(card);
    }

    for (let s = 0; s < P.seats.length; s++) {
      const seat = P.seats[s];
      const center = new THREE.Vector3(0, 1.045, table.position.z);
      const dir = new THREE.Vector3(seat.pos.x, 0, seat.pos.z)
        .sub(new THREE.Vector3(0, 0, table.position.z))
        .normalize();

      const base = center.clone().addScaledVector(dir, 1.08);
      base.y = 1.045;

      const c1 = makeCardMesh();
      const c2 = makeCardMesh();

      c1.position.copy(base).add(new THREE.Vector3(-0.06, 0, 0.02));
      c2.position.copy(base).add(new THREE.Vector3(0.06, 0, -0.02));

      c1.rotation.x = -Math.PI / 2;
      c2.rotation.x = -Math.PI / 2;

      c1.visible = false;
      c2.visible = false;

      table.add(c1);
      table.add(c2);

      P.hole[s] = [c1, c2];
    }
  }

  function startHand(P) {
    if (P.handState !== "idle") return;

    for (const c of P.community) c.visible = false;
    for (const pair of P.hole) { pair[0].visible = false; pair[1].visible = false; }

    const mat = P.felt.material;
    const original = mat.color.getHex();
    mat.color.setHex(0x16a065);
    setTimeout(() => mat.color.setHex(original), 160);

    P.handState = "deal_hole";
    P.stepT = 0;
    log?.("[poker] start hand ✅");
  }

  function updatePokerDealing(dt, P) {
    if (P.handState === "idle") return;
    P.stepT += dt;

    if (P.handState === "deal_hole") {
      const idx = Math.floor(P.stepT / 0.12);
      if (idx >= P.seats.length * 2) { P.handState = "deal_flop"; P.stepT = 0; return; }
      const seat = Math.floor(idx / 2);
      const which = idx % 2;
      const card = P.hole[seat]?.[which];
      if (card) card.visible = true;
      return;
    }

    if (P.handState === "deal_flop") {
      if (P.stepT > 0.6) {
        P.community[0].visible = true; P.community[1].visible = true; P.community[2].visible = true;
        P.handState = "deal_turn"; P.stepT = 0;
      }
      return;
    }

    if (P.handState === "deal_turn") {
      if (P.stepT > 0.9) { P.community[3].visible = true; P.handState = "deal_river"; P.stepT = 0; }
      return;
    }

    if (P.handState === "deal_river") {
      if (P.stepT > 0.9) { P.community[4].visible = true; P.handState = "showdown"; P.stepT = 0; }
      return;
    }

    if (P.handState === "showdown") {
      if (P.stepT > 1.4) { P.handState = "idle"; log?.("[poker] showdown ✅"); }
    }
  }

  function startDemoHandLoop() {
    const P = S.lobby.demo;
    if (P._looping) return;
    P._looping = true;

    const loop = () => {
      if (P.handState !== "idle") { setTimeout(loop, 900); return; }
      startHand(P);
      setTimeout(loop, 7000);
    };
    setTimeout(loop, 900);
  }

  // =========================================================
  // TELEPORT PADS
  // =========================================================
  function makeRoomTeleportPads(lobbyGroup) {
    const pads = [
      { label: "GO → STORE", color: 0x7fe7ff, pos: new THREE.Vector3(4.2, 0.01, 0), room: "store" },
      { label: "GO → SCORPION", color: 0xff2d7a, pos: new THREE.Vector3(-4.2, 0.01, 0), room: "scorpion" },
      { label: "GO → SPECTATE", color: 0xffcc00, pos: new THREE.Vector3(0, 0.01, -4.2), room: "spectate" }
    ];

    for (const p of pads) {
      const pad = makePad(p.label, p.color);
      pad.position.copy(p.pos);
      pad.userData.onClick = () => { setRoom(p.room); forceSpawnForRoom(p.room); };
      lobbyGroup.add(pad);
      S.clickables.push(pad);
      S.rooms.pads.push(pad);
    }
  }

  // =========================================================
  // LASERS + CLICK
  // =========================================================
  function buildLasers() {
    S.lasers.length = 0;
    if (!controllers || !controllers.length) { log?.("controllers missing (ok) — lasers deferred"); return; }

    for (const c of controllers) {
      const geom = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1) ]);
      const mat = new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.95 });
      const line = new THREE.Line(geom, mat);
      line.scale.z = 10;
      c.add(line);

      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 16), new THREE.MeshBasicMaterial({ color: 0xff2d7a }));
      dot.visible = false;
      scene.add(dot);

      S.lasers.push({ controller: c, line, dot });
    }
    log?.("lasers ready ✅");
  }

  function wireControllerEvents() {
    if (!controllers || !controllers.length) { log?.("controllers missing (ok) — controller events deferred"); return; }

    for (const c of controllers) {
      c.addEventListener("selectstart", () => {
        if (S.tp.aiming && S.tp.lastValid && S.tp.cooldown <= 0) {
          doTeleport();
          S.tp.cooldown = 0.25;
          return;
        }
        clickRay(c);
      });

      c.addEventListener("squeezestart", () => { S.tp.aiming = true; });
      c.addEventListener("squeezeend", () => {
        S.tp.aiming = false;
        S.tp.lastValid = false;
        if (S.tp.marker) S.tp.marker.visible = false;
        if (S.tp.arc) S.tp.arc.visible = false;
      });
    }
  }

  function updateRays() {
    const objs = S.clickables;
    if (!S.lasers.length) return;

    for (const laser of S.lasers) {
      const c = laser.controller;

      S.tmpMat.identity().extractRotation(c.matrixWorld);
      const origin = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
      const dir = new THREE.Vector3(0,0,-1).applyMatrix4(S.tmpMat).normalize();

      S.raycaster.set(origin, dir);
      S.raycaster.far = 25;

      const hits = S.raycaster.intersectObjects(objs, true);
      if (hits.length) {
        const h = hits[0];
        laser.dot.visible = true;
        laser.dot.position.copy(h.point);
        laser.line.scale.z = origin.distanceTo(h.point);

        const hitObj = climbClickable(h.object);
        setHovered(hitObj);
      } else {
        laser.dot.visible = false;
        laser.line.scale.z = 10;
        setHovered(null);
      }
    }
  }

  function clickRay(controller) {
    const objs = S.clickables;

    S.tmpMat.identity().extractRotation(controller.matrixWorld);
    const origin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
    const dir = new THREE.Vector3(0,0,-1).applyMatrix4(S.tmpMat).normalize();

    S.raycaster.set(origin, dir);
    S.raycaster.far = 25;

    const hits = S.raycaster.intersectObjects(objs, true);
    if (!hits.length) return;

    const hitObj = climbClickable(hits[0].object);
    if (hitObj?.userData?.onClick) hitObj.userData.onClick();
  }

  function clickFromCamera() {
    const origin = new THREE.Vector3();
    camera.getWorldPosition(origin);
    const dir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();

    S.raycaster.set(origin, dir);
    S.raycaster.far = 25;

    const hits = S.raycaster.intersectObjects(S.clickables, true);
    if (!hits.length) return;

    const hitObj = climbClickable(hits[0].object);
    if (hitObj?.userData?.onClick) hitObj.userData.onClick();
  }

  function climbClickable(obj) {
    let o = obj;
    while (o && !o.userData?.onClick && o.parent) o = o.parent;
    return o;
  }

  function setHovered(obj) {
    if (S.hovered === obj) return;

    if (S.hovered) {
      S.hovered.traverse?.((n) => { if (n.material && n.material.emissive) n.material.emissive.setHex(0x000000); });
    }

    S.hovered = obj;

    if (S.hovered) {
      S.hovered.traverse?.((n) => { if (n.material && n.material.emissive) n.material.emissive.setHex(0x081a20); });
    }
  }

  // =========================================================
  // TELEPORT (VR arc)
  // =========================================================
  function buildTeleport() {
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.38, 48),
      new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85 })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    scene.add(marker);
    S.tp.marker = marker;

    const arcGeom = new THREE.BufferGeometry();
    arcGeom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3 * 40), 3));
    const arcMat = new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.65 });
    const arc = new THREE.Line(arcGeom, arcMat);
    arc.visible = false;
    scene.add(arc);
    S.tp.arc = arc;

    log?.("teleport ready ✅");
  }

  function updateTeleportAim() {
    const c = controllers[1] || controllers[0];
    if (!c) return;

    S.tmpMat.identity().extractRotation(c.matrixWorld);
    const origin = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
    const forward = new THREE.Vector3(0,0,-1).applyMatrix4(S.tmpMat).normalize();

    const g = new THREE.Vector3(0, -9.8, 0);
    const v0 = forward.clone().multiplyScalar(7.5);

    const pts = [];
    let last = origin.clone();
    let hit = null;

    for (let i = 0; i < 40; i++) {
      const t = i * 0.04;
      const p = origin.clone()
        .add(v0.clone().multiplyScalar(t))
        .add(g.clone().multiplyScalar(0.5 * t * t));
      pts.push(p);

      if (p.y <= 0.02) { hit = p.clone(); hit.y = 0.01; break; }
      last = p;
    }

    const arc = S.tp.arc;
    const pos = arc.geometry.attributes.position.array;

    for (let i = 0; i < 40; i++) {
      const p = pts[Math.min(i, pts.length - 1)] || last;
      pos[i*3+0] = p.x;
      pos[i*3+1] = p.y;
      pos[i*3+2] = p.z;
    }
    arc.geometry.attributes.position.needsUpdate = true;
    arc.visible = true;

    if (hit) {
      S.tp.marker.position.copy(hit);
      S.tp.marker.visible = true;
      S.tp.hit = hit;
      S.tp.lastValid = true;
    } else {
      S.tp.marker.visible = false;
      S.tp.hit = null;
      S.tp.lastValid = false;
    }
  }

  function doTeleport() {
    const p = S.tp.hit;
    if (!p) return;
    player.position.set(p.x, 0, p.z);
    log?.("[tp] ✅", p.x.toFixed(2), p.z.toFixed(2));
  }

  // =========================================================
  // VR STICK LOCOMOTION
  // =========================================================
  function locomotion(dt) {
    const left = controllers[0];
    const right = controllers[1];

    const la = left?.userData?.axes || [0,0,0,0];
    const ra = right?.userData?.axes || [0,0,0,0];

    const mx = la[2] ?? la[0] ?? 0;
    const my = la[3] ?? la[1] ?? 0;

    const dead = 0.15;
    const ax = Math.abs(mx) > dead ? mx : 0;
    const ay = Math.abs(my) > dead ? my : 0;

    if (ax || ay) {
      const forward = new THREE.Vector3(0,0,-1).applyQuaternion(player.quaternion);
      forward.y = 0; forward.normalize();

      const rightV = new THREE.Vector3(1,0,0).applyQuaternion(player.quaternion);
      rightV.y = 0; rightV.normalize();

      const v = new THREE.Vector3();
      v.addScaledVector(rightV, ax);
      v.addScaledVector(forward, ay);
      if (v.lengthSq() > 0.00001) v.normalize();

      player.position.addScaledVector(v, dt * S.move.speed);
    }

    const turnX = ra[2] ?? ra[0] ?? 0;
    if (S.move.snapCooldown <= 0 && Math.abs(turnX) > 0.65) {
      player.rotation.y -= Math.sign(turnX) * S.move.snap;
      S.move.snapCooldown = 0.28;
    }
  }

  // =========================================================
  // PRIMITIVES + TEXTURES
  // =========================================================
  function makeFeltTexture({ text="SCARLETT", accent=0xff2d7a }) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 1024;
    canvas.height = 1024;

    // base felt
    ctx.fillStyle = "#0f5f3d";
    ctx.fillRect(0,0,1024,1024);

    // subtle felt noise
    ctx.globalAlpha = 0.10;
    for (let i=0;i<2200;i++){
      const x = Math.random()*1024;
      const y = Math.random()*1024;
      const a = Math.random()*0.8;
      ctx.fillStyle = `rgba(0,0,0,${a})`;
      ctx.fillRect(x,y,1,1);
    }
    ctx.globalAlpha = 1;

    // center scorpion logo circle
    ctx.beginPath();
    ctx.arc(512, 512, 180, 0, Math.PI*2);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fill();

    // accent ring
    ctx.beginPath();
    ctx.arc(512,512,205,0,Math.PI*2);
    ctx.strokeStyle = `rgba(255,220,80,0.22)`;
    ctx.lineWidth = 10;
    ctx.stroke();

    // text + scorpion glyph
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = "900 84px system-ui, Arial";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillText("🦂", 512, 440);
    ctx.font = "900 64px system-ui, Arial";
    ctx.fillText(text, 512, 520);

    // table markings (simple arcs)
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(512, 610, 320, Math.PI*1.10, Math.PI*1.90);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  function makePad(label, color) {
    const g = new THREE.Group();

    const disk = new THREE.Mesh(
      new THREE.CircleGeometry(0.62, 64),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.8, metalness: 0.2, emissive: 0x000000 })
    );
    disk.rotation.x = -Math.PI / 2;
    disk.position.y = 0.01;
    g.add(disk);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.62, 64),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    g.add(ring);

    const t = makeBillboard(label, 0.65);
    t.position.set(0, 0.38, 0);
    g.add(t);

    g.userData.onClick = () => {};
    return g;
  }

  function makeButton(label) {
    const g = new THREE.Group();

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.12, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.6, metalness: 0.2, emissive: 0x000000 })
    );
    base.position.y = 0.06;
    g.add(base);

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(0.90, 0.05, 0.21),
      new THREE.MeshStandardMaterial({ color: 0xff2d7a, roughness: 0.35, metalness: 0.12, emissive: 0x1a0010 })
    );
    top.position.y = 0.12;
    g.add(top);

    const t = makeBillboard(label, 0.55);
    t.position.set(0, 0.26, 0);
    g.add(t);

    g.userData.onClick = () => {};
    return g;
  }

  function makeChair() {
    const g = new THREE.Group();

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.08, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x14151d, roughness: 0.9 })
    );
    seat.position.y = 0.48;
    g.add(seat);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.55, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x14151d, roughness: 0.9 })
    );
    back.position.set(0, 0.78, -0.235);
    g.add(back);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.8, metalness: 0.2 });
    const legGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 12);
    const lx = 0.23, lz = 0.23;

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const leg = new THREE.Mesh(legGeom, legMat);
        leg.position.set(sx * lx, 0.225, sz * lz);
        g.add(leg);
      }
    }
    return g;
  }

  function makeWalkerBot(i) {
    const g = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18, 0.75, 6, 14),
      new THREE.MeshStandardMaterial({ color: 0x1b1c26, roughness: 0.9 })
    );
    body.position.y = 1.0;
    g.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 22, 22),
      new THREE.MeshStandardMaterial({ color: 0x222433, roughness: 0.65 })
    );
    head.position.y = 1.55;
    head.name = "head";
    g.add(head);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x7fe7ff });
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 10), eyeMat);
    e1.position.set(0.05, 1.56, 0.13);
    const e2 = e1.clone();
    e2.position.x = -0.05;
    g.add(e1, e2);

    return g;
  }

  function makeFullBodySeatedBot(i) {
    const g = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1b1c26, roughness: 0.9 });
    const limbMat = new THREE.MeshStandardMaterial({ color: 0x14151d, roughness: 0.85 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x222433, roughness: 0.65 });

    // torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 6, 14), bodyMat);
    torso.position.y = 0.58; // relative to seat Y
    g.add(torso);

    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 22, 22), headMat);
    head.position.y = 1.04;
    head.name = "head";
    g.add(head);

    // eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x7fe7ff });
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 10), eyeMat);
    e1.position.set(0.05, 1.05, 0.13);
    const e2 = e1.clone();
    e2.position.x = -0.05;
    g.add(e1, e2);

    // hips anchor
    const hips = new THREE.Group();
    hips.position.set(0, 0.40, 0.06);
    g.add(hips);

    // arms toward table
    const upperArmGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.34, 12);
    const foreArmGeom  = new THREE.CylinderGeometry(0.028, 0.028, 0.30, 12);

    function arm(side=1) {
      const shoulder = new THREE.Group();
      shoulder.position.set(0.22*side, 0.66, 0.12);
      g.add(shoulder);

      const upper = new THREE.Mesh(upperArmGeom, limbMat);
      upper.rotation.z = 0.55 * side;
      upper.position.y = -0.17;
      shoulder.add(upper);

      const elbow = new THREE.Group();
      elbow.position.set(0, -0.34, 0);
      upper.add(elbow);

      const fore = new THREE.Mesh(foreArmGeom, limbMat);
      fore.rotation.z = 0.25 * side;
      fore.position.y = -0.15;
      elbow.add(fore);

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), limbMat);
      hand.position.set(0, -0.30, 0.05);
      elbow.add(hand);
    }
    arm(1); arm(-1);

    // legs seated
    const thighGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.36, 12);
    const calfGeom  = new THREE.CylinderGeometry(0.035, 0.035, 0.34, 12);

    function leg(side=1) {
      const hip = new THREE.Group();
      hip.position.set(0.11*side, 0.42, 0.08);
      g.add(hip);

      const thigh = new THREE.Mesh(thighGeom, limbMat);
      thigh.rotation.x = Math.PI / 2.25;
      thigh.position.z = 0.18;
      hip.add(thigh);

      const knee = new THREE.Group();
      knee.position.set(0, 0, 0.36);
      thigh.add(knee);

      const calf = new THREE.Mesh(calfGeom, limbMat);
      calf.rotation.x = -Math.PI / 2.05;
      calf.position.y = -0.17;
      knee.add(calf);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.05, 0.18), limbMat);
      foot.position.set(0, -0.34, 0.02);
      knee.add(foot);
    }
    leg(1); leg(-1);

    // record baseY for bob
    g.userData.baseY = g.position.y;

    return g;
  }

  function makeChipStack(n, opts = { dark: false }) {
    const g = new THREE.Group();
    const colors = opts.dark
      ? [0x2b2d3a, 0x1b1c26, 0x0b0d14]
      : [0xff2d7a, 0x7fe7ff, 0xffcc00, 0x4cd964, 0xffffff];

    for (let i = 0; i < n; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.42, metalness: 0.15 });
      const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.015, 18), mat);
      chip.position.y = i * 0.016;
      g.add(chip);
    }
    return g;
  }

  function makeChipPot(n = 18) {
    const g = new THREE.Group();
    const colors = [0xff2d7a, 0x7fe7ff, 0xffcc00, 0xffffff];
    for (let i = 0; i < n; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.45, metalness: 0.12 });
      const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.013, 18), mat);
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.18;
      chip.position.set(Math.cos(a)*r, 0.010 + (i*0.004), Math.sin(a)*r);
      chip.rotation.y = Math.random()*Math.PI;
      g.add(chip);
    }
    return g;
  }

  function makeCardMesh() {
    return new THREE.Mesh(
      new THREE.PlaneGeometry(0.20, 0.28),
      new THREE.MeshStandardMaterial({ color: 0xf3f4ff, roughness: 0.65, metalness: 0.0 })
    );
  }

  function makeBillboard(text, scale = 1) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 512;
    canvas.height = 256;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(11,13,20,0.86)";
    roundRect(ctx, 24, 48, 464, 160, 28);
    ctx.fill();

    ctx.strokeStyle = "rgba(127,231,255,0.55)";
    ctx.lineWidth = 4;
    roundRect(ctx, 24, 48, 464, 160, 28);
    ctx.stroke();

    ctx.fillStyle = "#e8ecff";
    ctx.font = "bold 44px system-ui, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const lines = String(text).split("\n");
    if (lines.length === 1) {
      ctx.fillText(lines[0], 256, 128);
    } else {
      const baseY = 128 - (lines.length - 1) * 26;
      for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], 256, baseY + i * 52);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6 * scale, 0.8 * scale), mat);

    mesh.onBeforeRender = () => { mesh.quaternion.copy(camera.quaternion); };
    return mesh;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // =========================================================
  // BUILD LASERS / TELEPORT / LOCOMOTION helpers already above
  // =========================================================

  return { init, update, clickFromCamera, teleportFromCamera };
})();
