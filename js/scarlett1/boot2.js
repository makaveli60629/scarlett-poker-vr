// /js/scarlett1/boot2.js — Scarlett BOOT2 (NEW CLEAN SPINE) v3.1
// ✅ Always-on HUD logger (never blank)
// ✅ VRButton + Manual Enter VR
// ✅ Loads ./world.js (must export initWorld())
// ✅ XR controllers lasers + teleport + snap-turn
// ✅ Android sticks when NOT in XR
// ✅ No XRHandModelFactory import (it breaks due to "three" bare specifier)

const BUILD = "BOOT2_SCARLETT1_v3_1";

const nowTs = () => new Date().toLocaleTimeString();

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
    while (lines.length > 450) lines.shift();
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
    el: root,
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

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// -------------------------
// XR Controllers (built-in)
// -------------------------
function installXRControls({ THREE, renderer, scene, playerRig, world, hud }) {
  const state = {
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
    tmpPos: new THREE.Vector3()
  };

  const teleportSurfaces = [];
  const teleportPads = [];

  function refreshTargets() {
    teleportSurfaces.length = 0;
    teleportPads.length = 0;

    if (world?.teleportSurfaces?.length) teleportSurfaces.push(...world.teleportSurfaces);
    if (world?.pads?.length) teleportPads.push(...world.pads);

    if (teleportSurfaces.length === 0 && world?.group) {
      world.group.traverse((o) => {
        if (o?.isMesh && o.userData?.teleportSurface) teleportSurfaces.push(o);
      });
    }

    hud.log("[xr] targets surfaces=", String(teleportSurfaces.length), "pads=", String(teleportPads.length));
  }

  function makeLine() {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -state.maxRay)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x55aaff });
    const line = new THREE.Line(geo, mat);
    line.name = "XR_Laser";
    line.scale.z = 1;
    return line;
  }

  function getRay(controller) {
    state.tmpMat.identity().extractRotation(controller.matrixWorld);
    state.tmpDir.set(0, 0, -1).applyMatrix4(state.tmpMat).normalize();
    state.tmpPos.setFromMatrixPosition(controller.matrixWorld);
    return { origin: state.tmpPos, dir: state.tmpDir };
  }

  function intersect(i) {
    const c = state.controllers[i];
    const rc = state.raycasters[i];
    if (!c || !rc) return null;

    const { origin, dir } = getRay(c);
    rc.set(origin, dir);
    rc.far = state.maxRay;

    if (teleportPads.length) {
      const hits = rc.intersectObjects(teleportPads, true);
      if (hits?.length) return { type: "pad", hit: hits[0] };
    }
    if (teleportSurfaces.length) {
      const hits = rc.intersectObjects(teleportSurfaces, true);
      if (hits?.length) return { type: "floor", hit: hits[0] };
    }
    return null;
  }

  function setLine(i, res) {
    const line = state.lines[i];
    if (!line) return;
    line.visible = true;

    if (!res) {
      line.scale.z = 1;
      state.lastHit[i] = null;
      return;
    }
    const d = res.hit.distance || state.maxRay;
    line.scale.z = Math.max(0.05, d / state.maxRay);
    state.lastHit[i] = res;
  }

  function teleportTo(v3) {
    playerRig.position.set(v3.x, playerRig.position.y, v3.z);
  }

  function onSelect(i) {
    const res = state.lastHit[i];
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
      rc.far = state.maxRay;

      c.addEventListener("selectstart", () => onSelect(i));

      state.controllers[i] = c;
      state.lines[i] = line;
      state.raycasters[i] = rc;
    }
    hud.log("[xr] controllers installed ✅");
  }

  function teardownControllers() {
    for (let i = 0; i < 2; i++) {
      const c = state.controllers[i];
      if (c) scene.remove(c);
      state.controllers[i] = null;
      state.lines[i] = null;
      state.raycasters[i] = null;
      state.lastHit[i] = null;
    }
  }

  function applySnap(dt) {
    state.lastSnap += dt;
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
    if (state.lastSnap < state.snapCooldown) return;
    state.lastSnap = 0;

    const angle = THREE.MathUtils.degToRad(state.snapDeg);
    const dir = xAxis > 0 ? -1 : 1;
    playerRig.rotation.y += angle * dir;
  }

  renderer.xr.addEventListener("sessionstart", () => {
    state.inXR = true;
    refreshTargets();
    setupControllers();
    hud.log("[xr] sessionstart ✅");
  });

  renderer.xr.addEventListener("sessionend", () => {
    state.inXR = false;
    teardownControllers();
    hud.log("[xr] sessionend ✅");
  });

  function update(dt) {
    const session = renderer.xr.getSession?.() || null;
    const nowInXR = !!session;
    if (nowInXR !== state.inXR) {
      state.inXR = nowInXR;
      if (state.inXR) { refreshTargets(); setupControllers(); }
      else teardownControllers();
    }

    if (!state.inXR) return;

    for (let i = 0; i < 2; i++) {
      const c = state.controllers[i];
      const line = state.lines[i];
      if (!c || !line) continue;
      const res = intersect(i);
      setLine(i, res);
    }
    applySnap(dt);
  }

  refreshTargets();
  return { update, refreshTargets, state };
}

