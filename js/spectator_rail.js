// /js/spectator_rail.js — SpectatorRail v1.0 (FULL)
// Builds a visible rail ring around the LOBBY table + an invisible collider ring.
// (Scorpion room already has its own rail inside scorpion_room.js)

export const SpectatorRail = {
  async build(ctx) {
    const { THREE, scene, log } = ctx;

    const group = new THREE.Group();
    group.name = "SPECTATOR_RAIL";
    scene.add(group);

    // LOBBY table center (your lobby table is at 0,0,0)
    const center = new THREE.Vector3(0, 0, 0);

    // Visible ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.25, 0.035, 10, 140),
      new THREE.MeshStandardMaterial({
        color: 0x202036,
        roughness: 0.35,
        metalness: 0.35,
        emissive: 0x7fe7ff,
        emissiveIntensity: 0.08,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(center.x, 1.05, center.z);
    ring.name = "LOBBY_RAIL_RING";
    ring.castShadow = false;
    ring.receiveShadow = true;
    group.add(ring);

    // Invisible collider cylinder (if your collision respects ctx.colliders)
    const collider = new THREE.Mesh(
      new THREE.CylinderGeometry(2.25, 2.25, 2.4, 60, 1, true),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, side: THREE.DoubleSide })
    );
    collider.position.set(center.x, 1.1, center.z);
    collider.name = "LOBBY_RAIL_COLLIDER";
    collider.userData.isCollider = true;
    group.add(collider);

    ctx.colliders?.push?.(collider);

    log?.("[rail] ✅ lobby rail built (visible + collider)");
    return group;
  },

  update() {},
};
