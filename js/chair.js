// /js/chair.js — 6 simple chairs around the table

export function createChairs({ THREE, scene, Diagnostics }) {
  const chairs = [];
  const radius = 3.1;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    const chair = buildChair(THREE);
    chair.position.set(x, 0, z);
    chair.lookAt(0, 0, 0);
    chair.rotateY(Math.PI);
    chair.name = `chair_${i+1}`;
    scene.add(chair);
    chairs.push({ group: chair, update(){} });
  }
  Diagnostics.log('world', `chairs ready ✅ count=${chairs.length}`);
  return chairs;
}

function buildChair(THREE) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.85 });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), mat);
  seat.position.y = 0.45;
  g.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.65, 0.08), mat);
  back.position.set(0, 0.78, -0.26);
  g.add(back);

  const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 12);
  const legPos = [
    [ 0.25, 0.22,  0.25],
    [-0.25, 0.22,  0.25],
    [ 0.25, 0.22, -0.25],
    [-0.25, 0.22, -0.25],
  ];
  for (const [x,y,z] of legPos) {
    const leg = new THREE.Mesh(legGeo, mat);
    leg.position.set(x,y,z);
    g.add(leg);
  }

  // subtle cushion
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.05, 0.58), new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.95 }));
  cushion.position.set(0, 0.495, 0);
  g.add(cushion);

  return g;
}
