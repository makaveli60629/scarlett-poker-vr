// /js/scarlett1/world.js
// BUILD: WORLD_ULTIMATE_MASTER_v3_FULL_SCENE
//
// ✅ FULL upgraded visuals:
// - Poker table area is “alive” (bots seated, hands/cards hovering, chip stacks)
// - Chair rings, rails, stairs, pit, ceiling, pillars, neon
// - Store has racks + mannequins + counter + signage
// - Bar props, slot wall props
// ✅ Lightweight: simple geometry, emissive accents, no textures required
// ✅ Exposes anchors + floorMeshes + gameplay hooks for modules

export async function createWorld({ THREE, scene, renderer, camera, rig, Scarlett, diag }) {
  const push = (s) => diag?.(s);
  const BUILD = "WORLD_ULTIMATE_MASTER_v3_FULL_SCENE";
  push?.(`[world] build=${BUILD}`);
  push?.(`[world] init…`);

  const root = new THREE.Group();
  root.name = "worldRoot";
  scene.add(root);

  // ---------- Materials ----------
  const matFloor = new THREE.MeshStandardMaterial({ color: 0x171a22, roughness: 0.95, metalness: 0.0 });
  const matCarpet= new THREE.MeshStandardMaterial({ color: 0x1a1f2b, roughness: 0.98, metalness: 0.0 });
  const matWall  = new THREE.MeshStandardMaterial({ color: 0x0b0e14, roughness: 0.98, metalness: 0.0 });
  const matRail  = new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 0.55, metalness: 0.15 });
  const matStep  = new THREE.MeshStandardMaterial({ color: 0x151824, roughness: 0.95, metalness: 0.0 });
  const matTable = new THREE.MeshStandardMaterial({ color: 0x1b1c22, roughness: 0.8, metalness: 0.05 });
  const matFelt  = new THREE.MeshStandardMaterial({ color: 0x1a7a3b, roughness: 0.9, metalness: 0.0 });
  const matNPC   = new THREE.MeshStandardMaterial({ color: 0x2a2d38, roughness: 0.95, metalness: 0.0 });
  const matChip  = new THREE.MeshStandardMaterial({ color: 0xd9d9d9, roughness: 0.35, metalness: 0.05 });
  const matCard  = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.0 });

  const matNeonGreen = new THREE.MeshStandardMaterial({
    color: 0x0a0a0e, roughness: 0.35, metalness: 0.2,
    emissive: new THREE.Color(0x00ff88), emissiveIntensity: 1.15
  });
  const matNeonPink = new THREE.MeshStandardMaterial({
    color: 0x0a0a0e, roughness: 0.35, metalness: 0.2,
    emissive: new THREE.Color(0xff4dd8), emissiveIntensity: 0.85
  });

  // ---------- Room ----------
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
  root.add(walls);

  const ceiling = new THREE.Mesh(new THREE.CircleGeometry(roomRadius, 128), matWall);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = roomHeight;
  root.add(ceiling);

  // pillars + neon bands
  const pillarGeo = new THREE.CylinderGeometry(0.55, 0.65, roomHeight, 18);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const p = new THREE.Mesh(pillarGeo, new THREE.MeshStandardMaterial({ color: 0x121521, roughness: 0.9, metalness: 0.08 }));
    p.position.set(Math.cos(a) * (roomRadius - 2.6), roomHeight / 2, Math.sin(a) * (roomRadius - 2.6));
    root.add(p);

    const band = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 10, 32), matNeonGreen);
    band.rotation.x = Math.PI / 2;
    band.position.copy(p.position);
    band.position.y = 3.2;
    root.add(band);
  }

  const chandelier = new THREE.Group();
  chandelier.position.set(0, roomHeight - 1.2, 0);
  root.add(chandelier);
  chandelier.add(new THREE.PointLight(0xffffff, 0.85, 28));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const L = new THREE.PointLight(0xffffff, 0.55, 22);
    L.position.set(Math.cos(a) * 3.0, 0, Math.sin(a) * 3.0);
    chandelier.add(L);
  }

  // ---------- Pit / divot ----------
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
  root.add(pitWall);

  const lip = new THREE.Mesh(new THREE.TorusGeometry(pitRadius, 0.18, 18, 128), matRail);
  lip.rotation.x = -Math.PI / 2;
  lip.position.y = 0.03;
  root.add(lip);

  // posts
  const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.25, 10);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const p = new THREE.Mesh(postGeo, matRail);
    p.position.set(Math.cos(a) * (pitRadius + 0.12), 0.62, Math.sin(a) * (pitRadius + 0.12));
    root.add(p);
  }

  // stairs down
  const stairs = new THREE.Group();
  stairs.name = "stairs";
  root.add(stairs);

  const stairCount = 12, stairWidth = 2.2, stairRun = 0.58, stairRise = pitDepth / stairCount;
  const startZ = pitRadius + 0.75;

  for (let i = 0; i < stairCount; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(stairWidth, stairRise * 0.95, stairRun), matStep);
    step.position.set(0, -stairRise * (i + 0.5), startZ - stairRun * (i + 0.5));
    stairs.add(step);
  }

  // ---------- Poker pit group ----------
  const pit = new THREE.Group();
  pit.name = "pitGroup";
  pit.position.set(0, -pitDepth + 0.05, 0);
  root.add(pit);

  const table = new THREE.Group();
  table.name = "pokerTable";
  pit.add(table);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.82, 0.85, 28), matTable);
  pedestal.position.y = 0.40;
  table.add(pedestal);

  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.18, 64), matTable);
  top.position.y = 0.90;
  table.add(top);

  const felt = new THREE.Mesh(new THREE.CylinderGeometry(1.70, 1.70, 0.07, 64), matFelt);
  felt.position.y = 0.99;
  table.add(felt);

  // inner betting markings
  const markA = new THREE.Mesh(
    new THREE.RingGeometry(0.64, 0.98, 96),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
  );
  markA.rotation.x = -Math.PI / 2;
  markA.position.y = 1.03;
  table.add(markA);

  const dealerButton = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.10, 0.015, 24),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.35, metalness: 0.05 })
  );
  dealerButton.position.set(0.42, 1.04, 0.30);
  dealerButton.rotation.x = Math.PI / 2;
  dealerButton.name = "dealerButton";
  table.add(dealerButton);

  // table rim glow (visual pop)
  const rimGlow = new THREE.Mesh(new THREE.TorusGeometry(1.86, 0.03, 10, 96), matNeonGreen);
  rimGlow.rotation.x = -Math.PI / 2;
  rimGlow.position.y = 1.02;
  table.add(rimGlow);

  // ---------- Seats + bots "playing" ----------
  const chairs = new THREE.Group();
  chairs.name = "chairs";
  pit.add(chairs);

  const bots = new THREE.Group();
  bots.name = "bots";
  pit.add(bots);

  const cardsHover = new THREE.Group();
  cardsHover.name = "hoverCards";
  pit.add(cardsHover);

  const chipsTable = new THREE.Group();
  chipsTable.name = "chipsTable";
  pit.add(chipsTable);

  const chairMat = new THREE.MeshStandardMaterial({ color: 0x20222c, roughness: 0.9, metalness: 0.05 });

  // helper to make chip stack
  function makeChipStack(x, z, h = 10) {
    const stack = new THREE.Group();
    for (let i = 0; i < h; i++) {
      const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.012, 16), matChip);
      chip.position.set(0, 1.05 + i * 0.014, 0);
      stack.add(chip);
    }
    stack.position.set(x, 0, z);
    return stack;
  }

  // helper to make 2 "cards" (as if dealt)
  function makeTwoCards() {
    const g = new THREE.Group();
    const c1 = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.12), matCard);
    const c2 = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.12), matCard);
    c1.rotation.x = -Math.PI / 2;
    c2.rotation.x = -Math.PI / 2;
    c2.rotation.z = 0.08;
    c1.position.set(-0.045, 0, 0);
    c2.position.set(0.045, 0, 0);
    g.add(c1, c2);
    return g;
  }

  const botSlots = 9;
  for (let i = 0; i < botSlots; i++) {
    const a = (i / botSlots) * Math.PI * 2;
    const seatR = 3.35;

    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.10, 0.58), chairMat);
    chair.position.set(Math.cos(a) * seatR, 0.46, Math.sin(a) * seatR);
    chair.lookAt(0, 0.46, 0);
    chair.name = `chair_${i}`;
    chairs.add(chair);

    // bot body + head
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.70, 6, 12), matNPC);
    body.position.set(Math.cos(a) * (seatR + 0.33), 0.86, Math.sin(a) * (seatR + 0.33));
    body.lookAt(0, 0.86, 0);
    body.name = `bot_${i}`;
    bots.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), matNPC);
    head.position.copy(body.position);
    head.position.y += 0.55;
    bots.add(head);

    // chips near each bot
    const cx = Math.cos(a) * 1.35;
    const cz = Math.sin(a) * 1.35;
    chipsTable.add(makeChipStack(cx, cz, 8 + (i % 4)));

    // hovering dealt cards in front of bot
    const hand = makeTwoCards();
    hand.position.set(Math.cos(a) * 1.15, 1.08, Math.sin(a) * 1.15);
    hand.rotation.y = Math.PI + a;
    hand.userData.floatPhase = i * 0.7;
    cardsHover.add(hand);
  }

  // community cards hover over center felt (5)
  const community = new THREE.Group();
  community.name = "communityCards";
  pit.add(community);
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.13), matCard);
    c.rotation.x = -Math.PI / 2;
    c.position.set(-0.22 + i * 0.11, 1.06, 0);
    community.add(c);
  }

  // pot chips
  chipsTable.add(makeChipStack(0.0, 0.0, 14));

  // pit accent light
  const pitGlow = new THREE.PointLight(0x66ffcc, 0.35, 18);
  pitGlow.position.set(0, 4.5, 0);
  root.add(pitGlow);

  // ---------- Store zone (more props) ----------
  const storeZone = new THREE.Group();
  storeZone.name = "storeZone";
  storeZone.position.set(-18, 0, -16);
  root.add(storeZone);

  const storePad = new THREE.Mesh(new THREE.CircleGeometry(5.4, 96), matCarpet);
  storePad.rotation.x = -Math.PI / 2;
  storePad.position.y = 0.01;
  storeZone.add(storePad);

  const storeSign = new THREE.Mesh(new THREE.BoxGeometry(7.6, 1.2, 0.25), matNeonGreen);
  storeSign.position.set(0, 3.2, -5.0);
  storeSign.name = "storeSign";
  storeZone.add(storeSign);

  // counter
  const counter = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.0, 1.4), matTable);
  counter.position.set(0, 0.5, -1.4);
  storeZone.add(counter);

  // racks
  const rackMat = new THREE.MeshStandardMaterial({ color: 0x1f2230, roughness: 0.85, metalness: 0.06 });
  for (let i = 0; i < 3; i++) {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.6, 0.25), rackMat);
    rack.position.set(-1.5 + i * 1.5, 0.8, 2.2);
    storeZone.add(rack);
  }

  // mannequins (6)
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.95, 6, 12), matNPC);
    m.position.set(-2.6 + i * 1.05, 1.0, 0);
    m.name = `mannequin_${i}`;
    storeZone.add(m);
  }
  storeZone.add(new THREE.PointLight(0x66ffcc, 0.45, 14)).position.set(0, 4.0, 0);

  // ---------- Bar zone ----------
  const barZone = new THREE.Group();
  barZone.name = "barZone";
  barZone.position.set(18, 0, -14);
  root.add(barZone);

  const barPad = new THREE.Mesh(new THREE.CircleGeometry(6.4, 96), matCarpet);
  barPad.rotation.x = -Math.PI / 2;
  barPad.position.y = 0.01;
  barZone.add(barPad);

  const barCounter = new THREE.Mesh(new THREE.BoxGeometry(9.4, 1.1, 2.6), matTable);
  barCounter.position.set(0, 1.1, -2.8);
  barZone.add(barCounter);

  for (let i = 0; i < 6; i++) {
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.40, 1.1, 16), matTable);
    stool.position.set(-3.6 + i * 1.45, 0.55, 1.2);
    barZone.add(stool);
  }

  // bottles shelf (visual)
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(8.0, 2.0, 0.35), matWall);
  shelf.position.set(0, 2.7, -4.2);
  barZone.add(shelf);

  barZone.add(new THREE.PointLight(0xff66cc, 0.35, 14)).position.set(0, 4.0, -2.0);

  // ---------- Slots zone ----------
  const slotsZone = new THREE.Group();
  slotsZone.name = "slotsZone";
  slotsZone.position.set(0, 0, -26);
  root.add(slotsZone);

  const slotWall = new THREE.Mesh(new THREE.BoxGeometry(26, 7.0, 0.7), matWall);
  slotWall.position.set(0, 3.5, -6);
  slotsZone.add(slotWall);

  // row of slots
  for (let i = 0; i < 12; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.25, 0.85), matTable);
    slot.position.set(-11 + i * 2.0, 1.2, -5.4);
    slotsZone.add(slot);

    const glow = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.36, 0.1), matNeonPink);
    glow.position.set(slot.position.x, 2.35, slot.position.z - 0.46);
    slotsZone.add(glow);
  }
  slotsZone.add(new THREE.PointLight(0x00ff88, 0.35, 16)).position.set(0, 4.5, -5);

  // ---------- Anchors / hooks for modules ----------
  const anchors = {
    pit,
    table,
    chairs,
    bots,
    hoverCards: cardsHover,
    communityCards: community,
    chipsTable,
    storeZone,
    barZone,
    slotsZone,
    signage: { storeSign },
  };

  // Teleport surfaces
  const floorMeshes = [floorMain, carpetRing, pitFloor, storePad, barPad];

  // Spawn
  rig.position.set(0, 0, pitRadius + 7.2);
  rig.rotation.y = 0;

  const ui = {
    _hudVisible: true,
    toggleHud() { ui._hudVisible = !ui._hudVisible; push?.(`[ui] hud=${ui._hudVisible}`); },
    toggleTeleport() {},
    toggleModules() { globalThis.SCARLETT_MODULES?.toggle?.(); },
  };

  function tick(t) {
    dealerButton.rotation.z += 0.002;

    // hovering effect on player hands (cards)
    const time = (t || performance.now()) * 0.001;
    for (const h of cardsHover.children) {
      const ph = h.userData.floatPhase || 0;
      h.position.y = 1.08 + Math.sin(time * 2.0 + ph) * 0.015;
    }
    community.position.y = 0.0 + Math.sin(time * 1.6) * 0.01;
  }

  push?.(`[world] ready ✅ (FULL bots + cards + chips + store + props)`);

  return {
    root,
    tick,
    ui,
    floorMeshes,
    anchors,
    interactionTargets: [table, storeZone, barZone, slotsZone],
  };
}
