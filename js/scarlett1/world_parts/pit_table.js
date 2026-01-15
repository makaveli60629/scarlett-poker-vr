// /js/scarlett1/world_parts/pit_table.js — Pit + Table + Rails + Chairs v1.0

export function buildPitAndTable(ctx, core) {
  const { THREE } = ctx;
  const { scene, mats } = core;

  const cyl = (rt,rb,h,mat,seg=48) => new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg), mat);
  const box = (w,h,d,mat) => new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
  const torus = (r,t,mat) => new THREE.Mesh(new THREE.TorusGeometry(r,t,16,96), mat);

  // Pit
  const pitOuterR = 9.2;
  const pitInnerR = 5.2;

  const pitRing = new THREE.Mesh(
    new THREE.RingGeometry(pitInnerR, pitOuterR, 160),
    new THREE.MeshStandardMaterial({ color: 0x05070b, roughness: 1.0, metalness: 0.0 })
  );
  pitRing.rotation.x = -Math.PI/2;
  pitRing.position.y = 0.01;
  scene.add(pitRing);

  const pitFloor = new THREE.Mesh(
    new THREE.CircleGeometry(pitInnerR - 0.05, 120),
    new THREE.MeshStandardMaterial({ color: 0x04060a, roughness: 1.0, metalness: 0.0 })
  );
  pitFloor.rotation.x = -Math.PI/2;
  pitFloor.position.y = -0.55;
  scene.add(pitFloor);

  // Short stairs into pit
  const steps = 7;
  const startZ = pitOuterR - 0.7;
  const endZ = pitInnerR + 0.9;
  const dz = (startZ - endZ) / steps;
  const dy = 0.55 / steps;
  for (let i=0;i<steps;i++) {
    const s = box(3.2, 0.12, dz*0.95, mats.TRIM);
    s.position.set(0, 0.06 - i*dy, -(endZ + i*dz));
    scene.add(s);
  }

  // Table base + felt + rail
  const tableBase = cyl(4.9, 4.9, 0.8, new THREE.MeshStandardMaterial({ color: 0x121b2b, roughness: 0.65, metalness: 0.14 }), 64);
  tableBase.position.y = 0.4;
  scene.add(tableBase);

  const felt = cyl(4.45, 4.45, 0.14, new THREE.MeshStandardMaterial({ color: 0x0b6b4b, roughness: 0.95, metalness: 0.0 }), 64);
  felt.position.y = 0.82;
  scene.add(felt);

  const rail = torus(4.55, 0.24, mats.TRIM);
  rail.rotation.x = Math.PI/2;
  rail.position.y = 1.0;
  scene.add(rail);

  // Guard rails
  const railR = pitOuterR + 0.65;
  const posts = 32;
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.05, 12);
  const railGeo = new THREE.CylinderGeometry(0.045, 0.045, 1, 10);

  for (let i=0;i<posts;i++) {
    const a = (i/posts)*Math.PI*2;
    const x = Math.cos(a)*railR;
    const z = Math.sin(a)*railR;

    const post = new THREE.Mesh(postGeo, mats.TRIM);
    post.position.set(x, 0.55, z);
    scene.add(post);

    const a2 = ((i+1)/posts)*Math.PI*2;
    const x2 = Math.cos(a2)*railR;
    const z2 = Math.sin(a2)*railR;

    const mid = new THREE.Vector3((x+x2)/2, 0.92, (z+z2)/2);
    const seg = new THREE.Mesh(railGeo, mats.TRIM);
    seg.position.copy(mid);

    const dx2 = x2-x, dz2 = z2-z;
    const len = Math.hypot(dx2,dz2);
    seg.scale.set(1,1,len);
    seg.rotation.y = Math.atan2(dx2, dz2);
    seg.rotation.x = Math.PI/2;
    scene.add(seg);
  }

  const glowRing = torus(railR, 0.03, new THREE.MeshStandardMaterial({
    color: 0x2b6cff, roughness: 0.2, metalness: 0.2, emissive: 0x2b6cff, emissiveIntensity: 1.2
  }));
  glowRing.rotation.x = Math.PI/2;
  glowRing.position.y = 0.98;
  scene.add(glowRing);

  // Chairs (8)
  function addChair(angle, radius) {
    const group = new THREE.Group();
    const seat = box(0.85, 0.16, 0.85, new THREE.MeshStandardMaterial({ color: 0x121b2b, roughness: 0.65, metalness: 0.14 }));
    seat.position.y = 0.52;
    group.add(seat);

    const back = box(0.85, 0.95, 0.12, mats.WALL);
    back.position.set(0, 1.05, -0.36);
    group.add(back);

    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.52, 10);
    for (const sx of [-0.32, 0.32]) for (const sz of [-0.32, 0.32]) {
      const leg = new THREE.Mesh(legGeo, mats.TRIM);
      leg.position.set(sx, 0.26, sz);
      group.add(leg);
    }

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    group.position.set(x, 0, z);
    group.rotation.y = -angle + Math.PI;
    scene.add(group);
  }
  for (let i=0;i<8;i++) addChair((i/8)*Math.PI*2, 7.6);

  return { pitOuterR, pitInnerR };
    }
