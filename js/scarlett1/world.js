// js/scarlett1/world.js — Scarlett1 World (FULL • SAFE)
// Exports initWorld(ctx)

export async function initWorld(ctx = {}) {
  const THREE = ctx.THREE;
  const log = ctx.log || console.log;
  const status = ctx.status || (() => {});
  const base = ctx.base || "/";

  status("initWorld() start");
  log("initWorld() start");

  // ----- Renderer / Scene / Camera -----
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.05,
    600
  );

  // Player rig so XR/non-XR can move together
  const rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.add(camera);
  scene.add(rig);

  // Default spawn (NOT on table)
  rig.position.set(0, 1.65, 10);
  rig.rotation.y = Math.PI; // face toward center

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ----- Lights -----
  scene.add(new THREE.HemisphereLight(0xaac7ff, 0x101018, 0.9));

  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(10, 20, 10);
  scene.add(key);

  const fill = new THREE.PointLight(0x88aaff, 0.6, 80);
  fill.position.set(0, 6, 0);
  scene.add(fill);

  // ----- Floor -----
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0c1220, roughness: 0.95, metalness: 0.05 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 128), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);

  // Subtle ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(6, 22, 128),
    new THREE.MeshStandardMaterial({ color: 0x0f1a33, roughness: 0.9, metalness: 0.05 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  scene.add(ring);

  // ----- Table platform (center) -----
  const tableBase = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.8, 0.35, 48),
    new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.6, metalness: 0.2 })
  );
  tableBase.position.set(0, 0.18, 0);
  scene.add(tableBase);

  // Simple “divot” suggestion: raised lip around it
  const lip = new THREE.Mesh(
    new THREE.RingGeometry(3.9, 4.4, 64),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.6, metalness: 0.25 })
  );
  lip.rotation.x = -Math.PI / 2;
  lip.position.set(0, 0.02, 0);
  scene.add(lip);

  // ----- Spawn pads (prevents spawning inside objects) -----
  const padMat = new THREE.MeshStandardMaterial({ color: 0x143a8a, roughness: 0.3, metalness: 0.35, emissive: 0x081a44 });
  const spawnPads = [
    { name: "SPAWN_A", pos: new THREE.Vector3(0, 0.02, 12), yaw: Math.PI },
    { name: "SPAWN_B", pos: new THREE.Vector3(10, 0.02, 0), yaw: -Math.PI / 2 },
    { name: "SPAWN_C", pos: new THREE.Vector3(-10, 0.02, 0), yaw: Math.PI / 2 },
    { name: "SPAWN_D", pos: new THREE.Vector3(0, 0.02, -12), yaw: 0 }
  ];

  spawnPads.forEach((p) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1.0, 48), padMat);
    m.rotation.x = -Math.PI / 2;
    m.position.copy(p.pos);
    m.name = p.name;
    scene.add(m);
  });

  // Choose safest pad as spawn:
  rig.position.set(0, 1.65, 12);
  rig.rotation.y = Math.PI;

  // ----- Simple walls (so it feels sealed) -----
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x060911, roughness: 0.95, metalness: 0.05 });
  const wallH = 5;
  const wallR = 24;

  const wallGeo = new THREE.CylinderGeometry(wallR, wallR, wallH, 96, 1, true);
  const walls = new THREE.Mesh(wallGeo, wallMat);
  walls.position.y = wallH / 2;
  walls.rotation.y = Math.PI / 16;
  scene.add(walls);

  // ----- Android movement (ONLY outside XR) -----
  const isAndroid = /Android/i.test(navigator.userAgent);
  let move = { f: 0, s: 0 };
  let look = { yaw: rig.rotation.y };

  // tiny mobile stick overlay (safe + minimal)
  function makeAndroidStick() {
    const ui = document.createElement("div");
    ui.id = "android_stick";
    ui.style.cssText = `
      position:fixed; left:12px; bottom:12px; z-index:999998;
      width:160px; height:160px; border-radius:18px;
      background:rgba(10,14,30,0.30);
      border:1px solid rgba(120,160,255,0.18);
      touch-action:none;
      display:${isAndroid ? "block" : "none"};
    `;
    const knob = document.createElement("div");
    knob.style.cssText = `
      position:absolute; left:50%; top:50%;
      width:72px; height:72px; margin-left:-36px; margin-top:-36px;
      border-radius:18px;
      background:rgba(40,60,120,0.55);
      border:1px solid rgba(120,160,255,0.25);
    `;
    ui.appendChild(knob);
    document.body.appendChild(ui);

    let active = false;
    let cx = 80, cy = 80;

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    ui.addEventListener("pointerdown", (e) => {
      if (renderer.xr.isPresenting) return;
      active = true;
      ui.setPointerCapture(e.pointerId);
    });

    ui.addEventListener("pointermove", (e) => {
      if (!active || renderer.xr.isPresenting) return;
      const r = ui.getBoundingClientRect();
      const x = clamp(e.clientX - r.left, 0, r.width);
      const y = clamp(e.clientY - r.top, 0, r.height);
      const dx = (x - cx) / 60;
      const dy = (y - cy) / 60;

      knob.style.left = `${x}px`;
      knob.style.top = `${y}px`;
      knob.style.marginLeft = `-36px`;
      knob.style.marginTop = `-36px`;

      move.s = clamp(dx, -1, 1);
      move.f = clamp(-dy, -1, 1);
    });

    const up = () => {
      active = false;
      move.f = 0; move.s = 0;
      knob.style.left = `50%`;
      knob.style.top = `50%`;
    };
    ui.addEventListener("pointerup", up);
    ui.addEventListener("pointercancel", up);
  }

  if (isAndroid) makeAndroidStick();

  // Keyboard fallback
  const keys = {};
  window.addEventListener("keydown", (e) => { keys[e.code] = true; });
  window.addEventListener("keyup", (e) => { keys[e.code] = false; });

  // ----- Render loop -----
  const clock = new THREE.Clock();

  function tick() {
    const dt = Math.min(0.05, clock.getDelta());

    // Android/desktop movement only if not in XR
    if (!renderer.xr.isPresenting) {
      // keyboard
      const kf = (keys["KeyW"] ? 1 : 0) + (keys["ArrowUp"] ? 1 : 0) - (keys["KeyS"] ? 1 : 0) - (keys["ArrowDown"] ? 1 : 0);
      const ks = (keys["KeyD"] ? 1 : 0) + (keys["ArrowRight"] ? 1 : 0) - (keys["KeyA"] ? 1 : 0) - (keys["ArrowLeft"] ? 1 : 0);

      const f = (Math.abs(kf) > 0 ? kf : move.f);
      const s = (Math.abs(ks) > 0 ? ks : move.s);

      const speed = 2.2;
      const yaw = rig.rotation.y;

      const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const right = new THREE.Vector3(Math.sin(yaw + Math.PI / 2), 0, Math.cos(yaw + Math.PI / 2));

      rig.position.addScaledVector(forward, f * speed * dt);
      rig.position.addScaledVector(right, s * speed * dt);

      // Keep above floor
      rig.position.y = 1.65;
    }

    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(tick);

  status("World running ✅");
  log("render loop start ✅");
                                    }
