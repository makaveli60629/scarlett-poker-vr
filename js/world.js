// /js/world.js — FULL WORLD 9.0 (teleporter + rails + store + scorpion sign + poker watcher)
// IMPORTANT: Do NOT import THREE here. Use the THREE passed from main.js.

export async function initWorld({ THREE, scene, log = console.log, v = "no-v" }) {
  log("[world] FULL WORLD boot v=" + v);

  const tex = makeTextureLoader(THREE, log);
  const world = {
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    spawnPads: [],
    roomClamp: { minX: -7.7, maxX: 7.7, minZ: -13.6, maxZ: 7.6 },
    seats: [],
    lobbyZone: { min: new THREE.Vector3(-6, 0, 8), max: new THREE.Vector3(6, 0, 13.6) },
    colliders: [],
    bots: null,
    poker: null,
    resolvePlayer: null,
    tick: (dt) => {},
  };

  world.group.name = "World";
  scene.add(world.group);

  // ------------------ ROOM + TEXTURES ------------------
  const carpet = tex.load("assets/textures/lobby_carpet.jpg");
  if (carpet) { carpet.wrapS = carpet.wrapT = THREE.RepeatWrapping; carpet.repeat.set(6, 6); }

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x0b0b10, map: carpet || null, roughness: 0.98 })
  );
  floor.rotation.x = -Math.PI / 2;
  world.group.add(floor);

  const brick = tex.load("assets/textures/brickwall.jpg");
  if (brick) { brick.wrapS = brick.wrapT = THREE.RepeatWrapping; brick.repeat.set(6, 2); }

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x141826, map: brick || null, roughness: 0.95 });
  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    world.group.add(m);
    addBoxCollider(world, m, 0.0);
    return m;
  };

  // perimeter walls
  mkWall(16, 4, 0.3, 0, 2, -14);
  mkWall(16, 4, 0.3, 0, 2, 8);
  mkWall(0.3, 4, 22, -8, 2, -3);
  mkWall(0.3, 4, 22, 8, 2, -3);

  // ceiling dome (optional texture)
  const domeTex = tex.load("assets/textures/ceiling_dome_main.jpg");
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(18, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2.2),
    new THREE.MeshStandardMaterial({ color: 0x0c0f18, map: domeTex || null, roughness: 0.95, side: THREE.BackSide })
  );
  dome.position.set(0, 6.2, -3);
  world.group.add(dome);

  // extra ambience lights
  const p1 = new THREE.PointLight(0x8f3dff, 0.35, 18);
  p1.position.set(0, 3.0, 2.0);
  world.group.add(p1);

  const p2 = new THREE.PointLight(0x22aaff, 0.25, 18);
  p2.position.set(-4, 2.6, -8);
  world.group.add(p2);

  // ------------------ RAILS ------------------
  const rails = buildRails(THREE);
  rails.position.set(0, 0, -6.5);
  world.group.add(rails);
  // rails collider ring-ish (approx): 4 box colliders around
  addBoxCollider(world, new THREE.Mesh(new THREE.BoxGeometry(9.0, 1.2, 0.3)), 0, { x: 0, y: 0.6, z: -10.6 }, rails);
  addBoxCollider(world, new THREE.Mesh(new THREE.BoxGeometry(9.0, 1.2, 0.3)), 0, { x: 0, y: 0.6, z: -2.4 }, rails);
  addBoxCollider(world, new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 8.2)), 0, { x: -4.5, y: 0.6, z: -6.5 }, rails);
  addBoxCollider(world, new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 8.2)), 0, { x: 4.5, y: 0.6, z: -6.5 }, rails);

  // ------------------ TABLE (textured) ------------------
  const table = buildTable(THREE, tex);
  table.position.set(0, 0, -6.5);
  world.group.add(table);

  world.tableFocus.set(0, 0, -6.5);

  // seats (6)
  const c = world.tableFocus.clone();
  const r = 3.2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Vector3(c.x + Math.cos(a) * r, 0, c.z + Math.sin(a) * r);
    world.seats.push({ position: p, yaw: Math.atan2(c.x - p.x, c.z - p.z) });
  }

  // spawn pad: behind teleporter so you face table
  world.spawnPads = [new THREE.Vector3(0, 0, 4.7)];

  // ------------------ YOUR TELEPORTER (PRIMARY) ------------------
  let teleGroup = null;
  try {
    const mod = await import(`./teleport_machine.js?v=${encodeURIComponent(v)}`);
    if (mod?.TeleportMachine?.build) {
      teleGroup = mod.TeleportMachine.build({ THREE, scene: world.group, texLoader: tex.loader, log });
      log("[world] ✅ teleport_machine.js loaded (YOUR portal)");

      if (mod.TeleportMachine.getSafeSpawn) {
        const s = mod.TeleportMachine.getSafeSpawn(THREE);
        if (s?.position) world.spawnPads = [s.position.clone()];
      }

      // tick fx if provided
      if (typeof mod.TeleportMachine.tick === "function") {
        const prev = world.tick;
        world.tick = (dt) => { prev(dt); mod.TeleportMachine.tick(dt); };
      }

      // collider for teleporter base (approx)
      addBoxCollider(world, new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4)), 0, { x: 0, y: 0.6, z: 3.6 }, world.group);
    } else {
      log("[world] ⚠️ teleport_machine.js loaded but TeleportMachine.build missing");
    }
  } catch (e) {
    log("[world] ❌ teleport_machine.js import failed: " + (e?.message || e));
  }

  if (!teleGroup) {
    log("[world] ⚠️ Using SAFE teleporter fallback");
    teleGroup = buildSafeTeleportMachine(THREE);
    teleGroup.position.set(0, 0, 3.6);
    world.group.add(teleGroup);
    const prev = world.tick;
    world.tick = (dt) => { prev(dt); tickTeleportFX(teleGroup, dt); };
  }

  // ------------------ WALL PICTURES ------------------
  placeWallPictures(THREE, tex, world.group);

  // ------------------ SCORPION ROOM SIGN ------------------
  placeScorpionSign(THREE, tex, world.group);

  // ------------------ STORE KIOSK ------------------
  placeStoreKiosk(THREE, tex, world.group, log);

  // ------------------ BOTS ------------------
  let botsSystem = null;
  try {
    const botsMod = await import(`./bots.js?v=${encodeURIComponent(v)}`);
    if (botsMod?.Bots?.init) {
      botsSystem = await botsMod.Bots.init({ THREE, scene: world.group, world, log, tex });
      log("[world] ✅ bots.js (Bots.init) loaded");
    } else {
      log("[world] ⚠️ bots.js loaded but no Bots.init");
    }
  } catch (e) {
    log("[world] ⚠️ bots import failed: " + (e?.message || e));
  }

  if (!botsSystem) {
    botsSystem = buildSafeBots(THREE, world.group, world);
    log("[world] ⚠️ Using SAFE bots fallback");
  }

  world.bots = botsSystem;
  const prevBotsTick = world.tick;
  world.tick = (dt) => {
    prevBotsTick(dt);
    if (botsSystem?.update) botsSystem.update(dt);
  };

  // ------------------ POKER SIM (watchable) ------------------
  try {
    const pokerSim = await import(`./poker_simulation.js?v=${encodeURIComponent(v)}`);
    const PS = pokerSim?.PokerSimulation;
    if (PS?.init) {
      PS.init({
        THREE,
        scene: world.group,
        world,
        bots: botsSystem,
        seats: world.seats,
        tableFocus: world.tableFocus,
        tex,
        log,
      });

      const tfn = PS.update || PS.tick;
      if (typeof tfn === "function") {
        let disabled = false;
        const prevPoker = world.tick;
        world.tick = (dt) => {
          prevPoker(dt);
          if (disabled) return;
          try { tfn(dt); }
          catch (e) { disabled = true; log("❌ PokerSimulation crashed (DISABLED): " + (e?.message || e)); }
        };
      }
      world.poker = PS;
      log("[world] ✅ poker_simulation init");
    } else {
      log("[world] ⚠️ poker_simulation loaded but PokerSimulation.init missing");
    }
  } catch (e) {
    log("[world] ⚠️ poker_simulation import failed: " + (e?.message || e));
  }

  // ------------------ PLAYER COLLISION ------------------
  world.resolvePlayer = (pos, radius = 0.28) => {
    const p = pos.clone();

    // keep inside clamp
    p.x = THREE.MathUtils.clamp(p.x, world.roomClamp.minX, world.roomClamp.maxX);
    p.z = THREE.MathUtils.clamp(p.z, world.roomClamp.minZ, world.roomClamp.maxZ);

    // push out of colliders (XZ only)
    for (const c of world.colliders) {
      if (!c?.box) continue;
      // expand box by radius
      const b = c.box.clone();
      b.min.x -= radius; b.max.x += radius;
      b.min.z -= radius; b.max.z += radius;

      // if inside, push to nearest edge
      if (p.x >= b.min.x && p.x <= b.max.x && p.z >= b.min.z && p.z <= b.max.z) {
        const dxMin = Math.abs(p.x - b.min.x);
        const dxMax = Math.abs(b.max.x - p.x);
        const dzMin = Math.abs(p.z - b.min.z);
        const dzMax = Math.abs(b.max.z - p.z);

        const m = Math.min(dxMin, dxMax, dzMin, dzMax);
        if (m === dxMin) p.x = b.min.x;
        else if (m === dxMax) p.x = b.max.x;
        else if (m === dzMin) p.z = b.min.z;
        else p.z = b.max.z;
      }
    }
    return p;
  };

  log("[world] FULL WORLD ready ✅");
  return world;
}

