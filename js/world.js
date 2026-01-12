// /js/world.js — Scarlett MASTER WORLD (FULL, upgrade pack)
// - No hanging awaits (all optional imports are timed and safe)
// - Builds Lobby + Pit + Stairs + Rooms + Telepads + Labels
// - Tries to integrate: teleport_machine, store_room, bots, table_factory, poker_simulation, sound_manager
// - Falls back to internal demo implementations if missing
// - SUPER BRIGHT lighting

export const World = (() => {
  let THREE, scene, renderer, camera, player, controllers, log;

  const state = {
    root: null,
    t: 0,
    solids: [],
    telepads: [],
    labels: [],
    pit: { y: -1.2, rInner: 4.2, rOuter: 10.5 },
    targets: {},
    tableAnchor: null,
    bots: null,
    poker: null,
    sound: null,
  };

  function withTimeout(promise, ms, label) {
    let t = null;
    const timeout = new Promise((_, rej) => (t = setTimeout(() => rej(new Error(`timeout: ${label}`)), ms)));
    return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
  }

  async function safeImport(path, { timeout = 2200 } = {}) {
    try {
      const mod = await withTimeout(import(path), timeout, path);
      log?.(`[world] import ok: ${path}`);
      return mod;
    } catch (e) {
      log?.(`[world] import skip: ${path}`);
      return null;
    }
  }

  // ---------- helpers ----------
  function texLoader() { return new THREE.TextureLoader(); }

  function loadTexture(path, { wrap = true, repeat = [1, 1] } = {}) {
    try {
      const t = texLoader().load(path);
      if (wrap) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(repeat[0], repeat[1]);
      }
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    } catch {
      return null;
    }
  }

  function makeMat({ color = 0x2b2f3a, roughness = 0.45, metalness = 0.15, map = null } = {}) {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      map: map || null
    });
    if (map) m.needsUpdate = true;
    return m;
  }

  function addSolid(mesh) {
    mesh.userData.solid = true;
    state.solids.push(mesh);
    state.root.add(mesh);
    return mesh;
  }

  function makeLabel(text, pos, { color = "#e8ecff", bg = "rgba(10,12,18,.78)" } = {}) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = bg;
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = "rgba(127,231,255,.35)";
    g.lineWidth = 6;
    g.strokeRect(10, 10, c.width - 20, c.height - 20);

    g.fillStyle = color;
    g.font = "bold 64px system-ui, Segoe UI, Arial";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, c.width / 2, c.height / 2);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;

    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    spr.position.copy(pos);
    spr.scale.set(3.5, 1.75, 1);
    spr.userData.billboard = true;
    state.labels.push(spr);
    state.root.add(spr);
    return spr;
  }

  function faceBillboards() {
    for (const o of state.labels) {
      o.lookAt(camera.position);
    }
  }

  // ---------- lighting (SUPER BRIGHT) ----------
  function buildLights() {
    const amb = new THREE.AmbientLight(0xffffff, 1.15);
    state.root.add(amb);

    // pit hero lights
    const s1 = new THREE.SpotLight(0xffffff, 5.2, 60, Math.PI / 5, 0.35, 1.4);
    s1.position.set(0, 12, 0);
    s1.target.position.set(0, 0, 0);
    state.root.add(s1);
    state.root.add(s1.target);

    const s2 = new THREE.SpotLight(0x7fe7ff, 3.6, 60, Math.PI / 6, 0.4, 1.2);
    s2.position.set(-8, 10, 6);
    s2.target.position.set(0, 0, 0);
    state.root.add(s2);
    state.root.add(s2.target);

    const s3 = new THREE.SpotLight(0xff2d7a, 3.6, 60, Math.PI / 6, 0.4, 1.2);
    s3.position.set(8, 10, -6);
    s3.target.position.set(0, 0, 0);
    state.root.add(s3);
    state.root.add(s3.target);

    // ring lights around lobby
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const p = new THREE.PointLight(0xffffff, 1.9, 22, 1.8);
      p.position.set(Math.cos(a) * 10.5, 4.2, Math.sin(a) * 10.5);
      state.root.add(p);
    }

    log?.("[world] lights ✅ (super bright)");
  }

  // ---------- geometry: lobby + sealed walls + pit + stairs ----------
  function buildLobby() {
    const carpetTex =
      loadTexture("./assets/textures/lobby_carpet.jpg", { repeat: [8, 8] }) ||
      loadTexture("./assets/textures/lobby_carpet.jpg".replace("./", ""), { repeat: [8, 8] });

    const floorMat = makeMat({
      color: 0x404553,
      roughness: 0.75,
      metalness: 0.05,
      map: carpetTex
    });

    const wallTex =
      loadTexture("./assets/textures/casino_wall_diffuse.jpg", { repeat: [6, 2] }) ||
      loadTexture("./assets/textures/casino_wall_diffuse.jpg".replace("./", ""), { repeat: [6, 2] });

    const wallMat = makeMat({
      color: 0x2b2f3a,
      roughness: 0.55,
      metalness: 0.05,
      map: wallTex
    });

    // big lobby floor disc
    const floor = new THREE.Mesh(new THREE.CircleGeometry(14.5, 96), floorMat);
    floor.rotation.x = -Math.PI / 2;
    addSolid(floor);

    // sealed outer wall cylinder (NO gaps by default)
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(14.5, 14.5, 5.2, 128, 1, true),
      wallMat
    );
    wall.position.y = 2.6;
    wall.rotation.y = Math.PI / 2;
    wall.material.side = THREE.DoubleSide;
    addSolid(wall);

    // ceiling dome
    const domeTex =
      loadTexture("./assets/textures/ceiling_dome_main.jpg", { repeat: [2, 2] }) ||
      loadTexture("./assets/textures/ceiling_dome_main.jpg".replace("./", ""), { repeat: [2, 2] });

    const domeMat = makeMat({ color: 0x1a1d26, roughness: 0.65, metalness: 0.08, map: domeTex });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(14.7, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    dome.position.y = 5.2;
    dome.material.side = THREE.BackSide;
    state.root.add(dome);

    // pit outer lip that seals to rail (your “wrap carpet to rail” request)
    const lipMat = makeMat({ color: 0x3f4658, roughness: 0.65, metalness: 0.1, map: carpetTex });
    const lipGeo = new THREE.RingGeometry(state.pit.rInner, state.pit.rOuter, 128);
    const lip = new THREE.Mesh(lipGeo, lipMat);
    lip.rotation.x = -Math.PI / 2;
    lip.position.y = 0.01;
    addSolid(lip);

    // pit floor (sunken)
    const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(state.pit.rInner - 0.15, 96), floorMat);
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.y = state.pit.y;
    addSolid(pitFloor);

    // pit walls (soft-poly look)
    const pitWallMat = makeMat({ color: 0x262a35, roughness: 0.85, metalness: 0.05 });
    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(state.pit.rInner, state.pit.rInner, Math.abs(state.pit.y) + 0.02, 96, 1, true),
      pitWallMat
    );
    pitWall.position.y = state.pit.y / 2;
    pitWall.material.side = THREE.DoubleSide;
    addSolid(pitWall);

    // guardrail ONLY around pit edge (keep the table safe)
    const railMat = new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x0b2c34, emissiveIntensity: 1.2, metalness: 0.8, roughness: 0.25 });
    const rail = new THREE.Mesh(new THREE.TorusGeometry(state.pit.rInner + 0.15, 0.06, 16, 180), railMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 0.72;
    state.root.add(rail);

    // inner “gold” trim rail (tight and above)
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd36a, emissive: 0x3a2200, emissiveIntensity: 0.8, metalness: 1, roughness: 0.25 });
    const gold = new THREE.Mesh(new THREE.TorusGeometry(state.pit.rInner - 0.05, 0.045, 16, 180), goldMat);
    gold.rotation.x = Math.PI / 2;
    gold.position.y = 0.80;
    state.root.add(gold);

    // stairs opening at +Z (single opening rule)
    buildStairsAndOpening(floorMat);

    // room entrances (sealed wall + interior hall portals)
    buildRoomsAndHallways(wallMat, floorMat);

    log?.("[world] lobby + pit + rails ✅");
  }

  function buildStairsAndOpening(floorMat) {
    // Opening direction is +Z
    const openingW = 3.4;
    const openingDepth = 2.2;

    // create a “cut” look by placing a dark frame + stairs down into pit
    const frameMat = makeMat({ color: 0x141723, roughness: 0.9, metalness: 0.0 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(openingW + 0.6, 2.6, openingDepth + 0.4), frameMat);
    frame.position.set(0, 1.3, state.pit.rInner + openingDepth * 0.5);
    addSolid(frame);

    // stairs
    const steps = new THREE.Group();
    const stepCount = 8;
    const stepH = (0 - state.pit.y) / stepCount;
    const stepD = 0.55;

    for (let i = 0; i < stepCount; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(openingW, stepH * 0.95, stepD), floorMat);
      s.position.set(0, 0.02 + (1.0 - i) * 0.01, state.pit.rInner + 0.3 + i * stepD);
      s.position.y = 0 - stepH * 0.5 - i * stepH;
      addSolid(s);
      steps.add(s);
    }
    state.root.add(steps);

    // guard “spot” marker for your bot guard
    state.targets.guardSpot = new THREE.Vector3(0, 0, state.pit.rInner + 1.15);

    // pit entry target (bottom)
    state.targets.pitEntry = new THREE.Vector3(0, state.pit.y, state.pit.rInner - 0.6);

    // small neon doorway strip
    const stripMat = new THREE.MeshStandardMaterial({ color: 0xff2d7a, emissive: 0xff2d7a, emissiveIntensity: 2.0, metalness: 0.2, roughness: 0.35 });
    const strip = new THREE.Mesh(new THREE.BoxGeometry(openingW + 0.2, 0.08, 0.08), stripMat);
    strip.position.set(0, 2.4, state.pit.rInner + 0.05);
    state.root.add(strip);
  }

  function buildRoomsAndHallways(wallMat, floorMat) {
    // 4 rooms around the circle: +X store, -X poker, +Z VIP, -Z event
    const rooms = [
      { key: "store", name: "STORE", center: new THREE.Vector3(18, 0, 0), doorYaw: Math.PI * 0.5 },
      { key: "poker", name: "POKER ROOM", center: new THREE.Vector3(-18, 0, 0), doorYaw: -Math.PI * 0.5 },
      { key: "vip", name: "VIP", center: new THREE.Vector3(0, 0, 18), doorYaw: Math.PI },
      { key: "event", name: "EVENT", center: new THREE.Vector3(0, 0, -18), doorYaw: 0 },
    ];

    const hallW = 4.2;
    const hallL = 6.8;
    const roomSize = 10.2;
    const wallH = 4.4;

    for (const r of rooms) {
      // hallway from circle edge outward
      const hall = new THREE.Mesh(new THREE.BoxGeometry(hallW, 3.2, hallL), wallMat);
      hall.position.copy(r.center).multiplyScalar(0.52);
      hall.position.y = 1.6;
      hall.rotation.y = r.doorYaw;
      hall.material.side = THREE.DoubleSide;
      addSolid(hall);

      const hallFloor = new THREE.Mesh(new THREE.PlaneGeometry(hallW, hallL), floorMat);
      hallFloor.rotation.x = -Math.PI / 2;
      hallFloor.position.copy(hall.position);
      hallFloor.position.y = 0.01;
      hallFloor.rotation.y = r.doorYaw;
      addSolid(hallFloor);

      // room box
      const room = new THREE.Mesh(new THREE.BoxGeometry(roomSize, wallH, roomSize), wallMat);
      room.position.copy(r.center);
      room.position.y = wallH / 2;
      room.material.side = THREE.DoubleSide;
      addSolid(room);

      const roomFloor = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize), floorMat);
      roomFloor.rotation.x = -Math.PI / 2;
      roomFloor.position.copy(r.center);
      roomFloor.position.y = 0.01;
      addSolid(roomFloor);

      // label above hallway entrance (inside lobby)
      const labelPos = new THREE.Vector3(
        Math.sign(r.center.x) * 11.2,
        2.55,
        Math.sign(r.center.z) * 11.2
      );
      if (r.key === "store") labelPos.set(11.2, 2.55, 0);
      if (r.key === "poker") labelPos.set(-11.2, 2.55, 0);
      if (r.key === "vip") labelPos.set(0, 2.55, 11.2);
      if (r.key === "event") labelPos.set(0, 2.55, -11.2);

      makeLabel(r.name, labelPos);

      // tele targets
      state.targets[`${r.key}Front`] = labelPos.clone().setY(0);
      state.targets[`${r.key}Inside`] = r.center.clone().add(new THREE.Vector3(0, 0, 0)).setY(0);

      // simple “door panel” outside room (uses your door textures if present)
      const doorTexPath =
        r.key === "store" ? "./assets/textures/door_store.png" :
        r.key === "poker" ? "./assets/textures/door_poker.png" :
        "./assets/textures/door_poker.png";
      const doorTex = loadTexture(doorTexPath, { wrap: false }) || null;
      const doorMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.4,
        metalness: 0.05,
        map: doorTex
      });

      const door = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), doorMat);
      // place at room edge facing lobby
      const edge = r.center.clone().multiplyScalar(0.86);
      door.position.copy(edge);
      door.position.y = 1.6;
      door.rotation.y = r.doorYaw + Math.PI;
      state.root.add(door);
    }
  }

  // ---------- telepads ----------
  function buildTelepad(name, pos, color = 0x7fe7ff) {
    const baseTex =
      loadTexture("./assets/textures/Teleport glow.jpg", { repeat: [1, 1] }) ||
      loadTexture("./assets/textures/Teleport glow.jpg".replace("./", ""), { repeat: [1, 1] });

    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.8,
      transparent: true,
      opacity: 0.92,
      roughness: 0.2,
      metalness: 0.4,
      map: baseTex || null
    });

    const ring = new THREE.Mesh(new THREE.RingGeometry(0.65, 0.9, 64), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos);
    ring.position.y += 0.02;

    ring.userData.telepad = { name };
    state.telepads.push(ring);
    state.root.add(ring);

    // small pillar label
    makeLabel(name, pos.clone().add(new THREE.Vector3(0, 2.2, 0)), { bg: "rgba(0,0,0,.55)" });

    return ring;
  }

  function buildTelepads() {
    buildTelepad("STORE", state.targets.storeFront, 0x7fe7ff);
    buildTelepad("EVENT", state.targets.eventFront, 0xffcc00);
    buildTelepad("POKER", state.targets.pokerFront, 0xff2d7a);
    buildTelepad("VIP", state.targets.vipFront, 0xa78bff);

    // pit telepad near stairs top (spectate)
    buildTelepad("PIT", new THREE.Vector3(0, 0, state.pit.rInner + 1.9), 0x7fe7ff);

    log?.("[world] telepads ✅");
  }

  // ---------- simple interaction: ray hit + teleport ----------
  function controllerRayHit(controller) {
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3(0, 0, -1);

    origin.setFromMatrixPosition(controller.matrixWorld);
    dir.applyQuaternion(controller.quaternion);
    dir.normalize();

    const ray = new THREE.Raycaster(origin, dir, 0.01, 30);

    const hits = ray.intersectObjects(state.telepads, true);
    return hits.length ? hits[0].object : null;
  }

  function teleportTo(vec3) {
    // keep standing height: player y stays 0; camera height handled by headset
    player.position.set(vec3.x, 0, vec3.z);
  }

  function wireTelepadControls() {
    // Trigger button press teleports to inside target for that room
    for (const c of controllers || []) {
      c.addEventListener("selectstart", () => {
        const hit = controllerRayHit(c);
        if (!hit) return;

        const n = hit.userData?.telepad?.name || "";
        log?.(`[telepad] hit=${n}`);

        if (n === "STORE") teleportTo(state.targets.storeInside);
        else if (n === "POKER") teleportTo(state.targets.pokerInside);
        else if (n === "EVENT") teleportTo(state.targets.eventInside);
        else if (n === "VIP") teleportTo(state.targets.vipInside);
        else if (n === "PIT") teleportTo(state.targets.pitEntry);
      });
    }
    log?.("[world] telepad controls wired ✅");
  }

  // ---------- table + bots + poker demo ----------
  async function buildTableAndBots() {
    // Try your existing modules first
    const tf = await safeImport("./table_factory.js?v=" + Date.now());
    const botsMod = await safeImport("./bots.js?v=" + Date.now());
    const pokerSim = await safeImport("./poker_simulation.js?v=" + Date.now());
    const pokerSim2 = pokerSim || (await safeImport("./poker_sim.js?v=" + Date.now()));

    // Table anchor in pit
    state.tableAnchor = new THREE.Group();
    state.tableAnchor.position.set(0, state.pit.y + 0.05, 0);
    state.root.add(state.tableAnchor);

    // If table factory exists, use it
    if (tf?.TableFactory?.build) {
      try {
        const table = await tf.TableFactory.build({ THREE, root: state.tableAnchor, log });
        table.position.set(0, 0, 0);
        state.tableAnchor.add(table);
        log?.("[world] TableFactory table ✅");
      } catch (e) {
        log?.("[world] TableFactory failed -> fallback table");
        buildFallbackTable();
      }
    } else {
      buildFallbackTable();
    }

    // Bots
    if (botsMod?.Bots?.init) {
      try {
        state.bots = await botsMod.Bots.init({
          THREE,
          scene: state.tableAnchor,
          log,
          anchorY: state.pit.y,
          center: new THREE.Vector3(0, 0, 0)
        });
        log?.("[world] bots.js ✅");
      } catch {
        buildFallbackBots();
      }
    } else {
      buildFallbackBots();
    }

    // Poker Simulation hook
    if (pokerSim2) {
      state.poker = pokerSim2;
      log?.("[world] poker sim module detected ✅");
    } else {
      log?.("[world] poker sim not found — running visual demo ✅");
    }

    buildCommunityCardsDemo();
  }

  function buildFallbackTable() {
    // leather trim + felt
    const feltTex =
      loadTexture("./assets/textures/table_felt_green.jpg", { repeat: [2, 2] }) ||
      loadTexture("./assets/textures/table_felt_green.jpg".replace("./", ""), { repeat: [2, 2] });
    const feltMat = makeMat({ color: 0x0f5a3f, roughness: 0.88, metalness: 0.02, map: feltTex });

    const leatherTex =
      loadTexture("./assets/textures/Table leather trim.jpg", { repeat: [2, 1] }) ||
      loadTexture("./assets/textures/Table leather trim.jpg".replace("./", ""), { repeat: [2, 1] });
    const leatherMat = makeMat({ color: 0x3a2416, roughness: 0.72, metalness: 0.08, map: leatherTex });

    const table = new THREE.Group();

    const top = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.35, 0.18, 64), feltMat);
    top.position.y = 0.82;
    table.add(top);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.14, 22, 128), leatherMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.92;
    table.add(rim);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 0.92, 28), makeMat({ color: 0x222633, roughness: 0.6, metalness: 0.35 }));
    base.position.y = 0.45;
    table.add(base);

    // pot marker
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 24), makeMat({ color: 0xffd36a, roughness: 0.35, metalness: 0.7 }));
    pot.position.y = 1.02;
    table.add(pot);

    state.tableAnchor.add(table);
    log?.("[world] fallback table ✅");
  }

  function buildFallbackBots() {
    // 6 bot seats around table, aligned + facing table
    const botGroup = new THREE.Group();
    const botCount = 6;
    const r = 4.1;

    const botMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ff, emissive: 0x1b1f55, emissiveIntensity: 0.6, roughness: 0.55, metalness: 0.15 });
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x2a2e3a, roughness: 0.7, metalness: 0.2 });

    for (let i = 0; i < botCount; i++) {
      const a = (i / botCount) * Math.PI * 2;

      // chair
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.7), chairMat);
      chair.position.set(Math.cos(a) * r, 0.1, Math.sin(a) * r);
      chair.rotation.y = -a + Math.PI;
      botGroup.add(chair);

      // bot body
      const bot = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.65, 6, 12), botMat);
      bot.position.set(Math.cos(a) * r, 0.55, Math.sin(a) * r);
      bot.rotation.y = -a + Math.PI;
      bot.userData.isBot = true;
      botGroup.add(bot);

      // name tag (faces camera later)
      const tag = makeLabel(`BOT_${i + 1}  •  $5000`, new THREE.Vector3(bot.position.x, 1.55, bot.position.z), { bg: "rgba(0,0,0,.55)" });
      tag.userData.follow = bot;
    }

    // guard at stairs top
    const guard = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.75, 6, 12), new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0x3a2b00, emissiveIntensity: 0.7 }));
    guard.position.copy(state.targets.guardSpot).setY(0.95);
    guard.rotation.y = Math.PI;
    botGroup.add(guard);
    makeLabel("GUARD", guard.position.clone().add(new THREE.Vector3(0, 1.4, 0)), { bg: "rgba(0,0,0,.55)" });

    state.tableAnchor.add(botGroup);
    state.bots = { group: botGroup };
    log?.("[world] fallback bots ✅ (aligned, not bouncing)");
  }

  function buildCommunityCardsDemo() {
    // Big community cards that hover higher, face viewer (billboard)
    const cardBack =
      loadTexture("./assets/textures/cards/scarlett_card_back_512.png", { wrap: false }) ||
      loadTexture("./assets/textures/scarlett_card_back_512.png", { wrap: false }) ||
      null;

    const cardMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.05,
      map: cardBack
    });

    const cards = new THREE.Group();
    cards.name = "CommunityCards";
    cards.position.set(0, 2.55, 0); // higher
    state.root.add(cards);

    const geo = new THREE.PlaneGeometry(0.52, 0.75);

    for (let i = 0; i < 5; i++) {
      const m = cardMat.clone();
      const c = new THREE.Mesh(geo, m);
      c.position.set((i - 2) * 0.62, 0, 0);
      c.rotation.y = Math.PI; // start facing inward
      c.userData.card = { i, revealed: false };
      c.visible = i < 3; // flop first
      cards.add(c);
    }

    // table HUD text
    makeLabel("POT: $0  •  TURN: BOT_1", new THREE.Vector3(0, 3.6, 0), { bg: "rgba(10,12,18,.75)" });

    state.poker = state.poker || { demo: true, phase: 0, timer: 0, cards };
    log?.("[world] community cards demo ✅");
  }

  // ---------- audio (fail-safe) ----------
  async function initAudio() {
    // try your sound manager if exists
    const sm = await safeImport("./sound_manager.js?v=" + Date.now());
    if (sm?.SoundManager?.init) {
      try {
        state.sound = await sm.SoundManager.init({ THREE, camera, log });
        log?.("[world] SoundManager ✅");
        return;
      } catch {}
    }

    // fallback: positional ambient
    try {
      const listener = new THREE.AudioListener();
      camera.add(listener);

      const audio = new THREE.Audio(listener);
      const loader = new THREE.AudioLoader();

      loader.load("./assets/audio/lobby_ambience.mp3", (buf) => {
        audio.setBuffer(buf);
        audio.setLoop(true);
        audio.setVolume(0.35);
        audio.play();
        log?.("[world] ambient audio ✅");
      }, undefined, () => {
        log?.("[world] ambient missing (safe) ✅");
      });

      state.sound = { audio };
    } catch {
      log?.("[world] audio disabled (safe) ✅");
    }
  }

  // ---------- PUBLIC API ----------
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
    buildTelepads();
    wireTelepadControls();

    await initAudio();
    await buildTableAndBots();

    log(`[world] init complete ✅`);
  }

  function update({ dt, t }) {
    state.t = t;

    // billboard labels
    faceBillboards();

    // tags that follow bots (fallback)
    for (const spr of state.labels) {
      if (spr.userData.follow) {
        const b = spr.userData.follow;
        spr.position.set(b.position.x, b.position.y + 1.1, b.position.z);
        spr.lookAt(camera.position);
      }
    }

    // poker demo progression: flop -> turn -> river (not all 5 at once)
    if (state.poker?.demo) {
      state.poker.timer += dt;
      const cards = state.poker.cards;
      if (state.poker.timer > 6 && state.poker.phase === 0) {
        // reveal turn
        cards.children[3].visible = true;
        state.poker.phase = 1;
        log?.("[poker-demo] TURN revealed ✅");
      }
      if (state.poker.timer > 12 && state.poker.phase === 1) {
        // reveal river
        cards.children[4].visible = true;
        state.poker.phase = 2;
        log?.("[poker-demo] RIVER revealed ✅");
      }

      // always face viewer for community cards
      cards.lookAt(camera.position);
    }

    // subtle neon breathing on telepads
    for (const p of state.telepads) {
      const m = p.material;
      if (m && m.emissiveIntensity != null) {
        m.emissiveIntensity = 1.6 + Math.sin(t * 2.2) * 0.25;
      }
    }
  }

  return { init, update };
})();
