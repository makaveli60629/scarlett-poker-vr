// /js/world.js — Scarlett WORLD (NO-AWAIT SAFE BUILD)
// ✅ Never hangs: no async, no imports, no texture loads
// ✅ Bright lobby, sealed cylinder wall, pit divot, stairs marker, basic table marker
// ✅ Exposes WORLD_UPDATE and spawn points

export const World = {
  init(ctx) {
    const { THREE, scene, log, setSpawn } = ctx;

    const root = new THREE.Group();
    root.name = "WorldRoot";
    scene.add(root);

    // ---------- LIGHTS (SUPER BRIGHT) ----------
    root.add(new THREE.AmbientLight(0xffffff, 1.25));
    const hemi = new THREE.HemisphereLight(0xdfe9ff, 0x0b0d14, 1.2);
    root.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(8, 14, 6);
    root.add(sun);

    const centerGlow = new THREE.PointLight(0x7fe7ff, 3.0, 80);
    centerGlow.position.set(0, 7, 0);
    root.add(centerGlow);

    // ---------- LOBBY ----------
    const lobbyR = 11.0;
    const lobbyH = 6.0;

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(lobbyR, 96),
      new THREE.MeshStandardMaterial({ color: 0x1b2533, roughness: 0.9, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    root.add(floor);

    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(lobbyR, lobbyR, lobbyH, 96, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x2b3140, roughness: 0.95, metalness: 0.05, side: THREE.BackSide })
    );
    wall.position.y = lobbyH / 2;
    root.add(wall);

    // ---------- PIT DIVOT ----------
    const pitR = 4.4;
    const pitDepth = 1.2;

    const pitFloor = new THREE.Mesh(
      new THREE.CircleGeometry(pitR, 72),
      new THREE.MeshStandardMaterial({ color: 0x0d3a2d, roughness: 0.95, metalness: 0.02 })
    );
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.y = -pitDepth;
    root.add(pitFloor);

    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitR, pitR, pitDepth, 72, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8, metalness: 0.1, side: THREE.DoubleSide })
    );
    pitWall.position.y = -pitDepth / 2;
    root.add(pitWall);

    const rim = new THREE.Mesh(
      new THREE.RingGeometry(pitR, pitR + 0.8, 96),
      new THREE.MeshStandardMaterial({ color: 0x0c0f18, roughness: 0.95, metalness: 0.05 })
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.01;
    root.add(rim);

    // simple double rail (only pit rail)
    const rail1 = new THREE.Mesh(
      new THREE.TorusGeometry(pitR + 0.35, 0.06, 16, 128),
      new THREE.MeshStandardMaterial({ color: 0xaab2c2, roughness: 0.35, metalness: 0.65 })
    );
    rail1.rotation.x = Math.PI / 2;
    rail1.position.y = 0.55;
    root.add(rail1);

    const rail2 = new THREE.Mesh(
      new THREE.TorusGeometry(pitR + 0.48, 0.045, 16, 128),
      new THREE.MeshStandardMaterial({ color: 0x6f7a90, roughness: 0.35, metalness: 0.65 })
    );
    rail2.rotation.x = Math.PI / 2;
    rail2.position.y = 0.68;
    root.add(rail2);

    // ---------- VIP ROOM (so you don't spawn in the center) ----------
    // A simple room box far from lobby
    const vip = new THREE.Group();
    vip.name = "VIPRoom";
    vip.position.set(0, 0, -16);
    root.add(vip);

    const vipFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 7),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95, metalness: 0.05 })
    );
    vipFloor.rotation.x = -Math.PI / 2;
    vip.add(vipFloor);

    const vipLight = new THREE.PointLight(0xff2d7a, 2.5, 30);
    vipLight.position.set(0, 3, 0);
    vip.add(vipLight);

    const vipWalls = new THREE.Mesh(
      new THREE.BoxGeometry(7, 4, 7),
      new THREE.MeshStandardMaterial({ color: 0x141a24, roughness: 0.9, metalness: 0.05, side: THREE.BackSide })
    );
    vipWalls.position.y = 2;
    vip.add(vipWalls);

    // ---------- SPAWN (VIP) ----------
    const vipSpawn = new THREE.Vector3(0, 0, -16);
    const vipYaw = Math.PI; // face toward lobby
    setSpawn?.(vipSpawn, vipYaw);

    // ---------- UPDATE HOOK ----------
    scene.userData.WORLD_UPDATE = (dt) => {
      // keep a tiny pulse so you can see it’s alive
      centerGlow.intensity = 2.7 + Math.sin(performance.now() * 0.001) * 0.3;
    };

    log?.("World.init ✅ (NO-AWAIT SAFE BUILD)");
  },
};
