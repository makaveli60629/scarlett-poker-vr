import * as THREE from "three";

export const Chair = {
  create() {
    const g = new THREE.Group();
    g.name = "chair";

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2f, roughness: 0.9 });
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x5a5a60, roughness: 0.85 });

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.10, 0.55), cushionMat);
    seat.position.y = 0.52;
    g.add(seat);

    // Back
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.10), cushionMat);
    back.position.set(0, 0.85, -0.23);
    g.add(back);

    // Legs
    function leg(x, z) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.52, 14), frameMat);
      l.position.set(x, 0.26, z);
      g.add(l);
    }
    leg( 0.23,  0.23);
    leg(-0.23,  0.23);
    leg( 0.23, -0.23);
    leg(-0.23, -0.23);

    // Base ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 12, 24), frameMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.06;
    g.add(ring);

    return g;
  }
};
