// /js/world.js — SAFE FULL WORLD (prefers your real modules; falls back safely)
// IMPORTANT: Do NOT import THREE here. Use the THREE passed from main.js.

export async function initWorld({ THREE, scene, log = console.log }) {
  log("[world] SAFE FULL WORLD boot");

  const world = {
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    spawnPads: [],
    roomClamp: { minX: -8, maxX: 8, minZ: -14, maxZ: 8 },
    seats: [],
    lobbyZone: { min: new THREE.Vector3(-6, 0, 8), max: new THREE.Vector3(6, 0, 14) },
    bots: null,
    tick: (dt) => {},
  };

  world.group.name = "World";
  scene.add(world.group);

  // ------------------ ROOM (safe) ------------------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.98 })
  );
  floor.rotation.x = -Math.PI / 2;
  world.group.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 0.95 });
  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    world.group.add(m);
  };
  mkWall(16, 4, 0.3, 0, 2, -14);
  mkWall(16, 4, 0.3, 0, 2, 8);
  mkWall(0.3, 4, 22, -8, 2, -3);
  mkWall(0.3, 4, 22, 8, 2, -3);

  // ------------------ TABLE (prefer your real one) ------------------
  let tableObj = null;

  tableObj = await tryCreateFromModule(`./table.js`, THREE, { scene, world, log });
  if (!tableObj) tableObj = await tryCreateFromModule(`./boss_table.js`, THREE, { scene, world, log });

  if (!tableObj) {
    // fallback table
    const table = new THREE.Group();
    table.position.set(0, 0, -6.5);

    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.6, 0.18, 48),
      new THREE.MeshStandardMaterial({ color: 0x0f5d3a, roughness: 0.9 })
    );
    felt.position.y = 0.9;
    table.add(felt);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.18, 18, 64),
      new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.8 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.99;
    table.add(rim);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.42, 0.85, 20),
      new THREE.MeshStandardMaterial({ color: 0x1b1f2a, roughness: 0.95 })
    );
    stem.position.y = 0.45;
    table.add(stem);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.1, 28),
      new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 1 })
    );
    base.position.y = 0.05;
    table.add(base);

    tableObj = table;
  }

  // ensure placed
  if (tableObj) {
    if (!tableObj.position) tableObj.position = new THREE.Vector3();
    // if your real table already positions itself, it can ignore this
    if (tableObj.position.length() === 0) tableObj.position.set(0, 0, -6.5);
    world.group.add(tableObj);
  }

  world.tableFocus.set(0, 0, -6.5);

  // seats (6) around focus
  const c = world.tableFocus.clone();
  const r = 3.2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Vector3(c.x + Math.cos(a) * r, 0, c.z + Math.sin(a) * r);
    world.seats.push({ position: p, yaw: Math.atan2(c.x - p.x, c.z - p.z) });
  }

  // spawn pad
  world.spawnPads = [new THREE.Vector3(world.tableFocus.x, 0, world.tableFocus.z + 6)];

  // ------------------ TELEPORT MACHINE (USE YOUR ORIGINAL) ------------------
  let tele = null;

  // Your real module is lowercase in your repo: teleport_machine.js
  tele = await tryCreateFromModule(`./teleport_machine.js`, THREE, { scene, world, log });

  // Fallback ONLY if your module didn’t load
  if (!tele) {
    log("[world] ⚠️ using SAFE teleporter fallback (your module didn’t load)");
    tele = buildSafeTeleportMachine(THREE);
  }

  tele.position.set(0, 0, 2.2);
  world.group.add(tele);

  // If fallback teleporter, tick FX
  if (tele?.name === "TeleportMachine_SAFE") {
    const prevTick = world.tick;
    world.tick = (dt) => {
      prevTick(dt);
      tickTeleportFX(tele, dt);
    };
  }

  // ------------------ BOTS (prefer your real modules) ------------------
  // your repo has bots.js and boss_bots.js
  let botsSystem = null;

  botsSystem = await tryBotsModule(`./bots.js`, THREE, scene, world, log);
  if (!botsSystem) botsSystem = await tryBotsModule(`./boss_bots.js`, THREE, scene, world, log);

  if (!botsSystem) {
    log("[world] ⚠️ Using SAFE bots fallback");
    botsSystem = buildSafeBots(THREE, scene, world);
  }

  world.bots = botsSystem;

  const prevBotsTick = world.tick;
  world.tick = (dt) => {
    prevBotsTick(dt);
    if (botsSystem?.update) botsSystem.update(dt);
  };

  // ------------------ POKER SIM (guarded so it can’t crash the world) ------------------
  try {
    const pokerSim = await import(`./poker_simulation.js?v=${Date.now()}`);
    if (pokerSim?.PokerSimulation?.init) {
      pokerSim.PokerSimulation.init({
        THREE,
        scene,
        getSeats: () => world.seats,
        tableFocus: world.tableFocus,
        world,
        log,
      });

      const tfn = pokerSim.PokerSimulation.update || pokerSim.PokerSimulation.tick;
      if (typeof tfn === "function") {
        let pokerDisabled = false;

        const prevPokerTick = world.tick;
        world.tick = (dt) => {
          prevPokerTick(dt);
          if (pokerDisabled) return;

          try {
            tfn(dt);
          } catch (e) {
            pokerDisabled = true;
            log("❌ PokerSimulation tick crashed (DISABLED): " + (e?.message || e));
            if (e?.stack) log(e.stack);
          }
        };
      }

      log("[world] poker_simulation ✅");
    } else {
      log("[world] ⚠️ poker_simulation loaded but missing PokerSimulation.init");
    }
  } catch (e) {
    log("⚠️ [world] poker_simulation failed: " + (e?.message || e));
  }

  log("[world] SAFE FULL WORLD ready ✅");
  return world;
}

