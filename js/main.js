import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js';

const CFG = {
  spawn: new THREE.Vector3(0, 0, 9),

  roomHalf: 18,
  wallH: 7.2,
  wallT: 0.7,

  speedFlat: 2.2,
  speedVR: 1.75,
  playerRadius: 0.30,

  // snap turn
  snapDeg: 45,
  snapCooldown: 0.28,
  turnDeadzone: 0.65,

  // table (oval)
  tableY: 1.02,
  ovalA: 1.85,
  ovalB: 1.25,
  topThick: 0.14,
  railRadius: 0.085,
  seatR: 2.38,

  seatedBots: 8,
  wanderBots: 2,
  botSpeed: 0.45,
  botWanderRadius: 9.5,

  tPreflop: 2.5,
  tFlop: 2.8,
  tTurn: 2.8,
  tRiver: 2.8,
  tShow: 4.0,
  tReset: 1.8,

  cardW: 0.26,
  cardH: 0.36,
};

function $(id){ return document.getElementById(id); }
function logLine(t){
  const el = $('log');
  if (el) el.innerHTML = `${t}<br>` + el.innerHTML;
  console.log(t);
}
function setStatus(t){
  const el = $('status');
  if (el) el.textContent = `Status: ${t}`;
}

function installCrashHooks(){
  window.addEventListener('error', (e)=>{
    logLine(`❌ ERROR: ${e.message || e}`);
    if (e.error?.stack) logLine(e.error.stack);
  });
  window.addEventListener('unhandledrejection', (e)=>{
    logLine(`❌ PROMISE: ${e.reason?.message || e.reason || e}`);
    if (e.reason?.stack) logLine(e.reason.stack);
  });
}