// =========================
// Helpers
// =========================
function makeTextureLoader(THREE, log) {
  const loader = new THREE.TextureLoader();
  return {
    loader,
    load(path) {
      try {
        return loader.load(
          path,
          undefined,
          undefined,
          () => log(`[tex] missing: ${path} (using null)`)
        );
      } catch {
        log(`[tex] missing: ${path} (using null)`);
        return null;
      }
    }
  };
}

function addBoxCollider(world, mesh, pad = 0.0, localPos = null, parent = null) {
  // We don't need to render this mesh — only use for box size.
  // But we DO need a Box3 in world space.
  const p = localPos || { x: 0, y: 0, z: 0 };
  const dummy = mesh;
  dummy.position.set(p.x, p.y, p.z);
  (parent || world.group).add(dummy);

  dummy.updateWorldMatrix(true, false);
  const box = new THREE.Box3().setFromObject(dummy);

  // pad
  box.min.x -= pad; box.min.y -= pad; box.min.z -= pad;
  box.max.x += pad; box.max.y += pad; box.max.z += pad;

  // remove from scene graph (we don't want to see it)
  dummy.removeFromParent();

  world.colliders.push({ box });
}

// =========================
// TABLE / RAILS / DECOR
// =========================
function buildTable(THREE, tex) {
  const g = new THREE.Group();
  g.name = "PokerTable";

  const feltTex = tex.load("assets/textures/table_felt_green.jpg");
  if (feltTex) { feltTex.wrapS = feltTex.wrapT = THREE.RepeatWrapping; feltTex.repeat.set(2, 2); }

  const trimTex = tex.load("assets/textures/Table leather trim.jpg");
  if (trimTex) { trimTex.wrapS = trimTex.wrapT = THREE.RepeatWrapping; trimTex.repeat.set(2, 1); }

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 0.18, 64),
    new THREE.MeshStandardMaterial({ color: 0x0f5d3a, map: feltTex || null, roughness: 0.9 })
  );
  top.position.y = 0.92;
  g.add(top);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.18, 18, 90),
    new THREE.MeshStandardMaterial({ color: 0x2a1b10, map: trimTex || null, roughness: 0.8 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.01;
  g.add(rim);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.46, 0.85, 20),
    new THREE.MeshStandardMaterial({ color: 0x111522, roughness: 0.95 })
  );
  stem.position.y = 0.45;
  g.add(stem);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 0.12, 32),
    new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 1 })
  );
  base.position.y = 0.06;
  g.add(base);

  return g;
}

