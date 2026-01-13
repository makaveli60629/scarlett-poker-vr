// /js/world.js — FULL FIX v1.0
// ✅ VR locomotion (thumbsticks) + snap turn
// ✅ Teleport reticle circle on floor (laser dot)
// ✅ Stairs tilt DOWN into pit (from lobby)
// ✅ Watch menu on wrist (not jumbotron)
// ✅ Brighter lighting + lobby walls restored
// ✅ Keeps rooms/store/cars from prior build

export const World = {
  async init({ THREE, scene, renderer, camera, player, controllers, log, BUILD }) {
    const s = {
      THREE, scene, renderer, camera, player, controllers, log, BUILD,
      root: new THREE.Group(),
      room: "lobby",
      anchors: {},
      hoverCars: [],
      lasers: [],
      interactables: [],

      // locomotion
      moveSpeed: 2.2,        // meters/sec in VR
      turnSnap: THREE.MathUtils.degToRad(30),
      turnCooldown: 0,
      deadzone: 0.18,

      // ray / reticle
      raycaster: new THREE.Raycaster(),
      tmpM: new THREE.Matrix4(),
      tmpV: new THREE.Vector3(),
      tmpV2: new THREE.Vector3(),
      tmpDir: new THREE.Vector3(),

      groundMeshes: [],
      reticles: [],

      // watch UI
      watch: { root: null, visible: true },
    };

    s.root.name = "WORLD_ROOT";
    scene.add(s.root);

    addLightsBright(s);
    addLobbyShellWalls(s);

    buildLobbyAndPit(s);       // includes corrected stairs tilt DOWN into pit
    buildRoomsAndHallways(s);
    buildStore(s);
    buildSpectate(s);
    buildScorpion(s);
    buildHoverCars(s);

    setupXRLasers(s);
    setupFloorReticles(s);
    setupWatchMenu(s);

    // spawn
    s.anchors.lobby = { pos: new THREE.Vector3(0, 0, 10.5), yaw: Math.PI };
    s.anchors.store = { pos: new THREE.Vector3(-26, 0, 0), yaw: Math.PI / 2 };
    s.anchors.scorpion = { pos: new THREE.Vector3(26, 0, 0), yaw: -Math.PI / 2 };
    s.anchors.spectate = { pos: new THREE.Vector3(0, 3.2, -14), yaw: 0 };
    setRigToAnchor(s, s.anchors.lobby);

    log?.(`[world] FULL FIX init ✅ build=${BUILD}`);

    return {
      setRoom: (room) => {
        s.room = room;
        const a = s.anchors[room] || s.anchors.lobby;
        setRigToAnchor(s, a);
        log?.(`[rm] room=${room} ✅`);
      },
      update: (dt, t) => update(s, dt, t),
    };
  }
};

// -------------------- LIGHTING + WALLS --------------------

function addLightsBright(s) {
  const { THREE, scene, root } = s;

  // brighter base
  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x101424, 1.15);
  hemi.position.set(0, 60, 0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.35);
  sun.position.set(25, 60, 25);
  scene.add(sun);

  // lobby accents
  const p1 = new THREE.PointLight(0x7fb2ff, 1.2, 75, 2);
  p1.position.set(0, 8, 0);
  root.add(p1);

  const p2 = new THREE.PointLight(0xff6bd6, 0.7, 55, 2);
  p2.position.set(0, 2.5, 0);
  root.add(p2);
}

function addLobbyShellWalls(s) {
  const { THREE, root } = s;

  // A simple "shell" so it doesn’t feel like missing walls
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(22, 22, 10, 64, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x0b1220,
      roughness: 0.95,
      metalness: 0.06,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55
    })
  );
  shell.position.set(0, 4.2, 0);
  root.add(shell);
}

// -------------------- MATERIAL HELPERS --------------------

function matFloor(THREE, color = 0x111a28) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.95,
    metalness: 0.06
  });
}

// -------------------- CORE WORLD --------------------

