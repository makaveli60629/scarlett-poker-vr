import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Leaderboard = {
  group: null,
  board: null,
  canvas: null,
  ctx: null,
  tex: null,

  visible: true,
  lastDrawKey: "",

  // place it where it looks good in your lobby/poker view
  anchor: new THREE.Vector3(0, 1.55, -3.9),

  build(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    this.canvas = document.createElement("canvas");
    this.canvas.width = 1024;
    this.canvas.height = 1024;
    this.ctx = this.canvas.getContext("2d");

    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({
      map: this.tex,
      transparent: true,
      roughness: 0.85,
      emissive: 0x101018,
      emissiveIntensity: 0.55
    });

    this.board = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.35), mat);
    this.board.position.copy(this.anchor);
    this.board.renderOrder = 20;

    // backing plate
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(1.42, 1.42),
      new THREE.MeshStandardMaterial({
        color: 0x07080f,
        roughness: 1.0,
        transparent: true,
        opacity: 0.65
      })
    );
    back.position.copy(this.board.position);
    back.position.z -= 0.01;

    this.group.add(back);
    this.group.add(this.board);

    this._drawEmpty();
    this.tex.needsUpdate = true;
  },

  setVisible(v) {
    this.visible = v;
    if (this.group) this.group.visible = v;
  },

  update(dt, camera, data) {
    if (!this.group || !this.visible) return;

    // yaw-only billboard (never tilts)
    if (camera) {
      const cp = new THREE.Vector3();
      camera.getWorldPosition(cp);
      const p = this.board.position.clone();
      const dx = cp.x - p.x;
      const dz = cp.z - p.z;
      const yaw = Math.atan2(dx, dz);
      this.group.rotation.set(0, yaw, 0);
    }

    if (!data) return;

    // redraw only when changed
    const key = JSON.stringify({
      h: data.handId,
      pot: data.pot,
      ph: data.phase,
      win: data.lastWinnerText,
      rows: (data.rows || []).map(r => [r.name, r.chips, r.status])
    });

    if (key === this.lastDrawKey) return;
    this.lastDrawKey = key;

    this._drawLeaderboard(data);
    this.tex.needsUpdate = true;
  },

  _drawEmpty() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 1024, 1024);

    ctx.fillStyle = "rgba(0,0,0,0.60)";
    ctx.fillRect(0,0,1024,1024);

    ctx.lineWidth = 18;
    ctx.strokeStyle = "rgba(255,60,120,0.9)";
    ctx.strokeRect(22, 22, 980, 980);

    ctx.lineWidth = 10;
    ctx.strokeStyle = "rgba(0,255,170,0.75)";
    ctx.strokeRect(64, 64, 896, 896);

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.font = "bold 70px system-ui";
    ctx.fillText("LEADERBOARD", 512, 150);

    ctx.font = "bold 44px system-ui";
    ctx.fillStyle = "rgba(201,162,77,0.92)";
    ctx.fillText("Waiting for table data…", 512, 240);
  },

  _drawLeaderboard(data) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 1024, 1024);

    // background glass
    ctx.fillStyle = "rgba(7,8,15,0.70)";
    ctx.fillRect(0,0,1024,1024);

    // neon borders
    ctx.lineWidth = 18;
    ctx.strokeStyle = "rgba(255,60,120,0.92)";
    ctx.strokeRect(22, 22, 980, 980);

    ctx.lineWidth = 10;
    ctx.strokeStyle = "rgba(0,255,170,0.78)";
    ctx.strokeRect(64, 64, 896, 896);

    // header
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.font = "bold 74px system-ui";
    ctx.fillText("LEADERBOARD", 512, 150);

    ctx.font = "bold 40px system-ui";
    ctx.fillStyle = "rgba(201,162,77,0.95)";
    ctx.fillText(`HAND #${data.handId || 0}  •  POT ${data.pot || 0}`, 512, 210);

    ctx.font = "bold 44px system-ui";
    ctx.fillStyle = "rgba(255,60,120,0.95)";
    ctx.fillText((data.phase || "").toUpperCase(), 512, 275);

    // winner banner
    if (data.lastWinnerText) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(90, 310, 844, 92);
      ctx.lineWidth = 8;
      ctx.strokeStyle = "rgba(0,255,170,0.65)";
      ctx.strokeRect(90, 310, 844, 92);

      ctx.font = "bold 34px system-ui";
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillText(data.lastWinnerText, 512, 370);
    }

    // columns
    const startY = 430;
    ctx.textAlign = "left";
    ctx.font = "bold 36px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText("NAME", 110, startY);
    ctx.fillText("CHIPS", 620, startY);
    ctx.fillText("STATE", 820, startY);

    ctx.fillStyle = "rgba(0,255,170,0.35)";
    ctx.fillRect(100, startY + 18, 824, 6);

    // rows
    let y = startY + 70;
    const rowH = 70;
    const rows = (data.rows || []).slice(0, 8);

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];

      ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.18)";
      ctx.fillRect(92, y - 46, 840, rowH);

      if (r.name === "YOU") {
        ctx.fillStyle = "rgba(201,162,77,0.22)";
        ctx.fillRect(92, y - 46, 840, rowH);
      }

      ctx.font = "bold 36px system-ui";
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillText(r.name || "", 110, y);

      // elegant “red” chips value
      ctx.fillStyle = "rgba(255,60,120,0.95)";
      ctx.fillText(String(r.chips ?? ""), 620, y);

      ctx.fillStyle = "rgba(0,255,170,0.85)";
      ctx.fillText(r.status || "", 820, y);

      y += rowH;
      if (y > 980) break;
    }

    ctx.textAlign = "center";
    ctx.font = "bold 28px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillText("Spectate: visible • Play: we can auto-hide later", 512, 990);
  }
};
