import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

const CFG = {
  spawn: new THREE.Vector3(0, 0, 7.5),

  roomHalf: 18,
  wallH: 7.2,
  wallT: 0.7,

  speedFlat: 2.2,
  speedVR: 1.9,
  playerRadius: 0.30,

  snapDeg: 45,
  snapCooldown: 0.28,
  turnDeadzone: 0.55,

  tableY: 1.02,
  ovalA: 1.85,
  ovalB: 1.25,
  topThick: 0.14,
  railRadius: 0.085,
  seatR: 2.38,

  seatedBots: 8,

  cardW: 0.26,
  cardH: 0.36,

  teleportMax: 30,
};

function $(id){ return document.getElementById(id); }
function logLine(t){
  const el = $("log");
  if (el) el.innerHTML = `${t}<br>` + el.innerHTML;
  console.log(t);
}
function setStatus(t){
  const el = $("status");
  if (el) el.textContent = `Status: ${t}`;
}

function installCrashHooks(){
  window.addEventListener("error", (e)=>{
    logLine(`❌ ERROR: ${e.message || e}`);
    if (e.error?.stack) logLine(e.error.stack);
  });
  window.addEventListener("unhandledrejection", (e)=>{
    logLine(`❌ PROMISE: ${e.reason?.message || e.reason || e}`);
    if (e.reason?.stack) logLine(e.reason.stack);
  });
}

/* ---------- Procedural textures ---------- */
function canvasTex(drawFn, w=512, h=512){
  const c = document.createElement("canvas"); c.width=w; c.height=h;
  const ctx = c.getContext("2d");
  drawFn(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function feltTex(){
  return canvasTex((ctx,w,h)=>{
    ctx.fillStyle="#0b5f3c"; ctx.fillRect(0,0,w,h);
    for(let i=0;i<2400;i++){
      const x=Math.random()*w,y=Math.random()*h,a=Math.random()*0.18;
      ctx.fillStyle=`rgba(255,255,255,${a})`; ctx.fillRect(x,y,1,1);
    }
    ctx.globalAlpha=0.18; ctx.fillStyle="#053a26";
    for(let y=0;y<h;y+=10){ ctx.fillRect(0,y,w,2); }
    ctx.globalAlpha=1;
  });
}
function wallTex(){
  return canvasTex((ctx,w,h)=>{
    ctx.fillStyle="#131a34"; ctx.fillRect(0,0,w,h);
    ctx.fillStyle="rgba(255,255,255,0.06)";
    for(let y=0;y<h;y+=24){
      for(let x=0;x<w;x+=120){ ctx.fillRect(x+Math.random()*14,y+Math.random()*6,90,12); }
    }
  });
}
function floorTex(){
  return canvasTex((ctx,w,h)=>{
    ctx.fillStyle="#0b0f1d"; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha=0.22;
    for(let y=0;y<h;y+=28){
      for(let x=0;x<w;x+=28){
        ctx.fillStyle = ((x+y)/28)%2 ? "rgba(0,212,255,0.10)" : "rgba(138,107,255,0.10)";
        ctx.fillRect(x+6,y+6,10,10);
      }
    }
    ctx.globalAlpha=1;
    const g=ctx.createRadialGradient(w/2,h/2,120,w/2,h/2,340);
    g.addColorStop(0,"rgba(0,0,0,0)");
    g.addColorStop(1,"rgba(0,0,0,0.62)");
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
  });
}
function leatherTex(){
  return canvasTex((ctx,w,h)=>{
    ctx.fillStyle="#2b2f3a"; ctx.fillRect(0,0,w,h);
    for(let i=0;i<9000;i++){
      const x=Math.random()*w,y=Math.random()*h,a=Math.random()*0.10;
      ctx.fillStyle=`rgba(255,255,255,${a})`; ctx.fillRect(x,y,1,1);
    }
    ctx.globalAlpha=0.18; ctx.fillStyle="#121420";
    for(let i=0;i<220;i++){
      ctx.beginPath(); ctx.arc(Math.random()*w,Math.random()*h,Math.random()*14,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
  });
}
function matTex(tex, rough=0.92, metal=0.04, em=0x000000, emI=0){
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: rough,
    metalness: metal,
    emissive: em,
    emissiveIntensity: emI,
    map: tex
  });
}

/* ---------- Name tag ---------- */
function makeNameTag(name, rank="Rookie", glow="#00d4ff"){
  const c=document.createElement("canvas"); c.width=512; c.height=192;
  const ctx=c.getContext("2d");
  ctx.fillStyle="#0b0d12"; ctx.fillRect(0,0,512,192);
  ctx.strokeStyle="rgba(255,255,255,0.18)"; ctx.lineWidth=10; ctx.strokeRect(10,10,492,172);
  ctx.globalAlpha=0.35; ctx.fillStyle=glow; ctx.fillRect(18,24,476,18); ctx.globalAlpha=1;
  ctx.fillStyle="#eaf2ff"; ctx.font="900 58px system-ui, Arial"; ctx.fillText(name, 22, 110);
  ctx.fillStyle="rgba(255,255,255,0.75)"; ctx.font="700 28px system-ui, Arial"; ctx.fillText(rank, 24, 155);
  const tex=new THREE.CanvasTexture(c); tex.anisotropy=4;
  const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true}));
  spr.scale.set(0.95,0.35,1);
  return spr;
}

