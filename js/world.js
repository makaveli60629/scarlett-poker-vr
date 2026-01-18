// /js/world.js
// SCARLETT WORLD (FULL SAFE DEMO): shell + divot + table + bots + VIP
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export function buildWorld(scene, dwrite = console.log){
  // Floor grid
  const grid = new THREE.GridHelper(80, 80, 0x0aa7ff, 0x003344);
  grid.position.y = 0.001;
  scene.add(grid);

  // Casino shell
  const shell = new THREE.Group();
  scene.add(shell);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 70),
    new THREE.MeshStandardMaterial({ color: 0x071017, roughness: 0.95, metalness: 0.02 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  shell.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b1520, roughness: 1.0, metalness: 0.0 });
  const mkWall = (w,h,d,x,y,z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat);
    m.position.set(x,y,z);
    shell.add(m);
  };
  mkWall(70, 7, 1, 0, 3.5, -35);
  mkWall(70, 7, 1, 0, 3.5, 35);
  mkWall(1, 7, 70, -35, 3.5, 0);
  mkWall(1, 7, 70, 35, 3.5, 0);

  dwrite("[shell] casino shell ready");

  // Divot pit
  const pit = new THREE.Group();
  pit.position.set(0, 0, 0);
  scene.add(pit);

  const pitFloor = new THREE.Mesh(
    new THREE.CircleGeometry(10.2, 64),
    new THREE.MeshStandardMaterial({ color: 0x04090f, roughness: 0.98, metalness: 0.0 })
  );
  pitFloor.rotation.x = -Math.PI / 2;
  pitFloor.position.y = -0.60;
  pit.add(pitFloor);

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(10.25, 0.14, 14, 120),
    new THREE.MeshStandardMaterial({ color: 0x0b3a3a, roughness: 0.35, metalness: 0.25 })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = -0.06;
  pit.add(rail);

  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(7.5, 0.28, 9.5),
    new THREE.MeshStandardMaterial({ color: 0x061019, roughness: 0.95, metalness: 0.0 })
  );
  ramp.position.set(0, -0.18, 9.8);
  ramp.rotation.x = -0.11;
  pit.add(ramp);

  dwrite("[divot] pit + rails ready");

  // Poker table
  const table = new THREE.Group();
  table.position.set(0, -0.60, 0);
  pit.add(table);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(3.35, 3.35, 0.18, 64),
    new THREE.MeshStandardMaterial({ color: 0x0cc6c6, roughness: 0.55, metalness: 0.12 })
  );
  felt.position.y = 0.90;
  table.add(felt);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(3.40, 0.19, 16, 120),
    new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.42, metalness: 0.22 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.90;
  table.add(rim);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.60, 0.85, 1.15, 28),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.78, metalness: 0.05 })
  );
  pedestal.position.y = 0.32;
  table.add(pedestal);

  // Community cards
  const cards = new THREE.Group();
  cards.position.set(0, 1.06, 0);
  table.add(cards);

  const cardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.0 });
  for (let i=0;i<5;i++){
    const c = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.46), cardMat);
    c.rotation.x = -Math.PI/2;
    c.position.set((i-2)*0.38, 0.01, 0);
    cards.add(c);
  }

  dwrite("[divot] pit + rails + table ready");

  // Bots + hole cards
  const bots = new THREE.Group();
  bots.position.set(0, -0.60, 0);
  pit.add(bots);

  const botMat = new THREE.MeshStandardMaterial({ color: 0x2233ff, roughness: 0.88, metalness: 0.02 });
  const botGeo = new THREE.CapsuleGeometry(0.19, 0.62, 6, 10);

  const seats = 6;
  const seatR = 4.85;
  const holeGroups = [];

  function makeCard(w,h){
    return new THREE.Mesh(new THREE.PlaneGeometry(w,h), cardMat);
  }

  for (let i=0;i<seats;i++){
    const a = (i/seats)*Math.PI*2;
    const x = Math.cos(a)*seatR;
    const z = Math.sin(a)*seatR;

    const b = new THREE.Mesh(botGeo, botMat);
    b.position.set(x, 0.92, z);
    b.rotation.y = -a + Math.PI;
    bots.add(b);

    const hand = new THREE.Group();
    hand.position.set(x*0.82, 1.42, z*0.82);
    hand.lookAt(0, 1.15, 0);
    pit.add(hand);
    holeGroups.push(hand);

    for (let k=0;k<2;k++){
      const hc = makeCard(0.22, 0.32);
      hc.position.set((k-0.5)*0.26, 0, 0);
      hand.add(hc);
    }
  }

  dwrite("[bots] bots seated + cards ready");

  // VIP room (no divot)
  const vip = new THREE.Group();
  vip.position.set(14.5, 0, -10.5);
  scene.add(vip);

  const vipFloor = new THREE.Mesh(
    new THREE.CircleGeometry(5.4, 48),
    new THREE.MeshStandardMaterial({ color: 0x0a0f14, roughness: 0.98, metalness: 0.0 })
  );
  vipFloor.rotation.x = -Math.PI/2;
  vipFloor.position.y = 0.02;
  vip.add(vipFloor);

  const vipTable = new THREE.Mesh(
    new THREE.CylinderGeometry(2.55, 2.55, 0.18, 64),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.72, metalness: 0.10 })
  );
  vipTable.scale.z = 1.35;
  vipTable.position.y = 0.88;
  vip.add(vipTable);

  dwrite("[vip] room ready ✅");

  // Extras sign
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 1.1, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x001a24, roughness: 0.45, metalness: 0.15 })
  );
  sign.position.set(0, 3.2, -8.2);
  sign.material.emissive = new THREE.Color(0x002a33);
  sign.material.emissiveIntensity = 0.8;
  scene.add(sign);

  dwrite("[env] extras ready");

  let t=0;
  return {
    tick(dt){
      t += dt;
      sign.rotation.y = Math.sin(t*0.35)*0.18;
      const bob = Math.sin(t*1.8)*0.02;
      for (const g of holeGroups) g.position.y = 1.42 + bob;
    }
  };
}
