// js/leaderboard.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

/**
 * Leaderboard: SAFE UI board (never blocks camera).
 * - depthTest/depthWrite OFF
 * - renderOrder HIGH
 * - auto distance clamp away from camera in update()
 */

export const Leaderboard = {
  group: null,
  board: null,
  tex: null,
  ctx: null,
  canvas: null,

  anchor: new THREE.Vector3(0, 1.55, -3.9),
  visible: true,

  build(scene) {
    this.group = new THREE.Group();
    this.group.name = "leaderboard_group";
    scene.add(this.group);

    // canvas texture
    this.canvas = document.createElement("canvas");
    this.canvas.width = 1024;
    this.canvas.height = 512;
    this.ctx = this.canvas.getContext("2d");

    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({
      map: this.tex,
      transparent: true,
      opacity: 0.95,
      roughness: 0.9,
      emissive: 0x111018,
      emissiveIntensity: 0.65,
      depthTest: false,
      depthWrite: false
    });

    const backMat = new THREE.MeshStandardMaterial({
      color: 0x06070c,
      transparent: true,
      opacity: 0.35,
      roughness: 1.0,
      depthTest: false,
      depthWrite: false
    });

    const back = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 1.02), backMat);
    back.position.set(0, 0, 0);
    back.renderOrder = 998;

    this.board = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0), mat);
    this.board.position.set(0, 0, 0.01);
    this.board.renderOrder = 999;

    this.group.add(back);
    this.group.add(this.board);

    this.group.position.copy(this.anchor);
    this.group.rotation.y = Math.PI; // faces toward +Z area

    this._drawDefault();
  },

  setVisible(v) {
    this.visible = !!v;
    if (this.group) this.group.visible = this.visible;
  },

  update(dt, camera, data) {
    if (!this.group || !camera) return;

    // Keep it from ever being too close to camera (prevents blackscreen-like blocking)
    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);

    const boardPos = new THREE.Vector3();
    this.group.getWorldPosition(boardPos);

    const d = camPos.distanceTo(boardPos);
    if (d < 1.25) {
      // shove it to safe anchor (never in face)
      this.group.position.copy(this.anchor);
      this.group.rotation.y = Math.PI;
    }

    // draw
    if (data) this._drawData(data);
  },

  _drawDefault() {
    this._drawData({
      title: "SHOWDOWN LEADERBOARD",
      rows: [
        { name: "Spades", points: 0 },
        { name: "Hearts", points: 0 },
        { name: "Clubs", points: 0 },
        { name: "Diamonds", points: 0 },
      ],
      footer: "Top 10 paid Sunday night • Event Chips awarded"
    });
  },

  _drawData(data) {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, 1024, 512);

    // background
    ctx.fillStyle = "rgba(8,10,16,0.92)";
    ctx.fillRect(0, 0, 1024, 512);

    // neon border
    ctx.strokeStyle = "rgba(0,255,170,0.85)";
    ctx.lineWidth = 10;
    ctx.strokeRect(16, 16, 992, 480);

    ctx.strokeStyle = "rgba(255,60,120,0.8)";
    ctx.lineWidth = 6;
    ctx.strokeRect(26, 26, 972, 460);

    // title
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,60,120,0.95)";
    ctx.font = "bold 58px system-ui";
    ctx.fillText(data.title || "LEADERBOARD", 512, 90);

    // columns
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "bold 38px system-ui";
    ctx.fillText("TEAM", 110, 160);
    ctx.textAlign = "right";
    ctx.fillText("POINTS", 910, 160);

    // rows
    ctx.font = "700 42px system-ui";
    const rows = data.rows || [];
    for (let i = 0; i < Math.min(rows.length, 8); i++) {
      const y = 230 + i * 54;
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(0,255,170,0.92)";
      ctx.fillText(rows[i].name, 110, y);

      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillText(String(rows[i].points ?? 0), 910, y);
    }

    // footer
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.font = "600 28px system-ui";
    ctx.fillText(data.footer || "", 512, 470);

    this.tex.needsUpdate = true;
  },
};
