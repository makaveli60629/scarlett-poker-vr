// /js/main.js — Scarlett Recovery v1.0 (FULL, UNSTOPPABLE)
// Goals:
// ✅ NEVER stuck on loading screen (forced render loop)
// ✅ Diagnostics always works (copy fallback + download)
// ✅ VRButton always added if possible
// ✅ Movement + 45° snap + 1-leap teleport (right trigger)
// ✅ Laser ALWAYS on right controller
// ✅ World.init errors cannot kill boot

(async function boot(){
  // -------------------------
  // 0) HARD FAILSAFE LOG BOX
  // -------------------------
  const $ = (id) => document.getElementById(id);
  const ui = {
    grid: $("scarlettGrid"),
    logBox: $("scarlettLog"),
    capXR: $("capXR"),
    capImm: $("capImm"),
    btnToggleHUD: $("btnToggleHUD"),
    btnReload: $("btnReload"),
    btnClearLog: $("btnClearLog"),
    btnCopyLog: $("btnCopyLog"),
    btnShowText: $("btnShowText"),
    btnDownload: $("btnDownload"),
    copyBox: $("scarlettCopyBox"),
    hud: $("scarlettDiag")
  };

  const LOG = [];
  const logLine = (kind, msg) => {
    const t = new Date().toLocaleTimeString();
    const line = `[${t}] ${kind.toUpperCase()}: ${msg}`;
    LOG.push(line);
    if (LOG.length > 1200) LOG.splice(0, LOG.length - 1200);
    if (ui.logBox) {
      ui.logBox.textContent = LOG.join("\n");
      ui.logBox.scrollTop = ui.logBox.scrollHeight;
    }
    (kind === "error" ? console.error : kind === "warn" ? console.warn : console.log)(msg);
  };

  window.__SCARLETT_LOG__ = LOG;
  window.addEventListener("error", (e)=>logLine("error", `${e.message} @ ${e.filename}:${e.lineno}`));
  window.addEventListener("unhandledrejection", (e)=>logLine("error", `UnhandledPromiseRejection: ${e.reason?.message || e.reason}`));

  function setMetrics(rows){
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

  async function copyText(text){
    // modern clipboard (often blocked on Quest)
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    // execCommand fallback
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return !!ok;
    } catch {}
    return false;
  }

  function downloadText(text, filename){
    try{
      const blob = new Blob([text], {type:"text/plain"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 500);
    }catch{}
  }

  ui.btnToggleHUD?.addEventListener("click", ()=> {
    if (!ui.hud) return;
    ui.hud.style.display = (ui.hud.style.display === "none") ? "block" : "none";
  });
  ui.btnReload?.addEventListener("click", ()=> location.reload());
  ui.btnClearLog?.addEventListener("click", ()=> { LOG.length = 0; logLine("log","Cleared ✅"); });
  ui.btnCopyLog?.addEventListener("click", async ()=> {
    const text = LOG.join("\n");
    if (!text) return logLine("warn","Nothing to copy yet.");
    const ok = await copyText(text);
    if (ok) {
      logLine("log","Copied ✅");
    } else {
      // fallback manual
      if (ui.copyBox) {
        ui.copyBox.style.display = "block";
        ui.copyBox.value = text;
        ui.copyBox.focus();
        ui.copyBox.select();
      }
      logLine("warn","Clipboard blocked. Use Show Text then press-and-hold → Copy.");
    }
  });
  ui.btnShowText?.addEventListener("click", ()=> {
    if (!ui.copyBox) return;
    ui.copyBox.style.display = (ui.copyBox.style.display === "none" || !ui.copyBox.style.display) ? "block" : "none";
    ui.copyBox.value = LOG.join("\n");
    ui.copyBox.focus();
    ui.copyBox.select();
  });
  ui.btnDownload?.addEventListener("click", ()=> {
    const text = LOG.join("\n");
    if (!text) return logLine("warn","Nothing to download yet.");
    downloadText(text, `scarlett_log_${Date.now()}.txt`);
    logLine("log","Downloaded ✅");
  });

  // Capability check
  const xr = !!navigator.xr;
  if (ui.capXR) ui.capXR.textContent = xr ? "YES" : "NO";
  let immersive = false;
  try { immersive = xr ? await navigator.xr.isSessionSupported("immersive-vr") : false; } catch {}
  if (ui.capImm) ui.capImm.textContent = immersive ? "YES" : "NO";

  logLine("log", "Boot start ✅");

  // -------------------------
  // 1) THREE import (CDN)
  // -------------------------
  const THREE = await import("three");

  // -------------------------
  // 2) Scene / camera / renderer
  // -------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060812);

  const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.05, 1500);

  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;

  // Bright defaults
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 2.2;

  document.body.appendChild(renderer.domElement);

  addEventListener("resize", ()=>{
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // -------------------------
  // 3) Player rig
  // -------------------------
  const rig = new THREE.Group();
  rig.name = "PlayerRig";
  scene.add(rig);

  camera.position.set(0, 1.65, 0);
  rig.add(camera);

  // -------------------------
  // 4) VRButton (safe import)
  // -------------------------
  try {
    const { VRButton } = await import("./VRButton.js");
    const btn = VRButton.createButton(renderer);
    btn.id = "VRButton";
    document.body.appendChild(btn);
    logLine("log", "VRButton ✅");
  } catch (e) {
    logLine("warn", "VRButton missing/failed: " + (e?.message || e));
  }

  // -------------------------
  // 5) Overkill lights (always visible)
  // -------------------------
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1b1f3a, 2.2));

  const sun = new THREE.DirectionalLight(0xffffff, 4.5);
  sun.position.set(30, 80, 50);
  scene.add(sun);

  // headlamp follows camera
  const headLamp = new THREE.PointLight(0xffffff, 2.6, 40);
  headLamp.position.set(0, 1.4, 0.25);
  camera.add(headLamp);

  // -------------------------
  // 6) Controllers / hands
  // -------------------------
  const cL = renderer.xr.getController(0);
  const cR = renderer.xr.getController(1);
  cL.name = "ControllerLeft";
  cR.name = "ControllerRight";
  rig.add(cL, cR);
  logLine("log", "Controllers parented ✅");

  try {
    const hL = renderer.xr.getHand(0);
    const hR = renderer.xr.getHand(1);
    hL.name = "XRHandLeft";
    hR.name = "XRHandRight";
    rig.add(hL, hR);
    logLine("log", "XRHands parented ✅");
  } catch {
    logLine("warn", "XRHands unavailable (OK).");
  }

  // -------------------------
  // 7) Laser + ring (RIGHT controller only)
  // -------------------------
  const laser = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]),
    new THREE.LineBasicMaterial({ color: 0x00ffff })
  );
  laser.frustumCulled = false;
  cR.add(laser);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.26, 0.37, 64),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, side: THREE.DoubleSide, transparent:true, opacity:0.95 })
  );
  ring.rotation.x = -Math.PI/2;
  scene.add(ring);

  // -------------------------
  // 8) World (safe load)
  // -------------------------
  const ctx = { THREE, scene, rig, camera, renderer, logLine };

  let World = null;
  try {
    const m = await import("./world.js");
    World = m?.World || null;
    logLine("log", "world.js import ✅");
  } catch (e) {
    logLine("error", "world.js import FAILED: " + (e?.message || e));
  }

  if (World?.init) {
    try {
      await World.init(ctx);
      logLine("log", "[world] init ✅");
    } catch (e) {
      logLine("error", "[world] init FAILED: " + (e?.message || e));
    }
  } else {
    logLine("warn", "[world] missing World.init (continuing)");
  }

  // -------------------------
  // 9) Spawn facing target (table), never face teleporter
  // -------------------------
  function applySpawn() {
    const sp = scene.getObjectByName("SpawnPoint") || scene.getObjectByName("SpawnPad");
    const target = scene.getObjectByName("BossTable") || scene.getObjectByName("HubPlate");

    if (sp) {
      const p = new THREE.Vector3();
      sp.getWorldPosition(p);
      rig.position.set(p.x, 0, p.z);
    }
    if (target) {
      const pRig = new THREE.Vector3(rig.position.x, 0, rig.position.z);
      const pTar = new THREE.Vector3();
      target.getWorldPosition(pTar);
      pTar.y = 0;
      const v = pTar.sub(pRig);
      if (v.lengthSq() > 1e-6) {
        const yaw = Math.atan2(v.x, v.z); // face target
        rig.rotation.set(0, yaw, 0);
      }
    }
    logLine("log", `Spawn ✅ x=${rig.position.x.toFixed(2)} z=${rig.position.z.toFixed(2)}`);
  }

  applySpawn();
  renderer.xr.addEventListener("sessionstart", ()=> setTimeout(applySpawn, 160));

  // -------------------------
  // 10) Teleport math (floor y=0)
  // -------------------------
  const floorPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
  const o = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const d = new THREE.Vector3();
  const hit = new THREE.Vector3();

  function updateTeleportRay() {
    cR.getWorldPosition(o);
    cR.getWorldQuaternion(q);

    if (o.lengthSq() < 0.0001) return false;

    d.set(0,0,-1).applyQuaternion(q).normalize();
    d.y -= 0.35;
    d.normalize();

    const denom = floorPlane.normal.dot(d);
    if (Math.abs(denom) < 1e-6) return false;

    const t = -(floorPlane.normal.dot(o) + floorPlane.constant) / denom;
    if (t < 0.25 || t > 40) return false;

    hit.copy(o).addScaledVector(d, t);

    laser.geometry.setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-t)]);
    ring.position.set(hit.x, 0.02, hit.z);

    laser.visible = true;
    ring.visible = true;
    return true;
  }

  // -------------------------
  // 11) Gamepad mapping (Quest)
  // LEFT stick = move, RIGHT stick X = 45° snap, RIGHT trigger = 1 leap teleport
  // -------------------------
  function getGamepads() {
    const session = renderer.xr.getSession();
    if (!session) return { gpL:null, gpR:null };
    let gpL=null, gpR=null;
    for (const src of session.inputSources) {
      if (!src.gamepad) continue;
      if (src.handedness === "left") gpL = src.gamepad;
      if (src.handedness === "right") gpR = src.gamepad;
    }
    return { gpL, gpR };
  }

  const MOVE_SPEED = 1.25;
  const SNAP = Math.PI/4; // 45°
  let snapCooldown = 0;
  let lastTrigger = false;

  // -------------------------
  // 12) MAIN LOOP
  // -------------------------
  let last = performance.now();
  let fpsAcc=0, fpsCount=0, fps=0;

  renderer.setAnimationLoop((time)=>{
    const dt = Math.min(0.05, (time-last)/1000);
    last = time;

    fpsAcc += dt; fpsCount++;
    if (fpsAcc >= 0.5) { fps = Math.round(fpsCount/fpsAcc); fpsAcc=0; fpsCount=0; }

    try { World?.update?.(ctx, dt); } catch {}

    if (renderer.xr.isPresenting) {
      const { gpL, gpR } = getGamepads();

      // LEFT stick move
      if (gpL?.axes?.length >= 2) {
        const lx = gpL.axes[0] ?? 0;
        const ly = gpL.axes[1] ?? 0;

        const yaw = rig.rotation.y;
        const forward = (-ly) * MOVE_SPEED * dt;
        const strafe  = ( lx) * MOVE_SPEED * dt;

        rig.position.x += Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
        rig.position.z += Math.cos(yaw) * forward - Math.sin(yaw) * strafe;
      }

      // RIGHT stick snap
      snapCooldown = Math.max(0, snapCooldown - dt);
      let rx = 0;
      if (gpR?.axes?.length >= 4) rx = gpR.axes[2] ?? 0;
      else if (gpR?.axes?.length >= 1) rx = gpR.axes[0] ?? 0;

      if (snapCooldown <= 0 && Math.abs(rx) > 0.75) {
        rig.rotation.y += (rx > 0 ? -SNAP : SNAP);
        snapCooldown = 0.28;
      }

      // Teleport 1 leap per trigger press
      const ok = updateTeleportRay();
      const trigger = !!gpR?.buttons?.[0]?.pressed;

      if (trigger && !lastTrigger && ok) {
        rig.position.set(hit.x, 0, hit.z);
        logLine("log", `Teleport ✅ x=${hit.x.toFixed(2)} z=${hit.z.toFixed(2)}`);
      }
      lastTrigger = trigger;
    } else {
      laser.visible = false;
      ring.visible = false;
      lastTrigger = false;
    }

    setMetrics([
      ["FPS", `${fps}`],
      ["XR", renderer.xr.isPresenting ? "YES" : "NO"],
      ["Rig", `${rig.position.x.toFixed(1)}, ${rig.position.z.toFixed(1)}`],
      ["Move", "LEFT stick"],
      ["Turn", "RIGHT stick 45°"],
      ["Teleport", "RIGHT trigger (1 leap)"],
    ]);

    renderer.render(scene, camera);
  });

  logLine("log", "Recovery boot complete ✅ (should NEVER stick on loading)");
})();
