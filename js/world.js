// /js/world.js — Scarlett VR Poker (FULL, self-contained, robust)
// Works with main.js that calls: initWorld({ THREE, scene, log })
//
// What this builds:
// - Room: floor + 4 solid walls + ceiling glow
// - Poker table (simple but solid)
// - Seats array (6 seats) + lobby zone
// - Teleporter machine (stand + ring + purple energy FX)
// - Bots: 6 seated + 2 lobby wanderers (simple mannequin bots)
// - Exposes: spawnPads, tableFocus, roomClamp, tick(dt)

export async function initWorld({ THREE, scene, log = console.log }) {
  log("[world] init start");

  const world = {
    group: new THREE.Group(),
    spawnPads: [],
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    roomClamp: { minX: -7.5, maxX: 7.5, minZ: -13.5, maxZ: 7.5 },
    seats: [],
    lobbyZone: { min: new THREE.Vector3(-6, 0, 3.5), max: new THREE.Vector3(6, 0, 7.0) },
    tick: (dt) => {},
  };

  world.group.name = "World";
  scene.add(world.group);

  // -----------------------
  // LIGHTING (safe defaults)
  // -----------------------
  // Main ambient already added in main.js usually, but add a bit more just in case.
  const hemi = new THREE.HemisphereLight(0xffffff, 0x111122, 0.35);
  world.group.add(hemi);

  const fill = new THREE.DirectionalLight(0xffffff, 0.25);
  fill.position.set(-4, 6, 6);
  world.group.add(fill);

  // -----------------------
  // ROOM
  // -----------------------
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.95 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.92 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x0f0f16, roughness: 0.75, metalness: 0.1 });

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 24), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -3);
  floor.receiveShadow = false;
  floor.name = "Floor";
  world.group.add(floor);

  // Walls (solid)
  const wallH = 3.2;
  const wallT = 0.25;

  const makeWall = (w, h, d) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);

  // North wall (behind table)
  const wallN = makeWall(18, wallH, wallT);
  wallN.position.set(0, wallH / 2, -15);
  world.group.add(wallN);

  // South wall (behind player spawn area)
  const wallS = makeWall(18, wallH, wallT);
  wallS.position.set(0, wallH / 2, 9);
  world.group.add(wallS);

  // West wall
  const wallW = makeWall(wallT, wallH, 24);
  wallW.position.set(-9, wallH / 2, -3);
  world.group.add(wallW);

  // East wall
  const wallE = makeWall(wallT, wallH, 24);
  wallE.position.set(9, wallH / 2, -3);
  world.group.add(wallE);

  // Ceiling “soft glow”
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 24),
    new THREE.MeshStandardMaterial({ color: 0x0a0a10, roughness: 1, emissive: 0x080820, emissiveIntensity: 0.55 })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, wallH + 0.02, -3);
  world.group.add(ceil);

  // Simple trim rails
  const rail = new THREE.Mesh(new THREE.BoxGeometry(18, 0.08, 0.12), trimMat);
  rail.position.set(0, 1.05, -10.8);
  world.group.add(rail);

  // -----------------------
  // TABLE (simple but clean)
  // -----------------------
  const tableGroup = new THREE.Group();
  tableGroup.name = "PokerTable";
  tableGroup.position.set(0, 0, -6.5);
  world.group.add(tableGroup);

  // Table base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.75, 0.85, 24),
    new THREE.MeshStandardMaterial({ color: 0x16161d, roughness: 0.65, metalness: 0.05 })
  );
  base.position.y = 0.42;
  tableGroup.add(base);

  // Table top
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(2.55, 2.55, 0.18, 48),
    new THREE.MeshStandardMaterial({ color: 0x101016, roughness: 0.65 })
  );
  top.position.y = 0.92;
  tableGroup.add(top);

  // Felt
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(2.25, 2.25, 0.06, 48),
    new THREE.MeshStandardMaterial({ color: 0x0a3b2a, roughness: 0.95 })
  );
  felt.position.y = 1.02;
  tableGroup.add(felt);

  // Felt rim line
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(2.26, 0.015, 10, 80),
    new THREE.MeshStandardMaterial({ color: 0x0f0f18, roughness: 0.6, metalness: 0.2 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.05;
  tableGroup.add(rim);

  // Table focus point for facing
  world.tableFocus = new THREE.Vector3(0, 0, -6.5);

  // -----------------------
  // SEATS (6 seats around table)
  // -----------------------
  const seatRadius = 3.55;
  const seatCount = 6;

  for (let i = 0; i < seatCount; i++) {
    const a = (i / seatCount) * Math.PI * 2;
    const x = Math.cos(a) * seatRadius;
    const z = -6.5 + Math.sin(a) * seatRadius;

    // yaw facing table center
    const yaw = Math.atan2(-x, (-6.5 - z)); // face toward (0,-6.5)

    world.seats.push({
      position: new THREE.Vector3(x, 0, z),
      yaw,
    });

    // optional seat marker (invisible by default)
    // const m = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,0.01,12), new THREE.MeshBasicMaterial({color:0x222222}));
    // m.position.set(x, 0.01, z); m.visible = false; world.group.add(m);
  }

  // -----------------------
  // TELEPORT MACHINE + FX
  // -----------------------
  const teleportMachine = buildTeleporterMachine(THREE);
  teleportMachine.position.set(0, 0, 4.8);
  world.group.add(teleportMachine);

  // -----------------------
  // SPAWN PADS
  // -----------------------
  // Spawn the player a bit forward of the table, facing it
  world.spawnPads.push(new THREE.Vector3(0, 0, 2.0));

  // -----------------------
  // BOTS (simple mannequins)
  // -----------------------
  const bots = [];
  const botGroup = new THREE.Group();
  botGroup.name = "Bots";
  world.group.add(botGroup);

  function createBot(color = 0xff2bd6) {
    const g = new THREE.Group();
    g.name = "Bot";

    // Body (shirt-like capsule)
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.20, 0.48, 6, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 })
    );
    body.position.y = 0.78;
    g.add(body);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 14),
      new THREE.MeshStandardMaterial({ color: 0xf2d6c9, roughness: 0.85 })
    );
    head.position.y = 1.25;
    g.add(head);

    // Tiny chest badge (so they look “styled”)
    const badge = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.09),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 })
    );
    badge.position.set(0, 0.96, 0.215);
    g.add(badge);

    g.userData = {
      seated: false,
      eliminated: false,
      target: null,
      baseColor: color,
      crown: null,
      t: Math.random() * 10,
    };

    return g;
  }

  function sendToLobby(bot) {
    const z0 = world.lobbyZone.min.z;
    const z1 = world.lobbyZone.max.z;
    const x0 = world.lobbyZone.min.x;
    const x1 = world.lobbyZone.max.x;

    const x = THREE.MathUtils.lerp(x0, x1, Math.random());
    const z = THREE.MathUtils.lerp(z0, z1, Math.random());
    bot.position.set(x, 0, z);
    bot.userData.target = new THREE.Vector3(x, 0, z);
    bot.userData.seated = false;
  }

  function pickLobbyTarget() {
    const x = THREE.MathUtils.lerp(world.lobbyZone.min.x, world.lobbyZone.max.x, Math.random());
    const z = THREE.MathUtils.lerp(world.lobbyZone.min.z, world.lobbyZone.max.z, Math.random());
    return new THREE.Vector3(x, 0, z);
  }

  function giveCrown(bot) {
    if (bot.userData.crown) return;

    const crown = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.05, 10, 16),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        emissive: 0xffd27a,
        emissiveIntensity: 0.35,
        roughness: 0.35,
        metalness: 0.55,
      })
    );
    crown.rotation.x = Math.PI / 2;
    crown.position.y = 1.45;
    crown.name = "crown";
    bot.add(crown);
    bot.userData.crown = crown;
  }

  function removeCrown(bot) {
    if (!bot.userData.crown) return;
    bot.remove(bot.userData.crown);
    bot.userData.crown = null;
  }

  // Create 8 bots (6 seated, 2 lobby)
  for (let i = 0; i < 8; i++) {
    const color = i % 2 ? 0x2bd7ff : 0xff2bd6;
    const b = createBot(color);
    botGroup.add(b);
    bots.push(b);
  }

  function seatBots() {
    for (let i = 0; i < bots.length; i++) {
      const b = bots[i];
      b.userData.eliminated = false;
      removeCrown(b);

      if (i < world.seats.length) {
        const s = world.seats[i];
        b.position.set(s.position.x, 0, s.position.z);
        b.rotation.set(0, s.yaw, 0);
        b.userData.seated = true;
      } else {
        sendToLobby(b);
      }
    }
  }

  seatBots();

  // Simple tournament/winner loop (like your earlier bots.js)
  let state = "playing";
  let timer = 0;
  let winner = null;

  // -----------------------
  // WORLD TICK
  // -----------------------
  world.tick = (dt) => {
    // Teleporter FX tick
    tickTeleporterFX(THREE, teleportMachine, dt);

    // Bot idle / wander
    timer += dt;

    // Eliminate one seated every 12s until 2 remain, then crown winner for 60s
    if (state === "playing" && timer > 12) {
      timer = 0;
      const seated = bots.filter((b) => b.userData.seated && !b.userData.eliminated);

      if (seated.length > 2) {
        const out = seated[Math.floor(Math.random() * seated.length)];
        out.userData.eliminated = true;
        out.userData.seated = false;
        sendToLobby(out);
      } else {
        state = "winner_walk";
        winner = seated[Math.floor(Math.random() * seated.length)];
        giveCrown(winner);
        winner.userData.seated = false;
        sendToLobby(winner);
        timer = 0;
      }
    }

    if (state === "winner_walk" && timer > 60) {
      timer = 0;
      if (winner) removeCrown(winner);
      winner = null;
      state = "playing";
      seatBots();
    }

    // Lobby wandering + subtle idle wobble for seated
    for (const b of bots) {
      b.userData.t += dt;

      if (b.userData.seated) {
        // micro idle
        b.position.y = Math.sin(b.userData.t * 1.6) * 0.015;
        continue;
      }

      // walking
      if (!b.userData.target || b.position.distanceTo(b.userData.target) < 0.22) {
        b.userData.target = pickLobbyTarget();
      }

      const dir = b.userData.target.clone().sub(b.position);
      dir.y = 0;
      const dist = dir.length();

      if (dist > 0.001) {
        dir.normalize();
        b.position.addScaledVector(dir, dt * 0.75);

        // keep inside clamp
        b.position.x = THREE.MathUtils.clamp(b.position.x, world.roomClamp.minX + 0.5, world.roomClamp.maxX - 0.5);
        b.position.z = THREE.MathUtils.clamp(b.position.z, world.roomClamp.minZ + 0.5, world.roomClamp.maxZ - 0.5);

        b.lookAt(b.userData.target.x, b.position.y, b.userData.target.z);
      }
    }
  };

  log("[world] init done ✅");
  return world;
}

