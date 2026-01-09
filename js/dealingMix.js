// /js/dealingMix.js — Scarlett Poker VR DealingMix v1.2 (TABLE-LOCAL, NO DUPLICATES)
// GitHub Pages safe module (no "three" import). main.js passes THREE in.
//
// Fixes:
// - positions are TABLE-LOCAL (table origin = table center), so nothing spawns behind table
// - correct export name: DealingMix
// - community cards hover + face player
// - larger hole cards (2x) + community cards (4x)
// - creates ONLY ONE set of cards/chips/dealer on the table

export const DealingMix = {
  init({ THREE, scene, log = console.log, world }) {
    const L = (...a) => { try { log(...a); } catch { console.log(...a); } };

    const table = world?.table || world?.group || scene;

    // Table-local origin: (0,0,0) is table center in table group space
    const TABLE_Y = world?.metrics?.tableY ?? 0.92;

    // ---------- SIZES ----------
    const HOLE_W = 0.13;   // 2x-ish
    const HOLE_H = 0.18;

    const COMM_W = 0.26;   // 4x-ish
    const COMM_H = 0.36;

    const CARD_T = 0.004;

    // Hover heights
    const HOLE_HOVER_Y = TABLE_Y + 0.70;   // above heads-ish when attached to bots (we’ll billboard)
    const COMM_HOVER_Y = TABLE_Y + 0.36;   // hovering above felt
    const HUD_Y        = TABLE_Y + 0.95;   // big table HUD

    // Where deck + burn sit (near dealer button)
    const deckPosLocal = new THREE.Vector3(+0.72, TABLE_Y + 0.06, +0.22);
    const burnPosLocal = new THREE.Vector3(+0.52, TABLE_Y + 0.06, +0.22);

    const commLocal = [
      new THREE.Vector3(-0.52, COMM_HOVER_Y,  0.02),
      new THREE.Vector3(-0.26, COMM_HOVER_Y,  0.02),
      new THREE.Vector3( 0.00, COMM_HOVER_Y,  0.02),
      new THREE.Vector3( 0.26, COMM_HOVER_Y,  0.02),
      new THREE.Vector3( 0.52, COMM_HOVER_Y,  0.02),
    ];

    // ---------- STATE ----------
    const state = {
      t: 0,
      deck: [],
      deckIndex: 0,
      active: [],
      queue: [],
      timers: [],
      phase: "idle",
      running: true,

      // table UI
      hud: null,
      commCards: [],
      dealerBtn: null,
      potChips: null,
    };

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    function schedule(delay, fn) {
      state.timers.push({ at: state.t + Math.max(0, delay), fn });
    }

    function clearAll() {
      for (const o of state.active) { try { o.parent?.remove(o); } catch {} }
      state.active.length = 0;
      state.queue.length = 0;
      state.timers.length = 0;
      state.deck.length = 0;
      state.deckIndex = 0;
      state.phase = "idle";

      // keep HUD + dealer + pot + comm placeholders; we animate them instead of destroying
    }

    // ---------- DECK ----------
    function randInt(n) { return Math.floor(Math.random() * n); }
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

    // ---------- CARD MATERIALS ----------
    function makeCardFaceTexture(id) {
      // simple readable card face using canvas
      const rank = id.slice(0,1);
      const suit = id.slice(1,2);
      const sym = (suit === "S") ? "♠" : (suit === "H") ? "♥" : (suit === "D") ? "♦" : "♣";
      const red = (suit === "H" || suit === "D");

      const c = document.createElement("canvas");
      c.width = 512; c.height = 720;
      const ctx = c.getContext("2d");

      ctx.fillStyle = "#fbfbfb";
      ctx.fillRect(0,0,c.width,c.height);

      ctx.strokeStyle = "rgba(0,0,0,.25)";
      ctx.lineWidth = 14;
      ctx.strokeRect(14,14,c.width-28,c.height-28);

      ctx.fillStyle = red ? "#b6001b" : "#111";
      ctx.font = "bold 110px Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(rank, 40, 28);
      ctx.font = "bold 120px Arial";
      ctx.fillText(sym, 40, 150);

      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.font = "bold 110px Arial";
      ctx.fillText(rank, c.width-40, c.height-150);
      ctx.font = "bold 120px Arial";
      ctx.fillText(sym, c.width-40, c.height-28);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 320px Arial";
      ctx.fillText(sym, c.width/2, c.height/2 + 30);

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    }

    function makeCardMesh({ w, h, backColor = 0xff2d7a, faceTex = null } = {}) {
      const g = new THREE.Group();
      g.name = "Card";

      const geo = new THREE.PlaneGeometry(w, h);

      const faceMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: faceTex || null,
        roughness: 0.55,
        emissive: 0x0a0a0a,
        emissiveIntensity: 0.22,
        side: THREE.DoubleSide
      });

      const backMat = new THREE.MeshStandardMaterial({
        color: backColor,
        roughness: 0.45,
        emissive: 0x220010,
        emissiveIntensity: 0.35,
        side: THREE.DoubleSide
      });

      const face = new THREE.Mesh(geo, faceMat);
      const back = new THREE.Mesh(geo, backMat);
      face.position.z = +CARD_T * 0.5;
      back.position.z = -CARD_T * 0.5;
      back.rotation.y = Math.PI;

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, CARD_T),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
      );

      g.add(body, face, back);

      // keep upright by default (we’ll face them to player)
      g.rotation.set(0, 0, 0);

      return g;
    }

    // ---------- SIMPLE CHIP STACK ----------
    function makeChip(color = 0xff2d7a) {
      const chip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.012, 22),
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.35,
          metalness: 0.1,
          emissive: 0x120008,
          emissiveIntensity: 0.18
        })
      );
      chip.rotation.x = Math.PI / 2; // flat
      return chip;
    }

    // ---------- TABLE HUD ----------
    function makeTableHud() {
      const c = document.createElement("canvas");
      c.width = 1024; c.height = 384;
      const ctx = c.getContext("2d");

      function draw({ tableName="SCARLETT VR POKER", stake="$10,000 TABLE", pot="$0", street="PRE-FLOP", turn="—", action="—" } = {}) {
        ctx.clearRect(0,0,c.width,c.height);

        // bg
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        roundRect(ctx, 24, 36, 976, 312, 36, true);

        // header
        ctx.fillStyle = "#7fe7ff";
        ctx.font = "800 54px Arial";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(tableName, 60, 60);

        ctx.fillStyle = "rgba(232,236,255,0.9)";
        ctx.font = "800 46px Arial";
        ctx.fillText(stake, 60, 128);

        // rows
        ctx.font = "800 44px Arial";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("POT:", 60, 200);
        ctx.fillText("STREET:", 360, 200);
        ctx.fillText("TURN:", 60, 260);
        ctx.fillText("ACTION:", 360, 260);

        ctx.fillStyle = "#ff2d7a";
        ctx.fillText(String(pot), 180, 200);
        ctx.fillStyle = "#7fe7ff";
        ctx.fillText(String(street), 540, 200);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(String(turn), 180, 260);
        ctx.fillStyle = "#ffcc00";
        ctx.fillText(String(action), 560, 260);

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
      }

      draw({});

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;

      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.70), mat);
      mesh.position.set(0, HUD_Y, -0.25);
      mesh.name = "TableHUD";
      mesh.userData._draw = draw;
      mesh.userData._canvas = c;
      mesh.userData._tex = tex;

      return mesh;
    }

    // ---------- PLACEHOLDERS (ONE GAME ONLY) ----------
    // Deck stack (visual only)
    const deckStack = new THREE.Group();
    deckStack.name = "DeckStack";
    deckStack.position.copy(deckPosLocal);
    table.add(deckStack);

    for (let i = 0; i < 10; i++) {
      const c = makeCardMesh({ w: 0.10, h: 0.14, backColor: 0xff2d7a, faceTex: null });
      c.position.set(0, i * 0.002, 0);
      c.rotation.x = Math.PI / 2; // lie flat on table
      deckStack.add(c);
    }

    // Dealer button (flat on felt)
    const dealerBtn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.02, 28),
      new THREE.MeshStandardMaterial({
        color: 0x7fe7ff,
        emissive: 0x2bd7ff,
        emissiveIntensity: 0.55,
        roughness: 0.25
      })
    );
    dealerBtn.rotation.x = Math.PI / 2;
    dealerBtn.position.set(+0.58, TABLE_Y + 0.02, -0.28);
    dealerBtn.name = "DealerButton";
    table.add(dealerBtn);
    state.dealerBtn = dealerBtn;

    // Pot chips (flat, stacked)
    const pot = new THREE.Group();
    pot.name = "PotChips";
    pot.position.set(0, TABLE_Y + 0.02, 0);
    table.add(pot);
    state.potChips = pot;

    const denomColors = [0xffffff, 0xff2d7a, 0x7fe7ff, 0xffcc00, 0x6bff8f];
    for (let i = 0; i < 16; i++) {
      const chip = makeChip(denomColors[i % denomColors.length]);
      chip.position.set((Math.random()-0.5)*0.14, 0.006 + i*0.010, (Math.random()-0.5)*0.14);
      pot.add(chip);
    }

    // Community cards placeholders
    for (let i = 0; i < 5; i++) {
      const card = makeCardMesh({ w: COMM_W, h: COMM_H, backColor: 0x7fe7ff, faceTex: null });
      card.position.copy(commLocal[i]);
      card.scale.setScalar(0.001);
      card.name = "CommunityCard_" + i;
      table.add(card);
      state.commCards.push(card);
    }

    // Table HUD
    const hud = makeTableHud();
    table.add(hud);
    state.hud = hud;

    // ---------- ANIMATION QUEUE ----------
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

    function dealOneToCommunity(i, delay = 0) {
      schedule(delay, () => {
        const id = drawCardId();
        if (!id) return;

        const tex = makeCardFaceTexture(id);
        const card = makeCardMesh({ w: COMM_W, h: COMM_H, backColor: 0xff2d7a, faceTex: tex });
        card.userData.id = id;

        // spawn at deck
        card.position.copy(deckPosLocal);
        card.rotation.y = 0;
        table.add(card);
        state.active.push(card);

        enqueueMove(card, deckPosLocal, commLocal[i], 0.24, () => {});
      });
    }

    function burnOne(delay = 0) {
      schedule(delay, () => {
        const id = drawCardId();
        if (!id) return;

        const card = makeCardMesh({ w: 0.10, h: 0.14, backColor: 0x1b1c26, faceTex: null });
        card.userData.id = id;
        card.position.copy(deckPosLocal);
        card.rotation.x = Math.PI / 2;
        table.add(card);
        state.active.push(card);

        enqueueMove(card, deckPosLocal, burnPosLocal, 0.18, () => {});
        schedule(0.6, () => { try { table.remove(card); } catch {} });
      });
    }

    function startHand() {
      clearAll();
      buildDeck();
      state.phase = "dealing";
      state.t = 0;

      // reset placeholders
      for (let i = 0; i < 5; i++) {
        state.commCards[i].scale.setScalar(0.001);
      }

      // HUD sample values
      updateHud({
        tableName: "SCARLETT VR POKER",
        stake: "$10,000 TABLE",
        pot: "$0",
        street: "PRE-FLOP",
        turn: "LUNA",
        action: "CHECK"
      });

      let t = 0.45;

      // flop
      burnOne(t); t += 0.25;
      dealOneToCommunity(0, t); t += 0.18;
      dealOneToCommunity(1, t); t += 0.18;
      dealOneToCommunity(2, t); t += 0.18;

      schedule(t + 0.25, () => updateHud({ pot: "$3,000", street: "FLOP", turn: "NOVA", action: "BET $500" }));

      // turn
      burnOne(t + 1.2);
      dealOneToCommunity(3, t + 1.45);
      schedule(t + 1.65, () => updateHud({ pot: "$7,500", street: "TURN", turn: "JAX", action: "CALL $500" }));

      // river
      burnOne(t + 2.4);
      dealOneToCommunity(4, t + 2.65);
      schedule(t + 2.90, () => updateHud({ pot: "$15,000", street: "RIVER", turn: "KAI", action: "ALL-IN" }));

      schedule(t + 4.2, () => {
        state.phase = "done";
        updateHud({ action: "WINNER: NOVA (FLUSH)" });
        L("[DealingMix] hand complete ✅");
      });

      L("[DealingMix] startHand ✅");
    }

    function updateHud(patch = {}) {
      if (!state.hud) return;
      const d = state.hud.userData;
      const cur = state.hud.userData._state || {
        tableName: "SCARLETT VR POKER",
        stake: "$10,000 TABLE",
        pot: "$0",
        street: "PRE-FLOP",
        turn: "—",
        action: "—"
      };
      const next = { ...cur, ...patch };
      state.hud.userData._state = next;
      d._draw(next);
      d._tex.needsUpdate = true;
    }

    // ---------- UPDATE ----------
    function faceToCamera(obj) {
      const cam = world?.cameraRef || null;
      const player = world?.playerRef || null;
      const ref = cam || player;
      if (!ref) return;

      // face the camera on Y only
      const p = ref.position.clone();
      obj.lookAt(p.x, obj.position.y, p.z);
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

      // one-at-a-time move queue
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
        if (t >= 1) state.queue.shift();
      }

      // hover community placeholders (and face player)
      const hover = (Math.sin(state.t * 2.0) * 0.015);
      for (let i = 0; i < state.commCards.length; i++) {
        const c = state.commCards[i];
        const appearT = clamp((state.t - i * 0.35) / 0.35, 0, 1);
        c.scale.setScalar(0.001 + appearT * 1.0);
        c.position.y = COMM_HOVER_Y + hover + Math.sin(state.t * 1.8 + i) * 0.006;

        // face player
        faceToCamera(c);
        // keep them upright
        c.rotation.x = 0;
      }

      // face HUD
      if (state.hud) faceToCamera(state.hud);

      // dealer button seat-to-seat "step", not orbit
      if (state.dealerBtn && world?.seats?.length) {
        const seatCount = world.seats.length;
        const stepT = Math.floor(state.t / 2.5) % Math.max(1, seatCount);
        const s = world.seats[stepT];
        if (s?.anchor) {
          // put dealer button near that seat edge (local table coords)
          // seat.anchor is under chair; we want a stable location: project direction inward
          const seatPosWorld = new THREE.Vector3();
          s.anchor.getWorldPosition(seatPosWorld);

          // convert world -> table local
          const seatPosLocal = table.worldToLocal(seatPosWorld.clone());

          const inward = seatPosLocal.clone().setY(0).normalize().multiplyScalar(-0.55);
          state.dealerBtn.position.set(
            seatPosLocal.x + inward.x,
            TABLE_Y + 0.02,
            seatPosLocal.z + inward.z
          );
        }
      }

      // pot pulse tiny
      if (state.potChips) {
        const ps = 1.0 + Math.sin(state.t * 2.5) * 0.02;
        state.potChips.scale.setScalar(ps);
      }
    }

    return { startHand, update, clear: clearAll, updateHud };
  }
};
