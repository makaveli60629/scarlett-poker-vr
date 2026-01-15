// /js/scarlett1/boot2.js — Scarlett BOOT2 v3.2 (XR LOADING FIX)
// Fixes Quest “stuck in loading room” by:
// ✅ starting setAnimationLoop immediately (frames ASAP)
// ✅ loading world asynchronously after loop is running
// ✅ lightweight in-world loading panel
// ✅ XR watchdog (auto-end session if frames stall)

const BUILD = "BOOT2_SCARLETT1_v3_2_XR_LOADING_FIX";
const nowTs = () => new Date().toLocaleTimeString();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function makeHUD() {
  const root = document.createElement("div");
  root.id = "scarlett-hud";
  root.style.position = "fixed";
  root.style.left = "0";
  root.style.top = "0";
  root.style.width = "100%";
  root.style.maxHeight = "45%";
  root.style.overflow = "auto";
  root.style.background = "rgba(0,0,0,0.72)";
  root.style.color = "#8CFF8C";
  root.style.fontFamily = "monospace";
  root.style.fontSize = "12px";
  root.style.zIndex = "99999";
  root.style.pointerEvents = "auto";
  root.style.padding = "8px";
  root.style.boxSizing = "border-box";

  const bar = document.createElement("div");
  bar.style.display = "flex";
  bar.style.gap = "8px";
  bar.style.alignItems = "center";
  bar.style.flexWrap = "wrap";
  bar.style.marginBottom = "6px";

  const title = document.createElement("div");
  title.textContent = `Scarlett HUD • ${BUILD}`;
  title.style.fontWeight = "bold";
  title.style.marginRight = "8px";

  const mkBtn = (label) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.background = "rgba(255,255,255,0.12)";
    b.style.border = "1px solid rgba(255,255,255,0.25)";
    b.style.color = "#fff";
    b.style.borderRadius = "10px";
    b.style.padding = "6px 10px";
    b.style.cursor = "pointer";
    return b;
  };

  const hideBtn = mkBtn("Hide HUD");
  const showBtn = mkBtn("Show HUD");
  showBtn.style.display = "none";
  const copyBtn = mkBtn("Copy Logs");
  const clearBtn = mkBtn("Clear");
  const enterBtn = mkBtn("Enter VR (Manual)");

  bar.appendChild(title);
  bar.appendChild(hideBtn);
  bar.appendChild(showBtn);
  bar.appendChild(copyBtn);
  bar.appendChild(clearBtn);
  bar.appendChild(enterBtn);

  const pre = document.createElement("pre");
  pre.style.margin = "0";
  pre.style.whiteSpace = "pre-wrap";
  pre.style.wordBreak = "break-word";

  root.appendChild(bar);
  root.appendChild(pre);
  document.body.appendChild(root);

  const lines = [];
  const push = (s) => {
    lines.push(s);
    while (lines.length > 500) lines.shift();
    pre.textContent = lines.join("\n");
    root.scrollTop = root.scrollHeight;
  };

  hideBtn.onclick = () => {
    pre.style.display = "none";
    copyBtn.style.display = "none";
    clearBtn.style.display = "none";
    hideBtn.style.display = "none";
    showBtn.style.display = "inline-block";
    root.style.maxHeight = "unset";
    root.style.height = "auto";
  };

  showBtn.onclick = () => {
    pre.style.display = "block";
    copyBtn.style.display = "inline-block";
    clearBtn.style.display = "inline-block";
    hideBtn.style.display = "inline-block";
    showBtn.style.display = "none";
    root.style.maxHeight = "45%";
  };

  clearBtn.onclick = () => { lines.length = 0; pre.textContent = ""; };

  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      push(`[${nowTs()}] HUD: copied ✅`);
    } catch (e) {
      push(`[${nowTs()}] HUD: copy failed ❌ ${e?.message || e}`);
    }
  };

  return {
    enterBtn,
    log: (...a) => push(`[${nowTs()}] ${a.join(" ")}`),
    err: (...a) => push(`[${nowTs()}] ERROR: ${a.join(" ")}`)
  };
}

