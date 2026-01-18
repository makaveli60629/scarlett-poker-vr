// /js/world.js
// SCARLETT FULL WORLD (brighter + landmarks)
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export function buildWorld(scene, dwrite = console.log){
  const root = new THREE.Group();
  root.name = "scarlettWorldRoot";
  scene.add(root);

  const mat = (hex, rough=0.85, metal=0.05) =>
    new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal });

  // Lobby floor
  const lobby = new THREE.Group();
  lobby.name = "lobby";
  root.add(lobby);

  const lobbyFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 140),
    mat(0x0a1720, 0.95, 0.02)
  );
  lobbyFloor.rotation.x = -Math.PI/2;
  lobby.add(lobbyFloor);

  const grid = new THREE.GridHelper(140, 140, 0x0aa7ff, 0x003344);
  grid.position.y = 0.001;
  lobby.add(grid);

  // Big neon sign
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(10.5, 1.9, 0.16),
    mat(0x001a24, 0.45, 0.15)
  );
  sign.position.set(0, 6.0, -12);
  sign.material.emissive = new THREE.Color(0x003a44);
  sign.material.emissiveIntensity = 1.1;
  lobby.add(sign);

  // Pit divot
  const pit = new THREE.Group();
  pit.name = "mainPit";
  root.add(pit);

  const pitFloor = new THREE.Mesh(
    new THREE.CircleGeometry(14.2, 72),
    mat(0x050b10, 0.98, 0.0)
  );
  pitFloor.rotation.x = -Math.PI/2;
  pitFloor.position.y = -0.75;
  pit.add(pitFloor);

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(14.25, 0.18, 14, 160),
    mat(0x0b3a3a, 0.35, 0.25)
  );
  rail.rotation.x = Math.PI/2;
  rail.position.y = -0.07;
  pit.add(rail);

  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.32, 14),
    mat(0x061019, 0.95, 0.0)
  );
  ramp.position.set(0, -0.22, 15.6);
  ramp.rotation.x = -0.12;
  pit.add(ramp);

  dwrite("[divot] pit ready ✅");

  // Teaching table center
  const table = new THREE.Group();
  table.position.set(0, -0.75, 0);
  pit.add(table);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(3.7, 3.7, 0.18, 72),
    mat(0x0cc6c6, 0.55, 0.12)
  );
  felt.position.y = 0.98;
  table.add(felt);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(3.78, 0.20, 16, 140),
    mat(0x101010, 0.42, 0.22)
  );
  rim.rotation.x = Math.PI/2;
  rim.position.y = 0.98;
  table.add(rim);

  // Community hover cards (emissive)
  const community = new THREE.Group();
  community.position.set(0, 1.35, 0);
  table.add(community);

  const cardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.0 });
  cardMat.emissive = new THREE.Color(0x111111);
  cardMat.emissiveIntensity = 0.7;

  const cardGeo = new THREE.PlaneGeometry(0.32, 0.46);
  for (let i=0;i<5;i++){
    const c = new THREE.Mesh(cardGeo, cardMat);
    c.rotation.x = -Math.PI/2;
    c.position.set((i-2)*0.38, 0, 0);
    community.add(c);
  }

  // Bots + hole cards + action rings
  const botMat = mat(0x2233ff, 0.88, 0.02);
  const botGeo = new THREE.CapsuleGeometry(0.19, 0.62, 6, 10);

  const holeGroups = [];
  const actionRings = [];
  const seats = 6, seatR = 5.2;

  for (let i=0;i<seats;i++){
    const a = (i/seats)*Math.PI*2;
    const x = Math.cos(a)*seatR;
    const z = Math.sin(a)*seatR;

    const b = new THREE.Mesh(botGeo, botMat);
    b.position.set(x, 1.00, z);
    b.rotation.y = -a + Math.PI;
    table.add(b);

    const hand = new THREE.Group();
    hand.position.set(x*0.82, 1.65, z*0.82);
    hand.lookAt(0, 1.3, 0);
    pit.add(hand);
    holeGroups.push(hand);

    for (let k=0;k<2;k++){
      const hc = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.32), cardMat);
      hc.position.set((k-0.5)*0.26, 0, 0);
      hand.add(hc);
    }

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.20, 0.28, 24),
      new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent:true, opacity:0.55, side:THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI/2;
    ring.position.set(x*0.62, 1.00, z*0.62);
    table.add(ring);
    actionRings.push(ring);
  }

  // Landmarks pads (bar/store/vip)
  function pad(w,d, x,z, labelColor){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    root.add(g);

    const p = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), mat(0x0a121a, 0.9, 0.02));
    p.position.y = 0.12;
    g.add(p);

    const s = new THREE.Mesh(new THREE.BoxGeometry(Math.min(7,w*0.6), 1.2, 0.14), mat(0x001a24, 0.45, 0.15));
    s.position.set(0, 2.8, -d*0.35);
    s.material.emissive = new THREE.Color(labelColor);
    s.material.emissiveIntensity = 1.0;
    g.add(s);

    return g;
  }

  pad(18, 10, -34, -22, 0x003344);
  pad(18, 12, -34,  20, 0x003355);
  pad(16, 12,  36,  20, 0x003311);

  dwrite("[world] landmarks ready ✅");

  // Tick
  let t = 0;
  return {
    tick(dt){
      t += dt;
      sign.rotation.y = Math.sin(t*0.35)*0.18;

      const bob = Math.sin(t*1.8)*0.02;
      community.position.y = 1.35 + bob;
      for (const g of holeGroups) g.position.y = 1.65 + bob;

      const pulse = (Math.sin(t*2.5)*0.5 + 0.5);
      for (const r of actionRings) r.material.opacity = 0.22 + pulse * 0.5;
    }
  };
}
