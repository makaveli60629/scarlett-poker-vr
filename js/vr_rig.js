// js/vr_rig.js — Scarlett Poker VR — Permanent XR Rig (FIXED HEIGHT LOCK)
// Quest/GitHub safe. XRFrame-driven ray pose.
// Fix: Height lock is now ABSOLUTE (no more adding every frame).

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const VRRig = {
  create({ renderer, scene, camera, player, hub }) {
    const log = hub || (() => {});
    const ok = (m) => log(`✅ ${m}`);
    const warn = (m) => log(`⚠️ ${m}`);

    const state = {
      renderer, scene, camera, player,

      bounds: { minX: -15.5, maxX: 15.5, minZ: -15.5, maxZ: 15.5 },

      moveSpeed: 2.25,
      snapAngle: Math.PI / 4,
      snapCooldown: 0.28,
      snapCD: 0,

      // Height lock (FIXED)
      targetEyeHeight: 1.80,
      heightLockEnabled: true,
      baseY: player.position.y,      // <-- store once
      _lastPresenting: false,

      teleportPressed: false,

      refSpace: null,
      poseMatrix: new THREE.Matrix4(),
      posePos: new THREE.Vector3(),
      poseQuat: new THREE.Quaternion(),
      poseDir: new THREE.Vector3(),
      mode: "fallback-camera",

      raycaster: new THREE.Raycaster(),
      floorPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      hit: new THREE.Vector3(),

      beam: null,
      tpDisc: null,
      tpRing: null,

      tmpV: new THREE.Vector3(),
      tmpV2: new THREE.Vector3(),
    };

    function clampToBounds(vec3) {
      vec3.x = THREE.MathUtils.clamp(vec3.x, state.bounds.minX, state.bounds.maxX);
      vec3.z = THREE.MathUtils.clamp(vec3.z, state.bounds.minZ, state.bounds.maxZ);
      // failsafe clamp Y so we never fly away
      vec3.y = THREE.MathUtils.clamp(vec3.y, -0.25, 3.0);
    }

    renderer.xr.addEventListener("sessionstart", () => {
      try {
        state.refSpace = renderer.xr.getReferenceSpace?.() || null;
        ok("VRRig: XR session started");
      } catch {
        state.refSpace = null;
        warn("VRRig: referenceSpace unavailable (still ok)");
      }
    });

    renderer.xr.addEventListener("sessionend", () => {
      state.refSpace = null;
      state.mode = "fallback-camera";
      warn("VRRig: XR session ended");
    });

    // visuals
    function makeBeam() {
      const geo = new THREE.CylinderGeometry(0.006, 0.010, 1.2, 10, 1, true);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x00ff66,
        emissive: 0x00ff66,
        emissiveIntensity: 2.8,
        transparent: true,
        opacity: 0.92,
        depthTest: false,
        depthWrite: false,
        roughness: 0.1,
        metalness: 0.0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = 9999;
      mesh.rotation.x = Math.PI / 2;
      return mesh;
    }

    state.beam = makeBeam();
    scene.add(state.beam);

    state.tpDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.28, 44),
      new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false })
    );
    state.tpDisc.rotation.x = -Math.PI / 2;
    state.tpDisc.renderOrder = 9998;
    scene.add(state.tpDisc);

    state.tpRing = new THREE.Mesh(
      new THREE.RingGeometry(0.30, 0.36, 44),
      new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false })
    );
    state.tpRing.rotation.x = -Math.PI / 2;
    state.tpRing.renderOrder = 9999;
    scene.add(state.tpRing);

    ok("VRRig: visuals ready");

    // input helpers
    function getGamepads() {
      const session = renderer.xr.getSession?.();
      if (!session) return { left: null, right: null };

      let left = null, right = null;
      for (const src of session.inputSources || []) {
        if (!src?.gamepad) continue;
        if (src.handedness === "left") left = src.gamepad;
        if (src.handedness === "right") right = src.gamepad;
      }
      return { left, right };
    }

    function readAxes(gp) {
      const a = gp?.axes || [];
      const p01 = { x: a[0] ?? 0, y: a[1] ?? 0, mag: Math.abs(a[0] ?? 0) + Math.abs(a[1] ?? 0) };
      const p23 = { x: a[2] ?? 0, y: a[3] ?? 0, mag: Math.abs(a[2] ?? 0) + Math.abs(a[3] ?? 0) };
      return p23.mag > p01.mag ? p23 : p01;
    }

    function readRightTrigger() {
      const session = renderer.xr.getSession?.();
      if (!session) return 0;

      let gp = null;
      for (const s of session.inputSources || []) {
        if (s?.handedness === "right" && s?.gamepad) { gp = s.gamepad; break; }
      }
      if (!gp) return 0;

      const b = gp.buttons || [];
      const v0 = typeof b[0]?.value === "number" ? b[0].value : (b[0]?.pressed ? 1 : 0);
      const v1 = typeof b[1]?.value === "number" ? b[1].value : (b[1]?.pressed ? 1 : 0);
      return Math.max(v0, v1);
    }

    // XRFrame pose (right ray)
    function selectSource(session) {
      const srcs = session?.inputSources || [];
      if (!srcs.length) return { src: null, mode: "fallback-camera" };

      let right = null, left = null;
      for (const s of srcs) {
        if (!s?.targetRaySpace) continue;
        if (s.handedness === "right") right = s;
        if (s.handedness === "left") left = s;
      }
      if (right) return { src: right, mode: "right" };
      if (left) return { src: left, mode: "left" };

      for (const s of srcs) if (s?.targetRaySpace) return { src: s, mode: "left" };
      return { src: null, mode: "fallback-camera" };
    }

    function updateRayPose() {
      const session = renderer.xr.getSession?.();
      const frame = renderer.xr.getFrame?.();
      const refSpace = state.refSpace || renderer.xr.getReferenceSpace?.();

      if (!session || !frame || !refSpace) {
        state.poseMatrix.copy(camera.matrixWorld);
        state.posePos.setFromMatrixPosition(state.poseMatrix);
        state.poseQuat.setFromRotationMatrix(state.poseMatrix);
        state.poseDir.set(0, 0, -1).applyQuaternion(state.poseQuat).normalize();
        state.mode = "fallback-camera";
        return;
      }

      const { src, mode } = selectSource(session);
      const pose = src ? frame.getPose(src.targetRaySpace, refSpace) : null;

      if (pose?.transform?.matrix) {
        state.poseMatrix.fromArray(pose.transform.matrix);
        state.posePos.setFromMatrixPosition(state.poseMatrix);
        state.poseQuat.setFromRotationMatrix(state.poseMatrix);
        state.poseDir.set(0, 0, -1).applyQuaternion(state.poseQuat).normalize();
        state.mode = mode;
        return;
      }

      state.poseMatrix.copy(camera.matrixWorld);
      state.posePos.setFromMatrixPosition(state.poseMatrix);
      state.poseQuat.setFromRotationMatrix(state.poseMatrix);
      state.poseDir.set(0, 0, -1).applyQuaternion(state.poseQuat).normalize();
      state.mode = "fallback-camera";
    }

    return {
      setBounds(b) {
        state.bounds = { ...state.bounds, ...b };
        ok("VRRig: bounds set");
      },

      setHeightLock(targetEyeHeight, enabled = true) {
        state.targetEyeHeight = targetEyeHeight;
        state.heightLockEnabled = enabled;
        // Reset baseY to current player position when you change settings
        state.baseY = player.position.y;
        ok(`VRRig: heightLock ${enabled ? "ON" : "OFF"} @ ${targetEyeHeight.toFixed(2)}m`);
      },

      update(dt) {
        const presenting = !!renderer.xr.getSession?.();

        // If we just entered VR, “freeze” baseY so it doesn’t drift
        if (presenting && !state._lastPresenting) {
          state.baseY = player.position.y;
          ok("VRRig: entering VR (baseY locked)");
        }
        state._lastPresenting = presenting;

        // Height lock (ABSOLUTE, not +=)
        if (presenting && state.heightLockEnabled) {
          const camLocalY = camera.position.y || 0;
          player.position.y = state.baseY + (state.targetEyeHeight - camLocalY);
          clampToBounds(player.position);
        }

        // Movement + snap
        const { left, right } = getGamepads();

        if (left) {
          const { x, y } = readAxes(left);
          const dead = 0.14;

          let mx = Math.abs(x) < dead ? 0 : x;
          let my = Math.abs(y) < dead ? 0 : y;

          // strafe inversion fix
          mx = -mx;

          if (mx || my) {
            const fwd = state.tmpV;
            camera.getWorldDirection(fwd);
            fwd.y = 0;
            fwd.normalize();

            const rightDir = state.tmpV2.crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

            player.position.addScaledVector(rightDir, mx * state.moveSpeed * dt);
            player.position.addScaledVector(fwd, -my * state.moveSpeed * dt);

            clampToBounds(player.position);
          }
        }

        state.snapCD = Math.max(0, state.snapCD - dt);
        if (right && state.snapCD <= 0) {
          const { x } = readAxes(right);
          if (Math.abs(x) > 0.65) {
            player.rotation.y += (x > 0 ? -1 : 1) * state.snapAngle;
            state.snapCD = state.snapCooldown;
          }
        }

        // Ray pose + visuals
        updateRayPose();

        state.beam.quaternion.copy(state.poseQuat);
        state.beam.position.copy(state.posePos);
        const tip = new THREE.Vector3(0, 0, -0.08).applyQuaternion(state.poseQuat);
        const push = new THREE.Vector3(0, 0, -0.60).applyQuaternion(state.poseQuat);
        state.beam.position.add(tip).add(push);

        state.raycaster.set(state.posePos, state.poseDir);
        const hitPoint = state.raycaster.ray.intersectPlane(state.floorPlane, state.hit);

        if (hitPoint) {
          clampToBounds(state.hit);
          state.tpDisc.position.set(state.hit.x, 0.02, state.hit.z);
          state.tpRing.position.copy(state.tpDisc.position);
        } else {
          state.tpDisc.position.set(player.position.x, 0.02, player.position.z);
          state.tpRing.position.copy(state.tpDisc.position);
        }

        // Teleport
        const trig = readRightTrigger();
        const down = trig > 0.75;

        if (down && !state.teleportPressed) {
          state.teleportPressed = true;
          player.position.x = state.tpDisc.position.x;
          player.position.z = state.tpDisc.position.z;
          clampToBounds(player.position);
        }
        if (!down) state.teleportPressed = false;
      },
    };
  },
};