function ensureHost() {
  let host = document.getElementById("app");
  if (!host) {
    host = document.createElement("div");
    host.id = "app";
    host.style.position = "fixed";
    host.style.inset = "0";
    host.style.width = "100%";
    host.style.height = "100%";
    host.style.overflow = "hidden";
    document.body.appendChild(host);
  }
  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.style.overflow = "hidden";
  return host;
}

async function safeImport(hud, url, label) {
  hud.log("[boot2] import", url);
  try {
    const mod = await import(url);
    hud.log("[boot2] ok ✅", label || url);
    return mod;
  } catch (e) {
    hud.err("[boot2] import FAILED ❌", label || url, e?.message || e);
    throw e;
  }
}

// ---------- Simple in-world loading panel (so XR has something to show) ----------
function addLoadingPanel(THREE, scene) {
  const group = new THREE.Group();
  group.name = "LOADING_PANEL";
  group.position.set(0, 1.6, 6);

  const geo = new THREE.PlaneGeometry(2.2, 0.8);
  const mat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const panel = new THREE.Mesh(geo, mat);
  panel.renderOrder = 9999;

  // “text” using simple bars (no font loader)
  const barGeo = new THREE.PlaneGeometry(1.6, 0.08);
  const barMat = new THREE.MeshBasicMaterial({ color: 0x33ff66 });
  const bar1 = new THREE.Mesh(barGeo, barMat); bar1.position.set(0, 0.18, 0.01);
  const bar2 = new THREE.Mesh(barGeo, barMat); bar2.position.set(0, 0.00, 0.01);
  const bar3 = new THREE.Mesh(barGeo, barMat); bar3.position.set(0, -0.18, 0.01);

  group.add(panel, bar1, bar2, bar3);
  scene.add(group);

  return {
    setVisible(v) { group.visible = !!v; },
    setPulse(t) {
      const s = 0.9 + Math.sin(t * 4.0) * 0.08;
      group.scale.set(s, s, s);
    },
    dispose() { scene.remove(group); }
  };
}