// ------------------ HELPERS ------------------
async function tryCreateFromModule(path, THREE, ctx) {
  try {
    const mod = await import(`${path}?v=${Date.now()}`);

    // Try common export patterns
    const fns = [
      mod.create,
      mod.build,
      mod.make,
      mod.createTeleportMachine,
      mod.buildTeleportMachine,
      mod.makeTeleportMachine,
      mod.createTable,
      mod.buildTable,
      mod.makeTable,
      mod.init,
      mod.default,
    ].filter(Boolean);

    for (const fn of fns) {
      if (typeof fn === "function") {
        const obj = await fn({ THREE, ...ctx });
        if (obj) {
          ctx.log?.(`[world] ✅ loaded ${path}`);
          return obj;
        }
      }
    }

    // If default export is an object with create/build
    if (mod.default && typeof mod.default === "object") {
      for (const k of ["create", "build", "make", "init"]) {
        if (typeof mod.default[k] === "function") {
          const obj = await mod.default[k]({ THREE, ...ctx });
          if (obj) {
            ctx.log?.(`[world] ✅ loaded ${path} (default.${k})`);
            return obj;
          }
        }
      }
    }

    ctx.log?.(`[world] ⚠️ ${path} loaded but no creator function found`);
    return null;
  } catch (e) {
    ctx.log?.(`[world] import failed: ${path} — ${e?.message || e}`);
    return null;
  }
}

async function tryBotsModule(path, THREE, scene, world, log) {
  try {
    const mod = await import(`${path}?v=${Date.now()}`);

    // Most likely shape: export const Bots = { init(...) }
    if (mod?.Bots?.init && typeof mod.Bots.init === "function") {
      const sys = await mod.Bots.init({ THREE, scene, world, log });
      log(`[world] ✅ bots via ${path} (Bots.init)`);
      return sys;
    }

    // Or: export function initBots(...)
    if (mod?.initBots && typeof mod.initBots === "function") {
      const sys = await mod.initBots({ THREE, scene, world, log });
      log(`[world] ✅ bots via ${path} (initBots)`);
      return sys;
    }

    // Or: default export is a system with update()
    if (mod?.default && typeof mod.default === "object" && typeof mod.default.update === "function") {
      log(`[world] ✅ bots via ${path} (default system)`);
      return mod.default;
    }

    log(`[world] ⚠️ ${path} loaded but no bots system found`);
    return null;
  } catch (e) {
    log(`[world] bots import failed: ${path} — ${e?.message || e}`);
    return null;
  }
}

