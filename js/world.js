// /js/world.js — ScarlettVR World v2 (Pit + Rail + Balcony + Rooms + Poker v2 + Scorpion v2 + Bots v2)
// ✅ Safe Mode compatible (flags.safeMode disables poker/bots/fx)
// ✅ Uses safe texture loader inside PokerSystem (won't crash if missing assets)
// ✅ Auto-seat Scorpion mode + bot loop

import { PokerSystem } from "./poker_system.js";
import { BotSystem } from "./bot_system.js";
import { ScorpionSystem } from "./scorpion_system.js";

export const World = {
  async init({ THREE, scene, renderer, camera, player, controllers, log, BUILD, flags }) {
    const s = {
      THREE, scene, renderer, camera, player, controllers, log, BUILD,
      flags: flags || { safeMode:false, poker:true, bots:true, fx:true },
      root: new THREE.Group(),
      anchors: {},
      room: "lobby",

      // systems
      poker: null,
      bots: null,
      scorpion: null,

      // scorpion seats
      scorpionSeats: [],
    };

    s.root.name = "WORLD_ROOT";
    scene.add(s.root);

    setupEnv(s);
    setupLights(s);

    // World layout
    buildLobbyRing(s);
    buildPitCenterpiece(s);     // divot/pit table is back
    buildBalconySpectator(s);   // upstairs ring

    buildRoomsAndHallways(s);
    buildStore(s);
    buildScorpion(s);
    buildSpectate(s);
    buildPokerArea(s);

    // Anchors (setRoom teleport points)
    s.anchors.lobby    = { pos: new THREE.Vector3(0, 0, 13.5),  yaw: Math.PI };
    s.anchors.poker    = { pos: new THREE.Vector3(0, 0, -9.5),  yaw: 0 };
    s.anchors.store    = { pos: new THREE.Vector3(-26, 0, 0),   yaw: Math.PI / 2 };
    s.anchors.scorpion = { pos: new THREE.Vector3(26, 0, 0),    yaw: -Math.PI / 2 };
    s.anchors.spectate = { pos: new THREE.Vector3(0, 3.0, -14), yaw: 0 };

    // spawn start
    setRigToAnchor(s, s.anchors.lobby);

    // Systems init (safe mode kills heavy stuff)
    if (!s.flags.safeMode && s.flags.poker) {
      s.poker = PokerSystem.init(s, {
        tableCenter: new THREE.Vector3(0, 0.95, -9.5),
        assetBase: "./assets/textures",
      });
    }

    if (!s.flags.safeMode && s.flags.bots) {
      // bot seats for scorpion room (around a table at x=26)
      s.scorpionSeats = makeSeatRing(THREE, new THREE.Vector3(26, 0, 0), 2.0, 6);

      s.bots = BotSystem.init(s, {
        count: 6,
        poker: s.poker,
        seats: s.scorpionSeats
      });
    }

    // Scorpion system ties player seating + bots + poker
    s.scorpion = ScorpionSystem.init(s, {
      playerSeat: { pos: new THREE.Vector3(26, 0, 0.9), yaw: -Math.PI / 2 },
      botSeats: s.scorpionSeats,
      poker: s.poker,
      bots: s.bots
    });

    log?.(`[world] World v2 init ✅ build=${BUILD} safe=${!!s.flags.safeMode} poker=${!!s.flags.poker} bots=${!!s.flags.bots} fx=${!!s.flags.fx}`);

    return {
      setRoom: (room) => {
        // exit scorpion mode if leaving it
        if (s.room === "scorpion" && room !== "scorpion") {
          s.scorpion?.exit?.();
        }

        s.room = room;

        // move rig
        setRigToAnchor(s, s.anchors[room] || s.anchors.lobby);
        log?.(`[rm] room=${room}`);

        // enter scorpion mode
        if (room === "scorpion") {
          s.scorpion?.enter?.();
        }
      },
      update: (dt, t) => update(s, dt, t),
    };
  }
};

// -------------------- ENV + LIGHT --------------------
function setupEnv(s) {
  const { THREE, scene } = s;
  scene.background = new THREE.Color(0x05070d);
  scene.fog = new THREE.Fog(0x05070d, 12, 95);
}

function setupLights(s) {
  const { THREE, scene, root, flags } = s;

  const hemi = new THREE.HemisphereLight(0xdaf0ff, 0x0b0f1a, flags.safeMode ? 1.0 : 1.15);
  hemi.position.set(0, 70, 0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, flags.safeMode ? 0.85 : 1.15);
  sun.position.set(35, 70, 35);
  scene.add(sun);

  if (!flags.safeMode) {
    const lobbyGlow = new THREE.PointLight(0x7fb2ff, 1.05, 95, 2);
    lobbyGlow.position.set(0, 9.0, 0);
    root.add(lobbyGlow);

    const pitSpot = new THREE.SpotLight(0xffffff, 1.2, 55, Math.PI / 4, 0.4, 1);
    pitSpot.position.set(0, 10.5, 0.5);
    pitSpot.target.position.set(0, 1.0, -0.2);
    root.add(pitSpot);
    root.add(pitSpot.target);

    const magenta = new THREE.PointLight(0xff6bd6, 0.55, 85, 2);
    magenta.position.set(0, 2.6, 0);
    root.add(magenta);
  }
}

