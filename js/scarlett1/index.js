// /js/scarlett1/index.js
// SCARLETT1 v17 — Global THREE (CDN chain) + Custom Enter VR + Controllers/Lasers + Right-stick Locomotion
// + LEFT Y BUTTON (menu toggle) + Minimal VR Menu (music/radio placeholder)
const BUILD = "SCARLETT1_INDEX_FULL_v17_LEFT_Y_MENU_TOGGLE";

const err = (...a) => console.error("[scarlett1]", ...a);
const proof = (s) => console.log("[router_proof]", s);

function ensureRoot() {
  let root = document.getElementById("app");
  if (!root) {
    root = document.createElement("div");
    root.id = "app";
    root.style.position = "fixed";
    root.style.inset = "0";
    root.style.overflow = "hidden";
    document.body.style.margin = "0";
    document.body.appendChild(root);
  }
  return root;
}

function setBanner(text) {
  proof(text.replace(/\n/g, " | "));
  let b = document.getElementById("scarlettBanner");
  if (!b) {
    b = document.createElement("div");
    b.id = "scarlettBanner";
    b.style.position = "fixed";
    b.style.left = "10px";
    b.style.bottom = "10px";
    b.style.zIndex = "999999";
    b.style.padding = "10px 12px";
    b.style.borderRadius = "12px";
    b.style.background = "rgba(0,0,0,0.82)";
    b.style.color = "#fff";
    b.style.font = "12px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial";
    b.style.whiteSpace = "pre-wrap";
    b.style.maxWidth = "92vw";
    b.style.pointerEvents = "none";
    document.body.appendChild(b);
  }
  b.textContent = text;
}

function setRed(text) {
  proof(("RED: " + text).replace(/\n/g, " | "));
  let p = document.getElementById("scarlettPanic");
  if (!p) {
    p = document.createElement("div");
    p.id = "scarlettPanic";
    p.style.position = "fixed";
    p.style.right = "10px";
    p.style.top = "10px";
    p.style.zIndex = "1000000";
    p.style.padding = "10px 12px";
    p.style.borderRadius = "12px";
    p.style.background = "rgba(160,0,0,0.88)";
    p.style.color = "#fff";
    p.style.font = "12px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial";
    p.style.whiteSpace = "pre-wrap";
    p.style.maxWidth = "72vw";
    p.style.pointerEvents = "none";
    document.body.appendChild(p);
  }
  p.textContent = text;
}

function installGuards() {
  if (window.__scarlettGuardsInstalled) return;
  window.__scarlettGuardsInstalled = true;

  window.addEventListener("error", (e) => {
    const msg = String(e?.message || e);
    err("window.error:", msg);
    setRed("❌ ERROR\n" + msg);
    setBanner("❌ ERROR\n" + msg);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const msg = String(e?.reason || e);
    err("unhandledrejection:", msg);
    setRed("❌ REJECTION\n" + msg);
    setBanner("❌ REJECTION\n" + msg);
  });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve(src);
    s.onerror = () => reject(new Error("Failed to load: " + src));
    document.head.appendChild(s);
  });
}

async function ensureThreeGlobal() {
  if (window.THREE) return "already";

  const chain = [
    "https://unpkg.com/three@0.158.0/build/three.min.js",
    "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/three.js/r158/three.min.js",
  ];

  let lastErr = null;
  for (const src of chain) {
    try {
      setBanner(`✅ Scarlett\n${BUILD}\nloading THREE...\n${src}`);
      const ok = await loadScript(src);
      if (window.THREE) return ok;
      lastErr = new Error("Loaded but window.THREE missing: " + src);
    } catch (e) {
      lastErr = e;
      setBanner(`⚠️ load failed\n${src}\n${String(e.message || e)}`);
    }
  }
  throw lastErr || new Error("THREE failed to load");
}

