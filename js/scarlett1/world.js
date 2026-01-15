// /js/scarlett1/world.js — Scarlett 1.0 World (Modular + Safe)
// Reuses your existing modules but never hard-crashes if something is missing.

import Controls from "../../core/controls.js";
import { applyLighting } from "../lighting.js";
import { PokerJS } from "../poker.js";
import { Humanoids } from "../humanoids.js";
import { ScorpionSystem } from "../scorpion.js";
import SpineXR from "./spine_xr.js";

export async function initWorld({ THREE, XR, base, scarlettBase, build, log, status }) {
  const BUILD = "SCARLETT1_WORLD_v1_0";
  const L = log || console.log;
  const S = status || (() => {});

  // -------------------------
  // renderer / scene / camera
  // -------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060914);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 250);
  camera.position.set(0, 1.65, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(renderer.domElement);

  // player rig (everything moves together: camera + controllers + lasers)
  const player = new THREE.Group();
  player.name = "PLAYER_RIG";
  scene.add(player);
  player.add(camera);

  // -------------------------
  // world state
  // -------------------------
  const st = {
    THREE, scene, renderer, camera, player,
    groundMeshes: [],
    flags: { poker: true, bots: true, safeMode: false },
    room: "lobby",
    anchors: {},
    xr: null,
    poker: null,
    bots: null,
    scorpion: null,
    t: 0,
    diagonal45: true // keep your snap/quantize behavior (your preference)
  };

  // Resize
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // Lighting (reused)
  try {
    applyLighting({ THREE, scene, root: scene });
    L("[world] lighting ✅");
  } catch (e) {
    L("[world] lighting failed (safe)", String(e?.stack || e));
  }

  // Build geometry
  S("Building lobby + pit…");
  buildEnvironment(st);

  // Modules (safe)
  st.poker = null;
  if (!st.flags.safeMode && st.flags.poker) {
    try {
      st.poker = PokerJS.init({
        THREE,
        scene,
        root: scene,
        log: L,
        camera,
        deckPos: new THREE.Vector3(-1.10, st._tableY + 0.16, 0.10),
        potPos:  new THREE.Vector3(0.00,  st._tableY + 0.13, 0.00),
      });
      L("[world] poker ✅");
    } catch (e) {
      L("[world] poker failed (safe)", String(e?.stack || e));
    }
  }

  st.bots = null;
  if (!st.flags.safeMode && st.flags.bots) {
    try {
      st.bots = Humanoids.init({ THREE, root: scene });
      // spawn around lobby edge so you SEE them (not inside table)
      st.bots.spawnBots({
        count: 8,
        center: new THREE.Vector3(0, 0, 0),
        radius: 8.5,
        y: 0,
        lookAt: new THREE.Vector3(0, 1.4, 0)
      });
      L("[world] bots ✅");
    } catch (e) {
      L("[world] bots failed (safe)", String(e?.stack || e));
    }
  }

  // Scorpion system (safe)
  try {
    st.scorpion = ScorpionSystem.init({
      THREE,
      root: scene,
      log: L,
      seatAnchor: { pos: new THREE.Vector3(26, 0, 0), yaw: -Math.PI / 2, seated: true }
    });
    L("[world] scorpion ✅");
  } catch (e) {
    L("[world] scorpion failed (safe)", String(e?.stack || e));
  }

  // XR controller spine (teleport + lasers + reticles)
  st.xr = SpineXR.init({
    THREE,
    renderer,
    scene,
    camera,
    player,
    getGroundMeshes: () => st.groundMeshes,
    log: L
  });

  // Spawn: ALWAYS on a safe pad (NOT the table / NOT the pit)
  // Put you slightly forward of lobby center, facing the table.
  safeSpawn(st);

  // Start render loop
  S("World running ✅");
  L("[world] render loop start ✅");

  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    st.t += dt;

    // XR visuals
    st.xr?.update?.();

    // XR locomotion (your core file)
    try {
      Controls.applyLocomotion(st, dt);
    } catch (e) {
      // never crash loop
    }

    // poker / bots
    try { st.poker?.update?.(dt, st.t); } catch {}
    try { st.bots?.update?.(dt, st.t); } catch {}

    renderer.render(scene, camera);
  });
}

// -------------------------
// BUILDERS
// -------------------------
function buildEnvironment(s) {
  addFog(s);

  // lobby shell + floor (solid)
  buildLobby(s);

  // pit + table
  buildPitAndTable(s);

  // hallways + 4 rooms
  buildRoomsAndHallways(s);

  // store + scorpion signage placeholders (visual)
  buildStoreVisual(s);
  buildScorpionVisual(s);

  // balcony ring (spectator)
  buildBalcony(s);

  // spawn pads (visible)
  buildSpawnPads(s);
}

