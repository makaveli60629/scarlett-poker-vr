// /js/tableHud.js — Scarlett Table HUD v1.1 (bigger fonts + cleaner)

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

    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.70, 0.78), mat);
    mesh.name = "HudBoard";
    root.add(mesh);

    function rr(x,y,w,h,r,fill,stroke){
      ctx.beginPath();
      ctx.moveTo(x+r,y);
      ctx.arcTo(x+w,y,x+w,y+h,r);
      ctx.arcTo(x+w,y+h,x,y+h,r);
      ctx.arcTo(x,y+h,x,y,r);
      ctx.arcTo(x,y,x+w,y,r);
      ctx.closePath();
      if(fill) ctx.fill();
      if(stroke) ctx.stroke();
    }

    function draw() {
      ctx.clearRect(0,0,canvas.width,canvas.height);

      ctx.fillStyle = "rgba(10,12,20,0.78)";
      rr(24,24,canvas.width-48,canvas.height-48,28,true,false);

      ctx.strokeStyle = "rgba(127,231,255,0.40)";
      ctx.lineWidth = 7;
      rr(24,24,canvas.width-48,canvas.height-48,28,false,true);

      // TITLE
      ctx.fillStyle = "#e8ecff";
      ctx.font = "bold 64px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(state.title, canvas.width/2, 52);

      // STREET (BIGGER)
      ctx.fillStyle = "#7fe7ff";
      ctx.font = "bold 54px Arial";
      ctx.fillText(state.street.toUpperCase(), canvas.width/2, 138);

      // POT (BIGGER)
      ctx.fillStyle = "#ff2d7a";
      ctx.font = "bold 64px Arial";
      ctx.fillText("POT  $" + Number(state.pot).toLocaleString(), canvas.width/2, 210);

      // TURN
      ctx.fillStyle = "#e8ecff";
      ctx.font = "bold 46px Arial";
      ctx.fillText("TURN:  " + state.turnName, canvas.width/2, 305);

      // ACTION
      ctx.fillStyle = "rgba(232,236,255,0.92)";
      ctx.font = "bold 40px Arial";
      ctx.fillText(state.action, canvas.width/2, 372);

      // footer
      ctx.fillStyle = "rgba(152,160,199,0.9)";
      ctx.font = "30px Arial";
      ctx.fillText("Scarlett VR Poker • Live Table", canvas.width/2, 430);

      tex.needsUpdate = true;
    }

    draw();
    L("[TableHud] ready ✅");

    return {
      root,
      setTarget(cam) { state.target = cam || null; },
      setGameState({ pot, street, turnName, action } = {}) {
        if (typeof pot === "number") state.pot = pot;
        if (street) state.street = street;
        if (turnName) state.turnName = turnName;
        if (action) state.action = action;
        draw();
      },
      update(dt) {
        state.t += dt;
        if (state.target) {
          const p = state.target.position;
          root.lookAt(p.x, root.position.y, p.z);
        }
        // tiny hover
        root.position.y = Math.sin(state.t * 1.1) * 0.01;
      }
    };
  }
};
