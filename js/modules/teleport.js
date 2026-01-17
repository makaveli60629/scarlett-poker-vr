// /js/modules/teleport.js
// Simple XR teleport: cast a ray, move rig to hit point.

export function installTeleport(ctx, hud){
  const { THREE, renderer, rig, controllers, world } = ctx;
  const dwrite = (m)=>{ try{ window.__scarlettDiagWrite?.(m); }catch(_){ } };

  const btn = document.getElementById('btnTeleport');
  const state = { enabled:false, marker:null, ray:new THREE.Raycaster(), tmpDir:new THREE.Vector3(), tmpPos:new THREE.Vector3() };

  // Marker
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.18, 32),
    new THREE.MeshBasicMaterial({ color: 0xff2f6d, transparent:true, opacity:0.85 })
  );
  ring.rotation.x = -Math.PI/2;
  ring.visible = false;
  state.marker = ring;
  ctx.scene.add(ring);

  function setEnabled(v){
    state.enabled = !!v;
    btn.textContent = `Teleport: ${state.enabled ? 'ON' : 'OFF'}`;
    btn.classList.toggle('good', state.enabled);
    dwrite(`Teleport: ${state.enabled ? 'ON' : 'OFF'}`);
  }

  btn?.addEventListener('click', ()=> setEnabled(!state.enabled));

  const right = controllers?.[1] || controllers?.[0];
  if (right){
    right.addEventListener('selectstart', ()=>{
      if (!state.enabled) return;
      if (state._lastHit){
        // Move rig so hit point becomes under player.
        rig.position.x = state._lastHit.x;
        rig.position.z = state._lastHit.z;
      }
    });
  }

  function update(){
    if (!renderer.xr.isPresenting || !state.enabled){
      state.marker.visible = false;
      return;
    }
    const src = (controllers?.[1] || controllers?.[0]);
    if (!src) return;

    // Ray from controller
    src.getWorldPosition(state.tmpPos);
    src.getWorldDirection(state.tmpDir);
    state.ray.set(state.tmpPos, state.tmpDir);
    const hit = state.ray.intersectObject(world.floorMesh, true)[0];
    if (hit){
      state._lastHit = hit.point;
      state.marker.position.copy(hit.point);
      state.marker.visible = true;
    } else {
      state.marker.visible = false;
    }
  }

  dwrite('[status] MODULE TELEPORT ✅');
  return { update };
}
