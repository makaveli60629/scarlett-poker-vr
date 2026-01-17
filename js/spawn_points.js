// js/spawn_points.js — compat v2 (FULL)
// Works whether called as SpawnPoints.apply(ctx) OR SpawnPoints.apply(camera)

export const SpawnPoints = {
  apply(arg) {
    // If adapter passes ctx, use ctx.camera.
    const camera = arg?.camera ? arg.camera : arg;

    if (!camera || !camera.position || typeof camera.position.set !== "function") {
      console.warn("[spawn_points] apply: no valid camera passed", arg);
      return false;
    }

    // Default safe spawn (feel free to change)
    camera.position.set(0, 1.6, 3);
    console.log("[spawn_points] applied ✅");
    return true;
  }
};
