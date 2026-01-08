// /js/world.js — Scarlett VR Poker 9.1 FULL WORLD
// IMPORTANT: Do NOT import THREE here. main.js passes THREE in.

export async function initWorld({ THREE, scene, log = console.log, v = "9011" }) {
  log("[world] init v=" + v);

  const world = {
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    spawnPads: [new THREE.Vector3(0, 0, 3.5)],
    roomClamp: { minX: -7.6, maxX: 7.6, minZ: -13.6, maxZ: 7.6 },
    seats: [],
    lobbyZone: { min: new THREE.Vector3(-6, 0, 6), max: new THREE.Vector3(6, 0, 12) },
    bots: null,
    teleporter: null,
    pokerUI: null,
    setPotText: () => {},
    tick: (dt) => {},
  };

  world.group.name = "World";
  scene.add(world.group);

  // ------------------ TEXTURES (safe) ------------------
  const texLoader = new THREE.TextureLoader();

  const loadTex = (url, opts = {}) =>
    new Promise((resolve) => {
      texLoader.load(
        url,
        (t) => {
          if (opts.repeat) {
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(opts.repeat[0], opts.repeat[1]);
          }
          if (opts.srgb) t.colorSpace = THREE.SRGBColorSpace;
          resolve(t);
        },
        undefined,
        () => { log(`[tex] missing: ${url} (using null)`); resolve(null); }
      );
    });

  const T = {
    carpet: await loadTex("assets/textures/lobby_carpet.jpg", { repeat: [2, 2], srgb: true }),
    brick: await loadTex("assets/textures/brickwall.jpg", { repeat: [2, 1], srgb: true }),
    ceiling: await loadTex("assets/textures/ceiling_dome_main.jpg", { repeat: [1, 1], srgb: true }),
    felt: await loadTex("assets/textures/table_felt_green.jpg", { repeat: [1, 1], srgb: true }),
    trim: await loadTex("assets/textures/Table leather trim.jpg", { repeat: [1, 1], srgb: true }),
    casinoArt1: await loadTex("assets/textures/casino_art.jpg", { srgb: true }),
    casinoArt2: await loadTex("assets/textures/Casinoart2.jpg", { srgb: true }),
    scorpionBrand: await loadTex("assets/textures/Scorpion room brand.jpg", { srgb: true }),
  };

  // ------------------ LIGHTING ------------------
  world.group.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 0.8);
  key.position.set(6, 10, 4);
  world.group.add(key);
  const accent = new THREE.PointLight(0xb46bff, 0.55, 12);
  accent.position.set(0, 2.2, 1.8);
  world.group.add(accent);

  // ------------------ FLOOR (carpet) ------------------
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x111118,
    roughness: 0.95,
    map: T.carpet || null,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.name = "LobbyFloor";
  world.group.add(floor);

  // ------------------ ROOM BOX (brick walls) ------------------
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x141826,
    roughness: 0.95,
    map: T.brick || null,
  });

  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    world.group.add(m);
    return m;
  };

  mkWall(16, 4, 0.3, 0, 2, -14);
  mkWall(16, 4, 0.3, 0, 2, 8);
  mkWall(0.3, 4, 22, -8, 2, -3);
  mkWall(0.3, 4, 22, 8, 2, -3);

  // ------------------ CEILING DOME ------------------
  const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0x0b0c12,
    roughness: 0.9,
    map: T.ceiling || null,
    side: THREE.BackSide,
  });
  const ceiling = new THREE.Mesh(new THREE.SphereGeometry(14, 32, 22), ceilingMat);
  ceiling.position.set(0, 5.4, -3);
  ceiling.scale.set(1.4, 0.85, 1.4);
  world.group.add(ceiling);

  // ------------------ WALL ART ------------------
  const addWallArt = (tex, x, y, z, ry, w = 3.2, h = 2.0) => {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, map: tex || null });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    p.position.set(x, y, z);
    p.rotation.y = ry;
    world.group.add(p);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x111018, roughness: 0.85 })
    );
    frame.position.set(x, y, z - Math.cos(ry) * 0.02);
    frame.rotation.y = ry;
    world.group.add(frame);
  };

  addWallArt(T.casinoArt1, -4.5, 2.1, -13.85, 0, 3.2, 2.0);
  addWallArt(T.casinoArt2, 4.5, 2.1, -13.85, 0, 3.2, 2.0);

  // ------------------ TABLE ------------------
  const table = new THREE.Group();
  table.name = "PokerTable";
  table.position.set(0, 0, -6.5);
  world.group.add(table);

  const feltMat = new THREE.MeshStandardMaterial({ color: 0x0f5d3a, roughness: 0.92, map: T.felt || null });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.82, map: T.trim || null });

  const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.18, 64), feltMat);
  felt.position.y = 0.92;
  table.add(felt);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.18, 18, 80), trimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.01;
  table.add(rim);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.42, 0.9, 24),
    new THREE.MeshStandardMaterial({ color: 0x1b1f2a, roughness: 0.95 })
  );
  stem.position.y = 0.46;
  table.add(stem);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 0.95, 0.12, 28),
    new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 1.0 })
  );
  base.position.y = 0.06;
  table.add(base);

  world.tableFocus.set(0, 0, -6.5);

  // ------------------ RAILS (pushed outward a bit so not inside chairs) ------------------
  const rails = new THREE.Group();
  rails.name = "Rails";
  table.add(rails);

  const railMat = new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.85 });
  const railR = 3.55; // <-- OUTWARD FIX
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 10), railMat);
    post.position.set(Math.cos(a) * railR, 0.25, Math.sin(a) * railR);
    rails.add(post);
  }
  const railRing = new THREE.Mesh(
    new THREE.TorusGeometry(railR, 0.045, 10, 80),
    new THREE.MeshStandardMaterial({ color: 0x1b1c26, roughness: 0.85 })
  );
  railRing.rotation.x = Math.PI / 2;
  railRing.position.y = 0.5;
  rails.add(railRing);

  // ------------------ CHAIRS (6) ------------------
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x151821, roughness: 0.95 });
  const chairSeatMat = new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.85 });

  function makeChair() {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.07, 18), chairSeatMat);
    seat.position.y = 0.48;
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.08), chairMat);
    back.position.set(0, 0.83, -0.22);
    g.add(back);

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.45, 12), chairMat);
    leg.position.y = 0.22;
    g.add(leg);

    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 16), chairMat);
    foot.position.y = 0.03;
    g.add(foot);

    return g;
  }

  // seats (6)
  const c = world.tableFocus.clone();
  const r = 3.35; // chair ring
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Vector3(c.x + Math.cos(a) * r, 0, c.z + Math.sin(a) * r);
    const yaw = Math.atan2(c.x - p.x, c.z - p.z);
    world.seats.push({ position: p, yaw });

    const chair = makeChair();
    chair.position.set(p.x, 0, p.z);
    chair.rotation.y = yaw;
    world.group.add(chair);
  }

  // ------------------ SCORPION ROOM ------------------
  const scorpion = new THREE.Group();
  scorpion.name = "ScorpionRoom";
  scorpion.position.set(-11.5, 0, -7.0);
  world.group.add(scorpion);

  const scFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({ color: 0x0f0f16, roughness: 0.95 })
  );
  scFloor.rotation.x = -Math.PI / 2;
  scorpion.add(scFloor);

  const scWallMat = new THREE.MeshStandardMaterial({ color: 0x0f1020, roughness: 0.95 });
  const scWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), scWallMat);
    m.position.set(x, y, z);
    scorpion.add(m);
  };
  scWall(10, 3.5, 0.25, 0, 1.75, -5);
  scWall(10, 3.5, 0.25, 0, 1.75, 5);
  scWall(0.25, 3.5, 10, -5, 1.75, 0);
  scWall(0.25, 3.5, 10, 5, 1.75, 0);

  if (T.scorpionBrand) {
    const brand = new THREE.Mesh(
      new THREE.PlaneGeometry(4.8, 2.6),
      new THREE.MeshStandardMaterial({ map: T.scorpionBrand, color: 0xffffff })
    );
    brand.position.set(0, 1.9, -4.85);
    scorpion.add(brand);
  }
  scorpion.add(new THREE.PointLight(0xff2bd6, 0.6, 10).position.set(0, 2.2, 0));

  // ------------------ STORE CORNER ------------------
  const store = new THREE.Group();
  store.name = "Store";
  store.position.set(6.2, 0, 5.8);
  world.group.add(store);

  const sign = makeSign(THREE, "STORE");
  sign.position.set(0, 2.25, 0);
  store.add(sign);

  // store pedestals (visual only for now)
  const pedMat = new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 0.95 });
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * 0.85;
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.30, 0.5, 18), pedMat);
    ped.position.set(x, 0.25, 0);
    store.add(ped);

    const label = makeSign(THREE, ["Shirt","Crown","Hat","Chips"][i]);
    label.scale.set(0.32, 0.32, 0.32);
    label.position.set(x, 1.32, 0.12);
    store.add(label);
  }

  // ------------------ POKER VIEW UI (always visible) ------------------
  const pokerView = buildPokerView(THREE);
  pokerView.position.set(0, 1.05, -6.5);
  world.group.add(pokerView);

  world.pokerUI = pokerView.userData.ui;
  world.setPotText = (txt) => pokerView.userData.ui?.setPot?.(txt);

  // ------------------ TELEPORT MACHINE ------------------
  let teleLoaded = false;
  try {
    const mod = await import(`./teleport_machine.js?v=${encodeURIComponent(v)}`);
    if (mod?.TeleportMachine?.build) {
      const tele = mod.TeleportMachine.build({ THREE, scene, texLoader });
      if (tele) {
        tele.position.set(0, 0, 2.2);
        world.teleporter = tele;
        teleLoaded = true;

        if (typeof mod.TeleportMachine.getSafeSpawn === "function") {
          const s = mod.TeleportMachine.getSafeSpawn(THREE);
          if (s?.position) world.spawnPads = [s.position.clone()];
        }
        if (typeof mod.TeleportMachine.tick === "function") {
          const prev = world.tick;
          world.tick = (dt) => { prev(dt); mod.TeleportMachine.tick(dt); };
        }
        log("[world] ✅ TeleportMachine loaded + ticking");
      }
    }
  } catch (e) {
    log("[world] ❌ teleport_machine.js import failed: " + (e?.message || e));
  }

  if (!teleLoaded) {
    const fallback = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.07, 16, 64),
      new THREE.MeshStandardMaterial({ color: 0x6a2bff, emissive: 0x6a2bff, emissiveIntensity: 1.2 })
    );
    fallback.rotation.x = Math.PI / 2;
    fallback.position.set(0, 1.0, 2.2);
    world.group.add(fallback);
    log("[world] ⚠️ Using fallback teleporter ring");
  }

  // ------------------ BOTS ------------------
  try {
    const botsMod = await import(`./bots.js?v=${encodeURIComponent(v)}`);
    if (botsMod?.Bots?.init) {
      botsMod.Bots.init({
        THREE,
        scene,
        getSeats: () => world.seats,
        getLobbyZone: () => world.lobbyZone,
        tableFocus: world.tableFocus,
      });
      world.bots = botsMod.Bots;

      const prev = world.tick;
      world.tick = (dt) => { prev(dt); world.bots.update(dt); };

      log("[world] ✅ bots.js loaded");
    } else {
      log("[world] ⚠️ bots.js missing Bots.init");
    }
  } catch (e) {
    log("[world] ⚠️ bots import failed: " + (e?.message || e));
  }

  // ------------------ POKER SIM ------------------
  try {
    const simMod = await import(`./poker_simulation.js?v=${encodeURIComponent(v)}`);
    if (simMod?.PokerSimulation?.init) {
      simMod.PokerSimulation.init({ bots: world.bots, world });
      const prev = world.tick;
      world.tick = (dt) => { prev(dt); simMod.PokerSimulation.update(dt); };
      log("[world] ✅ PokerSimulation init");
    }
  } catch (e) {
    log("[world] ⚠️ PokerSimulation import failed: " + (e?.message || e));
  }

  log("[world] ready ✅");
  return world;
}

