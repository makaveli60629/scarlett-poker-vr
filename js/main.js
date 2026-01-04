// Scarlett Poker VR — Update D+ (Self-contained main.js)
// GitHub Pages + Quest WebXR + Android friendly
// Adds: oval table, full poker loop, bots seated+wandering, name tags, menu, audio toggle, procedural textures, hand tracking attempt

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js';
import { XRHandModelFactory } from 'https://unpkg.com/three@0.160.0/examples/jsm/webxr/XRHandModelFactory.js';

const CFG = {
  // movement
  speedFlat: 2.3,
  speedVR: 1.7,
  playerRadius: 0.30,
  snapTurnDeg: 45,
  snapTurnCooldown: 0.35,

  // world
  floorSize: 70,
  roomHalf: 20,
  wallH: 7.5,
  wallT: 0.7,

  // oval table
  tableY: 1.02,
  ovalA: 1.70,        // major radius
  ovalB: 1.22,        // minor radius
  tableTopThick: 0.14,
  railRadius: 0.085,
  seatR: 2.25,

  // bots
  seatedBots: 6,
  wanderBots: 2,
  botSpeed: 0.42,
  botWanderRadius: 10.0,

  // poker timing (seconds)
  tPreflop: 3.0,
  tFlop: 3.0,
  tTurn: 3.0,
  tRiver: 3.0,
  tShowdown: 4.5,
  tReset: 1.8,

  // cards
  cardW: 0.26,
  cardH: 0.36,
  cardLift: 0.06,
};

function $(id){ return document.getElementById(id); }
function logLine(txt){
  const el = $('log');
  if (!el) return;
  el.innerHTML = `${txt}<br/>` + el.innerHTML;
}
function crashCatcher(){
  window.addEventListener('error', (e)=>{
    logLine(`❌ ERROR: ${e?.message || e}`);
    if (e?.error?.stack) logLine(e.error.stack);
  });
  window.addEventListener('unhandledrejection', (e)=>{
    logLine(`❌ PROMISE: ${e?.reason?.message || e?.reason || e}`);
    if (e?.reason?.stack) logLine(e.reason.stack);
  });
}

/* ------------------ Procedural “Textures” ------------------ */
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
    ctx.fillStyle = '#0b5f3c'; ctx.fillRect(0,0,w,h);
    for (let i=0;i<2200;i++){
      const x=Math.random()*w, y=Math.random()*h;
      const a=Math.random()*0.18;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(x,y,1,1);
    }
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#053a26';
    for (let y=0;y<h;y+=8){ ctx.fillRect(0,y,w,2); }
    ctx.globalAlpha = 1;
  });
}

