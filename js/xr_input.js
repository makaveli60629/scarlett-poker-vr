import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

export const XRInput = {
  create({ scene, renderer, APP_STATE, diag }){
    const controllerModelFactory = new XRControllerModelFactory();

    const cL = renderer.xr.getController(0);
    const cR = renderer.xr.getController(1);

    const gL = renderer.xr.getControllerGrip(0);
    const gR = renderer.xr.getControllerGrip(1);

    gL.add(controllerModelFactory.createControllerModel(gL));
    gR.add(controllerModelFactory.createControllerModel(gR));

    scene.add(cL); scene.add(cR);
    scene.add(gL); scene.add(gR);

    const rayMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    function makeRay(){
      const pts = [new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, rayMat);
      line.scale.z = 6;
      return line;
    }
    cL.add(makeRay());
    cR.add(makeRay());

    function reset(){
      APP_STATE.left.gamepad = false;
      APP_STATE.right.gamepad = false;
    }

    function onSessionStart(){ diag.log('[XRInput] session start'); }
    function onSessionEnd(){ reset(); }

    // Poll WebXR inputSources (this is what flips gamepad=true)
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

    // Track connected/disconnected events (best-effort; some browsers are inconsistent here)
    cL.addEventListener('connected', () => { APP_STATE.left.connected = true; diag.log('[XR] LEFT connected ✅'); });
    cR.addEventListener('connected', () => { APP_STATE.right.connected = true; diag.log('[XR] RIGHT connected ✅'); });
    cL.addEventListener('disconnected', () => { APP_STATE.left.connected = false; APP_STATE.left.gamepad = false; diag.log('[XR] LEFT disconnected'); });
    cR.addEventListener('disconnected', () => { APP_STATE.right.connected = false; APP_STATE.right.gamepad = false; diag.log('[XR] RIGHT disconnected'); });

    function update(){
      pollGamepads();
    }

    return { update, reset, onSessionStart, onSessionEnd };
  }
};
