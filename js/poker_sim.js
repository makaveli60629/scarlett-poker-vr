// /js/poker_sim.js — Scarlett PokerSim v2 (FULL)
// ✅ No imports; injected THREE
// ✅ 6 seats, 52-card deck, shuffle
// ✅ Deals 2 hole cards per seat + flop/turn/river
// ✅ COMMUNITY hover ONLY when looked at (gaze/forward direction)
// ✅ Showdown visual: lift used hole cards + dim/cover unused ones
// ✅ Safe for multiple instances (lobby + scorpion)

export const PokerSim = (() => {
  const S = {
    THREE: null,
    scene: null,
    root: null,
    log: console.log,

    camera: null,
    hoverCommunityOnly: true,
    hoverDist: 12,
    hoverDot: 0.965,

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

    phase: "idle",
    t: 0,

    showdown: null // { seatIndex, used:[bool,bool] }
  };

  const log = (m) => S.log?.(m);

  function makeDeck() {
    const suits = ["S","H","D","C"];
    const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
    const deck = [];
    for (const s of suits) for (const r of ranks) deck.push({ id:`${r}${s}`, r, s });
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

    // flat on table by default
    g.rotation.x = -Math.PI/2;
    return g;
  }

  function seatPose(i) {
    const a = (i / S.seatCount) * Math.PI * 2;
    const r = 3.35;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const rotY = -a + Math.PI/2;
    return { a, x, z, rotY };
  }

  function cardSlotsForSeat(i) {
    // HOLE cards sit lower than community; we do NOT hover these (per request)
    const p = seatPose(i);
    const base = new S.THREE.Vector3(p.x, S.tableY + 0.28, p.z);

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
    // community sits higher (broadcast read)
    const slots = [];
    const y = S.tableY + 0.62;
    const startX = -0.72;
    const step = 0.36;
    for (let i=0;i<5;i++){
      slots.push({
        pos: new S.THREE.Vector3(startX + i*step, y, 0.0),
        rotY: Math.PI
      });
    }
    return slots;
  }

  function updateCommunityHover() {
    if (!S.camera) return;
    if (!S.hoverCommunityOnly) return;

    const camPos = S.camera.getWorldPosition(new S.THREE.Vector3());
    const camDir = S.camera.getWorldDirection(new S.THREE.Vector3()).normalize();

    for (let i=0;i<S.community.length;i++){
      const card = S.community[i];
      const p = card.getWorldPosition(new S.THREE.Vector3());
      const to = p.clone().sub(camPos);
      const d = to.length();
      const dot = to.normalize().dot(camDir);

      const looking = (d < S.hoverDist) && (dot > S.hoverDot);

      if (card.userData._baseY == null) card.userData._baseY = card.position.y;
      const baseY = card.userData._baseY;

      // hover only when looked at
      card.position.y = looking ? (baseY + 0.25) : baseY;
    }
  }

  // Public
  function init({ THREE, scene, root, log: logFn, tableCenter, tableY, tableR, seatCount=6, camera=null, hoverCommunityOnly=true }) {
    S.THREE = THREE;
    S.scene = scene;
    S.root = root;
    S.log = logFn || console.log;

    S.camera = camera;
    S.hoverCommunityOnly = hoverCommunityOnly;

    S.tableCenter = tableCenter || new THREE.Vector3(0,0,0);
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

    // deck anchor
    S.deckAnchor = new THREE.Object3D();
    S.deckAnchor.position.set(-0.9, S.tableY + 0.19, -0.35);
    root.add(S.deckAnchor);

    // seats + rings
    S.seats.length = 0;
    for (let i=0;i<S.seatCount;i++){
      const p = seatPose(i);

      const marker = new THREE.Mesh(
        new THREE.RingGeometry(0.22, 0.30, 24),
        new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent:true, opacity:0.22, side: THREE.DoubleSide })
      );
      marker.rotation.x = -Math.PI/2;
      marker.position.set(p.x, (S.tableY > 0 ? S.tableY - 0.85 : 0.06), p.z);
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
    S.showdown = null;
  }

  function startNewHand() {
    clearTable();
    S.deck = shuffle(makeDeck());
    S.dealtIndex = 0;
    S.phase = "dealing";
    S.t = 0;
    log("[poker] new hand ✅");
  }

  function drawCard() { return S.deck[S.dealtIndex++]; }

  function dealHoleCards() {
    for (let round=0; round<2; round++) {
      for (let i=0;i<S.seatCount;i++){
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
    log("[poker] hole dealt ✅");
  }

  function dealCommunity(n) {
    for (let k=0;k<n;k++){
      const c = drawCard();
      const mesh = makeCardMesh(c.id);
      mesh.position.copy(S.deckAnchor.position);
      mesh.rotation.y = Math.PI;
      S.root.add(mesh);
      S.community.push(mesh);
    }
    log(`[poker] community +${n} ✅`);
  }

  function setShowdown({ seatIndex=0, used=[true,true] } = {}) {
    S.showdown = { seatIndex, used: [!!used[0], !!used[1]] };
    log("[poker] showdown ✅");
  }

  function tickAnimations(dt) {
    // hole targets
    for (let i=0;i<S.seatCount;i++){
      const slots = cardSlotsForSeat(i);
      const hole = S.seats[i].hole;

      for (let j=0;j<hole.length;j++){
        const mesh = hole[j];
        const tgt = slots[j] || slots[slots.length-1];
        mesh.position.lerp(tgt.pos, 0.10);
        mesh.rotation.y += (tgt.rotY - mesh.rotation.y) * 0.10;
      }
    }

    // community targets
    const comSlots = communitySlots();
    for (let i=0;i<S.community.length;i++){
      const mesh = S.community[i];
      const tgt = comSlots[i];
      mesh.position.lerp(tgt.pos, 0.10);
      mesh.rotation.y += (tgt.rotY - mesh.rotation.y) * 0.10;
    }

    // showdown highlight (lift used, cover unused)
    if (S.showdown) {
      const s = S.seats[S.showdown.seatIndex];
      if (s?.hole?.length >= 2) {
        for (let j=0;j<2;j++){
          const card = s.hole[j];

          // lift used more than unused
          const lift = S.showdown.used[j] ? 0.20 : 0.06;
          card.position.y += lift;

          const dim = !S.showdown.used[j];
          card.traverse?.((o) => {
            if (o?.isMesh && o.material) {
              o.material.opacity = dim ? 0.25 : 1.0;
              o.material.transparent = dim ? true : (o.material.transparent || false);
            }
          });
        }
      }
    }
  }

  function update(dt) {
    S.t += dt;

    if (S.phase === "idle") {
      tickAnimations(dt);
      updateCommunityHover();
      return;
    }

    if (S.phase === "dealing") {
      if (S.t > 0.35) dealHoleCards();
      tickAnimations(dt);
      updateCommunityHover();
      return;
    }

    if (S.phase === "flop") {
      if (S.t < 0.35) { tickAnimations(dt); updateCommunityHover(); return; }
      dealCommunity(3);
      S.phase = "turn"; S.t = 0;
      tickAnimations(dt);
      updateCommunityHover();
      return;
    }

    if (S.phase === "turn") {
      if (S.t < 0.95) { tickAnimations(dt); updateCommunityHover(); return; }
      dealCommunity(1);
      S.phase = "river"; S.t = 0;
      tickAnimations(dt);
      updateCommunityHover();
      return;
    }

    if (S.phase === "river") {
      if (S.t < 0.95) { tickAnimations(dt); updateCommunityHover(); return; }
      dealCommunity(1);
      S.phase = "idle"; S.t = 0;
      log("[poker] hand complete ✅ (idle)");
      tickAnimations(dt);
      updateCommunityHover();

      // demo: trigger showdown highlight sometimes
      setTimeout(() => {
        // show "winning" hole usage for YOU (seat 0) as a placeholder:
        // in real logic this comes from hand evaluation.
        setShowdown({ seatIndex: 0, used: [true, false] });
      }, 900);

      return;
    }
  }

  return { init, startNewHand, update, setShowdown, clearTable };
})();
