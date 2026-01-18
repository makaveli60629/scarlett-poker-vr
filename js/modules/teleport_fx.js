// /js/modules/teleport_fx.js
// Visual target ring + arch glow control (Teleport ON/OFF) + helper for ground targeting
export function installTeleportFX({ THREE, scene, camera, rig, dwrite }, { archGroup }){
  const group = new THREE.Group();
  group.name = "teleportFX";

  // Target ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.35, 0.04, 10, 44),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x2aa3ff, emissiveIntensity: 0.9, roughness: 0.35 })
  );
  ring.rotation.x = Math.PI/2;
  ring.visible = false;
  group.add(ring);

  // Little center dot
  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(0.06, 24),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x2aa3ff, emissiveIntensity: 1.1, roughness: 0.4 })
  );
  dot.rotation.x = -Math.PI/2;
  dot.position.y = 0.002;
  dot.visible = false;
  group.add(dot);

  scene.add(group);

  // Arch glow materials finder (we set emissiveIntensity on any mesh with emissive)
  const glowMeshes = [];
  archGroup?.traverse?.((o)=>{
    if (o.isMesh && o.material && (o.material.emissive || o.material.emissiveIntensity !== undefined)){
      glowMeshes.push(o);
    }
  });

  function setArchPower(on){
    const ei = on ? 1.25 : 0.35;
    for (const m of glowMeshes){
      try{
        if (m.material.emissive) m.material.emissive.setHex(on ? 0x2277ff : 0x111111);
        m.material.emissiveIntensity = ei;
        m.material.needsUpdate = true;
      }catch(_){}
    }
  }

  // Ground targeting (y=0)
  const groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const hit = new THREE.Vector3();

  function getGroundHit(){
    camera.getWorldPosition(origin);
    tmpQ.copy(camera.getWorldQuaternion(new THREE.Quaternion()));
    dir.set(0,0,-1).applyQuaternion(tmpQ).normalize();
    const ray = new THREE.Ray(origin, dir);
    const ok = ray.intersectPlane(groundPlane, hit);
    return ok ? hit.clone() : null;
  }

  let enabled = false;
  function setEnabled(v){
    enabled = !!v;
    ring.visible = enabled;
    dot.visible = enabled;
    setArchPower(enabled);
  }

  function update(){
    if (!enabled) return;
    const p = getGroundHit();
    if (!p) return;
    ring.position.set(p.x, 0.02, p.z);
    dot.position.set(p.x, 0.021, p.z);
  }

  dwrite?.("[teleportFX] installed");
  return { group, setEnabled, getGroundHit, update };
}
