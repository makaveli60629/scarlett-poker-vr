import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const WatchUI = {
  group: null,
  sprite: null,
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

    const mat = new THREE.MeshStandardMaterial({ map: this.tex, transparent: true });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), mat);
    plate.position.set(0.08, 0.04, -0.06);
    plate.rotation.y = -0.55;
    plate.rotation.x = -0.2;
    this.group.add(plate);

    // invisible hit plane aligned to plate
    const hit = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 0.22),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 })
    );
    hit.position.copy(plate.position);
    hit.rotation.copy(plate.rotation);
    hit.userData.ui = "watch_hit";
    this.group.add(hit);
    this.hitPlanes = [hit];

    this._defineButtons();
    this._draw("Ready");

    return this.group;
  },

  attachToController(controller) {
    if (!controller) return;
    controller.add(this.group);
  },

  toggle() {
    this.visible = !this.visible;
    this.group.visible = this.visible;
  },

  close() {
    this.visible = false;
    this.group.visible = false;
  },

  setToast(text) {
    this._draw(text);
  },

  _defineButtons() {
    // normalized coords in 0..1
    this.buttons = [
      { label:"Lobby",  action:"go_lobby",  x:0.08, y:0.18, w:0.84, h:0.14 },
      { label:"Store",  action:"go_store",  x:0.08, y:0.35, w:0.84, h:0.14 },
      { label:"Poker",  action:"go_poker",  x:0.08, y:0.52, w:0.84, h:0.14 },
      { label:"Music",  action:"toggle_music", x:0.08, y:0.69, w:0.84, h:0.14 },
      { label:"Mute",   action:"mute_music",   x:0.08, y:0.86, w:0.84, h:0.10 },
    ];
  },

  _draw(toastText) {
    const ctx = this.ctx;
    const c = this.canvas;
    ctx.clearRect(0,0,c.width,c.height);

    // background
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0,0,c.width,c.height);

    // gold frame
    ctx.strokeStyle = "rgba(201,162,77,0.95)";
    ctx.lineWidth = 28;
    ctx.strokeRect(40,40,c.width-80,c.height-80);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 88px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("NOVA WATCH", c.width/2, 150);

    // buttons
    for (const b of this.buttons) {
      const x = b.x*c.width, y = b.y*c.height, w = b.w*c.width, h = b.h*c.height;
      ctx.fillStyle = "rgba(30,32,48,0.85)";
      roundRect(ctx, x, y, w, h, 26, true, false);

      ctx.strokeStyle = "rgba(255,80,90,0.85)";
      ctx.lineWidth = 10;
      roundRect(ctx, x, y, w, h, 26, false, true);

      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = "bold 72px system-ui";
      ctx.fillText(b.label, c.width/2, y + h/2 + 22);
    }

    // toast
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    roundRect(ctx, 90, 860, 844, 120, 28, true, false);
    ctx.fillStyle = "rgba(0,255,170,0.95)";
    ctx.font = "bold 56px system-ui";
    ctx.fillText(String(toastText || ""), c.width/2, 940);

    this.tex.needsUpdate = true;
  },

  // Convert ray hit on watch plane into button action
  hitToAction(hitPointUV) {
    // hitPointUV is {u,v} with u,v in 0..1
    const u = hitPointUV.u;
    const v = hitPointUV.v;

    for (const b of this.buttons) {
      if (u >= b.x && u <= b.x+b.w && v >= b.y && v <= b.y+b.h) {
        return b.action;
      }
    }
    return null;
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
