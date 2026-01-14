export const World = {
  async init({ THREE, scene, player }) {
    // 1. Large Ground (Crucial for your Controls.js locomotion)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.name = "ground"; // Matches your raycast logic
    scene.add(ground);

    // 2. Center Landmark (The "Interviewer" spot)
    const mark = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2, 0.2, 32),
      new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x004444 })
    );
    mark.position.set(0, 0.05, 0);
    scene.add(mark);
  }
};
