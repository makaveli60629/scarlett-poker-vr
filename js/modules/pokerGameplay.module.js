// /js/modules/pokerGameplay.module.js
// Deterministic demo gameplay loop (dt-based) integrating cards/chips/rules + visuals (FULL)

export default {
  id: 'pokerGameplay.module.js',

  async init({ THREE, anchors, log }) {
    const td = window.SCARLETT?.table?.data;
    const seatCount = td?.seats || 6;

    const root = new THREE.Group();
    root.name = 'POKER_GAMEPLAY_ROOT';
    anchors.table.add(root);

    // simple card meshes
    const cardMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.7 });
    const mkCard = (name) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.002, 0.09), cardMat);
      m.name = name;
      m.visible = false;
      root.add(m);
      return m;
    };

    const community = Array.from({ length: 5 }, (_, i) => mkCard(`COMM_${i}`));
    const seatCards = Array.from({ length: seatCount }, (_, s) => [mkCard(`S${s}_0`), mkCard(`S${s}_1`)]);

    // chip meshes (visual only)
    const chipGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.008, 18);
    const chipMats = [
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: 0xd33a3a, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0x2f6bd6, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0x1d1d1d, roughness: 0.5 })
    ];

    const seatChips = [];
    const potChips = [];

    const getTable = () => window.SCARLETT?.table;

    function layoutCards() {
      const cx = td.center.x;
      const cy = td.center.y + 0.085;
      const cz = td.center.z;

      for (let i = 0; i < 5; i++) {
        const m = community[i];
        m.position.set(cx + (i - 2) * 0.075, cy, cz);
        m.rotation.set(-Math.PI / 2, 0, 0);
      }

      const seatRadius = (td.radius || 1.2) + 0.55;
      for (let s = 0; s < seatCount; s++) {
        const t = (s / seatCount) * Math.PI * 2;
        const sx = cx + Math.cos(t) * seatRadius;
        const sz = cz + Math.sin(t) * seatRadius;
        seatCards[s][0].position.set(sx - 0.03, cy, sz);
        seatCards[s][1].position.set(sx + 0.03, cy, sz);
        seatCards[s][0].rotation.set(-Math.PI / 2, 0, 0);
        seatCards[s][1].rotation.set(-Math.PI / 2, 0, 0);
      }
    }

    function hideAllCards() {
      for (const m of community) m.visible = false;
      for (const sc of seatCards) { sc[0].visible = false; sc[1].visible = false; }
    }

    function showHoleCards() {
      for (let s = 0; s < seatCount; s++) { seatCards[s][0].visible = true; seatCards[s][1].visible = true; }
    }
    const showFlop = () => { community[0].visible = community[1].visible = community[2].visible = true; };
    const showTurn = () => { community[3].visible = true; };
    const showRiver = () => { community[4].visible = true; };

    const sfx = (name) => { try { window.SCARLETT?.sfx?.[name]?.(); } catch (_) {} };

    function clearChips() {
      for (const stack of seatChips) for (const c of stack) { try { c.parent?.remove(c); } catch (_) {} }
      for (const c of potChips) { try { c.parent?.remove(c); } catch (_) {} }
      seatChips.length = 0;
      potChips.length = 0;
    }

    function spawnSeatStacks() {
      clearChips();
      const table = getTable();
      if (!table?.chipAnchors?.length) return;

      for (let s = 0; s < seatCount; s++) {
        const a = table.chipAnchors[s];
        const stack = [];
        for (let i = 0; i < 14; i++) {
          const m = chipMats[(s + i) % chipMats.length];
          const chip = new THREE.Mesh(chipGeo, m);
          chip.rotation.x = Math.PI / 2;
          chip.position.set(0, 0.002 + i * 0.0085, 0);
          chip.userData = { seat: s, inPot: false };
          a.add(chip);
          stack.push(chip);
        }
        seatChips.push(stack);
      }
    }

    function pushToPot(seat, count = 2) {
      const table = getTable();
      if (!table?.potAnchor) return;
      const stack = seatChips[seat] || [];
      let moved = 0;

      for (let i = stack.length - 1; i >= 0 && moved < count; i--) {
        const chip = stack[i];
        const wp = chip.getWorldPosition(new THREE.Vector3());
        chip.parent.remove(chip);
        root.add(chip);
        chip.position.copy(wp);
        chip.userData.inPot = true;
        potChips.push(chip);
        stack.splice(i, 1);
        moved++;
      }

      // stack pot
      const potWP = table.potAnchor.getWorldPosition(new THREE.Vector3());
      for (let i = 0; i < potChips.length; i++) {
        const c = potChips[i];
        c.position.lerp(potWP, 0.35);
        c.position.y = potWP.y + 0.002 + i * 0.0085;
      }
    }

    function vacuumToSeat(winnerSeat) {
      const table = getTable();
      const target = table?.chipAnchors?.[winnerSeat];
      if (!target) return;
      const targetWP = target.getWorldPosition(new THREE.Vector3());
      for (let i = 0; i < potChips.length; i++) {
        potChips[i].position.lerp(targetWP, 0.22);
      }
    }

    // ---- deterministic timeline ----
    const S = { DEAL:0, FLOP:1, TURN:2, RIVER:3, BET:4, SHOWDOWN:5, VACUUM:6, RESET:7 };
    let state = S.DEAL;
    let clock = 0;

    let paused = false;
    let speed = 1.0;
    let stepOnce = false;

    const advanceDealer = () => {
      td.dealerIndex = ((td.dealerIndex ?? 0) + 1) % seatCount;
      td.activeSeat = td.dealerIndex;
      // rotate dealer button
      const btn = window.SCARLETT?.table?.dealerButton;
      if (btn) {
        const t = (td.dealerIndex / seatCount) * Math.PI * 2;
        btn.position.set(td.center.x + Math.cos(t) * 0.55, td.center.y + 0.085, td.center.z + Math.sin(t) * 0.55);
      }
    };

    const resetHand = () => {
      clock = 0;
      state = S.DEAL;
      hideAllCards();
      spawnSeatStacks();
      layoutCards();
      window.SCARLETT?.cards?.newDeck?.();
      window.SCARLETT?.chips?.resetHand?.();
    };

    // Public controls
    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.poker = window.SCARLETT.poker || {};
    window.SCARLETT.poker.startDemo = () => { paused = false; resetHand(); };
    window.SCARLETT.poker.togglePause = () => { paused = !paused; };
    window.SCARLETT.poker.step = () => { stepOnce = true; paused = true; };
    window.SCARLETT.poker.setSpeed = (v) => { speed = Math.max(0.1, Math.min(3.0, Number(v) || 1.0)); };
    window.SCARLETT.poker.getState = () => ({ state, clock, paused, speed });

    resetHand();

    this._rt = { S,
      get state(){return state;}, set state(v){state=v;},
      get clock(){return clock;}, set clock(v){clock=v;},
      get paused(){return paused;}, set paused(v){paused=v;},
      get speed(){return speed;}, set speed(v){speed=v;},
      get stepOnce(){return stepOnce;}, set stepOnce(v){stepOnce=v;},
      seatCount, hideAllCards, showHoleCards, showFlop, showTurn, showRiver,
      pushToPot, vacuumToSeat, advanceDealer, sfx
    };

    log?.('pokerGameplay.module ✅');
  },

  update(dt) {
    const r = this._rt;
    if (!r) return;

    if (r.paused && !r.stepOnce) return;

    r.clock += dt * r.speed;

    const freezeIfStep = () => { if (r.stepOnce) { r.stepOnce = false; r.paused = true; } };

    const S = r.S;

    if (r.state === S.DEAL) {
      if (r.clock < 0.15) return;
      r.hideAllCards();
      r.advanceDealer();
      r.showHoleCards();
      r.sfx('card');
      r.clock = 0;
      r.state = S.FLOP;
      freezeIfStep();
      return;
    }

    if (r.state === S.FLOP && r.clock > 0.95) {
      r.showFlop();
      r.sfx('card');
      r.clock = 0;
      r.state = S.TURN;
      freezeIfStep();
      return;
    }

    if (r.state === S.TURN && r.clock > 0.95) {
      r.showTurn();
      r.sfx('card');
      r.clock = 0;
      r.state = S.RIVER;
      freezeIfStep();
      return;
    }

    if (r.state === S.RIVER && r.clock > 0.95) {
      r.showRiver();
      r.sfx('card');
      r.clock = 0;
      r.state = S.BET;
      freezeIfStep();
      return;
    }

    if (r.state === S.BET && r.clock > 0.55) {
      // visual chips to pot
      for (let s = 0; s < r.seatCount; s++) r.pushToPot(s, 2);
      r.sfx('chip');
      // accounting pot
      for (let s = 0; s < r.seatCount; s++) window.SCARLETT?.chips?.bet?.(s, 20);
      window.SCARLETT?.chips?.toPot?.();

      r.clock = 0;
      r.state = S.SHOWDOWN;
      freezeIfStep();
      return;
    }

    if (r.state === S.SHOWDOWN && r.clock > 0.45) {
      // pick a winner (demo): dealer wins
      const winner = window.SCARLETT?.table?.data?.dealerIndex ?? 0;
      window.SCARLETT.table.data.activeSeat = winner;

      r.clock = 0;
      r.state = S.VACUUM;
      freezeIfStep();
      return;
    }

    if (r.state === S.VACUUM) {
      const winner = window.SCARLETT?.table?.data?.activeSeat ?? 0;
      r.vacuumToSeat(winner);
      if (r.clock > 0.12 && r.clock < 0.18) r.sfx('vacuum');

      if (r.clock > 1.25) {
        // payout accounting
        const pot = window.SCARLETT?.chips?.get?.().pot || 0;
        window.SCARLETT?.chips?.payout?.(winner, pot);

        r.clock = 0;
        r.state = S.RESET;
        freezeIfStep();
      }
      return;
    }

    if (r.state === S.RESET && r.clock > 0.85) {
      r.clock = 0;
      r.state = S.DEAL;
      freezeIfStep();
      return;
    }
  },

  test() {
    const ok = !!window.SCARLETT?.poker?.getState;
    return { ok, note: ok ? 'gameplay controls present' : 'missing poker controls' };
  }
};
