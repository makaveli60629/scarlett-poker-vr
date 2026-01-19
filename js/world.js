// /js/world.js
// SCARLETT DEMO WORLD v0.1 (brighter + landmarks + spawn pad + teleport arch)
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

  // Spawn pad (authoritative demo spawn target)
  const spawnPad = new THREE.Group();
  spawnPad.name = "spawnPad";
  spawnPad.position.set(0, 0, 24.0);
  root.add(spawnPad);

  const spBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.25, 0.14, 48),
    mat(0x00151c, 0.7, 0.08)
  );
  spBase.position.y = 0.07;
  spBase.material.emissive = new THREE.Color(0x003a44);
  spBase.material.emissiveIntensity = 0.9;
  spawnPad.add(spBase);

  const spRing = new THREE.Mesh(
    new THREE.RingGeometry(0.95, 1.18, 48),
    new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent:true, opacity:0.8, side:THREE.DoubleSide })
  );
  spRing.rotation.x = -Math.PI/2;
  spRing.position.y = 0.155;
  spawnPad.add(spRing);

  // Teleporter arch (visual landmark)
  const arch = new THREE.Group();
  arch.name = "teleporterArch";
  arch.position.set(12, 0, 22);
  root.add(arch);

  const archMat = mat(0x071018, 0.55, 0.22);
  const archEm = new THREE.MeshStandardMaterial({ color: 0x071018, roughness: 0.55, metalness: 0.25, emissive: new THREE.Color(0x003a44), emissiveIntensity: 1.1 });

  const pillarGeo = new THREE.CylinderGeometry(0.18, 0.22, 2.6, 16);
  const pL = new THREE.Mesh(pillarGeo, archMat); pL.position.set(-1.05, 1.3, 0);
  const pR = new THREE.Mesh(pillarGeo, archMat); pR.position.set( 1.05, 1.3, 0);
  arch.add(pL, pR);

  const topGeo = new THREE.TorusGeometry(1.15, 0.14, 14, 48, Math.PI);
  const top = new THREE.Mesh(topGeo, archEm);
  top.rotation.z = Math.PI;
  top.position.set(0, 2.55, 0);
  arch.add(top);

  const portal = new THREE.Mesh(
    new THREE.RingGeometry(0.65, 0.95, 56),
    new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent:true, opacity:0.45, side:THREE.DoubleSide })
  );
  portal.position.set(0, 1.4, 0);
  arch.add(portal);

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

  // Community hover cards (emissive) — higher + always faces player
  const community = new THREE.Group();
  community.position.set(0, 1.85, 0);
  table.add(community);

  const cardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.0 });
  cardMat.emissive = new THREE.Color(0x111111);
  cardMat.emissiveIntensity = 0.7;

  const cardGeo = new THREE.PlaneGeometry(0.32, 0.46);
  const communityCards = [];
  for (let i=0;i<5;i++){
    const c = new THREE.Mesh(cardGeo, cardMat);
    // Keep upright; we'll face the player each tick.
    c.position.set((i-2)*0.38, 0, 0);
    community.add(c);
    communityCards.push(c);
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
    // Higher so you can read every hand (teaching mode)
    hand.position.set(x*0.82, 2.05, z*0.82);
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

  // ---- Jumbotron screen (optional video) ----
  const jumbo = new THREE.Group();
  jumbo.name = "jumbotron";
  jumbo.position.set(-18, 6.0, -18);
  jumbo.rotation.y = Math.PI * 0.25;
  root.add(jumbo);

  const jumboFrame = new THREE.Mesh(
    new THREE.BoxGeometry(10.2, 5.8, 0.25),
    mat(0x061019, 0.85, 0.05)
  );
  jumboFrame.position.set(0, 0, 0);
  jumbo.add(jumboFrame);

  const jumboMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
  const jumboScreen = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 5.2), jumboMat);
  jumboScreen.position.set(0, 0, 0.14);
  jumbo.add(jumboScreen);

  // Tick
  let t = 0;
  return {
    setJumbotronVideo(videoEl){
      try{
        const tex = new THREE.VideoTexture(videoEl);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        jumboMat.map = tex;
        jumboMat.needsUpdate = true;
        dwrite("[jumbotron] texture attached ✅");
      } catch(e){
        dwrite(`[jumbotron] attach failed: ${e?.message || e}`);
      }
    },
    tick(dt, ctx = {}){
      t += dt;
      sign.rotation.y = Math.sin(t*0.35)*0.18;

      const bob = Math.sin(t*1.8)*0.02;
      community.position.y = 1.85 + bob;
      for (const g of holeGroups) g.position.y = 2.05 + bob;

      // Face cards toward the player camera (teaching mode)
      const cam = ctx?.camera;
      if (cam){
        const camPos = new THREE.Vector3();
        cam.getWorldPosition(camPos);
        community.lookAt(camPos.x, community.position.y, camPos.z);
        for (const c of communityCards) c.lookAt(camPos);
        for (const g of holeGroups) g.lookAt(camPos);
      }

      const pulse = (Math.sin(t*2.5)*0.5 + 0.5);
      for (const r of actionRings) r.material.opacity = 0.22 + pulse * 0.5;

      portal.rotation.z = t * 0.6;
      spRing.rotation.z = -t * 0.8;
    }
  };
}
