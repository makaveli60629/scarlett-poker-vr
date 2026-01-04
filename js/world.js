import * as THREE from "three";

export const World = {
  build(scene, playerGroup) {
    // Spawn (safe open area)
    playerGroup.position.set(0, 0, 5);

    // Background + fog (prevents “shimmer distance”)
    scene.background = new THREE.Color(0x020205);
    scene.fog = new THREE.Fog(0x020205, 4, 45);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.95, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = false;
    floor.name = "floor";
    scene.add(floor);

    // Lobby boundary walls (simple, solid)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x141419, roughness: 0.95 });
    const w = 18, h = 4, t = 0.25;

    function wall(x, y, z, sx, sy, sz) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), wallMat);
      m.position.set(x, y, z);
      m.name = "wall";
      scene.add(m);
    }

    // Four walls
    wall(0, h / 2, -w / 2, w, h, t);
    wall(0, h / 2,  w / 2, w, h, t);
    wall(-w / 2, h / 2, 0, t, h, w);
    wall( w / 2, h / 2, 0, t, h, w);

    // Subtle ceiling light bar (visual depth)
    const ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.15, 2),
      new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.6 })
    );
    ceiling.position.set(0, 3.6, 0);
    scene.add(ceiling);

    const glow = new THREE.PointLight(0xffffff, 0.35, 18);
    glow.position.set(0, 3.3, 0);
    scene.add(glow);

    return { floor };
  }
};
