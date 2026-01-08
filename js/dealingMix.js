// /js/dealingMix.js — Scarlett Poker VR DealingMix v1.2 (FIX ALIGNMENT + UNIQUE CARDS + HOVER)
// Key fixes:
// - Uses TABLE-LOCAL coordinates when parenting cards to world.table (prevents "game behind table")
// - Generates unique 52-card deck and creates face textures (rank/suit)
// - Community cards hover ABOVE table and face the player
// - Hole cards go ABOVE SEATED BOTS' HEADS (not duplicated in bots.js)

export const DealingMix = {
  init({ THREE, scene, log = console.log, world }) {
    const L = (...a) => { try { log(...a); } catch { console.log(...a); } };

    const table = world?.table || world?.group || scene;
    const seats = world?.seats || [];
    const tableY = world?.metrics?.tableY ?? 0.92;

    // Local table origin is (0,0,0) inside world.table.
    // So ALL card/chip positions here are LOCAL to the table group.
    const FOCUS = new THREE.Vector3(0, 0, 0);

    // Card sizing (VR-friendly) — slightly bigger than before, but not huge
    const CARD_W = 0.10;
    const CARD_H = 0.14;
    const CARD_T = 0.002;

    // Local positions on table
    const deckPos = new THREE.Vector3(0.78, tableY + 0.10, 0.22);
    const burnPos = new THREE.Vector3(0.52, tableY + 0.10, 0.22);

    const comm = [
      new THREE.Vector3(-0.40, tableY + 0.18, 0.02),
      new THREE.Vector3(-0.20, tableY + 0.18, 0.02),
      new THREE.Vector3( 0.00, tableY + 0.18, 0.02),
      new THREE.Vector3( 0.20, tableY + 0.18, 0.02),
      new THREE.Vector3( 0.40, tableY + 0.18, 0.02),
    ];

    // State
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

    function enqueueMove(obj, from, to, dur = 0.22, onDone = null) {
      state.queue.push({ obj, from: from.clone(), to: to.clone(), dur: Math.max(0.12, dur), t: 0, onDone });
    }

    // --------- CARD FACE TEXTURE ----------
    function cardFaceTexture(rank, suit) {
      const c = document.createElement("canvas");
      c.width = 256; c.height = 356;
      const ctx = c.getContext("2d");

      ctx.fillStyle = "#f8f8f8";
      ctx.fillRect(0, 0, c.width, c.height);

      ctx.strokeStyle = "rgba(0,0,0,0.22)";
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
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      return tex;
    }

    const backMat = new THREE.MeshStandardMaterial({
      color: 0xff2d7a,
      roughness: 0.55,
      emissive: 0x220010,
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide
    });

    function makeCardMesh(rank, suit) {
      const g = new THREE.Group();
      g.name = "Card";

      const faceTex = cardFaceTexture(rank, suit);
      const faceMat = new THREE.MeshStandardMaterial({
        map: faceTex,
        roughness: 0.55,
        emissive: 0x111111,
        emissiveIntensity: 0.18,
        side: THREE.DoubleSide
      });

      const geo = new THREE.PlaneGeometry(CARD_W, CARD_H);

      const face = new THREE.Mesh(geo, faceMat);
      face.position.z = 0.001;

      const back = new THREE.Mesh(geo, backMat);
      back.position.z = -0.001;
      back.rotation.y = Math.PI;

      // card is a billboard-ish plane; lay it "upright" by default (we will orient per-target)
      g.add(face, back);
      g.userData.rank = rank;
      g.userData.suit = suit;

      return g;
    }

    // --------- DECK ----------
    const suits = ["S", "H", "D", "C"];
    const ranks = ["A","2","3","4","5","6","7","8","9","T","J","Q","K"];
    const suitGlyph = { S:"♠", H:"♥", D:"♦", C:"♣" };

    function buildDeck() {
      const deck = [];
      for (const s of suits) for (const r of ranks) deck.push(r + s);

      // Fisher-Yates shuffle
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

    function parseCard(id) {
      const r = id[0];
      const s = id[1];
      return { rank: r, suit: suitGlyph[s] || "♠" };
    }

    // --------- TARGET POSITIONS ----------
    function seatHeadTarget(seatIndex, cardIndex) {
      const s = seats[seatIndex];
      const a = (seatIndex / 6) * Math.PI * 2;

      // If seat exists, convert world position to table-local by subtracting table world pos
      let headWorld = null;
      if (s?.position) {
        headWorld = s.position.clone();
      } else {
        // fallback ring around tableFocus (world coords)
        headWorld = new THREE.Vector3(Math.cos(a) * 3.05, 0, Math.sin(a) * 3.05);
        // this fallback is already LOCAL if we assume centered, but keep safe
      }

      // Raise above head (in world), then convert to local
      headWorld.y = (s?.position?.y ?? 0.52) + 1.25;

      const headLocal = headWorld.clone();
      try {
        // table is a Group in world space; convert to local
        table.worldToLocal(headLocal);
      } catch {}

      // spread two cards slightly
      headLocal.x += (cardIndex === 0 ? -0.11 : 0.11);
      headLocal.y += (cardIndex === 0 ? 0.03 : 0.00);

      return headLocal;
    }

    function communityTarget(i) {
      return comm[Math.max(0, Math.min(comm.length - 1, i))].clone();
    }

    // --------- DEAL ACTIONS ----------
    function dealHoleToSeat(seatIndex, cardIndex, delay = 0) {
      schedule(delay, () => {
        const id = drawCardId();
        if (!id) return;

        const { rank, suit } = parseCard(id);
        const card = makeCardMesh(rank, suit);
        card.userData.id = id;

        // start at deckPos (LOCAL)
        card.position.copy(deckPos);
        card.rotation.set(0, 0, 0);

        table.add(card);
        state.activeCards.push(card);

        const to = seatHeadTarget(seatIndex, cardIndex);

        enqueueMove(card, deckPos, to, 0.20, () => {
          // Face the player after landing (billboard-ish)
          card.userData.billboard = true;
        });
      });
    }

    function burnOne(delay = 0) {
      schedule(delay, () => {
        const id = drawCardId();
        if (!id) return;

        const { rank, suit } = parseCard(id);
        const card = makeCardMesh(rank, suit);
        card.userData.id = id;

        card.position.copy(deckPos);
        table.add(card);
        state.activeCards.push(card);

        enqueueMove(card, deckPos, burnPos, 0.16, () => {
          schedule(0.35, () => { try { table.remove(card); } catch {} });
        });
      });
    }

    function dealCommunity(count, startIndex, delay = 0) {
      for (let i = 0; i < count; i++) {
        schedule(delay + i * 0.18, () => {
          const id = drawCardId();
          if (!id) return;

          const { rank, suit } = parseCard(id);
          const card = makeCardMesh(rank, suit);
          card.userData.id = id;

          card.position.copy(deckPos);
          table.add(card);
          state.activeCards.push(card);

          const to = communityTarget(startIndex + i);
          enqueueMove(card, deckPos, to, 0.22, () => {
            card.userData.billboard = true;
          });
        });
      }
    }

    function startHand() {
      clearAll();
      buildDeck();

      state.t = 0;
      state.phase = "dealing";
      L("[DealingMix] startHand ✅");

      // Pre-flop: 2 rounds to 6 seats (seats 0..5)
      let t = 0.18;
      for (let round = 0; round < 2; round++) {
        for (let s = 0; s < 6; s++) {
          dealHoleToSeat(s, round, t);
          t += 0.10;
        }
      }

      // Flop / Turn / River
      burnOne(t + 0.35);
      dealCommunity(3, 0, t + 0.55);

      burnOne(t + 2.00);
      dealCommunity(1, 3, t + 2.20);

      burnOne(t + 3.35);
      dealCommunity(1, 4, t + 3.55);

      schedule(t + 5.1, () => {
        state.phase = "done";
        L("[DealingMix] hand complete ✅");
        // loop hands for now
        schedule(2.0, () => startHand());
      });
    }

    // Billboard cards to the camera (so you can read them)
    const tmpV = new THREE.Vector3();
    function facePlayer(card) {
      if (!card) return;
      // Use camera world pos; convert to table local for stable lookAt in local space
      try {
        camera.getWorldPosition(tmpV);
        const local = tmpV.clone();
        table.worldToLocal(local);
        card.lookAt(local.x, card.position.y, local.z);
      } catch {}
    }

    // Update
    function update(dt) {
      state.t += dt;

      // run scheduled actions
      if (state.timers.length) {
        state.timers.sort((a, b) => a.at - b.at);
        while (state.timers.length && state.timers[0].at <= state.t) {
          const it = state.timers.shift();
          try { it.fn(); } catch (e) { L("[DealingMix] timer error:", e?.message || e); }
        }
      }

      // animate one queued move at a time
      if (state.queue.length) {
        const m = state.queue[0];
        m.t += dt;
        const t = clamp(m.t / m.dur, 0, 1);
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

      // hover + billboard
      for (const c of state.activeCards) {
        if (!c?.userData?.billboard) continue;
        c.position.y += Math.sin(state.t * 2.1 + (c.position.x * 3.0)) * 0.0008;
        facePlayer(c);
      }
    }

    return { startHand, update, clear: clearAll };
  }
};
