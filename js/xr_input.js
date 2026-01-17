// js/xr_input.js — Controller + rays + axes
import * as THREE from 'three';

export const XRInput = (() => {
  function create({ renderer, scene, playerRig, diag }) {
    const left = { connected:false, gamepad:false, grip:null, ray:null, controller:null };
    const right = { connected:false, gamepad:false, grip:null, ray:null, controller:null };

    const axes = { lx:0, ly:0, rx:0, ry:0 };
    const tempMat = new THREE.Matrix4();
    const rayDir = new THREE.Vector3();
    const rayOrigin = new THREE.Vector3();

    function makeRay() {
      const geo = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1) ]);
      const mat = new THREE.LineBasicMaterial({ transparent:true, opacity:0.85 });
      const line = new THREE.Line(geo, mat);
      line.scale.z = 6;
      return line;
    }

    function hook(idx, target) {
      const controller = renderer.xr.getController(idx);
      const grip = renderer.xr.getControllerGrip(idx);

      controller.addEventListener('connected', (e) => {
        target.connected = true;
        target.controller = controller;
        target.grip = grip;
        target.gamepad = !!e.data.gamepad;
        diag && diag.log(`[XR] controller${idx} connected gamepad=${target.gamepad}`);
      });

      controller.addEventListener('disconnected', () => {
        target.connected = false;
        target.gamepad = false;
        diag && diag.log(`[XR] controller${idx} disconnected`);
      });

      const ray = makeRay();
      controller.add(ray);
      target.ray = ray;

      // Important: parent controllers under playerRig so teleport/move affects rays (prevents “stuck laser”)
      playerRig.add(controller);
      playerRig.add(grip);

      return controller;
    }

    hook(0, left);
    hook(1, right);

    function update() {
      // Read axes from XR session input sources
      const session = renderer.xr.getSession();
      if (!session) return;

      axes.lx = axes.ly = axes.rx = axes.ry = 0;

      for (const src of session.inputSources) {
        const gp = src.gamepad;
        if (!gp) continue;
        const a = gp.axes || [];
        // Heuristic mapping:
        // left hand: axes[2,3] sometimes; right hand: axes[2,3] too depending browser.
        // We'll use handedness to map.
        if (src.handedness === 'left') {
          axes.lx = a[2] ?? a[0] ?? 0;
          axes.ly = a[3] ?? a[1] ?? 0;
        } else if (src.handedness === 'right') {
          axes.rx = a[2] ?? a[0] ?? 0;
          axes.ry = a[3] ?? a[1] ?? 0;
        }
      }
    }

    function setRayVisible(v) {
      if (left.ray) left.ray.visible = v;
      if (right.ray) right.ray.visible = v;
    }

    // Raycast helpers for teleport
    function getRayFromRight(outRay) {
      if (!right.controller) return false;
      tempMat.identity().extractRotation(right.controller.matrixWorld);
      rayOrigin.setFromMatrixPosition(right.controller.matrixWorld);
      rayDir.set(0,0,-1).applyMatrix4(tempMat).normalize();
      outRay.origin.copy(rayOrigin);
      outRay.direction.copy(rayDir);
      return true;
    }

    return { left, right, axes, update, setRayVisible, getRayFromRight };
  }

  return { create };
})();