// ---------- XR controllers + teleport + snap turn ----------
function installXRControls({ THREE, renderer, scene, playerRig, hud }) {
  const st = {
    inXR: false,
    controllers: [null, null],
    lines: [null, null],
    raycasters: [null, null],
    lastHit: [null, null],
    lastSnap: 999,
    snapCooldown: 0.25,
    snapDeg: 30,
    maxRay: 30,
    tmpMat: new THREE.Matrix4(),
    tmpDir: new THREE.Vector3(),
    tmpPos: new THREE.Vector3(),
    teleportSurfaces: [],
    teleportPads: []
  };

  function refreshTargets(world) {
    st.teleportSurfaces.length = 0;
    st.teleportPads.length = 0;

    if (world?.teleportSurfaces?.length) st.teleportSurfaces.push(...world.teleportSurfaces);
    if (world?.pads?.length) st.teleportPads.push(...world.pads);

    if (st.teleportSurfaces.length === 0 && world?.group) {
      world.group.traverse((o) => {
        if (o?.isMesh && o.userData?.teleportSurface) st.teleportSurfaces.push(o);
      });
    }

    hud.log("[xr] targets surfaces=", String(st.teleportSurfaces.length), "pads=", String(st.teleportPads.length));
  }

  function makeLine() {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -st.maxRay)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x55aaff });
    const line = new THREE.Line(geo, mat);
    line.name = "XR_Laser";
    line.scale.z = 1;
    return line;
  }

  function getRay(c) {
    st.tmpMat.identity().extractRotation(c.matrixWorld);
    st.tmpDir.set(0, 0, -1).applyMatrix4(st.tmpMat).normalize();
    st.tmpPos.setFromMatrixPosition(c.matrixWorld);
    return { origin: st.tmpPos, dir: st.tmpDir };
  }

  function intersect(i) {
    const c = st.controllers[i];
    const rc = st.raycasters[i];
    if (!c || !rc) return null;

    const { origin, dir } = getRay(c);
    rc.set(origin, dir);
    rc.far = st.maxRay;

    if (st.teleportPads.length) {
      const hits = rc.intersectObjects(st.teleportPads, true);
      if (hits?.length) return { type: "pad", hit: hits[0] };
    }
    if (st.teleportSurfaces.length) {
      const hits = rc.intersectObjects(st.teleportSurfaces, true);
      if (hits?.length) return { type: "floor", hit: hits[0] };
    }
    return null;
  }

  function setLine(i, res) {
    const line = st.lines[i];
    if (!line) return;
    line.visible = true;

    if (!res) {
      line.scale.z = 1;
      st.lastHit[i] = null;
      return;
    }
    const d = res.hit.distance || st.maxRay;
    line.scale.z = Math.max(0.05, d / st.maxRay);
    st.lastHit[i] = res;
  }

  function teleportTo(v3) {
    playerRig.position.set(v3.x, playerRig.position.y, v3.z);
  }

  function onSelect(i) {
    const res = st.lastHit[i];
    if (!res) return;

    if (res.type === "pad") {
      let n = res.hit.object;
      while (n && !n.userData?.teleport) n = n.parent;
      if (n?.userData?.target) return teleportTo(n.userData.target);
    }
    teleportTo(res.hit.point);
  }

  function setupControllers() {
    teardownControllers();
    for (let i = 0; i < 2; i++) {
      const c = renderer.xr.getController(i);
      c.name = `XR_Controller_${i}`;
      scene.add(c);

      const line = makeLine();
      c.add(line);

      const rc = new THREE.Raycaster();
      rc.far = st.maxRay;

      c.addEventListener("selectstart", () => onSelect(i));

      st.controllers[i] = c;
      st.lines[i] = line;
      st.raycasters[i] = rc;
    }
    hud.log("[xr] controllers installed ✅");
  }

  function teardownControllers() {
    for (let i = 0; i < 2; i++) {
      const c = st.controllers[i];
      if (c) scene.remove(c);
      st.controllers[i] = null;
      st.lines[i] = null;
      st.raycasters[i] = null;
      st.lastHit[i] = null;
    }
  }

  function applySnap(dt) {
    st.lastSnap += dt;
    const session = renderer.xr.getSession?.() || null;
    if (!session) return;

    const sources = session.inputSources || [];
    let xAxis = 0;

    for (const src of sources) {
      const gp = src?.gamepad;
      if (!gp?.axes?.length) continue;
      xAxis = gp.axes[0] ?? 0;
      if (Math.abs(xAxis) > 0.65) break;
    }

    if (Math.abs(xAxis) < 0.65) return;
    if (st.lastSnap < st.snapCooldown) return;
    st.lastSnap = 0;

    const angle = THREE.MathUtils.degToRad(st.snapDeg);
    const dir = xAxis > 0 ? -1 : 1;
    playerRig.rotation.y += angle * dir;
  }

  renderer.xr.addEventListener("sessionstart", () => {
    st.inXR = true;
    setupControllers();
    hud.log("[xr] sessionstart ✅");
  });

  renderer.xr.addEventListener("sessionend", () => {
    st.inXR = false;
    teardownControllers();
    hud.log("[xr] sessionend ✅");
  });

  return {
    setWorld(world) { refreshTargets(world); },
    update(dt) {
      const session = renderer.xr.getSession?.() || null;
      const nowInXR = !!session;

      if (nowInXR !== st.inXR) {
        st.inXR = nowInXR;
        if (st.inXR) setupControllers();
        else teardownControllers();
      }

      if (!st.inXR) return;

      for (let i = 0; i < 2; i++) {
        if (!st.controllers[i] || !st.lines[i]) continue;
        setLine(i, intersect(i));
      }
      applySnap(dt);
    }
  };
}

