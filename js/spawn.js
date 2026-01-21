// /js/spawn.js — authoritative spawn + standing height lock
export function applySpawn({ rigId="rig", spawnPadId="spawnPad", standingHeight=1.65 } = {}) {
  const rig = document.getElementById(rigId);
  if (!rig) return false;

  const head = document.getElementById("head");
  if (head) head.setAttribute("position", `0 ${standingHeight} 0`);

  const pad = document.getElementById(spawnPadId);
  let x=0, y=0, z=3;
  if (pad && pad.object3D) {
    const p = pad.object3D.position;
    x = p.x; y = p.y; z = p.z;
  }
  rig.setAttribute("position", `${x} ${y} ${z}`);
  rig.setAttribute("rotation", "0 0 0");
  return true;
}
