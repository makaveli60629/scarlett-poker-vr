// /js/scarlett1/world.js — Scarlett World (Module Spine) v3.0
import { C } from "./world_constants.js";
import { makeMaterials } from "./world_materials.js";
import { addLights } from "./world_lights.js";
import { buildLayout } from "./world_layout.js";
import { buildSignage } from "./world_signage.js";
import { buildPads } from "./world_pads.js";
import { buildDecor } from "./world_decor.js";
import { tagTeleportSurface, tagCollider } from "./world_utils.js";

export async function initWorld({ THREE, scene, renderer, camera, playerRig, log = console.log, quality = "quest" } = {}) {
  const BUILD = "WORLD_SCARLETT1_v3_0_MODULE";
  log("[world] build start ✅ build=", BUILD);

  const group = new THREE.Group();
  group.name = "WorldRoot";
  scene.add(group);

  const mats = makeMaterials(THREE, { quality });

  // Lighting
  const lightState = addLights(THREE, group, { quality });

  // Layout (lobby + halls + rooms shells)
  const layout = buildLayout(THREE, group, mats);

  // Signage (animated neon)
  const signage = buildSignage(THREE, group, mats);

  // Pads (teleport pads + targets)
  const padsState = buildPads(THREE, group, mats, layout);

  // Decor (rails, trims, grid floor accents)
  const decor = buildDecor(THREE, group, mats, layout);

  // Collect colliders + teleport surfaces
  const colliders = [];
  const teleportSurfaces = [];

  // 1) Tag floor + room floors as teleport surfaces
  for (const m of layout.teleportMeshes) {
    tagTeleportSurface(m);
    teleportSurfaces.push(m);
  }

  // 2) Tag colliders (walls/rails)
  for (const m of layout.colliderMeshes) {
    tagCollider(m);
    colliders.push(m);
  }

  // 3) Pads are already tagged
  const pads = padsState.pads;

  // Spawn points (north default)
  const spawnPoints = layout.spawnPoints;

  // Pick spawn: SPAWN_N
  const spawn = spawnPoints.SPAWN_N || { pos: new THREE.Vector3(0, 0, C.LOBBY_R + 4), yaw: Math.PI };
  playerRig.position.set(spawn.pos.x, spawn.pos.y, spawn.pos.z);
  playerRig.rotation.y = spawn.yaw;

  log("[world] spawn ✅", "SPAWN_N");
  log("[world] world ready ✅ colliders=", String(colliders.length), "pads=", String(pads.length));

  const state = {
    group,
    colliders,
    teleportSurfaces,
    pads,
    spawnPoints,
    update(dt) {
      signage.update(dt);
      lightState.update?.(dt);
      decor.update?.(dt);
    }
  };

  return state;
}