function floorTex(){
  return canvasTex((ctx,w,h)=>{
    ctx.fillStyle = '#0d1222'; ctx.fillRect(0,0,w,h);
    // subtle tile lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    const step = 64;
    for (let x=0;x<=w;x+=step){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    for (let y=0;y<=h;y+=step){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
    // soft vignette
    const g = ctx.createRadialGradient(w/2,h/2,80,w/2,h/2,280);
    g.addColorStop(0,'rgba(0,0,0,0)');
    g.addColorStop(1,'rgba(0,0,0,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
  });
}

function wallTex(){
  return canvasTex((ctx,w,h)=>{
    ctx.fillStyle = '#131a34'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let y=0;y<h;y+=22){
      for (let x=0;x<w;x+=110){
        ctx.fillRect(x+Math.random()*10, y+Math.random()*4, 90, 12);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    for (let y=0;y<h;y+=32){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
  });
}

function leatherTex(){
  return canvasTex((ctx,w,h)=>{
    ctx.fillStyle = '#2b2f3a'; ctx.fillRect(0,0,w,h);
    for (let i=0;i<9000;i++){
      const x=Math.random()*w, y=Math.random()*h;
      const a=Math.random()*0.10;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(x,y,1,1);
    }
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#121420';
    for (let i=0;i<200;i++){
      const x=Math.random()*w, y=Math.random()*h;
      ctx.beginPath(); ctx.arc(x,y,Math.random()*14,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

function metalTex(){
  return canvasTex((ctx,w,h)=>{
    ctx.fillStyle='#222531'; ctx.fillRect(0,0,w,h);
    const g=ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0,'rgba(255,255,255,0.10)');
    g.addColorStop(0.5,'rgba(255,255,255,0.02)');
    g.addColorStop(1,'rgba(255,255,255,0.10)');
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(255,255,255,0.08)';
    for (let i=0;i<18;i++){ ctx.beginPath(); ctx.moveTo(0,i*28); ctx.lineTo(w,i*28); ctx.stroke(); }
  });
}

function matWithTex(tex, baseColor, rough=0.92, metal=0.05, emissive=0x000000, em=0){
  const m = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: rough,
    metalness: metal,
    emissive,
    emissiveIntensity: em,
    map: tex
  });
  return m;
}

/* ------------------ Mobile joystick + touch look ------------------ */
function bindJoystick(){
  const joy = $('joy');
  const nub = $('nub');
  if (!joy || !nub) return { x:0, y:0 };

  let active=false;
  let center={x:0,y:0};
  const vec={x:0,y:0};
  const radius=42;

  const setNub = (dx,dy)=> nub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

  joy.addEventListener('pointerdown',(e)=>{ active=true; center={x:e.clientX,y:e.clientY}; },{passive:true});
  window.addEventListener('pointermove',(e)=>{
    if(!active) return;
    const dx=e.clientX-center.x, dy=e.clientY-center.y;
    const len=Math.hypot(dx,dy);
    const cl=Math.min(len,radius);
    const nx=len?dx/len:0, ny=len?dy/len:0;
    const px=nx*cl, py=ny*cl;
    setNub(px,py);
    vec.x = px/radius;
    vec.y = py/radius;
  },{passive:true});
  window.addEventListener('pointerup',()=>{ active=false; vec.x=0; vec.y=0; setNub(0,0); },{passive:true});

  return vec;
}

function bindLook(rig, camera){
  let look=false, lx=0, ly=0;
  window.addEventListener('pointerdown',(e)=>{
    if (e.target?.id === 'joy' || e.target?.id === 'nub') return;
    look=true; lx=e.clientX; ly=e.clientY;
  },{passive:true});
  window.addEventListener('pointermove',(e)=>{
    if(!look) return;
    const dx=(e.clientX-lx)/window.innerWidth;
    const dy=(e.clientY-ly)/window.innerHeight;
    lx=e.clientX; ly=e.clientY;
    rig.rotation.y -= dx*2.2;
    camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - dy*1.6, -1.1, 1.1);
  },{passive:true});
  window.addEventListener('pointerup',()=>{ look=false; },{passive:true});
}

/* ------------------ Colliders (simple AABB list) ------------------ */
class Colliders {
  constructor(){ this.boxes=[]; }
  addBoxFrom(obj, pad=0){
    obj.updateWorldMatrix(true,true);
    const b = new THREE.Box3().setFromObject(obj);
    if (pad) b.expandByScalar(pad);
    this.boxes.push(b);
  }
  blocks(p, r){
    for (const b of this.boxes){
      if (p.x >= (b.min.x-r) && p.x <= (b.max.x+r) &&
          p.z >= (b.min.z-r) && p.z <= (b.max.z+r)) return true;
    }
    return false;
  }
  tryMove(cur, next, r){
    if (!this.blocks(next,r)) return next;
    const xOnly = new THREE.Vector3(next.x,next.y,cur.z);
    if (!this.blocks(xOnly,r)) return xOnly;
    const zOnly = new THREE.Vector3(cur.x,next.y,next.z);
    if (!this.blocks(zOnly,r)) return zOnly;
    return cur;
  }
}

/* ------------------ XR input helpers ------------------ */
function getXRInputs(renderer){
  const s = renderer.xr.getSession?.();
  if (!s) return [];
  const list = [];
  for (const src of s.inputSources){
    if (src?.gamepad){
      list.push({ handedness: src.handedness || 'none', gp: src.gamepad });
    }
  }
  return list;
}
function pickBestStick(inputs){
  const pairs = [[2,3],[0,1]];
  let best = { x:0, y:0, mag:0 };
  for (const it of inputs){
    const axes = it.gp.axes || [];
    for (const [ix,iy] of pairs){
      if (axes.length <= Math.max(ix,iy)) continue;
      const x = axes[ix] ?? 0;
      const y = axes[iy] ?? 0;
      const mag = Math.abs(x) + Math.abs(y);
      if (mag > best.mag) best = { x, y, mag };
    }
  }
  const dz = 0.16;
  best.x = Math.abs(best.x) < dz ? 0 : best.x;
  best.y = Math.abs(best.y) < dz ? 0 : best.y;
  return best;
}
function getStickByHand(inputs, hand){
  const pairs = [[2,3],[0,1]];
  for (const it of inputs){
    if (it.handedness !== hand) continue;
    const axes = it.gp.axes || [];
    let best = { x:0, y:0, mag:0 };
    for (const [ix,iy] of pairs){
      if (axes.length <= Math.max(ix,iy)) continue;
      const x = axes[ix] ?? 0;
      const y = axes[iy] ?? 0;
      const mag = Math.abs(x) + Math.abs(y);
      if (mag > best.mag) best = { x, y, mag };
    }
    const dz = 0.16;
    best.x = Math.abs(best.x) < dz ? 0 : best.x;
    best.y = Math.abs(best.y) < dz ? 0 : best.y;
    return best;
  }
  return { x:0, y:0 };
}
function btnDown(gp, idx){
  const b = gp.buttons?.[idx];
  return !!(b && b.pressed);
}

/* ------------------ Card rendering (deeper + higher contrast) ------------------ */
function makeCardFace(rank, suit, faceUp=true){
  const g = new THREE.BoxGeometry(CFG.cardW, 0.012, CFG.cardH);

  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 720;
  const ctx = canvas.getContext('2d');

  const isRed = (suit === '♦' || suit === '♥');

  if (faceUp){
    // brighter face with stronger contrast
    ctx.fillStyle = '#fbfbff';
    ctx.fillRect(0,0,512,720);

    // inner shadow
    const sh = ctx.createLinearGradient(0,0,512,720);
    sh.addColorStop(0,'rgba(0,0,0,0.06)');
    sh.addColorStop(0.5,'rgba(0,0,0,0)');
    sh.addColorStop(1,'rgba(0,0,0,0.06)');
    ctx.fillStyle = sh;
    ctx.fillRect(0,0,512,720);

    // border
    ctx.strokeStyle = 'rgba(0,0,0,0.30)';
    ctx.lineWidth = 14;
    ctx.strokeRect(14,14,512-28,720-28);

    // corner rank/suit
    ctx.fillStyle = isRed ? '#d11f2a' : '#0f1320';
    ctx.font = '900 96px system-ui, Arial';
    ctx.fillText(rank, 36, 120);
    ctx.font = '900 110px system-ui, Arial';
    ctx.fillText(suit, 38, 250);

    // center pip watermark
    ctx.globalAlpha = 0.13;
    ctx.font = '900 330px system-ui, Arial';
    ctx.fillText(suit, 170, 500);
    ctx.globalAlpha = 1;
  } else {
    // card back (deep blue + pattern)
    ctx.fillStyle = '#0c1b3a';
    ctx.fillRect(0,0,512,720);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 18;
    ctx.strokeRect(18,18,512-36,720-36);

    ctx.globalAlpha = 0.55;
    ctx.fillStyle = 'rgba(0,212,255,0.18)';
    for (let y=80;y<720;y+=80){
      for (let x=60;x<512;x+=90){
        ctx.beginPath();
        ctx.arc(x,y,18,0,Math.PI*2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.font = '900 90px system-ui, Arial';
    ctx.fillText('NOVA', 170, 390);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;

  // materials: top face uses canvas; sides darker edge; bottom slightly darker
  const topMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.02 });
  const sideMat = new THREE.MeshStandardMaterial({ color: 0x1a1d27, roughness: 0.9, metalness: 0.02 });
  const bottomMat = new THREE.MeshStandardMaterial({ color: 0xe7e7ef, roughness: 0.85, metalness: 0.02 });

  // BoxGeometry groups: [right,left,top,bottom,front,back] for x/y/z faces
  const mats = [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];

  const mesh = new THREE.Mesh(g, mats);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function dealRandomCards(){
  const ranks = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
  const suits = ['♠','♦','♣','♥'];
  const pick = ()=> ({ r: ranks[Math.floor(Math.random()*ranks.length)], s: suits[Math.floor(Math.random()*suits.length)] });
  return { hole:[pick(),pick()], community:[pick(),pick(),pick(),pick(),pick()] };
}

/* ------------------ Name tags (look-to-show optional later; for now always visible on bots) ------------------ */
function makeNameTag(name, rank='Rookie', bg='#10131c', glow='#00d4ff'){
  const c = document.createElement('canvas');
  c.width = 512; c.height = 192;
  const ctx = c.getContext('2d');

  // background
  ctx.fillStyle = bg; ctx.fillRect(0,0,512,192);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 10;
  ctx.strokeRect(10,10,492,172);

  // glow strip
  ctx.fillStyle = glow;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(18, 24, 476, 18);
  ctx.globalAlpha = 1;

  // name
  ctx.fillStyle = '#eaf2ff';
  ctx.font = '900 58px system-ui, Arial';
  ctx.fillText(name, 22, 110);

  // rank + badge placeholders
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '700 28px system-ui, Arial';
  ctx.fillText(rank, 24, 155);

  // 3 badge dots
  for (let i=0;i<3;i++){
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.arc(430 + i*26, 148, 10, 0, Math.PI*2); ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;

  const mat = new THREE.SpriteMaterial({ map: tex, transparent:true });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(0.95, 0.35, 1);
  return spr;
}

/* ------------------ Wrist menu + Store panel (basic, working now) ------------------ */
function makeWristMenu(){
  const g = new THREE.Group();

  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.16),
    new THREE.MeshStandardMaterial({
      color: 0x0b0d12,
      roughness: 0.5,
      metalness: 0.12,
      emissive: 0x00d4ff,
      emissiveIntensity: 0.15
    })
  );
  bg.position.set(0.08, 0.05, -0.11);
  bg.rotation.y = Math.PI;
  g.add(bg);

  const mk = (y, text, color) => {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 0.03),
      new THREE.MeshStandardMaterial({
        color: 0x111219,
        roughness: 0.3,
        metalness: 0.08,
        emissive: color,
        emissiveIntensity: 0.35
      })
    );
    panel.position.set(0.08, 0.05 + y, -0.109);
    panel.rotation.y = Math.PI;
    g.add(panel);

    // label sprite
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0,0,512,128);
    ctx.fillStyle = '#eaf2ff';
    ctx.font = '900 60px system-ui, Arial';
    ctx.fillText(text, 24, 86);
    const t = new THREE.CanvasTexture(c);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent:true }));
    spr.scale.set(0.20, 0.05, 1);
    spr.position.copy(panel.position).add(new THREE.Vector3(0,0,0.002));
    spr.rotation.y = Math.PI;
    g.add(spr);

    return panel;
  };

  const btnStore = mk(0.045, 'STORE', 0x00ffd5);
  const btnAudio = mk(0.005, 'AUDIO', 0xffc36b);
  const btnReset = mk(-0.035, 'RESET', 0x8a6bff);

  g.visible = false;

  return { group: g, btnStore, btnAudio, btnReset };
}

function makeStoreCanvas(items){
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#0b0d12'; ctx.fillRect(0,0,1024,1024);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 16;
  ctx.strokeRect(16,16,1024-32,1024-32);

  ctx.fillStyle = '#eaf2ff';
  ctx.font = '900 86px system-ui, Arial';
  ctx.fillText('STORE', 40, 110);

  ctx.font = '700 42px system-ui, Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.fillText('Membership $25 → + Event Chip (gold) + perks', 40, 170);

  // grid list (40 items)
  const startY = 230;
  const colX = [60, 540];
  let y = startY;
  let col = 0;

  ctx.font = '800 44px system-ui, Arial';
  for (let i=0;i<items.length;i++){
    const x = colX[col];
    ctx.fillStyle = 'rgba(0,212,255,0.10)';
    ctx.fillRect(x-20, y-44, 420, 62);

    ctx.fillStyle = '#eaf2ff';
    ctx.fillText(items[i], x, y);

    col = 1-col;
    if (col === 0) y += 84;
  }

  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

/* ------------------ Simple bots ------------------ */
function buildBot(color){
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness:0.85, metalness:0.05 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.52, 6, 12), m);
  torso.position.y = 0.95;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 14), m);
  head.position.y = 1.45;

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 12, 12),
    new THREE.MeshStandardMaterial({ color:0x111111, emissive: color, emissiveIntensity: 0.75, roughness:0.3, metalness:0.1 })
  );
  glow.position.y = 1.75;

  g.add(torso, head, glow);
  return g;
}

