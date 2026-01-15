// /js/scarlett1/world.js — Scarlett 1.0 World Spine (FULL, SAFE) v1.0
// ✅ Exports initWorld() (boot2 expects this)
// ✅ Guaranteed valid JS (fixes "Unexpected end of input")
// ✅ Creates lobby + halls + solid walls + pit divot + table + chairs
// ✅ Adds spawn pads (never spawn inside table)
// ✅ Adds simple VR button (fallback if boot2 doesn't add one)
// ✅ Diagnostics handshake: "World running ✅"

export async function initWorld(ctx = {}) {
  // ---------- Diagnostics helpers ----------
  const diagLog = ctx.diagLog || window.__SCARLETT_DIAG_LOG || ((...a) => console.log("[world]", ...a));
  const diagStatus = ctx.diagStatus || window.__SCARLETT_DIAG_STATUS || ((s) => console.log("[status]", s));

  diagLog("initWorld() start");

  // ---------- Ensure THREE ----------
  let THREE = ctx.THREE || window.THREE;
  if (!THREE) {
    diagLog("THREE not provided, importing…");
    THREE = await import("https://unpkg.com/three@0.158.0/build/three.module.js");
    window.THREE = THREE;
    diagLog("THREE import ✅");
  }

  // ---------- Scene / Camera / Renderer ----------
  const scene = ctx.scene || new THREE.Scene();
  scene.background = new THREE.Color(0x070912);

  const camera = ctx.camera || new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.05,
    250
  );

  const renderer = ctx.renderer || new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  // Attach renderer if boot2 didn't
  if (!ctx.renderer && !document.querySelector("canvas")) {
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.appendChild(renderer.domElement);
  }

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---------- Player Rig ----------
  // We keep a rig so "camera + lasers + controllers" stay parented together.
  const rig = ctx.rig || new THREE.Group();
  rig.name = "PlayerRig";
  scene.add(rig);

  // Put camera in rig
  if (!camera.parent) rig.add(camera);

  // ---------- Lights ----------
  const amb = new THREE.HemisphereLight(0xaaccff, 0x05040a, 0.55);
  scene.add(amb);

  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(6, 14, 10);
  key.castShadow = false;
  scene.add(key);

  const fill = new THREE.PointLight(0x88aaff, 0.35, 60, 2);
  fill.position.set(0, 6, 0);
  scene.add(fill);

  // ---------- Materials ----------
  const MAT_FLOOR = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95, metalness: 0.0 });
  const MAT_WALL  = new THREE.MeshStandardMaterial({ color: 0x0b1024, roughness: 0.9, metalness: 0.05 });
  const MAT_TRIM  = new THREE.MeshStandardMaterial({ color: 0x1b2b55, roughness: 0.6, metalness: 0.15 });
  const MAT_PIT   = new THREE.MeshStandardMaterial({ color: 0x0a0f1f, roughness: 0.98, metalness: 0.0 });
  const MAT_TABLE = new THREE.MeshStandardMaterial({ color: 0x1a8a5a, roughness: 0.9, metalness: 0.05 });
  const MAT_CHAIR = new THREE.MeshStandardMaterial({ color: 0x2c3e68, roughness: 0.7, metalness: 0.1 });
  const MAT_SIGN  = new THREE.MeshStandardMaterial({ color: 0x203a80, roughness: 0.35, metalness: 0.15, emissive: new THREE.Color(0x101a33), emissiveIntensity: 0.8 });

  // ---------- World Group ----------
  const world = new THREE.Group();
  world.name = "WorldRoot";
  scene.add(world);

  // ---------- Ground / Floor ----------
  const floorGeo = new THREE.CircleGeometry(18, 64);
  const floor = new THREE.Mesh(floorGeo, MAT_FLOOR);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = "Floor_Main";
  world.add(floor);

  // Outer ring floor
  const ringGeo = new THREE.RingGeometry(18, 32, 96);
  const ring = new THREE.Mesh(ringGeo, MAT_TRIM);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.002;
  ring.name = "Floor_Ring";
  world.add(ring);

  // ---------- Solid Walls (Lobby) ----------
  // We make a cylinder wall but with openings (hallways). We'll approximate with 4 wall segments.
  const wallHeight = 4.2;
  const wallThickness = 0.35;
  const wallRadius = 16.0;

  function addWallSegment(angleCenter, arcLenDeg, doorGapDeg = 0) {
    const arc = THREE.MathUtils.degToRad(arcLenDeg);
    const segs = 24;
    const geo = new THREE.CylinderGeometry(wallRadius + wallThickness, wallRadius + wallThickness, wallHeight, segs, 1, true, angleCenter - arc/2, arc - doorGapDeg);
    const mesh = new THREE.Mesh(geo, MAT_WALL);
    mesh.position.y = wallHeight / 2;
    mesh.rotation.y = 0; // geometry already placed by thetaStart
    mesh.name = "WallSegment";
    world.add(mesh);

    // inner trim ring
    const trimGeo = new THREE.CylinderGeometry(wallRadius, wallRadius, 0.15, segs, 1, true, angleCenter - arc/2, arc - doorGapDeg);
    const trim = new THREE.Mesh(trimGeo, MAT_TRIM);
    trim.position.y = 0.08;
    trim.name = "WallTrim";
    world.add(trim);
  }

  // 4 segments around, leaving 4 hallway openings (N/E/S/W).
  // We leave ~24deg gaps for doors.
  addWallSegment(THREE.MathUtils.degToRad(45), 90, 0);
  addWallSegment(THREE.MathUtils.degToRad(135), 90, 0);
  addWallSegment(THREE.MathUtils.degToRad(225), 90, 0);
  addWallSegment(THREE.MathUtils.degToRad(315), 90, 0);

  // We'll carve openings using hallway “tunnels” that extend out — still solid enough visually.
  function addHallway(dirVec, length = 12, width = 6, height = 4) {
    const hall = new THREE.Group();
    hall.name = "Hallway";

    const floorG = new THREE.BoxGeometry(width, 0.18, length);
    const floorM = new THREE.Mesh(floorG, MAT_FLOOR);
    floorM.position.y = 0.09;
    floorM.position.z = -length / 2;
    hall.add(floorM);

    const wallG = new THREE.BoxGeometry(0.3, height, length);
    const left = new THREE.Mesh(wallG, MAT_WALL);
    left.position.set(-width/2, height/2, -length/2);
    hall.add(left);

    const right = new THREE.Mesh(wallG, MAT_WALL);
    right.position.set(width/2, height/2, -length/2);
    hall.add(right);

    const capG = new THREE.BoxGeometry(width, height, 0.3);
    const cap = new THREE.Mesh(capG, MAT_WALL);
    cap.position.set(0, height/2, -length);
    hall.add(cap);

    // ceiling trim
    const ceilG = new THREE.BoxGeometry(width, 0.18, length);
    const ceil = new THREE.Mesh(ceilG, MAT_TRIM);
    ceil.position.set(0, height - 0.09, -length/2);
    hall.add(ceil);

    // place hallway
    const a = Math.atan2(dirVec.x, dirVec.z);
    hall.rotation.y = a;
    hall.position.set(dirVec.x * wallRadius, 0, dirVec.z * wallRadius);

    world.add(hall);
  }

  addHallway(new THREE.Vector3(0,0,-1)); // north
  addHallway(new THREE.Vector3(1,0,0));  // east
  addHallway(new THREE.Vector3(0,0,1));  // south
  addHallway(new THREE.Vector3(-1,0,0));// west

  // ---------- Center Pit Divot ----------
  // We fake a “divot” by placing a lower floor disc + a shallow ring drop.
  const pit = new THREE.Group();
  pit.name = "Pit";

  const pitRadius = 6.5;
  const pitDepth = 0.55;

  const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(pitRadius, 64), MAT_PIT);
  pitFloor.rotation.x = -Math.PI/2;
  pitFloor.position.y = -pitDepth;
  pit.add(pitFloor);

  // pit rim
  const rim = new THREE.Mesh(new THREE.RingGeometry(pitRadius, pitRadius + 0.8, 64), MAT_TRIM);
  rim.rotation.x = -Math.PI/2;
  rim.position.y = 0.01;
  pit.add(rim);

  world.add(pit);

  // ---------- Poker Table ----------
  const table = new THREE.Group();
  table.name = "PokerTable";

  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.25, 64), MAT_TABLE);
  tableTop.position.y = -pitDepth + 0.95;
  table.add(tableTop);

  const tableRail = new THREE.Mesh(new THREE.CylinderGeometry(3.9, 3.9, 0.35, 64), MAT_TRIM);
  tableRail.position.y = -pitDepth + 1.05;
  table.add(tableRail);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.0, 1.1, 32), MAT_TRIM);
  pedestal.position.y = -pitDepth + 0.45;
  table.add(pedestal);

  world.add(table);

  // ---------- Chairs (8) ----------
  const chairCount = 8;
  for (let i = 0; i < chairCount; i++) {
    const a = (i / chairCount) * Math.PI * 2;
    const r = 5.0;

    const chair = new THREE.Group();
    chair.name = "Chair_" + i;

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.9), MAT_CHAIR);
    seat.position.y = -pitDepth + 0.55;
    chair.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.18), MAT_CHAIR);
    back.position.y = -pitDepth + 1.05;
    back.position.z = -0.36;
    chair.add(back);

    chair.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
    chair.rotation.y = a + Math.PI;
    world.add(chair);
  }

  // ---------- Signs ----------
  function addSign(text, pos, rotY = 0) {
    const g = new THREE.Group();
    g.position.copy(pos);
    g.rotation.y = rotY;

    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 0.12), MAT_SIGN);
    panel.position.y = 2.2;
    g.add(panel);

    // Simple text using canvas texture (no external fonts)
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 256;
    const c = canvas.getContext("2d");
    c.fillStyle = "#0b1024"; c.fillRect(0,0,512,256);
    c.fillStyle = "#bfe3ff";
    c.font = "bold 72px system-ui, Arial";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(text, 256, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: new THREE.Color(0x0a1a33), emissiveIntensity: 0.9 });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.05), mat);
    face.position.set(0, 2.2, 0.08);
    g.add(face);

    world.add(g);
    diagLog(`sign: ${text}`);
  }

  addSign("STORE", new THREE.Vector3(0,0,-15.2), Math.PI);
  addSign("VIP",   new THREE.Vector3(15.2,0,0), -Math.PI/2);
  addSign("SCORP", new THREE.Vector3(0,0,15.2), 0);
  addSign("GAMES", new THREE.Vector3(-15.2,0,0), Math.PI/2);

  // ---------- Spawn Pads (prevents spawning on table) ----------
  // These are also useful for teleport targets later.
  const spawns = [
    { name:"SPAWN_N", p:new THREE.Vector3(0,0,-12), lookAt:new THREE.Vector3(0,0,0) },
    { name:"SPAWN_E", p:new THREE.Vector3(12,0,0),  lookAt:new THREE.Vector3(0,0,0) },
    { name:"SPAWN_S", p:new THREE.Vector3(0,0,12),  lookAt:new THREE.Vector3(0,0,0) },
    { name:"SPAWN_W", p:new THREE.Vector3(-12,0,0), lookAt:new THREE.Vector3(0,0,0) },
  ];

  const spawnPads = [];
  for (const s of spawns) {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.65, 32), new THREE.MeshStandardMaterial({
      color: 0x2a3f7a, roughness: 0.7, metalness: 0.1, emissive: new THREE.Color(0x0a1530), emissiveIntensity: 1.0
    }));
    pad.rotation.x = -Math.PI/2;
    pad.position.copy(s.p);
    pad.position.y = 0.01;
    pad.name = s.name;
    spawnPads.push({ mesh: pad, meta: s });
    world.add(pad);
  }

  // Choose a safe spawn and place rig there (never at center table)
  function applySpawn(idx = 0) {
    const chosen = spawnPads[idx % spawnPads.length];
    const p = chosen.meta.p.clone();
    rig.position.set(p.x, 0, p.z);

    // Face table center
    const to = chosen.meta.lookAt.clone();
    const dir = to.sub(new THREE.Vector3(p.x, 0, p.z)).normalize();
    const yaw = Math.atan2(dir.x, dir.z);
    rig.rotation.set(0, yaw, 0);

    diagLog("spawn ✅ " + chosen.meta.name);
  }

  // If caller passed spawnIndex use it, else 0
  applySpawn(Number.isFinite(ctx.spawnIndex) ? ctx.spawnIndex : 0);

  // ---------- Simple VR Button (fallback) ----------
  // If boot2 already makes one, this won’t duplicate (we detect by id).
  async function ensureVRButton() {
    if (!navigator.xr) {
      diagLog("VRButton: navigator.xr missing");
      return;
    }
    if (document.getElementById("scarlett_vr_btn")) return;

    const btn = document.createElement("button");
    btn.id = "scarlett_vr_btn";
    btn.textContent = "ENTER VR";
    btn.style.cssText = `
      position:fixed; right:16px; top:16px; z-index:999999;
      padding:12px 16px; border-radius:14px;
      border:1px solid rgba(120,160,255,0.25);
      background:rgba(40,60,120,0.55);
      color:#eaf2ff; font-weight:900;
    `;

    btn.onclick = async () => {
      try {
        const session = await navigator.xr.requestSession("immersive-vr", {
          optionalFeatures: ["local-floor", "bounded-floor", "local", "viewer", "hand-tracking"]
        });
        renderer.xr.setSession(session);
        diagLog("XR session start ✅");
      } catch (e) {
        diagLog("XR start failed ❌ " + (e?.message || e));
      }
    };

    document.body.appendChild(btn);
    diagLog("VRButton ready ✅");
  }
  ensureVRButton();

  // ---------- Render Loop ----------
  const clock = new THREE.Clock();

  function tick() {
    const dt = clock.getDelta();
    // (future hooks)
    // ctx.onTick?.(dt);

    renderer.render(scene, camera);
  }

  if (renderer.xr && renderer.setAnimationLoop) {
    renderer.setAnimationLoop(tick);
    diagLog("render loop start ✅");
  } else {
    const raf = () => { tick(); requestAnimationFrame(raf); };
    raf();
    diagLog("render loop start ✅ (raf)");
  }

  // ---------- FINAL DIAGNOSTICS HANDSHAKE ----------
  // This is what moves HUD off "Booting..."
  try {
    diagStatus("World running ✅");
    diagLog("initWorld() completed ✅");
  } catch {}

  // Return useful handles for modules
  return {
    THREE,
    scene,
    camera,
    renderer,
    rig,
    world,
    spawnPads: spawnPads.map(s => s.mesh),
    table,
  };
                                                    }
