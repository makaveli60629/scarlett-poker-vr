// /js/core/xr_hands.js — Scarlett XR Hands + Lasers (FULL) v2.0
// ✅ Hands-only visuals (simple spheres)
// ✅ Laser rays from hands when available
// ✅ Fallback gaze laser from camera when hands not available
// ✅ Emits Signals: RAY_UPDATE { origin, dir, hit, kind }

export const XRHands = (() => {
  const state = {
    THREE: null,
    scene: null,
    renderer: null,
    Signals: null,
    log: console.log,

    hands: [],
    lasers: [],
    gazeLaser: null,

    raycaster: null,
    tmpV: null,
    tmpDir: null
  };

  function makeLaser(THREE, color = 0x66ccff) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    line.scale.z = 8.0; // default length
    return line;
  }

  function attachHand(i) {
    const { THREE, renderer, scene } = state;

    // WebXR hands:
    const hand = renderer.xr.getHand(i);
    hand.name = `XR_HAND_${i}`;

    // simple “palm” marker
    const palm = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.2 })
    );
    palm.position.set(0, 0, 0);
    hand.add(palm);

    // laser
    const laser = makeLaser(THREE, i === 0 ? 0x66ccff : 0xff6bd6);
    laser.position.set(0, 0, 0);
    hand.add(laser);

    scene.add(hand);

    state.hands[i] = hand;
    state.lasers[i] = laser;
  }

  function ensureGazeLaser(camera) {
    const { THREE, scene } = state;
    if (state.gazeLaser) return state.gazeLaser;
    const laser = makeLaser(THREE, 0xffd36b);
    laser.name = "GAZE_LASER";
    scene.add(laser);
    state.gazeLaser = laser;
    return laser;
  }

  function updateLaserFromObject(line, obj3d, maxDist = 12) {
    // Cast forward along -Z in local space
    const { THREE, Signals } = state;
    const origin = state.tmpV.setFromMatrixPosition(obj3d.matrixWorld);

    state.tmpDir.set(0, 0, -1).applyQuaternion(obj3d.getWorldQuaternion(new THREE.Quaternion())).normalize();

    // emit ray update (world can decide what to raycast against)
    Signals?.emit?.("RAY_UPDATE", {
      kind: line.name || "HAND_LASER",
      origin: { x: origin.x, y: origin.y, z: origin.z },
      dir: { x: state.tmpDir.x, y: state.tmpDir.y, z: state.tmpDir.z },
      maxDist
    });

    // purely visual length (we keep it constant; Interaction can shorten if it finds hits)
    line.scale.z = maxDist;
  }

  return {
    init({ THREE, scene, renderer, Signals, log }) {
      state.THREE = THREE;
      state.scene = scene;
      state.renderer = renderer;
      state.Signals = Signals;
      state.log = log || console.log;

      state.raycaster = new THREE.Raycaster();
      state.tmpV = new THREE.Vector3();
      state.tmpDir = new THREE.Vector3();

      // install hands (0,1)
      try { attachHand(0); attachHand(1); } catch (e) {
        state.log?.(`[hands] attach failed ⚠️ ${e?.message || String(e)}`);
      }

      state.log?.("[hands] init ✅");

      return {
        update(camera) {
          // if hands aren’t active/visible, show gaze laser instead
          const h0 = state.hands[0];
          const h1 = state.hands[1];

          const haveHands =
            (h0 && h0.visible) ||
            (h1 && h1.visible);

          // Update hand lasers
          if (h0 && state.lasers[0]) {
            state.lasers[0].visible = haveHands;
            if (haveHands) updateLaserFromObject(state.lasers[0], h0, 10);
          }
          if (h1 && state.lasers[1]) {
            state.lasers[1].visible = haveHands;
            if (haveHands) updateLaserFromObject(state.lasers[1], h1, 10);
          }

          // Fallback gaze laser
          const gaze = ensureGazeLaser(camera);
          gaze.visible = !haveHands;
          if (gaze.visible) {
            // attach in front of camera
            gaze.position.copy(state.tmpV.setFromMatrixPosition(camera.matrixWorld));
            gaze.quaternion.copy(camera.getWorldQuaternion(new THREE.Quaternion()));
            updateLaserFromObject(gaze, camera, 12);
          }
        }
      };
    }
  };
})();
