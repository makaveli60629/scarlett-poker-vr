// /js/world.js — FULL WORLD v4
// ✅ Right stick: forward/back + 45° diagonal strafe (not pure left/right)
// ✅ Left stick: also works (if present) for movement
// ✅ Wrist menu on LEFT controller (toggle with left "squeeze"/grip if available, else selectstart)
// ✅ Teleport stays on both triggers/select
// ✅ Lasers + floor reticle bigger

export const World = {
  async init({ THREE, scene, renderer, camera, player, controllers, log, BUILD }) {
    const s = {
      THREE, scene, renderer, camera, player, controllers, log, BUILD,
      root: new THREE.Group(),
      anchors: {},
      room: "lobby",

      // locomotion
      moveSpeed: 2.8,
      deadzone: 0.14,
      snapTurnRad: THREE.MathUtils.degToRad(30),
      turnCooldown: 0,

      // movement shaping (your request)
      diagonal45: true,      // ✅ turn strafe into 45° diagonals
      diagonalAmount: 0.85,  // how much strafe contributes to forward direction

      // ray / reticle
      raycaster: new THREE.Raycaster(),
      tmpM: new THREE.Matrix4(),
      tmpV: new THREE.Vector3(),
      tmpDir: new THREE.Vector3(),
      groundMeshes: [],
      lasers: [],
      reticles: [],
      lastTeleportPointR: null,
      lastTeleportPointL: null,

      hoverCars: [],

      // Watch UI
      watch: { root: null, visible: true, buttons: [] },

      // Debug throttle
      _dbgT: 0,
      _lastAxesPrint: "",
    };

    s.root.name = "WORLD_ROOT";
    scene.add(s.root);

    addLightsNotDark(s);
    buildLobbyAndPit_DOWNSTAIRS(s);
    buildRoomsAndHallways(s);
    buildStore(s);
    buildSpectate(s);
    buildScorpion(s);
    buildHoverCars(s);

    setupXRLasers(s);
    setupFloorReticles_BIGGER(s);
    setupWatchMenu_LEFT(s);

    // ✅ SAFE SPAWN: flat lobby ground
    s.anchors.lobby = { pos: new THREE.Vector3(0, 0, 13.5), yaw: Math.PI };
    s.anchors.store = { pos: new THREE.Vector3(-26, 0, 0), yaw: Math.PI / 2 };
    s.anchors.scorpion = { pos: new THREE.Vector3(26, 0, 0), yaw: -Math.PI / 2 };
    s.anchors.spectate = { pos: new THREE.Vector3(0, 3.2, -14), yaw: 0 };
    setRigToAnchor(s, s.anchors.lobby);

    // ✅ Teleport on triggers/select for both hands
    controllers.c1.addEventListener("selectstart", () => teleportNow(s, "right"));
    controllers.c0.addEventListener("selectstart", () => teleportNow(s, "left"));

    // ✅ Watch toggle (prefer squeeze, else selectstart will still teleport)
    // Many Quest controllers fire "squeezestart" for grip.
    controllers.c0.addEventListener("squeezestart", () => toggleWatch(s));
    controllers.c1.addEventListener("squeezestart", () => { /* keep right hand free */ });

    log?.(`[world] init ✅ FULL v4 build=${BUILD}`);
    return {
      setRoom: (room) => {
        s.room = room;
        setRigToAnchor(s, s.anchors[room] || s.anchors.lobby);
        log?.(`[rm] room=${room}`);
      },
      update: (dt, t) => update(s, dt, t),
    };
  }
};

/* ---------------- LIGHTING ---------------- */

function addLightsNotDark(s) {
  const { THREE, scene, root } = s;

  const hemi = new THREE.HemisphereLight(0xdaf0ff, 0x121726, 1.25);
  hemi.position.set(0, 60, 0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(30, 60, 30);
  scene.add(sun);

  const p1 = new THREE.PointLight(0x7fb2ff, 1.1, 80, 2);
  p1.position.set(0, 8, 0);
  root.add(p1);

  const p2 = new THREE.PointLight(0xff6bd6, 0.6, 60, 2);
  p2.position.set(0, 2.5, 0);
  root.add(p2);
}

function matFloor(THREE, color = 0x111a28) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.06 });
}

