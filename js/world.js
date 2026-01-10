// /js/world.js — Scarlett VR Poker — WORLD MASTER v13 (FULL)
// Fixes vs v12:
// ✅ Scorpion table orientation + spawn facing correct
// ✅ Removes “weird green tree” look (pot stack toned down + optional hidden)
// ✅ Bots sit upright (pose + correct lookAt)
// ✅ Table top looks like a real poker table (oval felt + rail + markings)
// ✅ Adds simple visible dealing: community cards + hole cards (visual loop)
// ✅ Keeps lobby/store/spectate pads

export const World = (() => {
  let THREE, scene, renderer, camera, player, controllers, log;

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

    poker: {
      t: 0,
      tableGroup: null,
      tableZ: -2.5,
      felt: null,
      rail: null,
      pot: null,
      bots: [],
      seats: [], // seat transforms
      shoe: null,

      handState: "idle", // idle/deal_hole/deal_flop/deal_turn/deal_river/showdown
      stepT: 0,

      // card meshes
      community: [],
      hole: [], // per seat: [c1,c2]
    }
  };

  async function init(ctx) {
    ({ THREE, scene, renderer, camera, player, controllers, log } = ctx);

    log("✅ WORLD MASTER v13 active");

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

    S.ready = true;
    log("ready ✅ room=lobby");
  }

  function update(dt) {
    if (!S.ready) return;

    S.move.snapCooldown = Math.max(0, S.move.snapCooldown - dt);
    S.tp.cooldown = Math.max(0, S.tp.cooldown - dt);

    locomotion(dt);
    updateRays();
    if (S.tp.aiming) updateTeleportAim();

    // poker anim loop only in scorpion room
    S.poker.t += dt;
    if (S.rooms.current === "scorpion") {
      animateBots(dt);
      updatePokerDealing(dt);
    }
  }

  // =========================================================
  // ENVIRONMENT
  // =========================================================
  function addLights() {
    scene.add(new THREE.HemisphereLight(0xffffff, 0x273045, 1.15));

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(7, 12, 6);
    scene.add(key);

    const fill = new THREE.PointLight(0x88ccff, 0.7, 45);
    fill.position.set(-7, 3.3, -7);
    scene.add(fill);

    const warm = new THREE.PointLight(0xff88cc, 0.55, 45);
    warm.position.set(7, 3.3, -7);
    scene.add(warm);
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
        roughness: 0.3,
        metalness: 0.1,
        emissive: 0x07252c
      })
    );
    ring.position.set(0, 6.1, 0);
    ring.rotation.x = Math.PI / 2;
    S.root.add(ring);

    const sign = makeBillboard("SCARLETT VR POKER", 2.2);
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

    // reset teleport visuals
    S.tp.aiming = false;
    S.tp.lastValid = false;
    if (S.tp.marker) S.tp.marker.visible = false;
    if (S.tp.arc) S.tp.arc.visible = false;

    log?.(`[hud] room=${name}`);
  }

  function forceSpawnForRoom(room) {
    if (room === "lobby") {
      player.position.set(0, 0, 6.5);
      faceYawToward(new THREE.Vector3(0, 1.6, 0));
    }

    if (room === "store") {
      player.position.set(8.5, 0, 2.8);
      faceYawToward(new THREE.Vector3(8.5, 1.6, -2));
    }

    if (room === "scorpion") {
      // ✅ spawn in front of table and facing it
      player.position.set(-8.5, 0, 5.2);
      faceYawToward(new THREE.Vector3(-8.5, 1.6, S.poker.tableZ));
    }

    if (room === "spectate") {
      player.position.set(0, 0, -9.8);
      faceYawToward(new THREE.Vector3(0, 1.6, -2));
    }
  }

  function faceYawToward(target) {
    const pos = new THREE.Vector3(player.position.x, 1.6, player.position.z);
    const dir = target.clone().sub(pos);
    dir.y = 0;
    dir.normalize();
    const yaw = Math.atan2(dir.x, dir.z);
    player.rotation.set(0, yaw, 0);
  }

  function buildLobby(g) {
    const title = makeBillboard("LOBBY", 1.25);
    title.position.set(0, 2.2, 2.2);
    g.add(title);

    const prompt = makeBillboard("Pads → Store / Scorpion / Spectate", 0.9);
    prompt.position.set(0, 1.6, 0.7);
    g.add(prompt);
  }

  function buildStore(g) {
    g.position.set(8.5, 0, 0);

    const title = makeBillboard("STORE", 1.25);
    title.position.set(0, 2.1, -2.5);
    g.add(title);

    const kiosk = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.05, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.75, metalness: 0.15 })
    );
    kiosk.position.set(0, 0.52, -2.0);
    g.add(kiosk);

    const back = makePad("BACK → LOBBY", 0x7fe7ff);
    back.position.set(0, 0.01, 1.8);
    back.userData.onClick = () => { setRoom("lobby"); forceSpawnForRoom("lobby"); };
    g.add(back);
    S.clickables.push(back);
  }

  function buildSpectate(g) {
    g.position.set(0, 0, -10.5);

    const title = makeBillboard("SPECTATE", 1.25);
    title.position.set(0, 2.2, 0);
    g.add(title);

    const back = makePad("BACK → LOBBY", 0x7fe7ff);
    back.position.set(0, 0.01, 2.6);
    back.userData.onClick = () => { setRoom("lobby"); forceSpawnForRoom("lobby"); };
    g.add(back);
    S.clickables.push(back);
  }

  // =========================================================
  // SCORPION ROOM — UPGRADED TABLE + BOTS + CARDS
  // =========================================================
  function buildScorpion(g) {
    g.position.set(-8.5, 0, 0);

    const title = makeBillboard("SCORPION ROOM", 1.05);
    title.position.set(0, 2.25, -3.4);
    g.add(title);

    const table = new THREE.Group();
    table.position.set(0, 0, S.poker.tableZ);
    g.add(table);
    S.poker.tableGroup = table;

    // ✅ better poker felt (oval) + markings
    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(2.25, 2.25, 0.10, 64, 1, false),
      new THREE.MeshStandardMaterial({ color: 0x0f5f3d, roughness: 0.92 })
    );
    felt.rotation.x = Math.PI / 2;
    felt.scale.set(1.2, 1.0, 0.78); // oval feel
    felt.position.y = 1.02;
    table.add(felt);
    S.poker.felt = felt;

    const feltLine = new THREE.Mesh(
      new THREE.RingGeometry(1.25, 1.32, 96),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 })
    );
    feltLine.rotation.x = -Math.PI / 2;
    feltLine.position.y = 1.03;
    feltLine.scale.set(1.35, 1.0, 0.95);
    table.add(feltLine);

    // rail
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(2.45, 0.19, 18, 120),
      new THREE.MeshStandardMaterial({ color: 0x241c16, roughness: 0.82, metalness: 0.08 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 1.03;
    rail.scale.set(1.10, 1.0, 0.86);
    table.add(rail);
    S.poker.rail = rail;

    // pedestal
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.62, 1.0, 28),
      new THREE.MeshStandardMaterial({ color: 0x101019, roughness: 0.85, metalness: 0.2 })
    );
    ped.position.y = 0.5;
    table.add(ped);

    // ✅ shoe (deck box) so center doesn’t look like a “tree”
    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.20, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.7, metalness: 0.2 })
    );
    shoe.position.set(0, 1.06, -0.55);
    table.add(shoe);
    S.poker.shoe = shoe;

    // ✅ pot: toned-down stack (small + dark) so it doesn’t look like a green tree
    const pot = makeChipStack(10, { dark: true });
    pot.position.set(0, 1.045, 0.0);
    pot.scale.setScalar(0.9);
    table.add(pot);
    S.poker.pot = pot;

    // seats around the table
    buildSeatsAndBots(g, table);

    // cards: create and park hidden
    buildCardMeshes(table);

    // buttons
    const start = makeButton("START HAND");
    start.position.set(0, 1.2, table.position.z + 3.05);
    start.userData.onClick = () => startHand();
    g.add(start);
    S.clickables.push(start);

    const back = makePad("BACK → LOBBY", 0x7fe7ff);
    back.position.set(0, 0.01, table.position.z + 6.2);
    back.userData.onClick = () => { setRoom("lobby"); forceSpawnForRoom("lobby"); };
    g.add(back);
    S.clickables.push(back);
  }

  function buildSeatsAndBots(roomGroup, table) {
    S.poker.bots.length = 0;
    S.poker.seats.length = 0;
    S.poker.hole.length = 0;

    const botCount = 8;
    const radius = 2.95;

    for (let i = 0; i < botCount; i++) {
      const ang = (i / botCount) * Math.PI * 2;

      // seat transform (position where bot sits)
      const seatPos = new THREE.Vector3(
        Math.cos(ang) * (radius - 0.45),
        0,
        table.position.z + Math.sin(ang) * (radius - 0.45)
      );
      S.poker.seats.push({ pos: seatPos, ang });

      // chair
      const chair = makeChair();
      chair.position.set(Math.cos(ang) * radius, 0, table.position.z + Math.sin(ang) * radius);
      chair.rotation.y = -ang + Math.PI / 2;
      roomGroup.add(chair);

      // bot upright pose
      const bot = makeBot(i);
      bot.position.copy(seatPos);
      bot.rotation.y = -ang + Math.PI; // face table center
      roomGroup.add(bot);

      // store reference
      S.poker.bots.push(bot);

      // hole card placeholders
      S.poker.hole.push([]);
    }
  }

  function animateBots(dt) {
    // subtle breathing + micro head turn; never lean back
    for (let i = 0; i < S.poker.bots.length; i++) {
      const b = S.poker.bots[i];
      const t = S.poker.t + i * 0.6;

      const head = b.getObjectByName("head");
      if (head) {
        head.rotation.y = 0.12 * Math.sin(t * 0.7);
        head.rotation.x = 0.06 * Math.sin(t * 0.9);
      }

      b.position.y = 0.01 * Math.sin(t * 1.2);
    }
  }

  // =========================================================
  // CARDS (simple visible dealing)
  // =========================================================
  function buildCardMeshes(table) {
    // clear previous
    for (const m of S.poker.community) table.remove(m);
    S.poker.community.length = 0;

    // 5 community cards
    for (let i = 0; i < 5; i++) {
      const card = makeCardMesh();
      card.position.set(-0.55 + i * 0.275, 1.045, 0.25);
      card.rotation.x = -Math.PI / 2;
      card.visible = false;
      table.add(card);
      S.poker.community.push(card);
    }

    // hole cards: 2 per seat
    for (let s = 0; s < S.poker.seats.length; s++) {
      const seat = S.poker.seats[s];
      const center = new THREE.Vector3(0, 1.045, table.position.z);

      // place slightly toward each seat
      const dir = new THREE.Vector3(seat.pos.x, 0, seat.pos.z).sub(new THREE.Vector3(0, 0, table.position.z)).normalize();
      const base = new THREE.Vector3().copy(center).addScaledVector(dir, 1.05);
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

      S.poker.hole[s] = [c1, c2];
    }
  }

  function startHand() {
    if (S.poker.handState !== "idle") return;

    // reset visibility
    for (const c of S.poker.community) c.visible = false;
    for (const pair of S.poker.hole) {
      pair[0].visible = false;
      pair[1].visible = false;
    }

    // flash felt
    const mat = S.poker.felt.material;
    const original = mat.color.getHex();
    mat.color.setHex(0x16a065);
    setTimeout(() => mat.color.setHex(original), 160);

    S.poker.handState = "deal_hole";
    S.poker.stepT = 0;
    log?.("[poker] start hand ✅");
  }

  function updatePokerDealing(dt) {
    if (S.poker.handState === "idle") return;
    S.poker.stepT += dt;

    const step = () => { S.poker.stepT = 0; };

    // Deal hole cards progressively
    if (S.poker.handState === "deal_hole") {
      const idx = Math.floor(S.poker.stepT / 0.12); // pace
      if (idx >= S.poker.seats.length * 2) {
        S.poker.handState = "deal_flop";
        step();
        return;
      }
      const seat = Math.floor(idx / 2);
      const which = idx % 2;
      const card = S.poker.hole[seat]?.[which];
      if (card) card.visible = true;
      return;
    }

    // flop/turn/river pacing
    if (S.poker.handState === "deal_flop") {
      if (S.poker.stepT > 0.6) {
        S.poker.community[0].visible = true;
        S.poker.community[1].visible = true;
        S.poker.community[2].visible = true;
        S.poker.handState = "deal_turn";
        step();
      }
      return;
    }

    if (S.poker.handState === "deal_turn") {
      if (S.poker.stepT > 0.9) {
        S.poker.community[3].visible = true;
        S.poker.handState = "deal_river";
        step();
      }
      return;
    }

    if (S.poker.handState === "deal_river") {
      if (S.poker.stepT > 0.9) {
        S.poker.community[4].visible = true;
        S.poker.handState = "showdown";
        step();
      }
      return;
    }

    if (S.poker.handState === "showdown") {
      if (S.poker.stepT > 1.4) {
        S.poker.handState = "idle";
        log?.("[poker] showdown ✅");
      }
      return;
    }
  }

  // =========================================================
  // INPUT: lasers, clicking, teleport, locomotion
  // =========================================================
  function buildLasers() {
    S.lasers.length = 0;

    for (const c of controllers) {
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
      ]);
      const mat = new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.95 });
      const line = new THREE.Line(geom, mat);
      line.scale.z = 10;
      c.add(line);

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xff2d7a })
      );
      dot.visible = false;
      scene.add(dot);

      S.lasers.push({ controller: c, line, dot });
    }

    log("lasers ready ✅");
  }

  function buildTeleport() {
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.38, 48),
      new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85 })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    scene.add(marker);
    S.tp.marker =
