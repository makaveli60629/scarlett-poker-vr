// /js/scarlett1/world.js — ULTIMATE MASTER WORLD (FULL)
// BUILD: WORLD_ULTIMATE_MASTER_v1
//
// ✅ Big casino room (2x feel), central pit/divot, stairs, rails
// ✅ Poker pit with table + ring markers + seating + NPC silhouettes
// ✅ Store zone + mannequins + signage anchor
// ✅ Bar/lounge zone + high tables
// ✅ Slot wall zone (visual placeholders)
// ✅ Hook points for modules (named groups + arrays)
// ✅ Teleport surfaces exposed via floorMeshes
// ✅ Performance-friendly: low poly, no textures required

export async function createWorld({ THREE, scene, renderer, camera, rig, Scarlett, diag }) {
  const push = (s) => diag?.(s);
  const BUILD = "WORLD_ULTIMATE_MASTER_v1";
  push?.(`[world] build=${BUILD}`);
  push?.(`[world] init…`);

  const root = new THREE.Group();
  root.name = "worldRoot";
  scene.add(root);

  // ---------- Materials ----------
  const matFloor = new THREE.MeshStandardMaterial({ color: 0x171a22, roughness: 0.95, metalness: 0.0 });
  const matFloor2= new THREE.MeshStandardMaterial({ color: 0x10131a, roughness: 0.98, metalness: 0.0 });
  const matWall  = new THREE.MeshStandardMaterial({ color: 0x0c0f15, roughness: 0.98, metalness: 0.0 });
  const matRail  = new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 0.55, metalness: 0.15 });
  const matStep  = new THREE.MeshStandardMaterial({ color: 0x151824, roughness: 0.95, metalness: 0.0 });
  const matFelt  = new THREE.MeshStandardMaterial({ color: 0x1a7a3b, roughness: 0.9, metalness: 0.0 });
  const matTable = new THREE.MeshStandardMaterial({ color: 0x1b1c22, roughness: 0.8, metalness: 0.05 });
  const matNPC   = new THREE.MeshStandardMaterial({ color: 0x2a2d38, roughness: 0.95, metalness: 0.0 });
  const matSign  = new THREE.MeshStandardMaterial({ color: 0x0a0a0e, roughness: 0.4, metalness: 0.2, emissive: new THREE.Color(0x0b2a12), emissiveIntensity: 0.9 });

  // ---------- Big casino room ----------
  const roomRadius = 42;          // bigger = “ultimate”
  const roomHeight = 12;
  const floorMain = new THREE.Mesh(new THREE.CircleGeometry(roomRadius, 128), matFloor);
  floorMain.rotation.x = -Math.PI / 2;
  floorMain.name = "casinoFloor";
  root.add(floorMain);

  const walls = new THREE.Mesh(
    new THREE.CylinderGeometry(roomRadius, roomRadius, roomHeight, 128, 1, true),
    matWall
  );
  walls.position.y = roomHeight / 2;
  walls.name = "casinoWalls";
  root.add(walls);

  // Sub-floor ring to break up visuals
  const ring = new THREE.Mesh(new THREE.RingGeometry(18, 34, 128), matFloor2);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  ring.name = "floorRing";
  root.add(ring);

  // ---------- Central pit/divot ----------
  const pitRadius = 7.5;
  const pitDepth = 2.7;

  const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(pitRadius - 0.25, 128), matFloor2);
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

  // Rail lip
  const lip = new THREE.Mesh(new THREE.TorusGeometry(pitRadius, 0.16, 18, 128), matRail);
  lip.rotation.x = -Math.PI / 2;
  lip.position.y = 0.03;
  lip.name = "pitLip";
  root.add(lip);

  // Posts
  const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.25, 10);
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2;
    const p = new THREE.Mesh(postGeo, matRail);
    p.position.set(Math.cos(a) * (pitRadius + 0.10), 0.62, Math.sin(a) * (pitRadius + 0.10));
    root.add(p);
  }

  // ---------- Stairs down into pit (wider, more “casino”) ----------
  const stairGroup = new THREE.Group();
  stairGroup.name = "stairs";
  root.add(stairGroup);

  const stairCount = 12;
  const stairWidth = 2.0;
  const stairRun = 0.55;
  const stairRise = pitDepth / stairCount;

  const startZ = pitRadius + 0.65;
  for (let i = 0; i < stairCount; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(stairWidth, stairRise * 0.95, stairRun), matStep);
    step.position.set(0, -stairRise * (i + 0.5), startZ - stairRun * (i + 0.5));
    stairGroup.add(step);
  }

  // Stair side rails
  const railSide = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, stairCount * stairRun + 0.4), matRail);
  railSide.position.set(stairWidth / 2 + 0.12, -pitDepth / 2, startZ - (stairCount * stairRun) / 2);
  stairGroup.add(railSide.clone());
  railSide.position.x *= -1;
  stairGroup.add(railSide);

  // ---------- Poker table down in pit ----------
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

  // Betting rings / pass line rings
  const ringA = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.90, 96),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, side: THREE.DoubleSide })
  );
  ringA.rotation.x = -Math.PI / 2;
  ringA.position.y = 1.01;
  table.add(ringA);

  const ringB = new THREE.Mesh(
    new THREE.RingGeometry(1.02, 1.25, 96),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.10, side: THREE.DoubleSide })
  );
  ringB.rotation.x = -Math.PI / 2;
  ringB.position.y = 1.01;
  table.add(ringB);

  // Dealer button (flat)
  const dealer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.014, 24),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.35, metalness: 0.05 })
  );
  dealer.position.set(0.40, 1.02, 0.28);
  dealer.rotation.x = Math.PI / 2;
  dealer.name = "dealerButton";
  table.add(dealer);

  // Seats + NPC silhouettes
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x20222c, roughness: 0.9, metalness: 0.05 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = 3.15;

    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.10, 0.55), chairMat);
    chair.position.set(Math.cos(a) * r, 0.46, Math.sin(a) * r);
    chair.lookAt(0, 0.46, 0);
    chair.name = `chair_${i}`;
    pit.add(chair);

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.20, 0.65, 6, 12), matNPC);
    body.position.set(Math.cos(a) * (r + 0.35), 0.85, Math.sin(a) * (r + 0.35));
    body.lookAt(0, 0.85, 0);
    body.name = `npc_${i}`;
    pit.add(body);
  }

  // ---------- Store zone (modules can populate) ----------
  const storeZone = new THREE.Group();
  storeZone.name = "storeZone";
  storeZone.position.set(-18, 0, -16);
  root.add(storeZone);

  const storePad = new THREE.Mesh(new THREE.CircleGeometry(5.0, 96), matFloor2);
  storePad.rotation.x = -Math.PI / 2;
  storePad.position.y = 0.01;
  storeZone.add(storePad);

  const storeSign = new THREE.Mesh(new THREE.BoxGeometry(6, 1.0, 0.25), matSign);
  storeSign.position.set(0, 3.0, -4.8);
  storeSign.name = "storeSign";
  storeZone.add(storeSign);

  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.95, 6, 12), matNPC);
    m.position.set(-2.5 + i, 1.0, 0);
    m.name = `mannequin_${i}`;
    storeZone.add(m);
  }

  // ---------- Bar / lounge zone ----------
  const barZone = new THREE.Group();
  barZone.name = "barZone";
  barZone.position.set(18, 0, -14);
  root.add(barZone);

  const barPad = new THREE.Mesh(new THREE.CircleGeometry(6.0, 96), matFloor2);
  barPad.rotation.x = -Math.PI / 2;
  barPad.position.y = 0.01;
  barZone.add(barPad);

  const barTop = new THREE.Mesh(new THREE.BoxGeometry(8, 1.0, 2.2), matTable);
  barTop.position.set(0, 1.1, -2.5);
  barTop.name = "barCounter";
  barZone.add(barTop);

  for (let i = 0; i < 5; i++) {
    const hi = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.40, 1.1, 16), matTable);
    hi.position.set(-3 + i * 1.5, 0.55, 1.0);
    barZone.add(hi);
  }

  // ---------- Slot wall zone ----------
  const slotsZone = new THREE.Group();
  slotsZone.name = "slotsZone";
  slotsZone.position.set(0, 0, -26);
  root.add(slotsZone);

  const slotWall = new THREE.Mesh(new THREE.BoxGeometry(24, 6.5, 0.6), matWall);
  slotWall.position.set(0, 3.25, -6);
  slotWall.name = "slotWall";
  slotsZone.add(slotWall);

  for (let i = 0; i < 10; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.8), matTable);
    slot.position.set(-9 + i * 2.0, 1.2, -5.4);
    slotsZone.add(slot);

    const glow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.1), new THREE.MeshStandardMaterial({
      color: 0x111118, emissive: new THREE.Color(0x123a22), emissiveIntensity: 1.2, roughness: 0.6, metalness: 0.1
    }));
    glow.position.set(slot.position.x, 2.35, slot.position.z - 0.45);
    slotsZone.add(glow);
  }

  // ---------- Hook anchors for modules ----------
  const anchors = {
    pit,
    table,
    storeZone,
    barZone,
    slotsZone,
    signage: { storeSign },
  };

  // Teleport targets
  const floorMeshes = [floorMain, ring, pitFloor, storePad, barPad];

  // Spawn: outside pit looking inward (default camera looks -Z)
  rig.position.set(0, 0, pitRadius + 6.0);
  rig.rotation.y = 0;

  const ui = {
    _hudVisible: true,
    toggleHud() {
      ui._hudVisible = !ui._hudVisible;
      push?.(`[ui] hud=${ui._hudVisible}`);
    },
    toggleTeleport() { /* handled by controls */ },
    toggleModules() { globalThis.SCARLETT_MODULES?.toggle?.(); },
  };

  function tick() {
    // subtle rotation so you can confirm animation loop is alive
    dealer.rotation.z += 0.002;
  }

  push?.(`[world] ready ✅ (ULTIMATE MASTER casino)`);

  return {
    root,
    tick,
    ui,
    floorMeshes,
    anchors,
    // helpful collections for modules
    interactionTargets: [table, storeZone, barZone, slotsZone],
  };
}