// -------------------------
// Android sticks (built-in)
// -------------------------
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

  function update(dt, inXR) {
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

  return { update };
}

// -------------------------
// MAIN
// -------------------------
(async function boot() {
  const hud = makeHUD();
  hud.log("diag start ✅");
  hud.log("build=", BUILD);
  hud.log("href=", location.href);
  hud.log("path=", location.pathname);
  hud.log("ua=", navigator.userAgent);
  hud.log("navigator.xr=", String(!!navigator.xr));

  // Mirror console into HUD
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...a) => { origLog(...a); try { hud.log(...a.map(String)); } catch {} };
  console.error = (...a) => { origErr(...a); try { hud.err(...a.map(String)); } catch {} };

  const host = ensureHost();

  // CDN imports
  const THREE = await safeImport(hud, `https://unpkg.com/three@0.158.0/build/three.module.js?v=${Date.now()}`, "three");
  const VRButtonMod = await safeImport(hud, `https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js?v=${Date.now()}`, "VRButton");
  const { VRButton } = VRButtonMod;

  // Renderer / scene / camera / rig
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

  // VRButton
  try {
    document.body.appendChild(VRButton.createButton(renderer));
    hud.log("VRButton appended ✅");
  } catch (e) {
    hud.err("VRButton append failed ❌", e?.message || e);
  }

  // Manual Enter VR
  hud.enterBtn.onclick = async () => {
    try {
      if (!navigator.xr) throw new Error("navigator.xr missing");
      const ok = await navigator.xr.isSessionSupported("immersive-vr");
      hud.log("XR immersive-vr supported=", String(ok));
      if (!ok) return;

      const sessionInit = {
        optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking", "layers"],
        requiredFeatures: []
      };

      hud.log("requestSession immersive-vr…");
      const session = await navigator.xr.requestSession("immersive-vr", sessionInit);
      hud.log("requestSession ✅");
      await renderer.xr.setSession(session);
      hud.log("renderer.xr.setSession ✅");
    } catch (e) {
      hud.err("Manual Enter VR failed ❌", e?.message || e);
    }
  };

  renderer.xr.addEventListener("sessionstart", () => hud.log("XR sessionstart ✅"));
  renderer.xr.addEventListener("sessionend", () => hud.log("XR sessionend ✅"));

  // Load world (local module)
  let world = null;
  {
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
    hud.log("initWorld() completed ✅");
    hud.log("pads=", String(world?.pads?.length || 0), "teleportSurfaces=", String(world?.teleportSurfaces?.length || 0));
  }

  // Install controls
  const xr = installXRControls({ THREE, renderer, scene, playerRig, world, hud });
  const android = installAndroidSticks({ playerRig, hud });

  // Loop
  hud.log("render loop start ✅");
  let lastT = performance.now();
  let debugAccum = 0;

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = clamp((now - lastT) / 1000, 0, 0.05);
    lastT = now;

    const session = renderer.xr.getSession?.() || null;
    const inXR = !!session;

    xr.update(dt);
    android.update(dt, inXR);

    if (world?.update) world.update(dt);
    renderer.render(scene, camera);

    debugAccum += dt;
    if (debugAccum >= 1.0) {
      debugAccum = 0;
      const sources = session?.inputSources?.length ?? 0;
      const ctrl0 = scene.getObjectByName("XR_Controller_0");
      hud.log("XR=", String(inXR), "inputSources=", String(sources), "ctrl0=", String(!!ctrl0));
    }
  });
})().catch((e) => {
  console.error("BOOT FATAL ❌", e?.message || e);
});
