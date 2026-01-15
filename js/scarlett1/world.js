// /js/scarlett1/world.js — Scarlett 1.0 World (SAFE • SPAWN PADS • DIVOT PIT)
// Exports initWorld() used by boot.
// No external dependencies besides THREE provided by boot.

export function makeWorld() {
  return {
    group: null,
    colliders: [],
    spawnPads: [],
    table: null,
    chairs: [],
    signs: [],
    tickers: [],
    t: 0
  };
}

function mat(THREE, color, rough = 0.9, metal = 0.0) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

function addCollider(world, mesh) {
  mesh.userData.collider = true;
  world.colliders.push(mesh);
}

function addSpawnPad(world, THREE, pos, yaw = 0, name = "PAD") {
  const g = new THREE.CircleGeometry(0.35, 32);
  const m = new THREE.MeshStandardMaterial({
    color: 0x2aa7ff,
    roughness: 0.6,
    metalness: 0.2,
    transparent: true,
    opacity: 0.35
  });
  const pad = new THREE.Mesh(g, m);
  pad.rotation.x = -Math.PI / 2;
  pad.position.copy(pos);
  pad.userData.spawnPad = { yaw, name };
  world.spawnPads.push(pad);

  // small label pillar
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 12), mat(THREE, 0x0b1b2a, 0.8, 0.2));
  pole.position.set(pos.x, pos.y + 0.25, pos.z);
  world.group.add(pole);

  world.group.add(pad);
  return pad;
}

function safeLog(diag, ...a) {
  try {
    const s = a.join(" ");
    if (diag?.log) diag.log(s);
    else if (window.__SCARLETT_DIAG_LOG__) window.__SCARLETT_DIAG_LOG__(s);
    else console.log("[world]", s);
  } catch {}
}

function buildFloor(world, THREE) {
  // Large base floor
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(14, 64),
    mat(THREE, 0x0a0f18, 0.95, 0.05)
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  world.group.add(floor);
  addCollider(world, floor);

  // subtle ring tile bands (no textures)
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2 + i * 2.2, 2.8 + i * 2.2, 80),
      new THREE.MeshStandardMaterial({
        color: i % 2 ? 0x0f1a2b : 0x0c1422,
        roughness: 0.95,
        metalness: 0.05,
        transparent: true,
        opacity: 0.8
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.002;
    world.group.add(ring);
  }
}

function buildLobbyWalls(world, THREE) {
  // Solid outer wall ring (with 4 doorway gaps)
  const wallMat = mat(THREE, 0x111a2a, 0.85, 0.15);

  const R = 12.5;
  const H = 3.0;
  const thickness = 0.4;

  // Four segments between doors:
  // Doors centered at 0, 90, 180, 270 degrees
  const doorWidth = 3.2;

  function wallSegment(angleCenter, arcLen) {
    // approximate segment with box oriented
    const w = arcLen;
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, H, thickness), wallMat);
    const x = Math.cos(angleCenter) * R;
    const z = Math.sin(angleCenter) * R;
    box.position.set(x, H / 2, z);
    box.rotation.y = -angleCenter + Math.PI / 2;
    box.castShadow = true;
    box.receiveShadow = true;
    world.group.add(box);
    addCollider(world, box);
    return box;
  }

  // Compute arc pieces as straight boxes: 4 big pieces each side between door gaps
  const totalCirc = 2 * Math.PI * R;
  const quarter = totalCirc / 4;
  const gap = doorWidth;
  const seg = quarter - gap;

  wallSegment(0 + Math.PI / 4, seg);
  wallSegment(Math.PI / 2 + Math.PI / 4, seg);
  wallSegment(Math.PI + Math.PI / 4, seg);
  wallSegment(3 * Math.PI / 2 + Math.PI / 4, seg);

  // Door frames (visual only)
  const frameMat = mat(THREE, 0x223252, 0.7, 0.2);
  for (let i = 0; i < 4; i++) {
    const ang = i * (Math.PI / 2);
    const x = Math.cos(ang) * R;
    const z = Math.sin(ang) * R;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, 2.6, 0.25), frameMat);
    frame.position.set(x, 1.3, z);
    frame.rotation.y = -ang + Math.PI / 2;
    world.group.add(frame);
  }
}

function buildHallways(world, THREE) {
  const hallMat = mat(THREE, 0x0e1626, 0.9, 0.05);
  const wallMat = mat(THREE, 0x101a2b, 0.85, 0.1);

  function hallway(angle, length, width) {
    const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const start = dir.clone().multiplyScalar(12.5); // at door
    const center = start.clone().add(dir.clone().multiplyScalar(length / 2));

    // floor
    const f = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, length), hallMat);
    f.position.set(center.x, 0.05, center.z);
    f.rotation.y = -angle + Math.PI / 2;
    world.group.add(f);
    addCollider(world, f);

    // side walls
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.6, length), wallMat);
    const w2 = w1.clone();
    w1.position.set(center.x + dir.z * (width / 2), 1.3, center.z - dir.x * (width / 2));
    w2.position.set(center.x - dir.z * (width / 2), 1.3, center.z + dir.x * (width / 2));
    w1.rotation.y = f.rotation.y;
    w2.rotation.y = f.rotation.y;
    world.group.add(w1, w2);
    addCollider(world, w1);
    addCollider(world, w2);
  }

  hallway(0, 8, 3.2);              // EAST
  hallway(Math.PI / 2, 8, 3.2);    // NORTH
  hallway(Math.PI, 8, 3.2);        // WEST
  hallway(3 * Math.PI / 2, 8, 3.2);// SOUTH
}

