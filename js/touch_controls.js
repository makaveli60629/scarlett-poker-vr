// /js/touch_controls.js — Two-pad mobile controls (Left=Move, Right=Look)
// Returns { moveX, moveY } each frame. Also rotates player/camera.

export const TouchControls = (() => {
  const S = {
    player: null,
    camera: null,
    log: console.log,

    // movement output
    moveX: 0,
    moveY: 0,

    // look
    yaw: 0,
    pitch: 0,

    // pads
    left: { id: -1, x0: 0, y0: 0, x: 0, y: 0, active: false },
    right:{ id: -1, x0: 0, y0: 0, x: 0, y: 0, active: false },

    // sensitivity
    moveScale: 1.0,
    lookScale: 0.010
  };

  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  function onTouchStart(e){
    for (const t of e.changedTouches) {
      const isLeft = (t.clientX < window.innerWidth * 0.5);
      const pad = isLeft ? S.left : S.right;
      if (pad.active) continue;
      pad.active = true;
      pad.id = t.identifier;
      pad.x0 = pad.x = t.clientX;
      pad.y0 = pad.y = t.clientY;
    }
  }

  function onTouchMove(e){
    for (const t of e.changedTouches) {
      if (t.identifier === S.left.id) {
        S.left.x = t.clientX; S.left.y = t.clientY;
      }
      if (t.identifier === S.right.id) {
        S.right.x = t.clientX; S.right.y = t.clientY;
      }
    }
  }

  function onTouchEnd(e){
    for (const t of e.changedTouches) {
      if (t.identifier === S.left.id) {
        S.left.active = false; S.left.id = -1;
        S.moveX = 0; S.moveY = 0;
      }
      if (t.identifier === S.right.id) {
        S.right.active = false; S.right.id = -1;
      }
    }
  }

  function init({ player, camera, log, api }) {
    S.player = player;
    S.camera = camera;
    S.log = log || console.log;

    // prevent browser scroll/zoom during touch
    window.addEventListener("touchstart", onTouchStart, { passive:false });
    window.addEventListener("touchmove", onTouchMove, { passive:false });
    window.addEventListener("touchend", onTouchEnd, { passive:false });
    window.addEventListener("touchcancel", onTouchEnd, { passive:false });

    // simple tap controls (top bar buttons call API directly in index.js)
    S.api = api || {};

    S.log?.("✅ Android touch controls ready ✅ (Left=Move, Right=Look)");
  }

  function update(dt){
    // Move pad
    if (S.left.active) {
      const dx = (S.left.x - S.left.x0) / 60;   // pixels -> unit
      const dy = (S.left.y - S.left.y0) / 60;
      S.moveX = clamp(dx, -1, 1) * S.moveScale;
      S.moveY = clamp(-dy, -1, 1) * S.moveScale;
    } else {
      S.moveX = 0; S.moveY = 0;
    }

    // Look pad
    if (S.right.active) {
      const dx = (S.right.x - S.right.x0);
      const dy = (S.right.y - S.right.y0);
      S.yaw   -= dx * S.lookScale;
      S.pitch -= dy * S.lookScale;
      S.pitch = clamp(S.pitch, -1.2, 1.2);

      // rotate rig + camera
      S.player.rotation.y = S.yaw;
      S.camera.rotation.x = S.pitch;

      // reset origin slowly so it feels like a stick
      S.right.x0 = S.right.x0 + (S.right.x - S.right.x0) * 0.15;
      S.right.y0 = S.right.y0 + (S.right.y - S.right.y0) * 0.15;
    }

    return { moveX: S.moveX, moveY: S.moveY };
  }

  return { init, update };
})();
