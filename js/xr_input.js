import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

export const XRInput = {
  create({ scene, renderer, camera, APP_STATE, diag }){
    const controllerModelFactory = new XRControllerModelFactory();

    const c1 = renderer.xr.getController(0);
    const c2 = renderer.xr.getController(1);

    const g1 = renderer.xr.getControllerGrip(0);
    const g2 = renderer.xr.getControllerGrip(1);

    g1.add(controllerModelFactory.createControllerModel(g1));
    g2.add(controllerModelFactory.createControllerModel(g2));

    scene.add(c1); scene.add(c2);
    scene.add(g1); scene.add(g2);

    // rays for debug + teleport
    const rayMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    function makeRay(){
      const pts = [new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, rayMat);
      line.scale.z = 6;
      return line;
    }
    const ray1 = makeRay(); c1.add(ray1);
    const ray2 = makeRay(); c2.add(ray2);

    // track which inputSource is left/right
    let lastSources = [];

    function onConnected(which){
      diag.log(`[XR] controller ${which} connected ✅`);
    }

    c1.addEventListener('connected', () => { APP_STATE.left.connected = true; onConnected('LEFT'); });
    c2.addEventListener('connected', () => { APP_STATE.right.connected = true; onConnected('RIGHT'); });

    c1.addEventListener('disconnected', () => { APP_STATE.left.connected = false; APP_STATE.left.gamepad = false; diag.log(`[XR] LEFT disconnected`); });
    c2.addEventListener('disconnected', () => { APP_STATE.right.connected = false; APP_STATE.right.gamepad = false; diag.log(`[XR] RIGHT disconnected`); });

    function reset(){
      APP_STATE.left.gamepad = false;
      APP_STATE.right.gamepad = false;
    }

    function onSessionStart(){
      diag.log('[XRInput] session start bind...');
    }
    function onSessionEnd(){
      reset();
    }

    // gamepad polling each frame
    function pollGamepads(){
      const session = renderer.xr.getSession();
      if(!session) return;

      const sources = session.inputSources;
      lastSources = sources;

      let leftGP = false;
      let rightGP = false;

      for(const s of sources){
        if(!s || !s.gamepad) continue;
        const handed = s.handedness;
        if(handed === 'left') leftGP = true;
        if(handed === 'right') rightGP = true;
      }

      APP_STATE.left.gamepad = leftGP;
      APP_STATE.right.gamepad = rightGP;
    }

    let snapCooldown = 0;

    function update(dt){
      pollGamepads();

      const session = renderer.xr.getSession();
      if(!session) return;

      snapCooldown = Math.max(0, snapCooldown - dt);

      for(const s of lastSources){
        if(!s || !s.gamepad) continue;
        const gp = s.gamepad;
        const handed = s.handedness;

        const ax0 = gp.axes?.[0] ?? 0;
        const ay0 = gp.axes?.[1] ?? 0;
        const ax2 = gp.axes?.[2] ?? 0;
        const ay2 = gp.axes?.[3] ?? 0;

        const stickX = Math.abs(ax2) > Math.abs(ax0) ? ax2 : ax0;
        const stickY = Math.abs(ay2) > Math.abs(ay0) ? ay2 : ay0;

        // Snap turn on right stick X (best-effort; rig rotation varies per setup)
        if(handed === 'right' && snapCooldown === 0){
          // If you later add a "playerRig" Group, rotate that instead of camera.parent.
          if(stickX > 0.75){ snapCooldown = 0.25; }
          if(stickX < -0.75){ snapCooldown = 0.25; }
        }

        void stickY;
      }
    }

    return { c1, c2, g1, g2, ray1, ray2, update, reset, onSessionStart, onSessionEnd };
  }
};