// ======================================================
// TELEPORT MACHINE BUILDER + FX (purple electricity vibe)
// ======================================================

function buildTeleporterMachine(THREE) {
  const g = new THREE.Group();
  g.name = "TeleportMachine";

  // Base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.9, 0.22, 28),
    new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.85, metalness: 0.1 })
  );
  base.position.y = 0.11;
  g.add(base);

  // Pedestal
  const ped = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.55, 0.55, 22),
    new THREE.MeshStandardMaterial({ color: 0x161622, roughness: 0.8, metalness: 0.15 })
  );
  ped.position.y = 0.49;
  g.add(ped);

  // Top ring housing
  const top = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.08, 12, 40),
    new THREE.MeshStandardMaterial({ color: 0x1b1b29, roughness: 0.7, metalness: 0.2 })
  );
  top.rotation.x = Math.PI / 2;
  top.position.y = 0.85;
  g.add(top);

  // Purple energy ring (the “electricity thing”)
  const energyRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.03, 10, 64),
    new THREE.MeshBasicMaterial({
      color: 0xb35cff,
      transparent: true,
      opacity: 0.85,
    })
  );
  energyRing.rotation.x = Math.PI / 2;
  energyRing.position.y = 0.86;
  energyRing.name = "fx_energyRing";
  g.add(energyRing);

  // Soft beam
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.26, 1.8, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xb35cff,
      transparent: true,
      opacity: 0.10,
      side: THREE.DoubleSide,
    })
  );
  beam.position.y = 1.05;
  beam.name = "fx_beam";
  g.add(beam);

  // Point light glow
  const glow = new THREE.PointLight(0xb35cff, 0.85, 7.5);
  glow.position.set(0, 1.1, 0);
  glow.name = "fx_light";
  g.add(glow);

  // Tiny particles (cheap)
  const particleCount = 70;
  const pGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(particleCount * 3);
  const vel = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.18 + Math.random() * 0.42;
    pos[i * 3 + 0] = Math.cos(a) * r;
    pos[i * 3 + 1] = 0.65 + Math.random() * 0.85;
    pos[i * 3 + 2] = Math.sin(a) * r;

    vel[i * 3 + 0] = (Math.random() - 0.5) * 0.06;
    vel[i * 3 + 1] = 0.06 + Math.random() * 0.08;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.06;
  }

  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  pGeo.userData.vel = vel;

  const pMat = new THREE.PointsMaterial({
    color: 0xe7c7ff,
    size: 0.04,
    transparent: true,
    opacity: 0.55,
  });

  const points = new THREE.Points(pGeo, pMat);
  points.name = "fx_particles";
  g.add(points);

  g.userData._t = Math.random() * 10;
  return g;
}