function matFloor(THREE, color = 0x121c2c) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.06 });
}

// -------------------- LOBBY --------------------
function buildLobbyRing(s) {
  const { THREE, root, flags } = s;

  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(22, 22, 10, 64, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x0b1220, roughness: 0.9, metalness: 0.1,
      side: THREE.DoubleSide, transparent: true, opacity: flags.safeMode ? 0.35 : 0.55
    })
  );
  shell.position.set(0, 4.2, 0);
  root.add(shell);

  const lobbyFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 18, 0.35, 64),
    matFloor(THREE, 0x121c2c)
  );
  lobbyFloor.position.set(0, -0.175, 0);
  root.add(lobbyFloor);

  if (!flags.safeMode && flags.fx) {
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x66ccff, roughness: 0.3, metalness: 0.6,
      emissive: new THREE.Color(0x66ccff),
      emissiveIntensity: 0.45
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(16.5, 0.12, 12, 96), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 8.8, 0);
    root.add(ring);
  }
}

// -------------------- PIT + TABLE --------------------
function buildPitCenterpiece(s) {
  const { THREE, root, flags } = s;

  const pitRadius = 7.1;
  const pitDepth = 3.0;
  const pitFloorY = -pitDepth;

  // pit floor
  const pitFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, 0.35, 64),
    matFloor(THREE, 0x0c1220)
  );
  pitFloor.position.set(0, pitFloorY - 0.175, 0);
  root.add(pitFloor);

  // pit walls
  const pitWall = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 64, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0a101e, roughness: 0.95, metalness: 0.06, side: THREE.DoubleSide })
  );
  pitWall.position.set(0, pitFloorY / 2, 0);
  root.add(pitWall);

  // ramp down (south entrance)
  const stairW = 2.2;
  const stairL = 8.4;
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(stairW, pitDepth, stairL),
    new THREE.MeshStandardMaterial({ color: 0x141b28, roughness: 0.95, metalness: 0.08 })
  );
  ramp.position.set(0, pitFloorY / 2, pitRadius + stairL * 0.32);
  ramp.rotation.x = -Math.atan2(pitDepth, stairL);
  root.add(ramp);

  // rail ring around pit (skip entrance sector)
  const railR = pitRadius + 1.35;
  const railY = 0.95;
  const segs = 40;

  const railMat = new THREE.MeshStandardMaterial({
    color: 0x1c2433, roughness: 0.5, metalness: 0.22,
    emissive: flags.safeMode ? new THREE.Color(0x000000) : new THREE.Color(0x223cff),
    emissiveIntensity: flags.safeMode ? 0 : 0.12
  });

  const entranceAngle = Math.PI / 2; // +Z
  const entranceHalfWidth = 0.32;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const amid = (a0 + a1) * 0.5;

    const d = angleDelta(amid, entranceAngle);
    if (Math.abs(d) < entranceHalfWidth) continue;

    const x = Math.cos(amid) * railR;
    const z = Math.sin(amid) * railR;

    const railSeg = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.18, 0.32), railMat);
    railSeg.position.set(x, railY, z);
    railSeg.rotation.y = -amid;
    root.add(railSeg);
  }

  // guard post at entrance
  const guard = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.28, 1.25, 18),
    new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.8, metalness: 0.12 })
  );
  guard.position.set(0.0, 0.62, railR + 0.35);
  root.add(guard);

  // table in pit (centered)
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(3.05, 3.25, 0.35, 64),
    new THREE.MeshStandardMaterial({ color: 0x134536, roughness: 0.78, metalness: 0.04 })
  );
  felt.position.set(0, pitFloorY + 1.05, 0);
  root.add(felt);

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(3.25, 0.14, 14, 72),
    new THREE.MeshStandardMaterial({ color: 0x1c2433, roughness: 0.5, metalness: 0.22 })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.set(0, pitFloorY + 1.18, 0);
  root.add(rail);
}

function angleDelta(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// -------------------- BALCONY --------------------
function buildBalconySpectator(s) {
  const { THREE, root, flags } = s;

  const y = 3.0;
  const outerR = 16.8;
  const innerR = 14.2;

  const balcony = new THREE.Mesh(
    new THREE.RingGeometry(innerR, outerR, 96),
    matFloor(THREE, 0x10192a)
  );
  balcony.rotation.x = -Math.PI / 2;
  balcony.position.y = y;
  root.add(balcony);

  if (!flags.safeMode && flags.fx) {
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x121c2c, roughness: 0.55, metalness: 0.25,
      emissive: new THREE.Color(0x66ccff), emissiveIntensity: 0.08
    });

    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.9, 12), railMat);
      post.position.set(Math.cos(a) * outerR, y + 0.45, Math.sin(a) * outerR);
      root.add(post);
    }
  }
}

