// /js/scarlett1/spine_android.js — Scarlett Android Spine (FULL) v1.1
// ✅ Exports initAndroidSticks (matches boot2 expectation)
// ✅ Android sticks only active when NOT in XR
// ✅ Uses /js/core/android_controls.js

import { AndroidControls } from "../core/android_controls.js";

let _api = null;

export function initAndroidSticks({ renderer, player, cameraPitch, log, setHUDVisible } = {}){
  try{
    _api = AndroidControls.init({
      renderer,
      player,
      cameraPitch,
      log: log || console.log,
      setHUDVisible
    });
    return _api;
  }catch(e){
    (log||console.log)("[spine_android] init failed ❌", e?.message||e);
    _api = null;
    return null;
  }
}

// called each frame by boot2 (safe even if not initialized)
export function updateAndroidSticks(dt){
  try{
    _api?.update?.(dt);
  }catch(e){
    // swallow to avoid killing render loop
  }
}
