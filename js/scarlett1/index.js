// /js/scarlett1/index.js
// SCARLETT1 — ULTIMATE LOBBY + POKER TEACHING DEMO (XR + Android sticks)
// Build: SCARLETT1_RUNTIME_ULTIMATE_v1_7

import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

const BUILD = "SCARLETT1_RUNTIME_ULTIMATE_v1_7";

// ---- diag ----
const dwrite = (m) => { try { window.__scarlettDiagWrite?.(String(m)); } catch (_) {} };
console.log(`[scarlett1] LIVE_FINGERPRINT ✅ ${BUILD}`);
dwrite(`[scarlett1] LIVE_FINGERPRINT ✅ ${BUILD}`);

// ---- singletons ----
window.SCARLETT = window.SCARLETT || {};
const S = window.SCARLETT;
S.BUILD = BUILD;

// ---- audio (singleton-safe) ----
S.audio = S.audio || (() => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain();
  master.gain.value = 0.30;
  master.connect(ctx.destination);

  const resume = async () => { try { if (ctx.state !== "running") await ctx.resume(); } catch (_) {} };

  const tone = (freq = 440, dur = 0.04, vol = 0.10, type = "sine") => {
    if (!S.audioEnabled) return;
    if (ctx.state !== "running") return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(master);
    o.start(); o.stop(ctx.currentTime + dur);
  };

  const card = () => tone(900, 0.02, 0.08, "triangle");
  const chip = () => tone(260, 0.03, 0.10, "square");
  const hum = (() => {
    let n = null;
    return (on) => {
      if (!S.audioEnabled) on = false;
      if (!on) { if (n) { try { n.stop(); } catch (_) {} n = null; } return; }
      if (ctx.state !== "running" || n) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 55;
      g.gain.value = 0.015;
      o.connect(g); g.connect(master);
      o.start();
      n = o;
    };
  })();

  return { ctx, master, resume, tone, card, chip, hum };
})();

function nowMs(){ return performance.now(); }
function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }


// ---- core renderer ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070911);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;

const app = document.getElementById('app');
if (app) app.appendChild(renderer.domElement);
else document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

dwrite('[status] booting…');
dwrite(`BUILD=${BUILD}`);

// ---- player rig ----
const rig = new THREE.Group();
rig.name = 'playerRig';
rig.add(camera);
scene.add(rig);
S.playerRig = rig;

S.forceSpawn = S.forceSpawn || function(forceRig){
  if (!forceRig) return;
  forceRig.position.set(0, 1.6, 8.0);
  forceRig.rotation.set(0, Math.PI, 0);
  forceRig.updateMatrixWorld(true);
};
S.forceSpawn(rig);
setTimeout(() => S.forceSpawn(rig), 250);
setTimeout(() => S.forceSpawn(rig), 1000);

// ---- locomotion (Android sticks + gamepad axes) ----
const MOVE = { speed: 2.0, snapTurnDeg: 30, snapCooldown: 0.25 };
let lastSnap = -999;

function getAxes(){
  // Prefer virtual axes from HTML sticks
  const v = S.vaxes;
  if (v && (Math.abs(v.lx) > 0.01 || Math.abs(v.ly) > 0.01 || Math.abs(v.rx) > 0.01 || Math.abs(v.ry) > 0.01)) {
    return { lx: v.lx, ly: v.ly, rx: v.rx, ry: v.ry, src:'vaxes' };
  }
  // Fallback to first XR input source gamepad axes if present
  try{
    const ses = renderer.xr.getSession?.();
    if (ses){
      for (const src of ses.inputSources){
        const gp = src.gamepad;
        if (!gp || !gp.axes) continue;
        // Many Quest pads: axes[2],axes[3] is stick; others vary.
        const ax = gp.axes;
        const lx = ax[2] ?? ax[0] ?? 0;
        const ly = ax[3] ?? ax[1] ?? 0;
        const rx = ax[0] ?? 0;
        const ry = ax[1] ?? 0;
        return { lx, ly, rx, ry, src:'gamepad' };
      }
    }
  }catch(_){ }
  return { lx:0, ly:0, rx:0, ry:0, src:'none' };
}

