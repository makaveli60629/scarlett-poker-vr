// /js/world.js — Scarlett MASTER WORLD v2 (FIX PACK)
// ✅ Pit visible (no floor blocking it)
// ✅ Table + pit aligned
// ✅ Cards hover + face viewer (upright)
// ✅ Bot tags small + only show when looked at
// ✅ Jumbotrons flat on wall (no billboard)
// ✅ Hallways sit on outer wall with real openings (gaps in wall ring)
// ✅ Storefront displays placed correctly at store entrance
// ✅ Bright Quest-safe lighting

export const World = (() => {
  let THREE, scene, renderer, camera, player, controllers, log;

  const state = {
    root: null,

    // groups
    tableAnchor: null,
    cards: null,

    // UI/labels
    hudRoot: null,
    jumbos: [],
    botTags: [],

    // telepads
    telepads: [],
    targets: {},

    // poker demo timing
    boardPhase: 0,
    boardTimer: 0,

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
    gold: 0xffd36a,
    vip: 0xa78bff
  };

  const add = (o) => (state.root.add(o), o);

  function matStd({ color, rough = 0.8, metal = 0.08, emissive = 0x000000, ei = 0 } = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: metal,
      emissive,
      emissiveIntensity: ei
    });
  }

  // -------------------- TEXT CANVAS --------------------
  function makeCanvasTexture(text, { w = 768, h = 256, font = 58, color = "#e8ecff", accent = "rgba(127,231,255,.40)" } = {}) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");

    g.fillStyle = "rgba(10,12,18,.76)";
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
    return tex;
  }

  function makeSpriteLabel(text, opts = {}) {
    const tex = makeCanvasTexture(text, opts);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    spr.userData.isSpriteLabel = true;
    return spr;
  }

  function makeWallSign(text, { w = 1024, h = 256, font = 48 } = {}) {
    const tex = makeCanvasTexture(text, { w, h, font, accent: "rgba(255,45,122,.35)" });
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.55,
      metalness: 0.10,
      emissive: 0x050a10,
      emissiveIntensity: 0.8
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 1.7), mat);
    plane.userData.isWallSign = true;
    return plane;
  }

  // -------------------- VIEW UTILS --------------------
  function cameraForward(out = new THREE.Vector3()) {
    camera.getWorldDirection(out);
    out.y = 0;
    return out.normalize();
  }

  function faceYawOnly(obj, tilt = -0.10) {
    const dx = camera.position.x - obj.position.x;
    const dz = camera.position.z - obj.position.z;
    const yaw = Math.atan2(dx, dz);
    obj.rotation.set(tilt, yaw, 0);
  }

  // -------------------- LIGHTING (QUEST SAFE) --------------------
  function buildLights() {
    add(new THREE.AmbientLight(0xffffff, 1.05));
    add(new THREE.HemisphereLight(0xdfe9ff, 0x0b0d14, 1.05));

    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(10, 16, 10);
    add(sun);

    // ring lights (only 4)
    const ringR = 12.4;
    const ringY = 5.0;
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const l = new THREE.PointLight(0xffffff, 1.55, 34, 2.0);
      l.position.set(Math.cos(a) * ringR, ringY, Math.sin(a) * ringR);
      add(l);
    }

    // hero pit lights
    const pitA = new THREE.PointLight(COLORS.aqua, 2.0, 80);
    pitA.position.set(0, 8, 0);
    add(pitA);

    const pitB = new THREE.PointLight(COLORS.pink, 1.6, 70);
    pitB.position.set(6, 7, -4);
    add(pitB);

    log?.("[world] lights ✅ (bright + stable)");
  }

  // -------------------- LOBBY + PIT (FIX: HOLE IN FLOOR) --------------------
  function buildLobbyAndPit() {
    const lobbyR = 14.5;
    const wallH = 10.0;

    const pitInner = 4.25;
    const pitOuter = 10.2;
    const pitDepth = 1.25;

    // ✅ Outer lobby floor is a RING so the center is OPEN (pit visible)
    const outerFloor = new THREE.Mesh(
      new THREE.RingGeometry(pitOuter, lobbyR, 160),
      matStd({ color: COLORS.floor, rough: 0.9, metal: 0.04 })
    );
    outerFloor.rotation.x = -Math.PI / 2;
    outerFloor.position.y = 0.02;
    add(outerFloor);

    // Sealed lip from pitInner -> pitOuter (flush)
    const lip = new THREE.Mesh(
      new THREE.RingGeometry(pitInner, pitOuter, 160),
      matStd({ color: COLORS.floor, rough: 0.92, metal: 0.04 })
    );
    lip.rotation.x = -Math.PI / 2;
    lip.position.y = 0.02;
    add(lip);

    // pit floor down below
    const pitFloor = new THREE.Mesh(
      new THREE.CircleGeometry(pitInner - 0.12, 128),
      matStd({ color: COLORS.pit, rough: 0.98, metal: 0.02 })
    );
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.y = -pitDepth;
    add(pitFloor);

    // pit wall cylinder
    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitInner, pitInner, pitDepth, 128, 1, true),
      matStd({ color: COLORS.wall2, rough: 0.88, metal: 0.08 })
    );
    pitWall.position.y = -pitDepth / 2;
    pitWall.material.side = THREE.DoubleSide;
    add(pitWall);

    // tight rail
    const railA = new THREE.Mesh(
      new THREE.TorusGeometry(pitInner + 0.16, 0.06, 16, 180),
      matStd({ color: COLORS.aqua, rough: 0.25, metal: 0.85, emissive: 0x062028, ei: 1.15 })
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

    // outer wall as segmented ring with 4 openings (real door gaps)
    buildSegmentedRingWall({ radius: lobbyR - 0.15, height: wallH, thickness: 0.35 });

    // trim
    const trimTop = new THREE.Mesh(
      new THREE.TorusGeometry(lobbyR - 0.20, 0.10, 18, 220),
      matStd({ color: COLORS.gold, rough: 0.35, metal: 0.9, emissive: 0x1a0d00, ei: 0.55 })
    );
    trimTop.rotation.x = Math.PI / 2;
    trimTop.position.y = wallH - 0.45;
    add(trimTop);

    const trimBottom = new THREE.Mesh(
      new THREE.TorusGeometry(lobbyR - 0.18, 0.08, 18, 220),
      matStd({ color: COLORS.aqua, rough: 0.35, metal: 0.85, emissive: 0x062028, ei: 0.85 })
    );
    trimBottom.rotation.x = Math.PI / 2;
    trimBottom.position.y = 0.35;
    add(trimBottom);

    // targets
    state.targets.pitEntry = new THREE.Vector3(0, 0, pitInner - 0.65);

    log?.("[world] lobby + pit ✅ (pit visible)");
  }

  function buildSegmentedRingWall({ radius, height, thickness }) {
    // 16 segments around circle; skip segments near 4 doorway angles
    const segCount = 16;
    const step = (Math.PI * 2) / segCount;
    const arc = (Math.PI * 2 * radius) / segCount;
    const segW = arc * 0.95;

    const doorAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2]; // +Z, +X, -Z, -X alignment via trig below
    const doorHalfAngle = 0.22; // bigger gap for hallway mouth

    const wallMat = matStd({ color: COLORS.wall, rough: 0.92, metal: 0.06 });

    for (let i = 0; i < segCount; i++) {
      const a = -Math.PI + i * step + step / 2;

      // skip if near any door angle
      let skip = false;
      for (const da of doorAngles) {
        const d = angleDist(a, da);
        if (d < doorHalfAngle) { skip = true; break; }
      }
      if (skip) continue;

      const x = Math.sin(a) * radius;
      const z = Math.cos(a) * radius;

      const seg = new THREE.Mesh(new THREE.BoxGeometry(segW, height, thickness), wallMat);
      seg.position.set(x, height / 2, z);
      seg.rotation.y = a;
      add(seg);
    }
  }

  function angleDist(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d);
  }

  // -------------------- HALLWAYS + ROOMS (OPEN MOUTH) --------------------
  function buildRoomsAndHallways() {
    // hall mouths are at radius ~ lobby wall gap
    const hallStartR = 13.3;
    const hallW = 4.2;
    const hallH = 3.1;
    const hallL = 7.6;

    const roomSize = 10.2;
    const roomH = 5.0;
    const roomDist = 18;

    const hallMat = matStd({ color: COLORS.wall2, rough: 0.9, metal: 0.05 });
    const roomMat = matStd({ color: COLORS.wall, rough: 0.9, metal: 0.05 });
    const floorMat = matStd({ color: COLORS.floor, rough: 0.88, metal: 0.03 });

    const rooms = [
      { key: "vip",   label: "VIP",   dir: new THREE.Vector3(0, 0, 1),  col: COLORS.vip  },
      { key: "store", label: "STORE", dir: new THREE.Vector3(1, 0, 0),  col: COLORS.aqua },
      { key: "event", label: "EVENT", dir: new THREE.Vector3(0, 0, -1), col: COLORS.gold },
      { key: "poker", label: "POKER", dir: new THREE.Vector3(-1, 0, 0), col: COLORS.pink }
    ];

    for (const r of rooms) {
      // hallway center
      const hallCenter = r.dir.clone().multiplyScalar(hallStartR + hallL * 0.5);

      const yaw = Math.atan2(r.dir.x, r.dir.z);

      // floor
      const hf = new THREE.Mesh(new THREE.PlaneGeometry(hallW, hallL), floorMat);
      hf.rotation.x = -Math.PI / 2;
      hf.position.set(hallCenter.x, 0.02, hallCenter.z);
      hf.rotation.y = yaw;
      add(hf);

      // side walls only (open corridor, not a blocking box)
      const side = new THREE.BoxGeometry(hallL, hallH, 0.18);
      const w1 = new THREE.Mesh(side, hallMat);
      const w2 = new THREE.Mesh(side, hallMat);

      // place walls left/right relative to corridor
      w1.position.set(0, hallH / 2, hallW * 0.5);
      w2.position.set(0, hallH / 2, -hallW * 0.5);
      w1.rotation.y = Math.PI / 2;
      w2.rotation.y = Math.PI / 2;

      const hg = new THREE.Group();
      hg.position.set(hallCenter.x, 0, hallCenter.z);
      hg.rotation.y = yaw;
      hg.add(w1, w2);
      add(hg);

      // room
      const roomCenter = r.dir.clone().multiplyScalar(roomDist);
      const room = new THREE.Mesh(new THREE.BoxGeometry(roomSize, roomH, roomSize), roomMat);
      room.position.set(roomCenter.x, roomH / 2, roomCenter.z);
      add(room);

      const rf = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize), floorMat);
      rf.rotation.x = -Math.PI / 2;
      rf.position.set(roomCenter.x, 0.02, roomCenter.z);
      add(rf);

      // lobby entrance label (small & stable - not billboarding)
      const entrance = r.dir.clone().multiplyScalar(12.0);
      const sign = makeWallSign(r.label, { font: 54 });
      sign.position.set(entrance.x, 3.1, entrance.z);
      sign.rotation.y = yaw;
      add(sign);

      // targets
      state.targets[`${r.key}Inside`] = roomCenter.clone();
      state.targets[`${r.key}Front`] = entrance.clone().setY(0);

      // storefront displays only at STORE entrance
      if (r.key === "store") buildStorefrontDisplays(r.dir, entrance, yaw);
    }

    log?.("[world] hallways + rooms ✅ (open mouths)");
  }

  function buildStorefrontDisplays(dir, entrance, yaw) {
    // Put displays flush near the store mouth, not in the center.
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.08,
      metalness: 0.0,
      transparent: true,
      opacity: 0.28,
      transmission: 0.92,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08
    });

    const frameMat = matStd({ color: 0x111827, rough: 0.7, metal: 0.25 });
    const standMat = matStd({ color: COLORS.gold, rough: 0.35, metal: 0.85, emissive: 0x1a0d00, ei: 0.35 });

    // offset left/right perpendicular to dir
    const perp = new THREE.Vector3(dir.z, 0, -dir.x).normalize();

    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      g.position.copy(entrance)
        .add(dir.clone().multiplyScalar(-0.8))      // tuck slightly inward from wall
        .add(perp.clone().multiplyScalar(s * 2.0)); // left/right

      g.rotation.y = yaw;

      const glass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.9), glassMat);
      glass.position.y = 1.1;
      g.add(glass);

      const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 1.0), frameMat);
      base.position.y = 0.09;
      g.add(base);

      // 3 mannequin stands with colored accent lights
      for (let i = 0; i < 3; i++) {
        const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 18), standMat);
        stand.position.set(-0.45 + i * 0.45, 0.22, 0);
        g.add(stand);

        const man = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.16, 0.85, 6, 12),
          matStd({ color: 0x9aa3ff, rough: 0.55, metal: 0.12, emissive: 0x1b1f55, ei: 0.55 })
        );
        man.position.set(-0.45 + i * 0.45, 0.92, 0);
        g.add(man);
      }

      const glow = new THREE.PointLight(s === 1 ? COLORS.aqua : COLORS.pink, 0.75, 6);
      glow.position.set(0, 1.2, 0.6);
      g.add(glow);

      add(g);
    }
  }

  // -------------------- TABLE + BOTS (TAGS SMALL + GAZE ONLY) --------------------
  function buildTableAndBots() {
    const pitDepth = 1.25;
    const pitY = -pitDepth;

    state.tableAnchor = new THREE.Group();
    state.tableAnchor.position.set(0, pitY, 0);
    add(state.tableAnchor);

    const felt = matStd({ color: COLORS.felt, rough: 0.9, metal: 0.02 });
    const leather = matStd({ color: 0x3a2416, rough: 0.75, metal: 0.08 });
    const baseMat = matStd({ color: 0x1f2633, rough: 0.65, metal: 0.35 });

    const top = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.35, 0.18, 64), felt);
    top.position.y = 0.92;
    state.tableAnchor.add(top);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.14, 18, 128), leather);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 1.02;
    state.tableAnchor.add(rim);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.95, 0.98, 28), baseMat);
    base.position.y = 0.49;
    state.tableAnchor.add(base);

    // community cards group (hover)
    state.cards = new THREE.Group();
    state.cards.name = "CommunityCards";
    state.cards.position.set(0, 2.35, 0); // ✅ hover above table, readable
    state.tableAnchor.add(state.cards);

    // cards (upright planes)
    const cardMat = matStd({ color: 0xffffff, rough: 0.35, metal: 0.05 });
    const geo = new THREE.PlaneGeometry(0.62, 0.88);
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(geo, cardMat);
      c.position.set((i - 2) * 0.72, 0, 0);
      c.visible = (i < 3); // flop only at start
      state.cards.add(c);
    }
    state.boardPhase = 0;
    state.boardTimer = 0;

    // chairs + bots (seated)
    const chairMat = matStd({ color: 0x2a2f3a, rough: 0.75, metal: 0.2 });
    const botMat = matStd({ color: 0x9aa3ff, rough: 0.55, metal: 0.15, emissive: 0x121a55, ei: 0.6 });

    const seats = 6;
    const r = 4.15;

    for (let i = 0; i < seats; i++) {
      const a = (i / seats) * Math.PI * 2;
      const cx = Math.cos(a) * r;
      const cz = Math.sin(a) * r;

      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.75), chairMat);
      chair.position.set(cx, 0.12, cz);
      chair.rotation.y = -a + Math.PI;
      state.tableAnchor.add(chair);

      const bot = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.65, 6, 12), botMat);
      bot.position.set(cx, 0.62, cz);
      bot.rotation.y = -a + Math.PI;
      state.tableAnchor.add(bot);

      // ✅ SMALL tag above head, hidden unless looked at
      const tag = makeSpriteLabel(`BOT_${i + 1} • $5000`, { font: 38, w: 768, h: 192 });
      tag.scale.set(2.2, 0.62, 1);     // ✅ small + legible
      tag.position.set(0, 1.05, 0);
      tag.visible = false;
      bot.add(tag);

      tag.userData = { bot, kind: "botTag" };
      state.botTags.push(tag);
    }

    // guard at stairs top
    const guard = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.25, 0.78, 6, 12),
      matStd({ color: COLORS.gold, rough: 0.4, metal: 0.25, emissive: 0x3a2200, ei: 0.8 })
    );
    guard.position.set(0, 0.95, 5.3); // near stairs mouth
    add(guard);

    const gtag = makeSpriteLabel("GUARD", { font: 44, w: 512, h: 192 });
    gtag.scale.set(1.8, 0.55, 1);
    gtag.position.set(0, 1.20, 0);
    gtag.visible = false;
    guard.add(gtag);

    gtag.userData = { bot: guard, kind: "guardTag" };
    state.botTags.push(gtag);

    log?.("[world] table + bots ✅");
  }

  // -------------------- STAIRS (SINGLE OPENING) --------------------
  function buildStairs() {
    const pitInner = 4.25;
    const pitDepth = 1.25;

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

    const neon = new THREE.Mesh(
      new THREE.BoxGeometry(openingW + 0.2, 0.08, 0.10),
      matStd({ color: COLORS.pink, rough: 0.35, metal: 0.25, emissive: COLORS.pink, ei: 2.2 })
    );
    neon.position.set(0, 2.25, pitInner + 0.05);
    add(neon);

    state.targets.guardSpot = new THREE.Vector3(0, 0, pitInner + 1.15);
  }

  // -------------------- JUMBOTRONS (FLAT ON WALL) --------------------
  function buildJumbotrons() {
    // flat signs near inner wall, do NOT billboard
    const r = 13.4;
    const y = 7.8;

    const items = [
      { a: 0,              text: "SCARLETT VR POKER" },
      { a: Math.PI / 2,    text: "VIP • STORE • EVENT • POKER" },
      { a: Math.PI,        text: "WELCOME TO THE EMPIRE" },
      { a: -Math.PI / 2,   text: "TABLE STATUS: OPEN" }
    ];

    for (const p of items) {
      const x = Math.sin(p.a) * r;
      const z = Math.cos(p.a) * r;

      const sign = makeWallSign(p.text, { font: 48 });
      sign.position.set(x, y, z);

      // rotate so it faces inward to center (flat, fixed)
      sign.lookAt(0, y, 0);
      add(sign);

      state.jumbos.push(sign);
    }

    log?.("[world] jumbotrons ✅ (fixed, no billboard)");
  }

  // -------------------- TELEPADS --------------------
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

    return ring;
  }

  function wireTelepads() {
    function rayHit(controller) {
      const origin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(controller.quaternion).normalize();
      const ray = new THREE.Raycaster(origin, dir, 0.01, 40);
      const hits = ray.intersectObjects(state.telepads, true);
      return hits?.[0]?.object || null;
    }

    function doTeleport(key) {
      const to = state.targets[key];
      if (!to) return;
      player.position.set(to.x, 0, to.z);
    }

    for (const c of controllers || []) {
      c.addEventListener("selectstart", () => {
        const hit = rayHit(c);
        const name = hit?.userData?.telepad?.name;
        if (!name) return;

        log?.(`[telepad] ${name}`);

        if (name === "STORE") doTeleport("storeInside");
        else if (name === "POKER") doTeleport("pokerInside");
        else if (name === "EVENT") doTeleport("eventInside");
        else if (name === "VIP") doTeleport("vipInside");
        else if (name === "PIT") doTeleport("pitEntry");
      });
    }
  }

  // -------------------- HUD ROOT --------------------
  function buildHUD() {
    const hud = new THREE.Group();
    hud.name = "ScarlettHUDRoot";
    hud.position.set(0, 2.35, 6.8);
    add(hud);
    state.hudRoot = hud;

    const spr = makeSpriteLabel("POT: $0 • TURN: BOT_1 • ROOM: LOBBY", { font: 36, w: 1024, h: 256 });
    spr.scale.set(5.6, 1.25, 1);
    spr.position.set(0, 0, 0);
    hud.add(spr);
  }

  // -------------------- SPAWN --------------------
  function setVIPSpawn() {
    const vip = state.targets.vipInside || new THREE.Vector3(0, 0, 18);
    player.position.set(vip.x, 0, vip.z);
    player.rotation.set(0, Math.PI, 0);
    log?.("[world] spawn -> VIP ✅");
  }

  // -------------------- INIT --------------------
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
    buildLobbyAndPit();
    buildStairs();
    buildRoomsAndHallways();
    buildTableAndBots();
    buildJumbotrons();
    buildHUD();

    // targets for telepads (front positions are at entrance radius)
    state.targets.vipFront   = new THREE.Vector3(0, 0, 12.0);
    state.targets.storeFront = new THREE.Vector3(12.0, 0, 0);
    state.targets.eventFront = new THREE.Vector3(0, 0, -12.0);
    state.targets.pokerFront = new THREE.Vector3(-12.0, 0, 0);

    // pit
    telepad("PIT", new THREE.Vector3(0, 0, 6.2), COLORS.aqua);

    // entrance pads
    telepad("VIP", state.targets.vipFront, COLORS.vip);
    telepad("STORE", state.targets.storeFront, COLORS.aqua);
    telepad("EVENT", state.targets.eventFront, COLORS.gold);
    telepad("POKER", state.targets.pokerFront, COLORS.pink);

    wireTelepads();

    // inside targets (room centers)
    state.targets.vipInside   = new THREE.Vector3(0, 0, 18);
    state.targets.storeInside = new THREE.Vector3(18, 0, 0);
    state.targets.eventInside = new THREE.Vector3(0, 0, -18);
    state.targets.pokerInside = new THREE.Vector3(-18, 0, 0);

    setVIPSpawn();

    log?.("[world] init complete ✅ MASTER WORLD v2");
  }

  // -------------------- UPDATE --------------------
  function update({ dt, t }) {
    state.t = t;

    // Keep HUD stable handled in index.js (yaw-only).
    // Here: only handle tags + cards + pulses.

    // Cards: always face user, upright, slight tilt
    if (state.cards) {
      // face camera in yaw only so it stays straight (no sideways roll)
      const worldPos = new THREE.Vector3();
      state.cards.getWorldPosition(worldPos);
      const dx = camera.position.x - worldPos.x;
      const dz = camera.position.z - worldPos.z;
      const yaw = Math.atan2(dx, dz);

      state.cards.rotation.set(-0.18, yaw, 0); // tilt a little toward viewer

      // staged reveal: flop -> turn -> river
      state.boardTimer += dt;
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

    // Telepad pulse
    for (const p of state.telepads) {
      if (p.material?.emissiveIntensity != null) {
        p.material.emissiveIntensity = 1.7 + Math.sin(t * 2.2) * 0.25;
      }
    }

    // Bot tags: show ONLY when you look at them (gaze cone)
    const fwd = cameraForward(new THREE.Vector3());
    const camPos = camera.position.clone();

    for (const tag of state.botTags) {
      const host = tag.parent; // tag is child of bot/guard
      if (!host) continue;

      const botPos = new THREE.Vector3();
      host.getWorldPosition(botPos);

      const toBot = botPos.clone().sub(camPos);
      const dist = toBot.length();
      toBot.y = 0;
      toBot.normalize();

      const dot = fwd.dot(toBot);

      // criteria: within 10m and inside gaze cone
      const show = (dist < 10.0) && (dot > 0.92); // ~23° cone
      tag.visible = show;

      if (show) {
        // keep tag straight, not rolling with head
        // tag is a sprite, but we still enforce straightness by not doing lookAt here.
        // Sprite will face camera; the small size prevents face spam.
      }
    }
  }

  return { init, update };
})();
