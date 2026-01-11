// /js/main.js — Scarlett Hybrid 4.8 (FULL)
// FIXES:
// ✅ Spawn re-facing after XR starts (delayed) + teleporter moved further behind
// ✅ LOCK teleport & laser to ONE right controller (no swapping)
// ✅ Arc teleport beam (curved) + floor ring marker
// ✅ Locomotion: choose “active mover” stick dynamically (works even if handedness lies)
// ✅ Live axes diagnostics in HUD (if your diag panel exists)

(async function boot() {
  console.log("SCARLETT_MAIN=4.8");
  if (window.__SCARLETT_BOOTED__) return;
  window.__SCARLETT_BOOTED__ = true;

  const ui = {
    grid: document.getElementById("scarlettGrid"),
    logBox: document.getElementById("scarlettLog"),
    btnSoftReboot: document.getElementById("btnSoftReboot"),
    btnCopy: document.getElementById("btnCopyLog"),
    btnClear: document.getElementById("btnClearLog"),
  };

  const LOG = window.SCARLETT?.LOG || {
    lines: [],
    push(kind, msg) {
      const t = new Date().toLocaleTimeString();
      const line = `[${t}] ${kind.toUpperCase()}: ${msg}`;
      this.lines.push(line);
      if (ui.logBox) ui.logBox.textContent = this.lines.join("\n");
      (kind === "warn" ? console.warn : kind === "error" ? console.error : console.log)(msg);
    },
    clear(){ this.lines=[]; if(ui.logBox) ui.logBox.textContent=""; }
  };
  const log = (m)=>LOG.push("log", m);
  const warn=(m)=>LOG.push("warn", m);

  ui.btnClear?.addEventListener("click", ()=>LOG.clear());
  ui.btnSoftReboot?.addEventListener("click", ()=>location.reload());

  function setMetrics(rows){
    if(!ui.grid) return;
    ui.grid.innerHTML="";
    for(const [k,v] of rows){
      const row=document.createElement("div"); row.className="kv";
      const kk=document.createElement("div"); kk.className="k"; kk.textContent=k;
      const vv=document.createElement("div"); vv.className="v"; vv.textContent=v;
      row.appendChild(kk); row.appendChild(vv);
      ui.grid.appendChild(row);
    }
  }

  // Prefer local wrapper
  let THREE=null;
  try{
    const m=await import("./three.js");
    THREE=m.default||m.THREE||m;
    log("three via local wrapper ✅");
  }catch{
    THREE=await import("three");
    log("three via importmap ✅");
  }

  // Scene
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x0a0c12);

  // Camera
  const camera=new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.05, 1600);

  // Renderer
  const renderer=new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled=true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 2.65;
  document.body.appendChild(renderer.domElement);

  addEventListener("resize", ()=>{
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // Rig
  const player=new THREE.Group();
  player.name="PlayerRig";
  scene.add(player);
  camera.position.set(0,1.65,0);
  player.add(camera);

  // VRButton
  try{
    const { VRButton } = await import("./VRButton.js");
    document.body.appendChild(VRButton.createButton(renderer));
    log("VRButton ✅");
  }catch{
    warn("VRButton.js missing/failed");
  }

  // Overkill lights
  scene.add(new THREE.AmbientLight(0xffffff, 1.05));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a3a, 2.0));
  const sun=new THREE.DirectionalLight(0xffffff, 4.2);
  sun.position.set(60,120,80);
  scene.add(sun);
  const headLamp=new THREE.PointLight(0xffffff, 2.4, 75);
  headLamp.position.set(0,1.4,0.35);
  camera.add(headLamp);

  // Controllers/Hands (rig parent)
  const c0=renderer.xr.getController(0); c0.name="Controller0";
  const c1=renderer.xr.getController(1); c1.name="Controller1";
  player.add(c0,c1);
  log("Controllers parented to PlayerRig ✅");

  try{
    const h0=renderer.xr.getHand(0); h0.name="XRHand0";
    const h1=renderer.xr.getHand(1); h1.name="XRHand1";
    player.add(h0,h1);
    log("XRHands parented to PlayerRig ✅");
  }catch{}

  // World
  const { World } = await import("./world.js");
  const ctx={ THREE, scene, renderer, camera, player, LOG };
  await World.init(ctx);
  log(`world module loaded: ${ctx.worldVersion || "unknown"}`);

  // ---------- Spawn + face table (robust) ----------
  const tmpA=new THREE.Vector3();
  const tmpB=new THREE.Vector3();

  function faceTarget(targetName="BossTable"){
    const sp=scene.getObjectByName("SpawnPoint");
    const t=scene.getObjectByName(targetName) || scene.getObjectByName("BossTable") || scene.getObjectByName("HubCenter");
    if(!sp || !t) return;

    // place
    player.position.set(sp.position.x, 0, sp.position.z);

    // face
    t.getWorldPosition(tmpA);
    tmpB.set(player.position.x, 0, player.position.z);
    const v=tmpA.sub(tmpB); v.y=0;
    if(v.lengthSq()>1e-6){
      const yaw=Math.atan2(v.x, v.z);
      player.rotation.set(0,yaw,0);
    }
  }

  function applySpawn(){
    const sp=scene.getObjectByName("SpawnPoint");
    if(!sp) return;
    faceTarget(sp.userData?.faceTargetName || "BossTable");
    log(`Spawn ✅ x=${player.position.x.toFixed(2)} z=${player.position.z.toFixed(2)}`);
    log(`Facing target ✅ (BossTable)`);
  }

  applySpawn();

  // XR recenter can override; do a delayed re-face twice
  renderer.xr.addEventListener("sessionstart", ()=>{
    setTimeout(applySpawn, 180);
    setTimeout(applySpawn, 520);
  });

  // ---------- Input source locking ----------
  let rightSrc = null;          // locked right inputSource
  let rightGp  = null;          // locked right gamepad
  let moverGp  = null;          // whichever gp we use for movement (learned dynamically)

  function pickRightSource(){
    const s=renderer.xr.getSession?.();
    if(!s) return;

    // Prefer handedness right
    let cand = s.inputSources.find(x=>x.gamepad && x.handedness==="right") || null;

    // If missing, pick the one with trigger button 0 existing
    if(!cand){
      cand = s.inputSources.find(x=>x.gamepad && x.gamepad.buttons?.length) || null;
    }

    rightSrc=cand;
    rightGp=cand?.gamepad || null;

    // Default mover = left if exists, else any other
    moverGp = (s.inputSources.find(x=>x.gamepad && x!==rightSrc)?.gamepad) || rightGp;

    log(`RightSource locked ✅ handed=${rightSrc?.handedness || "?"} buttons=${rightGp?.buttons?.length || 0}`);
  }

  renderer.xr.addEventListener("sessionstart", ()=>setTimeout(pickRightSource, 220));

  // ---------- Arc teleport visuals ----------
  const floorPlane=new THREE.Plane(new THREE.Vector3(0,1,0), 0);

  const arcPts = [];
  const arcGeo = new THREE.BufferGeometry();
  const arcMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
  const arcLine = new THREE.Line(arcGeo, arcMat);
  arcLine.frustumCulled=false;

  // attach to controller object not inputSource; keep it on controller1 by default
  // but we will render it in world-space so it doesn't swap visually.
  scene.add(arcLine);

  const ring=new THREE.Mesh(
    new THREE.RingGeometry(0.26,0.37,64),
    new THREE.MeshBasicMaterial({ color:0x7fe7ff, side:THREE.DoubleSide, transparent:true, opacity:0.95 })
  );
  ring.rotation.x=-Math.PI/2;
  ring.visible=false;
  scene.add(ring);

  const o=new THREE.Vector3();
  const q=new THREE.Quaternion();
  const dir=new THREE.Vector3();
  const hit=new THREE.Vector3();

  function hubTarget(){
    return scene.getObjectByName("HubCenter") || scene.getObjectByName("BossTable") || null;
  }

  function getRightPose(outPos, outQuat){
    // Try to use controller objects first
    // If right handedness lies, still use controller1 pose as fallback
    const cR = c1;
    cR.getWorldPosition(outPos);
    cR.getWorldQuaternion(outQuat);
    return outPos.lengthSq() > 1e-6;
  }

  function computeArc(){
    if(!getRightPose(o,q)) return false;

    // base forward
    const fwd=new THREE.Vector3(0,0,-1).applyQuaternion(q).normalize();

    // hub bias
    const h=hubTarget();
    if(h){
      const t=new THREE.Vector3(); h.getWorldPosition(t);
      const toHub=t.sub(o).normalize();
      fwd.lerp(toHub, 0.25).normalize();
    }

    // parabolic arc
    const speed = 12.0;
    const gravity = 22.0;
    dir.copy(fwd);
    dir.y += 0.08; // small lift so arc is visible
    dir.normalize();

    arcPts.length=0;
    let found=false;

    for(let i=0;i<26;i++){
      const t=i*0.08; // step
      const px=o.x + dir.x*speed*t;
      const py=o.y + dir.y*speed*t - 0.5*gravity*t*t;
      const pz=o.z + dir.z*speed*t;
      const p=new THREE.Vector3(px,py,pz);
      arcPts.push(p);

      if(!found && py <= 0.02 && i>2){
        hit.copy(p);
        hit.y = 0;
        found=true;
        break;
      }
    }

    if(!found) return false;

    arcGeo.setFromPoints(arcPts);
    arcLine.visible=true;

    ring.position.set(hit.x, 0.02, hit.z);
    ring.visible=true;

    return true;
  }

  // ---------- Locomotion ----------
  const MOVE_SPEED=1.25;
  const SNAP_ANGLE=Math.PI/4;
  let snapCooldown=0;
  let lastTeleportPressed=false;

  function refreshMoverFromActivity(){
    const s=renderer.xr.getSession?.();
    if(!s) return;
    // pick the gamepad that is actually moving (axes changing)
    for(const src of s.inputSources){
      const gp=src.gamepad;
      if(!gp?.axes?.length) continue;
      const ax0=gp.axes[0]||0, ax1=gp.axes[1]||0;
      if(Math.abs(ax0)>0.18 || Math.abs(ax1)>0.18){
        // don't steal teleport controller; but allow if it's the only one
        if(gp !== rightGp || !moverGp) moverGp = gp;
      }
    }
  }

  // ---------- Loop ----------
  let last=performance.now();

  renderer.setAnimationLoop((time)=>{
    const dt=Math.min(0.05, (time-last)/1000);
    last=time;

    try{ World?.update?.(ctx,dt); }catch{}

    let axStr="n/a";

    if(renderer.xr.isPresenting){
      refreshMoverFromActivity();

      // Movement from moverGp (axes 0/1)
      if(moverGp?.axes?.length>=2){
        const x=moverGp.axes[0]||0;
        const y=moverGp.axes[1]||0;

        axStr = `move axes: ${x.toFixed(2)},${y.toFixed(2)}`;

        if(Math.abs(x)>0.12 || Math.abs(y)>0.12){
          const yaw=player.rotation.y;
          const forward = (y)*MOVE_SPEED*dt; // y forward/back
          const strafe  = (x)*MOVE_SPEED*dt;

          player.position.x += Math.sin(yaw)*forward + Math.cos(yaw)*strafe;
          player.position.z += Math.cos(yaw)*forward - Math.sin(yaw)*strafe;
        }
      }

      // Snap turn from rightGp (prefer axes[2], fallback axes[0])
      snapCooldown=Math.max(0, snapCooldown-dt);
      let rx=0;
      if(rightGp?.axes?.length>=4) rx=rightGp.axes[2]||0;
      else if(rightGp?.axes?.length>=1) rx=rightGp.axes[0]||0;

      if(snapCooldown<=0 && Math.abs(rx)>0.75){
        player.rotation.y += (rx>0 ? -SNAP_ANGLE : SNAP_ANGLE);
        snapCooldown=0.28;
      }

      // Arc teleport
      const canTeleport = computeArc();
      const pressed = !!rightGp?.buttons?.[0]?.pressed;

      if(pressed && !lastTeleportPressed && canTeleport){
        player.position.set(hit.x, 0, hit.z);
      }
      lastTeleportPressed = pressed;

    }else{
      arcLine.visible=false;
      ring.visible=false;
      lastTeleportPressed=false;
      axStr="not in XR";
    }

    setMetrics([
      ["XR", renderer.xr.isPresenting ? "YES" : "NO"],
      ["Rig", `${player.position.x.toFixed(1)},${player.position.z.toFixed(1)}`],
      ["RightLocked", rightSrc ? "YES" : "NO"],
      ["MoverGp", moverGp ? "YES" : "NO"],
      ["Axes", axStr],
    ]);

    renderer.render(scene,camera);
  });

})();
