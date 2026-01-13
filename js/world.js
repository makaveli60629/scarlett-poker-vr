// /js/world.js
export const World = {
  async init({ THREE, scene, renderer, camera, player, controllers, log, BUILD }) {
    const state = {
      THREE, scene, renderer, camera, player, controllers, log, BUILD,
      root: new THREE.Group(),
      room: "lobby",
      anchors: {},
      hoverCars: [],
      lasers: [],
      ui: null,
      tmpV: new THREE.Vector3(),
      tmpQ: new THREE.Quaternion(),
      tmpM: new THREE.Matrix4(),
      raycaster: new THREE.Raycaster(),
      interactables: [],
    };

    state.root.name = "WORLD_ROOT";
    scene.add(state.root);

    // ===== Lighting / Beautification =====
    addLights(state);
    addSkyAccent(state);

    // ===== Build Layout =====
    // Main lobby ring + pit divot + stairs + 4 rooms + store + spectate platform + scorpion room
    buildLobbyAndPit(state);
    buildRoomsAndHallways(state);
    buildStore(state);
    buildSpectate(state);
    buildScorpion(state);

    // ===== Hover cars =====
    buildHoverCars(state);

    // ===== XR Controllers + Lasers (fix: no longer stuck center) =====
    setupXRLasers(state);

    // ===== UI Panel (tables menu / quick nav) =====
    setupUIPanel(state);

    // ===== Spawn / Room anchors =====
    // Lobby spawn: standing, outside pit, facing centerpiece
    state.setRoom("lobby");

    log(`[world] FULL init ✅ build=${BUILD}`);
    return {
      setRoom: (r) => state.setRoom(r),
      update: (dt, t) => update(state, dt, t),
    };
  }
};

function addLights(s) {
  const { THREE, scene, root } = s;

  const hemi = new THREE.HemisphereLight(0xbad6ff, 0x0b0f1a, 0.75);
  hemi.position.set(0, 50, 0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(30, 60, 20);
  sun.castShadow = false;
  scene.add(sun);

  // Accent rings around pit
  const ring1 = new THREE.PointLight(0x8fb2ff, 0.9, 60, 2);
  ring1.position.set(0, 6, 0);
  root.add(ring1);

  const ring2 = new THREE.PointLight(0xff6bd6, 0.45, 40, 2);
  ring2.position.set(0, 2.0, 0);
  root.add(ring2);
}

function addSkyAccent(s) {
  const { THREE, root } = s;

  // simple faint dome
  const geo = new THREE.SphereGeometry(450, 24, 16);
  const mat = new THREE.MeshBasicMaterial({ color: 0x070a12, side: THREE.BackSide });
  const dome = new THREE.Mesh(geo, mat);
  dome.position.y = 0;
  root.add(dome);
}

function matFloor(THREE, color = 0x101722, rough = 0.98) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: 0.05
  });
}