/* ---------------- WORLD GEO ---------------- */

function buildLobbyAndPit_DOWNSTAIRS(s) {
  const { THREE, root } = s;

  const lobbyR = 18;
  const pitRadius = 6.6;
  const pitDepth = 2.6;
  const lobbyY = 0;
  const pitFloorY = lobbyY - pitDepth;

  const lobbyFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(lobbyR, lobbyR, 0.35, 64),
    matFloor(THREE, 0x121c2c)
  );
  lobbyFloor.position.set(0, lobbyY - 0.175, 0);
  root.add(lobbyFloor);
  s.groundMeshes.push(lobbyFloor);

  const pitFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, 0.35, 64),
    matFloor(THREE, 0x0c1220)
  );
  pitFloor.position.set(0, pitFloorY - 0.175, 0);
  root.add(pitFloor);
  s.groundMeshes.push(pitFloor);

  const pitWall = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 64, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0a101e, roughness: 0.95, metalness: 0.06, side: THREE.DoubleSide })
  );
  pitWall.position.set(0, (lobbyY + pitFloorY) / 2, 0);
  root.add(pitWall);

  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(2.7, 2.9, 0.4, 32),
    new THREE.MeshStandardMaterial({ color: 0x144235, roughness: 0.78, metalness: 0.05 })
  );
  table.position.set(0, pitFloorY + 0.95, 0);
  root.add(table);

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(pitRadius + 0.35, 0.08, 12, 64),
    new THREE.MeshStandardMaterial({ color: 0xc8d3ff, roughness: 0.3, metalness: 0.55 })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = lobbyY + 0.85;
  root.add(rail);

  // Ramp (not teleportable) from lobby down into pit
  const stairW = 2.1;
  const stairL = 7.6;
  const stairDrop = pitDepth;

  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(stairW, stairDrop, stairL),
    new THREE.MeshStandardMaterial({ color: 0x141b28, roughness: 0.95, metalness: 0.08 })
  );
  ramp.position.set(0, (lobbyY + pitFloorY) / 2, pitRadius + stairL * 0.32);
  ramp.rotation.x = -Math.atan2(stairDrop, stairL);
  root.add(ramp);
}

function buildRoomsAndHallways(s) {
  const { THREE, root } = s;

  const roomDist = 28, roomSize = 10, wallH = 4.6;
  const rooms = [
    { name: "north", x: 0, z: -roomDist },
    { name: "south", x: 0, z: roomDist },
    { name: "west",  x: -roomDist, z: 0 },
    { name: "east",  x: roomDist, z: 0 },
  ];

  for (const r of rooms) {
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize * 2.2, 0.35, roomSize * 2.2),
      matFloor(THREE, 0x111a28)
    );
    floor.position.set(r.x, -0.175, r.z);
    root.add(floor);
    s.groundMeshes.push(floor);

    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize * 2.2, wallH, roomSize * 2.2),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.92, metalness: 0.08, transparent: true, opacity: 0.5 })
    );
    walls.position.set(r.x, wallH / 2 - 0.175, r.z);
    root.add(walls);

    const hallLen = 12;
    const hall = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.35, hallLen), matFloor(THREE, 0x121c2c));
    hall.position.y = -0.175;

    if (r.name === "north") hall.position.set(0, -0.175, -18);
    if (r.name === "south") hall.position.set(0, -0.175, 18);
    if (r.name === "west")  { hall.position.set(-18, -0.175, 0); hall.rotation.y = Math.PI/2; }
    if (r.name === "east")  { hall.position.set(18, -0.175, 0); hall.rotation.y = Math.PI/2; }

    root.add(hall);
    s.groundMeshes.push(hall);
  }
}

