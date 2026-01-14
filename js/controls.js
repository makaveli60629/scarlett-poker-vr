// /js/control.js — Scarlett Controls (FULL) — Quest Fix
export const Control = (() => {
  const S = {
    THREE: null,
    renderer: null,
    camera: null,
    playerRig: null,
    log: (...a) => console.log(...a),

    MOVE_SPEED: 2.2,
    DEADZONE: 0.18,

    SNAP_ANGLE: Math.PI / 6, // 30°
    SNAP_THRESH: 0.75,
    snapLatch: false,

    left: null,
    right: null,

    // hard-kill gaze lasers (even if another module adds them)
    killGaze: true
  };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function deadzone(v) { return Math.abs(v) < S.DEADZONE ? 0 : v; }

  function readGamepad(src) {
    const gp = src?.gamepad;
    if (!gp) return null;
    const axes = gp.axes || [];
    const btns = gp.buttons || [];
    return {
      axX: axes[0] ?? 0,
      axY: axes[1] ?? 0,
      trigger: !!btns[0]?.pressed,
      grip: !!btns[1]?.pressed,
      buttons: btns
    };
  }

  function getXRHands() {
    S.left = null;
    S.right = null;

    const session = S.renderer?.xr?.getSession?.();
    if (!session) return;

    for (const src of session.inputSources) {
      if (src?.handedness === "left") S.left = readGamepad(src);
      if (src?.handedness === "right") S.right = readGamepad(src);
    }
  }

  function applyMove(dt) {
    if (!S.left) return;

    let x = deadzone(S.left.axX);
    let y = deadzone(S.left.axY);
    if (!x && !y) return;

    const forward = new S.THREE.Vector3();
    S.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const up = new S.THREE.Vector3(0, 1, 0);
    const right = new S.THREE.Vector3().crossVectors(forward, up).normalize();

    S.playerRig.position.add(forward.multiplyScalar(-y * S.MOVE_SPEED * dt));
    S.playerRig.position.add(right.multiplyScalar(x * S.MOVE_SPEED * dt));
  }

  function applySnapTurn() {
    if (!S.right) return;
    const x = S.right.axX;

    if (!S.snapLatch && x > S.SNAP_THRESH) {
      S.playerRig.rotation.y -= S.SNAP_ANGLE;
      S.snapLatch = true;
    } else if (!S.snapLatch && x < -S.SNAP_THRESH) {
      S.playerRig.rotation.y += S.SNAP_ANGLE;
      S.snapLatch = true;
    }

    if (Math.abs(x) < 0.2) S.snapLatch = false;
  }

  function killAnyGazeLaser() {
    if (!S.killGaze) return;

    // Remove any line/ray objects parented to camera that look like "gaze lasers"
    // This is a brute-force safety net for legacy modules.
    const cam = S.camera;
    if (!cam) return;

    const toRemove = [];
    cam.traverse?.((obj) => {
      if (!obj) return;
      const isLine = obj.type === "Line" || obj.type === "LineSegments";
      if (!isLine) return;

      // many gaze rays are thin lines named like 'gaze', 'ray', 'laser'
      const n = (obj.name || "").toLowerCase();
      if (n.includes("gaze") || n.includes("ray") || n.includes("laser")) toRemove.push(obj);

      // or they are simple line objects without geometry name
      if (!obj.name && obj.geometry && obj.material) toRemove.push(obj);
    });

    for (const obj of toRemove) {
      if (obj.parent) obj.parent.remove(obj);
    }
  }

  function init({ THREE, renderer, camera, playerRig, log }) {
    S.THREE = THREE;
    S.renderer = renderer;
    S.camera = camera;
    S.playerRig = playerRig;
    if (log) S.log = log;

    S.log("[control] init ✅ (Quest Fix Controls)");
  }

  function update(dt) {
    const inXR = !!S.renderer?.xr?.isPresenting;

    // Always kill gaze lasers if any legacy code tries to add them
    killAnyGazeLaser();

    if (!inXR) return; // in 2D you already have touch UI etc.

    getXRHands();

    // ✅ Triggers DO NOTHING for locomotion or turning.
    // They are reserved for your interact system.
    applyMove(dt);
    applySnapTurn();
  }

  function setSpawn(x, y, z, yaw = 0) {
    if (!S.playerRig) return;
    S.playerRig.position.set(x, y, z);
    S.playerRig.rotation.set(0, yaw, 0);
    S.log(`[control] spawn set: ${x},${y},${z} yaw=${yaw}`);
  }

  return { init, update, setSpawn };
})();
