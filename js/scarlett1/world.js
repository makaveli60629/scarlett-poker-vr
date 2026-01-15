import { makeMaterials } from "./world_materials.js";
import { addLights } from "./world_lights.js";
import { buildLayout } from "./world_layout.js";
import { buildSignage } from "./world_signage.js";
import { buildPads } from "./world_pads.js";
import { buildDecor } from "./world_decor.js";
import { buildFX } from "./world_fx.js";
import { buildProps } from "./world_props.js";
import { buildPortals } from "./world_portals.js";
import { buildJumbotrons } from "./world_jumbotrons.js";
import { buildPit } from "./world_pit.js";
import { tagTeleportSurface, tagCollider } from "./world_utils.js";

export async function initWorld({ THREE, scene, renderer, camera, playerRig, log = console.log, quality = "quest" } = {}) {
  const BUILD = "WORLD_SCARLETT1_v4_ULTIMATE";
  log("[world] build start ✅ build=", BUILD);

  const group = new THREE.Group();
  group.name = "WorldRoot";
  scene.add(group);

  const mats = makeMaterials(THREE, { quality });
  const lights = addLights(THREE, group, { quality });
  const fx = buildFX(THREE, scene, { quality });

  const layout = buildLayout(THREE, group, mats);
  const pit = buildPit(THREE, group, mats, layout);
  const signage = buildSignage(THREE, group, mats);
  const portals = buildPortals(THREE, group, mats, layout);
  const jumbos = buildJumbotrons(THREE, group, mats, layout);
  const padsState = buildPads(THREE, group, mats, layout);
  const decor = buildDecor(THREE, group, mats, layout);
  const props = buildProps(THREE, group, mats, layout);

  // Collect colliders + teleport surfaces
  const colliders = [];
  const teleportSurfaces = [];

  for (const m of layout.teleportMeshes) { tagTeleportSurface(m); teleportSurfaces.push(m); }
  for (const m of pit.teleportMeshes) { tagTeleportSurface(m); teleportSurfaces.push(m); }
  for (const m of layout.colliderMeshes) { tagCollider(m); colliders.push(m); }
  for (const m of pit.colliderMeshes) { tagCollider(m); colliders.push(m); }

  const pads = padsState.pads;
  const spawn = layout.spawnPoints.SPAWN_N;

  playerRig.position.set(spawn.pos.x, spawn.pos.y, spawn.pos.z);
  playerRig.rotation.y = spawn.yaw;
  log("[world] spawn ✅", "SPAWN_N");

  log("[world] world ready ✅ colliders=", String(colliders.length), "pads=", String(pads.length));

  return {
    group,
    colliders,
    teleportSurfaces,
    pads,
    spawnPoints: layout.spawnPoints,
    update(dt) {
      lights.update?.(dt);
      signage.update?.(dt);
      decor.update?.(dt);
      fx.update?.(dt);
      portals.update?.(dt);
      jumbos.update?.(dt);
      props.update?.(dt);
      pit.update?.(dt);
    }
  };
}