// ---------------- helpers ----------------
function makeSign(THREE, text) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "rgba(15, 18, 32, 0.75)";
  roundRect(ctx, 40, 70, 432, 116, 36);
  ctx.fill();

  ctx.strokeStyle = "rgba(180, 107, 255, 0.85)";
  ctx.lineWidth = 8;
  roundRect(ctx, 40, 70, 432, 116, 36);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 64px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 128);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95, depthTest: false });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), m);
  return p;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function buildPokerView(THREE) {
  const g = new THREE.Group();
  g.name = "PokerView";

  // community cards (always visible)
  const community = new THREE.Group();
  community.name = "community";

  const cardMat = new THREE.MeshStandardMaterial({ color: 0xf4f5ff, roughness: 0.65 });
  const backMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.95 });

  for (let i = 0; i < 5; i++) {
    const card = new THREE.Group();

    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.20, 0.28), cardMat);
    face.position.z = 0.003;
    card.add(face);

    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.20, 0.28), backMat);
    back.rotation.y = Math.PI;
    back.position.z = -0.003;
    card.add(back);

    card.position.set((i - 2) * 0.24, 0.12, 0);
    card.rotation.x = -0.7;
    community.add(card);
  }
  g.add(community);

  // pot sign
  const pot = makeSign(THREE, "POT: 150");
  pot.name = "potText";
  pot.scale.set(0.42, 0.42, 0.42);
  pot.position.set(0, 0.28, -0.55);
  pot.rotation.x = -0.55;
  g.add(pot);

  // action sign (what happened)
  const action = makeSign(THREE, "Waiting…");
  action.name = "actionText";
  action.scale.set(0.42, 0.42, 0.42);
  action.position.set(0, 0.40, -0.92);
  action.rotation.x = -0.55;
  g.add(action);

  // simple controller for UI text
  g.userData.ui = {
    setPot(txt) { replaceTextOnSign(THREE, pot, txt); },
    setLine(txt) { replaceTextOnSign(THREE, action, txt); }
  };

  // hover animation
  g.userData.t = 0;
  const prevTick = g.userData.tick || (() => {});
  g.userData.tick = (dt) => {
    prevTick(dt);
    g.userData.t += dt;
    const t = g.userData.t;
    community.position.y = 0.12 + Math.sin(t * 1.6) * 0.015;
  };

  return g;
}

function replaceTextOnSign(THREE, signMesh, text) {
  // signMesh is a Plane with a CanvasTexture
  const mat = signMesh.material;
  if (!mat?.map) return;

  // re-create canvas for simplicity
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "rgba(15, 18, 32, 0.75)";
  roundRect(ctx, 40, 70, 432, 116, 36);
  ctx.fill();

  ctx.strokeStyle = "rgba(180, 107, 255, 0.85)";
  ctx.lineWidth = 8;
  roundRect(ctx, 40, 70, 432, 116, 36);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 50px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 128);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  mat.map.dispose?.();
  mat.map = tex;
  mat.needsUpdate = true;
         }
