// world.js (orchestrator pattern)
import { createXRControllerQuestModule } from "./modules/xr/xr_controller_quest.js";
import { createXRLocomotionModule } from "./modules/xr/xr_locomotion_module.js";
// import { createXRGrabModule } from "./modules/xr/xr_grab_module.js";

export const World = {
  modules: [],
  xr: { controller: null },
  enableModule(mod) { this.modules.push(mod); return mod; },
  update(ctx) { for (const m of this.modules) m.update?.(ctx); }
};

export function initModules() {
  // Activate modules ONCE here
  World.xr.controller = World.enableModule(createXRControllerQuestModule());
  World.enableModule(createXRLocomotionModule({ speed: 2.25 }));
  // World.enableModule(createXRGrabModule());
}

export function onXRSessionStart(session) {
  World.xr.controller?.bindSession(session);
}
