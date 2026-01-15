export function makeAndroid({ THREE, rig, camera, log }) {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const state = {
    active: false,
    moveSpeed: 2.2,
    turnSpeed: 2.2,
    left: { id:null, ox:0, oy:0, x:0, y:0 },
    right:{ id:null, ox:0, oy:0, x:0, y:0 }
  };

  function stick(dx, dy) {
    const r = 70;
    let x = Math.max(-1, Math.min(1, dx / r));
    let y = Math.max(-1, Math.min(1, dy / r));
    const dead = 0.08;
    if (Math.hypot(x,y) < dead) return { x:0, y:0 };
    return { x, y };
  }

  window.addEventListener("touchstart", (e) => {
    if (!isAndroid) return;
    state.active = true;

    for (const t of e.changedTouches) {
      const leftSide = t.clientX < innerWidth * 0.5;
      if (leftSide && state.left.id === null) {
        state.left.id = t.identifier; state.left.ox = t.clientX; state.left.oy = t.clientY;
      } else if (!leftSide && state.right.id === null) {
        state.right.id = t.identifier; state.right.ox = t.clientX; state.right.oy = t.clientY;
      }
    }
  }, { passive:false });

  window.addEventListener("touchmove", (e) => {
    if (!isAndroid) return;
    for (const t of e.changedTouches) {
      if (t.identifier === state.left.id) {
        const v = stick(t.clientX - state.left.ox, t.clientY - state.left.oy);
        state.left.x = v.x; state.left.y = v.y;
      }
      if (t.identifier === state.right.id) {
        const v = stick(t.clientX - state.right.ox, t.clientY - state.right.oy);
        state.right.x = v.x; state.right.y = v.y;
      }
    }
    e.preventDefault();
  }, { passive:false });

  window.addEventListener("touchend", (e) => {
    if (!isAndroid) return;
    for (const t of e.changedTouches) {
      if (t.identifier === state.left.id) { state.left.id=null; state.left.x=0; state.left.y=0; }
      if (t.identifier === state.right.id){ state.right.id=null; state.right.x=0; state.right.y=0; }
    }
  }, { passive:true });

  function update(dt) {
    if (!isAndroid) { state.active = false; return; }

    // right stick X turns
    rig.rotation.y -= state.right.x * state.turnSpeed * dt;

    // move relative to rig yaw
    const forward = -state.left.y;
    const strafe = state.left.x;
    if (!forward && !strafe) return;

    const yaw = rig.rotation.y;
    const dx = (Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * state.moveSpeed * dt;
    const dz = (Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * state.moveSpeed * dt;

    rig.position.x += dx;
    rig.position.z += dz;
  }

  return { ...state, update };
}
