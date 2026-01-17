// /js/modules/pokerGameplay.module.js
// Deterministic demo loop + pause/step/speed + dealer rotation + pot/vacuum (FULL)

export default {
  id: "pokerGameplay.module.js",

  async init({ THREE, anchors, tableData, log }) {
    const root = new THREE.Group();
    root.name = "POKER_GAMEPLAY_ROOT";
    anchors.table.add(root);

    const cardMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.7 });
    const makeCard = (name) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.002, 0.09), cardMat);
      m.name = name;
      m.visible = false;
      root.add(m);
      return m;
    };

    const community = Array.from({ length: 5 }, (_, i) => makeCard(`COMM_${i}`));

    const seatCount = tableData.seats || 6;
    const seatCards = Array.from({ length: seatCount }, (_, s) => [makeCard(`S${s}_0`), makeCard(`S${s}_1`)]);

    // Chips
    const chipGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.008, 18);
    const chipMats = [
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: 0xd33a3a, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0x2f6bd6, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0x1d1d1d, roughness: 0.5 }),
    ];

    const seatChips = [];
    const potChips = [];

    const getTable = () => window.SCARLETT?.table;

    function layoutCards() {
      const cx = tableData.center.x;
      const cy = tableData.center.y + 0.085;
      const cz = tableData.center.z;

      for (let i = 0; i < 5; i++) {
        const m = community[i];
        m.position.set(cx + (i - 2) * 0.075, cy, cz);
        m.rotation.set(-Math.PI / 2, 0, 0);
      }

      const seatRadius = (tableData.radius || 1.2) + 0.55;
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
    function showFlop() { community[0].visible = true; community[1].visible = true; community[2].visible = true; }
    function showTurn() { community[3].visible = true; }
    function showRiver(){ community[4].visible = true; }

    function sfx(name) { try { window.SCARLETT?.sfx?.[name]?.(); } catch (_) {} }

    function spawnSeatStacks() {
      const table = getTable();
      if (!table?.chipAnchors?.length) return;

      // clear old
      for (const stack of seatChips) for (const c of stack) { try { c.parent?.remove(c); } catch (_) {} }
      for (const c of potChips) { try { c.parent?.remove(c); } catch (_) {} }
      seatChips.length = 0; potChips.length = 0;

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

    function pushToPot(seat, count=2) {
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

      // restack pot
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

    // Deterministic timeline
    const S = { DEAL:0, FLOP:1, TURN:2, RIVER:3, POT:4, VACUUM:5, RESET:6 };
    let state = S.DEAL;
    let clock = 0;

    let paused = false;
    let speed = 1.0;
    let stepOnce = false;

    function advanceDealer() {
      tableData.dealerIndex = ((tableData.dealerIndex ?? 0) + 1) % seatCount;
      tableData.activeSeat  = tableData.dealerIndex;
    }

    function resetHand() {
      clock = 0;
      state = S.DEAL;
      hideAllCards();
      spawnSeatStacks();
      layoutCards();
    }

    // Public controls for Menu UI
    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.poker = window.SCARLETT.poker || {};
    window.SCARLETT.poker.startDemo = () => { paused = false; resetHand(); };
    window.SCARLETT.poker.togglePause = () => { paused = !paused; };
    window.SCARLETT.poker.step = () => { stepOnce = true; paused = true; };
    window.SCARLETT.poker.setSpeed = (v) => { speed = Math.max(0.1, Math.min(3.0, Number(v) || 1.0)); };
    window.SCARLETT.poker.getState = () => ({ state, clock, paused, speed });

    resetHand();

    log?.("pokerGameplay.module ✅ (pause/step/speed)");

    this._rt = { THREE, tableData, seatCount, S, get state(){return state;}, set state(v){state=v;},
      get clock(){return clock;}, set clock(v){clock=v;},
      get paused(){return paused;}, set paused(v){paused=v;},
      get speed(){return speed;}, set speed(v){speed=v;},
      get stepOnce(){return stepOnce;}, set stepOnce(v){stepOnce=v;},
      hideAllCards, showHoleCards, showFlop, showTurn, showRiver, sfx, advanceDealer, pushToPot, vacuumToSeat
    };
  },

  update(dt) {
    const r = this._rt;
    if (!r) return;

    // gate timeline
    if (r.paused && !r.stepOnce) return;

    const scaled = dt * r.speed;
    r.clock += scaled;

    // if stepping: allow one transition then freeze
    const doStepFreeze = () => { if (r.stepOnce) { r.stepOnce = false; r.paused = true; } };

    const S = r.S;

    if (r.state === S.DEAL) {
      if (r.clock < 0.15) return;
      r.hideAllCards();
      r.advanceDealer();
      r.showHoleCards();
      r.sfx("card");
      r.clock = 0;
      r.state = S.FLOP;
      doStepFreeze();
      return;
    }

    if (r.state === S.FLOP && r.clock > 0.95) {
      r.showFlop();
      r.sfx("card");
      r.clock = 0;
      r.state = S.TURN;
      doStepFreeze();
      return;
    }

    if (r.state === S.TURN && r.clock > 0.95) {
      r.showTurn();
      r.sfx("card");
      r.clock = 0;
      r.state = S.RIVER;
      doStepFreeze();
      return;
    }

    if (r.state === S.RIVER && r.clock > 0.95) {
      r.showRiver();
      r.sfx("card");
      r.clock = 0;
      r.state = S.POT;
      doStepFreeze();
      return;
    }

    if (r.state === S.POT && r.clock > 0.55) {
      for (let s = 0; s < r.seatCount; s++) r.pushToPot(s, 2);
      r.sfx("chip");
      r.clock = 0;
      r.state = S.VACUUM;
      doStepFreeze();
      return;
    }

    if (r.state === S.VACUUM) {
      const winner = r.tableData.dealerIndex ?? 0;
      r.vacuumToSeat(winner);
      if (r.clock > 0.12 && r.clock < 0.18) r.sfx("vacuum");

      if (r.clock > 1.25) {
        r.clock = 0;
        r.state = S.RESET;
        doStepFreeze();
      }
      return;
    }

    if (r.state === S.RESET && r.clock > 0.85) {
      r.clock = 0;
      r.state = S.DEAL;
      doStepFreeze();
      return;
    }
  },

  test() {
    const ok = !!window.SCARLETT?.poker?.getState;
    return { ok, note: ok ? "gameplay controls present" : "missing poker controls" };
  }
};
