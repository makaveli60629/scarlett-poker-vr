// ✅ BRIGHT LOBBY LIGHTING (fixes “dark room”)
    const addLight = (obj) => scene.add(obj);

    // Ambient fill
    addLight(new THREE.AmbientLight(0xffffff, 0.35));

    // Ceiling ring lights
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = Math.cos(a) * 9;
      const z = Math.sin(a) * 9;

      const p = new THREE.PointLight(0xffffff, 0.65, 26);
      p.position.set(x, 6.5, z);
      addLight(p);
    }

    // Main key light
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(8, 12, 6);
    addLight(key);

    // Warm center light (makes table look nice)
    const warm = new THREE.PointLight(0xffd2a0, 1.25, 18);
    warm.position.set(0, 4.2, 0);
    addLight(warm);
