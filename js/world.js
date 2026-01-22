import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export function createSunkenPokerSystem({scene,renderer,textureLoader}){
  const main = new THREE.Group();
  main.name = 'Sunken_Poker_System';

  const PIT_DEPTH = -1.2;
  const FELT_Y = 0.41;

  // pit wall
  const pitWall = new THREE.Mesh(
    new THREE.CylinderGeometry(6.2,6.2,1.25,48,1,true),
    new THREE.MeshStandardMaterial({color:0x101010,side:THREE.DoubleSide})
  );
  pitWall.position.y = PIT_DEPTH/2;
  main.add(pitWall);

  // pedestal
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(5.8,6.0,0.4,48),
    new THREE.MeshStandardMaterial({color:0x1a1a1a})
  );
  pedestal.position.y = PIT_DEPTH;
  main.add(pedestal);

  // table
  const table = new THREE.Group();
  table.position.y = -0.8;

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5,2.5,0.1,64),
    new THREE.MeshStandardMaterial({color:0x076324})
  );
  felt.position.y = FELT_Y;
  felt.name = 'Poker_Surface';
  table.add(felt);

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(2.6,0.15,20,64),
    new THREE.MeshStandardMaterial({color:0x111111})
  );
  rail.rotation.x = Math.PI/2;
  rail.position.y = 0.48;
  table.add(rail);

  const shoe = new THREE.Mesh(
    new THREE.BoxGeometry(0.3,0.2,0.5),
    new THREE.MeshStandardMaterial({color:0x000000,metalness:1})
  );
  shoe.position.set(0,0.55,1.8);
  shoe.name = 'Dealer_Shoe_Box';
  table.add(shoe);

  main.add(table);

  // chairs
  for(let i=0;i<8;i++){
    const chair = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({color:0x8B0000});
    chair.add(new THREE.Mesh(new THREE.BoxGeometry(0.8,0.1,0.8),mat));
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.8,1.0,0.1),mat);
    back.position.set(0,0.5,-0.4);
    chair.add(back);

    const a = i/8*Math.PI*2;
    chair.position.set(Math.cos(a)*3.8,-0.8,Math.sin(a)*3.8);
    chair.lookAt(0,-0.8,0);
    main.add(chair);
  }

  scene.add(main);

  function update(){}

  return {group:main,update};
}
