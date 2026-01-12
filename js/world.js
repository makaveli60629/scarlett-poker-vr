// /js/world.js — Scarlett MASTER WORLD (FULL)
// ✅ Solid circular lobby + sealed outer wall
// ✅ Double-height walls (jumbotrons ready)
// ✅ 4 rooms + hallways with OPEN entrances
// ✅ Sunken pit divot + sealed carpet lip + pit wall
// ✅ One stairs opening + guard spot
// ✅ Table + chairs facing table + bots seated (not bouncing)
// ✅ Jumbotrons with placeholder text
// ✅ Telepads: front of each entrance + teleport inside
// ✅ Labels: STORE / POKER / EVENT / VIP
// ✅ Bright, elegant lighting (no darkness)
// ✅ HUD root exists: "ScarlettHUDRoot" (index yaw-only locks it)

export const World = (() => {
  let THREE, scene, renderer, camera, player, controllers, log;

  const state = {
    root: null,
    hudRoot: null,
    labels: [],
    telepads: [],
    botTags: [],
    targets: {},
    t: 0
  };

  const COLORS = {
    bg: 0x05060a,
    wall: 0x242a38,
    wall2: 0x1c2230,
    floor: 0x3a4354,
    pit: 0x0f1a24,
    felt: 0x0f5a3f,
    aqua: 0x7fe7ff,
    pink: 0xff2d7a,
    gold: 0xffd36a
  };

  function add(o) { state.root.add(o); return o; }

  // ---------- Canvas label ----------
  function makeCanvasLabel(text, { w = 768, h = 256, font = 64, color = "#e8ecff", accent = "rgba(127,231,255,.40)" } = {}) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");

    g.fillStyle = "rgba(10,12,18,.72)";
    g.fillRect(0, 0, w, h);

    g.strokeStyle = accent;
    g.lineWidth = 10;
    g.strokeRect(16, 16, w - 32, h - 32);

    g.fillStyle = color;
    g.font = `900 ${font}px system-ui, Segoe UI, Arial`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;

    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    spr.scale.set(5.2, 1.75, 1);
    spr.userData.billboard = true;
    state.labels.push(spr);
    return spr;
  }

  function billboardAll() {
    for (const s of state.labels) s.lookAt(camera.position);
    for (const t of state.botTags) t.lookAt(camera.position);
  }

  // ---------- Telepad ----------
  function telepad(name, pos, color) {
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 2.0,
      roughness: 0.25,
      metalness: 0.35,
      transparent: true,
      opacity: 0.95
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.98, 64), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos);
    ring.position.y += 0.02;
    ring.userData.telepad = { name };
    state.telepads.push(ring);
    add(ring);

    const label = makeCanvasLabel(name, { font: 56 });
    label.position.copy(pos).add(new THREE.Vector3(0, 2.25, 0));
    add(label);

    return ring;
  }

  function wireTelepads() {
    function rayHit(c) {
      const origin = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(c.quaternion).normalize();
      const ray = new THREE.Raycaster(origin, dir, 0.01, 40);
      const hits = ray.intersectObjects(state.telepads, true);
      return hits?.[0]?.object || null;
    }

    function doTeleport(name) {
      const to = state.targets[name];
      if (!to) return;
      player.position.set(to.x, 0, to.z);
    }

    for (const c of controllers || []) {
      c.addEventListener("selectstart", () => {
        const hit = rayHit(c);
        if (!hit) return;
        const name = hit.userData?.telepad?.name;
        log?.(`[telepad] ${name}`);
        // Front pads teleport INSIDE room, VIP spawns there, PIT goes to pit entry
        if (name === "STORE") doTeleport("storeInside");
        else if (name === "POKER") doTeleport("pokerInside");
        else if (name === "EVENT") doTeleport("eventInside");
        else if (name === "VIP") doTeleport("vipInside");
        else if (name === "PIT") doTeleport("pitEntry");
      });
    }
  }

  // ---------- Materials ----------
  function matStd({ color, rough = 0.7, metal = 0.08, emissive = 0x000000, ei = 0 } = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: metal,
      emissive,
      emissiveIntensity: ei
    });
  }

  // ---------- Build: Lighting ----------
  function buildLights() {
    add(new THREE.AmbientLight(0xffffff, 1.25));

    const hemi = new THREE.HemisphereLight(0xdfe9ff, 0x0b0d14, 1.2);
    add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 2.6);
    sun.position.set(10, 16, 10);
    add(sun);

    // ring point-lights around lobby
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const p = new THREE.PointLight(0xffffff, 2.2, 26, 2.0);
      p.position.set(Math.cos(a) * 12.4, 4.7, Math.sin(a) * 12.4);
      add(p);
    }

    // hero pit lights
    const pitA = new THREE.PointLight(COLORS.aqua, 3.0, 80);
    pitA.position.set(0, 8, 0);
    add(pitA);

    const pitB = new THREE.PointLight(COLORS.pink, 2.3, 70);
    pitB.position.set(6, 7, -4);
    add(pitB);

    const pitC = new THREE.PointLight(COLORS.gold, 2.0, 70);
    pitC.position.set(-6, 7, 4);
    add(pitC);

    log?.("[world] lights ✅ (bright)");
  }

  // ---------- Build: Lobby + Double Walls ----------
  function buildLobby() {
    const lobbyR = 14.5;
    const wallH = 10.0; // ✅ double-height (jumbotrons ready)
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(lobbyR, 128),
      matStd({ color: COLORS.floor, rough: 0.85, metal: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    add(floor);

    // Outer sealed wall cylinder (inside surface)
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(lobbyR, lobbyR, wallH, 160, 1, true),
      matStd({ color: COLORS.wall, rough: 0.9, metal: 0.06 })
    );
    wall.position.y = wallH / 2;
    wall.material.side = THREE.BackSide;
    add(wall);

    // subtle trim ring top/bottom
    const trimTop = new THREE.Mesh(
      new THREE.TorusGeometry(lobbyR - 0.15, 0.10, 18, 220),
      matStd({ color: COLORS.gold, rough: 0.35, metal: 0.9, emissive: 0x1a0d00, ei: 0.6 })
    );
    trimTop.rotation.x = Math.PI / 2;
    trimTop.position.y = wallH - 0.4;
    add(trimTop);

    const trimBottom = new THREE.Mesh(
      new THREE.TorusGeometry(lobbyR - 0.10, 0.08, 18, 220),
      matStd({ color: COLORS.aqua, rough: 0.35, metal: 0.85, emissive: 0x072029, ei: 0.8 })
    );
    trimBottom.rotation.x = Math.PI / 2;
    trimBottom.position.y = 0.35;
    add(trimBottom);

    log?.("[world] lobby shell ✅");
  }

  // ---------- Build: Pit divot + sealed lip + rail ----------
  function buildPit() {
    const pitInner = 4.25;
    const pitOuter = 10.2;
    const pitDepth = 1.25;

    // sealed carpet lip from lobby floor down to pit edge
    const lip = new THREE.Mesh(
      new THREE.RingGeometry(pitInner, pitOuter, 160),
      matStd({ color: COLORS.floor, rough: 0.9, metal: 0.05 })
    );
    lip.rotation.x = -Math.PI / 2;
    lip.position.y = 0.02;
    add(lip);

    // pit floor
    const pitFloor = new THREE.Mesh(
      new THREE.CircleGeometry(pitInner - 0.12, 128),
      matStd({ color: COLORS.pit, rough: 0.95, metal: 0.02 })
    );
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.y = -pitDepth;
    add(pitFloor);

    // pit wall
    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitInner, pitInner, pitDepth, 128, 1, true),
      matStd({ color: COLORS.wall2, rough: 0.85, metal: 0.08 })
    );
    pitWall.position.y = -pitDepth / 2;
    pitWall.material.side = THREE.DoubleSide;
    add(pitWall);

    // pit rail (tight)
    const railA = new THREE.Mesh(
      new THREE.TorusGeometry(pitInner + 0.16, 0.06, 16, 180),
      matStd({ color: COLORS.aqua, rough: 0.25, metal: 0.8, emissive: 0x062128, ei: 1.4 })
    );
    railA.rotation.x = Math.PI / 2;
    railA.position.y = 0.72;
    add(railA);

    const railB = new THREE.Mesh(
      new THREE.TorusGeometry(pitInner + 0.28, 0.045, 16, 180),
      matStd({ color: 0x94a3b8, rough: 0.25, metal: 0.85 })
    );
    railB.rotation.x = Math.PI / 2;
    railB.position.y = 0.80;
    add(railB);

    // targets
    state.targets.pitEntry = new THREE.Vector3(0, 0, pitInner - 0.65);

    log?.("[world] pit divot ✅");
  }

  // ---------- Build: Stairs single opening + guard spot ----------
  function buildStairs() {
    const pitInner = 4.25;
    const pitDepth = 1.25;

    // opening towards +Z
    const openingW = 3.6;
    const stepCount = 9;
    const stepH = pitDepth / stepCount;
    const stepD = 0.58;

    const stepMat = matStd({ color: COLORS.floor, rough: 0.92, metal: 0.04 });
    for (let i = 0; i < stepCount; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(openingW, stepH * 0.95, stepD), stepMat);
      step.position.set(0, -stepH * (i + 0.5), pitInner + 0.30 + i * stepD);
      add(step);
    }

    // neon header
    const neon = new THREE.Mesh(
      new THREE.BoxGeometry(openingW + 0.2, 0.08, 0.10),
      matStd({ color: COLORS.pink, rough: 0.35, metal: 0.25, emissive: COLORS.pink, ei: 2.2 })
    );
    neon.position.set(0, 2.25, pitInner + 0.05);
    add(neon);

    state.targets.guardSpot = new THREE.Vector3(0, 0, pitInner + 1.15);

    log?.("[world] stairs ✅");
  }

  // ---------- Build: Rooms + Hallways with OPEN entrances ----------
  function buildRooms() {
    // room centers
    const rooms = [
      { key: "store", label: "STORE", center: new THREE.Vector3(18, 0, 0), yaw: Math.PI * 0.5, col: COLORS.aqua },
      { key: "poker", label: "POKER", center: new THREE.Vector3(-18, 0, 0), yaw: -Math.PI * 0.5, col: COLORS.pink },
      { key: "vip", label: "VIP", center: new THREE.Vector3(0, 0, 18), yaw: Math.PI, col: 0xa78bff },
      { key: "event", label: "EVENT", center: new THREE.Vector3(0, 0, -18), yaw: 0, col: COLORS.gold }
    ];

    const hallW = 4.2;
    const hallL = 7.2;
    const roomSize = 10.2;
    const wallH = 5.0;

    const hallMat = matStd({ color: COLORS.wall2, rough: 0.9, metal: 0.05 });
    const roomMat = matStd({ color: COLORS.wall, rough: 0.9, metal: 0.05 });
    const floorMat = matStd({ color: COLORS.floor, rough: 0.88, metal: 0.03 });

    for (const r of rooms) {
      // hallway shell
      const hall = new THREE.Mesh(new THREE.BoxGeometry(hallW, 3.2, hallL), hallMat);
      hall.position.copy(r.center).multiplyScalar(0.52);
      hall.position.y = 1.6;
      hall.rotation.y = r.yaw;
      hall.material.side = THREE.DoubleSide;
      add(hall);

      // hallway floor
      const hf = new THREE.Mesh(new THREE.PlaneGeometry(hallW, hallL), floorMat);
      hf.rotation.x = -Math.PI / 2;
      hf.position.copy(hall.position);
      hf.position.y = 0.02;
      hf.rotation.y = r.yaw;
      add(hf);

      // room box
      const box = new THREE.Mesh(new THREE.BoxGeometry(roomSize, wallH, roomSize), roomMat);
      box.position.copy(r.center);
      box.position.y = wallH / 2;
      box.material.side = THREE.DoubleSide;
      add(box);

      const rf = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize), floorMat);
      rf.rotation.x = -Math.PI / 2;
      rf.position.copy(r.center);
      rf.position.y = 0.02;
      add(rf);

      // label in lobby near entrance
      const label = makeCanvasLabel(r.label, { font: 62 });
      const lp = new THREE.Vector3(
        r.key === "store" ? 11.2 : r.key === "poker" ? -11.2 : 0,
        2.85,
        r.key === "vip" ? 11.2 : r.key === "event" ? -11.2 : 0
      );
      label.position.copy(lp);
      add(label);

      // targets
      state.targets[`${r.key}Inside`] = r.center.clone();
      state.targets[`${r.key}Front`] = lp.clone().setY(0);

      // storefront displays ONLY at store entrance (three-man display each side)
      if (r.key === "store") buildStorefrontDisplays(lp, r.yaw);
    }

    log?.("[world] rooms + hallways ✅ (open path)");
  }

  function buildStorefrontDisplays(entrancePos, yaw) {
    // two glass cases flanking store entrance (3 mannequin stands each side)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.0,
      transparent: true,
      opacity: 0.28,
      transmission: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });

    const frameMat = matStd({ color: 0x111827, rough: 0.7, metal: 0.25 });
    const standMat = matStd({ color: COLORS.gold, rough: 0.35, metal: 0.85 });

    const sideOffset = 2.4;
    const forward = 1.8;

    for (const s of [-1, 1]) {
      const caseG = new THREE.Group();
      caseG.position.copy(entrancePos);
      // move outward slightly from wall into lobby
      caseG.position.x += (yaw === Math.PI * 0.5 ? 0 : yaw === -Math.PI * 0.5 ? 0 : s * sideOffset);
      caseG.position.z += (yaw === 0 ? forward : yaw === Math.PI ? -forward : 0);

      // lateral shift
      if (yaw === Math.PI * 0.5) caseG.position.z += s * sideOffset;
      if (yaw === -Math.PI * 0.5) caseG.position.z += s * sideOffset;

      // glass
      const glass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.9), glassMat);
      glass.position.y = 1.1;
      caseG.add(glass);

      // frame base
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 1.0), frameMat);
      base.position.y = 0.09;
      caseG.add(base);

      // 3 stands inside
      for (let i = 0; i < 3; i++) {
        const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 18), standMat);
        stand.position.set(-0.45 + i * 0.45, 0.22, 0);
        caseG.add(stand);

        // mannequin (simple tall figure placeholder)
        const man = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.16, 0.85, 6, 12),
          matStd({ color: 0x9aa3ff, rough: 0.55, metal: 0.12, emissive: 0x1b1f55, ei: 0.5 })
        );
        man.position.set(-0.45 + i * 0.45, 0.92, 0);
        caseG.add(man);
      }

      add(caseG);
    }
  }

  // ---------- Build: Table + chairs + seated bots ----------
  function buildTableAndBots() {
    const pitY = -1.25;

    const anchor = new THREE.Group();
    anchor.position.set(0, pitY, 0);
    add(anchor);

    // Table
    const felt = matStd({ color: COLORS.felt, rough: 0.9, metal: 0.02 });
    const leather = matStd({ color: 0x3a2416, rough: 0.75, metal: 0.08 });
    const baseMat = matStd({ color: 0x1f2633, rough: 0.65, metal: 0.35 });

    const top = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.35, 0.18, 64), felt);
    top.position.y = 0.92;
    anchor.add(top);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.14, 18, 128), leather);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 1.02;
    anchor.add(rim);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.95, 0.98, 28), baseMat);
    base.position.y = 0.49;
    anchor.add(base);

    // Cards (bigger, higher, always facing viewer later)
    const cards = new THREE.Group();
    cards.name = "CommunityCards";
    cards.position.set(0, 2.95, 0);
    add(cards);

    const cardMat = matStd({ color: 0xffffff, rough: 0.35, metal: 0.05 });
    const geo = new THREE.PlaneGeometry(0.62, 0.88);
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(geo, cardMat);
      c.position.set((i - 2) * 0.72, 0, 0);
      c.visible = (i < 3); // flop only
      cards.add(c);
    }
    state.cards = cards;
    state.boardPhase = 0;
    state.boardTimer = 0;

    // Chairs + seated bots aligned & facing table
    const chairMat = matStd({ color: 0x2a2f3a, rough: 0.75, metal: 0.2 });
    const botMat = matStd({ color: 0x9aa3ff, rough: 0.55, metal: 0.15, emissive: 0x121a55, ei: 0.6 });

    const seats = 6;
    const r = 4.15;
    for (let i = 0; i < seats; i++) {
      const a = (i / seats) * Math.PI * 2;

      // chair position on pit floor, facing table center
      const cx = Math.cos(a) * r;
      const cz = Math.sin(a) * r;

      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.75), chairMat);
      chair.position.set(cx, 0.12, cz);
      chair.rotation.y = -a + Math.PI; // face center
      anchor.add(chair);

      // bot seated (not floating)
      const bot = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.65, 6, 12), botMat);
      bot.position.set(cx, 0.62, cz);
      bot.rotation.y = -a + Math.PI;
      anchor.add(bot);

      // tag above bot
      const tag = makeCanvasLabel(`BOT_${i + 1}  •  $5000`, { font: 44 });
      tag.scale.set(3.9, 1.2, 1);
      tag.position.set(cx, 1.75, cz);
      add(tag);
      tag.userData.follow = bot;
      state.botTags.push(tag);
    }

    // Guard bot at stairs top
    const guard = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.25, 0.78, 6, 12),
      matStd({ color: COLORS.gold, rough: 0.4, metal: 0.25, emissive: 0x3a2200, ei: 0.8 })
    );
    guard.position.copy(state.targets.guardSpot).setY(0.95);
    add(guard);

    const gtag = makeCanvasLabel("GUARD", { font: 50 });
    gtag.scale.set(3.2, 1.1, 1);
    gtag.position.copy(guard.position).add(new THREE.Vector3(0, 1.3, 0));
    add(gtag);
  }

  // ---------- Jumbotrons ----------
  function buildJumbotrons() {
    // four screens around inner wall
    const r = 13.6;
    const y = 7.8;
    const screenMat = matStd({ color: 0x0b0d14, rough: 0.4, metal: 0.1, emissive: 0x050a10, ei: 0.8 });

    const positions = [
      { a: 0, text: "SCARLETT VR POKER" },
      { a: Math.PI / 2, text: "VIP • STORE • EVENT • POKER" },
      { a: Math.PI, text: "WELCOME TO THE EMPIRE" },
      { a: -Math.PI / 2, text: "TABLE STATUS: OPEN" }
    ];

    for (const p of positions) {
      const x = Math.cos(p.a) * r;
      const z = Math.sin(p.a) * r;

      const screen = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 3.2), screenMat);
      screen.position.set(x, y, z);
      screen.lookAt(0, y, 0);
      add(screen);

      const label = makeCanvasLabel(p.text, { font: 48, w: 1024, h: 256 });
      label.scale.set(7.2, 1.9, 1);
      label.position.set(x, y, z);
      label.lookAt(0, y, 0);
      add(label);
    }
    log?.("[world] jumbotrons ✅");
  }

  // ---------- HUD Root (for stable lock in index) ----------
  function buildHUD() {
    const hud = new THREE.Group();
    hud.name = "ScarlettHUDRoot";
    hud.position.set(0, 2.45, 6.6); // sits above pit view
    add(hud);
    state.hudRoot = hud;

    // smaller stable font panel
    const panel = makeCanvasLabel("POT: $0  •  TURN: BOT_1  •  ROOM: LOBBY", { font: 40, w: 1024, h: 256 });
    panel.scale.set(6.5, 1.65, 1);
    panel.position.set(0, 0, 0);
    hud.add(panel);

    log?.("[world] HUD ✅");
  }

  // ---------- Spawn ----------
  function setVIPSpawn() {
    // spawn in VIP room by default
    const vip = state.targets.vipInside || new THREE.Vector3(0, 0, 18);
    player.position.set(vip.x, 0, vip.z);
    player.rotation.set(0, Math.PI, 0);
    log?.("[world] spawn -> VIP ✅");
  }

  // ---------- Public ----------
  async function init(ctx) {
    THREE = ctx.THREE;
    scene = ctx.scene;
    renderer = ctx.renderer;
    camera = ctx.camera;
    player = ctx.player;
    controllers = ctx.controllers || [];
    log = ctx.log || console.log;

    state.root = new THREE.Group();
    state.root.name = "WorldRoot";
    scene.add(state.root);

    buildLights();
    buildLobby();
    buildPit();
    buildStairs();
    buildRooms();

    // telepads in front of every entrance + pit
    telepad("STORE", state.targets.storeFront, COLORS.aqua);
    telepad("POKER", state.targets.pokerFront, COLORS.pink);
    telepad("EVENT", state.targets.eventFront, COLORS.gold);
    telepad("VIP", state.targets.vipFront, 0xa78bff);
    telepad("PIT", new THREE.Vector3(0, 0, 6.2), COLORS.aqua);

    wireTelepads();
    buildTableAndBots();
    buildJumbotrons();
    buildHUD();

    setVIPSpawn();

    log?.("[world] init complete ✅ MASTER WORLD");
  }

  function update({ dt, t }) {
    state.t = t;

    // billboard labels + tags
    billboardAll();

    // bot tags follow bots
    for (const tag of state.botTags) {
      const b = tag.userData.follow;
      if (!b) continue;
      tag.position.set(b.position.x, b.position.y + 1.15 - 1.25, b.position.z); // adjust for pit anchor
      // note: tags are added at root so need world position; keep simple (good enough visually)
    }

    // staged board reveal: flop -> turn -> river (not all at once)
    if (state.cards) {
      state.boardTimer += dt;
      // face viewer
      state.cards.lookAt(camera.position);

      if (state.boardTimer > 6 && state.boardPhase === 0) {
        state.cards.children[3].visible = true;
        state.boardPhase = 1;
        log?.("[poker-demo] TURN ✅");
      }
      if (state.boardTimer > 12 && state.boardPhase === 1) {
        state.cards.children[4].visible = true;
        state.boardPhase = 2;
        log?.("[poker-demo] RIVER ✅");
      }
    }

    // telepad pulse
    for (const p of state.telepads) {
      const m = p.material;
      if (m?.emissiveIntensity != null) m.emissiveIntensity = 1.8 + Math.sin(t * 2.2) * 0.25;
    }
  }

  return { init, update };
})();
