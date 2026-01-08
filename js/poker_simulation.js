// /js/poker_simulation.js — SAFE, VISIBLE, NO-this BUG

let t = 0;
let cards = [];
let THREE_REF = null;
let scene = null;
let world = null;
let getSeats = null;

export const PokerSimulation = {
  init({ THREE, scene: sc, world: w, getSeats: gs }) {
    THREE_REF = THREE;
    scene = sc;
    world = w;
    getSeats = gs;
    t = 0;
    clearCards();
    deal();
  },

  update(dt) {
    t += dt;

    // gentle life motion
    for (const c of cards) {
      c.position.y = 1.05 + Math.sin(t * 3 + c.userData.phase) * 0.01;
    }

    // redeal every 8 seconds
    if (t > 8) {
      t = 0;
      clearCards();
      deal();
    }
  }
};

// ---------- helpers ----------
function clearCards() {
  for (const c of cards) scene.remove(c);
  cards.length = 0;
}

function deal() {
  if (!scene || !world || !getSeats) return;

  const seats = getSeats() || [];
  const table = world.tableFocus;

  const matA = new THREE_REF.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
  const matB = new THREE_REF.MeshStandardMaterial({ color: 0xffd6f2, roughness: 0.7 });
  const matC = new THREE_REF.MeshStandardMaterial({ color: 0xd6f7ff, roughness: 0.7 });

  // player cards
  for (let i = 0; i < Math.min(6, seats.length); i++) {
    const s = seats[i];
    for (let k = 0; k < 2; k++) {
      const card = new THREE_REF.Mesh(
        new THREE_REF.PlaneGeometry(0.18, 0.26),
        k === 0 ? matA : matB
      );
      card.rotation.x = -Math.PI / 2;
      card.position.set(
        s.position.x + k * 0.08,
        1.05,
        s.position.z + 0.12
      );
      card.userData.phase = Math.random() * 10;
      scene.add(card);
      cards.push(card);
    }
  }

  // community cards
  for (let i = 0; i < 5; i++) {
    const cc = new THREE_REF.Mesh(
      new THREE_REF.PlaneGeometry(0.18, 0.26),
      matC
    );
    cc.rotation.x = -Math.PI / 2;
    cc.position.set(table.x - 0.4 + i * 0.2, 1.06, table.z);
    cc.userData.phase = Math.random() * 10;
    scene.add(cc);
    cards.push(cc);
  }
}
