// /js/ui.js — Skylark Poker VR (Update 9.0)
// Full UI system: Wrist "watch" menu (LEFT controller), world leaderboard screen,
// toggle via keyboard M + left controller menu button event ("nova_toggle_menu").
// Also exposes helpers: UI.setLeaderboard(lines), UI.showToast(text).
//
// IMPORTANT: This file uses local "./three.js" (NOT "three") for GitHub Pages stability.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const UI = {
  scene: null,
  camera: null,

  // groups
  wrist: null,
  wristPivot: null,       // attaches to controller anchor
  leaderboard: null,
  toast: null,

  // state
  visible: false,
  lastToastT: 0,
  toastHold: 2.5,

  // callback hooks (wired by main.js)
  onNavigate: null,       // (route) => {}
  onResetSpawn: null,     // () => {}
  onToggleTeleport: null, // () => {}

  // internal
  _buttons: [],
  _rayTmp: new THREE.Raycaster(),
  _v2: new THREE.Vector2(),
  _tmp: new THREE.Vector3(),

  // controller anchors (set from main.js)
  leftAnchor: null,
  rightAnchor: null,

  init(scene, camera, opts = {}) {
    this.scene = scene;
    this.camera = camera;

    this.onNavigate = opts.onNavigate || null;
    this.onResetSpawn = opts.onResetSpawn || null;
    this.onToggleTeleport = opts.onToggleTeleport || null;

    // ---- WRIST WATCH MENU (Left controller) ----
    this.wrist = new THREE.Group();
    this.wrist.name = "WristMenu";
    this.wrist.visible = false;

    // pivot lets us offset on wrist nicely
    this.wristPivot = new THREE.Group();
    this.wristPivot.name = "WristPivot";
    this.wrist.add(this.wristPivot);

    // panel (glassy black + gold rim)
    const panel = this._makeGlassPanel(0.26, 0.16);
    panel.name = "WristPanel";
    panel.position.set(0.06, 0.02, -0.06); // offset relative to controller
    panel.rotation.set(-0.55, 0.0, 0.25);  // tilt toward player
    this.wristPivot.add(panel);
    this._wristPanel = panel;

    // title strip
    const title = this._makeLabel("SKYLARK", 0.18, "#FFD27A", 0.02, true);
    title.position.set(0, 0.058, 0.004);
    panel.add(title);

    // buttons row (Lobby / Poker / Store)
    const b1 = this._makeButton("Lobby", 0.075, 0.032, () => this._nav("lobby"));
    const b2 = this._makeButton("Poker", 0.075, 0.032, () => this._nav("poker"));
    const b3 = this._makeButton("Store", 0.075, 0.032, () => this._nav("store"));

    b1.position.set(-0.078, 0.010, 0.004);
    b2.position.set( 0.000, 0.010, 0.004);
    b3.position.set( 0.078, 0.010, 0.004);

    panel.add(b1, b2, b3);

    // second row (Teleport / Reset)
    const b4 = this._makeButton("Teleport", 0.105, 0.032, () => this._toggleTeleport());
    const b5 = this._makeButton("Reset",    0.105, 0.032, () => this._resetSpawn());

    b4.position.set(-0.055, -0.032, 0.004);
    b5.position.set( 0.055, -0.032, 0.004);

    panel.add(b4, b5);

    // hint
    const hint = this._makeLabel("Menu to toggle", 0.13, "#2BD7FF", 0.016, false);
    hint.position.set(0, -0.066, 0.004);
    panel.add(hint);

    // collect buttons for hit testing
    this._buttons = [b1, b2, b3, b4, b5];

    // add wrist to scene (gets parented later when anchors are provided)
    scene.add(this.wrist);

    // ---- WORLD LEADERBOARD SCREEN ----
    this.leaderboard = this._makeLeaderboardScreen();
    scene.add(this.leaderboard);

    // ---- TOAST (small floating message near player) ----
    this.toast = this._makeToast();
    scene.add(this.toast);

    // ---- Events ----
    window.addEventListener("keydown", (e) => {
      const k = (e.key || "").toLowerCase();
      if (k === "m") this.toggle();
    });

    // external event trigger
    window.addEventListener("nova_toggle_menu", () => this.toggle());
  },

  // Call this from main.js after you create controller anchors
  setControllerAnchors({ left, right } = {}) {
    this.leftAnchor = left || this.leftAnchor;
    this.rightAnchor = right || this.rightAnchor;

    // Attach wrist to left anchor if available
    if (this.leftAnchor && this.wrist) {
      // avoid double-parent
      if (this.wrist.parent) this.wrist.parent.remove(this.wrist);
      this.leftAnchor.add(this.wrist);
      this.wrist.position.set(0, 0, 0);
      this.wrist.rotation.set(0, 0, 0);
    }
  },

  toggle(force) {
    this.visible = typeof force === "boolean" ? force : !this.visible;
    if (this.wrist) this.wrist.visible = this.visible;
    this.showToast(this.visible ? "Menu: ON" : "Menu: OFF");
  },

  // Update every frame
  update(dt = 0.016, input = {}) {
    // keep toast facing camera
    if (this.toast && this.camera) {
      this.toast.lookAt(this.camera.position);
    }

    // leaderboard faces camera
    if (this.leaderboard && this.camera) {
      this.leaderboard.lookAt(this.camera.position);
    }

    // Hide toast after hold
    if (this.toast && this.toast.visible) {
      this.lastToastT += dt;
      if (this.lastToastT > this.toastHold) {
        this.toast.visible = false;
      }
    }

    // If wrist is visible, face panel roughly toward camera (optional subtle)
    // (We DON'T hard-lookAt because it can feel jittery on wrist.)
    // Hit testing for button clicks can be driven by your controller system.
    //
    // If you pass input.clickRay (THREE.Ray) and input.click=true, we'll click.
    if (this.visible && input && input.clickRay && input.click) {
      this._handleClickRay(input.clickRay);
    }
  },

  // PUBLIC: set leaderboard lines
  setLeaderboard(lines = []) {
    if (!this.leaderboard) return;
    const text = Array.isArray(lines) ? lines.join("\n") : String(lines);
    this._setCanvasText(this.leaderboard.userData.canvas, this.leaderboard.userData.ctx, this.leaderboard.userData.tex, text);
  },

  // PUBLIC: toast near player/camera
  showToast(text) {
    if (!this.toast) return;
    this.lastToastT = 0;
    this.toast.visible = true;
    this._setCanvasText(this.toast.userData.canvas, this.toast.userData.ctx, this.toast.userData.tex, String(text));

    // place toast in front of camera
    if (this.camera) {
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      const pos = this.camera.position.clone().add(fwd.multiplyScalar(1.25));
      pos.y = this.camera.position.y - 0.05;
      this.toast.position.copy(pos);
    }
  },

  // ---------------------------
  // Internals
  // ---------------------------
  _nav(route) {
    this.showToast(`Go: ${route}`);
    if (this.onNavigate) this.onNavigate(route);
  },

  _resetSpawn() {
    this.showToast("Reset Spawn");
    if (this.onResetSpawn) this.onResetSpawn();
  },

  _toggleTeleport() {
    this.showToast("Teleport Mode");
    if (this.onToggleTeleport) this.onToggleTeleport();
  },

  _handleClickRay(ray) {
    // Ray is { origin: Vector3, direction: Vector3 } or THREE.Ray
    this._rayTmp.ray.origin.copy(ray.origin || ray.ray?.origin || ray.origin);
    this._rayTmp.ray.direction.copy(ray.direction || ray.ray?.direction || ray.direction);

    // Intersect wrist panel buttons
    const hits = this._rayTmp.intersectObjects(this._buttons, true);
    if (!hits || !hits.length) return;

    // Find the button root
    let obj = hits[0].object;
    while (obj && !obj.userData.__isButton && obj.parent) obj = obj.parent;

    if (obj && obj.userData.__isButton && typeof obj.userData.onPress === "function") {
      obj.userData.onPress();
      this._flashButton(obj);
    }
  },

  _flashButton(btn) {
    const mat = btn.userData.bgMat;
    if (!mat) return;
    const old = mat.emissiveIntensity || 0;
    mat.emissiveIntensity = 1.2;
    setTimeout(() => {
      mat.emissiveIntensity = old;
    }, 120);
  },

  _makeGlassPanel(w, h) {
    const geo = new THREE.PlaneGeometry(w, h);

    const mat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.12,
      metalness: 0.35,
      transparent: true,
      opacity: 0.88,
      emissive: 0x000000,
      emissiveIntensity: 0.0
    });

    const panel = new THREE.Mesh(geo, mat);
    panel.renderOrder = 10;

    // gold rim (thin plane slightly bigger)
    const rim = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 1.03, h * 1.06),
      new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.35 })
    );
    rim.position.z = -0.001;
    panel.add(rim);

    // subtle inner glow
    const inner = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.98, h * 0.92),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.30 })
    );
    inner.position.z = 0.0005;
    panel.add(inner);

    return panel;
  },

  _makeLabel(text, scale = 0.16, color = "#ffffff", fontSize = 0.018, strong = false) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    // draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${strong ? "bold " : ""}${strong ? 92 : 76}px Arial`;
    ctx.fillStyle = color;
    ctx.fillText(text, 40, 165);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(scale, fontSize), mat);

    mesh.userData.canvas = canvas;
    mesh.userData.ctx = ctx;
    mesh.userData.tex = tex;
    mesh.userData.fontStrong = strong;

    return mesh;
  },

  _makeButton(label, w, h, onPress) {
    const g = new THREE.Group();
    g.userData.__isButton = true;
    g.userData.onPress = onPress;

    const bgMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1f,
      roughness: 0.18,
      metalness: 0.35,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      transparent: true,
      opacity: 0.92
    });

    const bg = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bgMat);
    bg.renderOrder = 11;
    g.add(bg);

    const rim = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 1.02, h * 1.08),
      new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.25 })
    );
    rim.position.z = -0.001;
    bg.add(rim);

    const txt = this._makeLabel(label, w * 0.9, "#ffffff", h * 0.45, true);
    txt.position.set(0, 0, 0.002);
    g.add(txt);

    g.userData.bgMat = bgMat;
    return g;
  },

  _makeLeaderboardScreen() {
    // place it high and far back (you requested)
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.25,
      transparent: true,
      opacity: 0.95
    });

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), mat);
    screen.name = "LeaderboardScreen";
    screen.position.set(0, 3.2, -10.5); // high + back
    screen.rotation.y = 0;

    // initial paint
    this._setCanvasText(canvas, ctx, tex,
      "Boss Tournament — READY\n\n1) —\n2) —\n3) —\n4) —\n5) —"
    );

    screen.userData.canvas = canvas;
    screen.userData.ctx = ctx;
    screen.userData.tex = tex;

    // frame glow
    const frame = new THREE.Mesh(
      new THREE.PlaneGeometry(2.28, 1.28),
      new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.22 })
    );
    frame.position.z = -0.002;
    screen.add(frame);

    // corner lights for pop
    const l1 = new THREE.PointLight(0xffd27a, 0.55, 6);
    const l2 = new THREE.PointLight(0x2bd7ff, 0.45, 6);
    l1.position.set(-0.9, 0.45, 0.8);
    l2.position.set( 0.9,-0.45, 0.8);

    const group = new THREE.Group();
    group.add(screen, l1, l2);
    group.name = "LeaderboardGroup";

    // store screen reference in group for lookAt
    group.userData.screen = screen;

    return group;
  },

  _makeToast() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95 });
    const toast = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), mat);
    toast.name = "Toast";
    toast.visible = false;

    this._setCanvasText(canvas, ctx, tex, "Ready");

    toast.userData.canvas = canvas;
    toast.userData.ctx = ctx;
    toast.userData.tex = tex;

    return toast;
  },

  _setCanvasText(canvas, ctx, tex, text) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // glassy black bg
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // gold border
    ctx.strokeStyle = "rgba(255,210,122,0.9)";
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 64px Arial";

    const lines = String(text).split("\n");
    let y = 92;
    for (const line of lines.slice(0, 10)) {
      ctx.fillText(line, 40, y);
      y += 70;
    }

    tex.needsUpdate = true;
  }
};
