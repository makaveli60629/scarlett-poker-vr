// /js/world.js — SCARLETT VR POKER — WORLD MASTER v15.0 (FULL UPGRADE)
// ✅ Rooms separated so nothing overlaps
// ✅ Solid room walls (clamp collision per room)
// ✅ Neon rails (Lobby neon, Scorpion gold neon)
// ✅ Teleport pads + Teleport to Table
// ✅ Menu actions: goRoom("..."), teleportToTable()
// ✅ Bots seated correctly (chair-anchored seat point)
// ✅ Auto-deal in Scorpion + lobby demo

export const World = (() => {
  let THREE, scene, renderer, camera, player, log;
  let controllers = [];

  const ROOM_POS = {
    lobby:    new THREE.Vector3(0, 0, 0),
    store:    new THREE.Vector3(45, 0, 0),
    scorpion: new THREE.Vector3(-45, 0, 0),
    spectate: new THREE.Vector3(0, 0, -45)
  };

  const S = {
    ready: false,
    raycaster: null,
    tmpMat: null,

    lasers: [],
    clickables: [],
    hovered: null,

    move: { speed: 2.1, snap: Math.PI/6, snapCooldown: 0 },

    tp: { aiming:false, marker:null, arc:null, hit:null, lastValid:false, cooldown:0 },

    rooms: {
      current: "lobby",
      groups: {},
      // collision bounds (local to each room group)
      bounds: {
        lobby:    { w: 36, d: 36 },
        store:    { w: 18, d: 22 },
        scorpion: { w: 14, d: 14 },
        spectate: { w: 16, d: 16 }
      }
    },

    lobby: { t:0, walkers:[], demo: makePokerState(-2.4) },
    poker: makePokerState(0.0) // tableZ local inside scorpion room group
  };

  function makePokerState(tableZ){
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
      hole: [],
      _auto: false
    };
  }

  async function init(ctx){
    ({ THREE, scene, renderer, camera, player, log } = ctx);
    controllers = Array.isArray(ctx.controllers) ? ctx.controllers : [];
    S.raycaster = new THREE.Raycaster();
    S.tmpMat = new THREE.Matrix4();

    addLights();
    buildRooms(); // no global shell that bleeds into other rooms

    buildTeleport();
    buildLasers();
    wireControllerEvents();

    goRoom("lobby");
    // start demo + scorpion auto
    startAutoHands(S.lobby.demo);
    startAutoHands(S.poker);

    S.ready = true;
    log?.("[world] v15 ready ✅");
  }

  function update(dt){
    if (!S.ready) return;

    S.move.snapCooldown = Math.max(0, S.move.snapCooldown - dt);
    S.tp.cooldown = Math.max(0, S.tp.cooldown - dt);

    locomotion(dt);
    updateRays();
    if (S.tp.aiming) updateTeleportAim();

    // animations
    S.lobby.t += dt;
    S.lobby.demo.t += dt;
    S.poker.t += dt;

    if (S.rooms.current === "lobby") updateLobbyWalkers(dt);

    animatePokerBots(S.lobby.demo);
    updatePokerDealing(dt, S.lobby.demo);

    if (S.rooms.current === "scorpion") {
      animatePokerBots(S.poker);
      updatePokerDealing(dt, S.poker);
    }

    // solid walls clamp
    clampPlayerToRoomBounds();
  }

  // ---------- public controls ----------
  function setControllers(arr){ controllers = Array.isArray(arr) ? arr : []; }
  function rebuildLasers(){
    for (const L of S.lasers){
      try { L.controller?.remove(L.line); } catch {}
      try { scene.remove(L.dot); } catch {}
    }
    S.lasers.length = 0;
    buildLasers();
    wireControllerEvents();
    log?.("[world] lasers rebuilt ✅");
  }

  function goRoom(name){
    S.rooms.current = name;
    for (const k of Object.keys(S.rooms.groups)) S.rooms.groups[k].visible = (k === name);
    forceSpawnForRoom(name);
  }

  function teleportToTable(){
    // teleports to “rail spot” facing the table, based on current room if possible
    if (S.rooms.current === "scorpion") {
      const g = S.rooms.groups.scorpion;
      const tableCenter = new THREE.Vector3(0, 0, S.poker.tableZ).add(g.position);
      const spot = tableCenter.clone().add(new THREE.Vector3(0, 0, 4.6)); // front rail
      player.position.set(spot.x, 0, spot.z);
      faceYawToward(tableCenter.clone().setY(1.6));
      return;
    }
    // if not in scorpion, go there then to table
    goRoom("scorpion");
    setTimeout(()=> teleportToTable(), 30);
  }

  // Android tap action
  function clickFromCamera(){
    const origin = new THREE.Vector3(); camera.getWorldPosition(origin);
    const dir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
    S.raycaster.set(origin, dir); S.raycaster.far = 40;
    const hits = S.raycaster.intersectObjects(S.clickables, true);
    if (!hits.length) return;
    const hitObj = climbClickable(hits[0].object);
    hitObj?.userData?.onClick?.();
  }

  // Android teleport (ground intersect)
  function teleportFromCamera(){
    const origin = new THREE.Vector3(); camera.getWorldPosition(origin);
    const dir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
    if (Math.abs(dir.y) < 0.0001) return;
    const t = -origin.y / dir.y;
    if (t < 0.2 || t > 120) return;
    const hit = origin.clone().addScaledVector(dir, t);
    player.position.set(hit.x, 0, hit.z);
  }

  // ---------- build ----------
  function addLights(){
    scene.add(new THREE.HemisphereLight(0xffffff, 0x273045, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(7, 12, 6);
    scene.add(key);
    const fill = new THREE.PointLight(0x88ccff, 0.7, 120);
    fill.position.set(-18, 3.2, -12);
    scene.add(fill);
    const warm = new THREE.PointLight(0xff88cc, 0.55, 120);
    warm.position.set(18, 3.2, -12);
    scene.add(warm);
  }

  function buildRooms(){
    S.rooms.groups.lobby = new THREE.Group();
    S.rooms.groups.store = new THREE.Group();
    S.rooms.groups.scorpion = new THREE.Group();
    S.rooms.groups.spectate = new THREE.Group();

    S.rooms.groups.lobby.position.copy(ROOM_POS.lobby);
    S.rooms.groups.store.position.copy(ROOM_POS.store);
    S.rooms.groups.scorpion.position.copy(ROOM_POS.scorpion);
    S.rooms.groups.spectate.position.copy(ROOM_POS.spectate);

    scene.add(S.rooms.groups.lobby, S.rooms.groups.store, S.rooms.groups.scorpion, S.rooms.groups.spectate);

    buildLobby(S.rooms.groups.lobby);
    buildStore(S.rooms.groups.store);
    buildScorpion(S.rooms.groups.scorpion);
    buildSpectate(S.rooms.groups.spectate);

    // only show lobby first
    for (const k of Object.keys(S.rooms.groups)) S.rooms.groups[k].visible = (k === "lobby");
  }

  function buildRoomShell(g, w, d, theme="dark"){
    const floorMat = new THREE.MeshStandardMaterial({ color: theme==="dark" ? 0x0e0f16 : 0x0b0d14, roughness:0.95 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x090b12, roughness:0.92 });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    floor.rotation.x = -Math.PI/2;
    floor.position.y = 0.01;
    g.add(floor);

    const h = 6.6;
    const wallN = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
    wallN.position.set(0, h/2, -d/2);
    g.add(wallN);

    const wallS = wallN.clone();
    wallS.position.z = d/2;
    wallS.rotation.y = Math.PI;
    g.add(wallS);

    const wallE = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wallMat);
    wallE.position.set(w/2, h/2, 0);
    wallE.rotation.y = -Math.PI/2;
    g.add(wallE);

    const wallW = wallE.clone();
    wallW.position.x = -w/2;
    wallW.rotation.y = Math.PI/2;
    g.add(wallW);
  }

  function buildLobby(g){
    buildRoomShell(g, 36, 36);

    const title = makeBillboard("LOBBY — LIVE TABLE", 1.2);
    title.position.set(0, 2.8, 10);
    g.add(title);

    // Neon rail (lobby)
    buildNeonRailRing(g, 9.5, 0x7fe7ff, 0.10);

    // Arch teleporter + pad beside it
    const arch = buildArchTeleporter();
    arch.position.set(0, 0, 6.0);
    arch.userData.onClick = () => goRoom("scorpion");
    g.add(arch);
    S.clickables.push(arch);

    const pad = makePad("ENTER → SCORPION", 0xff2d7a);
    pad.position.set(1.7, 0.01, 5.8);
    pad.userData.onClick = () => goRoom("scorpion");
    g.add(pad);
    S.clickables.push(pad);

    // Lobby demo table (bots deal)
    buildPokerTableSet(g, S.lobby.demo, { pos: new THREE.Vector3(0,0,0), tableZ: -2.4, accent: 0x7fe7ff, logoText:"BOSS" });

    // pads to other rooms
    addLobbyPads(g);

    // walkers
    spawnLobbyWalkers(g, 8);
  }

  function addLobbyPads(g){
    const mk = (label, color, x, z, fn) => {
      const p = makePad(label, color);
      p.position.set(x, 0.01, z);
      p.userData.onClick = fn;
      g.add(p);
      S.clickables.push(p);
    };
    mk("GO → STORE", 0x7fe7ff,  10,  0, ()=>goRoom("store"));
    mk("GO → SPECTATE", 0xffcc00, 0, -10, ()=>goRoom("spectate"));
    mk("TP → TABLE", 0xffee55, -10, 0, ()=>{ goRoom("scorpion"); setTimeout(()=>teleportToTable(), 30); });
  }

  function buildStore(g){
    buildRoomShell(g, 18, 22);

    const title = makeBillboard("STORE — COSMETICS", 1.1);
    title.position.set(0, 2.8, -8);
    g.add(title);

    // Door displays both sides
    const leftDisplay = makeBillboard("FEATURED\nCROWNS\nSKINS\nEMOTES", 0.85);
    leftDisplay.position.set(-5.2, 1.7, 5.0);
    g.add(leftDisplay);

    const rightDisplay = makeBillboard("LIMITED\nNEON SETS\nVIP PASS\nBUNDLES", 0.85);
    rightDisplay.position.set(5.2, 1.7, 5.0);
    g.add(rightDisplay);

    const back = makePad("BACK → LOBBY", 0x7fe7ff);
    back.position.set(0, 0.01, 9.5);
    back.userData.onClick = () => goRoom("lobby");
    g.add(back);
    S.clickables.push(back);
  }

  function buildSpectate(g){
    buildRoomShell(g, 16, 16);

    const title = makeBillboard("SPECTATE", 1.2);
    title.position.set(0, 2.6, -5.5);
    g.add(title);

    const back = makePad("BACK → LOBBY", 0x7fe7ff);
    back.position.set(0, 0.01, 6.0);
    back.userData.onClick = () => goRoom("lobby");
    g.add(back);
    S.clickables.push(back);
  }

  function buildScorpion(g){
    buildRoomShell(g, 14, 14);

    // Gold neon rails (scorpion)
    buildNeonRailRing(g, 5.2, 0xffcc00, 0.09, true);

    // Scorpion HUD + leaderboard
    const hud = makeBillboard("SCORPION HUD\nBlinds: 50/100 | Auto Hands: ON | Spectate: ON", 1.0);
    hud.position.set(0, 3.2, 4.6);
    g.add(hud);

    const lb = makeBillboard("LEADERBOARD\n1) Scarlett 120K\n2) KingBot 98K\n3) Viper 77K", 1.1);
    lb.position.set(0, 3.0, -6.2);
    g.add(lb);

    // Table set at local center
    buildPokerTableSet(g, S.poker, { pos: new THREE.Vector3(0,0,0), tableZ: 0.0, accent: 0xff2d7a, logoText:"SCORPION" });

    // Corner pads + teleport to table pad
    addScorpionPads(g);

    // Back
    const back = makePad("BACK → LOBBY", 0x7fe7ff);
    back.position.set(0, 0.01, 6.0);
    back.userData.onClick = () => goRoom("lobby");
    g.add(back);
    S.clickables.push(back);
  }

  function addScorpionPads(g){
    const mk = (label, color, x, z, fn) => {
      const p = makePad(label, color);
      p.position.set(x, 0.01, z);
      p.userData.onClick = fn;
      g.add(p);
      S.clickables.push(p);
    };

    // Teleport-to-table pad (front rail)
    mk("TP → TABLE", 0xffee55, 0, 5.2, ()=> teleportToTable());

    // Corner pads
    mk("CORNER 1", 0xffcc00,  5.4,  5.4, ()=>teleportLocalInRoom(g,  5.4,  5.4));
    mk("CORNER 2", 0xffcc00, -5.4,  5.4, ()=>teleportLocalInRoom(g, -5.4,  5.4));
    mk("CORNER 3", 0xffcc00,  5.4, -5.4, ()=>teleportLocalInRoom(g,  5.4, -5.4));
    mk("CORNER 4", 0xffcc00, -5.4, -5.4, ()=>teleportLocalInRoom(g, -5.4, -5.4));
  }

  function teleportLocalInRoom(roomGroup, lx, lz){
    const world = new THREE.Vector3(lx, 0, lz).add(roomGroup.position);
    player.position.set(world.x, 0, world.z);

    // face table center
    const center = new THREE.Vector3(0, 1.6, 0).add(roomGroup.position);
    faceYawToward(center);
  }

  function forceSpawnForRoom(room){
    if (room === "lobby") {
      player.position.copy(ROOM_POS.lobby).add(new THREE.Vector3(0, 0, 12.0));
      faceYawToward(ROOM_POS.lobby.clone().add(new THREE.Vector3(0,1.6,6.0)));
    }
    if (room === "store") {
      player.position.copy(ROOM_POS.store).add(new THREE.Vector3(0, 0, 9.0));
      faceYawToward(ROOM_POS.store.clone().add(new THREE.Vector3(0,1.6,0)));
    }
    if (room === "scorpion") {
      // spawn in a safe corner, facing table
      const g = S.rooms.groups.scorpion;
      const world = g.position.clone().add(new THREE.Vector3(5.4, 0, 5.4));
      player.position.set(world.x, 0, world.z);
      faceYawToward(g.position.clone().add(new THREE.Vector3(0,1.6,0)));
    }
    if (room === "spectate") {
      player.position.copy(ROOM_POS.spectate).add(new THREE.Vector3(0, 0, 6.0));
      faceYawToward(ROOM_POS.spectate.clone().add(new THREE.Vector3(0,1.6,0)));
    }
  }

  function faceYawToward(target){
    const pos = new THREE.Vector3(player.position.x, 1.6, player.position.z);
    const dir = target.clone().sub(pos);
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) return;
    dir.normalize();
    player.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
  }

  // ---------- neon rails ----------
  function buildNeonRailRing(g, radius, color, thickness, gold=false){
    const baseMat = new THREE.MeshStandardMaterial({
      color: gold ? 0x2a2208 : 0x0b0d14,
      roughness: 0.45,
      metalness: gold ? 0.55 : 0.25
    });

    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(radius, thickness, 18, 160),
      baseMat
    );
    rail.rotation.x = Math.PI/2;
    rail.position.y = 0.06;
    g.add(rail);

    // glow shell
    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(radius, thickness*1.55, 18, 160),
      new THREE.MeshBasicMaterial({ color, transparent:true, opacity: gold ? 0.12 : 0.10 })
    );
    glow.rotation.x = Math.PI/2;
    glow.position.y = 0.06;
    g.add(glow);

    // small “neon stripe”
    const stripe = new THREE.Mesh(
      new THREE.TorusGeometry(radius, thickness*0.45, 18, 160),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: gold ? 1.15 : 0.95,
        roughness: 0.25,
        metalness: 0.1
      })
    );
    stripe.rotation.x = Math.PI/2;
    stripe.position.y = 0.07;
    g.add(stripe);
  }

  // ---------- lobby walkers ----------
  function spawnLobbyWalkers(g, count){
    S.lobby.walkers.length = 0;
    for (let i=0;i<count;i++){
      const bot = makeWalkerBot(i);
      bot.position.set((Math.random()-0.5)*16, 0, (Math.random()-0.5)*16);
      bot.userData.walk = { r: 10+Math.random()*4, a: Math.random()*Math.PI*2, s: 0.16+Math.random()*0.18, wobble: Math.random()*10 };
      g.add(bot);
      S.lobby.walkers.push(bot);
    }
  }
  function updateLobbyWalkers(dt){
    for (const b of S.lobby.walkers){
      const w = b.userData.walk;
      w.a += dt*w.s;
      b.position.x = Math.cos(w.a)*w.r;
      b.position.z = Math.sin(w.a)*w.r;
      b.rotation.y = Math.atan2(-Math.sin(w.a), -Math.cos(w.a));
      b.position.y = 0.02*Math.sin((S.lobby.t*2.1)+w.wobble);
    }
  }

  // ---------- poker table set ----------
  function buildPokerTableSet(roomGroup, P, opts){
    const { tableZ, accent, logoText } = opts;

    const table = new THREE.Group();
    table.position.set(0, 0, tableZ);
    roomGroup.add(table);
    P.tableGroup = table;

    // Felt with simple procedural texture
    const feltTex = makeFeltTexture({ text: logoText, accent });
    const feltMat = new THREE.MeshStandardMaterial({ map: feltTex, color: 0xffffff, roughness: 0.92, metalness: 0.0 });

    const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.10, 72), feltMat);
    felt.scale.set(1.25, 1.0, 0.78);
    felt.position.y = 1.02;
    table.add(felt);
    P.felt = felt;

    // Neon pass line ring
    const pass = new THREE.Mesh(
      new THREE.RingGeometry(1.52, 1.56, 120),
      new THREE.MeshBasicMaterial({ color: 0xffee55, transparent:true, opacity:0.22 })
    );
    pass.rotation.x = -Math.PI/2;
    pass.position.y = 1.031;
    pass.scale.set(1.35, 1.0, 0.92);
    table.add(pass);

    // Rail
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(2.55, 0.20, 18, 140),
      new THREE.MeshStandardMaterial({ color: 0x241c16, roughness: 0.82, metalness: 0.08 })
    );
    rail.rotation.x = Math.PI/2;
    rail.position.y = 1.03;
    rail.scale.set(1.12, 1.0, 0.86);
    table.add(rail);

    // Shoe
    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.40, 0.20, 0.58),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness:0.65, metalness:0.25 })
    );
    shoe.position.set(0, 1.06, -0.60);
    table.add(shoe);
    P.shoe = shoe;

    // Pot
    const pot = makeChipPot(18);
    pot.position.set(0, 1.045, 0.02);
    table.add(pot);
    P.pot = pot;

    // Seats/bots/chips/cards
    buildPokerSeatsBotsAndChips(roomGroup, table, P);
    buildCardMeshes(table, P);
  }

  function buildPokerSeatsBotsAndChips(roomGroup, table, P){
    P.bots.length = 0;
    P.seats.length = 0;
    P.hole.length = 0;

    const botCount = 8;
    const radius = 3.05;
    const center = new THREE.Vector3(0, 0, table.position.z).add(roomGroup.position);

    const SEAT_Y = 0.48;
    const SIT_BACK = 0.12;
    const SIT_UP = 0.02;

    for (let i=0;i<botCount;i++){
      const ang = (i/botCount)*Math.PI*2;

      const chair = makeChair();
      const cx = Math.cos(ang)*radius;
      const cz = table.position.z + Math.sin(ang)*radius;

      chair.position.set(cx, 0, cz);
      faceObjectYawAtLocal(chair, new THREE.Vector3(0,0,table.position.z));
      roomGroup.add(chair);

      // ✅ chair-anchored seat point
      const seatAnchor = new THREE.Vector3(0, SEAT_Y + SIT_UP, SIT_BACK);
      seatAnchor.applyQuaternion(chair.quaternion);
      seatAnchor.add(chair.position);

      P.seats.push({ pos: seatAnchor.clone(), ang });

      const bot = makeFullBodySeatedBot(i);
      bot.position.copy(seatAnchor);
      faceObjectYawAtLocal(bot, new THREE.Vector3(0,0,table.position.z));
      bot.userData.baseY = bot.position.y;
      roomGroup.add(bot);
      P.bots.push(bot);

      const stack = makeChipStack(14 + (i % 6), { dark:false });
      stack.position.set(Math.cos(ang)*1.7, 1.05, table.position.z + Math.sin(ang)*1.25);
      table.add(stack);

      P.hole.push([]);
    }
  }

  function faceObjectYawAtLocal(obj, targetLocal){
    const pos = new THREE.Vector3(obj.position.x, 0, obj.position.z);
    const dir = targetLocal.clone().sub(pos);
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) return;
    dir.normalize();
    obj.rotation.y = Math.atan2(dir.x, dir.z);
  }

  function buildCardMeshes(table, P){
    // community
    for (const m of P.community) table.remove(m);
    P.community.length = 0;
    for (let i=0;i<5;i++){
      const card = makeCardMesh();
      card.position.set(-0.55 + i*0.275, 1.045, 0.30);
      card.rotation.x = -Math.PI/2;
      card.visible = false;
      table.add(card);
      P.community.push(card);
    }

    // hole cards
    for (let s=0;s<P.seats.length;s++){
      const seat = P.seats[s];
      const center = new THREE.Vector3(0, 1.045, table.position.z);
      const dir = new THREE.Vector3(seat.pos.x, 0, seat.pos.z).sub(new THREE.Vector3(0,0,table.position.z)).normalize();
      const base = center.clone().addScaledVector(dir, 1.08);
      base.y = 1.045;

      const c1 = makeCardMesh();
      const c2 = makeCardMesh();
      c1.position.copy(base).add(new THREE.Vector3(-0.06, 0, 0.02));
      c2.position.copy(base).add(new THREE.Vector3( 0.06, 0,-0.02));
      c1.rotation.x = -Math.PI/2; c2.rotation.x = -Math.PI/2;
      c1.visible = false; c2.visible = false;
      table.add(c1); table.add(c2);
      P.hole[s] = [c1,c2];
    }
  }

  function animatePokerBots(P){
    for (let i=0;i<P.bots.length;i++){
      const b = P.bots[i];
      const t = P.t + i*0.6;
      const head = b.getObjectByName("head");
      if (head){
        head.rotation.y = 0.12*Math.sin(t*0.7);
        head.rotation.x = 0.06*Math.sin(t*0.9);
      }
      b.position.y = (b.userData.baseY ?? b.position.y) + 0.008*Math.sin(t*1.2);
    }
  }

  function startAutoHands(P){
    if (P._auto) return;
    P._auto = true;

    const loop = () => {
      if (!P._auto) return;
      if (P.handState === "idle") startHand(P);
      setTimeout(loop, 7000);
    };
    setTimeout(loop, 1200);
  }

  function startHand(P){
    if (P.handState !== "idle") return;
    for (const c of P.community) c.visible = false;
    for (const pair of P.hole){ pair[0].visible=false; pair[1].visible=false; }

    const mat = P.felt.material;
    const original = mat.color.getHex();
    mat.color.setHex(0x16a065);
    setTimeout(()=> mat.color.setHex(original), 160);

    P.handState = "deal_hole";
    P.stepT = 0;
  }

  function updatePokerDealing(dt, P){
    if (P.handState === "idle") return;
    P.stepT += dt;

    if (P.handState === "deal_hole"){
      const idx = Math.floor(P.stepT / 0.12);
      if (idx >= P.seats.length*2){ P.handState="deal_flop"; P.stepT=0; return; }
      const seat = Math.floor(idx/2);
      const which = idx%2;
      const card = P.hole[seat]?.[which];
      if (card) card.visible = true;
      return;
    }

    if (P.handState === "deal_flop"){
      if (P.stepT > 0.6){
        P.community[0].visible=true; P.community[1].visible=true; P.community[2].visible=true;
        P.handState="deal_turn"; P.stepT=0;
      }
      return;
    }

    if (P.handState === "deal_turn"){
      if (P.stepT > 0.9){ P.community[3].visible=true; P.handState="deal_river"; P.stepT=0; }
      return;
    }

    if (P.handState === "deal_river"){
      if (P.stepT > 0.9){ P.community[4].visible=true; P.handState="showdown"; P.stepT=0; }
      return;
    }

    if (P.handState === "showdown"){
      if (P.stepT > 1.4){ P.handState="idle"; }
    }
  }

  // ---------- VR lasers + click ----------
  function buildLasers(){
    S.lasers.length = 0;
    if (!controllers || !controllers.length) return;

    for (const c of controllers){
      const geom = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1) ]);
      const mat = new THREE.LineBasicMaterial({ color:0x7fe7ff, transparent:true, opacity:0.95 });
      const line = new THREE.Line(geom, mat);
      line.scale.z = 10;
      c.add(line);

      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 16), new THREE.MeshBasicMaterial({ color:0xff2d7a }));
      dot.visible=false;
      scene.add(dot);

      S.lasers.push({ controller:c, line, dot });
    }
  }

  function wireControllerEvents(){
    if (!controllers || !controllers.length) return;

    for (const c of controllers){
      c.addEventListener("selectstart", ()=>{
        if (S.tp.aiming && S.tp.lastValid && S.tp.cooldown <= 0){
          doTeleport();
          S.tp.cooldown = 0.25;
          return;
        }
        clickRay(c);
      });

      c.addEventListener("squeezestart", ()=>{ S.tp.aiming=true; });
      c.addEventListener("squeezeend", ()=>{
        S.tp.aiming=false; S.tp.lastValid=false;
        if (S.tp.marker) S.tp.marker.visible=false;
        if (S.tp.arc) S.tp.arc.visible=false;
      });
    }
  }

  function updateRays(){
    if (!S.lasers.length) return;
    const objs = S.clickables;

    for (const laser of S.lasers){
      const c = laser.controller;

      S.tmpMat.identity().extractRotation(c.matrixWorld);
      const origin = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
      const dir = new THREE.Vector3(0,0,-1).applyMatrix4(S.tmpMat).normalize();

      S.raycaster.set(origin, dir);
      S.raycaster.far = 60;

      const hits = S.raycaster.intersectObjects(objs, true);
      if (hits.length){
        const h = hits[0];
        laser.dot.visible=true;
        laser.dot.position.copy(h.point);
        laser.line.scale.z = origin.distanceTo(h.point);
        setHovered(climbClickable(h.object));
      } else {
        laser.dot.visible=false;
        laser.line.scale.z = 10;
        setHovered(null);
      }
    }
  }

  function clickRay(controller){
    S.tmpMat.identity().extractRotation(controller.matrixWorld);
    const origin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
    const dir = new THREE.Vector3(0,0,-1).applyMatrix4(S.tmpMat).normalize();

    S.raycaster.set(origin, dir);
    S.raycaster.far = 60;

    const hits = S.raycaster.intersectObjects(S.clickables, true);
    if (!hits.length) return;

    const hitObj = climbClickable(hits[0].object);
    hitObj?.userData?.onClick?.();
  }

  function climbClickable(obj){
    let o=obj;
    while (o && !o.userData?.onClick && o.parent) o=o.parent;
    return o;
  }

  function setHovered(obj){
    if (S.hovered === obj) return;
    S.hovered = obj;
  }

  // ---------- teleport (VR arc) ----------
  function buildTeleport(){
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.38, 48),
      new THREE.MeshBasicMaterial({ color:0x7fe7ff, transparent:true, opacity:0.85 })
    );
    marker.rotation.x = -Math.PI/2;
    marker.visible=false;
    scene.add(marker);
    S.tp.marker = marker;

    const arcGeom = new THREE.BufferGeometry();
    arcGeom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3*40), 3));
    const arcMat = new THREE.LineBasicMaterial({ color:0x7fe7ff, transparent:true, opacity:0.65 });
    const arc = new THREE.Line(arcGeom, arcMat);
    arc.visible=false;
    scene.add(arc);
    S.tp.arc = arc;
  }

  function updateTeleportAim(){
    const c = controllers[1] || controllers[0];
    if (!c) return;

    S.tmpMat.identity().extractRotation(c.matrixWorld);
    const origin = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
    const forward = new THREE.Vector3(0,0,-1).applyMatrix4(S.tmpMat).normalize();

    const g = new THREE.Vector3(0,-9.8,0);
    const v0 = forward.clone().multiplyScalar(7.5);

    const pts = [];
    let last = origin.clone();
    let hit = null;

    for (let i=0;i<40;i++){
      const t = i*0.04;
      const p = origin.clone().add(v0.clone().multiplyScalar(t)).add(g.clone().multiplyScalar(0.5*t*t));
      pts.push(p);
      if (p.y <= 0.02){ hit = p.clone(); hit.y = 0.01; break; }
      last = p;
    }

    const pos = S.tp.arc.geometry.attributes.position.array;
    for (let i=0;i<40;i++){
      const p = pts[Math.min(i, pts.length-1)] || last;
      pos[i*3+0]=p.x; pos[i*3+1]=p.y; pos[i*3+2]=p.z;
    }
    S.tp.arc.geometry.attributes.position.needsUpdate = true;
    S.tp.arc.visible = true;

    if (hit){
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

  function doTeleport(){
    const p = S.tp.hit;
    if (!p) return;
    player.position.set(p.x, 0, p.z);
  }

  // ---------- locomotion ----------
  function locomotion(dt){
    const left = controllers[0];
    const right = controllers[1];

    const la = left?.userData?.axes || [0,0,0,0];
    const ra = right?.userData?.axes || [0,0,0,0];

    const mx = la[2] ?? la[0] ?? 0;
    const my = la[3] ?? la[1] ?? 0;

    const dead = 0.15;
    const ax = Math.abs(mx) > dead ? mx : 0;
    const ay = Math.abs(my) > dead ? my : 0;

    if (ax || ay){
      const forward = new THREE.Vector3(0,0,-1).applyQuaternion(player.quaternion);
      forward.y = 0; forward.normalize();
      const rightV = new THREE.Vector3(1,0,0).applyQuaternion(player.quaternion);
      rightV.y = 0; rightV.normalize();

      const v = new THREE.Vector3();
      v.addScaledVector(rightV, ax);
      v.addScaledVector(forward, ay);
      if (v.lengthSq() > 1e-6) v.normalize();
      player.position.addScaledVector(v, dt*S.move.speed);
    }

    const turnX = ra[2] ?? ra[0] ?? 0;
    if (S.move.snapCooldown <= 0 && Math.abs(turnX) > 0.65){
      player.rotation.y -= Math.sign(turnX) * S.move.snap;
      S.move.snapCooldown = 0.28;
    }
  }

  // ---------- solid walls (clamp) ----------
  function clampPlayerToRoomBounds(){
    const room = S.rooms.current;
    const g = S.rooms.groups[room];
    if (!g) return;

    const b = S.rooms.bounds[room];
    const halfW = (b.w/2) - 0.8;
    const halfD = (b.d/2) - 0.8;

    // Convert player world position to local room position
    const local = player.position.clone().sub(g.position);
    local.x = Math.max(-halfW, Math.min(halfW, local.x));
    local.z = Math.max(-halfD, Math.min(halfD, local.z));

    // Back to world
    const clamped = local.add(g.position);
    player.position.set(clamped.x, 0, clamped.z);
  }

  // ---------- textures + meshes ----------
  function makeFeltTexture({ text="SCARLETT", accent=0xff2d7a }){
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 1024; canvas.height = 1024;

    ctx.fillStyle = "#0f5f3d";
    ctx.fillRect(0,0,1024,1024);

    ctx.globalAlpha = 0.10;
    for (let i=0;i<2200;i++){
      ctx.fillStyle = `rgba(0,0,0,${Math.random()*0.8})`;
      ctx.fillRect(Math.random()*1024, Math.random()*1024, 1, 1);
    }
    ctx.globalAlpha = 1;

    ctx.beginPath(); ctx.arc(512,512,180,0,Math.PI*2);
    ctx.fillStyle="rgba(0,0,0,0.18)"; ctx.fill();

    ctx.beginPath(); ctx.arc(512,512,205,0,Math.PI*2);
    ctx.strokeStyle="rgba(255,220,80,0.22)"; ctx.lineWidth=10; ctx.stroke();

    ctx.fillStyle="rgba(255,255,255,0.82)";
    ctx.font="900 84px system-ui, Arial";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("🦂", 512, 440);
    ctx.font="900 64px system-ui, Arial";
    ctx.fillText(text, 512, 520);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }

  function makePad(label, color){
    const g = new THREE.Group();
    const disk = new THREE.Mesh(
      new THREE.CircleGeometry(0.62, 64),
      new THREE.MeshStandardMaterial({ color:0x0b0d14, roughness:0.8, metalness:0.2 })
    );
    disk.rotation.x = -Math.PI/2;
    disk.position.y = 0.01;
    g.add(disk);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.62, 64),
      new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.72 })
    );
    ring.rotation.x = -Math.PI/2;
    ring.position.y = 0.012;
    g.add(ring);

    const t = makeBillboard(label, 0.65);
    t.position.set(0, 0.38, 0);
    g.add(t);

    g.userData.onClick = ()=>{};
    return g;
  }

  function makeBillboard(text, scale=1){
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 512; canvas.height = 256;

    ctx.fillStyle = "rgba(11,13,20,0.86)";
    roundRect(ctx, 24, 48, 464, 160, 28); ctx.fill();

    ctx.strokeStyle = "rgba(127,231,255,0.55)";
    ctx.lineWidth = 4;
    roundRect(ctx, 24, 48, 464, 160, 28); ctx.stroke();

    ctx.fillStyle = "#e8ecff";
    ctx.font = "bold 44px system-ui, Arial";
    ctx.textAlign="center"; ctx.textBaseline="middle";

    const lines = String(text).split("\n");
    if (lines.length === 1) ctx.fillText(lines[0], 256, 128);
    else {
      const baseY = 128 - (lines.length-1)*26;
      for (let i=0;i<lines.length;i++) ctx.fillText(lines[i], 256, baseY + i*52);
    }

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent:true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6*scale, 0.8*scale), mat);

    mesh.onBeforeRender = ()=> mesh.quaternion.copy(camera.quaternion);
    return mesh;
  }

  function roundRect(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }

  function makeChair(){
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color:0x14151d, roughness:0.9 });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.08,0.55), mat);
    seat.position.y = 0.48;
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.55,0.08), mat);
    back.position.set(0, 0.78, -0.235);
    g.add(back);

    const legMat = new THREE.MeshStandardMaterial({ color:0x0b0d14, roughness:0.8, metalness:0.2 });
    const legGeom = new THREE.CylinderGeometry(0.03,0.03,0.45,12);
    const lx=0.23,lz=0.23;
    for (const sx of [-1,1]) for (const sz of [-1,1]){
      const leg = new THREE.Mesh(legGeom, legMat);
      leg.position.set(sx*lx, 0.225, sz*lz);
      g.add(leg);
    }
    return g;
  }

  function makeWalkerBot(i){
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18,0.75,6,14),
      new THREE.MeshStandardMaterial({ color:0x1b1c26, roughness:0.9 })
    );
    body.position.y = 1.0; g.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.15,22,22),
      new THREE.MeshStandardMaterial({ color:0x222433, roughness:0.65 })
    );
    head.position.y = 1.55; head.name="head"; g.add(head);

    const eyeMat = new THREE.MeshBasicMaterial({ color:0x7fe7ff });
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.015,10,10), eyeMat);
    e1.position.set(0.05,1.56,0.13);
    const e2 = e1.clone(); e2.position.x = -0.05;
    g.add(e1,e2);

    return g;
  }

  function makeFullBodySeatedBot(i){
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color:0x1b1c26, roughness:0.9 });
    const limbMat = new THREE.MeshStandardMaterial({ color:0x14151d, roughness:0.85 });
    const headMat = new THREE.MeshStandardMaterial({ color:0x222433, roughness:0.65 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18,0.55,6,14), bodyMat);
    torso.position.y = 0.58;
    g.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15,22,22), headMat);
    head.position.y = 1.04; head.name="head"; g.add(head);

    const eyeMat = new THREE.MeshBasicMaterial({ color:0x7fe7ff });
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.015,10,10), eyeMat);
    e1.position.set(0.05,1.05,0.13);
    const e2 = e1.clone(); e2.position.x = -0.05;
    g.add(e1,e2);

    // arms
    const upperArmGeom = new THREE.CylinderGeometry(0.03,0.03,0.34,12);
    const foreArmGeom  = new THREE.CylinderGeometry(0.028,0.028,0.30,12);
    const arm = (side=1)=>{
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

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.04,12,12), limbMat);
      hand.position.set(0, -0.30, 0.05);
      elbow.add(hand);
    };
    arm(1); arm(-1);

    // legs
    const thighGeom = new THREE.CylinderGeometry(0.04,0.04,0.36,12);
    const calfGeom  = new THREE.CylinderGeometry(0.035,0.035,0.34,12);
    const leg = (side=1)=>{
      const hip = new THREE.Group();
      hip.position.set(0.11*side, 0.42, 0.08);
      g.add(hip);

      const thigh = new THREE.Mesh(thighGeom, limbMat);
      thigh.rotation.x = Math.PI/2.25;
      thigh.position.z = 0.18;
      hip.add(thigh);

      const knee = new THREE.Group();
      knee.position.set(0, 0, 0.36);
      thigh.add(knee);

      const calf = new THREE.Mesh(calfGeom, limbMat);
      calf.rotation.x = -Math.PI/2.05;
      calf.position.y = -0.17;
      knee.add(calf);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.10,0.05,0.18), limbMat);
      foot.position.set(0, -0.34, 0.02);
      knee.add(foot);
    };
    leg(1); leg(-1);

    return g;
  }

  function makeChipStack(n, opts={dark:false}){
    const g = new THREE.Group();
    const colors = opts.dark ? [0x2b2d3a,0x1b1c26,0x0b0d14] : [0xff2d7a,0x7fe7ff,0xffcc00,0x4cd964,0xffffff];
    for (let i=0;i<n;i++){
      const mat = new THREE.MeshStandardMaterial({ color: colors[i%colors.length], roughness:0.42, metalness:0.15 });
      const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.015,18), mat);
      chip.position.y = i*0.016;
      g.add(chip);
    }
    return g;
  }

  function makeChipPot(n=18){
    const g = new THREE.Group();
    const colors = [0xff2d7a,0x7fe7ff,0xffcc00,0xffffff];
    for (let i=0;i<n;i++){
      const mat = new THREE.MeshStandardMaterial({ color: colors[i%colors.length], roughness:0.45, metalness:0.12 });
      const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,0.013,18), mat);
      const a = Math.random()*Math.PI*2, r = Math.random()*0.18;
      chip.position.set(Math.cos(a)*r, 0.010+(i*0.004), Math.sin(a)*r);
      chip.rotation.y = Math.random()*Math.PI;
      g.add(chip);
    }
    return g;
  }

  function makeCardMesh(){
    return new THREE.Mesh(
      new THREE.PlaneGeometry(0.20,0.28),
      new THREE.MeshStandardMaterial({ color:0xf3f4ff, roughness:0.65 })
    );
  }

  function buildArchTeleporter(){
    const g = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.35, 0.12, 72),
      new THREE.MeshStandardMaterial({ color:0x0b0d14, roughness:0.85, metalness:0.15 })
    );
    base.position.y = 0.06;
    g.add(base);

    const frameMat = new THREE.MeshStandardMaterial({ color:0x10131e, roughness:0.6, metalness:0.25 });
    const pillarGeom = new THREE.BoxGeometry(0.18, 2.25, 0.18);
    const p1 = new THREE.Mesh(pillarGeom, frameMat);
    const p2 = new THREE.Mesh(pillarGeom, frameMat);
    p1.position.set(-0.78, 1.125, 0);
    p2.position.set(0.78, 1.125, 0);
    g.add(p1,p2);

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.80,0.18,0.18), frameMat);
    top.position.set(0, 2.25, 0);
    g.add(top);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.95,0.06,14,120),
      new THREE.MeshStandardMaterial({ color:0x7fe7ff, roughness:0.25, metalness:0.15, emissive:0x052128, emissiveIntensity:1.0 })
    );
    ring.position.set(0, 1.35, 0);
    ring.rotation.y = Math.PI/2;
    g.add(ring);

    const coil = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.55,0.035,140,16),
      new THREE.MeshBasicMaterial({ color:0xff2d7a, transparent:true, opacity:0.22 })
    );
    coil.position.set(0, 1.35, 0);
    coil.rotation.x = Math.PI/2;
    g.add(coil);

    const label = makeBillboard("ARCH TELEPORT", 0.7);
    label.position.set(0, 2.95, 0);
    g.add(label);

    g.userData.onClick = ()=>{};
    return g;
  }

  // ---------- return ----------
  return {
    init, update,
    clickFromCamera, teleportFromCamera,
    setControllers, rebuildLasers,
    goRoom, teleportToTable
  };
})();
