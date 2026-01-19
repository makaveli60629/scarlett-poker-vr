import { log, setHint } from './diag.js';

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// Simple dual-joystick:
// Left stick = movement (forward/strafe)
// Right stick = look (yaw/pitch)
export class TouchMovement {
  constructor({ leftEl, rightEl, jumpEl, rig, camera }) {
    this.leftEl = leftEl;
    this.rightEl = rightEl;
    this.jumpEl = jumpEl;
    this.rig = rig;
    this.camera = camera;

    this.enabled = true;
    this.speed = 2.2;
    this.turnSpeed = 1.8;
    this.lookSpeed = 1.3;

    this._left = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this._right = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };

    this._wantJump = false;
    this._vy = 0;

    this._bind();
  }

  _bind() {
    const onDown = (which, ev) => {
      const t = ev.changedTouches[0];
      which.active = true;
      which.id = t.identifier;
      which.ox = t.clientX;
      which.oy = t.clientY;
      which.x = 0;
      which.y = 0;
    };

    const onMove = (which, ev) => {
      if (!which.active) return;
      for (const t of ev.changedTouches) {
        if (t.identifier !== which.id) continue;
        const dx = t.clientX - which.ox;
        const dy = t.clientY - which.oy;
        const max = 60;
        which.x = clamp(dx / max, -1, 1);
        which.y = clamp(dy / max, -1, 1);
      }
    };

    const onUp = (which, ev) => {
      for (const t of ev.changedTouches) {
        if (t.identifier !== which.id) continue;
        which.active = false;
        which.id = null;
        which.x = 0;
        which.y = 0;
      }
    };

    const prevent = (ev) => { ev.preventDefault(); };

    // Left
    this.leftEl.addEventListener('touchstart', (ev) => { prevent(ev); onDown(this._left, ev); }, { passive: false });
    this.leftEl.addEventListener('touchmove', (ev) => { prevent(ev); onMove(this._left, ev); }, { passive: false });
    this.leftEl.addEventListener('touchend', (ev) => { prevent(ev); onUp(this._left, ev); }, { passive: false });
    this.leftEl.addEventListener('touchcancel', (ev) => { prevent(ev); onUp(this._left, ev); }, { passive: false });

    // Right
    this.rightEl.addEventListener('touchstart', (ev) => { prevent(ev); onDown(this._right, ev); }, { passive: false });
    this.rightEl.addEventListener('touchmove', (ev) => { prevent(ev); onMove(this._right, ev); }, { passive: false });
    this.rightEl.addEventListener('touchend', (ev) => { prevent(ev); onUp(this._right, ev); }, { passive: false });
    this.rightEl.addEventListener('touchcancel', (ev) => { prevent(ev); onUp(this._right, ev); }, { passive: false });

    // Jump/up
    this.jumpEl.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      this._wantJump = true;
    });

    setHint('Android: Left stick move, right stick look. Quest: thumbsticks + trigger teleport.');
    log('[touch] movement ready');
  }

  setEnabled(v) { this.enabled = !!v; }

  update(dt) {
    if (!this.enabled) return;

    // Move
    const fwd = -this._left.y;
    const str = this._left.x;

    // Look (yaw via rig, pitch via camera)
    const yaw = -this._right.x;
    const pitch = -this._right.y;

    this.rig.rotation.y += yaw * this.turnSpeed * dt;
    this.camera.rotation.x = clamp(this.camera.rotation.x + pitch * this.lookSpeed * dt, -1.2, 1.2);

    const speed = this.speed * (1 + 0.5 * (this._left.active ? 0 : 0));

    if (Math.abs(fwd) > 0.02 || Math.abs(str) > 0.02) {
      const ang = this.rig.rotation.y;
      const sx = Math.sin(ang), cx = Math.cos(ang);
      const vx = (str * cx + fwd * sx) * speed;
      const vz = (fwd * cx - str * sx) * speed;
      this.rig.position.x += vx * dt;
      this.rig.position.z += vz * dt;
    }

    // Simple bob + up button (debug)
    if (this._wantJump) {
      this._vy = 2.0;
      this._wantJump = false;
    }

    // gravity
    this._vy -= 6.0 * dt;
    this.rig.position.y += this._vy * dt;
    if (this.rig.position.y < 0) {
      this.rig.position.y = 0;
      this._vy = 0;
    }
  }
}
