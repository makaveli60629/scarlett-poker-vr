// /js/dealingMix.js — Scarlett DealingMix v2.0 (PokerSim-driven)
// ✅ Community cards show real cards from poker engine
// ✅ HUD updates: pot/street/action
// ✅ Showdown: show winning best5 in center
// ✅ Pot HUD look-to-reveal (kept)

export const DealingMix = (() => {
  let THREE, scene, log, world;

  const S = {
    t: 0,
    root: null,
    tableHud: null,
    potHud: null,
    comm: [],
    hole: new Map(),
    chipPile: null,
    dealerButton: null,
    winnerHud: null,

    pot: 150,
    street: "PREFLOP",
    actionText: "—",
  };

  const SUIT_CH = ["♠","♥","♦","♣"];
  const RANK_CH = { 11:"J", 12:"Q", 13:"K", 14:"A" };

  function cardLabel(c) {
    if (!c) return "??";
    if (typeof c === "string") return c;
    const r = RANK_CH[c.r] || String(c.r);
    const s = SUIT_CH[c.s] || "?";
    return r + s;
  }

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

  function tableHudDraw(ctx, W, H) {
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
    ctx.font = "bold 52px Arial";
    ctx.fillText(`${S.street}`, 70, 150);

    ctx.fillStyle = "#e8ecff";
    ctx.font = "bold 56px Arial";
    ctx.fillText(`Pot: $${S.pot.toLocaleString()}`, 70, 220);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    rounded(ctx, 70, 300, W-140, 145, 30);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 78px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${S.actionText}`, W/2, 372);
  }

  function potHudDraw(ctx, W, H) {
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    rounded(ctx, 20, 20, W-40, H-40, 36);
    ctx.fill();
    ctx.fillStyle = "#b200ff"; // purple
    ctx.font = "bold 86px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`$${S.pot.toLocaleString()}`, W/2, H/2);
  }

  function winnerHudDrawFactory(text) {
    return (ctx, W, H) => {
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      rounded(ctx, 20, 20, W-40, H-40, 36);
      ctx.fill();
      ctx.fillStyle = "#ffcc00";
      ctx.font = "bold 70px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, W/2, H/2);
    };
  }

  function makeCardMesh(label="??") {
    const texObj = makeCanvasTex((ctx,W,H)=>{
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
      map: texObj.tex,
      roughness: 0.55,
      emissive: 0x111111,
      emissiveIntensity: 0.20,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.50), mat);
    mesh.userData._label = label;
    mesh.userData._tex = texObj.tex;
    mesh.userData._ctx = texObj.ctx;
    mesh.userData._canvas = texObj.canvas;
    return mesh;
  }

  function setCardLabel(mesh, label) {
    if (!mesh?.userData?._ctx) return;
    if (mesh.userData._label === label) return;
    mesh.userData._label = label;

    const ctx = mesh.userData._ctx;
    const c = mesh.userData._canvas;
    const W = c.width, H = c.height;

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

    mesh.userData._tex.needsUpdate = true;
  }

  function init({ THREE: _T, scene: _S, log: _L, world: _W } = {}) {
    THREE = _T; scene = _S; log = _L || console.log; world = _W || {};

    if (S.root) { try { scene.remove(S.root); } catch {} }
    S.root = new THREE.Group();
    S.root.name = "DealingMixRoot";
    scene.add(S.root);

    const tf = world.tableFocus || new THREE.Vector3(0,0,-6.5);
    const ty = world.tableY || 0.92;

    S.tableHud = makeHudPlane(tableHudDraw, 1400, 520, 2.6, 0.90);
    S.tableHud.position.set(tf.x, ty + 1.55, tf.z - 0.20);
    S.root.add(S.tableHud);

    S.potHud = makeHudPlane(potHudDraw, 700, 260, 0.95, 0.36);
    S.potHud.position.set(tf.x, ty + 0.55, tf.z);
    S.potHud.material.opacity = 0.08;
    S.root.add(S.potHud);

    // community cards
    S.comm.length = 0;
    for (let i=0;i<5;i++){
      const c = makeCardMesh("??");
      c.position.set(tf.x + (i-2)*0.44, ty + 0.55, tf.z - 0.15);
      S.root.add(c);
      S.comm.push(c);
    }

    // winner hud
    S.winnerHud = makeHudPlane(winnerHudDrawFactory(""), 1200, 260, 2.0, 0.46);
    S.winnerHud.position.set(tf.x, ty + 1.15, tf.z + 0.75);
    S.winnerHud.material.opacity = 0.0;
    S.root.add(S.winnerHud);

    redraw(S.tableHud);
    redraw(S.potHud);
    log("[DealingMix] init ✅");

    function update(dt) {
      S.t += dt;
      const cam = world?.cameraRef;
      if (!cam?.position) return;

      // face player
      S.tableHud.lookAt(cam.position.x, S.tableHud.position.y, cam.position.z);

      // community hover + face
      for (let i=0;i<S.comm.length;i++){
        const c = S.comm[i];
        c.position.y = (world.tableY || 0.92) + 0.55 + Math.sin(S.t*2 + i)*0.03;
        c.lookAt(cam.position.x, c.position.y, cam.position.z);
        c.rotation.x = 0;
      }

      // pot look-to-reveal
      const potPos = S.potHud.position.clone();
      const toPot = potPos.sub(cam.position).normalize();
      const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(cam.quaternion).normalize();
      const dot = fwd.dot(toPot);
      const reveal = Math.max(0, Math.min(1, (dot - 0.90) / 0.08));
      const targetOpacity = 0.06 + reveal * 0.94;
      S.potHud.material.opacity += (targetOpacity - S.potHud.material.opacity) * 0.12;
      S.potHud.lookAt(cam.position.x, S.potHud.position.y, cam.position.z);

      // winner hud fade
      S.winnerHud.lookAt(cam.position.x, S.winnerHud.position.y, cam.position.z);
    }

    // external API PokerSim can call
    function setPot(p) { S.pot = p|0; redraw(S.tableHud); redraw(S.potHud); }
    function setStreet(st) { S.street = st || "—"; redraw(S.tableHud); }
    function setAction(t) { S.actionText = t || "—"; redraw(S.tableHud); }

    function setCommunity(comm) {
      // comm is array of card objects {r,s}
      for (let i=0;i<5;i++){
        const label = cardLabel(comm[i]);
        setCardLabel(S.comm[i], label);
      }
    }

    function setHoleCards(players) {
      // optional future: show player hole cards in front of camera
      // leaving stub (safe)
    }

    function showShowdown(sd) {
      const top = sd?.winners?.[0];
      if (!top) return;

      const text = `${top.name} WINS • ${top.handName} • ${(top.best5||[]).join(" ")}`;
      S.winnerHud.userData._hud.drawFn = winnerHudDrawFactory(text);
      redraw(S.winnerHud);
      S.winnerHud.material.opacity = 0.95;

      // fade out after a short time
      setTimeout(() => {
        if (S.winnerHud) S.winnerHud.material.opacity = 0.0;
      }, 1800);
    }

    return { update, setPot, setStreet, setAction, setCommunity, setHoleCards, showShowdown };
  }

  return { init };
})();
