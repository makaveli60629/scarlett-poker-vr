// /js/scarlett1/world.js — Scarlett 1 World v6 (UNCRASHABLE LOOP)
// ✅ PlayerRig (camera+controllers move together)
// ✅ Spawn in ROOM (STORE_CENTER default)
// ✅ World owns setAnimationLoop (XR safe)
// ✅ Frame hooks with try/catch so XR never turns green

export async function initWorld({ THREE, DIAG }) {
  const D = DIAG || console;
  D.log("initWorld() start");

  const app = document.getElementById("app");
  if (!app) throw new Error("#app missing");

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  app.innerHTML = "";
  app.appendChild(renderer.domElement);

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);

  // Rig + Camera
  const rig = new THREE.Group();
  rig.name = "PlayerRig";
  scene.add(rig);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 500);
  camera.rotation.order = "YXZ";
  rig.add(camera);

  const player = { yaw: Math.PI, pitch: 0 };

  function setRigPose(x, y, z, yaw = player.yaw) {
    rig.position.set(x, y, z);
    player.yaw = yaw;
    rig.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
  }

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 1.0));
  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(8, 14, 6);
  scene.add(dir);

  // Materials
  const MAT_FLOOR = new THREE.MeshStandardMaterial({ color: 0x0f1626, roughness: 1, metalness: 0 });
  const MAT_WALL  = new THREE.MeshStandardMaterial({ color: 0x18233b, roughness: 0.95, metalness: 0.05 });
  const MAT_TRIM  = new THREE.MeshStandardMaterial({ color: 0x2a3d66, roughness: 0.7, metalness: 0.15 });

  function addMesh(geo, mat, x, y, z, ry = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    scene.add(m);
    return m;
  }

  // World geometry (same layout)
  const LOBBY_RADIUS = 18;
  const LOBBY_FLOOR_R = 22;

  const lobbyFloor = addMesh(new THREE.CircleGeometry(LOBBY_FLOOR_R, 96), MAT_FLOOR, 0, 0, 0);
  lobbyFloor.rotation.x = -Math.PI / 2;

  const ring = addMesh(new THREE.RingGeometry(LOBBY_RADIUS - 0.4, LOBBY_RADIUS + 0.4, 128), MAT_TRIM, 0, 0.01, 0);
  ring.rotation.x = -Math.PI / 2;

  // Pit + platform + table (visual)
  const pit = addMesh(new THREE.CircleGeometry(6.2, 80), new THREE.MeshStandardMaterial({ color: 0x070a12, roughness: 1, metalness: 0 }), 0, -0.12, 0);
  pit.rotation.x = -Math.PI / 2;

  const pitRim = addMesh(new THREE.RingGeometry(6.15, 6.5, 96), MAT_TRIM, 0, -0.10, 0);
  pitRim.rotation.x = -Math.PI / 2;

  const platform = addMesh(new THREE.CylinderGeometry(2.2, 2.2, 0.18, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b2a22, roughness: 0.85, metalness: 0.05 }),
    0, 0.15, 0
  );

  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.1, 0.14, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b3a2b, roughness: 0.85, metalness: 0.05 })
  );
  table.position.set(0, 1.05, 0);
  scene.add(table);

  // Lobby wall ring
  const wallH = 2.8;
  const segCount = 24;
  for (let i = 0; i < segCount; i++) {
    const a0 = (i / segCount) * Math.PI * 2;
    const a1 = ((i + 1) / segCount) * Math.PI * 2;
    const mx = Math.cos((a0 + a1) / 2) * LOBBY_RADIUS;
    const mz = Math.sin((a0 + a1) / 2) * LOBBY_RADIUS;
    const len = (Math.PI * 2 * LOBBY_RADIUS) / segCount;

    const w = new THREE.Mesh(new THREE.BoxGeometry(len, wallH, 0.55), MAT_WALL);
    w.position.set(mx, wallH / 2, mz);
    w.rotation.y = -((a0 + a1) / 2);
    scene.add(w);
  }

  // Rooms
  const HALL_LEN = 12, ROOM_D = 16;
  const dirs = [
    { name: "STORE", angle: 0, color: 0x2f6bff },
    { name: "VIP", angle: Math.PI / 2, color: 0xaa44ff },
    { name: "SCORP", angle: Math.PI, color: 0xffcc44 },
    { name: "GAMES", angle: -Math.PI / 2, color: 0x44ffaa }
  ];

  const roomCenters = [];
  for (const d of dirs) {
    const cx = Math.cos(d.angle), cz = Math.sin(d.angle);
    const hallStartR = LOBBY_RADIUS - 1.2;
    const roomCenterR = hallStartR + HALL_LEN + ROOM_D / 2;
    const rx = cx * roomCenterR;
    const rz = cz * roomCenterR;
    roomCenters.push({ name: d.name, x: rx, z: rz, angle: d.angle, color: d.color });

    // simple room floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshStandardMaterial({ color: 0x0b1120, roughness: 1, metalness: 0, emissive: d.color, emissiveIntensity: 0.06 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(rx, 0.01, rz);
    floor.rotation.z = d.angle;
    scene.add(floor);
  }

  // Spawn pads
  const spawnPads = [];
  const padGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.06, 48);

  function makePad(x, z, color, label, yaw) {
    const pad = new THREE.Mesh(
      padGeo,
      new THREE.MeshStandardMaterial({ color: 0x0b142a, roughness: 0.4, metalness: 0.2, emissive: color, emissiveIntensity: 1.1 })
    );
    pad.position.set(x, 0.035, z);
    pad.name = "spawn_pad";
    pad.userData.teleportPos = new THREE.Vector3(x, 1.65, z);
    pad.userData.yaw = yaw ?? Math.PI;
    pad.userData.label = label || "";
    scene.add(pad);
    spawnPads.push(pad);
    return pad;
  }

  // Room center pads
  for (const rc of roomCenters) {
    makePad(rc.x, rc.z, rc.color, rc.name + "_CENTER", rc.angle + Math.PI);
  }

  function teleportTo(vec3, yaw = player.yaw) {
    setRigPose(vec3.x, vec3.y, vec3.z, yaw);
  }

  function safetySnapIfBlocked(preferredLabel = "STORE_CENTER") {
    const pref = spawnPads.find(p => p.userData?.label === preferredLabel) || spawnPads[0];
    teleportTo(pref.userData.teleportPos, pref.userData.yaw);
    D.log("[spawn] forced pad:", pref.userData.label);
  }

  // ✅ Spawn in STORE room (change label if you want)
  safetySnapIfBlocked("STORE_CENTER");

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, { passive: true });

  // Frame hooks (XR-safe)
  const frameHooks = [];
  function addFrameHook(fn) { frameHooks.push(fn); }

  // Expose to XR module
  window.__SCARLETT1__ = {
    THREE, scene, renderer, camera, rig, player,
    spawnPads, teleportTo, safetySnapIfBlocked,
    addFrameHook
  };

  D.log("render loop start ✅ (world owns loop)");

  let lastT = 0;
  renderer.setAnimationLoop((tMs) => {
    const t = tMs * 0.001;
    const dt = Math.min(0.05, Math.max(0.001, t - lastT));
    lastT = t;

    // Keep something animated so we know frames are flowing
    table.rotation.y = t * 0.4;

    // Run hooks safely (NEVER crash XR frames)
    for (const fn of frameHooks) {
      try { fn({ t, dt }); }
      catch (e) {
        D.error("[frameHook] error:", e?.message || e);
      }
    }

    // Always render no matter what
    renderer.render(scene, camera);
  });
      }
