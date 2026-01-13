// /js/world_builders.js — World Geometry Pack (FULL, stable)
// Safe: pure geometry + lights, no external deps.

export function buildWorld(ctx) {
  const { THREE, scene, root, manifest } = ctx;
  const safe = !!manifest.get("flags.safeMode");

  // ENV
  scene.background = new THREE.Color(0x05070d);
  scene.fog = new THREE.Fog(0x05070d, 12, 110);

  // Lobby + Pit + Balcony + Rooms + Store + Scorpion + Spectate + Poker stage
  buildLobbyRing(ctx, safe);
  buildPitCenterpiece(ctx, safe);
  buildBalcony(ctx, safe);
  buildRoomsAndHallways(ctx);
  buildStore(ctx, safe);
  buildScorpion(ctx);
  buildSpectatePlatform(ctx);
  buildPokerStage(ctx);

  // Little “front desk” / spawn marker
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.9, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.6, metalness: 0.25, emissive: safe ? 0x000000 : 0x223cff, emissiveIntensity: safe ? 0 : 0.12 })
  );
  desk.position.set(0, 0.45, 12.4);
  root.add(desk);
}

function matFloor(THREE, color = 0x121c2c) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.06 });
}

function buildLobbyRing(ctx, safe) {
  const { THREE, root } = ctx;

  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(22, 22, 10, 64, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x0b1220, roughness: 0.9, metalness: 0.1,
      side: THREE.DoubleSide, transparent: true, opacity: safe ? 0.35 : 0.55
    })
  );
  shell.position.set(0, 4.2, 0);
  root.add(shell);

  const lobbyFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 18, 0.35, 64),
    matFloor(THREE, 0x121c2c)
  );
  lobbyFloor.position.set(0, -0.175, 0);
  root.add(lobbyFloor);

  if (!safe) {
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x66ccff, roughness: 0.3, metalness: 0.6,
      emissive: new THREE.Color(0x66ccff),
      emissiveIntensity: 0.45
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(16.5, 0.12, 12, 96), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 8.8, 0);
    root.add(ring);
  }
}

function angleDelta(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function buildPitCenterpiece(ctx, safe) {
  const { THREE, root } = ctx;

  const pitRadius = 7.1;
  const pitDepth = 3.0;
  const pitFloorY = -pitDepth;

  const pitFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, 0.35, 64),
    matFloor(THREE, 0x0c1220)
  );
  pitFloor.position.set(0, pitFloorY - 0.175, 0);
  root.add(pitFloor);

  const pitWall = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 64, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0a101e, roughness: 0.95, metalness: 0.06, side: THREE.DoubleSide })
  );
  pitWall.position.set(0, pitFloorY / 2, 0);
  root.add(pitWall);

  // ramp entrance (+Z)
  const stairL = 8.4;
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, pitDepth, stairL),
    new THREE.MeshStandardMaterial({ color: 0x141b28, roughness: 0.95, metalness: 0.08 })
  );
  ramp.position.set(0, pitFloorY / 2, pitRadius + stairL * 0.32);
  ramp.rotation.x = -Math.atan2(pitDepth, stairL);
  root.add(ramp);

  // rail ring around pit (skip entrance)
  const railR = pitRadius + 1.35;
  const railY = 0.95;
  const segs = 40;

  const railMat = new THREE.MeshStandardMaterial({
    color: 0x1c2433, roughness: 0.5, metalness: 0.22,
    emissive: safe ? new THREE.Color(0x000000) : new THREE.Color(0x223cff),
    emissiveIntensity: safe ? 0 : 0.12
  });

  const entranceAngle = Math.PI / 2;
  const entranceHalfWidth = 0.32;

  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const amid = (a0 + a1) * 0.5;

    const d = angleDelta(amid, entranceAngle);
    if (Math.abs(d) < entranceHalfWidth) continue;

    const x = Math.cos(amid) * railR;
    const z = Math.sin(amid) * railR;

    const railSeg = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.18, 0.32), railMat);
    railSeg.position.set(x, railY, z);
    railSeg.rotation.y = -amid;
    root.add(railSeg);
  }

  // felt pad (PokerSystem will put instanced cards/chips here)
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(3.05, 3.25, 0.35, 64),
    new THREE.MeshStandardMaterial({ color: 0x134536, roughness: 0.78, metalness: 0.04 })
  );
  felt.position.set(0, pitFloorY + 1.05, 0);
  root.add(felt);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(3.25, 0.14, 14, 72),
    new THREE.MeshStandardMaterial({ color: 0x1c2433, roughness: 0.5, metalness: 0.22 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, pitFloorY + 1.18, 0);
  root.add(rim);
}

