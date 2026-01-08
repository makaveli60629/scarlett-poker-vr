// /js/dealingMix.js — Scarlett Poker VR DealingMix v1.2 (FIXED PLACEMENT + BIGGER CARDS + VISIBLE POT)
// GitHub Pages safe module (no "three" import). main.js passes THREE in.

export const DealingMix = {
  init({ THREE, scene, log = console.log, world }) {
    const L = (...a) => { try { log(...a); } catch { console.log(...a); } };

    // IMPORTANT FIX:
    // Use WORLD SPACE parent so our positions (which are world coords) land correctly.
    const parent = world?.group || scene;
    const focus  = world?.tableFocus || new THREE.Vector3(0, 0, -6.5);
    const seats  = world?.seats || [];

    // pull table height if world provides it
    const TABLE_Y = (typeof world?.tableY === "number") ? world.tableY : 0.92;

    // ---------- CARD SIZING (BIGGER) ----------
    const CARD_W = 0.095; // was 0.065
    const CARD_H = 0.135; // was 0.090
    const CARD_T = 0.002;

    // ---------- POSITIONS (NOW ON TABLE) ----------
    // Put the "dealer/deck" on the felt near center-right, not behind the table.
    const deckPos = new THREE.Vector3(focus.x + 0.55, TABLE_Y + 0.030, focus.z - 0.18);
    const burnPos = new THREE.Vector3(focus.x + 0.35, TABLE_Y + 0.030, focus.z - 0.18);

    const comm = [
      new THREE.Vector3(focus.x - 0.40, TABLE_Y + 0.022, focus.z + 0.02),
      new THREE.Vector3(focus.x - 0.20, TABLE_Y + 0.022, focus.z + 0.02),
      new THREE.Vector3(focus.x + 0.00, TABLE_Y + 0.022, focus.z + 0.02),
      new THREE.Vector3(focus.x + 0.20, TABLE_Y + 0.022, focus.z + 0.02),
      new THREE.Vector3(focus.x + 0.40, TABLE_Y + 0.022, focus.z + 0.02),
    ];

    // ---------- HOOKS ----------
    const hooks = {
      onHandStart: null,
      onHoleCard: null,
      onCommunity: null,
      onPot: null,
      onHandEnd: null
    };

    // ---------- STATE ----------
    const state = {
      phase: "idle",
      t: 0,
      deck: [],
      deckIndex: 0,
      active: [],
      queue: [],
      timers: [],
      potCount: 0,
      potGroup: null
    };

    // ---------- UTIL ----------
    function schedule(delay, fn) {
      state.timers.push({ at: state.t + Math.max(0, delay), fn });
    }
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function randInt(n) { return Math.floor(Math.random() * n); }

    function clearAll() {
      for (const o of state.active) {
        try { o.parent?.remove(o); } catch {}
      }
      state.active.length = 0;
      state.queue.length = 0;
      state.timers.length = 0;
      state.deck.length = 0;
      state.deckIndex = 0;
      state.phase = "idle";
      state.potCount = 0;

      if (state.potGroup) {
        try { state.potGroup.parent?.remove(state.potGroup); } catch {}
        state.potGroup = null;
      }
    }

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

    // ---------- CARD MESH ----------
    function makeCardMesh(backColor = 0x2b7cff) {
      const g = new THREE.Group();
      g.name = "Card";

      const front = new THREE.Mesh(
        new THREE.PlaneGeometry(CARD_W, CARD_H),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 })
      );
      front.position.z = CARD_T / 2;

      const back = new THREE.Mesh(
        new THREE.PlaneGeometry(CARD_W, CARD_H),
        new THREE.MeshStandardMaterial({ color: backColor, roughness: 0.55 })
      );
      back.position.z = -CARD_T / 2;
      back.rotation.y = Math.PI;

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(CARD_W, CARD_H, CARD_T),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
      );

      // lay flat on table
      g.rotation.x = -Math.PI / 2;

      g.add(body, front, back);
      return g;
    }

    // ---------- DECK ----------
    function buildDeck() {
      const suits = ["S","H","D","C"];
      const ranks = ["A","2","3","4","5","6","7","8","9","T","J","Q","K"];
      const d = [];
      for (const s of suits) for (const r of ranks) d.push(r + s);
      for (let i = d.length - 1; i > 0; i--) {
        const j = randInt(i + 1);
        [d[i], d[j]] = [d[j], d[i]];
      }
      state.deck = d;
      state.deckIndex = 0;
    }
    function drawCardId() {
      if (state.deckIndex >= state.deck.length) return null;
      return state.deck[state.deckIndex++];
    }

    // ---------- TARGETS ----------
    function seatCardTarget(seatIndex, cardIndex) {
      const s = seats[seatIndex];
      const y = TABLE_Y + 0.020;

      if (!s) {
        const a = (seatIndex / 6) * Math.PI * 2;
        const p = new THREE.Vector3(
          focus.x + Math.cos(a) * 3.05,
          0,
          focus.z + Math.sin(a) * 3.05
        );
        const inward = new THREE.Vector3(focus.x - p.x, 0, focus.z - p.z).normalize().multiplyScalar(0.55);
        const base = p.clone().add(inward);
        base.y = y;
        base.x += (cardIndex === 0 ? -0.05 : 0.05);
        return base;
      }

      const base = s.position.clone();
      const inward = new THREE.Vector3(focus.x - base.x, 0, focus.z - base.z).normalize().multiplyScalar(0.55);
      const tpos = base.clone().add(inward);
      tpos.y = y;

      const side = new THREE.Vector3().crossVectors(inward, new THREE.Vector3(0, 1, 0)).normalize();
      tpos.add(side.multiplyScalar(cardIndex === 0 ? -0.055 : 0.055));
      return tpos;
    }

    function communityTarget(i) {
      return comm[Math.max(0, Math.min(comm.length - 1, i))].clone();
    }

    // ---------- POT VISUAL (CENTER + CLEAR) ----------
    function buildPot() {
      const g = new THREE.Group();
      g.name = "PotChips";
      g.position.set(focus.x, TABLE_Y + 0.020, focus.z - 0.08);

      const chipGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.006, 18);
      const chipMat = new THREE.MeshStandardMaterial({
        color: 0xff2d7a,
        roughness: 0.35,
        metalness: 0.1,
        emissive: 0x220010,
        emissiveIntensity: 0.45
      });

      for (let i = 0; i < 30; i++) {
        const chip = new THREE.Mesh(chipGeo, chipMat);
        chip.rotation.x = Math.PI / 2;
        chip.position.set((Math.random() - 0.5) * 0.06, 0.004 + i * 0.0042, (Math.random() - 0.5) * 0.06);
        chip.scale.setScalar(0.001);
        chip.userData.idx = i;
        g.add(chip);
      }

      parent.add(g);
      return g;
    }

    function setPotCount(n) {
      state.potCount = Math.max(0, Math.min(30, n | 0));
      if (!state.potGroup) return;
      for (const chip of state.potGroup.children) {
        chip.scale.setScalar(chip.userData.idx < state.potCount ? 1.0 : 0.001);
      }
      try { hooks.onPot?.(state.potCount); } catch {}
    }

    // ---------- DECK STACK PROP (ON TABLE, CENTERED) ----------
    const deckStack = new THREE.Group();
    deckStack.name = "DeckStack";
    deckStack.position.copy(deckPos);
    parent.add(deckStack);

    const backColors = [0x2b7cff, 0x6bff8f, 0xffcc00, 0xff6b6b, 0xffffff];
    for (let i = 0; i < 10; i++) {
      const c = makeCardMesh(backColors[i % backColors.length]);
      c.position.set(0, i * 0.0016, 0);
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

        parent.add(card);
        state.active.push(card);

        const to = seatCardTarget(seatIndex, cardIndex);
        enqueueMove(card, deckPos, to, 0.22, () => {
          try { hooks.onHoleCard?.(seatIndex, cardIndex, card, id); } catch {}
          setPotCount(state.potCount + 1);
        });
      });
    }

    function burnOne(delay = 0) {
      schedule(delay, () => {
        const id = drawCardId();
        if (!id) return;

        const card = makeCardMesh(0x1b1c26);
        card.userData.id = id;
        card.position.copy(deckPos);

        parent.add(card);
        state.active.push(card);

        enqueueMove(card, deckPos, burnPos, 0.18);
        schedule(0.50, () => { try { parent.remove(card); } catch {} });
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

          parent.add(card);
          state.active.push(card);

          const ci = startIndex + i;
          const to = communityTarget(ci);
          enqueueMove(card, deckPos, to, 0.24, () => {
            try { hooks.onCommunity?.(ci, card, id); } catch {}
            setPotCount(state.potCount + 2);
          });
        });
      }
    }

    function startHand() {
      clearAll();
      buildDeck();

      state.potGroup = buildPot();
      setPotCount(0);

      state.t = 0;
      state.phase = "dealing";
      L("[DealingMix] startHand ✅");
      try { hooks.onHandStart?.(); } catch {}

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

      schedule(t + 5.2, () => {
        state.phase = "done";
        const winnerSeat = Math.floor(Math.random() * 6);
        try { hooks.onHandEnd?.(winnerSeat); } catch {}
        L("[DealingMix] hand complete ✅ winnerSeat=" + winnerSeat);
      });

      schedule(t + 7.0, () => startHand());
    }

    // ---------- UPDATE ----------
    function update(dt) {
      state.t += dt;

      if (state.timers.length) {
        state.timers.sort((a, b) => a.at - b.at);
        while (state.timers.length && state.timers[0].at <= state.t) {
          const it = state.timers.shift();
          try { it.fn(); } catch (e) { L("[DealingMix] timer error:", e?.message || e); }
        }
      }

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

        // tiny hover
        m.obj.position.y += Math.sin(state.t * 10.0 + m.t * 20.0) * 0.0012;

        if (tt >= 1) {
          state.queue.shift();
          try { m.onDone?.(); } catch {}
        }
      }

      if (state.potGroup) {
        const ps = 1.0 + Math.sin(state.t * 2.8) * 0.03;
        state.potGroup.scale.setScalar(ps);
      }
    }

    return {
      startHand,
      update,
      clear: clearAll,
      ...hooks
    };
  }
};
