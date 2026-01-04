import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';

export const Table = {
  textureLoader: new THREE.TextureLoader(),

  safeTexture(path) {
    const tex = this.textureLoader.load(
      path,
      () => { tex.userData.ok = true; },
      undefined,
      () => { tex.userData.ok = false; }
    );
    tex.userData.ok = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  },

  createTable(scene, x = 0, z = 0) {
    const group = new THREE.Group();

    // SAFE FALLBACK COLORS
    const woodColor = 0x8B4513;
    const feltColor = 0x076324;
    const leatherColor = 0x111111;

    // If textures exist, they’ll apply; if not, color still renders.
    const woodTex = this.safeTexture('assets/textures/table_atlas.jpg');
    const feltTex = this.safeTexture('assets/textures/table_felt_green.jpg');
    const leatherTex = this.safeTexture('assets/textures/Table leather trim.jpg');
    const logoTex = this.safeTexture('assets/textures/brand_logo.jpg');

    const woodMat = new THREE.MeshStandardMaterial({ color: woodColor, roughness: 0.7, metalness: 0.05, map: woodTex });
    const feltMat = new THREE.MeshStandardMaterial({ color: feltColor, roughness: 0.95, metalness: 0.0, map: feltTex });
    const leatherMat = new THREE.MeshStandardMaterial({ color: leatherColor, roughness: 0.8, metalness: 0.05, map: leatherTex });

    // FELT (oval)
    const felt = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.18, 48), feltMat);
    felt.scale.set(1.85, 1, 1);
    felt.position.y = 1.05;
    group.add(felt);

    // LEATHER RAIL
    const rail = new THREE.Mesh(new THREE.TorusGeometry(3.12, 0.22, 16, 80), leatherMat);
    rail.rotation.x = Math.PI / 2;
    rail.scale.set(1.85, 1.1, 1);
    rail.position.y = 1.12;
    group.add(rail);

    // WOOD SKIRT
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.45, 48), woodMat);
    skirt.scale.set(1.82, 1, 0.98);
    skirt.position.y = 0.82;
    group.add(skirt);

    // LEGS
    const legGeo = new THREE.CylinderGeometry(0.8, 1.0, 0.8, 16);
    const legL = new THREE.Mesh(legGeo, woodMat);
    legL.position.set(-2.5, 0.4, 0);
    group.add(legL);

    const legR = legL.clone();
    legR.position.set(2.5, 0.4, 0);
    group.add(legR);

    // LOGO (optional)
    const logoMat = new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, color: 0xffffff });
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), logoMat);
    logo.rotation.x = -Math.PI / 2;
    logo.position.y = 1.155;
    group.add(logo);

    group.position.set(x, 0, z);
    scene.add(group);
  },

  createChairs(scene, x = 0, z = 0) {
    // Simple test chairs (replace with your GLTF later)
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 1 });
    const radius = 4.6;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.0, 0.55), chairMat);
      chair.position.set(x + Math.sin(a) * radius, 0.5, z + Math.cos(a) * radius);
      chair.rotation.y = -a;
      scene.add(chair);
    }
  }
};
