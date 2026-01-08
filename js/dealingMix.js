// /js/dealingMix.js — Scarlett Poker VR DealingMix v1.1
// Fixes: community cards higher & obvious. Cards hover slightly.

export const DealingMix = {
  init({ THREE, scene, log = console.log, world }) {
    const L = (...a) => { try { log(...a); } catch { console.log(...a); } };

    const table = world?.table || world?.group || scene;
    const focus = world?.tableFocus || new THREE.Vector3(0, 0, -6.5);

    const TABLE_Y = 0.92;
    const HOVER_Y = TABLE_Y + 0.12;  // ✅ higher so you see it
    const CARD_W = 0.10;
    const CARD_H = 0.14;
    const CARD_T = 0.002;

    const deckPos = new THREE.Vector3(focus.x + 0.70, HOVER_Y + 0.02, focus.z + 0.18);

    const comm = [
      new THREE.Vector3(focus.x - 0.30, HOVER_Y, focus.z + 0.02),
      new THREE.Vector3(focus.x - 0.15, HOVER_Y, focus.z + 0.02),
      new THREE.Vector3(focus.x + 0.00, HOVER_Y, focus.z + 0.02),
      new THREE.Vector3(focus.x + 0.15, HOVER_Y, focus.z + 0.02),
      new THREE.Vector3(focus.x + 0.30, HOVER_Y, focus.z + 0.02),
    ];

    const state = {
      t: 0,
      deck: [],
      deckIndex: 0,
      activeCards: [],
      queue: [],
      timers: []
    };

    function schedule(delay, fn) { state.timers.push({ at: state.t + Math.max(0, delay), fn }); }
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function enqueueMove(obj, from, to, dur = 0.22, onDone = null) {
      state.queue.push({ obj, from: from.clone(), to: to.clone(), dur: Math.max(0.12, dur), t: 0, onDone });
    }

    function randInt(n) { return Math.floor(Math.random() * n); }

    function makeCardMesh(color = 0xffffff, backColor = 0xff2d7a) {
      const g = new THREE.Group();
      g.name = "Card";

      const frontMat = new THREE.MeshStandardMaterial({
        color, roughness: 0.5, emissive: 0x111111, emissiveIntensity: 0.25, side: THREE.DoubleSide
      });
      const backMat = new THREE.MeshStandardMaterial({
        color: backColor, roughness: 0.5, emissive: 0x220010, emissiveIntensity: 0.45, side: THREE.DoubleSide
      });

      const front = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), frontMat);
      front.rotation.x = -Math.PI / 2;
      front.position.y = 0.001;

      const back = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), backMat);
      back.rotation.x = -Math.PI / 2;
      back.rotation.y = Math.PI;
      back.position.y = -0.001;

      const body = new THREE.Mesh(new THREE.BoxGeometry(CARD_W, CARD_T, CARD_H), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }));
      body.position.y = 0;

      g.add(body, front, back);
      return g;
    }

    function buildDeck() {
      const suits = ["S", "H", "D", "C"];
      const ranks = ["A","2","3","4","5","6","7","8","9","T","J","Q","K"];
      const deck = [];
      for (const s of suits) for (const r of ranks) deck.push(r + s);
      for (let i = deck.length - 1; i > 0; i--) {
        const j = randInt(i + 1);
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      state.deck = deck;
      state.deckIndex = 0;
    }

    function drawCardId() {
      if (state.deckIndex >= state.deck.length) return null;
      return state.deck[state.deckIndex++];
    }

    // Deck stack (visual)
    const deckStack = new THREE.Group();
    deckStack.name = "DeckStack";
    deckStack.position.copy(deckPos);
    table.add(deckStack);

    for (let i = 0; i < 10; i++) {
      const c = makeCardMesh(0xffffff, 0xff2d7a);
      c.position.set(0, i * 0.0012, 0);
      deckStack.add(c);
    }

    function dealCommunity(count, startIndex, delay = 0) {
      for (let i = 0; i < count; i++) {
        schedule(delay + i * 0.18, () => {
          const id = drawCardId();
          if (!id) return;

          const card = makeCardMesh(0xffffff, 0xff2d7a);
          card.userData.id = id;
          card.position.copy(deckPos);

          table.add(card);
          state.activeCards.push(card);

          const to = comm[Math.max(0, Math.min(comm.length - 1, startIndex + i))].clone();
          enqueueMove(card, deckPos, to, 0.24);
        });
      }
    }

    function clearAll() {
      for (const c of state.activeCards) { try { c.parent?.remove(c); } catch {} }
      state.activeCards.length = 0;
      state.queue.length = 0;
      state.timers.length = 0;
      state.deck.length = 0;
      state.deckIndex = 0;
    }

    function startHand() {
      clearAll();
      buildDeck();
      state.t = 0;
      L("[DealingMix] startHand ✅");

      // Only do community for now (since you're focusing above heads)
      dealCommunity(3, 0, 0.6);
      dealCommunity(1, 3, 2.0);
      dealCommunity(1, 4, 3.2);
    }

    function update(dt) {
      state.t += dt;

      if (state.timers.length) {
        state.timers.sort((a, b) => a.at - b.at);
        while (state.timers.length && state.timers[0].at <= state.t) {
          const it = state.timers.shift();
          try { it.fn(); } catch {}
        }
      }

      // Animate move queue
      if (state.queue.length) {
        const m = state.queue[0];
        m.t += dt;
        const t = Math.min(1, m.t / m.dur);
        const e = easeOutCubic(t);

        m.obj.position.set(
          m.from.x + (m.to.x - m.from.x) * e,
          m.from.y + (m.to.y - m.from.y) * e,
          m.from.z + (m.to.z - m.from.z) * e
        );

        // hover bob when settled
        if (t >= 1) {
          state.queue.shift();
          try { m.onDone?.(); } catch {}
        }
      }

      // subtle hover for all active cards
      for (let i = 0; i < state.activeCards.length; i++) {
        const c = state.activeCards[i];
        c.position.y = HOVER_Y + Math.sin(state.t * 2.2 + i) * 0.006;
      }
    }

    return { startHand, update, clear: clearAll };
  }
};
