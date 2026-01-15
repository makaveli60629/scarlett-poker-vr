// /js/scarlett1/world_utils.js
export function tagTeleportSurface(mesh) {
  if (!mesh) return;
  mesh.userData ||= {};
  mesh.userData.teleportSurface = true;
}

export function tagCollider(mesh) {
  if (!mesh) return;
  mesh.userData ||= {};
  mesh.userData.collider = true;
}
