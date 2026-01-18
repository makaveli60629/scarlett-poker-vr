import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { buildWorld } from "../world.js";

export function startScarlettRuntime(){
  const d = window.__scarlettDiagWrite || function(m){ console.log(m); };
  d("[scarlett1] LIVE_FINGERPRINT ✅ SCARLETT1_FULL_RUNTIME_v2_3_INPUTFIX");

  const app = document.getElementById("app");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020308);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 120);

  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  // HUD clickable
  renderer.domElement.style.pointerEvents = "none";
  renderer.domElement.style.position = "fixed";
  renderer.domElement.style.left = "0";
  renderer.domElement.style.top = "0";

  app.appendChild(renderer.domElement);

  window.addEventListener("resize", function(){
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  scene.add(new THREE.HemisphereLight(0xffffff, 0x1b1b1b, 1.1));

  const spot = new THREE.SpotLight(0xffffff, 1.2, 30, Math.PI/6, 0.4, 1.0);
  spot.position.set(3, 5.5, 3);
  scene.add(spot);

  // player rig
  const rig = new THREE.Group();
  rig.position.set(0, 0, 5);
  rig.add(camera);
  scene.add(rig);

  const built = buildWorld(THREE, scene);
  const floor = built.floor;

  // --- XR controllers
  const controllers = [];
  const raycaster = new THREE.Raycaster();
  const tempMat = new THREE.Matrix4();

  function setupController(i){
    const c = renderer.xr.getController(i);
    c.userData.teleportPoint = null;
    c.userData.isAiming = false;

    c.addEventListener("selectstart", function(){ c.userData.isAiming = true; });
    c.addEventListener("selectend", function(){
      c.userData.isAiming = false;
      if(window.SCARLETT && window.SCARLETT.teleportOn && c.userData.teleportPoint){
        rig.position.x = c.userData.teleportPoint.x;
        rig.position.z = c.userData.teleportPoint.z;
        c.userData.teleportPoint = null;
      }
    });

    scene.add(c);
    controllers.push(c);
  }
  setupController(0);
  setupController(1);

  // Reticle + visible beam (so you can SEE the ray)
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.12,0.16,24),
    new THREE.MeshStandardMaterial({ color:0x66ccff, side:THREE.DoubleSide })
  );
  reticle.rotation.x = -Math.PI/2;
  reticle.visible = false;
  scene.add(reticle);

  const beamGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0,0,0),
    new THREE.Vector3(0,0,-1)
  ]);
  const beamMat = new THREE.LineBasicMaterial({ color: 0x66ccff });
  const beam = new THREE.Line(beamGeo, beamMat);
  beam.visible = false;
  scene.add(beam);

  function updateTeleport(){
    if(!(window.SCARLETT && window.SCARLETT.teleportOn)){
      reticle.visible = false;
      beam.visible = false;
      for(let i=0;i<controllers.length;i++) controllers[i].userData.teleportPoint = null;
      return;
    }

    // pick the controller that's currently aiming, otherwise use first
    let c = null;
    for(let i=0;i<controllers.length;i++){
      if(controllers[i].userData.isAiming){ c = controllers[i]; break; }
    }
    if(!c) c = controllers[0];
    if(!c) return;

    tempMat.identity().extractRotation(c.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(c.matrixWorld);
    raycaster.ray.direction.set(0,0,-1).applyMatrix4(tempMat);

    const hits = raycaster.intersectObject(floor, false);
    if(hits && hits.length){
      const p = hits[0].point;
      reticle.position.set(p.x, 0.01, p.z);
      reticle.visible = true;
      c.userData.teleportPoint = p;

      // beam from controller to hit point
      beam.visible = true;
      const a = raycaster.ray.origin.clone();
      const b = p.clone();
      beam.geometry.setFromPoints([a, b]);
    }else{
      reticle.visible = false;
      beam.visible = false;
      c.userData.teleportPoint = null;
    }
  }

  // --- Stick input (AUTO-map)
  function dz(v){ return (Math.abs(v)<0.18)?0:v; }

  // snap turn (45 degrees)
  let snapCooldown = 0;

  function applyMovement(dt){
    if(!(window.SCARLETT && window.SCARLETT.sticksOn)) return;

    const session = renderer.xr.getSession ? renderer.xr.getSession() : null;
    if(!session || !session.inputSources) return;

    // Gather all axes from all controllers
    const axesList = [];
    for(let i=0;i<session.inputSources.length;i++){
      const src = session.inputSources[i];
      const gp = (src && src.gamepad) ? src.gamepad : null;
      if(!gp || !gp.axes) continue;
      axesList.push(gp.axes);
    }
    if(!axesList.length) return;

    // Heuristic:
    // - movement uses the first (x,y) pair that has magnitude
    // - turn uses the first x-axis that has magnitude after movement is found
    let moveX=0, moveY=0, turnX=0;

    // find move
    for(let a=0;a<axesList.length;a++){
      const ax = axesList[a];
      if(ax.length >= 2){
        const x = dz(ax[0]);
        const y = dz(ax[1]);
        if(Math.abs(x) + Math.abs(y) > 0){
          moveX = x; moveY = y;
          break;
        }
      }
    }

    // find turn (try common axes: 2 or 0)
    for(let a=0;a<axesList.length;a++){
      const ax = axesList[a];
      let cand = 0;
      if(ax.length >= 4) cand = dz(ax[2]);
      else if(ax.length >= 1) cand = dz(ax[0]);
      // ignore if it equals moveX exactly (same stick)
      if(Math.abs(cand) > 0 && Math.abs(cand - moveX) > 0.05){
        turnX = cand;
        break;
      }
    }

    // movement speed
    const speed = 2.0;

    // apply movement in rig space
    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(rig.quaternion);
    const right = new THREE.Vector3(1,0,0).applyQuaternion(rig.quaternion);
    forward.y = 0; right.y = 0;
    forward.normalize(); right.normalize();

    const delta = new THREE.Vector3();
    delta.addScaledVector(right, moveX * speed * dt);
    delta.addScaledVector(forward, moveY * speed * dt);
    rig.position.add(delta);

    // snap turn
    snapCooldown = Math.max(0, snapCooldown - dt);
    if(snapCooldown === 0 && Math.abs(turnX) > 0.7){
      rig.rotation.y -= Math.sign(turnX) * (Math.PI/4);
      snapCooldown = 0.25;
    }
  }

  // Enter VR
  window.__scarlettEnterVR = async function(){
    if(!navigator.xr){ d("[xr] navigator.xr not available"); return; }
    const session = await navigator.xr.requestSession("immersive-vr", { requiredFeatures:["local-floor"] });
    await renderer.xr.setSession(session);
    d("[xr] session started ✅");
  };

  // bots “playing” animation + cards hover
  let t=0;
  let last=performance.now();
  renderer.setAnimationLoop(function(){
    const now=performance.now();
    const dt=Math.min(0.05, (now-last)/1000);
    last=now;

    t += dt;
    for(let i=0;i<built.bots.length;i++){
      built.bots[i].position.y = 0.02*Math.sin(t*1.3 + i);
      built.bots[i].rotation.y += 0.002*Math.sin(t*0.7+i);
    }
    for(let i=0;i<built.cards.length;i++){
      if(i%2===1){
        built.cards[i].position.y = 1.32 + 0.01*Math.sin(t*2.0 + i);
      }
    }

    updateTeleport();
    applyMovement(dt);

    renderer.render(scene, camera);
  });

  d("[status] renderer OK ✅");
  d("[status] world ready ✅");
  d("[status] bots playing ✅");
        }
