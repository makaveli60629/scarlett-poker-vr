// js/scarlett1/spine_android.js — Scarlett Android Controls (FULL • SAFE)
// - On-screen left stick = move (forward/back/strafe)
// - Right drag area = look yaw
// - ONLY active when NOT in XR (so it never breaks Oculus)
// Usage: AndroidSpine.install({ THREE, renderer, rig, camera, log })

export const AndroidSpine = (() => {
  function install(ctx) {
    const { THREE, renderer, rig, camera } = ctx;
    const log = ctx.log || console.log;

    const isAndroid = /Android/i.test(navigator.userAgent);
    if (!isAndroid) {
      log("[android] not android, skipping");
      return { update(){} };
    }

    if (!renderer || !rig || !camera) {
      log("[android] missing renderer/rig/camera, skipping");
      return { update(){} };
    }

    log("[android] installing ✅");

    const state = {
      moveF: 0,
      moveS: 0,
      yaw: rig.rotation.y || 0,
      active: true,
      speed: 2.4
    };

    // ---------- UI ----------
    const root = document.createElement("div");
    root.id = "scarlett_android_ui";
    root.style.cssText = `
      position:fixed; inset:0; z-index:999998;
      pointer-events:none;
      user-select:none;
      -webkit-user-select:none;
      touch-action:none;
    `;
    document.body.appendChild(root);

    // Left stick
    const stick = document.createElement("div");
    stick.style.cssText = `
      position:absolute; left:14px; bottom:14px;
      width:170px; height:170px; border-radius:18px;
      background:rgba(10,14,30,0.25);
      border:1px solid rgba(120,160,255,0.18);
      pointer-events:auto;
      touch-action:none;
    `;
    root.appendChild(stick);

    const knob = document.createElement("div");
    knob.style.cssText = `
      position:absolute; left:50%; top:50%;
      width:74px; height:74px; margin-left:-37px; margin-top:-37px;
      border-radius:18px;
      background:rgba(40,60,120,0.55);
      border:1px solid rgba(120,160,255,0.25);
    `;
    stick.appendChild(knob);

    // Right look area
    const look = document.createElement("div");
    look.style.cssText = `
      position:absolute; right:0; top:0;
      width:55vw; height:100vh;
      pointer-events:auto;
      touch-action:none;
    `;
    root.appendChild(look);

    // Helper
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // Stick logic
    let stickActive = false;
    const center = { x: 85, y: 85 };

    stick.addEventListener("pointerdown", (e) => {
      if (renderer.xr.isPresenting) return;
      stickActive = true;
      stick.setPointerCapture(e.pointerId);
    });

    stick.addEventListener("pointermove", (e) => {
      if (!stickActive || renderer.xr.isPresenting) return;

      const r = stick.getBoundingClientRect();
      const x = clamp(e.clientX - r.left, 0, r.width);
      const y = clamp(e.clientY - r.top, 0, r.height);

      const dx = (x - center.x) / 60;
      const dy = (y - center.y) / 60;

      knob.style.left = `${x}px`;
      knob.style.top = `${y}px`;
      knob.style.marginLeft = `-37px`;
      knob.style.marginTop = `-37px`;

      state.moveS = clamp(dx, -1, 1);
      state.moveF = clamp(-dy, -1, 1);
    });

    const stickReset = () => {
      stickActive = false;
      state.moveF = 0;
      state.moveS = 0;
      knob.style.left = `50%`;
      knob.style.top = `50%`;
    };
    stick.addEventListener("pointerup", stickReset);
    stick.addEventListener("pointercancel", stickReset);

    // Look yaw drag
    let lookActive = false;
    let lastX = 0;

    look.addEventListener("pointerdown", (e) => {
      if (renderer.xr.isPresenting) return;
      lookActive = true;
      lastX = e.clientX;
      look.setPointerCapture(e.pointerId);
    });

    look.addEventListener("pointermove", (e) => {
      if (!lookActive || renderer.xr.isPresenting) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      state.yaw -= dx * 0.0032;
      rig.rotation.y = state.yaw;
    });

    const lookUp = () => { lookActive = false; };
    look.addEventListener("pointerup", lookUp);
    look.addEventListener("pointercancel", lookUp);

    // Update loop
    const tmpF = new THREE.Vector3();
    const tmpR = new THREE.Vector3();

    function update(dt) {
      if (!state.active) return;
      if (renderer.xr.isPresenting) return; // never interfere with XR

      const yaw = rig.rotation.y;

      tmpF.set(Math.sin(yaw), 0, Math.cos(yaw));
      tmpR.set(Math.sin(yaw + Math.PI / 2), 0, Math.cos(yaw + Math.PI / 2));

      rig.position.addScaledVector(tmpF, state.moveF * state.speed * dt);
      rig.position.addScaledVector(tmpR, state.moveS * state.speed * dt);

      // keep on floor height
      rig.position.y = 1.65;
    }

    return { update };
  }

  return { install };
})();
