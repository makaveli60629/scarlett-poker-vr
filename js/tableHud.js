// /js/tableHud.js — Scarlett Table HUD v1.0 (Canvas Board)
// Purpose: Big readable table identifier + pot/turn/action board above table.
// No "three" import. World passes THREE in (GitHub Pages safe).

export const TableHud = {
  build({ THREE, parent, log = console.log, title = "$10,000 Table", pos = { x: 0, y: 1.55, z: 0 } } = {}) {
    const L = (...a) => { try { log(...a); } catch { console.log(...a); } };

    // ---- canvas ----
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthTest: true
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 0.92), mat);
    mesh.name = "TableHudBoard";
    mesh.position.set(pos.x, pos.y, pos.z);

    // subtle glow backing
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.95, 1.02),
      new THREE.MeshBasicMaterial({ color: 0x0b0d14, transparent: true, opacity: 0.55 })
    );
    glow.position.set(0, 0, -0.002);
    mesh.add(glow);

    parent?.add(mesh);

    const state = {
      title,
      blinds: "Blinds: 50 / 100",
      ante: "Ante: 0",
      pot: 0,
      street: "Preflop",
      turnName: "—",
      turnSeat: "-",
      lastAction: "Waiting…",
      toCall: 0,
      minRaise: 0,
      handNo: 1,
      t: 0,
      target: null
    };

    // ---- draw helpers ----
    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function fmtMoney(n) {
      const v = Math.max(0, Number(n) || 0);
      return "$" + v.toLocaleString();
    }

    function draw() {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // background glass
      ctx.fillStyle = "rgba(10,12,20,0.78)";
      roundRect(28, 28, W - 56, H - 56, 34);
      ctx.fill();

      // border
      ctx.strokeStyle = "rgba(127,231,255,0.22)";
      ctx.lineWidth = 6;
      roundRect(28, 28, W - 56, H - 56, 34);
      ctx.stroke();

      // header bar
      ctx.fillStyle = "rgba(127,231,255,0.12)";
      roundRect(46, 46, W - 92, 108, 26);
      ctx.fill();

      // title
      ctx.fillStyle = "#e8ecff";
      ctx.font = "800 54px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(state.title, 72, 98);

      // right badge: Hand #
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255,45,122,0.95)";
      ctx.font = "800 40px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillText("HAND " + state.handNo, W - 78, 98);

      // 2 columns info cards
      const leftX = 58, rightX = W / 2 + 10;
      const cardW = W / 2 - 78;
      const cardH = 118;

      // card 1: Pot + Street
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      roundRect(leftX, 175, cardW, cardH, 26);
      ctx.fill();

      ctx.fillStyle = "#98a0c7";
      ctx.font = "700 28px system-ui";
      ctx.textAlign = "left";
      ctx.fillText("POT", leftX + 26, 210);

      ctx.fillStyle = "#7fe7ff";
      ctx.font = "900 52px system-ui";
      ctx.fillText(fmtMoney(state.pot), leftX + 26, 265);

      ctx.fillStyle = "#98a0c7";
      ctx.font = "700 26px system-ui";
      ctx.fillText(state.street, leftX + 26, 305);

      // card 2: Turn
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      roundRect(rightX, 175, cardW, cardH, 26);
      ctx.fill();

      ctx.fillStyle = "#98a0c7";
      ctx.font = "700 28px system-ui";
      ctx.textAlign = "left";
      ctx.fillText("TURN", rightX + 26, 210);

      ctx.fillStyle = "#e8ecff";
      ctx.font = "900 46px system-ui";
      ctx.fillText(state.turnName, rightX + 26, 262);

      ctx.fillStyle = "#98a0c7";
      ctx.font = "700 26px system-ui";
      ctx.fillText("Seat " + state.turnSeat, rightX + 26, 305);

      // bottom long card: Last action + to call + min raise
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      roundRect(58, 315, W - 116, 140, 26);
      ctx.fill();

      ctx.fillStyle = "#98a0c7";
      ctx.font = "700 26px system-ui";
      ctx.textAlign = "left";
      ctx.fillText("ACTION", 84, 352);

      ctx.fillStyle = "#e8ecff";
      ctx.font = "800 40px system-ui";
      ctx.fillText(state.lastAction, 84, 404);

      // right-side call/raise
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffcc00";
      ctx.font = "800 28px system-ui";
      ctx.fillText("TO CALL: " + fmtMoney(state.toCall), W - 84, 362);

      ctx.fillStyle = "#4cd964";
      ctx.fillText("MIN RAISE: " + fmtMoney(state.minRaise), W - 84, 410);

      // footer line: blinds/ante
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(232,236,255,0.75)";
      ctx.font = "700 22px system-ui";
      ctx.fillText(state.blinds + "    •    " + state.ante, 72, H - 62);

      tex.needsUpdate = true;
    }

    function billboardTo(targetObj) {
      if (!targetObj) return;
      const p = targetObj.position;
      mesh.lookAt(p.x, mesh.position.y, p.z);
    }

    function setTarget(t) { state.target = t || null; }

    function setData(patch = {}) {
      Object.assign(state, patch);
      draw();
    }

    // default draw
    draw();
    L("[TableHud] build ✅");

    return {
      root: mesh,
      setTarget,
      setData,
      update(dt) {
        state.t += dt;
        // subtle pulse (very light)
        const s = 1.0 + Math.sin(state.t * 1.5) * 0.01;
        mesh.scale.set(s, s, 1);

        billboardTo(state.target);
      }
    };
  }
};
