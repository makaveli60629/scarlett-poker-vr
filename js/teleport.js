import * as THREE from "three";

function pad(name, x,y,z, color=0x66ccff){
  const g = new THREE.RingGeometry(0.45, 0.72, 48);
  const m = new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.85, side:THREE.DoubleSide });
  const mesh = new THREE.Mesh(g,m);
  mesh.rotation.x = -Math.PI/2;
  mesh.position.set(x, y+0.03, z);
  mesh.name = name;
  mesh.userData.isTeleportPad = true;
  return mesh;
}

export async function setupTeleport(ctx) {
  const { scene, camera, rig, renderer, log } = ctx;

  const pads = [
    pad("tp_lobby", 0,0,3, 0x66ccff),
    pad("tp_poker", 0,0,-14.2, 0x00ffaa),
    pad("tp_store", -12.5,0,-6.5, 0xff66ff),
  ];
  pads.forEach(p=>scene.add(p));

  const raycaster = new THREE.Raycaster();
  const tmpMat = new THREE.Matrix4();
  const dir = new THREE.Vector3();

  function tryTeleportFromController(c){
    tmpMat.identity().extractRotation(c.matrixWorld);
    dir.set(0,0,-1).applyMatrix4(tmpMat);
    raycaster.set(c.getWorldPosition(new THREE.Vector3()), dir);
    const hits = raycaster.intersectObjects(pads, false);
    if (!hits.length) return false;

    const hit = hits[0].object;
    const room = hit.name.replace("tp_","");
    log?.(`[teleport_machine] activate → ${hit.name}`);
    window.dispatchEvent(new CustomEvent("scarlett_room",{detail:{room}}));
    return true;
  }

  // Keyboard quick-jumps for Android testing
  window.addEventListener("keydown",(e)=>{
    if (e.key === "1") window.dispatchEvent(new CustomEvent("scarlett_room",{detail:{room:"lobby"}}));
    if (e.key === "2") window.dispatchEvent(new CustomEvent("scarlett_room",{detail:{room:"poker"}}));
    if (e.key === "3") window.dispatchEvent(new CustomEvent("scarlett_room",{detail:{room:"store"}}));
  });

  // Quest: click trigger to teleport
  function onSelectStart(e){
    tryTeleportFromController(e.target);
  }
  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);
  c0.addEventListener("selectstart", onSelectStart);
  c1.addEventListener("selectstart", onSelectStart);

  log?.("[teleport] ready ✓ (pads + selectstart)");
  return { tick(){} };
}
