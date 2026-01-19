import { THREE } from '../core/engine.js';

export function WorldLobbyModule() {
  return {
    name: 'world_lobby',
    init(engine) {
      const s = engine.scene;

      // Ground
      const groundMat = new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95, metalness: 0.05 });
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = false;
      ground.name = 'ground';
      s.add(ground);
      engine.addTeleportTarget(ground);

      // Lobby divot (poker pit)
      const pit = new THREE.Mesh(
        new THREE.CylinderGeometry(10.5, 10.5, 0.4, 64),
        new THREE.MeshStandardMaterial({ color: 0x07101a, roughness: 1.0, metalness: 0.0 })
      );
      pit.position.set(0, -0.2, 0);
      s.add(pit);

      // Ring neon
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(10.8, 0.06, 16, 128),
        new THREE.MeshStandardMaterial({ color: 0x00d0ff, emissive: 0x00a0ff, emissiveIntensity: 1.2, roughness: 0.3, metalness: 0.2 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 0.02, 0);
      s.add(ring);

      // Simple walls
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.9, metalness: 0.05 });
      const wallH = 6;
      const wallT = 0.4;
      const size = 55;
      const mkWall = (w, h, d, x, y, z) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
        m.position.set(x, y, z);
        s.add(m);
      };
      mkWall(size*2, wallH, wallT, 0, wallH/2 - 0.1, -size);
      mkWall(size*2, wallH, wallT, 0, wallH/2 - 0.1, size);
      mkWall(wallT, wallH, size*2, -size, wallH/2 - 0.1, 0);
      mkWall(wallT, wallH, size*2, size, wallH/2 - 0.1, 0);

      // Balcony / stage back wall accent
      const stage = new THREE.Mesh(
        new THREE.BoxGeometry(18, 0.6, 6),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8, metalness: 0.15 })
      );
      stage.position.set(0, 0.3, -18);
      s.add(stage);
      engine.addTeleportTarget(stage);

      // Neon pillars
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x102033, emissive: 0x003b55, emissiveIntensity: 1.4, roughness: 0.35, metalness: 0.25 });
      const mkPole = (x, z) => {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.8, 18), poleMat);
        p.position.set(x, 2.4, z);
        s.add(p);
      };
      [-8, 8].forEach(x => mkPole(x, -18));
      [-12, 12].forEach(x => mkPole(x, 10));

      // Ambient signage planes (placeholders)
      const signMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x2233ff, emissiveIntensity: 0.75, roughness: 0.6, metalness: 0.0 });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.2), signMat);
      sign.position.set(0, 3.4, -22.6);
      s.add(sign);
    },
  };
}
