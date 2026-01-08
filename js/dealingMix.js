// /js/dealingMix.js — Scarlett Poker VR DealingMix v1.4 (Anchored + Hover)
// - Uses world.anchors.* (no more "game behind table")
// - Community cards hover
// - True 52-card deck, no duplicates
// - Updates TableHud (pot/street/turn/action)

export const DealingMix = {
  init({ THREE, scene, log = console.log, world }) {
    const L = (...a) => { try { log(...a); } catch { console.log(...a); } };

    const table = world?.table || world?.group || scene;
    const seats = world?.seats || [];

    const dealerA = world?.anchors?.dealer;
    const commA = world?.anchors?.community;

    // base sizing, you asked:
    // hole cards 2x, community 4x
    const BASE_W = 0.10, BASE_H = 0.14;
    const HOLE_SCALE = 2.0;
    const COMM_SCALE = 4.0;

    const state = {
      t: 0,
      deck: [],
      di: 0,
      active: [],
      queue: [],
      timers: [],
      street: "Preflop",
      pot: 15000,
      turn: "LUNA",
      running: true
    };

    const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
    const easeOut = (t)=>1-Math.pow(1-t,3);

    function schedule(delay, fn) {
      state.timers.push({ at: state.t + Math.max(0, delay), fn });
    }

    function enqueueMove(obj, from, to, dur = 0.32, onDone = null) {
      state.queue.push({ obj, from: from.clone(), to: to.clone(), dur: Math.max(0.14, dur), t: 0, onDone });
    }

    function clearAll() {
      for (const o of state.active) { try { o.parent?.remove(o); } catch {} }
      state.active.length = 0;
      state.queue.length = 0;
      state.timers.length = 0;
      state.deck.length = 0;
      state.di = 0;
    }

    function buildDeck() {
      const suits = ["♠","♥","♦","♣"];
      const ranks = ["A","2","3","4","5","6","7","8","9","T","J","Q","K"];
      const deck = [];
      for (const s of suits) for (const r of ranks) deck.push({ r, s });
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

    function cardFaceTexture(rank, suit) {
      const c = document.createElement("canvas");
      c.width = 512; c.height = 768;
      const ctx = c.getContext("2d");

      ctx.fillStyle = "#f8f8f8";
      ctx.fillRect(0,0,c.width,c.height);

      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = 10;
      ctx.strokeRect(14,14,c.width-28,c.height-28);

      const red = (suit==="♥"||suit==="♦");
      ctx.fillStyle = red ? "#b6001b" : "#12131a";

      ctx.textAlign="left"; ctx.textBaseline="top";
      ctx.font="bold 110px Arial";
      ctx.fillText(rank, 40, 36);
      ctx.font="bold 120px Arial";
      ctx.fillText(suit, 40, 150);

      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.font="bold 320px Arial";
      ctx.fillText(suit, c.width/2, c.height/2 + 20);

      ctx.textAlign="right"; ctx.textBaseline="bottom";
      ctx.font="bold 110px Arial";
      ctx.fillText(rank, c.width-40, c.height-150);
      ctx.font="bold 120px Arial";
      ctx.fillText(suit, c.width-40, c.height-36);

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    }

    function makeCard({ r, s, scale }) {
      const g = new THREE.Group();
      g.name = "Card";
      const w = BASE_W * scale, h = BASE_H * scale;

      const geo = new THREE.PlaneGeometry(w, h);

      const faceMat = new THREE.MeshStandardMaterial({
        map: cardFaceTexture(r, s),
        roughness: 0.5,
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
      face.position.z = 0.002;
      back.position.z = -0.002;
      back.rotation.y = Math.PI;

      g.rotation.x = -Math.PI / 2;
      g.add(face, back);

      return g;
    }

    function dealerPosWorld() {
      const p = new THREE.Vector3();
      if (dealerA) dealerA.getWorldPosition(p);
      else p.set(0.9, 1.0, -6.3);
      return p;
    }

    function communityPosWorld(i) {
      const p = new THREE.Vector3();
      if (commA) commA.getWorldPosition(p);
      else p.set(0, 1.9, -6.5);
      p.x += (-1.35 + i * 0.68);
      return p;
    }

    function seatTargetWorld(seatIndex, cardIndex) {
      const s = seats[seatIndex];
      const p = s ? s.position.clone() : new THREE.Vector3(0, 1.5, -6.5);
      p.y = 2.05;
      p.x += (cardIndex === 0 ? -0.22 : 0.22);
      return p;
    }

    function pushHud(actionText) {
      try {
        world?.tableHud?.setGameState?.({
          pot: state.pot,
          street: state.street,
          turnName: state.turn,
          action: actionText
        });
      } catch {}
    }

    function dealHole(seatIndex, cardIndex, delay) {
      schedule(delay, () => {
        const cs = draw(); if (!cs) return;
        const from = dealerPosWorld();
        const card = makeCard({ ...cs, scale: HOLE_SCALE });
        card.position.copy(from);
        table.add(card);
        state.active.push(card);

        const to = seatTargetWorld(seatIndex, cardIndex);
        enqueueMove(card, from, to, 0.34);
      });
    }

    function dealCommunity(count, startIndex, delay) {
      for (let i = 0; i < count; i++) {
        schedule(delay + i * 0.26, () => {
          const cs = draw(); if (!cs) return;
          const from = dealerPosWorld();
          const card = makeCard({ ...cs, scale: COMM_SCALE });
          card.position.copy(from);
          table.add(card);
          state.active.push(card);

          const to = communityPosWorld(startIndex + i);
          enqueueMove(card, from, to, 0.38);
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

      // seats 1..5 are bots, seat 0 reserved for you later
      let t = 0.25;
      for (let round = 0; round < 2; round++) {
        for (let s = 1; s < 6; s++) {
          dealHole(s, round, t);
          t += 0.14;
        }
      }

      schedule(t + 0.9, () => { state.street = "Flop"; pushHud("Flop"); });
      dealCommunity(3, 0, t + 1.05);

      schedule(t + 3.0, () => { state.street = "Turn"; pushHud("Turn"); });
      dealCommunity(1, 3, t + 3.2);

      schedule(t + 4.4, () => { state.street = "River"; pushHud("River"); });
      dealCommunity(1, 4, t + 4.6);

      schedule(t + 6.2, () => pushHud("Action: betting…"));
    }

    function update(dt) {
      state.t += dt;

      if (state.timers.length) {
        state.timers.sort((a,b)=>a.at-b.at);
        while (state.timers.length && state.timers[0].at <= state.t) {
          const it = state.timers.shift();
          try { it.fn(); } catch {}
        }
      }

      if (state.queue.length) {
        const m = state.queue[0];
        m.t += dt;
        const tt = clamp(m.t / m.dur, 0, 1);
        const e = easeOut(tt);

        m.obj.position.set(
          m.from.x + (m.to.x - m.from.x) * e,
          m.from.y + (m.to.y - m.from.y) * e,
          m.from.z + (m.to.z - m.from.z) * e
        );

        if (tt >= 1) state.queue.shift();
      }

      // Hover community cards gently + face camera
      const cam = scene.userData.cameraRef;
      if (cam) {
        for (const c of state.active) {
          const isCommunity = c.position.y > 2.3; // quick heuristic (community is high)
          if (isCommunity) c.position.y += Math.sin(state.t * 1.6 + c.position.x) * 0.0015;
          c.lookAt(cam.position.x, c.position.y, cam.position.z);
        }
      }
    }

    L("[DealingMix] ready ✅");
    return { startHand, update, clear: clearAll };
  }
};
