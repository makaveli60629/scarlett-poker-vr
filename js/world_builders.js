import * as THREE from "three";

function mat(color, rough=0.9, metal=0.05, emissive=null, ei=0) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: metal,
    emissive: emissive ? new THREE.Color(emissive) : new THREE.Color(0x000000),
    emissiveIntensity: ei
  });
}

  function roundedBoxGeometry(THREE, w, h, d, r=0.12, seg=6) {
    // Prefer RoundedBoxGeometry if present (some builds don't include it)
    try {
      if (THREE && typeof THREE.RoundedBoxGeometry === "function") {
        return roundedBoxGeometry(THREE, w, h, d, seg, r);
      }
    } catch (e) {}
    // Fallback: plain BoxGeometry (still stable + lightweight)
    return new THREE.BoxGeometry(w, h, d);
  }

export const WorldBuilders = {
  lights(ctx) {
    const { scene, root } = ctx;
    const hemi = new THREE.HemisphereLight(0xeaf6ff, 0x101428, 1.15);
    hemi.position.set(0, 40, 0);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(25, 45, 25);
    scene.add(sun);

    const fill = new THREE.PointLight(0x66ccff, 0.8, 90, 2);
    fill.position.set(0, 6.0, 8);
    (root || scene).add(fill);

    const warm = new THREE.PointLight(0xffd36b, 0.55, 70, 2);
    warm.position.set(-6, 4.5, 0);
    (root || scene).add(warm);
  },

  build(ctx) {
    const { scene } = ctx;
    const root = new THREE.Group();
    root.name = "SCARLETT_ROOT";
    scene.add(root);
    ctx.root = root;

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      mat(0x0b1220, 0.95, 0.02)
    );
    ground.rotation.x = -Math.PI/2;
    ground.position.y = 0;
    ground.name = "GROUND";
    ground.userData.isFloor = true;
    root.add(ground);

    // Spawn pad (near lobby entrance)
    const spawnPad = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.65, 48),
      new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent:true, opacity:0.85, side:THREE.DoubleSide })
    );
    spawnPad.rotation.x = -Math.PI/2;
    spawnPad.position.set(0, 0.03, 3);
    root.add(spawnPad);

    // Lobby ring shell
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(22, 22, 10, 72, 1, true),
      mat(0x0b1220, 0.9, 0.08, 0x223cff, 0.06)
    );
    shell.material.side = THREE.DoubleSide;
    shell.material.transparent = true;
    shell.material.opacity = 0.55;
    shell.position.set(0, 4.2, -8);
    root.add(shell);

    const lobbyFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(18, 18, 0.35, 72),
      mat(0x121c2c, 0.95, 0.05)
    );
    lobbyFloor.position.set(0, -0.175, -8);
    root.add(lobbyFloor);

    // Ceiling glow ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(16.5, 0.14, 12, 96),
      mat(0x66ccff, 0.3, 0.6, 0x66ccff, 0.45)
    );
    ring.rotation.x = Math.PI/2;
    ring.position.set(0, 8.8, -8);
    root.add(ring);

    // Poker pad
    const pokerPad = new THREE.Mesh(
      new THREE.CircleGeometry(4.2, 64),
      mat(0x0e7c3a, 0.95, 0.05, 0x0e7c3a, 0.10)
    );
    pokerPad.rotation.x = -Math.PI/2;
    pokerPad.position.set(0, 0.02, -14.2);
    pokerPad.name = "POKER_PAD";
    root.add(pokerPad);

    // Store zone platform
    const storePad = new THREE.Mesh(
      roundedBoxGeometry(THREE, 6.6, 0.22, 5.0, 8, 0.25),
      mat(0x10192a, 0.95, 0.05, 0x223cff, 0.08)
    );
    storePad.position.set(-12.5, 0.11, -8);
    storePad.name = "STORE_PAD";
    root.add(storePad);

    // Simple kiosk
    const kiosk = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.0, 0.6),
      mat(0x0f1624, 0.75, 0.18, 0x66ccff, 0.18)
    );
    kiosk.position.set(-12.5, 1.0, -8);
    root.add(kiosk);

    const kioskScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 0.7),
      new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent:true, opacity:0.35 })
    );
    kioskScreen.position.set(-12.5, 1.35, -7.65);
    root.add(kioskScreen);

    // Fountain (visual anchor)
    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.2, 0.35, 48),
      mat(0x0f1624, 0.75, 0.2, 0x223cff, 0.08)
    );
    bowl.position.set(0, 0.18, -8);
    root.add(bowl);

    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(0.86, 1.02, 0.12, 48),
      new THREE.MeshStandardMaterial({ color: 0x2aa8ff, transparent:true, opacity:0.45, roughness:0.25, metalness:0.05, emissive:new THREE.Color(0x2aa8ff), emissiveIntensity:0.08 })
    );
    water.position.set(0, 0.26, -8);
    root.add(water);

    ctx.anchors = {
      lobby:    { x: 0, y: 0, z: 3 },
      poker:    { x: 0, y: 0, z: -14.2 },
      store:    { x: -12.5, y: 0, z: -6.5 },
    };

    return { root, ground, anchors: ctx.anchors };
  }
};
