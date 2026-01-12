// /js/world.js — Scarlett MASTER WORLD (FULL + sealed + VIP spawn + pit + telepads)
// IMPORTANT: NO global THREE usage. Only ctx.THREE.

import { safeImport } from "./safe_import.js";

function makeTextSign(THREE, text, { w=2.6, h=0.6, font=52 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const g = canvas.getContext("2d");
  g.clearRect(0,0,canvas.width,canvas.height);

  // background
  g.fillStyle = "rgba(6,8,14,0.70)";
  g.fillRect(0,0,canvas.width,canvas.height);

  // border
  g.strokeStyle = "rgba(127,231,255,0.9)";
  g.lineWidth = 8;
  g.strokeRect(10,10,canvas.width-20,canvas.height-20);

  // text
  g.fillStyle = "#e8ecff";
  g.font = `bold ${font}px system-ui, Segoe UI, Arial`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, canvas.width/2, canvas.height/2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.renderOrder = 5;
  return mesh;
}

function makeTelepad(THREE, labelText) {
  const root = new THREE.Group();
  root.name = `telepad_${labelText}`;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.62, 64),
    new THREE.MeshBasicMaterial({ color: 0xff2d7a, transparent: true, opacity: 0.85 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;

  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.02, 32),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.75 })
  );
  core.position.y = 0.01;

  const sign = makeTextSign(THREE, labelText, { w: 1.8, h: 0.45, font: 44 });
  sign.position.set(0, 1.1, 0);
  sign.rotation.y = Math.PI;

  root.add(ring, core, sign);

  // pulse
  root.userData.t = 0;
  root.userData.update = (dt) => {
    root.userData.t += dt;
    const s = 1 + Math.sin(root.userData.t * 2.5) * 0.06;
    ring.scale.set(s, s, 1);
    core.material.opacity = 0.55 + Math.sin(root.userData.t * 3.0) * 0.15;
  };

  return root;
}

function addBrightLobbyLights(THREE, root) {
  // Ambient
  root.add(new THREE.AmbientLight(0xffffff, 0.65));

  // Two big ring lights above pit
  const ringGeo = new THREE.TorusGeometry(5.2, 0.08, 16, 140);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x7fe7ff,
    emissive: 0x7fe7ff,
    emissiveIntensity: 2.2,
    roughness: 0.35,
    metalness: 0.45
  });

  const r1 = new THREE.Mesh(ringGeo, ringMat);
  r1.position.set(0, 6.2, 0);
  r1.rotation.x = Math.PI/2;

  const r2 = new THREE.Mesh(ringGeo, ringMat);
  r2.position.set(0, 7.1, 0);
  r2.rotation.x = Math.PI/2;

  root.add(r1, r2);

  // Spotlights aimed at pit + room entrances
  const mkSpot = (x,z,intensity=2.2) => {
    const s = new THREE.SpotLight(0xffffff, intensity, 40, Math.PI/6, 0.35, 1.2);
    s.position.set(x, 9.5, z);
    s.target.position.set(x*0.15, 0, z*0.15);
    root.add(s);
    root.add(s.target);
  };

  mkSpot( 8,  0, 2.5);
  mkSpot(-8,  0, 2.5);
  mkSpot( 0,  8, 2.5);
  mkSpot( 0, -8, 2.5);
  mkSpot( 0,  0, 3.2);
}

function buildSealedLobby(THREE, root) {
  // Dimensions
  const R = 10.5;              // lobby radius
  const H = 8.5;               // tall walls for jumbotrons
  const wallThickness = 0.45;

  // Floor
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(R, 96),
    new THREE.MeshStandardMaterial({ color: 0x161a24, roughness: 0.65, metalness: 0.1 })
  );
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  root.add(floor);

  // Sealed cylinder wall (double: inner + outer thickness)
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x0f1220,
    roughness: 0.8,
    metalness: 0.2
  });

  const wallOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(R + wallThickness, R + wallThickness, H, 128, 1, true),
    wallMat
  );
  wallOuter.position.y = H/2;
  wallOuter.rotation.y = Math.PI * 0.25;
  wallOuter.scale.x = -1; // flip normals inward
  root.add(wallOuter);

  const wallInner = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, H, 128, 1, true),
    wallMat
  );
  wallInner.position.y = H/2;
  wallInner.rotation.y = Math.PI * 0.25;
  root.add(wallInner);

  // Ceiling dome (simple)
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(R+0.4, 64, 64, 0, Math.PI*2, 0, Math.PI/2),
    new THREE.MeshStandardMaterial({
      color: 0x0a0c14,
      roughness: 0.95,
      metalness: 0.05,
      side: THREE.DoubleSide
    })
  );
  dome.position.y = H;
  root.add(dome);

  return { R, H };
}

