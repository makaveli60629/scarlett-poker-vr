// /js/scarlett1/world.js — Scarlett 1.0 WORLD (FULL • MODULAR • SAFE)
// ✅ Reuses your old modules safely (lighting/poker/humanoids/scorpion) if present
// ✅ Android movement works ONLY when NOT in XR (does not touch Oculus controls)
// ✅ Pit table + chairs + floors + solid walls + hallway skeleton + store room markers
// ✅ Fixes MAT_BALC undefined permanently
// ✅ Exports initWorld() for boot

export async function initWorld({ THREE }) {
  // ------------------------------------------------------------
  // Core scene + renderer
  // ------------------------------------------------------------
  const app = document.getElementById("app") || document.body;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070f);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  app.appendChild(renderer.domElement);

  // Player rig (XR + non-XR)
  const player = new THREE.Group();
  player.name = "PlayerRig";
  scene.add(player);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.02, 500);
  camera.position.set(0, 1.65, 0);
  player.add(camera);

  const cameraPitch = new THREE.Group();
  cameraPitch.name = "CameraPitch";
  cameraPitch.add(camera);

  // In case you later want pitch separate:
  player.add(cameraPitch);

  // ------------------------------------------------------------
  // Materials (NO UNDEFINEDS)
  // ------------------------------------------------------------
  const MAT_FLOOR = new THREE.MeshStandardMaterial({ color: 0x0b1022, roughness: 0.95, metalness: 0.05 });
  const MAT_WALL  = new THREE.MeshStandardMaterial({ color: 0x0c1533, roughness: 0.90, metalness: 0.08 });
  const MAT_TRIM  = new THREE.MeshStandardMaterial({ color: 0x12204a, roughness: 0.85, metalness: 0.12 });
  const MAT_PIT   = new THREE.MeshStandardMaterial({ color: 0x070b16, roughness: 0.98, metalness: 0.02 });
  const MAT_TABLE = new THREE.MeshStandardMaterial({ color: 0x0a4a2d, roughness: 0.85, metalness: 0.05 });
  const MAT_CHAIR = new THREE.MeshStandardMaterial({ color: 0x161a24, roughness: 0.85, metalness: 0.10 });

  // ✅ FIX: MAT_BALC exists (this was crashing you)
  const MAT_BALC  = new THREE.MeshStandardMaterial({ color: 0x101b33, roughness: 0.85, metalness: 0.15 });

  // ------------------------------------------------------------
  // Lights (try your old lighting.js, else fallback)
  // ------------------------------------------------------------
  async function tryImport(url) {
    try { return await import(url + (url.includes("?") ? "" : `?v=${Date.now()}`)); }
    catch { return null; }
  }

  // Try to reuse your older module locations (root /js OR /js/scarlett1)
  const lightingMod =
    (await tryImport("/scarlett-poker-vr/js/lighting.js")) ||
    (await tryImport("/scarlett-poker-vr/js/scarlett1/lighting.js"));

  if (lightingMod?.applyLighting) {
    lightingMod.applyLighting({ THREE, scene });
  } else {
    const hemi = new THREE.HemisphereLight(0xbcd1ff, 0x030510, 0.9);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(8, 14, 6);
    key.castShadow = false;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x6aa5ff, 0.35);
    rim.position.set(-10, 6, -10);
    scene.add(rim);
  }

  // ------------------------------------------------------------
  // Geometry helpers
  // ------------------------------------------------------------
  function addMesh(geo, mat, x, y, z, ry = 0, name = "") {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.name = name;
    m.receiveShadow = true;
    m.castShadow = false;
    scene.add(m);
    return m;
  }

  // ------------------------------------------------------------
  // World Layout (Lobby + 4 rooms + hallways)
  // ------------------------------------------------------------
  const LOBBY_R = 10.5;
  const FLOOR_THICK = 0.3;

  // Main lobby floor
  addMesh(new THREE.CylinderGeometry(LOBBY_R, LOBBY_R, FLOOR_THICK, 64), MAT_FLOOR, 0, -FLOOR_THICK / 2, 0, 0, "LobbyFloor");

  // Lobby ring trim
  addMesh(new THREE.TorusGeometry(LOBBY_R * 0.98, 0.14, 12, 128), MAT_TRIM, 0, 0.03, 0, Math.PI / 2, "LobbyRing");

  // Solid outer lobby wall (cylinder wall)
  const lobbyWall = new THREE.Mesh(
    new THREE.CylinderGeometry(LOBBY_R, LOBBY_R, 4.2, 64, 1, true),
    MAT_WALL
  );
  lobbyWall.position.set(0, 2.1, 0);
  lobbyWall.name = "LobbyWall";
  scene.add(lobbyWall);

  // Hallway "doors" cutouts visually (we can’t boolean-cut, so we add door frames)
  const DOOR_W = 3.2, DOOR_H = 3.0, DOOR_T = 0.25;
  const doorGeo = new THREE.BoxGeometry(DOOR_W, DOOR_H, DOOR_T);

  function addDoorFrame(angle, label) {
    const r = LOBBY_R - 0.15;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const frame = addMesh(doorGeo, MAT_TRIM, x, DOOR_H / 2, z, -angle + Math.PI / 2, `DoorFrame_${label}`);
    // add sign log (your HUD log showed these before)
    if (window.__SCARLETT_DIAG_LOG__) window.__SCARLETT_DIAG_LOG__(`sign: ${label}`);
    return frame;
  }

  const ANG_STORE = 0;
  const ANG_VIP   = Math.PI / 2;
  const ANG_SCORP = Math.PI;
  const ANG_GAMES = -Math.PI / 2;

  addDoorFrame(ANG_STORE, "STORE");
  addDoorFrame(ANG_VIP,   "VIP");
  addDoorFrame(ANG_SCORP, "SCORP");
  addDoorFrame(ANG_GAMES, "GAMES");

  // Hallways (simple boxes)
  const HALL_L = 10.0, HALL_W = 3.6, HALL_H = 3.6;
  const hallGeo = new THREE.BoxGeometry(HALL_W, HALL_H, HALL_L);

  function addHall(angle, label) {
    const r0 = LOBBY_R + HALL_L / 2 - 0.2;
    const x = Math.cos(angle) * r0;
    const z = Math.sin(angle) * r0;
    const hall = addMesh(hallGeo, MAT_WALL, x, HALL_H / 2, z, -angle, `Hall_${label}`);

    // Hall floor overlay (nice floor)
    const f = new THREE.Mesh(new THREE.BoxGeometry(HALL_W - 0.2, 0.06, HALL_L - 0.2), MAT_FLOOR);
    f.position.set(x, 0.03, z);
    f.rotation.y = -angle;
    f.name = `HallFloor_${label}`;
    scene.add(f);

    return hall;
  }

  addHall(ANG_STORE, "STORE");
  addHall(ANG_VIP,   "VIP");
  addHall(ANG_SCORP, "SCORP");
  addHall(ANG_GAMES, "GAMES");

  // Rooms at end of each hall
  const ROOM_W = 16, ROOM_D = 16, ROOM_H = 4.2;
  const roomGeo = new THREE.BoxGeometry(ROOM_W, ROOM_H, ROOM_D);
  const roomFloorGeo = new THREE.BoxGeometry(ROOM_W - 0.3, 0.08, ROOM_D - 0.3);

  function addRoom(angle, label) {
    const r1 = LOBBY_R + HALL_L + ROOM_D / 2 - 0.6;
    const x = Math.cos(angle) * r1;
    const z = Math.sin(angle) * r1;
    const room = addMesh(roomGeo, MAT_WALL, x, ROOM_H / 2, z, -angle, `Room_${label}`);

    const rf = new THREE.Mesh(roomFloorGeo, MAT_FLOOR);
    rf.position.set(x, 0.04, z);
    rf.rotation.y = -angle;
    rf.name = `RoomFloor_${label}`;
    scene.add(rf);

    // Balcony slab for STORE room (placeholder, material fixed)
    if (label === "STORE") {
      const balc = new THREE.Mesh(
        new THREE.BoxGeometry(ROOM_W * 0.72, 0.18, ROOM_D * 0.46),
        MAT_BALC
      );
      balc.position.set(x, 2.35, z - 2.0);
      balc.rotation.y = -angle;
      balc.name = "StoreBalcony";
      scene.add(balc);

      // stairs placeholder
      const stair = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 4.2), MAT_TRIM);
      stair.position.set(x - 4.5, 1.1, z + 3.5);
      stair.rotation.y = -angle;
      stair.name = "StoreStairs";
      scene.add(stair);
    }

    return { x, z, angle: -angle, room };
  }

  const roomSTORE = addRoom(ANG_STORE, "STORE");
  const roomVIP   = addRoom(ANG_VIP,   "VIP");
  const roomSCORP = addRoom(ANG_SCORP, "SCORP");
  const roomGAMES = addRoom(ANG_GAMES, "GAMES");

  // ------------------------------------------------------------
  // Centerpiece: Sunken Pit + Table + Chairs
  // ------------------------------------------------------------
  const PIT_R = 5.1;
  const PIT_D = 1.2;

  // Pit hole visual (cylinder down)
  const pitWall = new THREE.Mesh(
    new THREE.CylinderGeometry(PIT_R, PIT_R, PIT_D, 64, 1, true),
    MAT_PIT
  );
  pitWall.position.set(0, -PIT_D / 2, 0);
  pitWall.name = "PitWall";
  scene.add(pitWall);

  // Pit floor
  addMesh(new THREE.CylinderGeometry(PIT_R - 0.2, PIT_R - 0.2, 0.12, 64), MAT_PIT, 0, -PIT_D + 0.06, 0, 0, "PitFloor");

  // Table top
  const table = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.22, 48), MAT_TABLE);
  table.position.set(0, -0.75, 0);
  table.name = "PokerTable";
  scene.add(table);

  // Chairs (placeholders around table)
  const chairGeo = new THREE.BoxGeometry(0.55, 0.85, 0.55);
  const chairCount = 8;
  for (let i = 0; i < chairCount; i++) {
    const a = (i / chairCount) * Math.PI * 2;
    const r = 3.15;
    const cx = Math.cos(a) * r;
    const cz = Math.sin(a) * r;
    const c = new THREE.Mesh(chairGeo, MAT_CHAIR);
    c.position.set(cx, -0.93, cz);
    c.rotation.y = -a + Math.PI;
    c.name = `Chair_${i}`;
    scene.add(c);
  }

  // Guard rail ring around pit (walkway edge)
  const rail = new THREE.Mesh(new THREE.TorusGeometry(PIT_R + 0.3, 0.10, 10, 96), MAT_TRIM);
  rail.position.set(0, 0.95, 0);
  rail.rotation.x = Math.PI / 2;
  rail.name = "PitRail";
  scene.add(rail);

  // ------------------------------------------------------------
  // Spawn Pads (PREVENT SPAWN ON TABLE / OBJECTS)
  // ------------------------------------------------------------
  const spawnPads = [
    { name: "SPAWN_STORE",  x: roomSTORE.x, z: roomSTORE.z + 3.0, yaw: roomSTORE.angle + Math.PI },
    { name: "SPAWN_VIP",    x: roomVIP.x,   z: roomVIP.z   + 3.0, yaw: roomVIP.angle   + Math.PI },
    { name: "SPAWN_SCORP",  x: roomSCORP.x, z: roomSCORP.z + 3.0, yaw: roomSCORP.angle + Math.PI },
    { name: "SPAWN_GAMES",  x: roomGAMES.x, z: roomGAMES.z + 3.0, yaw: roomGAMES.angle + Math.PI }
  ];

  const padGeo = new THREE.RingGeometry(0.35, 0.55, 32);
  const padMat = new THREE.MeshBasicMaterial({ color: 0x2f6bff, transparent: true, opacity: 0.55, side: THREE.DoubleSide });

  spawnPads.forEach((p) => {
    const ring = new THREE.Mesh(padGeo, padMat);
    ring.position.set(p.x, 0.06, p.z);
    ring.rotation.x = -Math.PI / 2;
    ring.name = p.name;
    scene.add(ring);
  });

  function setSpawn(padIndex = 0) {
    const sp = spawnPads[Math.max(0, Math.min(spawnPads.length - 1, padIndex))];
    player.position.set(sp.x, 0, sp.z);
    player.rotation.y = sp.yaw;
  }

  // ✅ Default spawn: STORE room pad (never table)
  setSpawn(0);

  // ------------------------------------------------------------
  // Reuse your old modules (SAFE)
  // ------------------------------------------------------------
  // Humanoids
  const humanoidsMod =
    (await tryImport("/scarlett-poker-vr/js/humanoids.js")) ||
    (await tryImport("/scarlett-poker-vr/js/scarlett1/humanoids.js"));

  if (humanoidsMod?.Humanoids?.install) {
    try {
      humanoidsMod.Humanoids.install({ THREE, scene, count: 10 });
    } catch (e) {
      console.warn("Humanoids.install failed (safe):", e);
    }
  }

  // Poker
  const pokerMod =
    (await tryImport("/scarlett-poker-vr/js/poker.js")) ||
    (await tryImport("/scarlett-poker-vr/js/scarlett1/poker.js"));

  if (pokerMod?.PokerJS?.install) {
    try {
      pokerMod.PokerJS.install({ THREE, scene, table });
    } catch (e) {
      console.warn("PokerJS.install failed (safe):", e);
    }
  }

  // Scorpion room
  const scorpMod =
    (await tryImport("/scarlett-poker-vr/js/scorpion.js")) ||
    (await tryImport("/scarlett-poker-vr/js/scarlett1/scorpion.js"));

  if (scorpMod?.ScorpionSystem?.install) {
    try {
      scorpMod.ScorpionSystem.install({ THREE, scene, anchor: new THREE.Vector3(roomSCORP.x, 0, roomSCORP.z) });
    } catch (e) {
      console.warn("ScorpionSystem.install failed (safe):", e);
    }
  }

  // ------------------------------------------------------------
  // ✅ ANDROID MOVEMENT (ONLY when NOT in XR)
  // ------------------------------------------------------------
  async function installAndroidControls() {
    // Prefer your uploaded core/android_controls.js behavior
    const cand = [
      "/scarlett-poker-vr/js/core/android_controls.js",
      "/scarlett-poker-vr/core/android_controls.js",
      "/scarlett-poker-vr/js/android_controls.js",
      "/scarlett-poker-vr/js/scarlett1/android_controls.js"
    ];

    for (const url of cand) {
      const mod = await tryImport(url);
      if (mod?.AndroidControls?.init) {
        try {
          mod.AndroidControls.init({
            renderer,
            player,
            cameraPitch,
            log: (...a) => (window.__SCARLETT_DIAG_LOG__ ? window.__SCARLETT_DIAG_LOG__(a.join(" ")) : console.log(...a)),
            setHUDVisible: (v) => {
              // optional hook if your HUD module exposes it
              if (window.__SCARLETT_SET_HUD_VISIBLE__) window.__SCARLETT_SET_HUD_VISIBLE__(!!v);
            }
          });
          mod.AndroidControls.setEnabled(true);
          console.log("AndroidControls ✅", url);
          return true;
        } catch (e) {
          console.warn("AndroidControls init failed:", url, e);
        }
      }
    }
    return false;
  }

  // Install android controls now; it will ONLY act when xr.isPresenting === false (your old file already enforces that)
  await installAndroidControls();

  // ------------------------------------------------------------
  // Render Loop
  // ------------------------------------------------------------
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", onResize);

  // Expose globals for spine_xr + diagnostics
  window.__SCARLETT1__ = {
    THREE,
    scene,
    renderer,
    player,
    camera,
    cameraPitch,
    table,
    setSpawn,
    spawnPads
  };

  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });

  // Optional log
  if (window.__SCARLETT_DIAG_LOG__) window.__SCARLETT_DIAG_LOG__("render loop start ✅");
}

// Back-compat export (so older boot patterns don't break)
export const World = { init: initWorld };
export default initWorld;