function buildLobbyAndPit(s) {
  const { THREE, root } = s;

  const lobbyR = 18;
  const pitRadius = 6.6;
  const pitDepth = 2.6;
  const lobbyY = 0;
  const pitFloorY = lobbyY - pitDepth;

  // Lobby floor
  const lobbyFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(lobbyR, lobbyR, 0.35, 64),
    matFloor(THREE, 0x121c2c)
  );
  lobbyFloor.position.set(0, lobbyY - 0.175, 0);
  root.add(lobbyFloor);
  s.groundMeshes.push(lobbyFloor);

  // Pit floor (lower)
  const pitFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, 0.35, 64),
    matFloor(THREE, 0x0c1220)
  );
  pitFloor.position.set(0, pitFloorY - 0.175, 0);
  root.add(pitFloor);
  s.groundMeshes.push(pitFloor);

  // Pit wall
  const pitWall = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 64, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x0a101e,
      roughness: 0.95,
      metalness: 0.06,
      side: THREE.DoubleSide
    })
  );
  pitWall.position.set(0, (lobbyY + pitFloorY) / 2, 0);
  root.add(pitWall);

  // Table placeholder
  const table = new THREE.Group();
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.8, 0.35, 32),
    new THREE.MeshStandardMaterial({ color: 0x144235, roughness: 0.78, metalness: 0.05 })
  );
  tableTop.position.y = 0.95;
  table.add(tableTop);

  const tableBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 1.2, 1.2, 20),
    new THREE.MeshStandardMaterial({ color: 0x1c2433, roughness: 0.65, metalness: 0.18 })
  );
  tableBase.position.y = 0.35;
  table.add(tableBase);

  table.position.set(0, pitFloorY + 0.15, 0);
  root.add(table);

  // Guardrail
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(pitRadius + 0.35, 0.08, 12, 64),
    new THREE.MeshStandardMaterial({ color: 0xc8d3ff, roughness: 0.3, metalness: 0.55 })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = lobbyY + 0.85;
  root.add(rail);

  // ✅ STAIRS FIX: From lobby edge, it should tilt DOWN into the pit
  // Ramp center sits between lobbyY and pitFloorY, and tilts downward as it goes toward pit center.
  const stairW = 2.1;
  const stairL = 7.6;
  const stairDrop = pitDepth;

  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(stairW, stairDrop, stairL),
    new THREE.MeshStandardMaterial({ color: 0x141b28, roughness: 0.95, metalness: 0.08 })
  );

  // Place on +Z side by default (front)
  ramp.position.set(0, (lobbyY + pitFloorY) / 2, pitRadius + stairL * 0.32);

  // Tilt DOWN toward pit (toward -Z from the top edge)
  // Negative rotation makes it descend as it goes "into" the pit.
  ramp.rotation.x = -Math.atan2(stairDrop, stairL);
  root.add(ramp);

  // side rails
  const sideMat = new THREE.MeshStandardMaterial({ color: 0x2b3b5f, roughness: 0.6, metalness: 0.2 });
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.08, stairDrop * 0.9, stairL * 0.92), sideMat);
  const sideR = sideL.clone();
  sideL.position.set(-stairW * 0.52, 0.0, 0);
  sideR.position.set(+stairW * 0.52, 0.0, 0);
  ramp.add(sideL, sideR);
}

function buildRoomsAndHallways(s) {
  const { THREE, root } = s;

  const roomDist = 28;
  const roomSize = 10;
  const wallH = 4.6;

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
      new THREE.MeshStandardMaterial({
        color: 0x0b1220,
        roughness: 0.92,
        metalness: 0.08,
        transparent: true,
        opacity: 0.5
      })
    );
    walls.position.set(r.x, wallH / 2 - 0.175, r.z);
    root.add(walls);

    const hallLen = 12;
    const hall = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.35, hallLen),
      matFloor(THREE, 0x121c2c)
    );
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

  const mannequinMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.6, metalness: 0.05 });
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.2, 6, 10), mannequinMat);
    m.position.set(-5 + i * 3.3, 1.1, -4);
    store.add(m);
  }
}

function buildSpectate(s) {
  const { THREE, root } = s;

  const plat = new THREE.Mesh(
    new THREE.BoxGeometry(14, 0.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x121c2c, roughness: 0.9, metalness: 0.08 })
  );
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
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x66ccff, roughness: 0.3, metalness: 0.4 });

  for (let i = 0; i < 5; i++) {
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 4.4), carMat);
    body.position.y = 0.4;
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 1.6), glowMat);
    canopy.position.set(0, 0.85, -0.3);
    car.add(body, canopy);

    car.position.set(-10 + i * 5, 2.2, 0);
    car.rotation.y = (i - 2) * 0.18;

    carGroup.add(car);
    s.hoverCars.push({ obj: car, baseY: car.position.y, phase: i * 0.8 });
  }
}

// -------------------- LASERS + FLOOR RETICLE --------------------

function setupXRLasers(s) {
  const { THREE, controllers, log } = s;

  function makeLaser() {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
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

  log?.("[xr] lasers ✅");
}

function setupFloorReticles(s) {
  const { THREE, root } = s;

  function makeReticle() {
    const g = new THREE.RingGeometry(0.06, 0.09, 28);
    const m = new THREE.MeshBasicMaterial({ color: 0x66ccff, side: THREE.DoubleSide });
    const r = new THREE.Mesh(g, m);
    r.rotation.x = -Math.PI / 2;
    r.visible = false;
    root.add(r);
    return r;
  }

  s.reticles.push(makeReticle(), makeReticle());
}

// -------------------- WATCH MENU --------------------

function setupWatchMenu(s) {
  const { THREE, controllers } = s;

  const watchRoot = new THREE.Group();
  watchRoot.name = "WATCH_UI";

  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.07, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x1b2a44, roughness: 0.5, metalness: 0.2 })
  );
  watchRoot.add(plate);

  const btnMat = new THREE.MeshStandardMaterial({ color: 0x2b3b5f, roughness: 0.6, metalness: 0.15 });
  const btnGeo = new THREE.BoxGeometry(0.10, 0.018, 0.01);

  const names = ["Tables", "Store", "Spectate", "HideUI"];
  for (let i = 0; i < names.length; i++) {
    const b = new THREE.Mesh(btnGeo, btnMat.clone());
    b.position.set(0, 0.022 - i * 0.02, 0.008);
    b.name = `WATCH_${names[i].toUpperCase()}`;
    watchRoot.add(b);
    s.interactables.push(b);
  }

  // attach to LEFT controller (wrist)
  watchRoot.position.set(0.04, 0.02, -0.06);
  watchRoot.rotation.set(-0.6, 0.0, 0.2);
  controllers.c0.add(watchRoot);

  s.watch.root = watchRoot;
}

