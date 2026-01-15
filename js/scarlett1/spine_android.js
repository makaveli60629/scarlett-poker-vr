// /js/scarlett1/spine_android.js — Android Controls Bridge (FULL • SAFE)
// - ONLY active when renderer.xr.isPresenting === false
// - Touch joystick left + look area right
// - Does NOT interfere with XR at all

export async function init({ THREE, renderer, playerRig, camera, addUpdater, log }) {
  const diag = log || console.log;

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!isMobile) {
    diag("[android] not mobile — skipped");
    return;
  }

  // UI
  const ui = document.createElement("div");
  ui.style.cssText = `
    position:fixed; inset:0; z-index:500000;
    pointer-events:none;
  `;
  document.body.appendChild(ui);

  // Stick base
  const base = document.createElement("div");
  base.style.cssText = `
    position:absolute; left:16px; bottom:18px;
    width:160px; height:160px; border-radius:999px;
    background:rgba(90,120,200,0.12);
    border:1px solid rgba(120,160,255,0.25);
    pointer-events:auto; touch-action:none;
  `;
  ui.appendChild(base);

  const stick = document.createElement("div");
  stick.style.cssText = `
    position:absolute; left:50%; top:50%;
    width:70px; height:70px; margin-left:-35px; margin-top:-35px;
    border-radius:999px;
    background:rgba(120,160,255,0.35);
    border:1px solid rgba(180,210,255,0.25);
    pointer-events:none;
  `;
  base.appendChild(stick);

  // Look area (right side)
  const look = document.createElement("div");
  look.style.cssText = `
    position:absolute; right:0; top:0;
    width:55vw; height:100vh;
    pointer-events:auto; touch-action:none;
    background:rgba(0,0,0,0);
  `;
  ui.appendChild(look);

  const S = {
    active: false,
    id: -1,
    cx: 0,
    cy: 0,
    vx: 0,
    vy: 0,
    lookActive: false,
    lookId: -1,
    lastX: 0,
    lastY: 0,
    yaw: 0,
    pitch: 0
  };

  // initialize yaw/pitch from rig/camera
  S.yaw = playerRig.rotation.y;

  function setStick(px, py) {
    stick.style.left = `${px}px`;
    stick.style.top = `${py}px`;
    stick.style.marginLeft = `-35px`;
    stick.style.marginTop = `-35px`;
  }
  function centerStick() { setStick(80, 80); }

  centerStick();

  base.addEventListener("touchstart", (e) => {
    if (renderer.xr.isPresenting) return;
    const t = e.changedTouches[0];
    S.active = true;
    S.id = t.identifier;
    const r = base.getBoundingClientRect();
    S.cx = r.left + r.width/2;
    S.cy = r.top + r.height/2;
    e.preventDefault();
  }, { passive:false });

  base.addEventListener("touchmove", (e) => {
    if (!S.active || renderer.xr.isPresenting) return;
    const t = [...e.changedTouches].find(x => x.identifier === S.id);
    if (!t) return;

    const dx = t.clientX - S.cx;
    const dy = t.clientY - S.cy;
    const max = 55;

    const len = Math.hypot(dx, dy);
    const nx = len > max ? dx/len*max : dx;
    const ny = len > max ? dy/len*max : dy;

    setStick(80 + nx, 80 + ny);

    S.vx = nx / max;
    S.vy = ny / max;

    e.preventDefault();
  }, { passive:false });

  base.addEventListener("touchend", (e) => {
    const t = [...e.changedTouches].find(x => x.identifier === S.id);
    if (!t) return;
    S.active = false;
    S.id = -1;
    S.vx = 0; S.vy = 0;
    centerStick();
  }, { passive:false });

  // Look
  look.addEventListener("touchstart", (e) => {
    if (renderer.xr.isPresenting) return;
    const t = e.changedTouches[0];
    S.lookActive = true;
    S.lookId = t.identifier;
    S.lastX = t.clientX;
    S.lastY = t.clientY;
    e.preventDefault();
  }, { passive:false });

  look.addEventListener("touchmove", (e) => {
    if (!S.lookActive || renderer.xr.isPresenting) return;
    const t = [...e.changedTouches].find(x => x.identifier === S.lookId);
    if (!t) return;

    const dx = t.clientX - S.lastX;
    const dy = t.clientY - S.lastY;
    S.lastX = t.clientX;
    S.lastY = t.clientY;

    S.yaw -= dx * 0.0042;
    S.pitch -= dy * 0.0042;
    S.pitch = Math.max(-1.25, Math.min(1.25, S.pitch));

    e.preventDefault();
  }, { passive:false });

  look.addEventListener("touchend", (e) => {
    const t = [...e.changedTouches].find(x => x.identifier === S.lookId);
    if (!t) return;
    S.lookActive = false;
    S.lookId = -1;
  }, { passive:false });

  // Apply movement only when NOT XR
  addUpdater((dt) => {
    ui.style.display = renderer.xr.isPresenting ? "none" : "";

    if (renderer.xr.isPresenting) return;

    // apply yaw to rig
    playerRig.rotation.y = S.yaw;

    // apply pitch to camera local
    camera.rotation.x = S.pitch;

    // move relative to yaw
    const dead = 0.08;
    const vx = Math.abs(S.vx) < dead ? 0 : S.vx;
    const vy = Math.abs(S.vy) < dead ? 0 : S.vy;

    if (vx || vy) {
      const spd = 1.6;
      const f = -vy * spd * dt;
      const s = vx * spd * dt;

      playerRig.position.x += Math.sin(S.yaw) * f + Math.cos(S.yaw) * s;
      playerRig.position.z += Math.cos(S.yaw) * f - Math.sin(S.yaw) * s;
    }
  });

  diag("[android] ready ✅ (2D only)");
        }
