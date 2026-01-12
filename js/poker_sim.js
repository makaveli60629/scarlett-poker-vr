// /js/poker_sim.js — Scarlett PokerSim v1 (NO imports; injected THREE)
// ✅ 6 seats around the table
// ✅ 52-card deck + shuffle
// ✅ Deal 2 hole cards to each seat
// ✅ Flop / Turn / River (5 community cards)
// ✅ Smooth alignment animations (no scatter)

export const PokerSim = (() => {
  const S = {
    THREE: null,
    scene: null,
    root: null,
    log: console.log,

    tableCenter: null,
    tableY: 0,
    tableR: 3.05,

    seatCount: 6,
    seats: [],

    deck: [],
    dealtIndex: 0,

    cardGeo: null,
    mats: null,

    deckAnchor: null,
    community: [],

    phase: "idle", // idle, dealing, flop, turn, river
    t: 0
  };

  const log = (m) => S.log?.(m);

  function makeDeck() {
    const suits = ["S", "H", "D", "C"];
    const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
    const deck = [];
    for (const s of suits) for (const r of ranks) deck.push({ id: `${r}${s}`, r, s });
    return deck;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function makeCardMesh(cardId) {
    const { THREE } = S;

    const g = new THREE.Group();

    const front = new THREE.Mesh(S.cardGeo, S.mats.front);
    front.position.z = 0.002;
    g.add(front);

    const back = new THREE.Mesh(S.cardGeo, S.mats.back);
    back.rotation.y = Math.PI;
    back.position.z = -0.002;
    g.add(back);

    g.userData.cardId = cardId;
    g.rotation.x = -Math.PI / 2;
    return g;
  }

  function seatPose(i) {
    const a = (i / S.seatCount) * Math.PI * 2;
    const r = 3.35;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const rotY = -a + Math.PI / 2;
    return { a, x, z, rotY };
  }

  function cardSlotsForSeat(i) {
    const p = seatPose(i);
    const base = new S.THREE.Vector3(p.x, S.tableY + 0.18, p.z);

    const toward = new S.THREE.Vector3(-p.x, 0, -p.z).normalize().multiplyScalar(0.35);
    const right = new S.THREE.Vector3(Math.cos(p.a + Math.PI/2), 0, Math.sin(p.a + Math.PI/2)).normalize().multiplyScalar(0.16);

    const c1 = base.clone().add(toward).add(right.clone().multiplyScalar(-1));
    const c2 = base.clone().add(toward).add(right.clone().multiplyScalar(1));

    return [
      { pos: c1, rotY: p.rotY + 0.10 },
      { pos: c2, rotY: p.rotY - 0.10 }
    ];
  }

  function communitySlots() {
    const slots = [];
    const y = S.tableY + 0.18;
    const startX = -0.72;
    const step = 0.36;
    for (let i = 0; i < 5; i++) {
      slots.push({
        pos: new S.THREE.Vector3(startX + i * step, y, 0.0),
        rotY: Math.PI
      });
    }
    return slots;
  }

  function init({ THREE, scene, root, log: logFn, tableCenter, tableY, tableR, seatCount = 6 }) {
    S.THREE = THREE;
    S.scene = scene;
    S.root = root;
    S.log = logFn || console.log;

    S.tableCenter = tableCenter || new THREE.Vector3(0, 0, 0);
    S.tableY = tableY ?? 0;
    S.tableR = tableR ?? 3.05;
    S.seatCount = seatCount;

    S.cardGeo = new THREE.PlaneGeometry(0.55, 0.78);
    S.mats = {
      front: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.10,
        roughness: 0.55,
        metalness: 0.05
      }),
      back: new THREE.MeshStandardMaterial({
        color: 0x1b2cff,
        emissive: new THREE.Color(0x1b2cff),
        emissiveIntensity: 0.70,
        roughness: 0.55,
        metalness: 0.12
      })
    };

    // deck anchor on table
    S.deckAnchor = new THREE.Object3D();
    S.deckAnchor.position.set(-0.9, S.tableY + 0.19, -0.35);
    root.add(S.deckAnchor);

    // seat markers (alignment check)
    S.seats.length = 0;
    for (let i = 0; i < S.seatCount; i++) {
      const p = seatPose(i);
      const marker = new THREE.Mesh(
        new THREE.RingGeometry(0.22, 0.30, 24),
        new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
      );
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(p.x, 0.06, p.z);
      root.add(marker);

      S.seats.push({ i, angle: p.a, marker, hole: [] });
    }

    log("[poker] init ✅ seats=" + S.seatCount);
  }

  function clearTable() {
    for (const s of S.seats) {
      for (const c of s.hole) if (c?.parent) c.parent.remove(c);
      s.hole.length = 0;
    }
    for (const c of S.community) if (c?.parent) c.parent.remove(c);
    S.community.length = 0;
  }

  function startNewHand() {
    clearTable();
    S.deck = shuffle(makeDeck());
    S.dealtIndex = 0;
    S.phase = "dealing";
    S.t = 0;
    log("[poker] new hand ✅ deck shuffled");
  }

  function drawCard() {
    return S.deck[S.dealtIndex++];
  }

  function dealHoleCards() {
    for (let round = 0; round < 2; round++) {
      for (let i = 0; i < S.seatCount; i++) {
        const c = drawCard();
        const mesh = makeCardMesh(c.id);
        mesh.position.copy(S.deckAnchor.position);
        mesh.rotation.y = Math.PI;
        S.root.add(mesh);
        S.seats[i].hole.push(mesh);
      }
    }
    S.phase = "flop";
    S.t = 0;
    log("[poker] hole cards dealt ✅");
  }

  function dealCommunity(n) {
    for (let k = 0; k < n; k++) {
      const c = drawCard();
      const mesh = makeCardMesh(c.id);
      mesh.position.copy(S.deckAnchor.position);
      mesh.rotation.y = Math.PI;
      S.root.add(mesh);
      S.community.push(mesh);
    }
    log(`[poker] community +${n} ✅`);
  }

  function tickAnimations(dt) {
    for (let i = 0; i < S.seatCount; i++) {
      const slots = cardSlotsForSeat(i);
      const hole = S.seats[i].hole;

      for (let j = 0; j < hole.length; j++) {
        const mesh = hole[j];
        const tgt = slots[j] || slots[slots.length - 1];
        mesh.position.lerp(tgt.pos, 0.10);
        mesh.rotation.y += (tgt.rotY - mesh.rotation.y) * 0.10;
      }
    }

    const comSlots = communitySlots();
    for (let i = 0; i < S.community.length; i++) {
      const mesh = S.community[i];
      const tgt = comSlots[i];
      mesh.position.lerp(tgt.pos, 0.10);
      mesh.rotation.y += (tgt.rotY - mesh.rotation.y) * 0.10;
    }
  }

  function update(dt) {
    S.t += dt;

    if (S.phase === "idle") { tickAnimations(dt); return; }

    if (S.phase === "dealing") {
      if (S.t > 0.35) dealHoleCards();
      tickAnimations(dt);
      return;
    }

    if (S.phase === "flop") {
      if (S.t < 0.35) { tickAnimations(dt); return; }
      dealCommunity(3);
      S.phase = "turn"; S.t = 0;
      tickAnimations(dt);
      return;
    }

    if (S.phase === "turn") {
      if (S.t < 0.95) { tickAnimations(dt); return; }
      dealCommunity(1);
      S.phase = "river"; S.t = 0;
      tickAnimations(dt);
      return;
    }

    if (S.phase === "river") {
      if (S.t < 0.95) { tickAnimations(dt); return; }
      dealCommunity(1);
      S.phase = "idle"; S.t = 0;
      log("[poker] river ✅ hand complete");
      tickAnimations(dt);
      return;
    }
  }

  return { init, startNewHand, update };
})();
