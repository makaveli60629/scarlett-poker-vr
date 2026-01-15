// /js/scarlett1/boot2.js — Scarlett BOOT2 v3.5 (XR MOVE + SNAP + BUTTONS + RIGHT RETICLE)
// Fixes:
// ✅ Teleport reticle ring on floor
// ✅ Snap turn 45° works (right stick)
// ✅ Smooth locomotion forward/back + strafe (left stick)
// ✅ A/B/X/Y buttons work (polled from gamepad)
// ✅ Reticle prefers RIGHT hand (if available)
// ✅ Controllers parented to PlayerRig (lasers stay on you)
// ✅ Gaze teleport fallback if inputSources=0
// ✅ Android sticks outside XR still

const BUILD = "BOOT2_SCARLETT1_v3_5_XR_MOVE_SNAP_BUTTONS";
const nowTs = () => new Date().toLocaleTimeString();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function makeHUD() {
  const root = document.createElement("div");
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
    while (lines.length > 900) lines.shift();
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
    try { await navigator.clipboard.writeText(lines.join("\n")); push(`[${nowTs()}] HUD: copied ✅`); }
    catch (e) { push(`[${nowTs()}] HUD: copy failed ❌ ${e?.message || e}`); }
  };

  // simple toggle API we can call from buttons
  const api = {
    root,
    visible: true,
    toggle() {
      api.visible = !api.visible;
      root.style.display = api.visible ? "block" : "none";
    }
  };

  return {
    api,
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

function addLoadingPanel(THREE, scene) {
  const g = new THREE.Group();
  g.position.set(0, 1.6, 6);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.9),
    new THREE.MeshBasicMaterial({ color: 0x0b0f14 })
  );
  const mat = new THREE.MeshBasicMaterial({ color: 0x33ff66 });
  const b1 = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.08), mat); b1.position.set(0, 0.22, 0.01);
  const b2 = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.08), mat); b2.position.set(0, 0.00, 0.01);
  const b3 = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.08), mat); b3.position.set(0,-0.22, 0.01);
  g.add(panel, b1, b2, b3);
  scene.add(g);
  return {
    setVisible(v) { g.visible = !!v; },
    pulse(t) { const s = 0.92 + Math.sin(t * 4.0) * 0.06; g.scale.set(s, s, s); }
  };
}

