// /js/modules/controls_basic.js
// Touch-drag look + two-finger drag move + WASD. Teleport via ray to ground.
export function installBasicControls({ THREE, renderer, rig, camera, dwrite }){
  const state = {
    look:{ active:false, id:null, x:0, y:0 },
    move:{ active:false, x:0, y:0, dist:0 },
    keys:{},
    teleportEnabled:false,
  };

  const spawnPos = new THREE.Vector3();
  spawnPos.copy(rig.position);

  // --- helpers ---
  const euler = new THREE.Euler(0,0,0,"YXZ");
  const tmpV = new THREE.Vector3();

  function setTeleportEnabled(v){
    state.teleportEnabled = !!v;
    dwrite(`[teleport] ${state.teleportEnabled ? "ON" : "OFF"}`);
  }

  function resetToSpawn(){
    rig.position.copy(spawnPos);
    rig.rotation.set(0,0,0);
    dwrite("[spawn] reset ✅");
  }

  function teleportTo(pos){
    // Keep player height; pos is ground point
    rig.position.set(pos.x, rig.position.y, pos.z);
  }

  function setSpawnHere(){
    spawnPos.copy(rig.position);
    dwrite(`[spawn] set here (${spawnPos.x.toFixed(2)},${spawnPos.y.toFixed(2)},${spawnPos.z.toFixed(2)})`);
  }

  // --- ray to ground (y=0) ---
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
  function groundHitFromCamera(){
    // Ray from camera forward
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3(0,0,-1);
    camera.getWorldPosition(origin);
    dir.applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())).normalize();
    const ray = new THREE.Ray(origin, dir);
    const hit = new THREE.Vector3();
    const ok = ray.intersectPlane(groundPlane, hit);
    return ok ? hit : null;
  }

  // Click to teleport (non-xr)
  renderer.domElement.addEventListener("click", (ev)=>{
    if (!state.teleportEnabled) return;
    if (renderer.xr.isPresenting) return;
    const hit = groundHitFromCamera();
    if (hit){
      if (typeof window.__scarlettRequestTeleport === 'function') window.__scarlettRequestTeleport(hit); else teleportTo(hit);
      dwrite(`[teleport] click -> (${hit.x.toFixed(2)},${hit.z.toFixed(2)})`);
    }
  });

  // XR controller select to teleport
  const c0 = renderer.xr.getController(0);
  c0.addEventListener("select", ()=>{
    if (!state.teleportEnabled) return;
    const hit = groundHitFromCamera();
    if (hit){
      if (typeof window.__scarlettRequestTeleport === 'function') window.__scarlettRequestTeleport(hit); else teleportTo(hit);
      dwrite(`[teleport] xr select -> (${hit.x.toFixed(2)},${hit.z.toFixed(2)})`);
    }
  });

  // Touch controls
  function onTouchStart(e){
    if (e.touches.length === 1){
      const t = e.touches[0];
      state.look.active = true;
      state.look.id = t.identifier;
      state.look.x = t.clientX;
      state.look.y = t.clientY;
    } else if (e.touches.length >= 2){
      const t0 = e.touches[0], t1 = e.touches[1];
      state.move.active = true;
      state.move.x = (t0.clientX+t1.clientX)/2;
      state.move.y = (t0.clientY+t1.clientY)/2;
      const dx = t0.clientX - t1.clientX;
      const dy = t0.clientY - t1.clientY;
      state.move.dist = Math.hypot(dx,dy);
    }
  }

  function onTouchMove(e){
    if (state.look.active && e.touches.length === 1){
      const t = e.touches[0];
      const dx = t.clientX - state.look.x;
      const dy = t.clientY - state.look.y;
      state.look.x = t.clientX;
      state.look.y = t.clientY;

      // yaw/pitch on rig
      const yawSpeed = 0.004;
      const pitchSpeed = 0.004;
      rig.rotation.y -= dx * yawSpeed;
      // clamp pitch by rotating camera local x
      euler.setFromQuaternion(camera.quaternion);
      euler.x -= dy * pitchSpeed;
      euler.x = Math.max(-1.2, Math.min(1.2, euler.x));
      camera.quaternion.setFromEuler(euler);
    } else if (state.move.active && e.touches.length >= 2){
      const t0 = e.touches[0], t1 = e.touches[1];
      const mx = (t0.clientX+t1.clientX)/2;
      const my = (t0.clientY+t1.clientY)/2;
      const dxm = mx - state.move.x;
      const dym = my - state.move.y;
      state.move.x = mx; state.move.y = my;

      // Move on XZ plane relative to rig yaw
      const speed = 0.01;
      tmpV.set(-dxm*speed, 0, -dym*speed);
      tmpV.applyAxisAngle(new THREE.Vector3(0,1,0), rig.rotation.y);
      rig.position.add(tmpV);
    }
  }

  function onTouchEnd(e){
    if (e.touches.length === 0){
      state.look.active = false;
      state.move.active = false;
    } else if (e.touches.length === 1){
      // revert to look
      const t = e.touches[0];
      state.move.active = false;
      state.look.active = true;
      state.look.id = t.identifier;
      state.look.x = t.clientX;
      state.look.y = t.clientY;
    }
  }

  window.addEventListener("touchstart", onTouchStart, { passive:true });
  window.addEventListener("touchmove", onTouchMove, { passive:true });
  window.addEventListener("touchend", onTouchEnd, { passive:true });
  window.addEventListener("touchcancel", onTouchEnd, { passive:true });

  // WASD
  window.addEventListener("keydown", (e)=>{ state.keys[e.code]=true; if (e.code==="KeyP") setSpawnHere(); });
  window.addEventListener("keyup", (e)=>{ state.keys[e.code]=false; });

  function update(){
    if (renderer.xr.isPresenting) return; // keep it simple in XR for now
    const forward = (state.keys["KeyW"]?1:0) - (state.keys["KeyS"]?1:0);
    const strafe  = (state.keys["KeyD"]?1:0) - (state.keys["KeyA"]?1:0);
    if (!forward && !strafe) return;
    const spd = 0.06;
    tmpV.set(strafe*spd, 0, -forward*spd);
    tmpV.applyAxisAngle(new THREE.Vector3(0,1,0), rig.rotation.y);
    rig.position.add(tmpV);
  }

  return {
    get teleportEnabled(){ return state.teleportEnabled; },
    setTeleportEnabled,
    teleportTo,
    resetToSpawn,
    update,
  };
}
