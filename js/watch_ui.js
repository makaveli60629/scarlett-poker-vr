import * as THREE from "three";

/**
 * watch_ui.js — In-world VR menu panel (NOT DOM)
 * - Appears in front of the camera (like a watch/HUD)
 * - Buttons: Lobby / Store / Poker / Audio / Reset
 * - Selection: use Left stick up/down to highlight
 * - Confirm: Right trigger (or A/X) to activate
 */
export const WatchUI = {
  group: null,
  mesh: null,
  canvas: null,
  ctx: null,
  texture: null,
  open: false,

  items: [
    { key: "lobby", label: "Lobby" },
    { key: "store", label: "Store" },
    { key: "poker", label: "Poker" },
    { key: "audio", label: "Audio Toggle" },
    { key: "reset", label: "Reset" },
  ],
  selected: 0,

  onNavigate: null,
  onAudioToggle: null,
  onReset: null,

  // internal
  _cooldown: 0,
  _confirmCooldown: 0,

  init({ scene, camera, onNavigate, onAudioToggle, onReset }) {
    this.onNavigate = onNavigate;
    this.onAudioToggle = onAudioToggle;
    this.onReset = onReset;

    // Canvas texture for crisp text
    this.canvas = document.createElement("canvas");
    this.canvas.width = 1024;
    this.canvas.height = 512;
    this.ctx = this.canvas.getContext("2d");

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.98,
      side: THREE.DoubleSide,
    });

    const geo = new THREE.PlaneGeometry(0.6, 0.3); // size in meters
    this.mesh = new THREE.Mesh(geo, mat);

    this.group = new THREE.Group();
    this.group.add(this.mesh);

    // Put it in the scene; we will position it each frame in update()
    scene.add(this.group);
    this.group.visible = false;

    this._draw("Menu ready");
  },

  toggle() {
    this.open = !this.open;
    if (this.group) this.group.visible = this.open;
    this._draw(this.open ? "Menu opened" : "Menu closed");
  },

  close() {
    this.open = false;
    if (this.group) this.group.visible = false;
  },

  _draw(subtitle = "") {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.80)";
    ctx.fillRect(0, 0, w, h);

    // Neon border
    ctx.strokeStyle = "rgba(0,255,255,0.35)";
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 54px system-ui, Segoe UI, Arial";
    ctx.fillText("Skylark Menu", 44, 78);

    // Subtitle
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "28px system-ui, Segoe UI, Arial";
    ctx.fillText(subtitle, 44, 118);

    // Items
    const startY = 160;
    const rowH = 64;

    for (let i = 0; i < this.items.length; i++) {
      const y = startY + i * rowH;

      if (i === this.selected) {
        ctx.fillStyle = "rgba(0,255,255,0.18)";
        ctx.fillRect(36, y - 44, w - 72, 56);
        ctx.strokeStyle = "rgba(0,255,255,0.55)";
        ctx.lineWidth = 3;
        ctx.strokeRect(36, y - 44, w - 72, 56);
      }

      ctx.fillStyle = i === this.selected ? "#00ffff" : "#ffffff";
      ctx.font = "bold 40px system-ui, Segoe UI, Arial";
      ctx.fillText(this.items[i].label, 60, y);
    }

    // Footer controls hint
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "26px system-ui, Segoe UI, Arial";
    ctx.fillText("Left stick: up/down   Trigger: select   Menu/Y: toggle", 44, h - 34);

    this.texture.needsUpdate = true;
  },

  /**
   * Call every frame.
   * Keeps menu in front of camera and handles selection inputs (values passed by Controls).
   */
  update(dt, { camera, input }) {
    if (!this.group) return;

    // Always keep panel in front of face when open
    if (this.open) {
      // Position 0.75m in front, slightly down
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.normalize();

      const pos = new THREE.Vector3().copy(camera.getWorldPosition(new THREE.Vector3()));
      pos.add(forward.multiplyScalar(0.75));
      pos.y -= 0.22;

      this.group.position.copy(pos);
      this.group.quaternion.copy(camera.getWorldQuaternion(new THREE.Quaternion()));
    }

    // cooldowns
    this._cooldown = Math.max(0, this._cooldown - dt);
    this._confirmCooldown = Math.max(0, this._confirmCooldown - dt);

    if (!this.open) return;

    // Selection with left stick up/down
    const moveY = input?.menuNavY ?? 0;
    if (this._cooldown <= 0) {
      if (moveY > 0.55) {
        this.selected = (this.selected - 1 + this.items.length) % this.items.length;
        this._cooldown = 0.18;
        this._draw("Select option");
      } else if (moveY < -0.55) {
        this.selected = (this.selected + 1) % this.items.length;
        this._cooldown = 0.18;
        this._draw("Select option");
      }
    }

    // Confirm
    if (input?.confirm && this._confirmCooldown <= 0) {
      this._confirmCooldown = 0.25;
      const key = this.items[this.selected].key;

      if (key === "audio") {
        this.onAudioToggle?.();
        this._draw("Audio toggled");
      } else if (key === "reset") {
        this.onReset?.();
        this._draw("Reset");
      } else {
        this.onNavigate?.(key);
        this._draw(`Go to ${key}`);
      }
    }
  },
};
