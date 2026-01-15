// /js/scarlett1/world.js — Scarlett World v1.2 (SAFE + SPAWNS + SOLID WALLS)
// Exports: initWorld({THREE, log})
// Returns ctx: { renderer, scene, camera, player, cameraPitch, addUpdate(fn) }

import { VRButton } from "../VRButton.js";

export async function initWorld({ THREE, log }) {
  log = log || console.log;

  // ===== Renderer =====
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.xr.enabled = true;
  document.body.style.margin = "0";
  document.body.style.background = "#000";
  document.body.appendChild(renderer.domElement);

  // ===== Scene =====
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070c);

  // ===== Camera Rig =====
  const player = new THREE.Group();
  player.name = "PlayerRig";

  const cameraPitch = new THREE.Group();
  cameraPitch.name = "CameraPitch";
  player.add(cameraPitch);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 500);
  camera.position.set(0, 1.6, 0);
  cameraPitch.add(camera);

  scene.add(player);

  // ===== Lighting =====
  scene.add(new THREE.HemisphereLight(0xaac6ff, 0x101018, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(10, 18, 12);
  scene.add(key);

  // ===== Materials =====
  const MAT_FLOOR = new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.9, metalness: 0.0 });
  const MAT_WALL  = new THREE.MeshStandardMaterial({ color: 0x0a0f18, roughness: 0.95, metalness: 0.05 });
  const MAT_RAIL  = new THREE.MeshStandardMaterial({ color: 0x172743, roughness: 0.5, metalness: 0.3 });
  const MAT_FELT  = new THREE.MeshStandardMaterial({ color: 0x0b6b4b, roughness: 0.95, metalness: 0.0 });
  const MAT_PAD   = new THREE.MeshStandardMaterial({ color: 0x2b6cff, roughness: 0.35, metalness: 0.2, emissive: 0x112244 });

  // ===== World Scale =====
  const LOBBY_R = 14;        // radius
  const WALL_H = 4.2;
  const WALL_T = 0.5;

  // ===== Floor =====
  const floor = new THREE.Mesh(new THREE.CircleGeometry(LOBBY_R, 96), MAT_FLOOR);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ===== Outer Wall Ring (with 4 door openings) =====
  // We'll build 8 wall segments: 4 long segments and 4 small segments around door gaps.
  function wallSegment(angle, arcLen) {
    const r = LOBBY_R - WALL_T / 2;
    const w = arcLen;
    const geom = new THREE.BoxGeometry(w, WALL_H, WALL_T);
    const m = new THREE.Mesh(geom, MAT_WALL);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    m.position.set(x, WALL_H / 2, z);
    m.rotation.y = -angle;
    return m;
  }

  const doorWidth = 5.5;
  const fullArc = 2 * Math.PI * (LOBBY_R - WALL_T / 2);
  const quarterArc = fullArc / 4;

  // Build each quadrant with a gap centered at the cardinal direction
  const segmentsPerQuad = [
    (quarterArc - doorWidth) * 0.5,
    (quarterArc - doorWidth) * 0.5
  ];

  const cardinals = [
    { name: "SPAWN_N", angle: -Math.PI / 2, sign: "GAMES" }, // north (-Z)
    { name: "SPAWN_E", angle: 0,          sign: "STORE" },  // east (+X)
    { name: "SPAWN_S", angle: Math.PI/2,  sign: "SCORP" },  // south (+Z)
    { name: "SPAWN_W", angle: Math.PI,    sign: "VIP" }     // west (-X)
  ];

  // Place walls around each door gap
  for (let i = 0; i < 4; i++) {
    const baseAngle = cardinals[i].angle;
    const arcA = segmentsPerQuad[0];
    const arcB = segmentsPerQuad[1];

    // left segment center angle
    const leftCenter = baseAngle - (doorWidth / (2 * (LOBBY_R - WALL_T / 2))) - (arcA / (2 * (LOBBY_R - WALL_T / 2)));
    // right segment center angle
    const rightCenter = baseAngle + (doorWidth / (2 * (LOBBY_R - WALL_T / 2))) + (arcB / (2 * (LOBBY_R - WALL_T / 2)));

    scene.add(wallSegment(leftCenter, arcA));
    scene.add(wallSegment(rightCenter, arcB));
  }

  // ===== Center Table + Divot Ring =====
  // Visual "divot": darker ring around table area
  const divot = new THREE.Mesh(new THREE.RingGeometry(4.7, 8.2, 96), new THREE.MeshStandardMaterial({
    color: 0x070a10, roughness: 1.0, metalness: 0.0
  }));
  divot.rotation.x = -Math.PI / 2;
  divot.position.y = 0.01;
  scene.add(divot);

  // Table platform
  const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.7, 64), new THREE.MeshStandardMaterial({
    color: 0x121a2a, roughness: 0.65, metalness: 0.15
  }));
  tableBase.position.y = 0.35;
  scene.add(tableBase);

  // Felt top
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(4.25, 4.25, 0.12, 64), MAT_FELT);
  felt.position.y = 0.75;
  scene.add(felt);

  // Rail
  const rail = new THREE.Mesh(new THREE.TorusGeometry(4.35, 0.22, 16, 96), MAT_RAIL);
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.92;
  scene.add(rail);

  // ===== Spawn Pads (safe spawn points) =====
  const spawns = [];
  function addSpawn(name, x, z, yaw) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.08, 28), MAT_PAD);
    pad.position.set(x, 0.04, z);
    pad.name = name;
    scene.add(pad);
    spawns.push({ name, x, z, yaw });
  }

  // Put pads just inside each doorway (so you never spawn on the table)
  addSpawn("SPAWN_N", 0, -(LOBBY_R - 3.2), Math.PI);     // face table
  addSpawn("SPAWN_E", (LOBBY_R - 3.2), 0, -Math.PI/2);
  addSpawn("SPAWN_S", 0, (LOBBY_R - 3.2), 0);
  addSpawn("SPAWN_W", -(LOBBY_R - 3.2), 0, Math.PI/2);

  // Basic signs (simple)
  function addSign(text, x, z) {
    log(`sign: ${text}`);
    const g = new THREE.PlaneGeometry(4, 1.2);
    const c = document.createElement("canvas");
    c.width = 512; c.height = 192;
    const ctx2 = c.getContext("2d");
    ctx2.fillStyle = "rgba(0,0,0,0.0)";
    ctx2.fillRect(0,0,c.width,c.height);
    ctx2.fillStyle = "rgba(120,200,255,0.9)";
    ctx2.font = "bold 72px system-ui, Arial";
    ctx2.textAlign = "center";
    ctx2.textBaseline = "middle";
    ctx2.fillText(text, c.width/2, c.height/2);
    const tex = new THREE.CanvasTexture(c);
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const p = new THREE.Mesh(g, m);
    p.position.set(x, 2.6, z);
    p.lookAt(0, 2.6, 0);
    scene.add(p);
  }

  addSign("GAMES", 0, -(LOBBY_R - 0.6));
  addSign("STORE", (LOBBY_R - 0.6), 0);
  addSign("SCORP", 0, (LOBBY_R - 0.6));
  addSign("VIP", -(LOBBY_R - 0.6), 0);

  // ===== Choose spawn (default north) =====
  const spawn = spawns.find(s => s.name === "SPAWN_N") || spawns[0];
  player.position.set(spawn.x, 0, spawn.z);
  player.rotation.y = spawn.yaw;
  log(`spawn ✅ ${spawn.name}`);

  // ===== VR Button =====
  try {
    document.body.appendChild(VRButton.createButton(renderer));
    log("VRButton ready ✅");
  } catch (e) {
    log("VRButton failed:", e?.message || e);
  }

  // ===== Resize =====
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ===== Update hooks =====
  const updates = [];
  const addUpdate = (fn) => updates.push(fn);

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta());
    for (const fn of updates) fn(dt);
    renderer.render(scene, camera);
  });

  log("render loop start ✅");
  log("initWorld() completed ✅");

  return { renderer, scene, camera, player, cameraPitch, addUpdate, __hasLoop: true };
      }
