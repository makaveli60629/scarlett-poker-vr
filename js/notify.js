import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Notify = {
  group: null,
  panel: null,
  okBtn: null,
  visible: false,
  currentText: "Hello",
  _hitTargets: [],

  build(scene) {
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true });

    this.panel = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.70), mat);
    this.panel.position.set(0, 1.6, -1.6);
    this.panel.castShadow = true;
    this.group.add(this.panel);

    // OK button (3D)
    const btnMat = new THREE.MeshStandardMaterial({ color: 0xC9A24D, metalness: 0.7, roughness: 0.25 });
    this.okBtn = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.10, 0.04), btnMat);
    this.okBtn.position.set(0, 1.25, -1.55);
    this.okBtn.userData.ui = "notify_ok";
    this.group.add(this.okBtn);
    this._hitTargets = [this.okBtn];

    this._canvas = canvas;
    this._ctx = ctx;
    this._tex = tex;

    this._draw("Ready.");
  },

  show(text) {
    this.currentText = text;
    this._draw(text);
    this.group.visible = true;
    this.visible = true;
  },

  hide() {
    this.group.visible = false;
    this.visible = false;
  },

  // attach in front of camera each frame
  face(camera) {
    if (!this.visible) return;
    const p = new THREE.Vector3();
    camera.getWorldPosition(p);
    const f = new THREE.Vector3();
    camera.getWorldDirection(f);
    f.y = 0; f.normalize();

    this.group.position.copy(p).add(f.multiplyScalar(1.6));
    this.group.position.y = p.y; // keep it level
    this.group.lookAt(p.x, p.y, p.z);
  },

  hitTest(origin, dir) {
    if (!this.visible) return null;
    const ray = new THREE.Raycaster(origin, dir, 0.01, 10);
    const hits = ray.intersectObjects(this._hitTargets, true);
    return hits.length ? hits[0].object : null;
  },

  _draw(text) {
    const ctx = this._ctx;
    const c = this._canvas;

    ctx.clearRect(0,0,c.width,c.height);

    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0,0,c.width,c.height);

    ctx.strokeStyle = "rgba(201,162,77,0.9)";
    ctx.lineWidth = 10;
    ctx.strokeRect(24,24,c.width-48,c.height-48);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 64px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("NOTICE", c.width/2, 110);

    ctx.font = "42px system-ui";
    ctx.fillStyle = "rgba(255,90,90,0.95)";
    wrapText(ctx, text, c.width/2, 210, 860, 54);

    ctx.font = "bold 44px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.90)";
    ctx.fillText("Press OK", c.width/2, 440);

    this._tex.needsUpdate = true;
  }
};

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(" ");
  let line = "";
  let yy = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, yy);
      line = words[n] + " ";
      yy += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, yy);
}
