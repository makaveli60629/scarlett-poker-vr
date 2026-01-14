// /js/controls.js — Scarlett Controller Baseline v7 (FULL)
// ✅ Quest: lasers + reticle correct
// ✅ Movement: left stick forward/back correct (auto-cal)
// ✅ Snap-turn: right stick X (45°)
// ✅ Triggers/grips: work (events + gamepad fallback)
// ✅ Diagnostics: getPadDebug(), getButtonDebug()

export const Controls = (() => {
  let THREE, renderer, scene, camera, player;
  let log = console.log, warn = console.warn, err = console.error;

  const cfg = {
    moveSpeed: 2.25,
    deadzone: 0.12,
    snapDeg: 45,
    snapCooldownSec: 0.22,
    laserLength: 8.0,
    maxReticleDist: 14
  };

  const state = {
    ctrl: { left:null, right:null },
    grip: { left:null, right:null },
    laser: { left:null, right:null },
    reticle: null,

    yaw: 0,
    snapCooldown: 0,

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
    o: null, q: null, dir: null, v: null, hmd: null
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
    tmp.hmd = new THREE.Vector3();

    state.yaw = player.rotation.y;

    installReticle();
    installControllers(false);

    renderer.xr.addEventListener?.("sessionstart", () => {
      installControllers(true);
      state.moveCalibrated = false;
      state.calibAccum = 0;
      log("sessionstart: controllers rebound ✅");
    });

    log("Controls init ✅ v7");
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

    // Permanent Quest pose fix (no more pointing straight up)
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
      state.btn.left.grip = state.btn.left.grip || !!L.buttons[1]?.pressed;
    }
    if (R?.buttons) {
      state.btn.right.trigger = state.btn.right.trigger || !!R.buttons[0]?.pressed;
      state.btn.right.grip = state.btn.right.grip || !!R.buttons[1]?.pressed;
    }
  }

  function updateReticle(){
    const grip = state.grip.right || state.ctrl.right;
    const r = state.reticle;
    if (!grip || !r) return;

    grip.getWorldPosition(tmp.o);
    grip.getWorldQuaternion(tmp.q);

    // HMD forward (flat)
    tmp.hmd.set(0,0,-1).applyQuaternion(camera.quaternion);
    tmp.hmd.y = 0; tmp.hmd.normalize();

    // Candidate directions: -Z and +Z
    const dirA = tmp.v.set(0,0,-1).applyQuaternion(tmp.q).normalize();
    const dirB = tmp.dir.set(0,0, 1).applyQuaternion(tmp.q).normalize();

    const aFlat = dirA.clone(); aFlat.y=0; aFlat.normalize();
    const bFlat = dirB.clone(); bFlat.y=0; bFlat.normalize();

    const dotA = aFlat.lengthSq() ? aFlat.dot(tmp.hmd) : -999;
    const dotB = bFlat.lengthSq() ? bFlat.dot(tmp.hmd) : -999;

    const dir = (dotB > dotA) ? dirB : dirA;

    // intersect floor y=0
    if (Math.abs(dir.y) < 1e-5) { r.visible=false; return; }
    const t = (0 - tmp.o.y) / dir.y;
    if (t <= 0) { r.visible=false; return; }

    const hit = tmp.o.clone().add(dir.clone().multiplyScalar(t));
    const dist = hit.distanceTo(tmp.o);
    if (dist > cfg.maxReticleDist) { r.visible=false; return; }

    r.position.copy(hit);
    r.visible = true;
  }

  function move(dt){
    const s = renderer.xr.isPresenting;
    if (!s) return;

    refreshGamepads();
    readButtons();

    // left stick move
    const L = pickStickXY(state.gp.left);
    const lx = dz(L.x);
    const ly = dz(L.y);

    if (!state.moveCalibrated) {
      state.calibAccum += Math.abs(ly);
      if (Math.abs(ly) > 0.35 && state.calibAccum > 0.6) {
        state.moveFlipY = (ly > 0) ? -1 : 1;
        state.moveCalibrated = true;
        log(`[move] calibrated ✅ flipY=${state.moveFlipY}`);
      }
    }

    const forward = (-ly) * state.moveFlipY;

    const mv = new THREE.Vector3(lx,0,forward);
    const Lm = mv.length();
    if (Lm > 0.001) {
      mv.normalize().multiplyScalar(cfg.moveSpeed * dt);
      mv.applyAxisAngle(new THREE.Vector3(0,1,0), player.rotation.y);
      player.position.add(mv);
    }

    // right stick snap-turn
    const R = pickStickXY(state.gp.right);
    const rx = dz(R.x);

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