function buildBalcony(ctx, safe) {
  const { THREE, root } = ctx;
  const y = 3.0;
  const outerR = 16.8;
  const innerR = 14.2;

  const balcony = new THREE.Mesh(
    new THREE.RingGeometry(innerR, outerR, 96),
    matFloor(THREE, 0x10192a)
  );
  balcony.rotation.x = -Math.PI / 2;
  balcony.position.y = y;
  root.add(balcony);

  if (!safe) {
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x121c2c, roughness: 0.55, metalness: 0.25,
      emissive: new THREE.Color(0x66ccff), emissiveIntensity: 0.08
    });

    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.9, 12), railMat);
      post.position.set(Math.cos(a) * outerR, y + 0.45, Math.sin(a) * outerR);
      root.add(post);
    }
  }
}

function buildRoomsAndHallways(ctx) {
  const { THREE, root } = ctx;
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

    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize * 2.2, wallH, roomSize * 2.2),
      new THREE.MeshStandardMaterial({
        color: 0x0b1220, roughness: 0.92, metalness: 0.08,
        transparent: true, opacity: 0.35
      })
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
  }
}

function buildStore(ctx, safe) {
  const { THREE, root } = ctx;

  const store = new THREE.Group();
  store.position.set(-26, 0, 0);
  root.add(store);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 18), matFloor(THREE, 0x111a28));
  floor.position.y = -0.175;
  store.add(floor);

  const glow = new THREE.PointLight(0x66ccff, safe ? 0.7 : 1.0, 45, 2);
  glow.position.set(0, 3.5, 0);
  store.add(glow);

  const padMat = new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.9, metalness: 0.1 });
  const manMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.65, metalness: 0.08 });

  for (let i = 0; i < 5; i++) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.12, 22), padMat);
    pad.position.set(-6 + i * 3.0, 0.06, -4.4);
    store.add(pad);

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.2, 6, 10), manMat);
    body.position.set(pad.position.x, 1.1, pad.position.z);
    store.add(body);
  }
}

function buildScorpion(ctx) {
  const { THREE, root } = ctx;
  const sc = new THREE.Group();
  sc.position.set(26, 0, 0);
  root.add(sc);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 18), matFloor(THREE, 0x0f1724));
  floor.position.y = -0.175;
  sc.add(floor);

  const light = new THREE.PointLight(0xff6bd6, 1.0, 55, 2);
  light.position.set(0, 3.5, 0);
  sc.add(light);

  const tblMat = new THREE.MeshStandardMaterial({ color: 0x1b2a46, roughness: 0.7, metalness: 0.12 });
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.7, 0.22, 32), tblMat);
    t.position.set(-5 + i * 5, 0.9, 0);
    sc.add(t);
  }
}

function buildSpectatePlatform(ctx) {
  const { THREE, root } = ctx;
  const plat = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 6), matFloor(THREE, 0x121c2c));
  plat.position.set(0, 3.0, -14);
  root.add(plat);
}

function buildPokerStage(ctx) {
  const { THREE, root } = ctx;
  const stage = new THREE.Mesh(new THREE.CircleGeometry(10, 64), matFloor(THREE, 0x0f1724));
  stage.rotation.x = -Math.PI / 2;
  stage.position.set(0, 0.001, -9.5);
  root.add(stage);
    }