/* ---------- Colliders ---------- */
class Colliders{
  constructor(){ this.boxes=[]; }
  add(obj, pad=0){
    obj.updateWorldMatrix(true,true);
    const b=new THREE.Box3().setFromObject(obj);
    if(pad) b.expandByScalar(pad);
    this.boxes.push(b);
  }
  blocks(p,r){
    for(const b of this.boxes){
      if(p.x>=(b.min.x-r)&&p.x<=(b.max.x+r)&&p.z>=(b.min.z-r)&&p.z<=(b.max.z+r)) return true;
    }
    return false;
  }
  tryMove(cur,next,r){
    if(!this.blocks(next,r)) return next;
    const xOnly=new THREE.Vector3(next.x,next.y,cur.z);
    if(!this.blocks(xOnly,r)) return xOnly;
    const zOnly=new THREE.Vector3(cur.x,next.y,next.z);
    if(!this.blocks(zOnly,r)) return zOnly;
    return cur;
  }
}

/* ---------- Oval table ---------- */
function ellipsePoints(a,b,seg=120){
  const pts=[];
  for(let i=0;i<=seg;i++){
    const t=(i/seg)*Math.PI*2;
    pts.push(new THREE.Vector3(Math.cos(t)*a,0,Math.sin(t)*b));
  }
  return pts;
}
function buildOvalTable(mFelt,mRail,mBase){
  const table=new THREE.Group();
  const shape=new THREE.Shape();
  const seg=90;
  for(let i=0;i<=seg;i++){
    const t=(i/seg)*Math.PI*2;
    const x=Math.cos(t)*CFG.ovalA;
    const y=Math.sin(t)*CFG.ovalB;
    if(i===0) shape.moveTo(x,y); else shape.lineTo(x,y);
  }
  const topGeo=new THREE.ExtrudeGeometry(shape,{depth:CFG.topThick, bevelEnabled:false, curveSegments:seg});
  topGeo.rotateX(-Math.PI/2);
  topGeo.translate(0, CFG.tableY, 0);
  const top=new THREE.Mesh(topGeo,mFelt);
  top.castShadow=true; top.receiveShadow=true;
  table.add(top);

  const curve=new THREE.CatmullRomCurve3(ellipsePoints(CFG.ovalA*0.985, CFG.ovalB*0.985), true);
  const railGeo=new THREE.TubeGeometry(curve, 180, CFG.railRadius, 14, true);
  const rail=new THREE.Mesh(railGeo,mRail);
  rail.position.y=CFG.tableY + CFG.topThick*0.55;
  rail.castShadow=true; rail.receiveShadow=true;
  table.add(rail);

  const base=new THREE.Mesh(new THREE.CylinderGeometry(0.52,0.72,0.95,18), mBase);
  base.position.y=CFG.tableY - 0.55;
  base.castShadow=true; base.receiveShadow=true;
  table.add(base);

  return table;
}

