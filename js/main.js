// /js/main.js — Scarlett Hybrid 2.0 (FULL)
// ✅ Spawn on SpawnPad, face BossTable/center
// ✅ Hands-only pinch teleport + laser + floor ring marker
// ✅ Keeps your VRButton + debug HUD
// ✅ Keeps your safe World init/update
// ✅ Desktop/Android fallback move still available (but VR uses teleport)

(async function boot() {
  if (window.__SCARLETT_BOOTED__) throw new Error("Double boot prevented");
  window.__SCARLETT_BOOTED__ = true;

  const ui = {
    grid: document.getElementById("scarlettGrid"),
    logBox: document.getElementById("scarlettLog"),
    capXR: document.getElementById("capXR"),
    capImm: document.getElementById("capImm"),
    btnMenu: document.getElementById("btnMenu"),
    btnLobby: document.getElementById("btnRoomLobby"),
    btnStore: document.getElementById("btnRoomStore"),
    btnScorpion: document.getElementById("btnRoomScorpion"),
    btnSoftReboot: document.getElementById("btnSoftReboot"),
    btnCopy: document.getElementById("btnCopyLog"),
    btnClear: document.getElementById("btnClearLog"),
  };

  const LOG = {
    lines: [],
    max: 500,
    push(kind, msg) {
      const t = new Date().toLocaleTimeString();
      const line = `[${t}] ${kind.toUpperCase()}: ${msg}`;
      this.lines.push(line);
      if (this.lines.length > this.max) this.lines.splice(0, this.lines.length - this.max);
      if (ui.logBox) ui.logBox.textContent = this.lines.join("\n");
      (kind === "error" ? console.error : kind === "warn" ? console.warn : console.log)(msg);
    },
    clear() { this.lines = []; if (ui.logBox) ui.logBox.textContent = ""; },
    copy() { navigator.clipboard?.writeText?.(this.lines.join("\n")); this.push("log","Copied logs ✅"); }
  };
  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.LOG = LOG;

  addEventListener("error", (e) => LOG.push("error", `${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`));
  addEventListener("unhandledrejection", (e) => LOG.push("error", `UnhandledPromiseRejection: ${e.reason?.message || e.reason}`));

  function setMetrics(rows) {
    if (!ui.grid) return;
    ui.grid.innerHTML = "";
    for (const [k, v] of rows) {
      const row = document.createElement("div");
      row.className = "kv";
      const kk = document.createElement("div"); kk.className = "k"; kk.textContent = k;
      const vv = document.createElement("div"); vv.className = "v"; vv.textContent = v;
      row.appendChild(kk); row.appendChild(vv);
      ui.grid.appendChild(row);
    }
  }

  async function setCaps() {
    const xr = !!navigator.xr;
    if (ui.capXR) ui.capXR.textContent = xr ? "YES" : "NO";
    let immersive = false;
    try { immersive = xr ? await navigator.xr.isSessionSupported("immersive-vr") : false; } catch {}
    if (ui.capImm) ui.capImm.textContent = immersive ? "YES" : "NO";
    return { xr, immersive };
  }

  ui.btnClear?.addEventListener("click", () => LOG.clear());
  ui.btnCopy?.addEventListener("click", () => LOG.copy());
  ui.btnSoftReboot?.addEventListener("click", () => location.reload());

  // THREE
  const THREE = await (async () => {
    try { const m = await import("./three.js"); return m.default || m.THREE || m; }
    catch { return await import("three"); }
  })();

  async function safeImport(url, label=url) {
    try { const m = await import(url); LOG.push("log", `import ok: ${label}`); return m; }
    catch (e) { LOG.push("warn", `import fail: ${label} — ${e?.message || e}`); return null; }
  }

  // Scene / Rig / Camera
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.05, 800);

  const player = new THREE.Group();
  player.name = "PlayerRig";
  scene.add(player);

  camera.position.set(0, 1.65, 0); // camera local in rig
  player.add(camera);

  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  addEventListener("resize", () => {
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // VRButton
  async function attachVRButton() {
    const local = await safeImport("./VRButton.js", "./VRButton.js");
    if (local?.VRButton?.createButton) {
      const btn = local.VRButton.createButton(renderer);
      btn.id = "VRButton";
      document.body.appendChild(btn);
      LOG.push("log","VRButton ✅ via local VRButton.createButton()");
      return true;
    }
    const threeVR = await safeImport("three/addons/webxr/VRButton.js","three/addons/webxr/VRButton.js")
      || await safeImport("https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js","unpkg VRButton.js");
    if (threeVR?.VRButton?.createButton) {
      const btn = threeVR.VRButton.createButton(renderer, { optionalFeatures:["local-floor","bounded-floor","hand-tracking"] });
      btn.id = "VRButton";
      document.body.appendChild(btn);
      LOG.push("log","VRButton ✅ via three/addons");
      return true;
    }
    if (navigator.xr) {
      const btn = document.createElement("button");
      btn.id = "VRButton";
      btn.textContent = "ENTER VR (Fallback)";
      btn.style.cssText="position:fixed;right:14px;bottom:14px;z-index:999999;padding:12px 14px;border-radius:14px;font-weight:900;";
      btn.onclick = async () => {
        const session = await navigator.xr.requestSession("immersive-vr",{ optionalFeatures:["local-floor","bounded-floor","hand-tracking"] });
        await renderer.xr.setSession(session);
      };
      document.body.appendChild(btn);
      LOG.push("warn","Using fallback VR button.");
      return true;
    }
    LOG.push("error","No navigator.xr.");
    return false;
  }

  // Runtime ctx
  const ctx = {
    THREE, scene, camera, renderer, LOG,
    BUILD: Date.now(),
    systems: {},
    world: null,
    room: "lobby",
    mode: "lobby",

    player,
    rig: player,
    cameraRig: player,
    yawObject: player,
    pitchObject: camera,

    colliders: [],
    disableFallbackMove: false, // keep for Android/desktop
  };

  // Load world
  const worldMod = await safeImport("./world.js","./world.js");
  if (worldMod?.World?.init) {
    await worldMod.World.init(ctx);
    ctx.world = worldMod.World;
  } else {
    LOG.push("error","world.js missing World.init");
  }

  // Hands
  let leftHand=null, rightHand=null;
  try {
    leftHand = renderer.xr.getHand(0); leftHand.name="XRHandLeft";
    rightHand = renderer.xr.getHand(1); rightHand.name="XRHandRight";
    scene.add(leftHand, rightHand);
    ctx.hands = { left:leftHand, right:rightHand };
  } catch {}

  // Spawn + face center/table
  const tmpV = new THREE.Vector3();
  const tmpV2 = new THREE.Vector3();

  function applySpawnAndFacing() {
    const sp = scene.getObjectByName("SpawnPoint") || scene.getObjectByName("SpawnPad");
    const table = scene.getObjectByName("BossTable");

    if (sp) {
      sp.getWorldPosition(tmpV);
      player.position.set(tmpV.x, 0, tmpV.z);
      LOG.push("log", `Spawn ✅ x=${player.position.x.toFixed(2)} z=${player.position.z.toFixed(2)}`);
    }

    // Face table/center
    if (table) {
      table.getWorldPosition(tmpV);
      tmpV2.set(player.position.x, 0, player.position.z);
      const d = tmpV.sub(tmpV2);
      d.y = 0;
      if (d.lengthSq() > 1e-6) {
        const yaw = Math.atan2(d.x, d.z);
        player.rotation.set(0, yaw, 0);
        LOG.push("log","Facing table ✅");
      }
    }
  }

  applySpawnAndFacing();
  renderer.xr.addEventListener("sessionstart", () => setTimeout(applySpawnAndFacing, 200));

  // Rooms buttons
  function setRoom(room) {
    try { ctx.world?.setRoom?.(ctx, room); } catch {}
    ctx.room = room;
    ctx.mode = room;
    LOG.push("log", `Room => ${room}`);
  }
  ui.btnLobby?.addEventListener("click", () => setRoom("lobby"));
  ui.btnStore?.addEventListener("click", () => setRoom("store"));
  ui.btnScorpion?.addEventListener("click", () => setRoom("scorpion"));

  // ===============================
  // HANDS-ONLY PINCH TELEPORT SYSTEM (laser + ring)
  // ===============================
  const raycaster = new THREE.Raycaster();
  const laserGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0,0,-1)]);
  const laserMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
  const laser = new THREE.Line(laserGeom, laserMat);
  laser.name = "TeleportLaser";
  scene.add(laser);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.23, 0.34, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent:true, opacity:0.85, side:THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI/2;
  ring.visible = false;
  ring.name = "TeleportMarker";
  scene.add(ring);

  const floorPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0); // y=0

  // pinch detection
  const pinch = {
    active: false,
    lastActive: false,
    strength: 0
  };

  function getJointWorld(hand, jointName, out) {
    const j = hand?.joints?.[jointName];
    if (!j) return false;
    j.getWorldPosition(out);
    return true;
  }

  const jA = new THREE.Vector3();
  const jB = new THREE.Vector3();

  function updatePinch() {
    // Use RIGHT hand for teleport by default
    const h = rightHand;
    if (!h) { pinch.active = false; pinch.strength = 0; return; }

    const okA = getJointWorld(h, "index-finger-tip", jA);
    const okB = getJointWorld(h, "thumb-tip", jB);
    if (!okA || !okB) { pinch.active = false; pinch.strength = 0; return; }

    const dist = jA.distanceTo(jB);
    // threshold tuned for Quest hands
    pinch.active = dist < 0.028;
    pinch.strength = Math.max(0, Math.min(1, (0.05 - dist) / 0.05));
  }

  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const hit = new THREE.Vector3();

  function updateTeleportRay() {
    // If hand exists, ray from wrist forward-ish; otherwise from camera
    let useHand = false;

    if (rightHand) {
      const wrist = rightHand.joints?.wrist;
      if (wrist) {
        wrist.getWorldPosition(origin);
        // forward from wrist using its world quaternion
        const q = new THREE.Quaternion();
        wrist.getWorldQuaternion(q);
        dir.set(0, 0, -1).applyQuaternion(q).normalize();
        useHand = true;
      }
    }

    if (!useHand) {
      camera.getWorldPosition(origin);
      camera.getWorldDirection(dir);
      dir.normalize();
    }

    // Intersect with floor plane y=0
    const denom = floorPlane.normal.dot(dir);
    if (Math.abs(denom) < 1e-6) {
      ring.visible = false;
      return { ok:false };
    }

    const t = -(floorPlane.normal.dot(origin) + floorPlane.constant) / denom;
    if (t < 0.25 || t > 18) { // range clamp
      ring.visible = false;
      return { ok:false };
    }

    hit.copy(origin).addScaledVector(dir, t);

    // Show laser
    laser.geometry.setFromPoints([origin, hit]);

    // Show ring on floor
    ring.position.set(hit.x, 0.02, hit.z);
    ring.visible = true;

    return { ok:true, point: hit };
  }

  function teleportTo(point) {
    // Keep you on floor at y=0
    player.position.set(point.x, 0, point.z);
    LOG.push("log", `Teleport ✅ x=${point.x.toFixed(2)} z=${point.z.toFixed(2)}`);
  }

  // ===============================
  // Desktop/Android fallback movement still included
  // (VR players will use pinch teleport primarily)
  // ===============================
  const MoveFallback = (() => {
    const keys = {};
    let touchMove = { active:false, id:-1, startX:0, startY:0, dx:0, dy:0 };
    let touchLook = { active:false, id:-1, startX:0, startY:0, dx:0, dy:0 };

    addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
    addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

    addEventListener("touchstart", (e) => {
      for (const t of e.changedTouches) {
        const leftSide = t.clientX < innerWidth * 0.5;
        if (leftSide && !touchMove.active) touchMove = { active:true, id:t.identifier, startX:t.clientX, startY:t.clientY, dx:0, dy:0 };
        else if (!leftSide && !touchLook.active) touchLook = { active:true, id:t.identifier, startX:t.clientX, startY:t.clientY, dx:0, dy:0 };
      }
    }, { passive:true });

    addEventListener("touchmove", (e) => {
      for (const t of e.changedTouches) {
        if (touchMove.active && t.identifier === touchMove.id) { touchMove.dx = t.clientX - touchMove.startX; touchMove.dy = t.clientY - touchMove.startY; }
        if (touchLook.active && t.identifier === touchLook.id) { touchLook.dx = t.clientX - touchLook.startX; touchLook.dy = t.clientY - touchLook.startY; }
      }
    }, { passive:true });

    addEventListener("touchend", (e) => {
      for (const t of e.changedTouches) {
        if (touchMove.active && t.identifier === touchMove.id) touchMove.active = false;
        if (touchLook.active && t.identifier === touchLook.id) touchLook.active = false;
      }
    }, { passive:true });

    function collideSlide(nextPos, colliders) {
      if (!colliders?.length) return nextPos;
      const p = nextPos.clone();
      const box = new THREE.Box3();
      const radius = 0.35;
      for (const c of colliders) {
        if (!c) continue;
        c.updateMatrixWorld?.(true);
        box.setFromObject(c);
        if (box.containsPoint(p)) {
          const cx = (box.min.x + box.max.x) * 0.5;
          const cz = (box.min.z + box.max.z) * 0.5;
          const dx = p.x - cx;
          const dz = p.z - cz;
          if (Math.abs(dx) > Math.abs(dz)) p.x = dx > 0 ? box.max.x + radius : box.min.x - radius;
          else p.z = dz > 0 ? box.max.z + radius : box.min.z - radius;
        }
      }
      return p;
    }

    return {
      update(dt) {
        if (ctx.disableFallbackMove) return;
        // In VR, prefer teleport; still allow fallback move on Android/Desktop
        if (renderer.xr.isPresenting) return;

        const speed = 2.4;

        if (touchLook.active) {
          ctx.yawObject.rotation.y -= touchLook.dx * 0.0022;
          ctx.pitchObject.rotation.x -= touchLook.dy * 0.0018;
          ctx.pitchObject.rotation.x = Math.max(-1.2, Math.min(1.2, ctx.pitchObject.rotation.x));
          touchLook.dx *= 0.65; touchLook.dy *= 0.65;
        }

        let forward=0, strafe=0;
        if (keys["w"]||keys["arrowup"]) forward += 1;
        if (keys["s"]||keys["arrowdown"]) forward -= 1;
        if (keys["a"]||keys["arrowleft"]) strafe -= 1;
        if (keys["d"]||keys["arrowright"]) strafe += 1;

        if (touchMove.active) {
          forward += (-touchMove.dy / 120);
          strafe  += ( touchMove.dx / 120);
          forward = Math.max(-1, Math.min(1, forward));
          strafe  = Math.max(-1, Math.min(1, strafe));
        }

        if (!forward && !strafe) return;

        const yaw = ctx.yawObject.rotation.y;
        const sin = Math.sin(yaw), cos = Math.cos(yaw);
        const vx = (strafe*cos + forward*sin) * speed * dt;
        const vz = (forward*cos - strafe*sin) * speed * dt;

        const next = ctx.player.position.clone();
        next.x += vx; next.z += vz;
        ctx.player.position.copy(collideSlide(next, ctx.colliders));
      }
    };
  })();

  // Capabilities + VRButton
  await setCaps();
  await attachVRButton();

  renderer.xr.addEventListener("sessionstart", () => LOG.push("log", "XR sessionstart ✅"));
  renderer.xr.addEventListener("sessionend", () => LOG.push("warn", "XR sessionend"));

  // Main loop
  let last = performance.now();
  let fpsAcc=0, fpsCount=0, fps=0;

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now-last)/1000);
    last = now;

    fpsAcc += dt; fpsCount++;
    if (fpsAcc >= 0.5) { fps = Math.round(fpsCount / fpsAcc); fpsAcc=0; fpsCount=0; }

    // World systems
    try { ctx.world?.update?.(ctx, dt); } catch {}

    // Desktop/Android fallback move
    MoveFallback.update(dt);

    // Hands-only teleport in VR
    if (renderer.xr.isPresenting) {
      updatePinch();
      const ray = updateTeleportRay();

      // pinch rising edge teleports
      const rising = pinch.active && !pinch.lastActive;
      pinch.lastActive = pinch.active;

      if (rising && ray.ok && ring.visible) {
        teleportTo(ray.point);
      }
    } else {
      // non-VR: hide VR teleport ring if you want
      // ring.visible = false;
    }

    setMetrics([
      ["FPS", `${fps}`],
      ["XR Presenting", renderer.xr.isPresenting ? "YES" : "NO"],
      ["VRButton", document.getElementById("VRButton") ? "YES" : "NO"],
      ["Room", ctx.room],
      ["Systems", Object.keys(ctx.systems||{}).length.toString()],
      ["Colliders", `${ctx.colliders?.length||0}`],
      ["Pinch", renderer.xr.isPresenting ? (pinch.active ? "ON" : "off") : "n/a"],
      ["Rig XYZ", `${player.position.x.toFixed(1)},${player.position.y.toFixed(1)},${player.position.z.toFixed(1)}`],
    ]);

    renderer.render(scene, camera);
  });

  LOG.push("log","Hybrid 2.0 boot complete ✅ (hands teleport enabled)");
})();
