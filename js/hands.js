// /js/hands.js
export function addGloveHands({ THREE, scene, rig, textureUrl = "./assets/textures/avatars/Hands.jpg" }) {
  const loader = new THREE.TextureLoader();
  const tex = loader.load(textureUrl);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.9,
    metalness: 0.0,
  });

  // Simple low-poly “glove mitt” shape (placeholder until hand mesh)
  function makeHand() {
    const g = new THREE.BoxGeometry(0.08, 0.04, 0.12);
    const m = new THREE.Mesh(g, mat);
    m.castShadow = false;
    m.receiveShadow = false;
    return m;
  }

  const leftHand = makeHand();
  const rightHand = makeHand();

  // Offset so it sits in front of controller
  leftHand.position.set(0, -0.02, -0.06);
  rightHand.position.set(0, -0.02, -0.06);

  rig.left.add(leftHand);
  rig.right.add(rightHand);

  return { leftHand, rightHand };
}
