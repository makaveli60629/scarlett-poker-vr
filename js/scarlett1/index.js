import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { buildWorld } from "../world.js";

export function startScarlettRuntime(){
  const d = window.__scarlettDiagWrite || ((m)=>console.log(m));
  d("[scarlett1] LIVE_FINGERPRINT ✅ SCARLETT1_STABLE_XR_v2_6");

  const app=document.getElementById("app");
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x020308);

  const camera=new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 140);

  const renderer=new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled=true;

  // keep HUD clickable
  renderer.domElement.style.pointerEvents="none";
  renderer.domElement.style.position="fixed";
  renderer.domElement.style.left="0";
  renderer.domElement.style.top="0";
  app.appendChild(renderer.domElement);

  window.addEventListener("resize", ()=>{
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  scene.add(new THREE.HemisphereLight(0xffffff, 0x1b1b1b, 1.2));
  const spot=new THREE.SpotLight(0xffffff, 1.5, 45, Math.PI/7, 0.4, 1.0);
  spot.position.set(4,6.5,4);
  scene.add(spot);

  // Rig
  const rig=new THREE.Group();
  rig.position.set(0,0,8.5);
  rig.add(camera);
  scene.add(rig);

  const built=buildWorld(THREE, scene);
  const floor=built.floor;

  window.__scarlettRespawn = function(id){
    const idx=(id|0)%built.padPositions.length;
    const p=built.padPositions[idx];
    rig.position.set(p.x,0,p.z);
    rig.rotation.y=0;
  };

  // Teleport reticle + beams attached to controllers
  const raycaster=new THREE.Raycaster();
  const tempMat=new THREE.Matrix4();

  const reticle=new THREE.Mesh(
    new THREE.RingGeometry(0.12,0.16,24),
    new THREE.MeshStandardMaterial({ color:0x66ccff, side:THREE.DoubleSide })
  );
  reticle.rotation.x=-Math.PI/2;
  reticle.visible=false;
  scene.add(reticle);

  function makeBeam(){
    const mat=new THREE.LineBasicMaterial({ color:0x66ccff });
    const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0,0,-1)]);
    const line=new THREE.Line(geo, mat);
    line.visible=false;
    return line;
  }

  const controllers=[];
  function setupController(i){
    const c=renderer.xr.getController(i);
    c.userData.teleportPoint=null;
    c.userData.aiming=false;
    c.userData.beam=makeBeam();
    c.add(c.userData.beam);
    scene.add(c);
    controllers.push(c);

    c.addEventListener("selectstart", ()=>{ c.userData.aiming=true; });
    c.addEventListener("selectend", ()=>{
      c.userData.aiming=false;
      if(window.SCARLETT?.teleportOn && c.userData.teleportPoint){
        rig.position.x=c.userData.teleportPoint.x;
        rig.position.z=c.userData.teleportPoint.z;
        c.userData.teleportPoint=null;
      }
    });
  }
  setupController(0); setupController(1);

  function updateTeleport(){
    if(!(window.SCARLETT && window.SCARLETT.teleportOn)){
      reticle.visible=false;
      for(const c of controllers){ c.userData.teleportPoint=null; c.userData.beam.visible=false; }
      return;
    }
    let chosen=null;
    const session=renderer.xr.getSession?renderer.xr.getSession():null;
    if(session && session.inputSources){
      for(let i=0;i<session.inputSources.length;i++){
        const src=session.inputSources[i];
        if(src && src.handedness==="left") chosen = controllers[i] || chosen;
      }
    }
    for(const c of controllers){ if(c.userData.aiming){ chosen=c; break; } }
    if(!chosen) chosen=controllers[0];
    if(!chosen) return;

    tempMat.identity().extractRotation(chosen.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(chosen.matrixWorld);
    raycaster.ray.direction.set(0,0,-1).applyMatrix4(tempMat);

    const hits=raycaster.intersectObject(floor,false);
    if(hits && hits.length){
      const p=hits[0].point;
      reticle.position.set(p.x,0.01,p.z);
      reticle.visible=true;
      chosen.userData.teleportPoint=p;

      chosen.userData.beam.visible=true;
      const localEnd = chosen.worldToLocal(p.clone());
      chosen.userData.beam.geometry.setFromPoints([new THREE.Vector3(0,0,0), localEnd]);
      chosen.userData.beam.geometry.attributes.position.needsUpdate=true;
    }else{
      reticle.visible=false;
      chosen.userData.teleportPoint=null;
      chosen.userData.beam.visible=false;
    }
  }

  // Movement: XR sticks + Android joystick
  const dz=(v)=>Math.abs(v)<0.18?0:v;
  const readMoveAxes=(gp)=>{
    if(!gp||!gp.axes) return {x:0,y:0};
    let x=gp.axes.length>0?gp.axes[0]:0;
    let y=gp.axes.length>1?gp.axes[1]:0;
    if(Math.abs(x)+Math.abs(y)<0.05 && gp.axes.length>=4){ x=gp.axes[2]; y=gp.axes[3]; }
    return {x:dz(x), y:dz(y)};
  };
  const readTurnAxis=(gp)=>{
    if(!gp||!gp.axes) return 0;
    let t = gp.axes.length>=3 ? gp.axes[2] : (gp.axes.length>=1?gp.axes[0]:0);
    if(Math.abs(t)<0.05 && gp.axes.length>=1) t=gp.axes[0];
    return dz(t);
  };
  let snapCooldown=0, axesLog=0;

  function applyMovement(dt){
    const speed=2.3;
    let moveX=0, moveY=0;

    // Android joystick (always active)
    const mm = window.SCARLETT?.mobileMove || {x:0,y:0};
    moveX = mm.x || 0;
    moveY = mm.y || 0;

    // XR sticks
    if(window.SCARLETT?.sticksOn){
      const session=renderer.xr.getSession?renderer.xr.getSession():null;
      if(session && session.inputSources){
        let leftGP=null,rightGP=null,anyGP=null;
        for(const src of session.inputSources){
          const gp=(src&&src.gamepad)?src.gamepad:null;
          if(!gp) continue;
          anyGP=anyGP||gp;
          if(src.handedness==="left") leftGP=gp;
          if(src.handedness==="right") rightGP=gp;
        }
        const mv=readMoveAxes(leftGP||anyGP);
        const turn=readTurnAxis(rightGP||anyGP);
        if(Math.abs(mv.x)+Math.abs(mv.y)>0){ moveX=mv.x; moveY=mv.y; }

        snapCooldown=Math.max(0,snapCooldown-dt);
        if(snapCooldown===0 && Math.abs(turn)>0.7){
          rig.rotation.y -= Math.sign(turn)*(Math.PI/4);
          snapCooldown=0.25;
        }

        // Controller shortcuts (work even if HUD hidden in VR)
        // Buttons: 1=squeeze (grip), 3=thumbstick click, 0/1 face buttons vary
        if(leftGP && leftGP.buttons){
          if(leftGP.buttons[1]?.pressed){ window.SCARLETT.teleportOn = !window.SCARLETT.teleportOn; }
          if(leftGP.buttons[3]?.pressed){ window.SCARLETT.sticksOn = !window.SCARLETT.sticksOn; }
          if(leftGP.buttons[0]?.pressed){ window.__scarlettRespawn?.((window.SCARLETT.spawnId=(window.SCARLETT.spawnId+1)%3)); }
        }
        if(rightGP && rightGP.buttons){
          if(rightGP.buttons[1]?.pressed){ window.SCARLETT.teleportOn = !window.SCARLETT.teleportOn; }
          if(rightGP.buttons[3]?.pressed){ window.SCARLETT.sticksOn = !window.SCARLETT.sticksOn; }
          if(rightGP.buttons[0]?.pressed){ window.__scarlettRespawn?.((window.SCARLETT.spawnId=(window.SCARLETT.spawnId+1)%3)); }
        }

        axesLog=Math.max(0,axesLog-dt);
        if(axesLog==0){
          axesLog=1.0;
          try{
            const lg=leftGP&&leftGP.axes?leftGP.axes.slice(0,6):null;
            const rg=rightGP&&rightGP.axes?rightGP.axes.slice(0,6):null;
            if(lg||rg) d("[axes] left="+(lg?JSON.stringify(lg):"null")+" right="+(rg?JSON.stringify(rg):"null"));
          }catch(_){}
        }
      }
    }

    const forward=new THREE.Vector3(0,0,-1).applyQuaternion(rig.quaternion);
    const right=new THREE.Vector3(1,0,0).applyQuaternion(rig.quaternion);
    forward.y=0; right.y=0; forward.normalize(); right.normalize();

    rig.position.addScaledVector(right, moveX*speed*dt);
    rig.position.addScaledVector(forward, moveY*speed*dt);
  }

  // Non-VR look + click-to-move
  let isLook=false, lastX=0, yaw=0;
  function pd(e){ isLook=true; lastX=(e.clientX!=null)?e.clientX:((e.touches&&e.touches[0])?e.touches[0].clientX:0); }
  function pu(){ isLook=false; }
  function pm(e){
    if(!isLook) return;
    const x=(e.clientX!=null)?e.clientX:((e.touches&&e.touches[0])?e.touches[0].clientX:0);
    const dx=x-lastX; lastX=x;
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
    const rect=renderer.domElement.getBoundingClientRect();
    const mx=((e.clientX-rect.left)/rect.width)*2-1;
    const my=-(((e.clientY-rect.top)/rect.height)*2-1);
    const rc=new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2(mx,my), camera);
    const hits=rc.intersectObject(floor,false);
    if(hits && hits.length){
      const p=hits[0].point;
      rig.position.x=p.x; rig.position.z=p.z;
    }
  }
  window.addEventListener("click", clickMove, {passive:true});

  // XR enter — avoid Quest “infinite loading”: try features progressively
  window.__scarlettEnterVR = async ()=>{
    if(!navigator.xr){ d("[xr] navigator.xr not available"); return; }
    d("[xr] requestSession…");
    const tryReq = async (optsLabel, opts) => {
      d("[xr] trying "+optsLabel);
      const p = navigator.xr.requestSession("immersive-vr", opts);
      // timeout guard (Quest sometimes hangs)
      const timeout = new Promise((_,rej)=>setTimeout(()=>rej(new Error("requestSession timeout")), 8000));
      return Promise.race([p, timeout]);
    };

    let session=null, lastErr=null;
    try{
      session = await tryReq("local-floor+dom-overlay(optional)", {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["dom-overlay","bounded-floor","local"],
        domOverlay: { root: document.body }
      });
    }catch(e){ lastErr=e; }

    if(!session){
      try{
        session = await tryReq("local-floor only", { requiredFeatures:["local-floor"], optionalFeatures:["bounded-floor","local"] });
      }catch(e){ lastErr=e; }
    }
    if(!session){
      try{
        session = await tryReq("local (fallback)", { requiredFeatures:["local"], optionalFeatures:["bounded-floor"] });
      }catch(e){ lastErr=e; }
    }

    if(!session){
      d("[xr] requestSession failed ❌ "+(lastErr&&lastErr.message?lastErr.message:String(lastErr)));
      throw lastErr;
    }

    session.addEventListener("end", ()=>d("[xr] session ended"));
    await renderer.xr.setSession(session);
    d("[xr] session started ✅");
  };

  // Loop
  let t=0, last=performance.now();
  renderer.setAnimationLoop(()=>{
    const now=performance.now();
    const dt=Math.min(0.05,(now-last)/1000);
    last=now; t+=dt;

    // fountain wiggle
    if(built.water) built.water.scale.y = 1.0 + 0.12*Math.sin(t*2.0);

    // bots bob
    for(let i=0;i<built.bots.length;i++){
      built.bots[i].position.y = 0.02*Math.sin(t*1.3+i);
    }

    updateTeleport();
    applyMovement(dt);
    renderer.render(scene,camera);
  });

  d("[status] renderer OK ✅");
  d("[status] world ready ✅");
  d("[status] ready ✅");
}
