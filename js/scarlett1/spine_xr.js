export function makeXR({ THREE, scene, renderer, rig, camera, log }) {
  const state = {
    active: false,
    laserL: false,
    laserR: false,
    moveSpeed: 2.2,
    turnSpeed: 2.2,
    c0: null, c1: null,
    l0: null, l1: null
  };

  function makeLaser(color) {
    const pts = [new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geo, mat);
    line.scale.z = 8;
    return line;
  }

  function attach(i, color) {
    const c = renderer.xr.getController(i);
    scene.add(c);
    const laser = makeLaser(color);
    c.add(laser);
    c.addEventListener("connected", () => log(`XR controller${i} connected ✅`));
    c.addEventListener("disconnected", () => log(`XR controller${i} disconnected`));
    return { c, laser };
  }

  const a0 = attach(0, 0xff55ff);
  const a1 = attach(1, 0x55aaff);
  state.c0 = a0.c; state.l0 = a0.laser;
  state.c1 = a1.c; state.l1 = a1.laser;

  function update(dt) {
    const session = renderer.xr.getSession();
    state.active = !!session;

    state.l0.visible = state.active;
    state.l1.visible = state.active;
    state.laserL = state.active;
    state.laserR = state.active;

    if (!state.active) return;

    // Read gamepads
    const sources = session.inputSources || [];
    let gpMove = null, gpTurn = null;
    for (const s of sources) if (s.gamepad) { if (!gpMove) gpMove = s.gamepad; else if (!gpTurn) gpTurn = s.gamepad; }
    if (!gpMove) return;
    if (!gpTurn) gpTurn = gpMove;

    const axM = gpMove.axes || [];
    const axT = gpTurn.axes || [];

    const mx = (axM[2] ?? axM[0] ?? 0);
    const my = (axM[3] ?? axM[1] ?? 0);
    const tx = (axT[2] ?? axT[0] ?? 0);

    const dead = 0.08;
    const strafe = Math.abs(mx) < dead ? 0 : mx;
    const forward = Math.abs(my) < dead ? 0 : -my;

    rig.rotation.y -= tx * state.turnSpeed * dt;

    if (!forward && !strafe) return;

    // Move relative to head yaw
    const q = new THREE.Quaternion();
    camera.getWorldQuaternion(q);
    const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
    const yaw = e.y;

    const dx = (Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * state.moveSpeed * dt;
    const dz = (Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * state.moveSpeed * dt;

    rig.position.x += dx;
    rig.position.z += dz;
  }

  return state = { ...state, update };
}
