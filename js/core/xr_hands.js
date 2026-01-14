// /js/core/xr_hands.js — Scarlett XR Input + Rays (FULL) v3.1
// ✅ Hands-only: NO controller models
// ✅ Controller rays show ONLY if a matching inputSource exists
// ✅ Always-on gaze ray (so you never lose pointer)
// ✅ Emits XR_SELECT reliably

export const XRHands = (() => {
  const S = {
    THREE: null,
    scene: null,
    renderer: null,
    Signals: null,
    log: console.log,

    controllers: [null, null],
    rays: [null, null],
    gazeRay: null,

    tracked: [false, false], // track presence of inputSources
    tmpQ: null,
  };

  function makeRay(THREE, color) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    line.scale.z = 10;
    return line;
  }

  function emitSelect(i, down) {
    let hand = "none";
    try {
      const session = S.renderer?.xr?.getSession?.();
      const src = session?.inputSources?.[i];
      if (src?.handedness) hand = src.handedness;
    } catch {}

    S.Signals?.emit?.("XR_SELECT", { hand, index: i, down: !!down });
    S.log?.(`[xr] select ${down ? "down" : "up"} hand=${hand} idx=${i}`);
  }

  function installController(i) {
    const { THREE, renderer, scene } = S;

    const c = renderer.xr.getController(i);
    c.name = `XR_CONTROLLER_${i}`;

    const ray = makeRay(THREE, i === 0 ? 0x66ccff : 0xff6bd6);
    ray.name = `XR_RAY_${i}`;
    ray.position.set(0, 0, 0); // local
    ray.rotation.set(0, 0, 0);
    c.add(ray);

    c.addEventListener("selectstart", () => emitSelect(i, true));
    c.addEventListener("selectend", () => emitSelect(i, false));

    scene.add(c);
    S.controllers[i] = c;
    S.rays[i] = ray;
  }

  function ensureGazeRay(camera) {
    const { THREE, scene } = S;
    if (S.gazeRay) return S.gazeRay;
    const g = makeRay(THREE, 0xffd36b);
    g.name = "GAZE_RAY";
    scene.add(g);
    S.gazeRay = g;
    return g;
  }

  function updateTrackedFlags() {
    // Map session inputSources to controller indices 0/1 by handedness when possible.
    // If unknown, we still hide those rays unless something exists.
    const session = S.renderer?.xr?.getSession?.();
    if (!session) {
      S.tracked[0] = S.tracked[1] = false;
      return;
    }

    let hasAny0 = false, hasAny1 = false;

    // Try to detect anything that looks like a ray-producing input source
    const sources = session.inputSources || [];
    for (let k = 0; k < sources.length; k++) {
      const src = sources[k];
      const hr = src?.handedness || "none";
      const mode = src?.targetRayMode || "tracked-pointer"; // gaze/tracked-pointer/screen

      if (mode === "gaze") continue; // gaze handled separately

      // If handedness known, map
      if (hr === "left") hasAny0 = true;
      else if (hr === "right") hasAny1 = true;
      else {
        // unknown: allow both if something exists
        hasAny0 = true; hasAny1 = true;
      }
    }

    S.tracked[0] = hasAny0;
    S.tracked[1] = hasAny1;
  }

  return {
    init({ THREE, scene, renderer, Signals, log }) {
      S.THREE = THREE;
      S.scene = scene;
      S.renderer = renderer;
      S.Signals = Signals;
      S.log = log || console.log;

      S.tmpQ = new THREE.Quaternion();

      installController(0);
      installController(1);

      renderer.xr.addEventListener("sessionstart", () => {
        S.log?.("[xr] sessionstart ✅ (rays armed)");
        updateTrackedFlags();
      });

      renderer.xr.addEventListener("sessionend", () => {
        S.log?.("[xr] sessionend ✅");
        S.tracked[0] = S.tracked[1] = false;
      });

      S.log?.("[hands] init ✅ v3.1");
      return {
        update(camera) {
          // Always-on gaze ray
          const gaze = ensureGazeRay(camera);
          gaze.visible = true;
          gaze.position.setFromMatrixPosition(camera.matrixWorld);
          gaze.quaternion.copy(camera.getWorldQuaternion(S.tmpQ));
          gaze.scale.z = 12;

          // Controller rays only if input sources exist
          updateTrackedFlags();
          for (let i = 0; i < 2; i++) {
            const ray = S.rays[i];
            if (!ray) continue;
            ray.visible = !!S.tracked[i];
            if (ray.visible) ray.scale.z = 10;
          }
        }
      };
    }
  };
})();
