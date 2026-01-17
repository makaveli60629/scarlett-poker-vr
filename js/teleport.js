import * as THREE from 'three';

export const Teleport = {
  create({ scene, renderer, APP_STATE, diag, playerRig, getController }){
    let floors = [];
    const raycaster = new THREE.Raycaster();
    const tempMat = new THREE.Matrix4();

    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.06, 0.085, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent:true, opacity:0.85 })
    );
    reticle.rotation.x = -Math.PI/2;
    reticle.visible = false;
    scene.add(reticle);

    function setFloors(list){ floors = Array.isArray(list) ? list : []; }
    function reset(){ reticle.visible = false; }

    function onSessionStart(){ diag.log('[Teleport] session start'); }
    function onSessionEnd(){ reset(); }

    function intersectFromController(ctrl){
      if(!ctrl) return null;
      tempMat.identity().extractRotation(ctrl.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
      raycaster.ray.direction.set(0,0,-1).applyMatrix4(tempMat);
      const hits = raycaster.intersectObjects(floors, false);
      return hits?.[0] || null;
    }

    let triggerLatch = false;

    function update(){
      if(!APP_STATE.inXR || !APP_STATE.teleportEnabled){
        reticle.visible = false;
        triggerLatch = false;
        return;
      }

      const ctrl = getController?.();
      const hit = intersectFromController(ctrl);
      if(hit){
        reticle.visible = true;
        reticle.position.copy(hit.point);
      } else {
        reticle.visible = false;
      }

      const session = renderer.xr.getSession();
      if(!session) return;

      // Right trigger teleports (button[0] usually trigger)
      let trigPressed = false;
      for(const s of session.inputSources){
        if(!s || !s.gamepad) continue;
        if(s.handedness !== 'right') continue;
        const gp = s.gamepad;
        const trigger = gp.buttons?.[0];
        trigPressed = !!(trigger && trigger.pressed);
      }

      if(trigPressed && !triggerLatch && hit){
        triggerLatch = true;

        // Teleport rig to hit point on XZ, keep Y.
        playerRig.position.set(hit.point.x, playerRig.position.y, hit.point.z);

        // Hide reticle momentarily to avoid “stuck ring” feeling
        reticle.visible = false;

        diag.log(`[teleport] -> (${hit.point.x.toFixed(2)}, ${hit.point.z.toFixed(2)})`);
      }

      if(!trigPressed) triggerLatch = false;
    }

    return { setFloors, update, reset, onSessionStart, onSessionEnd };
  }
};
