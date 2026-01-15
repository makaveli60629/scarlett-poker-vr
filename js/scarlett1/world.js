// /js/scarlett1/world.js — Orchestrator (BOOT2 compatible)
// Exports: initWorld() ✅ required by BOOT2, plus createWorld() for internal use.

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { BUILD, DEFAULT_QUALITY, getSpawns } from "./world_constants.js";
import { createMaterials } from "./world_materials.js";
import { buildLobby } from "./world_lobby.js";
import { buildHallsAndRooms } from "./world_halls_rooms.js";
import { buildFeatures } from "./world_features.js";
import { buildLights } from "./world_lights.js";

if (!THREE || !THREE.MeshStandardMaterial) {
  throw new Error("[world] THREE missing or incomplete (MeshStandardMaterial not found)");
}

export { BUILD, getSpawns };

/**
 * BOOT2 REQUIRED EXPORT ✅
 * BOOT2 calls: worldMod.initWorld({ THREE, scene, renderer, camera, playerRig, log, quality })
 */
export async function initWorld(ctx = {}) {
  // BOOT2 might pass THREE, but we intentionally ignore it and use our imported THREE.
  // This avoids scope issues and keeps the module self-contained.
  return await createWorld(ctx);
}

/**
 * Internal API
 */
export async function createWorld(ctx = {}) {
  const {
    scene,
    renderer,
    camera,
    playerRig,
    log = (...a) => console.log("[world]", ...a),
    quality = DEFAULT_QUALITY
  } = ctx;

  if (!scene) throw new Error("[world] initWorld/createWorld requires { scene }");

  const world = {
    group: new THREE.Group(),
    colliders: [],
    anchors: {},
    rooms: {},
    pads: [],
    signs: [],
    jumbotrons: [],
    mannequins: [],
    lights: [],
    update(dt) {},
    dispose() {}
  };

  world.group.name = "ScarlettWorld";
  scene.add(world.group);

  log("build start ✅", "build=", BUILD);

  const mats = createMaterials(quality);

  buildLobby(world, mats, quality);
  buildHallsAndRooms(world, mats, quality);
  buildFeatures(world, mats, quality);
  buildLights(world, renderer, quality);

  // spawns
  const spawns = getSpawns();
  world.anchors.spawns = spawns;
  world.spawn = spawns.SPAWN_N;
  log("spawn ✅", "SPAWN_N");

  // update loop (centralized)
  let t = 0;
  world.update = (dt = 0.016) => {
    t += dt;

    // jumbotron pulse
    for (const j of world.jumbotrons) {
      j.t += dt;
      const p = 0.75 + 0.25 * Math.sin(j.t * 1.4);
      if (j.screen?.material) j.screen.material.emissiveIntensity = 1.0 + p;
    }

    // neon pulse
    mats.matTrim.emissiveIntensity = 0.55 + 0.15 * Math.sin(t * 1.8);
    mats.matNeonPink.emissiveIntensity = 0.75 + 0.25 * Math.sin(t * 2.2);
    mats.matNeonCyan.emissiveIntensity = 0.75 + 0.25 * Math.sin(t * 2.0);
  };

  world.getTeleportTargets = () =>
    world.pads.map(p => ({ label: p.userData.label, position: p.userData.target.clone() }));

  world.dispose = () => {
    scene.remove(world.group);
    mats.carpetTex?.dispose?.();
  };

  // optional: auto-position rig
  if (playerRig && world.spawn) {
    playerRig.position.copy(world.spawn.pos);
    playerRig.rotation.y = world.spawn.yaw;
  }
  if (camera) camera.lookAt(0, 1.6, 0);

  log("world ready ✅", "colliders=", world.colliders.length, "pads=", world.pads.length);

  // BOOT2 sometimes expects world.group and world.colliders at minimum
  return world;
}

// Back-compat default export
export default { initWorld, createWorld, getSpawns, BUILD };
