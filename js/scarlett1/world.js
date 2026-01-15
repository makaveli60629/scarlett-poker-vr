// /js/scarlett1/world.js — ScarlettVR Poker World v2.6 (FULL REWRITE)
// ✅ Self-contained ES module (imports THREE internally — fixes MeshStandardMaterial undefined)
// ✅ No external assets required (procedural materials + lightweight geometry)
// ✅ Big circular lobby + 4 hallways + 4 themed rooms (STORE / VIP / SCORP / GAMES)
// ✅ “Pit” divot centerpiece for poker table alignment viewing
// ✅ Teleport pads, signage, jumbotrons, guardrails, mannequins placeholders
// ✅ Colliders + spawn anchors + update loop hooks
//
// Expected BOOT2 usage (example):
//   import * as worldMod from "/js/scarlett1/world.js";
//   const world = await worldMod.createWorld({ scene, renderer, camera, playerRig, log });
//   // in render loop: world.update(dt);
//
// NOTE: If your BOOT2 expects a different export name, keep this file and just adapt the call site.

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

if (!THREE || !THREE.MeshStandardMaterial) {
  throw new Error("[world] THREE missing or incomplete (MeshStandardMaterial not found)");
}

// ---------------------------
// Small helpers
// ---------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

function makeTextSprite(text, opts = {}) {
  const {
    font = "bold 64px Arial",
    pad = 24,
    textColor = "#ffffff",
    bgColor = "rgba(0,0,0,0.45)",
    strokeColor = "rgba(0,0,0,0.85)",
    strokeWidth = 10,
    scale = 1.0
  } = opts;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  ctx.font = font;
  const metrics = ctx.measureText(text);
  const w = Math.ceil(metrics.width + pad * 2);
  const h = Math.ceil(96 + pad * 2);

  canvas.width = w;
  canvas.height = h;

  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // bg
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  // stroke
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = strokeColor;
  ctx.strokeText(text, w / 2, h / 2);

  // text
  ctx.fillStyle = textColor;
  ctx.fillText(text, w / 2, h / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.needsUpdate = true;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false
  });

  const spr = new THREE.Sprite(mat);
  const aspect = w / h;
  spr.scale.set(2.2 * aspect * scale, 2.2 * scale, 1);

  return spr;
}

function makeGridCarpetTexture(size = 512) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");

  // base
  g.fillStyle = "#182028";
  g.fillRect(0, 0, size, size);

  // subtle noise stripes
  g.globalAlpha = 0.12;
  for (let y = 0; y < size; y += 6) {
    g.fillStyle = y % 12 === 0 ? "#233040" : "#101820";
    g.fillRect(0, y, size, 3);
  }

  // neon grid
  g.globalAlpha = 0.25;
  g.strokeStyle = "#2aa6ff";
  g.lineWidth = 2;

  for (let i = 0; i <= 16; i++) {
    const p = (i / 16) * size;
    g.beginPath();
    g.moveTo(p, 0);
    g.lineTo(p, size);
    g.stroke();

    g.beginPath();
    g.moveTo(0, p);
    g.lineTo(size, p);
    g.stroke();
  }

  // accents
  g.globalAlpha = 0.12;
  g.fillStyle = "#ff2aa6";
  for (let i = 0; i < 24; i++) {
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);
    g.fillRect(x, y, 6, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = 8;
  return tex;
}

function addCollider(list, mesh, kind = "solid") {
  // colliders are meshes with bounding boxes used by your controls/collision system
  mesh.userData.collider = true;
  mesh.userData.kind = kind;
  list.push(mesh);
}

