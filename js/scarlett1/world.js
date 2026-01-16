// /js/scarlett1/world.js
// SCARLETT1 — World Orchestrator (FULL PATCHED)
// - Activates modules in safe order
// - Room Manager first
// - World builds into Room #1 by default
// - XR is modular forever

import { createXRControllerQuestModule } from "./modules/xr/xr_controller_quest.js";
import { createXRLocomotionModule } from "./modules/xr/xr_locomotion_module.js";
import { createXRGrabModule } from "./modules/xr/xr_grab_module.js";
import { createXRTeleportBlinkModule } from "./modules/xr/xr_teleport_blink_module.js";

import { createRoomManagerModule } from "./modules/world/room_manager_module.js";
import { createWorldMasterModule } from "./modules/world/world_master_module.js";

export function createWorldOrchestrator({ THREE, scene, renderer, camera, playerRig, head }) {
  const log = (...a) => console.log("[scarlett1/world]", ...a);

  const ctx = {
    THREE,
    scene,
    renderer,
    camera,
    playerRig,
    head,
    controllers: { left: null, right: null },
    xrSession: null,

    // interactables registry for grab module
    interactables: [],
    registerInteractable(obj) { ctx.interactables.push(obj); },
    clearInteractables() { ctx.interactables.length = 0; },

    // gate grabbing (cards can set grabbable:false)
    canGrab(obj) {
      let o = obj;
      while (o) {
        if (o.userData && typeof o.userData.grabbable === "boolean") return o.userData.grabbable;
        o = o.parent;
      }
      return true;
    },

    // optional update bus (world uses for hover cards / show anim)
    _worldUpdaters: [],
    registerWorldUpdater(fn) { ctx._worldUpdaters.push(fn); },

    // world module will fill this
    _show: null,

    // room manager will fill this
    rooms: null,
  };

  const modules = [];
  function enable(mod) {
    modules.push(mod);
    log("module enabled ✅", mod.name);
    mod.onEnable?.(ctx);
    return mod;
  }

  // ✅ Activation order (important)
  const XRQuest = enable(createXRControllerQuestModule());  // 1) XR input source of truth

  enable(createRoomManagerModule());                        // 2) Rooms exist first (Room #1 = Scorpion Main Test)
  enable(createWorldMasterModule());                        // 3) World builds into Room #1 automatically

  enable(createXRLocomotionModule({ speed: 2.25 }));        // 4) Locomotion
  enable(createXRGrabModule());                             // 5) Grip grab only
  enable(createXRTeleportBlinkModule({ distance: 1.25 }));  // 6) Primary blink

  return {
    setControllers({ c0, c1 }) {
      // Visual controllers exist; XRQuest detects handedness via inputSources.
      ctx.controllers.left = c0;
      ctx.controllers.right = c1;
    },

    onXRSessionStart(session) {
      ctx.xrSession = session;
      XRQuest.bindSession(session);
      for (const m of modules) m.onXRSessionStart?.(ctx);
    },

    onXRSessionEnd() {
      for (const m of modules) m.onXRSessionEnd?.(ctx);
      ctx.xrSession = null;
    },

    tick(dt) {
      // update XR first so other modules consume stable normalized input
      if (ctx.xrSession) XRQuest.update();
      const input = XRQuest.getInput();
      const frame = { dt, input };

      for (const m of modules) m.update?.(ctx, frame);

      // extra update bus (hover cards, show animations, etc.)
      if (ctx._worldUpdaters.length) {
        for (const fn of ctx._worldUpdaters) fn(dt);
      }
    },
  };
}