function buildStore(s) {
  const { THREE, root } = s;
  const store = new THREE.Group();
  store.position.set(-26, 0, 0);
  root.add(store);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 18), matFloor(THREE, 0x111a28));
  floor.position.y = -0.175;
  store.add(floor);
  s.groundMeshes.push(floor);

  const glow = new THREE.PointLight(0x66ccff, 1.0, 45, 2);
  glow.position.set(0, 3.5, 0);
  store.add(glow);
}

function buildSpectate(s) {
  const { THREE, root } = s;
  const plat = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 6), matFloor(THREE, 0x121c2c));
  plat.position.set(0, 3.0, -14);
  root.add(plat);
  s.groundMeshes.push(plat);
}

function buildScorpion(s) {
  const { THREE, root } = s;
  const sc = new THREE.Group();
  sc.position.set(26, 0, 0);
  root.add(sc);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 18), matFloor(THREE, 0x0f1724));
  floor.position.y = -0.175;
  sc.add(floor);
  s.groundMeshes.push(floor);

  const light = new THREE.PointLight(0xff6bd6, 1.1, 50, 2);
  light.position.set(0, 3.5, 0);
  sc.add(light);
}

function buildHoverCars(s) {
  const { THREE, root } = s;
  const carGroup = new THREE.Group();
  carGroup.position.set(0, 0, 36);
  root.add(carGroup);

  const carMat = new THREE.MeshStandardMaterial({ color: 0x2b3b5f, roughness: 0.55, metalness: 0.25 });
  for (let i = 0; i < 5; i++) {
    const car = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 4.4), carMat);
    car.position.set(-10 + i * 5, 2.2, 0);
    carGroup.add(car);
    s.hoverCars.push({ obj: car, baseY: car.position.y, phase: i * 0.8 });
  }
}

/* ---------------- LASERS + RETICLE ---------------- */

function setupXRLasers(s) {
  const { THREE, controllers } = s;

  function makeLaser() {
    const geom = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1) ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x66ccff });
    const line = new THREE.Line(geom, mat);
    line.scale.z = 12;
    return line;
  }

  const l0 = makeLaser();
  const l1 = makeLaser();

  controllers.c0.add(l0);
  controllers.c1.add(l1);

  s.lasers.push({ controller: controllers.c0, line: l0 });
  s.lasers.push({ controller: controllers.c1, line: l1 });
}

function setupFloorReticles_BIGGER(s) {
  const { THREE, root } = s;

  function makeReticle() {
    const g = new THREE.RingGeometry(0.12, 0.18, 32);
    const m = new THREE.MeshBasicMaterial({ color: 0x66ccff, side: THREE.DoubleSide });
    const r = new THREE.Mesh(g, m);
    r.rotation.x = -Math.PI / 2;
    r.visible = false;
    root.add(r);
    return r;
  }

  s.reticles.push(makeReticle(), makeReticle());
}

/* ---------------- WATCH MENU ---------------- */

function setupWatchMenu_LEFT(s) {
  const { THREE, controllers } = s;

  const watchRoot = new THREE.Group();
  watchRoot.name = "WATCH_UI";

  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.085, 0.012),
    new THREE.MeshStandardMaterial({ color: 0x1b2a44, roughness: 0.5, metalness: 0.2 })
  );
  watchRoot.add(plate);

  const btnMat = new THREE.MeshStandardMaterial({ color: 0x2b3b5f, roughness: 0.6, metalness: 0.15 });
  const btnGeo = new THREE.BoxGeometry(0.12, 0.02, 0.012);

  const items = [
    { name: "Lobby", room: "lobby" },
    { name: "Store", room: "store" },
    { name: "Spectate", room: "spectate" },
    { name: "Scorpion", room: "scorpion" },
    { name: "HideUI", room: null },
  ];

  for (let i = 0; i < items.length; i++) {
    const b = new THREE.Mesh(btnGeo, btnMat.clone());
    b.position.set(0, 0.03 - i * 0.024, 0.01);
    b.userData.watchItem = items[i];
    watchRoot.add(b);
    s.watch.buttons.push(b);
  }

  // Attach to LEFT controller like a wrist device
  watchRoot.position.set(0.055, 0.015, -0.075);
  watchRoot.rotation.set(-0.7, 0.0, 0.25);
  controllers.c0.add(watchRoot);

  s.watch.root = watchRoot;
  s.watch.visible = true;
}

