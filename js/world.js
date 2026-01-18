// /js/world.js
// SCARLETT WORLD (RECOVERED CLEAN COPY)
// Build: WORLD_PERMA_RECOVERY_v1

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export function buildWorld(scene, dwrite = console.log) {
  const WORLD_BUILD = "WORLD_PERMA_RECOVERY_v1";
  dwrite(`[world] buildWorld() ${WORLD_BUILD}`);

  // ---------- helpers ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const makeMat = (hex, rough = 0.85, metal = 0.05) =>
    new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal });

  // Root groups so you can later replace pieces without rewriting everything
  const root = new THREE.Group();
  root.name = "scarlettWorldRoot";
  scene.add(root);

  const shell = new THREE.Group();
  shell.name = "casinoShell";
  root.add(shell);

  const pit = new THREE.Group();
  pit.name = "mainPit";
  root.add(pit);

  const vip = new THREE.Group();
  vip.name = "vipRoom";
  root.add(vip);

  // ---------- lighting (safe default; your main index can override) ----------
  // If you already add lights elsewhere, this still looks fine (no blowout).
  const amb = new THREE.AmbientLight(0xffffff, 0.35);
  root.add(amb);

  const key = new THREE.DirectionalLight(0xffffff, 0.75);
  key.position.set(6, 10, 5);
  key.castShadow = false;
  root.add(key);

  // ---------- floor + shell ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 70),
    makeMat(0x071017, 0.95, 0.02)
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  shell.add(floor);

  // Grid helper (diagnostic vibe; can remove later)
  const grid = new THREE.GridHelper(80, 80, 0x0aa7ff, 0x003344);
  grid.position.y = 0.001;
  shell.add(grid);

  // Soft walls to avoid “void”
  const wallMat = makeMat(0x0b1520, 1.0, 0.0);
  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    shell.add(m);
    return m;
  };
  mkWall(70, 7, 1, 0, 3.5, -35);
  mkWall(70, 7, 1, 0, 3.5, 35);
  mkWall(1, 7, 70, -35, 3.5, 0);
  mkWall(1, 7, 70, 35, 3.5, 0);

  dwrite("[shell] casino shell ready");

  // ---------- pit / divot ----------
  // Pit is a lowered floor circle + rails ring + ramp “stairs”
  pit.position.set(0, 0, 0);

  const pitFloor = new THREE.Mesh(
    new THREE.CircleGeometry(10.2, 64),
    makeMat(0x04090f, 0.98, 0.0)
  );
  pitFloor.rotation.x = -Math.PI / 2;
  pitFloor.position.y = -0.60;
  pit.add(pitFloor);

  // Rails ring
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(10.25, 0.14, 14, 120),
    makeMat(0x0b3a3a, 0.35, 0.25)
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = -0.06;
  pit.add(rail);

  // Ramp / stairs placeholder
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(7.5, 0.28, 9.5),
    makeMat(0x061019, 0.95, 0.0)
  );
  ramp.position.set(0, -0.18, 9.8);
  ramp.rotation.x = -0.11;
  pit.add(ramp);

  // Pit “lip” ring (subtle highlight)
  const lip = new THREE.Mesh(
    new THREE.TorusGeometry(10.15, 0.05, 10, 120),
    makeMat(0x0aa7ff, 0.3, 0.05)
  );
  lip.rotation.x = Math.PI / 2;
  lip.position.y = -0.02;
  lip.material.emissive = new THREE.Color(0x003344);
  lip.material.emissiveIntensity = 0.6;
  pit.add(lip);

  dwrite("[divot] pit + rails ready");

  // ---------- main poker table ----------
  const table = new THREE.Group();
  table.name = "mainTable";
  table.position.set(0, -0.60, 0);
  pit.add(table);

  // Felt
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(3.35, 3.35, 0.18, 64),
    makeMat(0x0cc6c6, 0.55, 0.12)
  );
  felt.position.y = 0.90;
  table.add(felt);

  // Rim
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(3.40, 0.19, 16, 120),
    makeMat(0x101010, 0.42, 0.22)
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.90;
  table.add(rim);

  // Pedestal
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.60, 0.85, 1.15, 28),
    makeMat(0x0a0a0a, 0.78, 0.05)
  );
  pedestal.position.y = 0.32;
  table.add(pedestal);

  // Community cards (always visible + high enough)
  const cards = new THREE.Group();
  cards.name = "communityCards";
  cards.position.set(0, 1.05, 0);
  table.add(cards);

  const cardFaceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.0 });
  const cardBackMat = new THREE.MeshStandardMaterial({ color: 0x0b3a3a, roughness: 0.55, metalness: 0.05 });

  function makeCard() {
    const g = new THREE.PlaneGeometry(0.32, 0.46);
    const front = new THREE.Mesh(g, cardFaceMat);
    const back = new THREE.Mesh(g, cardBackMat);
    // Give “thickness” illusion
    back.position.z = -0.002;
    back.rotation.y = Math.PI;
    const grp = new THREE.Group();
    grp.add(front);
    grp.add(back);
    grp.rotation.x = -Math.PI / 2;
    return grp;
  }

  for (let i = 0; i < 5; i++) {
    const c = makeCard();
    c.position.set((i - 2) * 0.38, 0.01, 0);
    cards.add(c);
  }

  dwrite("[table] table + community cards ready");

  // ---------- bots seated + floating hole cards ----------
  const bots = new THREE.Group();
  bots.name = "bots";
  pit.add(bots);

  const botMat = makeMat(0x2233ff, 0.88, 0.02);
  const botGeo = new THREE.CapsuleGeometry(0.19, 0.62, 6, 10);

  const seatCount = 6;
  const seatRadius = 4.85;

  const botHeads = [];
  const holeCardGroups = [];

  for (let i = 0; i < seatCount; i++) {
    const a = (i / seatCount) * Math.PI * 2;
    const x = Math.cos(a) * seatRadius;
    const z = Math.sin(a) * seatRadius;

    const b = new THREE.Mesh(botGeo, botMat);
    b.position.set(x, 0.92, z);
    b.rotation.y = -a + Math.PI; // face center
    bots.add(b);
    botHeads.push(b);

    // Floating “mirror” hole cards (hover at all times)
    const hc = new THREE.Group();
    hc.name = `bot${i}_holecards`;
    hc.position.set(x * 0.82, 1.42, z * 0.82);
    hc.lookAt(0, 1.15, 0);

    const c1 = makeCard();
    const c2 = makeCard();
    c1.rotation.x = 0; c2.rotation.x = 0; // face camera group
    c1.position.set(-0.14, 0, 0);
    c2.position.set(0.14, 0, 0);
    hc.add(c1);
    hc.add(c2);

    pit.add(hc);
    holeCardGroups.push(hc);
  }

  dwrite("[bots] bots seated + hole cards ready");

  // ---------- VIP room (no divot) ----------
  vip.position.set(14.5, 0, -10.5);

  const vipFloor = new THREE.Mesh(
    new THREE.CircleGeometry(5.4, 48),
    makeMat(0x0a0f14, 0.98, 0.0)
  );
  vipFloor.rotation.x = -Math.PI / 2;
  vipFloor.position.y = 0.02;
  vip.add(vipFloor);

  // 6-seat oval table (VIP)
  const vipTable = new THREE.Mesh(
    new THREE.CylinderGeometry(2.55, 2.55, 0.18, 64),
    makeMat(0x1a1a1a, 0.72, 0.1)
  );
  vipTable.scale.z = 1.35; // oval-ish
  vipTable.position.y = 0.88;
  vip.add(vipTable);

  const vipFelt = new THREE.Mesh(
    new THREE.CylinderGeometry(2.35, 2.35, 0.12, 64),
    makeMat(0x0a5c5c, 0.60, 0.08)
  );
  vipFelt.scale.z = 1.35;
  vipFelt.position.y = 0.98;
  vip.add(vipFelt);

  dwrite("[vip] room ready ✅");

  // ---------- signage / extras ----------
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 1.1, 0.12),
    makeMat(0x001a24, 0.45, 0.15)
  );
  sign.position.set(0, 3.2, -8.2);
  sign.material.emissive = new THREE.Color(0x002a33);
  sign.material.emissiveIntensity = 0.8;
  root.add(sign);

  // ---------- tick animation ----------
  let t = 0;
  function tick(dt) {
    t += dt;

    // Subtle sign rotation (proof of life)
    sign.rotation.y = Math.sin(t * 0.35) * 0.18;

    // Gentle hover for hole cards (keeps “alive”)
    const bob = Math.sin(t * 1.8) * 0.02;
    for (const g of holeCardGroups) g.position.y = 1.42 + bob;

    // Tiny bot sway
    for (let i = 0; i < botHeads.length; i++) {
      const b = botHeads[i];
      b.rotation.y += Math.sin(t * 0.25 + i) * 0.0006;
    }
  }

  // Return handles for future upgrades
  return {
    root, shell, pit, vip, table,
    tick
  };
}
