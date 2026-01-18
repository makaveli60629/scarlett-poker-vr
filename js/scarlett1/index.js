import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { buildWorld } from "../world.js";

export function startScarlettRuntime(){
  const d = window.__scarlettDiagWrite || function(m){ console.log(m); };
  d("[scarlett1] LIVE_FINGERPRINT ✅ SCARLETT1_FULL_RUNTIME_v2_2");

  const app = document.getElementById("app");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020308);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 120);

  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

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

  const hemi = new THREE.HemisphereLight(0xffffff, 0x1b1b1b, 1.1);
  scene.add(hemi);

  const spot = new THREE.SpotLight(0xffffff, 1.2, 30, Math.PI/6, 0.4, 1.0);
  spot.position.set(3, 5.5, 3);
  scene.add(spot);

  const rig = new THREE.Group();
  rig.position.set(0, 0, 5);
  rig.add(camera);
  scene.add(rig);

  const built = buildWorld(THREE, scene);
  const floor = built.floor;

  // Non-VR: drag to look, tap floor to move
  let isLook=false;
  let lastX=0;
  let yaw=0;

  function pd(e){
    isLook=true;
    lastX = (e.clientX!=null)?e.clientX:((e.touches&&e.touches[0])?e.touches[0].clientX:0);
  }
  function pu(){ isLook=false; }
  function pm(e){
    if(!isLook) return;
    const x = (e.clientX!=null)?e.clientX:((e.touches&&e.touches[0])?e.touches[0].clientX:0);
    const dx = x-lastX;
    lastX=x;
    yaw += dx*0.005;
    rig.rotation.y = yaw;
  }

  window.addEventListener("pointerdown", pd, {passive:true});
  window.addEventListener("pointerup", pu, {passive:true});
  window.addEventListener("pointermove", pm, {passive:true});
  window.addEventListener("touchstart", pd, {passive:true});
  window.addEventListener("touchend", pu, {passive:true});
  window.addEventListener("touchmove", pm, {passive:true});

  function clickMove(e){
    const rect = renderer.domElement.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const my = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(mx,my), camera);
    const hits = ray.intersectObject(floor, false);
    if(hits && hits.length){
      const p = hits[0].point;
      rig.position.x = p.x;
      rig.position.z = p.z;
    }
  }
  window.addEventListener("click", clickMove, {passive:true});

  // XR: teleport + sticks
  const controllers=[];
  const tempMat=new THREE.Matrix4();
  const raycaster=new THREE.Raycaster();

  const reticle=new THREE.Mesh(
    new THREE.RingGeometry(0.12,0.16,24),
    new THREE.MeshStandardMaterial({ color:0x66ccff, side:THREE.DoubleSide })
  );
  reticle.rotation.x = -Math.PI/2;
  reticle.visible=false;
  scene.add(reticle);

  function setupController(i){
    const c = renderer.xr.getController(i);
    c.userData.teleportPoint=null;

    c.addEventListener("selectend", function(){
      if(window.SCARLETT && window.SCARLETT.teleportOn && c.userData.teleportPoint){
        rig.position.x = c.userData.teleportPoint.x;
        rig.position.z = c.userData.teleportPoint.z;
        reticle.visible=false;
        c.userData.teleportPoint=null;
      }
    });

    scene.add(c);
    controllers.push(c);
  }
  setupController(0);
  setupController(1);

  function updateTeleport(){
    if(!(window.SCARLETT && window.SCARLETT.teleportOn)){
      reticle.visible=false;
      if(controllers[0]) controllers[0].userData.teleportPoint=null;
      return;
    }
    const c = controllers[0];
    if(!c) return;

    tempMat.identity();
    tempMat.extractRotation(c.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(c.matrixWorld);
    raycaster.ray.direction.set(0,0,-1).applyMatrix4(tempMat);

    const hits = raycaster.intersectObject(floor, false);
    if(hits && hits.length){
      const p = hits[0].point;
      reticle.position.set(p.x, 0.01, p.z);
      reticle.visible=true;
      c.userData.teleportPoint=p;
    }else{
      reticle.visible=false;
      c.userData.teleportPoint=null;
    }
  }

  function dz(v){ return (Math.abs(v)<0.15)?0:v; }

  function applySticks(dt){
    if(!(window.SCARLETT && window.SCARLETT.sticksOn)) return;
    const session = renderer.xr.getSession ? renderer.xr.getSession() : null;
    if(!session || !session.inputSources) return;

    let moveX=0, moveY=0, turnX=0;

    for(let i=0;i<session.inputSources.length;i++){
      const src = session.inputSources[i];
      const gp = (src && src.gamepad) ? src.gamepad : null;
      if(!gp || !gp.axes) continue;

      if(i===0){
        moveX = gp.axes.length>0 ? gp.axes[0] : 0;
        moveY = gp.axes.length>1 ? gp.axes[1] : 0;
      }else if(i===1){
        turnX = gp.axes.length>2 ? gp.axes[2] : (gp.axes.length>0 ? gp.axes[0] : 0);
      }
    }

    moveX=dz(moveX); moveY=dz(moveY); turnX=dz(turnX);

    const speed=2.0;
    const turnSpeed=1.6;

    rig.rotation.y -= turnX * turnSpeed * dt;

    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(rig.quaternion);
    const right = new THREE.Vector3(1,0,0).applyQuaternion(rig.quaternion);
    forward.y=0; right.y=0;
    forward.normalize(); right.normalize();

    const delta = new THREE.Vector3();
    delta.addScaledVector(right, moveX * speed * dt);
    delta.addScaledVector(forward, moveY * speed * dt);
    rig.position.add(delta);
  }

  window.__scarlettEnterVR = async function(){
    if(!navigator.xr){ d("[xr] navigator.xr not available"); return; }
    const session = await navigator.xr.requestSession("immersive-vr", { requiredFeatures:["local-floor"] });
    await renderer.xr.setSession(session);
    d("[xr] session started ✅");
  };

  let t=0;
  let last=performance.now();
  renderer.setAnimationLoop(function(){
    const now=performance.now();
    const dt=Math.min(0.05, (now-last)/1000);
    last=now;

    t += dt;
    // bots bob + "playing" gesture (tiny)
    for(let i=0;i<built.bots.length;i++){
      built.bots[i].position.y = 0.02*Math.sin(t*1.3 + i);
      built.bots[i].rotation.y += 0.002*Math.sin(t*0.7+i);
    }

    // cards gentle hover on the mirror layer
    for(let i=0;i<built.cards.length;i++){
      if(i%2===1){ // hover layer
        built.cards[i].position.y = 1.32 + 0.01*Math.sin(t*2.0 + i);
      }
    }

    updateTeleport();
    applySticks(dt);

    renderer.render(scene, camera);
  });

  d("[status] renderer OK ✅");
  d("[status] world ready ✅");
  d("[status] bots playing ✅");
}
