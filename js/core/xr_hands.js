// /js/core/xr_hands.js — Scarlett XR Input + Rays (FULL) v3.0
// ✅ Hands-only (NO controller models)
// ✅ Creates XR controllers + hands (if available)
// ✅ Emits reliable events from XR:
//    XR_SELECT { hand:"left|right|none", index:0|1, down:boolean }
// ✅ Always-on gaze ray + controller rays (so you always see a pointer)

export const XRHands = (() => {
  const S = {
    THREE: null,
    scene: null,
    renderer: null,
    Signals: null,
    log: console.log,

    controllers: [null, null],
    hands: [null, null],
    rays: [null, null],
    gazeRay: null,

    tmpQ: null,
    tmpV: null,
    tmpDir: null
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
    // Attempt to map handedness from XR input sources
    let hand = "none";
    try {
      const session = S.renderer?.xr?.getSession?.();
      const src = session?.inputSources?.[i];
      if (src?.handedness) hand = src.handedness; // "left" | "right" | "none"
    } catch {}

    S.Signals?.emit?.("XR_SELECT", { hand, index: i, down: !!down });
    S.log?.(`[xr] select ${down ? "down" : "up"} hand=${hand} idx=${i}`);
  }

  function installController(i) {
    const { THREE, renderer, scene } = S;

    const c = renderer.xr.getController(i);
    c.name = `XR_CONTROLLER_${i}`;

    // NO models added. Only our ray.
    const ray = makeRay(THREE, i === 0 ? 0x66ccff : 0xff6bd6);
    ray.name = `XR_RAY_${i}`;
    c.add(ray);

    c.addEventListener("selectstart", () => emitSelect(i, true));
    c.addEventListener("selectend", () => emitSelect(i, false));

    scene.add(c);
    S.controllers[i] = c;
    S.rays[i] = ray;

    // Optional hand object (visual marker only)
    try {
      const h = renderer.xr.getHand(i);
      h.name = `XR_HAND_${i}`;
      // small visible bead so you can see *something* if hand is tracked
      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(0.015, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.2 })
      );
      h.add(bead);
      scene.add(h);
      S.hands[i] = h;
    } catch {}
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

  function updateRayFrom(obj, line, maxDist) {
    const origin = S.tmpV.setFromMatrixPosition(obj.matrixWorld);
    const q = obj.getWorldQuaternion(S.tmpQ);
    const dir = S.tmpDir.set(0, 0, -1).applyQuaternion(q).normalize();

    line.position.copy(origin);
    line.quaternion.copy(q);
    line.scale.z = maxDist;

    // emit ray updates if you want interaction later
    S.Signals?.emit?.("RAY_UPDATE", {
      kind: line.name,
      origin: { x: origin.x, y: origin.y, z: origin.z },
      dir: { x: dir.x, y: dir.y, z: dir.z },
      maxDist
    });
  }

  function logInputSourcesOnce() {
    try {
      const session = S.renderer?.xr?.getSession?.();
      if (!session) return;
      const arr = session.inputSources?.map((s) => ({
        handedness: s.handedness,
        targetRayMode: s.targetRayMode,
        hasGamepad: !!s.gamepad,
        axes: s.gamepad?.axes?.length || 0,
        buttons: s.gamepad?.buttons?.length || 0,
        hasHand: !!s.hand
      })) || [];
      S.log?.(`[xr] inputSources=${JSON.stringify(arr)}`);
    } catch {}
  }

  return {
    init({ THREE, scene, renderer, Signals, log }) {
      S.THREE = THREE;
      S.scene = scene;
      S.renderer = renderer;
      S.Signals = Signals;
      S.log = log || console.log;

      S.tmpQ = new THREE.Quaternion();
      S.tmpV = new THREE.Vector3();
      S.tmpDir = new THREE.Vector3();

      installController(0);
      installController(1);

      // log sources when XR session starts
      renderer.xr.addEventListener("sessionstart", () => {
        S.log?.("[xr] sessionstart ✅");
        logInputSourcesOnce();
      });

      renderer.xr.addEventListener("sessionend", () => {
        S.log?.("[xr] sessionend ✅");
      });

      S.log?.("[hands] init ✅ (select locomotion ready)");
      return {
        update(camera) {
          // Always-on gaze ray
          const gaze = ensureGazeRay(camera);
          gaze.visible = true;
          updateRayFrom(camera, gaze, 12);

          // Controller rays (these exist even in hand-tracking mode)
          for (let i = 0; i < 2; i++) {
            const c = S.controllers[i];
            const r = S.rays[i];
            if (!c || !r) continue;

            // If controller object is tracked, show it; if not, hide ray
            // (Still keep gaze ray visible always)
            r.visible = c.visible === true;
            if (r.visible) updateRayFrom(c, r, 10);
          }
        }
      };
    }
  };
})();
