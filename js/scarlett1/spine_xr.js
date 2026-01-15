// /js/scarlett1/spine_xr.js — XR Controls v3 (RIG-BASED, SAFE, PERMANENT)
// ✅ Whole-rig locomotion (camera + controllers + lasers stay together)
// ✅ Teleport to Spawn Pads (trigger) + visible arc + reticle circle
// ✅ Smooth move (slow): LEFT stick = forward/back + strafe
// ✅ Snap turn 45°: RIGHT stick left/right
// ✅ Y button toggles a simple menu panel
// Works with world.js v5 which exposes: __SCARLETT1__ { scene, renderer, camera, rig, spawnPads, teleportTo, safetySnapIfBlocked }

export async function installXR({ THREE, DIAG }) {
  const D = DIAG || console;

  const W = window.__SCARLETT1__;
  if (!W || !W.renderer || !W.scene || !W.camera || !W.rig) {
    D.warn("[xr] world not ready, skipping XR install");
    return;
  }

  const { renderer, scene, camera, rig, player, spawnPads, teleportTo, safetySnapIfBlocked } = W;

  // --- VRButton ---
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

  // --- Helpers ---
  const raycaster = new THREE.Raycaster();
  const tmpMat = new THREE.Matrix4();
  const tmpV = new THREE.Vector3();
  const tmpV2 = new THREE.Vector3();

  function getControllerRay(ctrl) {
    tmpMat.identity().extractRotation(ctrl.matrixWorld);
    const origin = tmpV.setFromMatrixPosition(ctrl.matrixWorld).clone();
    const dir = tmpV2.set(0, 0, -1).applyMatrix4(tmpMat).normalize().clone();
    return { origin, dir };
  }

  function findPadHit(origin, dir) {
    if (!spawnPads || !spawnPads.length) return null;
    raycaster.ray.origin.copy(origin);
    raycaster.ray.direction.copy(dir);
    const hits = raycaster.intersectObjects(spawnPads, false);
    return hits && hits[0] ? hits[0].object : null;
  }

  function teleportToPad(pad) {
    if (!pad?.userData?.teleportPos) return;
    const yaw = (pad.userData.yaw != null) ? pad.userData.yaw : (player?.yaw ?? Math.PI);
    teleportTo(pad.userData.teleportPos, yaw);
    D.log("[teleport] →", pad.userData.label || "PAD");
  }

  // --- Teleport Visuals (arc + reticle) ---
  const ARC_SEG = 32;
  const arcPositions = new Float32Array((ARC_SEG + 1) * 3);
  const arcColors = new Float32Array((ARC_SEG + 1) * 3);

  const arcGeo = new THREE.BufferGeometry();
  arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPositions, 3));
  arcGeo.setAttribute("color", new THREE.BufferAttribute(arcColors, 3));

  const arcMat = new THREE.LineBasicMaterial({ vertexColors: true });
  const arcLine = new THREE.Line(arcGeo, arcMat);
  arcLine.visible = false;
  scene.add(arcLine);

  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.25, 0.35, 48),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  reticle.rotation.x = -Math.PI / 2;
  reticle.position.set(0, 0.02, 0);
  reticle.visible = false;
  scene.add(reticle);

  function setRainbow(i, t) {
    // simple rainbow via phase-shifted sine
    const a = t * Math.PI * 2;
    const r = 0.5 + 0.5 * Math.sin(a + 0.0);
    const g = 0.5 + 0.5 * Math.sin(a + 2.1);
    const b = 0.5 + 0.5 * Math.sin(a + 4.2);
    arcColors[i * 3 + 0] = r;
    arcColors[i * 3 + 1] = g;
    arcColors[i * 3 + 2] = b;
  }

  function buildArcFromController(ctrl) {
    const { origin, dir } = getControllerRay(ctrl);

    // Parabola parameters (tune as needed)
    const speed = 10.0;
    const gravity = 18.0;
    const dt = 0.06;

    let hitPad = null;
    let hitPoint = null;

    let p = origin.clone();
    let v = dir.clone().multiplyScalar(speed);

    for (let i = 0; i <= ARC_SEG; i++) {
      arcPositions[i * 3 + 0] = p.x;
      arcPositions[i * 3 + 1] = p.y;
      arcPositions[i * 3 + 2] = p.z;
      setRainbow(i, i / ARC_SEG);

      if (i > 0 && p.y <= 0.02) {
        hitPoint = new THREE.Vector3(p.x, 0.02, p.z);
        break;
      }

      v.y -= gravity * dt;
      p = p.clone().add(v.clone().multiplyScalar(dt));
    }

    arcGeo.attributes.position.needsUpdate = true;
    arcGeo.attributes.color.needsUpdate = true;

    if (hitPoint) {
      // hit test pads from this point straight down
      const downOrigin = hitPoint.clone().add(new THREE.Vector3(0, 1.0, 0));
      const downDir = new THREE.Vector3(0, -1, 0);
      hitPad = findPadHit(downOrigin, downDir);

      reticle.position.copy(hitPoint);
      reticle.visible = true;
      arcLine.visible = true;
      reticle.material.color.set(hitPad ? 0x00ffcc : 0xffffff);

      return { hitPad, hitPoint };
    }

    reticle.visible = false;
    arcLine.visible = false;
    return { hitPad: null, hitPoint: null };
  }

  // --- Menu Panel (Y button) ---
  const menuGroup = new THREE.Group();
  menuGroup.visible = false;
  scene.add(menuGroup);

  const menuBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.7),
    new THREE.MeshBasicMaterial({ color: 0x0b142a, transparent: true, opacity: 0.92 })
  );
  menuGroup.add(menuBg);

  const menuLine = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.02),
    new THREE.MeshBasicMaterial({ color: 0x2f6bff })
  );
  menuLine.position.set(0, 0.2, 0.01);
  menuGroup.add(menuLine);

  function toggleMenu() {
    menuGroup.visible = !menuGroup.visible;
    D.log("[menu] visible =", menuGroup.visible);
  }

  function updateMenuPose() {
    if (!menuGroup.visible) return;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const pos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld).add(forward.multiplyScalar(1.2));
    pos.y -= 0.2;
    menuGroup.position.copy(pos);
    menuGroup.quaternion.copy(camera.quaternion);
  }

  // --- Controllers + Lasers ---
  const controller1 = renderer.xr.getController(0);
  const controller2 = renderer.xr.getController(1);
  rig.add(controller1);
  rig.add(controller2);

  const rayGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1)
  ]);

  const makeRay = (color) => {
    const mat = new THREE.LineBasicMaterial({ color });
    const ray = new THREE.Line(rayGeo, mat);
    ray.name = "laser";
    ray.scale.z = 12;
    return ray;
  };

  controller1.add(makeRay(0xff33aa)); // pink
  controller2.add(makeRay(0x33aaff)); // blue
  D.log("[xr] controllers + lasers installed ✅");

  // Teleport on trigger/select
  controller1.addEventListener("selectstart", () => {
    const { hitPad } = buildArcFromController(controller1);
    if (hitPad) teleportToPad(hitPad);
  });
  controller2.addEventListener("selectstart", () => {
    const { hitPad } = buildArcFromController(controller2);
    if (hitPad) teleportToPad(hitPad);
  });

  // --- Locomotion + Snap Turn ---
  const MOVE_SPEED = 1.25;     // slow
  const STRAFE_SPEED = 1.05;   // slow
  const DEAD = 0.18;

  const TURN_ANGLE = (45 * Math.PI) / 180;
  const TURN_COOLDOWN = 0.35;
  let turnCooldown = 0;

  // Button edge detection
  let prevY = false;

  function getGamepad(ctrl) {
    return ctrl?.gamepad || ctrl?.inputSource?.gamepad || null;
  }

  function applyMove(dt, axisX, axisY) {
    // axisY = forward/back, axisX = strafe
    const yaw = player?.yaw ?? rig.rotation.y ?? 0;

    // Forward vector from yaw (XZ plane)
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));

    rig.position.add(fwd.multiplyScalar(axisY * MOVE_SPEED * dt));
    rig.position.add(right.multiplyScalar(axisX * STRAFE_SPEED * dt));
  }

  function snapTurn(dir) {
    const yaw = (player?.yaw ?? 0) + dir * TURN_ANGLE;
    if (player) player.yaw = yaw;
    rig.rotation.y = yaw;
  }

  // Use right controller for arc preview by default
  let arcController = controller2;

  renderer.xr.addEventListener("sessionstart", () => {
    // Force safe spawn in a room again (STORE_CENTER default)
    try {
      safetySnapIfBlocked?.("STORE_CENTER");
    } catch {}
    // Ensure rig yaw matches player yaw
    rig.rotation.y = player?.yaw ?? rig.rotation.y;
    D.log("[xr] sessionstart ✅ rig-based");
  });

  // --- Animation loop wrapper ---
  let lastT = 0;

  renderer.setAnimationLoop((tMs) => {
    const t = tMs * 0.001;
    const dt = Math.min(0.05, Math.max(0.001, t - lastT));
    lastT = t;

    // Teleport arc preview (when presenting)
    if (renderer.xr.isPresenting) {
      buildArcFromController(arcController);
    } else {
      arcLine.visible = false;
      reticle.visible = false;
    }

    // Read gamepads
    const gpL = getGamepad(controller1) || getGamepad(controller2);
    const gpR = getGamepad(controller2) || getGamepad(controller1);

    // LEFT stick smooth locomotion (axes[0], axes[1])
    if (gpL?.axes?.length >= 2) {
      const lx = gpL.axes[0] || 0;
      const ly = gpL.axes[1] || 0;

      const ax = Math.abs(lx) > DEAD ? lx : 0;
      const ay = Math.abs(ly) > DEAD ? ly : 0;

      // invert Y (typical forward = -Y)
      applyMove(dt, ax, -ay);
    }

    // RIGHT stick snap turn (axes[2])
    if (gpR?.axes?.length >= 4) {
      const rx = gpR.axes[2] || 0;
      const ax = Math.abs(rx) > DEAD ? rx : 0;

      turnCooldown -= dt;
      if (turnCooldown <= 0 && ax !== 0) {
        // If direction feels reversed, swap the sign here.
        snapTurn(ax > 0 ? -1 : 1);
        turnCooldown = TURN_COOLDOWN;
      }
    }

    // Y button toggles menu (common: buttons[3])
    let yDown = false;
    for (const gp of [getGamepad(controller1), getGamepad(controller2)]) {
      if (!gp?.buttons) continue;
      const b = gp.buttons[3];
      if (b?.pressed) yDown = true;
    }
    if (yDown && !prevY) toggleMenu();
    prevY = yDown;

    updateMenuPose();

    // Keep camera pitch (optional; yaw handled by rig)
    camera.rotation.x = player?.pitch ?? 0;

    renderer.render(scene, camera);
  });

  D.log("[xr] locomotion + teleport visuals + menu installed ✅");
                          }
