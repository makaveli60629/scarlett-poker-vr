// js/world.js — prettier room + spawn pads + fountain + teleport machines
export function buildWorld(THREE, scene){
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(26,7,26),
    new THREE.MeshStandardMaterial({ color:0x0b0f14, side:THREE.BackSide })
  );
  room.position.set(0,3.55,0);
  scene.add(room);

  const floorMat = new THREE.MeshStandardMaterial({ color:0x103820 });
  floorMat.polygonOffset = true;
  floorMat.polygonOffsetFactor = 1;
  floorMat.polygonOffsetUnits = 1;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60,60), floorMat);
  floor.rotation.x = -Math.PI/2;
  floor.position.y = 0;
  scene.add(floor);

  const carpet = new THREE.Mesh(
    new THREE.RingGeometry(5.5, 10.0, 64),
    new THREE.MeshStandardMaterial({ color:0x1b1f2a, side:THREE.DoubleSide })
  );
  carpet.rotation.x = -Math.PI/2;
  carpet.position.y = 0.001;
  scene.add(carpet);

  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55,1.55,0.20,48),
    new THREE.MeshStandardMaterial({ color:0x0c2b18, roughness:0.9, metalness:0.0 })
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

  const pads = [];
  const padPositions = [
    new THREE.Vector3(0,0,8.5),
    new THREE.Vector3(-6.5,0,6.0),
    new THREE.Vector3(6.5,0,6.0),
  ];
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

  const tp = [];
  for(let i=0;i<pads.length;i++){
    const p = padPositions[i];
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12,0.12,1.8,22),
      new THREE.MeshStandardMaterial({ color:0x1a2733, emissive:0x1b6b8a, emissiveIntensity:1.2 })
    );
    pillar.position.set(p.x+1.1, 0.9, p.z);
    scene.add(pillar);
    tp.push(pillar);
  }

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

  const rack = new THREE.Mesh(
    new THREE.BoxGeometry(1.8,0.05,0.55),
    new THREE.MeshStandardMaterial({ color:0x202020 })
  );
  rack.position.set(0,1.05,0.55);
  scene.add(rack);

  const bots=[];
  const seatCount=6;
  for(let i=0;i<seatCount;i++){
    const ang = (i/seatCount)*Math.PI*2 - Math.PI/2;
    const px = Math.cos(ang)*2.55;
    const pz = Math.sin(ang)*2.55;

    const seat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24,0.24,0.07,18),
      new THREE.MeshStandardMaterial({ color:0x1d1d1d })
    );
    seat.position.set(px,0.52,pz);
    scene.add(seat);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.42,0.55,0.08),
      new THREE.MeshStandardMaterial({ color:0x232323 })
    );
    back.position.set(px,0.92,pz);
    back.rotation.y = -ang;
    back.translateZ(-0.22);
    scene.add(back);

    const bot = makeBot(THREE);
    bot.position.set(px,0.0,pz);
    bot.lookAt(0,1.0,0);
    scene.add(bot);
    bots.push(bot);

    const chips = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045,0.045,0.03,18),
      new THREE.MeshStandardMaterial({ color:0x883333 })
    );
    chips.position.set(px*0.55, 1.02, pz*0.55);
    scene.add(chips);
  }

  return { floor, tableTop, bots, pads, padPositions, water };
}

function makeBot(THREE){
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.20,0.58,6,12),
    new THREE.MeshStandardMaterial({ color:0x6b7a8f })
  );
  body.position.y = 1.0;
  g.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.17,16,12),
    new THREE.MeshStandardMaterial({ color:0xd2b48c })
  );
  head.position.y = 1.58;
  g.add(head);

  const armMat = new THREE.MeshStandardMaterial({ color:0x56677a });
  const armGeo = new THREE.CylinderGeometry(0.05,0.05,0.55,12);
  const armL = new THREE.Mesh(armGeo, armMat);
  const armR = new THREE.Mesh(armGeo, armMat);
  armL.position.set(-0.22,1.12,0.12);
  armR.position.set( 0.22,1.12,0.12);
  armL.rotation.z = 0.7;
  armR.rotation.z = -0.7;
  g.add(armL); g.add(armR);

  g.userData.armL = armL;
  g.userData.armR = armR;
  g.userData.head = head;
  return g;
}
