import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Table = {
  group: null,
  colliders: [],

  build(scene, textureLoader) {
    this.group = new THREE.Group();
    this.group.position.set(0,0,0);

    const safeTex = (file) => {
      try {
        const t = textureLoader.load(`./assets/textures/${file}`);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
      } catch { return null; }
    };

    // Materials
    const feltTex = safeTex("table_felt_red.jpg");
    if (feltTex) feltTex.repeat.set(2,2);

    const feltMat = new THREE.MeshStandardMaterial({
      color: feltTex ? 0xffffff : 0x5b0b14,
      map: feltTex || null,
      roughness: 0.85,
      metalness: 0.05
    });

    const railMat = new THREE.MeshStandardMaterial({
      color: 0x121212,
      roughness: 0.9,
      metalness: 0.05
    });

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x2a0f0a,
      roughness: 0.75,
      metalness: 0.1
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xC9A24D,
      metalness: 0.7,
      roughness: 0.28,
      emissive: 0x120b00,
      emissiveIntensity: 0.15
    });

    // Base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.1, 0.55, 64),
      woodMat
    );
    base.scale.set(1.65, 1, 1.1);
    base.position.y = 0.45;
    base.castShadow = true;
    base.receiveShadow = true;
    base.userData.collider = true;
    this.group.add(base);
    this.colliders.push(base);

    // Felt top
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.98, 0.98, 0.08, 64),
      feltMat
    );
    top.scale.set(1.6, 1, 1.1);
    top.position.y = 0.76;
    top.castShadow = true;
    top.receiveShadow = true;
    top.userData.collider = true;
    this.group.add(top);
    this.colliders.push(top);

    // Gold trim ring
    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(1.02, 0.05, 16, 64),
      goldMat
    );
    trim.scale.set(1.6, 1.0, 1.1);
    trim.rotation.x = Math.PI/2;
    trim.position.y = 0.80;
    trim.castShadow = true;
    this.group.add(trim);

    // Padded rail
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(1.13, 0.11, 20, 64),
      railMat
    );
    rail.scale.set(1.6, 1.0, 1.1);
    rail.rotation.x = Math.PI/2;
    rail.position.y = 0.80;
    rail.castShadow = true;
    rail.userData.collider = true;
    this.group.add(rail);
    this.colliders.push(rail);

    // Chip tray (right side)
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.10, 0.55),
      woodMat
    );
    tray.position.set(1.25, 0.80, 0);
    tray.castShadow = true;
    tray.userData.collider = true;
    this.group.add(tray);
    this.colliders.push(tray);

    // Center logo (optional)
    try {
      const logoTex = textureLoader.load("./assets/textures/scarlett_logo.png");
      const logo = new THREE.Mesh(
        new THREE.CircleGeometry(0.30, 32),
        new THREE.MeshStandardMaterial({ map: logoTex, transparent: true })
      );
      logo.rotation.x = -Math.PI/2;
      logo.position.y = 0.805;
      this.group.add(logo);
    } catch {}

    scene.add(this.group);
    return this.group;
  }
};
