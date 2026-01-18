// /js/world.js
// Assembles the demo world modules (spawn pad, teleport arch, divot pit + rails, table, bots, cards, casino shell)

import { createSpawnPad } from "./modules/spawn_pad.js";
import { createTeleportArch } from "./modules/teleport_arch.js";
import { createCasinoShell } from "./modules/casino_shell.js";
import { createDivotTable } from "./modules/divot_table.js";
import { createBotsAndCards } from "./modules/avatars_bots.js";
import { installWorldDebug } from "./modules/world_debug.js";
import { installPlayerAvatar } from "./modules/player_avatar.js";

export function buildWorld(ctx){
  const { THREE, scene, rig, camera, renderer, dwrite } = ctx;

  dwrite("[world] buildWorld()");

  // Root group
  const root = new THREE.Group();
  root.name = "worldRoot";
  scene.add(root);

  // Casino shell
  const shell = createCasinoShell(ctx);
  root.add(shell.group);

  // Spawn pad (where you start)
  const spawn = createSpawnPad(ctx, { position: new THREE.Vector3(0, 0, 8) });
  root.add(spawn.group);

  // Teleport arch machine near spawn
  const arch = createTeleportArch(ctx, { position: new THREE.Vector3(0, 0, 5.5) });
  root.add(arch.group);

  // Divot pit + rails + table
  const divot = createDivotTable(ctx, { center: new THREE.Vector3(0, 0, 0) });
  root.add(divot.group);

  // Bots seated around table + cards (table + mirrored hover)
  const bots = createBotsAndCards(ctx, { center: new THREE.Vector3(0, 0, 0) });
  root.add(bots.group);

  // Debug helpers (optional: keeps things visible)
  const dbg = installWorldDebug(ctx, { spawnPos: spawn.spawnPos });
  root.add(dbg.group);

  // Player avatar (visible body + hands)
  const avatar = installPlayerAvatar(ctx);

  // Set initial rig position to spawn
  rig.position.copy(spawn.spawnPos);
  rig.rotation.set(0, 0, 0);
  dwrite(`[spawn] rig set to (${spawn.spawnPos.x.toFixed(2)},${spawn.spawnPos.y.toFixed(2)},${spawn.spawnPos.z.toFixed(2)})`);

  return {
    update(){
      avatar.update?.();
      bots.update?.();
    },
    spawnPos: spawn.spawnPos
  };
}
