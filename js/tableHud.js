// /js/tableHud.js — Scarlett Table HUD v1.0 (Billboard + Game State)

export const TableHud = {
  build({ THREE, parent, title = "$10,000 Table", log = console.log } = {}) {
    const L = (...a) => { try { log(...a); } catch { console.log(...a); } };

    const root = new THREE.Group();
    root.name = "TableHud";
    parent.add(root);

    const state = {
      title,
      pot: 0,
      street: "Preflop",
      turnName: "—",
      action: "Waiting…",
      target: null,
      t: 0
    };

    function makeBoard() {
      const c = document.createElement("canvas");
      c.width = 1024;
      c.height = 512;
      const ctx = c.getContext("2d");

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;

      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.72), mat);
      mesh.name = "HudBoard";
      mesh.position.set(0, 0, 0);

      mesh.userData.canvas = c;
      mesh.userData.ctx = ctx;
      mesh.userData.tex = tex;

      return mesh;
    }

    const board = makeBoard();
    root.add(board);

    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);

    function draw() {
      const ctx = board.userData.ctx;
      const c = board.userData.canvas;

      ctx.clearRect(0, 0, c.width, c.height);

      // background
      ctx.fillStyle = "rgba(10,12,20,0.72)";
      roundRect(ctx, 26, 26, c.width - 52, c.height - 52, 28, true);

      // border glow
      ctx.strokeStyle = "rgba(127,231,255,0.35)";
      ctx.lineWidth = 6;
      roundRect(ctx, 26, 26, c.width - 52, c.height - 52, 28, false);

      // title
      ctx.fillStyle = "#e8ecff";
      ctx.font = "bold 54px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(state.title, c.width / 2, 58);

      // street / pot
      ctx.fillStyle = "#7fe7ff";
      ctx.font = "bold 40px Arial";
      ctx.fillText(state.street.toUpperCase(), c.width / 2, 132);

      ctx.fillStyle = "#ff2d7a";
      ctx.font = "bold 52px Arial";
      ctx.fillText("POT  $" + Number(state.pot).toLocaleString(), c.width / 2, 190);

      // turn + action
      ctx.fillStyle = "#e8ecff";
      ctx.font = "bold 38px Arial";
      ctx.fillText("TURN:  " + state.turnName, c.width / 2, 278);

      ctx.fillStyle = "rgba(232,236,255,0.92)";
      ctx.font = "bold 34px Arial";
      ctx.fillText(state.action, c.width / 2, 340);

      // small footer
      ctx.fillStyle = "rgba(152,160,199,0.9)";
      ctx.font = "28px Arial";
      ctx.fillText("Scarlett VR Poker • Live Table", c.width / 2, 410);

      board.userData.tex.needsUpdate = true;

      function roundRect(ctx, x, y, w, h, r, fill) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        if (fill) ctx.fill(); else ctx.stroke();
      }
    }

    // Public setters (DealingMix / PokerSim can call this)
    function setTarget(cam) { state.target = cam || null; }
    function setGameState({ pot, street, turnName, action } = {}) {
      if (typeof pot === "number") state.pot = pot;
      if (street) state.street = street;
      if (turnName) state.turnName = turnName;
      if (action) state.action = action;
      draw();
    }

    draw();
    L("[TableHud] ready ✅");

    return {
      root,
      setTarget,
      setGameState,
      update(dt) {
        state.t += dt;
        // billboard
        if (state.target) {
          const p = state.target.position.clone();
          root.lookAt(p.x, root.position.y, p.z);
        }
        // gentle hover
        root.position.y = Math.sin(state.t * 1.2) * 0.01;
      }
    };
  }
};
