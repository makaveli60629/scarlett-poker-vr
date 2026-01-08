// /js/dealingMix.js — Scarlett Poker VR DealingMix v1.2
// - TRUE 52-card deck, no duplicates
// - Hole cards: 2x bigger
// - Community cards: 4x bigger
// - Uses world anchors (table-centered, not behind table)
// - Updates TableHud with pot/turn/street

export const DealingMix = {
  init({ THREE, scene, log = console.log, world }) {
    const L = (...a) => { try { log(...a); } catch { console.log(...a); } };

    const table = world?.table || world?.group || scene;
    const seats = world?.seats || [];
    const focus = world?.tableFocus || new THREE.Vector3(0, 0, -6);

    // Anchors from world.js
    const dealerAnchor = world?.anchors?.dealer || null;
    const communityAnchor = world?.anchors?.community || null;

    // ---------- SIZES ----------
    // base card
    const BASE_W = 0.10;
    const BASE_H = 0.14;
    const BASE_T = 0.002;

    // requested scaling
    const HOLE_SCALE = 2.0;      // 2x
    const COMM_SCALE = 4.0;      // 4x

    // ---------- STATE ----------
    const state = {
      t: 0,
      deck: [],
      di: 0,
      queue: [],
      timers: [],
      active: [],
      pot: 15000,
      street: "Preflop",
      turn: "LUNA",
      running: true,
    };

    // ---------- UTIL ----------
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    function schedule(delay, fn) {
      state.timers.push({ at: state.t + Math.max(0, delay), fn });
    }

    function enqueueMove(obj, from, to, dur = 0.28, onDone = null) {
      state.queue.push({ obj, from: from.clone(), to: to.clone(), dur: Math.max(0.12, dur), t: 0, onDone });
    }

    function clearAll() {
      for (const o of state.active) { try { o.parent?.remove(o); } catch {} }
      state.active.length = 0;
      state.queue.length = 0;
      state.timers.length = 0;
      state.deck.length = 0;
      state.di = 0;
    }

    // ---------- CARD TEXTURE ----------
    function cardFaceTexture(rank, suit) {
      const c = document.createElement("canvas");
      c.width = 512; c.height = 768;
      const ctx = c.getContext("2d");

      ctx.fillStyle = "#f8f8f8";
      ctx.fillRect(0, 0, c.width, c.height);

      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 10;
      ctx.strokeRect(14, 14, c.width - 28, c.height - 28);

      const red = (suit === "♥" || suit === "♦");
      ctx.fillStyle = red ? "#b6001b" : "#12131a";

      ctx.font = "bold 110px Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(rank, 40, 36);
      ctx.font = "bold 120px Arial";
      ctx.fillText(suit, 40, 150);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 320px Arial";
      ctx.fillText(suit, c.width / 2, c.height / 2 + 20);

      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.font = "bold 110px Arial";
      ctx.fillText(rank, c.width - 40, c.height - 150);
      ctx.font = "bold 120px Arial";
      ctx.fillText(suit, c.width - 40, c.height - 36);

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    }

    function makeCardMesh({ rank, suit, scale = 1.0 } = {}) {
      const g = new THREE.Group();
      g.name = "Card";

      const w = BASE_W * scale;
      const h = BASE_H * scale;

      const geo = new THREE.PlaneGeometry(w, h);

      const faceMat = new THREE.MeshStandardMaterial({
        map: cardFaceTexture(rank, suit),
        roughness: 0.5,
        metalness: 0.0,
        side: THREE.DoubleSide
      });

      const backMat = new THREE.MeshStandardMaterial({
        color: 0xff2d7a,
        emissive: 0x220010,
        emissiveIntensity: 0.35,
        roughness: 0.55,
        side: THREE.DoubleSide
      });

      const face = new THREE.Mesh(geo, faceMat);
      const back = new THREE.Mesh(geo, backMat);

      face.position.z = BASE_T * 0.6;
      back.position.z = -BASE_T * 0.6;
      back.rotation.y = Math.PI;

      // lay flat (we'll billboard when needed)
      g.rotation.x = -Math.PI / 2;

      g.add(face, back);
      g.userData.rank = rank;
      g.userData.suit = suit;
      return g;
    }

    // ---------- DECK ----------
    function buildDeck() {
      const suits = ["♠", "♥", "♦", "♣"];
      const ranks = ["A","2","3","4","5","6","7","8","9","T","J","Q","K"];
      const deck = [];
      for (const s of suits) for (const r of ranks) deck.push({ r, s });

      // Fisher-Yates
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      state.deck = deck;
      state.di = 0;
    }

    function draw() {
      if (state.di >= state.deck.length) return null;
      return state.deck[state.di++];
    }

    // ---------- POSITIONS ----------
    function dealerDeckPos() {
      if (dealerAnchor) {
        const p = new THREE.Vector3();
        dealerAnchor.getWorldPosition(p);
        return p;
      }
      return new THREE.Vector3(focus.x + 0.9, 1.0, focus.z + 0.2);
    }

    function seatTarget(seatIndex, cardIndex) {
      const s = seats[seatIndex];
      const base = s ? s.position.clone() : new THREE.Vector3(focus.x, 1.0, focus.z);

      // Put hole cards above head (requested earlier), but readable
      const p = base.clone();
      p.y = 1.95;

      // spread sideways a bit
      p.x += (cardIndex === 0 ? -0.18 : 0.18);
      return p;
    }

    function communityTarget(i) {
      // Float above table center, big
      const p = new THREE.Vector3();
      if (communityAnchor) {
        communityAnchor.getWorldPosition(p);
      } else {
        p.set(focus.x, 1.35, focus.z);
      }
      p.x += (-1.35 + i * 0.68);
      return p;
    }

    // ---------- HUD UPDATES ----------
    function pushHud(actionText) {
      world?.tableHud?.setGameState?.({
        pot: state.pot,
        street: state.street,
        turnName: state.turn,
        action: actionText
      });
    }

    // ---------- ACTIONS ----------
    function dealHole(seatIndex, cardIndex, delay) {
      schedule(delay, () => {
        const cs = draw();
        if (!cs) return;

        const from = dealerDeckPos();
        const card = makeCardMesh({ rank: cs.r, suit: cs.s, scale: HOLE_SCALE });
        card.position.copy(from);

        table.add(card);
        state.active.push(card);

        const to = seatTarget(seatIndex, cardIndex);
        enqueueMove(card, from, to, 0.30);
      });
    }

    function dealCommunity(count, startIndex, delay) {
      for (let i = 0; i < count; i++) {
        schedule(delay + i * 0.25, () => {
          const cs = draw();
          if (!cs) return;

          const from = dealerDeckPos();
          const card = makeCardMesh({ rank: cs.r, suit: cs.s, scale: COMM_SCALE });
          card.position.copy(from);

          table.add(card);
          state.active.push(card);

          const to = communityTarget(startIndex + i);
          enqueueMove(card, from, to, 0.34);
        });
      }
    }

    function startHand() {
      clearAll();
      buildDeck();

      state.street = "Preflop";
      state.turn = "LUNA";
      state.pot = 15000;

      pushHud("Dealing…");

      // hole cards to seats 1..5 only (table bots), seat 0 reserved for player join later
      let t = 0.2;
      for (let round = 0; round < 2; round++) {
        for (let s = 1; s < 6; s++) {
          dealHole(s, round, t);
          t += 0.12;
        }
      }

      schedule(t + 0.8, () => { state.street = "Flop"; pushHud("Flop"); });
      dealCommunity(3, 0, t + 1.0);

      schedule(t + 2.8, () => { state.street = "Turn"; pushHud("Turn"); });
      dealCommunity(1, 3, t + 3.0);

      schedule(t + 4.2, () => { state.street = "River"; pushHud("River"); });
      dealCommunity(1, 4, t + 4.4);

      schedule(t + 6.0, () => { pushHud("Action: betting…"); });
    }

    // ---------- UPDATE ----------
    function update(dt) {
      state.t += dt;

      if (state.timers.length) {
        state.timers.sort((a, b) => a.at - b.at);
        while (state.timers.length && state.timers[0].at <= state.t) {
          const it = state.timers.shift();
          try { it.fn(); } catch (e) { L("[DealingMix] timer err:", e?.message || e); }
        }
      }

      if (state.queue.length) {
        const m = state.queue[0];
        m.t += dt;
        const tt = clamp(m.t / m.dur, 0, 1);
        const e = easeOutCubic(tt);

        m.obj.position.set(
          m.from.x + (m.to.x - m.from.x) * e,
          m.from.y + (m.to.y - m.from.y) * e,
          m.from.z + (m.to.z - m.from.z) * e
        );

        // hover wobble at destination
        if (tt >= 1) {
          state.queue.shift();
          try { m.onDone?.(); } catch {}
        }
      }

      // keep all cards facing player (so readable)
      // (billboard around Y only)
      const cam = scene?.userData?.cameraRef || null;
      if (cam) {
        for (const c of state.active) {
          c.lookAt(cam.position.x, c.position.y, cam.position.z);
        }
      }
    }

    // Save camera ref so dealing can billboard
    scene.userData.cameraRef = scene.userData.cameraRef || null;

    return { startHand, update, clear: clearAll };
  }
};
