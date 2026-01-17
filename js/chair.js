import * as THREE from "three";

export function buildChairs(ctx) {
  const { scene } = ctx;
  const seats = [];
  const r = 2.2;
  for (let i=0;i<6;i++){
    const a = (i/6)*Math.PI*2;
    const x = Math.cos(a)*r;
    const z = -14.2 + Math.sin(a)*r;
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.06, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x5f6a77, roughness: 0.95, metalness: 0.05 })
    );
    seat.position.set(x, 0.55, z);
    seat.rotation.y = -a;
    seat.name = `SEAT_${i+1}`;
    seat.userData.seatIndex = i;
    scene.add(seat);
    seats.push(seat);
  }
  ctx.seats = seats;
  return seats;
}
