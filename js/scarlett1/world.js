// /js/scarlett1/world.js — ULTIMATE MASTER WORLD (FULL)
// BUILD: WORLD_ULTIMATE_MASTER_v2_VISUALS
//
// ✅ Much better visuals (still lightweight)
// ✅ Casino ceiling + pillars + carpet ring + light rigs + props
// ✅ Pit/divot + stairs + rail + poker pit + store/bar/slots
// ✅ Teleport floor meshes exposed

export async function createWorld({ THREE, scene, renderer, camera, rig, Scarlett, diag }) {
  const push = (s) => diag?.(s);
  const BUILD = "WORLD_ULTIMATE_MASTER_v2_VISUALS";
  push?.(`[world] build=${BUILD}`);
  push?.(`[world] init…`);

  const root = new THREE.Group();
  root.name = "worldRoot";
  scene.add(root);

  // ---------- Materials ----------
  const matFloor = new THREE.MeshStandardMaterial({ color: 0x171a22, roughness: 0.95, metalness: 0.0 });
  const matCarpet = new THREE.MeshStandardMaterial({ color: 0x1a1f2b, roughness: 0.98, metalness: 0.0 });
  const matWall  = new THREE.MeshStandardMaterial({ color: 0x0b0e14, roughness: 0.98, metalness: 0.0 });
  const matRail  = new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 0.55, metalness: 0.15 });
  const matStep  = new THREE.MeshStandardMaterial({ color: 0x151824, roughness: 0.95, metalness: 0.0 });
  const matFelt  = new THREE.MeshStandardMaterial({ color: 0x1a7a3b, roughness: 0.9, metalness: 0.0 });
  const matTable = new THREE.MeshStandardMaterial({ color: 0x1b1c22, roughness: 0.8, metalness: 0.05 });
  const matNPC   = new THREE.MeshStandardMaterial({ color: 0x2a2d38, roughness: 0.95, metalness: 0.0 });
  const matColumn= new THREE.MeshStandardMaterial({ color: 0x121521, roughness: 0.9, metalness: 0.08 });

  const matNeon = new THREE.MeshStandardMaterial({
    color: 0x0a0a0e,
    roughness: 0.35,
    metalness: 0.2,
    emissive: new THREE.Color(0x00ff88),
    emissiveIntensity: 1.1
  });

  // ---------- Big room ----------
  const roomRadius = 44;
  const roomHeight = 12;

  const floorMain = new THREE.Mesh(new THREE.CircleGeometry(roomRadius, 128), matFloor);
  floorMain.rotation.x = -Math.PI / 2;
  floorMain.name = "casinoFloor";
  root.add(floorMain);

  const carpetRing = new THREE.Mesh(new THREE.RingGeometry(14, 34, 128), matCarpet);
  carpetRing.rotation.x = -Math.PI / 2;
  carpetRing.position.y = 0.01;
  carpetRing.name = "carpetRing";
  root.add(carpetRing);

  const walls = new THREE.Mesh(
    new THREE.CylinderGeometry(roomRadius, roomRadius, roomHeight, 128, 1, true),
    matWall
  );
  walls.position.y = roomHeight / 2;
  walls.name = "casinoWalls";
  root.add(walls);

  // Ceiling
  const ceiling = new THREE.Mesh(new THREE.CircleGeometry(roomRadius, 128), matWall);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = roomHeight;
  ceiling.name = "ceiling";
  root.add(ceiling);

  // Pillars
  const pillarGeo = new THREE.CylinderGeometry(0.55, 0.65, roomHeight, 18);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const p = new THREE.Mesh(pillarGeo, matColumn);
    p.position.set(Math.cos(a) * (roomRadius - 2.6), roomHeight / 2, Math.sin(a) * (roomRadius - 2.6));
    root.add(p);

    // Neon band
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 10, 32), matNeon);
    band.rotation.x = Math.PI / 2;
    band.position.copy(p.position);
    band.position.y = 3.2;
    root.add(band);
  }

  // Chandelier “points” (light only)
  const chandelier = new THREE.Group();
  chandelier.name = "chandelier";
  chandelier.position.set(0, roomHeight - 1.2, 0);
  root.add(chandelier);

  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const light = new THREE.PointLight(0xffffff, 0.55, 22);
    light.position.set(Math.cos(a) * 3.0, 0, Math.sin(a) * 3.0);
    chandelier.add(light);
  }
  chandelier.add(new THREE.PointLight(0xffffff, 0.85, 28));

  // ---------- Pit/divot ----------
  const pitRadius = 7.8;
  const pitDepth = 2.8;

  const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(pitRadius - 0.25, 128), matCarpet);
  pitFloor.rotation.x = -Math.PI / 2;
  pitFloor.position.y = -pitDepth;
  pitFloor.name = "pitFloor";
  root.add(pitFloor);

  const pitWall = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 128, 1, true),
    matWall
  );
  pitWall.position.y = -pitDepth / 2;
  pitWall.name = "pitWall";
  root.add(pitWall);

  const lip = new THREE.Mesh(new THREE.TorusGeometry(pitRadius, 0.18, 18, 128), matRail);
  lip.rotation.x = -Math.PI / 2;
  lip.position.y = 0.03;
  lip.name = "pitLip";
  root.add(lip);

  const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.25, 10);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const p = new THREE.Mesh(postGeo, matRail);
    p.position.set(Math.cos(a) * (pitRadius + 0.12), 0.62, Math.sin(a) * (pitRadius + 0.12));
    root.add(p);
  }

  // Stairs
  const stairGroup = new THREE.Group();
  stairGroup.name = "stairs";
  root.add(stairGroup);

  const stairCount = 12;
  const stairWidth = 2.2;
  const stairRun = 0.58;
  const stairRise = pitDepth / stairCount;
  const startZ = pitRadius + 0.75;

  for (let i = 0; i < stairCount; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(stairWidth, stairRise * 0.95, stairRun), matStep);
    step.position.set(0, -stairRise * (i + 0.5), startZ - stairRun * (i + 0.5));
    stairGroup.add(step);
  }

  // ---------- Poker pit ----------
  const pit = new THREE.Group();
  pit.name = "pitGroup";
  pit.position.set(0, -pitDepth + 0.05, 0);
  root.add(pit);

  const table = new THREE.Group();
  table.name = "pokerTable";
  pit.add(table);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.60, 0.78, 0.85, 28), matTable);
  pedestal.position.y = 0.40;
  table.add(pedestal);

  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.16, 64), matTable);
  top.position.y = 0.90;
  table.add(top);

  const felt = new THREE.Mesh(new THREE.CylinderGeometry(1.60, 1.60, 0.06, 64), matFelt);
  felt.position.y = 0.98;
  table.add(felt);

  const ringA = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.90, 96),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, side: THREE.DoubleSide })
  );
  ringA.rotation.x = -Math.PI / 2;
  ringA.position.y = 1.01;
  table.add(ringA);

  const dealer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.014, 24),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.35, metalness: 0.05 })
  );
  dealer.position.set(0.40, 1.02, 0.28);
  dealer.rotation.x = Math.PI / 2;
  dealer.name = "dealerButton";
  table.add(dealer);

  // NPC silhouettes
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x20222c, roughness: 0.9, metalness: 0.05 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = 3.2;

    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.10, 0.55), chairMat);
    chair.position.set(Math.cos(a) * r, 0.46, Math.sin(a) * r);
    chair.lookAt(0, 0.46, 0);
    pit.add(chair);

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.20, 0.65, 6, 12), matNPC);
    body.position.set(Math.cos(a) * (r + 0.36), 0.85, Math.sin(a) * (r + 0.36));
    body.lookAt(0, 0.85, 0);
    pit.add(body);
  }

  // Pit accent lights
  const pitGlow = new THREE.PointLight(0x66ffcc, 0.35, 18);
  pitGlow.position.set(0, 4.5, 0);
  root.add(pitGlow);

  // ---------- Store zone ----------
  const storeZone = new THREE.Group();
  storeZone.name = "storeZone";
  storeZone.position.set(-18, 0, -16);
  root.add(storeZone);

  const storePad = new THREE.Mesh(new THREE.CircleGeometry(5.2, 96), matCarpet);
  storePad.rotation.x = -Math.PI / 2;
  storePad.position.y = 0.01;
  storeZone.add(storePad);

  const storeSign = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.1, 0.25), matNeon);
  storeSign.position.set(0, 3.1, -4.9);
  storeSign.name = "storeSign";
  storeZone.add(storeSign);

  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.95, 6, 12), matNPC);
    m.position.set(-2.6 + i * 1.05, 1.0, 0);
    storeZone.add(m);
  }
  const storeLight = new THREE.PointLight(0x66ffcc, 0.45, 14);
  storeLight.position.set(0, 4.0, 0);
  storeZone.add(storeLight);

  // ---------- Bar zone ----------
  const barZone = new THREE.Group();
  barZone.name = "barZone";
  barZone.position.set(18, 0, -14);
  root.add(barZone);

  const barPad = new THREE.Mesh(new THREE.CircleGeometry(6.2, 96), matCarpet);
  barPad.rotation.x = -Math.PI / 2;
  barPad.position.y = 0.01;
  barZone.add(barPad);

  const barCounter = new THREE.Mesh(new THREE.BoxGeometry(9, 1.1, 2.4), matTable);
  barCounter.position.set(0, 1.1, -2.6);
  barZone.add(barCounter);

  for (let i = 0; i < 6; i++) {
    const hi = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.40, 1.1, 16), matTable);
    hi.position.set(-3.5 + i * 1.4, 0.55, 1.1);
    barZone.add(hi);
  }

  const barNeon = new THREE.PointLight(0xff66cc, 0.35, 14);
  barNeon.position.set(0, 4.0, -2.0);
  barZone.add(barNeon);

  // ---------- Slots zone ----------
  const slotsZone = new THREE.Group();
  slotsZone.name = "slotsZone";
  slotsZone.position.set(0, 0, -26);
  root.add(slotsZone);

  const slotWall = new THREE.Mesh(new THREE.BoxGeometry(26, 7.0, 0.7), matWall);
  slotWall.position.set(0, 3.5, -6);
  slotsZone.add(slotWall);

  for (let i = 0; i < 12; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.8), matTable);
    slot.position.set(-11 + i * 2.0, 1.2, -5.4);
    slotsZone.add(slot);

    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.35, 0.1),
      new THREE.MeshStandardMaterial({
        color: 0x111118,
        emissive: new THREE.Color(0x00ff88),
        emissiveIntensity: 1.2,
        roughness: 0.6,
        metalness: 0.1
      })
    );
    glow.position.set(slot.position.x, 2.35, slot.position.z - 0.45);
    slotsZone.add(glow);
  }

  const slotsLight = new THREE.PointLight(0x00ff88, 0.35, 16);
  slotsLight.position.set(0, 4.5, -5);
  slotsZone.add(slotsLight);

  // ---------- Hooks ----------
  const anchors = {
    pit, table, storeZone, barZone, slotsZone, signage: { storeSign }
  };

  const floorMeshes = [floorMain, carpetRing, pitFloor, storePad, barPad];

  // Spawn
  rig.position.set(0, 0, pitRadius + 7.0);
  rig.rotation.y = 0;

  const ui = {
    _hudVisible: true,
    toggleHud() {
      ui._hudVisible = !ui._hudVisible;
      push?.(`[ui] hud=${ui._hudVisible}`);
    },
    toggleTeleport() {},
    toggleModules() { globalThis.SCARLETT_MODULES?.toggle?.(); },
  };

  function tick() {
    dealer.rotation.z += 0.002;
  }

  push?.(`[world] ready ✅ (ULTIMATE MASTER casino visuals v2)`);

  return {
    root,
    tick,
    ui,
    floorMeshes,
    anchors,
    interactionTargets: [table, storeZone, barZone, slotsZone],
  };
}