/* ---------------- UPDATE ---------------- */

function update(s, dt, t) {
  for (const c of s.hoverCars) {
    c.obj.position.y = c.baseY + Math.sin(t * 1.3 + c.phase) * 0.25;
  }

  updateLaserReticlesAndWatchHits(s);

  if (s.renderer.xr.isPresenting) {
    applyLocomotionRightPreferred(s, dt);
  }
}

function updateLaserReticlesAndWatchHits(s) {
  const { renderer, raycaster, tmpM, tmpV, tmpDir, THREE } = s;

  for (let i = 0; i < s.lasers.length; i++) {
    const L = s.lasers[i];
    const ctrl = L.controller;
    const line = L.line;
    const ret = s.reticles[i];

    if (!renderer.xr.isPresenting) {
      line.visible = false;
      ret.visible = false;
      continue;
    }

    line.visible = true;

    tmpM.identity().extractRotation(ctrl.matrixWorld);
    const origin = tmpV.setFromMatrixPosition(ctrl.matrixWorld);
    tmpDir.set(0, 0, -1).applyMatrix4(tmpM).normalize();

    raycaster.set(origin, tmpDir);

    // Watch UI interaction (only if visible)
    if (s.watch.visible && s.watch.buttons.length) {
      const hitsUI = raycaster.intersectObjects(s.watch.buttons, false);
      // reset emissive
      for (const b of s.watch.buttons) {
        if (b.material?.emissive) {
          b.material.emissive.setHex(0x000000);
          b.material.emissiveIntensity = 0;
        }
      }
      if (hitsUI.length) {
        const hit = hitsUI[0].object;
        if (hit.material?.emissive) {
          hit.material.emissive = new THREE.Color(0x223cff);
          hit.material.emissiveIntensity = 0.4;
        }
        // shorten line to UI
        line.scale.z = Math.min(2.0, hitsUI[0].distance);
        ret.visible = false;
        continue;
      }
    }

    // Floor reticle
    const hits = raycaster.intersectObjects(s.groundMeshes, false);
    if (hits.length) {
      const h = hits[0];
      line.scale.z = Math.min(12, h.distance);
      ret.visible = true;
      ret.position.copy(h.point);
      ret.position.y += 0.01;

      if (i === 1) s.lastTeleportPointR = h.point.clone();
      if (i === 0) s.lastTeleportPointL = h.point.clone();
    } else {
      line.scale.z = 12;
      ret.visible = false;
    }
  }
}