function applyLocomotion(dt){
  const a = getAxes();
  const lx = clamp(a.lx, -1, 1);
  const ly = clamp(a.ly, -1, 1);

  // forward is -Z in camera space
  const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  fwd.y = 0; fwd.normalize();
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0)).normalize().multiplyScalar(-1);

  const move = new THREE.Vector3();
  move.addScaledVector(fwd, -ly);
  move.addScaledVector(right, lx);
  if (move.lengthSq() > 0.0001){
    move.normalize().multiplyScalar(MOVE.speed * dt);
    rig.position.add(move);
  }

  // snap turn using rx
  const t = nowMs() / 1000;
  const rx = clamp(a.rx, -1, 1);
  if (Math.abs(rx) > 0.75 && (t - lastSnap) > MOVE.snapCooldown){
    const dir = rx > 0 ? -1 : 1;
    rig.rotation.y += dir * (MOVE.snapTurnDeg * Math.PI / 180);
    lastSnap = t;
  }
}

// ---- helpers: text sprites + card texture ----
function makeTextSprite(text, { fontSize=48, padding=18, color='#ffffff', bg='rgba(0,0,0,0)', maxW=512 }={}){
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
  const m = ctx.measureText(text);
  const w = Math.min(maxW, Math.ceil(m.width + padding*2));
  const h = Math.ceil(fontSize + padding*2);
  c.width = w; c.height = h;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = bg; ctx.fillRect(0,0,w,h);
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, w/2, h/2);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(w/240, h/240, 1);
  return spr;
}

const SUITS = ['♠','♥','♦','♣'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

function cardCanvas(rank, suit, faceUp=true){
  const c = document.createElement('canvas');
  c.width = 256; c.height = 356;
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);

  // rounded rect
  const rr = (x,y,w,h,r)=>{ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); };

  if (!faceUp){
    rr(10,10,236,336,18);
    ctx.fillStyle = '#173b8c'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i=0;i<14;i++) ctx.fillRect(20+i*16, 24, 8, 308);
    return c;
  }

  rr(10,10,236,336,18);
  ctx.fillStyle = '#f7f7f7'; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 4; ctx.stroke();

  const red = (suit==='♥'||suit==='♦');
  const col = red ? '#d21f2b' : '#1a1a1a';
  ctx.fillStyle = col;
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(rank, 22, 18);
  ctx.font = 'bold 42px system-ui, sans-serif';
  ctx.fillText(suit, 24, 62);

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 120px system-ui, sans-serif';
  ctx.fillText(suit, 128, 190);
  ctx.font = 'bold 80px system-ui, sans-serif';
  ctx.fillText(rank, 128, 260);

  // mirrored corner
  ctx.save();
  ctx.translate(256,356);
  ctx.rotate(Math.PI);
  ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText(rank, 22, 18);
  ctx.font = 'bold 42px system-ui, sans-serif';
  ctx.fillText(suit, 24, 62);
  ctx.restore();
  return c;
}

function makeCardMesh({rank, suit, faceUp=true, w=0.22, h=0.30}){
  const tex = new THREE.CanvasTexture(cardCanvas(rank, suit, faceUp));
  tex.anisotropy = 4;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.0, transparent: false });
  const geo = new THREE.PlaneGeometry(w, h);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

