import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';

export function setupWorld(scene, camera) {
  // ---------------- LIGHTS ----------------
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const pLight = new THREE.PointLight(0xffffff, 1);
  pLight.position.set(0, 5, 0);
  scene.add(pLight);

  // ---------------- FLOOR ----------------
  const loader = new THREE.TextureLoader();
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
  loader.load('assets/textures/lobby_carpet.jpg', tex => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(4,4);
    floorMat.map = tex; floorMat.needsUpdate = true;
  }, undefined, () => console.warn('Floor texture missing, using fallback color'));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0; floor.receiveShadow = true;
  scene.add(floor);

  // ---------------- WALLS ----------------
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b });
  const wallGeo = new THREE.BoxGeometry(20, 4, 0.5);
  const walls = [
    { x:0,y:2,z:-10 }, { x:0,y:2,z:10 },
    { x:-10,y:2,z:0, rotY: Math.PI/2 }, { x:10,y:2,z:0, rotY: Math.PI/2 }
  ];
  walls.forEach(pos => {
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(pos.x,pos.y,pos.z);
    if(pos.rotY) wall.rotation.y=pos.rotY;
    scene.add(wall);
  });

  // ---------------- TABLE ----------------
  const tableFelt = new THREE.MeshStandardMaterial({ color: 0x145a32 });
  loader.load('assets/textures/table_felt_green.jpg', tex => { tableFelt.map = tex; tableFelt.needsUpdate=true; },
    undefined, () => console.warn('Table felt missing'));
  const table = new THREE.Mesh(new THREE.CylinderGeometry(1.8,1.8,0.2,32), tableFelt);
  table.position.set(0,1,0); scene.add(table);

  const trimMat = new THREE.MeshStandardMaterial({ color: 0x4b2e1e });
  loader.load('assets/textures/Table leather trim.jpg', tex => { trimMat.map = tex; trimMat.needsUpdate=true; },
    undefined, () => console.warn('Table trim missing'));
  const tableTrim = new THREE.Mesh(new THREE.TorusGeometry(1.9,0.15,16,100), trimMat);
  tableTrim.rotation.x=Math.PI/2; tableTrim.position.y=1.1; scene.add(tableTrim);

  // ---------------- LEADERBOARD ----------------
  const canvas = document.createElement('canvas'); canvas.width=512; canvas.height=256;
  const ctx=canvas.getContext('2d'); ctx.fillStyle='#111'; ctx.fillRect(0,0,512,256);
  ctx.fillStyle='#ff0000'; ctx.font='28px Arial';
  ctx.fillText('Welcome to Scarlett VR', 40, 50);
  ctx.fillText('Balance: $10,000', 40, 110);
  ctx.fillText(new Date().toLocaleTimeString(), 40, 170);
  const boardTex = new THREE.CanvasTexture(canvas);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(3,1.5), new THREE.MeshBasicMaterial({map:boardTex}));
  board.position.set(0,2.5,-3); scene.add(board);

  // ---------------- HANDS ----------------
  const handMat = new THREE.MeshStandardMaterial({ color:0xffccaa });
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.08,16,16), handMat);
  leftHand.position.set(-0.3,1.4,-0.5); scene.add(leftHand);
  const rightHand = leftHand.clone(); rightHand.position.x=0.3; scene.add(rightHand);

  // ---------------- TELEPORT LASER ----------------
  loader.load('assets/textures/Teleport glow.jpg', tex => {
    const laserMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const laserGeom = new THREE.CylinderGeometry(0.02,0.02,5,8);
    const laser = new THREE.Mesh(laserGeom, laserMat);
    laser.position.set(-0.3,1.4,-2);
    laser.rotation.x=-Math.PI/2;
    scene.add(laser);
  }, undefined, () => console.warn('Teleport glow missing'));
}
