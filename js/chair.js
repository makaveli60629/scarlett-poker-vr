import * as THREE from "three";

export const Chair = {
  build({ scene, table, state, seatIndex }){
    const group = new THREE.Group();
    group.name = `Chair_${seatIndex}`;

    const seatPos = table.seats[seatIndex].clone();
    seatPos.y = 0;
    group.position.copy(seatPos);

    // Face table center
    group.lookAt(0, 0.8, 0);

    // Low-poly chair (placeholder)
    const mat = new THREE.MeshStandardMaterial({ color: 0x0f0f14, roughness:0.9 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e1b1b, roughness:0.8 });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), mat);
    seat.position.y = 0.55;
    seat.castShadow = true;
    group.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.08), mat);
    back.position.set(0, 0.85, -0.24);
    back.castShadow = true;
    group.add(back);

    for(const sx of [-0.22, 0.22]){
      for(const sz of [-0.22, 0.22]){
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.04,0.55,12), legMat);
        leg.position.set(sx, 0.275, sz);
        leg.castShadow = true;
        group.add(leg);
      }
    }

    // Join ring (hover target)
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.22, 28),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent:true, opacity:0.7, side:THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI/2;