// -------------------- UPDATE LOOP --------------------

function update(s, dt, t) {
  // cars
  for (const c of s.hoverCars) {
    c.obj.position.y = c.baseY + Math.sin(t * 1.3 + c.phase) * 0.25;
    c.obj.rotation.y += dt * 0.12;
  }

  // XR lasers + floor dot + UI hit highlighting
  updateLasersAndReticle(s);

  // ✅ VR locomotion (thumbsticks) when in XR
  if (s.renderer.xr.isPresenting) {
    vrLocomotion(s, dt);
  }
}

function updateLasersAndReticle(s) {
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

    // controller ray
    tmpM.identity().extractRotation(ctrl.matrixWorld);
    const origin = tmpV.setFromMatrixPosition(ctrl.matrixWorld);
    tmpDir.set(0, 0, -1).applyMatrix4(tmpM).normalize();

    raycaster.set(origin, tmpDir);

    // 1) check watch buttons
    const uiHits = raycaster.intersectObjects(s.interactables, true);
    if (uiHits.length) {
      line.scale.z = Math.min(2.0, uiHits[0].distance);
      ret.visible = false;

      // glow the hit object a little
      const hit = uiHits[0].object;
      if (hit.material && "emissive" in hit.material) {
        hit.material.emissive = new THREE.Color(0x223cff);
        hit.material.emissiveIntensity = 0.35;
      }
      continue;
    }

    // 2) floor reticle (circle on floor)
    const floorHits = raycaster.intersectObjects(s.groundMeshes, false);
    if (floorHits.length) {
      const h = floorHits[0];
      line.scale.z = Math.min(12, h.distance);
      ret.visible = true;
      ret.position.copy(h.point);
      ret.position.y += 0.01;
    } else {
      line.scale.z = 12;
      ret.visible = false;
    }
  }
}

function vrLocomotion(s, dt) {
  const { player, camera, controllers, deadzone } = s;

  // pick any controller with gamepad axes
  const gp0 = controllers.c0?.gamepad;
  const gp1 = controllers.c1?.gamepad;

  const gp = gp0 || gp1;
  if (!gp || !gp.axes || gp.axes.length < 2) return;

  // standard: left stick axes are [0]=x, [1]=y on most devices
  let ax = gp.axes[0] ?? 0;
  let ay = gp.axes[1] ?? 0;

  // deadzone
  if (Math.abs(ax) < deadzone) ax = 0;
  if (Math.abs(ay) < deadzone) ay = 0;

  // move direction relative to headset yaw
  // (we ignore pitch so you don’t fly)
  const yaw = getHeadYaw(camera);
  const cos = Math.cos(yaw), sin = Math.sin(yaw);

  // forward is -ay (stick up gives negative)
  const x = ax;
  const z = ay;

  const mx = x * cos - z * sin;
  const mz = x * sin + z * cos;

  player.position.x += mx * s.moveSpeed * dt;
  player.position.z += mz * s.moveSpeed * dt;

  // snap turn using right stick if available
  let rx = gp.axes[2] ?? 0;
  if (Math.abs(rx) < deadzone) rx = 0;

  s.turnCooldown = Math.max(0, s.turnCooldown - dt);
  if (s.turnCooldown === 0 && rx !== 0) {
    const dir = rx > 0 ? -1 : 1;
    // rotate the rig around the user
    player.rotation.y += dir * s.turnSnap;
    s.turnCooldown = 0.25;
  }
}

function getHeadYaw(camera) {
  // extract yaw from camera quaternion
  const q = camera.quaternion;
  const ysqr = q.y * q.y;

  // yaw (y-axis rotation)
  const t3 = +2.0 * (q.w * q.y + q.z * q.x);
  const t4 = +1.0 - 2.0 * (ysqr + q.x * q.x);
  return Math.atan2(t3, t4);
}

function setRigToAnchor(s, anchor) {
  s.player.position.set(anchor.pos.x, anchor.pos.y, anchor.pos.z);

  // for non-XR, we can set yaw by camera rotation
  if (!s.renderer.xr.isPresenting) {
    s.camera.rotation.set(0, anchor.yaw, 0);
  }
}
