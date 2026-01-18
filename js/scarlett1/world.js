// /js/scarlett1/world.js
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export function buildWorld(scene, dwrite = console.log) {
  // Floor grid
  const grid = new THREE.GridHelper(80, 80, 0x0aa7ff, 0x003344);
  grid.position.y = 0;
  scene.add(grid);

  // Casino “shell”
  const shell = new THREE.Group();
  scene.add(shell);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x071017, roughness: 0.9, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  shell.add(floor);

  // Soft walls (so you don’t get “empty void”)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b1520, roughness: 1.0, metalness: 0.0 });
  const mkWall = (w,h,d,x,y,z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat);
    m.position.set(x,y,z);
    shell.add(m);
  };
  mkWall(60, 6, 1, 0, 3, -30);
  mkWall(60, 6, 1, 0, 3, 30);
  mkWall(1, 6, 60, -30, 3, 0);
  mkWall(1, 6, 60, 30, 3, 0);

  dwrite("[shell] casino shell ready");

  // Divot pit
  const pit = new THREE.Group();
  pit.position.set(0, 0, 0);
  scene.add(pit);

  const pitFloor = new THREE.Mesh(
    new THREE.CircleGeometry(9.5, 64),
    new THREE.MeshStandardMaterial({ color: 0x04090f, roughness: 0.95, metalness: 0.0 })
  );
  pitFloor.rotation.x = -Math.PI / 2;
  pitFloor.position.y = -0.55;
  pit.add(pitFloor);

  // Rails ring
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(9.6, 0.12, 12, 96),
    new THREE.MeshStandardMaterial({ color: 0x0b3a3a, roughness: 0.35, metalness: 0.2 })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = -0.05;
  pit.add(rail);

  // Stairs “ramp”
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.3, 8),
    new THREE.MeshStandardMaterial({ color: 0x061019, roughness: 0.9 })
  );
  ramp.position.set(0, -0.15, 8.5);
  ramp.rotation.x = -0.10;
  pit.add(ramp);

  // Poker table (center)
  const table = new THREE.Group();
  table.position.set(0, -0.55, 0);
  pit.add(table);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 0.16, 48),
    new THREE.MeshStandardMaterial({ color: 0x0cc6c6, roughness: 0.55, metalness: 0.1 })
  );
  felt.position.y = 0.85;
  table.add(felt);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(3.25, 0.18, 16, 96),
    new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.4, metalness: 0.2 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.85;
  table.add(rim);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.75, 1.1, 24),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.7 })
  );
  pedestal.position.y = 0.3;
  table.add(pedestal);

  // Community cards placeholder (always visible)
  const cardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const cards = new THREE.Group();
  cards.position.set(0, 1.02, 0);
  table.add(cards);

  for (let i = 0; i < 5; i++) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.46), cardMat);
    c.rotation.x = -Math.PI / 2;
    c.position.set((i - 2) * 0.38, 0.001, 0);
    cards.add(c);
  }

  dwrite("[divot] pit + rails + table ready");

  // Bots placeholders (seated ring)
  const bots = new THREE.Group();
  bots.position.set(0, -0.55, 0);
  pit.add(bots);

  const botMat = new THREE.MeshStandardMaterial({ color: 0x2233ff, roughness: 0.85 });
  const botGeo = new THREE.CapsuleGeometry(0.18, 0.55, 6, 10);

  const seatR = 4.6;
  const seats = 6;
  for (let i = 0; i < seats; i++) {
    const a = (i / seats) * Math.PI * 2;
    const x = Math.cos(a) * seatR;
    const z = Math.sin(a) * seatR;

    const b = new THREE.Mesh(botGeo, botMat);
    b.position.set(x, 0.85, z);
    b.rotation.y = -a + Math.PI; // face table
    bots.add(b);

    // Floating “hole cards” mirror
    const hand = new THREE.Group();
    hand.position.set(x * 0.82, 1.35, z * 0.82);
    hand.lookAt(0, 1.15, 0);
    pit.add(hand);

    for (let k = 0; k < 2; k++) {
      const hc = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.32), cardMat);
      hc.position.set((k - 0.5) * 0.26, 0, 0);
      hand.add(hc);
    }
  }

  dwrite("[bots] bots seated + cards ready");

  // VIP room placeholder
  const vip = new THREE.Group();
  vip.position.set(14, 0, -10);
  scene.add(vip);

  const vipFloor = new THREE.Mesh(
    new THREE.CircleGeometry(5, 48),
    new THREE.MeshStandardMaterial({ color: 0x0a0f14, roughness: 0.95 })
  );
  vipFloor.rotation.x = -Math.PI / 2;
  vipFloor.position.y = 0.02;
  vip.add(vipFloor);

  const vipTable = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 0.16, 48),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 })
  );
  vipTable.position.y = 0.85;
  vip.add(vipTable);

  dwrite("[vip] room ready ✅");

  // Extras placeholder
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 1.0, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x001a24, roughness: 0.4, metalness: 0.2 })
  );
  sign.position.set(0, 3.0, -8);
  scene.add(sign);

  dwrite("[env] extras ready");

  return {
    tick(dt) {
      // subtle animation so you know render loop is alive
      sign.rotation.y += dt * 0.25;
    }
  };
    }
