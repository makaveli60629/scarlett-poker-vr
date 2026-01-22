// js/locomotion.js
(function () {
  const D = window.SCARLETT_DIAG || { log: () => {} };

  const SPEED = 2.2;
  const DEADZONE = 0.12;
  const SMOOTH = 0.18;

  let rig, cam;
  let joy = { x: 0, y: 0, active: false };
  let joySm = { x: 0, y: 0 };

  function $(id) { return document.getElementById(id); }

  function ensureRig() {
    rig = rig || $("rig");
    cam = cam || $("camera");
    return !!(rig && cam);
  }

  function installTouchJoystick() {
    let base = document.getElementById("touchJoyBase");
    if (!base) {
      base = document.createElement("div");
      base.id = "touchJoyBase";
      base.style.cssText = `
        position: fixed; left: 18px; bottom: 28px;
        width: 170px; height: 170px;
        border-radius: 999px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.16);
        z-index: 19;
        touch-action: none;
        pointer-events: auto;
      `;
      document.body.appendChild(base);
    }

    let knob = document.getElementById("touchJoyKnob");
    if (!knob) {
      knob = document.createElement("div");
      knob.id = "touchJoyKnob";
      knob.style.cssText = `
        position: absolute; left: 50%; top: 50%;
        width: 82px; height: 82px;
        margin-left: -41px; margin-top: -41px;
        border-radius: 999px;
        background: rgba(255,255,255,0.10);
        border: 1px solid rgba(255,255,255,0.22);
      `;
      base.appendChild(knob);
    }

    let pid = null;

    function setKnob(nx, ny) {
      const r = 62;
      knob.style.transform = `translate(${nx * r}px, ${ny * r}px)`;
      joy.x = nx;
      joy.y = ny;
    }

    function resetKnob() {
      knob.style.transform = "translate(0px, 0px)";
      joy.x = 0; joy.y = 0;
      joy.active = false;
    }

    base.addEventListener("pointerdown", (e) => {
      pid = e.pointerId;
      base.setPointerCapture(pid);
      joy.active = true;

      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = e.clientX - cx;
      const dy = e.clientY - cy;

      const max = rect.width * 0.35;
      const nx = Math.max(-1, Math.min(1, dx / max));
      const ny = Math.max(-1, Math.min(1, dy / max));

      setKnob(nx, ny);
    });

    base.addEventListener("pointermove", (e) => {
      if (!joy.active || e.pointerId !== pid) return;

      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = e.clientX - cx;
      const dy = e.clientY - cy;

      const max = rect.width * 0.35;
      const nx = Math.max(-1, Math.min(1, dx / max));
      const ny = Math.max(-1, Math.min(1, dy / max));

      setKnob(nx, ny);
    });

    base.addEventListener("pointerup", (e) => {
      if (e.pointerId !== pid) return;
      pid = null;
      resetKnob();
    });

    base.addEventListener("pointercancel", () => {
      pid = null;
      resetKnob();
    });

    D.log("[androidPads] armed ✅");
  }

  function readXRThumbstick() {
    const scene = $("scene");
    if (!scene || !scene.renderer || !scene.renderer.xr) return null;
    const session = scene.renderer.xr.getSession?.();
    if (!session) return null;

    let axX = 0, axY = 0;
    for (const src of session.inputSources) {
      if (!src || !src.gamepad) continue;
      const gp = src.gamepad;

      const a0 = gp.axes?.[0] ?? 0;
      const a1 = gp.axes?.[1] ?? 0;
      const a2 = gp.axes?.[2] ?? 0;
      const a3 = gp.axes?.[3] ?? 0;

      const m1 = Math.abs(a0) + Math.abs(a1);
      const m2 = Math.abs(a2) + Math.abs(a3);

      if (m1 >= m2) { axX = a0; axY = a1; }
      else { axX = a2; axY = a3; }

      if (Math.abs(axX) + Math.abs(axY) > 0.02) break;
    }
    return { x: axX, y: axY };
  }

  function deadzone(v) {
    return Math.abs(v) < DEADZONE ? 0 : v;
  }

  function tick(dt) {
    if (!ensureRig()) return;

    const xr = readXRThumbstick();
    let x = 0, y = 0;

    if (xr) {
      x = deadzone(xr.x);
      y = deadzone(xr.y);
    } else {
      x = deadzone(joy.x);
      y = deadzone(joy.y);
    }

    joySm.x += (x - joySm.x) * SMOOTH;
    joySm.y += (y - joySm.y) * SMOOTH;

    if (Math.abs(joySm.x) + Math.abs(joySm.y) < 0.001) return;

    const camObj = cam.object3D;
    const rigObj = rig.object3D;

    const yaw = camObj.rotation.y;
    const forward = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
    const right = { x: Math.cos(yaw), z: -Math.sin(yaw) };

    const vx = (right.x * joySm.x + forward.x * (-joySm.y)) * SPEED;
    const vz = (right.z * joySm.x + forward.z * (-joySm.y)) * SPEED;

    rigObj.position.x += vx * dt;
    rigObj.position.z += vz * dt;
  }

  function startLoop() {
    let last = performance.now();
    function loop() {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tick(dt);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  window.addEventListener("DOMContentLoaded", () => {
    ensureRig();
    installTouchJoystick();
    startLoop();
    D.log("[locomotion] ready ✅");
  });
})();