function buildLobbyAndPit(s) {
  const { THREE, root } = s;

  // Dimensions
  const lobbyR = 18;
  const walkRingInner = 7.2;
  const pitRadius = 6.6;

  const lobbyY = 0;
  const pitDepth = 2.6;         // the divot depth (DOWN)
  const pitFloorY = lobbyY - pitDepth;

  // --- Lobby floor disc (outer)
  const lobbyFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(lobbyR, lobbyR, 0.35, 64),
    matFloor(THREE, 0x0f1724)
  );
  lobbyFloor.position.set(0, lobbyY - 0.175, 0);
  root.add(lobbyFloor);

  // --- Pit floor disc (lowered)
  const pitFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, 0.35, 64),
    matFloor(THREE, 0x0b0f1a)
  );
  pitFloor.position.set(0, pitFloorY - 0.175, 0);
  root.add(pitFloor);

  // --- Walk ring (a raised ring around pit to look down)
  const ringGeo = new THREE.RingGeometry(walkRingInner, lobbyR - 0.6, 64);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({
    color: 0x142033, roughness: 0.95, metalness: 0.08, side: THREE.DoubleSide
  }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = lobbyY + 0.01;
  root.add(ring);

  // --- Pit wall (cylinder side)
  const pitWall = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 64, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0c1220, roughness: 0.9, metalness: 0.08, side: THREE.DoubleSide })
  );
  pitWall.position.set(0, (lobbyY + pitFloorY) / 2, 0);
  root.add(pitWall);

  // --- Table placeholder in pit (lowered)
  const table = new THREE.Group();
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.8, 0.35, 32),
    new THREE.MeshStandardMaterial({ color: 0x123b2c, roughness: 0.75, metalness: 0.05 })
  );
  tableTop.position.y = 0.95;
  table.add(tableTop);

  const tableBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 1.2, 1.2, 20),
    new THREE.MeshStandardMaterial({ color: 0x1d2431, roughness: 0.6, metalness: 0.2 })
  );
  tableBase.position.y = 0.35;
  table.add(tableBase);

  table.position.set(0, pitFloorY + 0.15, 0);
  root.add(table);

  // --- Guardrail around pit edge
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(pitRadius + 0.35, 0.08, 12, 64),
    new THREE.MeshStandardMaterial({ color: 0xc8d3ff, roughness: 0.3, metalness: 0.55 })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = lobbyY + 0.85;
  root.add(rail);

  // --- STAIR FIX (start in pit → go UP to lobby)
  // We build a ramp-style stair set anchored at pit floor and rising to lobby height.
  const stairW = 2.1;
  const stairL = 7.6;
  const stairRise = pitDepth;  // must climb up pitDepth
  const stair = new THREE.Mesh(
    new THREE.BoxGeometry(stairW, stairRise, stairL),
    new THREE.MeshStandardMaterial({ color: 0x141b28, roughness: 0.95, metalness: 0.08 })
  );

  // Place it so bottom is at pit floor and top meets lobby floor
  // ramp center Y is midway between pit floor and lobby floor
  stair.position.set(0, (lobbyY + pitFloorY) / 2, pitRadius + stairL * 0.32);

  // Tilt it so it goes UP toward lobby (this is the direction fix)
  // Positive tilt around X makes +Z go downward; we want +Z to go UP, so tilt the other way.
  stair.rotation.x = +Math.atan2(stairRise, stairL); // goes upward as Z increases from pit to lobby
  root.add(stair);

  // Add small side rails on stairs
  const sideMat = new THREE.MeshStandardMaterial({ color: 0x2b3b5f, roughness: 0.6, metalness: 0.2 });
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.08, stairRise * 0.9, stairL * 0.92), sideMat);
  const sideR = sideL.clone();
  sideL.position.set(-stairW * 0.52, 0.0, 0);
  sideR.position.set(+stairW * 0.52, 0.0, 0);
  stair.add(sideL, sideR);

  // --- Anchors (spawn points)
  s.anchors.lobby = { pos: new THREE.Vector3(0, 0, 10.5), yaw: Math.PI };
  s.anchors.store = { pos: new THREE.Vector3(-26, 0, 0), yaw: Math.PI / 2 };
  s.anchors.scorpion = { pos: new THREE.Vector3(26, 0, 0), yaw: -Math.PI / 2 };
  s.anchors.spectate = { pos: new THREE.Vector3(0, 3.2, -14), yaw: 0 };

  // --- Simple “head boxes” placeholders in pit (so you see bodies again)
  // These were getting buried before; now they sit correctly relative to pit floor.
  const npcMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.85, metalness: 0.05 });
  for (let i = 0; i < 6; i++) {
    const npc = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.8, 6, 10), npcMat);
    body.position.y = 0.75;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshStandardMaterial({ color: 0xd8c7b2, roughness: 0.9 }));
    head.position.y = 1.45;
    npc.add(body, head);

    const ang = (i / 6) * Math.PI * 2;
    const r = 3.8;
    npc.position.set(Math.cos(ang) * r, pitFloorY + 0.2, Math.sin(ang) * r);
    npc.lookAt(0, pitFloorY + 0.2, 0);
    root.add(npc);
  }
}

