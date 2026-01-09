// /js/dealingMix.js — Scarlett DealingMix v1.3 (FULL, STABLE EXPORT)
// Fixes:
// - Exports named DealingMix (matches main.js import)
// - Community cards 4x bigger, facing player, hovering
// - Hole cards 2x bigger (bots already larger in bots.js)
// - Chips flat (NOT sideways)
// - HUD wider, higher, bigger fonts, colored street labels

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
    deck: null,

    phase: "PREFLOP",
    pot: 150,
    current: "LUNA",
    actionText: "CHECK",
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
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false });
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

    // panel
    ctx.fillStyle = "rgba(8,10,16,0.72)";
    rounded(ctx, 30, 40, W-60, H-80, 40);
    ctx.fill();

    // title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 58px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Scarlett Poker • 6-Max • $10,000 Table", 70, 70);

    // street labels (colored)
    const streets = [
      ["PREFLOP", "#7fe7ff"],
      ["FLOP",    "#4cd964"],
      ["TURN",    "#ff2d7a"], // red/pink
      ["RIVER",   "#ffcc00"],
    ];

    let x = 70;
    for (const [label, color] of streets) {
      ctx.fillStyle = color;
      ctx.font = "bold 44px Arial";
      ctx.fillText(label, x, 150);
      x += ctx.measureText(label).width + 36;
    }

    // pot + turn
    ctx.fillStyle = "#e8ecff";
    ctx.font = "bold 48px Arial";
    ctx.fillText(`Pot: $${state.pot.toLocaleString()}`, 70, 220);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 48px Arial";
    ctx.fillText(`Turn: ${state.current}`, 70, 285);

    // action big
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    rounded(ctx, 70, 350, W-140, 110, 30);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 70px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${state.actionText}`, W/2, 405);
  }

  function potHudDraw(ctx, W, H) {
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    rounded(ctx, 20, 20, W-40, H-40, 36);
    ctx.fill();
    ctx.fillStyle = "#7fe7ff";
    ctx.font = "bold 72px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`$${state.pot.toLocaleString()}`, W/2, H/2);
  }

  function makeCard(rank="A", suit="♠") {
    // Simple readable face (big corners)
    const texObj = makeCanvasTex((ctx,W,H)=>{
      ctx.fillStyle="#f8f8f8"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(0,0,0,0.22)"; ctx.lineWidth=10; ctx.strokeRect(10,10,W-20,H-20);
      const red = (suit==="♥"||suit==="♦");
      ctx.fillStyle = red ? "#b6001b" : "#111";
      ctx.font="bold 96px Arial";
      ctx.textAlign="left"; ctx.textBaseline="top";
      ctx.fillText(rank, 26, 18);
      ctx.font="bold 110px Arial";
      ctx.fillText(suit, 26, 120);

      ctx.textAlign="right"; ctx.textBaseline="bottom";
      ctx.font="bold 96px Arial";
      ctx.fillText(rank, W-26, H-120);
      ctx.font="bold 110px Arial";
      ctx.fillText(suit, W-26, H-22);

      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.font="bold 210px Arial";
      ctx.fillText(suit, W/2, H/2+10);
    }, 512, 712);

    const mat = new THREE.MeshStandardMaterial({
      map: texObj.tex,
      roughness: 0.55,
      emissive: 0x111111,
      emissiveIntensity: 0.20,
      side: THREE.DoubleSide
    });

    const geo = new THREE.PlaneGeometry(0.32, 0.44); // ✅ community base size (already big)
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 100;
    return mesh;
  }

  function makeChip(color=0xff2d7a) {
    const geo = new THREE.CylinderGeometry(0.07, 0.07, 0.018, 32);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.15,
      emissive: color,
      emissiveIntensity: 0.06
    });
    const m = new THREE.Mesh(geo, mat);
    // ✅ FLAT on table: cylinder axis is Y, so DO NOT rotate
    m.rotation.set(0,0,0);
    return m;
  }

  function makeDealerButton() {
    const geo = new THREE.CylinderGeometry(0.10, 0.10, 0.02, 40);
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

  function init({ THREE: _T, scene: _S, log: _L, world: _W } = {}) {
    THREE = _T; scene = _S; log = _L || console.log; world = _W || {};

    if (state.root) { try { scene.remove(state.root); } catch {} }
    state.root = new THREE.Group();
    state.root.name = "DealingMixRoot";
    scene.add(state.root);

    const tf = world.tableFocus || new THREE.Vector3(0,0,-6.5);

    // HUD: higher + wider
    state.tableHud = makeHudPlane(tableHudDraw, 1400, 520, 2.4, 0.85);
    state.tableHud.position.set(tf.x, (world.tableY || 0.92) + 1.15, tf.z - 0.15);
    state.root.add(state.tableHud);

    // Pot HUD: hover above center (look-trigger later; for now always visible)
    state.potHud = makeHudPlane(potHudDraw, 700, 260, 0.9, 0.34);
    state.potHud.position.set(tf.x, (world.tableY || 0.92) + 0.55, tf.z);
    state.root.add(state.potHud);

    // Community cards (5) — big + facing player
    const ranks = ["A","K","Q","J","10"];
    const suits = ["♠","♦","♥","♣","♠"];

    state.comm.length = 0;
    for (let i=0;i<5;i++){
      const c = makeCard(ranks[i], suits[i]);
      c.position.set(tf.x + (i-2)*0.42, (world.tableY || 0.92) + 0.20, tf.z - 0.02);
      c.rotation.x = -Math.PI/2; // lay flat-ish
      state.root.add(c);
      state.comm.push(c);
    }

    // Chip pile center
    state.chipPile = new THREE.Group();
    for (let i=0;i<18;i++){
      const col = (i%3===0)?0xff2d7a:(i%3===1)?0x7fe7ff:0xffcc00;
      const chip = makeChip(col);
      chip.position.set((Math.random()-0.5)*0.16, (world.tableY || 0.92) + 0.012 + i*0.018, (Math.random()-0.5)*0.16);
      state.chipPile.add(chip);
    }
    state.chipPile.position.set(tf.x, 0, tf.z);
    state.root.add(state.chipPile);

    // Dealer button (near dealer spot)
    state.dealerButton = makeDealerButton();
    state.dealerButton.position.set(tf.x + 0.95, (world.tableY || 0.92) + 0.012, tf.z + 0.75);
    state.root.add(state.dealerButton);

    log("[DealingMix] init ✅");

    function startHand() {
      state.phase = "PREFLOP";
      state.current = "LUNA";
      state.actionText = "CHECK";
      state.pot = 150;
      redraw(state.tableHud);
      redraw(state.potHud);
    }

    function update(dt) {
      state.t += dt;

      // Face HUDs to camera
      const cam = world?.cameraRef;
      const look = (obj) => {
        if (!obj) return;
        const ref = cam || world?.playerRigRef?.children?.[0] || world?.playerRigRef || null;
        if (!ref || !ref.position) return;
        obj.lookAt(ref.position.x, obj.position.y, ref.position.z);
      };
      look(state.tableHud);
      look(state.potHud);

      // Hover/pulse community cards toward player (not behind table)
      for (let i=0;i<state.comm.length;i++){
        const c = state.comm[i];
        c.position.y = (world.tableY || 0.92) + 0.20 + Math.sin(state.t*2 + i)*0.015;
        // tip toward viewer slightly (so you can read)
        c.rotation.x = -Math.PI/2 + 0.18;
      }

      // pulse pot HUD a bit
      state.potHud.position.y = (world.tableY || 0.92) + 0.58 + Math.sin(state.t*2.2)*0.02;
    }

    return { startHand, update, root: state.root };
  }

  return { init };
})();
