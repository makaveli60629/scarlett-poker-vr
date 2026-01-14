// /js/core/xr_hands.js — Scarlett XR Hands + Lasers + Pinch Locomotion (FULL) v2.2
// ✅ Hands-only visuals (simple spheres)
// ✅ ALWAYS-on gaze laser fallback (works even in XR)
// ✅ Hand lasers if hands are visible
// ✅ Pinch detection (thumb-tip + index-tip distance)
// ✅ Emits:
//    HAND_PINCH { hand:"left|right", down:boolean, strength:0..1 }
//    RAY_UPDATE  { origin, dir, maxDist, kind }

export const XRHands = (() => {
  const S = {
    THREE: null,
    scene: null,
    renderer: null,
    Signals: null,
    log: console.log,

    hands: [null, null],
    lasers: [null, null],
    gazeLaser: null,

    pinch: {
      left:  { down:false, strength:0 },
      right: { down:false, strength:0 }
    },

    tmpV: null,
    tmpDir: null,
    tmpQ: null
  };

  function makeLaser(THREE, color) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0,0,0),
      new THREE.Vector3(0,0,-1)
    ]);
    const mat = new THREE.LineBasicMaterial({ color, transparent:true, opacity:0.9 });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    line.scale.z = 10;
    return line;
  }

  function attachHand(i) {
    const { THREE, renderer, scene } = S;
    const hand = renderer.xr.getHand(i);
    hand.name = `XR_HAND_${i}`;

    const palm = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness:0.6, metalness:0.2 })
    );
    hand.add(palm);

    const laser = makeLaser(THREE, i === 0 ? 0x66ccff : 0xff6bd6);
    laser.name = i === 0 ? "HAND_LASER_L" : "HAND_LASER_R";
    hand.add(laser);

    scene.add(hand);
    S.hands[i] = hand;
    S.lasers[i] = laser;
  }

  function ensureGazeLaser(camera) {
    const { THREE, scene } = S;
    if (S.gazeLaser) return S.gazeLaser;
    const laser = makeLaser(THREE, 0xffd36b);
    laser.name = "GAZE_LASER";
    scene.add(laser);
    S.gazeLaser = laser;
    return laser;
  }

  function emitRay(kind, origin, dir, maxDist) {
    S.Signals?.emit?.("RAY_UPDATE", {
      kind,
      origin: { x: origin.x, y: origin.y, z: origin.z },
      dir:    { x: dir.x,    y: dir.y,    z: dir.z },
      maxDist
    });
  }

  function updateRayFromObject(line, obj3d, maxDist) {
    const origin = S.tmpV.setFromMatrixPosition(obj3d.matrixWorld);
    const q = obj3d.getWorldQuaternion(S.tmpQ);
    S.tmpDir.set(0,0,-1).applyQuaternion(q).normalize();
    line.scale.z = maxDist;
    emitRay(line.name || "RAY", origin, S.tmpDir, maxDist);
  }

  // --- pinch detection helpers ---
  function getJoint(hand, name) {
    // Three.js WebXRHand joint naming: "index-finger-tip", "thumb-tip", etc.
    return hand?.joints?.[name] || hand?.getObjectByName?.(name) || null;
  }

  function detectPinch(handObj, handName /*left|right*/) {
    // If joints aren’t available, do nothing.
    const thumb = getJoint(handObj, "thumb-tip");
    const index = getJoint(handObj, "index-finger-tip");
    if (!thumb || !index) return;

    const a = S.tmpV.setFromMatrixPosition(thumb.matrixWorld);
    const b = new S.THREE.Vector3().setFromMatrixPosition(index.matrixWorld);
    const d = a.distanceTo(b);

    // Tune thresholds (meters)
    const downAt = 0.022;  // pinch closed
    const upAt   = 0.032;  // pinch open
    const strength = Math.max(0, Math.min(1, (upAt - d) / (upAt - downAt)));

    const prev = S.pinch[handName].down;
    let down = prev;

    if (!prev && d < downAt) down = true;
    if (prev && d > upAt) down = false;

    S.pinch[handName].down = down;
    S.pinch[handName].strength = strength;

    S.Signals?.emit?.("HAND_PINCH", { hand: handName, down, strength });
  }

  return {
    init({ THREE, scene, renderer, Signals, log }) {
      S.THREE = THREE;
      S.scene = scene;
      S.renderer = renderer;
      S.Signals = Signals;
      S.log = log || console.log;

      S.tmpV = new THREE.Vector3();
      S.tmpDir = new THREE.Vector3();
      S.tmpQ = new THREE.Quaternion();

      try { attachHand(0); attachHand(1); } catch (e) {
        S.log?.(`[hands] attach failed ⚠️ ${e?.message || String(e)}`);
      }

      S.log?.("[hands] init ✅");
      return {
        getPinch() { return S.pinch; },

        update(camera) {
          // ALWAYS show gaze laser (in XR too) so you never “lose pointer”
          const gaze = ensureGazeLaser(camera);
          gaze.visible = true;
          gaze.position.setFromMatrixPosition(camera.matrixWorld);
          gaze.quaternion.copy(camera.getWorldQuaternion(S.tmpQ));
          updateRayFromObject(gaze, camera, 12);

          // Hand lasers if hands are visible
          for (let i = 0; i < 2; i++) {
            const h = S.hands[i];
            const l = S.lasers[i];
            if (!h || !l) continue;

            const isVisible = h.visible === true; // three sets this when tracking
            l.visible = isVisible;

            if (isVisible) updateRayFromObject(l, h, 10);

            // Pinch detect
            detectPinch(h, i === 0 ? "left" : "right");
          }
        }
      };
    }
  };
})();
