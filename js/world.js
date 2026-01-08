// /js/world.js — Scarlett VR Poker 9.2 (ACTIVE TELEPORTER + ALIGNMENT PASS)

export async function initWorld({ THREE, scene, log = console.log, v = "9022" }) {
  log("[world] init v=" + v);

  const world = {
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    spawnPads: [new THREE.Vector3(0, 0, 3.5)],
    roomClamp: { minX: -7.6, maxX: 7.6, minZ: -13.6, maxZ: 7.6 },
    seats: [],
    lobbyZone: { min: new THREE.Vector3(-6, 0, 6), max: new THREE.Vector3(6, 0, 12) },
    teleporter: null,
    teleUI: null,
    bots: null,
    tick: (dt) => {},
    handleTeleportConfirm: null,
  };

  world.group.name = "World";
  scene.add(world.group);

  // textures safe
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
        () => resolve(null)
      );
    });

  const T = {
    carpet: await loadTex("assets/textures/lobby_carpet.jpg", { repeat: [2, 2], srgb: true }),
    brick: await loadTex("assets/textures/brickwall.jpg", { repeat: [2, 1], srgb: true }),
    felt: await loadTex("assets/textures/table_felt_green.jpg", { srgb: true }),
    trim: await loadTex("assets/textures/Table leather trim.jpg", { srgb: true }),
  };

  // lights boost
  world.group.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.1));
  const p1 = new THREE.PointLight(0x33aaff, 0.6, 18); p1.position.set(0, 2.6, -7.5); world.group.add(p1);
  const p2 = new THREE.PointLight(0xb46bff, 0.7, 18); p2.position.set(0, 2.6, 2.5); world.group.add(p2);

  // floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.95, map: T.carpet || null })
  );
  floor.rotation.x = -Math.PI / 2;
  world.group.add(floor);
