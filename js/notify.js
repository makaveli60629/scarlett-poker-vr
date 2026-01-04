import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Notify = {
  group: null,
  panel: null,
  okBtn: null,
  visible: false,
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
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true });
    // BIGGER panel (was 1.35x0.70)
    this.panel = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.95), mat);
    this.panel.castShadow = true;
    this.group.add(this.panel);

    // OK button (bigger + closer)
    const btnMat = new THREE.MeshStandardMaterial({
      color: 0xC9A24D, metalness: 0.8, roughness: 0.25,
      emissive: 0x5a3f0a, emissiveIntensity: 0.8
    });
    this.okBtn = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.13, 0.05), btnMat);
    this.okBtn.userData.ui = "notify_ok";
    this.group.add(this.okBtn);

    this._hitTargets = [this.okBtn];

    this._canvas = canvas;
    this._ctx = ctx;
    this._tex = tex;

    this._layout();
    this._draw("Ready.");
  },

  _layout() {
    // Place OK button relative to panel (local)
    this.panel.position.set(0, 0.10, 0);
    this.okBtn.position.set(0, -0.42, 0.02);
  },

  show(text) {
    this._draw(text);
    this.group.visible = true;
    this.visible = true;
  },

  hide() {
    this.group.visible = false;
    this.visible = false;
  },

  // Bring it closer to face + stable
  face(camera) {
    if (!this.visible) return;

    const p = new THREE.Vector3();
    camera.getWorldPosition(p);

    const f = new THREE.Vector3();
    camera.getWorldDirection(f);
    f.normalize();

    // CLOSER (was ~1.6 away), now ~1.15
    const front = p.clone().add(f.multiplyScalar(1.15));
    this.group.position.copy(front);

    // keep at a comfortable eye height
    this.group.position.y = p.y - 0.05;

    // look at camera
    this.group.lookAt(p.x, p.y - 0.05, p.z);
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

    // Dark glass panel
    ctx.fillStyle = "rgba(5,6,10,0.80)";
    ctx.fillRect(0,0,c.width,c.height);

    // Neon border
    ctx.strokeStyle = "rgba(0,255,170,0.85)";
    ctx.lineWidth = 10;
    ctx.strokeRect(22,22,c.width-44,c.height-44);

    // Gold inner border
    ctx.strokeStyle = "rgba(201,162,77,0.85)";
    ctx.lineWidth = 6;
    ctx.strokeRect(44,44,c.width-88,c.height-88);

    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.font = "bold 62px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("CONFIRM ACTION", c.width/2, 110);

    ctx.font = "46px system-ui";
    ctx.fillStyle = "rgba(255,90,90,0.95)";
    wrapText(ctx, String(text), c.width/2, 210, 880, 56);

    ctx.font = "bold 44px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText("Press OK", c.width/2, 455);

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
