// js/xr_rig_fix.js
// Keeps XR controllers/grips attached to the player rig so teleport/locomotion never desyncs.

export function attachXRToRig({ scene, rig, controller0, controller1, grip0, grip1 }) {
  // Remove from scene if they were added there
  try { scene.remove(controller0); } catch {}
  try { scene.remove(controller1); } catch {}
  try { scene.remove(grip0); } catch {}
  try { scene.remove(grip1); } catch {}

  // Parent to rig so they inherit rig motion
  rig.add(controller0);
  rig.add(controller1);
  rig.add(grip0);
  rig.add(grip1);

  controller0.userData.__attachedToRig = true;
  controller1.userData.__attachedToRig = true;
  grip0.userData.__attachedToRig = true;
  grip1.userData.__attachedToRig = true;
}
