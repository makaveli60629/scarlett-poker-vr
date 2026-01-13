// /js/world.js — FULL WORLD + FIXED QUEST STICKS (RIGHT HAND) v2
export const World = {
  async init({ THREE, scene, renderer, camera, player, controllers, log, BUILD }) {
    const s = {
      THREE, scene, renderer, camera, player, controllers, log, BUILD,
      root: new THREE.Group(),
      anchors: {},
      room: "lobby",

      // locomotion
      moveSpeed: 2.6,
      deadzone: 0.18,
      snapTurnRad: THREE.MathUtils.degToRad(30),
      turnCooldown: 0,

      // helpers
      raycaster: new THREE.Raycaster(),
      tmpM: new THREE.Matrix4(),
      tmpV: new THREE.Vector3(),
      tmpDir: new THREE.Vector3(),

      groundMeshes: [],
      lasers: [],
      reticles: [],

      hoverCars: [],
    };

    s.root.name = "WORLD_ROOT";
    scene.add(s.root);

    addLightsNotDark(s);
    buildLobbyAndPit_DOWNSTAIRS(s);      // ✅ stairs tilt DOWN into pit
    buildRoomsAndHallways(s);
    buildStore(s);
    buildSpectate(s);
    buildScorpion(s);
    buildHoverCars(s);

    setupXRLasers(s);
    setupFloorReticles(s);

    s.anchors.lobby = { pos: new THREE.Vector3(0, 0, 10.5), yaw: Math.PI };
    s.anchors.store = { pos: new THREE.Vector3(-26, 0, 0), yaw: Math.PI / 2 };
    s.anchors.scorpion = { pos: new THREE.Vector3(26, 0, 0), yaw: -Math.PI / 2 };
    s.anchors.spectate = { pos: new THREE.Vector3(0, 3.2, -14), yaw: 0 };

    setRigToAnchor(s, s.anchors.lobby);

    log?.(`[world] init ✅ FULL build=${BUILD}`);
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

  // table placeholder
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(2.7, 2.9, 0.4, 32),
    new THREE.MeshStandardMaterial({ color: 0x144235, roughness: 0.78, metalness: 0.05 })
  );
  table.position.set(0, pitFloorY + 0.95, 0);
  root.add(table);

  // rail
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(pitRadius + 0.35, 0.08, 12, 64),
    new THREE.MeshStandardMaterial({ color: 0xc8d3ff, roughness: 0.3, metalness: 0.55 })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = lobbyY + 0.85;
  root.add(rail);

  // ✅ DOWNSTAIRS ramp: from lobby down into pit
  const stairW = 2.1;
  const stairL = 7.6;
  const stairDrop = pitDepth;

  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(stairW, stairDrop, stairL),
    new THREE.MeshStandardMaterial({ color: 0x141b28, roughness: 0.95, metalness: 0.08 })
  );

  // put it on +Z side
  ramp.position.set(0, (lobbyY + pitFloorY) / 2, pitRadius + stairL * 0.32);

  // tilt DOWN toward pit center
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

  store.add(new THREE.PointLight(0x66ccff, 1.0, 45, 2)).position?.set(0, 3.5, 0);
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

function update(s, dt, t) {
  for (const c of s.hoverCars) {
    c.obj.position.y = c.baseY + Math.sin(t * 1.3 + c.phase) * 0.25;
  }

  updateLaserReticles(s);

  if (s.renderer.xr.isPresenting) {
    applyQuestRightStickLocomotion(s, dt);
  }
}

function updateLaserReticles(s) {
  const { renderer, raycaster, tmpM, tmpV, tmpDir } = s;

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

    const hits = raycaster.intersectObjects(s.groundMeshes, false);
    if (hits.length) {
      const h = hits[0];
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

/**
 * ✅ This is the FIX:
 * Read sticks from XRSession.inputSources gamepads, select RIGHT hand,
 * auto-detect which axes pair is the thumbstick, then move + snap turn.
 */
function applyQuestRightStickLocomotion(s, dt) {
  const session = s.renderer.xr.getSession?.();
  if (!session) return;

  // right-hand input source preferred
  let src =
    session.inputSources?.find(is => is?.handedness === "right" && is?.gamepad) ||
    session.inputSources?.find(is => is?.gamepad);

  if (!src || !src.gamepad) return;

  const gp = src.gamepad;
  const axes = gp.axes || [];
  if (axes.length < 2) return;

  // Auto-detect the active stick pair
  const pairs = [
    { a: 0, b: 1 },
    { a: 2, b: 3 }
  ].filter(p => axes.length > p.b);

  let movePair = pairs[0];
  let best = -1;

  for (const p of pairs) {
    const mag = Math.abs(axes[p.a] || 0) + Math.abs(axes[p.b] || 0);
    if (mag > best) { best = mag; movePair = p; }
  }

  let ax = axes[movePair.a] || 0; // strafe
  let ay = axes[movePair.b] || 0; // forward/back (usually up is -)
  if (Math.abs(ax) < s.deadzone) ax = 0;
  if (Math.abs(ay) < s.deadzone) ay = 0;

  // Movement relative to head yaw
  const yaw = getHeadYaw(s.camera);
  const cos = Math.cos(yaw), sin = Math.sin(yaw);

  // forward should be -ay for typical sticks
  const x = ax;
  const z = ay;

  const mx = x * cos - z * sin;
  const mz = x * sin + z * cos;

  s.player.position.x += mx * s.moveSpeed * dt;
  s.player.position.z += mz * s.moveSpeed * dt;

  // Snap turn: use the "other" pair if it exists; otherwise use same pair x.
  const turnPair = pairs.find(p => p !== movePair) || movePair;
  let tx = axes[turnPair.a] || 0;
  if (Math.abs(tx) < s.deadzone) tx = 0;

  s.turnCooldown = Math.max(0, s.turnCooldown - dt);
  if (s.turnCooldown === 0 && tx !== 0) {
    // right stick right -> turn right
    const dir = tx > 0 ? -1 : 1;
    s.player.rotation.y += dir * s.snapTurnRad;
    s.turnCooldown = 0.22;
  }
}

function getHeadYaw(camera) {
  const q = camera.quaternion;
  const t3 = +2.0 * (q.w * q.y + q.z * q.x);
  const t4 = +1.0 - 2.0 * (q.y * q.y + q.x * q.x);
  return Math.atan2(t3, t4);
}

function setRigToAnchor(s, anchor) {
  s.player.position.set(anchor.pos.x, anchor.pos.y, anchor.pos.z);
  if (!s.renderer.xr.isPresenting) {
    s.camera.rotation.set(0, anchor.yaw, 0);
  }
    }