/* --------- Procedural textures (so it’s not gray) --------- */
function canvasTex(drawFn, w=512, h=512){
  const c = document.createElement('canvas'); c.width=w; c.height=h;
  const ctx = c.getContext('2d');
  drawFn(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function feltTex(){
  return canvasTex((ctx,w,h)=>{
    ctx.fillStyle='#0b5f3c'; ctx.fillRect(0,0,w,h);
    for(let i=0;i<2400;i++){
      const x=Math.random()*w,y=Math.random()*h,a=Math.random()*0.18;
      ctx.fillStyle=`rgba(255,255,255,${a})`; ctx.fillRect(x,y,1,1);
    }
    ctx.globalAlpha=0.18; ctx.fillStyle='#053a26';
    for(let y=0;y<h;y+=10){ ctx.fillRect(0,y,w,2); }
    ctx.globalAlpha=1;
  });
}
function wallTex(){
  return canvasTex((ctx,w,h)=>{
    ctx.fillStyle='#131a34'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle='rgba(255,255,255,0.06)';
    for(let y=0;y<h;y+=24){
      for(let x=0;x<w;x+=120){ ctx.fillRect(x+Math.random()*14,y+Math.random()*6,90,12); }
    }
  });
}
function floorTex(){
  // Casino floor vibe (less “grid test” feeling)
  return canvasTex((ctx,w,h)=>{
    ctx.fillStyle='#0b0f1d'; ctx.fillRect(0,0,w,h);
    // subtle carpet pattern
    ctx.globalAlpha=0.22;
    for(let y=0;y<h;y+=28){
      for(let x=0;x<w;x+=28){
        ctx.fillStyle = ((x+y)/28)%2 ? 'rgba(0,212,255,0.10)' : 'rgba(138,107,255,0.10)';
        ctx.fillRect(x+6,y+6,10,10);
      }
    }
    ctx.globalAlpha=1;
    const g=ctx.createRadialGradient(w/2,h/2,120,w/2,h/2,340);
    g.addColorStop(0,'rgba(0,0,0,0)');
    g.addColorStop(1,'rgba(0,0,0,0.62)');
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
  });
}
function leatherTex(){
  return canvasTex((ctx,w,h)=>{
    ctx.fillStyle='#2b2f3a'; ctx.fillRect(0,0,w,h);
    for(let i=0;i<9000;i++){
      const x=Math.random()*w,y=Math.random()*h,a=Math.random()*0.10;
      ctx.fillStyle=`rgba(255,255,255,${a})`; ctx.fillRect(x,y,1,1);
    }
    ctx.globalAlpha=0.18; ctx.fillStyle='#121420';
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

/* --------- Name tag sprite --------- */
function makeNameTag(name, rank='Rookie', glow='#00d4ff'){
  const c=document.createElement('canvas'); c.width=512; c.height=192;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#0b0d12'; ctx.fillRect(0,0,512,192);
  ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=10; ctx.strokeRect(10,10,492,172);
  ctx.globalAlpha=0.35; ctx.fillStyle=glow; ctx.fillRect(18,24,476,18); ctx.globalAlpha=1;
  ctx.fillStyle='#eaf2ff'; ctx.font='900 58px system-ui, Arial'; ctx.fillText(name, 22, 110);
  ctx.fillStyle='rgba(255,255,255,0.75)'; ctx.font='700 28px system-ui, Arial'; ctx.fillText(rank, 24, 155);

  const tex=new THREE.CanvasTexture(c); tex.anisotropy=4;
  const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true}));
  spr.scale.set(0.95,0.35,1);
  return spr;
}

/* --------- Cards (thicker, high contrast) --------- */
function cardMesh(rank, suit, faceUp){
  const g = new THREE.BoxGeometry(CFG.cardW, 0.012, CFG.cardH);
  const c=document.createElement('canvas'); c.width=512; c.height=720;
  const ctx=c.getContext('2d');
  const isRed = (suit==='♦'||suit==='♥');

  if(faceUp){
    ctx.fillStyle='#fbfbff'; ctx.fillRect(0,0,512,720);
    ctx.strokeStyle='rgba(0,0,0,0.30)'; ctx.lineWidth=14; ctx.strokeRect(14,14,512-28,720-28);
    ctx.fillStyle=isRed?'#d11f2a':'#0f1320';
    ctx.font='900 96px system-ui, Arial'; ctx.fillText(rank, 36, 120);
    ctx.font='900 110px system-ui, Arial'; ctx.fillText(suit, 38, 250);
    ctx.globalAlpha=0.13; ctx.font='900 330px system-ui, Arial'; ctx.fillText(suit, 170, 500); ctx.globalAlpha=1;
  } else {
    ctx.fillStyle='#0c1b3a'; ctx.fillRect(0,0,512,720);
    ctx.strokeStyle='rgba(255,255,255,0.16)'; ctx.lineWidth=18; ctx.strokeRect(18,18,512-36,720-36);
    ctx.globalAlpha=0.55; ctx.fillStyle='rgba(0,212,255,0.18)';
    for(let y=80;y<720;y+=80){ for(let x=60;x<512;x+=90){
      ctx.beginPath(); ctx.arc(x,y,18,0,Math.PI*2); ctx.fill();
    } }
    ctx.globalAlpha=1;
    ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.font='900 90px system-ui, Arial'; ctx.fillText('NOVA', 170, 390);
  }

  const tex=new THREE.CanvasTexture(c); tex.anisotropy=4;
  const top=new THREE.MeshStandardMaterial({map:tex, roughness:0.6, metalness:0.02});
  const side=new THREE.MeshStandardMaterial({color:0x1a1d27, roughness:0.9, metalness:0.02});
  const bottom=new THREE.MeshStandardMaterial({color:0xe7e7ef, roughness:0.85, metalness:0.02});
  const mats=[side,side,top,bottom,side,side];
  const m=new THREE.Mesh(g,mats);
  m.castShadow=true; m.receiveShadow=true;
  return m;
}

function randCard(){
  const ranks=['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
  const suits=['♠','♦','♣','♥'];
  return { r:ranks[(Math.random()*ranks.length)|0], s:suits[(Math.random()*suits.length)|0] };
}

/* --------- Simple colliders --------- */
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

/* --------- Oval table --------- */
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

/* --------- Bots --------- */
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

/* --------- Mobile joystick (if present) --------- */
function bindJoystick(){
  const joy=$('joy'), nub=$('nub');
  const vec={x:0,y:0};
  if(!joy||!nub) return vec;
  let active=false,cx=0,cy=0; const R=42;
  const setN=(dx,dy)=> nub.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  joy.addEventListener('pointerdown',(e)=>{active=true;cx=e.clientX;cy=e.clientY;},{passive:true});
  window.addEventListener('pointermove',(e)=>{
    if(!active) return;
    const dx=e.clientX-cx, dy=e.clientY-cy;
    const len=Math.hypot(dx,dy), cl=Math.min(len,R);
    const nx=len?dx/len:0, ny=len?dy/len:0;
    const px=nx*cl, py=ny*cl;
    setN(px,py);
    vec.x=px/R; vec.y=py/R;
  },{passive:true});
  window.addEventListener('pointerup',()=>{active=false;vec.x=0;vec.y=0;setN(0,0);},{passive:true});
  return vec;
}

/* --------- WebXR gamepad axes (Quest controllers) --------- */
function getXRSticks(renderer){
  // returns {lx,ly,rx,ry, has:true/false}
  const out = {lx:0, ly:0, rx:0, ry:0, has:false};
  const session = renderer.xr.getSession?.();
  if(!session) return out;

  for(const src of session.inputSources){
    const gp = src.gamepad;
    if(!gp || !gp.axes) continue;

    // Most Quest controllers:
    // left stick: axes[0], axes[1]
    // right stick: axes[2], axes[3]
    const a = gp.axes;
    if(a.length >= 2){
      out.lx = a[0] || 0;
      out.ly = a[1] || 0;
      out.has = true;
    }
    if(a.length >= 4){
      out.rx = a[2] || 0;
      out.ry = a[3] || 0;
      out.has = true;
    }
  }
  return out;
}

function deadzone(v, dz=0.18){
  if(Math.abs(v) < dz) return 0;
  // re-scale so it feels smooth after deadzone
  const s = (Math.abs(v) - dz) / (1 - dz);
  return Math.sign(v) * Math.min(1, Math.max(0, s));
}

/* ===================== BOOT ===================== */
export async function boot(){
  installCrashHooks();
  setStatus('booting…');
  logLine('✅ boot() starting — full build');

  // Renderer
  const renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.xr.enabled=true;
  renderer.xr.setReferenceSpaceType('local-floor');
  document.body.appendChild(renderer.domElement);

  // VR Button
  document.body.appendChild(VRButton.createButton(renderer));
  setTimeout(()=>{
    const b=document.getElementById('VRButton');
    if(b){ b.style.top='12px'; b.style.right='12px'; b.style.left='auto'; b.style.bottom='auto'; b.style.zIndex='10000'; }
  },50);

  // Scene/camera/rig
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x04050b);

  const camera=new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 250);
  camera.position.set(0,1.6,0);

  const rig=new THREE.Group();
  rig.position.copy(CFG.spawn);
  rig.add(camera);
  scene.add(rig);

  // Lights (casino feel)
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
  const mFloor=matTex(floorTex(), 0.96, 0.02);
  mFloor.map.repeat.set(6,6);
  const mWall=matTex(wallTex(), 0.92, 0.04);
  mWall.map.repeat.set(2,2);
  const mFelt=matTex(feltTex(), 0.90, 0.04);
  mFelt.map.repeat.set(2,2);
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

  // Neon strips (visual polish)
  const stripM=new THREE.MeshStandardMaterial({
    color:0x111219, emissive:0x00ffd5, emissiveIntensity:0.75, roughness:0.25, metalness:0.1
  });
  const strip=(x,z,rot)=>{
    const s=new THREE.Mesh(new THREE.BoxGeometry(10,0.06,0.12), stripM);
    s.position.set(x,2.6,z); s.rotation.y=rot;
    scene.add(s);
  };
  strip(0,-12,0); strip(0,12,0); strip(-12,0,Math.PI/2); strip(12,0,Math.PI/2);

  // Oval table
  const table=buildOvalTable(mFelt,mRail,mBase);
  scene.add(table);

  // Seats around table (10)
  const seatCount=10;
  const seats=[];
  for(let i=0;i<seatCount;i++){
    const a=(i/seatCount)*Math.PI*2;
    const anchor=new THREE.Object3D();
    anchor.position.set(Math.sin(a)*CFG.seatR,0,Math.cos(a)*CFG.seatR);
    anchor.lookAt(0,1.2,0);
    scene.add(anchor);
    seats.push(anchor);
  }

  // Chairs (simple but solid)
  const chairTex=leatherTex();
  const chairM=new THREE.MeshStandardMaterial({color:0x3b3f4b, roughness:0.95, metalness:0.03, map:chairTex});
  function buildChair(){
    const g=new THREE.Group();
    const seat=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.10,0.55), chairM); seat.position.y=0.35;
    const back=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.55,0.10), chairM); back.position.set(0,0.70,-0.23);
    g.add(seat,back);
    g.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
    return g;
  }
  const chairGroup=new THREE.Group();
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
  const botColors=[0x6aa2ff,0xff8a6b,0x6bffa8,0xe5d36a,0x7a7f92,0x9a7cff,0x00ffd5,0xffc36b,0x86ff6b,0xff6bd6];
  const seated=[];
  for(let i=0;i<CFG.seatedBots;i++){
    const b=buildBot(botColors[i%botColors.length]);
    b.position.copy(seats[i].position);
    b.lookAt(0,1.2,0);
    const tag=makeNameTag(`NovaBot ${String(i+1).padStart(2,'0')}`, ['Rookie','Bronze','Silver','Gold'][i%4], ['#00ffd5','#8a6bff','#ff9a6b','#ffc36b'][i%4]);
    tag.position.set(0,2.15,0);
    b.add(tag);
    bots.add(b);
    seated.push({obj:b, bob:Math.random()*10});
  }
  const wander=[];
  function pickTarget(base){
    const a=Math.random()*Math.PI*2;
    const r=Math.random()*CFG.botWanderRadius;
    return new THREE.Vector3(base.x+Math.sin(a)*r,0,base.z+Math.cos(a)*r);
  }
  for(let i=0;i<CFG.wanderBots;i++){
    const idx=CFG.seatedBots+i;
    const b=buildBot(botColors[idx%botColors.length]);
    b.position.set(-10+i*3.2,0,6);
    const base=b.position.clone();
    const tag=makeNameTag(`Walker ${i+1}`,'Observer','#00d4ff');
    tag.position.set(0,2.15,0);
    b.add(tag);
    bots.add(b);
    wander.push({obj:b, base, target:pickTarget(base), t:Math.random()*10});
  }

  // Cards: community + hole cards always on table
  const cardRoot=new THREE.Group(); scene.add(cardRoot);
  const commSlots=[];
  for(let i=0;i<5;i++){
    const o=new THREE.Object3D();
    o.position.set(-0.70+i*0.35, CFG.tableY+CFG.topThick+0.018, 0);
    commSlots.push(o);
  }
  let commCards=[];
  function setCommunity(i, card, faceUp){
    if(commCards[i]) cardRoot.remove(commCards[i]);
    const m=cardMesh(card.r, card.s, faceUp);
    m.position.copy(commSlots[i].position);
    cardRoot.add(m);
    commCards[i]=m;
  }
  function seatForward(seatObj){
    const f=new THREE.Vector3(0,0,-1).applyQuaternion(seatObj.quaternion).normalize();
    f.y=0; f.normalize(); return f;
  }
  const hole=[];
  function setHole(seatIndex, c1, c2, faceUp){
    const seat=seats[seatIndex];
    const f=seatForward(seat);
    const base=seat.position.clone().add(f.clone().multiplyScalar(0.62));
    const yaw=Math.atan2(f.x,f.z);

    if(hole[seatIndex]){
      cardRoot.remove(hole[seatIndex].a);
      cardRoot.remove(hole[seatIndex].b);
    }
    const a=cardMesh(c1.r,c1.s, faceUp);
    const b=cardMesh(c2.r,c2.s, faceUp);
    a.position.set(base.x-0.14, CFG.tableY+CFG.topThick+0.022, base.z);
    b.position.set(base.x+0.14, CFG.tableY+CFG.topThick+0.022, base.z);
    a.rotation.y=yaw; b.rotation.y=yaw;
    cardRoot.add(a); cardRoot.add(b);
    hole[seatIndex]={a,b,faceUp};
  }

  // Table label
  let tableLabel=makeNameTag('Poker Loop','Table','#00ffd5');
  tableLabel.position.set(0, CFG.tableY+0.55, -0.2);
  scene.add(tableLabel);
  function setTableLabel(text, glow='#00ffd5'){
    scene.remove(tableLabel);
    tableLabel=makeNameTag(text,'Round',glow);
    tableLabel.position.set(0, CFG.tableY+0.55, -0.2);
    scene.add(tableLabel);
  }

  // Audio
  const listener=new THREE.AudioListener(); camera.add(listener);
  const music=new THREE.Audio(listener);
  const audioLoader=new THREE.AudioLoader();
  let musicReady=false, musicOn=false;

  audioLoader.load(
    'assets/audio/lobby_ambience.mp3',
    (buf)=>{ music.setBuffer(buf); music.setLoop(true); music.setVolume(0.55); musicReady=true; logLine('🎵 Audio ready'); },
    undefined,
    ()=>{ logLine('⚠️ Audio missing: assets/audio/lobby_ambience.mp3'); }
  );

  function toggleMusic(){
    if(!musicReady){ logLine('⚠️ Audio not ready / missing'); return; }
    musicOn=!musicOn;
    if(musicOn){ music.play(); logLine('🎵 Audio ON'); }
    else { music.pause(); logLine('🔇 Audio OFF'); }
  }

  // Hook HTML buttons if present
  if($('btnReset')) $('btnReset').onclick=()=>{ rig.position.copy(CFG.spawn); rig.rotation.set(0,0,0); logLine('🔄 Reset'); };
  if($('btnAudio')) $('btnAudio').onclick=toggleMusic;
  if($('btnMenu')) $('btnMenu').onclick=()=>{ logLine('⌚ Menu (VR wrist menu next)'); };

  const joy = bindJoystick();

  // Poker loop state
  const STREET={PREFLOP:0,FLOP:1,TURN:2,RIVER:3,SHOW:4,RESET:5};
  let street=STREET.PREFLOP;
  let timer=0;
  let deal=null;

  function newHand(){
    deal={ hole:[], comm:[] };
    for(let i=0;i<seatCount;i++) deal.hole.push([randCard(), randCard()]);
    for(let i=0;i<5;i++) deal.comm.push(randCard());

    for(let i=0;i<seatCount;i++){
      const faceUp = (i===0);
      setHole(i, deal.hole[i][0], deal.hole[i][1], faceUp);
    }
    for(let i=0;i<5;i++) setCommunity(i, deal.comm[i], false);

    street=STREET.PREFLOP; timer=0;
    setTableLabel('Preflop…','#8a6bff');
    logLine('🃏 New hand');
  }
  function revealFlop(){ setCommunity(0,deal.comm[0],true); setCommunity(1,deal.comm[1],true); setCommunity(2,deal.comm[2],true); setTableLabel('Flop','#00ffd5'); }
  function revealTurn(){ setCommunity(3,deal.comm[3],true); setTableLabel('Turn','#ffc36b'); }
  function revealRiver(){ setCommunity(4,deal.comm[4],true); setTableLabel('River','#ff9a6b'); }
  function showdown(){
    const winner=(Math.random()*CFG.seatedBots)|0;
    setHole(winner, deal.hole[winner][0], deal.hole[winner][1], true);
    const labels=['Pair','Two Pair','Trips','Straight','Flush','Full House','Quads','Straight Flush'];
    const label=labels[(Math.random()*labels.length)|0];
    setTableLabel(`Winner: Bot ${winner+1} — ${label}`,'#00ffd5');
    logLine(`🏆 Winner Bot ${winner+1} (${label})`);
  }
  newHand();

  renderer.xr.addEventListener('sessionstart', ()=>{
    renderer.setPixelRatio(1);
    logLine('✅ XR session start');
    logLine('🎮 VR controls: Left stick move, Right stick snap turn');
  });

  // Snap-turn state
  let snapTimer = 0;

  // Loop
  const clock=new THREE.Clock();
  setStatus('running ✅');
  renderer.setAnimationLoop(()=>{
    const dt=clock.getDelta();
    snapTimer = Math.max(0, snapTimer - dt);

    // Movement input:
    // - Mobile: joy.x/joy.y
    // - VR: WebXR gamepad sticks
    const inXR = renderer.xr.isPresenting;
    let moveX = joy.x;
    let moveY = joy.y;
    let turnX = 0;

    if(inXR){
      const sticks = getXRSticks(renderer);
      if(sticks.has){
        // left stick for move
        moveX = deadzone(sticks.lx);
        moveY = deadzone(sticks.ly);
        // right stick for snap turn
        turnX = deadzone(sticks.rx, 0.28);
      }
    }

    // Apply movement (camera-relative)
    const speed = inXR ? CFG.speedVR : CFG.speedFlat;

    const forward=new THREE.Vector3(); camera.getWorldDirection(forward);
    forward.y=0; forward.normalize();
    const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();

    const f = (-moveY);
    const s = (moveX);

    const desired=rig.position.clone()
      .addScaledVector(forward, f*speed*dt)
      .addScaledVector(right,   s*speed*dt);

    rig.position.copy(colliders.tryMove(rig.position, desired, CFG.playerRadius));

    // Snap turn (45°) on right stick
    if(inXR && snapTimer === 0){
      if(turnX <= -CFG.turnDeadzone){
        rig.rotation.y += THREE.MathUtils.degToRad(CFG.snapDeg);
        snapTimer = CFG.snapCooldown;
      } else if(turnX >= CFG.turnDeadzone){
        rig.rotation.y -= THREE.MathUtils.degToRad(CFG.snapDeg);
        snapTimer = CFG.snapCooldown;
      }
    }

    // bots
    for(const b of seated){ b.bob += dt; b.obj.position.y = Math.sin(b.bob*2.0)*0.02; b.obj.lookAt(0,1.2,0); }
    for(const w of wander){
      w.t += dt;
      w.obj.position.y = Math.sin(w.t*2.0)*0.02;
      const p=w.obj.position.clone();
      const to=w.target.clone().sub(new THREE.Vector3(p.x,0,p.z));
      const dist=to.length();
      if(dist<0.2) w.target = pickTarget(w.base);
      else{
        to.normalize();
        const next=new THREE.Vector3(p.x+to.x*CFG.botSpeed*dt,0,p.z+to.z*CFG.botSpeed*dt);
        next.x = THREE.MathUtils.clamp(next.x, -CFG.roomHalf+2, CFG.roomHalf-2);
        next.z = THREE.MathUtils.clamp(next.z, -CFG.roomHalf+2, CFG.roomHalf-2);
        if((next.x*next.x + next.z*next.z) > (Math.max(CFG.ovalA,CFG.ovalB)+1.5)**2){
          w.obj.position.x=next.x; w.obj.position.z=next.z;
        }
      }
      w.obj.lookAt(0,1.2,0);
    }

    // poker state machine
    timer += dt;
    if(street===STREET.PREFLOP && timer>=CFG.tPreflop){ street=STREET.FLOP; timer=0; revealFlop(); }
    else if(street===STREET.FLOP && timer>=CFG.tFlop){ street=STREET.TURN; timer=0; revealTurn(); }
    else if(street===STREET.TURN && timer>=CFG.tTurn){ street=STREET.RIVER; timer=0; revealRiver(); }
    else if(street===STREET.RIVER && timer>=CFG.tRiver){ street=STREET.SHOW; timer=0; showdown(); }
    else if(street===STREET.SHOW && timer>=CFG.tShow){ street=STREET.RESET; timer=0; setTableLabel('Reset…','#7a7f92'); }
    else if(street===STREET.RESET && timer>=CFG.tReset){ newHand(); }

    renderer.render(scene,camera);
  });

  window.addEventListener('resize', ()=>{
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, {passive:true});

  logLine('✅ Full build loaded: oval table + bots + poker loop + textures + VR movement');
}

/* ---- Self-run fallback ---- */
if (typeof window !== 'undefined') {
  if (!window.__NOVA_MAIN_STARTED__) {
    window.__NOVA_MAIN_STARTED__ = true;
    setTimeout(() => {
      const st = document.getElementById('status')?.textContent || '';
      if (st.includes('loading') || st.includes('waiting')) {
        boot().catch(e => logLine('❌ boot() failed: ' + (e?.message || e)));
      }
    }, 50);
  }
      }