// ---------- Android sticks (2D / not in XR) ----------
function installAndroidSticks({ playerRig, hud }) {
  const root = document.createElement("div");
  root.id = "scarlett-sticks";
  root.style.position = "fixed";
  root.style.left = "0";
  root.style.top = "0";
  root.style.width = "100%";
  root.style.height = "100%";
  root.style.pointerEvents = "none";
  root.style.zIndex = "99998";
  document.body.appendChild(root);

  function makeStick(side) {
    const pad = document.createElement("div");
    pad.style.position = "absolute";
    pad.style.bottom = "8%";
    pad.style.width = "170px";
    pad.style.height = "170px";
    pad.style.borderRadius = "999px";
    pad.style.background = "rgba(0,0,0,0.25)";
    pad.style.border = "2px solid rgba(255,255,255,0.18)";
    pad.style.pointerEvents = "auto";
    pad.style.touchAction = "none";
    if (side === "left") pad.style.left = "6%";
    else pad.style.right = "6%";

    const knob = document.createElement("div");
    knob.style.position = "absolute";
    knob.style.left = "50%";
    knob.style.top = "50%";
    knob.style.width = "70px";
    knob.style.height = "70px";
    knob.style.transform = "translate(-50%,-50%)";
    knob.style.borderRadius = "999px";
    knob.style.background = "rgba(85,170,255,0.25)";
    knob.style.border = "2px solid rgba(85,170,255,0.45)";
    pad.appendChild(knob);

    root.appendChild(pad);

    return { pad, knob, id: null, x: 0, y: 0, dx: 0, dy: 0 };
  }

  const L = makeStick("left");
  const R = makeStick("right");

  function bind(stick) {
    const el = stick.pad;
    const knob = stick.knob;

    const setKnob = (dx, dy) => {
      const r = 55;
      const len = Math.hypot(dx, dy);
      if (len > r) { dx = (dx / len) * r; dy = (dy / len) * r; }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      stick.dx = dx / r;
      stick.dy = dy / r;
    };

    el.addEventListener("pointerdown", (e) => {
      stick.id = e.pointerId;
      el.setPointerCapture(e.pointerId);
      const rect = el.getBoundingClientRect();
      stick.x = rect.left + rect.width / 2;
      stick.y = rect.top + rect.height / 2;
      setKnob(e.clientX - stick.x, e.clientY - stick.y);
    });

    el.addEventListener("pointermove", (e) => {
      if (stick.id !== e.pointerId) return;
      setKnob(e.clientX - stick.x, e.clientY - stick.y);
    });

    const end = (e) => {
      if (stick.id !== e.pointerId) return;
      stick.id = null;
      setKnob(0, 0);
    };

    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("lostpointercapture", () => { stick.id = null; setKnob(0, 0); });
  }

  bind(L);
  bind(R);
  hud.log("Android sticks READY ✅");

  const cfg = { moveSpeed: 2.6, lookSpeed: 2.2 };
  const show = (yes) => { root.style.display = yes ? "block" : "none"; };

  return {
    update(dt, inXR) {
      show(!inXR);
      if (inXR) return;

      const lx = L.dx;
      const ly = L.dy;
      const rx = R.dx;

      if (Math.abs(rx) > 0.06) playerRig.rotation.y += (-rx) * cfg.lookSpeed * dt;

      const forward = -ly;
      const strafe = lx;

      const yaw = playerRig.rotation.y;
      const s = Math.sin(yaw);
      const c = Math.cos(yaw);

      const vx = (strafe * c + forward * s) * cfg.moveSpeed;
      const vz = (forward * c - strafe * s) * cfg.moveSpeed;

      playerRig.position.x += vx * dt;
      playerRig.position.z += vz * dt;
    }
  };
}

