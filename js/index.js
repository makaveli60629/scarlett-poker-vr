// --- Controllers + Laser + Locomotion (Quest controllers) --------------------
import { XRControllerModelFactory } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

function makeControllers(renderer, THREE, scene, player, camera, logLine = console.log) {
  const controllers = {
    // hands (still fine)
    handLeft: renderer.xr.getHand(0),
    handRight: renderer.xr.getHand(1),

    // motion controllers
    left: null,
    right: null,
    gripLeft: null,
    gripRight: null,

    // laser stuff
    raycaster: new THREE.Raycaster(),
    tmpM: new THREE.Matrix4(),
    tmpDir: new THREE.Vector3(),
    tmpPos: new THREE.Vector3(),
    laserLeft: null,
    laserRight: null,

    // input state
    axesL: [0, 0],
    axesR: [0, 0],
    btn: {},

    // locomotion tuning
    moveSpeed: 2.2,        // meters/sec
    turnSpeed: 2.2,        // smooth turn (rad/sec)
    snapTurn: true,
    snapAngle: Math.PI / 6, // 30°
    snapCooldown: 0,
    deadzone: 0.18,

    // last hit (for debug/teleport)
    lastHit: null
  };

  controllers.handLeft.name = "HandLeft";
  controllers.handRight.name = "HandRight";

  // Add hands to rig (optional)
  try { player.add(controllers.handLeft); } catch(e){}
  try { player.add(controllers.handRight); } catch(e){}

  // Motion controllers
  controllers.left = renderer.xr.getController(0);
  controllers.right = renderer.xr.getController(1);
  controllers.left.name = "ControllerLeft";
  controllers.right.name = "ControllerRight";

  // Grips (models)
  const modelFactory = new XRControllerModelFactory();
  controllers.gripLeft = renderer.xr.getControllerGrip(0);
  controllers.gripRight = renderer.xr.getControllerGrip(1);
  controllers.gripLeft.add(modelFactory.createControllerModel(controllers.gripLeft));
  controllers.gripRight.add(modelFactory.createControllerModel(controllers.gripRight));

  // Parent to rig so movement moves everything
  player.add(controllers.left);
  player.add(controllers.right);
  player.add(controllers.gripLeft);
  player.add(controllers.gripRight);

  // Laser line helper
  function makeLaser(name) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const mat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geo, mat);
    line.name = name;
    line.scale.z = 8; // length
    return line;
  }

  controllers.laserLeft = makeLaser("LaserLeft");
  controllers.laserRight = makeLaser("LaserRight");
  controllers.left.add(controllers.laserLeft);
  controllers.right.add(controllers.laserRight);

  // Track gamepad data each frame
  function readGamepad(ctrl, side) {
    const gp = ctrl?.gamepad;
    if (!gp) return;

    // Most Quest controllers: axes[2,3] or [0,1] depending on mapping
    // We'll prefer the last two axes if present.
    const ax = gp.axes || [];
    const use = (ax.length >= 4) ? [ax[2], ax[3]] : [ax[0] || 0, ax[1] || 0];

    if (side === "L") controllers.axesL = use;
    if (side === "R") controllers.axesR = use;

    // buttons: 0 trigger, 1 squeeze, 3 thumbstick press (varies)
    controllers.btn[side] = {
      trigger: gp.buttons?.[0]?.pressed,
      squeeze: gp.buttons?.[1]?.pressed,
      stick: gp.buttons?.[3]?.pressed
    };
  }

  controllers.left.addEventListener("connected", (e) => logLine("✅ Left controller connected: " + e.data?.gamepad?.id));
  controllers.right.addEventListener("connected", (e) => logLine("✅ Right controller connected: " + e.data?.gamepad?.id));

  // Laser raycast against scene/world floor (simple + reliable)
  function updateLaser(ctrl, laser, sceneObjects) {
    if (!ctrl) return null;

    controllers.tmpM.identity().extractRotation(ctrl.matrixWorld);
    const origin = controllers.tmpPos.setFromMatrixPosition(ctrl.matrixWorld);
    const dir = controllers.tmpDir.set(0, 0, -1).applyMatrix4(controllers.tmpM).normalize();

    controllers.raycaster.set(origin, dir);
    const hits = controllers.raycaster.intersectObjects(sceneObjects, true);

    if (hits.length) {
      const h = hits[0];
      laser.scale.z = Math.max(0.5, Math.min(12, h.distance));
      controllers.lastHit = h;
      return h;
    } else {
      laser.scale.z = 8;
      controllers.lastHit = null;
      return null;
    }
  }

  // Movement + turning (in XR only)
  controllers.update = function update(dt, sceneObjects) {
    if (!renderer.xr.isPresenting) return;

    readGamepad(controllers.left, "L");
    readGamepad(controllers.right, "R");

    // lasers (point at anything in scene; you can narrow list later)
    updateLaser(controllers.left, controllers.laserLeft, sceneObjects);
    updateLaser(controllers.right, controllers.laserRight, sceneObjects);

    // locomotion
    const dz = controllers.deadzone;

    const lx = controllers.axesL[0] || 0;
    const ly = controllers.axesL[1] || 0;

    const rx = controllers.axesR[0] || 0;

    const moveX = (Math.abs(lx) > dz) ? lx : 0;
    const moveY = (Math.abs(ly) > dz) ? ly : 0;

    // Move relative to headset facing
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0; right.normalize();

    const speed = controllers.moveSpeed * dt;
    player.position.addScaledVector(forward, -moveY * speed);
    player.position.addScaledVector(right, moveX * speed);

    // Turning (right stick)
    const turn = (Math.abs(rx) > dz) ? rx : 0;

    if (controllers.snapTurn) {
      controllers.snapCooldown = Math.max(0, controllers.snapCooldown - dt);
      if (controllers.snapCooldown === 0 && Math.abs(turn) > 0.6) {
        player.rotation.y -= Math.sign(turn) * controllers.snapAngle;
        controllers.snapCooldown = 0.25;
      }
    } else {
      player.rotation.y -= turn * controllers.turnSpeed * dt;
    }
  };

  return controllers;
}
