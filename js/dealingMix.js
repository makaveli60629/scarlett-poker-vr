// /js/dealingMix.js — Scarlett DealingMix v2.3 (SHOWDOWN COMBINE CARDS)
// ✅ Winner's HOLE cards fly to community slots to form the actual best 5-card hand
// ✅ Needs PokerSim v1.2 (best5Detailed)

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

    comm: [],            // 5 table/community display cards
    seatHoles: [],       // seatHoles[1..6] = [cardMesh, cardMesh]
    seatHoleLabels: [],  // last labels

    pot: 0,
    street: "PREFLOP",
    action: "—",

    chipAnims: [],
    winnerAnims: [],     // hole->slot animations at showdown
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
    const H = makeCanvasTex((ctx,W,H)=>{
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle="#f8f8f8"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(0,0,0,0.22)"; ctx.lineWidth=10; ctx.strokeRect(10,10,W-20,H-20);

      const red = label.includes("♥") || label.includes("♦");
      ctx.fillStyle = red ? "#b6001b" : "#111";

      ctx.font="bold 110px Arial";
      ctx.textAlign="left"; ctx.textBaseline="top";
      ctx.fillText(label, 28, 18);

      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.font="bold 240px Arial";
      ctx.fillText(label.slice(-1), W/2, H/2+10);
    }, 512, 712);

    const mat = new THREE.MeshStandardMaterial({
      map: H.tex,
      roughness: 0.55,
      emissive: 0x111111,
      emissiveIntensity: 0.20,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.50), mat);
    mesh.userData._hud = H;
    mesh.userData._label = label;
    mesh.renderOrder = 120;
    return mesh;
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

  // Seat “above head” positions (approx, stable)
  function seatHeadPos(seatIndex, tf) {
    const angles = [-0.2, 0.55, 1.35, 2.25, 3.05, 3.85];
    const a = angles[(seatIndex-1) % 6];
    const r = 2.55;
    // slightly outward from table
    const x = tf.x + Math.cos(a) * r;
    const z = tf.z + Math.sin(a) * r;
    const y = (world.tableY || 0.92) + 1.10; // above seated head
    return new THREE.Vector3(x, y, z);
  }

  function init({ THREE: _T, scene: _S, log: _L, world: _W } = {}) {
    THREE = _T; scene = _S; log = _L || console.log; world = _W || {};

    if (S.root) { try { scene.remove(S.root); } catch {} }
    S.root = new THREE.Group();
    S.root.name = "DealingMixRoot";
    scene.add(S.root);

    const tf = world.tableFocus || new THREE.Vector3(0,0,-6.5);
    const ty = world.tableY || 0.92;

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

    // Community row cards (5)
    S.comm.length = 0;
    for (let i=0;i<5;i++){
      const c = makeCardMesh("??");
      c.position.set(tf.x + (i-2)*0.44, ty + 0.55, tf.z - 0.15);
      S.root.add(c);
      S.comm.push(c);
    }

    // Hole cards above each seat head (2 cards)
    S.seatHoles = [];
    S.seatHoleLabels = [];
    for (let seat=1; seat<=6; seat++) {
      const p = seatHeadPos(seat, tf);
      const c0 = makeCardMesh("??");
      const c1 = makeCardMesh("??");
      c0.scale.setScalar(0.85);
      c1.scale.setScalar(0.85);
      c0.position.copy(p).add(new THREE.Vector3(-0.18, 0.02, 0));
      c1.position.copy(p).add(new THREE.Vector3( 0.18, 0.02, 0));
      S.root.add(c0, c1);
      S.seatHoles[seat] = [c0, c1];
      S.seatHoleLabels[seat] = ["??","??"];
    }

    redraw(S.tableHud);
    redraw(S.potHud);

    log("[DealingMix] init ✅");

    // ---- public hooks ----
    function setPot(p) { S.pot = p|0; redraw(S.tableHud); redraw(S.potHud); }
    function setStreet(st) { S.street = st || "—"; redraw(S.tableHud); }
    function setAction(a) { S.action = a || "—"; redraw(S.tableHud); }

    function onDeal(d) {
      if (!d) return;

      if (d.type === "HOLE") {
        setStreet("PREFLOP");
        setAction("DEALING");

        // set hole cards above heads (real labels)
        // d.hole = [{seat, cards:["As","Kd"]}]
        for (const h of (d.hole || [])) {
          const seat = (h.seat|0) + 1; // 0-based -> 1..6
          const cards = h.cards || ["??","??"];
          const m = S.seatHoles[seat];
          if (!m) continue;
          setCard(m[0], cards[0] || "??");
          setCard(m[1], cards[1] || "??");
          S.seatHoleLabels[seat] = [cards[0]||"??", cards[1]||"??"];
        }

        // reset community row to unknown
        for (let i=0;i<5;i++) setCard(S.comm[i], "??");
        // hide winner banner
        S.winnerHud.material.opacity = 0.0;
        return;
      }

      if (d.type === "FLOP") { setStreet("FLOP"); setAction("FLOP"); }
      if (d.type === "TURN") { setStreet("TURN"); setAction("TURN"); }
      if (d.type === "RIVER"){ setStreet("RIVER"); setAction("RIVER"); }

      // show community as it grows
      const c = d.communityRaw || [];
      for (let i=0;i<5;i++) setCard(S.comm[i], cardLabel(c[i]));
    }

    function onBlinds() {
      setStreet("PREFLOP");
      setAction("BLINDS");
    }

    function onAction(a) {
      if (!a) return;
      if (a.type === "FOLD") setAction(`${a.name} FOLDS`);
      if (a.type === "BET")  setAction(`${a.name} BETS $${a.amount}`);
    }

    // ✅ MAIN FEATURE: combine winning cards into the community row
    function onShowdown(sd) {
      const w = sd?.winners?.[0];
      if (!w) return;

      // Yellow banner still ok, but the actual “show hand” is the card combine
      const text = `${w.name} WINS • ${w.handName}`;
      S.winnerHud.userData._hud.drawFn = drawWinner(text);
      redraw(S.winnerHud);
      S.winnerHud.material.opacity = 0.95;

      setStreet("SHOWDOWN");
      setAction("SHOWDOWN");

      // If poker didn't provide detailed mapping, fallback to just show best5 as labels
      const detailed = w.best5Detailed;
      if (!Array.isArray(detailed) || detailed.length !== 5) {
        const labels = w.best5 || [];
        for (let i=0;i<5;i++) setCard(S.comm[i], labels[i] || "??");
        setTimeout(() => { if (S.winnerHud) S.winnerHud.material.opacity = 0.0; }, 2500);
        return;
      }

      // Clear any old winner animations
      S.winnerAnims.length = 0;

      // Step 1: Immediately set community row to the WIN LINE order
      // (cards from community just appear, cards from hole will “fly in” and land)
      for (let i=0;i<5;i++){
        const di = detailed[i];
        if (di.from === "COMM") {
          setCard(S.comm[i], di.label);
        } else {
          // placeholder until the flying card lands
          setCard(S.comm[i], "??");
        }
      }

      // Step 2: Animate each winning HOLE card from above head -> its target slot
      // Find winner seat index
      const winnerSeat = (w.seat|0) + 1;
      const holeMeshes = S.seatHoles[winnerSeat];
      if (!holeMeshes) return;

      // Choose which hole mesh to move: index 0 or 1 from mapping
      const tf = world.tableFocus || new THREE.Vector3(0,0,-6.5);
      const ty = world.tableY || 0.92;

      for (let slot=0; slot<5; slot++) {
        const di = detailed[slot];
        if (di.from !== "HOLE") continue;

        const holeIdx = di.index; // 0 or 1
        const srcMesh = holeMeshes[holeIdx];
        if (!srcMesh) continue;

        const start = srcMesh.position.clone();

        const end = new THREE.Vector3(
          tf.x + (slot-2)*0.44,
          ty + 0.55,
          tf.z - 0.15
        );

        // “clone” a flying copy so the above-head card stays visible
        // (then we can optionally hide it later if you want)
        const fly = makeCardMesh(di.label);
        fly.scale.copy(srcMesh.scale);
        fly.position.copy(start);
        S.root.add(fly);

        S.winnerAnims.push({
          mesh: fly,
          t: 0,
          dur: 0.55,
          a: start.clone(),
          b: end.clone().add(new THREE.Vector3(0, 0.08, 0)),
          label: di.label,
          slot
        });
      }

      // Fade banner later
      setTimeout(() => { if (S.winnerHud) S.winnerHud.material.opacity = 0.0; }, 2800);
    }

    function showFinished(payload) {
      const text = `FINISHED • ${payload?.handsPlayed||0} HANDS`;
      S.winnerHud.userData._hud.drawFn = drawWinner(text);
      redraw(S.winnerHud);
      S.winnerHud.material.opacity = 0.95;
      setAction("PAUSED");
    }

    function update(dt) {
      S.t += dt;
      const cam = world?.cameraRef;
      if (!cam?.position) return;

      // HUD faces player
      S.tableHud.lookAt(cam.position.x, S.tableHud.position.y, cam.position.z);
      S.winnerHud.lookAt(cam.position.x, S.winnerHud.position.y, cam.position.z);

      // Community cards hover + face player
      for (let i=0;i<S.comm.length;i++){
        const c = S.comm[i];
        c.position.y = (world.tableY || 0.92) + 0.55 + Math.sin(S.t*2 + i)*0.03;
        c.lookAt(cam.position.x, c.position.y, cam.position.z);
        c.rotation.x = 0;
      }

      // Hole cards float above heads, face player
      const tf = world.tableFocus || new THREE.Vector3(0,0,-6.5);
      for (let seat=1; seat<=6; seat++) {
        const p = seatHeadPos(seat, tf);
        const m = S.seatHoles[seat];
        if (!m) continue;
        m[0].position.lerp(p.clone().add(new THREE.Vector3(-0.18, 0.02 + Math.sin(S.t*2 + seat)*0.02, 0)), 0.12);
        m[1].position.lerp(p.clone().add(new THREE.Vector3( 0.18, 0.02 + Math.sin(S.t*2 + seat + 1)*0.02, 0)), 0.12);
        m[0].lookAt(cam.position.x, m[0].position.y, cam.position.z);
        m[1].lookAt(cam.position.x, m[1].position.y, cam.position.z);
        m[0].rotation.x = 0;
        m[1].rotation.x = 0;
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

      // Winner “fly in” animations
      for (let i=S.winnerAnims.length-1;i>=0;i--){
        const A = S.winnerAnims[i];
        A.t += dt;
        const k = Math.min(1, A.t / A.dur);
        const s = k*k*(3-2*k);
        A.mesh.position.lerpVectors(A.a, A.b, s);
        A.mesh.lookAt(cam.position.x, A.mesh.position.y, cam.position.z);
        A.mesh.rotation.x = 0;

        if (k >= 1) {
          // land: set the actual community slot to the label, then remove flyer
          setCard(S.comm[A.slot], A.label);
          try { S.root.remove(A.mesh); } catch {}
          S.winnerAnims.splice(i,1);
        }
      }
    }

    return {
      update,
      setPot, setStreet, setAction,
      onDeal, onAction, onBlinds, onShowdown,
      showFinished
    };
  }

  return { init };
})();