function buildRoomsAndHallways(s) {
  const { THREE, root } = s;

  // Four rooms around lobby
  const roomDist = 28;
  const roomSize = 10;
  const wallH = 4.6;

  const roomMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95, metalness: 0.08 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x2b3b5f, roughness: 0.6, metalness: 0.2 });

  const rooms = [
    { name: "north", x: 0, z: -roomDist },
    { name: "south", x: 0, z: roomDist },
    { name: "west",  x: -roomDist, z: 0 },
    { name: "east",  x: roomDist, z: 0 },
  ];

  for (const r of rooms) {
    // room floor
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize * 2.2, 0.35, roomSize * 2.2),
      matFloor(THREE, 0x0f1724)
    );
    floor.position.set(r.x, -0.175, r.z);
    root.add(floor);

    // room “walls” (simple box frame)
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize * 2.2, wallH, roomSize * 2.2),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.92, metalness: 0.08, transparent: true, opacity: 0.45 })
    );
    walls.position.set(r.x, wallH / 2 - 0.175, r.z);
    root.add(walls);

    // doorway trim facing lobby
    const trim = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.2, 0.25), trimMat);
    trim.position.set(r.x, 1.55, r.z);
    if (r.name === "north") trim.position.z += roomSize * 1.1;
    if (r.name === "south") trim.position.z -= roomSize * 1.1;
    if (r.name === "west")  { trim.position.x += roomSize * 1.1; trim.rotation.y = Math.PI/2; }
    if (r.name === "east")  { trim.position.x -= roomSize * 1.1; trim.rotation.y = Math.PI/2; }
    root.add(trim);

    // hallway from lobby to room
    const hallLen = 12;
    const hall = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.35, hallLen),
      matFloor(THREE, 0x101a2a)
    );
    hall.position.y = -0.175;

    if (r.name === "north") hall.position.set(0, -0.175, -18);
    if (r.name === "south") hall.position.set(0, -0.175, 18);
    if (r.name === "west")  { hall.position.set(-18, -0.175, 0); hall.rotation.y = Math.PI/2; }
    if (r.name === "east")  { hall.position.set(18, -0.175, 0); hall.rotation.y = Math.PI/2; }

    root.add(hall);
  }
}

function buildStore(s) {
  const { THREE, root } = s;

  // Store area (west anchor region)
  const store = new THREE.Group();
  store.name = "STORE";
  store.position.set(-26, 0, 0);
  root.add(store);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 18), matFloor(THREE, 0x0f1724));
  floor.position.y = -0.175;
  store.add(floor);

  const glow = new THREE.PointLight(0x66ccff, 0.8, 35, 2);
  glow.position.set(0, 3.5, 0);
  store.add(glow);

  // mannequins placeholders
  const mannequinMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.6, metalness: 0.05 });
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.2, 6, 10), mannequinMat);
    const x = -5 + i * 3.3;
    m.position.set(x, 1.1, -4);
    store.add(m);
  }

  // kiosk sign
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(10, 2.2, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x22345a, roughness: 0.35, metalness: 0.2 })
  );
  sign.position.set(0, 2.2, 7);
  store.add(sign);
}

function buildSpectate(s) {
  const { THREE, root } = s;

  const plat = new THREE.Mesh(
    new THREE.BoxGeometry(14, 0.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x101a2a, roughness: 0.9, metalness: 0.08 })
  );
  plat.position.set(0, 3.0, -14);
  root.add(plat);

  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(14, 1.1, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xc8d3ff, roughness: 0.35, metalness: 0.55 })
  );
  rail.position.set(0, 3.8, -11.2);
  root.add(rail);
}

