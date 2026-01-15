// /js/scarlett1/world_parts/fx_cards.js — Hover Cards v1.0

export function makeHoverCards(ctx, core) {
  const { THREE } = ctx;
  const { scene } = core;

  const hoverCards = [];
  const g = new THREE.PlaneGeometry(0.62, 0.88);
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.05, emissive: 0x111111 });

  function makeCard() {
    const card = new THREE.Mesh(g, m);
    card.rotation.x = -Math.PI/2;
    card.position.y = 1.12;
    scene.add(card);
    hoverCards.push(card);
  }
  for (let i=0;i<5;i++) makeCard();

  function update(dt, t) {
    for (let i=0;i<hoverCards.length;i++) {
      const c = hoverCards[i];
      const a = t*0.45 + i*(Math.PI*2/hoverCards.length);
      c.position.x = Math.cos(a) * 1.9;
      c.position.z = Math.sin(a) * 1.3;
      c.position.y = 1.12 + Math.sin(t*1.4 + i) * 0.06;
      c.rotation.y = a + Math.PI/2;
    }
  }

  return { update };
}