function makeEnterVrButton(onClick) {
  let btn = document.getElementById("scarlettEnterVR");
  if (btn) return btn;

  btn = document.createElement("button");
  btn.id = "scarlettEnterVR";
  btn.textContent = "ENTER VR";
  btn.style.position = "fixed";
  btn.style.right = "12px";
  btn.style.bottom = "12px";
  btn.style.zIndex = "999998";
  btn.style.padding = "14px 16px";
  btn.style.borderRadius = "14px";
  btn.style.border = "0";
  btn.style.cursor = "pointer";
  btn.style.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  btn.style.background = "rgba(255,255,255,0.92)";
  btn.style.color = "#111";
  btn.onclick = onClick;

  document.body.appendChild(btn);
  return btn;
}

async function bootWorld2DAndXR() {
  const threeSrc = await ensureThreeGlobal();
  if (!window.THREE) throw new Error("window.THREE missing after load");

  setBanner(`✅ Scarlett\n${BUILD}\nTHREE OK from:\n${threeSrc}`);

  const THREE = window.THREE;
  const app = document.getElementById("app") || document.body;

  // --- Scene / Camera / Renderer ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0f12);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);
  camera.position.set(0, 1.6, 3);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.xr.enabled = true;

  // replace old canvas
  const old = document.getElementById("scarlettCanvas");
  if (old && old.parentNode) old.parentNode.removeChild(old);
  renderer.domElement.id = "scarlettCanvas";
  app.appendChild(renderer.domElement);

  // --- Lights + basic world ---
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222244, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(6, 10, 3);
  scene.add(sun);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x1c2126, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.95, 0.14, 48),
    new THREE.MeshStandardMaterial({ color: 0x2a7a5e, roughness: 0.95 })
  );
  table.position.set(0, 0.85, 0);
  scene.add(table);

  // --- Rig (move this for locomotion) ---
  const rig = new THREE.Group();
  rig.position.set(0, 0, 3.2);
  rig.add(camera);
  scene.add(rig);

  camera.lookAt(0, 1.0, 0);

  // --- Controllers + lasers ---
  const controller0 = renderer.xr.getController(0);
  const controller1 = renderer.xr.getController(1);
  rig.add(controller0);
  rig.add(controller1);

  function makeLaser(color) {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const mat = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geom, mat);
    line.name = "laser";
    line.scale.z = 5;
    return line;
  }
  controller0.add(makeLaser(0xff3bd1));
  controller1.add(makeLaser(0x39b6ff));

  const ray = new THREE.Raycaster();
  const tmpMat = new THREE.Matrix4();

  // --- Minimal VR Menu (3D panel) ---
  // Left Y toggles show/hide. Menu stays in front of camera and faces you.
  const menu = new THREE.Group();
  menu.visible = false;
  menu.name = "scarlettMenu";
  scene.add(menu);

  // Panel
  const panelW = 0.55;
  const panelH = 0.32;
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(panelW, panelH),
    new THREE.MeshStandardMaterial({ color: 0x101418, roughness: 0.9, metalness: 0.05 })
  );
  panel.position.set(0, 0, -1); // relative to menu group
  menu.add(panel);

  // Border frame
  const frame = new THREE.Mesh(
    new THREE.PlaneGeometry(panelW + 0.01, panelH + 0.01),
    new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 1 })
  );
  frame.position.set(0, 0, -1.001);
  menu.add(frame);

  // Buttons (simple boxes) — “Music/Radio” + “Close”
  function makeButton(label, y) {
    const btn = new THREE.Mesh(
      new THREE.BoxGeometry(panelW * 0.85, 0.07, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x1f2a33, roughness: 0.9 })
    );
    btn.position.set(0, y, -0.98);
    btn.userData.label = label;
    btn.userData.isButton = true;
    btn.userData.cooldown = 0;
    return btn;
  }

  const btnMusic = makeButton("MUSIC", 0.05);
  const btnClose = makeButton("CLOSE", -0.06);
  menu.add(btnMusic);
  menu.add(btnClose);

  // Small “status light” for music
  const musicDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x5bff7a, roughness: 0.4 })
  );
  musicDot.position.set(panelW * 0.35, 0.05, -0.965);
  menu.add(musicDot);

  let musicOn = true;
  function updateMusicDot() {
    musicDot.material.color.set(musicOn ? 0x5bff7a : 0xff5b5b);
  }
  updateMusicDot();

  function toggleMenu(force) {
    menu.visible = typeof force === "boolean" ? force : !menu.visible;
    setBanner(`✅ Scarlett\n${BUILD}\nmenu: ${menu.visible ? "ON" : "OFF"} (Left Y)`);
  }

  // --- Input: Left Y to toggle menu ---
  let yWasPressed = false;

  // --- Simple UI click with lasers (trigger) ---
  // Right trigger clicks buttons (keeps left as "menu hand").
  // If you want left trigger too later, we can add it.
  let rightTriggerWasPressed = false;

  function intersectButtons(controller) {
    // Raycast from controller forward
    tmpMat.identity().extractRotation(controller.matrixWorld);
    ray.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    ray.ray.direction.set(0, 0, -1).applyMatrix4(tmpMat);

    const objs = [btnMusic, btnClose];
    const hits = ray.intersectObjects(objs, false);
    return hits.length ? hits[0] : null;
  }

  function clickButton(obj) {
    if (!obj || !obj.userData || !obj.userData.isButton) return;

    const label = obj.userData.label;
    if (label === "MUSIC") {
      musicOn = !musicOn;
      updateMusicDot();
      setBanner(`✅ Scarlett\n${BUILD}\nMusic: ${musicOn ? "ON" : "OFF"} (placeholder)`);
    } else if (label === "CLOSE") {
      toggleMenu(false);
    }
  }

  // --- Locomotion (RIGHT HAND ONLY) ---
  const moveState = { speed: 1.8, snap: Math.PI / 6, snapCooldown: 0 };

  function getStickPair(gp) {
    if (!gp || !gp.axes || gp.axes.length < 2) return { x: 0, y: 0 };
    const a = gp.axes;
    // Choose best pair by magnitude
    let best = [0, 1];
    let bestMag = Math.abs(a[0]) + Math.abs(a[1]);
    for (let i = 0; i + 1 < a.length; i += 2) {
      const mag = Math.abs(a[i]) + Math.abs(a[i + 1]);
      if (mag > bestMag) {
        best = [i, i + 1];
        bestMag = mag;
      }
    }
    return { x: a[best[0]] || 0, y: a[best[1]] || 0 };
  }

  function getSnapAxis(gp) {
    if (!gp || !gp.axes) return 0;
    // Prefer axis 2 if present
    return gp.axes.length >= 3 ? (gp.axes[2] || 0) : (gp.axes[0] || 0);
  }

  // --- XR session wiring (custom Enter VR) ---
  async function enterVR() {
    if (!navigator.xr) {
      setBanner(`❌ navigator.xr missing`);
      return;
    }
    try {
      setBanner(`✅ Scarlett\n${BUILD}\nrequesting XR session...`);
      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking", "layers"],
      });

      renderer.xr.setReferenceSpaceType("local-floor");
      await renderer.xr.setSession(session);

      setBanner(`✅ Scarlett\n${BUILD}\nXR sessionstart ✅`);

      session.addEventListener("end", () => {
        setBanner(`✅ Scarlett\n${BUILD}\nXR sessionend ✅`);
      });
    } catch (e) {
      setBanner(`❌ XR failed\n${String(e?.message || e)}`);
    }
  }

  // show button only if XR is available
  if (navigator.xr) makeEnterVrButton(enterVR);

  // --- Render loop (2D + XR) ---
  let last = performance.now();

  renderer.setAnimationLoop((t) => {
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;

    const session = renderer.xr.getSession && renderer.xr.getSession();

    // Keep menu positioned 1m in front of camera when visible
    if (menu.visible) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const pos = new THREE.Vector3().copy(camera.position).add(forward.multiplyScalar(1.0));
      menu.position.set(pos.x, pos.y, pos.z);
      menu.quaternion.copy(camera.quaternion);
    }

    if (session) {
      // Find left & right inputSources
      let left = null;
      let right = null;
      for (const s of session.inputSources || []) {
        if (!s || !s.gamepad) continue;
        if (s.handedness === "left") left = s;
        if (s.handedness === "right") right = s;
      }

      // LEFT Y (buttons[3]) toggles menu
      if (left && left.gamepad && left.gamepad.buttons && left.gamepad.buttons[3]) {
        const yPressed = !!left.gamepad.buttons[3].pressed;
        if (yPressed && !yWasPressed) toggleMenu();
        yWasPressed = yPressed;
      } else {
        yWasPressed = false;
      }

      // RIGHT trigger click buttons (buttons[0] on Touch is usually trigger)
      if (menu.visible && right && right.gamepad && right.gamepad.buttons && right.gamepad.buttons[0]) {
        const trig = !!right.gamepad.buttons[0].pressed;
        if (trig && !rightTriggerWasPressed) {
          const hit = intersectButtons(controller1);
          if (hit && hit.object) clickButton(hit.object);
        }
        rightTriggerWasPressed = trig;
      } else {
        rightTriggerWasPressed = false;
      }

      // RIGHT hand locomotion only (movement + snap)
      if (right && right.gamepad) {
        const gp = right.gamepad;
        const stick = getStickPair(gp);
        const dead = 0.12;
        const sx = Math.abs(stick.x) > dead ? stick.x : 0;
        const sy = Math.abs(stick.y) > dead ? stick.y : 0;

        // If menu is open, keep movement active (you can change this later)
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        forward.y = 0;
        forward.normalize();
        const strafe = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        strafe.y = 0;
        strafe.normalize();

        rig.position.addScaledVector(forward, (-sy) * moveState.speed * dt);
        rig.position.addScaledVector(strafe, (sx) * moveState.speed * dt);

        moveState.snapCooldown = Math.max(0, moveState.snapCooldown - dt);
        const ax = getSnapAxis(gp);
        if (moveState.snapCooldown === 0 && Math.abs(ax) > 0.7) {
          rig.rotation.y += (ax > 0 ? -1 : 1) * moveState.snap;
          moveState.snapCooldown = 0.25;
        }
      }

      // Lasers hit floor (and also show menu distance)
      for (const c of [controller0, controller1]) {
        tmpMat.identity().extractRotation(c.matrixWorld);
        ray.ray.origin.setFromMatrixPosition(c.matrixWorld);
        ray.ray.direction.set(0, 0, -1).applyMatrix4(tmpMat);

        // Prefer menu panel intersection if visible; otherwise floor
        let dist = 5;

        if (menu.visible) {
          const hitsMenu = ray.intersectObjects([panel, btnMusic, btnClose], false);
          if (hitsMenu.length) dist = hitsMenu[0].distance;
          else {
            const hitsFloor = ray.intersectObject(floor, false);
            if (hitsFloor.length) dist = hitsFloor[0].distance;
          }
        } else {
          const hitsFloor = ray.intersectObject(floor, false);
          if (hitsFloor.length) dist = hitsFloor[0].distance;
        }

        const line = c.getObjectByName("laser");
        if (line) line.scale.z = dist;
      }
    }

    renderer.render(scene, camera);
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  setRed(`✅ STARTED\n${BUILD}\nRight move OK\nLeft Y menu OK`);
  setBanner(`✅ Scarlett\n${BUILD}\n2D world ready ✅\nLeft Y = Menu\nRight Trigger = Click`);
}

export function start() {
  ensureRoot();
  installGuards();
  setRed(`SYNC OK\n${BUILD}`);
  setBanner(`✅ Scarlett\n${BUILD}\nstart()`);

  if (window.__scarlettRan) return true;
  window.__scarlettRan = true;

  bootWorld2DAndXR().catch((e) => {
    const msg = String(e?.message || e);
    setRed("❌ BOOT FAILED\n" + msg);
    setBanner("❌ BOOT FAILED\n" + msg);
  });

  return true;
}

// fallback if router doesn't call start()
try { start(); } catch (e) {}
