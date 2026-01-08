// /js/world.js — Scarlett VR Poker 9.2 WORLD (NO THREE import — main.js passes THREE in)

export async function initWorld({ THREE, scene, log = console.log, v = "9020" }) {
  log("[world] init v=" + v);

  const world = {
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    spawnPads: [new THREE.Vector3(0, 0, 3.6)],
    roomClamp: { minX: -7.6, maxX: 7.6, minZ: -13.6, maxZ: 7.6 },
    seats: [],
    lobbyZone: { min: new THREE.Vector3(-6, 0, 6), max: new THREE.Vector3(6, 0, 12) },
    bots: null,
    teleporter: null,
    tick: (dt) => {},
  };

  world.group.name = "World";
  scene.add(world.group);

  // ---------------- TEXTURES ----------------
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
        () => {
          log(`[tex] missing: ${url}`);
          resolve(null);
        }
      );
    });

  const T = {
    carpet: await loadTex("assets/textures/lobby_carpet.jpg", { repeat: [2, 2], srgb: true }),
    brick: await loadTex("assets/textures/brickwall.jpg", { repeat: [2, 1], srgb: true }),
    ceiling: await loadTex("assets/textures/ceiling_dome_main.jpg", { srgb: true }),
    felt: await loadTex("assets/textures/table_felt_green.jpg", { srgb: true }),
  };

  // ---------------- LIGHTING ----------------
  world.group.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.1));

  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(7, 12, 6);
  world.group.add(key);

  const fill = new THREE.PointLight(0x7fe7ff, 0.55, 18);
  fill.position.set(0, 2.4, 2.0);
  world.group.add(fill);

  const purple = new THREE.PointLight(0xb46bff, 0.65, 18);
  purple.position.set(0, 2.6, 3.6);
  world.group.add(purple);

  // ---------------- FLOOR ----------------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x0b0c12, roughness: 0.95, map: T.carpet || null })
  );
  floor.rotation.x = -Math.PI / 2;
  world.group.add(floor);

  // ---------------- WALLS (taller) ----------------
  const wallH = 6.0;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 0.95, map: T.brick || null });

  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    world.group.add(m);
  };

  mkWall(16, wallH, 0.3, 0, wallH / 2, -14);
  mkWall(16, wallH, 0.3, 0, wallH / 2, 8);
  mkWall(0.3, wallH, 22, -8, wallH / 2, -3);
  mkWall(0.3, wallH, 22, 8, wallH / 2, -3);

  // ceiling dome
  const ceiling = new THREE.Mesh(
    new THREE.SphereGeometry(16, 32, 22),
    new THREE.MeshStandardMaterial({ color: 0x070812, roughness: 0.9, map: T.ceiling || null, side: THREE.BackSide })
  );
  ceiling.position.set(0, 6.8, -3);
  ceiling.scale.set(1.3, 0.9, 1.3);
  world.group.add(ceiling);

  // ---------------- SPAWN CIRCLE ----------------
  const spawnRing = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.42, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  spawnRing.rotation.x = -Math.PI / 2;
  spawnRing.position.set(world.spawnPads[0].x, 0.02, world.spawnPads[0].z);
  spawnRing.name = "SpawnRing";
  world.group.add(spawnRing);

  const tick0 = world.tick;
  world.tick = (dt) => {
    tick0(dt);
    spawnRing.userData.t = (spawnRing.userData.t || 0) + dt;
    spawnRing.material.opacity = 0.65 + Math.sin(spawnRing.userData.t * 3.0) * 0.18;
  };

  // ---------------- TABLE ----------------
  const table = new THREE.Group();
  table.position.set(0, 0, -6.5);
  table.name = "PokerTable";
  world.group.add(table);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 0.18, 64),
    new THREE.MeshStandardMaterial({ color: 0x0f5d3a, roughness: 0.92, map: T.felt || null })
  );
  felt.position.y = 0.92;
  table.add(felt);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.18, 18, 80),
    new THREE.MeshStandardMaterial({ color: 0x1b0f0c, roughness: 0.85 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.01;
  table.add(rim);

  // ---------------- RAILS (bigger radius + glow) ----------------
  const rails = new THREE.Group();
  rails.name = "Rails";
  table.add(rails);

  const railR = 3.75;
  const postMat = new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.85 });
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.62, 10), postMat);
    post.position.set(Math.cos(a) * railR, 0.31, Math.sin(a) * railR);
    rails.add(post);
  }

  const railRing = new THREE.Mesh(
    new THREE.TorusGeometry(railR, 0.05, 10, 90),
    new THREE.MeshStandardMaterial({ color: 0x1b1c26, roughness: 0.85 })
  );
  railRing.rotation.x = Math.PI / 2;
  railRing.position.y = 0.62;
  rails.add(railRing);

  const glowRing = new THREE.Mesh(
    new THREE.TorusGeometry(railR, 0.018, 10, 120),
    new THREE.MeshStandardMaterial({
      color: 0x7fe7ff,
      emissive: 0x2bd7ff,
      emissiveIntensity: 1.35,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85
    })
  );
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.69;
  rails.add(glowRing);

  const tick1 = world.tick;
  world.tick = (dt) => {
    tick1(dt);
    glowRing.userData.t = (glowRing.userData.t || 0) + dt;
    glowRing.material.emissiveIntensity = 1.15 + Math.sin(glowRing.userData.t * 3.5) * 0.35;
  };

  // ---------------- CHAIRS (6 seats) ----------------
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x151821, roughness: 0.95 });
  const chairSeatMat = new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.85 });

  function makeChair() {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.08, 18), chairSeatMat);
    seat.position.y = 0.50;
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.62, 0.09), chairMat);
    back.position.set(0, 0.90, -0.24);
    g.add(back);

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.10, 0.48, 12), chairMat);
    leg.position.y = 0.24;
    g.add(leg);

    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 16), chairMat);
    foot.position.y = 0.03;
    g.add(foot);

    return g;
  }

  const c = world.tableFocus.clone();
  const seatR = 3.05;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Vector3(c.x + Math.cos(a) * seatR, 0, c.z + Math.sin(a) * seatR);
    const yaw = Math.atan2(c.x - p.x, c.z - p.z);
    world.seats.push({ position: p, yaw });

    const chair = makeChair();
    chair.position.set(p.x, 0, p.z);
    chair.rotation.y = yaw;
    world.group.add(chair);
  }

  // ---------------- TELEPORT MACHINE ----------------
  try {
    const mod = await import(`./teleport_machine.js?v=${encodeURIComponent(v)}`);
    if (mod?.TeleportMachine?.build) {
      const tele = mod.TeleportMachine.build({ THREE, scene: world.group, texLoader, log });
      tele.position.set(0, 0, 3.6);
      world.teleporter = tele;

      if (typeof mod.TeleportMachine.tick === "function") {
        const prev = world.tick;
        world.tick = (dt) => { prev(dt); try { mod.TeleportMachine.tick(dt); } catch {} };
      }
      log("[world] ✅ TeleportMachine loaded");
    }
  } catch (e) {
    log("[world] ⚠️ teleport_machine.js import failed: " + (e?.message || e));
  }

  // ---------------- BOTS ----------------
  try {
    const botsMod = await import(`./bots.js?v=${encodeURIComponent(v)}`);
    if (botsMod?.Bots?.init) {
      botsMod.Bots.init({
        THREE,
        scene: world.group,
        getSeats: () => world.seats,
        getLobbyZone: () => world.lobbyZone,
        tableFocus: world.tableFocus,
      });

      world.bots = botsMod.Bots;

      const prev = world.tick;
      world.tick = (dt) => { prev(dt); botsMod.Bots.update(dt); };

      log("[world] ✅ bots.js loaded");
    }
  } catch (e) {
    log("[world] ⚠️ bots import failed: " + (e?.message || e));
  }

  log("[world] ready ✅");
  return world;
      }
