createChairs(scene, x = 0, z = 0) {
  const chairs = [];

  // Use your SOFA textures for chair upholstery
  const diffTex = this.safeTexture('assets/textures/sofa_02_diff_4k.jpg', 2, 2);
  const norTex  = this.safeTexture('assets/textures/sofa_02_nor_gl_4k.jpg', 2, 2);

  // Frame can reuse your table atlas (wood/trim look)
  const frameTex = this.safeTexture('assets/textures/table_atlas.jpg', 2, 2);

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x3a2b22,      // fallback wood-ish
    map: frameTex,
    roughness: 0.75,
    metalness: 0.05
  });

  const fabricMat = new THREE.MeshStandardMaterial({
    color: 0x222228,      // fallback fabric
    map: diffTex,
    roughness: 0.95,
    metalness: 0.0
  });

  // Normal map is optional; only apply when it actually loads
  // (safeTexture marks tex.userData.ok when loaded)
  const applyNormalsLater = () => {
    if (norTex?.userData?.ok) {
      fabricMat.normalMap = norTex;
      fabricMat.needsUpdate = true;
    }
  };
  setTimeout(applyNormalsLater, 500); // simple safe delay

  const radius = 5.25;

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;

    const g = new THREE.Group();
    g.name = `Chair_${i}`;

    // Base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.08, 20), frameMat);
    base.position.y = 0.04;
    g.add(base);

    // Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.52, 16), frameMat);
    pole.position.y = 0.32;
    g.add(pole);

    // Seat
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.10, 24), fabricMat);
    seat.position.y = 0.60;
    g.add(seat);

    // Back
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.75, 0.10), fabricMat);
    back.position.set(0, 1.00, -0.32);
    g.add(back);

    // Position around table
    g.position.set(x + Math.sin(a) * radius, 0, z + Math.cos(a) * radius);
    g.rotation.y = -a;

    scene.add(g);
    chairs.push(g);
  }

  return chairs;
}
