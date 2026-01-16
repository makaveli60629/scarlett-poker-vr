// /js/scarlett1/world.js
// SCARLETT1 — World Orchestrator (FULL)
// Activates modules + ticks them. World is the orchestrator.

import { createXRControllerQuestModule } from "./modules/xr/xr_controller_quest.js";
import { createXRLocomotionModule } from "./modules/xr/xr_locomotion_module.js";
import { createXRGrabModule } from "./modules/xr/xr_grab_module.js";
import { createXRTeleportBlinkModule } from "./modules/xr/xr_teleport_blink_module.js";
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

    // show references (filled by world module)
    _show: null,
    _worldUpdaters: [],
    registerWorldUpdater(fn) { ctx._worldUpdaters.push(fn); },
  };

  const modules = [];
  function enable(mod) {
    modules.push(mod);
    log("module enabled ✅", mod.name);
    mod.onEnable?.(ctx);
    return mod;
  }

  // ✅ Modular Forever activation order
  const XRQuest = enable(createXRControllerQuestModule());         // 1) XR source of truth (never touched)
  enable(createWorldMasterModule());                               // 2) World build (pit/table/bots/cards/chips)
  enable(createXRLocomotionModule({ speed: 2.25 }));               // 3) Movement
  enable(createXRGrabModule());                                    // 4) Grip grabs ONLY
  enable(createXRTeleportBlinkModule({ distance: 1.25 }));         // 5) Primary blink teleport

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
      if (ctx.xrSession) XRQuest.update();
      const input = XRQuest.getInput();
      const frame = { dt, input };

      for (const m of modules) m.update?.(ctx, frame);

      // extra updater bus (world module uses it for hover cards)
      if (ctx._worldUpdaters.length) {
        for (const fn of ctx._worldUpdaters) fn(dt);
      }
    },
  };
}