function buildRails(THREE) {
  const g = new THREE.Group();
  g.name = "Rails";

  const postMat = new THREE.MeshStandardMaterial({ color: 0x10131a, roughness: 0.9 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x1b2230, roughness: 0.85 });

  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.1, 10);
  const railGeo = new THREE.CylinderGeometry(0.04, 0.04, 9.0, 10);

  // posts corners around table zone
  const corners = [
    [-4.5, -10.6], [4.5, -10.6],
    [-4.5, -2.4],  [4.5, -2.4],
  ];
  for (const [x, z] of corners) {
    const p = new THREE.Mesh(postGeo, postMat);
    p.position.set(x, 0.55, z);
    g.add(p);
  }

  // top rails (4 sides)
  const r1 = new THREE.Mesh(railGeo, railMat);
  r1.rotation.z = Math.PI / 2;
  r1.position.set(0, 0.95, -10.6);
  g.add(r1);

  const r2 = new THREE.Mesh(railGeo, railMat);
  r2.rotation.z = Math.PI / 2;
  r2.position.set(0, 0.95, -2.4);
  g.add(r2);

  const sideGeo = new THREE.CylinderGeometry(0.04, 0.04, 8.2, 10);

  const r3 = new THREE.Mesh(sideGeo, railMat);
  r3.position.set(-4.5, 0.95, -6.5);
  g.add(r3);

  const r4 = new THREE.Mesh(sideGeo, railMat);
  r4.position.set(4.5, 0.95, -6.5);
  g.add(r4);

  return g;
}

