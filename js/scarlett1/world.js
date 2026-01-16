// /js/scarlett1/world.js — Scarlett World (SOUPED + QUEST OPTIMIZED)
// BUILD: WORLD_FULL_v2_1_QUEST_SAFE

export function buildWorld(ctx) {
  const { THREE, scene, rig, writeHud } = ctx;

  writeHud("[world] build starting… v2_1 QUEST SAFE");

  const CFG = {
    floorSize: 70,
    lobbyRadius: 7.5,
    glowRingRadius: 3.25,
    tableRadius: 1.25,
    tableY: 0.78,
    railRadius: 1.55,
    railY: 0.88,
    pillarRadius: 8.2,
    pillarHeight: 3.1,
    portalRadius: 6.6,
  };

  const world = { pulses: [], spins: [] };

  const MAT = {
    floor: new THREE.MeshStandardMaterial({ color: 0x0f1116, roughness: 1.0, metalness: 0.0 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x121826, roughness: 0.95, metalness: 0.05 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x1a2333, roughness: 0.7, metalness: 0.22 }),
    felt: new THREE.MeshStandardMaterial({ color: 0x1b6b3a, roughness: 0.95, metalness: 0.02 }),
    neonCyan: new THREE.MeshStandardMaterial({
      color: 0x082b2f, roughness: 0.65, metalness: 0.15,
      emissive: new THREE.Color(0x00e5ff), emissiveIntensity: 0.7
    }),
    neonPurple: new THREE.MeshStandardMaterial({
      color: 0x1a0e2a, roughness: 0.7, metalness: 0.12,
      emissive: new THREE.Color(0x7a1cff), emissiveIntensity: 0.6
    }),
    neonPink: new THREE.MeshStandardMaterial({
      color: 0x2a0b18, roughness: 0.7, metalness: 0.12,
      emissive: new THREE.Color(0xff2bd6), emissiveIntensity: 0.6
    }),
    portal: new THREE.MeshStandardMaterial({
      color: 0x0b1220, roughness: 0.85, metalness: 0.05,
      emissive: new THREE.Color(0x00e5ff), emissiveIntensity: 0.35
    }),
  };

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(CFG.floorSize, CFG.floorSize),
    MAT.floor
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // Lobby rings (CHEAP: low segments)
  const ring1 = torus(CFG.lobbyRadius, 0.08, MAT.dark, 10, 48);
  ring1.position.y = 0.02;
  ring1.rotation.x = Math.PI / 2;
  scene.add(ring1);

  const ringGlow = torus(CFG.lobbyRadius * 0.66, 0.06, MAT.neonPurple, 10, 48);
  ringGlow.position.y = 0.021;
  ringGlow.rotation.x = Math.PI / 2;
  scene.add(ringGlow);
  world.pulses.push({ obj: ringGlow, base: 0.45, amp: 0.25, speed: 0.9, type: "emissive" });

  // Center glow circle (CHEAP segments)
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(CFG.glowRingRadius - 0.12, CFG.glowRingRadius, 48),
    new THREE.MeshStandardMaterial({
      color: 0x051b1f,
      roughness: 0.85,
      metalness: 0.12,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(0x00e5ff),
      emissiveIntensity: 0.8
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.012;
  scene.add(glow);
  world.pulses.push({ obj: glow, base: 0.72, amp: 0.18, speed: 1.2, type: "opacity" });
  world.pulses.push({ obj: glow, base: 0.75, amp: 0.25, speed: 0.9, type: "emissive" });

  // Table (CHEAP segments)
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(CFG.tableRadius, CFG.tableRadius, 0.18, 32),
    MAT.steel
  );
  base.position.set(0, CFG.tableY, 0);
  scene.add(base);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(CFG.tableRadius * 0.96, CFG.tableRadius * 0.96, 0.035, 32),
    MAT.felt
  );
  felt.position.set(0, CFG.tableY + 0.105, 0);
  scene.add(felt);

  const rim = torus(CFG.tableRadius * 0.99, 0.065, MAT.dark, 10, 48);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, CFG.tableY + 0.12, 0);
  scene.add(rim);

  const railRing = torus(CFG.railRadius, 0.05, MAT.neonCyan, 10, 48);
  railRing.rotation.x = Math.PI / 2;
  railRing.position.set(0, CFG.railY, 0);
  scene.add(railRing);
  world.pulses.push({ obj: railRing, base: 0.5, amp: 0.2, speed: 1.0, type: "emissive" });

  // Posts (12 is fine)
  const postGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.35, 10);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const post = new THREE.Mesh(postGeo, MAT.dark);
    post.position.set(Math.cos(a) * CFG.railRadius, 0.70, Math.sin(a) * CFG.railRadius);
    scene.add(post);
  }

  // Dealer puck
  const puck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.018, 18),
    MAT.neonPink
  );
  puck.rotation.x = -Math.PI / 2;
  puck.position.set(0.35, CFG.tableY + 0.13, -0.25);
  scene.add(puck);
  world.spins.push({ obj: puck, speed: 0.6 });

  // 4 pillars
  const pillarGeo = new THREE.BoxGeometry(0.38, CFG.pillarHeight, 0.38);
  const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  angles.forEach((a, idx) => {
    const p = new THREE.Mesh(pillarGeo, MAT.dark);
    p.position.set(Math.cos(a) * CFG.pillarRadius, CFG.pillarHeight / 2, Math.sin(a) * CFG.pillarRadius);
    scene.add(p);

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.06, 12),
      idx % 2 === 0 ? MAT.neonPurple : MAT.neonCyan
    );
    cap.position.set(p.position.x, CFG.pillarHeight + 0.06, p.position.z);
    scene.add(cap);
    world.pulses.push({ obj: cap, base: 0.5, amp: 0.22, speed: 0.8 + idx * 0.07, type: "emissive" });
  });

  // Portal frames (CHEAP)
  const frameGeo = new THREE.BoxGeometry(1.2, 2.2, 0.12);
  const innerGeo = new THREE.BoxGeometry(0.95, 1.9, 0.14);
  angles.forEach((a, idx) => {
    const x = Math.cos(a) * CFG.portalRadius;
    const z = Math.sin(a) * CFG.portalRadius;

    const frame = new THREE.Mesh(frameGeo, MAT.portal);
    frame.position.set(x, 1.1, z);
    frame.lookAt(0, 1.1, 0);
    scene.add(frame);
    world.pulses.push({ obj: frame, base: 0.25, amp: 0.18, speed: 0.9 + idx * 0.1, type: "emissive" });

    const inner = new THREE.Mesh(innerGeo, MAT.dark);
    inner.position.set(0, 0, -0.02);
    frame.add(inner);
  });

  // Spawn facing table
  rig.position.set(0, 1.65, 4.2);
  rig.rotation.set(0, 0, 0);
  rig.updateMatrixWorld(true);

  // Tick hook (pulses + spins)
  scene.userData.worldTick = (dt) => {
    for (const p of world.pulses) {
      const t = performance.now() * 0.001 * p.speed;
      const v = p.base + Math.sin(t) * p.amp;

      if (p.type === "emissive") {
        if (p.obj?.material?.emissiveIntensity != null) {
          p.obj.material.emissiveIntensity = clamp(v, 0.0, 2.0);
        }
      } else if (p.type === "opacity") {
        if (p.obj?.material?.opacity != null) {
          p.obj.material.opacity = clamp(v, 0.35, 1.0);
          p.obj.material.transparent = true;
        }
      }
    }
    for (const s of world.spins) {
      if (s.obj) s.obj.rotation.z += dt * s.speed;
    }
  };

  writeHud("[world] build done ✅ (QUEST SAFE)");

  function torus(radius, tube, material, radialSeg = 10, tubularSeg = 48) {
    const m = material.clone();
    return new THREE.Mesh(new THREE.TorusGeometry(radius, tube, radialSeg, tubularSeg), m);
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
}