function buildPitAndStairs(THREE, root, lobbyR) {
  // Pit dimensions
  const pitR = 5.25;      // outer pit radius
  const railR = 4.65;     // rail radius
  const pitDepth = 1.35;  // how far down table area is

  // Carped “wrap” floor ring from lobby floor to pit edge (seals the gap)
  const wrap = new THREE.Mesh(
    new THREE.RingGeometry(railR, pitR + 0.55, 96),
    new THREE.MeshStandardMaterial({ color: 0x101522, roughness: 0.9, metalness: 0.05 })
  );
  wrap.rotation.x = -Math.PI/2;
  wrap.position.y = 0.005;
  root.add(wrap);

  // Pit floor
  const pitFloor = new THREE.Mesh(
    new THREE.CircleGeometry(railR - 0.25, 96),
    new THREE.MeshStandardMaterial({ color: 0x0c101a, roughness: 0.95, metalness: 0.05 })
  );
  pitFloor.rotation.x = -Math.PI/2;
  pitFloor.position.y = -pitDepth;
  root.add(pitFloor);

  // “Slope” ring (simple stepped ramp look)
  const slope = new THREE.Mesh(
    new THREE.CylinderGeometry(pitR, railR, pitDepth, 96, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x121827, roughness: 0.9, metalness: 0.08, side: THREE.DoubleSide })
  );
  slope.position.y = -pitDepth/2;
  root.add(slope);

  // Pit rail (keep ONLY the one that matters)
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(railR, 0.07, 12, 140),
    new THREE.MeshStandardMaterial({
      color: 0x7fe7ff,
      emissive: 0x7fe7ff,
      emissiveIntensity: 1.6,
      roughness: 0.35,
      metalness: 0.55
    })
  );
  rail.position.y = 0.95;
  rail.rotation.x = Math.PI/2;
  root.add(rail);

  // Stairs opening (one opening only)
  // Place stairs at +Z side (you can rotate later if you want)
  const stairsRoot = new THREE.Group();
  stairsRoot.name = "pit_stairs";
  stairsRoot.position.set(0, 0, pitR + 0.10);
  stairsRoot.rotation.y = Math.PI; // face into pit
  root.add(stairsRoot);

  const stepCount = 7;
  const stepW = 1.9;
  const stepH = pitDepth / stepCount;
  const stepD = 0.52;
  const stepMat = new THREE.MeshStandardMaterial({ color: 0x1a2233, roughness: 0.85, metalness: 0.1 });

  for (let i = 0; i < stepCount; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), stepMat);
    step.position.set(0, -stepH*(i+0.5), -stepD*(i+0.5));
    stairsRoot.add(step);
  }

  // Guard bot “marker” pedestal at stairs top (real bot can replace it)
  const guardPad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.08, 24),
    new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.6, metalness: 0.2 })
  );
  guardPad.position.set(0, 0.05, -0.25);
  stairsRoot.add(guardPad);

  return { pitDepth, railR };
}

