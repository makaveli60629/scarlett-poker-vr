// /js/scarlett1/spine_android.js — Scarlett Android Spine (exports initAndroidSticks)
// ✅ Named export: initAndroidSticks
// ✅ ONLY active when NOT in XR (renderer.xr.isPresenting === false)

export async function initAndroidSticks({
  renderer,
  player,
  cameraPitch,
  setHUDVisible,
  log = console.log
} = {}) {
  // Import AndroidControls from /js/android_controls.js (recommended)
  // This file MUST exist at: /js/android_controls.js
  const mod = await import(new URL("../android_controls.js", import.meta.url).toString());
  const AndroidControls = mod.AndroidControls || mod.default || null;

  if (!AndroidControls?.init) {
    log?.("[android] AndroidControls missing init() (skipping)");
    return null;
  }

  if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    log?.("[android] not mobile UA (skipping)");
    return null;
  }

  const api = AndroidControls.init({
    renderer,
    player,
    cameraPitch,
    setHUDVisible,
    log
  });

  log?.("[android] Android sticks READY ✅");
  return api; // { setEnabled, update }
}
