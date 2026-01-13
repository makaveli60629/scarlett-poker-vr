// /js/scorpion.js — Scorpion Room System v1.0 (Auto-Seat + No-Peek Rules)
// ✅ Auto-seat when entering scorpion room
// ✅ Enforces "no opponent cards visible" by design hooks (presentation only here)

export const ScorpionSystem = (() => {
  const S = { THREE:null, root:null, log:console.log, seatAnchor:null, active:false };

  function init({ THREE, root, log, seatAnchor }) {
    S.THREE = THREE;
    S.root = root;
    S.log = log || console.log;
    S.seatAnchor = seatAnchor || { pos: new THREE.Vector3(26, 0, 0), yaw: -Math.PI/2, seated: true };
    S.log("[scorpion] init ✅ auto-seat ready");
    return api();
  }

  function api() { return { onEnter, onExit, update }; }

  function onEnter(ctx) {
    S.active = true;
    // Auto-seat: move rig to seat and slightly lower camera for seated feel
    const a = S.seatAnchor;
    ctx.player.position.set(a.pos.x, a.pos.y, a.pos.z);
    ctx.player.rotation.set(0, a.yaw || 0, 0);
    // keep camera local offset consistent; seated = lower height a bit
    try { ctx.camera.position.y = 1.25; } catch {}
    S.log("[scorpion] enter ✅ seated");
  }

  function onExit(ctx) {
    S.active = false;
    try { ctx.camera.position.y = 1.65; } catch {}
    S.log("[scorpion] exit ✅");
  }

  function update(ctx, dt, t) {
    if (!S.active) return;
    // Placeholder for later: turn logic + no-peek enforcement + UI cues.
  }

  return { init };
})();