function buildEntrancesAndTelepads(THREE, root, lobbyR) {
  // Four “cube rooms” positions
  const roomDist = lobbyR + 6.5;
  const rooms = {
    vip:   { pos: new THREE.Vector3( roomDist, 0, 0), yaw: Math.PI,    name: "VIP ROOM"   },
    store: { pos: new THREE.Vector3( 0, 0, -roomDist), yaw: 0,         name: "STORE"      },
    poker: { pos: new THREE.Vector3( 0, 0,  roomDist), yaw: Math.PI,   name: "POKER ROOM" },
    event: { pos: new THREE.Vector3(-roomDist, 0, 0), yaw: 0,          name: "EVENT ROOM" },
  };

  // Build simple cube rooms (sealed)
  const mkRoom = (label, center) => {
    const g = new THREE.Group();
    g.name = `room_${label}`;
    g.position.copy(center.pos);

    const size = 8.0;
    const h = 6.2;
    const mat = new THREE.MeshStandardMaterial({ color: 0x0c0f18, roughness: 0.85, metalness: 0.1 });

    // floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    floor.rotation.x = -Math.PI/2;
    g.add(floor);

    // walls
    const wallGeo = new THREE.PlaneGeometry(size, h);
    const mkWall = (x,y,z, ry) => {
      const w = new THREE.Mesh(wallGeo, mat);
      w.position.set(x,y,z);
      w.rotation.y = ry;
      g.add(w);
    };
    mkWall(0, h/2, -size/2, 0);
    mkWall(0, h/2,  size/2, Math.PI);
    mkWall(-size/2, h/2, 0, Math.PI/2);
    mkWall( size/2, h/2, 0,-Math.PI/2);

    // ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    ceil.rotation.x = Math.PI/2;
    ceil.position.y = h;
    g.add(ceil);

    // room sign inside
    const sign = makeTextSign(THREE, center.name, { w: 3.0, h: 0.7, font: 56 });
    sign.position.set(0, 3.4, -size/2 + 0.02);
    g.add(sign);

    // room light
    g.add(new THREE.PointLight(0xffffff, 2.8, 22));

    root.add(g);
    return g;
  };

  const roomNodes = {};
  for (const k of Object.keys(rooms)) roomNodes[k] = mkRoom(k, rooms[k]);

  // Telepads in LOBBY, in front of each entrance direction
  const pads = [];

  const mkPad = (label, x,z, targetKey) => {
    const pad = makeTelepad(THREE, label);
    pad.position.set(x, 0.02, z);
    pad.userData.target = targetKey;
    root.add(pad);
    pads.push(pad);

    // label sign above lobby wall direction
    const s = makeTextSign(THREE, label, { w: 2.3, h: 0.55, font: 54 });
    s.position.set(x * 1.22, 3.2, z * 1.22);
    s.lookAt(0, 3.2, 0);
    root.add(s);
  };

  // Place pads around pit area (not on pit rail)
  mkPad("STORE",  0, -6.8, "store");
  mkPad("EVENT", -6.8, 0, "event");
  mkPad("POKER",  0,  6.8, "poker");
  mkPad("VIP",    6.8, 0, "vip");

  return { rooms, roomNodes, pads };
}

function installPadInteraction(ctx, pads, rooms) {
  // Simple “stand on pad to teleport” (works even without trigger buttons)
  // If you already have a teleport system, this won’t break it.
  const { THREE, player, camera, log } = ctx;

  const tmp = new THREE.Vector3();
  const head = new THREE.Vector3();

  const TELEPORT_RADIUS = 0.65;
  const COOLDOWN = 1.0;

  const state = { cd: 0 };

  return (dt) => {
    state.cd = Math.max(0, state.cd - dt);

    camera.getWorldPosition(head);

    for (const p of pads) {
      p.userData.update?.(dt);

      p.getWorldPosition(tmp);
      const dx = head.x - tmp.x;
      const dz = head.z - tmp.z;
      const d2 = dx*dx + dz*dz;

      if (d2 < TELEPORT_RADIUS*TELEPORT_RADIUS && state.cd <= 0) {
        const targetKey = p.userData.target;
        const r = rooms[targetKey];
        if (r) {
          // teleport player rig so head ends up inside room center
          player.position.copy(r.pos);
          player.rotation.set(0, r.yaw || 0, 0);
          log?.(`[telepad] -> ${targetKey} ✅`);
          state.cd = COOLDOWN;
        }
      }
    }
  };
}

