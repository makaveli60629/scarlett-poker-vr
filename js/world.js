// /js/world.js — FULL WORLD (YOUR teleporter + FX + safe fallbacks)
// IMPORTANT: Do NOT import THREE here. Use the THREE passed from main.js.

export async function initWorld({ THREE, scene, log = console.log, v = "no-v" }) {
  log("[world] FULL WORLD boot v=" + v);

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

  // ------------------ ROOM ------------------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.98 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  world.group.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 0.95 });
  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    m.castShadow = false;
    m.receiveShadow = true;
    world.group.add(m);
  };
  mkWall(16, 4, 0.3, 0, 2, -14);
  mkWall(16, 4, 0.3, 0, 2, 8);
  mkWall(0.3, 4, 22, -8, 2, -3);
  mkWall(0.3, 4, 22, 8, 2, -3);

  // ------------------ TABLE (safe fallback) ------------------
  const table = new THREE.Group();
  table.name = "TableFallback";
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

  // spawn pad default (behind table)
  world.spawnPads = [new THREE.Vector3(world.tableFocus.x, 0, world.tableFocus.z + 6)];

  // ------------------ YOUR TELEPORTER (PRIMARY) ------------------
  let teleGroup = null;

  try {
    const mod = await import(`./teleport_machine.js?v=${encodeURIComponent(v)}`);

    if (mod?.TeleportMachine?.build) {
      const texLoader = new THREE.TextureLoader();
      teleGroup = mod.TeleportMachine.build(scene, texLoader);

      if (mod.TeleportMachine.getSafeSpawn) {
        const s = mod.TeleportMachine.getSafeSpawn();
        if (s?.position) world.spawnPads = [s.position.clone()];
      }

      log("[world] ✅ teleport_machine.js (YOUR ORIGINAL) loaded");
    } else {
      log("[world] ⚠️ teleport_machine.js loaded but TeleportMachine.build missing");
    }
  } catch (e) {
    log("[world] ❌ teleport_machine.js import failed: " + (e?.message || e));
  }

  // If YOUR teleporter loaded, add tasteful FX to it (doesn't replace it)
  if (teleGroup) {
    const fx = attachTeleporterFX(THREE, teleGroup);
    const prev = world.tick;
    world.tick = (dt) => {
      prev(dt);
      fx.tick(dt);
    };
  }

  // Fallback teleporter if yours did not load
  if (!teleGroup) {
    log("[world] ⚠️ Using SAFE teleporter fallback (your module didn't load)");
    teleGroup = buildSafeTeleportMachine(THREE);
    teleGroup.position.set(0, 0, 2.2);
    world.group.add(teleGroup);

    const prev = world.tick;
    world.tick = (dt) => {
      prev(dt);
      tickTeleportFX(teleGroup, dt);
    };
  }

  // ------------------ BOTS (try yours; fallback safe) ------------------
  let botsSystem = null;

  try {
    const botsMod = await import(`./bots.js?v=${encodeURIComponent(v)}`);
    if (botsMod?.Bots?.init) {
      botsSystem = await botsMod.Bots.init({ THREE, scene, world, log });
      log("[world] ✅ bots.js (Bots.init) loaded");
    } else {
      log("[world] ⚠️ bots.js loaded but no Bots.init");
    }
  } catch (e) {
    log("[world] ⚠️ bots import failed: " + (e?.message || e));
  }

  if (!botsSystem) {
    botsSystem = buildSafeBots(THREE, scene, world);
    log("[world] ⚠️ Using SAFE bots fallback");
  }

  world.bots = botsSystem;
  const prevBotsTick = world.tick;
  world.tick = (dt) => {
    prevBotsTick(dt);
    if (botsSystem?.update) botsSystem.update(dt);
  };

  // ------------------ POKER SIM (guarded, unbound-safe) ------------------
  try {
    const pokerSim = await import(`./poker_simulation.js?v=${encodeURIComponent(v)}`);
    const PS = pokerSim?.PokerSimulation;

    if (PS?.init) {
      PS.init({
        THREE,
        scene,
        getSeats: () => world.seats,
        tableFocus: world.tableFocus,
        world,
        bots: botsSystem,
        log,
      });

      const tfn = PS.update || PS.tick;
      if (typeof tfn === "function") {
        let disabled = false;
        const prevPoker = world.tick;
        world.tick = (dt) => {
          prevPoker(dt);
          if (disabled) return;
          try {
            tfn(dt);
          } catch (e) {
            disabled = true;
            log("❌ PokerSimulation tick crashed (DISABLED): " + (e?.message || e));
          }
        };
      }

      log("[world] ✅ poker_simulation init");
    } else {
      log("[world] ⚠️ poker_simulation loaded but PokerSimulation.init missing");
    }
  } catch (e) {
    log("⚠️ [world] poker_simulation import failed: " + (e?.message || e));
  }

  log("[world] FULL WORLD ready ✅");
  return world;
}