// ---- world ----
function buildWorld(){
  // lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(8, 12, 6);
  key.castShadow = true;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.55);
  fill.position.set(-8, 8, -6);
  scene.add(fill);

  // floor (with divot ring)
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x151922, roughness: 1.0 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = 'floor';
  scene.add(floor);

  // divot depression visual (slightly lower inner circle)
  const divot = new THREE.Mesh(new THREE.CircleGeometry(3.6, 64), new THREE.MeshStandardMaterial({ color: 0x0f1218, roughness: 1.0 }));
  divot.rotation.x = -Math.PI/2;
  divot.position.y = -0.04;
  scene.add(divot);

  const rail = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.12, 16, 96), new THREE.MeshStandardMaterial({ color: 0x2a2a33, roughness: 0.6, metalness: 0.1 }));
  rail.rotation.x = Math.PI/2;
  rail.position.y = 0.06;
  rail.castShadow = true;
  scene.add(rail);

  // room shell
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0c0f16, roughness: 1.0 });
  const back = new THREE.Mesh(new THREE.BoxGeometry(40, 10, 1), wallMat); back.position.set(0, 5, -18); scene.add(back);
  const front = new THREE.Mesh(new THREE.BoxGeometry(40, 10, 1), wallMat); front.position.set(0, 5, 18); scene.add(front);
  const left = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 40), wallMat); left.position.set(-18, 5, 0); scene.add(left);
  const right = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 40), wallMat); right.position.set(18, 5, 0); scene.add(right);

  // neon signage
  const sign = makeTextSprite('Scarlett Lobby', { fontSize: 72, color:'#ff4aa6' });
  sign.position.set(0, 6.5, -17.4);
  scene.add(sign);
  const sign2 = makeTextSprite('Poker Lobby', { fontSize: 64, color:'#ff7abf' });
  sign2.position.set(0, 5.6, -17.4);
  scene.add(sign2);

  // spawn pad
  const spawn = new THREE.Mesh(new THREE.CircleGeometry(0.7, 48), new THREE.MeshStandardMaterial({ color: 0x22ff88, roughness: 0.6 }));
  spawn.rotation.x = -Math.PI/2;
  spawn.position.set(0, 0.01, 8);
  spawn.name = 'spawnPad';
  scene.add(spawn);

  // poker table
  const table = new THREE.Group();
  table.name = 'pokerTableGroup';
  const top = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.45, 0.28, 48), new THREE.MeshStandardMaterial({ color: 0x1f5a34, roughness: 0.95 }));
  top.position.y = 0.20;
  top.castShadow = true;
  top.name = 'pokerTableTop';
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.55, 0.6, 32), new THREE.MeshStandardMaterial({ color: 0x2c2c35, roughness: 0.8, metalness: 0.05 }));
  base.position.y = -0.05;
  base.castShadow = true;
  table.add(top, base);
  scene.add(table);

  // community banner (label)
  const comm = makeTextSprite('COMMUNITY', { fontSize: 48, color:'#ffffff' });
  comm.position.set(0, 2.85, 0.0);
  scene.add(comm);

  dwrite('[status] world ready ✅');
  return { tableTop: top };
}

const WORLD = buildWorld();

// ---- poker demo ----
const SUITS = ['♠','♥','♦','♣'];
const RANKS = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];

function freshDeck(){
  const d=[];
  for (const s of SUITS) for (const r of RANKS) d.push({r,s});
  return d;
}
function shuffle(a){
  for (let i=a.length-1;i>0;i--){
    const j = (Math.random()*(i+1))|0;
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function makeBot(name, i, theta){
  const g = new THREE.Group();
  g.name = `bot_${i}`;
  const rad = 3.1;
  g.position.set(Math.cos(theta)*rad, 0, Math.sin(theta)*rad);
  g.lookAt(0, 0.7, 0);

  // simple body
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 4, 12), new THREE.MeshStandardMaterial({ color: 0x6b6b78, roughness: 1 }));
  body.position.y = 0.55;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 18), new THREE.MeshStandardMaterial({ color: 0x8a8a97, roughness: 1 }));
  head.position.y = 1.25;
  head.castShadow = true;
  g.add(body, head);

  // name tag
  const tag = makeTextSprite(name, { fontSize: 42, color:'#ffffff' });
  tag.position.set(0, 1.65, 0);
  g.add(tag);

  // action label (turn indicator)
  const action = makeTextSprite('', { fontSize: 44, color:'#ffefaa' });
  action.visible = false;
  action.position.set(0, 1.95, 0);
  g.add(action);

  // ring indicator on table
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 12, 32), new THREE.MeshStandardMaterial({ color: 0x222233, emissive: 0x000000, roughness: 0.4 }));
  ring.rotation.x = Math.PI/2;
  ring.position.set(Math.cos(theta)*2.15, 0.255, Math.sin(theta)*2.15);
  ring.name = `ring_${i}`;
  scene.add(ring);
  const light = new THREE.PointLight(0x00ff88, 0.0, 1.2, 2.0);
  light.position.copy(ring.position).add(new THREE.Vector3(0,0.25,0));
  scene.add(light);

  // card holders
  const flat = new THREE.Group(); flat.name='flatCards';
  const hover = new THREE.Group(); hover.name='hoverCards';
  g.add(flat, hover);

  scene.add(g);
  return { group:g, head, tag, action, ring, light, flat, hover, theta, name };
}