function buildPitTable(world, THREE) {
  // Divot pit
  const pit = new THREE.Mesh(
    new THREE.CylinderGeometry(4.3, 4.3, 0.5, 64),
    mat(THREE, 0x070b12, 1.0, 0.0)
  );
  pit.position.y = -0.25;
  world.group.add(pit);

  const pitLip = new THREE.Mesh(
    new THREE.RingGeometry(4.25, 4.7, 64),
    new THREE.MeshStandardMaterial({ color: 0x1a2a44, roughness: 0.8, metalness: 0.2, transparent: true, opacity: 0.85 })
  );
  pitLip.rotation.x = -Math.PI / 2;
  pitLip.position.y = 0.005;
  world.group.add(pitLip);

  // Guard rail
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(4.8, 0.08, 16, 120),
    mat(THREE, 0x243553, 0.65, 0.25)
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.95;
  world.group.add(rail);

  // Table base (down in pit)
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.6, 0.8, 32),
    mat(THREE, 0x141a24, 0.9, 0.1)
  );
  base.position.y = 0.15;
  world.group.add(base);

  // Table top
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 0.22, 48),
    mat(THREE, 0x12321f, 0.85, 0.05)
  );
  top.position.y = 0.65;
  top.castShadow = true;
  top.receiveShadow = true;
  world.group.add(top);
  addCollider(world, top);

  // Simple “felt ring” decoration
  const felt = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 2.45, 80),
    new THREE.MeshStandardMaterial({ color: 0x0e5a3a, roughness: 0.95, metalness: 0.0, transparent: true, opacity: 0.9 })
  );
  felt.rotation.x = -Math.PI / 2;
  felt.position.y = 0.77;
  world.group.add(felt);

  world.table = top;

  // Chairs placeholders around
  const chairMat = mat(THREE, 0x1b2a44, 0.85, 0.15);
  const chairGeo = new THREE.BoxGeometry(0.55, 0.85, 0.55);

  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const r = 3.8;
    const c = new THREE.Mesh(chairGeo, chairMat);
    c.position.set(Math.cos(ang) * r, 0.42, Math.sin(ang) * r);
    c.rotation.y = -ang + Math.PI;
    c.castShadow = true;
    c.receiveShadow = true;
    world.group.add(c);
    addCollider(world, c);
    world.chairs.push(c);
  }
}

function addLights(world, THREE) {
  const hemi = new THREE.HemisphereLight(0x9ecbff, 0x09111c, 0.65);
  world.group.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 0.8);
  key.position.set(6, 10, 6);
  key.castShadow = true;
  world.group.add(key);

  const rim = new THREE.PointLight(0x2aa7ff, 0.9, 18, 2.0);
  rim.position.set(0, 2.6, -6);
  world.group.add(rim);

  const rim2 = new THREE.PointLight(0xff2aa7, 0.7, 18, 2.0);
  rim2.position.set(0, 2.6, 6);
  world.group.add(rim2);
}

function buildSigns(world, THREE, diag) {
  // lightweight log markers only
  const names = ["STORE", "VIP", "SCORP", "GAMES"];
  names.forEach(n => safeLog(diag, `sign:`, n));
}

export async function initWorld(ctx = {}) {
  const THREE = ctx.THREE || window.THREE;
  if (!THREE) throw new Error("THREE missing in initWorld(ctx)");

  const world = makeWorld();
  const scene = ctx.scene || ctx.rootScene || ctx.worldScene || new THREE.Scene();
  const diag = ctx.diag || null;

  world.group = new THREE.Group();
  world.group.name = "ScarlettWorld";
  scene.add(world.group);

  // Scene defaults
  scene.background = new THREE.Color(0x04070c);
  scene.fog = new THREE.Fog(0x04070c, 10, 40);

  addLights(world, THREE);
  buildFloor(world, THREE);
  buildLobbyWalls(world, THREE);
  buildHallways(world, THREE);
  buildPitTable(world, THREE);
  buildSigns(world, THREE, diag);

  // SPAWN PADS: never on the table, never inside walls
  // Put pads near the lobby inner ring, facing the table center.
  addSpawnPad(world, THREE, new THREE.Vector3(0, 0.001, 6.2), Math.PI, "SOUTH_PAD");
  addSpawnPad(world, THREE, new THREE.Vector3(0, 0.001, -6.2), 0, "NORTH_PAD");
  addSpawnPad(world, THREE, new THREE.Vector3(6.2, 0.001, 0), -Math.PI / 2, "EAST_PAD");
  addSpawnPad(world, THREE, new THREE.Vector3(-6.2, 0.001, 0), Math.PI / 2, "WEST_PAD");

  // Pick a default spawn pad (south pad)
  world.getDefaultSpawn = () => world.spawnPads[0] || null;

  // Provide a helper for XR/Android systems
  world.getSpawnTransform = (index = 0) => {
    const pad = world.spawnPads[Math.max(0, Math.min(world.spawnPads.length - 1, index))];
    if (!pad) return { position: new THREE.Vector3(0, 0, 6), yaw: Math.PI };
    return { position: pad.position.clone().add(new THREE.Vector3(0, 0.0, 0)), yaw: pad.userData.spawnPad?.yaw ?? 0 };
  };

  // Minimal tick
  world.tick = (dt) => {
    world.t += dt;
  };

  // Expose for debugging
  ctx.world = world;

  safeLog(diag, "initWorld() start");
  return { world, scene };
}

// default export for older callers
export default { initWorld };
