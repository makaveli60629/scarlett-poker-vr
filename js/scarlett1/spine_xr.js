// /js/scarlett1/spine_xr.js — Scarlett 1.0 XR Spine (FULL)
// ✅ Hook-based (never owns setAnimationLoop)
// ✅ Lasers
// ✅ Teleport pads (trigger/select) + rainbow arc + reticle circle
// ✅ Your control mapping EXACT:
//   - RIGHT stick Y = forward/back
//   - LEFT stick X = strafe
//   - RIGHT stick X = 45° snap turn
//   - Trigger = teleport
//   - Y button = menu toggle
// ✅ Simple collision: prevents walking through solid walls (world.blockedXZ)

export async function installXR({ THREE, DIAG }) {
  const D = DIAG || console;

  const W = window.__SCARLETT1__;
  if (!W || !W.renderer || !W.scene || !W.camera || !W.rig || !W.addFrameHook) {
    D.warn("[xr] world not ready, skipping XR install");
    return;
  }

  const {
    renderer, scene, camera, rig, player,
    spawnPads, teleportTo, addFrameHook,
    blockedXZ
  } = W;

  // VRButton
  let VRButton;
  try {
    const mod = await import(`/scarlett-poker-vr/js/VRButton.js?v=${Date.now()}`);
    VRButton = mod.VRButton || mod.default || mod;
  } catch (e) {
    D.error("[xr] VRButton import failed", e);
    return;
  }

  try {
    const btn = VRButton.createButton(renderer);
    btn.style.zIndex = 999999;
    document.body.appendChild(btn);
    D.log("[xr] VRButton appended ✅");
  } catch (e) {
    D.error("[xr] VRButton create failed", e);
    return;
  }

  // Controllers + lasers
  const controllerL = renderer.xr.getController(0);
  const controllerR = renderer.xr.getController(1);
  rig.add(controllerL);
  rig.add(controllerR);

  const rayGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1)
  ]);

  const laserL = new THREE.Line(rayGeo, new THREE.LineBasicMaterial({ color: 0xff33aa }));
  laserL.scale.z = 12;
  controllerL.add(laserL);

  const laserR = new THREE.Line(rayGeo, new THREE.LineBasicMaterial({ color: 0x33aaff }));
  laserR.scale.z = 12;
  controllerR.add(laserR);

  // Raycast
  const raycaster = new THREE.Raycaster();
  const tmpMat = new THREE.Matrix4();
  const tmpO = new THREE.Vector3();
  const tmpD = new THREE.Vector3();

  function getRay(ctrl) {
    tmpMat.identity().extractRotation(ctrl.matrixWorld);
    tmpO.setFromMatrixPosition(ctrl.matrixWorld);
    tmpD.set(0, 0, -1).applyMatrix4(tmpMat).normalize();
    return { origin: tmpO.clone(), dir: tmpD.clone() };
  }

  function hitPadFromRay(origin, dir) {
    if (!spawnPads?.length) return null;
    raycaster.ray.origin.copy(origin);
    raycaster.ray.direction.copy(dir);
    const hits = raycaster.intersectObjects(spawnPads, false);
    return hits?.[0]?.object || null;
  }

  function teleportToPad(pad) {
    if (!pad?.userData?.teleportPos) return;
    const yaw = (pad.userData.yaw != null) ? pad.userData.yaw : (player?.yaw ?? rig.rotation.y ?? 0);
    teleportTo(pad.userData.teleportPos, yaw);
    D.log("[teleport] →", pad.userData.label || "PAD");
  }

  // Teleport visuals (arc + reticle)
  const ARC_SEG = 32;
  const arcPos = new Float32Array((ARC_SEG + 1) * 3);
  const arcCol = new Float32Array((ARC_SEG + 1) * 3);

  const arcGeo = new THREE.BufferGeometry();
  arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPos, 3));
  arcGeo.setAttribute("color", new THREE.BufferAttribute(arcCol, 3));

  const arcLine = new THREE.Line(arcGeo, new THREE.LineBasicMaterial({ vertexColors: true }));
  arcLine.visible = false;
  scene.add(arcLine);

  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.25, 0.35, 48),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  reticle.rotation.x = -Math.PI / 2;
  reticle.visible = false;
  scene.add(reticle);

  function rainbow(i, t) {
    const a = t * Math.PI * 2;
    arcCol[i * 3 + 0] = 0.5 + 0.5 * Math.sin(a + 0.0);
    arcCol[i * 3 + 1] = 0.5 + 0.5 * Math.sin(a + 2.1);
    arcCol[i * 3 + 2] = 0.5 + 0.5 * Math.sin(a + 4.2);
  }

  function buildArc(ctrl) {
    const { origin, dir } = getRay(ctrl);

    const speed = 10.0;
    const gravity = 18.0;
    const step = 0.06;

    let p = origin.clone();
    let v = dir.clone().multiplyScalar(speed);
    let hitPoint = null;

    for (let i = 0; i <= ARC_SEG; i++) {
      arcPos[i * 3 + 0] = p.x;
      arcPos[i * 3 + 1] = p.y;
      arcPos[i * 3 + 2] = p.z;
      rainbow(i, i / ARC_SEG);

      if (i > 0 && p.y <= 0.02) {
        hitPoint = new THREE.Vector3(p.x, 0.02, p.z);
        break;
      }

      v.y -= gravity * step;
      p = p.clone().add(v.clone().multiplyScalar(step));
    }

    arcGeo.attributes.position.needsUpdate = true;
    arcGeo.attributes.color.needsUpdate = true;

    if (!hitPoint) {
      arcLine.visible = false;
      reticle.visible = false;
      return { hitPad: null };
    }

    const downO = hitPoint.clone().add(new THREE.Vector3(0, 1.0, 0));
    const downD = new THREE.Vector3(0, -1, 0);
    const hitPad = hitPadFromRay(downO, downD);

    arcLine.visible = true;
    reticle.visible = true;
    reticle.position.copy(hitPoint);
    reticle.material.color.set(hitPad ? 0x00ffcc : 0xffffff);

    return { hitPad };
  }

  // Teleport on trigger/select (Quest trigger maps to selectstart)
  controllerL.addEventListener("selectstart", () => {
    try {
      const { hitPad } = buildArc(controllerL);
      if (hitPad) teleportToPad(hitPad);
    } catch (e) {
      D.error("[teleport] left error", e?.message || e);
    }
  });

  controllerR.addEventListener("selectstart", () => {
    try {
      const { hitPad } = buildArc(controllerR);
      if (hitPad) teleportToPad(hitPad);
    } catch (e) {
      D.error("[teleport] right error", e?.message || e);
    }
  });

  // Menu
  const menu = new THREE.Group();
  menu.visible = false;
  scene.add(menu);

  const menuBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.7),
    new THREE.MeshBasicMaterial({ color: 0x0b142a, transparent: true, opacity: 0.92 })
  );
  menu.add(menuBg);

  function toggleMenu() {
    menu.visible = !menu.visible;
    D.log("[menu] visible=", menu.visible);
  }

  function updateMenuPose() {
    if (!menu.visible) return;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const pos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld).add(forward.multiplyScalar(1.2));
    pos.y -= 0.2;
    menu.position.copy(pos);
    menu.quaternion.copy(camera.quaternion);
  }

  // --- InputSources Gamepads (reliable) ---
  function getPadsByHandedness() {
    const s = renderer.xr.getSession?.();
    if (!s) return { left: null, right: null };
    let left = null, right = null;

    for (const src of s.inputSources) {
      if (!src?.gamepad) continue;
      if (src.handedness === "left") left = src.gamepad;
      if (src.handedness === "right") right = src.gamepad;
    }

    // Fallback if handedness isn't set: pick first/second
    if (!left || !right) {
      const gps = [];
      for (const src of s.inputSources) if (src?.gamepad) gps.push(src.gamepad);
      if (!left) left = gps[0] || null;
      if (!right) right = gps[gps.length > 1 ? 1 : 0] || null;
    }

    return { left, right };
  }

  // --- Movement mapping EXACT ---
  const DEAD = 0.18;
  const MOVE_SPEED = 1.35;     // slow walk
  const STRAFE_SPEED = 1.15;

  const TURN_ANGLE = (45 * Math.PI) / 180;
  const TURN_COOLDOWN = 0.30;
  let turnCD = 0;

  let prevY = false;

  function axis(v) {
    return Math.abs(v) > DEAD ? v : 0;
  }

  function tryMove(newX, newZ) {
    if (typeof blockedXZ === "function" && blockedXZ(newX, newZ)) {
      return false;
    }
    rig.position.x = newX;
    rig.position.z = newZ;
    return true;
  }

  function moveForward(dt, amt) {
    const yaw = player.yaw ?? rig.rotation.y ?? 0;
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
    const dx = fwd.x * (amt * MOVE_SPEED * dt);
    const dz = fwd.z * (amt * MOVE_SPEED * dt);
    tryMove(rig.position.x + dx, rig.position.z + dz);
  }

  function strafe(dt, amt) {
    const yaw = player.yaw ?? rig.rotation.y ?? 0;
    const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
    const dx = right.x * (amt * STRAFE_SPEED * dt);
    const dz = right.z * (amt * STRAFE_SPEED * dt);
    tryMove(rig.position.x + dx, rig.position.z + dz);
  }

  function snapTurn(dir) {
    const yaw = (player.yaw ?? rig.rotation.y ?? 0) + dir * TURN_ANGLE;
    player.yaw = yaw;
    rig.rotation.y = yaw;
  }

  renderer.xr.addEventListener("sessionstart", () => {
    // Ensure yaw applied
    rig.rotation.y = player.yaw ?? rig.rotation.y;
    D.log("[xr] sessionstart ✅");
  });

  // Hook into world loop (never green-screen)
  addFrameHook(({ dt }) => {
    // Arc preview from RIGHT controller
    if (renderer.xr.isPresenting) {
      try { buildArc(controllerR); } catch {}
    } else {
      arcLine.visible = false;
      reticle.visible = false;
    }

    const { left: gpL, right: gpR } = getPadsByHandedness();
    if (!gpL || !gpR) return;

    // RIGHT stick:
    // - Y forward/back
    // - X snap turn 45°
    let rX = 0, rY = 0;
    if (gpR.axes?.length >= 4) { rX = gpR.axes[2] || 0; rY = gpR.axes[3] || 0; }
    else if (gpR.axes?.length >= 2) { rX = gpR.axes[0] || 0; rY = gpR.axes[1] || 0; }

    // LEFT stick:
    // - X strafe
    let lX = 0;
    if (gpL.axes?.length >= 2) lX = gpL.axes[0] || 0;

    // Forward/back from RIGHT stick Y (invert so forward is up)
    const fwdAmt = axis(-rY);
    if (fwdAmt) moveForward(dt, fwdAmt);

    // Strafe from LEFT stick X
    const strafeAmt = axis(lX);
    if (strafeAmt) strafe(dt, strafeAmt);

    // Snap turn from RIGHT stick X
    const turnAmt = axis(rX);
    turnCD -= dt;
    if (turnCD <= 0 && turnAmt !== 0) {
      snapTurn(turnAmt > 0 ? -1 : 1);
      turnCD = TURN_COOLDOWN;
    }

    // Y button menu toggle (LEFT controller button[3])
    const yDown = !!gpL.buttons?.[3]?.pressed;
    if (yDown && !prevY) toggleMenu();
    prevY = yDown;

    updateMenuPose();

    // keep pitch (optional)
    camera.rotation.x = player.pitch ?? 0;
  });

  D.log("[xr] installed ✅ (your mapping locked)");
              }
