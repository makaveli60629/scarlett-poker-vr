// /js/dealingMix.js — Scarlett DealingMix v2.4 (TABLE HOLE + HOVER REFLECTION)
// ✅ Hole cards dealt ON TABLE per seat
// ✅ Hover “reflection” copies above table hole cards (facing camera)
// ✅ Flop shows 3, then Turn 1, River 1 (hidden remain "??")
// ✅ Winner hole cards fly FROM TABLE spot → community slots to form best 5
// ✅ Keeps existing HUDs + does not remove your world

export const DealingMix = (() => {
  let THREE, scene, log, world;

  const SUIT_CH = ["♠","♥","♦","♣"];
  const RANK_CH = { 11:"J", 12:"Q", 13:"K", 14:"A" };

  const S = {
    t: 0,
    root: null,
    tableHud: null,
    potHud: null,
    winnerHud: null,

    comm: [],                 // 5 community display cards
    seatTableHoles: [],       // [seat 1..6] = [mesh, mesh] ON TABLE
    seatHoverHoles: [],       // [seat 1..6] = [mesh, mesh] HOVER copies
    seatHoleLabels: [],

    pot: 0,
    street: "PREFLOP",
    action: "—",

    // reveal control
    revealCount: 0,            // how many community cards are face-up (0..5)

    // animations
    dealAnims: [],             // dealer -> targets
    winnerAnims: [],           // hole -> comm at showdown

    // optional presentation toggles (safe)
    presentation: {
      holeCardsOnTable: true,
      hoverReflection: true,
      flopStyle: "3-then-1-then-1",
      winnerRevealFlyToCommunity: true
    }
  };

  function cardLabel(c) {
    if (!c) return "??";
    if (typeof c === "string") return c;
    const r = RANK_CH[c.r] || String(c.r);
    const s = SUIT_CH[c.s] || "?";
    return r + s;
  }

  function makeCanvasTex(drawFn, w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    drawFn(ctx, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return { tex, canvas: c, ctx, drawFn, w, h };
  }

  function hudPlane(drawFn, w, h, sw, sh) {
    const H = makeCanvasTex(drawFn, w, h);
    const mat = new THREE.MeshBasicMaterial({ map: H.tex, transparent: true, depthTest: false, opacity: 0.95 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), mat);
    mesh.renderOrder = 200;
    mesh.userData._hud = H;
    return mesh;
  }

  function redraw(mesh) {
    const H = mesh.userData._hud;
    H.drawFn(H.ctx, H.w, H.h);
    H.tex.needsUpdate = true;
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

  function drawTableHud(ctx, W, H) {
    ctx.clearRect(0,0,W,H);

    ctx.fillStyle = "rgba(8,10,16,0.72)";
    rounded(ctx, 30, 40, W-60, H-80, 40);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 60px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Scarlett Poker • 6-Max", 70, 70);

    ctx.fillStyle = "#7fe7ff";
    ctx.font = "bold 54px Arial";
    ctx.fillText(`${S.street}`, 70, 150);

    ctx.fillStyle = "#e8ecff";
    ctx.font = "bold 58px Arial";
    ctx.fillText(`Pot: $${(S.pot||0).toLocaleString()}`, 70, 225);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    rounded(ctx, 70, 305, W-140, 145, 30);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 78px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${S.action}`, W/2, 378);
  }

  function drawPotHud(ctx, W, H) {
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    rounded(ctx, 20, 20, W-40, H-40, 36);
    ctx.fill();
    ctx.fillStyle = "#b200ff";
    ctx.font = "bold 96px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`$${(S.pot||0).toLocaleString()}`, W/2, H/2);
  }

  function drawWinner(text) {
    return (ctx, W, H) => {
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      rounded(ctx, 20, 20, W-40, H-40, 36);
      ctx.fill();
      ctx.fillStyle = "#ffcc00";
      ctx.font = "bold 64px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, W/2, H/2);
    };
  }

  function makeCardMesh(label="??") {
    const H = makeCanvasTex((ctx,W,HH)=>{
      ctx.clearRect(0,0,W,HH);
      ctx.fillStyle="#f8f8f8"; ctx.fillRect(0,0,W,HH);
      ctx.strokeStyle="rgba(0,0,0,0.22)"; ctx.lineWidth=10; ctx.strokeRect(10,10,W-20,HH-20);

      const red = label.includes("♥") || label.includes("♦");
      ctx.fillStyle = red ? "#b6001b" : "#111";

      ctx.font="bold 110px Arial";
      ctx.textAlign="left"; ctx.textBaseline="top";
      ctx.fillText(label, 28, 18);

      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.font="bold 240px Arial";
      ctx.fillText(label.slice(-1), W/2, HH/2+10);
    }, 512, 712);

    const mat = new THREE.MeshStandardMaterial({
      map: H.tex,
      roughness: 0.55,
      emissive: 0x111111,
      emissiveIntensity: 0.20,
      side: THREE.DoubleSide,
      transparent: false,
      opacity: 1.0,
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.50), mat);
    mesh.userData._hud = H;
    mesh.userData._label = label;
    mesh.renderOrder = 120;
    return mesh;
  }

  function cloneHover(mesh) {
    const h = makeCardMesh(mesh.userData?._label || "??");
    h.scale.copy(mesh.scale);
    h.position.copy(mesh.position);
    // hologram vibe
    h.material.transparent = true;
    h.material.opacity = 0.55;
    h.material.emissive = new THREE.Color(0x223344);
    h.material.emissiveIntensity = 0.45;
    return h;
  }

  function setCard(mesh, label) {
    if (!mesh) return;
    const H = mesh.userData._hud;
    if (mesh.userData._label === label) return;
    mesh.userData._label = label;

    H.drawFn = (ctx,W,HH)=>{
      ctx.clearRect(0,0,W,HH);
      ctx.fillStyle="#f8f8f8"; ctx.fillRect(0,0,W,HH);
      ctx.strokeStyle="rgba(0,0,0,0.22)"; ctx.lineWidth=10; ctx.strokeRect(10,10,W-20,HH-20);

      const red = label.includes("♥") || label.includes("♦");
      ctx.fillStyle = red ? "#b6001b" : "#111";

      ctx.font="bold 110px Arial";
      ctx.textAlign="left"; ctx.textBaseline="top";
      ctx.fillText(label, 28, 18);

      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.font="bold 240px Arial";
      ctx.fillText(label.slice(-1), W/2, HH/2+10);
    };
    redraw(mesh);
  }

  // Seat table positions (front of each seat, ON TABLE)
  function seatTablePos(seatIndex, tf, ty) {
    // stable angles around table — tweak if you rotate seating layout
    const angles = [-0.2, 0.55, 1.35, 2.25, 3.05, 3.85];
    const a = angles[(seatIndex-1) % 6];

    // table radius + offset inward
    const r = 1.55;
    const x = tf.x + Math.cos(a) * r;
    const z = tf.z + Math.sin(a) * r;

    // cards on felt surface
    const y = ty + 0.03;
    return new THREE.Vector3(x, y, z);
  }

  function dealerOrigin(tf, ty) {
    // dealer "hand" origin above table center
    return new THREE.Vector3(tf.x, ty + 0.95, tf.z + 0.18);
  }

  function init({ THREE: _T, scene: _S, log: _L, world: _W } = {}) {
    THREE = _T; scene = _S; log = _L || console.log; world = _W || {};

    if (S.root) { try { scene.remove(S.root); } catch {} }
    S.root = new THREE.Group();
    S.root.name = "DealingMixRoot";
    scene.add(S.root);

    // IMPORTANT: we use world.tableFocus + world.tableY if present
    const tf = world.tableFocus || new THREE.Vector3(0,0,-6.5);
    const ty = world.tableY || 0.92;

    // HUDs
    S.tableHud = hudPlane(drawTableHud, 1400, 520, 2.7, 0.92);
    S.tableHud.position.set(tf.x, ty + 1.65, tf.z - 0.22);
    S.root.add(S.tableHud);

    S.potHud = hudPlane(drawPotHud, 700, 260, 0.95, 0.36);
    S.potHud.position.set(tf.x, ty + 0.55, tf.z);
    S.potHud.material.opacity = 0.12;
    S.root.add(S.potHud);

    S.winnerHud = hudPlane(drawWinner(""), 1200, 260, 2.0, 0.46);
    S.winnerHud.position.set(tf.x, ty + 1.20, tf.z + 0.85);
    S.winnerHud.material.opacity = 0.0;
    S.root.add(S.winnerHud);

    // Community row (5) near table center
    S.comm.length = 0;
    for (let i=0;i<5;i++){
      const c = makeCardMesh("??");
      c.position.set(tf.x + (i-2)*0.44, ty + 0.55, tf.z - 0.15);
      c.rotation.x = -Math.PI / 2;
      S.root.add(c);
      S.comm.push(c);
    }

    // Seat hole cards ON TABLE + hover reflections above them
    S.seatTableHoles = [];
    S.seatHoverHoles = [];
    S.seatHoleLabels = [];

    for (let seat=1; seat<=6; seat++) {
      const p = seatTablePos(seat, tf, ty);

      // base table cards
      const c0 = makeCardMesh("??");
      const c1 = makeCardMesh("??");
      c0.scale.setScalar(0.62);
      c1.scale.setScalar(0.62);

      c0.position.copy(p).add(new THREE.Vector3(-0.10, 0.0, 0.00));
      c1.position.copy(p).add(new THREE.Vector3( 0.10, 0.0, 0.00));

      // lay flat on table
      c0.rotation.x = -Math.PI/2;
      c1.rotation.x = -Math.PI/2;

      S.root.add(c0, c1);
      S.seatTableHoles[seat] = [c0, c1];

      // hover copies
      const h0 = cloneHover(c0);
      const h1 = cloneHover(c1);
      h0.position.copy(c0.position).add(new THREE.Vector3(0, 0.18, 0));
      h1.position.copy(c1.position).add(new THREE.Vector3(0, 0.18, 0));
      S.root.add(h0, h1);
      S.seatHoverHoles[seat] = [h0, h1];

      S.seatHoleLabels[seat] = ["??","??"];
    }

    // default reveal state
    S.revealCount = 0;
    S.dealAnims.length = 0;
    S.winnerAnims.length = 0;

    redraw(S.tableHud);
    redraw(S.potHud);

    log("[DealingMix] init ✅ v2.4");

    // ---- public hooks ----
    function setPot(p) { S.pot = p|0; redraw(S.tableHud); redraw(S.potHud); }
    function setStreet(st) { S.street = st || "—"; redraw(S.tableHud); }
    function setAction(a) { S.action = a || "—"; redraw(S.tableHud); }

    // Optional: allow main to toggle presentation
    function setPresentation(p) {
      S.presentation = { ...S.presentation, ...(p||{}) };
    }

    // "Deal" events from PokerSim
    function onDeal(d) {
      if (!d) return;

      const tf = world.tableFocus || new THREE.Vector3(0,0,-6.5);
      const ty = world.tableY || 0.92;
      const origin = dealerOrigin(tf, ty);

      if (d.type === "HOLE") {
        setStreet("PREFLOP");
        setAction("DEALING");
        S.revealCount = 0;

        // reset community
        for (let i=0;i<5;i++) setCard(S.comm[i], "??");
        S.winnerHud.material.opacity = 0.0;

        // set hole cards on table (REAL labels) — and animate dealer->seat
        for (const h of (d.hole || [])) {
          const seat = (h.seat|0) + 1;
          const cards = h.cards || ["??","??"];
          const base = S.seatTableHoles[seat];
          const hov  = S.seatHoverHoles[seat];
          if (!base || !hov) continue;

          setCard(base[0], cards[0] || "??");
          setCard(base[1], cards[1] || "??");
          setCard(hov[0],  cards[0] || "??");
          setCard(hov[1],  cards[1] || "??");
          S.seatHoleLabels[seat] = [cards[0]||"??", cards[1]||"??"];

          // kick off deal fly anims (dealer -> base cards)
          // we animate temporary flying copies so the target cards remain stable
          spawnDealFly(origin, base[0].position, cards[0] || "??");
          spawnDealFly(origin, base[1].position, cards[1] || "??", 0.08);
        }
        return;
      }

      // Community reveal control (flop 3, turn 4, river 5)
      if (d.type === "FLOP") { setStreet("FLOP"); setAction("FLOP"); S.revealCount = 3; }
      if (d.type === "TURN") { setStreet("TURN"); setAction("TURN"); S.revealCount = 4; }
      if (d.type === "RIVER"){ setStreet("RIVER"); setAction("RIVER"); S.revealCount = 5; }

      const c = d.communityRaw || [];
      for (let i=0;i<5;i++) {
        if (i < S.revealCount) setCard(S.comm[i], cardLabel(c[i]));
        else setCard(S.comm[i], "??");
      }

      // add a dealer->community fly animation for the newly revealed card(s)
      if (d.type === "FLOP") {
        spawnDealFly(origin, S.comm[0].position.clone(), cardLabel(c[0] || "??"), 0.00, true);
        spawnDealFly(origin, S.comm[1].position.clone(), cardLabel(c[1] || "??"), 0.06, true);
        spawnDealFly(origin, S.comm[2].position.clone(), cardLabel(c[2] || "??"), 0.12, true);
      } else if (d.type === "TURN") {
        spawnDealFly(origin, S.comm[3].position.clone(), cardLabel(c[3] || "??"), 0.06, true);
      } else if (d.type === "RIVER") {
        spawnDealFly(origin, S.comm[4].position.clone(), cardLabel(c[4] || "??"), 0.06, true);
      }
    }

    function onBlinds() {
      setStreet("PREFLOP");
      setAction("BLINDS");
    }

    function onAction(a) {
      if (!a) return;
      if (a.type === "FOLD") setAction(`${a.name} FOLDS`);
      if (a.type === "BET")  setAction(`${a.name} BETS $${a.amount}`);
      if (a.type === "CALL") setAction(`${a.name} CALLS $${a.amount}`);
      if (a.type === "RAISE")setAction(`${a.name} RAISES $${a.amount}`);
      if (a.type === "ALLIN")setAction(`${a.name} ALL-IN $${a.amount}`);
    }

    // Winner: combine best5; HOLE cards should fly FROM TABLE to community slots
    function onShowdown(sd) {
      const w = sd?.winners?.[0];
      if (!w) return;

      const text = `${w.name} WINS • ${w.handName}`;
      S.winnerHud.userData._hud.drawFn = drawWinner(text);
      redraw(S.winnerHud);
      S.winnerHud.material.opacity = 0.95;

      setStreet("SHOWDOWN");
      setAction("SHOWDOWN");

      const detailed = w.best5Detailed;
      if (!Array.isArray(detailed) || detailed.length !== 5) {
        const labels = w.best5 || [];
        for (let i=0;i<5;i++) setCard(S.comm[i], labels[i] || "??");
        setTimeout(() => { if (S.winnerHud) S.winnerHud.material.opacity = 0.0; }, 2800);
        return;
      }

      // Step 1: set community COMM cards immediately; HOLE slots become ?? until fly lands
      for (let i=0;i<5;i++){
        const di = detailed[i];
        if (di.from === "COMM") setCard(S.comm[i], di.label);
        else setCard(S.comm[i], "??");
      }

      S.winnerAnims.length = 0;
      const winnerSeat = (w.seat|0) + 1;
      const base = S.seatTableHoles[winnerSeat];
      if (!base) return;

      for (let slot=0; slot<5; slot++) {
        const di = detailed[slot];
        if (di.from !== "HOLE") continue;

        const holeIdx = di.index; // 0 or 1
        const srcMesh = base[holeIdx];
        if (!srcMesh) continue;

        const start = srcMesh.position.clone();
        const end = S.comm[slot].position.clone().add(new THREE.Vector3(0, 0.08, 0));

        const fly = makeCardMesh(di.label);
        fly.scale.copy(srcMesh.scale);
        fly.position.copy(start);
        fly.rotation.x = 0; // faces camera during flight
        S.root.add(fly);

        S.winnerAnims.push({
          mesh: fly,
          t: -0.06 * slot,      // slight stagger
          dur: 0.70,
          a: start.clone(),
          b: end.clone(),
          label: di.label,
          slot
        });
      }

      setTimeout(() => { if (S.winnerHud) S.winnerHud.material.opacity = 0.0; }, 3200);
    }

    function showFinished(payload) {
      const text = `FINISHED • ${payload?.handsPlayed||0} HANDS`;
      S.winnerHud.userData._hud.drawFn = drawWinner(text);
      redraw(S.winnerHud);
      S.winnerHud.material.opacity = 0.95;
      setAction("PAUSED");
    }

    function spawnDealFly(fromPos, toPos, label, delaySec = 0, isComm = false) {
      const fly = makeCardMesh(label);
      fly.scale.setScalar(isComm ? 0.90 : 0.62);
      fly.position.copy(fromPos);
      fly.rotation.x = 0;
      fly.material.transparent = true;
      fly.material.opacity = 0.95;
      fly.material.emissiveIntensity = 0.35;

      S.root.add(fly);

      S.dealAnims.push({
        mesh: fly,
        t: -Math.max(0, delaySec),
        dur: isComm ? 0.55 : 0.60,
        a: fromPos.clone(),
        b: toPos.clone().add(new THREE.Vector3(0, 0.08, 0)),
      });
    }

    function update(dt) {
      S.t += dt;
      const cam = world?.cameraRef;
      if (!cam?.position) return;

      // HUD faces player
      S.tableHud.lookAt(cam.position.x, S.tableHud.position.y, cam.position.z);
      S.winnerHud.lookAt(cam.position.x, S.winnerHud.position.y, cam.position.z);

      // Community cards: slight hover + face player
      for (let i=0;i<S.comm.length;i++){
        const c = S.comm[i];
        c.position.y = (world.tableY || 0.92) + 0.55 + Math.sin(S.t*2 + i)*0.02;
        c.lookAt(cam.position.x, c.position.y, cam.position.z);
        c.rotation.x = 0;
      }

      // Hole cards on table stay flat; hover reflections face camera
      const tf = world.tableFocus || new THREE.Vector3(0,0,-6.5);
      const ty = world.tableY || 0.92;

      for (let seat=1; seat<=6; seat++) {
        const p = seatTablePos(seat, tf, ty);
        const base = S.seatTableHoles[seat];
        const hov  = S.seatHoverHoles[seat];
        if (!base || !hov) continue;

        // keep table cards anchored (in case world shifts slightly)
        base[0].position.lerp(p.clone().add(new THREE.Vector3(-0.10, 0.0, 0.00)), 0.08);
        base[1].position.lerp(p.clone().add(new THREE.Vector3( 0.10, 0.0, 0.00)), 0.08);
        base[0].rotation.x = -Math.PI/2;
        base[1].rotation.x = -Math.PI/2;

        // hover copies float a bit and face camera
        const bob0 = Math.sin(S.t*2.2 + seat) * 0.015;
        const bob1 = Math.sin(S.t*2.2 + seat + 1) * 0.015;
        hov[0].position.copy(base[0].position).add(new THREE.Vector3(0, 0.18 + bob0, 0));
        hov[1].position.copy(base[1].position).add(new THREE.Vector3(0, 0.18 + bob1, 0));
        hov[0].lookAt(cam.position.x, hov[0].position.y, cam.position.z);
        hov[1].lookAt(cam.position.x, hov[1].position.y, cam.position.z);
        hov[0].rotation.x = 0;
        hov[1].rotation.x = 0;

        // allow toggle
        hov[0].visible = !!S.presentation.hoverReflection;
        hov[1].visible = !!S.presentation.hoverReflection;
        base[0].visible = !!S.presentation.holeCardsOnTable;
        base[1].visible = !!S.presentation.holeCardsOnTable;
      }

      // Pot HUD “look-to-reveal”
      const potPos = S.potHud.position.clone();
      const toPot = potPos.sub(cam.position).normalize();
      const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(cam.quaternion).normalize();
      const dot = fwd.dot(toPot);
      const reveal = Math.max(0, Math.min(1, (dot - 0.90) / 0.08));
      const targetOpacity = 0.08 + reveal * 0.92;
      S.potHud.material.opacity += (targetOpacity - S.potHud.material.opacity) * 0.12;
      S.potHud.lookAt(cam.position.x, S.potHud.position.y, cam.position.z);

      // Deal animations (dealer -> target)
      for (let i=S.dealAnims.length-1;i>=0;i--){
        const A = S.dealAnims[i];
        A.t += dt;
        if (A.t < 0) continue;
        const k = Math.min(1, A.t / A.dur);
        const s = k*k*(3-2*k);
        A.mesh.position.lerpVectors(A.a, A.b, s);
        A.mesh.lookAt(cam.position.x, A.mesh.position.y, cam.position.z);
        A.mesh.rotation.x = 0;

        if (k >= 1) {
          try { S.root.remove(A.mesh); } catch {}
          S.dealAnims.splice(i,1);
        }
      }

      // Winner hole->community fly in
      for (let i=S.winnerAnims.length-1;i>=0;i--){
        const A = S.winnerAnims[i];
        A.t += dt;
        if (A.t < 0) continue;
        const k = Math.min(1, A.t / A.dur);
        const s = k*k*(3-2*k);
        A.mesh.position.lerpVectors(A.a, A.b, s);
        A.mesh.lookAt(cam.position.x, A.mesh.position.y, cam.position.z);
        A.mesh.rotation.x = 0;

        if (k >= 1) {
          setCard(S.comm[A.slot], A.label);
          try { S.root.remove(A.mesh); } catch {}
          S.winnerAnims.splice(i,1);
        }
      }
    }

    return {
      update,
      setPot, setStreet, setAction,
      setPresentation,
      onDeal, onAction, onBlinds, onShowdown,
      showFinished
    };
  }

  return { init };
})();
