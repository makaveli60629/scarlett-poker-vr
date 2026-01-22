function $(id){ return document.getElementById(id); }

export function applySpawn({ standingHeight=1.65 } = {}){
  const rig = $("rig");
  if (!rig) return false;
  const pad = $("spawnPad");
  const pos = (pad && pad.object3D && pad.object3D.position) ? pad.object3D.position : null;
  if (pos) rig.object3D.position.set(pos.x, 0, pos.z);
  else rig.object3D.position.set(0, 0, 3);

  const head = $("head");
  if (head) head.setAttribute("position", `0 ${standingHeight} 0`);
  return true;
}

export function armRespawnOnEnterVR({ standingHeight=1.65 } = {}){
  const scene = $("scene");
  if (!scene) return;
  const reapply = () => { try{ applySpawn({ standingHeight }); }catch(_){ } };
  scene.addEventListener("enter-vr", reapply);
  scene.addEventListener("exit-vr", reapply);
}