/* ---------- Bots ---------- */
function buildBot(color){
  const g=new THREE.Group();
  const m=new THREE.MeshStandardMaterial({color, roughness:0.85, metalness:0.05});
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(0.18,0.52,6,12), m);
  torso.position.y=0.95;
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.14,14,14), m);
  head.position.y=1.45;
  const glow=new THREE.Mesh(new THREE.SphereGeometry(0.06,12,12),
    new THREE.MeshStandardMaterial({color:0x111111, emissive:color, emissiveIntensity:0.75, roughness:0.3, metalness:0.1}));
  glow.position.y=1.75;
  g.add(torso,head,glow);
  return g;
}

/* ---------- Mobile joystick ---------- */
function bindJoystick(){
  const joy=$("joy"), nub=$("nub");
  const vec={x:0,y:0};
  if(!joy||!nub) return vec;
  let active=false,cx=0,cy=0; const R=42;
  const setN=(dx,dy)=> nub.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  joy.addEventListener("pointerdown",(e)=>{active=true;cx=e.clientX;cy=e.clientY;},{passive:true});
  window.addEventListener("pointermove",(e)=>{
    if(!active) return;
    const dx=e.clientX-cx, dy=e.clientY-cy;
    const len=Math.hypot(dx,dy), cl=Math.min(len,R);
    const nx=len?dx/len:0, ny=len?dy/len:0;
    const px=nx*cl, py=ny*cl;
    setN(px,py);
    vec.x=px/R; vec.y=py/R;
  },{passive:true});
  window.addEventListener("pointerup",()=>{active=false;vec.x=0;vec.y=0;setN(0,0);},{passive:true});
  return vec;
}
function deadzone(v, dz=0.18){
  if(Math.abs(v) < dz) return 0;
  const s = (Math.abs(v) - dz) / (1 - dz);
  return Math.sign(v) * Math.min(1, Math.max(0, s));
}

/* ---------- XR Inputs (Quest) ---------- */
function getXRInputs(renderer){
  const out = { left:{x:0,y:0,buttons:[]}, right:{x:0,y:0,buttons:[]}, has:false };
  const session = renderer.xr.getSession?.();
  if(!session) return out;
  for(const src of session.inputSources){
    const gp = src.gamepad;
    if(!gp) continue;
    const axes = gp.axes || [];
    const btns = gp.buttons || [];
    const hand = src.handedness || "none";
    const x = axes[0] ?? 0;
    const y = axes[1] ?? 0;
    if(hand === "left"){ out.left.x=x; out.left.y=y; out.left.buttons=btns; out.has=true; }
    else if(hand === "right"){ out.right.x=x; out.right.y=y; out.right.buttons=btns; out.has=true; }
    else {
      if(!out.has){ out.left.x=x; out.left.y=y; out.left.buttons=btns; out.has=true; }
      else { out.right.x=x; out.right.y=y; out.right.buttons=btns; out.has=true; }
    }
  }
  return out;
}
function pressed(btn){ return !!btn && (btn.pressed || btn.value > 0.75); }

