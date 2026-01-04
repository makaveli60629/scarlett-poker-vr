import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js';

const CFG = {
  speed: 2.2,
  vrSpeed: 1.6,
  playerRadius: 0.28,
  floorSize: 70,
  tableY: 1.0,
  tableR: 1.35,
  seatR: 2.05,
};

function logLine(txt){
  const el = document.getElementById('log');
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

// Texture guard (always show color if missing)
const texLoader = new THREE.TextureLoader();
function safeTexMat(file, fallbackColor, opts={}){
  const { repeat=1, rough=0.9, metal=0.05, emissive=0x000000, em=0 } = opts;
  const m = new THREE.MeshStandardMaterial({
    color: fallbackColor,
    roughness: rough,
    metalness: metal,
    emissive,
    emissiveIntensity: em
  });
  if (!file) return m;

  const path = `assets/textures/${file}`;
  texLoader.load(
    path,
    (t)=>{
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat, repeat);
      m.map = t;
      m.color.set(0xffffff);
      m.needsUpdate = true;
      logLine(`🧩 tex ok: ${file}`);
    },
    undefined,
    ()=>{
      // keep fallback
      logLine(`⚠️ tex missing: ${file} (using color)`);
    }
  );
  return m;
}

// Mobile joystick
function bindJoystick(){
  const joy = document.getElementById('joy');
  const nub = document.getElementById('nub');
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

// Touch look
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

// Colliders
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
      if (p.x >= (b.min.x-r) && p.x <= (b.max.x+r) && p.z >= (b.min.z-r) && p.z <= (b.max.z+r)) return true;
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

// Card with canvas face (looks better than plain)
function makeCard(rank, suit){
  const w = 0.26, h = 0.36;
  const g = new THREE.PlaneGeometry(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 356;
  const ctx = canvas.getContext('2d');

  const isRed = (suit === '♦' || suit === '♥');

  ctx.fillStyle = '#f7f7fb';
  ctx.fillRect(0,0,256,356);

  ctx.fillStyle = isRed ? '#d53b3b' : '#1b1d24';
  ctx.font = 'bold 56px system-ui, Arial';
  ctx.fillText(rank, 16, 64);
  ctx.font = 'bold 76px system-ui, Arial';
  ctx.fillText(suit, 18, 150);

  ctx.font = 'bold 128px system-ui, Arial';
  ctx.globalAlpha = 0.16;
  ctx.fillText(suit, 92, 250);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 6;
  ctx.strokeRect(8,8,240,340);

  const tex = new THREE.CanvasTexture(canvas);
  const m = new THREE.MeshBasicMaterial({ map: tex });
  return new THREE.Mesh(g, m);
}

function dealRandomCards(){
  const ranks = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
  const suits = ['♠','♦','♣','♥'];
  const pick = ()=> ({ r: ranks[Math.floor(Math.random()*ranks.length)], s: suits[Math.floor(Math.random()*suits.length)] });
  return { hole:[pick(),pick()], community:[pick(),pick(),pick(),pick(),pick()] };
}

// XR axis mapping (fix left stick)
function getAxis(renderer, handed){
  const s = renderer.xr.getSession?.();
  if (!s) return { x:0, y:0 };

  for (const src of s.inputSources){
    if (!src?.gamepad) continue;
    if (src.handedness !== handed) continue;

    const axes = src.gamepad.axes || [];
    // Try common layouts in priority order:
    // A) [2,3] (Quest in some builds)
    // B) [0,1]
    // C) fallback to whichever pair has biggest magnitude
    let pairs = [];
    if (axes.length >= 4) pairs.push([2,3],[0,1]);
    if (axes.length >= 2) pairs.push([0,1]);

    // choose pair with greatest magnitude
    let best = { x:0, y:0, mag:0 };
    for (const [ix,iy] of pairs){
      const x = axes[ix] ?? 0;
      const y = axes[iy] ?? 0;
      const mag = Math.abs(x)+Math.abs(y);
      if (mag > best.mag) best = { x, y, mag };
    }

    const dz = 0.16;
    const x = Math.abs(best.x) < dz ? 0 : best.x;
    const y = Math.abs(best.y) < dz ? 0 : best.y;
    return { x, y };
  }
  return { x:0, y:0 };
}

export async function boot(){
  crashCatcher();
  logLine('✅ Casino Texture+Light Update boot…');

  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(VRButton.createButton(renderer));
  setTimeout(()=>{
    const b = document.getElementById('VRButton');
    if (b){
      b.style.top = '12px'; b.style.right='12px';
      b.style.left='auto'; b.style.bottom='auto';
      b.style.position='fixed'; b.style.zIndex='10000';
    }
  }, 50);

  renderer.xr.addEventListener('sessionstart', ()=>{
    logLine('✅ XR session started.');
    renderer.setPixelRatio(1);
  });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060c);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 250);
  camera.position.set(0, 1.6, 0);

  const rig = new THREE.Group();
  rig.position.set(0, 0, 10);
  rig.add(camera);
  scene.add(rig);

  // Lighting (strong casino)
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0xb7c8ff, 0x120c18, 1.05);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.25);
  key.position.set(12, 18, 10);
  scene.add(key);

  const neon1 = new THREE.PointLight(0x8a6bff, 3.0, 50, 2);
  neon1.position.set(0, 3.6, 0);
  scene.add(neon1);

  const neon2 = new THREE.PointLight(0xffc36b, 2.0, 42, 2);
  neon2.position.set(-10, 2.8, -8);
  scene.add(neon2);

  // Neon strips
  const stripM = safeTexMat(null, 0x00ffd5, { rough:0.25, metal:0.1, emissive:0x00ffd5, em:0.65 });
  function addStrip(x,z,rot){
    const s = new THREE.Mesh(new THREE.BoxGeometry(10, 0.06, 0.12), stripM);
    s.position.set(x, 2.6, z);
    s.rotation.y = rot;
    scene.add(s);
  }
  addStrip(0, -12, 0);
  addStrip(0,  12, 0);
  addStrip(-12, 0, Math.PI/2);
  addStrip( 12, 0, Math.PI/2);

  // Materials with textures (if present)
  const floorM = safeTexMat('floor.jpg', 0x0f1320, { repeat:6, rough:0.95, metal:0.02 });
  const wallM  = safeTexMat('wall.jpg',  0x121735, { repeat:2, rough:0.92, metal:0.04 });
  const feltM  = safeTexMat('felt.jpg',  0x0b6a3b, { repeat:2, rough:0.90, metal:0.05 });
  const chairM = safeTexMat('chair.jpg', 0x3b3f4b, { repeat:1, rough:0.95, metal:0.03 });

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(CFG.floorSize, CFG.floorSize), floorM);
  floor.rotation.x = -Math.PI/2;
  scene.add(floor);

  // Walls
  const walls = new THREE.Group();
  const mkWall = (sx,sy,sz,x,y,z)=>{
    const w = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), wallM);
    w.position.set(x,y,z);
    walls.add(w);
  };
  mkWall(44, 8, 0.7, 0,4,-20);
  mkWall(44, 8, 0.7, 0,4, 20);
  mkWall(0.7, 8, 44, -20,4,0);
  mkWall(0.7, 8, 44,  20,4,0);
  scene.add(walls);

  // Table
  const table = new THREE.Group();
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(CFG.tableR, CFG.tableR, 0.14, 24), feltM);
  felt.position.y = CFG.tableY;
  table.add(felt);

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(CFG.tableR*0.97, 0.08, 10, 24),
    safeTexMat('rail.jpg', 0x2a2b32, { rough:0.85, metal:0.08, emissive:0x111111, em:0.10 })
  );
  rail.position.y = CFG.tableY + 0.05;
  rail.rotation.x = Math.PI/2;
  table.add(rail);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.6, 0.95, 18),
    safeTexMat('table_base.jpg', 0x1a1d27, { rough:0.92, metal:0.05 })
  );
  base.position.y = CFG.tableY - 0.55;
  table.add(base);

  scene.add(table);

  // Seats + chairs + seat anchors
  const chairs = new THREE.Group();
  const seats = [];

  const legM = safeTexMat('metal.jpg', 0x222531, { rough:0.95, metal:0.10 });

  function mkChair(){
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.10,0.55), chairM);
    seat.position.y = 0.35;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.55,0.10), chairM);
    back.position.set(0, 0.70, -0.23);

    const legGeo = new THREE.BoxGeometry(0.08,0.35,0.08);
    const offs = [[-0.22,0.175,-0.22],[0.22,0.175,-0.22],[-0.22,0.175,0.22],[0.22,0.175,0.22]];
    for (const o of offs){
      const l = new THREE.Mesh(legGeo, legM);
      l.position.set(o[0], o[1], o[2]);
      g.add(l);
    }

    g.add(seat, back);
    return g;
  }

  for (let i=0;i<6;i++){
    const a = (i/6)*Math.PI*2;

    const chair = mkChair();
    chair.position.set(Math.sin(a)*(CFG.seatR+0.40), 0, Math.cos(a)*(CFG.seatR+0.40));
    chair.lookAt(0,0,0);
    chairs.add(chair);

    const seatAnchor = new THREE.Object3D();
    seatAnchor.position.set(Math.sin(a)*CFG.seatR, 0, Math.cos(a)*CFG.seatR);
    seatAnchor.lookAt(0, 1.2, 0);
    scene.add(seatAnchor);
    seats.push(seatAnchor);
  }
  scene.add(chairs);

  // Couches (with emissive accent)
  const props = new THREE.Group();
  const couchM = safeTexMat('couch.jpg', 0x2b2a30, { rough:0.95, metal:0.04 });
  const accent = safeTexMat(null, 0x8a6bff, { rough:0.7, metal:0.12, emissive:0x8a6bff, em:0.35 });

  function makeCouch(){
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.6,0.45,0.9), couchM);
    base.position.y = 0.23;
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.6,0.65,0.18), couchM);
    back.position.set(0,0.63,-0.36);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.55,0.9), couchM);
    armL.position.set(-1.19,0.40,0);
    const armR = armL.clone(); armR.position.x = 1.19;

    const glow = new THREE.Mesh(new THREE.BoxGeometry(2.62,0.06,0.92), accent);
    glow.position.y = 0.03;

    g.add(base, back, armL, armR, glow);
    return g;
  }

  const couch1 = makeCouch();
  couch1.position.set(-10, 0, -6);
  couch1.rotation.y = Math.PI/2;
  props.add(couch1);

  const couch2 = makeCouch();
  couch2.position.set(10, 0, -6);
  couch2.rotation.y = -Math.PI/2;
  props.add(couch2);

  // Kiosk
  const kiosk = new THREE.Group();
  kiosk.position.set(-14, 0, -10);
  kiosk.rotation.y = Math.PI/4;

  const kioskStand = new THREE.Mesh(new THREE.BoxGeometry(1.2,2.2,0.6), safeTexMat('kiosk.jpg', 0x151723, { rough:0.92, metal:0.05 }));
  kioskStand.position.y = 1.1;

  const kioskScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.05,0.55), safeTexMat(null, 0x0b0d12, { rough:0.6, metal:0.1, emissive:0x00d4ff, em:0.45 }));
  kioskScreen.position.set(0, 1.55, 0.31);

  kiosk.add(kioskStand, kioskScreen);
  props.add(kiosk);

  // Add a simple neon “STORE” sign
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1,0.28), safeTexMat(null, 0x001a1f, { rough:0.3, metal:0.1, emissive:0x00ffd5, em:0.85 }));
  sign.position.set(-14, 2.35, -10);
  sign.rotation.y = Math.PI/4;
  props.add(sign);

  scene.add(props);

  // Bots back (visual only)
  const bots = new THREE.Group();
  function mkBot(color){
    const g = new THREE.Group();
    const m = safeTexMat(null, color, { rough:0.85, metal:0.05 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.52, 6, 12), m);
    torso.position.y = 0.95;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 14), m);
    head.position.y = 1.45;

    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), safeTexMat(null, color, { emissive: color, em: 0.55, rough:0.3, metal:0.1 }));
    glow.position.y = 1.75;

    g.add(torso, head, glow);
    return g;
  }
  const botColors = [0x7a7f92,0x6aa2ff,0xff8a6b,0x6bffa8,0xe5d36a];
  for (let i=1;i<6;i++){
    const b = mkBot(botColors[i-1]);
    b.position.copy(seats[i].position);
    b.lookAt(0, 1.2, 0);
    bots.add(b);
  }
  scene.add(bots);

  // Colliders
  const colliders = new Colliders();
  colliders.addBoxFrom(walls, 0);
  colliders.addBoxFrom(table, 0.18);
  colliders.addBoxFrom(chairs, 0.10);
  colliders.addBoxFrom(props, 0.10);

  // Controllers with visible markers
  const controllerL = renderer.xr.getController(0);
  const controllerR = renderer.xr.getController(1);
  rig.add(controllerL);
  rig.add(controllerR);

  const handGeo = new THREE.SphereGeometry(0.03, 12, 12);
  controllerL.add(new THREE.Mesh(handGeo, safeTexMat(null, 0x8a6bff, { emissive:0x8a6bff, em:0.35, rough:0.45, metal:0.12 })));
  controllerR.add(new THREE.Mesh(handGeo, safeTexMat(null, 0xffc36b, { emissive:0xffc36b, em:0.35, rough:0.45, metal:0.12 })));

  // Teleport laser (right)
  const laserGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
  const laserMat = new THREE.LineBasicMaterial({ transparent:true, opacity:0.85 });
  const laser = new THREE.Line(laserGeom, laserMat);
  laser.scale.z = 12;
  controllerR.add(laser);

  // Teleport marker
  const tpMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.18,0.22, 28),
    safeTexMat(null, 0x00ffd5, { rough:0.25, metal:0.1, emissive:0x00ffd5, em:0.55 })
  );
  tpMarker.rotation.x = -Math.PI/2;
  tpMarker.visible = false;
  scene.add(tpMarker);

  let teleportOn = true;
  let seated = false;

  const ray = new THREE.Raycaster();
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3();

  function updateTeleportPreview(){
    if (!renderer.xr.isPresenting || !teleportOn) { tpMarker.visible = false; return; }

    controllerR.getWorldPosition(origin);
    dir.set(0,0,-1).applyQuaternion(controllerR.getWorldQuaternion(new THREE.Quaternion())).normalize();
    ray.set(origin, dir);

    // hit floor plane y=0
    const t = (0 - origin.y) / dir.y;
    if (!isFinite(t) || t <= 0) { tpMarker.visible = false; return; }

    const hit = origin.clone().add(dir.clone().multiplyScalar(t));
    if (Math.abs(hit.x) > 19 || Math.abs(hit.z) > 19) { tpMarker.visible = false; return; }

    tpMarker.position.copy(hit);
    tpMarker.visible = true;
  }

  function doTeleport(){
    if (!tpMarker.visible) return;
    rig.position.x = tpMarker.position.x;
    rig.position.z = tpMarker.position.z;
    logLine('🌀 Teleport');
  }

  controllerR.addEventListener('select', ()=>{ if (renderer.xr.isPresenting && teleportOn) doTeleport(); });

  // Cards
  const cardRoot = new THREE.Group();
  scene.add(cardRoot);

  let community = [];
  for (let i=0;i<5;i++){
    const m = makeCard('A','♠');
    m.rotation.x = -Math.PI/2;
    m.position.set(-0.7 + i*0.35, CFG.tableY + 0.12, 0);
    cardRoot.add(m);
    community.push(m);
  }

  let myHole = [makeCard('A','♦'), makeCard('K','♠')];
  for (let i=0;i<2;i++){
    myHole[i].rotation.x = -Math.PI/2;
    cardRoot.add(myHole[i]);
  }

  function placeMyCardsAtSeat(seatIndex=0){
    const seat = seats[seatIndex];
    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(seat.quaternion).normalize();
    const base = seat.position.clone().add(forward.clone().multiplyScalar(0.55));
    const yaw = Math.atan2(forward.x, forward.z);
    myHole[0].position.set(base.x - 0.12, CFG.tableY + 0.121, base.z);
    myHole[1].position.set(base.x + 0.12, CFG.tableY + 0.121, base.z);
    myHole[0].rotation.z = yaw;
    myHole[1].rotation.z = yaw;
  }
  placeMyCardsAtSeat(0);

  function deal(){
    const d = dealRandomCards();
    for (let i=0;i<5;i++){
      cardRoot.remove(community[i]);
      community[i] = makeCard(d.community[i].r, d.community[i].s);
      community[i].rotation.x = -Math.PI/2;
      community[i].position.set(-0.7 + i*0.35, CFG.tableY + 0.12, 0);
      cardRoot.add(community[i]);
    }
    for (let i=0;i<2;i++){
      cardRoot.remove(myHole[i]);
      myHole[i] = makeCard(d.hole[i].r, d.hole[i].s);
      myHole[i].rotation.x = -Math.PI/2;
      cardRoot.add(myHole[i]);
    }
    placeMyCardsAtSeat(0);
    logLine('🃏 Dealt new hand');
  }

  // UI
  document.getElementById('btnReset').onclick = ()=>{
    seated = false;
    rig.position.set(0,0,10);
    rig.rotation.set(0,0,0);
    logLine('Reset position');
  };
  document.getElementById('btnFree').onclick = ()=>{
    seated = false;
    logLine('Free movement enabled');
  };
  document.getElementById('btnSit').onclick = ()=>{
    seated = true;
    rig.position.x = seats[0].position.x;
    rig.position.z = seats[0].position.z;
    rig.rotation.y = Math.atan2(-rig.position.x, -rig.position.z);
    logLine('Sit (locked at table)');
    placeMyCardsAtSeat(0);
  };
  document.getElementById('btnTeleport').onclick = ()=>{
    teleportOn = !teleportOn;
    document.getElementById('btnTeleport').textContent = teleportOn ? 'Teleport On' : 'Teleport Off';
    logLine(`Teleport: ${teleportOn ? 'ON' : 'OFF'}`);
  };

  let lightBoost = false;
  document.getElementById('btnLights').onclick = ()=>{
    lightBoost = !lightBoost;
    ambient.intensity = lightBoost ? 0.85 : 0.55;
    hemi.intensity = lightBoost ? 1.35 : 1.05;
    key.intensity = lightBoost ? 1.6 : 1.25;
    neon1.intensity = lightBoost ? 3.8 : 3.0;
    neon2.intensity = lightBoost ? 2.6 : 2.0;
    logLine(lightBoost ? '✨ Lighting boosted' : '✨ Lighting normal');
  };

  document.getElementById('btnDeal').onclick = deal;

  // Inputs
  const joy = bindJoystick();
  bindLook(rig, camera);

  // Desktop keys (fallback)
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

  // Loop
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(()=>{
    try{
      const dt = clock.getDelta();

      updateTeleportPreview();

      if (!seated){
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0; forward.normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).normalize();

        let f = 0, s = 0;

        // Android joystick
        f += (-joy.y);
        s += (joy.x);

        // Desktop keys
        if (keys.w) f += 1;
        if (keys.s) f -= 1;
        if (keys.d) s += 1;
        if (keys.a) s -= 1;

        // Quest left stick (fixed mapping)
        if (renderer.xr.isPresenting){
          const a = getAxis(renderer, 'left');
          s += a.x;
          f += -a.y;

          // If left is truly dead, also allow right stick as backup (you reported right works)
          const b = getAxis(renderer, 'right');
          if (a.x===0 && a.y===0 && (Math.abs(b.x)+Math.abs(b.y) > 0)){
            s += b.x * 0.65;
            f += -b.y * 0.65;
          }
        }

        const speed = renderer.xr.isPresenting ? CFG.vrSpeed : CFG.speed;
        const desired = rig.position.clone();
        desired.addScaledVector(forward, f*speed*dt);
        desired.addScaledVector(right,   s*speed*dt);
        rig.position.copy(colliders.tryMove(rig.position, desired, CFG.playerRadius));
      } else {
        rig.position.x = seats[0].position.x;
        rig.position.z = seats[0].position.z;
      }

      renderer.render(scene, camera);
    } catch (err){
      logLine(`❌ LOOP ERROR: ${err?.message || err}`);
      if (err?.stack) logLine(err.stack);
      renderer.setAnimationLoop(null);
      try{ renderer.xr.getSession()?.end(); }catch(e){}
    }
  });

  window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, { passive:true });

  logLine('✅ Ready. ENTER VR top-right.');
  logLine('Quest: Left stick should move; Right stick is fallback + Teleport trigger.');
  logLine('Textures: put files in assets/textures/ (floor.jpg, wall.jpg, felt.jpg, chair.jpg, couch.jpg etc.)');
}
