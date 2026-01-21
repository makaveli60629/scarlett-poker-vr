// /js/spawn.js — authoritative spawn + standing height lock (V26.1.5)
export function applySpawn({ rigId="rig", spawnPadId="spawnPad", standingHeight=1.65 } = {}) {
  const rig = document.getElementById(rigId);
  if (!rig) return false;

  const head = document.getElementById("head");
  if (head) head.setAttribute("position", `0 ${standingHeight} 0`);

  const pad = document.getElementById(spawnPadId);
  let x=0, y=0, z=3;

  if (pad && pad.object3D && window.THREE) {
    const wp = new THREE.Vector3();
    pad.object3D.getWorldPosition(wp);
    x = wp.x; y = wp.y; z = wp.z;
  }

  if (rig.object3D) {
    rig.object3D.position.set(x, y, z);
    rig.object3D.rotation.set(0, 0, 0);
    rig.object3D.updateMatrixWorld(true);
  } else {
    rig.setAttribute("position", `${x} ${y} ${z}`);
    rig.setAttribute("rotation", "0 0 0");
  }
  return true;
}

export function armRespawnOnEnterVR({ sceneId="scene", rigId="rig", spawnPadId="spawnPad", standingHeight=1.65 } = {}) {
  const scene = document.getElementById(sceneId);
  if (!scene) return;
  scene.addEventListener("enter-vr", () => {
    setTimeout(() => applySpawn({ rigId, spawnPadId, standingHeight }), 50);
    setTimeout(() => applySpawn({ rigId, spawnPadId, standingHeight }), 300);
  });
}