// Teleport
function teleportNow(s, hand) {
  if (!s.renderer.xr.isPresenting) return;

  const p = hand === "right" ? s.lastTeleportPointR : s.lastTeleportPointL;
  if (!p) return;

  s.player.position.x = p.x;
  s.player.position.z = p.z;
  s.player.position.y = 0;
  s.log?.(`[tp] ${hand} -> (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
}

function toggleWatch(s) {
  if (!s.watch.root) return;
  s.watch.visible = !s.watch.visible;
  s.watch.root.visible = s.watch.visible;
  s.log?.(`[watch] ${s.watch.visible ? "shown" : "hidden"}`);
}

/* ---------------- LOCOMOTION ---------------- */
/**
 * ✅ Uses RIGHT stick for movement if it moves.
 * ✅ Falls back to LEFT stick if right is not moving.
 * ✅ Applies "45° diagonals" shaping: strafe becomes diagonal forward/back depending on stick direction.
 */
function applyLocomotionRightPreferred(s, dt) {
  const session = s.renderer.xr.getSession?.();
  if (!session) return;

  const sources = Array.from(session.inputSources || []).filter(is => is?.gamepad);
  if (!sources.length) return;

  const right = sources.find(is => is.handedness === "right") || sources[0];
  const left  = sources.find(is => is.handedness === "left")  || sources[0];

  // Try right first
  let move = readStick(right.gamepad, s.deadzone);
  // If right is dead, try left
  if (!move.active) move = readStick(left.gamepad, s.deadzone);

  if (move.active) {
    const yaw = getHeadYaw(s.camera);
    const cos = Math.cos(yaw), sin = Math.sin(yaw);

    // Stick values
    let x = move.x;  // strafe
    let z = move.y;  // forward/back

    // ✅ 45-degree shaping:
    // Instead of pure strafe, we blend strafe into forward/back direction to create diagonals.
    // Example: pushing right becomes "forward-right" (45°) rather than pure right.
    if (s.diagonal45 && x !== 0) {
      const sign = z !== 0 ? Math.sign(z) : -1; // if no forward input, default to forward (negative on many sticks)
      z += sign * Math.abs(x) * s.diagonalAmount;
      // reduce pure strafe a bit so it feels like 45°, not sideways
      x *= (1.0 - 0.35);
      // normalize so speed stays consistent
      const len = Math.hypot(x, z);
      if (len > 1e-4) { x /= len; z /= len; }
    }

    const mx = x * cos - z * sin;
    const mz = x * sin + z * cos;

    s.player.position.x += mx * s.moveSpeed * dt;
    s.player.position.z += mz * s.moveSpeed * dt;
  }

  // Snap turn (use right first, else left)
  const turnSrc = right.gamepad || left.gamepad;
  const turn = readTurn(turnSrc, s.deadzone);
  s.turnCooldown = Math.max(0, s.turnCooldown - dt);
  if (s.turnCooldown === 0 && turn.active) {
    const dir = turn.x > 0 ? -1 : 1;
    s.player.rotation.y += dir * s.snapTurnRad;
    s.turnCooldown = 0.22;
  }

  // Hook watch button clicks: if left trigger pressed while aiming at watch, activate
  // (we use "selectstart" events in init for teleport; watch toggle is squeeze)
  // You can later add "selectstart" detection to choose watch buttons.
}

function readStick(gamepad, deadzone) {
  if (!gamepad) return { active: false, x: 0, y: 0 };

  const axes = gamepad.axes || [];
  const pairs = [];
  if (axes.length >= 2) pairs.push([0, 1]);
  if (axes.length >= 4) pairs.push([2, 3]);
  if (!pairs.length) return { active: false, x: 0, y: 0 };

  // choose pair with most movement
  let best = pairs[0], bestMag = -1;
  for (const p of pairs) {
    const mag = Math.abs(axes[p[0]] || 0) + Math.abs(axes[p[1]] || 0);
    if (mag > bestMag) { bestMag = mag; best = p; }
  }

  let x = axes[best[0]] || 0;
  let y = axes[best[1]] || 0;

  if (Math.abs(x) < deadzone) x = 0;
  if (Math.abs(y) < deadzone) y = 0;

  const active = !(x === 0 && y === 0);
  return { active, x, y };
}

function readTurn(gamepad, deadzone) {
  if (!gamepad) return { active: false, x: 0 };
  const axes = gamepad.axes || [];
  // Prefer a second stick x if present, else use primary x.
  let tx = 0;
  if (axes.length >= 3) tx = axes[2] || 0;
  else if (axes.length >= 1) tx = axes[0] || 0;

  if (Math.abs(tx) < deadzone) tx = 0;
  return { active: tx !== 0, x: tx };
}

function getHeadYaw(camera) {
  const q = camera.quaternion;
  const t3 = +2.0 * (q.w * q.y + q.z * q.x);
  const t4 = +1.0 - 2.0 * (q.y * q.y + q.x * q.x);
  return Math.atan2(t3, t4);
}

function setRigToAnchor(s, anchor) {
  s.player.position.set(anchor.pos.x, anchor.pos.y, anchor.pos.z);
  s.player.rotation.set(0, 0, 0);
  if (!s.renderer.xr.isPresenting) s.camera.rotation.set(0, anchor.yaw, 0);
      }
