// /js/scarlett1/spine_android.js — Scarlett Android Runtime Bridge (FULL • SAFE)
// ✅ Enables touch movement for Android debugging
// ✅ Does NOT interfere with Oculus/XR (auto-disables when XR presenting)

export async function init(ctx = {}) {
  const diagLog = (s) => { try { window.__SCARLETT_DIAG_LOG__?.(String(s)); } catch {} };
  const log = ctx?.log || console.log;

  if (window.__SCARLETT_ANDROID_STARTED__) {
    diagLog("[android] already started");
    return;
  }
  window.__SCARLETT_ANDROID_STARTED__ = true;

  try {
    // Only run on non-Quest touch devices
    const ua = navigator.userAgent || "";
    const isQuest = ua.includes("OculusBrowser") || ua.includes("Quest");
    const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);

    if (isQuest || !isTouch) {
      diagLog("[android] not a phone touch environment — skipping");
      return;
    }

    // Find renderer/camera/rig from ctx or globals
    const renderer = ctx.renderer || window.__SCARLETT_RENDERER__ || window.renderer || null;
    const camera = ctx.camera || window.__SCARLETT_CAMERA__ || window.camera || null;
    const rig = ctx.rig || window.__SCARLETT_RIG__ || window.playerRig || null;
    const THREE = ctx.THREE || window.THREE || null;

    if (!renderer || !camera || !rig) {
      diagLog("[android] missing renderer/camera/rig — will retry for 2s");
    }

    // Import AndroidControls from /js/android_controls.js
    const mod = await import(`../android_controls.js?v=${Date.now()}`);
    const AndroidControls = mod.AndroidControls || mod.default?.AndroidControls || mod.default || null;

    if (!AndroidControls?.init || !AndroidControls?.update) {
      diagLog("[android] AndroidControls missing init/update — check /js/android_controls.js");
      return;
    }

    // small wait loop to let world create rig/camera if not ready yet
    const start = performance.now();
    while (performance.now() - start < 2000) {
      const r = ctx.renderer || window.__SCARLETT_RENDERER__ || window.renderer || renderer;
      const c = ctx.camera || window.__SCARLETT_CAMERA__ || window.camera || camera;
      const g = ctx.rig || window.__SCARLETT_RIG__ || window.playerRig || rig;
      if (r && c && g) break;
      await new Promise(res => setTimeout(res, 60));
    }

    const R = ctx.renderer || window.__SCARLETT_RENDERER__ || window.renderer || renderer;
    const C = ctx.camera || window.__SCARLETT_CAMERA__ || window.camera || camera;
    const G = ctx.rig || window.__SCARLETT_RIG__ || window.playerRig || rig;

    AndroidControls.init({
      THREE,
      renderer: R,
      camera: C,
      rig: G,
      log: (...a) => { diagLog(a.join(" ")); try { log(...a); } catch {} }
    });

    // Self-owned update loop (so world doesn’t need to call update)
    let last = performance.now();
    function loop() {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // stop moving if XR starts
      if (R?.xr?.isPresenting) {
        requestAnimationFrame(loop);
        return;
      }

      try { AndroidControls.update(dt); } catch (e) { /* keep alive */ }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    diagLog("[android] spine_android active ✅");
  } catch (e) {
    diagLog(`[android] failed ❌ ${e?.message || e}`);
  }
        }
