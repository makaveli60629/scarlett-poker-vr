// Mobile joystick movement for the rig (Android)
// Also supports keyboard WASD on desktop.

export class JoystickMove {
  constructor({ rig, diag }) {
    this.rig = rig;
    this.diag = diag || (() => {});

    this.base = document.getElementById("joyBase");
    this.knob = document.getElementById("joyKnob");

    this.active = false;
    this.pointerId = null;

    this.center = { x: 0, y: 0 };
    this.vec = { x: 0, y: 0 }; // -1..1

    this.speed = 2.2; // m/s
    this._raf = null;

    this.keys = new Set();
  }

  install() {
    this._installTouch();
    this._installKeys();
    this._tick();
    this.diag("[move] joystick installed ✅");
  }

  _installTouch() {
    if (!this.base || !this.knob) return;

    const rectCenter = () => {
      const r = this.base.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, radius: Math.min(r.width, r.height) / 2 };
    };

    const setKnob = (dx, dy) => {
      // clamp to circle radius
      const c = rectCenter();
      const max = c.radius * 0.55;
      const len = Math.hypot(dx, dy);
      const s = len > max ? max / (len || 1) : 1;
      const kx = dx * s;
      const ky = dy * s;

      this.knob.style.transform = `translate(${kx}px, ${ky}px)`;
      this.vec.x = kx / max;
      this.vec.y = ky / max;
    };

    const resetKnob = () => {
      this.knob.style.transform = "translate(0px, 0px)";
      this.vec.x = 0;
      this.vec.y = 0;
    };

    this.base.addEventListener("pointerdown", (e) => {
      this.base.setPointerCapture(e.pointerId);
      this.active = true;
      this.pointerId = e.pointerId;
      const c = rectCenter();
      this.center = { x: c.x, y: c.y };
      setKnob(e.clientX - c.x, e.clientY - c.y);
    }, { passive: true });

    this.base.addEventListener("pointermove", (e) => {
      if (!this.active || e.pointerId !== this.pointerId) return;
      setKnob(e.clientX - this.center.x, e.clientY - this.center.y);
    }, { passive: true });

    const end = (e) => {
      if (e.pointerId !== this.pointerId) return;
      this.active = false;
      this.pointerId = null;
      resetKnob();
    };

    this.base.addEventListener("pointerup", end, { passive: true });
    this.base.addEventListener("pointercancel", end, { passive: true });
  }

  _installKeys() {
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(k)) {
        this.keys.add(k);
      }
    });
    window.addEventListener("keyup", (e) => {
      const k = e.key.toLowerCase();
      this.keys.delete(k);
    });
  }

  _getMoveVector() {
    // joystick dominates on touch devices; keys fallback.
    let x = this.vec.x;
    let y = this.vec.y;

    if (Math.abs(x) < 0.02 && Math.abs(y) < 0.02 && this.keys.size) {
      const up = this.keys.has("w") || this.keys.has("arrowup");
      const dn = this.keys.has("s") || this.keys.has("arrowdown");
      const lt = this.keys.has("a") || this.keys.has("arrowleft");
      const rt = this.keys.has("d") || this.keys.has("arrowright");
      x = (rt ? 1 : 0) + (lt ? -1 : 0);
      y = (dn ? 1 : 0) + (up ? -1 : 0);
      const len = Math.hypot(x, y);
      if (len > 1e-6) { x /= len; y /= len; }
    }

    return { x, y };
  }

  _tick() {
    const step = (t) => {
      // delta time
      if (!this._last) this._last = t;
      const dt = Math.min(0.05, (t - this._last) / 1000);
      this._last = t;

      const mv = this._getMoveVector();
      if (Math.abs(mv.x) > 0.01 || Math.abs(mv.y) > 0.01) {
        const rot = this.rig.getAttribute("rotation") || { y: 0 };
        const yaw = (rot.y || 0) * Math.PI / 180;

        // joystick y: up is negative (forward)
        const forward = -mv.y;
        const strafe = mv.x;

        const vx = (Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * this.speed;
        const vz = (Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * this.speed;

        const pos = this.rig.getAttribute("position");
        const nx = pos.x + vx * dt;
        const nz = pos.z + vz * dt;

        // Keep within simple bounds
        const clampedX = Math.max(-28, Math.min(28, nx));
        const clampedZ = Math.max(-28, Math.min(28, nz));

        this.rig.setAttribute("position", `${clampedX} ${pos.y} ${clampedZ}`);
      }

      this._raf = requestAnimationFrame(step);
    };

    this._raf = requestAnimationFrame(step);
  }
}