/* ------------------ Oval table builder ------------------ */
function ellipsePoints(a, b, seg=80){
  const pts = [];
  for (let i=0;i<=seg;i++){
    const t = (i/seg)*Math.PI*2;
    pts.push(new THREE.Vector3(Math.cos(t)*a, 0, Math.sin(t)*b));
  }
  return pts;
}

function buildOvalTable(mFelt, mRail, mBase){
  const table = new THREE.Group();

  // Top: Extrude ellipse shape
  const shape = new THREE.Shape();
  const seg = 80;
  for (let i=0;i<=seg;i++){
    const t = (i/seg)*Math.PI*2;
    const x = Math.cos(t)*CFG.ovalA;
    const y = Math.sin(t)*CFG.ovalB;
    if (i===0) shape.moveTo(x,y);
    else shape.lineTo(x,y);
  }
  const geoTop = new THREE.ExtrudeGeometry(shape, { depth: CFG.tableTopThick, bevelEnabled:false, curveSegments: seg });
  geoTop.rotateX(-Math.PI/2);
  geoTop.translate(0, CFG.tableY, 0);

  const top = new THREE.Mesh(geoTop, mFelt);
  top.castShadow = true; top.receiveShadow = true;
  table.add(top);

  // Rail trim: tube along ellipse
  const pts = ellipsePoints(CFG.ovalA*0.98, CFG.ovalB*0.98, 120);
  const curve = new THREE.CatmullRomCurve3(pts, true);
  const geoRail = new THREE.TubeGeometry(curve, 160, CFG.railRadius, 14, true);
  const rail = new THREE.Mesh(geoRail, mRail);
  rail.position.y = CFG.tableY + CFG.tableTopThick*0.55;
  rail.castShadow = true; rail.receiveShadow = true;
  table.add(rail);

  // Base pedestal
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.50, 0.68, 0.95, 18), mBase);
  base.position.y = CFG.tableY - 0.55;
  base.castShadow = true; base.receiveShadow = true;
  table.add(base);

  return table;
}

