// /js/modules/pokerGameplay.module.js
// Demo gameplay loop (deal -> flop -> turn -> river -> reset) + sound hooks (FULL)

export default {
  id: "pokerGameplay.module.js",

  async init({ THREE, anchors, tableData, log }) {
    const root = new THREE.Group();
    root.name = "POKER_GAMEPLAY_ROOT";
    anchors.table.add(root);

    // Simple card material
    const cardMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.7 });
    const cardBackMat = new THREE.MeshStandardMaterial({ color: 0x1b2a66, roughness: 0.8 });

    const makeCard = (name) => {
      const geo = new THREE.BoxGeometry(0.06, 0.002, 0.09);
      const mesh = new THREE.Mesh(geo, cardMat);
      mesh.name = name;
      mesh.visible = false;
      root.add(mesh);
      return mesh;
    };

    // Community card slots
    const community = [];
    for (let i = 0; i < 5; i++) community.push(makeCard(`COMMUNITY_${i}`));

    // Seat hole cards
    const seatCount = tableData.seats || 6;
    const seatCards = Array.from({ length: seatCount }, (_, s) => [
      makeCard(`SEAT_${s}_CARD_0`),
      makeCard(`SEAT_${s}_CARD_1`)
    ]);

    // Positions
    const setLayout = () => {
      const cx = tableData.center.x;
      const cy = tableData.center.y + 0.085;
      const cz = tableData.center.z;

      // community line
      for (let i = 0; i < 5; i++) {
        const m = community[i];
        m.position.set(cx + (i - 2) * 0.075, cy, cz);
        m.rotation.set(-Math.PI / 2, 0, 0);
      }

      // seat cards near rail
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
    };

    setLayout();

    // Demo state machine
    const S = { IDLE:0, DEAL:1, FLOP:2, TURN:3, RIVER:4, SHOW:5, RESET:6 };
    let state = S.IDLE;
    let timer = 0;

    function sfx(fn) {
      try { window.SCARLETT?.sfx?.[fn]?.(); } catch (_) {}
    }

    function hideAll() {
      for (const m of community) m.visible = false;
      for (const sc of seatCards) { sc[0].visible = false; sc[1].visible = false; }
    }

    function dealAllSeats() {
      for (let s = 0; s < seatCount; s++) {
        seatCards[s][0].visible = true;
        seatCards[s][1].visible = true;
      }
    }

    function showFlop() {
      community[0].visible = true;
      community[1].visible = true;
      community[2].visible = true;
    }

    function showTurn() { community[3].visible = true; }
    function showRiver() { community[4].visible = true; }

    hideAll();

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.poker = {
      root,
      state: "IDLE",
      startDemo: () => { state = S.DEAL; timer = 0; },
      stopDemo: () => { state = S.IDLE; timer = 0; hideAll(); }
    };

    // Auto-start demo after a short delay
    state = S.DEAL;
    timer = 0;

    log?.("pokerGameplay.module ✅ (demo loop)");
    this._runtime = { THREE, tableData, setLayout, S, get state(){return state;}, set state(v){state=v;}, get timer(){return timer;}, set timer(v){timer=v;}, sfx, hideAll, dealAllSeats, showFlop, showTurn, showRiver, seatCount };
  },

  update(dt) {
    const r = this._runtime;
    if (!r) return;

    r.timer += dt;

    // keep layout stable if tableData changes later
    // (cheap: update once in a while)
    if ((performance.now() % 1000) < 16) r.setLayout();

    const S = r.S;

    // update active seat highlight
    if (window.SCARLETT?.avatarUI) {
      window.SCARLETT.avatarUI.activeSeat = Math.floor((performance.now() / 1200) % r.seatCount);
    }

    // Demo pacing
    const beat = 1.1;

    if (r.state === S.DEAL && r.timer > 0.3) {
      r.hideAll();
      r.dealAllSeats();
      r.sfx("card");
      r.timer = 0;
      r.state = S.FLOP;
      window.SCARLETT.poker.state = "FLOP_WAIT";
      return;
    }

    if (r.state === S.FLOP && r.timer > beat) {
      r.showFlop();
      r.sfx("card");
      r.timer = 0;
      r.state = S.TURN;
      window.SCARLETT.poker.state = "TURN_WAIT";
      return;
    }

    if (r.state === S.TURN && r.timer > beat) {
      r.showTurn();
      r.sfx("card");
      r.timer = 0;
      r.state = S.RIVER;
      window.SCARLETT.poker.state = "RIVER_WAIT";
      return;
    }

    if (r.state === S.RIVER && r.timer > beat) {
      r.showRiver();
      r.sfx("card");
      r.timer = 0;
      r.state = S.SHOW;
      window.SCARLETT.poker.state = "SHOW";
      return;
    }

    if (r.state === S.SHOW && r.timer > 1.8) {
      // simulate chips to pot + vacuum
      r.sfx("chip");
      setTimeout(() => r.sfx("vacuum"), 250);
      r.timer = 0;
      r.state = S.RESET;
      window.SCARLETT.poker.state = "RESET_WAIT";
      return;
    }

    if (r.state === S.RESET && r.timer > 1.6) {
      r.hideAll();
      r.timer = 0;
      r.state = S.DEAL; // loop
      window.SCARLETT.poker.state = "DEAL_WAIT";
      return;
    }
  },

  test() {
    const ok = !!window.SCARLETT?.poker?.root;
    return { ok, note: ok ? "gameplay present (demo running)" : "gameplay missing" };
  }
};
