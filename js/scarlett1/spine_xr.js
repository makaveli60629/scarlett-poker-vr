// /js/scarlett1/spine_xr.js — Scarlett 1.0 XR Spine v2.1 (FULL FIX)
// FIXES:
// ✅ Right stick forward/back inverted fixed
// ✅ Glow/flare for reticle + rainbow arc (no postprocessing)
// ✅ Removes the black HUD/screen (menu disabled for now)
// ✅ Left controller mapping stays: left stick X strafe (with better fallback)
// ✅ Right stick X = 45° snap turn, Right stick Y = forward/back
// ✅ Trigger = teleport pads

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

  // Laser line + bright flare sprite at tip
  function makeLaser(color) {
    const line = new THREE.Line(rayGeo, new THREE.LineBasicMaterial({ color }));
    line.scale.z = 12;

    // Glow sprite (simple flare)
    const sprMat = new THREE.SpriteMaterial({
      color,
      transparent: true,
      opacity: 0.95
    });
    const spr = new THREE.Sprite(sprMat);
    spr.scale.set(0.12, 0.12, 0.12);
    spr.position.set(0, 0, -1); // at end of unit ray; we scale line.z
    line.add(spr);

    return line;
  }

  controllerL.add(makeLaser(0xff33aa)); // pink
  controllerR.add(makeLaser(0x33aaff)); // blue

  // Raycasting
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

  // Teleport visuals (arc + reticle) — brighter + “glow”
  const ARC_SEG = 32;
  const arcPos = new Float32Array((ARC_SEG + 1) * 3);
  const arcCol = new Float32Array((ARC_SEG + 1) * 3);

  const arcGeo = new THREE.BufferGeometry();
  arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPos, 3));
  arcGeo.setAttribute("color", new THREE.BufferAttribute(arcCol, 3));

  const arcMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.95
  });

  const arcLine = new THREE.Line(arcGeo, arcMat);
  arcLine.visible = false;
  scene.add(arcLine);

  // Soft glow duplicate (slightly thicker look by layering)
  const arcGlow = new THREE.Line(
    arcGeo,
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.35 })
  );
  arcGlow.visible = false;
  arcGlow.scale.set(1.002, 1.002, 1.002);
  scene.add(arcGlow);

  // Reticle ring + glowing disk
  const reticleRing = new THREE.Mesh(
    new THREE.RingGeometry(0.25, 0.38, 64),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 })
  );
  reticleRing.rotation.x = -Math.PI / 2;
  reticleRing.visible = false;
  scene.add(reticleRing);

  const reticleGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.22, 48),
    new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.25 })
  );
  reticleGlow.rotation.x = -Math.PI / 2;
  reticleGlow.visible = false;
  scene.add(reticleGlow);

  function rainbow(i, t) {
    const a = t * Math.PI * 2;
    const r = 0.55 + 0.45 * Math.sin(a + 0.0);
    const g = 0.55 + 0.45 * Math.sin(a + 2.1);
    const b = 0.55 + 0.45 * Math.sin(a + 4.2);
    arcCol[i * 3 + 0] = r;
    arcCol[i * 3 + 1] = g;
    arcCol[i * 3 + 2] = b;
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
      arcGlow.visible = false;
      reticleRing.visible = false;
      reticleGlow.visible = false;
      return { hitPad: null };
    }

    const downO = hitPoint.clone().add(new THREE.Vector3(0, 1.0, 0));
    const downD = new THREE.Vector3(0, -1, 0);
    const hitPad = hitPadFromRay(downO, downD);

    arcLine.visible = true;
    arcGlow.visible = true;

    reticleRing.visible = true;
    reticleGlow.visible = true;
    reticleRing.position.copy(hitPoint);
    reticleGlow.position.copy(hitPoint);

    const ok = !!hitPad;
    reticleRing.material.color.set(ok ? 0x00ffcc : 0xffffff);
    reticleGlow.material.color.set(ok ? 0x00ffcc : 0xffffff);
    reticleGlow.material.opacity = ok ? 0.28 : 0.12;

    return { hitPad };
  }

  // Teleport on trigger/select
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

  // ✅ MENU DISABLED to remove black screen following camera
  // (We will re-add later once left controller mapping is confirmed)
  const MENU_ENABLED = false;

  // InputSources Gamepads
  function getPadsByHandedness() {
    const s = renderer.xr.getSession?.();
    if (!s) return { left: null, right: null };

    let left = null, right = null;
    const gps = [];

    for (const src of s.inputSources) {
      if (!src?.gamepad) continue;
      gps.push({ gp: src.gamepad, hand: src.handedness || "none" });
      if (src.handedness === "left") left = src.gamepad;
      if (src.handedness === "right") right = src.gamepad;
    }

    // fallback if handedness missing
    if (!left || !right) {
      if (!left) left = gps[0]?.gp || null;
      if (!right) right = gps[gps.length > 1 ? 1 : 0]?.gp || null;
    }

    return { left, right };
  }

  // Movement mapping (your layout)
  const DEAD = 0.18;

  const MOVE_SPEED = 1.35;     // slow walk
  const STRAFE_SPEED = 1.15;

  const TURN_ANGLE = (45 * Math.PI) / 180;
  const TURN_COOLDOWN = 0.30;
  let turnCD = 0;

  // Y button state (left controller button[3])
  let prevY = false;

  function axis(v) {
    return Math.abs(v) > DEAD ? v : 0;
  }

  function tryMove(newX, newZ) {
    if (typeof blockedXZ === "function" && blockedXZ(newX, newZ)) return false;
    rig.position.x = newX;
    rig.position.z = newZ;
    return true;
  }

  function moveForward(dt, amt) {
    const yaw = player.yaw ?? rig.rotation.y ?? 0;
    const fwdX = Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);
    const dx = fwdX * (amt * MOVE_SPEED * dt);
    const dz = fwdZ * (amt * MOVE_SPEED * dt);
    tryMove(rig.position.x + dx, rig.position.z + dz);
  }

  function strafe(dt, amt) {
    const yaw = player.yaw ?? rig.rotation.y ?? 0;
    const rightX = Math.cos(yaw);
    const rightZ = Math.sin(yaw);
    const dx = rightX * (amt * STRAFE_SPEED * dt);
    const dz = rightZ * (amt * STRAFE_SPEED * dt);
    tryMove(rig.position.x + dx, rig.position.z + dz);
  }

  function snapTurn(dir) {
    const yaw = (player.yaw ?? rig.rotation.y ?? 0) + dir * TURN_ANGLE;
    player.yaw = yaw;
    rig.rotation.y = yaw;
  }

  renderer.xr.addEventListener("sessionstart", () => {
    rig.rotation.y = player.yaw ?? rig.rotation.y;
    D.log("[xr] sessionstart ✅");
  });

  // Hook into world loop
  addFrameHook(({ dt }) => {
    // Arc preview from RIGHT controller
    if (renderer.xr.isPresenting) {
      try { buildArc(controllerR); } catch {}
    } else {
      arcLine.visible = false;
      arcGlow.visible = false;
      reticleRing.visible = false;
      reticleGlow.visible = false;
    }

    const { left: gpL, right: gpR } = getPadsByHandedness();
    if (!gpL || !gpR) return;

    // Read right stick axes
    let rX = 0, rY = 0;
    if (gpR.axes?.length >= 4) {
      rX = gpR.axes[2] || 0;
      rY = gpR.axes[3] || 0;
    } else if (gpR.axes?.length >= 2) {
      rX = gpR.axes[0] || 0;
      rY = gpR.axes[1] || 0;
    }

    // Read left stick X for strafe
    let lX = 0;
    if (gpL.axes?.length >= 2) lX = gpL.axes[0] || 0;

    // ✅ FIX: you reported forward/back is reversed.
    // Previously we inverted (-rY). Now we DO NOT invert.
    // If your hardware reports forward as negative, this will now feel correct.
    const fwdAmt = axis(rY);
    if (fwdAmt) moveForward(dt, fwdAmt);

    const strafeAmt = axis(lX);
    if (strafeAmt) strafe(dt, strafeAmt);

    // Snap turn from right stick X
    const turnAmt = axis(rX);
    turnCD -= dt;
    if (turnCD <= 0 && turnAmt !== 0) {
      snapTurn(turnAmt > 0 ? -1 : 1);
      turnCD = TURN_COOLDOWN;
    }

    // Y button (menu disabled)
    if (MENU_ENABLED) {
      const yDown = !!gpL.buttons?.[3]?.pressed;
      if (yDown && !prevY) {
        // toggleMenu();
      }
      prevY = yDown;
    }

    camera.rotation.x = player.pitch ?? 0;
  });

  D.log("[xr] installed ✅ (invert fixed + glow + no head-blocker)");
           }
