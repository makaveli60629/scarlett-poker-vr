// /js/dealingMix.js — Scarlett DealingMix v2.0 (DRIVEN BY PokerSim)
// ✅ Turn/action HUD above acting bot
// ✅ Pot HUD purple, transparent
// ✅ Showdown: highlights used community + pulls used hole cards up near community
// ✅ No blinking/tilting (locks rotation)

export const DealingMix = (() => {
  let THREE, scene, log, world;

  const SUIT_CH = ["♠","♥","♦","♣"];
  const RANK_CH = { 11:"J", 12:"Q", 13:"K", 14:"A" };

  const state = {
    t: 0,
    root: null,

    tableHud: null,
    potHud: null,
    actionHud: null,

    comm: [],
    commRaw: [],
    hole: new Map(),
    holeRaw: new Map(),

    chipPile: null,
    dealerButton: null,

    pot: 0,
    actionText: "—",
    actionSeat: -1,
    actionName: "",
    actionType: "",

    showdownTimer: 0,
    showdownActive: false,
    showdownUsed: null,
  };

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

  function makeHudPlane(drawFn, w, h, scaleW, scaleH) {
    const { tex, canvas, ctx } = makeCanvasTex(drawFn, w, h);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, opacity: 0.95 });
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

  function cardToText(c) {
    if (!c) return "??";
    const r = RANK_CH[c.r] || String(c.r);
    const s = SUIT_CH[c.s] || "?";
    return r + s;
  }

  function tableHudDraw(ctx, W, H) {
    ctx.clearRect(0,0,W,H);

    ctx.fillStyle = "rgba(8,10,16,0.72)";
    rounded(ctx, 30, 40, W-60, H-80, 44);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 60px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Scarlett Poker • 6-Max • $10,000 Table", 70, 70);

    const streets = [
      ["PREFLOP", "#7fe7ff"],
      ["FLOP",    "#4cd964"],
      ["TURN",    "#ff2d7a"],
      ["RIVER",   "#ffcc00"],
    ];
    let x = 70;
    for (const [label, color] of streets) {
      ctx.fillStyle = color;
      ctx.font = "bold 46px Arial";
      ctx.fillText(label, x, 152);
      x += ctx.measureText(label).width + 40;
    }

    ctx.fillStyle = "#e8ecff";
    ctx.font = "bold 58px Arial";
    ctx.fillText(`Pot: $${(state.pot||0).toLocaleString()}`, 70, 230);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    rounded(ctx, 70, 320, W-140, 140, 34);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 80px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.actionText || "—", W/2, 390);
  }

  function potHudDraw(ctx, W, H) {
    ctx.clearRect(0,0,W,H);

    ctx.fillStyle = "rgba(0,0,0,0.10)";
    rounded(ctx, 18, 18, W-36, H-36, 40);
    ctx.fill();

    ctx.shadowColor = "rgba(178,0,255,0.85)";
    ctx.shadowBlur = 22;

    ctx.fillStyle = "#b200ff";
    ctx.font = "bold 120px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`$${(state.pot||0).toLocaleString()}`, W/2, H/2 + 6);

    ctx.shadowBlur = 0;
  }

  function actionHudDraw(ctx, W, H) {
    ctx.clearRect(0,0,W,H);

    ctx.fillStyle = "rgba(8,10,16,0.65)";
    rounded(ctx, 20, 20, W-40, H-40, 32);
    ctx.fill();

    ctx.fillStyle = "#7fe7ff";
    ctx.font = "bold 60px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(state.actionName || "—", W/2, 36);

    ctx.font = "bold 84px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const type = (state.actionType || "").toUpperCase();
    if (type === "BET") ctx.fillStyle = "#ff2d7a";
    else if (type === "FOLD") ctx.fillStyle = "#ff6b6b";
    else if (type === "CHECK") ctx.fillStyle = "#7fe7ff";
    else if (type === "WIN") ctx.fillStyle = "#ffcc00";
    else ctx.fillStyle = "#ffffff";

    ctx.fillText(state.actionText || "—", W/2, 170);
  }

  function makeCardMesh(rank="A", suit="♠") {
    const texObj = makeCanvasTex((ctx,W,H)=>{
      ctx.fillStyle="#f8f8f8"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(0,0,0,0.20)"; ctx.lineWidth=10; ctx.strokeRect(10,10,W-20,H-20);

      const red = (suit==="♥"||suit==="♦");
      ctx.fillStyle = red ? "#b6001b" : "#111";

      ctx.font="bold 110px Arial";
      ctx.textAlign="left"; ctx.textBaseline="top";
      ctx.fillText(rank, 28, 18);
      ctx.font="bold 128px Arial";
      ctx.fillText(suit, 28, 140);

      ctx.textAlign="right"; ctx.textBaseline="bottom";
      ctx.font="bold 110px Arial";
      ctx.fillText(rank, W-28, H-140);
      ctx.font="bold 128px Arial";
      ctx.fillText(suit, W-28, H-22);

      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.font="bold 240px Arial";
      ctx.fillText(suit, W/2, H/2+10);
    }, 512, 712);

    const mat = new THREE.MeshStandardMaterial({
      map: texObj.tex,
      roughness: 0.55,
      metalness: 0.05,
      emissive: 0x111111,
      emissiveIntensity: 0.18,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.50), mat);
    mesh.renderOrder = 100;
    return mesh;
  }

  function setCardFace(mesh, cardObj) {
    const txt = cardToText(cardObj);
    const rank = txt.slice(0, txt.length-1);
    const suit = txt.slice(-1);

    const c = document.createElement("canvas");
    c.width = 512; c.height = 712;
    const ctx = c.getContext("2d");

    ctx.fillStyle="#f8f8f8"; ctx.fillRect(0,0,512,712);
    ctx.strokeStyle="rgba(0,0,0,0.20)"; ctx.lineWidth=10; ctx.strokeRect(10,10,492,692);

    const red = (suit==="♥"||suit==="♦");
    ctx.fillStyle = red ? "#b6001b" : "#111";

    ctx.font="bold 110px Arial";
    ctx.textAlign="left"; ctx.textBaseline="top";
    ctx.fillText(rank, 28, 18);
    ctx.font="bold 128px Arial";
    ctx.fillText(suit, 28, 140);

    ctx.textAlign="right"; ctx.textBaseline="bottom";
    ctx.font="bold 110px Arial";
    ctx.fillText(rank, 512-28, 712-140);
    ctx.font="bold 128px Arial";
    ctx.fillText(suit, 512-28, 712-22);

    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.font="bold 240px Arial";
    ctx.fillText(suit, 512/2, 712/2+10);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    mesh.material.map = tex;
    mesh.material.needsUpdate = true;
  }

  function makeChip(color=0xff2d7a) {
    const geo = new THREE.CylinderGeometry(0.055, 0.055, 0.012, 28);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.15,
      emissive: color,
      emissiveIntensity: 0.05
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.set(0,0,0);
    return m;
  }

  function makeDealerButton() {
    const geo = new THREE.CylinderGeometry(0.085, 0.085, 0.018, 36);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.45,
      metalness: 0.12,
      emissive: 0x222222,
      emissiveIntensity: 0.2
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.set(0,0,0);
    return m;
  }

  function getSeatPose(seatIndex) {
    const seats = world?.getSeats?.() || [];
    const s = seats[seatIndex];
    if (!s?.anchor) return null;

    const p = new THREE.Vector3();
    s.anchor.getWorldPosition(p);

    const tf = world.tableFocus || new THREE.Vector3(0,0,-6.5);
    const toTable = new THREE.Vector3().subVectors(tf, p);
    toTable.y = 0; toTable.normalize();

    const onTable = p.clone().addScaledVector(toTable, 0.55);
    onTable.y = (world.tableY || 0.92) + 0.55;

    return { pos: onTable, yaw: s.yaw };
  }

  function setPot(p) {
    state.pot = p || 0;
    if (state.tableHud) redraw(state.tableHud);
    if (state.potHud) redraw(state.potHud);
  }

  function setAction(a) {
    state.actionSeat = (a?.seat ?? -1);
    state.actionType = (a?.type || "");
    state.actionName = (a?.name || "");
    if (a?.type === "BET") state.actionText = `BET $${(a.amount||0).toLocaleString()}`;
    else if (a?.type === "FOLD") state.actionText = "FOLD";
    else if (a?.type === "CHECK") state.actionText = "CHECK";
    else state.actionText = a?.type || "—";

    if (state.tableHud) redraw(state.tableHud);
    if (state.actionHud) redraw(state.actionHud);
  }

  function setCommunity(cardsRaw) {
    state.commRaw = Array.isArray(cardsRaw) ? cardsRaw.slice() : [];
    for (let i=0;i<state.comm.length;i++){
      const c = state.comm[i];
      const raw = state.commRaw[i];
      if (raw) setCardFace(c, raw);
    }
  }

  function setHoleCards(players) {
    if (!Array.isArray(players)) return;
    state.holeRaw.clear();

    for (const p of players) {
      if (!p?.hole?.length) continue;
      state.holeRaw.set(p.seat, p.hole.slice(0,2));
    }

    for (const [seat, two] of state.holeRaw.entries()) {
      const pair = state.hole.get(seat);
      if (!pair) continue;
      if (two[0]) setCardFace(pair[0], two[0]);
      if (two[1]) setCardFace(pair[1], two[1]);
    }
  }

  function showShowdown(sd) {
    const w = sd?.winners?.[0];
    if (!w) return;

    state.showdownActive = true;
    state.showdownTimer = 0;
    state.showdownUsed = {
      winnerSeat: w.seat,
      usedHoleIdx: w.used?.holeIdx || [],
      usedCommIdx: w.used?.commIdx || []
    };

    state.actionSeat = w.seat;
    state.actionName = w.name || "WINNER";
    state.actionType = "WIN";
    state.actionText = `WIN • ${w.handName}`;
    if (state.actionHud) redraw(state.actionHud);
    if (state.tableHud) redraw(state.tableHud);
  }

  function init({ THREE: _T, scene: _S, log: _L, world: _W } = {}) {
    THREE = _T; scene = _S; log = _L || console.log; world = _W || {};

    if (state.root) { try { scene.remove(state.root); } catch {} }
    state.root = new THREE.Group();
    state.root.name = "DealingMixRoot";
    scene.add(state.root);

    const tf = world.tableFocus || new THREE.Vector3(0,0,-6.5);

    state.tableHud = makeHudPlane(tableHudDraw, 1400, 520, 2.6, 0.90);
    state.tableHud.position.set(tf.x, (world.tableY || 0.92) + 1.55, tf.z - 0.20);
    state.root.add(state.tableHud);

    state.potHud = makeHudPlane(potHudDraw, 820, 300, 1.10, 0.40);
    state.potHud.position.set(tf.x, (world.tableY || 0.92) + 0.55, tf.z);
    state.potHud.material.opacity = 0.18;
    state.root.add(state.potHud);

    state.actionHud = makeHudPlane(actionHudDraw, 900, 260, 1.25, 0.38);
    state.actionHud.position.set(tf.x, (world.tableY || 0.92) + 1.35, tf.z + 1.25);
    state.actionHud.material.opacity = 0.0;
    state.root.add(state.actionHud);

    state.comm.length = 0;
    state.commRaw = [];
    for (let i=0;i<5;i++){
      const c = makeCardMesh("?", "♠");
      c.position.set(tf.x + (i-2)*0.44, (world.tableY || 0.92) + 0.55, tf.z - 0.15);
      state.root.add(c);
      state.comm.push(c);
    }

    state.hole.clear();
    state.holeRaw.clear();
    for (let seat=0; seat<6; seat++){
      const a = makeCardMesh("?", "♠");
      const b = makeCardMesh("?", "♠");
      a.scale.setScalar(0.72);
      b.scale.setScalar(0.72);
      state.root.add(a);
      state.root.add(b);
      state.hole.set(seat, [a,b]);
    }

    state.chipPile = new THREE.Group();
    for (let i=0;i<18;i++){
      const col = (i%3===0)?0xff2d7a:(i%3===1)?0x7fe7ff:0xffcc00;
      const chip = makeChip(col);
      chip.position.set((Math.random()-0.5)*0.12, (world.tableY || 0.92) + 0.006 + i*0.012, (Math.random()-0.5)*0.12);
      state.chipPile.add(chip);
    }
    state.chipPile.position.set(tf.x, 0, tf.z);
    state.root.add(state.chipPile);

    state.dealerButton = makeDealerButton();
    state.dealerButton.position.set(tf.x + 0.95, (world.tableY || 0.92) + 0.010, tf.z + 0.75);
    state.root.add(state.dealerButton);

    state.t = 0;
    state.pot = 0;
    state.actionText = "—";
    state.actionSeat = -1;
    state.showdownActive = false;
    state.showdownUsed = null;

    redraw(state.tableHud);
    redraw(state.potHud);
    redraw(state.actionHud);

    log("[DealingMix] v2.0 init ✅");

    function update(dt) {
      state.t += dt;

      const cam = world?.cameraRef;
      if (!cam?.position) return;

      state.tableHud.lookAt(cam.position.x, state.tableHud.position.y, cam.position.z);

      for (let i=0;i<state.comm.length;i++){
        const c = state.comm[i];
        c.position.y = (world.tableY || 0.92) + 0.55 + Math.sin(state.t*2 + i)*0.03;
        c.lookAt(cam.position.x, c.position.y, cam.position.z);
        c.rotation.x = 0;
        c.material.emissiveIntensity = 0.18; // default
      }

      const potPos = state.potHud.position.clone();
      const toPot = potPos.sub(cam.position).normalize();
      const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(cam.quaternion).normalize();
      const dot = fwd.dot(toPot);
      const reveal = Math.max(0, Math.min(1, (dot - 0.90) / 0.08));
      const targetOpacity = 0.12 + reveal * 0.78;
      state.potHud.material.opacity += (targetOpacity - state.potHud.material.opacity) * 0.10;
      state.potHud.lookAt(cam.position.x, state.potHud.position.y, cam.position.z);

      for (let seat=0; seat<6; seat++){
        const pose = getSeatPose(seat+1);
        const pair = state.hole.get(seat);
        if (!pose || !pair) continue;

        const right = new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0), pose.yaw);
        const base = pose.pos;

        pair[0].position.copy(base).addScaledVector(right, -0.11);
        pair[1].position.copy(base).addScaledVector(right,  0.11);

        pair[0].lookAt(cam.position.x, pair[0].position.y, cam.position.z);
        pair[1].lookAt(cam.position.x, pair[1].position.y, cam.position.z);
        pair[0].rotation.x = 0;
        pair[1].rotation.x = 0;

        pair[0].position.y += Math.sin(state.t*2.2 + seat)*0.006;
        pair[1].position.y += Math.sin(state.t*2.2 + seat + 0.7)*0.006;

        pair[0].material.emissiveIntensity = 0.16;
        pair[1].material.emissiveIntensity = 0.16;
      }

      if (state.actionSeat >= 0) {
        const pose = getSeatPose(state.actionSeat+1);
        if (pose) {
          state.actionHud.position.set(pose.pos.x, (world.tableY||0.92)+1.48, pose.pos.z);
          state.actionHud.lookAt(cam.position.x, state.actionHud.position.y, cam.position.z);
          state.actionHud.material.opacity += (0.92 - state.actionHud.material.opacity) * 0.12;
        }
      } else {
        state.actionHud.material.opacity += (0.0 - state.actionHud.material.opacity) * 0.10;
      }

      if (state.showdownActive && state.showdownUsed) {
        state.showdownTimer += dt;

        const tf = world.tableFocus || new THREE.Vector3(0,0,-6.5);
        const { winnerSeat, usedHoleIdx, usedCommIdx } = state.showdownUsed;

        for (const idx of usedCommIdx) {
          const cm = state.comm[idx];
          if (cm) cm.material.emissiveIntensity = 0.65 + Math.sin(state.t*8)*0.18;
        }

        const pair = state.hole.get(winnerSeat);
        if (pair) {
          for (const hi of usedHoleIdx) {
            const hm = pair[hi];
            if (hm) {
              hm.material.emissiveIntensity = 0.90 + Math.sin(state.t*10)*0.25;
              const target = new THREE.Vector3(
                tf.x + (hi===0 ? -1.15 : 1.15),
                (world.tableY || 0.92) + 0.70,
                tf.z - 0.45
              );
              hm.position.lerp(target, 0.06);
            }
          }
        }

        if (state.showdownTimer > 2.2) {
          state.showdownActive = false;
          state.showdownUsed = null;
          state.showdownTimer = 0;
          state.actionSeat = -1;
        }
      }
    }

    function startHand() {
      state.actionSeat = -1;
      state.actionName = "";
      state.actionType = "";
      state.actionText = "—";
      state.showdownActive = false;
      state.showdownUsed = null;
      state.showdownTimer = 0;

      redraw(state.tableHud);
      redraw(state.potHud);
      redraw(state.actionHud);
    }

    return {
      startHand,
      update,
      setPot,
      setCommunity,
      setHoleCards,
      setAction,
      showShowdown,
      root: state.root
    };
  }

  return { init };
})();
