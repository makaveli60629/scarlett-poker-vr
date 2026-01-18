// /js/world/world.js
// World builder: lobby + poker table + walls + signage + VIP area stub

export async function createWorld({ THREE, scene, rig, camera, renderer }){
  const dwrite = (m)=>{ try{ window.__scarlettDiagWrite?.(m); }catch(_){ } };

  const world = {
    floorMesh: null,
    tableAnchor: new THREE.Group(),
    vipAnchor: new THREE.Group(),
    env: new THREE.Group(),
    modulesCount: 0,
    update(dt){
      // subtle ambient animation
      if (this._neon){
        this._neon.material.emissiveIntensity = 1.25 + Math.sin(performance.now()*0.002) * 0.15;
      }
    }
  };

  scene.add(world.env);
  scene.add(world.tableAnchor);
  scene.add(world.vipAnchor);

  // Ground with a "pit" for the main table
  const floor = new THREE.Group();
  const gridSize = 30;
  const grid = new THREE.GridHelper(gridSize, gridSize, 0x1f2a3a, 0x0e141e);
  grid.position.y = 0.001;
  floor.add(grid);

  const floorGeo = new THREE.PlaneGeometry(60, 60);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0f14, roughness: 0.95, metalness: 0.0 });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI/2;
  floorMesh.position.y = 0;
  floorMesh.receiveShadow = false;
  world.floorMesh = floorMesh;
  floor.add(floorMesh);

  // Table pit (depression)
  const pitGeo = new THREE.CylinderGeometry(3.2, 3.2, 0.35, 48, 1, true);
  const pitMat = new THREE.MeshStandardMaterial({ color: 0x070a0f, roughness: 1.0, metalness: 0.0, side: THREE.DoubleSide });
  const pitWall = new THREE.Mesh(pitGeo, pitMat);
  pitWall.position.set(0, -0.175, 0);
  floor.add(pitWall);

  const pitBottomGeo = new THREE.CircleGeometry(3.18, 48);
  const pitBottomMat = new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 1.0, metalness: 0.0 });
  const pitBottom = new THREE.Mesh(pitBottomGeo, pitBottomMat);
  pitBottom.rotation.x = -Math.PI/2;
  pitBottom.position.set(0, -0.35, 0);
  floor.add(pitBottom);

  world.env.add(floor);

  // Walls (simple room)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0c121a, roughness: 0.92, metalness: 0.02 });
  const wallGeo = new THREE.BoxGeometry(60, 6, 0.4);
  const backWall = new THREE.Mesh(wallGeo, wallMat);
  backWall.position.set(0, 3, -30);
  world.env.add(backWall);

  const frontWall = new THREE.Mesh(wallGeo, wallMat);
  frontWall.position.set(0, 3, 30);
  world.env.add(frontWall);

  const sideGeo = new THREE.BoxGeometry(0.4, 6, 60);
  const leftWall = new THREE.Mesh(sideGeo, wallMat);
  leftWall.position.set(-30, 3, 0);
  world.env.add(leftWall);

  const rightWall = new THREE.Mesh(sideGeo, wallMat);
  rightWall.position.set(30, 3, 0);
  world.env.add(rightWall);

  // Ceiling neon strip
  const neonGeo = new THREE.BoxGeometry(40, 0.18, 0.18);
  const neonMat = new THREE.MeshStandardMaterial({ color: 0x111827, emissive: 0xff2f6d, emissiveIntensity: 1.25, roughness: 0.2, metalness: 0.2 });
  const neon = new THREE.Mesh(neonGeo, neonMat);
  neon.position.set(0, 5.6, 0);
  world._neon = neon;
  world.env.add(neon);

  // Main table anchor sits at pit bottom
  world.tableAnchor.position.set(0, -0.35, 0);

  // VIP area (no pit): raised platform to the right
  const vipPlatform = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.4, 10),
    new THREE.MeshStandardMaterial({ color: 0x080c12, roughness: 0.9 })
  );
  vipPlatform.position.set(14, 0.2, -10);
  world.env.add(vipPlatform);
  world.vipAnchor.position.set(14, 0.4, -10);

  // Simple signage
  const sign = makeSign(THREE, 'SCARLETT\nPOKER\nLOBBY');
  sign.position.set(0, 3.0, -28.8);
  world.env.add(sign);

  // Stairs stub (visual)
  const stairs = makeStairs(THREE);
  stairs.position.set(-18, 0, -12);
  world.env.add(stairs);

  // Store / display cases stub
  const store = makeStoreFront(THREE);
  store.position.set(18, 0, 12);
  world.env.add(store);

  dwrite('WORLD_FULL_LOBBY_v1_4 (deal loop + unique cards)');

  return world;
}

function makeSign(THREE, text){
  const group = new THREE.Group();
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 3.2, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x070a0f, roughness: 0.8, metalness: 0.1 })
  );
  group.add(panel);

  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#070a0f';
  ctx.fillRect(0,0,canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,47,109,0.65)';
  ctx.lineWidth = 10;
  ctx.strokeRect(14,14, canvas.width-28, canvas.height-28);
  ctx.fillStyle = 'rgba(255,47,109,0.95)';
  ctx.font = 'bold 56px system-ui, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = text.split('\n');
  lines.forEach((ln,i)=> ctx.fillText(ln, canvas.width/2, 78 + i*64));

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xff2f6d, emissiveIntensity: 0.55, roughness: 0.6 });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.8), mat);
  face.position.z = 0.10;
  group.add(face);
  return group;
}

function makeStairs(THREE){
  const g = new THREE.Group();
  const stepMat = new THREE.MeshStandardMaterial({ color: 0x0a0f16, roughness: 0.95 });
  for (let i=0;i<10;i++){
    const step = new THREE.Mesh(new THREE.BoxGeometry(4, 0.18, 1.0), stepMat);
    step.position.set(0, i*0.18, i*0.8);
    g.add(step);
  }
  const railMat = new THREE.MeshStandardMaterial({ color: 0x101827, roughness: 0.4, metalness: 0.2, emissive: 0x111827, emissiveIntensity: 0.12 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.0, 9.2), railMat);
  rail.position.set(2.1, 1.0, 4.0);
  g.add(rail);
  const rail2 = rail.clone();
  rail2.position.x = -2.1;
  g.add(rail2);
  return g;
}

function makeStoreFront(THREE){
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(10, 3.2, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x0b111a, roughness: 0.9 })
  );
  base.position.set(0, 1.6, 0);
  g.add(base);
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.9, 3.2),
    new THREE.MeshStandardMaterial({ color: 0x070b10, roughness: 0.95 })
  );
  counter.position.set(0, 0.45, 2.0);
  g.add(counter);

  // display cases
  const caseMat = new THREE.MeshStandardMaterial({ color: 0x0b111a, roughness: 0.2, metalness: 0.1, transparent:true, opacity:0.65 });
  for (let i=0;i<3;i++){
    const c = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 1.2), caseMat);
    c.position.set(-3.2 + i*3.2, 1.0, 1.8);
    g.add(c);
  }

  const sign = makeMiniText(THREE, 'STORE');
  sign.position.set(0, 3.05, 0.25);
  g.add(sign);
  return g;
}

function makeMiniText(THREE, text){
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#070a0f';
  ctx.fillRect(0,0,512,128);
  ctx.fillStyle = 'rgba(233,238,245,0.92)';
  ctx.font = '800 64px system-ui, Arial';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveIntensity: 0.12, transparent:true });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3), mat);
  return plane;
}