// ---------------- MAIN ----------------
(async function boot() {
  const hud = makeHUD();
  hud.log("diag start ✅");
  hud.log("build=", BUILD);
  hud.log("href=", location.href);
  hud.log("path=", location.pathname);
  hud.log("ua=", navigator.userAgent);
  hud.log("navigator.xr=", String(!!navigator.xr));

  const origLog = console.log, origErr = console.error;
  console.log = (...a) => { origLog(...a); try { hud.log(...a.map(String)); } catch {} };
  console.error = (...a) => { origErr(...a); try { hud.err(...a.map(String)); } catch {} };

  const host = ensureHost();

  // Imports
  const THREE = await safeImport(hud, `https://unpkg.com/three@0.158.0/build/three.module.js?v=${Date.now()}`, "three");
  const VRButtonMod = await safeImport(hud, `https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js?v=${Date.now()}`, "VRButton");
  const { VRButton } = VRButtonMod;

  // Renderer + scene
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local-floor");
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070a);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
  camera.position.set(0, 1.6, 10);

  const playerRig = new THREE.Group();
  playerRig.name = "PlayerRig";
  playerRig.position.set(0, 0, 10);
  playerRig.add(camera);
  scene.add(playerRig);

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  // Add VRButton
  try { document.body.appendChild(VRButton.createButton(renderer)); hud.log("VRButton appended ✅"); }
  catch (e) { hud.err("VRButton append failed ❌", e?.message || e); }

  // Manual Enter VR
  hud.enterBtn.onclick = async () => {
    try {
      if (!navigator.xr) throw new Error("navigator.xr missing");
      const ok = await navigator.xr.isSessionSupported("immersive-vr");
      hud.log("XR immersive-vr supported=", String(ok));
      if (!ok) return;

      hud.log("requestSession immersive-vr…");
      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
        requiredFeatures: []
      });

      hud.log("requestSession ✅");
      await renderer.xr.setSession(session);
      hud.log("renderer.xr.setSession ✅");
    } catch (e) {
      hud.err("Manual Enter VR failed ❌", e?.message || e);
    }
  };

  // Controls (installed immediately)
  const xr = installXRControls({ THREE, renderer, scene, playerRig, hud });
  const android = installAndroidSticks({ playerRig, hud });

  // Loading panel (VR needs frames + visible content)
  const loadingPanel = addLoadingPanel(THREE, scene);

  // XR watchdog: if we enter XR and frames “stall”, auto-end session
  let lastXRFrame = performance.now();
  renderer.xr.addEventListener("sessionstart", () => {
    hud.log("XR sessionstart ✅");
    lastXRFrame = performance.now();
  });
  renderer.xr.addEventListener("sessionend", () => hud.log("XR sessionend ✅"));

  // Start loop IMMEDIATELY (this is the key fix)
  hud.log("render loop start ✅ (immediate)");

  let world = null;
  let worldReady = false;
  let lastT = performance.now();
  let acc = 0;

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = clamp((now - lastT) / 1000, 0, 0.05);
    lastT = now;

    const session = renderer.xr.getSession?.() || null;
    const inXR = !!session;

    if (inXR) lastXRFrame = now;

    // Watchdog: if XR active but we somehow stop delivering frames, end it
    if (inXR && (now - lastXRFrame) > 4000) {
      try { hud.err("XR watchdog: frame stall → ending session"); session.end(); } catch {}
    }

    xr.update(dt);
    android.update(dt, inXR);

    if (!worldReady) loadingPanel.setPulse(now / 1000);
    if (worldReady && world?.update) world.update(dt);

    renderer.render(scene, camera);

    acc += dt;
    if (acc >= 1.0) {
      acc = 0;
      hud.log("XR=", String(inXR), "inputSources=", String(session?.inputSources?.length ?? 0), "worldReady=", String(worldReady));
    }
  });

  // Now load world AFTER loop has started (so XR never hangs)
  hud.log("begin async world load…");
  const worldMod = await safeImport(hud, `./world.js?v=${Date.now()}`, "world.js");
  const initWorld = worldMod.initWorld || worldMod.default?.initWorld;
  if (!initWorld) throw new Error("world.js missing export initWorld()");

  hud.log("importing world…");
  world = await initWorld({
    THREE,
    scene,
    renderer,
    camera,
    playerRig,
    log: (...a) => console.log("[world]", ...a),
    quality: "quest"
  });

  worldReady = true;
  loadingPanel.setVisible(false);
  xr.setWorld(world);

  hud.log("initWorld() completed ✅");
  hud.log("pads=", String(world?.pads?.length || 0), "teleportSurfaces=", String(world?.teleportSurfaces?.length || 0));
})().catch((e) => {
  console.error("BOOT FATAL ❌", e?.message || e);
});