/* ------------------ Poker Loop (auto-running for observation) ------------------ */
const STREET = {
  PREFLOP: 'PREFLOP',
  FLOP: 'FLOP',
  TURN: 'TURN',
  RIVER: 'RIVER',
  SHOWDOWN: 'SHOWDOWN',
  RESET: 'RESET',
};

function bestHandLabelMock(){
  // placeholder (real evaluator later)
  const labels = ['Pair', 'Two Pair', 'Trips', 'Straight', 'Flush', 'Full House', 'Quads', 'Straight Flush'];
  return labels[Math.floor(Math.random()*labels.length)];
}

/* ------------------ MAIN BOOT ------------------ */
export async function boot(){
  crashCatcher();
  logLine('✅ Update D+ boot… (oval table + poker loop + more bots + store + audio)');

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  document.body.appendChild(renderer.domElement);

  // VR Button
  document.body.appendChild(VRButton.createButton(renderer));
  setTimeout(()=>{
    const b = document.getElementById('VRButton');
    if (b){
      b.style.top='12px'; b.style.right='12px';
      b.style.left='auto'; b.style.bottom='auto';
      b.style.position='fixed'; b.style.zIndex='10000';
    }
  }, 50);

  renderer.xr.addEventListener('sessionstart', ()=>{
    logLine('✅ XR session started. (Y toggles menu; Oculus button is OS-reserved)');
    renderer.setPixelRatio(1); // Quest stability
  });

  // Scene / Camera / Rig
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04050b);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 250);
  camera.position.set(0, 1.6, 0);

  const rig = new THREE.Group();
  rig.position.set(0, 0, 10); // safe spawn
  rig.add(camera);
  scene.add(rig);

  // Lights (casino style)
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  scene.add(new THREE.HemisphereLight(0xb7c8ff, 0x120c18, 1.15));

  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(12, 18, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(1024,1024);
  scene.add(key);

  const neon1 = new THREE.PointLight(0x8a6bff, 3.6, 60, 2);
  neon1.position.set(0, 3.6, 0);
  scene.add(neon1);

  const neon2 = new THREE.PointLight(0x00ffd5, 2.4, 55, 2);
  neon2.position.set(-12, 2.8, -9);
  scene.add(neon2);

  // Materials (procedural textures so it’s not gray)
  const mFloor = matWithTex(floorTex(), 0xffffff, 0.96, 0.02);
  mFloor.map.repeat.set(6,6);

  const mWall  = matWithTex(wallTex(), 0xffffff, 0.92, 0.04);
  mWall.map.repeat.set(2,2);

  const mFelt  = matWithTex(feltTex(), 0xffffff, 0.90, 0.04);
  mFelt.map.repeat.set(2,2);

  const mRail  = matWithTex(leatherTex(), 0xffffff, 0.82, 0.06, 0x111111, 0.10);
  const mMetal = matWithTex(metalTex(), 0xffffff, 0.85, 0.18);
  const mBase  = new THREE.MeshStandardMaterial({ color: 0x171a24, roughness:0.92, metalness:0.06 });

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(CFG.floorSize, CFG.floorSize), mFloor);
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Walls
  const walls = new THREE.Group();
  const mkWall = (sx,sy,sz,x,y,z)=>{
    const w = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), mWall);
    w.position.set(x,y,z);
    w.castShadow = true; w.receiveShadow = true;
    walls.add(w);
  };
  mkWall(44, CFG.wallH, CFG.wallT, 0, CFG.wallH/2, -CFG.roomHalf);
  mkWall(44, CFG.wallH, CFG.wallT, 0, CFG.wallH/2,  CFG.roomHalf);
  mkWall(CFG.wallT, CFG.wallH, 44, -CFG.roomHalf, CFG.wallH/2, 0);
  mkWall(CFG.wallT, CFG.wallH, 44,  CFG.roomHalf, CFG.wallH/2, 0);
  scene.add(walls);

  // Neon strips
  const neonStripM = new THREE.MeshStandardMaterial({ color:0x111219, emissive:0x00ffd5, emissiveIntensity:0.75, roughness:0.25, metalness:0.1 });
  function addStrip(x,z,rot){
    const s = new THREE.Mesh(new THREE.BoxGeometry(10, 0.06, 0.12), neonStripM);
    s.position.set(x, 2.6, z);
    s.rotation.y = rot;
    scene.add(s);
  }
  addStrip(0, -12, 0);
  addStrip(0,  12, 0);
  addStrip(-12, 0, Math.PI/2);
  addStrip( 12, 0, Math.PI/2);

  // Table (oval)
  const table = buildOvalTable(mFelt, mRail, mBase);
  scene.add(table);

  // Seats (6 around oval)
  const seats = [];
  for (let i=0;i<6;i++){
    const a = (i/6)*Math.PI*2;
    const anchor = new THREE.Object3D();
    anchor.position.set(Math.sin(a)*CFG.seatR, 0, Math.cos(a)*CFG.seatR);
    anchor.lookAt(0, 1.2, 0);
    scene.add(anchor);
    seats.push(anchor);
  }

  // Simple chairs (solid)
  const chairM = new THREE.MeshStandardMaterial({ color:0x3b3f4b, roughness:0.95, metalness:0.03, map: leatherTex() });
  chairM.map.repeat.set(1,1);

  function buildChair(){
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.10,0.55), chairM);
    seat.position.y = 0.35;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.55,0.10), chairM);
    back.position.set(0, 0.70, -0.23);

    const legGeo = new THREE.BoxGeometry(0.08,0.35,0.08);
    const offs = [[-0.22,0.175,-0.22],[0.22,0.175,-0.22],[-0.22,0.175,0.22],[0.22,0.175,0.22]];
    for (const o of offs){
      const l = new THREE.Mesh(legGeo, mMetal);
      l.position.set(o[0], o[1], o[2]);
      g.add(l);
    }
    g.add(seat, back);
    return g;
  }

  const chairs = new THREE.Group();
  for (let i=0;i<6;i++){
    const a = (i/6)*Math.PI*2;
    const ch = buildChair();
    ch.position.set(Math.sin(a)*(CFG.seatR+0.42), 0, Math.cos(a)*(CFG.seatR+0.42));
    ch.lookAt(0,0,0);
    ch.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
    chairs.add(ch);
  }
  scene.add(chairs);

  // Store kiosk + store panel
  const kiosk = new THREE.Group();
  kiosk.position.set(-14, 0, -10);
  kiosk.rotation.y = Math.PI/4;

  const kioskStand = new THREE.Mesh(new THREE.BoxGeometry(1.2,2.2,0.6), new THREE.MeshStandardMaterial({
    color:0x151723, roughness:0.92, metalness:0.06
  }));
  kioskStand.position.y = 1.1;
  kioskStand.castShadow = true; kioskStand.receiveShadow = true;

  const storeItems = [
    'Hoodie - Neon', 'Hoodie - Gold', 'Hoodie - Black', 'Shades - Aviator',
    'Shades - Night', 'Cap - Team Nova', 'Cap - Poker Pro', 'Necklace - Gold',
    'Necklace - Silver', 'Chain - Nova', 'Tee - Tournament', 'Tee - Classic',
    'Jacket - Velvet', 'Jacket - Leather', 'Gloves - Black', 'Gloves - White',
    'Badge - Weekly', 'Badge - Showdown', 'Frame - Bronze', 'Frame - Silver',
    'Frame - Gold', 'Emote - Wave', 'Emote - Clap', 'Emote - GG',
    'Chip Skin - Neon', 'Chip Skin - Gold', 'Table Theme - Green', 'Table Theme - Black',
    'Felt Theme - Blue', 'Felt Theme - Red', 'Title - Grinder', 'Title - Shark',
    'Title - High Roller', 'Aura - 3 Win', 'Aura - 5 Win', 'Music Pack - Lobby',
    'Dealer Voice Pack', 'Card Back - Nova', 'Card Back - Gold', 'Event Shirt - 1'
  ];

  const storeTex = makeStoreCanvas(storeItems);
  const kioskScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05,0.75),
    new THREE.MeshStandardMaterial({
      map: storeTex,
      emissive: 0x00d4ff,
      emissiveIntensity: 0.12,
      roughness: 0.6,
      metalness: 0.06
    })
  );
  kioskScreen.position.set(0, 1.62, 0.31);
  kioskScreen.castShadow = true;

  kiosk.add(kioskStand, kioskScreen);
  scene.add(kiosk);

  // Controllers + hands
  const controllerL = renderer.xr.getController(0);
  const controllerR = renderer.xr.getController(1);
  rig.add(controllerL);
  rig.add(controllerR);

  // Hand tracking attempt (Quest: if enabled + supported)
  const handModelFactory = new XRHandModelFactory();
  const hand1 = renderer.xr.getHand(0);
  const hand2 = renderer.xr.getHand(1);
  hand1.add(handModelFactory.createHandModel(hand1, "mesh"));
  hand2.add(handModelFactory.createHandModel(hand2, "mesh"));
  rig.add(hand1);
  rig.add(hand2);

  // Laser (teleport aim)
  const laserGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
  const laserMat = new THREE.LineBasicMaterial({ transparent:true, opacity:0.85 });
  const laser = new THREE.Line(laserGeom, laserMat);
  laser.scale.z = 12;
  controllerR.add(laser);

  // Teleport marker
  const tpMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.18,0.22, 28),
    new THREE.MeshStandardMaterial({ color:0x111111, emissive:0x00ffd5, emissiveIntensity:0.85, roughness:0.25, metalness:0.1 })
  );
  tpMarker.rotation.x = -Math.PI/2;
  tpMarker.visible = false;
  scene.add(tpMarker);

  const ray = new THREE.Raycaster();
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3();
  let teleportOn = true;

  function updateTeleportPreview(){
    if (!renderer.xr.isPresenting || !teleportOn) { tpMarker.visible=false; return; }
    controllerR.getWorldPosition(origin);
    dir.set(0,0,-1).applyQuaternion(controllerR.getWorldQuaternion(new THREE.Quaternion())).normalize();
    ray.set(origin, dir);

    const t = (0 - origin.y) / dir.y;
    if (!isFinite(t) || t <= 0) { tpMarker.visible=false; return; }
    const hit = origin.clone().add(dir.clone().multiplyScalar(t));
    if (Math.abs(hit.x) > (CFG.roomHalf-1) || Math.abs(hit.z) > (CFG.roomHalf-1)) { tpMarker.visible=false; return; }

    tpMarker.position.copy(hit);
    tpMarker.visible=true;
  }
  function doTeleport(){
    if (!tpMarker.visible) return;
    rig.position.x = tpMarker.position.x;
    rig.position.z = tpMarker.position.z;
    logLine('🌀 Teleport');
  }
  controllerR.addEventListener('select', ()=>{ if (renderer.xr.isPresenting && teleportOn) doTeleport(); });

  // Wrist menu + interactions (simple toggles)
  const { group: wristMenu, btnStore, btnAudio, btnReset } = makeWristMenu();
  controllerL.add(wristMenu);

  // Audio
  const listener = new THREE.AudioListener();
  camera.add(listener);
  const music = new THREE.Audio(listener);
  const audioLoader = new THREE.AudioLoader();
  let musicReady=false;
  let musicOn=false;

  function loadMusic(){
    audioLoader.load(
      'assets/audio/lobby_ambience.mp3',
      (buffer)=>{
        music.setBuffer(buffer);
        music.setLoop(true);
        music.setVolume(0.55);
        musicReady=true;
        logLine('🎵 Audio loaded: assets/audio/lobby_ambience.mp3');
      },
      undefined,
      ()=>{
        logLine('⚠️ Audio missing: put lobby_ambience.mp3 in assets/audio/');
      }
    );
  }
  loadMusic();

  function toggleMusic(){
    if (!musicReady){
      logLine('⚠️ Audio not ready yet (or file missing).');
      return;
    }
    musicOn = !musicOn;
    if (musicOn){ music.play(); logLine('🎵 Audio ON'); }
    else { music.pause(); logLine('🔇 Audio OFF'); }
  }

  // Colliders
  const colliders = new Colliders();
  colliders.addBoxFrom(walls, 0);
  colliders.addBoxFrom(table, 0.20);
  colliders.addBoxFrom(chairs, 0.10);
  colliders.addBoxFrom(kiosk, 0.15);

  // Bots: 6 seated + 2 wander
  const bots = new THREE.Group();
  scene.add(bots);

  const botColors = [0x6aa2ff, 0xff8a6b, 0x6bffa8, 0xe5d36a, 0x7a7f92, 0x9a7cff, 0x00ffd5, 0xffc36b];

  const seated = [];
  for (let i=0;i<CFG.seatedBots;i++){
    const b = buildBot(botColors[i%botColors.length]);
    b.position.copy(seats[i].position);
    b.lookAt(0, 1.2, 0);

    const tag = makeNameTag(`NovaBot ${String(i+1).padStart(2,'0')}`, ['Rookie','Bronze','Silver','Gold'][i%4], '#0b0d12', ['#00ffd5','#8a6bff','#ff9a6b','#ffc36b'][i%4]);
    tag.position.set(0, 2.15, 0);
    b.add(tag);

    bots.add(b);
    seated.push({ obj:b, seatIndex:i, bob:Math.random()*10 });
  }

  const wander = [];
  for (let i=0;i<CFG.wanderBots;i++){
    const idx = CFG.seatedBots + i;
    const b = buildBot(botColors[idx%botColors.length]);
    b.position.set(-10 + i*3.0, 0, 6);
    b.lookAt(0, 1.2, 0);

    const tag = makeNameTag(`Walker ${i+1}`, 'Observer', '#0b0d12', '#00d4ff');
    tag.position.set(0, 2.15, 0);
    b.add(tag);

    bots.add(b);
    wander.push({ obj:b, base:b.position.clone(), target:b.position.clone(), t:Math.random()*10 });
  }

  function pickWanderTarget(base){
    const a = Math.random()*Math.PI*2;
    const r = Math.random()*CFG.botWanderRadius;
    return new THREE.Vector3(base.x + Math.sin(a)*r, 0, base.z + Math.cos(a)*r);
  }
  for (const w of wander) w.target = pickWanderTarget(w.base);

  // Cards on table: community always placed; hole cards for each seat always placed (bots face-down, you face-up)
  const cardRoot = new THREE.Group();
  scene.add(cardRoot);

  const communitySlots = [];
  for (let i=0;i<5;i++){
    const slot = new THREE.Object3D();
    slot.position.set(-0.70 + i*0.35, CFG.tableY + CFG.tableTopThick + 0.006, 0);
    slot.rotation.set(0,0,0);
    communitySlots.push(slot);
  }

  // community meshes (start face-down)
  let communityCards = [];
  for (let i=0;i<5;i++){
    const c = makeCardFace('A','♠', false);
    c.position.copy(communitySlots[i].position);
    c.rotation.x = 0; // box already "flat" in XZ by geometry orientation; we’ll rotate below
    c.rotation.set(0, 0, 0);
    // lay flat: box Y is thickness, so rotate to lay on table:
    c.rotation.x = 0;
    c.rotation.set(0, 0, 0);
    c.rotation.x = 0;
    // actually lay flat by rotating around X 90°? (Box made with width=X, height=Y, depth=Z; our "face" is on top (Y+))
    // Keep it flat by rotating nothing; just set y slightly above the felt.
    c.position.y = communitySlots[i].position.y + 0.012;
    cardRoot.add(c);
    communityCards.push(c);
  }

  // Hole cards per seat
  const holeCards = []; // [{c1,c2, seatIndex}]
  function seatForward(seatObj){
    const f = new THREE.Vector3(0,0,-1).applyQuaternion(seatObj.quaternion).normalize();
    f.y=0; f.normalize();
    return f;
  }
  function placeHoleCardsForSeat(seatIndex, faceUp=false){
    const seat = seats[seatIndex];
    const forward = seatForward(seat);
    const basePos = seat.position.clone().add(forward.clone().multiplyScalar(0.62));
    const yaw = Math.atan2(forward.x, forward.z);

    const c1 = makeCardFace('A','♦', faceUp);
    const c2 = makeCardFace('K','♠', faceUp);

    c1.position.set(basePos.x - 0.14, CFG.tableY + CFG.tableTopThick + 0.018, basePos.z);
    c2.position.set(basePos.x + 0.14, CFG.tableY + CFG.tableTopThick + 0.018, basePos.z);

    // rotate so they face the player direction (top face visible)
    c1.rotation.y = yaw;
    c2.rotation.y = yaw;

    cardRoot.add(c1); cardRoot.add(c2);
    return { c1, c2, seatIndex, faceUp };
  }

  // Allocate hole cards: seat 0 = you (faceUp), others faceDown
  for (let i=0;i<6;i++){
    holeCards.push(placeHoleCardsForSeat(i, i===0));
  }

  // Street reveal helpers (flip by swapping mesh)
  function setCommunityCard(i, rank, suit, faceUp){
    const old = communityCards[i];
    cardRoot.remove(old);

    const c = makeCardFace(rank, suit, faceUp);
    c.position.copy(communitySlots[i].position);
    c.position.y += 0.012;
    cardRoot.add(c);
    communityCards[i] = c;
  }

  function setHoleForSeat(seatIndex, r1,s1,r2,s2, faceUp){
    const rec = holeCards.find(h=>h.seatIndex===seatIndex);
    cardRoot.remove(rec.c1); cardRoot.remove(rec.c2);
    const seat = seats[seatIndex];
    const forward = seatForward(seat);
    const basePos = seat.position.clone().add(forward.clone().multiplyScalar(0.62));
    const yaw = Math.atan2(forward.x, forward.z);

    rec.c1 = makeCardFace(r1,s1, faceUp);
    rec.c2 = makeCardFace(r2,s2, faceUp);
    rec.c1.position.set(basePos.x - 0.14, CFG.tableY + CFG.tableTopThick + 0.018, basePos.z);
    rec.c2.position.set(basePos.x + 0.14, CFG.tableY + CFG.tableTopThick + 0.018, basePos.z);
    rec.c1.rotation.y = yaw;
    rec.c2.rotation.y = yaw;
    rec.faceUp = faceUp;
    cardRoot.add(rec.c1); cardRoot.add(rec.c2);
  }

  // Table label (round results)
  const tableLabel = makeNameTag('Waiting…', 'Table', '#0b0d12', '#00ffd5');
  tableLabel.position.set(0, CFG.tableY + 0.55, -0.2);
  scene.add(tableLabel);

  function setTableLabel(text, glow='#00ffd5'){
    // rebuild sprite quickly
    scene.remove(tableLabel);
    const nl = makeNameTag(text, 'Round', '#0b0d12', glow);
    nl.position.copy(new THREE.Vector3(0, CFG.tableY + 0.55, -0.2));
    scene.add(nl);
  }

  // Poker state machine (auto loop)
  let street = STREET.PREFLOP;
  let timer = 0;
  let dealData = null;

  function newHand(){
    dealData = dealRandomCards();

    // Hole cards: bots face-down, you face-up
    for (let i=0;i<6;i++){
      const h = dealData.hole; // for demo: reuse same structure; later per-player
      const p1 = dealRandomCards().hole[0];
      const p2 = dealRandomCards().hole[1];

      if (i===0){
        setHoleForSeat(0, p1.r,p1.s, p2.r,p2.s, true);
      } else {
        setHoleForSeat(i, p1.r,p1.s, p2.r,p2.s, false);
      }
    }

    // Community all face-down initially
    for (let i=0;i<5;i++){
      setCommunityCard(i, dealData.community[i].r, dealData.community[i].s, false);
    }

    street = STREET.PREFLOP;
    timer = 0;
    setTableLabel('Preflop…', '#8a6bff');
    logLine('🃏 New hand started (auto loop).');
  }

  function revealFlop(){
    setCommunityCard(0, dealData.community[0].r, dealData.community[0].s, true);
    setCommunityCard(1, dealData.community[1].r, dealData.community[1].s, true);
    setCommunityCard(2, dealData.community[2].r, dealData.community[2].s, true);
    setTableLabel('Flop', '#00ffd5');
  }
  function revealTurn(){
    setCommunityCard(3, dealData.community[3].r, dealData.community[3].s, true);
    setTableLabel('Turn', '#ffc36b');
  }
  function revealRiver(){
    setCommunityCard(4, dealData.community[4].r, dealData.community[4].s, true);
    setTableLabel('River', '#ff9a6b');
  }
  function showdown(){
    // pick a random winner seat 0-5
    const winner = Math.floor(Math.random()*6);
    const label = bestHandLabelMock();

    // show winner hole cards for everyone (for now)
    const rec = holeCards.find(h=>h.seatIndex===winner);
    if (rec && !rec.faceUp){
      // flip winner by rebuilding faceUp
      // keep same values? (we don’t track per-seat in demo; this is visual only)
      // We'll just turn current winner to face-up with a fresh random for now.
      const p1 = dealRandomCards().hole[0];
      const p2 = dealRandomCards().hole[1];
      setHoleForSeat(winner, p1.r,p1.s, p2.r,p2.s, true);
    }

    setTableLabel(`Winner: Seat ${winner+1} — ${label}`, '#00ffd5');
    logLine(`🏆 Showdown: Seat ${winner+1} wins with ${label}`);
  }

  newHand();

  // Buttons from HTML (if you kept my index.html UI)
  if ($('btnReset')) $('btnReset').onclick = ()=>{
    rig.position.set(0,0,10);
    rig.rotation.set(0,0,0);
    logLine('Reset position');
  };
  if ($('btnTeleport')) $('btnTeleport').onclick = ()=>{
    teleportOn = !teleportOn;
    $('btnTeleport').textContent = teleportOn ? 'Teleport On' : 'Teleport Off';
    logLine(`Teleport: ${teleportOn ? 'ON' : 'OFF'}`);
  };
  if ($('btnDeal')) $('btnDeal').onclick = ()=>{
    newHand();
  };
  // Optional new buttons if you added them in index.html:
  if ($('btnMenu')) $('btnMenu').onclick = ()=>{
    wristMenu.visible = !wristMenu.visible;
    logLine(wristMenu.visible ? '⌚ Menu ON' : '⌚ Menu OFF');
  };
  if ($('btnAudio')) $('btnAudio').onclick = toggleMusic;

  // Touch + joystick
  const joy = bindJoystick();
  bindLook(rig, camera);

  // Desktop fallback keys
  const keys = { w:false,a:false,s:false,d:false };
  window.addEventListener('keydown',(e)=>{
    if (e.key==='w') keys.w=true;
    if (e.key==='a') keys.a=true;
    if (e.key==='s') keys.s=true;
    if (e.key==='d') keys.d=true;
  });
  window.addEventListener('keyup',(e)=>{
    if (e.key==='w') keys.w=false;
    if (e.key==='a') keys.a=false;
    if (e.key==='s') keys.s=false;
    if (e.key==='d') keys.d=false;
  });

  // Button edges for Y menu (varies by controller; we scan a few)
  let prevButtons = new Map();
  function isPressedEdge(hand, idx, pressed){
    const prev = prevButtons.get(hand) || [];
    const was = !!prev[idx];
    return pressed && !was;
  }
  function storeButtonsSnapshot(inputs){
    for (const it of inputs){
      const arr = (it.gp.buttons || []).map(b=>!!b.pressed);
      prevButtons.set(it.handedness, arr);
    }
  }

  // Snap turn cooldown
  let snapCooldown = 0;

  // Main loop
  const clock = new THREE.Clock();

  renderer.setAnimationLoop(()=>{
    try{
      const dt = clock.getDelta();
      snapCooldown = Math.max(0, snapCooldown - dt);

      updateTeleportPreview();

      // XR inputs
      const inputs = renderer.xr.isPresenting ? getXRInputs(renderer) : [];

      // Y button -> toggle menu (try common indices)
      if (renderer.xr.isPresenting && inputs.length){
        for (const it of inputs){
          const hand = it.handedness;
          const candidates = [1,3,0]; // different controllers map differently
          for (const idx of candidates){
            const down = btnDown(it.gp, idx);
            if (isPressedEdge(hand, idx, down)){
              wristMenu.visible = !wristMenu.visible;
              logLine(wristMenu.visible ? '⌚ Wrist menu ON (Y)' : '⌚ Wrist menu OFF');
              break;
            }
          }
        }
      }

      // Move
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y=0; forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).normalize();

      let f=0, s=0;

      // Android joystick
      f += (-joy.y);
      s += (joy.x);

      // Desktop keys fallback
      if (keys.w) f += 1;
      if (keys.s) f -= 1;
      if (keys.d) s += 1;
      if (keys.a) s -= 1;

      // VR: auto-detect best stick for movement (fixes “left stick dead”)
      if (renderer.xr.isPresenting && inputs.length){
        const best = pickBestStick(inputs);
        s += best.x;
        f += -best.y;
      }

      const speed = renderer.xr.isPresenting ? CFG.speedVR : CFG.speedFlat;
      const desired = rig.position.clone();
      desired.addScaledVector(forward, f*speed*dt);
      desired.addScaledVector(right,   s*speed*dt);
      rig.position.copy(colliders.tryMove(rig.position, desired, CFG.playerRadius));

      // Snap-turn on RIGHT stick (45°)
      if (renderer.xr.isPresenting && inputs.length && snapCooldown <= 0){
        const rs = getStickByHand(inputs, 'right');
        if (Math.abs(rs.x) > 0.65){
          const dirTurn = rs.x > 0 ? -1 : 1;
          rig.rotation.y += THREE.MathUtils.degToRad(CFG.snapTurnDeg) * dirTurn;
          snapCooldown = CFG.snapTurnCooldown;
        }
      }

      // Bot animation
      for (const b of seated){
        b.bob += dt;
        b.obj.position.y = Math.sin(b.bob*2.0)*0.02;
        b.obj.lookAt(0, 1.2, 0);
      }
      for (const w of wander){
        w.t += dt;
        w.obj.position.y = Math.sin(w.t*2.0)*0.02;

        const p = w.obj.position.clone();
        const to = new THREE.Vector3(w.target.x, 0, w.target.z).sub(new THREE.Vector3(p.x,0,p.z));
        const dist = to.length();
        if (dist < 0.20){
          w.target = pickWanderTarget(w.base);
        } else {
          to.normalize();
          const next = new THREE.Vector3(p.x + to.x*CFG.botSpeed*dt, 0, p.z + to.z*CFG.botSpeed*dt);
          next.x = THREE.MathUtils.clamp(next.x, -CFG.roomHalf+2, CFG.roomHalf-2);
          next.z = THREE.MathUtils.clamp(next.z, -CFG.roomHalf+2, CFG.roomHalf-2);

          // keep wander bots away from table center
          const dx = next.x, dz = next.z;
          const nearTable = (dx*dx + dz*dz) < (Math.max(CFG.ovalA,CFG.ovalB)+1.4)**2;
          if (!nearTable){
            w.obj.position.x = next.x;
            w.obj.position.z = next.z;
          }
        }
        w.obj.lookAt(0, 1.2, 0);
      }

      // Auto poker loop
      timer += dt;
      if (street === STREET.PREFLOP && timer >= CFG.tPreflop){
        street = STREET.FLOP; timer = 0;
        revealFlop();
      } else if (street === STREET.FLOP && timer >= CFG.tFlop){
        street = STREET.TURN; timer = 0;
        revealTurn();
      } else if (street === STREET.TURN && timer >= CFG.tTurn){
        street = STREET.RIVER; timer = 0;
        revealRiver();
      } else if (street === STREET.RIVER && timer >= CFG.tRiver){
        street = STREET.SHOWDOWN; timer = 0;
        showdown();
      } else if (street === STREET.SHOWDOWN && timer >= CFG.tShowdown){
        street = STREET.RESET; timer = 0;
        setTableLabel('Reset…', '#7a7f92');
      } else if (street === STREET.RESET && timer >= CFG.tReset){
        newHand();
      }

      // Save button states
      if (renderer.xr.isPresenting && inputs.length) storeButtonsSnapshot(inputs);

      renderer.render(scene, camera);
    } catch (err){
      logLine(`❌ LOOP ERROR: ${err?.message || err}`);
      if (err?.stack) logLine(err.stack);
      renderer.setAnimationLoop(null);
      try{ renderer.xr.getSession()?.end(); }catch(e){}
    }
  });

  // Resize
  window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, { passive:true });

  logLine('✅ Ready: ENTER VR (top-right).');
  logLine('Poker loop runs continuously for observation.');
  logLine('Audio: put assets/audio/lobby_ambience.mp3 then toggle from menu (or add btnAudio).');
}