/* =========================
   TELEPORTER FX (for YOUR machine)
========================= */
function attachTeleporterFX(THREE, teleGroup) {
  const fx = new THREE.Group();
  fx.name = "TeleporterFX";
  teleGroup.add(fx);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.035, 14, 72),
    new THREE.MeshStandardMaterial({
      color: 0x6a2bff,
      emissive: 0x6a2bff,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.9,
      roughness: 0.35,
      metalness: 0.1,
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.14;
  fx.add(ring);

  const geo = new THREE.BufferGeometry();
  const pts = new Float32Array(72 * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
  const zap = new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({ color: 0xb46bff, transparent: true, opacity: 0.85 })
  );
  zap.position.y = 0.18;
  fx.add(zap);

  const glow = new THREE.PointLight(0x8f3dff, 0.7, 5);
  glow.position.set(0, 0.8, 0);
  fx.add(glow);

  const sparkGeo = new THREE.BufferGeometry();
  const sparkCount = 22;
  const sparkPos = new Float32Array(sparkCount * 3);
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
  const sparks = new THREE.Points(
    sparkGeo,
    new THREE.PointsMaterial({ color: 0xcaa2ff, size: 0.035, transparent: true, opacity: 0.9 })
  );
  sparks.position.y = 0.35;
  fx.add(sparks);

  let t = 0;
  const sparkVel = Array.from({ length: sparkCount }, () => new THREE.Vector3());
  for (let i = 0; i < sparkCount; i++) respawnSpark(i);

  function respawnSpark(i) {
    const a = Math.random() * Math.PI * 2;
    const rr = 0.25 + Math.random() * 0.35;
    sparkPos[i * 3 + 0] = Math.cos(a) * rr;
    sparkPos[i * 3 + 1] = (Math.random() * 0.15) - 0.05;
    sparkPos[i * 3 + 2] = Math.sin(a) * rr;
    sparkVel[i].set((Math.random() - 0.5) * 0.25, 0.35 + Math.random() * 0.25, (Math.random() - 0.5) * 0.25);
  }

  return {
    tick(dt) {
      t += dt;
      ring.rotation.z += dt * 0.9;
      ring.material.emissiveIntensity = 1.0 + Math.sin(t * 5.0) * 0.35;
      glow.intensity = 0.55 + (Math.sin(t * 6.5) * 0.20);

      const arr = zap.geometry.attributes.position.array;
      let idx = 0;
      for (let i = 0; i < 72; i++) {
        const a = (i / 71) * Math.PI * 2;
        const rr = 0.58 + Math.sin(t * 9 + i * 0.7) * 0.035;
        const y = Math.sin(t * 12 + i * 1.1) * 0.03;
        arr[idx++] = Math.cos(a) * rr;
        arr[idx++] = y;
        arr[idx++] = Math.sin(a) * rr;
      }
      zap.geometry.attributes.position.needsUpdate = true;

      for (let i = 0; i < sparkCount; i++) {
        sparkPos[i * 3 + 0] += sparkVel[i].x * dt;
        sparkPos[i * 3 + 1] += sparkVel[i].y * dt;
        sparkPos[i * 3 + 2] += sparkVel[i].z * dt;
        if (sparkPos[i * 3 + 1] > 0.45 || Math.random() < 0.005) respawnSpark(i);
      }
      sparks.geometry.attributes.position.needsUpdate = true;
    }
  };
}

// ---------- SAFE TELEPORT MACHINE + FX (fallback only) ----------
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

// ---------- SAFE BOTS (fallback) ----------
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