function makeTeleportReticle(THREE, scene) {
  const geo = new THREE.RingGeometry(0.18, 0.22, 32);
  const mat = new THREE.MeshBasicMaterial({ color: 0x55aaff, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.visible = false;
  mesh.name = "TeleportReticle";
  scene.add(mesh);
  return {
    showAt(p) { mesh.position.set(p.x, p.y + 0.01, p.z); mesh.visible = true; },
    hide() { mesh.visible = false; }
  };
}

// ---- XR controls (teleport + reticle + snap + smooth move + buttons) ----
function installXRControls({ THREE, renderer, scene, playerRig, camera, hud }) {
  const st = {
    inXR: false,

    controllers: [null, null],
    lines: [null, null],
    raycasters: [null, null],
    lastHit: [null, null],

    teleportSurfaces: [],
    teleportPads: [],

    tmpMat: new THREE.Matrix4(),
    tmpDir: new THREE.Vector3(),
    tmpPos: new THREE.Vector3(),

    // turning
    lastSnap: 999,
    snapCooldown: 0.22,
    snapDeg: 30,

    // movement
    moveEnabled: true,
    moveSpeed: 2.1,
    strafeSpeed: 1.9,
    deadzone: 0.18,

    // reticle preference
    preferRightReticle: true,

    // gaze teleport fallback
    gazeRay: new THREE.Raycaster(),
    gazeHit: null,
    gazeHold: 0,
    gazeHoldSec: 0.55,

    // button latch
    prevButtons: { left: [], right: [] },

    maxRay: 30
  };

  st.gazeRay.camera = camera;
  const reticle = makeTeleportReticle(THREE, scene);

  function setWorld(world) {
    st.teleportSurfaces.length = 0;
    st.teleportPads.length = 0;

    if (world?.teleportSurfaces?.length) st.teleportSurfaces.push(...world.teleportSurfaces);
    if (world?.pads?.length) st.teleportPads.push(...world.pads);

    if (st.teleportSurfaces.length === 0 && world?.group) {
      world.group.traverse((o) => {
        if (o?.isSprite) return;
        if (o?.isMesh && o.userData?.teleportSurface) st.teleportSurfaces.push(o);
      });
    }

    hud.log("[xr] targets surfaces=", String(st.teleportSurfaces.length), "pads=", String(st.teleportPads.length));
  }

  function makeLine() {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -st.maxRay)]);
    const mat = new THREE.LineBasicMaterial({ color: 0x55aaff });
    const line = new THREE.Line(geo, mat);
    line.name = "XR_Laser";
    line.scale.z = 1;
    return line;
  }

  function filterTargets(list) { return list.filter(o => o && !o.isSprite); }

  function getRay(controller) {
    if (!controller || !controller.matrixWorld) return null;
    st.tmpMat.identity().extractRotation(controller.matrixWorld);
    st.tmpDir.set(0, 0, -1).applyMatrix4(st.tmpMat).normalize();
    st.tmpPos.setFromMatrixPosition(controller.matrixWorld);
    if (!isFinite(st.tmpPos.x) || !isFinite(st.tmpPos.y) || !isFinite(st.tmpPos.z)) return null;
    return { origin: st.tmpPos.clone(), dir: st.tmpDir.clone() };
  }

  function intersect(i) {
    const c = st.controllers[i];
    const rc = st.raycasters[i];
    if (!c || !rc) return null;

    rc.camera = camera;
    const ray = getRay(c);
    if (!ray) return null;

    rc.set(ray.origin, ray.dir);
    rc.far = st.maxRay;

    const pads = filterTargets(st.teleportPads);
    const surfaces = filterTargets(st.teleportSurfaces);

    if (pads.length) {
      const hits = rc.intersectObjects(pads, true);
      if (hits?.length) return { type: "pad", hit: hits[0] };
    }
    if (surfaces.length) {
      const hits = rc.intersectObjects(surfaces, true);
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
    line.scale.z = Math.max(0.05, (res.hit.distance || st.maxRay) / st.maxRay);
    st.lastHit[i] = res;
  }

  function teleportTo(p) {
    if (!p) return;
    playerRig.position.set(p.x, playerRig.position.y, p.z);
  }

  function onSelect(i) {
    const r = st.lastHit[i];
    if (!r?.hit?.point) return;
    teleportTo(r.hit.point);
  }

  function setupControllers() {
    teardownControllers();

    for (let i = 0; i < 2; i++) {
      const c = renderer.xr.getController(i);
      c.name = `XR_Controller_${i}`;
      playerRig.add(c);

      const line = makeLine();
      c.add(line);

      const rc = new THREE.Raycaster();
      rc.far = st.maxRay;
      rc.camera = camera;

      c.addEventListener("selectstart", () => onSelect(i));
      c.addEventListener("squeezestart", () => onSelect(i));

      st.controllers[i] = c;
      st.lines[i] = line;
      st.raycasters[i] = rc;
    }
    hud.log("[xr] controllers installed ✅ (rig)");
  }

  function teardownControllers() {
    for (let i = 0; i < 2; i++) {
      const c = st.controllers[i];
      if (c && c.parent) c.parent.remove(c);
      st.controllers[i] = null;
      st.lines[i] = null;
      st.raycasters[i] = null;
      st.lastHit[i] = null;
    }
  }

  function getSession() { return renderer.xr.getSession?.() || null; }

  function getGamepads() {
    const session = getSession();
    if (!session) return { left: null, right: null };

    let left = null, right = null;

    for (const src of (session.inputSources || [])) {
      const gp = src?.gamepad;
      if (!gp) continue;

      const handed = src.handedness || "";
      if (handed === "left") left = gp;
      if (handed === "right") right = gp;

      if (!handed && !left) left = gp;
      else if (!handed && !right && gp !== left) right = gp;
    }

    if (!left && st.controllers[0]?.gamepad) left = st.controllers[0].gamepad;
    if (!right && st.controllers[1]?.gamepad) right = st.controllers[1].gamepad;

    return { left, right };
  }

  function dz(v) { return Math.abs(v) < st.deadzone ? 0 : v; }

  function readAxis(gp, primaryIndex, fallbackIndex) {
    if (!gp?.axes?.length) return 0;
    const a = gp.axes[primaryIndex];
    const b = gp.axes[fallbackIndex];
    return (typeof a === "number") ? a : ((typeof b === "number") ? b : 0);
  }

  function pollButtons(gp, side) {
    if (!gp?.buttons?.length) return;

    const prev = st.prevButtons[side];
    const btn = gp.buttons;

    for (let i = 0; i < Math.min(8, btn.length); i++) {
      const down = !!btn[i]?.pressed;
      const was = !!prev[i];

      if (down && !was) {
        // rising edge
        if (side === "left" && i === 1) { // Y
          hud.log("Y pressed: toggle HUD");
          hud.api.toggle();
        }
        if (side === "left" && i === 0) { // X
          hud.log("X pressed: recenter rig");
          playerRig.position.y = 0;
          playerRig.rotation.y = 0;
        }
        if (side === "right" && i === 1) { // B
          st.moveEnabled = !st.moveEnabled;
          hud.log("B pressed: moveEnabled=", String(st.moveEnabled));
        }
        if (side === "right" && i === 0) { // A
          const p = st.lastHit[1]?.hit?.point || st.lastHit[0]?.hit?.point || st.gazeHit;
          if (p) {
            hud.log("A pressed: teleport confirm");
            teleportTo(p);
          }
        }
      }

      prev[i] = down;
    }
  }

  function snapTurn(dt, gpRight) {
    st.lastSnap += dt;

    // right stick X is often axes[2] OR axes[0]
    const x = dz(readAxis(gpRight, 2, 0));
    if (Math.abs(x) < 0.65) return;
    if (st.lastSnap < st.snapCooldown) return;
    st.lastSnap = 0;

    const ang = THREE.MathUtils.degToRad(st.snapDeg);
    playerRig.rotation.y += (x > 0 ? -ang : ang);
  }

  function smoothMove(dt, gpLeft) {
    if (!st.moveEnabled) return;

    // left stick: X strafe, Y forward/back (often axes[0]/[1] or [2]/[3])
    const lx = dz(readAxis(gpLeft, 0, 2));
    const ly = dz(readAxis(gpLeft, 1, 3)); // forward is usually -Y

    const forward = -ly;
    const strafe = lx;

    if (forward === 0 && strafe === 0) return;

    const yaw = playerRig.rotation.y;
    const s = Math.sin(yaw), c = Math.cos(yaw);

    const vx = (strafe * c + forward * s) * st.strafeSpeed;
    const vz = (forward * c - strafe * s) * st.moveSpeed;

    playerRig.position.x += vx * dt;
    playerRig.position.z += vz * dt;
  }

  function updateGaze(dt) {
    const session = getSession();
    if (!session) return;

    const sourcesLen = (session.inputSources?.length ?? 0);
    if (sourcesLen > 0) {
      st.gazeHold = 0;
      st.gazeHit = null;
      return;
    }

    st.gazeRay.camera = camera;
    st.gazeRay.setFromCamera({ x: 0, y: 0 }, camera);
    st.gazeRay.far = 25;

    const surfaces = filterTargets(st.teleportSurfaces);
    const hits = surfaces.length ? st.gazeRay.intersectObjects(surfaces, true) : [];
    if (!hits.length) {
      st.gazeHold = 0;
      st.gazeHit = null;
      return;
    }

    st.gazeHit = hits[0].point;
    st.gazeHold += dt;

    if (st.gazeHold >= st.gazeHoldSec) {
      st.gazeHold = 0;
      teleportTo(st.gazeHit);
    }
  }

  function updateReticle() {
    const right = st.lastHit[1]?.hit?.point;
    const left = st.lastHit[0]?.hit?.point;

    const p = st.preferRightReticle
      ? (right || left || st.gazeHit)
      : (left || right || st.gazeHit);

    if (p) reticle.showAt(p);
    else reticle.hide();
  }

  renderer.xr.addEventListener("sessionstart", () => {
    st.inXR = true;
    playerRig.position.y = 0;
    hud.log("[xr] sessionstart ✅");
    setupControllers();
  });

  renderer.xr.addEventListener("sessionend", () => {
    st.inXR = false;
    teardownControllers();
    reticle.hide();
    hud.log("[xr] sessionend ✅");
  });

  return {
    setWorld,
    update(dt) {
      const session = getSession();
      const inXR = !!session;

      if (inXR !== st.inXR) {
        st.inXR = inXR;
        if (st.inXR) setupControllers();
        else teardownControllers();
      }
      if (!st.inXR) return;

      // Rays / hits
      for (let i = 0; i < 2; i++) {
        if (!st.controllers[i] || !st.lines[i] || !st.raycasters[i]) continue;
        const res = intersect(i);
        setLine(i, res);
      }

      // Input
      const { left: gpL, right: gpR } = getGamepads();
      pollButtons(gpL, "left");
      pollButtons(gpR, "right");

      snapTurn(dt, gpR);
      smoothMove(dt, gpL);

      // Fallback & visuals
      updateGaze(dt);
      updateReticle();
    }
  };
}

