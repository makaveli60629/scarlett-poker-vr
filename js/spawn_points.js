export const SpawnPoints = {
  apply(camera) {
    // safe default spawn (camera, not ctx)
    camera.position.set(0, 1.6, 3);
    console.log("[spawn_points] applied ✅");
    return true;
  }
};