export const World = {
  async build({ THREE, scene, renderer, camera, player, controllers, log }) {
    const root = new THREE.Group();
    root.name = "WorldRoot";
    scene.add(root);

    // Build lobby shell
    const { R: lobbyR } = buildSealedLobby(THREE, root);

    // Lights
    addBrightLobbyLights(THREE, root);

    // Pit + stairs
    const pit = buildPitAndStairs(THREE, root, lobbyR);

    // Entrances + cube rooms + pads
    const { rooms, roomNodes, pads } = buildEntrancesAndTelepads(THREE, root, lobbyR);

    // VIP spawn point (spawn INSIDE vip room)
    const spawnPoints = {
      vip: { pos: rooms.vip.pos.clone().add(new THREE.Vector3(0, 0, 0)), yaw: rooms.vip.yaw },
      lobby: { pos: new THREE.Vector3(0, 0, 0), yaw: 0 }
    };

    // OPTIONAL: try to mount your existing store/scorpion/poker systems safely
    // (no crashes if files change)
    const PokerSimMod = await safeImport("./poker_simulation.js");
    const PokerDemoMod = await safeImport("./poker_demo.js");
    const TableFactoryMod = await safeImport("./table_factory.js");
    const SeatingMod = await safeImport("./seating.js");
    const BotsMod = await safeImport("./bots.js");

    // Build a simple “table placeholder” in pit now
    // (Your existing table/poker modules can replace this)
    const tableRoot = new THREE.Group();
    tableRoot.name = "PokerTableRoot";
    tableRoot.position.set(0, -pit.pitDepth + 0.02, 0);
    root.add(tableRoot);

    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.1, 0.22, 48),
      new THREE.MeshStandardMaterial({ color: 0x0f6b3b, roughness: 0.65, metalness: 0.05 })
    );
    felt.position.y = 1.02;
    tableRoot.add(felt);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.45, 1.05, 24),
      new THREE.MeshStandardMaterial({ color: 0x2a2f3f, roughness: 0.6, metalness: 0.25 })
    );
    stem.position.y = 0.52;
    tableRoot.add(stem);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.4, 0.25, 32),
      new THREE.MeshStandardMaterial({ color: 0x1a1f2e, roughness: 0.75, metalness: 0.2 })
    );
    base.position.y = 0.12;
    tableRoot.add(base);

    // If you have a real table factory, use it (safe)
    try {
      if (TableFactoryMod?.TableFactory?.create) {
        const realTable = TableFactoryMod.TableFactory.create({ THREE, log });
        realTable.position.copy(tableRoot.position);
        root.remove(tableRoot);
        root.add(realTable);
        log?.("[world] TableFactory table installed ✅");
      }
    } catch (e) {
      log?.(`[world] TableFactory failed (ignored): ${e?.message || e}`);
    }

    // Poker simulation hook (safe)
    let poker = null;
    try {
      poker = PokerSimMod?.PokerSimulation || PokerSimMod?.PokerSim || PokerDemoMod?.PokerDemo || null;
      if (poker?.init) {
        poker.init({ THREE, scene: root, player, camera, log });
        log?.("[world] PokerSimulation init ✅");
      }
    } catch (e) {
      log?.(`[world] PokerSimulation init failed (ignored): ${e?.message || e}`);
    }

    // Bots hook (safe)
    let bots = null;
    try {
      if (BotsMod?.Bots?.init) {
        bots = BotsMod.Bots;
        bots.init({ THREE, scene: root, player, camera, log });
        log?.("[world] Bots init ✅");
      }
    } catch (e) {
      log?.(`[world] Bots init failed (ignored): ${e?.message || e}`);
    }

    // Seating alignment hook (safe)
    try {
      SeatingMod?.Seating?.autoAlign?.({ THREE, scene: root, log });
    } catch {}

    // Telepad step-on update
    const padUpdate = installPadInteraction({ THREE, player, camera, log }, pads, rooms);

    // Return world API
    return {
      root,
      spawnPoints,
      rooms: roomNodes,
      update(dt) {
        padUpdate?.(dt);
        try { poker?.update?.(dt); } catch {}
        try { bots?.update?.(dt); } catch {}
      }
    };
  }
};
