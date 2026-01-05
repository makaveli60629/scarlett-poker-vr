// js/world.js — VIP Room World Builder (8.0)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

import { TeleportMachine } from "./teleport_machine.js";
import { BossTable } from "./boss_table.js";
import { BossBots } from "./boss_bots.js";        // ✅ matches your repo list
import { LightsPack } from "./lights_pack.js";
import { SolidWalls } from "./solid_walls.js";
import { VIPRoom } from "./vip_room.js";

export const World = {
  build(scene, rig) {
    // Background / fog (prevents “infinite black void” feeling)
    scene.background = new THREE.Color(0x05060a);
    scene.fog = new THREE.Fog(0x05060a, 2, 55);

    // Lighting (Quest needs more than desktop)
    LightsPack.build(scene);

    // Room + walls + floor
    VIPRoom.build(scene);
    SolidWalls.build(scene);

    // Centerpiece table zone
    BossTable.build(scene);

    // Teleport pad (also provides safe spawn)
    TeleportMachine.build(scene);

    // Spawn (never on the table again)
    const s = TeleportMachine.getSafeSpawn?.() || { position: new THREE.Vector3(0, 0, 5), yaw: Math.PI };
    rig.position.copy(s.position);
    rig.rotation.y = s.yaw || 0;

    // Bots
    BossBots.build(scene);

    return true;
  },

  update(dt, camera) {
    BossBots.update?.(dt, camera);
  }
};
