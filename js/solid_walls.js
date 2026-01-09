// /js/solid_walls.js — Scarlett VR Poker (Compat Build)
// Accepts build(ctx) OR build(scene) OR build(THREE, scene)
// Adds simple room walls + optional colliders list.

function _ctxScene(a, b){
  if (a && a.scene && typeof a.scene.add === "function") return a.scene;
  if (a && typeof a.add === "function") return a;
  if (b && typeof b.add === "function") return b;
  return null;
}
function _ctxTHREE(a, b){
  if (a && a.THREE) return a.THREE;
  return a; // (THREE, scene)
}

export const SolidWalls = {
  build(a, b){
    const scene = _ctxScene(a, b);
    const THREE = _ctxTHREE(a, b);

    if (!scene) throw new Error("SolidWalls.build: scene not found");
    if (!THREE) throw new Error("SolidWalls.build: THREE not found");

    if (scene.userData.__solid_walls_built) return;
    scene.userData.__solid_walls_built = true;

    // Basic room dims (match your fallback-ish)
    const roomW = 60;
    const roomD = 60;
    const wallH = 4.4;
    const wallT = 1.0;
    const halfW = 15;
    const halfD = 15;

    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a1f33,
      roughness: 0.92,
      metalness: 0.04
    });

    function wallBox(sx, sy, sz, x, y, z, name){
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
      m.name = name;
      m.position.set(x, y, z);
      scene.add(m);
      return m;
    }

    // Visible walls
    wallBox(roomW, wallH, wallT, 0, wallH/2, -halfD, "wall_n");
    wallBox(roomW, wallH, wallT, 0, wallH/2,  halfD, "wall_s");
    wallBox(wallT, wallH, roomD, -halfW, wallH/2, 0, "wall_w");
    wallBox(wallT, wallH, roomD,  halfW, wallH/2, 0, "wall_e");

    // Colliders for your collision solver (optional pattern used in your project)
    scene.userData.colliders = scene.userData.colliders || [];

    function colliderBox(sx, sy, sz, x, y, z, name){
      const geo = new THREE.BoxGeometry(sx, sy, sz);
      const mat = new THREE.MeshBasicMaterial({ visible: false });
      const c = new THREE.Mesh(geo, mat);
      c.name = name;
      c.position.set(x, y, z);
      scene.add(c);
      scene.userData.colliders.push(c);
      return c;
    }

    colliderBox(roomW, wallH, wallT, 0, wallH/2, -halfD, "col_wall_n");
    colliderBox(roomW, wallH, wallT, 0, wallH/2,  halfD, "col_wall_s");
    colliderBox(wallT, wallH, roomD, -halfW, wallH/2, 0, "col_wall_w");
    colliderBox(wallT, wallH, roomD,  halfW, wallH/2, 0, "col_wall_e");
  }
};