function addFog(s) {
  s.scene.fog = new s.THREE.Fog(0x060914, 18, 140);
}

function matFloor(THREE, c) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0.08 });
}

function matWall(THREE, c) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0.05 });
}

function buildLobby(s) {
  const { THREE, scene } = s;

  const lobbyR = 13.2;
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(lobbyR, lobbyR, 0.35, 96),
    matFloor(THREE, 0x0d1424)
  );
  floor.position.y = -0.175;
  scene.add(floor);
  s.groundMeshes.push(floor);

  // solid outer wall ring
  const wallH = 5.2;
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(lobbyR + 0.4, lobbyR + 0.4, wallH, 96, 1, true),
    matWall(THREE, 0x070b15)
  );
  wall.position.y = wallH / 2 - 0.175;
  scene.add(wall);

  // ceiling ring (simple)
  const ceil = new THREE.Mesh(
    new THREE.CylinderGeometry(lobbyR + 0.4, lobbyR + 0.4, 0.25, 96),
    matWall(THREE, 0x05070f)
  );
  ceil.position.y = wallH - 0.05;
  scene.add(ceil);

  // center marker (helps orientation)
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(1.1, 1.35, 48),
    new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.002;
  scene.add(marker);
}

function buildPitAndTable(s) {
  const { THREE, scene } = s;

  const pitRadius = 6.6;
  const pitDepth = 1.8;
  s._pit = { pitRadius, pitDepth };

  // pit floor
  const pitFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, 0.2, 96),
    matFloor(THREE, 0x0a1020)
  );
  pitFloor.position.y = -pitDepth;
  scene.add(pitFloor);
  s.groundMeshes.push(pitFloor);

  // sloped “divot” edge (visual)
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(pitRadius + 0.15, 0.35, 16, 96),
    matWall(THREE, 0x0b1220)
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.55;
  scene.add(rim);

  // poker table (centered)
  const tableY = -pitDepth + 0.95;
  s._tableY = tableY;

  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 3.15, 0.35, 96),
    new THREE.MeshStandardMaterial({ color: 0x18304a, roughness: 0.65, metalness: 0.14 })
  );
  table.position.set(0, tableY, 0);
  scene.add(table);

  // guard rail ring around pit (solid segments)
  const railY = 0.95;
  const railR = pitRadius + 0.75;
  const segs = 22;
  const openAng = Math.PI / 8;

  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    const inOpen = Math.abs(normAng(am - 0)) < openAng; // opening at +Z
    if (inOpen) continue;

    const len = 2 * railR * Math.sin((a1 - a0) / 2);
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 1.05, len),
      new THREE.MeshStandardMaterial({ color: 0x0f1724, roughness: 0.5, metalness: 0.2 })
    );
    bar.position.set(Math.sin(am) * railR, railY, Math.cos(am) * railR);
    bar.rotation.y = am;
    scene.add(bar);
  }

  // ramp down (entrance at +Z)
  const rampW = 2.2;
  const rampL = 9.2;
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(rampW, pitDepth, rampL),
    matFloor(THREE, 0x141b28)
  );
  ramp.position.set(0, -pitDepth / 2, pitRadius + (rampL * 0.34));
  ramp.rotation.x = -Math.atan2(pitDepth, rampL);
  scene.add(ramp);
  s.groundMeshes.push(ramp);

  // chairs (simple placeholders around table)
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x111a28, roughness: 0.85, metalness: 0.08 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), chairMat);
    c.position.set(Math.sin(a) * 4.3, tableY + 0.35, Math.cos(a) * 4.3);
    c.rotation.y = a + Math.PI;
    scene.add(c);
  }
}

function buildRoomsAndHallways(s) {
  const { THREE, scene } = s;
  const roomDist = 28, roomSize = 10, wallH = 4.8;

  const rooms = [
    { name: "north", x: 0, z: -roomDist },
    { name: "south", x: 0, z: roomDist },
    { name: "west",  x: -roomDist, z: 0 },
    { name: "east",  x: roomDist, z: 0 },
  ];

  for (const r of rooms) {
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize * 2.3, 0.35, roomSize * 2.3),
      matFloor(THREE, 0x111a28)
    );
    floor.position.set(r.x, -0.175, r.z);
    scene.add(floor);
    s.groundMeshes.push(floor);

    // solid walls (box shell)
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize * 2.3, wallH, roomSize * 2.3),
      matWall(THREE, 0x070b15)
    );
    walls.position.set(r.x, wallH / 2 - 0.175, r.z);
    scene.add(walls);

    // hallway to lobby
    const hallLen = 12.5;
    const hall = new THREE.Mesh(
      new THREE.BoxGeometry(5.0, 0.35, hallLen),
      matFloor(THREE, 0x121c2c)
    );
    hall.position.y = -0.175;

    if (r.name === "north") hall.position.set(0, -0.175, -18);
    if (r.name === "south") hall.position.set(0, -0.175, 18);
    if (r.name === "west")  { hall.position.set(-18, -0.175, 0); hall.rotation.y = Math.PI / 2; }
    if (r.name === "east")  { hall.position.set(18, -0.175, 0); hall.rotation.y = Math.PI / 2; }

    scene.add(hall);
    s.groundMeshes.push(hall);
  }
}

