export const module_divot_table = {
  id: 'divot_table',
  async init(env) {
    const { THREE, scene } = env;

    const g = new THREE.Group();
    g.position.set(0, 0, 0);

    // divot parameters
    const radius = 3.2;
    const depth = 0.55;

    // lower floor disc
    const discGeo = new THREE.CircleGeometry(radius, 64);
    const discMat = new THREE.MeshStandardMaterial({ color: 0x0f1720, roughness: 0.9, metalness: 0.05 });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -depth;
    disc.receiveShadow = true;
    g.add(disc);

    // inner wall cylinder
    const wallGeo = new THREE.CylinderGeometry(radius, radius, depth, 64, 1, true);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b0f14, roughness: 0.95, metalness: 0.05 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.y = -depth/2;
    wall.receiveShadow = true;
    g.add(wall);

    // rail ring
    const railGeo = new THREE.TorusGeometry(radius + 0.15, 0.06, 18, 96);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x263445, roughness: 0.35, metalness: 0.55 });
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 0.12;
    rail.castShadow = true;
    g.add(rail);

    // rail posts
    for (let i=0;i<16;i++) {
      const a = (i/16)*Math.PI*2;
      const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.7, 10);
      const postMat = railMat;
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(Math.cos(a)*(radius+0.15), -0.23, Math.sin(a)*(radius+0.15));
      post.castShadow = true;
      g.add(post);
    }

    // poker table (sunken)
    const table = new THREE.Group();
    table.position.set(0, -depth + 0.02, 0);

    const tableTopGeo = new THREE.CylinderGeometry(1.55, 1.75, 0.18, 64);
    const tableTopMat = new THREE.MeshStandardMaterial({ color: 0x0c5a38, roughness: 0.9, metalness: 0.05 });
    const tableTop = new THREE.Mesh(tableTopGeo, tableTopMat);
    tableTop.position.y = 0.78;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    table.add(tableTop);

    const tableBandGeo = new THREE.CylinderGeometry(1.78, 1.78, 0.25, 64);
    const tableBandMat = new THREE.MeshStandardMaterial({ color: 0x1a2430, roughness: 0.5, metalness: 0.2 });
    const band = new THREE.Mesh(tableBandGeo, tableBandMat);
    band.position.y = 0.62;
    band.castShadow = true;
    table.add(band);

    const pedestalGeo = new THREE.CylinderGeometry(0.28, 0.45, 0.7, 24);
    const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness: 0.65, metalness: 0.3 });
    const ped = new THREE.Mesh(pedestalGeo, pedestalMat);
    ped.position.y = 0.28;
    ped.castShadow = true;
    table.add(ped);

    g.add(table);

    // seat markers (6 total, one open seat reserved at angle 0)
    const seats = [];
    const seatCount = 6;
    for (let i=0;i<seatCount;i++) {
      const a = (i/seatCount)*Math.PI*2;
      const isOpen = i === 0;
      const sGeo = new THREE.BoxGeometry(0.55, 0.08, 0.55);
      const sMat = new THREE.MeshStandardMaterial({ color: isOpen ? 0x4dd0ff : 0x101820, roughness: 0.9 });
      const s = new THREE.Mesh(sGeo, sMat);
      s.position.set(Math.cos(a)*2.5, -depth + 0.05, Math.sin(a)*2.5);
      s.castShadow = true;
      g.add(s);
      seats.push({ mesh: s, angle: a, open: isOpen });
    }

    scene.add(g);
    env.log?.('divot table ready ✅');

    return {
      handles: { table: { group: g, table, seats, radius, depth } },
    };
  }
};
