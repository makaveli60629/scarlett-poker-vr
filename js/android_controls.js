import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const AndroidControls = {
  enabled: false,
  rig: null,
  camera: null,
  onTeleport: null,
  getBounds: null,
  getFloorY: null,

  look: { id: null, x: 0, y: 0, dx: 0, dy: 0, active: false },
  move: { id: null, x: 0, y: 0, vx: 0, vy: 0, active: false },

  yaw: 0,
  pitch: 0,
  speed: 2.0,

  ui: null,

  init({ renderer, rig, camera, onTeleport, getBounds, getFloorY }) {
    this.rig = rig;
    this.camera = camera;
    this.onTeleport = onTeleport;
    this.getBounds = getBounds;
    this.getFloorY = getFloorY;

    const isTouch = matchMedia("(pointer:coarse)").matches;
    this.enabled = isTouch;

    if (!this.enabled) return;

    this._buildUI();
    this._bindTouch();
  },

  _buildUI() {
    const ui = document.createElement("div");
    ui.style.position = "fixed";
    ui.style.inset = "0";
    ui.style.pointerEvents = "none";
    ui.style.zIndex = "9";

    // left pad (look)
    const left = document.createElement("div");
    left.style.position = "absolute";
    left.style.left = "18px";
    left.style.bottom = "18px";
    left.style.width = "140px";
    left.style.height = "140px";
    left.style.borderRadius = "999px";
    left.style.background = "rgba(0,255,120,.08)";
    left.style.border = "1px solid rgba(0,255,120,.25)";
    left.style.pointerEvents = "auto";
    left.dataset.pad = "look";

    // right pad (move)
    const right = document.createElement("div");
    right.style.position = "absolute";
    right.style.right = "18px";
    right.style.bottom = "18px";
    right.style.width = "140px";
    right.style.height = "140px";
    right.style.borderRadius = "999px";
    right.style.background = "rgba(43,215,255,.08)";
    right.style.border = "1px solid rgba(43,215,255,.25)";
    right.style.pointerEvents = "auto";
    right.dataset.pad = "move";

    // teleport button
    const tp = document.createElement("button");
    tp.textContent = "TELEPORT";
    tp.style.position = "absolute";
    tp.style.right = "22px";
    tp.style.bottom = "168px";
    tp.style.padding = "10px 12px";
    tp.style.borderRadius = "12px";
    tp.style.border = "1px solid rgba(255,255,255,.25)";
    tp.style.background = "rgba(0,0,0,.35)";
    tp.style.color = "#fff";
    tp.style.pointerEvents = "auto";

    tp.addEventListener("click", () => {
      // teleport forward a few meters (dev convenience)
      const fwd = new THREE.Vector3();
      this.camera.getWorldDirection(fwd);
      fwd.y = 0; fwd.normalize();
      const dest = this.rig.position.clone().addScaledVector(fwd, 3.0);
      dest.y = this.getFloorY?.() ?? 0;
      this.onTeleport?.(dest);
    });

    ui.appendChild(left);
    ui.appendChild(right);
    ui.appendChild(tp);
    document.body.appendChild(ui);
    this.ui = ui;
  },

  _bindTouch() {
    const onDown = (e) => {
      const t = e.changedTouches[0];
      const target = e.target?.dataset?.pad;
      if (!target) return;

      if (target === "look" && !this.look.active) {
        this.look.active = true;
        this.look.id = t.identifier;
        this.look.x = t.clientX;
        this.look.y = t.clientY;
        this.look.dx = 0;
        this.look.dy = 0;
      }
      if (target === "move" && !this.move.active) {
        this.move.active = true;
        this.move.id = t.identifier;
        this.move.x = t.clientX;
        this.move.y = t.clientY;
        this.move.vx = 0;
        this.move.vy = 0;
      }
      e.preventDefault();
    };

    const onMove = (e) => {
      for (const t of e.changedTouches) {
        if (this.look.active && t.identifier === this.look.id) {
          this.look.dx = t.clientX - this.look.x;
          this.look.dy = t.clientY - this.look.y;
        }
        if (this.move.active && t.identifier === this.move.id) {
          const dx = t.clientX - this.move.x;
          const dy = t.clientY - this.move.y;
          this.move.vx = THREE.MathUtils.clamp(dx / 60, -1, 1);
          this.move.vy = THREE.MathUtils.clamp(dy / 60, -1, 1);
        }
      }
      e.preventDefault();
    };

    const onUp = (e) => {
      for (const t of e.changedTouches) {
        if (this.look.active && t.identifier === this.look.id) {
          this.look.active = false;
          this.look.id = null;
          this.look.dx = this.look.dy = 0;
        }
        if (this.move.active && t.identifier === this.move.id) {
          this.move.active = false;
          this.move.id = null;
          this.move.vx = this.move.vy = 0;
        }
      }
      e.preventDefault();
    };

    window.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp, { passive: false });
    window.addEventListener("touchcancel", onUp, { passive: false });
  },

  update(dt) {
    if (!this.enabled) return;

    // Look
    if (this.look.active) {
      const yawSpeed = 0.0022;
      const pitchSpeed = 0.0020;
      this.yaw -= this.look.dx * yawSpeed;
      this.pitch -= this.look.dy * pitchSpeed;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -1.0, 1.0);

      this.rig.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
    }

    // Move (right pad)
    if (this.move.active) {
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.rig.quaternion);
      fwd.y = 0; fwd.normalize();
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

      const mv = new THREE.Vector3();
      mv.addScaledVector(fwd, -this.move.vy);
      mv.addScaledVector(right, this.move.vx);
      if (mv.lengthSq() > 0.0001) mv.normalize();

      const step = this.speed * dt;
      const next = this.rig.position.clone().addScaledVector(mv, step);

      const b = this.getBounds?.();
      if (b) {
        next.x = THREE.MathUtils.clamp(next.x, b.min.x, b.max.x);
        next.z = THREE.MathUtils.clamp(next.z, b.min.z, b.max.z);
      }
      this.rig.position.x = next.x;
      this.rig.position.z = next.z;
    }
  },
};
