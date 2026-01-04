import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

const CFG = {
  spawn: new THREE.Vector3(0, 0, 9.5),

  roomHalf: 18,
  wallH: 7.2,
  wallT: 1.1,          // thicker walls
  wallPad: 0.35,       // extra collider padding

  speedFlat: 2.3,
  speedVR: 1.9,
  playerRadius: 0.35,

  snapDeg: 45,
  snapCooldown: 0.26,
  turnDeadzone: 0.55,

  tableY: 1.02,
  ovalA: 1.95,
  ovalB: 1.30,
  topThick: 0.14,
  railRadius: 0.085,
  seatR: 2.55,

  seatedBots: 6,       // ✅ 6 players (not 8)
  walkers: 2,          // ✅ 2 walking bots

  teleportMax: 32,

  // name tags hide when close to table
  hideTagsNearTableRadius: 3.2,

  // menu / anchors
  anchors: [
    { key: "Lobby",        pos: new THREE.Vector3(0, 0, 9.5) },
    { key: "Store",        pos: new THREE.Vector3(-10, 0, -10) },
    { key: "Leaderboard",  pos: new THREE.Vector3(10, 0, -10) },
    { key: "Table",        pos: new THREE.Vector3(0, 0, 3.5) },
  ],
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
    ctx.fillStyle="#141a35"; ctx.fillRect(0,0,w,h);
    ctx.fillStyle="rgba(255,255,255,0.06)";
    for(let y=0;y<h;y+=26){
      for(let x=0;x<w;x+=140){ ctx.fillRect(x+Math.random()*12,y+Math.random()*6,100,12); }
    }
    ctx.globalAlpha=0.10;
    ctx.fillStyle="#000"; ctx.fillRect(0,0,w,28);
    ctx.fillRect(0,h-28,w,28);
    ctx.globalAlpha=1;
  });
}
function floorTex(){
  return canvasTex((ctx,w,h)=>{
    ctx.fillStyle="#0a0f1d"; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha=0.22;
    for(let y=0;y<h;y+=28){
      for(let x=0;x<w;x+=28){
        ctx.fillStyle = ((x+y)/28)%2 ? "rgba(0,212,255,0.10)" : "rgba(138,107,255,0.10)";
        ctx.fillRect(x+6,y+6,10,10);
      }
    }
    ctx.globalAlpha=1;
    const g=ctx.createRadialGradient(w/2,h/2,120,w/2,h/2,360);
    g.addColorStop(0,"rgba(0,0,0,0)");
    g.addColorStop(1,"rgba(0,0,0,0.70)");
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
  });
}
function leatherTex(){
  return canvasTex((ctx,w,h)=>{
    ctx.fillStyle="#2c2f3a"; ctx.fillRect(0,0,w,h);
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
function trimTex(){
  return canvasTex((ctx,w,h)=>{
    ctx.fillStyle="#111"; ctx.fillRect(0,0,w,h);
    const g=ctx.createLinearGradient(0,0,w,0);
    g.addColorStop(0,"#2a2a2a");
    g.addColorStop(0.25,"#d8d8d8");
    g.addColorStop(0.5,"#4a4a4a");
    g.addColorStop(0.75,"#f0f0f0");
    g.addColorStop(1,"#2a2a2a");
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha=0.18;
    for(let y=0;y<h;y+=18){ ctx.fillStyle="#000"; ctx.fillRect(0,y,w,2); }
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

/* ---------- Name tag (yaw-only billboard later) ---------- */
function makeNameTag(name, rank="Rookie", glow="#00d4ff"){
  const c=document.createElement("canvas"); c.width=512; c.height=192;
  const ctx=c.getContext("2d");
  ctx.fillStyle="#0b0d12"; ctx.fillRect(0,0,512,192);
  ctx.strokeStyle="rgba(255,255,255,0.18)"; ctx.lineWidth=10; ctx.strokeRect(10,10,492,172);
  ctx.globalAlpha=0.30; ctx.fillStyle=glow; ctx.fillRect(18,24,476,18); ctx.globalAlpha=1;
  ctx.fillStyle="#eaf2ff"; ctx.font="900 58px system-ui, Arial"; ctx.fillText(name, 22, 110);
  ctx.fillStyle="rgba(255,255,255,0.75)"; ctx.font="700 28px system-ui, Arial"; ctx.fillText(rank, 24, 155);

  const tex=new THREE.CanvasTexture(c); tex.anisotropy=4;
  const mat=new THREE.MeshBasicMaterial({map:tex, transparent:true});
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.35), mat);
  plane.renderOrder = 999;
  return plane;
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

  const base=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.78,0.95,18), mBase);
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
function pressed(btn){ return !!btn && (btn.pressed || btn.value > 0.75); }

/* ---------- XR input (Quest-safe) ---------- */
function bestStickAxes(axes){
  // Quest sometimes uses axes 0/1 OR 2/3 — pick the pair with larger magnitude
  const a0 = axes?.[0] ?? 0, a1 = axes?.[1] ?? 0;
  const a2 = axes?.[2] ?? 0, a3 = axes?.[3] ?? 0;
  const m01 = Math.abs(a0) + Math.abs(a1);
  const m23 = Math.abs(a2) + Math.abs(a3);
  if (m23 > m01) return { x:a2, y:a3 };
  return { x:a0, y:a1 };
}

function getXRInputs(renderer){
  const out = {
    left:{ x:0, y:0, buttons:[], has:false },
    right:{ x:0, y:0, buttons:[], has:false }
  };

  const session = renderer.xr.getSession?.();
  if(!session) return out;

  for(const src of session.inputSources){
    const gp = src.gamepad;
    if(!gp) continue;

    const stick = bestStickAxes(gp.axes || []);
    const btns = gp.buttons || [];
    const hand = src.handedness || "none";

    if(hand === "left"){
      out.left.x = stick.x; out.left.y = stick.y; out.left.buttons = btns; out.left.has = true;
    } else if(hand === "right"){
      out.right.x = stick.x; out.right.y = stick.y; out.right.buttons = btns; out.right.has = true;
    } else {
      // fallback if handedness not set
      if(!out.left.has){
        out.left.x=stick.x; out.left.y=stick.y; out.left.buttons=btns; out.left.has=true;
      } else if(!out.right.has){
        out.right.x=stick.x; out.right.y=stick.y; out.right.buttons=btns; out.right.has=true;
      }
    }
  }
  return out;
}

/* ---------- Leaderboard Board ---------- */
function makeLeaderboardTexture(){
  const c=document.createElement("canvas"); c.width=1024; c.height=512;
  const ctx=c.getContext("2d");

  ctx.fillStyle="#070a12"; ctx.fillRect(0,0,c.width,c.height);
  ctx.strokeStyle="rgba(255,255,255,0.16)"; ctx.lineWidth=8; ctx.strokeRect(16,16,c.width-32,c.height-32);

  ctx.fillStyle="#eaf2ff";
  ctx.font="900 56px system-ui, Arial";
  ctx.fillText("SHOWDOWN LEADERBOARD", 40, 90);

  ctx.globalAlpha=0.25; ctx.fillStyle="#00ffd5"; ctx.fillRect(40, 112, 944, 10); ctx.globalAlpha=1;

  ctx.font="700 36px system-ui, Arial";
  const rows = [
    "1) NovaBot 02  —  125,000 pts",
    "2) NovaBot 05  —   98,500 pts",
    "3) NovaBot 01  —   74,200 pts",
    "4) NovaBot 06  —   60,000 pts",
    "5) NovaBot 03  —   44,900 pts",
    "6) NovaBot 04  —   39,700 pts",
  ];
  let y=180;
  for(const r of rows){
    ctx.fillStyle="rgba(255,255,255,0.90)";
    ctx.fillText(r, 60, y);
    y+=56;
  }

  const tex=new THREE.CanvasTexture(c);
  tex.anisotropy=4;
  return tex;
}

export async function boot(){
  installCrashHooks();
  setStatus("booting…");
  logLine("✅ boot() — Quest controls + solid walls + teleport halo + Y menu");

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

  const rig=new THREE.Group();
  rig.position.copy(CFG.spawn);
  scene.add(rig);
  rig.add(camera);

  // VR Button
  document.body.appendChild(VRButton.createButton(renderer));

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff,0.52));
  scene.add(new THREE.HemisphereLight(0xb7c8ff, 0x120c18, 1.20));

  const key=new THREE.DirectionalLight(0xffffff,1.35);
  key.position.set(12,18,10);
  key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);
  scene.add(key);

  const neon1=new THREE.PointLight(0x8a6bff, 3.2, 70, 2);
  neon1.position.set(0,3.5,0); scene.add(neon1);
  const neon2=new THREE.PointLight(0x00ffd5, 2.6, 65, 2);
  neon2.position.set(-12,2.8,-9); scene.add(neon2);

  // Materials
  const mFloor=matTex(floorTex(), 0.96, 0.02); mFloor.map.repeat.set(7,7);
  const mWall=matTex(wallTex(), 0.92, 0.04);  mWall.map.repeat.set(2,2);
  const mFelt=matTex(feltTex(), 0.90, 0.04);  mFelt.map.repeat.set(2,2);
  const mRail=matTex(leatherTex(), 0.82, 0.06, 0x111111, 0.10);
  const mBase=new THREE.MeshStandardMaterial({color:0x171a24, roughness:0.92, metalness:0.06});
  const mTrim = matTex(trimTex(), 0.25, 0.90, 0x222222, 0.18);

  // Floor
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(90,90), mFloor);
  floor.rotation.x=-Math.PI/2;
  floor.receiveShadow=true;
  scene.add(floor);

  // Walls (solid)
  const walls=new THREE.Group();
  const mkWall=(sx,sy,sz,x,y,z)=>{
    const w=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), mWall);
    w.position.set(x,y,z);
    w.castShadow=true; w.receiveShadow=true;
    walls.add(w);
  };
  mkWall(46, CFG.wallH, CFG.wallT, 0, CFG.wallH/2, -CFG.roomHalf);
  mkWall(46, CFG.wallH, CFG.wallT, 0, CFG.wallH/2,  CFG.roomHalf);
  mkWall(CFG.wallT, CFG.wallH, 46, -CFG.roomHalf, CFG.wallH/2, 0);
  mkWall(CFG.wallT, CFG.wallH, 46,  CFG.roomHalf, CFG.wallH/2, 0);
  scene.add(walls);

  // Corner pillars + trim
  const pillars=new THREE.Group();
  const cornerPts=[
    [-CFG.roomHalf+1.4, -CFG.roomHalf+1.4],
    [ CFG.roomHalf-1.4, -CFG.roomHalf+1.4],
    [-CFG.roomHalf+1.4,  CFG.roomHalf-1.4],
    [ CFG.roomHalf-1.4,  CFG.roomHalf-1.4],
  ];
  for(const [x,z] of cornerPts){
    const p=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.65,CFG.wallH,18), mTrim);
    p.position.set(x, CFG.wallH/2, z);
    p.castShadow=true; p.receiveShadow=true;
    pillars.add(p);
  }
  scene.add(pillars);

  // Table
  const table=buildOvalTable(mFelt,mRail,mBase);
  scene.add(table);

  // Chairs
  const chairM=new THREE.MeshStandardMaterial({color:0xffffff, roughness:0.92, metalness:0.04, map:leatherTex()});
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
    ch.position.set(Math.sin(a)*(CFG.seatR+0.48),0,Math.cos(a)*(CFG.seatR+0.48));
    ch.lookAt(0,0,0);
    chairGroup.add(ch);
  }
  scene.add(chairGroup);

  // Leaderboard board
  const lbTex = makeLeaderboardTexture();
  const lbMat = new THREE.MeshBasicMaterial({map: lbTex});
  const lb = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 3.6), lbMat);
  lb.position.set(12.5, 2.7, -14.5);
  lb.rotation.y = THREE.MathUtils.degToRad(-35);
  scene.add(lb);

  // Colliders
  const colliders=new Colliders();
  colliders.add(walls, CFG.wallPad);
  colliders.add(pillars, 0.25);
  colliders.add(table, 0.28);
  colliders.add(chairGroup, 0.12);

  // Bots + name tags list
  const bots=new THREE.Group(); scene.add(bots);
  const tags=[];

  const botColors=[0x6aa2ff,0xff8a6b,0x6bffa8,0xe5d36a,0x9a7cff,0x00ffd5];
  for(let i=0;i<CFG.seatedBots;i++){
    const a=(i/CFG.seatedBots)*Math.PI*2;
    const b=buildBot(botColors[i%botColors.length]);
    b.position.set(Math.sin(a)*CFG.seatR,0,Math.cos(a)*CFG.seatR);
    b.lookAt(0,1.2,0);

    const tag=makeNameTag(`NovaBot ${String(i+1).padStart(2,"0")}`, ["Rookie","Bronze","Silver","Gold"][i%4], ["#00ffd5","#8a6bff","#ff9a6b","#ffc36b"][i%4]);
    tag.position.set(0,2.15,0);
    b.add(tag);
    tags.push(tag);

    bots.add(b);
  }

  // Walking bots (roam)
  const walkers=new THREE.Group(); scene.add(walkers);
  const walkerData=[];
  const walkerRoute=[
    new THREE.Vector3(-10,0,-10),
    new THREE.Vector3(-10,0, 10),
    new THREE.Vector3( 10,0, 10),
    new THREE.Vector3( 10,0,-10),
  ];
  for(let i=0;i<CFG.walkers;i++){
    const w=buildBot([0xff6bd6,0x6bffa8][i%2]);
    w.position.copy(walkerRoute[i%walkerRoute.length]);
    const tag=makeNameTag(`Walker ${i+1}`, "Spectator", "#ff6bd6");
    tag.position.set(0,2.15,0);
    w.add(tag);
    tags.push(tag);
    walkers.add(w);
    walkerData.push({ obj:w, idx:i%walkerRoute.length, t:0 });
  }

  // Audio
  const listener=new THREE.AudioListener(); camera.add(listener);
  const music=new THREE.Audio(listener);
  const audioLoader=new THREE.AudioLoader();
  let musicReady=false, musicOn=false;

  audioLoader.load(
    "assets/audio/lobby_ambience.mp3",
    (buf)=>{ music.setBuffer(buf); music.setLoop(true); music.setVolume(0.55); musicReady=true; logLine("🎵 Audio ready (Button Y toggles menu; Audio button still works)"); },
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
  if($("btnMenu")) $("btnMenu").onclick=()=>{ logLine("⌚ Menu (VR) = press Y"); };

  // Mobile joystick (Android)
  const joy = bindJoystick();

  // ✅ Controllers parented to rig
  const controllerModelFactory = new XRControllerModelFactory();
  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);
  rig.add(c0, c1);

  const g0 = renderer.xr.getControllerGrip(0);
  const g1 = renderer.xr.getControllerGrip(1);
  g0.add(controllerModelFactory.createControllerModel(g0));
  g1.add(controllerModelFactory.createControllerModel(g1));
  rig.add(g0, g1);

  // Teleport visuals: beam + target halo + "from" halo
  const beamGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
  const beamMat  = new THREE.LineBasicMaterial({ color: 0x00ffd5 });
  const beam0 = new THREE.Line(beamGeom, beamMat); beam0.scale.z = 12; c0.add(beam0);
  const beam1 = new THREE.Line(beamGeom, beamMat); beam1.scale.z = 12; c1.add(beam1);

  const tpMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.26, 0.38, 26),
    new THREE.MeshBasicMaterial({ color: 0x00ffd5, transparent:true, opacity:0.90, side:THREE.DoubleSide })
  );
  tpMarker.rotation.x = -Math.PI/2;
  tpMarker.visible = false;
  scene.add(tpMarker);

  const tpFrom = new THREE.Mesh(
    new THREE.RingGeometry(0.20, 0.30, 22),
    new THREE.MeshBasicMaterial({ color: 0x8a6bff, transparent:true, opacity:0.60, side:THREE.DoubleSide })
  );
  tpFrom.rotation.x = -Math.PI/2;
  tpFrom.visible = false;
  scene.add(tpFrom);

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

    tpFrom.position.set(rig.position.x, 0.01, rig.position.z);
    tpFrom.visible = true;

    return true;
  }

  function clampInsideRoom(p){
    const lim = CFG.roomHalf - 1.25; // hard clamp inside walls
    p.x = THREE.MathUtils.clamp(p.x, -lim, lim);
    p.z = THREE.MathUtils.clamp(p.z, -lim, lim);
    return p;
  }

  function safeTeleportTo(point){
    const p = clampInsideRoom(point.clone());
    // also avoid teleporting *into* table by pushing outward if too close
    const d = new THREE.Vector2(p.x, p.z).length();
    if(d < 2.7){
      const v = new THREE.Vector2(p.x, p.z).normalize().multiplyScalar(2.9);
      p.x = v.x; p.z = v.y;
    }
    rig.position.x = p.x;
    rig.position.z = p.z;
  }

  // VR menu logic (Y opens, A cycles destinations, Trigger selects)
  let menuOpen = false;
  let anchorIndex = 0;
  function showMenuText(){
    logLine(`📍 MENU: ${menuOpen ? "ON" : "OFF"} | Target: ${CFG.anchors[anchorIndex].key}`);
  }
  showMenuText();

  // Loop
  const clock=new THREE.Clock();
  let snapTimer=0;

  // button state latches
  let lastY=false;
  let lastA=false;
  let lastTrig=false;
  let lastAudioBtn=false;

  renderer.xr.addEventListener("sessionstart", ()=>{
    renderer.setPixelRatio(1);
    logLine("✅ XR session start");
    logLine("🎮 MOVE: Left stick | TURN: Right stick 45° | TELEPORT: Trigger (aim+release)");
    logLine("🟣 MENU: press Y (A cycles target, Trigger teleports)");
  });

  renderer.setAnimationLoop(()=>{
    const dt=clock.getDelta();
    snapTimer = Math.max(0, snapTimer - dt);

    const inXR = renderer.xr.isPresenting;

    // Walkers roam
    for(const wd of walkerData){
      wd.t += dt * 0.12;
      if(wd.t >= 1){
        wd.t = 0;
        wd.idx = (wd.idx+1) % walkerRoute.length;
      }
      const a = walkerRoute[wd.idx];
      const b = walkerRoute[(wd.idx+1) % walkerRoute.length];
      const p = new THREE.Vector3().lerpVectors(a,b, wd.t);
      wd.obj.position.x = p.x;
      wd.obj.position.z = p.z;
      wd.obj.lookAt(0, 1.2, 0);
    }

    // Inputs
    let moveX = joy.x;
    let moveY = joy.y;
    let turnX = 0;

    let yNow=false;
    let aNow=false;
    let trigNow=false;
    let audioNow=false;

    if(inXR){
      const inputs = getXRInputs(renderer);

      // ✅ MOVE from LEFT stick (best-axis)
      const lx = deadzone(inputs.left.x);
      const ly = deadzone(inputs.left.y);
      moveX = lx;
      moveY = ly;

      // ✅ TURN from RIGHT stick X (best-axis)
      const rx = deadzone(inputs.right.x, 0.25);
      turnX = rx;

      // Buttons (Quest mappings vary; we support common indices)
      // Y = left buttons[3] (often), A = right buttons[3] (often)
      yNow    = pressed(inputs.left.buttons?.[3])  || pressed(inputs.right.buttons?.[2]); // fallback
      aNow    = pressed(inputs.right.buttons?.[3]) || pressed(inputs.left.buttons?.[2]);  // fallback
      trigNow = pressed(inputs.right.buttons?.[0]) || pressed(inputs.left.buttons?.[0]);  // trigger
      audioNow= pressed(inputs.right.buttons?.[4]) || pressed(inputs.left.buttons?.[4]);  // sometimes grip
    }

    // toggle music only from "Audio button" OR a single grip mapping (not 4 buttons)
    if(audioNow && !lastAudioBtn) toggleMusic();
    lastAudioBtn = audioNow;

    // Y toggles menu
    if(yNow && !lastY){
      menuOpen = !menuOpen;
      showMenuText();
    }
    lastY = yNow;

    // A cycles anchors when menu is open
    if(menuOpen && aNow && !lastA){
      anchorIndex = (anchorIndex + 1) % CFG.anchors.length;
      showMenuText();
    }
    lastA = aNow;

    // Teleport:
    // - If menu open: Trigger teleports to anchor
    // - If menu closed: Trigger = free-aim teleport with halo/beam
    if(inXR){
      if(menuOpen){
        // simple: press trigger to teleport to anchor
        if(trigNow && !lastTrig){
          const target = CFG.anchors[anchorIndex].pos;
          safeTeleportTo(target);
          logLine(`✅ Teleported to ${CFG.anchors[anchorIndex].key}`);
        }
        tpMarker.visible = false;
        tpFrom.visible = false;
        teleportArmed = false;
      } else {
        if(trigNow && !lastTrig){
          teleportArmed = true;
          tpMarker.visible = false;
          tpFrom.visible = false;
        }
        if(trigNow){
          const ok = calcTeleport(c1) || calcTeleport(c0);
          teleportArmed = teleportArmed && ok;
        }
        if(!trigNow && lastTrig){
          if(teleportArmed){
            safeTeleportTo(teleportPoint);
          }
          teleportArmed=false;
          tpMarker.visible=false;
          tpFrom.visible=false;
        }
      }
      lastTrig = trigNow;
    }

    // Movement (walk) — disabled while menu is open (prevents fighting controls)
    if(!(inXR && menuOpen)){
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
      clampInsideRoom(rig.position); // HARD STOP at walls
    }

    // Snap turn (right stick)
    if(inXR && !menuOpen && snapTimer===0){
      if(turnX <= -CFG.turnDeadzone){
        rig.rotation.y += THREE.MathUtils.degToRad(CFG.snapDeg);
        snapTimer = CFG.snapCooldown;
      } else if(turnX >= CFG.turnDeadzone){
        rig.rotation.y -= THREE.MathUtils.degToRad(CFG.snapDeg);
        snapTimer = CFG.snapCooldown;
      }
    }

    // ✅ Name tag yaw-only billboard (no twisting / no upside down)
    // Hide near table center to reduce clutter during play.
    const nearTable = (new THREE.Vector2(rig.position.x, rig.position.z).length() < CFG.hideTagsNearTableRadius);
    const camYaw = Math.atan2(camera.getWorldDirection(new THREE.Vector3()).x, camera.getWorldDirection(new THREE.Vector3()).z);

    for(const t of tags){
      t.visible = !nearTable; // hide when close to table
      // yaw only:
      t.rotation.set(0, camYaw, 0);
    }

    renderer.render(scene,camera);
  });

  window.addEventListener("resize", ()=>{
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, {passive:true});

  setStatus("running ✅");
  logLine("✅ Controls fixed: Left stick move, Right stick snap-turn, Y menu, solid walls, 6 players, 2 walkers");
}
