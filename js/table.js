import * as THREE from "three";

export function buildPokerTable(ctx) {
  const { scene } = ctx;
  const group = new THREE.Group();
  group.name = "POKER_TABLE_GROUP";

  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.45, 1.45, 0.10, 64),
    new THREE.MeshStandardMaterial({ color: 0x0e7c3a, roughness: 0.95, metalness: 0.05 })
  );
  table.position.set(0, 1.0, -14.2);
  group.add(table);

  // community card slots
  const cardGeo = new THREE.PlaneGeometry(0.28, 0.38);
  const cardMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent:true, opacity:0.85 });
  ctx.cards = [];
  for (let i=0;i<5;i++){
    const c = new THREE.Mesh(cardGeo, cardMat.clone());
    c.position.set((i-2)*0.33, 1.08, -14.2);
    c.rotation.x = -Math.PI/2;
    c.rotation.z = Math.PI; // face camera-ish
    group.add(c);
    ctx.cards.push(c);
  }

  scene.add(group);
  ctx.tableGroup = group;
  return group;
}
