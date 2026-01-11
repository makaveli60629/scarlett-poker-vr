// /js/main.js — Scarlett Hybrid 4.7 (Movement Auto-Fix + VR HUD)
// - Movement reads from ANY gamepad (left/right/swap-proof)
// - RIGHT-hand teleport arc always
// - In-world VR HUD panel (always visible in VR)
// - Bright, consistent exposure

(async function boot(){
  const BUILD = `4.7_${Date.now()}`;
  const LOG = [];
  const log = (...a) => {
    const s = a.map(v => typeof v === "string" ? v : JSON.stringify(v)).join(" ");
    LOG.push(`[${new Date().toLocaleTimeString()}] ${s}`);
    if (LOG.length > 500) LOG.shift();
    console.log("[SCARLETT]", ...a);
    window.__SCARLETT_LOG__ = LOG;
  };
  if (window.__SCARLETT_BOOTED__) return;
  window.__SCARLETT_BOOTED__ = true;

  async function safeImport(path){
    try {
      const mod = await import(path + (path.includes("?") ? "" : `?v=${BUILD}`));
      log(`import ok: ${path}`);
      return mod;
    } catch (e) {
      log(`import FAIL: ${path}`, String(e));
      return null;
    }
  }

  const THREE = await import("./three.js");
  log("three via local wrapper ✅");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070913);

  const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.05, 1500);

  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 2.25; // brighter
  renderer.physicallyCorrectLights = false;

  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(renderer.domElement);

  addEventListener("resize", () => {
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // Light (never black)
  scene.add(new THREE.AmbientLight(0xffffff, 0.95));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1b1f35, 1.85));
  const sun = new THREE.DirectionalLight(0xffffff, 3.2);
  sun.position.set(80, 140, 60);
  scene.add(sun);

  const player = new THREE.Group();
  player.name = "PlayerRig";
  scene.add(player);

  camera.position.set(0, 1.65, 0);
  player.add(camera);

  const headLamp = new THREE.PointLight(0xffffff, 2.2, 60);
  headLamp.position.set(0, 1.4, 0.25);
  camera.add(headLamp);

  // VRButton
  const vrbtn = await safeImport("./VRButton.js");
  if (vrbtn?.VRButton) {
    document.body.appendChild(vrbtn.VRButton.createButton(renderer));
    log("VRButton ✅");
  }

  // Controllers
  const controller0 = renderer.xr.getController(0); controller0.name = "Controller0";
  const controller1 = renderer.xr.getController(1); controller1.name = "Controller1";
  player.add(controller0, controller1);

  // Pick a “right controller” heuristic:
  // On Quest, index 1 is often right, but not always.
  // We will force teleport to the controller that actually has a trigger.
  let teleportController = controller1;

  // WORLD
  const worldMod = await safeImport("./world.js");
  const World = worldMod?.World;
  const ctx = { THREE, scene, renderer, camera, player, controller0, controller1, log, BUILD };
  if (World?.init) await World.init(ctx);

  // ---------- In-world VR HUD (always visible) ----------
  function makeVRHUD(){
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 512;
    const g = canvas.getContext("2d");

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent:true });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.52), mat);
    plane.position.set(0, 0.15, -1.25); // in front of camera
    plane.renderOrder = 9999;
    camera.add(plane);

    const state = { lx:0, ly:0, rx:0, ry:0, gpSummary:"no gp" };

    function draw(){
      g.clearRect(0,0,canvas.width,canvas.height);

      // panel bg
      g.fillStyle = "rgba(10,12,18,0.65)";
      g.fillRect(0,0,canvas.width,canvas.height);

      g.font = "700 42px system-ui, Arial";
      g.fillStyle = "#7fe7ff";
      g.fillText(`Scarlett VR HUD  BUILD ${BUILD}`, 40, 70);

      g.font = "600 34px system-ui, Arial";
      g.fillStyle = "#eaf0ff";
      g.fillText(`Move stick (auto): lx=${state.lx.toFixed(2)} ly=${state.ly.toFixed(2)}`, 40, 150);
      g.fillText(`Turn stick: rx=${state.rx.toFixed(2)} ry=${state.ry.toFixed(2)}`, 40, 200);

      g.font = "500 28px system-ui, Arial";
      g.fillStyle = "#cfd6ff";
      g.fillText(state.gpSummary, 40, 260);

      g.fillStyle = "#ff2d7a";
      g.fillText("Teleport: Right trigger", 40, 330);

      g.fillStyle = "#7fe7ff";
      g.fillText("If movement is dead: press A or X once", 40, 380);

      tex.needsUpdate = true;
    }

    return { plane, state, draw, tex };
  }
  const VRHUD = makeVRHUD();

  // ---------- Spawn / Facing ----------
  function applySpawn(){
    const sp = scene.getObjectByName("SpawnPoint");
    if (sp) player.position.set(sp.position.x, 0, sp.position.z);
    else player.position.set(0, 0, 28);

    const boss = scene.getObjectByName("BossTable") || scene.getObjectByName("HubCenter");
    if (boss) {
      const target = new THREE.Vector3();
      boss.getWorldPosition(target);
      const dir = target.sub(player.position);
      const yaw = Math.atan2(dir.x, dir.z);
      player.rotation.set(0, yaw, 0);
      log("Facing target ✅", boss.name);
    }
  }
  applySpawn();
  renderer.xr.addEventListener("sessionstart", ()=> setTimeout(applySpawn, 120));

  // ---------- Gamepad reading (swap-proof) ----------
  function getInputSources(){
    const session = renderer.xr.getSession();
    if (!session) return [];
    return session.inputSources || [];
  }

  // Choose best stick for movement by scanning all gamepads for the “largest magnitude” axes pair.
  function pickMoveAxes(gamepads){
    let best = null; // { gp, axX, axY, mag }
    for (const gp of gamepads){
      if (!gp?.axes?.length) continue;
      // common candidates: (0,1) left stick, (2,3) right stick
      const pairs = [];
      if (gp.axes.length >= 2) pairs.push([0,1]);
      if (gp.axes.length >= 4) pairs.push([2,3]);
      for (const [ix,iy] of pairs){
        const x = gp.axes[ix] ?? 0;
        const y = gp.axes[iy] ?? 0;
        const mag = Math.abs(x) + Math.abs(y);
        if (!best || mag > best.mag) best = { gp, ix, iy, mag, x, y };
      }
    }
    return best;
  }

  function pickTurnAxes(gamepads){
    // Prefer a different pair than move if possible; else fall back.
    let best = null;
    for (const gp of gamepads){
      if (!gp?.axes?.length) continue;
      const pairs = [];
      if (gp.axes.length >= 4) pairs.push([2,3], [0,1]);
      else if (gp.axes.length >= 2) pairs.push([0,1]);
      for (const [ix,iy] of pairs){
        const x = gp.axes[ix] ?? 0;
        const y = gp.axes[iy] ?? 0;
        const mag = Math.abs(x) + Math.abs(y);
        if (!best || mag > best.mag) best = { gp, ix, iy, mag, x, y };
      }
    }
    return best;
  }

  // “Wake” movement if some browsers don’t stream axes until a button is pressed
  let movementWake = false;

  // ---------- Teleport (RIGHT controller only, but controller chosen by trigger presence) ----------
  const floorY = 0;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.26, 0.37, 64),
    new THREE.MeshBasicMaterial({ color: 0xff2d7a, transparent:true, opacity:0.95, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI/2;
  ring.visible = false;
  scene.add(ring);

  const beamPts = Array.from({length:20}, ()=> new THREE.Vector3());
  const beamGeo = new THREE.BufferGeometry().setFromPoints(beamPts);
  const beamMat = new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent:true, opacity:0.95 });
  const beam = new THREE.Line(beamGeo, beamMat);
  beam.frustumCulled = false;

  const hit = new THREE.Vector3();
  const tmpPos = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const tmpDir = new THREE.Vector3();

  function attachBeamToTeleportController(){
    // Remove from both, attach to chosen
    try { controller0.remove(beam); } catch {}
    try { controller1.remove(beam); } catch {}
    teleportController.add(beam);
  }
  attachBeamToTeleportController();

  function updateTeleportArc(){
    teleportController.getWorldPosition(tmpPos);
    teleportController.getWorldQuaternion(tmpQ);
    tmpDir.set(0,0,-1).applyQuaternion(tmpQ).normalize();

    const arcLocal = [];
    const speed = 9.0;
    const gravity = 18.0;
    const start = tmpPos.clone();
    const v0 = tmpDir.clone().multiplyScalar(speed);
    v0.y += 2.2;

    let ok = false;
    for (let i=0;i<20;i++){
      const t = i * 0.07;
      const p = new THREE.Vector3(
        start.x + v0.x * t,
        start.y + v0.y * t - 0.5 * gravity * t * t,
        start.z + v0.z * t
      );
      arcLocal.push(teleportController.worldToLocal(p.clone()));
      if (!ok && p.y <= floorY + 0.02 && i > 3){
        hit.set(p.x, floorY, p.z);
        ok = true;
      }
    }

    if (ok){
      beam.geometry.setFromPoints(arcLocal);
      ring.position.set(hit.x, floorY + 0.02, hit.z);
      ring.visible = true;
      beam.visible = true;
      return true;
    } else {
      ring.visible = false;
      beam.visible = false;
      return false;
    }
  }

  // ---------- Loop ----------
  const MOVE_SPEED = 1.75;
  const SNAP_ANGLE = Math.PI/4;
  let snapCD = 0;
  let lastTrig = false;

  let last = performance.now();
  renderer.setAnimationLoop((t)=>{
    const dt = Math.min(0.05, (t-last)/1000);
    last = t;

    try { World?.update?.(ctx, dt); } catch {}

    if (renderer.xr.isPresenting){
      const sources = getInputSources();
      const gps = sources.map(s => s?.gamepad).filter(Boolean);

      // Identify which controller should be “teleportController” based on trigger button existing
      // (Quest triggers are usually buttons[0] on that hand’s gamepad)
      if (sources.length){
        for (const s of sources){
          if (!s?.gamepad?.buttons?.length) continue;
          if (s.handedness === "right") teleportController = controller1;
          if (s.handedness === "left") {
            // do not switch teleport to left
          }
        }
        attachBeamToTeleportController();
      }

      // Wake movement by pressing A/X once
      for (const gp of gps){
        const a = gp.buttons?.[4]?.pressed || gp.buttons?.[3]?.pressed; // A/X-ish across devices
        if (a) movementWake = true;
      }

      // Movement (swap-proof)
      const movePick = pickMoveAxes(gps);
      if (movePick && (movementWake || movePick.mag > 0.02)){
        // NOTE: WebXR forward is usually -Y on stick -> we convert to forward positive
        const lx = movePick.x;
        const ly = movePick.y;

        // If your forward/back was inverted, this makes pushing forward go forward:
        const forward = (-ly) * MOVE_SPEED * dt;
        const strafe  = ( lx) * MOVE_SPEED * dt;

        const yaw = player.rotation.y;
        player.position.x += Math.sin(yaw)*forward + Math.cos(yaw)*strafe;
        player.position.z += Math.cos(yaw)*forward - Math.sin(yaw)*strafe;

        VRHUD.state.lx = lx; VRHUD.state.ly = ly;
      } else {
        VRHUD.state.lx = 0; VRHUD.state.ly = 0;
      }

      // Turn (snap) (use best axes, but only X)
      snapCD = Math.max(0, snapCD - dt);
      const turnPick = pickTurnAxes(gps);
      let rx = turnPick ? (turnPick.gp.axes[turnPick.ix] ?? 0) : 0;
      let ry = turnPick ? (turnPick.gp.axes[turnPick.iy] ?? 0) : 0;

      VRHUD.state.rx = rx; VRHUD.state.ry = ry;
      VRHUD.state.gpSummary = `gamepads=${gps.length} moveAxes=${movePick?`${movePick.ix},${movePick.iy}`:"none"} turnAxes=${turnPick?`${turnPick.ix},${turnPick.iy}`:"none"} wake=${movementWake}`;

      if (snapCD <= 0 && Math.abs(rx) > 0.75){
        player.rotation.y += (rx > 0 ? -SNAP_ANGLE : SNAP_ANGLE);
        snapCD = 0.28;
      }

      // Teleport
      const can = updateTeleportArc();
      let trig = false;
      for (const gp of gps){
        if (gp.buttons?.[0]?.pressed) trig = true; // trigger-ish
      }
      if (trig && !lastTrig && can){
        player.position.set(hit.x, 0, hit.z);
      }
      lastTrig = trig;

      VRHUD.draw();
    } else {
      beam.visible = false;
      ring.visible = false;
      lastTrig = false;
    }

    renderer.render(scene, camera);
  });

  // room manager optional
  const rm = await safeImport("./room_manager.js");
  try { rm?.RoomManager?.init?.(ctx); } catch {}

  log("Hybrid 4.7 boot complete ✅");
})();
