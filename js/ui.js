export function createUIBindings(env) {
  const $ = (s) => document.querySelector(s);
  const btnEnterVR = $("#btnEnterVR");
  const btnTeleport = $("#btnTeleport");
  const btnReset = $("#btnReset");

  if (btnTeleport) {
    btnTeleport.addEventListener('click', () => {
      env.state.teleportMode = !env.state.teleportMode;
      btnTeleport.textContent = `Teleport: ${env.state.teleportMode ? 'ON' : 'OFF'}`;
      window.__scarlettToast?.(`Teleport ${env.state.teleportMode ? 'ON' : 'OFF'}`);
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      env.rig.position.set(env.state.spawnPoint.x, 0, env.state.spawnPoint.z);
      env.rig.rotation.set(0, env.state.spawnYaw, 0);
      window.__scarlettToast?.('Reset to spawn');
    });
  }

  if (btnEnterVR) {
    btnEnterVR.addEventListener('click', async () => {
      try {
        if (!navigator.xr) {
          window.__scarlettDiagWrite?.('navigator.xr not available');
          window.__scarlettToast?.('WebXR not available on this device');
          return;
        }
        const supported = await navigator.xr.isSessionSupported('immersive-vr');
        if (!supported) {
          window.__scarlettToast?.('immersive-vr not supported');
          return;
        }
        const sessionInit = {
          optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers', 'anchors'],
          requiredFeatures: ['local-floor'],
        };
        const session = await navigator.xr.requestSession('immersive-vr', sessionInit);
        env.renderer.xr.setSession(session);
        window.__scarlettToast?.('VR session started');
      } catch (e) {
        console.error(e);
        window.__scarlettDiagWrite?.(`EnterVR error: ${e?.message || e}`);
        window.__scarlettToast?.('EnterVR failed');
      }
    });
  }
}
