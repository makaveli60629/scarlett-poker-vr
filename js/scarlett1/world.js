// /js/scarlett1/world.js — Scarlett 1.0 WORLD (PERMANENT • SAFE)
// - Solid lobby + walls + hallways
// - Divoted pit table + chairs
// - Spawn pads so you never spawn inside table
// - XR rig stays grouped (camera + controllers + lasers together)
// - Android movement (2D only) does NOT affect Oculus/XR

export async function initWorld({ THREE, VRButton, diagLog = console.log, diagStatus = () => {}, container = document.body } = {}) {
  const log = (s) => diagLog(`[world] ${s}`);

  // ---------- Renderer / Scene ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.05, 500);
  camera.position.set(0, 1.65, 6);

  // PlayerRig keeps EVERYTHING together
  const playerRig = new THREE.Group();
  playerRig.name = "PlayerRig";
  playerRig.add(camera);
  scene.add(playerRig);

  // Lights
  {
    const hemi = new THREE.HemisphereLight(0x8aa6ff, 0x0b1020, 0.9);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(6, 10, 6);
    key.castShadow = false;
    scene.add(key);

    const rim = new THREE.PointLight(0x7fffd4, 0.6, 30);
    rim.position.set(0, 3.5, -2);
    scene.add(rim);
  }

  // ---------- Materials ----------
  const MAT_FLOOR = new THREE.MeshStandardMaterial({ color: 0x141824, roughness: 0.95, metalness: 0.05 });
  const MAT_WALL  = new THREE.MeshStandardMaterial({ color: 0x0c1020, roughness: 0.85, metalness: 0.10 });
  const MAT_TRIM  = new THREE.MeshStandardMaterial({ color: 0x1b2a44, roughness: 0.65, metalness: 0.25 });
  const MAT_TABLE = new THREE.MeshStandardMaterial({ color: 0x102214, roughness: 0.9, metalness: 0.05 });
  const MAT_FELT  = new THREE.MeshStandardMaterial({ color: 0x0b5a3c, roughness: 0.95, metalness: 0.0 });
  const MAT_CHAIR = new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.8, metalness: 0.15 });
  const MAT_GLOW  = new THREE.MeshStandardMaterial({ color: 0x66aaff, roughness: 0.2, metalness: 0.2, emissive: 0x224466, emissiveIntensity: 0.6 });

  // ---------- World Dimensions ----------
  const LOBBY_R = 10;
  const WALL_H  = 4;
  const HALL_W  = 4;
  const HALL_L  = 14;

  // ---------- Floor ----------
  const floor = new THREE.Mesh(new THREE.CircleGeometry(LOBBY_R + 8, 64), MAT_FLOOR);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = false;
  floor.name = "Floor";
  scene.add(floor);

  // ---------- Outer Wall Ring (solid) ----------
  // simple cylinder wall with 4 doorway holes built as separate walls + halls
  function addWallPanel(x, z, w, d) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), MAT_WALL);
    m.position.set(x, WALL_H / 2, z);
    m.name = "Wall";
    scene.add(m);

    // trim cap
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, d), MAT_TRIM);
    cap.position.set(x, WALL_H + 0.075, z);
    scene.add(cap);
  }

  // Back/Front/Left/Right walls (leave holes where halls connect)
  addWallPanel(0, -(LOBBY_R + 2), (LOBBY_R * 2 + 8), 0.6);
  addWallPanel(0,  (LOBBY_R + 2), (LOBBY_R * 2 + 8), 0.6);
  addWallPanel(-(LOBBY_R + 2), 0, 0.6, (LOBBY_R * 2 + 8));
  addWallPanel( (LOBBY_R + 2), 0, 0.6, (LOBBY_R * 2 + 8));

  // ---------- Hallways to 4 rooms ----------
  function buildHall(dirName, dirVec) {
    // corridor floor
    const hallFloor = new THREE.Mesh(new THREE.BoxGeometry(HALL_W, 0.12, HALL_L), MAT_FLOOR);
    hallFloor.position.set(dirVec.x * (LOBBY_R + HALL_L / 2), 0.06, dirVec.z * (LOBBY_R + HALL_L / 2));
    hallFloor.rotation.y = Math.atan2(dirVec.x, dirVec.z);
    hallFloor.name = `HallFloor_${dirName}`;
    scene.add(hallFloor);

    // corridor walls (2 sides)
    const wallGeom = new THREE.BoxGeometry(0.25, WALL_H, HALL_L);
    const sideOffset = HALL_W / 2;

    const left = new THREE.Mesh(wallGeom, MAT_WALL);
    const right = new THREE.Mesh(wallGeom, MAT_WALL);

    // position in local then rotate by yaw
    const yaw = Math.atan2(dirVec.x, dirVec.z);

    left.position.set(0, WALL_H / 2, 0);
    right.position.set(0, WALL_H / 2, 0);

    left.position.x = -sideOffset;
    right.position.x = sideOffset;

    const grp = new THREE.Group();
    grp.position.copy(hallFloor.position);
    grp.rotation.y = yaw;
    grp.add(left, right);

    // top trim
    const trimL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, HALL_L), MAT_TRIM);
    const trimR = trimL.clone();
    trimL.position.set(-sideOffset, WALL_H + 0.075, 0);
    trimR.position.set( sideOffset, WALL_H + 0.075, 0);
    grp.add(trimL, trimR);

    grp.name = `Hall_${dirName}`;
    scene.add(grp);

    // simple room pad at the end
    const roomPad = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 8), MAT_FLOOR);
    roomPad.position.set(dirVec.x * (LOBBY_R + HALL_L + 4), 0.06, dirVec.z * (LOBBY_R + HALL_L + 4));
    roomPad.name = `RoomPad_${dirName}`;
    scene.add(roomPad);

    // sign
    const sign = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.6, 0.2), MAT_GLOW);
    sign.position.copy(roomPad.position).add(new THREE.Vector3(0, 2.2, 0));
    sign.lookAt(0, 2.2, 0);
    sign.name = `Sign_${dirName}`;
    scene.add(sign);

    log(`sign: ${dirName}`);

    return { roomPad, sign };
  }

  buildHall("STORE",  { x:  0, z: -1 });
  buildHall("VIP",    { x:  1, z:  0 });
  buildHall("SCORP",  { x:  0, z:  1 });
  buildHall("GAMES",  { x: -1, z:  0 });

  // ---------- Divoted Pit + Table ----------
  // Pit (a lowered circular area)
  const pitDepth = 1.15;
  const pitR = 4.8;

  // Ring lip (so you can walk up to edge)
  const lip = new THREE.Mesh(new THREE.RingGeometry(pitR - 0.25, pitR + 0.25, 64), MAT_TRIM);
  lip.rotation.x = -Math.PI / 2;
  lip.position.y = 0.02;
  lip.name = "PitLip";
  scene.add(lip);

  // Pit floor lowered
  const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(pitR - 0.28, 64), MAT_FLOOR);
  pitFloor.rotation.x = -Math.PI / 2;
  pitFloor.position.y = -pitDepth;
  pitFloor.name = "PitFloor";
  scene.add(pitFloor);

  // Table base
  const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 0.9, 32), MAT_TABLE);
  tableBase.position.set(0, -pitDepth + 0.45, 0);
  tableBase.name = "TableBase";
  scene.add(tableBase);

  // Table top
  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.28, 48), MAT_TABLE);
  tableTop.position.set(0, -pitDepth + 1.1, 0);
  tableTop.name = "TableTop";
  scene.add(tableTop);

  // Felt
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.1, 48), MAT_FELT);
  felt.position.set(0, -pitDepth + 1.26, 0);
  felt.name = "Felt";
  scene.add(felt);

  // Chairs (8)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 3.9;
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.7), MAT_CHAIR);
    chair.position.set(Math.sin(a) * r, -pitDepth + 0.45, Math.cos(a) * r);
    chair.rotation.y = a + Math.PI;
    chair.name = `Chair_${i}`;
    scene.add(chair);
  }

  // ---------- Spawn Pads (SAFE) ----------
  // You spawn in a ROOM area, not on table, not in lobby center.
  const spawnPads = [
    new THREE.Vector3(0, 0, -(LOBBY_R + HALL_L + 4)), // STORE room
    new THREE.Vector3((LOBBY_R + HALL_L + 4), 0, 0),  // VIP room
    new THREE.Vector3(0, 0, (LOBBY_R + HALL_L + 4)),  // SCORP room
    new THREE.Vector3(-(LOBBY_R + HALL_L + 4), 0, 0), // GAMES room
  ];

  // Put rig on first spawn pad and face toward lobby center
  function applySpawn(pos) {
    playerRig.position.set(pos.x, pos.y, pos.z);

    // Face toward center (0,0,0)
    const dir = new THREE.Vector3(0, 1.6, 0).sub(new THREE.Vector3(pos.x, 1.6, pos.z)).normalize();
    const yaw = Math.atan2(dir.x, dir.z);
    playerRig.rotation.set(0, yaw, 0);
  }

  applySpawn(spawnPads[0]);

  // ---------- XR Setup: controllers + lasers ----------
  // Minimal controller models + lasers so you ALWAYS see them
  const controllerGrip1 = renderer.xr.getController(0);
  const controllerGrip2 = renderer.xr.getController(1);
  playerRig.add(controllerGrip1);
  playerRig.add(controllerGrip2);

  function makeLaser(color = 0x66aaff) {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -6),
    ]);
    const mat = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geom, mat);
    line.name = "Laser";
    return line;
  }

  controllerGrip1.add(makeLaser(0xff66cc));
  controllerGrip2.add(makeLaser(0x66ccff));

  // Simple “target” ring that sits on floor (teleport visual placeholder)
  const targetRing = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.24, 32), MAT_GLOW);
  targetRing.rotation.x = -Math.PI / 2;
  targetRing.position.set(0, 0.02, 0);
  targetRing.visible = false;
  scene.add(targetRing);

  // ---------- Teleport (XR) ----------
  // Simple ray-to-floor teleport on RIGHT controller trigger
  const raycaster = new THREE.Raycaster();
  const tmpMat = new THREE.Matrix4();
  const forward = new THREE.Vector3();
  const hit = new THREE.Vector3();

  let lastTeleportHit = null;

  function updateTeleportRay(fromController) {
    tmpMat.identity().extractRotation(fromController.matrixWorld);
    forward.set(0, 0, -1).applyMatrix4(tmpMat).normalize();

    const origin = new THREE.Vector3();
    fromController.getWorldPosition(origin);

    raycaster.set(origin, forward);
    const hits = raycaster.intersectObject(floor, true);
    if (hits && hits[0]) {
      hit.copy(hits[0].point);
      targetRing.position.set(hit.x, 0.02, hit.z);
      targetRing.visible = true;
      lastTeleportHit = hit.clone();
    } else {
      targetRing.visible = false;
      lastTeleportHit = null;
    }
  }

  // Trigger -> teleport
  controllerGrip2.addEventListener("selectstart", () => {
    if (lastTeleportHit) {
      // Move rig so camera lands on hit (keep height)
      const camWorld = new THREE.Vector3();
      camera.getWorldPosition(camWorld);

      const rigWorld = new THREE.Vector3();
      playerRig.getWorldPosition(rigWorld);

      const offset = camWorld.sub(rigWorld);
      // teleport destination is lastTeleportHit minus camera offset
      playerRig.position.set(lastTeleportHit.x - offset.x, playerRig.position.y, lastTeleportHit.z - offset.z);
    }
  });

  // ---------- Android / 2D Controls (DO NOT affect XR) ----------
  // D-pad movement + drag look, only when NOT in XR presenting.
  const keys = { f: 0, r: 0 };
  let lookYaw = playerRig.rotation.y;
  let lookPitch = 0;

  function makeAndroidHUD() {
    const hud = document.createElement("div");
    hud.id = "scarlett_android_dpad";
    hud.style.cssText = `
      position:fixed; left:16px; bottom:16px; z-index:999999;
      display:grid; grid-template-columns:64px 64px 64px; grid-template-rows:64px 64px 64px;
      gap:10px; opacity:0.9; user-select:none; touch-action:none;
    `;

    const btn = (label) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.style.cssText = `
        width:64px; height:64px; border-radius:14px;
        border:1px solid rgba(120,160,255,0.25);
        background:rgba(30,40,70,0.55); color:#eaf2ff;
        font-weight:800; font-size:18px;
      `;
      return b;
    };

    const empty = document.createElement("div");
    empty.style.width = "64px"; empty.style.height = "64px";

    const up = btn("▲");
    const dn = btn("▼");
    const lf = btn("◀");
    const rt = btn("▶");

    hud.appendChild(empty.cloneNode(), up, empty.cloneNode());
    hud.appendChild(lf, empty.cloneNode(), rt);
    hud.appendChild(empty.cloneNode(), dn, empty.cloneNode());

    const setMove = (f, r) => { keys.f = f; keys.r = r; };

    const bindHold = (el, f, r) => {
      const on = (e) => { e.preventDefault(); setMove(f, r); };
      const off = (e) => { e.preventDefault(); setMove(0, 0); };
      el.addEventListener("pointerdown", on);
      el.addEventListener("pointerup", off);
      el.addEventListener("pointercancel", off);
      el.addEventListener("pointerleave", off);
    };

    bindHold(up, +1, 0);
    bindHold(dn, -1, 0);
    bindHold(lf, 0, -1);
    bindHold(rt, 0, +1);

    document.body.appendChild(hud);

    // Drag-look (right side of screen)
    let dragging = false;
    let lastX = 0, lastY = 0;
    window.addEventListener("pointerdown", (e) => {
      if (renderer.xr.isPresenting) return;
      if (e.clientX < innerWidth * 0.45) return; // right side only
      dragging = true;
      lastX = e.clientX; lastY = e.clientY;
    }, { passive: true });

    window.addEventListener("pointermove", (e) => {
      if (!dragging || renderer.xr.isPresenting) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;

      lookYaw -= dx * 0.004;
      lookPitch -= dy * 0.003;
      lookPitch = Math.max(-0.65, Math.min(0.65, lookPitch));
    }, { passive: true });

    window.addEventListener("pointerup", () => { dragging = false; }, { passive: true });
  }

  makeAndroidHUD();

  // ---------- VRButton ----------
  if (VRButton) {
    try {
      const btn = VRButton.createButton(renderer);
      btn.style.position = "fixed";
      btn.style.right = "16px";
      btn.style.bottom = "16px";
      btn.style.zIndex = "999999";
      document.body.appendChild(btn);
      log("VRButton appended ✅");
    } catch (e) {
      log("VRButton failed (ok)");
    }
  }

  // ---------- Resize ----------
  function onResize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }
  addEventListener("resize", onResize);

  // ---------- Render Loop ----------
  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);

    // XR: update teleport aim from right controller
    if (renderer.xr.isPresenting) {
      updateTeleportRay(controllerGrip2);
    } else {
      // 2D: move + look (does not affect XR)
      const speed = 3.2;
      const fwd = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), lookYaw);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), lookYaw);

      const move = new THREE.Vector3()
        .addScaledVector(fwd, keys.f)
        .addScaledVector(right, keys.r);

      if (move.lengthSq() > 0.0001) {
        move.normalize().multiplyScalar(speed * dt);
        playerRig.position.add(move);
      }

      playerRig.rotation.y = lookYaw;
      camera.rotation.x = lookPitch;
    }

    renderer.render(scene, camera);
  });

  // Public API (future modules can attach here safely)
  return {
    THREE,
    scene,
    renderer,
    camera,
    playerRig,
    spawnPads,
    applySpawn,
    log
  };
}

export default initWorld;
