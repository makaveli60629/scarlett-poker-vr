// /js/hand_teleport.js — Scarlett Hand Teleport v1.0
// Right-hand index ray aims floor circle. Pinch confirms teleport.
// Also emits "scarlett-poke" events for fingertip UI.

export const HandTeleport = (() => {
  let THREE, scene, renderer, player, camera, log;
  let marker, raycaster;
  const tmpPos = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();
  const hit = new THREE.Vector3();

  // joints
  let rightHand = null;
  let indexTip = null;
  let thumbTip = null;

  // pinch state
  let pinchLatch = false;

  const S = {
    enabled: true,
    floorY: 0,
    maxDist: 18,
    pinchOn: 0.020,   // meters distance thumb-index = pinch
    pinchOff: 0.032,
    aimSmoothing: 14.0
  };

  function ensureMarker() {
    if (marker) return;
    marker = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.32, 48),
      new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.9 })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    marker.renderOrder = 999;
    scene.add(marker);
  }

  function bindRightHandJoints() {
    // WebXR Hands: renderer.xr.getSession().inputSources has hand objects
    const session = renderer.xr.getSession?.();
    if (!session) return;

    rightHand = null; indexTip = null; thumbTip = null;

    for (const src of session.inputSources) {
      if (!src?.hand) continue;
      if (src.handedness !== "right") continue;

      rightHand = src.hand;
      // joints names in WebXR Hand Input
      indexTip = rightHand.get?.("index-finger-tip") || null;
      thumbTip = rightHand.get?.("thumb-tip") || null;
      break;
    }
  }

  function jointWorldPos(joint, out) {
    // In three.js WebXR hand joints are Object3D (XRHandModelFactory or raw)
    if (!joint || !joint.position) return false;
    joint.getWorldPosition(out);
    return true;
  }

  function isPinching() {
    if (!indexTip || !thumbTip) return false;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    if (!jointWorldPos(indexTip, a)) return false;
    if (!jointWorldPos(thumbTip, b)) return false;
    const d = a.distanceTo(b);

    // hysteresis so it doesn't flicker
    if (!pinchLatch && d < S.pinchOn) pinchLatch = true;
    if ( pinchLatch && d > S.pinchOff) pinchLatch = false;
    return pinchLatch;
  }

  function aimFromIndexTip(dt) {
    if (!indexTip) return false;

    // Ray: from index tip forward direction (use camera forward as fallback)
    indexTip.getWorldPosition(tmpPos);

    // Preferred: indexTip forward - if unavailable, use camera forward
    tmpDir.set(0, 0, -1).applyQuaternion(camera.quaternion);
    // Slight downward bias so it hits floor naturally
    tmpDir.y -= 0.25;
    tmpDir.normalize();

    raycaster.set(tmpPos, tmpDir);

    // Intersect floor plane at y = floorY
    const t = (S.floorY - tmpPos.y) / (tmpDir.y || -0.0001);
    if (t <= 0 || t > S.maxDist) return false;

    hit.copy(tmpPos).addScaledVector(tmpDir, t);

    // Smooth marker movement
    const k = 1 - Math.exp(-S.aimSmoothing * dt);
    marker.position.lerp(hit, k);
    marker.visible = true;
    return true;
  }

  function teleportToMarker() {
    if (!marker?.visible) return;
    // keep player on floor
    player.position.x = marker.position.x;
    player.position.z = marker.position.z;
    player.position.y = 0;
    window.dispatchEvent(new CustomEvent("scarlett-teleport", { detail: { x: player.position.x, z: player.position.z } }));
    if (log) log("[handTeleport] teleport ✅");
  }

  // fingertip poke (for OK/buttons)
  function emitPoke() {
    if (!indexTip) return;
    const p = new THREE.Vector3();
    if (!jointWorldPos(indexTip, p)) return;

    // just emit position; UI system decides what it hits
    window.dispatchEvent(new CustomEvent("scarlett-poke", { detail: { x: p.x, y: p.y, z: p.z } }));
  }

  return {
    init(params = {}) {
      ({ THREE, scene, renderer, player, camera, log } = params);
      raycaster = new THREE.Raycaster();
      ensureMarker();

      // Bind on session start
      renderer.xr.addEventListener?.("sessionstart", () => bindRightHandJoints());
      renderer.xr.addEventListener?.("sessionend", () => { rightHand=null; indexTip=null; thumbTip=null; marker.visible=false; });

      // In case session already running:
      bindRightHandJoints();

      if (log) log("[HandTeleport] init ✅");
    },

    setEnabled(v) { S.enabled = !!v; if (!S.enabled && marker) marker.visible = false; },

    update(dt) {
      if (!S.enabled) return;
      if (!renderer.xr.isPresenting) return;

      // Ensure joints exist (