function tickTeleporterFX(THREE, teleporter, dt) {
  if (!teleporter) return;
  teleporter.userData._t += dt;
  const t = teleporter.userData._t;

  const ring = teleporter.getObjectByName("fx_energyRing");
  const beam = teleporter.getObjectByName("fx_beam");
  const light = teleporter.getObjectByName("fx_light");
  const particles = teleporter.getObjectByName("fx_particles");

  const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);

  if (ring) {
    ring.rotation.z = t * 0.75;
    ring.material.opacity = 0.55 + pulse * 0.35; // brighter glow
    const s = 1.0 + pulse * 0.06;
    ring.scale.set(s, s, s);
  }

  if (beam) {
    beam.material.opacity = 0.06 + pulse * 0.10;
  }

  if (light) {
    light.intensity = 0.65 + pulse * 0.55;
  }

  if (particles) {
    const posAttr = particles.geometry.getAttribute("position");
    const vel = particles.geometry.userData.vel;

    for (let i = 0; i < posAttr.count; i++) {
      let x = posAttr.getX(i) + vel[i * 3 + 0] * dt;
      let y = posAttr.getY(i) + vel[i * 3 + 1] * dt;
      let z = posAttr.getZ(i) + vel[i * 3 + 2] * dt;

      // gentle swirl around center
      const ang = Math.atan2(z, x) + dt * (0.6 + pulse * 0.6);
      const r = Math.sqrt(x * x + z * z);
      x = Math.cos(ang) * r;
      z = Math.sin(ang) * r;

      if (y > 1.55) y = 0.65;

      posAttr.setXYZ(i, x, y, z);
    }
    posAttr.needsUpdate = true;
  }
    }
