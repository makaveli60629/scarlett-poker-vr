// /js/modules/vip_room.js
// VIP room: NO divot, oval table, 6 seats total (5 bots + 1 open seat)
export function createVIPRoom({ THREE, dwrite }, { center }){
  const group = new THREE.Group();
  group.name = "vipRoom";

  // Floor (flat, no divot)
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(5.5, 48),
    new THREE.MeshStandardMaterial({ color: 0x0c0c12, roughness:0.95 })
  );
  floor.rotation.x = -Math.PI/2;
  floor.position.copy(center);
  group.add(floor);

  // Oval table
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 0.28, 48, 1, false),
    new THREE.MeshStandardMaterial({ color: 0x083f26, roughness:0.85 })
  );
  table.scale.x = 1.35; // oval
  table.position.set(center.x, center.y + 0.65, center.z);
  group.add(table);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.14, 16, 64),
    new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness:0.6 })
  );
  rim.scale.x = 1.35;
  rim.rotation.x = Math.PI/2;
  rim.position.copy(table.position);
  rim.position.y += 0.12;
  group.add(rim);

  // Seats
  const seatRadius = 3.0;
  const bots = [];
  const botMat = new THREE.MeshStandardMaterial({ color: 0xbbaaff, roughness:0.75 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness:0.6 });

  function makeBot(i, ang){
    const g = new THREE.Group();
    g.name = "vip_bot_"+i;

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2,0.55,6,12), botMat);
    body.position.y = 0.65;
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17,16,12), headMat);
    head.position.y = 1.05;
    g.add(head);

    const x = center.x + Math.cos(ang)*seatRadius;
    const z = center.z + Math.sin(ang)*seatRadius;
    g.position.set(x, center.y, z);
    g.lookAt(center.x, center.y+0.6, center.z);
    group.add(g);
    bots.push(g);
  }

  const angles = [];
  for (let i=0;i<6;i++) angles.push((i/6)*Math.PI*2);
  // seat 0 open
  let bi=0;
  for (let i=0;i<6;i++){
    if (i===0) continue;
    makeBot(bi++, angles[i]);
  }

  // Open seat marker
  const open = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22,0.22,0.08,18),
    new THREE.MeshStandardMaterial({ color:0x22ff22, emissive:0x22ff22, emissiveIntensity:0.4 })
  );
  open.position.set(center.x + Math.cos(angles[0])*seatRadius, center.y+0.05, center.z + Math.sin(angles[0])*seatRadius);
  group.add(open);

  dwrite?.("[vip] room ready (6-seat oval, no divot)");
  return { group, bots };
}
