// /js/scarlett1/spine_xr.js — Scarlett XR Spine v2.4 (LOCKED)
// ✅ Trigger teleport works (polling)
// ✅ Right stick X = snap turn 45°
// ✅ Right stick Y = forward/back (FIXED: inverted back to match your controller)
// ✅ Move follows LOOK direction (camera forward flattened)
// ✅ No menu (no black blocker)
// ✅ Does NOT override facing anymore (world spawn handles facing toward table)

export async function installXR({ THREE, DIAG }) {
  const D = DIAG || console;

  const W = window.__SCARLETT1__;
  if (!W || !W.renderer || !W.scene || !W.camera || !W.rig || !W.addFrameHook) {
    D.warn("[xr] world not ready, skipping XR install");
    return;
  }

  const { renderer, scene, camera, rig, player, spawnPads, teleportTo, addFrameHook, blockedXZ } = W;

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

  function makeLaser(color) {
    const line = new THREE.Line(rayGeo, new THREE.LineBasicMaterial({ color }));
    line.scale.z = 12;

    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ color, transparent: true, opacity: 0.95 }));
    spr.scale.set(0.12, 0.12, 0.12);
    spr.position.set(0, 0, -1);
    line.add(spr);

    return line;
  }

  controllerL.add(makeLaser(0xff33aa));
  controllerR.add(makeLaser(0x33aaff));

  // Raycasting helpers
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

  function canStand(x, z) {
    if (typeof blockedXZ === "function") return !blockedXZ(x, z);
    return true;
  }

  function teleportToPad(pad) {
    if (!pad?.userData?.teleportPos) return false;
    const yaw = (pad.userData.yaw != null) ? pad.userData.yaw : (rig.rotation.y ?? 0);
    teleportTo(pad.userData.teleportPos, yaw);
    D.log("[teleport] →", pad.userData.label || "PAD");
    return true;
  }

  function teleportToPointXZ(x, z) {
    if (!canStand(x, z)) return false;
    teleportTo(new THREE.Vector3(x, 0, z), rig.rotation.y ?? 0);
    D.log("[teleport] → point", { x, z });
    return true;
  }

  // Teleport visuals (arc + reticle glow)
  const ARC_SEG = 32;
  const arcPos = new Float32Array((ARC_SEG + 1) * 3);
  const arcCol = new Float32Array((ARC_SEG + 1) * 3);

  const arcGeo = new THREE.BufferGeometry();
  arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPos, 3));
  arcGeo.setAttribute("color", new THREE.BufferAttribute(arcCol, 3));

  const arcLine = new THREE.Line(
    arcGeo,
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 })
  );
  arcLine.visible = false;
  scene.add(arcLine);

  const arcGlow = new THREE.Line(
    arcGeo,
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.35 })
  );
  arcGlow.visible = false;
  arcGlow.scale.set(1.002, 1.002, 1.002);
  scene.add(arcGlow);

  const reticleRing = new THREE.Mesh(
    new THREE.RingGeometry(0.25, 0.38, 64),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 })
  );
  reticleRing.rotation.x = -Math.PI / 2;
  reticleRing.visible = false;
  scene.add(reticleRing);

  const reticleGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.22, 48),
    new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.18 })
  );
  reticleGlow.rotation.x = -Math.PI / 2;
  reticleGlow.visible = false;
  scene.add(reticleGlow);

  function rainbow(i, t) {
    const a = t * Math.PI * 2;
    arcCol[i * 3 + 0] = 0.55 + 0.45 * Math.sin(a + 0.0);
    arcCol[i * 3 + 1] = 0.55 + 0.45 * Math.sin(a + 2.1);
    arcCol[i * 3 + 2] = 0.55 + 0.45 * Math.sin(a + 4.2);
  }

  let lastHitPad = null;
  let lastHitPoint = null;

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
      arcGlow.visible = false;
      reticleRing.visible = false;
      reticleGlow.visible = false;
      lastHitPad = null;
      lastHitPoint = null;
      return;
    }

    const downO = hitPoint.clone().add(new THREE.Vector3(0, 1.0, 0));
    const downD = new THREE.Vector3(0, -1, 0);
    const pad = hitPadFromRay(downO, downD);

    lastHitPad = pad || null;
    lastHitPoint = hitPoint.clone();

    arcLine.visible = true;
    arcGlow.visible = true;

    reticleRing.visible = true;
    reticleGlow.visible = true;
    reticleRing.position.copy(hitPoint);
    reticleGlow.position.copy(hitPoint);

    const ok = !!pad || canStand(hitPoint.x, hitPoint.z);
    reticleRing.material.color.set(ok ? 0x00ffcc : 0xffffff);
    reticleGlow.material.color.set(ok ? 0x00ffcc : 0xffffff);
    reticleGlow.material.opacity = ok ? 0.28 : 0.12;
  }

  // Right gamepad (Quest reliable)
  function getRightGamepad() {
    const s = renderer.xr.getSession?.();
    if (!s) return null;
    for (const src of s.inputSources) {
      if (src?.handedness === "right" && src?.gamepad) return src.gamepad;
    }
    for (const src of s.inputSources) {
      if (src?.gamepad) return src.gamepad;
    }
    return null;
  }

  let prevTrigger = false;
  function triggerPressed(gp) {
    if (!gp?.buttons?.length) return false;
    return !!(gp.buttons[0]?.pressed || gp.buttons[1]?.pressed);
  }

  // Movement (LOOK direction)
  const DEAD = 0.18;
  const MOVE_SPEED = 1.35;
  const TURN_ANGLE = (45 * Math.PI) / 180;
  const TURN_COOLDOWN = 0.30;
  let turnCD = 0;

  function axis(v) { return Math.abs(v) > DEAD ? v : 0; }

  function tryMove(newX, newZ) {
    if (typeof blockedXZ === "function" && blockedXZ(newX, newZ)) return false;
    rig.position.x = newX;
    rig.position.z = newZ;
    return true;
  }

  const camForward = new THREE.Vector3();
  function moveLookForward(dt, amt) {
    camera.getWorldDirection(camForward);
    camForward.y = 0;
    if (camForward.lengthSq() < 1e-6) return;
    camForward.normalize();

    const dx = camForward.x * (amt * MOVE_SPEED * dt);
    const dz = camForward.z * (amt * MOVE_SPEED * dt);
    tryMove(rig.position.x + dx, rig.position.z + dz);
  }

  function snapTurn(dir) {
    rig.rotation.y += dir * TURN_ANGLE;
    player.yaw = rig.rotation.y;
  }

  renderer.xr.addEventListener("sessionstart", () => {
    // Do NOT override facing here anymore. World spawn faces the table.
    D.log("[xr] sessionstart ✅ (world controls facing)");
  });

  addFrameHook(({ dt }) => {
    if (!renderer.xr.isPresenting) {
      arcLine.visible = false;
      arcGlow.visible = false;
      reticleRing.visible = false;
      reticleGlow.visible = false;
      return;
    }

    // Arc from RIGHT hand
    try { buildArc(controllerR); } catch {}

    const gpR = getRightGamepad();
    if (!gpR) return;

    // Right stick axes (prefer 2/3)
    let rX = 0, rY = 0;
    if (gpR.axes?.length >= 4) { rX = gpR.axes[2] || 0; rY = gpR.axes[3] || 0; }
    else if (gpR.axes?.length >= 2) { rX = gpR.axes[0] || 0; rY = gpR.axes[1] || 0; }

    // ✅ FIX: Forward/back flipped — invert here
    const fwdAmt = axis(-rY);
    if (fwdAmt) moveLookForward(dt, fwdAmt);

    // Snap turn 45°
    const turnAmt = axis(rX);
    turnCD -= dt;
    if (turnCD <= 0 && turnAmt !== 0) {
      snapTurn(turnAmt > 0 ? -1 : 1);
      turnCD = TURN_COOLDOWN;
    }

    // Trigger teleport edge
    const trig = triggerPressed(gpR);
    if (trig && !prevTrigger) {
      if (lastHitPad) teleportToPad(lastHitPad);
      else if (lastHitPoint) teleportToPointXZ(lastHitPoint.x, lastHitPoint.z);
    }
    prevTrigger = trig;

    camera.rotation.x = player.pitch ?? 0;
  });

  D.log("[xr] installed ✅ (fwd/back fixed + facing handled by world)");
  }
