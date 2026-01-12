// /core/xr_controls.js
// XR controllers + locomotion + VRButton loader.

export async function loadVRButtonAndAppend({ renderer, log }) {
  const VRButton = await loadVRButton();
  document.body.appendChild(VRButton.createButton(renderer));
  log("[index] VRButton appended ✅");
}

export function installXRControls({ THREE, renderer, scene, camera, player, log }) {
  const controllers = { left: null, right: null };
  const lasers = { left: null, right: null };

  const locomotion = {
    speed: 3.25,
    strafeSpeed: 3.0,
    turnSpeed: 2.6,
    snapTurn: false,
    snapAngle: Math.PI / 6,
    snapCooldown: 220,
    lastSnapAt: 0,
  };

  // lasers
  function makeLaser(color) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const line = new THREE.Line(geo, mat);
    line.scale.z = 14;
    return line;
  }

  // controllers (parent to PlayerRig!)
  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);

  controllers.left = c0;
  controllers.right = c1;

  lasers.left = makeLaser(0x7fe7ff);
  lasers.right = makeLaser(0xff2d7a);

  c0.add(lasers.left);
  c1.add(lasers.right);

  player.add(c0);
  player.add(c1);

  log("[index] controllers ready ✅");

  function deadzone(v, dz = 0.12) { return Math.abs(v) < dz ? 0 : v; }

  function getXRInputSource(handedness) {
    const sess = renderer.xr.getSession();
    const sources = sess?.inputSources || [];
    for (const s of sources) if (s?.handedness === handedness) return s;
    return null;
  }

  function getGamepadAxes(handedness) {
    const src = getXRInputSource(handedness);
    const gp = src?.gamepad;
    const a = gp?.axes || [];
    if (!a.length) return { x: 0, y: 0 };
    if (a.length >= 4) return { x: a[2] ?? 0, y: a[3] ?? 0 };
    return { x: a[0] ?? 0, y: a[1] ?? 0 };
  }

  function getYawQuat() {
    const q = camera.getWorldQuaternion(new THREE.Quaternion());
    const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
    const yaw = e.y;
    const out = new THREE.Quaternion();
    out.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    return out;
  }

  function update(dt, { seated, isXR }) {
    if (!isXR) return;
    if (seated) return;

    const L = getGamepadAxes("left");
    const R = getGamepadAxes("right");

    const lx = deadzone(L.x, 0.15);
    const rx = deadzone(R.x, 0.15);
    const ry = deadzone(R.y, 0.15);

    // Your mapping:
    // Left stick X = strafe
    // Right stick Y = forward/back (fixed)
    // Right stick X = turn
    const forward = ry;
    const strafe = lx;

    const moveZ = forward * locomotion.speed;
    const moveX = strafe * locomotion.strafeSpeed;

    const yawQ = getYawQuat();
    const dir = new THREE.Vector3(moveX, 0, moveZ).applyQuaternion(yawQ);
    player.position.addScaledVector(dir, dt);

    // Turn
    if (locomotion.snapTurn) {
      const now = performance.now();
      if (Math.abs(rx) > 0.65 && now - locomotion.lastSnapAt > locomotion.snapCooldown) {
        const sgn = rx > 0 ? -1 : 1;
        player.rotation.y += sgn * locomotion.snapAngle;
        locomotion.lastSnapAt = now;
      }
    } else {
      player.rotation.y += (-rx * locomotion.turnSpeed) * dt;
    }
  }

  return { controllers, update };
}

async function loadVRButton() {
  try {
    const m = await import(`../js/VRButton.js?v=${Date.now()}`);
    return m.VRButton || m.default || m;
  } catch (e) {
    const ver = "0.164.1";
    const m = await import(`https://unpkg.com/three@${ver}/examples/jsm/webxr/VRButton.js`);
    return m.VRButton;
  }
}
