export function buildWorld(THREE, scene){
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(22,6,22),
    new THREE.MeshStandardMaterial({ color:0x0b0f14, side:THREE.BackSide })
  );
  room.position.set(0,3,0);
  scene.add(room);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40,40),
    new THREE.MeshStandardMaterial({ color:0x103820 })
  );
  floor.rotation.x = -Math.PI/2;
  scene.add(floor);

  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35,1.35,0.18,40),
    new THREE.MeshStandardMaterial({ color:0x0c2b18 })
  );
  tableTop.position.set(0,0.92,0);
  scene.add(tableTop);

  const tableRim = new THREE.Mesh(
    new THREE.TorusGeometry(1.35,0.08,16,48),
    new THREE.MeshStandardMaterial({ color:0x2a1d12 })
  );
  tableRim.rotation.x = Math.PI/2;
  tableRim.position.set(0,1.01,0);
  scene.add(tableRim);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35,0.55,0.8,24),
    new THREE.MeshStandardMaterial({ color:0x1a1a1a })
  );
  pedestal.position.set(0,0.4,0);
  scene.add(pedestal);

  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08,0.08,0.02,20),
    new THREE.MeshStandardMaterial({ color:0x7b1b1b })
  );
  marker.position.set(0,1.02,0);
  scene.add(marker);

  const bots=[];
  const seatCount=6;
  for(let i=0;i<seatCount;i++){
    const ang = (i/seatCount)*Math.PI*2 - Math.PI/2;
    const px = Math.cos(ang)*2.2;
    const pz = Math.sin(ang)*2.2;

    const seat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22,0.22,0.06,18),
      new THREE.MeshStandardMaterial({ color:0x1d1d1d })
    );
    seat.position.set(px,0.52,pz);
    scene.add(seat);

    const bot = makeBot(THREE);
    bot.position.set(px,0.0,pz);
    bot.lookAt(0,1.0,0);
    scene.add(bot);
    bots.push(bot);

    // simple chip stack
    const chips = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07,0.07,0.06,18),
      new THREE.MeshStandardMaterial({ color:0x883333 })
    );
    chips.position.set(px*0.55, 1.02, pz*0.55);
    scene.add(chips);
  }

  // cards (flat + hover) per seat
  const cards=[];
  for(let i=0;i<seatCount;i++){
    const ang = (i/seatCount)*Math.PI*2 - Math.PI/2;
    const px = Math.cos(ang)*1.05;
    const pz = Math.sin(ang)*1.05;

    const pair = makeCardPair(THREE);
    pair.position.set(px, 1.03, pz);
    pair.rotation.y = -ang;
    scene.add(pair);

    const hover = makeCardPair(THREE);
    hover.position.set(px, 1.32, pz);
    hover.rotation.y = -ang;
    scene.add(hover);

    cards.push(pair, hover);
  }

  return { floor:floor, tableTop:tableTop, bots:bots, cards:cards };
}

function makeBot(THREE){
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.18,0.55,6,12),
    new THREE.MeshStandardMaterial({ color:0x6b7a8f })
  );
  body.position.y = 1.0;
  g.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.16,16,12),
    new THREE.MeshStandardMaterial({ color:0xd2b48c })
  );
  head.position.y = 1.55;
  g.add(head);
  return g;
}

function makeCardPair(THREE){
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color:0xf2f2f2 });
  const geo = new THREE.PlaneGeometry(0.22,0.30);

  const c1 = new THREE.Mesh(geo, mat);
  const c2 = new THREE.Mesh(geo, mat);
  c1.position.set(-0.13,0,0);
  c2.position.set( 0.13,0,0);
  c1.rotation.x = -Math.PI/2;
  c2.rotation.x = -Math.PI/2;
  group.add(c1); group.add(c2);
  return group;
}