function placeWallPictures(THREE, tex, parent) {
  const p1 = tex.load("assets/textures/walls/pic1.png");
  const p2 = tex.load("assets/textures/walls/pic2.png");

  const mat = (t) =>
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: t || null,
      roughness: 0.9,
      metalness: 0.0,
      transparent: true,
    });

  const a = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), mat(p1));
  a.position.set(-5.2, 2.1, -12.7);
  a.rotation.y = 0;
  parent.add(a);

  const b = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), mat(p2));
  b.position.set(5.2, 2.1, -12.7);
  b.rotation.y = 0;
  parent.add(b);
}

function placeScorpionSign(THREE, tex, parent) {
  const s = tex.load("assets/textures/Scoripon room brand.jpg");
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.0, 1.2),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: s || null, roughness: 0.9, transparent: true })
  );
  sign.position.set(0, 2.3, 7.7);
  sign.rotation.y = Math.PI; // faces inward
  parent.add(sign);
}

function placeStoreKiosk(THREE, tex, parent, log) {
  const g = new THREE.Group();
  g.name = "Store";

  // kiosk body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.1, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x121827, roughness: 0.9 })
  );
  body.position.set(0, 0.55, 5.6);
  g.add(body);

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.12, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x1a2440, roughness: 0.8 })
  );
  top.position.set(0, 1.12, 5.6);
  g.add(top);

  // store board
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x0b0f18, roughness: 0.9 })
  );
  board.position.set(0, 1.9, 5.2);
  board.rotation.y = Math.PI;
  g.add(board);

  // icons
  const icons = [
    ["shirt", "assets/textures/store/shirt_icon.png"],
    ["crown", "assets/textures/store/crown_icon.png"],
    ["hat", "assets/textures/store/hat_icon.png"],
    ["chip", "assets/textures/store/chip_icon.png"],
  ];

  const baseX = -0.75;
  for (let i = 0; i < icons.length; i++) {
    const [name, path] = icons[i];
    const t = tex.load(path);
    const icon = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.38),
      new THREE.MeshStandardMaterial({ color: 0xffffff, map: t || null, transparent: true })
    );
    icon.position.set(baseX + i * 0.5, 1.9, 5.19);
    icon.rotation.y = Math.PI;
    icon.name = "storeIcon_" + name;
    g.add(icon);
  }

  // label
  const label = makeTextPlane(THREE, "STORE", 512, 128);
  label.position.set(0, 2.55, 5.19);
  label.rotation.y = Math.PI;
  g.add(label);

  parent.add(g);
  log?.("[world] store placed ✅");
}

function makeTextPlane(THREE, text, w = 512, h = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, w, h);
  ctx.font = "bold 80px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), mat);
  return mesh;
}

