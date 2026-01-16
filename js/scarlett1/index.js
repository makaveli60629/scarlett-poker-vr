// /js/scarlett1/index.js
// SCARLETT1 v18 — Global THREE (CDN chain) + XR + Controllers/Lasers + Right locomotion
// + LEFT Y menu toggle (robust mapping) + Always-hit laser target plane
// + Teleport (Left grip hold/release)
// + HUD: Hide/Show + Module Test (red button) + Copy status
const BUILD = "SCARLETT1_INDEX_FULL_v18_LEFT_FIX_MENU_TELEPORT_HUD";

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

function ensureHud() {
  let hud = document.getElementById("scarlettHud");
  if (hud) return hud;

  hud = document.createElement("div");
  hud.id = "scarlettHud";
  hud.style.position = "fixed";
  hud.style.left = "10px";
  hud.style.top = "10px";
  hud.style.zIndex = "1000001";
  hud.style.padding = "10px 12px";
  hud.style.borderRadius = "12px";
  hud.style.background = "rgba(0,0,0,0.70)";
  hud.style.color = "#fff";
  hud.style.font = "12px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial";
  hud.style.backdropFilter = "blur(4px)";
  hud.style.maxWidth = "90vw";

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "8px";
  row.style.flexWrap = "wrap";
  row.style.alignItems = "center";
  row.style.marginBottom = "8px";

  const btn = (label, bg, onClick) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.border = "0";
    b.style.borderRadius = "12px";
    b.style.padding = "10px 12px";
    b.style.cursor = "pointer";
    b.style.font = "12px system-ui";
    b.style.background = bg;
    b.style.color = "#111";
    b.onclick = onClick;
    return b;
  };

  const body = document.createElement("div");
  body.id = "scarlettHudBody";
  body.textContent = "";

  const hideBtn = btn("Hide HUD", "rgba(255,255,255,0.92)", () => {
    hud.style.display = "none";
    let pill = document.getElementById("scarlettShowHud");
    if (!pill) {
      pill = document.createElement("button");
      pill.id = "scarlettShowHud";
      pill.textContent = "Show HUD";
      pill.style.position = "fixed";
      pill.style.left = "10px";
      pill.style.top = "10px";
      pill.style.zIndex = "1000002";
      pill.style.border = "0";
      pill.style.borderRadius = "999px";
      pill.style.padding = "12px 14px";
      pill.style.background = "rgba(0,0,0,0.70)";
      pill.style.color = "#fff";
      pill.style.cursor = "pointer";
      pill.onclick = () => {
        pill.remove();
        hud.style.display = "block";
      };
      document.body.appendChild(pill);
    }
  });

  const copyBtn = btn("Copy Status", "rgba(255,255,255,0.92)", async () => {
    try {
      const txt = body.textContent || "";
      await navigator.clipboard.writeText(txt);
      bodyLine("✅ copied");
    } catch (e) {
      bodyLine("⚠️ copy failed");
    }
  });

  const testBtn = btn("Module Test", "rgba(255,80,80,0.92)", () => {
    // quick, visible module test results
    const xr = !!navigator.xr;
    const gl = !!document.getElementById("scarlettCanvas");
    const secure = !!window.isSecureContext;
    bodyLine(`TEST: secure=${secure} xr=${xr} canvas=${gl} ua=${navigator.userAgent}`);
  });

  row.appendChild(hideBtn);
  row.appendChild(copyBtn);
  row.appendChild(testBtn);

  hud.appendChild(row);
  hud.appendChild(body);
  document.body.appendChild(hud);

  function bodyLine(s) {
    body.textContent = (body.textContent ? body.textContent + "\n" : "") + s;
    const lines = body.textContent.split("\n");
    if (lines.length > 160) body.textContent = lines.slice(lines.length - 160).join("\n");
  }

  window.__scarlettHudLine = bodyLine;
  return hud;
}

