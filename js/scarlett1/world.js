// /js/scarlett1/world.js — Scarlett1 World (FULL RESTORE VISUAL)
// This rebuilds your “casino divot world” in a stable, lightweight way.

export async function createWorld({ THREE, scene, renderer, camera, rig, Scarlett, diag }) {
  const push = (s) => diag?.(s);

  push?.(`[world] init…`);

  // World root
  const root = new THREE.Group();
  root.name = "worldRoot";
  scene.add(root);

  // ---------- Materials ----------
  const matFloor = new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.95, metalness: 0.0 });
  const matWall  = new THREE.MeshStandardMaterial({ color: 0x07070c, roughness: 0.98, metalness: 0.0 });
  const matRail  = new THREE.MeshStandardMaterial({ color: 0x22160f, roughness: 0.55, metalness: 0.15 });
  const matStep  = new THREE.MeshStandardMaterial({ color: 0x0d0d14, roughness: 0.95, metalness: 0.0 });
  const matFelt  = new THREE.MeshStandardMaterial({ color: 0x0f5a2d, roughness: 0.9, metalness: 0.0 });
  const matTable = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.8, metalness: 0.05 });

  // ---------- Big casino room ----------
  const roomRadius = 28;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(roomRadius, 96), matFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.name = "casinoFloor";
  root.add(floor);

  const walls = new THREE.Mesh(
    new THREE.CylinderGeometry(roomRadius, roomRadius, 9, 96, 1, true),
    matWall
  );
  walls.position.y = 4.5;
  walls.name = "casinoWalls";
  root.add(walls);

  // ---------- Divot / pit ----------
  const pitRadius = 6.2;
  const pitDepth = 2.35;

  const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(pitRadius - 0.25, 96), matFloor);
  pitFloor.rotation.x = -Math.PI / 2;
  pitFloor.position.y = -pitDepth;
  pitFloor.name = "pitFloor";
  root.add(pitFloor);

  const pitWall = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 96, 1, true),
    matWall
  );
  pitWall.position.y = -pitDepth / 2;
  pitWall.name = "pitWall";
  root.add(pitWall);

  const lip = new THREE.Mesh(new THREE.TorusGeometry(pitRadius, 0.14, 18, 96), matRail);
  lip.rotation.x = -Math.PI / 2;
  lip.position.y = 0.03;
  lip.name = "pitLip";
  root.add(lip);

  // Rail posts (NOT on the table — around the pit)
  const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.15, 10);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const p = new THREE.Mesh(postGeo, matRail);
    p.position.set(Math.cos(a) * (pitRadius + 0.08), 0.57, Math.sin(a) * (pitRadius + 0.08));
    root.add(p);
  }

  // ---------- Stairs down into the pit ----------
  const stairGroup = new THREE.Group();
  stairGroup.name = "stairs";
  root.add(stairGroup);

  const stairCount = 10;
  const stairWidth = 1.25;
  const stairRun = 0.48;
  const stairRise = pitDepth / stairCount;

  // Position stairs on +Z side
  const startZ = pitRadius + 0.35;
  for (let i = 0; i < stairCount; i++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(stairWidth, stairRise * 0.95, stairRun),
      matStep
    );
    step.position.set(0, -stairRise * (i + 0.5), startZ - stairRun * (i + 0.5));
    stairGroup.add(step);
  }

  // ---------- Poker table down in the pit ----------
  const table = new THREE.Group();
  table.name = "pokerTable";
  table.position.set(0, -pitDepth + 0.05, 0);
  root.add(table);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.70, 0.75, 24), matTable);
  pedestal.position.y = 0.38;
  table.add(pedestal);

  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.14, 48), matTable);
  top.position.y = 0.82;
  table.add(top);

  const felt = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.42, 0.05, 48), matFelt);
  felt.position.y = 0.89;
  table.add(felt);

  // Pass-line / inner ring marker
  const passLine = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.86, 64),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
  );
  passLine.rotation.x = -Math.PI / 2;
  passLine.position.y = 0.915;
  table.add(passLine);

  // Dealer button (flat, correct)
  const dealer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.085, 0.012, 24),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.35, metalness: 0.05 })
  );
  dealer.position.set(0.35, 0.93, 0.25);
  dealer.rotation.x = Math.PI / 2;
  dealer.name = "dealerButton";
  table.add(dealer);

  // Chairs and “players” placeholders around the table (lightweight silhouettes)
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.9, metalness: 0.05 });
  const playerMat = new THREE.MeshStandardMaterial({ color: 0x1c1c26, roughness: 0.95, metalness: 0.0 });

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 2.65;

    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.48), chairMat);
    chair.position.set(Math.cos(a) * r, 0.42, Math.sin(a) * r);
    chair.lookAt(0, 0.42, 0);
    chair.name = `chair_${i}`;
    table.add(chair);

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 6, 12), playerMat);
    body.position.set(Math.cos(a) * (r + 0.25), 0.75, Math.sin(a) * (r + 0.25));
    body.lookAt(0, 0.75, 0);
    body.name = `player_${i}`;
    table.add(body);
  }

  // “Store/mannequins” placeholder area (so your module can hook into it later)
  const store = new THREE.Group();
  store.name = "storeZone";
  store.position.set(-10, 0, -10);
  root.add(store);

  const storePad = new THREE.Mesh(new THREE.CircleGeometry(3.5, 64), matFloor);
  storePad.rotation.x = -Math.PI / 2;
  storePad.position.y = 0.01;
  store.add(storePad);

  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.9, 6, 12), playerMat);
    m.position.set(-1.5 + i, 0.95, 0);
    m.name = `mannequin_${i}`;
    store.add(m);
  }

  // Spawn: show the pit immediately
  rig.position.set(0, 0, pitRadius + 4.2);
  rig.rotation.y = Math.PI; // face center

  // Provide floor meshes for teleport + ray hits
  const floorMeshes = [floor, pitFloor];

  // UI surface hooks
  const ui = {
    _hudVisible: true,
    setHudVisible(v) {
      ui._hudVisible = !!v;
      // (keep minimal to avoid overload; HUD is mostly DOM buttons + diag)
    },
    toggleHud() {
      ui.setHudVisible(!ui._hudVisible);
      push?.(`[ui] hud=${ui._hudVisible}`);
    },
    toggleTeleport() {
      // router fallback uses its own teleportMode; kept here for compatibility
      push?.(`[ui] teleport toggle (handled by controls)`);
    },
    toggleModules() {
      Scarlett?.MODULES?.toggle?.();
    }
  };

  // Tick (lightweight only)
  function tick() {
    // subtle dealer button rotation (optional, not heavy)
    dealer.rotation.z += 0.002;
  }

  push?.(`[world] ready ✅ (casino + divot + stairs + table + placeholders)`);

  return { root, tick, ui, floorMeshes };
}
