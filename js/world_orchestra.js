import { initDiagnostics, diagWrite } from "./diagnostics.js";
import { buildLighting } from "./lighting.js";
import { buildWorld } from "./world.js";
import { buildTable } from "./table.js";
import { initMovement } from "./movement.js";
import { buildTeleportMachine, initTeleportControls } from "./teleport_machine.js";
import { initHands } from "./hands.js";
import { initGestureEngine } from "./gesture_engine.js";
import { spawnBots } from "./bots.js";
import { initAvatars } from "./avatars.js";
import { initPokerDemoUI } from "./poker_demo.js";
import { initEnterVR } from "./vr.js";

export function startWorldOrchestra(){
  initDiagnostics();
  diagWrite("🎼 World Orchestra starting…");

  buildLighting();
  buildWorld();
  buildTable();

  initEnterVR();
  initMovement();
  initTeleportControls();
  buildTeleportMachine();

  initHands();
  initGestureEngine();

  spawnBots();
  initAvatars();

  initPokerDemoUI();

  diagWrite("✅ World Orchestra READY");
}
