// /js/scarlett1/world_parts/xr_controls.js — XR Controllers + Hands + Teleport Visuals + Sticks v1.0

export function installXRControls(ctx, core, extra = {}) {
  const { THREE, log } = ctx;
  const { renderer, scene, camera, player } = core;

  const MAT_GLOW_LINE = new THREE.LineBasicMaterial({ color: 0x7cc8ff, transparent: true, opacity: 0.92 });
  const MAT_RETICLE = new THREE.MeshStandardMaterial({ color: 0x2b6cff, roughness: 0.25, metalness: 0.2, emissive: 0x2040aa, emissiveIntensity: 0.8 });

  const UP = new THREE.Vector3(0,1,0);

  const xr = {
    installed: false,
    tmpMat: new THREE.Matrix4(),
    rayOrigin: new THREE.Vector3(),
    rayDir: new THREE.Vector3(),
    plane: new THREE.Plane(new THREE.Vector3(0,1,0), 0),
    hit: new THREE.Vector3(),
    controller: [null,null],
    grip: [null,null],
    hand: [null,null],
    laser: [null,null],
    selecting: [false,false],
    pinchSelecting: [false,false],
    reticle: null,
    arc: [null,null],
    arcPts: [new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()],
    moveSpeed: 2.2,
    strafeSpeed: 2.0,
    snapAngle: Math.PI/4,
    snapCooldown: 0,
    snapDead: 0.72
  };

  function teleportTo(point) {
    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    const rigPos = new THREE.Vector3();
    player.getWorldPosition(rigPos);

    const dx = camPos.x - rigPos.x;
    const dz = camPos.z - rigPos.z;

    player.position.set(point.x - dx, 0, point.z - dz);
  }

  function computeRayFromObject(obj) {
    xr.tmpMat.identity().extractRotation(obj.matrixWorld);
    xr.rayOrigin.setFromMatrixPosition(obj.matrixWorld);
    xr.rayDir.set(0,0,-1).applyMatrix4(xr.tmpMat).normalize();
  }

  function raycastToFloor() {
    const denom = xr.plane.normal.dot(xr.rayDir);
    if (Math.abs(denom) < 1e-6) return null;
    const t = -(xr.plane.normal.dot(xr.rayOrigin) + xr.plane.constant) / denom;
    if (t < 0) return null;
    xr.hit.copy(xr.rayOrigin).addScaledVector(xr.rayDir, t);
    return xr.hit;
  }

  function ensureTeleportVisuals() {
    if (!xr.reticle) {
      xr.reticle = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.26, 40), MAT_RETICLE);
      xr.reticle.rotation.x = -Math.PI/2;
      xr.reticle.position.y = 0.02;
      xr.reticle.visible = false;
      scene.add(xr.reticle);

      const glow = new THREE.Mesh(
        new THREE.CircleGeometry(0.22, 40),
        new THREE.MeshStandardMaterial({
          color: 0x2b6cff, emissive: 0x2b6cff, emissiveIntensity: 0.9,
          roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.25
        })
      );
      glow.rotation.x = -Math.PI/2;
      glow.position.y = 0.019;
      xr.reticle.add(glow);
    }

    for (let i=0;i<2;i++) {
      if (!xr.arc[i]) {
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()]);
        const line = new THREE.Line(geo, MAT_GLOW_LINE);
        line.visible = false;
        scene.add(line);
        xr.arc[i] = line;
      }
    }
  }

  function updateArc(i, start, end) {
    const mid = xr.arcPts[2];
    mid.copy(start).lerp(end, 0.5);
    mid.y += 1.2;

    const p0 = xr.arcPts[0].copy(start);
    const p1 = xr.arcPts[1].copy(start).lerp(mid, 0.5);
    const p2 = xr.arcPts[2];
    const p3 = xr.arcPts[3].copy(mid).lerp(end, 0.5);
    const p4 = xr.arcPts[4].copy(end);

    xr.arc[i].geometry.setFromPoints([p0,p1,p2,p3,p4]);
    xr.arc[i].visible = true;
  }

  function getYawForward() {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    return dir;
  }

  function getXRGamepads() {
    const s = renderer.xr.getSession?.();
    if (!s) return { left: null, right: null };

    let left=null,right=null;
    for (const src of s.inputSources) {
      if (!src || !src.gamepad) continue;
      const h = src.handedness || "none";
      if (h === "left") left = src.gamepad;
      if (h === "right") right = src.gamepad;
    }
    return { left, right };
  }

  function readStick(gp) {
    if (!gp || !gp.axes) return { x:0, y:0 };
    const a0 = gp.axes[0] || 0, a1 = gp.axes[1] || 0;
    const a2 = gp.axes[2] || 0, a3 = gp.axes[3] || 0;
    const m01 = Math.abs(a0)+Math.abs(a1);
    const m23 = Math.abs(a2)+Math.abs(a3);
    return (m23 > m01) ? { x:a2, y:a3 } : { x:a0, y:a1 };
  }

  async function installXR() {
    if (xr.installed) return;
    xr.installed = true;
    ensureTeleportVisuals();

    log("[XR] installing controllers + hands + sticks…");

    for (let i=0;i<2;i++) {
      const c = renderer.xr.getController(i);
      player.add(c);
      xr.controller[i] = c;

      const geom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
      const mat = new THREE.LineBasicMaterial({ color: 0x66aaff, transparent:true, opacity:0.9 });
      const line = new THREE.Line(geom, mat);
      line.scale.z = 6;
      c.add(line);
      xr.laser[i] = line;

      c.addEventListener("selectend", () => {
        computeRayFromObject(c);
        const hit = raycastToFloor();
        if (hit) teleportTo(hit);
      });
    }

    // Controller models (safe)
    try {
      const { XRControllerModelFactory } = await import("https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRControllerModelFactory.js");
      const factory = new XRControllerModelFactory();
      for (let i=0;i<2;i++) {
        const grip = renderer.xr.getControllerGrip(i);
        grip.add(factory.createControllerModel(grip));
        player.add(grip);
        xr.grip[i] = grip;
      }
      log("[XR] controller models ✅");
    } catch (e) {
      log("[XR] controller models skipped:", e?.message || e);
    }

    // Hands (safe)
    try {
      const { XRHandModelFactory } = await import("https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRHandModelFactory.js");
      const handFactory = new XRHandModelFactory();
      for (let i=0;i<2;i++) {
        const h = renderer.xr.getHand(i);
        h.add(handFactory.createHandModel(h, "mesh"));
        player.add(h);
        xr.hand[i] = h;

        h.addEventListener("pinchend", () => {
          computeRayFromObject(h);
          const hit = raycastToFloor();
          if (hit) teleportTo(hit);
        });
      }
      log("[XR] hands ✅");
    } catch (e) {
      log("[XR] hands skipped:", e?.message || e);
    }
  }

  renderer.xr.addEventListener("sessionstart", installXR);

  // ✅ run every frame (no need to modify world loop)
  const oldLoop = renderer.getAnimationLoop?.();
  // We won’t override loop (world controls loop), instead we hook into render via requestAnimationFrame-ish:
  // We’ll just add a small per-frame handler by monkey patching render call timing isn’t safe.
  // So we attach to renderer.xr events and rely on world loop calling this update.
  // World loop doesn’t call us directly, so we must expose update() and let world call it.
  // But world already calls renderer.render(scene,camera). So we *do* need update access.
  // Solution: we attach update function to core so world can call it later if desired.
  core.__xrUpdate = function xrUpdate(dt, t) {
    if (!xr.installed || !renderer.xr.isPresenting) return;
    ensureTeleportVisuals();

    // Aim source
    let aimObj = xr.controller[1] || xr.controller[0] || xr.hand[1] || xr.hand[0];
    if (aimObj) {
      computeRayFromObject(aimObj);
      const hit = raycastToFloor();
      if (hit) {
        xr.reticle.visible = true;
        xr.reticle.position.set(hit.x, 0.02, hit.z);
      } else xr.reticle.visible = false;
    }

    // arcs
    for (let i=0;i<2;i++) {
      const src = xr.controller[i] || xr.hand[i];
      if (!src || !xr.arc[i]) { if (xr.arc[i]) xr.arc[i].visible=false; continue; }
      computeRayFromObject(src);
      const hit = raycastToFloor();
      if (!hit) { xr.arc[i].visible=false; continue; }
      const start = new THREE.Vector3().setFromMatrixPosition(src.matrixWorld);
      updateArc(i, start, hit.clone());
      if (xr.laser[i]) xr.laser[i].scale.z = Math.max(0.25, Math.min(12, hit.distanceTo(start)));
    }

    // locomotion
    const { left, right } = getXRGamepads();
    const L = readStick(left);
    const R = readStick(right);

    const dz = 0.14;
    const lx = Math.abs(L.x) < dz ? 0 : L.x;
    const ly = Math.abs(L.y) < dz ? 0 : L.y;
    const rx = Math.abs(R.x) < dz ? 0 : R.x;

    if (lx !== 0 || ly !== 0) {
      const fwd = getYawForward();
      const rightVec = new THREE.Vector3().crossVectors(fwd, UP).normalize().multiplyScalar(-1);

      const forwardAmt = -ly * xr.moveSpeed * dt;
      const strafeAmt  =  lx * xr.strafeSpeed * dt;

      player.position.addScaledVector(fwd, forwardAmt);
      player.position.addScaledVector(rightVec, strafeAmt);
    }

    xr.snapCooldown = Math.max(0, xr.snapCooldown - dt);
    if (xr.snapCooldown <= 0) {
      if (rx > xr.snapDead) { player.rotation.y -= xr.snapAngle; xr.snapCooldown = 0.22; }
      else if (rx < -xr.snapDead) { player.rotation.y += xr.snapAngle; xr.snapCooldown = 0.22; }
    }

    // Telepad pulse if near
    const tp = extra?.store?.telepad;
    if (tp && xr.reticle && xr.reticle.visible) {
      const d = xr.reticle.position.distanceTo(tp.position);
      tp.scale.setScalar(d < 1.2 ? (1.0 + Math.sin(t*6)*0.05) : 1.0);
    }
  };
}
