// /js/scarlett1/world_parts/bots.js — Bots w/ arms+legs + walking v1.0

export function makeBotsSystem(ctx, core) {
  const { THREE } = ctx;
  const { scene, cfg } = core;

  const bots = [];
  const BOT_COUNT = 10;

  const rand = (a,b)=>a+Math.random()*(b-a);

  function makeBot() {
    const g = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1b3cff, roughness: 0.35, metalness: 0.25, emissive: 0x0b1430 });
    const limbMat = new THREE.MeshStandardMaterial({ color: 0x122744, roughness: 0.55, metalness: 0.25, emissive: 0x081020 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.62, 6, 14), bodyMat);
    torso.position.y = 1.05;
    g.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), bodyMat);
    head.position.y = 1.55;
    g.add(head);

    const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.55, 10);
    const legGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.62, 10);

    const armL = new THREE.Mesh(armGeo, limbMat);
    const armR = new THREE.Mesh(armGeo, limbMat);
    armL.position.set(-0.28, 1.15, 0);
    armR.position.set( 0.28, 1.15, 0);
    g.add(armL, armR);

    const legL = new THREE.Mesh(legGeo, limbMat);
    const legR = new THREE.Mesh(legGeo, limbMat);
    legL.position.set(-0.12, 0.55, 0);
    legR.position.set( 0.12, 0.55, 0);
    g.add(legL, legR);

    g.userData = { armL, armR, legL, legR, tx:0, tz:0, t:0, speed:0.85+Math.random()*0.35, phase:Math.random()*10 };
    return g;
  }

  function spawnBot() {
    const b = makeBot();
    b.position.set(rand(-10,10), 0, rand(-10,10));
    b.userData.tx = rand(-cfg.LOBBY_R+8, cfg.LOBBY_R-8);
    b.userData.tz = rand(-cfg.LOBBY_R+8, cfg.LOBBY_R-8);
    b.userData.t = rand(1.5,6);
    scene.add(b);
    bots.push(b);
  }
  for (let i=0;i<BOT_COUNT;i++) spawnBot();

  function update(dt, now) {
    for (const b of bots) {
      const u = b.userData;
      u.t -= dt;
      if (u.t <= 0) {
        u.t = rand(2,6);
        const a = rand(0, Math.PI*2);
        const r = rand(10, cfg.LOBBY_R-10);
        u.tx = Math.cos(a)*r;
        u.tz = Math.sin(a)*r;
      }

      const dx = u.tx - b.position.x;
      const dz = u.tz - b.position.z;
      const d = Math.hypot(dx,dz)+1e-6;

      // keep out of pit
      const td = Math.hypot(b.position.x, b.position.z);
      if (td < 10.2) { u.tx = b.position.x*1.35; u.tz = b.position.z*1.35; }

      b.position.x += (dx/d)*u.speed*dt;
      b.position.z += (dz/d)*u.speed*dt;
      b.rotation.y = Math.atan2((dx/d),(dz/d));

      const w = (now + u.phase) * 6.0;
      u.legL.rotation.x = Math.sin(w) * 0.55;
      u.legR.rotation.x = Math.sin(w + Math.PI) * 0.55;
      u.armL.rotation.x = Math.sin(w + Math.PI) * 0.45;
      u.armR.rotation.x = Math.sin(w) * 0.45;
    }
  }

  return { update };
}
