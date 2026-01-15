// /js/scarlett1/spine_xr.js — XR Controls v4 (HOOK-BASED, UNCRASHABLE)
// ✅ Rig-based locomotion
// ✅ Teleport to pads (trigger) + arc + reticle
// ✅ Left stick: move + strafe (slow)
// ✅ Right stick: snap turn 45°
// ✅ Y toggles menu

export async function installXR({ THREE, DIAG }) {
  const D = DIAG || console;

  const W = window.__SCARLETT1__;
  if (!W || !W.renderer || !W.scene || !W.camera || !W.rig || !W.addFrameHook) {
    D.warn("[xr] world not ready, skipping XR install");
    return;
  }

  const { renderer, scene, camera, rig, player, spawnPads, teleportTo, safetySnapIfBlocked, addFrameHook } = W;

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

  // Controllers + Lasers
  const controller1 = renderer.xr.getController(0);
  const controller2 = renderer.xr.getController(1);
  rig.add(controller1);
  rig.add(controller2);

  const rayGeo = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1) ]);
  const makeRay = (color) => new THREE.Line(rayGeo, new THREE.LineBasicMaterial({ color }));
  const l1 = makeRay(0xff33aa); l1.scale.z = 12; controller1.add(l1);
  const l2 = makeRay(0x33aaff); l2.scale.z = 12; controller2.add(l2);

  // Raycast helpers
  const raycaster = new THREE.Raycaster();
  const tmpMat = new THREE.Matrix4();
  const tmpO = new THREE.Vector3();
  const tmpD = new THREE.Vector3();

  function getRay(ctrl) {
    tmpMat.identity().extractRotation(ctrl.matrixWorld);
    tmpO.setFromMatrixPosition(ctrl.matrixWorld);
    tmpD.set(0,0,-1).applyMatrix4(tmpMat).normalize();
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
    const yaw = (pad.userData.yaw != null) ? pad.userData.yaw : (player?.yaw ?? Math.PI);
    teleportTo(pad.userData.teleportPos, yaw);
    D.log("[teleport] →", pad.userData.label || "PAD");
  }

  // Teleport visuals (arc + reticle)
  const ARC_SEG = 32;
  const arcPos = new Float32Array((ARC_SEG + 1) * 3);
  const arcCol = new Float32Array((ARC_SEG + 1) * 3);
  const arcGeo2 = new THREE.BufferGeometry();
  arcGeo2.setAttribute("position", new THREE.BufferAttribute(arcPos, 3));
  arcGeo2.setAttribute("color", new THREE.BufferAttribute(arcCol, 3));
  const arcLine = new THREE.Line(arcGeo2, new THREE.LineBasicMaterial({ vertexColors: true }));
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
    arcCol[i*3+0] = 0.5 + 0.5 * Math.sin(a + 0.0);
    arcCol[i*3+1] = 0.5 + 0.5 * Math.sin(a + 2.1);
    arcCol[i*3+2] = 0.5 + 0.5 * Math.sin(a + 4.2);
  }

  function buildArc(ctrl) {
    const { origin, dir } = getRay(ctrl);

    const speed = 10.0, gravity = 18.0, dt = 0.06;
    let p = origin.clone();
    let v = dir.clone().multiplyScalar(speed);

    let hitPoint = null;

    for (let i = 0; i <= ARC_SEG; i++) {
      arcPos[i*3+0] = p.x;
      arcPos[i*3+1] = p.y;
      arcPos[i*3+2] = p.z;
      rainbow(i, i / ARC_SEG);

      if (i > 0 && p.y <= 0.02) { hitPoint = new THREE.Vector3(p.x, 0.02, p.z); break; }

      v.y -= gravity * dt;
      p = p.clone().add(v.clone().multiplyScalar(dt));
    }

    arcGeo2.attributes.position.needsUpdate = true;
    arcGeo2.attributes.color.needsUpdate = true;

    if (!hitPoint) { arcLine.visible = false; reticle.visible = false; return { hitPad:null }; }

    // Check pad under hitPoint
    const downO = hitPoint.clone().add(new THREE.Vector3(0, 1.0, 0));
    const downD = new THREE.Vector3(0, -1, 0);
    const hitPad = hitPadFromRay(downO, downD);

    arcLine.visible = true;
    reticle.visible = true;
    reticle.position.copy(hitPoint);
    reticle.material.color.set(hitPad ? 0x00ffcc : 0xffffff);

    return { hitPad };
  }

  // Teleport events
  controller1.addEventListener("selectstart", () => {
    try { const { hitPad } = buildArc(controller1); if (hitPad) teleportToPad(hitPad); }
    catch (e) { D.error("[teleport] select error:", e?.message || e); }
  });
  controller2.addEventListener("selectstart", () => {
    try { const { hitPad } = buildArc(controller2); if (hitPad) teleportToPad(hitPad); }
    catch (e) { D.error("[teleport] select error:", e?.message || e); }
  });

  // Menu (Y)
  const menu = new THREE.Group();
  menu.visible = false;
  scene.add(menu);
  menu.add(new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), new THREE.MeshBasicMaterial({ color: 0x0b142a, transparent:true, opacity:0.92 })));

  function toggleMenu() { menu.visible = !menu.visible; D.log("[menu] visible=", menu.visible); }
  function updateMenuPose() {
    if (!menu.visible) return;
    const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
    const pos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld).add(fwd.multiplyScalar(1.2));
    pos.y -= 0.2;
    menu.position.copy(pos);
    menu.quaternion.copy(camera.quaternion);
  }

  // Movement
  const MOVE_SPEED = 1.25, STRAFE_SPEED = 1.05, DEAD = 0.18;
  const TURN_ANGLE = (45 * Math.PI) / 180;
  const TURN_COOLDOWN = 0.35;
  let turnCD = 0;
  let prevY = false;

  function getGamepad(ctrl) { return ctrl?.gamepad || ctrl?.inputSource?.gamepad || null; }

  function applyMove(dt, ax, ay) {
    const yaw = player?.yaw ?? rig.rotation.y ?? 0;
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
    rig.position.add(fwd.multiplyScalar(ay * MOVE_SPEED * dt));
    rig.position.add(right.multiplyScalar(ax * STRAFE_SPEED * dt));
  }

  function snapTurn(dir) {
    const yaw = (player?.yaw ?? rig.rotation.y ?? 0) + dir * TURN_ANGLE;
    if (player) player.yaw = yaw;
    rig.rotation.y = yaw;
  }

  renderer.xr.addEventListener("sessionstart", () => {
    try { safetySnapIfBlocked?.("STORE_CENTER"); }
    catch {}
    rig.rotation.y = player?.yaw ?? rig.rotation.y;
    D.log("[xr] sessionstart ✅ safe spawn");
  });

  // ✅ Hook into world-owned animation loop
  addFrameHook(({ t, dt }) => {
    // Only show arc in VR
    if (renderer.xr.isPresenting) {
      try { buildArc(controller2); } catch {}
    } else {
      arcLine.visible = false; reticle.visible = false;
    }

    // Sticks
    const gpL = getGamepad(controller1) || getGamepad(controller2);
    const gpR = getGamepad(controller2) || getGamepad(controller1);

    if (gpL?.axes?.length >= 2) {
      const lx = gpL.axes[0] || 0;
      const ly = gpL.axes[1] || 0;
      const ax = Math.abs(lx) > DEAD ? lx : 0;
      const ay = Math.abs(ly) > DEAD ? ly : 0;
      applyMove(dt, ax, -ay);
    }

    if (gpR?.axes?.length >= 4) {
      const rx = gpR.axes[2] || 0;
      const ax = Math.abs(rx) > DEAD ? rx : 0;
      turnCD -= dt;
      if (turnCD <= 0 && ax !== 0) {
        snapTurn(ax > 0 ? -1 : 1);
        turnCD = TURN_COOLDOWN;
      }
    }

    // Y button menu (buttons[3])
    let yDown = false;
    for (const gp of [getGamepad(controller1), getGamepad(controller2)]) {
      const b = gp?.buttons?.[3];
      if (b?.pressed) yDown = true;
    }
    if (yDown && !prevY) toggleMenu();
    prevY = yDown;

    updateMenuPose();
    camera.rotation.x = player?.pitch ?? 0;
  });

  D.log("[xr] installed ✅ (hook-based, cannot green-screen)");
    }
