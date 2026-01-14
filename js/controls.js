// /js/controls.js — Scarlett Controller Baseline v8 (FULL)
// ✅ Reticle always works when pointing DOWN (fixes “only shows when pointing up”)
// ✅ Movement: lower deadzone + more reliable forward/back
// ✅ Right stick: X = snap-turn, Y = forward/back (so your right controller can move)
// ✅ Left stick: X = strafe, Y = forward/back (primary)

export const Controls = (() => {
  let THREE, renderer, scene, camera, player;
  let log = console.log, warn = console.warn, err = console.error;

  const cfg = {
    moveSpeed: 2.35,
    deadzone: 0.08,            // was too high; made “forward barely works”
    snapDeg: 45,
    snapCooldownSec: 0.22,
    laserLength: 8.0,
    maxReticleDist: 18
  };

  const state = {
    ctrl: { left:null, right:null },
    grip: { left:null, right:null },
    laser: { left:null, right:null },
    reticle: null,

    yaw: 0,
    snapCooldown: 0,

    // auto-flip for forward/back if device reports inverted Y
    moveFlipY: 1,
    moveCalibrated: false,
    calibAccum: 0,

    gp: { left:null, right:null },

    btn: {
      left:  { trigger:false, grip:false },
      right: { trigger:false, grip:false }
    }
  };

  const tmp = {
    o: null, q: null, dir: null, v: null
  };

  const dz = (v) => (Math.abs(v) < cfg.deadzone ? 0 : v);

  function init(ctx){
    THREE = ctx.THREE;
    renderer = ctx.renderer;
    scene = ctx.scene;
    camera = ctx.camera;
    player = ctx.player;

    log = ctx.log || log;
    warn = ctx.warn || warn;
    err = ctx.err || err;

    tmp.o = new THREE.Vector3();
    tmp.q = new THREE.Quaternion();
    tmp.dir = new THREE.Vector3();
    tmp.v = new THREE.Vector3();

    state.yaw = player.rotation.y;

    installReticle();
    installControllers(true);

    renderer.xr.addEventListener?.("sessionstart", () => {
      installControllers(true);
      state.moveCalibrated = false;
      state.calibAccum = 0;
      log("sessionstart: controllers rebound ✅");
    });

    log("Controls init ✅ v8");
  }

  function installControllers(force){
    try{
      const c0 = renderer.xr.getController(0);
      const c1 = renderer.xr.getController(1);
      const g0 = renderer.xr.getControllerGrip(0);
      const g1 = renderer.xr.getControllerGrip(1);

      if (force || !c0.parent) player.add(c0);
      if (force || !c1.parent) player.add(c1);
      if (force || !g0.parent) player.add(g0);
      if (force || !g1.parent) player.add(g1);

      state.ctrl.left = c0;  state.ctrl.right = c1;
      state.grip.left = g0;  state.grip.right = g1;

      bindEvents("left", c0);  bindEvents("right", c1);
      bindEvents("left", g0);  bindEvents("right", g1);

      ensureLaser("left"); ensureLaser("right");
      attachLaser("left", g0);
      attachLaser("right", g1);

      log("controllers+lasers ✅");
    } catch(e){
      warn("installControllers failed:", e?.message || e);
    }
  }

  function bindEvents(side, obj){
    if (!obj || obj.__scarlettBound) return;
    obj.__scarlettBound = true;

    obj.addEventListener("selectstart", () => state.btn[side].trigger = true);
    obj.addEventListener("selectend",   () => state.btn[side].trigger = false);
    obj.addEventListener("squeezestart",() => state.btn[side].grip = true);
    obj.addEventListener("squeezeend",  () => state.btn[side].grip = false);
  }

  function ensureLaser(side){
    if (state.laser[side]) return;
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0,0,0),
      new THREE.Vector3(0,0,-1)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x00aaff });
    const line = new THREE.Line(geom, mat);
    line.scale.z = cfg.laserLength;
    state.laser[side] = line;
  }

  function attachLaser(side, grip){
    const laser = state.laser[side];
    if (!laser || !grip) return;

    if (laser.parent !== grip) {
      try { laser.parent?.remove(laser); } catch {}
      grip.add(laser);
    }

    laser.position.set(0,0,0);
    laser.rotation.set(0,0,0);
    laser.scale.z = cfg.laserLength;

    // Visual “Quest pose” fix so the line looks like it shoots forward
    // (does NOT control reticle math; reticle uses world quaternion below)
    laser.rotation.x = -Math.PI / 2;
  }

  function installReticle(){
    const g = new THREE.RingGeometry(0.06, 0.085, 24);
    const m = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent:true, opacity:0.9, side: THREE.DoubleSide });
    state.reticle = new THREE.Mesh(g, m);
    state.reticle.rotation.x = -Math.PI/2;
    state.reticle.visible = false;
    scene.add(state.reticle);
  }

  function pickStickXY(gp){
    if (!gp || !gp.axes) return {x:0,y:0};
    const a = gp.axes;
    // Some headsets map sticks to (0,1) and some to (2,3). Choose the stronger pair.
    const ax0 = a[0] ?? 0, ay0 = a[1] ?? 0;
    const ax2 = a[2] ?? 0, ay3 = a[3] ?? 0;
    const magA = Math.abs(ax0)+Math.abs(ay0);
    const magB = Math.abs(ax2)+Math.abs(ay3);
    return (magB > magA) ? {x:ax2,y:ay3} : {x:ax0,y:ay0};
  }

  function refreshGamepads(){
    const s = renderer.xr.getSession();
    state.gp.left = null;
    state.gp.right = null;
    if (!s) return;

    for (const src of s.inputSources) {
      if (!src?.gamepad) continue;
      if (src.handedness === "left") state.gp.left = src.gamepad;
      if (src.handedness === "right") state.gp.right = src.gamepad;
    }
    if (!state.gp.left || !state.gp.right) {
      const gps = s.inputSources.filter(x=>x?.gamepad).map(x=>x.gamepad);
      state.gp.left = state.gp.left || gps[0] || null;
      state.gp.right = state.gp.right || gps[1] || null;
    }
  }

  function readButtons(){
    const L = state.gp.left, R = state.gp.right;
    if (L?.buttons) {
      state.btn.left.trigger = state.btn.left.trigger || !!L.buttons[0]?.pressed;
      state.btn.left.grip    = state.btn.left.grip    || !!L.buttons[1]?.pressed;
    }
    if (R?.buttons) {
      state.btn.right.trigger = state.btn.right.trigger || !!R.buttons[0]?.pressed;
      state.btn.right.grip    = state.btn.right.grip    || !!R.buttons[1]?.pressed;
    }
  }

  // ✅ FIX: reticle ray always points DOWN to hit the floor
  function updateReticle(){
    const grip = state.grip.right || state.ctrl.right;
    const r = state.reticle;
    if (!grip || !r) return;

    grip.getWorldPosition(tmp.o);
    grip.getWorldQuaternion(tmp.q);

    // Start with controller -Z (typical “forward”)
    tmp.dir.set(0,0,-1).applyQuaternion(tmp.q).normalize();

    // If it's pointing UP (dir.y > 0), flip it so it points DOWN.
    // This removes the “only visible when I point up” bug permanently.
    if (tmp.dir.y > 0) tmp.dir.multiplyScalar(-1);

    // If still almost flat, hide
    if (Math.abs(tmp.dir.y) < 1e-4) { r.visible = false; return; }

    // Intersect floor y=0
    const t = (0 - tmp.o.y) / tmp.dir.y;
    if (t <= 0) { r.visible = false; return; }

    tmp.v.copy(tmp.o).addScaledVector(tmp.dir, t);
    const dist = tmp.v.distanceTo(tmp.o);
    if (dist > cfg.maxReticleDist) { r.visible = false; return; }

    r.position.set(tmp.v.x, 0.02, tmp.v.z);
    r.visible = true;
  }

  function move(dt){
    if (!renderer.xr.isPresenting) return;

    refreshGamepads();
    readButtons();

    // Left stick = primary move (strafe + forward/back)
    const LS = pickStickXY(state.gp.left);
    let lx = dz(LS.x);
    let ly = dz(LS.y);

    // Right stick: keep X for snap-turn, but ALSO allow Y for forward/back
    const RS = pickStickXY(state.gp.right);
    const rx = dz(RS.x);
    const ry = dz(RS.y);

    // Auto-calibrate forward/back sign (based on first strong push)
    if (!state.moveCalibrated) {
      state.calibAccum += Math.abs(ly) + Math.abs(ry);
      const testY = Math.abs(ly) > Math.abs(ry) ? ly : ry;
      if (Math.abs(testY) > 0.35 && state.calibAccum > 0.6) {
        state.moveFlipY = (testY > 0) ? -1 : 1;
        state.moveCalibrated = true;
        log(`[move] calibrated ✅ flipY=${state.moveFlipY}`);
      }
    }

    // If left forward/back is weak, let right-stick Y contribute
    let forward = (-ly) * state.moveFlipY;
    if (Math.abs(forward) < 0.10 && Math.abs(ry) > 0.12) {
      forward = (-ry) * state.moveFlipY;
    }

    // Move vector (strafe from left X, forward from left/right Y)
    const mv = new THREE.Vector3(lx, 0, forward);
    const Lm = mv.length();
    if (Lm > 0.001) {
      mv.normalize().multiplyScalar(cfg.moveSpeed * dt);
      mv.applyAxisAngle(new THREE.Vector3(0,1,0), player.rotation.y);
      player.position.add(mv);
    }

    // Snap turn from right X
    state.snapCooldown = Math.max(0, state.snapCooldown - dt);
    if (Math.abs(rx) > 0.65 && state.snapCooldown <= 0) {
      const dir = rx > 0 ? -1 : 1;
      state.yaw += dir * (cfg.snapDeg * Math.PI/180);
      player.rotation.y = state.yaw;
      state.snapCooldown = cfg.snapCooldownSec;
    }
  }

  function update(dt){
    dt = Math.max(0, Math.min(0.05, dt || 0.016));
    if (renderer.xr.isPresenting) {
      move(dt);
      updateReticle();
    } else {
      if (state.reticle) state.reticle.visible = false;
    }
  }

  function getPadDebug(){
    const L = state.gp.left ? "L" : "-";
    const R = state.gp.right ? "R" : "-";
    return `pad:${L}${R} flipY:${state.moveFlipY}${state.moveCalibrated ? "*" : ""}`;
  }

  function getButtonDebug(){
    const lt = state.btn.left.trigger ? "T" : "-";
    const lg = state.btn.left.grip ? "G" : "-";
    const rt = state.btn.right.trigger ? "T" : "-";
    const rg = state.btn.right.grip ? "G" : "-";
    return `btns:L[${lt}${lg}] R[${rt}${rg}]`;
  }

  return { init, update, getPadDebug, getButtonDebug };
})();
