import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

export const Controls = {
  create({ renderer, scene, camera, rig, state, setStatus }){
    const raycaster = new THREE.Raycaster();
    const tmpVec = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();

    // Touch joystick
    const stick = document.getElementById("stick");
    const stickDot = document.getElementById("stickDot");
    let touchActive = false;
    let touchCenter = {x:0,y:0};
    let touchVec = {x:0,y:0};

    const btnReset = document.getElementById("btnReset");
    const btnAudio = document.getElementById("btnAudio");
    const btnMenu  = document.getElementById("btnMenu");

    // Desktop fallback keys (if ever)
    const keys = { w:0,a:0,s:0,d:0 };

    // Snap turn
    let snapCooldown = 0;

    // Teleport
    const floor = scene.getObjectByName("WORLD_FLOOR"); // created in world.js
    const teleportRing = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.26, 32),
      new THREE.MeshBasicMaterial({ color: 0x00d0ff, transparent:true, opacity:0.7, side:THREE.DoubleSide })
    );
    teleportRing.rotation.x = -Math.PI/2;
    teleportRing.visible = false;
    scene.add(teleportRing);

    // Controllers
    const controller1 = renderer.xr.getController(0);
    const controller2 = renderer.xr.getController(1);
    scene.add(controller1, controller2);

    const controllerGrip1 = renderer.xr.getControllerGrip(0);
    const controllerGrip2 = renderer.xr.getControllerGrip(1);
    const cmf = new XRControllerModelFactory();
    controllerGrip1.add(cmf.createControllerModel(controllerGrip1));
    controllerGrip2.add(cmf.createControllerModel(controllerGrip2));
    scene.add(controllerGrip1, controllerGrip2);

    const rayLineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
    const rayLineMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
    const rayLine1 = new THREE.Line(rayLineGeom, rayLineMat);
    rayLine1.scale.z = 8;
    controller1.add(rayLine1);

    function setStickDot(x,y){
      stickDot.style.transform = `translate(${x}px, ${y}px)`;
    }
    function resetStick(){
      touchVec.x = 0; touchVec.y = 0;
      stickDot.style.transform = `translate(0px, 0px)`;
    }

    // Touch stick handlers
    stick.addEventListener("touchstart", (e) => {
      const t = e.touches[0];
      touchActive = true;
      touchCenter = { x: t.clientX, y: t.clientY };
    }, { passive:true });

    stick.addEventListener("touchmove", (e) => {
      if(!touchActive) return;
      const t = e.touches[0];
      const dx = t.clientX - touchCenter.x;
      const dy = t.clientY - touchCenter.y;
      const max = 48;
      const clx = Math.max(-max, Math.min(max, dx));
      const cly = Math.max(-max, Math.min(max, dy));
      touchVec.x = clx / max;
      touchVec.y = cly / max;
      setStickDot(clx, cly);
    }, { passive:true });

    stick.addEventListener("touchend", () => { touchActive = false; resetStick(); }, { passive:true });

    // Buttons
    btnReset.addEventListener("click", () => api.onReset && api.onReset());
    btnAudio.addEventListener("click", () => api.onAudio && api.onAudio());
    btnMenu .addEventListener("click", () => api.onMenu  && api.onMenu());

    // Keyboard fallback
    window.addEventListener("keydown", (e)=>{
      const k = e.key.toLowerCase();
      if(k==="w") keys.w=1;
      if(k==="a") keys.a=1;
      if(k==="s") keys.s=1;
      if(k==="d") keys.d=1;
      if(k==="m") api.onMenu && api.onMenu();
    });
    window.addEventListener("keyup", (e)=>{
      const k = e.key.toLowerCase();
      if(k==="w") keys.w=0;
      if(k==="a") keys.a=0;
      if(k==="s") keys.s=0;
      if(k==="d") keys.d=0;
    });

    // VR controller input
    let lastAxes = { lx:0, ly:0, rx:0, ry:0 };
    function readGamepad(controller){
      const gp = controller?.gamepad;
      if(!gp) return null;
      const ax = gp.axes || [];
      const btn = gp.buttons || [];
      return { ax, btn };
    }

    function updateTeleportPreview(){
      teleportRing.visible = false;
      if(!renderer.xr.isPresenting) return;

      // Use controller1 ray
      tmpVec.set(0,0,-1).applyQuaternion(controller1.quaternion);
      raycaster.set(controller1.getWorldPosition(new THREE.Vector3()), tmpVec);

      const hits = floor ? raycaster.intersectObject(floor, false) : [];
      if(hits.length){
        const p = hits[0].point;
        teleportRing.position.copy(p);
        teleportRing.position.y += 0.01;
        teleportRing.visible = true;
      }
    }

    function tryTeleport(){
      if(!teleportRing.visible) return;
      // Move rig so camera ends up at ring position
      const camWorld = camera.getWorldPosition(new THREE.Vector3());
      const rigWorld = rig.getWorldPosition(new THREE.Vector3());
      const offset = camWorld.sub(rigWorld); // camera offset inside rig
      const target = teleportRing.position.clone().sub(offset);
      rig.position.x = target.x;
      rig.position.z = target.z;
      // keep y at 0 (world ground)
      rig.position.y = 0;
    }

    // Trigger teleport on select
    controller1.addEventListener("selectstart", () => {
      if(state.canMove) tryTeleport();
    });

    const api = {
      onMenu:null,
      onReset:null,
      onAudio:null,
      update(dt){
        // Show teleport halo in VR
        updateTeleportPreview();

        if(!state.canMove) return;

        // Movement vector from touch + keys + VR sticks
        let moveX = touchVec.x + (keys.d - keys.a);
        let moveZ = -touchVec.y + (keys.s - keys.w);

        // VR sticks (prefer left stick)
        const gp = readGamepad(controller1) || readGamepad(controller2);
        if(gp){
          // axes vary by device; common: [lx,ly,rx,ry]
          const ax = gp.ax;
          const lx = ax[0] ?? 0;
          const ly = ax[1] ?? 0;
          const rx = ax[2] ?? 0;
          const ry = ax[3] ?? 0;

          // Left stick movement
          if(Math.abs(lx) > 0.15) moveX += lx;
          if(Math.abs(ly) > 0.15) moveZ += ly;

          // Right stick snap turn
          if(snapCooldown <= 0){
            if(rx > 0.6){
              rig.rotation.y -= THREE.MathUtils.degToRad(state.flags.snapTurnDegrees);
              snapCooldown = 0.22;
            } else if(rx < -0.6){
              rig.rotation.y += THREE.MathUtils.degToRad(state.flags.snapTurnDegrees);
              snapCooldown = 0.22;
            }
          }
          lastAxes = { lx, ly, rx, ry };

          // "Y" button menu (best-effort mapping)
          const yPressed = gp.btn?.[3]?.pressed || gp.btn?.[4]?.pressed; // varies
          if(yPressed && api.onMenu) {
            // simple edge detect
            if(!api._yDown){ api._yDown = true; api.onMenu(); }
          } else {
            api._yDown = false;
          }
        }

        snapCooldown = Math.max(0, snapCooldown - dt);

        // Apply move in rig space (camera forward)
        const speed = renderer.xr.isPresenting ? 1.55 : 1.25;
        const v = new THREE.Vector3(moveX, 0, moveZ);
        if(v.lengthSq() > 0.0001){
          v.normalize().multiplyScalar(speed * dt);
          // move relative to rig orientation (yaw)
          v.applyAxisAngle(new THREE.Vector3(0,1,0), rig.rotation.y);
          rig.position.add(v);
        }
      }
    };

    setStatus("Controls ready (Quest + Android).");
    return api;
  }
};
