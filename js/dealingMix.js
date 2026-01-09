// /js/dealingMix.js — Scarlett DealingMix v2.2 (FULL WATCH GAME)
// ✅ Hovering community cards facing player
// ✅ Big HUD above table (street/action/pot)
// ✅ Purple pot numbers with transparent background
// ✅ Chips per seat + pot chips animate on bets

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
    comm: [],
    pot: 0,
    street: "PREFLOP",
    action: "—",

    seatChips: [],   // 1..6
    potChips: null,  // group
    chipAnims: [],   // moving chips
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

  function makeChip(color=0xff2d7a) {
    // thinner/smaller chips
    const geo = new THREE.CylinderGeometry(0.055, 0.055, 0.012, 28);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.12,
      emissive: color,
      emissiveIntensity: 0.05
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = Math.PI/2;
    return m;
  }

  function chipStack(count=12) {
    const g = new THREE.Group();
    const colors = [0xff2d7a, 0x7fe7ff, 0xffcc00];
    for (let i=0;i<count;i++){
      const c = makeChip(colors[i % colors.length]);
      c.position.y = i * 0.012;
      g.add(c);
    }
    return g;
  }

  function init({ THREE: _T, scene: _S, log: _L, world: _W } = {}) {
    THREE = _T; scene = _S; log = _L || console.log; world = _W || {};

    if (S.root) { try { scene.remove(S.root); } catch {} }
    S.root = new THREE.Group();
    S.root.name = "DealingMixRoot";
    scene.add(S.root);

    const tf = world.tableFocus || new THREE.Vector3(0,0,-6.5);
    const ty = world.tableY || 0.92;

    // Big HUD
    S.tableHud = hudPlane(drawTableHud, 1400, 520, 2.7, 0.92);
    S.tableHud.position.set(tf.x, ty + 1.65, tf.z - 0.22);
    S.root.add(S.tableHud);

    // Pot HUD
    S.potHud = hudPlane(drawPotHud, 700, 260, 0.95, 0.36);
    S.potHud.position.set(tf.x, ty + 0.55, tf.z);
    S.potHud.material.opacity = 0.12;
    S.root.add(S.potHud);

    // Winner HUD
    S.winnerHud = hudPlane(drawWinner(""), 1200, 260, 2.0, 0.46);
    S.winnerHud.position.set(tf.x, ty + 1.20, tf.z + 0.85);
    S.winnerHud.material.opacity = 0.0;
    S.root.add(S.winnerHud);

    // Community cards (5)
    S.comm.length = 0;
    for (let i=0;i<5;i++){
      const c = makeCardMesh("??");
      c.position.set(tf.x + (i-2)*0.44, ty + 0.55, tf.z - 0.15);
      S.root.add(c);
      S.comm.push(c);
    }

    // Chips: per seat + pot
    S.potChips = chipStack(18);
    S.potChips.position.set(tf.x, ty + 0.01, tf.z + 0.02);
    S.root.add(S.potChips);

    S.seatChips = [];
    const seatR = 1.55;
    for (let i=1;i<=6;i++){
      const a = [-0.2, 0.55, 1.35, 2.25, 3.05, 3.85][i-1];
      const g = chipStack(10);
      g.position.set(tf.x + Math.cos(a)*seatR, ty + 0.01, tf.z + Math.sin(a)*seatR);
      S.root.add(g);
      S.seatChips[i] = g;
    }

    redraw(S.tableHud);
    redraw(S.potHud);

    log("[DealingMix] init ✅");

    function setPot(p) { S.pot = p|0; redraw(S.tableHud); redraw(S.potHud); }
    function setStreet(st) { S.street = st || "—"; redraw(S.tableHud); }
    function setAction(a) { S.action = a || "—"; redraw(S.tableHud); }

    function onDeal(d) {
      if (!d) return;
      if (d.type === "HOLE") {
        setAction("DEALING");
      } else if (d.type === "FLOP") {
        setStreet("FLOP");
        setAction("FLOP");
        const c = d.communityRaw || [];
        for (let i=0;i<5;i++) setCard(S.comm[i], cardLabel(c[i]));
      } else if (d.type === "TURN") {
        setStreet("TURN");
        setAction("TURN");
        const c = d.communityRaw || [];
        for (let i=0;i<5;i++) setCard(S.comm[i], cardLabel(c[i]));
      } else if (d.type === "RIVER") {
        setStreet("RIVER");
        setAction("RIVER");
        const c = d.communityRaw || [];
        for (let i=0;i<5;i++) setCard(S.comm[i], cardLabel(c[i]));
      }
    }

    function onAction(a) {
      if (!a) return;
      if (a.type === "FOLD") {
        setAction(`${a.name} FOLDS`);
        return;
      }
      if (a.type === "BET") {
        setAction(`${a.name} BETS $${a.amount}`);
        // Animate 1 chip from seat -> pot
        const seatIndex = (a.seat|0) + 1;
        const src = S.seatChips[seatIndex];
        if (!src) return;

        const chip = makeChip(0xb200ff);
        const start = new THREE.Vector3();
        const end = new THREE.Vector3();
        src.getWorldPosition(start);
        S.potChips.getWorldPosition(end);

        chip.position.copy(start);
        chip.position.y += 0.12;
        S.root.add(chip);

        S.chipAnims.push({
          mesh: chip,
          t: 0,
          dur: 0.35,
          a: start.clone(),
          b: end.clone().add(new THREE.Vector3((Math.random()-0.5)*0.08, 0.14 + Math.random()*0.06, (Math.random()-0.5)*0.08))
        });
      }
    }

    function onBlinds(b) {
      setStreet("PREFLOP");
      setAction("BLINDS");
    }

    function onShowdown(sd) {
      const w = sd?.winners?.[0];
      if (!w) return;
      const text = `${w.name} WINS • ${w.handName} • ${(w.best5||[]).join(" ")}`;
      S.winnerHud.userData._hud.drawFn = drawWinner(text);
      redraw(S.winnerHud);
      S.winnerHud.material.opacity = 0.95;
      setTimeout(() => { if (S.winnerHud) S.winnerHud.material.opacity = 0.0; }, 2400);
      setAction("SHOWDOWN");
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

      // Pot HUD “look-to-reveal”
      const potPos = S.potHud.position.clone();
      const toPot = potPos.sub(cam.position).normalize();
      const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(cam.quaternion).normalize();
      const dot = fwd.dot(toPot);
      const reveal = Math.max(0, Math.min(1, (dot - 0.90) / 0.08));
      const targetOpacity = 0.08 + reveal * 0.92;
      S.potHud.material.opacity += (targetOpacity - S.potHud.material.opacity) * 0.12;
      S.potHud.lookAt(cam.position.x, S.potHud.position.y, cam.position.z);

      // Chip animations
      for (let i=S.chipAnims.length-1;i>=0;i--){
        const A = S.chipAnims[i];
        A.t += dt;
        const k = Math.min(1, A.t / A.dur);
        // smoothstep
        const s = k*k*(3-2*k);
        A.mesh.position.lerpVectors(A.a, A.b, s);
        if (k >= 1) {
          // drop into pot stack area
          try { S.root.remove(A.mesh); } catch {}
          S.chipAnims.splice(i,1);
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
