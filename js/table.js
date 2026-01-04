import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';

export const Table = {
  textureLoader: new THREE.TextureLoader(),

  safeTexture(path, repeatX = 1, repeatY = 1) {
    const tex = this.textureLoader.load(
      path,
      () => { tex.userData.ok = true; tex.needsUpdate = true; },
      undefined,
      () => { tex.userData.ok = false; }
    );
    tex.userData.ok = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    return tex;
  },

  createTable(scene, x = 0, z = 0) {
    const group = new THREE.Group();
    group.name = "PokerTable";

    const woodTex    = this.safeTexture('assets/textures/table_atlas.jpg', 2, 2);
    const feltTex    = this.safeTexture('assets/textures/table_felt_green.jpg', 2, 2);
    const leatherTex = this.safeTexture('assets/textures/Table leather trim.jpg', 2, 2);
    const logoTex    = this.safeTexture('assets/textures/brand_logo.jpg', 1, 1);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.65, metalness: 0.05, map: woodTex });
    const feltMat = new THREE.MeshStandardMaterial({ color: 0x076324, roughness: 0.95, metalness: 0.0, map: feltTex });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.75, metalness: 0.05, map: leatherTex });

    const SEG = 128;

    const felt = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.18, SEG), feltMat);
    felt.scale.set(1.85, 1, 1);
    felt.position.y = 1.05;
    group.add(felt);

    const rail = new THREE.Mesh(new THREE.TorusGeometry(3.12, 0.22, 24, 220), leatherMat);
    rail.rotation.x = Math.PI / 2;
    rail.scale.set(1.85, 1.1, 1);
    rail.position.y = 1.12;
    group.add(rail);

    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.45, SEG), woodMat);
    skirt.scale.set(1.82, 1, 0.98);
    skirt.position.y = 0.82;
    group.add(skirt);

    const legGeo = new THREE.CylinderGeometry(0.8, 1.0, 0.8, 28);
    const legL = new THREE.Mesh(legGeo, woodMat);
    legL.position.set(-2.5, 0.4, 0);
    group.add(legL);

    const legR = legL.clone();
    legR.position.set(2.5, 0.4, 0);
    group.add(legR);

    const logoMat = new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, color: 0xffffff });
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), logoMat);
    logo.rotation.x = -Math.PI / 2;
    logo.position.y = 1.155;
    group.add(logo);

    group.position.set(x, 0, z);
    scene.add(group);

    // Simple collision AABB for the table footprint
    const collider = {
      type: "aabb",
      min: new THREE.Vector3(x - 6.0, 0, z - 4.0),
      max: new THREE.Vector3(x + 6.0, 3.0, z + 4.0)
    };

    return { group, collider };
  },

  createChairs(scene, x = 0, z = 0) {
    const chairs = [];

    // Use your SOFA textures (crash-safe fallbacks)
    const fabricDiff = this.safeTexture('assets/textures/sofa_02_diff_4k.jpg', 2, 2);
    const fabricNor  = this.safeTexture('assets/textures/sofa_02_nor_gl_4k.jpg', 2, 2);

    // Frame uses table atlas
    const frameTex = this.safeTexture('assets/textures/table_atlas.jpg', 2, 2);

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x3b2a22,
      map: frameTex,
      roughness: 0.8,
      metalness: 0.05
    });

    const fabricMat = new THREE.MeshStandardMaterial({
      color: 0x222228,
      map: fabricDiff,
      roughness: 0.95,
      metalness: 0.0
    });

    // Apply normal map only when it actually loads
    setTimeout(() => {
      if (fabricNor?.userData?.ok) {
        fabricMat.normalMap = fabricNor;
        fabricMat.needsUpdate = true;
      }
    }, 600);

    const radius = 5.25;

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;

      const g = new THREE.Group();
      g.name = `Chair_${i}`;

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.08, 20), frameMat);
      base.position.y = 0.04;
      g.add(base);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.52, 16), frameMat);
      pole.position.y = 0.32;
      g.add(pole);

      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.10, 24), fabricMat);
      seat.position.y = 0.60;
      g.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.75, 0.10), fabricMat);
      back.position.set(0, 1.00, -0.32);
      g.add(back);

      g.position.set(x + Math.sin(a) * radius, 0, z + Math.cos(a) * radius);
      g.rotation.y = -a;

      scene.add(g);
      chairs.push(g);
    }

    return chairs;
  }
};