// ---------- SAFE BOTS fallback (RIGGED pill bodies) ----------
async function buildSafeBots(THREE, scene, world, v, log) {
  // Import rig helper (local file, GitHub Pages safe)
  let Rig = null;
  try {
    Rig = await import(`./avatar_rig.js?v=${encodeURIComponent(v)}`);
    log?.("[world] ✅ avatar_rig.js loaded");
  } catch (e) {
    log?.("[world] ⚠️ avatar_rig.js import failed: " + (e?.message || e));
  }

  const bots = [];
  const totalBots = 8;

  // textures (you uploaded from the zip)
  const MALE_TEX   = "assets/textures/avatars/suit_male_albedo.png";
  const FEMALE_TEX = "assets/textures/avatars/suit_female_albedo.png";

  // If rig import fails, fallback material (still visible)
  const fallbackMatA = new THREE.MeshStandardMaterial({ color: 0x2bd7ff, roughness: 0.85 });
  const fallbackMatB = new THREE.MeshStandardMaterial({ color: 0xff2bd6, roughness: 0.85 });
  const headMat      = new THREE.MeshStandardMaterial({ color: 0xf2d6c9, roughness: 0.85 });

  function makeFallbackBot(i) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 6, 12), i % 2 ? fallbackMatA : fallbackMatB);
    body.position.y = 0.55;
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), headMat);
    head.position.y = 1.25;
    g.add(head);

    g.userData.avatar = { update: () => {} };
    return g;
  }

  async function makeRigBot(i) {
    const g = new THREE.Group();

    // gender alternation (4 male / 4 female)
    const isFemale = (i % 2) === 1;
    const texUrl = isFemale ? FEMALE_TEX : MALE_TEX;

    // Create rig
    const avatar = Rig?.createAvatarRig
      ? await Rig.createAvatarRig({ THREE, textureUrl: texUrl, gender: isFemale ? "female" : "male" })
      : null;

    if (!avatar) {
      // fallback if rig creation fails
      const fb = makeFallbackBot(i);
      g.add(fb);
      g.userData.avatar = { update: () => {} };
      return g;
    }

    g.add(avatar.root);

    // Add a simple head on top (you can replace later with your real heads)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), headMat);
    head.position.set(0, 1.58, 0);
    g.add(head);

    // store update hook
    g.userData.avatar = avatar;

    return g;
  }

  // Create bots (async because rig)
  for (let i = 0; i < totalBots; i++) {
    const b = await makeRigBot(i);
    b.name = `Bot_${i}`;
    b.userData.bot = {
      id: i,
      seated: false,
      target: null,
      speed: 0.85 + Math.random() * 0.35,
      // used for walk direction smoothing
      vel: new THREE.Vector3(),
      yaw: 0,
      // for “more realistic” walk timing
      stepT: Math.random() * 10,
    };
    scene.add(b);
    bots.push(b);
  }

  // Seating fix:
  // Your chairs seat is at y≈0.48. We want hips around ~0.95 for your table setup,
  // but BOT ROOT should remain y=0 on floor; we offset the avatar root locally.
  const seatedAvatarYOffset = 0.46; // tweak if needed

  // Seat 6, lobby 2
  for (let i = 0; i < bots.length; i++) {
    const b = bots[i];
    if (i < 6) {
      const s = world.seats[i];
      b.position.set(s.position.x, 0, s.position.z);
      b.rotation.y = s.yaw;
      b.userData.bot.seated = true;

      // pull avatar up so “butt is on chair”, not in floor
      const avatarRoot = b.children.find(ch => ch?.name === "AvatarRigRoot") || b.children[0];
      if (avatarRoot) avatarRoot.position.y = seatedAvatarYOffset;
    } else {
      b.userData.bot.seated = false;
      b.position.set((Math.random() * 10) - 5, 0, 9 + Math.random() * 3);
      b.userData.bot.target = b.position.clone();
    }
  }

  function pickTarget() {
    const z = THREE.MathUtils.lerp(world.lobbyZone.min.z, world.lobbyZone.max.z, Math.random());
    const x = THREE.MathUtils.lerp(world.lobbyZone.min.x, world.lobbyZone.max.x, Math.random());
    return new THREE.Vector3(x, 0, z);
  }

  // “More realistic” walk feeling = velocity smoothing + step cycle + slight body lean
  function updateBotWalk(b, dt) {
    const d = b.userData.bot;
    if (d.seated) {
      // idle animation only
      b.userData.avatar?.update?.(dt);
      return;
    }

    if (!d.target || b.position.distanceTo(d.target) < 0.35) d.target = pickTarget();

    const desired = d.target.clone().sub(b.position);
    desired.y = 0;

    const dist = desired.length();
    if (dist < 0.001) return;

    desired.normalize();

    // velocity smoothing
    const targetVel = desired.multiplyScalar(d.speed);
    d.vel.lerp(targetVel, 1 - Math.pow(0.001, dt)); // smooth independent of FPS

    // apply movement
    b.position.addScaledVector(d.vel, dt);

    // yaw smoothing
    const desiredYaw = Math.atan2(d.vel.x, d.vel.z);
    let dy = desiredYaw - d.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    d.yaw += dy * Math.min(1, dt * 8.5);
    b.rotation.y = d.yaw;

    // step cycle: speed-based
    d.stepT += dt * (2.0 + d.speed * 1.8);

    // lean and bob for realism
    const avatarRoot = b.children.find(ch => ch?.name === "AvatarRigRoot") || b.children[0];
    if (avatarRoot) {
      const bob = Math.sin(d.stepT * 2.0) * 0.01;
      const sway = Math.sin(d.stepT) * 0.02;
      avatarRoot.position.y = 0.0 + bob;
      avatarRoot.rotation.z = sway * 0.35;
    }

    // animate skeleton
    b.userData.avatar?.update?.(dt);
  }

  return {
    bots,
    update(dt) {
      for (const b of bots) updateBotWalk(b, dt);
    }
  };
}
  // taller walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 0.95, map: T.brick || null });
  const WALL_H = 6.0, WALL_Y = WALL_H / 2;
  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    world.group.add(m);
  };
  mkWall(16, WALL_H, 0.3, 0, WALL_Y, -14);
  mkWall(16, WALL_H, 0.3, 0, WALL_Y, 8);
  mkWall(0.3, WALL_H, 22, -8, WALL_Y, -3);
  mkWall(0.3, WALL_H, 22, 8, WALL_Y, -3);

  // table
  const table = new THREE.Group();
  table.position.set(0, 0, -6.5);
  world.group.add(table);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 0.18, 64),
    new THREE.MeshStandardMaterial({ color: 0x0f5d3a, roughness: 0.92, map: T.felt || null })
  );
  felt.position.y = 0.92;
  table.add(felt);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.18, 18, 80),
    new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.82, map: T.trim || null })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.01;
  table.add(rim);

  // rails (push farther behind chairs)
  const rails = new THREE.Group();
  table.add(rails);

  const railR = 3.95; // ✅ bigger than before
  const railMat = new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.85 });
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 10), railMat);
    post.position.set(Math.cos(a) * railR, 0.28, Math.sin(a) * railR);
    rails.add(post);
  }

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(railR, 0.05, 10, 90),
    new THREE.MeshStandardMaterial({ color: 0x1b1c26, roughness: 0.85 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.60;
  rails.add(ring);

  const glow = new THREE.Mesh(
    new THREE.TorusGeometry(railR, 0.03, 10, 90),
    new THREE.MeshStandardMaterial({
      color: 0x2bd7ff,
      emissive: 0x2bd7ff,
      emissiveIntensity: 0.95,
      transparent: true,
      opacity: 0.85,
      roughness: 0.25
    })
  );
  glow.rotation.x = Math.PI / 2;
  glow.position.y = 0.66;
  rails.add(glow);

  // chairs + seats
  const chairR = 3.55;
  const c = world.tableFocus.clone();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Vector3(c.x + Math.cos(a) * chairR, 0, c.z + Math.sin(a) * chairR);
    const yaw = Math.atan2(c.x - p.x, c.z - p.z);
    world.seats.push({ position: p, yaw });

    const chair = makeChair(THREE);
    chair.position.set(p.x, 0, p.z);
    chair.rotation.y = yaw;
    world.group.add(chair);
  }

  // ✅ load REAL TeleportMachine
  try {
    const mod = await import(`./teleport_machine.js?v=${encodeURIComponent(v)}`);
    const TM = mod?.TeleportMachine;
    if (!TM?.build) throw new Error("TeleportMachine.build missing");

    const tele = TM.build({ THREE, scene, texLoader });
    tele.position.set(0, 0, 2.2);
    world.teleporter = TM;

    // spawn by teleporter
    const s = TM.getSafeSpawn(THREE);
    world.spawnPads = [s.position.clone()];

    // teleporter destination UI panel
    world.teleUI = buildTeleporterPanel(THREE);
    world.teleUI.visible = false;
    world.teleUI.position.set(0, 1.55, 2.2);
    world.group.add(world.teleUI);

    // tick FX
    const prev = world.tick;
    world.tick = (dt) => {
      prev(dt);
      TM.tick(dt);
      glow.material.emissiveIntensity = 0.85 + Math.sin((glow.userData.t = (glow.userData.t || 0) + dt) * 3.2) * 0.25;
    };

    log("[world] ✅ TeleportMachine loaded (REAL)");
  } catch (e) {
    log("[world] ❌ TeleportMachine failed: " + (e?.message || e));
  }

  // bots (seat height fix)
  world.bots = buildSafeBots(THREE, scene, world);
  const prevBots = world.tick;
  world.tick = (dt) => { prevBots(dt); world.bots.update(dt); };

  // ✅ teleport confirm handler:
  // - if you release trigger while pointing at teleporter pad → open panel
  // - else do normal floor teleport
  world.handleTeleportConfirm = ({ rig }) => {
    const tp = rig.teleport;

    if (!tp.justReleased) return;
    tp.justReleased = false;

    // if no hit, nothing
    if (!tp.valid || !tp.hitPoint) return;

    const hit = tp.hitPoint.clone();

    // if hit is inside teleporter pad → toggle teleporter UI
    if (world.teleporter?.containsPoint?.(THREE, hit)) {
      world.teleUI.visible = !world.teleUI.visible;
      return;
    }

    // otherwise normal floor teleport
    rig.player.position.set(hit.x, 0, hit.z);
  };

  // teleporter UI click check (laser dot is on floor; so we use proximity to buttons)
  // simple: if player is near teleporter and UI open, clicking teleports to destination
  // (later we’ll raycast proper UI)
  const dests = {
    lobby: new THREE.Vector3(0, 0, 3.5),
    store: new THREE.Vector3(6.2, 0, 5.8),
    poker: new THREE.Vector3(0, 0, -2.0),
  };

  // expose a simple function world can call later:
  world.teleportTo = (key) => {
    const p = dests[key];
    if (!p) return;
    world.teleUI.visible = false;
    rigSafeTeleport(scene, rig, p);
  };

  log("[world] ready ✅");
  return world;
}

