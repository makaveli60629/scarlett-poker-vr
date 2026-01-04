import * as THREE from "three";

export const World = {
  build({ scene, rig, state }){
    // Floor (solid)
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x121418, roughness: 0.95, metalness: 0.05 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = "WORLD_FLOOR";
    scene.add(floor);

    // Simple carpet strip
    const carpet = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 14),
      new THREE.MeshStandardMaterial({ color: 0x2a0c16, roughness:0.9 })
    );
    carpet.rotation.x = -Math.PI/2;
    carpet.position.y = 0.01;
    carpet.receiveShadow = true;
    scene.add(carpet);

    // Lighting
    const hemi = new THREE.HemisphereLight(0xbfd7ff, 0x0a0b10, 0.55);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(8, 10, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024,1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 40;
    key.shadow.camera.left = -15;
    key.shadow.camera.right = 15;
    key.shadow.camera.top = 15;
    key.shadow.camera.bottom = -15;
    scene.add(key);

    // Table spotlight zone
    const spot = new THREE.SpotLight(0xffffff, 1.2, 30, Math.PI/5, 0.35, 1.0);
    spot.position.set(0, 8.5, 0);
    spot.target.position.set(0, 0.9, 0);
    spot.castShadow = true;
    scene.add(spot);
    scene.add(spot.target);

    // Room (solid walls)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2b2a33, roughness: 0.92 });
    const wallH = 4.2;
    const wallT = 0.3;

    function wall(w, h, d, x, y, z){
      const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat);
      m.position.set(x,y,z);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
      return m;
    }

    // 4 walls
    wall(26, wallH, wallT, 0, wallH/2, -12);
    wall(26, wallH, wallT, 0, wallH/2,  12);
    wall(wallT, wallH, 24, -13, wallH/2, 0);
    wall(wallT, wallH, 24,  13, wallH/2, 0);

    // Pillars (gold accent)
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x3a2c10, roughness:0.35, metalness:0.55 });
    for(const sx of [-12.3, 12.3]){
      for(const sz of [-11.3, 11.3]){
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.45,4.2,24), pillarMat);
        p.position.set(sx,2.1,sz);
        p.castShadow = true;
        scene.add(p);
      }
    }

    // Neon strips
    const neonMat = new THREE.MeshBasicMaterial({ color: 0x5a3bff });
    const strip1 = new THREE.Mesh(new THREE.BoxGeometry(26, 0.06, 0.08), neonMat);
    strip1.position.set(0, 3.8, -11.86);
    scene.add(strip1);

    const strip2 = strip1.clone();
    strip2.position.z = 11.86;
    scene.add(strip2);

    // Framed wall art placeholders (uses textures if present later)
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness:0.6, metalness:0.25 });
    const artMat1 = new THREE.MeshStandardMaterial({ color: 0x221a1a, roughness:0.85 });
    const artMat2 = new THREE.MeshStandardMaterial({ color: 0x1a221e, roughness:0.85 });

    function framedArt(x,y,z,rotY,mat){
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.06), frameMat);
      frame.position.set(x,y,z);
      frame.rotation.y = rotY;
      frame.castShadow = true;
      scene.add(frame);

      const art = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), mat);
      art.position.set(x,y,z + (rotY===0?0.04: (rotY>0? -0.04: -0.04)));
      art.rotation.y = rotY;
      scene.add(art);
    }

    framedArt(-12.7, 2.3, 0, Math.PI/2, artMat1);
    framedArt( 12.7, 2.3, 0, -Math.PI/2, artMat2);

    // Plants (simple low-poly)
    function plant(x,z){
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.32,0.35,18), new THREE.MeshStandardMaterial({color:0x2a140f, roughness:0.9}));
      pot.position.set(x,0.18,z);
      pot.castShadow = true; pot.receiveShadow=true;
      scene.add(pot);

      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 14), new THREE.MeshStandardMaterial({color:0x103016, roughness:0.95}));
      bush.position.set(x,0.75,z);
      bush.castShadow=true;
      scene.add(bush);
    }
    plant(-10.5, -9);
    plant( 10.5, -9);
    plant(-10.5,  9);
    plant( 10.5,  9);

    // Safe spawn sign area (open space)
    rig.position.set(0, 0, 6);
  }
};
