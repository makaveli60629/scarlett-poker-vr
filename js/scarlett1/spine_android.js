// spine_android.js — Scarlett Unified Android + Quest Sticks
// SAFE MODULE — REQUIRED EXPORTS
// Does NOT interfere with Quest controllers or hands

let sticksActive = false;
let leftStick = null;
let rightStick = null;

export function initAndroidSticks({ camera, scene, player }) {
  if (sticksActive) return;
  sticksActive = true;

  __SCARLETT_DIAG_LOG("Android sticks READY ✅");

  // Create virtual joystick DOM
  leftStick = createStick("left");
  rightStick = createStick("right");

  document.body.appendChild(leftStick.el);
  document.body.appendChild(rightStick.el);

  let move = { x: 0, z: 0 };
  let turn = 0;

  leftStick.onMove = (dx, dy) => {
    move.x = dx;
    move.z = dy;
  };

  rightStick.onMove = (dx) => {
    turn = dx;
  };

  function update() {
    if (!player) return;

    // Move forward/back & strafe
    const speed = 0.04;
    player.position.x += move.x * speed;
    player.position.z += move.z * speed;

    // Turn
    player.rotation.y -= turn * 0.04;

    requestAnimationFrame(update);
  }

  update();
}

// ---------- helpers ----------

function createStick(side) {
  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.bottom = "12vh";
  el.style.width = "110px";
  el.style.height = "110px";
  el.style.borderRadius = "50%";
  el.style.background = "rgba(80,120,255,0.18)";
  el.style.border = "2px solid rgba(120,180,255,0.4)";
  el.style.touchAction = "none";
  el.style.zIndex = "999999";

  if (side === "left") el.style.left = "6vw";
  else el.style.right = "6vw";

  let startX = 0, startY = 0;

  el.addEventListener("touchstart", e => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
  });

  el.addEventListener("touchmove", e => {
    const t = e.touches[0];
    const dx = (t.clientX - startX) / 40;
    const dy = (t.clientY - startY) / 40;
    stick.onMove?.(dx, dy);
  });

  el.addEventListener("touchend", () => {
    stick.onMove?.(0, 0);
  });

  const stick = { el, onMove: null };
  return stick;
}
