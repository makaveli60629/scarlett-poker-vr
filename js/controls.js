// /js/controls.js — Controllers, lasers, and button polling

import { XRControllerModelFactory } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js';

export function createControls({ THREE, renderer, scene, player, camera, Diagnostics }) {
  const controllerModelFactory = new XRControllerModelFactory();

  const controllers = {
    left: makeController('left', 0),
    right: makeController('right', 1),
  };

  Diagnostics.ok('controllers.ready');

  function makeController(hand, index) {
    const c = renderer.xr.getController(index);
    c.name = `controller_${hand}`;

    // Laser line
    const lineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0,0,0),
      new THREE.Vector3(0,0,-1)
    ]);
    const line = new THREE.Line(lineGeom, new THREE.LineBasicMaterial({ color: 0x88aaff }));
    line.name = `laser_${hand}`;
    line.scale.z = 10;
    c.add(line);

    // Target dot
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x88aaff })
    );
    dot.visible = false;
    dot.name = `dot_${hand}`;
    scene.add(dot);

    // Grip model
    const grip = renderer.xr.getControllerGrip(index);
    grip.add(controllerModelFactory.createControllerModel(grip));

    scene.add(c);
    scene.add(grip);

    return { c, grip, line, dot, hand, index, lastButtons: {} };
  }

  const raycaster = new THREE.Raycaster();
  const tmpMat = new THREE.Matrix4();

  function getRayFromController(ctrl) {
    tmpMat.identity().extractRotation(ctrl.c.matrixWorld);
    const origin = new THREE.Vector3().setFromMatrixPosition(ctrl.c.matrixWorld);
    const dir = new THREE.Vector3(0,0,-1).applyMatrix4(tmpMat).normalize();
    return { origin, dir };
  }

  function pollButtons() {
    const out = {};
    for (const hand of ['left','right']) {
      const src = renderer.xr.getController( hand === 'left' ? 0 : 1 );
      const gp = src?.inputSource?.gamepad;
      const snap = {};
      if (gp) {
        // Common indices (Quest):
        // 0 trigger, 1 squeeze, 2 thumbstick, 3 A/X, 4 B/Y, 5 (?), 6 (?), 7 menu
        for (let i = 0; i < gp.buttons.length; i++) {
          const b = gp.buttons[i];
          if (!b) continue;
          snap[`b${i}`] = b.pressed ? 1 : 0;
        }
        if (gp.axes?.length) {
          snap['ax0'] = round(gp.axes[0]);
          snap['ax1'] = round(gp.axes[1]);
          if (gp.axes.length > 2) snap['ax2'] = round(gp.axes[2]);
          if (gp.axes.length > 3) snap['ax3'] = round(gp.axes[3]);
        }
      }
      out[hand] = snap;
    }
    return out;
  }

  function update() {
    // update laser target dots
    for (const hand of ['left','right']) {
      const ctrl = controllers[hand];
      const { origin, dir } = getRayFromController(ctrl);
      raycaster.set(origin, dir);

      const hits = raycaster.intersectObjects(scene.children, true);
      const hit = hits.find(h => h.object?.name === 'floor' || h.object?.userData?.hitTest);
      if (hit) {
        ctrl.dot.visible = true;
        ctrl.dot.position.copy(hit.point);
      } else {
        ctrl.dot.visible = false;
      }

      // keep line stable (avoid “stuck” visuals)
      ctrl.line.visible = true;
      ctrl.line.scale.z = hit ? origin.distanceTo(hit.point) : 10;
    }
  }

  function getRays() {
    const rays = {};
    for (const hand of ['left','right']) {
      rays[hand] = getRayFromController(controllers[hand]);
    }
    return rays;
  }

  function getButtons() {
    return pollButtons();
  }

  return { update, getRays, getButtons, controllers };
}

function round(v) {
  return Math.round(v * 100) / 100;
}