const SEATS = 6; // 6 bots + 1 open seat for you (visual)
const bots=[];
for (let i=0;i<SEATS;i++){
  const theta = (i/SEATS) * Math.PI*2 + Math.PI/SEATS;
  bots.push(makeBot(`BOT ${i+1}`, i, theta));
}

// open seat marker
const joinSeat = makeTextSprite('OPEN SEAT', { fontSize: 44, color:'#43f3a6' });
joinSeat.position.set(0, 1.2, -3.3);
scene.add(joinSeat);

// community cards (bigger, higher)
const community = new THREE.Group();
community.name='communityCards';
scene.add(community);
const commCards = [];
for (let i=0;i<5;i++){
  const m = makeCardMesh({ rank:'A', suit:'♠', faceUp:false, w:0.36, h:0.50 }); // ~3x
  m.position.set((i-2)*0.42, 2.35, 0.0);
  m.rotation.y = Math.PI; // face spawn
  community.add(m);
  commCards.push(m);
}

// billboard hover cards (yaw only, no tilt)
function faceCameraYaw(obj){
  const p = new THREE.Vector3();
  obj.getWorldPosition(p);
  const c = new THREE.Vector3();
  camera.getWorldPosition(c);
  const dx = c.x - p.x;
  const dz = c.z - p.z;
  const yaw = Math.atan2(dx, dz);
  obj.rotation.set(0, yaw, 0);
}

function setBotCards(bot, c1, c2){
  // clear
  while (bot.flat.children.length) bot.flat.remove(bot.flat.children[0]);
  while (bot.hover.children.length) bot.hover.remove(bot.hover.children[0]);

  // flat on table (toward bot)
  const a = makeCardMesh({ rank:c1.r, suit:c1.s, faceUp:true, w:0.18, h:0.25 });
  const b = makeCardMesh({ rank:c2.r, suit:c2.s, faceUp:true, w:0.18, h:0.25 });
  a.position.set(-0.12, 0.28, 0.10);
  b.position.set( 0.12, 0.28, 0.10);
  a.rotation.x = -Math.PI/2; b.rotation.x = -Math.PI/2;
  a.rotation.z = 0.15; b.rotation.z = -0.15;
  bot.flat.add(a,b);

  // hover mirror above head (spectator)
  const ha = makeCardMesh({ rank:c1.r, suit:c1.s, faceUp:true, w:0.20, h:0.28 });
  const hb = makeCardMesh({ rank:c2.r, suit:c2.s, faceUp:true, w:0.20, h:0.28 });
  ha.position.set(-0.13, 2.25, 0);
  hb.position.set( 0.13, 2.25, 0);
  bot.hover.add(ha,hb);
}

function setCommunity(cards){
  for (let i=0;i<5;i++){
    const mesh = commCards[i];
    const c = cards[i];
    // replace material map by recreating mesh texture (cheap)
    const tex = new THREE.CanvasTexture(cardCanvas(c.r, c.s, true));
    tex.anisotropy = 4;
    mesh.material.map?.dispose?.();
    mesh.material.map = tex;
    mesh.material.needsUpdate = true;
  }
}

// turn/action indicators
const ACTIONS = [
  'CHECK',
  'BET',
  'CALL',
  'RAISE',
  'FOLD',
];
let turnIdx = 0;
function setTurn(i, label){
  for (let b=0;b<bots.length;b++){
    const bot = bots[b];
    const active = b === i;
    bot.action.visible = active;
    if (active){
      // update sprite text by replacing canvas (small)
      bot.action.material.map.dispose?.();
      const t = makeTextSprite(label, { fontSize: 48, color:'#ffefaa' });
      bot.action.material = t.material;
      bot.action.scale.copy(t.scale);
    }
    const mat = bot.ring.material;
    mat.emissive = new THREE.Color(active ? 0x00ff88 : 0x000000);
    mat.color = new THREE.Color(active ? 0x224433 : 0x222233);
    bot.light.intensity = active ? 1.3 : 0.0;
  }
}

// deal loop
let roundT = 0;
let phase = 0;
let deck = [];
let hole = [];
let comm = [];