function buildScorpion(s) {
  const { THREE, root } = s;

  const sc = new THREE.Group();
  sc.name = "SCORPION_ROOM";
  sc.position.set(26, 0, 0);
  root.add(sc);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 18), matFloor(THREE, 0x0d1320));
  floor.position.y = -0.175;
  sc.add(floor);

  const light = new THREE.PointLight(0xff6bd6, 1.0, 40, 2);
  light.position.set(0, 3.5, 0);
  sc.add(light);

  // centerpiece “portal”
  const portal = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.18, 16, 64),
    new THREE.MeshStandardMaterial({ color: 0xff6bd6, roughness: 0.2, metalness: 0.55 })
  );
  portal.rotation.x = Math.PI / 2;
  portal.position.set(0, 1.6, 0);
  sc.add(portal);
}

function buildHoverCars(s) {
  const { THREE, root } = s;

  const carGroup = new THREE.Group();
  carGroup.name = "COMMUNITY_CARS";
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

    const x = -10 + i * 5;
    car.position.set(x, 2.2, 0);
    car.rotation.y = (i - 2) * 0.18;

    carGroup.add(car);
    s.hoverCars.push({ obj: car, baseY: car.position.y, phase: i * 0.8 });
  }
}

function setupXRLasers(s) {
  const { THREE, controllers, log } = s;

  function makeLaser() {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x66ccff });
    const line = new THREE.Line(geom, mat);
    line.name = "Laser";
    line.scale.z = 12; // length
    return line;
  }

  // IMPORTANT FIX: laser must be a CHILD of the controller object.
  // If it’s in world space, it stays stuck in the center.
  const l0 = makeLaser();
  const l1 = makeLaser();

  controllers.c0.add(l0);
  controllers.c1.add(l1);

  s.lasers.push({ controller: controllers.c0, line: l0 });
  s.lasers.push({ controller: controllers.c1, line: l1 });

  // Small controller tips (visual)
  const tipGeo = new THREE.SphereGeometry(0.012, 10, 8);
  const tipMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.6 });
  const tip0 = new THREE.Mesh(tipGeo, tipMat);
  const tip1 = new THREE.Mesh(tipGeo, tipMat);
  tip0.position.set(0, 0, -0.03);
  tip1.position.set(0, 0, -0.03);
  controllers.c0.add(tip0);
  controllers.c1.add(tip1);

  log("[xr] lasers installed ✅ (controller-parented, not world-locked)");
}

function setupUIPanel(s) {
  const { THREE, root } = s;

  // Simple in-world panel near lobby (not buried)
  const panel = new THREE.Group();
  panel.name = "TABLES_MENU";
  panel.position.set(7.5, 1.8, 9.2);
  panel.rotation.y = -0.55;
  root.add(panel);

  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 2.0, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x1b2a44, roughness: 0.5, metalness: 0.2 })
  );
  panel.add(backing);

  // Buttons (interactable boxes)
  const btnMat = new THREE.MeshStandardMaterial({ color: 0x2b3b5f, roughness: 0.55, metalness: 0.18 });
  const btnGeo = new THREE.BoxGeometry(3.0, 0.36, 0.12);

  const labels = ["Tables", "Store", "Spectate", "Scorpion"];
  for (let i = 0; i < labels.length; i++) {
    const btn = new THREE.Mesh(btnGeo, btnMat.clone());
    btn.position.set(0, 0.55 - i * 0.48, 0.1);
    btn.name = `BTN_${labels[i].toUpperCase()}`;
    panel.add(btn);
    s.interactables.push(btn);
  }

  s.ui = panel;
}

