// /js/world.js — SAFE GitHub Pages world (NO "three" imports)
// Export initWorld(ctx) and use ctx.THREE

export async function initWorld(ctx) {
  const { THREE, scene, hubLog } = ctx;
  const log = (m) => { try { hubLog?.(String(m)); } catch {} };

  log("🌍 world.js: initWorld()");

  const loader = new THREE.TextureLoader();
  const loadTex = (url, rx=1, ry=1) => new Promise((resolve) => {
    loader.load(url, (t) => {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      resolve(t);
    }, undefined, () => resolve(null));
  });

  // Your repo paths (change if folder names differ)
  const carpet = await loadTex("./assets/textures/lobby_carpet.jpg", 4, 4);
  const brick  = await loadTex("./assets/textures/brickwall.jpg", 3, 2);

  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({
      color: carpet ? 0xffffff : 0x141414,
      map: carpet || null,
      roughness: 1
    })
  );
  floorMesh.rotation.x = -Math.PI/2;
  scene.add(floorMesh);

  const wallMat = new THREE.MeshStandardMaterial({
    color: brick ? 0xffffff : 0x1b1b1b,
    map: brick || null,
    roughness: 0.9
  });

  const roomSize = 14, wallH = 3.2, wallT = 0.3;
  addWall(0, wallH/2,  roomSize/2, roomSize, wallH, wallT);
  addWall(0, wallH/2, -roomSize/2, roomSize, wallH, wallT);
  addWall( roomSize/2, wallH/2, 0, wallT, wallH, roomSize);
  addWall(-roomSize/2, wallH/2, 0, wallT, wallH, roomSize);

  log("✅ world.js built (textures optional)");

  return {
    floorMesh,
    bounds: { minX: -6.6, maxX: 6.6, minZ: -6.6, maxZ: 6.6 }
  };

  function addWall(x,y,z,sx,sy,sz){
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), wallMat);
    mesh.position.set(x,y,z);
    scene.add(mesh);
  }
}
