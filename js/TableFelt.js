// /js/TableFelt.js
// Creates a felt "top" mesh you can texture with your existing felt images.
// Use for round/oval. You can swap texture maps.

export function createTableFelt({ THREE, shape = "oval", w = 2.6, h = 1.6, y = 0.92, texture = null }) {
  let geo;

  if (shape === "round") {
    geo = new THREE.CircleGeometry(w * 0.5, 64);
  } else {
    // simple oval via scaled circle
    geo = new THREE.CircleGeometry(1.0, 96);
  }

  const mat = new THREE.MeshStandardMaterial({
    color: 0x0f3b1f,
    roughness: 0.9,
    metalness: 0.0,
  });

  if (texture) {
    mat.map = texture;
    mat.map.anisotropy = 8;
    mat.needsUpdate = true;
  }

  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;

  if (shape === "oval") mesh.scale.set(w * 0.5, 1, h * 0.5);

  mesh.receiveShadow = true;
  mesh.name = "TableFelt";
  return mesh;
}
