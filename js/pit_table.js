// /js/pit_table.js — Deep Pit + Stairs + Rail + Seat Anchors (FULL)

export function buildPitAndTable({
  THREE, root, log,
  center = new THREE.Vector3(0, 0, 0),
  pitRadius = 6.8,
  pitDepth = 2.25,          // ✅ deeper
  rimWidth = 2.2,
  roomRadius = 22,
}) {
  const g = new THREE.Group();
  g.name = "PitSystem";
  g.position.copy(center);
  root.add(g);

  // ---------- Materials ----------
  const matFloor = new THREE.MeshStandardMaterial({ color: 0x2a2c32, roughness: 0.95, metalness: 0.05 });
  const matPit   = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.9, metalness: 0.05 });
  const matRim   = new THREE.MeshStandardMaterial({ color: 0x3a3d45, roughness: 0.9, metalness: 0.08 });
  const matStair = new THREE.MeshStandardMaterial({ color: 0x333741, roughness: 0.9, metalness: 0.08 });
  const matRail  = new THREE.MeshStandardMaterial({ color: 0x5a5f6b, roughness: 0.55, metalness: 0.35 });

  // ---------- Main floor ----------
  const floor = new THREE.Mesh(new THREE.CircleGeometry(roomRadius, 128), matFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = "FloorMain";
  g.add(floor);

  // ---------- Pit bowl (simple stepped cylinder) ----------
  // We fake a bowl with 2 cylinders: inner pit + rim ring.
  const pit = new THREE.Mesh(new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 96, 1, true), matPit);
  pit.position.y = -pitDepth / 2;
  pit.name = "PitWall";
  g.add(pit);

  const pitBottom = new THREE.Mesh(new THREE.CircleGeometry(pitRadius - 0.15, 96), matPit);
  pitBottom.rotation.x = -Math.PI / 2;
  pitBottom.position.y = -pitDepth;
  pitBottom.name = "PitBottom";
  g.add(pitBottom);

  // Rim ring (walkable)
  const rimOuter = pitRadius + rimWidth;
  const rim = new THREE.Mesh(
    new THREE.RingGeometry(pitRadius, rimOuter, 128),
    matRim
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.01;
  rim.name = "PitRim";
  g.add(rim);

  // ---------- Guard rail around pit ----------
  const rail = new THREE.Group();
  rail.name = "GuardRail";
  g.add(rail);

  const railR = pitRadius + 0.35;
  const posts = 28;
  for (let i = 0; i < posts; i++) {
    const a = (i / posts) * Math.PI * 2;
    const x = Math.cos(a) * railR;
    const z = Math.sin(a) * railR;

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.05, 12), matRail);
    post.position.set(x, 0.55, z);
    rail.add(post);
  }
  const bar = new THREE.Mesh(new THREE.TorusGeometry(railR, 0.05, 12, 180), matRail);
  bar.rotation.x = Math.PI / 2;
  bar.position.y = 1.05;
  rail.add(bar);

  // ---------- Stairs (no interference) ----------
  // Single stair entrance at angle 220° by default.
  const stairs = new THREE.Group();
  stairs.name = "PitStairs";
  g.add(stairs);

  const stairAngle = THREE.MathUtils.degToRad(220);
  const stairBaseR = pitRadius + 0.65;
  const stairStart = new THREE.Vector3(Math.cos(stairAngle) * stairBaseR, 0, Math.sin(stairAngle) * stairBaseR);

  const steps = 10;
  const stepH = pitDepth / steps;
  const stepD = 0.55;
  const stepW = 2.0;

  for (let i = 0; i < steps; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), matStair);
    step.position.set(
      stairStart.x + Math.cos(stairAngle) * (i * (stepD * 0.95)),
      -stepH * 0.5 - i * stepH,
      stairStart.z + Math.sin(stairAngle) * (i * (stepD * 0.95))
    );
    step.rotation.y = -stairAngle + Math.PI / 2;
    step.name = `Step_${i}`;
    stairs.add(step);
  }

  // ---------- Table anchor in pit ----------
  const tableAnchor = new THREE.Group();
  tableAnchor.name = "TableAnchor";
  tableAnchor.position.set(0, -pitDepth + 0.06, 0);
  g.add(tableAnchor);

  // ---------- Seat anchors around table ----------
  // six seats around a ring inside pit
  const seats = [];
  const seatR = 3.55;
  const seatCount = 6;
  for (let i = 0; i < seatCount; i++) {
    const a = (i / seatCount) * Math.PI * 2 + Math.PI; // face toward +Z-ish
    const s = new THREE.Group();
    s.name = `SeatAnchor_${i}`;
    s.position.set(Math.cos(a) * seatR, -pitDepth + 0.06, Math.sin(a) * seatR);
    // face the center
    s.lookAt(0, s.position.y, 0);
    seats.push(s);
    g.add(s);
  }

  // Colliders (walkable surfaces)
  const colliders = [floor, rim, pitBottom, ...stairs.children];

  log && log("[world] pit/stairs/rail ✅ (deep + aligned)");

  return {
    group: g,
    colliders,
    tableAnchor,
    seatAnchors: seats,
    pitDepth,
    pitRadius,
  };
}