function buildStoreVisual(s) {
  // store is WEST (-X)
  const { THREE, scene } = s;

  const sign = makeLabelPlate(THREE, "STORE", 0x0a1020, 0x66ccff, 768, 192);
  sign.position.set(-26, 3.2, -7.5);
  scene.add(sign);
  s._storeSign = sign;
  s.log?.("[world] sign: STORE");
}

function buildScorpionVisual(s) {
  // scorpion is EAST (+X)
  const { THREE, scene } = s;

  const sign = makeLabelPlate(THREE, "SCORP", 0x0a1020, 0xff6bd6, 768, 192);
  sign.position.set(26, 3.2, -7.5);
  scene.add(sign);
  s._scorpSign = sign;
  s.log?.("[world] sign: SCORP");
}

function buildBalcony(s) {
  const { THREE, scene } = s;

  const y = 4.0;
  const inner = 10.8;
  const outer = 13.8;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(inner, outer, 96),
    matFloor(THREE, 0x0f1a2d)
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = y;
  scene.add(ring);
  s.groundMeshes.push(ring);

  // barrier ring
  const barrier = new THREE.Mesh(
    new THREE.TorusGeometry((inner + outer) / 2, 0.12, 12, 96),
    new THREE.MeshStandardMaterial({ color: 0x101a2c, roughness: 0.55, metalness: 0.22 })
  );
  barrier.rotation.x = Math.PI / 2;
  barrier.position.y = y + 1.0;
  scene.add(barrier);
}

function buildSpawnPads(s) {
  const { THREE, scene } = s;

  // Spawn pads are visible and are ALSO used for safeSpawn()
  const pads = [
    { name: "spawn_lobby", x: 0, y: 0, z: 8.5, yaw: Math.PI },        // faces table
    { name: "spawn_south", x: 0, y: 0, z: 18.0, yaw: Math.PI },       // hallway
    { name: "spawn_west",  x: -18.0, y: 0, z: 0, yaw: Math.PI / 2 },  // hallway
    { name: "spawn_east",  x: 18.0, y: 0, z: 0, yaw: -Math.PI / 2 },  // hallway
  ];

  const g = new THREE.RingGeometry(0.45, 0.62, 42);
  const m = new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.55, side: THREE.DoubleSide });

  for (const p of pads) {
    const pad = new THREE.Mesh(g, m.clone());
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(p.x, 0.01, p.z);
    pad.userData.spawn = p;
    scene.add(pad);
    s.anchors[p.name] = { pos: new THREE.Vector3(p.x, p.y, p.z), yaw: p.yaw };
  }
}

function safeSpawn(s) {
  // Always spawn on the lobby pad, facing the table.
  // Avoid pit/table collision.
  const a = s.anchors.spawn_lobby || { pos: new s.THREE.Vector3(0, 0, 8.5), yaw: Math.PI };

  s.player.position.set(a.pos.x, a.pos.y, a.pos.z);
  s.player.rotation.set(0, a.yaw || 0, 0);

  // camera height normalized (prevents “super tall” feeling if you spawned on something)
  s.camera.position.set(0, 1.65, 0);
}

// -------------------------
// Helpers
// -------------------------
function normAng(a) {
  while (a < -Math.PI) a += Math.PI * 2;
  while (a > Math.PI) a -= Math.PI * 2;
  return a;
}

function makeLabelPlate(THREE, text, bg, fg, w = 512, h = 128) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");

  g.fillStyle = `#${bg.toString(16).padStart(6, "0")}`;
  g.fillRect(0, 0, w, h);

  g.strokeStyle = `#${fg.toString(16).padStart(6, "0")}`;
  g.lineWidth = Math.max(6, Math.floor(h * 0.06));
  g.strokeRect(10, 10, w - 20, h - 20);

  g.fillStyle = `#${fg.toString(16).padStart(6, "0")}`;
  g.font = `bold ${Math.floor(h * 0.55)}px Arial`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(6.5, 1.6),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  plane.renderOrder = 10;
  return plane;
                                }
