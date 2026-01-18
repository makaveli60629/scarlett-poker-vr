export function buildWorld(THREE, scene){
  // Room
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(26,7,26),
    new THREE.MeshStandardMaterial({ color:0x0b0f14, side:THREE.BackSide })
  );
  room.position.set(0,3.55,0);
  scene.add(room);

  // Floor (no blink)
  const floorMat = new THREE.MeshStandardMaterial({ color:0x103820 });
  floorMat.polygonOffset = true;
  floorMat.polygonOffsetFactor = 1;
  floorMat.polygonOffsetUnits = 1;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60,60), floorMat);
  floor.rotation.x = -Math.PI/2;
  floor.position.y = 0;
  scene.add(floor);

  // Carpet ring
  const carpet = new THREE.Mesh(
    new THREE.RingGeometry(5.5, 10.0, 64),
    new THREE.MeshStandardMaterial({ color:0x1b1f2a, side:THREE.DoubleSide })
  );
  carpet.rotation.x = -Math.PI/2;
  carpet.position.y = 0.002;
  scene.add(carpet);

  // Table
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55,1.55,0.20,48),
    new THREE.MeshStandardMaterial({ color:0x0c2b18, roughness:0.9 })
  );
  tableTop.position.set(0,0.92,0);
  scene.add(tableTop);

  const tableRim = new THREE.Mesh(
    new THREE.TorusGeometry(1.55,0.10,16,72),
    new THREE.MeshStandardMaterial({ color:0x2a1d12, roughness:0.8, metalness:0.1 })
  );
  tableRim.rotation.x = Math.PI/2;
  tableRim.position.set(0,1.03,0);
  scene.add(tableRim);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45,0.70,0.85,28),
    new THREE.MeshStandardMaterial({ color:0x161616, roughness:0.9 })
  );
  pedestal.position.set(0,0.42,0);
  scene.add(pedestal);

  // Spawn pads
  const padPositions = [
    new THREE.Vector3(0,0,8.5),
    new THREE.Vector3(-6.5,0,6.0),
    new THREE.Vector3(6.5,0,6.0),
  ];
  const pads=[];
  for(let i=0;i<padPositions.length;i++){
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 0.8, 48),
      new THREE.MeshStandardMaterial({ color:0x66ccff, emissive:0x114455, emissiveIntensity:1.0, side:THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI/2;
    ring.position.copy(padPositions[i]);
    ring.position.y = 0.01;
    scene.add(ring);
    pads.push(ring);
  }

  // Simple fountain
  const fountainBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4,1.6,0.35,40),
    new THREE.MeshStandardMaterial({ color:0x2b2f36, roughness:0.8 })
  );
  fountainBase.position.set(-10.5,0.18,-10.5);
  scene.add(fountainBase);

  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15,1.15,0.05,32),
    new THREE.MeshStandardMaterial({ color:0x224a66, emissive:0x112233, emissiveIntensity:0.6, roughness:0.2 })
  );
  water.position.set(-10.5,0.36,-10.5);
  scene.add(water);

  // Bots (simple)
  const bots=[];
  const seatCount=6;
  for(let i=0;i<seatCount;i++){
    const ang = (i/seatCount)*Math.PI*2 - Math.PI/2;
    const px = Math.cos(ang)*2.55;
    const pz = Math.sin(ang)*2.55;

    const bot = makeBot(THREE);
    bot.position.set(px,0.0,pz);
    bot.lookAt(0,1.0,0);
    scene.add(bot);
    bots.push(bot);
  }

  return { floor, bots, padPositions, water };
}

function makeBot(THREE){
  const g=new THREE.Group();
  const body=new THREE.Mesh(
    new THREE.CapsuleGeometry(0.20,0.58,6,12),
    new THREE.MeshStandardMaterial({ color:0x6b7a8f })
  );
  body.position.y=1.0;
  g.add(body);

  const head=new THREE.Mesh(
    new THREE.SphereGeometry(0.17,16,12),
    new THREE.MeshStandardMaterial({ color:0xd2b48c })
  );
  head.position.y=1.58;
  g.add(head);

  return g;
}
