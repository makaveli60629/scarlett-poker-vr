// /js/poker_simulation.js — Update 9.0 WATCHABLE poker (safe, visible, no "this" binding issues)

let THREE_REF = null;
let scene = null;
let world = null;
let botsSys = null;

let timer = 0;
let phase = 0;
let round = 0;

let tableCards = [];
let seatCards = [];
let chips = [];

export const PokerSimulation = {
  init({ THREE, scene: sc, world: w, bots }) {
    THREE_REF = THREE;
    scene = sc;
    world = w;
    botsSys = bots || null;

    resetRound(true);
    console.log("[PokerSimulation] init ✅");
  },

  update(dt) {
    timer += dt;

    // subtle motion so it looks alive
    for (const c of tableCards) c.position.y = 1.06 + Math.sin(timer * 3 + c.userData.p) * 0.01;
    for (const c of seatCards)  c.position.y = 1.05 + Math.sin(timer * 3 + c.userData.p) * 0.01;

    // phases: deal seats -> deal flop/turn/river -> pick winner -> clear
    if (phase === 0 && timer > 1.0) { phase = 1; timer = 0; dealSeatCards(); }
    if (phase === 1 && timer > 1.5) { phase = 2; timer = 0; dealTable(3); }
    if (phase === 2 && timer > 2.0) { phase = 3; timer = 0; dealTable(1); }
    if (phase === 3 && timer > 2.0) { phase = 4; timer = 0; dealTable(1); }
    if (phase === 4 && timer > 2.0) { phase = 5; timer = 0; pickWinner(); }
    if (phase === 5 && timer > 3.0) { resetRound(false); }

    // chip “betting” bounce
    for (const ch of chips) {
      ch.position.y = 1.01 + Math.sin((timer * 6) + ch.userData.p) * 0.01;
    }
  }
};

// ---------- internal ----------
function resetRound(first) {
  clearAll();

  round++;
  timer = 0;
  phase = 0;

  // build pot chips (visible)
  const potCenter = world.tableFocus.clone();
  for (let i = 0; i < 20; i++) {
    const chip = new THREE_REF.Mesh(
      new THREE_REF.CylinderGeometry(0.05, 0.05, 0.015, 18),
      new THREE_REF.MeshStandardMaterial({ color: i % 2 ? 0xff3355 : 0x33ff88, roughness: 0.7 })
    );
    chip.rotation.x = Math.PI / 2;
    chip.position.set(
      potCenter.x + (Math.random() - 0.5) * 0.28,
      1.01,
      potCenter.z + (Math.random() - 0.5) * 0.22
    );
    chip.userData.p = Math.random() * 10;
    scene.add(chip);
    chips.push(chip);
  }

  if (!first) {
    // small “winner walk” vibe: show crown on random bot for 6 seconds
    if (botsSys?.setWinner) botsSys.setWinner(Math.floor(Math.random() * 6), 6);
  }
}

function clearAll() {
  for (const o of [...tableCards, ...seatCards, ...chips]) scene?.remove(o);
  tableCards = [];
  seatCards = [];
  chips = [];
}

function dealSeatCards() {
  const seats = world.seats || [];
  const seatCount = Math.min(6, seats.length);

  for (let i = 0; i < seatCount; i++) {
    const s = seats[i];
    for (let k = 0; k < 2; k++) {
      const card = makeCard(k === 0 ? 0xffffff : 0xffd6f2);
      card.rotation.x = -Math.PI / 2;
      card.position.set(s.position.x + k * 0.08, 1.05, s.position.z + 0.12);
      scene.add(card);
      seatCards.push(card);
    }
  }
}

function dealTable(n) {
  const start = tableCards.length;
  for (let i = 0; i < n; i++) {
    const card = makeCard(0xd6f7ff);
    card.rotation.x = -Math.PI / 2;
    card.position.set(world.tableFocus.x - 0.4 + (start + i) * 0.2, 1.06, world.tableFocus.z);
    scene.add(card);
    tableCards.push(card);
  }
}

function pickWinner() {
  // just a visible moment right now
  // later: real engine here
}

function makeCard(color) {
  const m = new THREE_REF.MeshStandardMaterial({ color, roughness: 0.65 });
  const card = new THREE_REF.Mesh(new THREE_REF.PlaneGeometry(0.18, 0.26), m);
  card.userData.p = Math.random() * 10;
  return card;
}
