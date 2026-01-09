// /js/dealingMix.js — Scarlett DealingMix v1.4
// Fixes you asked for:
// - Community cards ALWAYS hover + face player
// - Cards no longer “tilt away”
// - Pot HUD is nearly invisible unless you look at the pot area (so it doesn't block cards)

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

  function tableHudDraw(ctx, W, H) {
    ctx.clearRect(0,0,W,H);

    ctx.fillStyle = "rgba(8,10,16,0.72)";
    rounded(ctx, 30, 40, W-60, H-80, 40);
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
    ctx.font = "bold 50px Arial";
    ctx.fillText(`Pot: $${state.pot.toLocaleString()}`, 70, 228);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 50px Arial";
    ctx.fillText(`Turn: ${state.current}`, 70, 296);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    rounded(ctx, 70, 360, W-140, 115, 30);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 74px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${state.actionText}`, W/2, 418);
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
    const texObj = makeCanvasTex((ctx,W,H)=>{
      ctx.fillStyle="#f8f8f8"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(0,0,0,0.22)"; ctx.lineWidth=10; ctx.strokeRect(10,10,W-20,H-20);
      const red = (suit==="♥"||suit==="♦");
      ctx.fillStyle = red ? "#b6001b" : "#111";

      // ✅ BIG corners
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
      emissive: 0x111111,
      emissiveIntensity: 0.20,
      side: THREE.DoubleSide
    });

    // community base size (big)
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.50), mat);
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
    // ✅ flat
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

    // HUD higher so it’s not crowding the cards
    state.tableHud = makeHudPlane(tableHudDraw, 1400, 520, 2.6, 0.90);
    state.tableHud.position.set(tf.x, (world.tableY || 0.92) + 1.55, tf.z - 0.20);
    state.root.add(state.tableHud);

    // Pot HUD sits near center, but “look-to-reveal”
    state.potHud = makeHudPlane(potHudDraw, 700, 260, 0.95, 0.36);
    state.potHud.position.set(tf.x, (world.tableY || 0.92) + 0.55, tf.z);
    state.potHud.material.opacity = 0.08; // ✅ basically invisible unless looked at
    state.root.add(state.potHud);

    // Community cards (always face player)
    const ranks = ["A","K","Q","J","10"];
    const suits = ["♠","♦","♥","♣","♠"];
    state.comm.length = 0;

    for (let i=0;i<5;i++){
      const c = makeCard(ranks[i], suits[i]);
      // position above table center
      c.position.set(tf.x + (i-2)*0.44, (world.tableY || 0.92) + 0.55, tf.z - 0.15);
      state.root.add(c);
      state.comm.push(c);
    }

    // chip pile center
    state.chipPile = new THREE.Group();
    for (let i=0;i<18;i++){
      const col = (i%3===0)?0xff2d7a:(i%3===1)?0x7fe7ff:0xffcc00;
      const chip = makeChip(col);
      chip.position.set((Math.random()-0.5)*0.16, (world.tableY || 0.92) + 0.012 + i*0.018, (Math.random()-0.5)*0.16);
      state.chipPile.add(chip);
    }
    state.chipPile.position.set(tf.x, 0, tf.z);
    state.root.add(state.chipPile);

    // dealer button
    state.dealerButton = makeDealerButton();
    state.dealerButton.position.set(tf.x + 0.95, (world.tableY || 0.92) + 0.012, tf.z + 0.75);
    state.root.add(state.dealerButton);

    log("[DealingMix] init ✅");

    function startHand() {
      state.current = "LUNA";
      state.actionText = "CHECK";
      state.pot = 150;
      redraw(state.tableHud);
      redraw(state.potHud);
    }

    function update(dt) {
      state.t += dt;

      const cam = world?.cameraRef;
      if (!cam?.position) return;

      // Table HUD faces player
      state.tableHud.lookAt(cam.position.x, state.tableHud.position.y, cam.position.z);

      // ✅ Community cards ALWAYS face player + hover
      for (let i=0;i<state.comm.length;i++){
        const c = state.comm[i];
        c.position.y = (world.tableY || 0.92) + 0.55 + Math.sin(state.t*2 + i)*0.03;

        // face player
        c.lookAt(cam.position.x, c.position.y, cam.position.z);
        // keep upright (no weird tilt)
        c.rotation.x = 0;
      }

      // ✅ Pot HUD “look-to-reveal”
      // If you look near the pot spot, it brightens; otherwise fades out.
      const potPos = state.potHud.position.clone();
      const toPot = potPos.sub(cam.position).normalize();

      const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(cam.quaternion).normalize();
      const dot = fwd.dot(toPot); // 1 = directly looking at it

      // threshold 0.92 (~23 deg cone)
      const reveal = Math.max(0, Math.min(1, (dot - 0.90) / 0.08));
      const targetOpacity = 0.06 + reveal * 0.94;

      state.potHud.material.opacity += (targetOpacity - state.potHud.material.opacity) * 0.12;

      // keep pot HUD facing player but not loud
      state.potHud.lookAt(cam.position.x, state.potHud.position.y, cam.position.z);
      state.potHud.position.y = (world.tableY || 0.92) + 0.55 + Math.sin(state.t*2.2)*0.01;
    }

    return { startHand, update, root: state.root };
  }

  return { init };
})();
