// js/vr_ui_panel.js — Patch 6.6
// In-world VR shop panel + controller laser pointer + trigger click
// GitHub-safe (Three.js CDN). No DOM UI required in VR.
// Works in VR and also in non-VR using camera ray + mouse click.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { Inventory } from "./inventory.js";

const _raycaster = new THREE.Raycaster();
const _tmpV3 = new THREE.Vector3();
const _tmpV3b = new THREE.Vector3();
const _tmpQ = new THREE.Quaternion();

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function makeCanvasTex(w = 1024, h = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { canvas, ctx, tex };
}

export const VRUIPanel = {
  scene: null,
  camera: null,
  renderer: null,

  group: null,
  panel: null,
  tex: null,
  ctx: null,
  canvas: null,

  // buttons
  buttons: [],
  hoverIndex: -1,

  // position
  anchor: new THREE.Vector3(-5.2, 1.55, 4.7),
  visible: false,

  // controller rays
  controller0: null,
  controller1: null,
  rayLine0: null,
  rayLine1: null,

  // input edge states
  _triggerPressedFrame: false,
  _triggerDown: false,

  // store items
  items: [
    { id: "hat_black", type: "hat", name: "Black Hat", price: 0, desc: "Starter item." },
    { id: "glasses_neon", type: "glasses", name: "Neon Glasses", price: 2500, desc: "Glow style." },
    { id: "shirt_nova", type: "shirt", name: "Team Nova Shirt", price: 3500, desc: "Classic." },
    { id: "crown_fx", type: "fx", name: "Crown FX", price: 6000, desc: "Winner aura." }
  ],

  onEquip: null,
  onToast: null,

  init(scene, camera, renderer, { onEquip, onToast } = {}) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.onEquip = onEquip || null;
    this.onToast = onToast || null;

    // Panel group
    this.group = new THREE.Group();
    this.group.name = "VRUIPanel";
    this.group.position.copy(this.anchor);
    this.group.rotation.y = Math.PI / 2;

    // Canvas texture
    const { canvas, ctx, tex } = makeCanvasTex(1024, 512);
    this.canvas = canvas;
    this.ctx = ctx;
    this.tex = tex;

    const mat = new THREE.MeshStandardMaterial({
      map: this.tex,
      transparent: true,
      opacity: 0.98,
      roughness: 0.9,
      emissive: 0x0c121a,
      emissiveIntensity: 0.55,
      depthTest: true,
      depthWrite: false
    });

    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(2.25, 1.18),
      new THREE.MeshStandardMaterial({
        color: 0x05060a,
        transparent: true,
        opacity: 0.45,
        roughness: 1.0
      })
    );
    back.position.z = -0.01;

    this.panel = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.12), mat);
    this.panel.renderOrder = 999;

    // subtle glow frame
    const frame = new THREE.Mesh(
      new THREE.PlaneGeometry(2.33, 1.25),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.1,
        transparent: true,
        opacity: 0.14,
        roughness: 0.35
      })
    );
    frame.position.z = -0.02;

    this.group.add(back, frame, this.panel);
    this.scene.add(this.group);

    // Interactable button rects in canvas space
    // We'll rebuild buttons each draw, but keep rect layout stable.
    this._buildButtons();

    // Controllers (laser)
    this._initControllers();

    // Start hidden
    this.setVisible(false);
    this.draw();
  },

  _initControllers() {
    if (!this.renderer?.xr) return;

    // create controller objects even if not in session yet
    this.controller0 = this.renderer.xr.getController(0);
    this.controller1 = this.renderer.xr.getController(1);
    this.scene.add(this.controller0);
    this.scene.add(this.controller1);

    const makeRay = () => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
      ]);
      const mat = new THREE.LineBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.85 });
      const line = new THREE.Line(geo, mat);
      line.scale.z = 6.0;
      return line;
    };

    this.rayLine0 = makeRay();
    this.rayLine1 = makeRay();
    this.controller0.add(this.rayLine0);
    this.controller1.add(this.rayLine1);

    // Trigger input (selectstart/selectend)
    const onSelectStart = () => {
      this._triggerPressedFrame = !this._triggerDown;
      this._triggerDown = true;
    };
    const onSelectEnd = () => {
      this._triggerDown = false;
    };

    this.controller0.addEventListener("selectstart", onSelectStart);
    this.controller0.addEventListener("selectend", onSelectEnd);
    this.controller1.addEventListener("selectstart", onSelectStart);
    this.controller1.addEventListener("selectend", onSelectEnd);

    // Non-VR mouse click fallback (phone/desktop)
    window.addEventListener("pointerdown", () => {
      this._triggerPressedFrame = true;
    });
  },

  setVisible(v) {
    this.visible = !!v;
    if (this.group) this.group.visible = this.visible;
    if (this.rayLine0) this.rayLine0.visible = this.visible;
    if (this.rayLine1) this.rayLine1.visible = this.visible;
    if (this.visible) this.draw();
  },

  toggle() {
    this.setVisible(!this.visible);
    if (this.visible) this.onToast?.("VR Shop opened");
    else this.onToast?.("VR Shop closed");
  },

  _buildButtons() {
    // Canvas layout positions
    // Each item gets a buy/equip button on the right.
    this.buttons = [];

    const btnW = 220;
    const btnH = 56;
    const startY = 170;
    const rowH = 80;

    for (let i = 0; i < this.items.length; i++) {
      const y = startY + i * rowH;
      this.buttons.push({
        id: this.items[i].id,
        type: "item",
        index: i,
        rect: { x: 780, y: y, w: btnW, h: btnH }
      });
    }

    // Close button
    this.buttons.push({
      id: "close",
      type: "close",
      index: -1,
      rect: { x: 948, y: 26, w: 48, h: 48 }
    });
  },

  _drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  draw() {
    if (!this.ctx) return;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, 1024, 512);

    // background
    ctx.fillStyle = "rgba(8,10,16,0.92)";
    ctx.fillRect(0, 0, 1024, 512);

    // frame
    ctx.strokeStyle = "rgba(0,255,170,0.75)";
    ctx.lineWidth = 10;
    ctx.strokeRect(16, 16, 992, 480);

    ctx.strokeStyle = "rgba(255,60,120,0.65)";
    ctx.lineWidth = 6;
    ctx.strokeRect(26, 26, 972, 460);

    // header
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "900 46px system-ui";
    ctx.fillText("VR SHOP", 60, 86);

    // close button
    ctx.fillStyle = "rgba(255,60,120,0.90)";
    this._drawRoundedRect(ctx, 948, 26, 48, 48, 12);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.95)";
    ctx.font = "900 28px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("X", 972, 60);

    // chips
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(0,255,170,0.95)";
    ctx.font = "900 34px system-ui";
    ctx.fillText(`${Inventory.getChips().toLocaleString()} chips`, 960, 88);

    // items
    const eq = Inventory.equipped();
    ctx.textAlign = "left";

    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      const y = 170 + i * 80;

      const owned = Inventory.owns(it.id) || it.price === 0;
      const equipped =
        (it.type === "hat" && eq.hat === it.id) ||
        (it.type === "glasses" && eq.glasses === it.id) ||
        (it.type === "shirt" && eq.shirt === it.id) ||
        (it.type === "fx" && eq.fx === it.id);

      // row label
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "900 30px system-ui";
      ctx.fillText(it.name, 60, y);

      ctx.fillStyle = "rgba(255,255,255,0.70)";
      ctx.font = "600 22px system-ui";
      ctx.fillText(it.desc, 60, y + 26);

      // price/status
      const status = equipped ? "EQUIPPED" : owned ? "OWNED" : "LOCKED";
      ctx.fillStyle = equipped ? "rgba(0,255,170,0.95)" : "rgba(255,255,255,0.7)";
      ctx.font = "800 22px system-ui";
      ctx.fillText(status, 60, y + 52);

      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "800 22px system-ui";
      ctx.fillText(it.price === 0 ? "FREE" : `${it.price.toLocaleString()}`, 740, y + 52);
      ctx.textAlign = "left";

      // button
      const rect = { x: 780, y: y, w: 220, h: 56 };
      const hover = (this.hoverIndex === i);
      const label = equipped ? "UNEQUIP" : owned ? "EQUIP" : "BUY";

      ctx.fillStyle = hover ? "rgba(0,255,170,0.95)" : "rgba(0,255,170,0.78)";
      this._drawRoundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 16);
      ctx.fill();

      ctx.fillStyle = "rgba(0,0,0,0.95)";
      ctx.font = "900 24px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(label, rect.x + rect.w / 2, rect.y + 36);
      ctx.textAlign = "left";
    }

    this.tex.needsUpdate = true;
  },

  // Raycast onto the panel plane and convert to canvas space.
  _panelHitFromRay(origin, dir) {
    if (!this.panel) return null;
    _raycaster.set(origin, dir);
    _raycaster.far = 8;

    const hits = _raycaster.intersectObject(this.panel, true);
    if (!hits || hits.length === 0) return null;

    const hit = hits[0];
    const uv = hit.uv; // 0..1
    if (!uv) return null;

    // uv.y is bottom->top; canvas y is top->bottom
    const x = uv.x * 1024;
    const y = (1 - uv.y) * 512;
    return { x, y, distance: hit.distance };
  },

  _buttonAt(x, y) {
    for (const b of this.buttons) {
      const r = b.rect;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return b;
    }
    // close button
    const c = this.buttons.find((b) => b.type === "close");
    if (c) {
      const r = c.rect;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return c;
    }
    return null;
  },

  _handleButton(button) {
    if (!button) return;

    if (button.type === "close") {
      this.setVisible(false);
      return this.onToast?.("VR Shop closed");
    }

    const it = this.items[button.index];
    if (!it) return;

    const owned = Inventory.owns(it.id) || it.price === 0;
    const eq = Inventory.equipped();

    const equipped =
      (it.type === "hat" && eq.hat === it.id) ||
      (it.type === "glasses" && eq.glasses === it.id) ||
      (it.type === "shirt" && eq.shirt === it.id) ||
      (it.type === "fx" && eq.fx === it.id);

    if (!owned) {
      const ok = Inventory.spendChips(it.price);
      if (!ok) return this.onToast?.("Not enough chips.");
      Inventory.unlock(it.id);
      this.onToast?.(`Purchased: ${it.name}`);
    }

    const slot = it.type;
    if (equipped) {
      Inventory.equip(slot, null);
      this.onToast?.(`Unequipped: ${it.name}`);
    } else {
      Inventory.equip(slot, it.id);
      this.onToast?.(`Equipped: ${it.name}`);
    }

    this.onEquip?.(Inventory.equipped());
    this.draw();
  },

  _getRayFromController(ctrl) {
    if (!ctrl) return null;
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3(0, 0, -1);

    ctrl.getWorldPosition(origin);
    ctrl.getWorldQuaternion(_tmpQ);
    dir.applyQuaternion(_tmpQ).normalize();

    return { origin, dir };
  },

  _getRayFromCamera() {
    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);

    const dir = new THREE.Vector3(0, 0, -1);
    this.camera.getWorldQuaternion(_tmpQ);
    dir.applyQuaternion(_tmpQ).normalize();

    return { origin, dir };
  },

  update(dt) {
    if (!this.visible) {
      this._triggerPressedFrame = false;
      return;
    }

    // Determine active ray: prefer right controller if available, else left, else camera
    let ray = this._getRayFromController(this.controller1);
    if (!ray) ray = this._getRayFromController(this.controller0);
    if (!ray) ray = this._getRayFromCamera();

    // Update laser lengths and hit highlight
    const hit = this._panelHitFromRay(ray.origin, ray.dir);
    let hoverIdx = -1;

    if (hit) {
      const btn = this._buttonAt(hit.x, hit.y);
      if (btn?.type === "item") hoverIdx = btn.index;

      // shorten ray to hit
      const len = clamp(hit.distance, 0.15, 6.0);
      if (this.rayLine0) this.rayLine0.scale.z = len;
      if (this.rayLine1) this.rayLine1.scale.z = len;

      // click on trigger press
      if (this._triggerPressedFrame) {
        this._handleButton(btn);
      }
    } else {
      // no hit -> normal length
      if (this.rayLine0) this.rayLine0.scale.z = 6.0;
      if (this.rayLine1) this.rayLine1.scale.z = 6.0;
    }

    // hover redraw only when changes
    if (hoverIdx !== this.hoverIndex) {
      this.hoverIndex = hoverIdx;
      this.draw();
    }

    // consume click
    this._triggerPressedFrame = false;
  },

  // allow main.js to feed trigger clicks if you want (optional)
  triggerClick() {
    this._triggerPressedFrame = true;
  }
};
