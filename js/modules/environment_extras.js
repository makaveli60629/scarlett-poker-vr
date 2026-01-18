// /js/modules/environment_extras.js
// Adds a nicer lobby environment: bar, booths, balcony, stairs, pillars, display cases, warm lighting.
export function createEnvironmentExtras({ THREE, dwrite }){
  const group = new THREE.Group();
  group.name = "environmentExtras";

  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.55, metalness: 0.08 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b0b12, roughness: 0.95 });
  const neonPink = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff00aa, emissiveIntensity: 1.0, roughness: 0.35 });
  const neonBlue = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x2aa3ff, emissiveIntensity: 1.0, roughness: 0.35 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x99ccff, roughness: 0.12, metalness: 0.0, transparent: true, opacity: 0.22 });

  // Bar counter (back-right)
  const bar = new THREE.Mesh(new THREE.BoxGeometry(12, 1.2, 2.2), wood);
  bar.position.set(16, 0.6, -10);
  group.add(bar);

  const barTop = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.15, 2.4), new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness:0.25, metalness:0.2 }));
  barTop.position.set(16, 1.275, -10);
  group.add(barTop);

  // Bar shelves
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 0.5), dark);
  shelf.position.set(16, 3.2, -11.2);
  group.add(shelf);
  const shelf2 = shelf.clone(); shelf2.position.y = 4.0; group.add(shelf2);

  // Bottle silhouettes
  const bottleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x44ff99, emissiveIntensity: 0.35, roughness: 0.35 });
  for (let i=0;i<14;i++){
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.10,0.42,12), bottleMat);
    b.position.set(11.5 + i*0.35, 3.55, -11.2);
    group.add(b);
  }

  // VIP booth area (back-left)
  const vipBase = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 6), dark);
  vipBase.position.set(-16, 0.15, -12);
  group.add(vipBase);

  const vipSofa = new THREE.Mesh(new THREE.BoxGeometry(9.5, 1.0, 1.2), wood);
  vipSofa.position.set(-16, 0.8, -14.2);
  group.add(vipSofa);
  const vipSofa2 = vipSofa.clone(); vipSofa2.position.z = -9.8; group.add(vipSofa2);

  const vipNeon = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 0.25), neonPink);
  vipNeon.position.set(-16, 3.8, -16.8);
  group.add(vipNeon);

  // Stairs to balcony (right side)
  const stepMat = new THREE.MeshStandardMaterial({ color: 0x2a2a33, roughness:0.9 });
  for (let i=0;i<10;i++){
    const step = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 0.8), stepMat);
    step.position.set(24, 0.09 + i*0.18, 10 - i*0.85);
    group.add(step);
  }

  // Balcony platform
  const balcony = new THREE.Mesh(new THREE.BoxGeometry(16, 0.35, 10), dark);
  balcony.position.set(22, 2.0, 2);
  group.add(balcony);

  // Balcony rail
  const railMat = new THREE.MeshStandardMaterial({ color: 0x444455, roughness:0.75, metalness:0.2 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(16, 0.9, 0.18), railMat);
  rail.position.set(22, 2.65, -3);
  group.add(rail);

  // Pillars near center
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x12121a, roughness:0.85 });
  const pillarGeo = new THREE.CylinderGeometry(0.55,0.55,10,20);
  const pillarPositions = [
    [8,5,-6],[ -8,5,-6],[ 10,5,8],[ -10,5,8]
  ];
  for (const [x,y,z] of pillarPositions){
    const p = new THREE.Mesh(pillarGeo, pillarMat);
    p.position.set(x,y,z);
    group.add(p);
  }

  // Display cases (front)
  const caseBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 1.2), dark);
  for (let i=0;i<3;i++){
    const cb = caseBase.clone();
    cb.position.set(-6 + i*3.2, 0.25, 18);
    group.add(cb);
    const glassBox = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.2, 1.05), glass);
    glassBox.position.set(cb.position.x, 1.0, cb.position.z);
    group.add(glassBox);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 1.2), neonBlue);
    glow.position.set(cb.position.x, 1.65, cb.position.z);
    group.add(glow);
  }

  // Light fixtures
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffdd88, emissiveIntensity: 0.8, roughness:0.25 });
  for (let i=0;i<6;i++){
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.12,24), lightMat);
    l.position.set(-10 + i*4, 14.9, 6);
    group.add(l);
  }

  dwrite?.("[env] extras ready (bar/vip/stairs/balcony/cases)");
  return { group };
}
