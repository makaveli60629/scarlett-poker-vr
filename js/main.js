// /js/main.js — Scarlett Hybrid 4.6 (NO-CLEANUP SAFE)
// - Uses local ./three.js wrapper (GitHub Pages safe)
// - RIGHT-hand laser only
// - Fix forward/back inversion
// - Bright, consistent lighting
// - Spawn faces AWAY from teleporter (toward BossTable / hub center)
// - Diagnostics HUD: Copy Log + Hard Reset always works
// - Teleport is internal (does NOT depend on deleted teleport scripts)

(async function boot(){
  const BUILD = `4.6_${Date.now()}`;
  const LOG = [];
  const log = (...a) => {
    const s = a.map(v => typeof v === "string" ? v : JSON.stringify(v)).join(" ");
    LOG.push(`[${new Date().toLocaleTimeString()}] ${s}`);
    console.log("[SCARLETT]", ...a);
    if (LOG.length > 500) LOG.shift();
    try { window.__SCARLETT_LOG__ = LOG; } catch {}
  };

  if (window.__SCARLETT_BOOTED__) return;
  window.__SCARLETT_BOOTED__ = true;
  window.__SCARLETT_LOG__ = LOG;

  // ---------- HARD RESET ----------
  window.__SCARLETT_RESET__ = () => {
    log("HARD RESET requested");
    try { localStorage.removeItem("scarlett_state"); } catch {}
    try { location.reload(); } catch {}
  };

  // ---------- DIAGNOSTICS HUD (DOM, always available) ----------
  function makeDiagnosticsHUD(){
    const hud = document.createElement("div");
    hud.id = "scarlett_diag";
    hud.style.cssText = `
      position:fixed; left:10px; top:10px; z-index:99999;
      width:min(520px, calc(100vw - 20px));
      background:rgba(10,12,18,.78);
      color:#eaf0ff; font:12px/1.35 system-ui, -apple-system, Segoe UI, Roboto, Arial;
      border:1px solid rgba(127,231,255,.25);
      border-radius:14px; padding:10px;
      box-shadow:0 12px 40px rgba(0,0,0,.45);
      backdrop-filter: blur(8px);
      pointer-events:auto;
    `;
    const row = document.createElement("div");
    row.style.cssText = "display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:8px;";
    const title = document.createElement("div");
    title.textContent = `Scarlett Diagnostics (BUILD ${BUILD})`;
    title.style.cssText = "font-weight:700; color:#7fe7ff; margin-right:auto;";
    const btnCopy = document.createElement("button");
    btnCopy.textContent = "Copy Log";
    btnCopy.style.cssText = "padding:6px 10px; border-radius:10px; border:1px solid rgba(127,231,255,.35); background:rgba(15,20,32,.9); color:#eaf0ff;";
    const btnReset = document.createElement("button");
    btnReset.textContent = "Hard Reset";
    btnReset.style.cssText = "padding:6px 10px; border-radius:10px; border:1px solid rgba(255,45,122,.35); background:rgba(32,15,22,.9); color:#ffd7e7;";
    const btnHide = document.createElement("button");
    btnHide.textContent = "Hide";
    btnHide.style.cssText = "padding:6px 10px; border-radius:10px; border:1px solid rgba(255,255,255,.20); background:rgba(15,20,32,.65); color:#cfd6ff;";

    const pre = document.createElement("pre");
    pre.style.cssText = `
      margin:0; max-height:220px; overflow:auto; white-space:pre-wrap;
      border-radius:12px; padding:8px; background:rgba(0,0,0,.25);
      border:1px solid rgba(255,255,255,.08);
    `;
    const update = () => { pre.textContent = LOG.slice(-80).join("\n"); };
    setInterval(update, 250);
    update();

    btnCopy.onclick = async () => {
      const text = LOG.join("\n");
      try {
        await navigator.clipboard.writeText(text);
        log("✅ Copied diagnostics log to clipboard");
      } catch (e) {
        // Fallback for browsers that block clipboard
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
          log("✅ Copied diagnostics log (fallback)");
        } catch (e2) {
          log("❌ Copy failed", String(e2 || e));
        }
      }
    };

    btnReset.onclick = () => window.__SCARLETT_RESET__();
    btnHide.onclick = () => { hud.style.display = "none"; };

    row.appendChild(title);
    row.appendChild(btnCopy);
    row.appendChild(btnReset);
    row.appendChild(btnHide);

    hud.appendChild(row);
    hud.appendChild(pre);
    document.body.appendChild(hud);
  }
  makeDiagnosticsHUD();

  // ---------- SAFE IMPORT ----------
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

  // ---------- THREE ----------
  const THREE = await import("./three.js");
  log("three via local wrapper ✅");

  // ---------- SCENE / CAMERA / RENDERER ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090b12);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 1500);

  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;

  // Keep it bright and predictable:
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 2.05;         // bright but not blown out
  renderer.physicallyCorrectLights = false;

  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(renderer.domElement);

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // ---------- PLAYER RIG ----------
  const player = new THREE.Group();
  player.name = "PlayerRig";
  scene.add(player);

  camera.position.set(0, 1.65, 0);
  player.add(camera);

  // ---------- VRButton ----------
  const vrbtn = await safeImport("./VRButton.js");
  if (vrbtn?.VRButton) {
    document.body.appendChild(vrbtn.VRButton.createButton(renderer));
    log("VRButton ✅");
  } else {
    log("VRButton missing ❌");
  }

  // ---------- LIGHT PACK (CONSISTENT INSIDE/OUTSIDE) ----------
  const lightRoot = new THREE.Group();
  lightRoot.name = "MainLightPack";
  scene.add(lightRoot);

  lightRoot.add(new THREE.AmbientLight(0xffffff, 0.9));
  lightRoot.add(new THREE.HemisphereLight(0xffffff, 0x202033, 1.65));

  const sun = new THREE.DirectionalLight(0xffffff, 2.8);
  sun.position.set(60, 120, 40);
  lightRoot.add(sun);

  // Camera head-lamp so it never goes “black”
  const headLamp = new THREE.PointLight(0xffffff, 1.8, 40);
  headLamp.position.set(0, 1.4, 0.25);
  camera.add(headLamp);

  // ---------- CONTROLLERS (RIGHT HAND ONLY LASER) ----------
  const controllerL = renderer.xr.getController(0); controllerL.name = "ControllerLeft";
  const controllerR = renderer.xr.getController(1); controllerR.name = "ControllerRight";
  player.add(controllerL, controllerR);
  log("Controllers parented to PlayerRig ✅");

  try {
    const leftHand = renderer.xr.getHand(0); leftHand.name = "XRHandLeft";
    const rightHand = renderer.xr.getHand(1); rightHand.name = "XRHandRight";
    player.add(leftHand, rightHand);
    log("XRHands parented to PlayerRig ✅");
  } catch {}

  // ---------- WORLD ----------
  const worldMod = await safeImport("./world.js");
  const World = worldMod?.World;

  const ctx = { THREE, scene, renderer, camera, player, controllerL, controllerR, log, BUILD };
  if (World?.init) await World.init(ctx);

  // ---------- SPAWN (face away from teleporter) ----------
  function applySpawn(){
    const sp = scene.getObjectByName("SpawnPoint");
    if (sp) {
      player.position.set(sp.position.x, 0, sp.position.z);
      log(`Spawn ✅ x=${sp.position.x.toFixed(2)} z=${sp.position.z.toFixed(2)}`);
    } else {
      // safe fallback
      player.position.set(0, 0, 28);
      log("Spawn fallback ✅ x=0 z=28");
    }

    // face toward BossTable (preferred), else HubCenter, else just flip 180 from teleporter
    const boss = scene.getObjectByName("BossTable") || scene.getObjectByName("HubCenter");
    const tp = scene.getObjectByName("TeleportMachine");
    const target = new THREE.Vector3();

    if (boss) {
      boss.getWorldPosition(target);
      const dir = target.sub(player.position);
      const yaw = Math.atan2(dir.x, dir.z);
      player.rotation.set(0, yaw, 0);
      log("Facing target ✅", boss.name);
    } else if (tp) {
      // Face opposite teleporter
      const tpp = new THREE.Vector3();
      tp.getWorldPosition(tpp);
      const dir = tpp.sub(player.position);
      const yaw = Math.atan2(dir.x, dir.z) + Math.PI; // opposite
      player.rotation.set(0, yaw, 0);
      log("Facing opposite teleporter ✅");
    } else {
      player.rotation.set(0, Math.PI, 0);
      log("Facing default ✅");
    }
  }
  applySpawn();
  renderer.xr.addEventListener("sessionstart", () => setTimeout(applySpawn, 120));

  // ---------- TELEPORT (internal, always works) ----------
  const floorY = 0;
  const floorPlane = new THREE.Plane(new THREE.Vector3(0,1,0), -floorY);

  // visible curved “floor arc” beam
  const beamPoints = [];
  for (let i=0;i<20;i++) beamPoints.push(new THREE.Vector3(0,0,0));
  const beamGeo = new THREE.BufferGeometry().setFromPoints(beamPoints);
  const beamMat = new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent:true, opacity:0.95 });
  const beam = new THREE.Line(beamGeo, beamMat);
  beam.frustumCulled = false;
  controllerR.add(beam);

  // ring marker
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.26, 0.37, 64),
    new THREE.MeshBasicMaterial({ color: 0xff2d7a, side: THREE.DoubleSide, transparent:true, opacity:0.95 })
  );
  ring.rotation.x = -Math.PI/2;
  ring.visible = false;
  scene.add(ring);

  const tmpPos = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const tmpDir = new THREE.Vector3();
  const hit = new THREE.Vector3();

  function updateTeleportArc(){
    controllerR.getWorldPosition(tmpPos);
    controllerR.getWorldQuaternion(tmpQ);
    if (tmpPos.lengthSq() < 0.0001) return false;

    // base direction from controller
    tmpDir.set(0,0,-1).applyQuaternion(tmpQ).normalize();

    // force it to “sit on the floor” visually (arc)
    const arc = [];
    const speed = 9.0;
    const gravity = 18.0;
    const start = tmpPos.clone();
    const v0 = tmpDir.clone().multiplyScalar(speed);
    v0.y += 2.2; // slight lift

    let ok = false;
    for (let i=0;i<20;i++){
      const t = i * 0.07;
      const p = new THREE.Vector3(
        start.x + v0.x * t,
        start.y + v0.y * t - 0.5 * gravity * t * t,
        start.z + v0.z * t
      );
      arc.push(controllerR.worldToLocal(p.clone())); // local beam points
      if (!ok && p.y <= floorY + 0.02 && i > 3){
        hit.set(p.x, floorY, p.z);
        ok = true;
      }
    }

    if (ok){
      beam.geometry.setFromPoints(arc);
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

  // ---------- INPUT (Quest-safe gamepad mapping) ----------
  function getGamepads(){
    const session = renderer.xr.getSession();
    if (!session) return { gpL:null, gpR:null };
    let gpL=null, gpR=null;
    for (const src of session.inputSources){
      if (!src?.gamepad) continue;
      if (src.handedness === "left") gpL = src.gamepad;
      if (src.handedness === "right") gpR = src.gamepad;
    }
    return { gpL, gpR };
  }

  const MOVE_SPEED = 1.55;
  const SNAP_ANGLE = Math.PI/4;
  let snapCD = 0;
  let lastTeleport = false;

  // ---------- LOOP ----------
  let last = performance.now();
  renderer.setAnimationLoop((t)=>{
    const dt = Math.min(0.05, (t-last)/1000);
    last = t;

    try { World?.update?.(ctx, dt); } catch {}

    if (renderer.xr.isPresenting){
      const { gpL, gpR } = getGamepads();

      // LEFT stick movement (fix inversion: forward should be forward)
      if (gpL?.axes?.length >= 2){
        const lx = gpL.axes[0] ?? 0;
        const ly = gpL.axes[1] ?? 0;

        // IMPORTANT: invert so pushing forward (negative ly) moves forward.
        const forward = (-ly) * MOVE_SPEED * dt;
        const strafe  = ( lx) * MOVE_SPEED * dt;

        const yaw = player.rotation.y;
        player.position.x += Math.sin(yaw)*forward + Math.cos(yaw)*strafe;
        player.position.z += Math.cos(yaw)*forward - Math.sin(yaw)*strafe;
      }

      // RIGHT stick snap turn (Quest: axes[2] on right gamepad when present)
      snapCD = Math.max(0, snapCD - dt);
      let rx = 0;
      if (gpR?.axes?.length >= 4) rx = gpR.axes[2] ?? 0;
      else if (gpR?.axes?.length >= 1) rx = gpR.axes[0] ?? 0;

      if (snapCD <= 0 && Math.abs(rx) > 0.75){
        player.rotation.y += (rx > 0 ? -SNAP_ANGLE : SNAP_ANGLE);
        snapCD = 0.28;
      }

      // Teleport arc & trigger
      const can = updateTeleportArc();
      const trig = !!gpR?.buttons?.[0]?.pressed; // trigger button
      if (trig && !lastTeleport && can){
        player.position.set(hit.x, 0, hit.z);
      }
      lastTeleport = trig;

    } else {
      beam.visible = false;
      ring.visible = false;
      lastTeleport = false;
    }

    renderer.render(scene, camera);
  });

  // ---------- ROOM MANAGER (optional) ----------
  const rm = await safeImport("./room_manager.js");
  try { rm?.RoomManager?.init?.(ctx); } catch {}

  log("Hybrid 4.6 boot complete ✅ (no-cleanup safe)");
})();
