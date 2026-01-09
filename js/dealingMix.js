// /js/dealingMix.js — Scarlett DealingMix v2.0
// - Real deck shuffle + deal (6-max)
// - Flop/Turn/River timing loop
// - Simple 7-card evaluator chooses real winner
// - Community cards ALWAYS face player + hover
// - Chips smaller/skinnier
// - Pot HUD: smaller plane, transparent, bright PURPLE number

export const DealingMix = (() => {
  let THREE, scene, log, world;

  const state = {
    t: 0,
    root: null,
    tableHud: null,
    potHud: null,
    comm: [],
    chipPile: null,
    dealerButton: null,

    pot: 150,
    current: "LUNA",
    actionText: "CHECK",

    deck: [],
    players: [],     // [{name, hole:[c,c]}]
    stage: "idle",   // preflop/flop/turn/river/showdown
    timer: 0,
    showdownTimer: 0,
    winner: null,
  };

  // ---------- HUD helpers ----------
  function makeCanvasTex(drawFn, w = 1024, h = 512) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    drawFn(ctx, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    return { tex, canvas: c, ctx };
  }

  function makeHudPlane(drawFn, w, h, scaleW, scaleH, opacity=0.95) {
    const { tex, canvas, ctx } = makeCanvasTex(drawFn, w, h);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, opacity });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(scaleW, scaleH), mat);
    mesh.renderOrder = 200;
    mesh.userData._hud = { tex, canvas, ctx, w, h, drawFn };
    return mesh;
  }

  function redraw(mesh) {
    const h = mesh.userData._hud;
    h.drawFn(h.ctx, h.w, h.h);
    h.tex.needsUpdate = true;
  }

  function rounded(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
  }

  function tableHudDraw(ctx, W, H) {
    ctx.clearRect(0,0,W,H);

    ctx.fillStyle = "rgba(8,10,16,0.68)";
    rounded(ctx, 30, 40, W-60, H-80, 40);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 60px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Scarlett Poker • 6-Max • $10,000 Table", 70, 70);

    ctx.fillStyle = "#e8ecff";
    ctx.font = "bold 56px Arial";
    ctx.fillText(`Pot: $${state.pot.toLocaleString()}`, 70, 170);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 56px Arial";
    ctx.fillText(`Stage: ${state.stage.toUpperCase()}`, 70, 245);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    rounded(ctx, 70, 320, W-140, 130, 30);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 78px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${state.actionText}`, W/2, 385);
  }

  function potHudDraw(ctx, W, H) {
    ctx.clearRect(0,0,W,H);

    // transparent background (subtle)
    ctx.fillStyle = "rgba(0,0,0,0.20)";
    rounded(ctx, 12, 12, W-24, H-24, 26);
    ctx.fill();

    ctx.fillStyle = "#b200ff"; // PURPLE
    ctx.font = "bold 120px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`$${state.pot.toLocaleString()}`, W/2, H/2);
  }

  // ---------- Cards ----------
  const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
  const SUITS = ["♠","♥","♦","♣"];
  const rankValue = (r)=> RANKS.indexOf(r)+2;

  function makeDeck() {
    const d = [];
    for (const r of RANKS) for (const s of SUITS) d.push({ r, s });
    return d;
  }
  function shuffle(a) {
    for (let i=a.length-1;i>0;i--){
      const j = (Math.random()*(i+1))|0;
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  function makeCardMesh(card) {
    const { r, s } = card;
    const texObj = makeCanvasTex((ctx,W,H)=>{
      ctx.fillStyle="#f7f7f7"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(0,0,0,0.22)"; ctx.lineWidth=10; ctx.strokeRect(10,10,W-20,H-20);

      const red = (s==="♥"||s==="♦");
      ctx.fillStyle = red ? "#b6001b" : "#111";

      ctx.font="bold 110px Arial";
      ctx.textAlign="left"; ctx.textBaseline="top";
      ctx.fillText(r, 28, 18);
      ctx.font="bold 128px Arial";
      ctx.fillText(s, 28, 140);

      ctx.textAlign="right"; ctx.textBaseline="bottom";
      ctx.font="bold 110px Arial";
      ctx.fillText(r, W-28, H-140);
      ctx.font="bold 128px Arial";
      ctx.fillText(s, W-28, H-22);

      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.font="bold 240px Arial";
      ctx.fillText(s, W/2, H/2+10);
    }, 512, 712);

    const mat = new THREE.MeshStandardMaterial({
      map: texObj.tex,
      roughness: 0.55,
      emissive: 0x111111,
      emissiveIntensity: 0.18,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.50), mat);
    mesh.renderOrder = 100;
    mesh.userData.card = card;
    return mesh;
  }

  // ---------- Chips (smaller/skinnier) ----------
  function makeChip(color=0xff2d7a) {
    const geo = new THREE.CylinderGeometry(0.045, 0.045, 0.010, 28); // ✅ smaller
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.15,
      emissive: color,
      emissiveIntensity: 0.05
    });
    return new THREE.Mesh(geo, mat);
  }

  function makeDealerButton() {
    const geo = new THREE.CylinderGeometry(0.075, 0.075, 0.016, 36); // ✅ smaller
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.45,
      metalness: 0.12,
      emissive: 0x222222,
      emissiveIntensity: 0.2
    });
    return new THREE.Mesh(geo, mat);
  }

  // ---------- 7-card evaluator (basic but real) ----------
  function eval7(cards) {
    // returns {rank:number, kickers:number[], name:string, best5:card[]}
    // rank order: 8 SF,7 4K,6 FH,5 F,4 S,3 3K,2 2P,1 1P,0 HC
    const bySuit = new Map();
    const vals = cards.map(c=>rankValue(c.r)).sort((a,b)=>b-a);

    // suit buckets
    for (const c of cards) {
      if (!bySuit.has(c.s)) bySuit.set(c.s, []);
      bySuit.get(c.s).push(c);
    }

    // counts
    const counts = new Map();
    for (const v of vals) counts.set(v, (counts.get(v)||0)+1);
    const groups = [...counts.entries()].sort((a,b)=> b[1]-a[1] || b[0]-a[0]); // by count then rank

    // straight helper
    function bestStraight(uniqueVals) {
      const u = [...new Set(uniqueVals)].sort((a,b)=>b-a);
      // wheel A-5
      const hasA = u.includes(14);
      const u2 = hasA ? [...u, 1] : u;

      for (let i=0;i<u2.length;i++){
        const start = u2[i];
        const run = [start];
        for (let k=1;k<5;k++){
          if (u2.includes(start-k)) run.push(start-k);
          else break;
        }
        if (run.length===5) return Math.max(...run); // high card of straight
      }
      return null;
    }

    // flush?
    let flushSuit = null;
    for (const [s, arr] of bySuit.entries()) if (arr.length>=5) { flushSuit=s; break; }

    // straight flush?
    if (flushSuit) {
      const fVals = bySuit.get(flushSuit).map(c=>rankValue(c.r));
      const sfHigh = bestStraight(fVals);
      if (sfHigh) {
        return { rank: 8, kickers:[sfHigh], name:"Straight Flush", best5:[] };
      }
    }

    // four / full house / trips / pairs
    const top = groups[0];
    const second = groups[1];

    if (top[1]===4) {
      const quad = top[0];
      const kicker = groups.find(g=>g[0]!==quad)?.[0] ?? 0;
      return { rank: 7, kickers:[quad,kicker], name:"Four of a Kind", best5:[] };
    }

    if (top[1]===3 && second && second[1]>=2) {
      return { rank: 6, kickers:[top[0], second[0]], name:"Full House", best5:[] };
    }

    if (flushSuit) {
      const f = bySuit.get(flushSuit).map(c=>rankValue(c.r)).sort((a,b)=>b-a).slice(0,5);
      return { rank: 5, kickers:f, name:"Flush", best5:[] };
    }

    const sHigh = bestStraight(vals);
    if (sHigh) return { rank: 4, kickers:[sHigh], name:"Straight", best5:[] };

    if (top[1]===3) {
      const kick = groups.filter(g=>g[1]===1).map(g=>g[0]).slice(0,2);
      return { rank: 3, kickers:[top[0], ...kick], name:"Three of a Kind", best5:[] };
    }

    if (top[1]===2 && second && second[1]===2) {
      const hi = Math.max(top[0], second[0]);
      const lo = Math.min(top[0], second[0]);
      const k = groups.find(g=>g[1]===1)?.[0] ?? 0;
      return { rank: 2, kickers:[hi,lo,k], name:"Two Pair", best5:[] };
    }

    if (top[1]===2) {
      const kick = groups.filter(g=>g[1]===1).map(g=>g[0]).slice(0,3);
      return { rank: 1, kickers:[top[0], ...kick], name:"One Pair", best5:[] };
    }

    return { rank: 0, kickers: vals.slice(0,5), name:"High Card", best5:[] };
  }

  function compareEval(a,b) {
    if (a.rank!==b.rank) return a.rank-b.rank;
    for (let i=0;i<Math.max(a.kickers.length,b.kickers.length);i++){
      const av=a.kickers[i]||0, bv=b.kickers[i]||0;
      if (av!==bv) return av-bv;
    }
    return 0;
  }

  // ---------- lifecycle ----------
  function init({ THREE: _T, scene: _S, log: _L, world: _W } = {}) {
    THREE = _T; scene = _S; log = _L || console.log; world = _W || {};

    if (state.root) { try { scene.remove(state.root); } catch {} }
    state.root = new THREE.Group();
    state.root.name = "DealingMixRoot";
    scene.add(state.root);

    const tf = world.tableFocus || new THREE.Vector3(0,0,-6.5);
    const tableY = world.tableY || 0.92;

    // big header HUD (keep as you like)
    state.tableHud = makeHudPlane(tableHudDraw, 1400, 520, 2.6, 0.90, 0.95);
    state.tableHud.position.set(tf.x, tableY + 1.55, tf.z - 0.20);
    state.root.add(state.tableHud);

    // small pot HUD (purple text)
    state.potHud = makeHudPlane(potHudDraw, 520, 220, 0.72, 0.30, 0.55);
    state.potHud.position.set(tf.x + 1.55, tableY + 0.45, tf.z + 0.15); // ✅ to side near chips
    state.root.add(state.potHud);

    // community meshes (create placeholders; we’ll replace per hand)
    state.comm.length = 0;
    for (let i=0;i<5;i++){
      const c = makeCardMesh({r:"?",s:"?"});
      c.position.set(tf.x + (i-2)*0.44, tableY + 0.55, tf.z - 0.15);
      state.root.add(c);
      state.comm.push(c);
    }

    // chip pile
    state.chipPile = new THREE.Group();
    for (let i=0;i<24;i++){
      const col = (i%3===0)?0xff2d7a:(i%3===1)?0x7fe7ff:0xffcc00;
      const chip = makeChip(col);
      chip.position.set((Math.random()-0.5)*0.12, tableY + 0.010 + i*0.010, (Math.random()-0.5)*0.12);
      state.chipPile.add(chip);
    }
    state.chipPile.position.set(tf.x + 1.25, 0, tf.z + 0.05);
    state.root.add(state.chipPile);

    state.dealerButton = makeDealerButton();
    state.dealerButton.position.set(tf.x + 0.95, tableY + 0.010, tf.z + 0.75);
    state.root.add(state.dealerButton);

    log("[DealingMix] init ✅");
    startHand();

    return { startHand, update, root: state.root };
  }

  function startHand() {
    // build players based on seats if available
    const names = ["LUNA","NOVA","ECHO","JADE","ORION","MAV"];
    state.players = names.map(n=>({ name:n, hole:[] }));

    state.deck = shuffle(makeDeck());
    state.stage = "preflop";
    state.timer = 0;
    state.showdownTimer = 0;
    state.winner = null;

    // deal hole (2 cards each)
    for (let r=0;r<2;r++){
      for (let i=0;i<state.players.length;i++){
        state.players[i].hole.push(state.deck.pop());
      }
    }

    // community hidden initially
    state.community = [];
    state.pot = 150;
    state.actionText = "DEALING…";

    redraw(state.tableHud);
    redraw(state.potHud);

    // update community meshes to backs/unknown
    for (let i=0;i<5;i++){
      const old = state.comm[i];
      const pos = old.position.clone();
      scene.remove(old);
      const m = makeCardMesh({r:"?",s:"?"});
      m.position.copy(pos);
      state.root.add(m);
      state.comm[i]=m;
    }
  }

  function revealCommunity(n) {
    // ensure community has 5 drawn from deck
    while (state.community.length < 5) state.community.push(state.deck.pop());

    for (let i=0;i<n;i++){
      const card = state.community[i];
      const old = state.comm[i];
      const pos = old.position.clone();
      state.root.remove(old);

      const m = makeCardMesh(card);
      m.position.copy(pos);
      state.root.add(m);
      state.comm[i]=m;
    }
  }

  function pickWinner() {
    // evaluate 7 cards per player
    let best = null;
    for (const p of state.players) {
      const all = [...p.hole, ...state.community];
      const e = eval7(all);
      const entry = { p, e };
      if (!best || compareEval(entry.e, best.e) > 0) best = entry;
    }
    state.winner = best;
    return best;
  }

  function update(dt) {
    state.t += dt;

    const cam = world?.cameraRef;
    if (!cam?.position) return;

    // Face player
    state.tableHud.lookAt(cam.position.x, state.tableHud.position.y, cam.position.z);
    state.potHud.lookAt(cam.position.x, state.potHud.position.y, cam.position.z);

    // Community hover + face player
    for (let i=0;i<state.comm.length;i++){
      const c = state.comm[i];
      c.position.y = (world.tableY || 0.92) + 0.55 + Math.sin(state.t*2 + i)*0.02;
      c.lookAt(cam.position.x, c.position.y, cam.position.z);
      c.rotation.x = 0;
    }

    state.timer += dt;

    // street timing
    if (state.stage === "preflop" && state.timer > 1.2) {
      state.stage = "flop";
      state.timer = 0;
      state.actionText = "FACE OFF";
      revealCommunity(3);
    }
    else if (state.stage === "flop" && state.timer > 2.0) {
      state.stage = "turn";
      state.timer = 0;
      state.actionText = "TURN";
      revealCommunity(4);
    }
    else if (state.stage === "turn" && state.timer > 2.0) {
      state.stage = "river";
      state.timer = 0;
      state.actionText = "RIVER";
      revealCommunity(5);
    }
    else if (state.stage === "river" && state.timer > 2.0) {
      state.stage = "showdown";
      state.timer = 0;
      const w = pickWinner();
      state.actionText = `${w.p.name} WINS • ${w.e.name}`;
      state.showdownTimer = 0;

      // move winner hole cards near community briefly (visual proof)
      state._winnerCards = w.p.hole.map((card, idx) => {
        const m = makeCardMesh(card);
        const tf = world.tableFocus || new THREE.Vector3(0,0,-6.5);
        m.position.set(tf.x + (idx?1:-1)*0.25, (world.tableY||0.92)+0.80, tf.z + 0.35);
        state.root.add(m);
        return m;
      });
    }
    else if (state.stage === "showdown") {
      state.showdownTimer += dt;
      if (state.showdownTimer > 3.2) {
        // cleanup winner cards and restart
        for (const m of state._winnerCards || []) state.root.remove(m);
        state._winnerCards = null;
        startHand();
      }
    }

    // pot/ hud refresh
    if ((state.t % 0.25) < dt) {
      redraw(state.tableHud);
      redraw(state.potHud);
    }
  }

  return { init };
})();