// ---------- SAFE TELEPORT MACHINE + FX (fallback ONLY) ----------
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

  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.55, 18),
    new THREE.MeshStandardMaterial({
      color: 0x0b0c12,
      emissive: 0x6a2bff,
      emissiveIntensity: 0.35,
      roughness: 0.6
    })
  );
  core.position.y = 0.55;
  g.add(core);

  // coils
  for (let i = 0; i < 3; i++) {
    const coil = new THREE.Mesh(
      new THREE.TorusGeometry(0.22 + i * 0.06, 0.02, 10, 28),
      new THREE.MeshStandardMaterial({ color: 0x1a1f2a, roughness: 0.8, metalness: 0.35 })
    );
    coil.rotation.x = Math.PI / 2;
    coil.position.y = 0.35 + i * 0.18;
    g.add(coil);
  }

  // electricity line
  const geo = new THREE.BufferGeometry();
  const pts = new Float32Array(60 * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
  const line = new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({ color: 0xb46bff, transparent: true, opacity: 0.9 })
  );
  line.position.y = 0.55;
  line.name = "zap";
  g.add(line);

  const light = new THREE.PointLight(0x8f3dff, 0.9, 6);
  light.position.set(0, 0.75, 0);
  light.name = "glow";
  g.add(light);

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
      const rr = 0.55 + Math.sin(t * 7 + i * 0.8) * 0.05;
      const y = Math.sin(t * 11 + i * 1.3) * 0.08;
      pos[idx++] = Math.cos(a) * rr;
      pos[idx++] = y;
      pos[idx++] = Math.sin(a) * rr;
    }
    zap.geometry.attributes.position.needsUpdate = true;
  }
}

// ---------- SAFE BOTS (fallback ONLY) ----------
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

  function seatBots() {
    for (let i = 0; i < bots.length; i++) {
      const b = bots[i];
      if (i < 6) {
        const s = world.seats[i];
        b.position.set(s.position.x, 0, s.position.z);
        b.rotation.y = s.yaw;
        b.userData.bot.seated = true;
      } else {
        b.userData.bot.seated = false;
        sendToLobby(b);
      }
    }
  }

  function sendToLobby(bot) {
    const z = THREE.MathUtils.lerp(world.lobbyZone.min.z, world.lobbyZone.max.z, Math.random());
    const x = THREE.MathUtils.lerp(world.lobbyZone.min.x, world.lobbyZone.max.x, Math.random());
    bot.position.set(x, 0, z);
    bot.userData.bot.target = bot.position.clone();
  }

  function pickTarget() {
    const z = THREE.MathUtils.lerp(world.lobbyZone.min.z, world.lobbyZone.max.z, Math.random());
    const x = THREE.MathUtils.lerp(world.lobbyZone.min.x, world.lobbyZone.max.x, Math.random());
    return new THREE.Vector3(x, 0, z);
  }

  seatBots();

  return {
    bots,
    update(dt) {
      for (const b of bots) {
        const d = b.userData.bot;
        if (d.seated) continue;
        if (!d.target || b.position.distanceTo(d.target) < 0.2) d.target = pickTarget();

        const dir = d.target.clone().sub(b.position);
        dir.y = 0;
        const dist = dir.length();
        if (dist > 0.001) {
          dir.normalize();
          b.position.addScaledVector(dir, dt * 0.7);
          b.lookAt(d.target.x, b.position.y, d.target.z);
        }
      }
    }
  };
  }
