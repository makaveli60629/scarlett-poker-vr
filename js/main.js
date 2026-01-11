// /js/main.js — Scarlett Diagnostic Build 4.6 (HUD COPY FIX + DOWNLOAD LOG + DEMO BOTS)
// Goals:
// ✅ HUD buttons always wired (even if DOM loads late)
// ✅ Copy Logs works on Quest (Clipboard API -> execCommand -> prompt fallback)
// ✅ Download Logs fallback
// ✅ Bright lighting pack (never dark)
// ✅ Movement + Teleport + 45° snap (right stick)
// ✅ Laser always on RIGHT controller
// ✅ Demo bots seated around BossTable (safe placeholders)

(async function boot(){
  if (window.__SCARLETT_BOOTED__) return;
  window.__SCARLETT_BOOTED__ = true;

  const BUILD = Date.now();
  const qs = (id) => document.getElementById(id);

  // -------------------------
  // HUD / LOG SYSTEM
  // -------------------------
  const ui = {
    grid: qs("scarlettGrid"),
    logBox: qs("scarlettLog"),
    capXR: qs("capXR"),
    capImm: qs("capImm"),
    btnSoftReboot: qs("btnSoftReboot"),
    btnCopy: qs("btnCopyLog"),
    btnClear: qs("btnClearLog"),
    btnMenu: qs("btnMenu"),
    btnRoomLobby: qs("btnRoomLobby"),
    btnRoomStore: qs("btnRoomStore"),
    btnRoomScorpion: qs("btnRoomScorpion"),
  };

  const LOG = {
    lines: [],
    max: 1200,
    push(kind, msg){
      const t = new Date().toLocaleTimeString();
      const line = `[${t}] ${kind.toUpperCase()}: ${msg}`;
      this.lines.push(line);
      if (this.lines.length > this.max) this.lines.splice(0, this.lines.length - this.max);
      if (ui.logBox) ui.logBox.textContent = this.lines.join("\n");
      if (kind === "error") console.error(msg);
      else if (kind === "warn") console.warn(msg);
      else console.log(msg);
    },
    clear(){
      this.lines.length = 0;
      if (ui.logBox) ui.logBox.textContent = "";
      this.push("log", "Logs cleared ✅");
    }
  };

  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.LOG = LOG;

  addEventListener("error", (e) => LOG.push("error", `${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`));
  addEventListener("unhandledrejection", (e) => LOG.push("error", `UnhandledPromiseRejection: ${e.reason?.message || e.reason}`));

  function setGrid(rows){
    if (!ui.grid) return;
    ui.grid.innerHTML = "";
    for (const [k,v] of rows){
      const row = document.createElement("div");
      row.className = "kv";
      const kk = document.createElement("div"); kk.className = "k"; kk.textContent = k;
      const vv = document.createElement("div"); vv.className = "v"; vv.textContent = v;
      row.appendChild(kk); row.appendChild(vv);
      ui.grid.appendChild(row);
    }
  }

  // --- Copy logs: 3-step fallback (Quest-safe)
  async function copyTextRobust(text){
    // 1) Clipboard API (best)
    try{
      if (navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(text);
        return { ok: true, via: "clipboard" };
      }
    }catch(e){
      // continue to fallback
    }

    // 2) execCommand fallback (older mobile browsers)
    try{
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) return { ok: true, via: "execCommand" };
    }catch(e){
      // continue to fallback
    }

    // 3) Manual prompt fallback (always works)
    try{
      prompt("Copy the logs below:", text.slice(0, 50000)); // cap so prompt doesn't explode
      return { ok: true, via: "prompt" };
    }catch(e){
      return { ok: false, via: "none", error: e?.message || String(e) };
    }
  }

  function downloadText(filename, text){
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }

  // Wire buttons safely (even if you tap multiple times)
  function wireHUDButtons(){
    ui.btnClear?.addEventListener("click", () => LOG.clear());

    ui.btnSoftReboot?.addEventListener("click", () => {
      LOG.push("log", "Soft reboot…");
      location.reload();
    });

    ui.btnCopy?.addEventListener("click", async () => {
      const text = LOG.lines.join("\n") || "(no logs yet)";
      const res = await copyTextRobust(text);
      if (res.ok) LOG.push("log", `Copy Logs ✅ via ${res.via}`);
      else LOG.push("warn", `Copy failed ❌ (${res.via}) ${res.error || ""}`);

      // Always also offer download on mobile/Quest
      downloadText(`scarlett-log-${BUILD}.txt`, text);
      LOG.push("log", "Downloaded log file ✅");
    });

    // Menu + room buttons (no-op safe; won’t break if modules missing)
    ui.btnMenu?.addEventListener("click", () => {
      LOG.push("log", "Menu pressed (M)");
      // You can wire this to your UI system later.
    });

    ui.btnRoomLobby?.addEventListener("click", () => {
      window.SCARLETT?.roomManager?.setRoom?.(window.SCARLETT, "lobby");
      LOG.push("log", "Room: Lobby");
    });
    ui.btnRoomStore?.addEventListener("click", () => {
      window.SCARLETT?.roomManager?.setRoom?.(window.SCARLETT, "store");
      LOG.push("log", "Room: Store");
    });
    ui.btnRoomScorpion?.addEventListener("click", () => {
      window.SCARLETT?.roomManager?.setRoom?.(window.SCARLETT, "scorpion");
      LOG.push("log", "Room: Scorpion");
    });
  }

  wireHUDButtons();

  // -------------------------
  // Capabilities readout
  // -------------------------
  async function setCaps(){
    const xr = !!navigator.xr;
    ui.capXR && (ui.capXR.textContent = xr ? "YES" : "NO");
    let immersive = false;
    try{ immersive = xr ? await navigator.xr.isSessionSupported("immersive-vr") : false; }catch{}
    ui.capImm && (ui.capImm.textContent = immersive ? "YES" : "NO");
    return { xr, immersive };
  }

  // -------------------------
  // Imports
  // -------------------------
  async function safeImport(url, label=url){
    try{
      const m = await import(url);
      LOG.push("log", `import ok: ${label}`);
      return m;
    }catch(e){
      LOG.push("warn", `import fail: ${label} — ${e?.message || e}`);
      return null;
    }
  }

  // Prefer your local wrapper if present
  const THREE = await (async () => {
    const w = await safeImport("./three.js", "three via local wrapper");
    if (w) return w.default || w.THREE || w;
    return await import("three");
  })();

  // -------------------------
  // Scene / Renderer
  // -------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070912);

  const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.05, 1500);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;

  // Bright + predictable
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 3.4;
  renderer.physicallyCorrectLights = false;

  document.body.appendChild(renderer.domElement);

  addEventListener("resize", () => {
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // VRButton
  const vrb = await safeImport("./VRButton.js", "./VRButton.js");
  if (vrb?.VRButton?.createButton){
    const btn = vrb.VRButton.createButton(renderer);
    btn.id = "VRButton";
    document.body.appendChild(btn);
    LOG.push("log", "VRButton ✅");
  }else{
    LOG.push("warn", "VRButton missing/invalid.");
  }

  // -------------------------
  // Light pack (cannot be dark)
  // -------------------------
  scene.add(new THREE.AmbientLight(0xffffff, 1.8));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1c1c2e, 3.2));

  const sun = new THREE.DirectionalLight(0xffffff, 6.0);
  sun.position.set(50, 120, 70);
  scene.add(sun);

  // Head-lamp: camera follow
  const headLamp = new THREE.PointLight(0xffffff, 5.0, 140);
  headLamp.position.set(0, 1.35, 0.35);
  camera.add(headLamp);

  // -------------------------
  // PlayerRig
  // -------------------------
  const player = new THREE.Group();
  player.name = "PlayerRig";
  scene.add(player);

  camera.position.set(0, 1.65, 0);
  player.add(camera);

  // Controllers ALWAYS in rig
  const controllerL = renderer.xr.getController(0); controllerL.name="ControllerLeft";
  const controllerR = renderer.xr.getController(1); controllerR.name="ControllerRight";
  player.add(controllerL, controllerR);
  LOG.push("log", "Controllers parented to PlayerRig ✅");

  // XRHands (optional)
  try{
    const handL = renderer.xr.getHand(0); handL.name="XRHandLeft";
    const handR = renderer.xr.getHand(1); handR.name="XRHandRight";
    player.add(handL, handR);
    LOG.push("log", "XRHands parented to PlayerRig ✅");
  }catch{
    LOG.push("warn", "XRHands unavailable (controller-only OK).");
  }

  // -------------------------
  // World
  // -------------------------
  const worldMod = await safeImport("./world.js", "./world.js");
  const World = worldMod?.World;
  const ctx = { THREE, scene, renderer, camera, player, rig: player, yawObject: player, LOG, systems:{}, colliders:[], BUILD };
  if (World?.init){
    await World.init(ctx);
    LOG.push("log", `world module loaded: ${World?.version || "unknown"}`);
  }else{
    LOG.push("error", "world.js missing World.init");
  }

  // -------------------------
  // Spawn: obey SpawnPoint.rotation exactly
  // -------------------------
  function applySpawn(){
    const sp = scene.getObjectByName("SpawnPoint") || scene.getObjectByName("SpawnPad");
    if (!sp) { LOG.push("warn", "No SpawnPoint found."); return; }

    player.position.set(sp.position.x, 0, sp.position.z);

    // If world says "forceYaw", do it.
    const forceYaw = sp.userData?.forceYaw;
    if (forceYaw){
      player.rotation.set(0, sp.rotation.y, 0);
      LOG.push("log", `Spawn yaw forced ✅ yaw=${(sp.rotation.y*180/Math.PI).toFixed(1)}°`);
    }else{
      player.rotation.set(0, sp.rotation.y || Math.PI, 0);
      LOG.push("log", "Spawn yaw applied ✅");
    }

    LOG.push("log", `Spawn ✅ x=${player.position.x.toFixed(2)} z=${player.position.z.toFixed(2)}`);
  }
  applySpawn();
  renderer.xr.addEventListener("sessionstart", () => setTimeout(applySpawn, 160));

  // -------------------------
  // DEMO BOTS (seated around BossTable)
  // -------------------------
  function addDemoBots(){
    const table = scene.getObjectByName("BossTable");
    if (!table) { LOG.push("warn", "BossTable not found; demo bots skipped."); return; }

    const tablePos = new THREE.Vector3();
    table.getWorldPosition(tablePos);

    const botGroup = new THREE.Group();
    botGroup.name = "DemoBots";
    scene.add(botGroup);

    const seatR = 3.1; // distance from table center
    const colors = [0x7fe7ff,0xff2d7a,0xffffff,0x9b5cff,0x00ff9a,0xffcc00,0xff6b6b,0x8aa1ff];

    const botMat = (c)=> new THREE.MeshStandardMaterial({ color:c, roughness:0.7, metalness:0.05, flatShading:true });

    const torsoGeo = new THREE.CapsuleGeometry(0.18, 0.55, 4, 8);
    const headGeo  = new THREE.IcosahedronGeometry(0.13, 1);

    for (let i=0;i<8;i++){
      const a = (i/8)*Math.PI*2;
      const x = tablePos.x + Math.cos(a)*seatR;
      const z = tablePos.z + Math.sin(a)*seatR;

      const bot = new THREE.Group();
      bot.position.set(x, 0, z);
      bot.rotation.y = Math.atan2(tablePos.x - x, tablePos.z - z); // face table

      const torso = new THREE.Mesh(torsoGeo, botMat(colors[i%colors.length]));
      torso.position.y = 1.05;
      bot.add(torso);

      const head = new THREE.Mesh(headGeo, botMat(colors[i%colors.length]));
      head.position.set(0, 0.45, 0);
      torso.add(head);

      // simple chair
      const chair = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.1, 0.55),
        new THREE.MeshStandardMaterial({ color:0x10121a, roughness:0.8, metalness:0.2 })
      );
      chair.position.set(0, 0.45, 0.35);
      bot.add(chair);

      botGroup.add(bot);
    }

    LOG.push("log", "Demo bots seated ✅ (8 around BossTable)");
  }
  addDemoBots();

  // -------------------------
  // Teleport + Laser (right controller only)
  // -------------------------
  const floorPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
  const o = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const d = new THREE.Vector3();
  const hit = new THREE.Vector3();

  const laserMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
  laserMat.depthTest = false;

  const laser = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]),
    laserMat
  );
  laser.frustumCulled = false;
  laser.renderOrder = 9999;
  controllerR.add(laser);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.26, 0.37, 64),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
  );
  ring.rotation.x = -Math.PI/2;
  ring.material.depthTest = false;
  ring.renderOrder = 9999;
  scene.add(ring);

  function updateTeleport(){
    controllerR.getWorldPosition(o);
    controllerR.getWorldQuaternion(q);
    if (o.lengthSq() < 0.001) return false;

    d.set(0,0,-1).applyQuaternion(q).normalize();
    d.y -= 0.35; d.normalize();

    const denom = floorPlane.normal.dot(d);
    if (Math.abs(denom) < 1e-4) return false;

    const t = -(floorPlane.normal.dot(o) + floorPlane.constant) / denom;
    if (t < 0.2 || t > 40) return false;

    hit.copy(o).addScaledVector(d, t);
    laser.geometry.setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-t)]);
    ring.position.set(hit.x, 0.02, hit.z);

    laser.visible = true;
    ring.visible = true;
    return true;
  }

  // -------------------------
  // Quest gamepad mapping (move on RIGHT controller if you prefer later)
  // For now: movement on RIGHT stick Y (forward/back) so it works even if left stick fails.
  // Snap turn on RIGHT stick X (45°).
  // Teleport on RIGHT trigger (one leap per press).
  // -------------------------
  function getRightGamepad(){
    const s = renderer.xr.getSession();
    if (!s) return null;
    for (const src of s.inputSources){
      if (src.handedness === "right" && src.gamepad) return src.gamepad;
    }
    for (const src of s.inputSources){
      if (src.gamepad) return src.gamepad;
    }
    return null;
  }

  const MOVE_SPEED = 1.15;           // slower, controllable
  const SNAP = Math.PI / 4;          // 45°
  let snapCooldown = 0;
  let lastTrigger = false;

  // -------------------------
  // Loop
  // -------------------------
  let fpsAcc=0, fpsCount=0, fps=0;
  let last = performance.now();

  await setCaps();
  LOG.push("log", "Diagnostic build ready ✅");

  renderer.setAnimationLoop((time) => {
    const dt = Math.min(0.05, (time - last) / 1000);
    last = time;

    fpsAcc += dt; fpsCount++;
    if (fpsAcc > 0.5){ fps = Math.round(fpsCount/fpsAcc); fpsAcc=0; fpsCount=0; }

    try{ World?.update?.(ctx, dt); }catch{}

    if (renderer.xr.isPresenting){
      const gpR = getRightGamepad();

      // Movement on RIGHT stick vertical (Quest often reports as axes[3] or axes[1])
      if (gpR?.axes?.length){
        const rx = gpR.axes[2] ?? gpR.axes[0] ?? 0;   // right stick X
        const ry = gpR.axes[3] ?? gpR.axes[1] ?? 0;   // right stick Y

        const yaw = player.rotation.y;
        const forward = (-ry) * MOVE_SPEED * dt;

        // forward/back along yaw
        player.position.x += Math.sin(yaw) * forward;
        player.position.z += Math.cos(yaw) * forward;

        // Snap turn
        snapCooldown = Math.max(0, snapCooldown - dt);
        if (snapCooldown <= 0 && Math.abs(rx) > 0.75){
          player.rotation.y += (rx > 0 ? -SNAP : SNAP);
          snapCooldown = 0.28;
        }
      }

      // Teleport
      const ok = updateTeleport();
      const pressed = !!gpR?.buttons?.[0]?.pressed; // trigger
      if (pressed && !lastTrigger && ok){
        player.position.set(hit.x, 0, hit.z);
        LOG.push("log", `Teleport ✅ x=${hit.x.toFixed(2)} z=${hit.z.toFixed(2)}`);
      }
      lastTrigger = pressed;
    }else{
      laser.visible = false;
      ring.visible = false;
      lastTrigger = false;
    }

    setGrid([
      ["Build", String(BUILD)],
      ["FPS", String(fps)],
      ["XR Presenting", renderer.xr.isPresenting ? "YES" : "NO"],
      ["Rig (x,z)", `${player.position.x.toFixed(2)}, ${player.position.z.toFixed(2)}`],
      ["Copy", "Clipboard→execCommand→prompt + Download"],
      ["Laser", "Right controller only"],
    ]);

    renderer.render(scene, camera);
  });

})();
