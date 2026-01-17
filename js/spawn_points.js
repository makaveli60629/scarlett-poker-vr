// js/spawn_points.js — compat v3 (FULL)
// Supports SpawnPoints.apply(camera) AND SpawnPoints.apply(ctx)

export const SpawnPoints = {
  apply(arg) {
    const camera = arg?.camera ? arg.camera : arg;

    if (!camera || !camera.position || typeof camera.position.set !== "function") {
      console.warn("[spawn_points] apply: no valid camera passed", arg);
      return false;
    }

    // Safe default spawn
    camera.position.set(0, 1.6, 3);
    console.log("[spawn_points] applied ✅");
    return true;
  }
};
