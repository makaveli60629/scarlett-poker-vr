// /js/main.js — Scarlett Hybrid 4.2 (ALIGN-FIRST GRID MODE)
// ✅ bright lighting (Quest-friendly)
// ✅ spawn ALWAYS faces BossTable
// ✅ no fast sliding teleport: ONE leap per press
// ✅ left stick move, right stick 45° snap, right stick forward/back solo
// ✅ hub-biased laser that always hits floor plane
// ✅ safe-wires your modules (room_manager, store, vr_ui, etc.) if present

(async function boot() {
  console.log("SCARLETT_MAIN=4.2");
  if (window.__SCARLETT_BOOTED__) return;
  window.__SCARLETT_BOOTED__ = true;

  // -------- THREE import: local first ----------
  const THREE = await (async () => {
    try {
      const m = await import("./three.js");
      return m.default || m.THREE || m;
    } catch {
      const m = await import("three");
      return m.default || m.THREE || m;
    }
  })();

  // -------- Safe import helper ----------
  const safeImport = async (url) => {
    try {
      const m = await import(url);
      console.log(`[import ok] ${url}`);
      return m;
    } catch (e) {
      console.warn(`[import fail] ${url} — ${e?.message || e}`);
      return null;
    }
  };

  // -------- Scene / Camera / Renderer ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070912);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 1600);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;

  // BRIGHT + predictable on Quest
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 3.15; // 🔥 brighter than before
  renderer.physicallyCorrectLights = false;

  document.body.appendChild(renderer.domElement);

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // -------- Player rig ----------
  const player = new THREE.Group();
  player.name = "PlayerRig";
  scene.add(player);

  camera.position.set(0, 1.65, 0);
  player.add(camera);

  // -------- VRButton ----------
  const vrb = await safeImport("./VRButton.js");
  if (vrb?.VRButton?.createButton) document.body.appendChild(vrb.VRButton.createButton(renderer));

  // -------- Overkill lighting pack ----------
  const lightRoot = new THREE.Group();
  lightRoot.name = "LightPack";
  scene.add(lightRoot);

  lightRoot.add(new THREE.AmbientLight(0xffffff, 1.6));
  lightRoot.add(new THREE.HemisphereLight(0xffffff, 0x2b2b45, 3.2));

  const sun = new THREE.DirectionalLight(0xffffff, 7.0);
  sun.position.set(60, 140, 80);
  lightRoot.add(sun);

  // Headlamp so “where you look is lit”
  const headLamp = new THREE.PointLight(0xffffff, 3.0, 45);
  headLamp.position.set(0, 1.4, 0.35);
  camera.add(headLamp);

  // -------- Controllers + hands (parented to rig) ----------
  const controllerL = renderer.xr.getController(0);
  const controllerR = renderer.xr.getController(1);
  controllerL.name = "ControllerLeft";
  controllerR.name = "ControllerRight";
  player.add(controllerL, controllerR);

  try {
    const handL = renderer.xr.getHand(0);
    const handR = renderer.xr.getHand(1);
    handL.name = "XRHandLeft";
    handR.name = "XRHandRight";
    player.add(handL, handR);
  } catch {}

  // -------- World ----------
  const worldMod = await safeImport("./world.js");
  const World = worldMod?.World;
  if (!World?.init) throw new Error("world.js missing export World.init(ctx)");

  const ctx = {
    THREE, scene, renderer, camera, player,
    systems: {},
    colliders: [],
    mode: "lobby",
  };

  await World.init(ctx);

  // -------- Spawn: ALWAYS face BossTable ----------
  const tmpP = new THREE.Vector3();
  const tmpT = new THREE.Vector3();

  function applySpawnFacingTable() {
    const sp = scene.getObjectByName("SpawnPoint") || scene.getObjectByName("SpawnPad");
    const table = scene.getObjectByName("BossTable") || scene.getObjectByName("HubPlate");

    if (sp) {
      sp.getWorldPosition(tmpP);
      player.position.set(tmpP.x, 0, tmpP.z);
    }

    if (table) {
      table.getWorldPosition(tmpT);
      const v = tmpT.sub(player.position);
      v.y = 0;
      if (v.lengthSq() > 1e-6) {
        const yaw = Math.atan2(v.x, v.z);
        player.rotation.set(0, yaw, 0); // ✅ face table
      }
    }
  }

  applySpawnFacingTable();
  renderer.xr.addEventListener("sessionstart", () => setTimeout(applySpawnFacingTable, 170));

  // -------- Optional systems wiring (safe) ----------
  const roomManagerMod = await safeImport("./room_manager.js");
  if (roomManagerMod?.RoomManager?.init) {
    ctx.systems.room_manager = roomManagerMod.RoomManager;
    roomManagerMod.RoomManager.init(ctx);
  }

  const storeMod = await safeImport("./store.js");
  const StoreSystem = storeMod?.StoreSystem || storeMod?.Store || null;
  if (StoreSystem?.init) {
    ctx.systems.store = StoreSystem;
    StoreSystem.init({ THREE, scene, world: ctx.world, ctx, player, camera, log: console.log });
    StoreSystem.setActive?.(false);
  }

  const vrUiMod = await safeImport("./vr_ui.js");
  if (vrUiMod?.initVRUI) {
    ctx.systems.vr_ui = { init: vrUiMod.initVRUI };
    vrUiMod.initVRUI(ctx);
  }

  const uiMod = await safeImport("./ui.js");
  if (uiMod?.UI?.init) {
    ctx.systems.ui = uiMod.UI;
    uiMod.UI.init(ctx);
  }

  // -------- Teleport (ONE leap per press) ----------
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const laser = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]),
    new THREE.LineBasicMaterial({ color: 0x00ffff })
  );
  laser.frustumCulled = false;
  controllerR.add(laser);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.26, 0.37, 64),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  const o = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const dir = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const hubPos = new THREE.Vector3();
  const toHub = new THREE.Vector3();

  const getHub = () => scene.getObjectByName("HubPlate") || scene.getObjectByName("BossTable") || null;

  function updateTeleportRay() {
    controllerR.getWorldPosition(o);
    controllerR.getWorldQuaternion(q);
    if (o.lengthSq() < 0.0001) return false;

    fwd.set(0, 0, -1).applyQuaternion(q).normalize();

    const hub = getHub();
    if (hub) {
      hub.getWorldPosition(hubPos);
      toHub.copy(hubPos).sub(o).normalize();
      fwd.lerp(toHub, 0.28).normalize();
    }

    dir.copy(fwd);
    dir.y -= 0.38;
    dir.normalize();

    const denom = floorPlane.normal.dot(dir);
    if (Math.abs(denom) < 0.001) return false;

    const t = -(floorPlane.normal.dot(o) + floorPlane.constant) / denom;
    if (t < 0.2 || t > 40) return false;

    hit.copy(o).addScaledVector(dir, t);

    const dist = Math.max(0.2, Math.min(40, o.distanceTo(hit)));
    laser.geometry.setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-dist)]);
    ring.position.set(hit.x, 0.02, hit.z);

    laser.visible = true;
    ring.visible = true;
    return true;
  }

  function getGamepads() {
    const s = renderer.xr.getSession?.();
    if (!s) return { gpL: null, gpR: null };
    let gpL = null, gpR = null;
    for (const src of s.inputSources) {
      if (!src.gamepad) continue;
      if (src.handedness === "left") gpL = src.gamepad;
      if (src.handedness === "right") gpR = src.gamepad;
    }
    return { gpL, gpR };
  }

  function teleportPressed(gpR) {
    if (!gpR?.buttons) return false;
    return !!(gpR.buttons[0]?.pressed || gpR.buttons[1]?.pressed || gpR.buttons[4]?.pressed || gpR.buttons[5]?.pressed);
  }

  // Locomotion
  const MOVE_L = 1.05;
  const MOVE_R = 1.00;
  const SNAP = Math.PI / 4; // 45°
  let snapCooldown = 0;
  let lastTeleport = false;

  // Store activation zone (West room)
  const storeZone = {
    enabled: !!StoreSystem,
    inside: false,
    center: new THREE.Vector3(),
    half: new THREE.Vector3(6.5, 2.0, 6.5),
  };

  function updateStoreZone() {
    if (!storeZone.enabled) return;
    const room = scene.getObjectByName("Room_West_Store");
    if (!room) return;
    room.getWorldPosition(storeZone.center);

    const dx = Math.abs(player.position.x - storeZone.center.x);
    const dz = Math.abs(player.position.z - storeZone.center.z);
    const nowInside = (dx <= storeZone.half.x && dz <= storeZone.half.z);

    if (nowInside !== storeZone.inside) {
      storeZone.inside = nowInside;
      StoreSystem?.setActive?.(nowInside);
      ctx.systems.room_manager?.setRoom?.(ctx, nowInside ? "store" : "lobby");
    }
  }

  // -------- Loop ----------
  let last = performance.now();
  renderer.setAnimationLoop((time) => {
    const dt = Math.min(0.05, (time - last) / 1000);
    last = time;

    try { World?.update?.(ctx, dt); } catch {}

    // optional updates
    try { ctx.systems.ui?.update?.(ctx, dt); } catch {}
    try { ctx.systems.store?.update?.(ctx, dt); } catch {}

    if (renderer.xr.isPresenting) {
      const { gpL, gpR } = getGamepads();

      // Left stick move (0,1)
      if (gpL?.axes?.length >= 2) {
        const lx = gpL.axes[0] ?? 0;
        const ly = gpL.axes[1] ?? 0;

        const yaw = player.rotation.y;
        const forward = (-ly) * MOVE_L * dt;
        const strafe  = ( lx) * MOVE_L * dt;

        player.position.x += Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
        player.position.z += Math.cos(yaw) * forward - Math.sin(yaw) * strafe;
      }

      // Right stick forward/back solo (3)
      if (gpR?.axes?.length >= 4) {
        const ry = gpR.axes[3] ?? 0;
        if (Math.abs(ry) > 0.12) {
          const yaw = player.rotation.y;
          const forward = (-ry) * MOVE_R * dt;
          player.position.x += Math.sin(yaw) * forward;
          player.position.z += Math.cos(yaw) * forward;
        }
      }

      // Right stick snap turn (2)
      snapCooldown = Math.max(0, snapCooldown - dt);
      const rx = (gpR?.axes?.length >= 4) ? (gpR.axes[2] ?? 0) : (gpR?.axes?.[0] ?? 0);
      if (snapCooldown <= 0 && Math.abs(rx) > 0.75) {
        player.rotation.y += (rx > 0 ? -SNAP : SNAP);
        snapCooldown = 0.28;
      }

      // Teleport (one press -> one leap)
      const canTeleport = updateTeleportRay();
      const pressed = teleportPressed(gpR);
      if (pressed && !lastTeleport && canTeleport) {
        player.position.set(hit.x, 0, hit.z);
      }
      lastTeleport = pressed;

      updateStoreZone();
    } else {
      laser.visible = false;
      ring.visible = false;
      lastTeleport = false;
      updateStoreZone();
    }

    renderer.render(scene, camera);
  });
})();
