import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const World = {
  group: null,
  colliders: [],

  build(scene, textureLoader) {
    this.group = new THREE.Group();
    scene.add(this.group);

    // Background / fog (stable VR)
    scene.background = new THREE.Color(0x05070a);
    scene.fog = new THREE.Fog(0x05070a, 4, 40);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 20),
      new THREE.MeshStandardMaterial({ color: 0x111014, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI/2;
    floor.receiveShadow = true;
    this.group.add(floor);

    // Carpet strip (nice color)
    const carpet = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 12),
      new THREE.MeshStandardMaterial({ color: 0x2a1020, roughness: 0.95 })
    );
    carpet.rotation.x = -Math.PI/2;
    carpet.position.y = 0.01;
    this.group.add(carpet);

    // Solid walls (lobby)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3b, roughness: 0.9 });
    const mkWall = (w,h,x,z,ry) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w,h,0.25), wallMat);
      wall.position.set(x, h/2, z);
      wall.rotation.y = ry;
      wall.castShadow = true;
      wall.receiveShadow = true;
      wall.userData.collider = true;
      this.group.add(wall);
      this.colliders.push(wall);
    };
    // Lobby centered around x=0.. + store at x=16; walls cover lobby only
    mkWall(30, 3.2, 0, -10, 0);
    mkWall(30, 3.2, 0,  10, 0);
    mkWall(20, 3.2, -15, 0, Math.PI/2);
    mkWall(20, 3.2,  15, 0, Math.PI/2);

    // Neon strips
    const neonMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0066aa, emissiveIntensity: 1.2 });
    const mkNeon = (x,z,ry) => {
      const n = new THREE.Mesh(new THREE.BoxGeometry(8, 0.08, 0.08), neonMat);
      n.position.set(x, 2.9, z);
      n.rotation.y = ry;
      this.group.add(n);
    };
    mkNeon(-6, -9.7, 0);
    mkNeon( 6, -9.7, 0);
    mkNeon(-6,  9.7, 0);
    mkNeon( 6,  9.7, 0);

    // Lighting (clean)
    const amb = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(amb);

    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(5, 8, 3);
    key.castShadow = true;
    scene.add(key);

    const fill = new THREE.PointLight(0x88bbff, 0.6, 30);
    fill.position.set(-4, 2.2, 2);
    scene.add(fill);

    // Art frames (optional textures)
    const addArt = (file, x, y, z, ry) => {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.4, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.6, metalness: 0.2 })
      );
      frame.position.set(x, y, z);
      frame.rotation.y = ry;
      this.group.add(frame);

      try {
        const tex = textureLoader.load(`./assets/textures/${file}`);
        const art = new THREE.Mesh(
          new THREE.PlaneGeometry(2.0, 1.2),
          new THREE.MeshStandardMaterial({ map: tex })
        );
        art.position.set(x, y, z + 0.05);
        art.rotation.y = ry;
        this.group.add(art);
      } catch {}
    };

    addArt("casino_art_1.jpg", -13.6, 1.6, -4, Math.PI/2);
    addArt("casino_art_2.jpg", -13.6, 1.6,  4, Math.PI/2);

    return this.group;
  }
};
