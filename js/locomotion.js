import * as THREE from 'three';

export const Locomotion = {
  create({ renderer, camera, APP_STATE, diag, playerRig }){
    // Tuning
    const SPEED = 1.6;        // meters/sec
    const STRAFE = 1.4;       // meters/sec
    const DEADZONE = 0.18;
    const SNAP_DEG = 30 * Math.PI/180;
    let snapCooldown = 0;

    const fwd = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0,1,0);

    function reset(){
      snapCooldown = 0;
    }

    function onSessionStart(){ diag.log('[Move] thumbstick locomotion enabled'); }
    function onSessionEnd(){ reset(); }

    function update(dt){
      if(!APP_STATE.inXR) return;

      const session = renderer.xr.getSession();
      if(!session) return;

      // Find left + right gamepads
      let leftGP = null;
      let rightGP = null;
      for(const s of session.inputSources){
        if(!s || !s.gamepad) continue;
        if(s.handedness === 'left') leftGP = s.gamepad;
        if(s.handedness === 'right') rightGP = s.gamepad;
      }

      // Left stick move (axes 2/3 or 0/1 depending on device)
      if(leftGP){
        const ax0 = leftGP.axes?.[0] ?? 0;
        const ay0 = leftGP.axes?.[1] ?? 0;
        const ax2 = leftGP.axes?.[2] ?? 0;
        const ay2 = leftGP.axes?.[3] ?? 0;

        const sx = Math.abs(ax2) > Math.abs(ax0) ? ax2 : ax0;
        const sy = Math.abs(ay2) > Math.abs(ay0) ? ay2 : ay0;

        const dx = Math.abs(sx) < DEADZONE ? 0 : sx;
        const dz = Math.abs(sy) < DEADZONE ? 0 : sy;

        if(dx || dz){
          // Camera forward on XZ
          camera.getWorldDirection(fwd);
          fwd.y = 0;
          fwd.normalize();
          right.copy(fwd).cross(up).normalize();

          // Note: stick forward is typically negative Y
          const forwardMove = -dz * SPEED * dt;
          const strafeMove  = dx * STRAFE * dt;

          playerRig.position.addScaledVector(fwd, forwardMove);
          playerRig.position.addScaledVector(right, strafeMove);
        }
      }

      // Right stick snap turn (X)
      if(rightGP){
        snapCooldown = Math.max(0, snapCooldown - dt);

        const ax0 = rightGP.axes?.[0] ?? 0;
        const ax2 = rightGP.axes?.[2] ?? 0;
        const sx = Math.abs(ax2) > Math.abs(ax0) ? ax2 : ax0;

        if(snapCooldown === 0){
          if(sx > 0.75){
            playerRig.rotation.y -= SNAP_DEG;
            snapCooldown = 0.22;
          } else if(sx < -0.75){
            playerRig.rotation.y += SNAP_DEG;
            snapCooldown = 0.22;
          }
        }
      }
    }

    return { update, reset, onSessionStart, onSessionEnd };
  }
};
