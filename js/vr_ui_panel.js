// js/vr_ui_panel.js — Patch 7.2 FULL
// Adds VIP teleport buttons INSIDE the VR menu panel.
// Keeps the UI lightweight + GitHub-safe.
// Controls:
// - Left controller ray (VRUIPanel handles its own)
// - Menu button toggles panel (already wired in main.js)
//
// New buttons:
// - "Go VIP Poker Room"
// - "Return to Lobby"
//
// Also exposes: VRUIPanel.setTeleportHandlers({ goLobby, goVIP })

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

function makeCanvas(w = 1024, h = 768) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  return { canvas: c, ctx };
}

function drawButton(ctx, x, y, w, h, label, hot, active) {
  ctx.save();
  ctx.fillStyle = "rgba(10,12,18,0.86)";
  ctx.fillRect(x, y, w, h);

  ctx.lineWidth = 8;
  ctx.strokeStyle = hot ? "rgba(0,255,170,0.95)" : "rgba(255,60,120,0.80)";
  ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);

  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.strokeRect(x + 18, y + 18, w - 36, h - 36);

  ctx.font = "900 44px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = active ? "rgba(0,255,170,0.98)" : "rgba(255,255,255,0.95)";
  ctx.fillText(label, x + w / 2, y + h / 2);

  ctx.restore();
}

export const VRUIPanel = {
  scene: null,
  camera: null,
  renderer: null,

  group: null,
  panelMesh: null,
  tex: null,
  canvas: null,
  ctx: null,

  visible: false,

  // interaction
  raycaster: new THREE.Raycaster(),
  pointer: new THREE.Vector2(),

  // handlers
  onEquip: null,
  onToast: null,

  // teleport hooks (set by main)
  goLobby: null,
  goVIP: null,

  // UI hit regions in canvas coords
  buttons: [],

  init(scene, camera, renderer, { onEquip, onToast } = {}) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.onEquip = onEquip || null;
    this.onToast = onToast || null;

    this._build();
    this.hide();
  },

  setTeleportHandlers({ goLobby, goVIP } = {}) {
    if (goLobby) this.goLobby = goLobby;
    if (goVIP) this.goVIP = goVIP;
  },

  _build() {
    // Remove old if exists
    if (this.group && this.scene) {
      try { this.scene.remove(this.group); } catch {}
    }

    this.group = new THREE.Group();
    this.group.name = "VRUIPanelGroup";
    this.scene.add(this.group);

    const { canvas, ctx } = makeCanvas(1024, 768);
    this.canvas = canvas;
    this.ctx = ctx;

    this.tex = new THREE.CanvasTexture(canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({
      map: this.tex,
      transparent: true,
      opacity: 0.96,
      roughness: 0.9,
      emissive: 0x111018,
      emissiveIntensity: 0.85,
      depthTest: true,
      depthWrite: false
    });

    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55, 1.10),
      new THREE.MeshStandardMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.25,
        roughness: 1.0
      })
    );
    back.renderOrder = 998;

    this.panelMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.05), mat);
    this.panelMesh.position.z = 0.01;
    this.panelMesh.renderOrder = 999;

    this.group.add(back);
    this.group.add(this.panelMesh);

    // default position (in front of camera)
    this.group.position.set(0, 1.55, -1.35);

    this._layoutButtons();
    this._draw();
  },

  _layoutButtons() {
    // canvas coordinates
    this.buttons = [
      { id: "vip",   x: 120, y: 150, w: 784, h: 120, label: "Go VIP Poker Room" },
      { id: "lobby", x: 120, y: 300, w: 784, h: 120, label: "Return to Lobby" },
      { id: "shop",  x: 120, y: 470, w: 784, h: 120, label: "Avatar Shop (Coming)" }
    ];
  },

  _draw(activeId = null) {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, 1024, 768);

    // background
    ctx.fillStyle = "rgba(8,10,16,0.92)";
    ctx.fillRect(0, 0, 1024, 768);

    // borders
    ctx.strokeStyle = "rgba(0,255,170,0.85)";
    ctx.lineWidth = 10;
    ctx.strokeRect(16, 16, 992, 736);

    ctx.strokeStyle = "rgba(255,60,120,0.8)";
    ctx.lineWidth = 6;
    ctx.strokeRect(26, 26, 972, 716);

    // title
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,60,120,0.95)";
    ctx.font = "900 56px system-ui";
    ctx.fillText("SCARLETT VR MENU", 512, 85);

    // buttons
    for (const b of this.buttons) {
      const isHot = b.id === "vip";
      drawButton(ctx, b.x, b.y, b.w, b.h, b.label, isHot, activeId === b.id);
    }

    // footer
    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.font = "700 26px system-ui";
    ctx.fillText("Menu: toggle • Grip: interact • 1=Lobby • 2=VIP", 512, 710);

    this.tex.needsUpdate = true;
  },

  toggle() {
    this.visible ? this.hide() : this.show();
  },

  show() {
    if (!this.group || !this.camera) return;
    this.visible = true;

    // place in front of camera, facing camera
    const camPos = new THREE.Vector3();
    this.camera.getWorldPosition(camPos);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    const pos = camPos.clone().add(forward.multiplyScalar(1.35));
    pos.y = camPos.y; // keep level

    this.group.position.copy(pos);

    // yaw only
    const yaw = Math.atan2(forward.x, forward.z);
    this.group.rotation.set(0, yaw, 0);

    this.group.visible = true;
    this._draw();
    this.onToast?.("Menu opened");
  },

  hide() {
    if (!this.group) return;
    this.visible = false;
    this.group.visible = false;
  },

  // Called each frame
  update(dt) {
    if (!this.visible || !this.camera || !this.group) return;

    // keep panel roughly locked in front
    const camPos = new THREE.Vector3();
    this.camera.getWorldPosition(camPos);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    const desired = camPos.clone().add(forward.multiplyScalar(1.35));
    desired.y = camPos.y;

    this.group.position.lerp(desired, 1 - Math.exp(-8 * dt));

    const yaw = Math.atan2(forward.x, forward.z);
    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, yaw, 1 - Math.exp(-10 * dt));
  },

  // Called by Interactions.onGrip() if you want UI clicking
  click() {
    if (!this.visible) return false;

    // Use a ray from camera center to panel
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const hits = this.raycaster.intersectObject(this.panelMesh, true);
    if (!hits.length) return false;

    const hit = hits[0];
    const uv = hit.uv;
    if (!uv) return false;

    // convert uv to canvas coords
    const cx = uv.x * 1024;
    const cy = (1 - uv.y) * 768;

    for (const b of this.buttons) {
      if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
        this._draw(b.id);

        if (b.id === "vip") {
          this.onToast?.("Teleporting to VIP…");
          this.goVIP?.();
          return true;
        }

        if (b.id === "lobby") {
          this.onToast?.("Teleporting to Lobby…");
          this.goLobby?.();
          return true;
        }

        if (b.id === "shop") {
          this.onToast?.("Avatar Shop coming next.");
          return true;
        }
      }
    }

    return false;
  }
};
