// /js/scarlett1/world.js
// SCARLETT1 — World Orchestrator (FULL)
// - Activates modules
// - Provides shared context (scene/camera/rig/controllers/interactables)
// - Tick loop calls modules in order

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
    controllers: { left: null, right: null }, // will be set from index
    xrSession: null,

    // Shared interaction registry (only grabbables go here)
    interactables: [],
    registerInteractable(obj) { ctx.interactables.push(obj); },
    clearInteractables() { ctx.interactables.length = 0; },

    // Grab gating (anything can set userData.grabbable=false)
    canGrab(obj) {
      let o = obj;
      while (o) {
        if (o.userData && typeof o.userData.grabbable === "boolean") return o.userData.grabbable;
        o = o.parent;
      }
      return true;
    },
  };

  // ===== Module bus =====
  const modules = [];

  function enable(mod) {
    modules.push(mod);
    log("module enabled ✅", mod.name);
    mod.onEnable?.(ctx);
    return mod;
  }

  // ===== Activate all modules (THIS is what you wanted) =====
  // 1) XR input (single source of truth)
  const XRQuest = enable(createXRControllerQuestModule());

  // 2) World build (tables/pit/rooms/bots/cards/chips etc)
  enable(createWorldMasterModule());

  // 3) Locomotion uses normalized input
  enable(createXRLocomotionModule({ speed: 2.25 }));

  // 4) Grab uses normalized input + ctx.interactables
  enable(createXRGrabModule());

  // 5) Optional blink teleport on primary (A/X). Safe, no grip teleport.
  enable(createXRTeleportBlinkModule({ distance: 1.25 }));

  return {
    setControllers({ c0, c1 }) {
      // Visual controllers exist; handedness is detected by XRQuest (inputSources).
      // We still provide objects for rays/attachment. Default mapping:
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
      // Update XR input first (so others consume stable values)
      if (ctx.xrSession) XRQuest.update();

      const input = XRQuest.getInput(); // normalized forever
      const frame = { dt, input };

      // Run modules in activation order
      for (const m of modules) m.update?.(ctx, frame);
    },
  };
}
