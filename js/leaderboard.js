// /js/leaderboard.js — glassy neon board

import * as T from "./three.js";
const THREE = T;

export const Leaderboard = {
  group: null,
  board: null,
  tex: null,
  ctx: null,
  canvas: null,
  visible: true,

  build(parent) {
    this.group = new THREE.Group();
    this.group.name = "leaderboard_group";
    parent.add(this.group);

    this.canvas = document.createElement("canvas");
    this.canvas.width = 1024;
    this.canvas.height = 512;
    this.ctx = this.canvas.getContext("2d");

    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;

    const glass = new THREE.MeshStandardMaterial({
      color: 0x05060a,
      transparent: true,
      opacity: 0.85,
      roughness: 0.25,
      metalness: 0.2,
      emissive: 0x06070f,
      emissiveIntensity: 0.5
    });

    const face = new THREE.MeshStandardMaterial({
      map: this.tex,
      transparent: true,
      opacity: 0.98,
      roughness: 0.35,
      emissive: 0x0b1220,
      emissiveIntensity: 0.6,
      depthTest: false,
      depthWrite: false,
    });

    const back = new THREE.Mesh(new THREE.PlaneGeometry(2.30, 1.12), glass);
    back.renderOrder = 998;

    this.board = new THREE.Mesh(new THREE.PlaneGeometry(2.20, 1.06), face);
    this.board.position.z = 0.01;
    this.board.renderOrder = 999;

    this.group.add(back, this.board);

    this._draw([
      "Boss Tournament — Top 10",
      "1) —",
      "2) —",
      "3) —",
      "4) —",
      "5) —",
    ]);
  },

  update(dt, camera, lines) {
    if (!this.group) return;
    if (lines) this._draw(lines);
  },

  _draw(lines = []) {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, 1024, 512);

    ctx.fillStyle = "rgba(5,6,10,0.85)";
    ctx.fillRect(0, 0, 1024, 512);

    // neon border
    ctx.strokeStyle = "rgba(0,255,170,0.85)";
    ctx.lineWidth = 10;
    ctx.strokeRect(18, 18, 988, 476);

    ctx.strokeStyle = "rgba(255,43,214,0.75)";
    ctx.lineWidth = 6;
    ctx.strokeRect(30, 30, 964, 452);

    // title
    ctx.font = "900 58px system-ui";
    ctx.fillStyle = "rgba(255,210,122,0.95)";
    ctx.fillText(lines[0] || "Boss Tournament", 54, 92);

    ctx.font = "800 44px system-ui";
    let y = 170;
    for (let i = 1; i < Math.min(lines.length, 10); i++) {
      ctx.fillStyle = (i === 1) ? "rgba(0,255,170,0.95)" : "rgba(233,238,252,0.92)";
      ctx.fillText(lines[i], 54, y);
      y += 56;
    }

    this.tex.needsUpdate = true;
  },
};
