// /js/dealingMix.js — Scarlett Poker VR DealingMix v1.0
// GitHub Pages safe module (no "three" import). main.js passes THREE in.

export const DealingMix = {
  init({ THREE, scene, log = console.log, world }) {
    const L = (...a) => { try { log(...a); } catch { console.log(...a); } };

    // ---------- CONFIG ----------
    const table = world?.table || world?.group || scene;
    const focus = world?.tableFocus || new THREE.Vector3(0, 0, -6.5);
    const seats = world?.seats || [];

    // Card sizing (VR-friendly)
    const CARD_W = 0.065;
    const CARD_H = 0.090;
    const CARD_T = 0.002;

    // Positions
    const deckPos = new THREE.Vector3(focus.x + 0.70, 0.935, focus.z + 0.18);
    const burnPos = new THREE.Vector3(focus.x + 0.45, 0.935, focus.z + 0.18);

    const comm = [
      new THREE.Vector3(focus.x - 0.30, 0.935, focus.z + 0.02),
      new THREE.Vector3(focus.x - 0.15, 0.935, focus.z + 0.02),
      new THREE.Vector3(focus.x + 0.00, 0.935, focus.z + 0.02),
      new THREE.Vector3(focus.x + 0.15, 0.935, focus.z + 0.02),
      new THREE.Vector3(focus.x + 0.30, 0.935, focus.z + 0.02),
    ];

    // ---------- STATE ----------
    const state = {
      running: true,
      phase: "idle",
      t: 0,
      deck: [],
      deckIndex: 0,
      activeCards: [],
      queue: [],          // animation queue items
      timers: [],         // scheduled actions
      lastDt: 0.016,
    };

    // ---------- UTIL ----------
    function schedule(delay, fn) {
      state.timers.push({ at: state.t + Math.max(0, delay), fn });
    }

    function clearAll() {
      for (const c of state.activeCards) {
        try { c.parent?.remove(c); } catch {}
      }
      state.activeCards.length = 0;
      state.queue.length = 0;
      state.timers.length = 0;
      state.deck.length = 0;
      state.deckIndex = 0;
      state.phase = "idle";
    }

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function enqueueMove(obj, from, to, dur = 0.22, onDone = null) {
      state.queue.push({
        obj,
        from: from.clone(),
        to: to.clone(),
        dur: Math.max(0.12, dur),
        t: 0,
        onDone
      });
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

      g.add(body);
      g.add(front);
      g.add(back);

      // default: lying flat
      g.rotation.x = 0;
      g.userData.faceUp = false;

      return g;
    }

    function setFaceUp(card, yes) {
      // In this simple build: face-up means rotate 180 around Y so white face is visible.
      // (You can later replace with real textures.)
      card.userData.faceUp = !!yes;
      // nothing else needed because front/back are separate meshes
    }

    // ---------- DECK LOGIC ----------
    function buildDeck() {
      // Standard 52 (we only use IDs; visuals are generic for now)
      const suits = ["S", "H", "D", "C"];
      const ranks = ["A","2","3","4","5","6","7","8","9","T","J","Q","K"];
      const deck = [];
      for (const s of suits) for (const r of ranks) deck.push(r + s);

      // Fisher-Yates shuffle
      for (let i = deck.length - 1; i > 0; i--) {
        const j = randInt(i + 1);
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      state.deck = deck;
      state.deckIndex = 0;
    }

    function drawCardId() {
      if (state.deckIndex >= state.deck.length) return null;
      const id = state.deck[state.deckIndex++];
      return id;
    }

    // ---------- TARGET POSITIONS ----------
    function seatCardTarget(seatIndex, cardIndex) {
      // seatIndex: 0..5
      const s = seats[seatIndex];
      if (!s) {
        // fallback ring around focus
        const a = (seatIndex / 6) * Math.PI * 2;
        const p = new THREE.Vector3(
          focus.x + Math.cos(a) * 3.05,
          0,
          focus.z + Math.sin(a) * 3.05
        );
        const inward = new THREE.Vector3(focus.x - p.x, 0, focus.z - p.z).normalize().multiplyScalar(0.55);
        const base = p.clone().add(inward);
        base.y = 0.935;
        base.add(new THREE.Vector3((cardIndex === 0 ? -0.04 : 0.04), 0, 0));
        return base;
      }

      const base = s.position.clone();
      const inward = new THREE.Vector3(focus.x - base.x, 0, focus.z - base.z).normalize().multiplyScalar(0.55);
      const tpos = base.clone().add(inward);
      tpos.y = 0.935;

      // spread 2 hole cards sideways around facing direction
      const side = new THREE.Vector3().crossVectors(inward, new THREE.Vector3(0, 1, 0)).normalize();
      tpos.add(side.multiplyScalar(cardIndex === 0 ? -0.045 : 0.045));
      return tpos;
    }

    function communityTarget(i) {
      return comm[Math.max(0, Math.min(comm.length - 1, i))].clone();
    }

    // ---------- TABLE PROPS (deck stack) ----------
    const deckStack = new THREE.Group();
    deckStack.name = "DeckStack";
    deckStack.position.copy(deckPos);
    table.add(deckStack);

    // a small stack of visible back cards
    const backColors = [0x2b7cff, 0x6bff8f, 0xffcc00, 0xff6b6b, 0xffffff];
    for (let i = 0; i < 10; i++) {
      const c = makeCardMesh(backColors[i % backColors.length]);
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

        table.add(card);
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

        table.add(card);
        state.activeCards.push(card);

        enqueueMove(card, deckPos, burnPos, 0.18);
        // Optionally remove burn after settle
        schedule(0.45, () => {
          try { table.remove(card); } catch {}
        });
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

          table.add(card);
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
      state.phase = "dealing";
      L("[DealingMix] startHand ✅");

      // Pre-flop: 2 rounds to 6 seats
      let t = 0.15;
      for (let round = 0; round < 2; round++) {
        for (let s = 0; s < 6; s++) {
          dealOneToSeat(s, round, t);
          t += 0.10;
        }
      }

      // Flop / Turn / River
      // Burn then community
      burnOne(t + 0.35);
      dealCommunity(3, 0, t + 0.55);

      burnOne(t + 2.10);
      dealCommunity(1, 3, t + 2.30);

      burnOne(t + 3.60);
      dealCommunity(1, 4, t + 3.80);

      // End phase
      schedule(t + 5.2, () => {
        state.phase = "done";
        L("[DealingMix] hand complete ✅");
      });
    }

    // ---------- UPDATE LOOP ----------
    function update(dt) {
      state.lastDt = dt;
      state.t += dt;

      // Run scheduled actions
      if (state.timers.length) {
        // Execute due timers in order
        state.timers.sort((a, b) => a.at - b.at);
        while (state.timers.length && state.timers[0].at <= state.t) {
          const it = state.timers.shift();
          try { it.fn(); } catch (e) { L("[DealingMix] timer error:", e?.message || e); }
        }
      }

      // Animate one queued move at a time (smooth dealing)
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

        if (t >= 1) {
          state.queue.shift();
          try { m.onDone?.(); } catch {}
        }
      }
    }

    // Public API
    return {
      startHand,
      update,
      clear: clearAll
    };
  }
};
