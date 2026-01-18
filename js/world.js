// /js/world.js
// Assembles the demo world modules (spawn pad, teleport arch, divot pit + rails, table, bots, cards, casino shell)

import { createSpawnPad } from "./modules/spawn_pad.js";
import { createTeleportArch } from "./modules/teleport_arch.js";
import { createCasinoShell } from "./modules/casino_shell.js";
import { createDivotTable } from "./modules/divot_table.js";
import { createBotsAndCards } from "./modules/avatars_bots.js";
import { installTeleportFX } from "./modules/teleport_fx.js";
import { createEnvironmentExtras } from "./modules/environment_extras.js";
import { installBotsIdle } from "./modules/bots_idle.js";
import { installPokerDemo } from "./modules/poker_demo.js";
import { createVIPRoom } from "./modules/vip_room.js";
import { installSeatSystem } from "./modules/seat_system.js";
import { installPokerInteraction } from "./modules/poker_interaction.js";
import { applyAssets } from "./modules/asset_manager.js";
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

  const extras = createEnvironmentExtras(ctx);
  root.add(extras.group);

  // Spawn pad (where you start)
  const spawn = createSpawnPad(ctx, { position: new THREE.Vector3(0, 0, 8) });
  root.add(spawn.group);

  // Teleport arch machine near spawn
  const arch = createTeleportArch(ctx, { position: new THREE.Vector3(0, 0, 5.5) });
  root.add(arch.group);

  const tpfx = installTeleportFX(ctx, { archGroup: arch.group });
  root.add(tpfx.group);

  // Divot pit + rails + table
  const divot = createDivotTable(ctx, { center: new THREE.Vector3(0, 0, 0) });
  root.add(divot.group);

  // Bots seated around table + cards (table + mirrored hover)
  const bots = createBotsAndCards(ctx, { center: new THREE.Vector3(0, 0, 0) });
  root.add(bots.group);

  // Collect bot groups for idle animation
  const botGroups = [];
  bots.group.traverse((o)=>{ if (o && o.name && o.name.startsWith('bot_')) botGroups.push(o); });
  const idle = installBotsIdle(ctx, { botGroups });
  root.add(idle.group);

  const poker = installPokerDemo(ctx, { center: new THREE.Vector3(0,0,0), tableY: -0.8 + 0.55 });
  root.add(poker.group);

  // VIP Room (no divot)
  const vip = createVIPRoom(ctx, { center: new THREE.Vector3(-16, 0, -12) });
  root.add(vip.group);

  // Seat system: open VIP seat (angle 0)
  const vipCenter = new THREE.Vector3(-16, 0, -12);
  const seatRadius = 3.0;
  const openSeatPos = new THREE.Vector3(vipCenter.x + Math.cos(0)*seatRadius, 0, vipCenter.z + Math.sin(0)*seatRadius);
  const openSeatYaw = Math.PI; // face table center
  const seatSys = installSeatSystem(ctx, { seats: [
    { id:"VIP_OPEN", label:"VIP", position: openSeatPos, yaw: openSeatYaw, radius: 1.0 }
  ]});
  root.add(seatSys.group || new THREE.Group());

  // Debug helpers (optional: keeps things visible)
  const dbg = installWorldDebug(ctx, { spawnPos: spawn.spawnPos });
  root.add(dbg.group);

  // Player avatar (visible body + hands)
  const avatar = installPlayerAvatar(ctx);


  // Apply textures AFTER world build (Android-safe)
  try{
    applyAssets(ctx, { targets: {
      tableMats: [divot.tableMatRef, vip.tableMatRef].filter(Boolean),
      cardBackMats: [bots.cardBackMatRef].filter(Boolean),
      chipMats: []
    }});
  }catch(_){}

  // Set initial rig position to spawn
  rig.position.copy(spawn.spawnPos);
  rig.rotation.set(0, 0, 0);
  dwrite(`[spawn] rig set to (${spawn.spawnPos.x.toFixed(2)},${spawn.spawnPos.y.toFixed(2)},${spawn.spawnPos.z.toFixed(2)})`);

  return {
    update(){
      tpfx.update?.();
      avatar.update?.();
      idle.update?.();
      seatSys.update?.();
      poker.update?.();
      bots.update?.();
    },
    teleportFX: tpfx,
    avatar,
    spawnPos: spawn.spawnPos
  };
}
