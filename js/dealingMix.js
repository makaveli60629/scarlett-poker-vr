// /js/dealingMix.js — Scarlett Poker VR DealingMix v2.0 (FULL)
// GitHub Pages safe module (no "three" import). main.js passes THREE in.
// Export: DealingMix
//
// What it does:
// - Builds a real 52-card shuffled deck (no duplicates)
// - Animates: preflop hole cards to SEATED bots only, then flop/turn/river
// - Community cards hover + face player (billboard)
// - Dealer button moves seat-to-seat (not orbiting)
// - Deck stays in front of dealer button, face-down
// - Everything is positioned using world.tableFocus + world.tableY

export const DealingMix = {
  init({ THREE, scene, log = console.log, world }) {
    const L = (...a) => { try { log(...a); } catch { console.log(...a); } };

    const table = world?.table || world?.group || scene;
    const focus = world?.tableFocus || new THREE.Vector3(0, 0, -6.5);

    // ---- metrics (authoritative) ----
    const TABLE_Y = (world?.tableY != null) ? world.tableY : 0.92;
    const CARD_Y  = TABLE_Y + 0.11;        // visible above felt
    const COMM_Y  = TABLE_Y + 0.28;        // hover height
    const HUD_Y   = TABLE_Y + 0.85;

    // ---- card sizing (your request: bigger) ----
    const HOLE_W = 0.22;     // twice-ish bigger than earlier
    const HOLE_H = 0.30;
    const COMM_W = 0.34;     // ~4x bigger feel vs old small planes
    const COMM_H = 0.46;
    const THICK  = 0.004;

    // ---- seat list (ONLY table bots get hole cards) ----
    const seats = (world?.seats || []).slice(0, 6);

    // ---- render-facing helper ----
    const tmpV = new THREE.Vector3();
    function facePlayerY(obj) {
      const cam = world?.cameraRef || scene?.userData?.cameraRef;
      if (!cam) return;
      cam.getWorldPosition(tmpV);
      obj.lookAt(tmpV.x, obj.position.y, tmpV.z);
    }

    // --------- CARD TEXTURES (rank/suit) ----------
    function makeCardFaceTexture(rank, suit) {
      const c = document.createElement("canvas");
      c.width = 256; c.height = 356;
      const ctx = c.getContext("2d");

      ctx.fillStyle = "#f7f7fb";
      ctx.fillRect(0, 0, c.width, c.height);

      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, c.width - 12, c.height - 12);

      const isRed = (suit === "♥" || suit === "♦");
      ctx.fillStyle = isRed ? "#b6001b" : "#101018";

      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.font = "bold 54px Arial";
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
      try { tex.colorSpace = THREE.SRGBColorSpace; } catch {}
      return tex;
    }

    function makeCardBackTexture() {
      const c = document.createElement("canvas");
      c.width = 256; c.height = 356;
      const ctx = c.getContext("2d");

      ctx.fillStyle = "#0b0b12";
      ctx.fillRect(0, 0, c.width, c.height);

      ctx.strokeStyle = "rgba(127,231,255,0.75)";
      ctx.lineWidth = 10;
      ctx.strokeRect(10, 10, c.width - 20, c.height - 20);

      ctx.strokeStyle = "rgba(255,45,122,0.65)";
      ctx.lineWidth = 6;
      ctx.strokeRect(26, 26, c.width - 52, c.height - 52);

      ctx.fillStyle = "rgba(127,231,255,0.28)";
      ctx.beginPath();
      ctx.arc(c.width/2, c.height/2, 92, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,45,122,0.25)";
      ctx.beginPath();
      ctx.arc(c.width/2, c.height/2, 62, 0, Math.PI*2);
      ctx.fill();

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      try { tex.colorSpace = THREE.SRGBColorSpace; } catch {}
      return tex;
    }

    const backTex = makeCardBackTexture();

    function makeCardMesh({ w, h, faceTex = null, backTex }) {
      const g = new THREE.Group();
      g.name = "Card";

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(w, THICK, h),
        new THREE.MeshStandardMaterial({ color: 0x101015, roughness: 0.9 })
      );
      g.add(body);

      const faceMat = new THREE.MeshStandardMaterial({
        map: faceTex || null,
        color: faceTex ? 0xffffff : 0xffffff,
        roughness: 0.55,
        emissive: 0x111111,
        emissiveIntensity: 0.12
      });

      const backMat = new THREE.MeshStandardMaterial({
        map: backTex || null,
        color: backTex ? 0xffffff : 0xff2d7a,
        roughness: 0.45,
        emissive: 0x220010,
        emissiveIntensity: 0.25
      });

      const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), faceMat);
      face.rotation.x = -Math.PI / 2;
      face.position.y = THICK/2 + 0.0005;
      g.add(face);

      const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), backMat);
      back.rotation.x = -Math.PI / 2;
      back.rotation.y = Math.PI;
      back.position.y = -THICK/2 - 0.0005;
      g.add(back);

      // default lying flat
      g.rotation.set(0, 0, 0);
      return g;
    }

    // --------- DECK ----------
    const SUITS = ["♠", "♥", "♦", "♣"];
    const RANKS = ["A","2","3","4","5","6","7","8","9","T","J","Q","K"];

    function buildDeck() {
      const d = [];
      for (const s of SUITS) for (const r of RANKS) d.push({ r, s });
      // shuffle
      for (let i = d.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [d[i], d[j]] = [d[j], d[i]];
      }
      return d;
    }

    // --------- TABLE OBJECTS ----------
    const root = new THREE.Group();
    root.name = "DealingMixRoot";
    table.add(root);

    // Dealer button: a small flat disc
    const dealerBtn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.018, 24),
      new THREE.MeshStandardMaterial({
        color: 0x7fe7ff,
        emissive: 0x2bd7ff,
        emissiveIntensity: 1.1,
        roughness: 0.25,
        transparent: true,
        opacity: 0.9
      })
    );
    dealerBtn.rotation.x = Math.PI / 2;
    root.add(dealerBtn);

    // Deck stack (in front of dealer button)
    const deckStack = new THREE.Group();
    deckStack.name = "DeckStack";
    root.add(deckStack);

    function rebuildDeckStack() {
      while (deckStack.children.length) deckStack.remove(deckStack.children[0]);
      for (let i = 0; i < 12; i++) {
        const c = makeCardMesh({ w: 0.14, h: 0.20, faceTex: null, backTex });
        c.position.set(0, i * 0.003, 0);
        c.rotation.x = -Math.PI/2;
        deckStack.add(c);
      }
    }
    rebuildDeckStack();

    // Community cards (5) — hover + face player
    const commCards = [];
    for (let i = 0; i < 5; i++) {
      const c = makeCardMesh({ w: COMM_W, h: COMM_H, faceTex: null, backTex });
      c.position.set(focus.x + (-0.72 + i * 0.36), COMM_Y, focus.z + 0.10);
      c.rotation.x = -Math.PI/2;
      c.scale.setScalar(0.001);
      root.add(c);
      commCards.push(c);
    }

    // Pot chips — flat
    const pot = new THREE.Group();
    pot.name = "PotStack";
    pot.position.set(focus.x, CARD_Y, focus.z + 0.18);
    root.add(pot);

    function buildPot() {
      while (pot.children.length) pot.remove(pot.children[0]);
      const colors = [0xff2d7a, 0x7fe7ff, 0xffcc00, 0x6bff8f, 0xffffff];
      for (let i = 0; i < 18; i++) {
        const chip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.070, 0.070, 0.013, 22),
          new THREE.MeshStandardMaterial({
            color: colors[i % colors.length],
            roughness: 0.35,
            metalness: 0.1,
            emissive: colors[i % colors.length],
            emissiveIntensity: 0.12
          })
        );
        chip.rotation.x = Math.PI/2;
        chip.position.set((Math.random()-0.5)*0.18, 0.006 + i*0.010, (Math.random()-0.5)*0.18);
        pot.add(chip);
      }
    }
    buildPot();

    // Floating table HUD (you asked for table identifier + pot/turn)
    const tableHUD = (() => {
      const c = document.createElement("canvas");
      c.width = 1024; c.height = 512;
      const ctx = c.getContext("2d");

      function draw({ title, blind, pot, turn, street }) {
        ctx.clearRect(0,0,c.width,c.height);
        ctx.fillStyle = "rgba(0,0,0,0.58)";
        roundRect(40, 60, 944, 392, 36, true);

        ctx.strokeStyle = "rgba(127,231,255,0.35)";
        ctx.lineWidth = 6;
        roundRect(52, 72, 920, 368, 32, false);

        ctx.fillStyle = "#e8ecff";
        ctx.font = "900 64px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(title, 512, 92);

        ctx.fillStyle = "#7fe7ff";
        ctx.font = "800 46px Arial";
        ctx.fillText(blind, 512, 170);

        ctx.fillStyle = "#ff2d7a";
        ctx.font = "900 54px Arial";
        ctx.fillText("POT: $" + pot.toLocaleString(), 512, 240);

        ctx.fillStyle = "#ffffff";
        ctx.font = "800 44px Arial";
        ctx.fillText("TURN: " + turn, 512, 315);

        ctx.fillStyle = "rgba(232,236,255,0.85)";
        ctx.font = "700 42px Arial";
        ctx.fillText("STREET: " + street, 512, 375);
      }

      function roundRect(x, y, w, h, r, fill) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        if (fill) ctx.fill(); else ctx.stroke();
      }

      const tex = new THREE.CanvasTexture(c);
      try { tex.colorSpace = THREE.SRGBColorSpace; } catch {}
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 0.92), mat);
      mesh.position.set(focus.x, HUD_Y, focus.z + 0.25);
      root.add(mesh);

      const data = { title: "SCARLETT VR POKER — 6-MAX", blind: "$10,000 TABLE", pot: 25000, turn: "LUNA", street: "PREFLOP" };
      draw(data);
      tex.needsUpdate = true;

      return {
        mesh,
        set(partial) {
          Object.assign(data, partial);
          draw(data);
          tex.needsUpdate = true;
        }
      };
    })();

    // --------- STATE / ANIM ----------
    const state = {
      t: 0,
      deck: [],
      di: 0,
      running: true,
      dealerIndex: 0,
      phase: "idle",
      timers: [],
      moves: [],
      holeBySeat: new Map(), // seatIndex -> [cardA, cardB]
      comm: commCards,
    };

    function schedule(delay, fn) { state.timers.push({ at: state.t + Math.max(0, delay), fn }); }

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function enqueueMove(obj, from, to, dur, onDone) {
      state.moves.push({ obj, from: from.clone(), to: to.clone(), dur: Math.max(0.12, dur), t: 0, onDone });
    }

    function drawCard() {
      if (state.di >= state.deck.length) return null;
      return state.deck[state.di++];
    }

    function clearAllCards() {
      // remove hole cards
      for (const arr of state.holeBySeat.values()) {
        for (const c of arr) { try { root.remove(c); } catch {} }
      }
      state.holeBySeat.clear();

      // reset community
      for (const c of commCards) {
        c.scale.setScalar(0.001);
        c.userData.face = null;
        // set to back (no face)
        try { c.children?.[1]?.material && (c.children[1].material.map = backTex); } catch {}
      }

      // reset pot
      buildPot();
    }

    function seatHeadPos(seatIndex) {
      const s = seats[seatIndex];
      if (!s) return new THREE.Vector3(focus.x, 1.75, focus.z);
      const p = s.position.clone();
      p.y = (world?.seatHeadY != null) ? world.seatHeadY : 1.78;
      return p;
    }

    function placeDealerButton(seatIndex) {
      // Flat on table edge near that seat
      const s = seats[seatIndex];
      if (!s) {
        dealerBtn.position.set(focus.x + 0.55, TABLE_Y + 0.02, focus.z - 0.25);
        return;
      }
      const base = s.position.clone();
      const inward = new THREE.Vector3(focus.x - base.x, 0, focus.z - base.z).normalize().multiplyScalar(0.65);
      const pos = base.clone().add(inward);
      pos.y = TABLE_Y + 0.02;
      dealerBtn.position.copy(pos);
    }

    function placeDeckNearDealer() {
      // Deck stays just in front of dealer button toward table center
      const p = dealerBtn.position.clone();
      const towardCenter = new THREE.Vector3(focus.x - p.x, 0, focus.z - p.z).normalize().multiplyScalar(0.22);
      deckStack.position.set(p.x + towardCenter.x, TABLE_Y + 0.03, p.z + towardCenter.z);
    }

    function revealCommunity(i, cs) {
      const tex = makeCardFaceTexture(cs.r, cs.s);
      // face mesh is child[1] in our makeCardMesh ordering? (body, facePlane, backPlane)
      // We built: body, face(plane), back(plane) => face is children[1]
      const card = commCards[i];
      try { card.children[1].material.map = tex; card.children[1].material.needsUpdate = true; } catch {}
      card.userData.face = cs;
    }

    function makeHoleCard(cs, offsetX) {
      const tex = makeCardFaceTexture(cs.r, cs.s);
      const card = makeCardMesh({ w: HOLE_W, h: HOLE_H, faceTex: tex, backTex });
      card.rotation.x = 0; // we'll billboard it
      card.position.set(0, 0, 0);
      card.userData.offsetX = offsetX;
      return card;
    }

    function dealHoleToSeat(seatIndex, delay) {
      schedule(delay, () => {
        const seat = seats[seatIndex];
        if (!seat) return;

        const a = drawCard(); const b = drawCard();
        if (!a || !b) return;

        const head = seatHeadPos(seatIndex);

        const c1 = makeHoleCard(a, -0.14);
        const c2 = makeHoleCard(b,  0.14);

        // start from deck
        const from = deckStack.position.clone();
        from.y = TABLE_Y + 0.08;

        c1.position.copy(from);
        c2.position.copy(from);

        root.add(c1); root.add(c2);

        state.holeBySeat.set(seatIndex, [c1, c2]);

        const to1 = head.clone(); to1.y = head.y + 0.06; to1.x += -0.16;
        const to2 = head.clone(); to2.y = head.y + 0.06; to2.x +=  0.16;

        enqueueMove(c1, from, to1, 0.24);
        enqueueMove(c2, from, to2, 0.24);
      });
    }

    function startHand() {
      clearAllCards();
      state.deck = buildDeck();
      state.di = 0;
      state.t = 0;
      state.moves.length = 0;
      state.timers.length = 0;

      state.dealerIndex = (state.dealerIndex + 1) % Math.max(1, seats.length);
      placeDealerButton(state.dealerIndex);
      placeDeckNearDealer();

      tableHUD.set({ street: "PREFLOP", pot: 25000, turn: "LUNA" });

      // Deal hole cards ONLY to seated bots (6 seats max)
      let t = 0.25;
      for (let seatIndex = 0; seatIndex < Math.min(6, seats.length); seatIndex++) {
        dealHoleToSeat(seatIndex, t);
        t += 0.18;
      }

      // Flop
      schedule(t + 0.55, () => { tableHUD.set({ street: "FLOP", turn: "JAX" }); });
      for (let i = 0; i < 3; i++) {
        schedule(t + 0.65 + i*0.22, () => {
          const cs = drawCard(); if (!cs) return;
          revealCommunity(i, cs);
          const card = commCards[i];
          card.scale.setScalar(1.0);
        });
      }

      // Turn
      schedule(t + 2.00, () => { tableHUD.set({ street: "TURN", turn: "NOVA" }); });
      schedule(t + 2.10, () => {
        const cs = drawCard(); if (!cs) return;
        revealCommunity(3, cs);
        commCards[3].scale.setScalar(1.0);
      });

      // River
      schedule(t + 3.40, () => { tableHUD.set({ street: "RIVER", turn: "RAVEN" }); });
      schedule(t + 3.50, () => {
        const cs = drawCard(); if (!cs) return;
        revealCommunity(4, cs);
        commCards[4].scale.setScalar(1.0);
      });

      // End -> restart loop
      schedule(t + 7.0, () => {
        tableHUD.set({ street: "SHOWDOWN", turn: "KAI" });
      });
      schedule(t + 10.0, () => {
        startHand();
      });

      L("[DealingMix] startHand ✅ dealerSeat=" + state.dealerIndex);
    }

    function update(dt) {
      state.t += dt;

      // timers
      if (state.timers.length) {
        state.timers.sort((a,b)=>a.at-b.at);
        while (state.timers.length && state.timers[0].at <= state.t) {
          const it = state.timers.shift();
          try { it.fn(); } catch (e) { L("[DealingMix] timer error:", e?.message || e); }
        }
      }

      // move queue (one at a time = readable)
      if (state.moves.length) {
        const m = state.moves[0];
        m.t += dt;
        const t = Math.min(1, m.t / m.dur);
        const e = easeOut(t);
        m.obj.position.set(
          m.from.x + (m.to.x - m.from.x) * e,
          m.from.y + (m.to.y - m.from.y) * e,
          m.from.z + (m.to.z - m.from.z) * e
        );
        if (t >= 1) {
          state.moves.shift();
          try { m.onDone?.(); } catch {}
        }
      }

      // community cards hover + face player
      for (let i = 0; i < commCards.length; i++) {
        const c = commCards[i];
        const shown = c.scale.x > 0.1;
        if (!shown) continue;
        c.position.y = COMM_Y + Math.sin(state.t*2.0 + i)*0.02;
        facePlayerY(c);
        c.rotateX(-0.35); // slight tilt toward you
      }

      // hole cards hover + face player
      for (const [seatIndex, arr] of state.holeBySeat.entries()) {
        const head = seatHeadPos(seatIndex);
        for (let i = 0; i < arr.length; i++) {
          const c = arr[i];
          c.position.y = head.y + 0.06 + Math.sin(state.t*2.2 + seatIndex + i)*0.02;
          facePlayerY(c);
        }
      }

      // HUD faces player
      facePlayerY(tableHUD.mesh);
    }

    // expose to main/world
    const api = {
      startHand,
      update,
      setTableId(label) { tableHUD.set({ blind: label }); },
      setCameraRef(cam) { world.cameraRef = cam; scene.userData.cameraRef = cam; }
    };

    // boot
    api.setCameraRef(world?.cameraRef || null);
    startHand();

    return api;
  }
};