// -------------------- ROOMS + HALLS --------------------
function buildRoomsAndHallways(s) {
  const { THREE, root } = s;
  const roomDist = 28, roomSize = 10, wallH = 4.6;

  const rooms = [
    { name: "north", x: 0, z: -roomDist },
    { name: "south", x: 0, z: roomDist },
    { name: "west",  x: -roomDist, z: 0 },
    { name: "east",  x: roomDist, z: 0 },
  ];

  for (const r of rooms) {
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize * 2.2, 0.35, roomSize * 2.2),
      matFloor(THREE, 0x111a28)
    );
    floor.position.set(r.x, -0.175, r.z);
    root.add(floor);

    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize * 2.2, wallH, roomSize * 2.2),
      new THREE.MeshStandardMaterial({
        color: 0x0b1220, roughness: 0.92, metalness: 0.08,
        transparent: true, opacity: 0.35
      })
    );
    walls.position.set(r.x, wallH / 2 - 0.175, r.z);
    root.add(walls);

    const hallLen = 12;
    const hall = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.35, hallLen), matFloor(THREE, 0x121c2c));
    hall.position.y = -0.175;

    if (r.name === "north") hall.position.set(0, -0.175, -18);
    if (r.name === "south") hall.position.set(0, -0.175, 18);
    if (r.name === "west")  { hall.position.set(-18, -0.175, 0); hall.rotation.y = Math.PI/2; }
    if (r.name === "east")  { hall.position.set(18, -0.175, 0); hall.rotation.y = Math.PI/2; }

    root.add(hall);
  }
}

// -------------------- STORE --------------------
function buildStore(s) {
  const { THREE, root, flags } = s;

  const store = new THREE.Group();
  store.position.set(-26, 0, 0);
  root.add(store);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 18), matFloor(THREE, 0x111a28));
  floor.position.y = -0.175;
  store.add(floor);

  const glow = new THREE.PointLight(0x66ccff, flags.safeMode ? 0.7 : 1.0, 45, 2);
  glow.position.set(0, 3.5, 0);
  store.add(glow);

  // mannequin pads
  const padMat = new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.9, metalness: 0.1 });
  const manMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.65, metalness: 0.08 });

  for (let i = 0; i < 5; i++) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.12, 22), padMat);
    pad.position.set(-6 + i * 3.0, 0.06, -4.4);
    store.add(pad);

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.2, 6, 10), manMat);
    body.position.set(pad.position.x, 1.1, pad.position.z);
    store.add(body);
  }
}

// -------------------- SCORPION ROOM --------------------
function buildScorpion(s) {
  const { THREE, root } = s;
  const sc = new THREE.Group();
  sc.position.set(26, 0, 0);
  root.add(sc);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 18), matFloor(THREE, 0x0f1724));
  floor.position.y = -0.175;
  sc.add(floor);

  const light = new THREE.PointLight(0xff6bd6, 1.0, 55, 2);
  light.position.set(0, 3.5, 0);
  sc.add(light);

  // simple scorpion tables
  const tblMat = new THREE.MeshStandardMaterial({ color: 0x1b2a46, roughness: 0.7, metalness: 0.12 });
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.7, 0.22, 32), tblMat);
    t.position.set(-5 + i * 5, 0.9, 0);
    sc.add(t);
  }
}

// -------------------- SPECTATE PLATFORM --------------------
function buildSpectate(s) {
  const { THREE, root } = s;
  const plat = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 6), matFloor(THREE, 0x121c2c));
  plat.position.set(0, 3.0, -14);
  root.add(plat);
}

// -------------------- POKER AREA PAD --------------------
function buildPokerArea(s) {
  const { THREE, root } = s;
  const room = new THREE.Group();
  room.position.set(0, 0, -9.5);
  root.add(room);

  const pad = new THREE.Mesh(new THREE.CircleGeometry(10, 64), matFloor(THREE, 0x0f1724));
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.001;
  room.add(pad);
}

// -------------------- UPDATE --------------------
function update(s, dt, t) {
  if (!s.flags.safeMode && s.flags.poker) s.poker?.update(dt, t);
  if (!s.flags.safeMode && s.flags.bots) s.bots?.update?.(dt, t);
  s.scorpion?.update?.(dt, t);
}

// -------------------- UTIL --------------------
function setRigToAnchor(s, anchor) {
  s.player.position.set(anchor.pos.x, anchor.pos.y, anchor.pos.z);
  s.player.rotation.set(0, 0, 0);
  if (!s.renderer.xr.isPresenting) s.camera.rotation.set(0, anchor.yaw, 0);
}

function makeSeatRing(THREE, center, radius, count) {
  const seats = [];
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + Math.PI;
    const pos = new THREE.Vector3(
      center.x + Math.cos(ang) * radius,
      center.y,
      center.z + Math.sin(ang) * radius
    );
    const yaw = -ang + Math.PI / 2;
    seats.push({ pos, yaw });
  }
  return seats;
         }