function setCardBack(mesh){
  const tex = new THREE.CanvasTexture(cardCanvas('', '', false));
  tex.anisotropy = 4;
  mesh.material.map?.dispose?.();
  mesh.material.map = tex;
  mesh.material.needsUpdate = true;
}

function newRound(){
  deck = shuffle(freshDeck());
  hole = bots.map(()=>[deck.pop(), deck.pop()]);
  comm = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
  // face-down first
  for (const bot of bots){
    setBotCards(bot, {r:'?', s:'?'}, {r:'?', s:'?'});
  }
  // backs for community
  for (const m of commCards) setCardBack(m);
  phase = 0;
  roundT = 0;
  turnIdx = 0;
  setTurn(turnIdx, 'CHECK / BET');
}

newRound();

function updateDeal(dt){
  roundT += dt;
  // every 1.2s advance phase
  const step = 1.2;
  const total = 8.8;

  if (roundT < step){
    // show hole cards
    for (let i=0;i<bots.length;i++){
      setBotCards(bots[i], hole[i][0], hole[i][1]);
    }
  } else if (roundT < step*2){
    // flop
    setCommunity([comm[0], comm[1], comm[2], {r:'?',s:'?'}, {r:'?',s:'?'}]);
    setCardBack(commCards[3]);
    setCardBack(commCards[4]);
  } else if (roundT < step*3){
    // turn
    setCommunity([comm[0], comm[1], comm[2], comm[3], {r:'?',s:'?'}]);
    setCardBack(commCards[4]);
  } else if (roundT < step*4){
    // river
    setCommunity(comm);
  }

  // turn indicator
  const turnStep = 0.9;
  const t = Math.floor((roundT / turnStep)) % bots.length;
  if (t != turnIdx){
    turnIdx = t;
    const label = (t % 4 == 0) ? 'CHECK / BET' : (t % 4 == 1) ? 'BET / FOLD' : (t % 4 == 2) ? 'CALL / RAISE' : 'FOLD';
    setTurn(turnIdx, label);
    S.audio.chip();
  }

  // new round
  if (roundT > total){
    S.audio.card();
    newRound();
  }
}

// ---- XR controllers + teleport ----
let teleportOn = false;
const raycaster = new THREE.Raycaster();
const tmpMat = new THREE.Matrix4();
const tmpDir = new THREE.Vector3();
const tmpPos = new THREE.Vector3();

const controllerModelFactory = new XRControllerModelFactory();
const c0 = renderer.xr.getController(0);
const c1 = renderer.xr.getController(1);
scene.add(c0); scene.add(c1);

const g0 = renderer.xr.getControllerGrip(0);
const g1 = renderer.xr.getControllerGrip(1);
g0.add(controllerModelFactory.createControllerModel(g0));
g1.add(controllerModelFactory.createControllerModel(g1));
scene.add(g0); scene.add(g1);

// laser line
function makeLaser(){
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
  const mat = new THREE.LineBasicMaterial({ color: 0x88ffdd });
  const line = new THREE.Line(geo, mat);
  line.name='laser';
  line.scale.z = 10;
  return line;
}
const laser0 = makeLaser();
const laser1 = makeLaser();
c0.add(laser0);
c1.add(laser1);

const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.18, 0.22, 36),
  new THREE.MeshBasicMaterial({ color: 0x22ff88, transparent:true, opacity:0.85, side:THREE.DoubleSide })
);
reticle.rotation.x = -Math.PI/2;
reticle.visible = false;
scene.add(reticle);

function getTeleportHit(ctrl){
  tmpMat.identity().extractRotation(ctrl.matrixWorld);
  tmpDir.set(0,0,-1).applyMatrix4(tmpMat).normalize();
  ctrl.getWorldPosition(tmpPos);
  raycaster.set(tmpPos, tmpDir);
  const hits = raycaster.intersectObjects(scene.children, true);
  for (const h of hits){
    const n = (h.object?.name||'').toLowerCase();
    if (n.includes('pokertable') || n.includes('table')) continue;
    // only near floor
    if (h.point.y > 0.35) continue;
    return h;
  }
  return null;
}

function doTeleport(ctrl){
  const hit = getTeleportHit(ctrl);
  if (!hit) return;
  // keep user height
  rig.position.set(hit.point.x, 0, hit.point.z);
  rig.position.y = 0; // floor, camera has y offset
  S.audio.tone(520,0.03,0.08,'sine');
}