export async function boot(){
  installCrashHooks();
  setStatus("booting…");
  logLine("✅ boot() starting — rig/controller fix build");

  // Renderer
  const renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.xr.enabled=true;
  renderer.xr.setReferenceSpaceType("local-floor");
  document.body.appendChild(renderer.domElement);

  // Scene/camera/rig
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x04050b);

  const camera=new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 250);

  // ✅ Rig is the “player”
  const rig=new THREE.Group();
  rig.position.copy(CFG.spawn);
  scene.add(rig);

  // ✅ Camera is inside rig
  rig.add(camera);

  // VR Button
  document.body.appendChild(VRButton.createButton(renderer));

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff,0.55));
  scene.add(new THREE.HemisphereLight(0xb7c8ff, 0x120c18, 1.15));
  const key=new THREE.DirectionalLight(0xffffff,1.25);
  key.position.set(12,18,10);
  key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);
  scene.add(key);

  const neon1=new THREE.PointLight(0x8a6bff, 3.3, 60, 2);
  neon1.position.set(0,3.5,0); scene.add(neon1);
  const neon2=new THREE.PointLight(0x00ffd5, 2.3, 55, 2);
  neon2.position.set(-12,2.8,-9); scene.add(neon2);

  // Materials
  const mFloor=matTex(floorTex(), 0.96, 0.02); mFloor.map.repeat.set(6,6);
  const mWall=matTex(wallTex(), 0.92, 0.04);  mWall.map.repeat.set(2,2);
  const mFelt=matTex(feltTex(), 0.90, 0.04);  mFelt.map.repeat.set(2,2);
  const mRail=matTex(leatherTex(), 0.82, 0.06, 0x111111, 0.10);
  const mBase=new THREE.MeshStandardMaterial({color:0x171a24, roughness:0.92, metalness:0.06});

  // Floor
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(80,80), mFloor);
  floor.rotation.x=-Math.PI/2;
  floor.receiveShadow=true;
  scene.add(floor);

  // Walls
  const walls=new THREE.Group();
  const mkWall=(sx,sy,sz,x,y,z)=>{
    const w=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), mWall);
    w.position.set(x,y,z);
    w.castShadow=true; w.receiveShadow=true;
    walls.add(w);
  };
  mkWall(44, CFG.wallH, CFG.wallT, 0, CFG.wallH/2, -CFG.roomHalf);
  mkWall(44, CFG.wallH, CFG.wallT, 0, CFG.wallH/2,  CFG.roomHalf);
  mkWall(CFG.wallT, CFG.wallH, 44, -CFG.roomHalf, CFG.wallH/2, 0);
  mkWall(CFG.wallT, CFG.wallH, 44,  CFG.roomHalf, CFG.wallH/2, 0);
  scene.add(walls);

  // Table
  const table=buildOvalTable(mFelt,mRail,mBase);
  scene.add(table);

  // Chairs
  const chairM=new THREE.MeshStandardMaterial({color:0x50586f, roughness:0.92, metalness:0.04, map:leatherTex()});
  function buildChair(){
    const g=new THREE.Group();
    const seat=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.10,0.55), chairM); seat.position.y=0.35;
    const back=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.55,0.10), chairM); back.position.set(0,0.70,-0.23);
    g.add(seat,back);
    g.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
    return g;
  }
  const chairGroup=new THREE.Group();
  const seatCount=10;
  for(let i=0;i<seatCount;i++){
    const a=(i/seatCount)*Math.PI*2;
    const ch=buildChair();
    ch.position.set(Math.sin(a)*(CFG.seatR+0.44),0,Math.cos(a)*(CFG.seatR+0.44));
    ch.lookAt(0,0,0);
    chairGroup.add(ch);
  }
  scene.add(chairGroup);

  // Colliders
  const colliders=new Colliders();
  colliders.add(walls,0);
  colliders.add(table,0.22);
  colliders.add(chairGroup,0.10);

  // Bots
  const bots=new THREE.Group(); scene.add(bots);
  const botColors=[0x6aa2ff,0xff8a6b,0x6bffa8,0xe5d36a,0x9a7cff,0x00ffd5,0xffc36b,0xff6bd6];
  for(let i=0;i<CFG.seatedBots;i++){
    const a=(i/CFG.seatedBots)*Math.PI*2;
    const b=buildBot(botColors[i%botColors.length]);
    b.position.set(Math.sin(a)*CFG.seatR,0,Math.cos(a)*CFG.seatR);
    b.lookAt(0,1.2,0);
    const tag=makeNameTag(`NovaBot ${String(i+1).padStart(2,"0")}`, ["Rookie","Bronze","Silver","Gold"][i%4], ["#00ffd5","#8a6bff","#ff9a6b","#ffc36b"][i%4]);
    tag.position.set(0,2.15,0);
    b.add(tag);
    bots.add(b);
  }

  // Audio
  const listener=new THREE.AudioListener(); camera.add(listener);
  const music=new THREE.Audio(listener);
  const audioLoader=new THREE.AudioLoader();
  let musicReady=false, musicOn=false;

  audioLoader.load(
    "assets/audio/lobby_ambience.mp3",
    (buf)=>{ music.setBuffer(buf); music.setLoop(true); music.setVolume(0.55); musicReady=true; logLine("🎵 Audio ready (press A/X or Audio button)"); },
    undefined,
    ()=>{ logLine("⚠️ Audio missing: assets/audio/lobby_ambience.mp3"); }
  );

  function toggleMusic(){
    if(!musicReady){ logLine("⚠️ Audio not ready / missing"); return; }
    musicOn=!musicOn;
    if(musicOn){ music.play(); logLine("🎵 Audio ON"); }
    else { music.pause(); logLine("🔇 Audio OFF"); }
  }

  if($("btnReset")) $("btnReset").onclick=()=>{ rig.position.copy(CFG.spawn); rig.rotation.set(0,0,0); logLine("🔄 Reset"); };
  if($("btnAudio")) $("btnAudio").onclick=toggleMusic;
  if($("btnMenu")) $("btnMenu").onclick=()=>{ logLine("⌚ Menu placeholder (next: wrist UI)"); };

  // Mobile joystick
  const joy = bindJoystick();

  // ✅ Controllers MUST be parented to the rig (this fixes your “hands stuck at table” issue)
  const controllerModelFactory = new XRControllerModelFactory();

  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);
  rig.add(c0, c1);

  const g0 = renderer.xr.getControllerGrip(0);
  const g1 = renderer.xr.getControllerGrip(1);
  g0.add(controllerModelFactory.createControllerModel(g0));
  g1.add(controllerModelFactory.createControllerModel(g1));
  rig.add(g0, g1);

  // Rays
  const rayGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
  const rayMat  = new THREE.LineBasicMaterial({ color: 0x00ffd5 });
  const ray0 = new THREE.Line(rayGeom, rayMat); ray0.scale.z = 10; c0.add(ray0);
  const ray1 = new THREE.Line(rayGeom, rayMat); ray1.scale.z = 10; c1.add(ray1);

  // Teleport marker
  const tpMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.32, 22),
    new THREE.MeshBasicMaterial({ color: 0x00ffd5, transparent:true, opacity:0.85, side:THREE.DoubleSide })
  );
  tpMarker.rotation.x = -Math.PI/2;
  tpMarker.visible = false;
  scene.add(tpMarker);

  const raycaster = new THREE.Raycaster();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
  let teleportArmed = false;
  const teleportPoint = new THREE.Vector3();

  function calcTeleport(fromController){
    const origin = new THREE.Vector3();
    const dir    = new THREE.Vector3(0,0,-1);
    fromController.getWorldPosition(origin);
    dir.applyQuaternion(fromController.getWorldQuaternion(new THREE.Quaternion())).normalize();
    raycaster.ray.origin.copy(origin);
    raycaster.ray.direction.copy(dir);
    const hit = new THREE.Vector3();
    const ok = raycaster.ray.intersectPlane(floorPlane, hit);
    if(!ok) return false;
    if(hit.distanceTo(origin) > CFG.teleportMax) return false;
    teleportPoint.copy(hit);
    tpMarker.position.copy(hit);
    tpMarker.visible = true;
    return true;
  }
  function teleportTo(point){
    rig.position.x = point.x;
    rig.position.z = point.z;
  }

  // Loop
  const clock=new THREE.Clock();
  let snapTimer=0;
  let lastAudioBtn=false;
  let lastTrig=false;

  renderer.xr.addEventListener("sessionstart", ()=>{
    renderer.setPixelRatio(1);
    logLine("✅ XR session start");
    logLine("🎮 Move: Left stick | Turn: Right stick | Teleport: Trigger (hold + release)");
  });

  renderer.setAnimationLoop(()=>{
    const dt=clock.getDelta();
    snapTimer = Math.max(0, snapTimer - dt);

    const inXR = renderer.xr.isPresenting;

    // Inputs
    let moveX = joy.x;
    let moveY = joy.y;
    let turnX = 0;

    let audioBtnNow=false;
    let trigNow=false;

    if(inXR){
      const inputs = getXRInputs(renderer);

      // Primary: left stick movement
      let lx = deadzone(inputs.left.x);
      let ly = deadzone(inputs.left.y);

      // Fallback: if left stick isn't detected, allow right stick to move too
      if(Math.abs(lx) < 0.001 && Math.abs(ly) < 0.001){
        lx = deadzone(inputs.right.x);
        ly = deadzone(inputs.right.y);
      }

      moveX = lx;
      moveY = ly;

      // Right stick is turn (snap)
      turnX = deadzone(inputs.right.x, 0.25);

      // Audio (A/X or B/Y typically on buttons 4/5 on some mappings)
      const lb = inputs.left.buttons;
      const rb = inputs.right.buttons;
      audioBtnNow = pressed(lb?.[4]) || pressed(lb?.[5]) || pressed(rb?.[4]) || pressed(rb?.[5]);

      // Trigger teleport: gamepad button 0 commonly = trigger
      trigNow = pressed(rb?.[0]) || pressed(lb?.[0]);
    }

    if(audioBtnNow && !lastAudioBtn) toggleMusic();
    lastAudioBtn = audioBtnNow;

    // Teleport
    if(inXR){
      if(trigNow && !lastTrig){
        teleportArmed = true;
        tpMarker.visible = false;
      }
      if(trigNow){
        const ok = calcTeleport(c1) || calcTeleport(c0);
        teleportArmed = teleportArmed && ok;
      }
      if(!trigNow && lastTrig){
        if(teleportArmed) teleportTo(teleportPoint);
        teleportArmed=false;
        tpMarker.visible=false;
      }
      lastTrig = trigNow;
    }

    // Movement (walk)
    const speed = inXR ? CFG.speedVR : CFG.speedFlat;

    const forward=new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y=0; forward.normalize();

    const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();

    const f = (-moveY);
    const s = (moveX);

    const desired=rig.position.clone()
      .addScaledVector(forward, f*speed*dt)
      .addScaledVector(right,   s*speed*dt);

    rig.position.copy(colliders.tryMove(rig.position, desired, CFG.playerRadius));

    // Snap turn
    if(inXR && snapTimer===0){
      if(turnX <= -CFG.turnDeadzone){
        rig.rotation.y += THREE.MathUtils.degToRad(CFG.snapDeg);
        snapTimer = CFG.snapCooldown;
      } else if(turnX >= CFG.turnDeadzone){
        rig.rotation.y -= THREE.MathUtils.degToRad(CFG.snapDeg);
        snapTimer = CFG.snapCooldown;
      }
    }

    renderer.render(scene,camera);
  });

  window.addEventListener("resize", ()=>{
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, {passive:true});

  setStatus("running ✅");
  logLine("✅ Rig fixed: controllers + hands now move with you");
}