// ---------- helpers ----------
function makeChair(THREE) {
  const g = new THREE.Group();
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x151821, roughness: 0.95 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.85 });

  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.09, 18), seatMat);
  seat.position.y = 0.52;
  g.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.65, 0.08), chairMat);
  back.position.set(0, 0.92, -0.26);
  g.add(back);

  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, 0.50, 12), chairMat);
  leg.position.y = 0.25;
  g.add(leg);

  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 16), chairMat);
  foot.position.y = 0.03;
  g.add(foot);

  return g;
}

function buildSafeBots(THREE, scene, world) {
  const bots = [];
  const matA = new THREE.MeshStandardMaterial({ color: 0x2bd7ff, roughness: 0.85 });
  const matB = new THREE.MeshStandardMaterial({ color: 0xff2bd6, roughness: 0.85 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xf2d6c9, roughness: 0.85 });

  function makeBot(i) {
    const g = new THREE.Group();

    // seated height fix: raise body base so it sits on chair
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 6, 12), i % 2 ? matA : matB);
    body.position.y = 0.80; // ✅ higher than before
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), headMat);
    head.position.y = 1.45;
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
      // move slightly toward table, raise a touch
      const toward = world.tableFocus.clone().sub(s.position).setY(0).normalize();
      const pos = s.position.clone().addScaledVector(toward, 0.18);
      b.position.set(pos.x, 0.0, pos.z);
      b.rotation.y = s.yaw;
      b.userData.bot.seated = true;
    } else {
      b.userData.bot.seated = false;
      b.position.set((Math.random() * 10) - 5, 0, 9 + Math.random() * 3);
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

function buildTeleporterPanel(THREE) {
  const g = new THREE.Group();
  g.name = "TeleporterPanel";

  const make = (txt) => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "rgba(10,12,18,0.85)";
    ctx.fillRect(0,0,512,256);
    ctx.strokeStyle = "rgba(180,107,255,0.9)";
    ctx.lineWidth = 10;
    ctx.strokeRect(20,20,472,216);
    ctx.fillStyle = "white";
    ctx.font = "bold 56px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(txt, 256, 128);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.7),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false })
    );
  };

  const lobby = make("LOBBY");
  lobby.position.set(-1.1, 0, 0);
  lobby.name = "btn_lobby";
  g.add(lobby);

  const store = make("STORE");
  store.position.set(0, 0, 0);
  store.name = "btn_store";
  g.add(store);

  const poker = make("POKER ROOM");
  poker.position.set(1.1, 0, 0);
  poker.name = "btn_poker";
  g.add(poker);

  return g;
}

function rigSafeTeleport(scene, rig, vec3) {
  rig.player.position.set(vec3.x, 0, vec3.z);
                           }
