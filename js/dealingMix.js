// /js/dealingMix.js — Scarlett Poker VR DealingMix v1.2
// - Real 52 card deck, no duplicates
// - Community cards hover higher + face player
// - Bigger cards for VR readability

export const DealingMix = {
  init({ THREE, scene, log = console.log, world }) {
    const L = (...a) => { try { log(...a); } catch { console.log(...a); } };

    const table = world?.table || world?.group || scene;
    const focus = world?.tableFocus || new THREE.Vector3(0, 0, -6.5);
    const seats = world?.seats || [];
    const TABLE_Y = (world?.table?.getObjectByName?.("TableFelt")?.position?.y) || 0.92;

    // Bigger / easier to see
    const CARD_W = 0.11;
    const CARD_H = 0.15;
    const CARD_T = 0.002;

    // centered on table, above felt
    const deckPos = new THREE.Vector3(focus.x + 0.75, TABLE_Y + 0.18, focus.z + 0.22);
    const burnPos = new THREE.Vector3(focus.x + 0.52, TABLE_Y + 0.18, focus.z + 0.22);

    // Hover line above table center (the “screen” view)
    const commCenter = new THREE.Vector3(focus.x, TABLE_Y + 0.42, focus.z + 0.02);

    // ---------- STATE ----------
    const state = {
      t: 0,
      deck: [],
      deckIndex: 0,
      activeCards: [],
      queue: [],
      timers: [],
      phase: "idle",
      running: true
    };

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

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
      state.phase = "idle";
    }

    function enqueueMove(obj, from, to, dur = 0.24, onDone = null) {
      state.queue.push({ obj, from: from.clone(), to: to.clone(), dur: Math.max(0.12, dur), t: 0, onDone });
    }

    // ---------- CARD FACE TEXTURE ----------
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

    function makeCardMesh(cardId) {
      const g = new THREE.Group();
      g.name = "Card";

      // parse
      const rank = cardId.slice(0, -1);
      const suitCode = cardId.slice(-1);
      const suit = ({ S:"♠", H:"♥", D:"♦", C:"♣" }[suitCode]) || "♠";

      const faceMat = new THREE.MeshStandardMaterial({
        map: cardFaceTexture(rank, suit),
        roughness: 0.55,
        emissive: 0x111111,
        emissiveIntensity: 0.20,
        side: THREE.DoubleSide
      });

      const backMat = new THREE.MeshStandardMaterial({
        color: 0xff2d7a,
        roughness: 0.55,
        emissive: 0x220010,
        emissiveIntensity: 0.40,
        side: THREE.DoubleSide
      });

      const plane = new THREE.PlaneGeometry(CARD_W, CARD_H);

      const face = new THREE.Mesh(plane, faceMat);
      const back = new THREE.Mesh(plane, backMat);

      face.position.z = CARD_T / 2;
      back.position.z = -CARD_T / 2;
      back.rotation.y = Math.PI;

      // billboard-friendly
      g.add(face, back);
      g.userData.id = cardId;

      return g;
    }

    // ---------- DECK LOGIC ----------
    function buildDeck() {
      const suits = ["S", "H", "D", "C"];
      const ranks = ["A","2","3","4","5","6","7","8","9","T","J","Q","K"];
      const deck = [];
      for (const s of suits) for (const r of ranks) deck.push(r + s);

      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      state.deck = deck;
      state.deckIndex = 0;
    }

    function drawCardId() {
      if (state.deckIndex >= state.deck.length) return null;
      return state.deck[state.deckIndex++];
    }

    function seatCardTarget(seatIndex, cardIndex) {
      const s = seats[seatIndex];
      const base = s ? s.position.clone() : new THREE.Vector3(focus.x, 0, focus.z);

      // ABOVE head height (as you requested)
      const y = 1.95;

      const inward = new THREE.Vector3(focus.x - base.x, 0, focus.z - base.z).normalize();
      const side = new THREE.Vector3().crossVectors(inward, new THREE.Vector3(0, 1, 0)).normalize();

      const p = base.clone().add(inward.multiplyScalar(0.15));
      p.y = y;
      p.add(side.multiplyScalar(cardIndex === 0 ? -0.13 : 0.13));
      return p;
    }

    function commTarget(i) {
      const p = commCenter.clone();
      p.x += (-0.34 + i * 0.17);
      // little hover wave
      p.y += 0.03;
      return p;
    }

    // ---------- ACTIONS ----------
    function dealOneToSeat(seatIndex, cardIndex, delay = 0) {
      schedule(delay, () => {
        const id = drawCardId();
        if (!id) return;

        const card = makeCardMesh(id);
        card.position.copy(deckPos);

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

        const card = makeCardMesh(id);
        card.position.copy(deckPos);

        table.add(card);
        state.activeCards.push(card);

        enqueueMove(card, deckPos, burnPos, 0.18);
        schedule(0.55, () => { try { table.remove(card); } catch {} });
      });
    }

    function dealCommunity(count, startIndex, delay = 0) {
      for (let i = 0; i < count; i++) {
        schedule(delay + i * 0.18, () => {
          const id = drawCardId();
          if (!id) return;

          const card = makeCardMesh(id);
          card.position.copy(deckPos);

          table.add(card);
          state.activeCards.push(card);

          const to = commTarget(startIndex + i);
          enqueueMove(card, deckPos, to, 0.24, () => {});
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

      // ONLY table seats (0..5). If you want seat0 reserved for player later,
      // keep it dealt for now so you can see it.
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
        L("[DealingMix] hand complete ✅");
      });
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

      // queued motion
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

        // face player (billboard-ish) once it arrives above-table / above-head
        if (tt > 0.8) {
          // face toward the spawn / general viewing direction
          m.obj.lookAt(focus.x, m.obj.position.y, focus.z + 8);
        }

        if (tt >= 1) {
          state.queue.shift();
          try { m.onDone?.(); } catch {}
        }
      }

      // hover community slightly
      for (const c of state.activeCards) {
        if (!c) continue;
        if (c.position.y > TABLE_Y + 0.28) {
          c.position.y += Math.sin(state.t * 2.2 + c.position.x) * 0.0008;
        }
      }
    }

    return { startHand, update, clear: clearAll };
  }
};