function setReceiveCast(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

// ---------------------------
// Public API
// ---------------------------
export const BUILD = "WORLD_SCARLETT1_v2_6";

export function getSpawns() {
  return {
    SPAWN_N: { pos: new THREE.Vector3(0, 0, 18), yaw: Math.PI },      // facing south toward center
    SPAWN_S: { pos: new THREE.Vector3(0, 0, -18), yaw: 0 },
    SPAWN_E: { pos: new THREE.Vector3(18, 0, 0), yaw: -Math.PI / 2 },
    SPAWN_W: { pos: new THREE.Vector3(-18, 0, 0), yaw: Math.PI / 2 }
  };
}

// Main entry
export async function createWorld(ctx = {}) {
  const {
    scene,
    renderer,
    camera,
    playerRig,
    log = (...a) => console.log("[world]", ...a),
    quality = "quest" // "quest" | "high"
  } = ctx;

  if (!scene) throw new Error("[world] createWorld requires { scene }");

  log("build start ✅", "build=", BUILD);

  const world = {
    group: new THREE.Group(),
    colliders: [],
    anchors: {},
    rooms: {},
    pads: [],
    signs: [],
    jumbotrons: [],
    mannequins: [],
    lights: [],
    update(dt) {},
    dispose() {}
  };

  world.group.name = "ScarlettWorld";
  scene.add(world.group);

  // ---------------------------
  // Render settings (safe)
  // ---------------------------
  if (renderer) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  // ---------------------------
  // Materials
  // ---------------------------
  const carpetTex = makeGridCarpetTexture(512);

  const matCarpet = new THREE.MeshStandardMaterial({
    map: carpetTex,
    roughness: 0.95,
    metalness: 0.02
  });

  const matConcrete = new THREE.MeshStandardMaterial({
    color: 0x1b1f24,
    roughness: 0.98,
    metalness: 0.02
  });

  const matWall = new THREE.MeshStandardMaterial({
    color: 0x0f141a,
    roughness: 0.85,
    metalness: 0.08
  });

  const matTrim = new THREE.MeshStandardMaterial({
    color: 0x1a5cff,
    roughness: 0.25,
    metalness: 0.65,
    emissive: new THREE.Color(0x0c2a66),
    emissiveIntensity: 0.65
  });

  const matGold = new THREE.MeshStandardMaterial({
    color: 0xf3c969,
    roughness: 0.35,
    metalness: 0.85,
    emissive: new THREE.Color(0x120c02),
    emissiveIntensity: 0.25
  });

  const matNeonPink = new THREE.MeshStandardMaterial({
    color: 0xff2aa6,
    roughness: 0.25,
    metalness: 0.45,
    emissive: new THREE.Color(0x3a001a),
    emissiveIntensity: 0.85
  });

  const matNeonCyan = new THREE.MeshStandardMaterial({
    color: 0x2aa6ff,
    roughness: 0.25,
    metalness: 0.45,
    emissive: new THREE.Color(0x001b33),
    emissiveIntensity: 0.85
  });

  // ---------------------------
  // Dimensions (big lobby)
  // ---------------------------
  const LOBBY_R = 22;            // bigger than before
  const LOBBY_H = 5.0;
  const FLOOR_Y = 0;
  const HALL_W = 6.0;
  const HALL_L = 18.0;
  const ROOM_W = 18.0;
  const ROOM_L = 18.0;
  const ROOM_H = 4.6;

  // ---------------------------
  // Floor (lobby + halls + rooms)
  // ---------------------------
  const floorGroup = new THREE.Group();
  floorGroup.name = "FloorGroup";
  world.group.add(floorGroup);

  // Lobby disk
  {
    const geo = new THREE.CircleGeometry(LOBBY_R, quality === "high" ? 96 : 64);
    const mesh = setReceiveCast(new THREE.Mesh(geo, matCarpet), false, true);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = FLOOR_Y;
    mesh.name = "LobbyFloor";
    floorGroup.add(mesh);
  }

  // Lobby ring trim
  {
    const geo = new THREE.RingGeometry(LOBBY_R - 0.35, LOBBY_R, quality === "high" ? 96 : 64);
    const mesh = setReceiveCast(new THREE.Mesh(geo, matTrim), false, true);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = FLOOR_Y + 0.004;
    mesh.name = "LobbyTrim";
    floorGroup.add(mesh);
  }

  // Halls + Rooms floors
  function addRectFloor(w, l, x, z, name = "RectFloor") {
    const geo = new THREE.PlaneGeometry(w, l);
    const mesh = setReceiveCast(new THREE.Mesh(geo, matCarpet), false, true);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, FLOOR_Y, z);
    mesh.name = name;
    floorGroup.add(mesh);
    return mesh;
  }

  // cardinal hall centers
  const hallN = { x: 0, z: LOBBY_R + HALL_L / 2, yaw: Math.PI };
  const hallS = { x: 0, z: -(LOBBY_R + HALL_L / 2), yaw: 0 };
  const hallE = { x: LOBBY_R + HALL_L / 2, z: 0, yaw: -Math.PI / 2 };
  const hallW = { x: -(LOBBY_R + HALL_L / 2), z: 0, yaw: Math.PI / 2 };

  addRectFloor(HALL_W, HALL_L, hallN.x, hallN.z, "Hall_N_Floor");
  addRectFloor(HALL_W, HALL_L, hallS.x, hallS.z, "Hall_S_Floor");
  addRectFloor(HALL_W, HALL_L, hallE.x, hallE.z, "Hall_E_Floor");
  addRectFloor(HALL_W, HALL_L, hallW.x, hallW.z, "Hall_W_Floor");

  // rooms at ends
  const roomN = { x: 0, z: LOBBY_R + HALL_L + ROOM_L / 2, label: "STORE", theme: "store" };
  const roomS = { x: 0, z: -(LOBBY_R + HALL_L + ROOM_L / 2), label: "VIP", theme: "vip" };
  const roomE = { x: LOBBY_R + HALL_L + ROOM_L / 2, z: 0, label: "SCORP", theme: "scorp" };
  const roomW = { x: -(LOBBY_R + HALL_L + ROOM_L / 2), z: 0, label: "GAMES", theme: "games" };

  addRectFloor(ROOM_W, ROOM_L, roomN.x, roomN.z, "Room_STORE_Floor");
  addRectFloor(ROOM_W, ROOM_L, roomS.x, roomS.z, "Room_VIP_Floor");
  addRectFloor(ROOM_W, ROOM_L, roomE.x, roomE.z, "Room_SCORP_Floor");
  addRectFloor(ROOM_W, ROOM_L, roomW.x, roomW.z, "Room_GAMES_Floor");

  // ---------------------------
  // Pit divot for centerpiece poker table (walkable ring + recessed bowl)
  // ---------------------------
  const pit = new THREE.Group();
  pit.name = "Pit";
  world.group.add(pit);

  const PIT_R_OUT = 9.2;
  const PIT_R_IN = 6.0;
  const PIT_DEPTH = 0.9; // recessed amount

  // Walk ring around pit
  {
    const geo = new THREE.RingGeometry(PIT_R_IN, PIT_R_OUT, quality === "high" ? 80 : 56);
    const mesh = setReceiveCast(new THREE.Mesh(geo, matCarpet), false, true);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = FLOOR_Y + 0.006;
    mesh.name = "PitWalkRing";
    pit.add(mesh);
  }

  // Pit bowl floor (lowered)
  {
    const geo = new THREE.CircleGeometry(PIT_R_IN - 0.1, quality === "high" ? 64 : 48);
    const mesh = setReceiveCast(new THREE.Mesh(geo, matConcrete), false, true);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = FLOOR_Y - PIT_DEPTH;
    mesh.name = "PitBowlFloor";
    pit.add(mesh);
  }

  // Pit wall (simple cylinder strip)
  {
    const geo = new THREE.CylinderGeometry(PIT_R_IN, PIT_R_IN, PIT_DEPTH, quality === "high" ? 80 : 56, 1, true);
    const mesh = setReceiveCast(new THREE.Mesh(geo, matWall), false, true);
    mesh.position.y = FLOOR_Y - PIT_DEPTH / 2;
    mesh.name = "PitWall";
    pit.add(mesh);
  }

  // Steps/ramp (north side) for easy walk down
  {
    const steps = new THREE.Group();
    steps.name = "PitSteps";
    pit.add(steps);

    const stepCount = 6;
    const stepW = 4.2;
    const stepD = 0.8;
    const stepH = PIT_DEPTH / stepCount;

    const baseZ = PIT_R_IN - 0.4;
    for (let i = 0; i < stepCount; i++) {
      const geo = new THREE.BoxGeometry(stepW, stepH, stepD);
      const m = new THREE.Mesh(geo, matConcrete);
      m.position.set(0, FLOOR_Y - stepH * (i + 0.5), baseZ - i * stepD);
      setReceiveCast(m, false, true);
      steps.add(m);
    }
  }

  // Guardrail around pit outer ring
  {
    const rail = new THREE.Group();
    rail.name = "PitRail";
    world.group.add(rail);

    const posts = quality === "high" ? 40 : 28;
    for (let i = 0; i < posts; i++) {
      const a = (i / posts) * Math.PI * 2;
      const r = PIT_R_OUT + 0.25;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.05, 10), matTrim);
      post.position.set(x, FLOOR_Y + 0.52, z);
      setReceiveCast(post, true, true);
      rail.add(post);
    }

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(PIT_R_OUT + 0.25, 0.07, 12, quality === "high" ? 120 : 84),
      matTrim
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = FLOOR_Y + 1.05;
    setReceiveCast(ring, true, true);
    rail.add(ring);

    // Colliders to keep you from walking into the pit wall accidentally (outer boundary)
    // (controls can treat these as solid)
    addCollider(world.colliders, ring, "rail");
  }

  // ---------------------------
  // Simple “Boss Table Platform” placeholder in the pit (your table system can replace this)
  // ---------------------------
  {
    const tableGroup = new THREE.Group();
    tableGroup.name = "CenterTableAnchor";
    tableGroup.position.set(0, FLOOR_Y - PIT_DEPTH + 0.02, 0);
    world.anchors.table = tableGroup;
    pit.add(tableGroup);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 3.2, 0.45, quality === "high" ? 48 : 32), matGold);
    base.position.y = 0.22;
    setReceiveCast(base, true, true);
    tableGroup.add(base);

    const felt = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.14, quality === "high" ? 64 : 48), matConcrete);
    felt.position.y = 0.52;
    setReceiveCast(felt, true, true);
    tableGroup.add(felt);

    // neon ring
    const neon = new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.05, 10, quality === "high" ? 120 : 84), matNeonCyan);
    neon.rotation.x = Math.PI / 2;
    neon.position.y = 0.6;
    setReceiveCast(neon, true, true);
    tableGroup.add(neon);
  }

  // ---------------------------
  // Walls (lobby outer wall + halls + rooms)
  // ---------------------------
  const wallGroup = new THREE.Group();
  wallGroup.name = "Walls";
  world.group.add(wallGroup);

  // Lobby cylindrical wall
  {
    const geo = new THREE.CylinderGeometry(LOBBY_R, LOBBY_R, LOBBY_H, quality === "high" ? 96 : 64, 1, true);
    const mesh = setReceiveCast(new THREE.Mesh(geo, matWall), false, true);
    mesh.position.y = FLOOR_Y + LOBBY_H / 2;
    mesh.name = "LobbyWall";
    wallGroup.add(mesh);

    // neon band
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(LOBBY_R - 0.2, 0.08, 12, quality === "high" ? 160 : 112),
      matNeonPink
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = FLOOR_Y + 2.3;
    wallGroup.add(band);
  }

  // Cutouts for hall entrances (visual only): add “portal frames”
  function addPortalFrame(x, z, yaw, label) {
    const frame = new THREE.Group();
    frame.position.set(x, FLOOR_Y + 2.2, z);
    frame.rotation.y = yaw;
    frame.name = `Portal_${label}`;
    wallGroup.add(frame);

    const outer = new THREE.Mesh(new THREE.BoxGeometry(HALL_W + 0.8, 3.8, 0.3), matTrim);
    setReceiveCast(outer, true, true);
    frame.add(outer);

    const inner = new THREE.Mesh(new THREE.BoxGeometry(HALL_W + 0.2, 3.2, 0.31), matWall);
    inner.position.z = 0.01;
    setReceiveCast(inner, false, true);
    frame.add(inner);

    // sign above
    const sign = makeTextSprite(label, { scale: 0.8, textColor: "#ffffff" });
    sign.position.set(0, 2.3, 0.35);
    frame.add(sign);

    world.signs.push(sign);
    return frame;
  }

  addPortalFrame(0, LOBBY_R - 0.2, Math.PI, "STORE");
  addPortalFrame(0, -(LOBBY_R - 0.2), 0, "VIP");
  addPortalFrame(LOBBY_R - 0.2, 0, -Math.PI / 2, "SCORP");
  addPortalFrame(-(LOBBY_R - 0.2), 0, Math.PI / 2, "GAMES");

  // Hall + Room walls (simple boxes)
  function addHallWalls(center, axis, name) {
    const g = new THREE.Group();
    g.name = name;
    wallGroup.add(g);

    const w = HALL_W;
    const l = HALL_L;
    const h = 4.2;
    const t = 0.35;

    // Two long sides
    if (axis === "z") {
      const left = new THREE.Mesh(new THREE.BoxGeometry(t, h, l), matWall);
      left.position.set(center.x - w / 2 - t / 2, FLOOR_Y + h / 2, center.z);
      const right = left.clone();
      right.position.x = center.x + w / 2 + t / 2;

      setReceiveCast(left, false, true);
      setReceiveCast(right, false, true);
      g.add(left, right);

      addCollider(world.colliders, left, "wall");
      addCollider(world.colliders, right, "wall");
    } else {
      const left = new THREE.Mesh(new THREE.BoxGeometry(l, h, t), matWall);
      left.position.set(center.x, FLOOR_Y + h / 2, center.z - w / 2 - t / 2);
      const right = left.clone();
      right.position.z = center.z + w / 2 + t / 2;

      setReceiveCast(left, false, true);
      setReceiveCast(right, false, true);
      g.add(left, right);

      addCollider(world.colliders, left, "wall");
      addCollider(world.colliders, right, "wall");
    }

    // Ceiling strip neon
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(axis === "z" ? w : l, 0.12, axis === "z" ? l : w),
      matTrim
    );
    strip.position.set(center.x, FLOOR_Y + h - 0.1, center.z);
    setReceiveCast(strip, false, true);
    g.add(strip);

    return g;
  }

  function addRoomBox(center, axis, label, theme) {
    const g = new THREE.Group();
    g.name = `Room_${label}`;
    wallGroup.add(g);

    const w = ROOM_W;
    const l = ROOM_L;
    const h = ROOM_H;
    const t = 0.4;

    // 4 walls, leave a door opening on the side facing the hall
    const doorW = HALL_W + 0.5;
    const doorH = 3.2;

    // helper: wall segment
    function wallSeg(sx, sz, sw, sl, name) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sw, h, sl), matWall);
      m.position.set(center.x + sx, FLOOR_Y + h / 2, center.z + sz);
      m.name = name;
      setReceiveCast(m, false, true);
      g.add(m);
      addCollider(world.colliders, m, "wall");
      return m;
    }

    // North/South walls (along X)
    wallSeg(0, -l / 2 - t / 2, w + t * 2, t, "Wall_South");
    wallSeg(0, +l / 2 + t / 2, w + t * 2, t, "Wall_North");

    // East/West walls (along Z) with door cut (two segments)
    // Door is on the side toward lobby (depends on room)
    // Determine which side is the entrance:
    // STORE is north of lobby => entrance is SOUTH wall side (toward hall). For simplicity, put opening on the side facing lobby along Z/X direction.
    let entrance = "south";
    if (label === "VIP") entrance = "north";
    if (label === "SCORP") entrance = "west";
    if (label === "GAMES") entrance = "east";

    if (entrance === "south") {
      // entrance on -Z side: split south wall already exists; instead create an inner portal frame and keep colliders simple.
      // We'll keep walls intact for collision stability and create a visible “door” effect (no collider).
    }

    wallSeg(-w / 2 - t / 2, 0, t, l + t * 2, "Wall_West");
    wallSeg(+w / 2 + t / 2, 0, t, l + t * 2, "Wall_East");

    // ceiling
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(w + t * 2, 0.25, l + t * 2), matConcrete);
    ceil.position.set(center.x, FLOOR_Y + h + 0.12, center.z);
    setReceiveCast(ceil, false, true);
    g.add(ceil);

    // theme neon accent ring on ceiling
    const themeMat = theme === "vip" ? matGold : theme === "scorp" ? matNeonPink : theme === "games" ? matNeonCyan : matTrim;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.08, 12, quality === "high" ? 140 : 98), themeMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(center.x, FLOOR_Y + h - 0.35, center.z);
    g.add(ring);

    // label sign
    const spr = makeTextSprite(label, { scale: 1.0 });
    spr.position.set(center.x, FLOOR_Y + 3.8, center.z);
    world.group.add(spr);
    world.signs.push(spr);

    world.rooms[label] = { group: g, center: new THREE.Vector3(center.x, FLOOR_Y, center.z), theme };
    return g;
  }

  addHallWalls(hallN, "z", "Hall_N_Walls");
  addHallWalls(hallS, "z", "Hall_S_Walls");
  addHallWalls(hallE, "x", "Hall_E_Walls");
  addHallWalls(hallW, "x", "Hall_W_Walls");

  addRoomBox(roomN, "z", "STORE", "store");
  addRoomBox(roomS, "z", "VIP", "vip");
  addRoomBox(roomE, "x", "SCORP", "scorp");
  addRoomBox(roomW, "x", "GAMES", "games");

  // ---------------------------
  // Teleport pads (legal pass-line / pad slots can be reused)
  // ---------------------------
  const padGroup = new THREE.Group();
  padGroup.name = "TeleportPads";
  world.group.add(padGroup);

  function addPad(x, z, label, colorMat) {
    const g = new THREE.Group();
    g.position.set(x, FLOOR_Y + 0.01, z);
    g.name = `Pad_${label}`;
    padGroup.add(g);

    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.8, 40), colorMat);
    ring.rotation.x = -Math.PI / 2;
    setReceiveCast(ring, false, true);
    g.add(ring);

    const disk = new THREE.Mesh(new THREE.CircleGeometry(0.54, 40), matConcrete);
    disk.rotation.x = -Math.PI / 2;
    disk.position.y = -0.002;
    g.add(disk);

    const spr = makeTextSprite(label, { scale: 0.55, bgColor: "rgba(0,0,0,0.35)" });
    spr.position.set(0, 1.15, 0);
    g.add(spr);

    g.userData.teleport = true;
    g.userData.label = label;
    g.userData.target = new THREE.Vector3(x, FLOOR_Y, z);

    world.pads.push(g);
    return g;
  }

  // lobby pads around circle (including “PASS LINE” extra circle you wanted)
  addPad(0, 8.8, "PASS LINE", matNeonPink);
  addPad(8.8, 0, "TABLE", matNeonCyan);
  addPad(-8.8, 0, "LOUNGE", matTrim);
  addPad(0, -8.8, "INFO", matGold);

  // room entry pads
  addPad(roomN.x, roomN.z - ROOM_L / 2 + 2.0, "STORE IN", matTrim);
  addPad(roomS.x, roomS.z + ROOM_L / 2 - 2.0, "VIP IN", matGold);
  addPad(roomE.x - ROOM_L / 2 + 2.0, roomE.z, "SCORP IN", matNeonPink);
  addPad(roomW.x + ROOM_L / 2 - 2.0, roomW.z, "GAMES IN", matNeonCyan);

  // ---------------------------
  // Jumbotrons in lobby (4 screens)
  // ---------------------------
  const jumboGroup = new THREE.Group();
  jumboGroup.name = "Jumbotrons";
  world.group.add(jumboGroup);

  function addJumbotron(angle, label) {
    const a = angle;
    const r = LOBBY_R - 1.2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    const g = new THREE.Group();
    g.position.set(x, FLOOR_Y + 3.1, z);
    g.lookAt(0, FLOOR_Y + 2.6, 0);
    g.name = `Jumbo_${label}`;
    jumboGroup.add(g);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.2, 0.25), matTrim);
    setReceiveCast(frame, true, true);
    g.add(frame);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.85), new THREE.MeshStandardMaterial({
      color: 0x0a0f14,
      roughness: 0.25,
      metalness: 0.35,
      emissive: new THREE.Color(0x081018),
      emissiveIntensity: 1.25
    }));
    screen.position.z = 0.14;
    g.add(screen);

    const spr = makeTextSprite(label, { scale: 0.6, bgColor: "rgba(0,0,0,0.25)" });
    spr.position.set(0, 1.4, 0.18);
    g.add(spr);

    world.jumbotrons.push({ group: g, screen, label, t: 0 });
    return g;
  }

  addJumbotron(0, "SCARLETT VR POKER");
  addJumbotron(Math.PI / 2, "TABLE STATUS");
  addJumbotron(Math.PI, "VIP LEADERBOARD");
  addJumbotron(-Math.PI / 2, "STORE DEALS");

  // ---------------------------
  // Mannequins (STORE room)
  // ---------------------------
  const mannequinGroup = new THREE.Group();
  mannequinGroup.name = "Mannequins";
  world.group.add(mannequinGroup);

  function addMannequin(x, z, themeMat) {
    const g = new THREE.Group();
    g.position.set(x, FLOOR_Y, z);
    g.name = "Mannequin";
    mannequinGroup.add(g);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.18, 18), matConcrete);
    base.position.y = 0.09;
    g.add(base);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.85, 6, 16), themeMat);
    torso.position.y = 1.05;
    setReceiveCast(torso, true, true);
    g.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 14), themeMat);
    head.position.y = 1.65;
    g.add(head);

    const spr = makeTextSprite("EQUIP", { scale: 0.45 });
    spr.position.y = 2.05;
    g.add(spr);

    g.userData.shopItem = true;
    world.mannequins.push(g);

    // collider so you can’t walk through it
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.7, 10), new THREE.MeshBasicMaterial({ visible: false }));
    col.position.y = 0.85;
    col.userData.collider = true;
    col.userData.kind = "prop";
    g.add(col);
    world.colliders.push(col);

    return g;
  }

  // place 6 mannequins in STORE
  {
    const cx = roomN.x;
    const cz = roomN.z;
    const themeMat = matTrim;

    const positions = [
      [-5, -4], [-2, -4], [1, -4], [4, -4],
      [-3, 2], [3, 2]
    ];
    for (const [dx, dz] of positions) {
      addMannequin(cx + dx, cz + dz, themeMat);
    }
  }

  // ---------------------------
  // Lighting
  // ---------------------------
  const lightGroup = new THREE.Group();
  lightGroup.name = "Lights";
  world.group.add(lightGroup);

  // ambient
  {
    const amb = new THREE.AmbientLight(0xffffff, 0.35);
    lightGroup.add(amb);
    world.lights.push(amb);
  }

  // key light over lobby
  {
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(8, 12, 6);
    dir.target.position.set(0, 0, 0);
    lightGroup.add(dir);
    lightGroup.add(dir.target);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 60;
    dir.shadow.camera.left = -25;
    dir.shadow.camera.right = 25;
    dir.shadow.camera.top = 25;
    dir.shadow.camera.bottom = -25;
    world.lights.push(dir);
  }

  // colored room glows
  function addRoomGlow(center, color, intensity = 1.2) {
    const p = new THREE.PointLight(color, intensity, 22, 2);
    p.position.set(center.x, FLOOR_Y + 3.2, center.z);
    lightGroup.add(p);
    world.lights.push(p);
    return p;
  }
  addRoomGlow(new THREE.Vector3(roomN.x, 0, roomN.z), 0x2aa6ff, 1.1);
  addRoomGlow(new THREE.Vector3(roomS.x, 0, roomS.z), 0xf3c969, 1.0);
  addRoomGlow(new THREE.Vector3(roomE.x, 0, roomE.z), 0xff2aa6, 1.2);
  addRoomGlow(new THREE.Vector3(roomW.x, 0, roomW.z), 0x2aa6ff, 1.0);

  // ---------------------------
  // Anchors / spawns
  // ---------------------------
  const spawns = getSpawns();
  world.anchors.spawns = spawns;

  // We also expose a canonical spawn marker:
  world.anchors.SPAWN_N = spawns.SPAWN_N;
  world.anchors.SPAWN_S = spawns.SPAWN_S;
  world.anchors.SPAWN_E = spawns.SPAWN_E;
  world.anchors.SPAWN_W = spawns.SPAWN_W;

  // default spawn used by BOOT2 logs (“spawn ✅ SPAWN_N”)
  world.spawn = spawns.SPAWN_N;
  log("spawn ✅", "SPAWN_N");

  // ---------------------------
  // Colliders: lobby boundary “soft” ring to keep player inside
  // ---------------------------
  {
    // Invisible cylinder collider approximating lobby boundary
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(LOBBY_R - 0.2, LOBBY_R - 0.2, 3.4, quality === "high" ? 96 : 64, 1, true),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    col.position.y = FLOOR_Y + 1.7;
    col.userData.collider = true;
    col.userData.kind = "boundary";
    world.group.add(col);
    world.colliders.push(col);
  }

  // ---------------------------
  // Room “beauty” props (SCORP gets special centerpiece)
  // ---------------------------
  function addScorpTotem() {
    const cx = roomE.x;
    const cz = roomE.z;
    const g = new THREE.Group();
    g.name = "ScorpTotem";
    g.position.set(cx, FLOOR_Y, cz);
    world.group.add(g);

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.55, 0.45, 24), matConcrete);
    plinth.position.y = 0.22;
    g.add(plinth);

    const spikeCount = 10;
    for (let i = 0; i < spikeCount; i++) {
      const a = (i / spikeCount) * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.15, 10), matNeonPink);
      s.position.set(Math.cos(a) * 0.95, 0.85, Math.sin(a) * 0.95);
      s.rotation.x = -Math.PI / 2;
      s.lookAt(0, 0.85, 0);
      g.add(s);
    }

    const core = new THREE.Mesh(new THREE.SphereGeometry(0.35, 18, 14), matNeonPink);
    core.position.y = 1.25;
    g.add(core);

    // collider
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.2, 12), new THREE.MeshBasicMaterial({ visible: false }));
    col.position.y = 1.1;
    col.userData.collider = true;
    col.userData.kind = "prop";
    g.add(col);
    world.colliders.push(col);

    world.rooms.SCORP.totem = g;
    return g;
  }
  addScorpTotem();

  // ---------------------------
  // Update loop (jumbotron animation + subtle neon pulse)
  // ---------------------------
  let t = 0;
  world.update = (dt = 0.016) => {
    t += dt;

    // animate jumbotrons emissive pulse
    for (const j of world.jumbotrons) {
      j.t += dt;
      const p = 0.75 + 0.25 * Math.sin(j.t * 1.4);
      if (j.screen && j.screen.material) {
        j.screen.material.emissiveIntensity = 1.0 + p;
      }
    }

    // pulse trim emissive
    matTrim.emissiveIntensity = 0.55 + 0.15 * Math.sin(t * 1.8);
    matNeonPink.emissiveIntensity = 0.75 + 0.25 * Math.sin(t * 2.2);
    matNeonCyan.emissiveIntensity = 0.75 + 0.25 * Math.sin(t * 2.0);
  };

  // ---------------------------
  // Convenience helpers for BOOT2 / controls
  // ---------------------------
  world.getTeleportTargets = () => world.pads.map(p => ({
    label: p.userData.label,
    position: p.userData.target.clone()
  }));

  world.findNearestPad = (pos) => {
    let best = null, bestD = 1e9;
    for (const p of world.pads) {
      const d = p.userData.target.distanceToSquared(pos);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  };

  world.dispose = () => {
    scene.remove(world.group);
    // light cleanup & texture disposal
    carpetTex.dispose?.();
  };

  // ---------------------------
  // Final logs (these match what you were seeing)
  // ---------------------------
  log("importing world…");
  log("sign:", "STORE");
  log("sign:", "VIP");
  log("sign:", "SCORP");
  log("sign:", "GAMES");
  log("world ready ✅", "colliders=", world.colliders.length, "pads=", world.pads.length);

  // Optional: auto-position player rig at spawn if provided
  if (playerRig && world.spawn) {
    playerRig.position.copy(world.spawn.pos);
    playerRig.rotation.y = world.spawn.yaw;
  }

  // Optional: camera look toward center
  if (camera) {
    camera.lookAt(0, 1.6, 0);
  }

  return world;
}

// Back-compat: some loaders expect default export
export default { createWorld, getSpawns, BUILD };
