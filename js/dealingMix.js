// /js/dealingMix.js — Scarlett Poker VR DealingMix v1.1
// Adds:
// - size scaling via init({ scale:{hole,community}, lift:{table,communityHover} })
// - lifts cards above felt (no under-table clipping)
// - strict single shuffled 52-deck (no duplicates)

export const DealingMix = {
  init({ THREE, scene, log = console.log, world, scale = {}, lift = {} }) {
    const L = (...a) => { try { log(...a); } catch { console.log(...a); } };

    const table = world?.table || world?.group || scene;
    const focus = world?.tableFocus || new THREE.Vector3(0, 0, -6.5);
    const seats = world?.seats || [];

    const HOLE_SCALE = Number(scale.hole || 1.0);
    const COMM_SCALE = Number(scale.community || 1.0);

    const TABLE_LIFT = Number(lift.table || 0.03);
    const COMM_HOVER = Number(lift.communityHover || 0.18);

    // Base card size (then scaled)
    const BASE_W = 0.10;
    const BASE_H = 0.14;
    const CARD_T = 0.002;

    const TABLE_Y = (world?.metrics?.tableY ?? 0.92);
    const CARD_Y = TABLE_Y + TABLE_LIFT;

    // Deck and burn positions on the REAL table center
    const deckPos = new THREE.Vector3(focus.x + 0.55, CARD_Y + 0.01, focus.z + 0.20);
    const burnPos = new THREE.Vector3(focus.x + 0.36, CARD_Y + 0.01, focus.z + 0.20);

    const comm = [
      new THREE.Vector3(focus.x - 0.40, CARD_Y + COMM_HOVER, focus.z + 0.02),
      new THREE.Vector3(focus.x - 0.20, CARD_Y + COMM_HOVER, focus.z + 0.02),
      new THREE.Vector3(focus.x + 0.00, CARD_Y + COMM_HOVER, focus.z + 0.02),
      new THREE.Vector3(focus.x + 0.20, CARD_Y + COMM_HOVER, focus.z + 0.02),
      new THREE.Vector3(focus.x + 0.40, CARD_Y + COMM_HOVER, focus.z + 0.02),
    ];

    const state = {
      running: true,
      phase: "idle",
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
      state.queue.push({ obj, from: from.clone(), to: to.clone(), dur: Math.max(0.12, dur), t: 0, onDone });
    }

    function randInt(n) { return Math.floor(Math.random() * n); }

    // --- Card face texture (simple, readable) ---
    function cardFaceTexture(rank, suit) {
      const c = document.createElement("canvas");
      c.width = 256; c.height = 356;
      const ctx = c.getContext("2d");

      ctx.fillStyle = "#f8f8f8";
      ctx.fillRect(0, 0, c.width, c.height);

      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, c.width - 12, c.height - 12);

      const isRed = (suit === "♥" || suit === "♦");
      ctx.fillStyle = isRed ? "#b6001b" : "#111111";

      ctx.font = "bold 54px Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(rank, 18, 14);
      ctx.font = "bold 60px Arial";
      ctx.fillText(suit, 18, 64);

      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.font = "bold 54px Arial";
      ctx.fillText(rank, c.width - 18, c.height - 68);
      ctx.font = "bold 60px Arial";
      ctx.fillText(suit, c.width - 18, c.height - 14);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 140px Arial";
      ctx.fillText(suit, c.width / 2, c.height / 2 + 10);

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    }

    function makeCardMesh(rank = "A", suit = "♠", backColor = 0xff2d7a) {
      const g = new THREE.Group();
      g.name = "Card";

      const w = BASE_W, h = BASE_H;

      const faceMat = new THREE.MeshStandardMaterial({
        map: cardFaceTexture(rank, suit),
        roughness: 0.55,
        emissive: 0x111111,
        emissiveIntensity: 0.15,
        side: THREE.DoubleSide
      });

      const backMat = new THREE.MeshStandardMaterial({
        color: backColor,
        roughness: 0.55,
        emissive: 0x220010,
        emissiveIntensity: 0.25,
        side: THREE.DoubleSide
      });

      const geo = new THREE.PlaneGeometry(w, h);

      const face = new THREE.Mesh(geo, faceMat);
      const back = new THREE.Mesh(geo, backMat);
      face.position.y = 0.001;
      back.position.y = -0.001;
      back.rotation.y = Math.PI;

      // Lay flat: y-up world, so rotate around X to lie on table
      g.rotation.x = -Math.PI / 2;

      g.add(face, back);
      return g;
    }

    // ---------- DECK ----------
    const SUITS = ["♠", "♥", "♦", "♣"];
    const RANKS = ["A","2","3","4","5","6","7","8","9","T","J","Q","K"];

    function buildDeck() {
      const d = [];
      for (const s of SUITS) for (const r of RANKS) d.push({ r, s });
      for (let i = d.length - 1; i > 0; i--) {
        const j = randInt(i + 1);
        [d[i], d[j]] = [d[j], d[i]];
      }
      state.deck = d;
      state.deckIndex = 0;
    }

    function drawCard() {
      if (state.deckIndex >= state.deck.length) return null;
      return state.deck[state.deckIndex++];
    }

    // ---------- TARGETS ----------
    function seatCardTarget(seatIndex, cardIndex) {
      const s = seats[seatIndex];
      const a = (seatIndex / 6) * Math.PI * 2;

      let base;
      if (s?.position) {
        base = s.position.clone();
      } else {
        base = new THREE.Vector3(
          focus.x + Math.cos(a) * 3.05,
          0,
          focus.z + Math.sin(a) * 3.05
        );
      }

      // move inward toward table
      const inward = new THREE.Vector3(focus.x - base.x, 0, focus.z - base.z).normalize().multiplyScalar(0.55);
      const tpos = base.clone().add(inward);

      // on table surface
      tpos.y = CARD_Y;

      // spread hole cards sideways
      const side = new THREE.Vector3().crossVectors(inward, new THREE.Vector3(0, 1, 0)).normalize();
      tpos.add(side.multiplyScalar(cardIndex === 0 ? -0.06 : 0.06));

      return tpos;
    }

    function communityTarget(i) {
      return comm[Math.max(0, Math.min(comm.length - 1, i))].clone();
    }

    // ---------- VISUAL DECK STACK ----------
    const deckStack = new THREE.Group();
    deckStack.name = "DeckStack";
    deckStack.position.copy(deckPos);
    table.add(deckStack);

    for (let i = 0; i < 8; i++) {
      const c = makeCardMesh("A", "♠", 0x2b7cff);
      c.scale.setScalar(0.65);
      c.position.set(0, i * 0.0012, 0);
      deckStack.add(c);
    }

    // ---------- ACTIONS ----------
    function dealOneToSeat(seatIndex, cardIndex, delay = 0) {
      schedule(delay, () => {
        const cd = drawCard();
        if (!cd) return;

        const card = makeCardMesh(cd.r, cd.s, 0x2b7cff);
        card.position.copy(deckPos);

        // hole cards bigger (your request)
        card.scale.setScalar(HOLE_SCALE);

        table.add(card);
        state.activeCards.push(card);

        const to = seatCardTarget(seatIndex, cardIndex);
        enqueueMove(card, deckPos, to, 0.22);
      });
    }

    function burnOne(delay = 0) {
      schedule(delay, () => {
        const cd = drawCard();
        if (!cd) return;

        const card = makeCardMesh(cd.r, cd.s, 0x1b1c26);
        card.position.copy(deckPos);
        card.scale.setScalar(0.8);

        table.add(card);
        state.activeCards.push(card);

        enqueueMove(card, deckPos, burnPos, 0.18);
        schedule(0.45, () => { try { table.remove(card); } catch {} });
      });
    }

    function dealCommunity(count, startIndex, delay = 0) {
      for (let i = 0; i < count; i++) {
        schedule(delay + i * 0.18, () => {
          const cd = drawCard();
          if (!cd) return;

          const card = makeCardMesh(cd.r, cd.s, 0x9b59ff);
          card.position.copy(deckPos);

          // community cards even bigger + hover
          card.scale.setScalar(COMM_SCALE);

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

      let t = 0.15;

      // 6 seats, 2 cards each
      for (let round = 0; round < 2; round++) {
        for (let s = 0; s < 6; s++) {
          dealOneToSeat(s, round, t);
          t += 0.10;
        }
      }

      // Flop / Turn / River
      burnOne(t + 0.35);
      dealCommunity(3, 0, t + 0.55);

      burnOne(t + 2.10);
      dealCommunity(1, 3, t + 2.30);

      burnOne(t + 3.60);
      dealCommunity(1, 4, t + 3.80);

      schedule(t + 5.2, () => {
        state.phase = "done";
        L("[DealingMix] hand complete ✅");
      });
    }

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

    return { startHand, update, clear: clearAll };
  }
};
