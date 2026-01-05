import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

function pad(color) {
  const g = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.7, 1.7, 0.08, 40),
    new THREE.MeshStandardMaterial({ color: 0x111217, roughness: 0.95 })
  );
  base.position.y = 0.04;
  g.add(base);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.08, 12, 48),
    new THREE.MeshBasicMaterial({ color })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.09;
  g.add(ring);

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(1.15, 48),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25 })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.095;
  g.add(glow);

  g.userData = { type: "teleportPad", target: "lobby" };
  return g;
}

export const TeleportMachine = {
  build(scene, rig, ctx) {
    // Pads in the lobby
    const toPoker = pad(0x44ccff);
    toPoker.position.set(0, 0, -18);
    toPoker.userData.target = "poker";

    const toStore = pad(0xffcc44);
    toStore.position.set(-18, 0, 0);
    toStore.userData.target = "store";

    scene.add(toPoker, toStore);

    ctx.teleportPads = [toPoker, toStore];

    // Make them interactable by simple distance check
    this.ctx = ctx;
    return this;
  },

  update(dt, ctx) {
    if (!ctx?.teleportPads?.length) return;

    // If player stands near pad, auto “hint” (no menu needed)
    const p = ctx.rig.position;
    for (const pad of ctx.teleportPads) {
      const d = p.distanceTo(pad.position);
      if (d < 1.25) {
        const target = pad.userData.target;
        const sp = ctx.spawns3D?.[target];
        if (sp) {
          // Auto move only if user presses trigger soon? keep it gentle:
          // We'll just pulse ring; actual teleport is still done by teleport walk.
          // (This avoids surprise motion.)
          pad.children[1].scale.setScalar(1.0 + 0.15 * Math.sin(performance.now() * 0.01));
        }
      } else {
        pad.children[1].scale.setScalar(1.0);
      }
    }
  },
};

export default TeleportMachine;
