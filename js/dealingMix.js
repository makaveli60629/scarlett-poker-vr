// /js/dealingMix.js — Scarlett VR Poker DealerMix / DealingMix v2.0 (FULL, EXPORT-SAFE)
// GitHub Pages safe ES module (NO "three" import). main.js passes THREE in.
//
// ✅ Exports BOTH shapes so main.js can never break:
//   - export const DealingMix
//   - export default DealingMix
//
// What it does (TEMP but solid):
// - Builds a real 52-card deck (no duplicates) and shuffles each hand
// - Deals 2 hole cards to 6 seats (visuals go to a small “seat card area” near each seat)
// - Deals community cards (flop/turn/river) HOVERING above the felt (and visible faces)
// - Keeps everything centered on world.tableFocus (NOT behind the table)
// - Dealer button moves seat-to-seat (step, not orbit)
// - Pot chips are flat on the table
// - Provides compatibility methods so old main.js calls won't crash:
//     setIncludePlayer(), setDealerSeat(), setEnabled(), startHand(), update(), clear()
//
// Notes:
// - If you want hole cards ABOVE heads instead, keep that in bots.js (cards attached to bots).
//   This file focuses on the TABLE visuals + dealing.

export const DealingMix = {
  init({ THREE, scene, log = console.log, world } = {}) {
    const L = (...a) => { try { log(...a); } catch { console.log(...a); } };

    // ---------- Resolve table + metrics ----------
    const tableRoot = world?.table || world?.group || scene;
    const focus = (world?.tableFocus?.clone?.() ? world.tableFocus.clone() : new THREE.Vector3(0, 0, -6.5));
    const seats = Array.isArray(world?.seats) ? world.seats : [];

    // Table height: prefer known felt Y from world.metrics/tableY; else fallback ~0.92
    const TABLE_Y =
      (world?.metrics?.tableY ?? world?.tableY ?? world?.TABLE_Y ?? 0.92);

    // Hover heights
    const COMMUNITY_Y = TABLE_Y + 0.22;   // hover above felt
    const HOLE_Y      = TABLE_Y + 0.10;   // near seat edge
    const CHIP_Y      = TABLE_Y + 0.015;  // chips sit on felt

    // Card size (you asked bigger; you can scale here)
    // "cards twice as big" and "community 4x big" -> we separate scales:
    const HOLE_SCALE = 1.8;
    const COMM_SCALE = 3.2;

    // Card geometry base
    const CARD_W = 0.11;
    const CARD_H = 0.155;
    const CARD_T = 0.003;

    // ---------- Internal state ----------
    const state = {
      enabled: true,
      includePlayer: false, // compatibility toggle
      running: false,
      t: 0,
      timers: [],
      moves: [],
      deck: [],
      di: 0,

      dealerSeat: 0,

      // objects
      root: new THREE.Group(),
      deckStack: new THREE.Group(),
      burnPile: new THREE.Group(),
      community: [],
      hole: Array.from({ length: 6 }, () => []),
      pot: new THREE.Group(),
      dealerBtn: null,
      hud: null
    };

    state.root.name = "DealingMixRoot";
    tableRoot.add(state.root);

    // ---------- Helpers ----------
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    function schedule(delay, fn) {
      state.timers.push({ at: state.t + Math.max(0, delay), fn });
    }

    function clearTimers() { state.timers.length = 0; }
    function clearMoves() { state.moves.length = 0; }

    function addMove(obj, fromPos, toPos, dur = 0.22, fromQuat = null, toQuat = null, onDone = null) {
      state.moves.push({
        obj,
        t: 0,
        dur: Math.max(0.10, dur),
        from: fromPos.clone(),
        to: toPos.clone(),
        fromQ: fromQuat ? fromQuat.clone() : null,
        toQ: toQuat ? toQuat.clone() : null,
        onDone
      });
    }

    // ---------- Card face textures (Canvas) ----------
    const faceTexCache = new Map(); // key: "AS" etc
    function suitSymbol(s) {
      if (s === "S") return "♠";
      if (s === "H") return "♥";
      if (s === "D") return "♦";
      return "♣";
    }
    function rankLabel(r) { return r; }

    function makeFaceTexture(rank, suit) {
      const key = `${rank}${suit}`;
      if (faceTexCache.has(key)) return faceTexCache.get(key);

      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 720;
      const ctx = c.getContext("2d");

      // background
      ctx.fillStyle = "#f8f8fb";
      ctx.fillRect(0, 0, c.width, c.height);

      // border
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = 12;
      ctx.strokeRect(12, 12, c.width - 24, c.height - 24);

      const sym = suitSymbol(suit);
      const red = (sym === "♥" || sym === "♦");
      const ink = red ? "#b30022" : "#121216";

      // corners
      ctx.fillStyle = ink;
      ctx.font = "bold 86px Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(rankLabel(rank), 36, 26);
      ctx.font = "bold 94px Arial";
      ctx.fillText(sym, 36, 122);

      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.font = "bold 86px Arial";
      ctx.fillText(rankLabel(rank), c.width - 36, c.height - 122);
      ctx.font = "bold 94px Arial";
      ctx.fillText(sym, c.width - 36, c.height - 26);

      // big center
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 260px Arial";
      ctx.fillText(sym, c.width / 2, c.height / 2 + 12);

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      try { tex.colorSpace = THREE.SRGBColorSpace; } catch {}
      faceTexCache.set(key, tex);
      return tex;
    }

    // ---------- Card mesh ----------
    function makeCardMesh(cardId, { faceUp = true, backColor = 0xff2d7a } = {}) {
      const g = new THREE.Group();
      g.name = "Card";
      g.userData.id = cardId;

      const rank = cardId[0];
      const suit = cardId[1];

      const frontMat = new THREE.MeshStandardMaterial({
        map: makeFaceTexture(rank, suit),
        roughness: 0.55,
        metalness: 0.0,
        side: THREE.DoubleSide
      });

      const backMat = new THREE.MeshStandardMaterial({
        color: backColor,
        roughness: 0.5,
        metalness: 0.05,
        emissive: 0x220010,
        emissiveIntensity: 0.25,
        side: THREE.DoubleSide
      });

      const face = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), frontMat);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), backMat);
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(CARD_W, CARD_H, CARD_T),
        new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 })
      );

      // orient as "table card" (flat)
      face.rotation.x = -Math.PI / 2;
      back.rotation.x = -Math.PI / 2;
      body.rotation.x = -Math.PI / 2;

      // separate planes slightly
      face.position.y = 0.0018;
      back.position.y = -0.0018;
      back.rotation.y = Math.PI;

      g.add(body, face, back);

      g.userData.setFaceUp = (yes) => {
        // simple: swap visibility
        face.visible = !!yes;
        back.visible = !yes;
      };
      g.userData.setFaceUp(faceUp);

      return g;
    }

    // ---------- Deck logic (real 52) ----------
    function buildDeck() {
      const suits = ["S", "H", "D", "C"];
      const ranks = ["A","2","3","4","5","6","7","8","9","T","J","Q","K"];
      const d = [];
      for (const s of suits) for (const r of ranks) d.push(r + s);

      // Fisher–Yates shuffle
      for (let i = d.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [d[i], d[j]] = [d[j], d[i]];
      }
      state.deck = d;
      state.di = 0;
    }

    function draw() {
      if (state.di >= state.deck.length) return null;
      return state.deck[state.di++];
    }

    // ---------- Positions (all relative to focus) ----------
    const deckPos = new THREE.Vector3(focus.x + 0.85, TABLE_Y + 0.06, focus.z + 0.45);
    const burnPos = new THREE.Vector3(focus.x + 0.60, TABLE_Y + 0.06, focus.z + 0.45);

    function seatAnchorPos(i) {
      const s = seats[i];
      if (s?.position) return s.position.clone();

      // fallback ring around focus
      const a = (i / 6) * Math.PI * 2;
      return new THREE.Vector3(
        focus.x + Math.cos(a) * 3.05,
        0,
        focus.z + Math.sin(a) * 3.05
      );
    }

    function holeTarget(seatIndex, cardIndex) {
      const base = seatAnchorPos(seatIndex);
      const inward = new THREE.Vector3(focus.x - base.x, 0, focus.z - base.z).normalize();

      // bring cards toward table edge
      const p = base.clone().add(inward.multiplyScalar(0.70));
      p.y = HOLE_Y;

      // spread sideways
      const side = new THREE.Vector3().crossVectors(inward, new THREE.Vector3(0, 1, 0)).normalize();
      p.add(side.multiplyScalar(cardIndex === 0 ? -0.075 : 0.075));
      return p;
    }

    const commSlots = [
      new THREE.Vector3(focus.x - 0.72, COMMUNITY_Y, focus.z + 0.05),
      new THREE.Vector3(focus.x - 0.36, COMMUNITY_Y, focus.z + 0.05),
      new THREE.Vector3(focus.x + 0.00, COMMUNITY_Y, focus.z + 0.05),
      new THREE.Vector3(focus.x + 0.36, COMMUNITY_Y, focus.z + 0.05),
      new THREE.Vector3(focus.x + 0.72, COMMUNITY_Y, focus.z + 0.05),
    ];

    // ---------- Build visible props ----------
    function buildDeckStack() {
      state.deckStack.name = "DeckStack";
      state.deckStack.position.copy(deckPos);
      state.root.add(state.deckStack);

      // a small stack of backs (pure visual)
      for (let i = 0; i < 12; i++) {
        const c = makeCardMesh("AS", { faceUp: false, backColor: 0xff2d7a });
        c.position.set(0, i * 0.0018, 0);
        c.scale.setScalar(0.55);
        state.deckStack.add(c);
      }
    }

    function buildBurn() {
      state.burnPile.name = "BurnPile";
      state.burnPile.position.copy(burnPos);
      state.root.add(state.burnPile);
    }

    function buildCommunitySlots() {
      for (let i = 0; i < 5; i++) {
        const placeholder = makeCardMesh("AS", { faceUp: false, backColor: 0x7fe7ff });
        placeholder.position.copy(commSlots[i]);
        placeholder.scale.setScalar(0.001); // start hidden
        placeholder.userData.slot = i;
        state.root.add(placeholder);
        state.community.push(placeholder);
      }
    }

    function buildPot() {
      state.pot.name = "PotChips";
      state.pot.position.set(focus.x, CHIP_Y, focus.z);
      state.root.add(state.pot);

      const chipMat = new THREE.MeshStandardMaterial({
        color: 0xff2d7a,
        roughness: 0.35,
        metalness: 0.08,
        emissive: 0x220010,
        emissiveIntensity: 0.15
      });

      const chipGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.012, 22);
      for (let i = 0; i < 22; i++) {
        const chip = new THREE.Mesh(chipGeo, chipMat);
        // FLAT (not standing)
        chip.rotation.x = 0;
        chip.position.set((Math.random() - 0.5) * 0.20, i * 0.010, (Math.random() - 0.5) * 0.20);
        state.pot.add(chip);
      }
    }

    function buildDealerButton() {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x7fe7ff,
        emissive: 0x2bd7ff,
        emissiveIntensity: 1.1,
        roughness: 0.25,
        metalness: 0.15
      });
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 28), mat);
      btn.name = "DealerButton";
      btn.rotation.x = 0; // flat
      btn.position.set(focus.x + 0.52, TABLE_Y + 0.02, focus.z - 0.22);
      state.root.add(btn);
      state.dealerBtn = btn;
    }

    function buildHUD() {
      // lightweight “table identifier tag” in 3D (face camera)
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");

      const tex = new THREE.CanvasTexture(canvas);
      try { tex.colorSpace = THREE.SRGBColorSpace; } catch {}

      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), mat);
      plane.name = "TableHUD";
      plane.position.set(focus.x, COMMUNITY_Y + 0.55, focus.z + 0.05);
      state.root.add(plane);

      state.hud = { plane, canvas, ctx, tex };

      function drawHUD({ tableName, pot, street, turnName, action }) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // bg
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        roundRect(ctx, 60, 70, 904, 372, 42, true);

        // title
        ctx.fillStyle = "#7fe7ff";
        ctx.font = "bold 62px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(tableName, 512, 105);

        // line
        ctx.strokeStyle = "rgba(255,255,255,0.10)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(120, 190);
        ctx.lineTo(904, 190);
        ctx.stroke();

        // info rows
        ctx.fillStyle = "#e8ecff";
        ctx.font = "bold 52px Arial";
        ctx.textBaseline = "top";
        ctx.fillText(`Pot: $${pot.toLocaleString()}`, 512, 215);

        ctx.fillStyle = "#ff2d7a";
        ctx.font = "bold 46px Arial";
        ctx.fillText(`${street} • Turn: ${turnName}`, 512, 285);

        ctx.fillStyle = "rgba(232,236,255,0.88)";
        ctx.font = "bold 42px Arial";
        ctx.fillText(action, 512, 345);

        tex.needsUpdate = true;
      }

      function roundRect(ctx, x, y, w, h, r, fill) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        if (fill) ctx.fill();
      }

      state.hud.drawHUD = drawHUD;
      state.hud.data = { tableName: "$10,000 Table", pot: 15000, street: "Preflop", turnName: "LUNA", action: "Dealing…" };
      drawHUD(state.hud.data);
    }

    // Build once
    buildDeckStack();
    buildBurn();
    buildCommunitySlots();
    buildPot();
    buildDealerButton();
    buildHUD();

    // ---------- Clear visuals ----------
    function clearVisuals() {
      // remove dealt hole cards
      for (let s = 0; s < state.hole.length; s++) {
        for (const c of state.hole[s]) {
          try { c.parent?.remove(c); } catch {}
        }
        state.hole[s].length = 0;
      }

      // reset community
      for (let i = 0; i < state.community.length; i++) {
        const card = state.community[i];
        card.userData.setFaceUp(false);
        card.scale.setScalar(0.001);
        card.position.copy(commSlots[i]);
      }

      // burn pile clear
      while (state.burnPile.children.length) state.burnPile.remove(state.burnPile.children[0]);

      // pot reset (keep chips but re-stack)
      for (const chip of state.pot.children) {
        chip.position.set((Math.random() - 0.5) * 0.20, Math.random() * 0.09, (Math.random() - 0.5) * 0.20);
        chip.rotation.x = 0;
      }
    }

    // ---------- Dealing actions ----------
    function burnOne(delay = 0) {
      schedule(delay, () => {
        const id = draw();
        if (!id) return;

        const card = makeCardMesh(id, { faceUp: false, backColor: 0x7fe7ff });
        card.position.copy(deckPos);
        card.scale.setScalar(0.60);
        state.root.add(card);

        const to = burnPos.clone();
        to.y = TABLE_Y + 0.05 + state.burnPile.children.length * 0.002;

        addMove(card, deckPos, to, 0.18, null, null, () => {
          state.burnPile.add(card);
          card.position.set(0, state.burnPile.children.length * 0.002, 0);
        });
      });
    }

    function dealHoleToSeat(seatIndex, cardIndex, delay = 0) {
      schedule(delay, () => {
        const id = draw();
        if (!id) return;

        const card = makeCardMesh(id, { faceUp: true, backColor: 0xff2d7a });
        card.position.copy(deckPos);
        card.scale.setScalar(0.001);
        state.root.add(card);

        // start small then grow
        card.scale.setScalar(0.60);

        const to = holeTarget(seatIndex, cardIndex);
        addMove(card, deckPos, to, 0.22, null, null, () => {
          card.scale.setScalar(HOLE_SCALE);
          state.hole[seatIndex].push(card);
        });
      });
    }

    function revealCommunity(slotIndex, delay = 0) {
      schedule(delay, () => {
        const id = draw();
        if (!id) return;

        const c = state.community[slotIndex];
        if (!c) return;

        // swap card id + face
        const rank = id[0], suit = id[1];
        c.userData.id = id;

        // replace face texture in-place:
        // easiest: rebuild the mesh children materials safely:
        try {
          const face = c.children?.find?.(x => x.isMesh && x.material?.map);
          if (face) {
            face.material.map = makeFaceTexture(rank, suit);
            face.material.needsUpdate = true;
          }
        } catch {}

        c.userData.setFaceUp(true);

        // pop in
        c.scale.setScalar(0.001);
        c.position.copy(commSlots[slotIndex]);
        c.position.y = COMMUNITY_Y - 0.10;

        addMove(c, c.position.clone(), commSlots[slotIndex].clone(), 0.22, null, null, () => {
          c.scale.setScalar(COMM_SCALE);
        });
      });
    }

    function stepDealerButton(nextSeat, delay = 0) {
      schedule(delay, () => {
        state.dealerSeat = (nextSeat + 6) % 6;

        const base = seatAnchorPos(state.dealerSeat);
        const inward = new THREE.Vector3(focus.x - base.x, 0, focus.z - base.z).normalize();
        const p = base.clone().add(inward.multiplyScalar(0.95));
        p.y = TABLE_Y + 0.02;

        const from = state.dealerBtn.position.clone();
        addMove(state.dealerBtn, from, p, 0.25);

        // update HUD
        const names = ["LUNA","JAX","NOVA","RAVEN","KAI","MILO"];
        state.hud.data.turnName = names[state.dealerSeat] || "BOT";
        state.hud.data.action = `Dealer → Seat ${state.dealerSeat + 1}`;
        state.hud.drawHUD(state.hud.data);
      });
    }

    // ---------- Hand script ----------
    function startHand() {
      if (!state.enabled) return;

      state.running = true;
      state.t = 0;
      clearTimers();
      clearMoves();
      clearVisuals();
      buildDeck();

      // HUD baseline
      state.hud.data.street = "Preflop";
      state.hud.data.pot = 15000;
      state.hud.data.action = "Dealing hole cards…";
      state.hud.drawHUD(state.hud.data);

      // Dealer button step
      stepDealerButton((state.dealerSeat + 1) % 6, 0.05);

      // Deal 2 rounds hole cards
      let t = 0.25;
      for (let round = 0; round < 2; round++) {
        for (let s = 0; s < 6; s++) {
          dealHoleToSeat(s, round, t);
          t += 0.10;
        }
      }

      // Flop/turn/river
      burnOne(t + 0.35);
      revealCommunity(0, t + 0.55);
      revealCommunity(1, t + 0.75);
      revealCommunity(2, t + 0.95);

      schedule(t + 1.10, () => {
        state.hud.data.street = "Flop";
        state.hud.data.action = "Action on table…";
        state.hud.drawHUD(state.hud.data);
      });

      burnOne(t + 2.05);
      revealCommunity(3, t + 2.25);

      schedule(t + 2.35, () => {
        state.hud.data.street = "Turn";
        state.hud.data.action = "Next decision…";
        state.hud.drawHUD(state.hud.data);
      });

      burnOne(t + 3.60);
      revealCommunity(4, t + 3.80);

      schedule(t + 3.95, () => {
        state.hud.data.street = "River";
        state.hud.data.action = "Showdown…";
        state.hud.drawHUD(state.hud.data);
      });

      // loop new hand
      schedule(t + 6.2, () => {
        state.hud.data.action = "Next hand…";
        state.hud.drawHUD(state.hud.data);
        startHand();
      });

      L("[DealingMix] startHand ✅ (real 52 card shuffle)");
    }

    function update(dt) {
      if (!state.enabled) return;
      state.t += dt;

      // timers
      if (state.timers.length) {
        // keep stable ordering
        state.timers.sort((a, b) => a.at - b.at);
        while (state.timers.length && state.timers[0].at <= state.t) {
          const it = state.timers.shift();
          try { it.fn(); } catch (e) { L("[DealingMix] timer err:", e?.message || e); }
        }
      }

      // moves (one at a time = smooth dealing)
      if (state.moves.length) {
        const m = state.moves[0];
        m.t += dt;
        const t = clamp(m.t / m.dur, 0, 1);
        const e = easeOutCubic(t);

        m.obj.position.set(
          m.from.x + (m.to.x - m.from.x) * e,
          m.from.y + (m.to.y - m.from.y) * e,
          m.from.z + (m.to.z - m.from.z) * e
        );

        if (m.fromQ && m.toQ) {
          m.obj.quaternion.slerpQuaternions(m.fromQ, m.toQ, e);
        }

        if (t >= 1) {
          state.moves.shift();
          try { m.onDone?.(); } catch {}
        }
      }

      // hover effect (community + HUD face camera)
      const bob = Math.sin(state.t * 2.0) * 0.015;

      for (let i = 0; i < state.community.length; i++) {
        const c = state.community[i];
        if (!c) continue;
        // only hover when visible
        if (c.scale.x > 0.01) c.position.y = COMMUNITY_Y + bob + Math.sin(state.t * 2.0 + i) * 0.006;
      }

      if (state.hud?.plane) {
        state.hud.plane.position.y = (COMMUNITY_Y + 0.55) + Math.sin(state.t * 1.6) * 0.02;
        // face player camera if available
        const cam = (scene?.userData?.cameraRef) || null;
        // we don't reliably have camera here; main can set scene.userData.cameraRef = camera
        const target = cam || null;
        if (target) {
          state.hud.plane.lookAt(target.position.x, state.hud.plane.position.y, target.position.z);
        }
      }
    }

    function clear() {
      clearTimers();
      clearMoves();
      clearVisuals();
    }

    // ---------- Compatibility methods (avoid crashes) ----------
    function setIncludePlayer(v) { state.includePlayer = !!v; } // legacy safe
    function setDealerSeat(i) { state.dealerSeat = ((i|0) % 6 + 6) % 6; }
    function setEnabled(v) { state.enabled = !!v; state.root.visible = state.enabled; }

    // Kick off a hand immediately (safe)
    startHand();

    // Public API
    return {
      startHand,
      update,
      clear,

      // compatibility / future hooks
      setIncludePlayer,
      setDealerSeat,
      setEnabled,

      // debug
      _state: state
    };
  }
};

// ✅ Default export too (so importing as module.default works)
export default DealingMix;
