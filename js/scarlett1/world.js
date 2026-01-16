// /js/scarlett1/world.js
// SCARLETT1 — World Orchestrator (MODULAR FOREVER • FULL)

import { createXRControllerQuestModule } from "./modules/xr/xr_controller_quest.js";
import { createXRLocomotionModule } from "./modules/xr/xr_locomotion_module.js";
import { createXRGrabModule } from "./modules/xr/xr_grab_module.js";
import { createXRTeleportBlinkModule } from "./modules/xr/xr_teleport_blink_module.js";

import { createWorldMasterModule } from "./modules/world/world_master_module.js";
import { createRoomManagerModule } from "./modules/world/room_manager_module.js";
import { createJumbotronSignageModule } from "./modules/world/jumbotron_signage_module.js";

import { createHUDModule } from "./modules/ui/hud_module.js";
import { createBotShowGameModule } from "./modules/game/bot_showgame_module.js";

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
    canGrab(obj) {
      let o = obj;
      while (o) {
        if (o.userData && typeof o.userData.grabbable === "boolean") return o.userData.grabbable;
        o = o.parent;
      }
      return true;
    },

    // shared “show” references (filled by world_master_module)
    _show: null,
    rooms: null,
  };

  const modules = [];
  function enable(mod) {
    modules.push(mod);
    log("module enabled ✅", mod.name);
    mod.onEnable?.(ctx);
    return mod;
  }

  // ✅ Activate all modules (order matters)
  const XRQuest = enable(createXRControllerQuestModule());         // 1) XR source of truth
  enable(createHUDModule({ startOn: true }));                      // 2) HUD toggle
  enable(createRoomManagerModule());                               // 3) Room manager backbone
  enable(createWorldMasterModule());                               // 4) Build main lobby + main table + interactables
  enable(createJumbotronSignageModule());                          // 5) Jumbotrons/signage
  enable(createXRLocomotionModule({ speed: 2.25 }));               // 6) Movement
  enable(createXRGrabModule());                                    // 7) Grip grab only
  enable(createXRTeleportBlinkModule({ distance: 1.25 }));         // 8) Primary blink
  enable(createBotShowGameModule({ dealInterval: 6.0 }));          // 9) Show-bots "playing"

  return {
    setControllers({ c0, c1 }) {
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
    },
  };
}
