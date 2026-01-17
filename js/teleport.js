import * as THREE from 'three';

export const Teleport = {
  create({ scene, renderer, camera, APP_STATE, diag }){
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

    function onSessionStart(){
      diag.log('[Teleport] session start');
    }
    function onSessionEnd(){
      reset();
    }

    function intersectFromController(ctrl){
      if(!ctrl) return null;

      tempMat.identity().extractRotation(ctrl.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
      raycaster.ray.direction.set(0,0,-1).applyMatrix4(tempMat);

      const hits = raycaster.intersectObjects(floors, false);
      return hits?.[0] || null;
    }

    function update(){
      if(!APP_STATE.inXR) { reticle.visible = false; return; }
      if(!APP_STATE.teleportEnabled) { reticle.visible = false; return; }

      const ctrlRight = renderer.xr.getController(1);
      const ctrlLeft  = renderer.xr.getController(0);
      const ctrl = ctrlRight || ctrlLeft;

      const hit = intersectFromController(ctrl);
      if(hit){
        reticle.visible = true;
        reticle.position.copy(hit.point);
      } else {
        reticle.visible = false;
      }

      const session = renderer.xr.getSession();
      if(!session) return;

      for(const s of session.inputSources){
        if(!s || !s.gamepad) continue;
        if(s.handedness !== 'right') continue;

        const gp = s.gamepad;
        const trigger = gp.buttons?.[0];
        if(trigger && trigger.pressed && hit){
          const rig = camera.parent || camera;
          rig.position.set(hit.point.x, rig.position.y, hit.point.z);
          diag.log(`[teleport] -> (${hit.point.x.toFixed(2)}, ${hit.point.z.toFixed(2)})`);
        }
      }
    }

    return { setFloors, update, reset, onSessionStart, onSessionEnd };
  }
};
