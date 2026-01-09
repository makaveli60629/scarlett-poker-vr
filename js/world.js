// /js/world.js — Scarlett Poker VR WORLD v11.0 (FULL FIXTURES + DOORS + TELEPORT PADS)
// No "three" import here. main.js passes THREE in.
// Exports: initWorld({ THREE, scene, log, v }) -> returns world object

export async function initWorld({ THREE, scene, log = console.log, v = "1000" }) {
  const L = (...a) => { try { log(...a); } catch { console.log(...a); } };
  L("[world] init v=" + v);

  // ---------- helpers ----------
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  async function loadTex(url, { repeat = null, srgb = true } = {}) {
    const loader = new THREE.TextureLoader();
    return await new Promise((resolve) => {
      loader.load(
        url,
        (t) => {
          try {
            if (repeat) {
              t.wrapS = t.wrapT = THREE.RepeatWrapping;
              t.repeat.set(repeat[0], repeat[1]);
            }
            if (srgb) t.colorSpace = THREE.SRGBColorSpace;
            t.anisotropy = 8;
          } catch {}
          resolve(t);
        },
        undefined,
        () => { L("[tex] missing:", url); resolve(null); }
      );
    });
  }

  // ---------- world object ----------
  const world = {
    v,
    group: new THREE.Group(),
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    tableY: 0.92,
    seatSurfaceY: 0.52,

    // boundaries (bigger room)
    room: { halfW: 12, halfD: 12, height: 6 },

    floor: null,
    table: null,
    chairs: [],
    seats: [],

    // doors + pads
    storeDoor: null,
    pokerDoor: null,
    pads: [],

    // for main/dealing mix
    cameraRef: null,

    connect({ playerRig, controllers }) {
      // optional
    },

    tick(dt) {},
  };

  world.group.name = "World";
  scene.add(world.group);

  // ---------- textures ----------
  const T = {
    floor: await loadTex("./assets/textures/scarlett_floor_tile_seamless.png", { repeat: [6, 6], srgb: true }),
    wall:  await loadTex("./assets/textures/1767279790736.jpg", { repeat: [4, 2], srgb: true }), // your chosen wall texture
    doorStore: await loadTex("./assets/textures/door_store.png", { repeat: null, srgb: true }),
    doorPoker: await loadTex("./assets/textures/door_poker.png", { repeat: null, srgb: true }),
  };

  // ---------- materials ----------
  const mat = {
    floor: new THREE.MeshStandardMaterial({ color: 0x9097a6, roughness: 0.95, map: T.floor || null }),
    wall:  new THREE.MeshStandardMaterial({ color: 0xb2b6c4, roughness: 0.88, metalness: 0.05, map: T.wall || null }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x0a0b12, roughness: 0.9, side: THREE.BackSide }),

    felt: new THREE.MeshStandardMaterial({ color: 0x0f5d3a, roughness: 0.92 }),
    rim:  new THREE.MeshStandardMaterial({ color: 0x1b0f0c, roughness: 0.85 }),
    metalDark: new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.85, metalness: 0.15 }),

    chairFrame: new THREE.MeshStandardMaterial({ color: 0x151821, roughness: 0.95 }),
    chairSeat: new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.85 }),

    holo: new THREE.MeshStandardMaterial({
      color: 0x7fe7ff,
      emissive: 0x2bd7ff,
      emissiveIntensity: 1.25,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85
    }),

    doorFrame: new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.85, metalness: 0.05 }),
    door: (tex) => new THREE.MeshStandardMaterial({
      map: tex || null,
      color: tex ? 0xffffff : 0x444466,
      roughness: 0.65,
      emissive: 0x111122,
      emissiveIntensity: tex ? 0.35 : 0.15,
      transparent: true
    })
  };

  // ---------- lights (stronger) ----------
  world.group.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.45));

  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(8, 12, 7);
  world.group.add(key);

  const pink = new THREE.PointLight(0xff2d7a, 0.95, 40);
  pink.position.set(-4, 3.0, -2);
  world.group.add(pink);

  const aqua = new THREE.PointLight(0x7fe7ff, 0.95, 40);
  aqua.position.set(4, 3.0, -2);
  world.group.add(aqua);

  world.group.add(new THREE.AmbientLight(0xffffff, 0.22));

  // ---------- floor ----------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(world.room.halfW*2, world.room.halfD*2), mat.floor);
  floor.rotation.x = -Math.PI/2;
  floor.name = "Floor";
  floor.userData.solid = true;
  world.group.add(floor);
  world.floor = floor;

  // ---------- walls (SOLID) ----------
  const { halfW, halfD, height } = world.room;

  function wallBox(w, h, d, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat.wall);
    m.position.set(x, y, z);
    m.name = "Wall";
    m.userData.solid = true;
    world.group.add(m);
    return m;
  }

  const thick = 0.35;
  wallBox(halfW*2 + thick, height, thick, 0, height/2, -halfD);
  wallBox(halfW*2 + thick, height, thick, 0, height/2,  halfD);
  wallBox(thick, height, halfD*2 + thick, -halfW, height/2, 0);
  wallBox(thick, height, halfD*2 + thick,  halfW, height/2, 0);

  // ---------- ceiling dome ----------
  const dome = new THREE.Mesh(new THREE.SphereGeometry(halfW*1.15, 32, 18), mat.ceiling);
  dome.position.set(0, height + 0.4, -2);
  dome.scale.set(1.2, 0.7, 1.2);
  world.group.add(dome);

  // ---------- spawn ring (you spawn here) ----------
  const spawnPos = new THREE.Vector3(0, 0, 3.6);
  world.spawnPos = spawnPos.clone();

  const spawnRing = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.42, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  spawnRing.rotation.x = -Math.PI/2;
  spawnRing.position.set(spawnPos.x, 0.02, spawnPos.z);
  spawnRing.name = "SpawnRing";
  world.group.add(spawnRing);

  // ---------- table ----------
  const table = new THREE.Group();
  table.name = "PokerTable";
  table.position.copy(world.tableFocus);
  world.group.add(table);
  world.table = table;

  const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.18, 64), mat.felt);
  felt.position.y = world.tableY;
  table.add(felt);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.18, 18, 80), mat.rim);
  rim.rotation.x = Math.PI/2;
  rim.position.y = world.tableY + 0.09;
  table.add(rim);

  // simple stand (so it’s not floating)
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.65, 0.92, 26), mat.metalDark);
  stand.position.y = 0.46;
  table.add(stand);

  // ---------- rails + glow ----------
  const rails = new THREE.Group();
  rails.name = "Rails";
  table.add(rails);

  const railR = 3.75;

  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.62, 10), mat.metalDark);
    post.position.set(Math.cos(a) * railR, 0.31, Math.sin(a) * railR);
    rails.add(post);
  }

  const railRing = new THREE.Mesh(new THREE.TorusGeometry(railR, 0.05, 10, 90), mat.metalDark);
  railRing.rotation.x = Math.PI/2;
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
  glowRing.rotation.x = Math.PI/2;
  glowRing.position.y = 0.69;
  rails.add(glowRing);

  // solid “rail collider” radius for bots/player logic
  world.railRadius = railR;

  // ---------- chairs + seats ----------
  function makeChair() {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.08, 18), mat.chairSeat);
    seat.position.y = 0.50;
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.62, 0.09), mat.chairFrame);
    back.position.set(0, 0.90, -0.24);
    g.add(back);

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.10, 0.48, 12), mat.chairFrame);
    leg.position.y = 0.24;
    g.add(leg);

    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 16), mat.chairFrame);
    foot.position.y = 0.03;
    g.add(foot);

    return g;
  }

  const seatR = 3.05;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const chairPos = new THREE.Vector3(
      world.tableFocus.x + Math.cos(a) * seatR,
      0,
      world.tableFocus.z + Math.sin(a) * seatR
    );

    const yaw = Math.atan2(world.tableFocus.x - chairPos.x, world.tableFocus.z - chairPos.z);

    const chair = makeChair();
    chair.position.copy(chairPos);
    chair.rotation.y = yaw;
    chair.name = "Chair_" + i;
    world.group.add(chair);
    world.chairs.push(chair);

    const seatAnchor = new THREE.Object3D();
    seatAnchor.name = "SeatAnchor_" + i;
    seatAnchor.position.set(0, world.seatSurfaceY, 0.18);
    chair.add(seatAnchor);

    const seatPos = new THREE.Vector3();
    seatAnchor.getWorldPosition(seatPos);

    world.seats.push({
      index: i,
      position: seatPos,
      yaw,
      anchor: seatAnchor
    });
  }

  // ---------- DOOR ENTRANCES (opposite walls, near middle) ----------
  function buildDoor({ name, wallZ, tex, label }) {
    const g = new THREE.Group();
    g.name = name;

    // frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.18), mat.doorFrame);
    frame.position.set(0, 1.6, 0);
    g.add(frame);

    // door plane
    const door = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.8), mat.door(tex));
    door.position.set(0, 1.55, 0.10);
    g.add(door);

    // neon label
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 256;
    const ctx = c.getContext("2d");
    ctx.clearRect(0,0,c.width,c.height);
    ctx.fillStyle = "rgba(0,0,0,0.0)";
    ctx.fillRect(0,0,c.width,c.height);
    ctx.font = "900 120px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#7fe7ff";
    ctx.shadowColor = "#7fe7ff";
    ctx.shadowBlur = 20;
    ctx.fillText(label, 512, 128);
    const signTex = new THREE.CanvasTexture(c);
    try { signTex.colorSpace = THREE.SRGBColorSpace; } catch {}
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: signTex, transparent: true }));
    sign.position.set(0, 3.05, 0.12);
    g.add(sign);

    // place on wall
    g.position.set(0, 0, wallZ);
    g.rotation.y = (wallZ < 0) ? 0 : Math.PI; // face inward
    world.group.add(g);

    return g;
  }

  // Poker Room door on NORTH wall (z = -halfD + a bit inward)
  world.pokerDoor = buildDoor({
    name: "PokerDoor",
    wallZ: -halfD + 0.22,
    tex: T.doorPoker || T.doorStore,
    label: "POKER ROOM"
  });

  // Store door on SOUTH wall (z = +halfD - a bit inward)
  world.storeDoor = buildDoor({
    name: "StoreDoor",
    wallZ: +halfD - 0.22,
    tex: T.doorStore || T.doorPoker,
    label: "STORE"
  });

  // ---------- TELEPORT PADS IN FRONT OF DOORS ----------
  function makePad(name, at, dest) {
    const pad = new THREE.Group();
    pad.name = name;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.52, 48),
      new THREE.MeshBasicMaterial({ color: 0xff2d7a, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI/2;
    ring.position.set(0, 0.02, 0);
    pad.add(ring);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 10), mat.holo);
    pillar.position.set(0, 0.25, 0);
    pad.add(pillar);

    const tag = (() => {
      const c = document.createElement("canvas");
      c.width = 512; c.height = 256;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0,0,c.width,c.height);
      ctx.font = "900 64px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#e8ecff";
      ctx.fillText(name.replace("Pad_", ""), 256, 128);
      const tex = new THREE.CanvasTexture(c);
      try { tex.colorSpace = THREE.SRGBColorSpace; } catch {}
      const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), m);
      p.position.set(0, 0.78, 0);
      return p;
    })();
    pad.add(tag);

    pad.position.copy(at);
    pad.userData.dest = dest.clone();
    pad.userData.r = 0.55;
    pad.userData.ring = ring;
    world.group.add(pad);

    world.pads.push(pad);
    return pad;
  }

  const pokerPadPos = new THREE.Vector3(0, 0, -halfD + 1.35);
  const storePadPos = new THREE.Vector3(0, 0,  halfD - 1.35);

  // where they teleport to (simple “room points” for now)
  const pokerDest = new THREE.Vector3(0, 0, -2.0);
  const storeDest = new THREE.Vector3(0, 0,  6.0);

  makePad("Pad_POKER", pokerPadPos, pokerDest);
  makePad("Pad_STORE", storePadPos, storeDest);

  // ---------- world tick ----------
  const tickState = { t: 0 };

  world.tick = (dt) => {
    tickState.t += dt;

    // pulse spawn ring + rail glow
    spawnRing.material.opacity = 0.65 + Math.sin(tickState.t * 3.0) * 0.18;
    glowRing.material.emissiveIntensity = 1.15 + Math.sin(tickState.t * 3.5) * 0.35;

    // pulse pads
    for (const p of world.pads) {
      const ring = p.userData.ring;
      ring.material.opacity = 0.62 + Math.sin(tickState.t*4.0 + p.position.z)*0.22;
    }
  };

  L("[world] ready ✅ seats=" + world.seats.length + " pads=" + world.pads.length);
  return world;
    }