c0.addEventListener('selectstart', ()=>{ if (teleportOn) doTeleport(c0); });
c1.addEventListener('selectstart', ()=>{ if (teleportOn) doTeleport(c1); });

// ---- HUD hooks ----
function qs(id){ return document.getElementById(id); }
const btnEnterVR = qs('btnEnterVR');
const btnTeleport = qs('btnTeleport');
const btnDiag = qs('btnDiag');
const btnHideHUD = qs('btnHideHUD');
const diagHud = qs('diagHud');

btnDiag?.addEventListener('click', ()=>diagHud?.classList.toggle('hidden'));
btnHideHUD?.addEventListener('click', ()=>{ document.getElementById('hud')?.classList.toggle('hidden'); document.getElementById('btnShowUI')?.classList.toggle('hidden'); });

btnTeleport?.addEventListener('click', ()=>{
  teleportOn = !teleportOn;
  btnTeleport.textContent = `Teleport: ${teleportOn ? 'ON' : 'OFF'}`;
  reticle.visible = teleportOn;
});

btnEnterVR?.addEventListener('click', async ()=>{
  try{
    if (!navigator.xr) throw new Error('WebXR not available');
    await S.audio.resume();
    S.audio.hum(true);
    const session = await navigator.xr.requestSession('immersive-vr', {
      optionalFeatures: ['local-floor','bounded-floor','hand-tracking','layers']
    });
    renderer.xr.setSession(session);
  }catch(e){
    dwrite(`[vr] ${e?.message||e}`);
  }
});

// ---- PIP (table view) ----
const pipCanvas = document.getElementById('pipCanvas');
let pipRenderer = null;
let pipCam = null;
if (pipCanvas){
  pipRenderer = new THREE.WebGLRenderer({ canvas:pipCanvas, antialias:true, alpha:true });
  pipRenderer.setPixelRatio(Math.min(2, window.devicePixelRatio||1));
  pipCam = new THREE.PerspectiveCamera(60, 4/3, 0.1, 50);
  pipCam.position.set(0, 6.5, 6.0);
  pipCam.lookAt(0, 0.8, 0);
}
function resizePip(){
  if (!pipRenderer || !pipCanvas) return;
  const w = pipCanvas.clientWidth|0;
  const h = pipCanvas.clientHeight|0;
  if (w>0 && h>0){
    pipRenderer.setSize(w, h, false);
    pipCam.aspect = w/h;
    pipCam.updateProjectionMatrix();
  }
}
window.addEventListener('resize', resizePip);
setTimeout(resizePip, 150);

// ---- animate ----
let last = performance.now();
renderer.setAnimationLoop(()=>{
  const t = performance.now();
  const dt = Math.min(0.05, (t-last)/1000);
  last = t;

  // keep ambient hum only when audio enabled
  S.audio.hum(true);

  applyLocomotion(dt);
  updateDeal(dt);

  // update reticle
  if (teleportOn){
    const hit = getTeleportHit(c0) || getTeleportHit(c1);
    if (hit){
      reticle.visible = true;
      reticle.position.copy(hit.point);
      reticle.position.y = 0.01;
    } else {
      reticle.visible = false;
    }
  }

  // billboard hover cards and action labels (yaw-only)
  for (const bot of bots){
    faceCameraYaw(bot.hover);
    faceCameraYaw(bot.action);
    faceCameraYaw(bot.tag);
  }
  faceCameraYaw(community);

  renderer.render(scene, camera);
  if (pipRenderer && pipCam){
    pipRenderer.render(scene, pipCam);
  }
});

// ---- exports ----
export async function start(){
  dwrite('[status] renderer OK ✅');
  dwrite('[status] MODULE DIAG ✅');
  dwrite('[status] MODULE TELEPORT ✅');
  dwrite('[status] MODULE BOTS ✅');
  dwrite('[status] MODULE PIP ✅');
  dwrite('xr=' + String(!!navigator.xr));
  dwrite('three=true');
  dwrite('renderer=true');
  dwrite('world=true');
  dwrite('modules=5');
  dwrite('');
  dwrite('[status] ready ✅');
}
