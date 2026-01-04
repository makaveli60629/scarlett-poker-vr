import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const WatchUI = {
  group: null,
  canvas: null,
  ctx: null,
  tex: null,
  visible: false,
  buttons: [],
  hitPlanes: [],

  build(scene) {
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    this.canvas = document.createElement("canvas");
    this.canvas.width = 1024;
    this.canvas.height = 1024;
    this.ctx = this.canvas.getContext("2d");
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({ map: this.tex, transparent: true });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), mat);
    plate.position.set(0.085, 0.045, -0.065);
    plate.rotation.y = -0.58;
    plate.rotation.x = -0.18;
    this.group.add(plate);

    const hit = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.24),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 })
    );
    hit.position.copy(plate.position);
    hit.rotation.copy(plate.rotation);
    hit.userData.ui = "watch_hit";
    this.group.add(hit);
    this.hitPlanes = [hit];

    this._defineButtons();
    this._draw("Ready ✅");
  },

  toggle() {
    this.visible = !this.visible;
    this.group.visible = this.visible;
  },
  close() { this.visible = false; this.group.visible = false; },

  setToast(text) { this._draw(text); },

  _defineButtons() {
    this.buttons = [
      { label:"Lobby", action:"go_lobby", x:0.08, y:0.18, w:0.84, h:0.14 },
      { label:"Store", action:"go_store", x:0.08, y:0.35, w:0.84, h:0.14 },
      { label:"Poker", action:"go_poker", x:0.08, y:0.52, w:0.84, h:0.14 },
      { label:"Music", action:"toggle_music", x:0.08, y:0.69, w:0.84, h:0.14 },
      { label:"Mute",  action:"mute_music", x:0.08, y:0.86, w:0.84, h:0.10 },
    ];
  },

  hitToAction({u,v}) {
    for (const b of this.buttons) {
      if (u >= b.x && u <= b.x+b.w && v >= b.y && v <= b.y+b.h) return b.action;
    }
    return null;
  },

  _draw(toastText) {
    const ctx = this.ctx;
    const c = this.canvas;
    ctx.clearRect(0,0,c.width,c.height);

    // neon glass background
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillRect(0,0,c.width,c.height);

    // neon outer
    ctx.strokeStyle = "rgba(0,255,170,0.85)";
    ctx.lineWidth = 24;
    ctx.strokeRect(38,38,c.width-76,c.height-76);

    // gold inner
    ctx.strokeStyle = "rgba(201,162,77,0.85)";
    ctx.lineWidth = 12;
    ctx.strokeRect(72,72,c.width-144,c.height-144);

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.font = "bold 86px system-ui";
    ctx.fillText("NOVA MENU", c.width/2, 145);

    for (const b of this.buttons) {
      const x = b.x*c.width, y = b.y*c.height, w = b.w*c.width, h = b.h*c.height;
      // button fill
      ctx.fillStyle = "rgba(18,22,35,0.92)";
      roundRect(ctx, x, y, w, h, 28, true, false);

      // neon outline
      ctx.strokeStyle = "rgba(255,80,200,0.85)";
      ctx.lineWidth = 10;
      roundRect(ctx, x, y, w, h, 28, false, true);

      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = "bold 72px system-ui";
      ctx.fillText(b.label, c.width/2, y + h/2 + 24);
    }

    // toast
    ctx.fillStyle = "rgba(0,0,0,0.80)";
    roundRect(ctx, 90, 868, 844, 120, 28, true, false);
    ctx.fillStyle = "rgba(0,255,170,0.95)";
    ctx.font = "bold 54px system-ui";
    ctx.fillText(String(toastText || ""), c.width/2, 945);

    this.tex.needsUpdate = true;
  }
};

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}
