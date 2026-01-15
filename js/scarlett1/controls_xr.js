// /js/scarlett1/controls_xr.js — XR Controller Lasers + Teleport + SnapTurn (Quest safe)
// Usage:
//   const xr = initXRControls({ THREE, renderer, scene, camera, playerRig, world, log });
//   // in your main loop: xr.update(dt);

export function initXRControls({
  THREE,
  renderer,
  scene,
  camera,
  playerRig,
  world,
  log = (...a) => console.log("[xr]", ...a),
  options = {}
}) {
  if (!THREE || !renderer || !scene || !playerRig) {
    throw new Error("[xr] initXRControls missing required params");
  }

  const cfg = {
    maxRay: 30,
    snapAngle: THREE.MathUtils.degToRad(30),
    snapCooldown: 0.25,
    teleportFade: false,
    ...options
  };

  const state = {
    enabled: true,
    controllers: [],
    grips: [],
    lines: [],
    raycasters: [],
    lastHit: [null, null],
    lastSnapT: 0,
    tmpMat: new THREE.Matrix4(),
    tmpDir: new THREE.Vector3(),
    tmpPos: new THREE.Vector3(),
    tmpV: new THREE.Vector3(),
    tmpQ: new THREE.Quaternion(),
    tmpEuler: new THREE.Euler(0, 0, 0, "YXZ"),
    floorTargets: [],
    padTargets: []
  };

  // -----------------------
  // Targets
  // -----------------------
  function refreshTargets() {
    state.floorTargets.length = 0;
    state.padTargets.length = 0;

    // Prefer world-provided lists if present
    if (world?.teleportSurfaces?.length) state.floorTargets.push(...world.teleportSurfaces);
    if (world?.pads?.length) state.padTargets.push(...world.pads);

    // Fallback: scan world.group for floor-like meshes
    if (state.floorTargets.length === 0 && world?.group) {
      world.group.traverse((o) => {
        if (o?.isMesh && o.userData?.teleportSurface) state.floorTargets.push(o);
      });
    }

    log("targets", "floors=", state.floorTargets.length, "pads=", state.padTargets.length);
  }

  refreshTargets();

  // -----------------------
  // Build controller lasers
  // -----------------------
  function makeLaserLine() {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -cfg.maxRay)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x55aaff });
    const line = new THREE.Line(geo, mat);
    line.name = "XR_Laser";
    line.scale.z = 1;
    return line;
  }

  function getRayOriginDir(controller) {
    // controller.matrixWorld gives pose; forward is -Z
    state.tmpMat.identity().extractRotation(controller.matrixWorld);
    state.tmpDir.set(0, 0, -1).applyMatrix4(state.tmpMat).normalize();
    state.tmpPos.setFromMatrixPosition(controller.matrixWorld);
    return { origin: state.tmpPos, dir: state.tmpDir };
  }

  function intersectTeleport(controllerIndex) {
    const c = state.controllers[controllerIndex];
    const rc = state.raycasters[controllerIndex];
    if (!c || !rc) return null;

    const { origin, dir } = getRayOriginDir(c);
    rc.set(origin, dir);
    rc.far = cfg.maxRay;

    // 1) pads first (easy target)
    if (state.padTargets.length) {
      const padHits = rc.intersectObjects(state.padTargets, true);
      if (padHits?.length) return { type: "pad", hit: padHits[0] };
    }

    // 2) floor surfaces
    if (state.floorTargets.length) {
      const floorHits = rc.intersectObjects(state.floorTargets, true);
      if (floorHits?.length) return { type: "floor", hit: floorHits[0] };
    }

    return null;
  }

  function setLaserVisual(i, result) {
    const line = state.lines[i];
    if (!line) return;

    if (!result) {
      // full length
      line.scale.z = 1;
      state.lastHit[i] = null;
      return;
    }

    const d = result.hit.distance || cfg.maxRay;
    line.scale.z = Math.max(0.05, d / cfg.maxRay);
    state.lastHit[i] = result;
  }

  function teleportTo(hitPoint) {
    // Keep current rig yaw, move on XZ
    const p = hitPoint;
    playerRig.position.set(p.x, playerRig.position.y, p.z);
  }

  function onSelectStart(i) {
    const res = state.lastHit[i];
    if (!res) return;

    // If we hit a pad, use its target if provided
    if (res.type === "pad") {
      // Walk up parent chain until teleport pad group
      let node = res.hit.object;
      while (node && !node.userData?.teleport) node = node.parent;
      if (node?.userData?.target) {
        teleportTo(node.userData.target);
        return;
      }
    }

    // Otherwise teleport to floor point
    teleportTo(res.hit.point);
  }

  // Snap turn from thumbstick
  function applySnapTurn(dt) {
    state.lastSnapT += dt;

    // Any controller input sources?
    const session = renderer.xr.getSession?.();
    if (!session) return;

    // Find gamepad axes
    // Oculus Touch: axes[2], axes[3] often right stick; axes[0], axes[1] left stick
    // We'll use left stick X if present.
    const sources = session.inputSources || [];
    let xAxis = 0;

    for (const src of sources) {
      const gp = src?.gamepad;
      if (!gp || !gp.axes || gp.axes.length < 2) continue;
      // prefer left stick X (0) if available
      xAxis = gp.axes[0] ?? 0;
      if (Math.abs(xAxis) > 0.35) break;
    }

    if (Math.abs(xAxis) < 0.65) return;
    if (state.lastSnapT < cfg.snapCooldown) return;

    state.lastSnapT = 0;

    const dir = xAxis > 0 ? -1 : 1; // right stick -> rotate right (feel free to invert)
    playerRig.rotation.y += cfg.snapAngle * dir;
  }

  // Create controllers/grips and add to scene
  function setupControllers() {
    const controllerModelFactory = null; // optional: can be added later if you want 3D controller models

    for (let i = 0; i < 2; i++) {
      const c = renderer.xr.getController(i);
      c.name = `XR_Controller_${i}`;
      scene.add(c);

      const line = makeLaserLine();
      c.add(line);

      const rc = new THREE.Raycaster();
      rc.far = cfg.maxRay;

      c.addEventListener("selectstart", () => onSelectStart(i));

      state.controllers[i] = c;
      state.lines[i] = line;
      state.raycasters[i] = rc;
    }

    log("controllers ready ✅", "count=", state.controllers.filter(Boolean).length);
  }

  setupControllers();

  // Public update
  function update(dt = 0.016) {
    if (!state.enabled) return;

    // Update ray hits + visuals
    for (let i = 0; i < state.controllers.length; i++) {
      const c = state.controllers[i];
      if (!c) continue;
      const res = intersectTeleport(i);
      setLaserVisual(i, res);
    }

    applySnapTurn(dt);
  }

  function dispose() {
    for (const c of state.controllers) {
      if (!c) continue;
      c.removeEventListener("selectstart", onSelectStart);
      scene.remove(c);
    }
    state.controllers.length = 0;
    state.lines.length = 0;
    state.raycasters.length = 0;
  }

  return { update, dispose, refreshTargets, state };
}