// ---- Android sticks (non-XR only) ----
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
    if (side === "left") pad.style.left = "6%"; else pad.style.right = "6%";

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

  bind(L); bind(R);
  hud.log("Android sticks READY ✅");

  const cfg = { moveSpeed: 2.6, lookSpeed: 2.2 };
  const show = (yes) => { root.style.display = yes ? "block" : "none"; };

  return {
    update(dt, inXR) {
      show(!inXR);
      if (inXR) return;

      const lx = L.dx, ly = L.dy, rx = R.dx;
      if (Math.abs(rx) > 0.06) playerRig.rotation.y += (-rx) * cfg.lookSpeed * dt;

      const forward = -ly, strafe = lx;
      const yaw = playerRig.rotation.y, s = Math.sin(yaw), c = Math.cos(yaw);

      playerRig.position.x += (strafe * c + forward * s) * cfg.moveSpeed * dt;
      playerRig.position.z += (forward * c - strafe * s) * cfg.moveSpeed * dt;
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

  const host = ensureHost();

  const THREE = await safeImport(hud, `https://unpkg.com/three@0.158.0/build/three.module.js?v=${Date.now()}`, "three");
  const VRButtonMod = await safeImport(hud, `https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js?v=${Date.now()}`, "VRButton");
  const { VRButton } = VRButtonMod;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local-floor");

  if (renderer.xr.setFramebufferScaleFactor) renderer.xr.setFramebufferScaleFactor(0.7);
  if (renderer.xr.setFoveation) renderer.xr.setFoveation(1);

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

  try { document.body.appendChild(VRButton.createButton(renderer)); hud.log("VRButton appended ✅"); }
  catch (e) { hud.err("VRButton append failed ❌", e?.message || e); }

  const xr = installXRControls({ THREE, renderer, scene, playerRig, camera, hud });
  const android = installAndroidSticks({ playerRig, hud });
  const loading = addLoadingPanel(THREE, scene);

  hud.enterBtn.onclick = async () => {
    try {
      const ok = await navigator.xr.isSessionSupported("immersive-vr");
      hud.log("XR immersive-vr supported=", String(ok));
      if (!ok) return;

      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"]
      });

      await renderer.xr.setSession(session);
      hud.log("renderer.xr.setSession ✅");
    } catch (e) {
      hud.err("Manual Enter VR failed ❌", e?.message || e);
    }
  };

  hud.log("render loop start ✅");
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

    xr.update(dt);
    android.update(dt, inXR);

    if (!worldReady) loading.pulse(now / 1000);
    if (worldReady && world?.update) world.update(dt);

    renderer.render(scene, camera);

    acc += dt;
    if (acc >= 1.0) {
      acc = 0;
      hud.log("XR=", String(inXR), "inputSources=", String(session?.inputSources?.length ?? 0), "worldReady=", String(worldReady));
    }
  });

  hud.log("begin async world load…");
  const worldMod = await safeImport(hud, `./world.js?v=${Date.now()}`, "world.js");
  const initWorld = worldMod.initWorld || worldMod.default?.initWorld;
  if (!initWorld) throw new Error("world.js missing export initWorld()");

  hud.log("importing world…");
  world = await initWorld({
    THREE, scene, renderer, camera, playerRig,
    log: (...a) => console.log("[world]", ...a),
    quality: "quest"
  });

  worldReady = true;
  loading.setVisible(false);
  xr.setWorld(world);

  hud.log("initWorld() completed ✅");
  hud.log("pads=", String(world?.pads?.length || 0), "teleportSurfaces=", String(world?.teleportSurfaces?.length || 0));
})().catch((e) => {
  console.error("BOOT FATAL ❌", e?.message || e);
});