// =========================
// SAFE TELEPORTER FALLBACK
// =========================
function buildSafeTeleportMachine(THREE) {
  const g = new THREE.Group();
  g.name = "TeleportMachine_SAFE";

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.9, 0.18, 30),
    new THREE.MeshStandardMaterial({ color: 0x0f1220, roughness: 0.85, metalness: 0.2 })
  );
  base.position.y = 0.09;
  g.add(base);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.06, 16, 64),
    new THREE.MeshStandardMaterial({
      color: 0x6a2bff,
      emissive: 0x6a2bff,
      emissiveIntensity: 1.15,
      roughness: 0.35,
      metalness: 0.2
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.55;
  ring.name = "ring";
  g.add(ring);

  const geo = new THREE.BufferGeometry();
  const pts = new Float32Array(60 * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
  const zap = new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({ color: 0xb46bff, transparent: true, opacity: 0.9 })
  );
  zap.position.y = 0.55;
  zap.name = "zap";
  g.add(zap);

  const glow = new THREE.PointLight(0x8f3dff, 0.9, 6);
  glow.position.set(0, 0.75, 0);
  glow.name = "glow";
  g.add(glow);

  g.userData._t = 0;
  return g;
}

function tickTeleportFX(machine, dt) {
  machine.userData._t += dt;
  const t = machine.userData._t;

  const ring = machine.getObjectByName("ring");
  const zap = machine.getObjectByName("zap");
  const glow = machine.getObjectByName("glow");

  if (ring) ring.rotation.z += dt * 0.9;
  if (glow) glow.intensity = 0.75 + Math.sin(t * 6.0) * 0.25;

  if (zap) {
    const pos = zap.geometry.attributes.position.array;
    let idx = 0;
    for (let i = 0; i < 60; i++) {
      const a = (i / 59) * Math.PI * 2;
      const r = 0.55 + Math.sin(t * 7 + i * 0.8) * 0.05;
      const y = Math.sin(t * 11 + i * 1.3) * 0.08;
      pos[idx++] = Math.cos(a) * r;
      pos[idx++] = y;
      pos[idx++] = Math.sin(a) * r;
    }
    zap.geometry.attributes.position.needsUpdate = true;
  }
}

// =========================
// SAFE BOTS FALLBACK (only used if bots.js missing)
// =========================
function buildSafeBots(THREE, scene, world) {
  const bots = [];
  const matA = new THREE.MeshStandardMaterial({ color: 0x2bd7ff, roughness: 0.85 });
  const matB = new THREE.MeshStandardMaterial({ color: 0xff2bd6, roughness: 0.85 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xf2d6c9, roughness: 0.85 });

  function makeBot(i) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 6, 12), i % 2 ? matA : matB);
    body.position.y = 0.55;
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), headMat);
    head.position.y = 1.25;
    g.add(head);

    g.userData.bot = { id: i, seated: false, target: null };
    scene.add(g);
    return g;
  }

  for (let i = 0; i < 8; i++) bots.push(makeBot(i));

  // Seat 6, lobby 2
  for (let i = 0; i < bots.length; i++) {
    const b = bots[i];
    if (i < 6) {
      const s = world.seats[i];
      b.position.set(s.position.x, 0, s.position.z);
      b.rotation.y = s.yaw;
      b.userData.bot.seated = true;
    } else {
      b.userData.bot.seated = false;
      b.position.set((Math.random() * 10) - 5, 0, 10 + Math.random() * 3);
      b.userData.bot.target = b.position.clone();
    }
  }

  function pickTarget() {
    const z = THREE.MathUtils.lerp(world.lobbyZone.min.z, world.lobbyZone.max.z, Math.random());
    const x = THREE.MathUtils.lerp(world.lobbyZone.min.x, world.lobbyZone.max.x, Math.random());
    return new THREE.Vector3(x, 0, z);
  }

  return {
    bots: bots.map((g, i) => ({ id: i, group: g })),
    update(dt) {
      for (const g of bots) {
        const d = g.userData.bot;
        if (d.seated) continue;
        if (!d.target || g.position.distanceTo(d.target) < 0.2) d.target = pickTarget();
        const dir = d.target.clone().sub(g.position); dir.y = 0;
        const dist = dir.length();
        if (dist > 0.001) {
          dir.normalize();
          g.position.addScaledVector(dir, dt * 0.7);
          g.lookAt(d.target.x, g.position.y, d.target.z);
        }
      }
    }
  };
        }
