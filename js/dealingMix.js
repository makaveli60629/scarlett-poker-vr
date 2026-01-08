// /js/dealingMix.js — Scarlett Poker VR DealingMix v1.2 (LOCAL SPACE FIX + HOVER)
// IMPORTANT FIX:
// - If you add cards to world.table (a Group), positions must be LOCAL to that table.
// - This version converts world targets -> table-local so cards land on top of felt.
// - Also lifts the Y a bit and adds subtle hover.

export const DealingMix = {
  init({ THREE, scene, log = console.log, world }) {
    const L = (...a) => { try { log(...a); } catch { console.log(...a); } };

    const tableGroup = world?.table || world?.group || scene;
    const focusW = world?.tableFocus || new THREE.Vector3(0, 0, -6.5);
    const seats = world?.seats || [];

    // ---------- SIZES (bigger / more VR visible) ----------
    const CARD_W = 0.085;
    const CARD_H = 0.120;
    const CARD_T = 0.0025;

    // ---------- HEIGHTS ----------
    const FELT_Y = 0.92;         // matches world.js TABLE_Y
    const CARD_Y = FELT_Y + 0.065; // lift above table so it never clips
    const HOVER_AMT = 0.006;

    // helper: convert world position -> local of tableGroup
    function toLocal(worldVec) {
      const v = worldVec.clone();
      tableGroup.worldToLocal(v);
      return v;
    }

    // ---------- POSITIONS (WORLD SPACE first) ----------
    const deckPosW = new THREE.Vector3(focusW.x + 0.70, CARD_Y, focusW.z + 0.18);
    const burnPosW = new THREE.Vector3(focusW.x + 0.45, CARD_Y, focusW.z + 0.18);

    const commW = [
      new THREE.Vector3(focusW.x - 0.34, CARD_Y, focusW.z + 0.02),
      new THREE.Vector3(focusW.x - 0.17, CARD_Y, focusW.z + 0.02),
      new THREE.Vector3(focusW.x + 0.00, CARD_Y, focusW.z + 0.02),
      new THREE.Vector3(focusW.x + 0.17, CARD_Y, focusW.z + 0.02),
      new THREE.Vector3(focusW.x + 0.34, CARD_Y, focusW.z + 0.02),
    ];

    // convert to LOCAL now
    const deckPos = toLocal(deckPosW);
    const burnPos = toLocal(burnPosW);
    const comm = commW.map(toLocal);

    // ---------- STATE ----------
    const state = {
      t: 0,
      deck: [],
      deckIndex: 0,
      activeCards: [],
      queue: [],
      timers: [],
    };

    function schedule(delay, fn) {
      state.timers.push({ at: state.t + Math.max(0, delay), fn });
    }

    function clearAll() {
      for (const c of state.activeCards) { try { c.parent?.remove(c); } catch {} }
      state.activeCards.length = 0;
      state.queue.length = 0;
      state.timers.length = 0;
      state.deck.length = 0;
      state.deckIndex = 0;
    }

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function enqueueMove(obj, from, to, dur = 0.22, onDone = null) {
      state.queue.push({ obj, from: from.clone(), to: to.clone(), dur: Math.max(0.12, dur), t: 0, onDone });
    }

    function randInt(n) { return Math.floor(Math.random() * n); }

    // ---------- CARD MESH ----------
    function makeCardMesh(backColor = 0x2b7cff) {
      const g = new THREE.Group();
      g.name = "Card";

      const front = new THREE.Mesh(
        new THREE.PlaneGeometry(CARD_W, CARD_H),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 })
      );
      front.position.z = CARD_T / 2;
      front.rotation.x = -Math.PI / 2;

      const back = new THREE.Mesh(
        new THREE.PlaneGeometry(CARD_W, CARD_H),
        new THREE.MeshStandardMaterial({ color: backColor, roughness: 0.55 })
      );
      back.position.z = -CARD_T / 2;
      back.rotation.y = Math.PI;
      back.rotation.x = -Math.PI / 2;

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(CARD_W, CARD_H, CARD_T),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
      );
      body.rotation.x = -Math.PI / 2;

      g.add(body, front, back);
      g.userData.baseY = 0;
      g.rotation.x = 0;
      return g;
    }

    // ---------- DECK ----------
    function buildDeck() {
      const suits = ["S", "H", "D", "C"];
      const ranks = ["A","2","3","4","5","6","7","8","9","T","J","Q","K"];
      const deck = [];
      for (const s of suits) for (const r of ranks) deck.push(r + s);

      for (let i = deck.length - 1; i > 0; i--) {
        const j = randInt(i + 1);
        const tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
      }
      state.deck = deck;
      state.deckIndex = 0;
    }

    function drawCardId() {
      if (state.deckIndex >= state.deck.length) return null;
      return state.deck[state.deckIndex++];
    }

    // ---------- TARGETS (LOCAL) ----------
    function seatCardTarget(seatIndex, cardIndex) {
      const s = seats[seatIndex];
      if (!s) {
        const a = (seatIndex / 6) * Math.PI * 2;
        const pw = new THREE.Vector3(
          focusW.x + Math.cos(a) * 3.05,
          0,
          focusW.z + Math.sin(a) * 3.05
        );
        const inward = new THREE.Vector3(focusW.x - pw.x, 0, focusW.z - pw.z).normalize().multiplyScalar(0.55);
        const bw = pw.clone().add(inward);
        bw.y = CARD_Y;
        bw.x += (cardIndex === 0 ? -0.05 : 0.05);
        return toLocal(bw);
      }

      // seat.position is world space (from your v10.3 seat anchors)
      const baseW = s.position.clone();
      const inward = new THREE.Vector3(focusW.x - baseW.x, 0, focusW.z - baseW.z).normalize().multiplyScalar(0.58);
      const tw = baseW.clone().add(inward);
      tw.y = CARD_Y;

      const side = new THREE.Vector3().crossVectors(inward, new THREE.Vector3(0, 1, 0)).normalize();
      tw.add(side.multiplyScalar(cardIndex === 0 ? -0.055 : 0.055));
      return toLocal(tw);
    }

    function communityTarget(i) {
      return comm[Math.max(0, Math.min(comm.length - 1, i))].clone();
    }

    // ---------- DECK STACK (LOCAL) ----------
    const deckStack = new THREE.Group();
    deckStack.name = "DeckStack";
    deckStack.position.copy(deckPos);
    tableGroup.add(deckStack);

    for (let i = 0; i < 10; i++) {
      const c = makeCardMesh(0x2b7cff);
      c.position.set(0, i * 0.0012, 0);
      c.rotation.x = -Math.PI / 2;
      deckStack.add(c);
    }

    // ---------- ACTIONS ----------
    function dealOneToSeat(seatIndex, cardIndex, delay = 0) {
      schedule(delay, () => {
        const id = drawCardId();
        if (!id) return;

        const card = makeCardMesh(0x2b7cff);
        card.userData.id = id;
        card.position.copy(deckPos);
        card.rotation.x = -Math.PI / 2;
        card.userData.baseY = card.position.y;

        tableGroup.add(card);
        state.activeCards.push(card);

        const to = seatCardTarget(seatIndex, cardIndex);
        enqueueMove(card, deckPos, to, 0.22);
      });
    }

    function burnOne(delay = 0) {
      schedule(delay, () => {
        const id = drawCardId();
        if (!id) return;

        const card = makeCardMesh(0x1b1c26);
        card.userData.id = id;
        card.position.copy(deckPos);
        card.rotation.x = -Math.PI / 2;
        card.userData.baseY = card.position.y;

        tableGroup.add(card);
        state.activeCards.push(card);

        enqueueMove(card, deckPos, burnPos, 0.18);
        schedule(0.60, () => { try { tableGroup.remove(card); } catch {} });
      });
    }

    function dealCommunity(count, startIndex, delay = 0) {
      for (let i = 0; i < count; i++) {
        schedule(delay + i * 0.18, () => {
          const id = drawCardId();
          if (!id) return;

          const card = makeCardMesh(0x9b59ff);
          card.userData.id = id;
          card.position.copy(deckPos);
          card.rotation.x = -Math.PI / 2;
          card.userData.baseY = card.position.y;

          tableGroup.add(card);
          state.activeCards.push(card);

          const to = communityTarget(startIndex + i);
          enqueueMove(card, deckPos, to, 0.24);
        });
      }
    }

    function startHand() {
      clearAll();
      buildDeck();
      state.t = 0;
      L("[DealingMix] startHand ✅");

      let t = 0.15;
      for (let round = 0; round < 2; round++) {
        for (let s = 0; s < 6; s++) {
          dealOneToSeat(s, round, t);
          t += 0.10;
        }
      }

      burnOne(t + 0.35);
      dealCommunity(3, 0, t + 0.55);

      burnOne(t + 2.10);
      dealCommunity(1, 3, t + 2.30);

      burnOne(t + 3.60);
      dealCommunity(1, 4, t + 3.80);

      schedule(t + 5.2, () => L("[DealingMix] hand complete ✅"));
    }

    function update(dt) {
      state.t += dt;

      // timers
      if (state.timers.length) {
        state.timers.sort((a, b) => a.at - b.at);
        while (state.timers.length && state.timers[0].at <= state.t) {
          const it = state.timers.shift();
          try { it.fn(); } catch (e) { L("[DealingMix] timer error:", e?.message || e); }
        }
      }

      // deal animation queue
      if (state.queue.length) {
        const m = state.queue[0];
        m.t += dt;
        const tt = Math.min(1, m.t / m.dur);
        const e = easeOutCubic(tt);

        m.obj.position.set(
          m.from.x + (m.to.x - m.from.x) * e,
          m.from.y + (m.to.y - m.from.y) * e,
          m.from.z + (m.to.z - m.from.z) * e
        );
        if (tt >= 1) {
          state.queue.shift();
          m.obj.userData.baseY = m.obj.position.y;
          try { m.onDone?.(); } catch {}
        }
      }

      // hover
      for (let i = 0; i < state.activeCards.length; i++) {
        const c = state.activeCards[i];
        const by = c.userData.baseY || c.position.y;
        c.position.y = by + Math.sin(state.t * 2.2 + i) * HOVER_AMT;
      }
    }

    return { startHand, update, clear: clearAll };
  }
};
