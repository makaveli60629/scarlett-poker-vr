// /js/modules/bots.js
// Lightweight bots: 5 seated players + 1 open seat + 1 guard + 1 bystander

export function installBots(ctx){
  const { THREE, scene, world } = ctx;
  const dwrite = (m)=>{ try{ window.__scarlettDiagWrite?.(m); }catch(_){ } };

  const bots = new THREE.Group();
  bots.name = 'bots';
  scene.add(bots);

  // Helper materials
  const matBody = new THREE.MeshStandardMaterial({ color: 0x2b3646, roughness: 0.85 });
  const matAccent = new THREE.MeshStandardMaterial({ color: 0xff2f6d, roughness: 0.55, metalness: 0.15, emissive: 0xff2f6d, emissiveIntensity: 0.10 });
  const matSkin = new THREE.MeshStandardMaterial({ color: 0xb58a6a, roughness: 0.9 });

  function makeBot(){
    const g = new THREE.Group();
    // torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.35, 6, 12), matBody);
    torso.position.y = 1.15;
    g.add(torso);
    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 16), matSkin);
    head.position.y = 1.55;
    g.add(head);
    // shoulders
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), matAccent);
    sh.position.set(0.21, 1.33, 0);
    g.add(sh);
    const sh2 = sh.clone();
    sh2.position.x = -0.21;
    g.add(sh2);
    // elbows
    const el = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), matAccent);
    el.position.set(0.33, 1.14, 0.06);
    g.add(el);
    const el2 = el.clone();
    el2.position.x = -0.33;
    g.add(el2);
    // butt
    const butt = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), matBody);
    butt.position.y = 0.95;
    g.add(butt);
    return g;
  }

  // Seat positions around table
  const seatCount = 6;
  const radius = 2.0;
  const seated = [];
  for (let i=0;i<seatCount;i++){
    const ang = (i/seatCount) * Math.PI*2;
    const x = Math.cos(ang)*radius;
    const z = Math.sin(ang)*radius;

    if (i === 0){
      // Open seat for player
      const marker = new THREE.Mesh(
        new THREE.RingGeometry(0.18, 0.26, 32),
        new THREE.MeshBasicMaterial({ color: 0x43f3a6, transparent:true, opacity:0.75 })
      );
      marker.rotation.x = -Math.PI/2;
      marker.position.set(x, -0.32, z);
      world.tableAnchor.add(marker);
      continue;
    }

    const b = makeBot();
    b.position.set(x, -0.35, z);
    b.rotation.y = -ang + Math.PI/2;
    world.tableAnchor.add(b);
    seated.push(b);
  }

  // Guard and bystander
  const guard = makeBot();
  guard.position.set(-10, 0, -6);
  guard.scale.setScalar(1.1);
  bots.add(guard);

  const bystander = makeBot();
  bystander.position.set(-6, 0, 8);
  bystander.rotation.y = 1.1;
  bots.add(bystander);

  // Simple walk loop for bystander
  let t = 0;
  const pathA = new THREE.Vector3(-6,0,8);
  const pathB = new THREE.Vector3(-10,0,12);
  const tmp = new THREE.Vector3();

  const tick = () => {
    t += 0.004;
    const s = (Math.sin(t)+1)/2;
    tmp.copy(pathA).lerp(pathB, s);
    bystander.position.copy(tmp);
    bystander.rotation.y = Math.atan2(pathB.x-pathA.x, pathB.z-pathA.z);
    requestAnimationFrame(tick);
  };
  tick();

  dwrite('[status] MODULE BOTS ✅');
}