function update(s, dt, t) {
  // Hover cars animation
  for (const c of s.hoverCars) {
    c.obj.position.y = c.baseY + Math.sin(t * 1.3 + c.phase) * 0.25;
    c.obj.rotation.y += dt * 0.12;
  }

  // Laser “hit test” (simple: show shorter line when hitting UI buttons)
  // This keeps it stable and prevents “stuck center” because it’s controller-parented.
  for (const L of s.lasers) {
    const ctrl = L.controller;
    const line = L.line;

    // In XR only; outside XR these controllers may not be active.
    if (!s.renderer.xr.isPresenting) {
      line.visible = false;
      continue;
    }
    line.visible = true;

    // Ray from controller
    s.tmpM.identity().extractRotation(ctrl.matrixWorld);
    const origin = s.tmpV.setFromMatrixPosition(ctrl.matrixWorld);
    const dir = new s.THREE.Vector3(0, 0, -1).applyMatrix4(s.tmpM).normalize();

    s.raycaster.set(origin, dir);
    const hits = s.raycaster.intersectObjects(s.interactables, false);

    if (hits.length) {
      // shorten line to hit point distance
      const d = hits[0].distance;
      line.scale.z = Math.max(0.2, Math.min(12, d));

      // highlight hit button
      const hitObj = hits[0].object;
      hitObj.material.emissive = new s.THREE.Color(0x223cff);
      hitObj.material.emissiveIntensity = 0.35;

      // fade others
      for (const obj of s.interactables) {
        if (obj !== hitObj) {
          obj.material.emissive = new s.THREE.Color(0x000000);
          obj.material.emissiveIntensity = 0;
        }
      }
    } else {
      line.scale.z = 12;
      for (const obj of s.interactables) {
        obj.material.emissive = new s.THREE.Color(0x000000);
        obj.material.emissiveIntensity = 0;
      }
    }
  }
}

// Room switching (moves PlayerRig cleanly)
World.prototype = {}; // (no-op, keeps tooling happy)

function setRigToAnchor(s, anchor) {
  const { player, camera } = s;

  player.position.set(anchor.pos.x, anchor.pos.y, anchor.pos.z);

  // yaw only; camera pitch handled by user input
  // We rotate camera for desktop; XR ignores camera rotation and uses headset pose.
  camera.rotation.set(0, anchor.yaw, 0);
}

function addSetRoomCapability(s) {
  s.setRoom = (room) => {
    s.room = room;

    const a = s.anchors[room] || s.anchors.lobby;
    setRigToAnchor(s, a);
    s.log?.(`[rm] room=${room} ✅`);
  };
}

// Attach capability right after init (simple pattern)
Object.defineProperty(World, "init", {
  value: async function({ THREE, scene, renderer, camera, player, controllers, log, BUILD }) {
    const w = await (async () => {
      const base = await (async () => {
        const inst = await (async () => {
          const api = await (async () => {
            const result = await (async () => {
              // call original init body (defined above)
              // (We can’t “super” easily in this file-only style, so we rebuild pattern safely.)
              return await (async () => {
                // Re-run the exact init from exported object above:
                // (This is a small trick: use the exported World.init logic by calling the original function reference.)
                // Since we overwrote property descriptor, we need to call the internal function we already wrote:
                // We'll just reconstruct by calling the top-level init logic in-place:
                // NOTE: to keep it simple, we just call the same build steps again here.

                const state = {
                  THREE, scene, renderer, camera, player, controllers, log, BUILD,
                  root: new THREE.Group(),
                  room: "lobby",
                  anchors: {},
                  hoverCars: [],
                  lasers: [],
                  ui: null,
                  tmpV: new THREE.Vector3(),
                  tmpQ: new THREE.Quaternion(),
                  tmpM: new THREE.Matrix4(),
                  raycaster: new THREE.Raycaster(),
                  interactables: [],
                };

                state.root.name = "WORLD_ROOT";
                scene.add(state.root);

                addLights(state);
                addSkyAccent(state);
                buildLobbyAndPit(state);
                buildRoomsAndHallways(state);
                buildStore(state);
                buildSpectate(state);
                buildScorpion(state);
                buildHoverCars(state);
                setupXRLasers(state);
                setupUIPanel(state);

                addSetRoomCapability(state);

                state.setRoom("lobby");

                log?.(`[world] FULL init ✅ build=${BUILD}`);
                return {
                  setRoom: (r) => state.setRoom(r),
                  update: (dt, t) => update(state, dt, t),
                };
              })();
            })();
            return result;
          })();
          return api;
        })();
        return inst;
      })();
      return base;
    })();
    return w;
  }
});
