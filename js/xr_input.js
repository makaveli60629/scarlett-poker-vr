import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

export const XRInput = {
  create({ scene, renderer, APP_STATE, diag, playerRig }){
    const factory = new XRControllerModelFactory();

    // Controllers + grips
    const ctrlLeft  = renderer.xr.getController(0);
    const ctrlRight = renderer.xr.getController(1);
    const gripLeft  = renderer.xr.getControllerGrip(0);
    const gripRight = renderer.xr.getControllerGrip(1);

    gripLeft.add(factory.createControllerModel(gripLeft));
    gripRight.add(factory.createControllerModel(gripRight));

    // IMPORTANT:
    // Parent controllers under the playerRig so when rig teleports, the rays/controllers move with you.
    // This fixes the “laser stuck at the table” feeling.
    playerRig.add(ctrlLeft);
    playerRig.add(ctrlRight);
    playerRig.add(gripLeft);
    playerRig.add(gripRight);

    // Visible rays
    const rayMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    function addRay(ctrl){
      const pts = [new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, rayMat);
      line.name = "RAY";
      line.scale.z = 6;
      ctrl.add(line);
    }
    addRay(ctrlLeft);
    addRay(ctrlRight);

    function reset(){
      APP_STATE.left.gamepad = false;
      APP_STATE.right.gamepad = false;
    }

    function onSessionStart(){ diag.log('[XRInput] session start'); }
    function onSessionEnd(){ reset(); }

    function pollGamepads(){
      const session = renderer.xr.getSession();
      if(!session) return;

      let leftGP = false, rightGP = false;
      for(const s of session.inputSources){
        if(!s || !s.gamepad) continue;
        if(s.handedness === 'left') leftGP = true;
        if(s.handedness === 'right') rightGP = true;
      }
      APP_STATE.left.gamepad = leftGP;
      APP_STATE.right.gamepad = rightGP;
    }

    ctrlLeft.addEventListener('connected', () => { APP_STATE.left.connected = true; diag.log('[XR] LEFT connected ✅'); });
    ctrlRight.addEventListener('connected', () => { APP_STATE.right.connected = true; diag.log('[XR] RIGHT connected ✅'); });
    ctrlLeft.addEventListener('disconnected', () => { APP_STATE.left.connected = false; APP_STATE.left.gamepad = false; diag.log('[XR] LEFT disconnected'); });
    ctrlRight.addEventListener('disconnected', () => { APP_STATE.right.connected = false; APP_STATE.right.gamepad = false; diag.log('[XR] RIGHT disconnected'); });

    function update(dt){
      pollGamepads();
      void dt;
    }

    return { update, reset, onSessionStart, onSessionEnd, ctrlLeft, ctrlRight, gripLeft, gripRight };
  }
};