function hudLine(s) {
  const fn = window.__scarlettHudLine;
  if (typeof fn === "function") fn(s);
  proof(s);
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
      hudLine(`loading THREE… ${src}`);
      const ok = await loadScript(src);
      if (window.THREE) return ok;
      lastErr = new Error("Loaded but window.THREE missing: " + src);
    } catch (e) {
      lastErr = e;
      hudLine(`⚠️ three load failed: ${src}`);
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

async function boot() {
  ensureRoot();
  ensureHud();
  hudLine(`✅ ${BUILD}`);

  const threeSrc = await ensureThreeGlobal();
  if (!window.THREE) throw new Error("window.THREE missing after load");
  hudLine(`THREE OK: ${threeSrc}`);

  const THREE = window.THREE;
  const app = document.getElementById("app") || document.body;

  // Scene / Camera / Renderer
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0f12);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 500);
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

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222244, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(6, 10, 3);
  scene.add(sun);

  // Floor (visible)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x1c2126, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Laser target plane (invisible, ALWAYS there so lasers always “hit” something)
  const laserTarget = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
  );
  laserTarget.rotation.x = -Math.PI / 2;
  laserTarget.position.y = 0.001;
  scene.add(laserTarget);

  // Table (placeholder)
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.95, 0.14, 48),
    new THREE.MeshStandardMaterial({ color: 0x2a7a5e, roughness: 0.95 })
  );
  table.position.set(0, 0.85, 0);
  scene.add(table);

  // Rig
  const rig = new THREE.Group();
  rig.position.set(0, 0, 3.2);
  rig.add(camera);
  scene.add(rig);

  camera.lookAt(0, 1.0, 0);

  // Controllers
  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);
  rig.add(c0);
  rig.add(c1);

  function makeLaser(color) {
    const geom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
    const mat = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geom, mat);
    line.name = "laser";
    line.scale.z = 5;
    return line;
  }
  c0.add(makeLaser(0xff3bd1));
  c1.add(makeLaser(0x39b6ff));

  const ray = new THREE.Raycaster();
  const tmpMat = new THREE.Matrix4();

  // Menu (minimal, toggle only)
  const menu = new THREE.Group();
  menu.visible = false;
  scene.add(menu);

  const panelW = 0.55, panelH = 0.32;
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(panelW, panelH),
    new THREE.MeshStandardMaterial({ color: 0x101418, roughness: 0.9, metalness: 0.05 })
  );
  panel.position.set(0, 0, -1);
  menu.add(panel);

  const frame = new THREE.Mesh(
    new THREE.PlaneGeometry(panelW + 0.01, panelH + 0.01),
    new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 1 })
  );
  frame.position.set(0, 0, -1.001);
  menu.add(frame);

  function toggleMenu(force) {
    menu.visible = typeof force === "boolean" ? force : !menu.visible;
    hudLine(`menu: ${menu.visible ? "ON" : "OFF"} (Left Y)`);
  }

  // Teleport visuals
  const teleportMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.16, 32),
    new THREE.MeshBasicMaterial({ color: 0x39b6ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  teleportMarker.rotation.x = -Math.PI / 2;
  teleportMarker.visible = false;
  scene.add(teleportMarker);

  let teleportActive = false;
  let teleportPoint = new THREE.Vector3();

  function updateTeleportFromController(controller) {
    tmpMat.identity().extractRotation(controller.matrixWorld);
    ray.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    ray.ray.direction.set(0, 0, -1).applyMatrix4(tmpMat);
    const hits = ray.intersectObject(laserTarget, false);
    if (hits.length) {
      teleportPoint.copy(hits[0].point);
      teleportMarker.position.copy(teleportPoint);
      teleportMarker.visible = true;
    } else {
      teleportMarker.visible = false;
    }
  }

  function commitTeleport() {
    if (!teleportMarker.visible) return;
    // Move rig to marker, keep camera height
    rig.position.x = teleportPoint.x;
    rig.position.z = teleportPoint.z;
    hudLine("teleport ✅");
  }

  // XR enter
  async function enterVR() {
    if (!navigator.xr) return;
    const session = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking", "layers"],
    });
    renderer.xr.setReferenceSpaceType("local-floor");
    await renderer.xr.setSession(session);
    hudLine("XR sessionstart ✅");
    session.addEventListener("end", () => hudLine("XR sessionend ✅"));
  }
  if (navigator.xr) makeEnterVrButton(enterVR);

  // Robust input mapping
  // We DO NOT trust handedness alone; we fall back to controller indices.
  function classifyInputs(session) {
    let left = null, right = null;
    const sources = Array.from(session.inputSources || []).filter(s => s && s.gamepad);

    for (const s of sources) {
      if (s.handedness === "left") left = s;
      if (s.handedness === "right") right = s;
    }

    // Fallback: if missing handedness, pick by index order
    if (!left && sources[0]) left = sources[0];
    if (!right && sources[1]) right = sources[1];

    return { left, right };
  }

  // Locomotion (RIGHT ONLY)
  const moveState = { speed: 1.8, snap: Math.PI / 6, snapCooldown: 0 };

  function getStickPair(gp) {
    if (!gp || !gp.axes || gp.axes.length < 2) return { x: 0, y: 0 };
    const a = gp.axes;
    let best = [0, 1], bestMag = Math.abs(a[0]) + Math.abs(a[1]);
    for (let i = 0; i + 1 < a.length; i += 2) {
      const mag = Math.abs(a[i]) + Math.abs(a[i + 1]);
      if (mag > bestMag) { best = [i, i + 1]; bestMag = mag; }
    }
    return { x: a[best[0]] || 0, y: a[best[1]] || 0 };
  }
  function getSnapAxis(gp) {
    if (!gp || !gp.axes) return 0;
    return gp.axes.length >= 3 ? (gp.axes[2] || 0) : (gp.axes[0] || 0);
  }

  // Button mapping helpers (Quest can vary)
  function readYButton(gp) {
    if (!gp || !gp.buttons) return false;
    // Common candidates for Y: 3 (typical), sometimes 4 depending on profile
    const cands = [3, 4];
    for (const i of cands) {
      if (gp.buttons[i]) return !!gp.buttons[i].pressed;
    }
    return false;
  }
  function readGrip(gp) {
    if (!gp || !gp.buttons) return false;
    // Grip commonly button 1
    return gp.buttons[1] ? !!gp.buttons[1].pressed : false;
  }

  let yWas = false;
  let leftGripWas = false;

  // Render loop
  let last = performance.now();
  renderer.setAnimationLoop((t) => {
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;

    const session = renderer.xr.getSession && renderer.xr.getSession();

    // Menu follow camera when visible
    if (menu.visible) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const pos = new THREE.Vector3().copy(camera.position).add(forward.multiplyScalar(1.0));
      menu.position.set(pos.x, pos.y, pos.z);
      menu.quaternion.copy(camera.quaternion);
    }

    if (session) {
      const { left, right } = classifyInputs(session);

      // --- Left Y toggles menu ---
      if (left && left.gamepad) {
        const y = readYButton(left.gamepad);
        if (y && !yWas) toggleMenu();
        yWas = y;
      } else {
        yWas = false;
      }

      // --- Teleport: LEFT GRIP hold/release ---
      if (left && left.gamepad) {
        const grip = readGrip(left.gamepad);
        if (grip) {
          teleportActive = true;
          updateTeleportFromController(c0); // c0 usually maps to left, but even if swapped it still works visually
        } else {
          if (leftGripWas && teleportActive) {
            // released
            commitTeleport();
          }
          teleportActive = false;
          teleportMarker.visible = false;
        }
        leftGripWas = grip;
      } else {
        teleportActive = false;
        leftGripWas = false;
        teleportMarker.visible = false;
      }

      // --- Right locomotion only ---
      if (right && right.gamepad) {
        const gp = right.gamepad;
        const stick = getStickPair(gp);
        const dead = 0.12;
        const sx = Math.abs(stick.x) > dead ? stick.x : 0;
        const sy = Math.abs(stick.y) > dead ? stick.y : 0;

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        forward.y = 0; forward.normalize();
        const strafe = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        strafe.y = 0; strafe.normalize();

        rig.position.addScaledVector(forward, (-sy) * moveState.speed * dt);
        rig.position.addScaledVector(strafe, (sx) * moveState.speed * dt);

        moveState.snapCooldown = Math.max(0, moveState.snapCooldown - dt);
        const ax = getSnapAxis(gp);
        if (moveState.snapCooldown === 0 && Math.abs(ax) > 0.7) {
          rig.rotation.y += (ax > 0 ? -1 : 1) * moveState.snap;
          moveState.snapCooldown = 0.25;
        }
      }

      // --- Lasers always hit laserTarget (never “dead”) ---
      for (const c of [c0, c1]) {
        tmpMat.identity().extractRotation(c.matrixWorld);
        ray.ray.origin.setFromMatrixPosition(c.matrixWorld);
        ray.ray.direction.set(0, 0, -1).applyMatrix4(tmpMat);
        const hits = ray.intersectObject(laserTarget, false);
        const dist = hits.length ? hits[0].distance : 5;
        const line = c.getObjectByName("laser");
        if (line) line.scale.z = dist;
      }
    } else {
      // 2D mode: show lasers at default length (nice visual)
      for (const c of [c0, c1]) {
        const line = c.getObjectByName("laser");
        if (line) line.scale.z = 3;
      }
    }

    renderer.render(scene, camera);
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  hudLine("READY ✅ Right stick = move");
  hudLine("Left Y = menu toggle");
  hudLine("Left Grip = teleport hold/release");
}

export function start() {
  ensureRoot();
  installGuards();
  ensureHud();
  hudLine(`SYNC OK ${BUILD}`);

  if (window.__scarlettRan) return true;
  window.__scarlettRan = true;

  boot().catch((e) => {
    const msg = String(e?.message || e);
    hudLine("❌ BOOT FAILED: " + msg);
    err(e);
  });

  return true;
}

// fallback
try { start(); } catch (e) {}
