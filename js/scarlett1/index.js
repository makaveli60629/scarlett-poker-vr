import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";

export function startScarlettRuntime(){
  const d = window.__scarlettDiagWrite || ((m)=>console.log(m));
  d("[scarlett1] LIVE_FINGERPRINT ✅ SCARLETT1_v2_7_INPUT_LASER_FIX");

  const app = document.getElementById("app");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020308);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 140);

  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  // IMPORTANT: canvas never steals input from HUD
  renderer.domElement.style.pointerEvents = "none";
  renderer.domElement.style.position = "fixed";
  renderer.domElement.style.left = "0";
  renderer.domElement.style.top = "0";
  app.appendChild(renderer.domElement);

  window.addEventListener("resize", ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  scene.add(new THREE.HemisphereLight(0xffffff, 0x111111, 1.15));
  const spot = new THREE.SpotLight(0xffffff, 1.35, 50, Math.PI/7, 0.5, 1.0);
  spot.position.set(4, 6.5, 4);
  scene.add(spot);

  // Rig (spawn away from table)
  const rig = new THREE.Group();
  rig.position.set(0,0,8.0);
  rig.add(camera);
  scene.add(rig);

  // ---- Floor ----
  const floorMat = new THREE.MeshStandardMaterial({ color:0x103820 });
  floorMat.polygonOffset = true;
  floorMat.polygonOffsetFactor = 1;
  floorMat.polygonOffsetUnits = 1;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60,60), floorMat);
  floor.rotation.x = -Math.PI/2;
  floor.position.y = 0;
  scene.add(floor);

  // Table quick
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55,1.55,0.20,48),
    new THREE.MeshStandardMaterial({ color:0x0c2b18, roughness:0.9 })
  );
  table.position.set(0,0.92,0);
  scene.add(table);

  // ---- XR enter (keep your boot.js requestSession; this is a safe fallback) ----
  window.__scarlettEnterVR = async ()=>{
    if(!navigator.xr){ d("[xr] navigator.xr not available"); return; }
    const session = await navigator.xr.requestSession("immersive-vr", { requiredFeatures:["local-floor"] });
    await renderer.xr.setSession(session);
    d("[xr] session started ✅");
  };

  // ---- Controllers (beam is ATTACHED to controller, not world center) ----
  const raycaster = new THREE.Raycaster();
  const tempMat = new THREE.Matrix4();

  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.12,0.16,24),
    new THREE.MeshStandardMaterial({ color:0x66ccff, side:THREE.DoubleSide })
  );
  reticle.rotation.x = -Math.PI/2;
  reticle.visible = false;
  scene.add(reticle);

  function makeBeam(){
    const mat = new THREE.LineBasicMaterial({ color:0x66ccff });
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0,0,-1)]);
    const line = new THREE.Line(geo, mat);
    line.visible = false;
    return line;
  }

  const controllers = [];
  const input = {
    left:  { gp:null, ctrl:null },
    right: { gp:null, ctrl:null },
  };

  function setupController(i){
    const c = renderer.xr.getController(i);
    c.userData.i = i;
    c.userData.beam = makeBeam();
    c.userData.aiming = false;
    c.userData.teleportPoint = null;

    c.add(c.userData.beam);
    scene.add(c);
    controllers.push(c);

    c.addEventListener("selectstart", ()=>{ c.userData.aiming = true; });
    c.addEventListener("selectend", ()=>{
      c.userData.aiming = false;
      if(window.SCARLETT?.teleportOn && c.userData.teleportPoint){
        rig.position.x = c.userData.teleportPoint.x;
        rig.position.z = c.userData.teleportPoint.z;
        c.userData.teleportPoint = null;
      }
    });
  }
  setupController(0);
  setupController(1);

  function updateInputSources(){
    const session = renderer.xr.getSession?.();
    input.left.gp = input.right.gp = null;
    if(!session || !session.inputSources) return;

    // Map gamepads by handedness FIRST
    for(const src of session.inputSources){
      if(!src || !src.gamepad) continue;
      if(src.handedness === "left") input.left.gp = src.gamepad;
      if(src.handedness === "right") input.right.gp = src.gamepad;
    }

    // Map controllers by index as fallback
    input.left.ctrl = controllers[0] || null;
    input.right.ctrl = controllers[1] || null;
  }

  function updateTeleport(){
    if(!(window.SCARLETT?.teleportOn)){
      reticle.visible = false;
      for(const c of controllers){
        c.userData.beam.visible = false;
        c.userData.teleportPoint = null;
      }
      return;
    }

    // Pick the controller that is *currently aiming*; else prefer LEFT controller
    let c = null;
    for(const cc of controllers){ if(cc.userData.aiming){ c = cc; break; } }
    if(!c) c = input.left.ctrl || controllers[0];

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

      // beam endpoint in controller local space
      c.userData.beam.visible = true;
      const localEnd = c.worldToLocal(p.clone());
      c.userData.beam.geometry.setFromPoints([new THREE.Vector3(0,0,0), localEnd]);
      c.userData.beam.geometry.attributes.position.needsUpdate = true;
    }else{
      reticle.visible = false;
      c.userData.teleportPoint = null;
      c.userData.beam.visible = false;
    }
  }

  // ---- Movement (fix forward/back swap) ----
  const dz = (v)=> (Math.abs(v)<0.18)?0:v;
  const readMove = (gp)=>{
    if(!gp || !gp.axes) return {x:0,y:0};
    let x = gp.axes[0] ?? 0;
    let y = gp.axes[1] ?? 0;

    // fallback pair
    if(Math.abs(x)+Math.abs(y) < 0.05 && gp.axes.length>=4){
      x = gp.axes[2]; y = gp.axes[3];
    }

    // FIX: invert Y so forward is forward (you reported it’s reversed)
    y = -y;

    return { x: dz(x), y: dz(y) };
  };
  const readTurn = (gp)=>{
    if(!gp || !gp.axes) return 0;
    let t = gp.axes.length>=3 ? gp.axes[2] : (gp.axes[0] ?? 0);
    if(Math.abs(t) < 0.05) t = gp.axes[0] ?? 0;
    return dz(t);
  };

  let snapCooldown = 0;
  let logCooldown = 0;

  function applyMovement(dt){
    // XR sticks
    let moveX=0, moveY=0, turnX=0;

    if(window.SCARLETT?.sticksOn){
      const mv = readMove(input.left.gp || input.right.gp);
      moveX = mv.x; moveY = mv.y;
      turnX = readTurn(input.right.gp || input.left.gp);

      snapCooldown = Math.max(0, snapCooldown - dt);
      if(snapCooldown === 0 && Math.abs(turnX) > 0.7){
        rig.rotation.y -= Math.sign(turnX) * (Math.PI/4);
        snapCooldown = 0.25;
      }
    }

    const speed = 2.3;
    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(rig.quaternion);
    const right = new THREE.Vector3(1,0,0).applyQuaternion(rig.quaternion);
    forward.y=0; right.y=0; forward.normalize(); right.normalize();

    rig.position.addScaledVector(right, moveX * speed * dt);
    rig.position.addScaledVector(forward, moveY * speed * dt);

    // light logging (for you to screenshot if diag works)
    logCooldown = Math.max(0, logCooldown - dt);
    if(logCooldown === 0){
      logCooldown = 1.0;
      try{
        const la = input.left.gp?.axes ? input.left.gp.axes.slice(0,6) : null;
        const ra = input.right.gp?.axes ? input.right.gp.axes.slice(0,6) : null;
        d("[axes] left=" + (la?JSON.stringify(la):"null") + " right=" + (ra?JSON.stringify(ra):"null"));
      }catch(_){}
    }
  }

  // ---- Loop ----
  let last = performance.now();
  renderer.setAnimationLoop(()=>{
    updateInputSources();

    const now = performance.now();
    const dt = Math.min(0.05, (now-last)/1000);
    last = now;

    updateTeleport();
    applyMovement(dt);

    renderer.render(scene, camera);
  });

  d("[status] renderer OK ✅");
  d("[status] world ready ✅");
  d("[status] ready ✅");
}
