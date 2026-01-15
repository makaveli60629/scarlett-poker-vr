// /js/scarlett1/spine_hud.js — HUD helpers (minimal)
// Diagnostics HUD is handled by spine_diag.js. This file just adds convenience buttons if desired.

export function installHUD({ world, diag }) {
  // Example: quick "Recenter to Table" button
  diag?.addButton?.("Recenter", () => {
    world.setRigPose({ x:0, z:3.2, yaw:0 });
    diag?.log?.("Recentered to table ✅");
  });

  // Example: print pose
  diag?.addButton?.("Pose", () => {
    const p = world.rig.position;
    diag?.log?.("Rig pos:", { x:+p.x.toFixed(2), y:+p.y.toFixed(2), z:+p.z.toFixed(2) });
  });

  diag?.log?.("[hud] helpers installed ✅");
}
