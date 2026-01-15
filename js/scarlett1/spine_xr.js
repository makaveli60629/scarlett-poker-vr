// /js/scarlett1/spine_xr.js — XR Controls v2
// ✅ Lasers
// ✅ Teleport: trigger + rainbow arc + floor circle reticle
// ✅ Smooth locomotion (slow): LEFT stick = move/strafe
// ✅ Snap turn 45°: RIGHT stick left/right
// ✅ Y button toggles menu panel

export async function installXR({ THREE, DIAG }) {
  const D = DIAG || console;

  const W = window.__SCARLETT1__;
  if (!W || !W.renderer || !W.scene || !W.camera) {
    D.warn("[xr] world not ready, skipping XR install");
    return;
  }

  const { renderer, scene, camera, player, spawnPads, teleportTo, safetySnapIfInsidePit } = W;

  // Import VRButton from your repo
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

  // -------- Helpers --------
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
    raycaster.ray.origin.copy(origin);
    raycaster.ray.direction.copy(dir);
    const hits = raycaster.intersectObjects(spawnPads || [], false);
    return hits && hits[0] ? hits[0].object : null;
  }

  function teleportToPad(pad) {
    if (!pad?.userData?.teleportPos) return;
    teleportTo(pad.userData.teleportPos);
    safetySnapIfInsidePit?.();
    D.log("[teleport] →", pad.userData.label || "PAD");
  }

  // -------- Teleport Visuals (arc + reticle) --------
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
    // simple rainbow using HSV-ish approximation
    const hue = (t * 0.85) % 1;
    const a = hue * Math.PI * 2;
    const r = 0.5 + 0.5 * Math.sin(a + 0);
    const g = 0.5 + 0.5 * Math.sin(a + 2.1);
    const b = 0.5 + 0.5 * Math.sin(a + 4.2);
    arcColors[i * 3 + 0] = r;
    arcColors[i * 3 + 1] = g;
    arcColors[i * 3 + 2] = b;
  }

  function buildArcFromController(ctrl) {
    const { origin, dir } = getControllerRay(ctrl);

    // Parabola parameters
    const speed = 10.0;
    const gravity = 18.0;
    const dt = 0.06;

    let hitPad = null;
    let hitPoint = null;

    let p = origin.clone();
    let v = dir.clone().multiplyScalar(speed);

    // Simulate arc
    for (let i = 0; i <= ARC_SEG; i++) {
      arcPositions[i * 3 + 0] = p.x;
      arcPositions[i * 3 + 1] = p.y;
      arcPositions[i * 3 + 2] = p.z;
      setRainbow(i, i / ARC_SEG);

      // Check floor hit at y=0
      if (i > 0 && p.y <= 0.02) {
        hitPoint = new THREE.Vector3(p.x, 0.02, p.z);
        break;
      }

      // step physics
      v.y -= gravity * dt;
      p = p.clone().add(v.clone().multiplyScalar(dt));
    }

    arcGeo.attributes.position.needsUpdate = true;
    arcGeo.attributes.color.needsUpdate = true;

    // If we have a floor point, see if it matches a pad (hit test pads)
    if (hitPoint) {
      const downOrigin = hitPoint.clone();
      const downDir = new THREE.Vector3(0, -1, 0);
      hitPad = findPadHit(downOrigin, downDir);

      reticle.position.copy(hitPoint);
      reticle.visible = true;
      arcLine.visible = true;

      // Reticle color = pad hit? brighter
      reticle.material.color.set(hitPad ? 0x00ffcc : 0xffffff);

      return { hitPad, hitPoint };
    }

    // No hit
    reticle.visible = false;
    arcLine.visible = false;
    return { hitPad: null, hitPoint: null };
  }

  // -------- Menu Panel (Y button) --------
  const menuGroup = new THREE.Group();
  menuGroup.visible = false;
  scene.add(menuGroup);

  const menuBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.7),
    new THREE.MeshBasicMaterial({ color: 0x0b142a, transparent: true, opacity: 0.92 })
  );
  menuGroup.add(menuBg);

  const menuBorder = new THREE.Mesh(
    new THREE.RingGeometry(0.58, 0.60, 64),
    new THREE.MeshBasicMaterial({ color: 0x2f6bff })
  );
  menuBorder.rotation.x = -Math.PI / 2;
  menuBorder.position.set(0, -0.36, 0.01);
  menuGroup.add(menuBorder);

  function toggleMenu() {
    menuGroup.visible = !menuGroup.visible;
    D.log("[menu] visible =", menuGroup.visible);
  }

  // Keep menu in front of you
  function updateMenuPose() {
    if (!menuGroup.visible) return;
    // place ~1.2m in front of camera
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const pos = camera.position.clone().add(forward.multiplyScalar(1.2));
    pos.y = camera.position.y - 0.2;
    menuGroup.position.copy(pos);
    menuGroup.quaternion.copy(camera.quaternion);
  }

  // -------- Controllers + lasers --------
  const controller1 = renderer.xr.getController(0);
  const controller2 = renderer.xr.getController(1);
  scene.add(controller1);
  scene.add(controller2);

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

  // Teleport on trigger (select)
  controller1.addEventListener("selectstart", () => {
    const { hitPad } = buildArcFromController(controller1);
    if (hitPad) teleportToPad(hitPad);
  });
  controller2.addEventListener("selectstart", () => {
    const { hitPad } = buildArcFromController(controller2);
    if (hitPad) teleportToPad(hitPad);
  });

  // -------- Locomotion + Snap Turn --------
  const MOVE_SPEED = 1.25;     // slow
  const STRAFE_SPEED = 1.05;   // slow
  const DEAD = 0.18;

  const TURN_ANGLE = (45 * Math.PI) / 180;
  const TURN_COOLDOWN = 0.35;
  let turnT = 0;

  // Button edge detection (for Y toggle)
  let prevY = false;

  function getGamepad(ctrl) {
    // WebXR controller has .gamepad in many runtimes
    return ctrl?.gamepad || ctrl?.inputSource?.gamepad || null;
  }

  function applyMove(dt, axisX, axisY) {
    // axisY forward/back, axisX strafe
    // Move relative to player yaw (not head pitch)
    const yaw = player.yaw;
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw) * -1);
    const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));

    // forward/back
    player.pos.add(fwd.multiplyScalar(axisY * MOVE_SPEED * dt));
    // strafe
    player.pos.add(right.multiplyScalar(axisX * STRAFE_SPEED * dt));
  }

  function snapTurn(dir) {
    player.yaw += dir * TURN_ANGLE;
  }

  // Choose which controller to use for preview arc (usually right hand controller = index 1)
  let arcController = controller2;

  renderer.xr.addEventListener("sessionstart", () => {
    // Safety: when entering XR, snap to safe spawn pad again
    if (spawnPads && spawnPads.length) {
      // Prefer LOBBY_N
      const pad = spawnPads.find(p => p.userData?.label === "LOBBY_N") || spawnPads[0];
      teleportTo(pad.userData.teleportPos);
      safetySnapIfInsidePit?.();
    }
    D.log("[xr] sessionstart ✅ forced spawn pad");
  });

  // Use world render loop via setAnimationLoop already; hook into it by wrapping:
  const oldLoop = renderer.getAnimationLoop?.() || null;

  // We'll just add our own setAnimationLoop that calls render too.
  // (world.js already set one; overriding is OK because we still render)
  let lastT = 0;

  renderer.setAnimationLoop((t) => {
    const now = t * 0.001;
    const dt = Math.min(0.05, Math.max(0.001, now - lastT));
    lastT = now;

    // Teleport arc preview always visible in VR
    if (renderer.xr.isPresenting) {
      buildArcFromController(arcController);
    } else {
      arcLine.visible = false;
      reticle.visible = false;
    }

    // Locomotion reads:
    // LEFT stick = move/strafe (we'll read from controller1 first, then controller2 fallback)
    // RIGHT stick = snap turn (we'll read from controller2 first, then controller1 fallback)
    const gpL = getGamepad(controller1) || getGamepad(controller2);
    const gpR = getGamepad(controller2) || getGamepad(controller1);

    // Left stick smooth locomotion
    if (gpL && gpL.axes && gpL.axes.length >= 2) {
      const lx = gpL.axes[0] || 0; // left/right
      const ly = gpL.axes[1] || 0; // forward/back (typically +down)
      const ax = Math.abs(lx) > DEAD ? lx : 0;
      const ay = Math.abs(ly) > DEAD ? ly : 0;

      // Many controllers have forward as -Y, so invert
      applyMove(dt, ax, -ay);
    }

    // Right stick snap turn
    if (gpR && gpR.axes && gpR.axes.length >= 4) {
      // On many runtimes: axes[2], axes[3] are right stick
      const rx = gpR.axes[2] || 0;
      const ax = Math.abs(rx) > DEAD ? rx : 0;

      turnT -= dt;
      if (turnT <= 0 && ax !== 0) {
        snapTurn(ax > 0 ? -1 : 1); // flip if it feels reversed later
        turnT = TURN_COOLDOWN;
      }
    }

    // Y button toggles menu (try common mapping button[3] for Y)
    // We'll check both controllers for safety.
    let yDown = false;
    const gps = [getGamepad(controller1), getGamepad(controller2)].filter(Boolean);

    for (const gp of gps) {
      const b = gp.buttons || [];
      const cand = b[3]; // commonly Y/B
      if (cand && cand.pressed) yDown = true;
    }
    if (yDown && !prevY) toggleMenu();
    prevY = yDown;

    updateMenuPose();
    safetySnapIfInsidePit?.();

    // Apply camera from player
    camera.rotation.order = "YXZ";
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
    camera.position.copy(player.pos);

    renderer.render(scene, camera);
  });

  D.log("[xr] locomotion + teleport visuals installed ✅");
}
