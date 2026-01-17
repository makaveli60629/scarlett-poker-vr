// js/modules/localPlayer.module.js
// BUILD: LOCAL_PLAYER_FULL_v1
// Ensures a stable rig spawn, height calibration, and debug helpers.

export default {
  name: "localPlayer",
  init(input = {}, maybeApp) {
    const ctx = normalize(input, maybeApp);
    const { THREE, rig, camera, debug } = ctx;

    // Ensure rig exists
    if (!rig && debug) debug.warn?.('localPlayer: missing rig');

    const helpers = [];

    // Optional axes at origin for debugging
    try {
      const ax = new THREE.AxesHelper(0.6);
      ax.visible = false;
      ctx.scene?.add(ax);
      helpers.push(ax);
    } catch {}

    // Provide API for other modules
    const api = {
      name: 'localPlayer',
      setSpawn(pos, yaw = 0) {
        if (!rig) return;
        rig.position.set(pos.x, pos.y, pos.z);
        rig.rotation.y = yaw;
      },
      setHeight(h = 1.65) {
        if (camera) camera.position.y = h;
      },
      toggleAxes(show) {
        for (const h of helpers) h.visible = !!show;
      },
      tick() {},
      dispose() {
        for (const h of helpers) {
          try { h.parent?.remove(h); } catch {}
        }
      }
    };

    // Expose globally
    globalThis.SCARLETT_LOCALPLAYER = api;
    debug?.log?.('localPlayer init ✅');
    return api;
  }
};

function normalize(input, maybeApp) {
  const ctx = input?.THREE ? input : null;
  const app = (ctx?.app || maybeApp || input?.app || input) || {};
  return {
    THREE: ctx?.THREE || app?.THREE || globalThis.THREE,
    scene: ctx?.scene || app?.scene || globalThis.scene,
    rig: ctx?.rig || app?.rig || globalThis.rig,
    camera: ctx?.camera || app?.camera || globalThis.camera,
    debug: ctx?.debug || app?.debug || globalThis.debug,
  };
}
