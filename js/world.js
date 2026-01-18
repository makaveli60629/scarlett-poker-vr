// World assembler: loads modules in order and returns world handles

import { module_spawn_pad } from "./modules/spawn_pad.js";
import { module_teleport_arch } from "./modules/teleport_arch.js";
import { module_casino_shell } from "./modules/casino_shell.js";
import { module_divot_table } from "./modules/divot_table.js";
import { module_avatars_bots } from "./modules/avatars_bots.js";

export async function buildWorld(env) {
  const { THREE, scene, rig } = env;

  // base floor (large plane)
  const floorGeo = new THREE.PlaneGeometry(120, 120);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x141b24, roughness: 0.95, metalness: 0.0 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // subtle grid (diagnostic friendly)
  const grid = new THREE.GridHelper(120, 120, 0x233041, 0x1b2432);
  grid.position.y = 0.001;
  scene.add(grid);

  env.world = {
    floor,
    grid,
    teleport: null,
    spawnPad: null,
    arch: null,
    table: null,
    bots: [],
  };

  const modules = [
    module_spawn_pad,
    module_teleport_arch,
    module_casino_shell,
    module_divot_table,
    module_avatars_bots,
  ];

  for (const mod of modules) {
    try {
      const res = await mod.init(env);
      if (typeof res?.update === 'function') env.updateFns.push(res.update);
      if (res?.handles) Object.assign(env.world, res.handles);
    } catch (err) {
      env?.log?.(`MODULE ERROR: ${mod?.id || 'unknown'} ${err?.message || err}`);
      console.error(err);
    }
  }

  // initial spawn (ensure we land on spawn pad)
  if (!env.state.spawned) {
    rig.position.set(env.state.spawnPoint.x, 0, env.state.spawnPoint.z);
    rig.rotation.set(0, env.state.spawnYaw, 0);
    env.state.spawned = true;
  }

  return env.world;
}
