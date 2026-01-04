import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js';

import { Interactions } from './interactions.js';
import { PokerEngine } from './poker.js';
import { BotController } from './bots.js';
import { makeCardMesh, setCardFace } from './cards.js';

const CFG = {
  floorSize: 70,
  speed: 2.2,
  vrSpeed: 1.8,
  playerRadius: 0.28,
  tableY: 1.0,
  tableR: 1.35,
  seatR: 2.05,
  seatCardOffset: 0.50,
};

function logLine(txt){
  const el = document.getElementById('log');
  if (!el) return;
  el.innerHTML = `${txt}<br/>` + el.innerHTML;
}

function installCrashCatcher(){
  window.addEventListener('error', (e)=>{
    logLine(`❌ ERROR: ${e?.message || e}`);
    if (e?.error?.stack) logLine(e.error.stack);
  });
  window.addEventListener('unhandledrejection', (e)=>{
    logLine(`❌ PROMISE: ${e?.reason?.message || e?.reason || e}`);
    if (e?.reason?.stack) logLine(e.reason.stack);
  });
}

// Safe textured material with fallback COLOR (never “all gray” again)
const texLoader = new THREE.TextureLoader();
function safeMat(file, fallback, repeat=1){
  const m = new THREE.MeshStandardMaterial({ color: fallback, roughness: 0.92, metalness: 0.05 });
  if (!file) return m;
  const path = `assets/textures/${file}`;
  texLoader.load(
    path,
    (t)=>{ t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(repeat,repeat); m.map=t; m.color.set(0xffffff); m.needsUpdate=true; },
    undefined,
    ()=>{ /* keep fallback */ }
  );
  return m;
}

// Very simple collider boxes
class ColliderWorld {
  constructor(){ this.boxes=[]; }
  add(obj, pad=0){
    obj.updateWorldMatrix(true,true);
    const b = new THREE.Box3().setFromObject(obj);
    if (pad) b.expandByScalar(pad);
    this.boxes.push(b);
  }
  blocks(pos, r){
    for (const b of this.boxes){
      if (pos.x >= (b.min.x-r) && pos.x <= (b.max.x+r) && pos.z >= (b.min.z-r) && pos.z <= (b.max.z+r)) return true;
    }
    return false;
  }
  move(cur, next, r){
    if (!this.blocks(next,r)) return next;
    const xOnly = new THREE.Vector3(next.x,next.y,cur.z);
    if (!this.blocks(xOnly,r)) return xOnly;
    const zOnly = new THREE.Vector3(cur.x,next.y,next.z);
    if (!this.blocks(zOnly,r)) return zOnly;
    return cur;
  }
}

// Android joystick
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

// Touch look (right side drag)
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
    rig.rotation.y -= dx*2.3;
    camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - dy*1.6, -1.1, 1.1);
  },{passive:true});
  window.addEventListener('pointerup',()=>{ look=false; },{passive:true});
}

export async function boot(){
  installCrashCatcher();
  logLine('Booting Update D2 (Stable Reset)…');

  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');

  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  renderer.xr.addEventListener('sessionstart', ()=>{
    logLine('✅ XR session start');
    // reduce load for Quest stability
    renderer.shadowMap.enabled = false;
    renderer.setPixelRatio(1);
  });
  renderer.xr.addEventListener('sessionend', ()=>{
    logLine('ℹ️ XR session end');
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070a12);
  scene.fog = new THREE.Fog(0x070a12, 10, 90);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 250);
  camera.position.set(0, 1.6, 0);

  const rig = new THREE.Group();
  rig.position.set(0, 0, 7);      // ✅ spawn back to observe
  rig.add(camera);
  scene.add(rig);

  // Lighting (prevents “gray soup”)
  scene.add(new THREE.HemisphereLight(0xa8c0ff, 0x0b0b12, 0.60));
  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(10, 18, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024,1024);
  scene.add(key);

  const neonA = new THREE.PointLight(0x8a6bff, 1.4, 28, 2);
  neonA.position.set(0, 3.2, 0);
  scene.add(neonA);

  const neonB = new THREE.PointLight(0xffc36b, 0.9, 24, 2);
  neonB.position.set(-10, 2.6, -8);
  scene.add(neonB);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(CFG.floorSize, CFG.floorSize),
    safeMat('floor.jpg', 0x10131b, 6)
  );
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Walls (solid + colored fallback)
  const walls = new THREE.Group();
  const wallMat = safeMat('wall.jpg', 0x13162a, 2);

  const w1 = new THREE.Mesh(new THREE.BoxGeometry(44, 8, 0.7), wallMat); w1.position.set(0,4,-20);
  const w2 = new THREE.Mesh(new THREE.BoxGeometry(44, 8, 0.7), wallMat); w2.position.set(0,4, 20);
  const w3 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 8, 44), wallMat); w3.position.set(-20,4,0);
  const w4 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 8, 44), wallMat); w4.position.set( 20,4,0);
  walls.add(w1,w2,w3,w4);
  scene.add(walls);

  // Table group
  const tableGroup = new THREE.Group();

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(CFG.tableR, CFG.tableR, 0.14, 24),
    safeMat('felt.jpg', 0x0b6a3b, 2)
  );
  felt.position.y = CFG.tableY;
  felt.castShadow = true;
  felt.receiveShadow = true;
  tableGroup.add(felt);

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(CFG.tableR*0.97, 0.08, 10, 24),
    new THREE.MeshStandardMaterial({ color: 0x2b2a30, roughness:0.8, metalness:0.06 })
  );
  rail.position.y = CFG.tableY + 0.05;
  rail.rotation.x = Math.PI/2;
  rail.castShadow = true;
  tableGroup.add(rail);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.6, 0.95, 18),
    new THREE.MeshStandardMaterial({ color: 0x1a1d27, roughness:0.9, metalness:0.03 })
  );
  base.position.y = CFG.tableY - 0.55;
  base.castShadow = true;
  base.receiveShadow = true;
  tableGroup.add(base);

  scene.add(tableGroup);

  // Seats + chairs
  const chairs = new THREE.Group();
  const chairMat = safeMat('chair.jpg', 0x3a3d48, 1);

  const seatMarkers = [];
  for (let i=0;i<6;i++){
    const a = (i/6)*Math.PI*2;

    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.58,0.55), chairMat);
    chair.position.set(Math.sin(a)*(CFG.seatR+0.35), 0.29, Math.cos(a)*(CFG.seatR+0.35));
    chair.castShadow = true;
    chair.receiveShadow = true;
    chairs.add(chair);

    const seat = new THREE.Object3D();
    seat.position.set(Math.sin(a)*CFG.seatR, 0, Math.cos(a)*CFG.seatR);
    seat.lookAt(0, 1.2, 0);
    seatMarkers.push(seat);
    scene.add(seat);
  }
  scene.add(chairs);

  // Colliders
  const colliders = new ColliderWorld();
  colliders.add(walls, 0);
  colliders.add(tableGroup, 0.18);
  colliders.add(chairs, 0.08);

  // Interactions (controllers follow rig now)
  const interactions = new Interactions(camera, scene, renderer, rig);

  // Poker + bots
  const engine = new PokerEngine({
    maxSeats: 6,
    startStack: 200000,
    smallBlind: 1000,
    bigBlind: 2000,
    ante: 250,
    turnTimeSeconds: 20
  });
  engine.setSeatName(0, "YOU");
  for (let i=1;i<6;i++) engine.setSeatName(i, `Bot${i}`);

  const bots = new BotController(engine, { thinkMin: 0.8, thinkMax: 1.7 });

  // Bot visuals
  const botMeshes = [];
  function makeBot(name){
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x7a7f92, roughness:0.85 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.52, 6, 12), mat);
    torso.position.y = 0.95; torso.castShadow = true; g.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 14), mat);
    head.position.y = 1.45; head.castShadow = true; g.add(head);

    g.userData.name = name;
    return g;
  }
  for (let i=1;i<6;i++){
    const b = makeBot(`Bot${i}`);
    b.position.copy(seatMarkers[i].position);
    b.lookAt(0, 1.2, 0);
    scene.add(b);
    botMeshes.push(b);
  }

  // Cards
  const cardRoot = new THREE.Group();
  scene.add(cardRoot);

  const community = [];
  for (let i=0;i<5;i++){
    const m = makeCardMesh({r:"A",s:"S"}, { faceUp:false });
    m.position.set(-0.7 + i*0.35, CFG.tableY + 0.12, 0);
    m.rotation.x = -Math.PI/2;
    m.castShadow = true;
    cardRoot.add(m);
    community.push(m);
  }

  const myHole = [];
  for (let i=0;i<2;i++){
    const m = makeCardMesh({r:"A",s:"S"}, { faceUp:true });
    m.rotation.x = -Math.PI/2;
    m.castShadow = true;
    cardRoot.add(m);
    myHole.push(m);
  }

  const botHole = Array.from({length:5}, ()=>[]);
  for (let b=0;b<5;b++){
    for (let i=0;i<2;i++){
      const m = makeCardMesh({r:"A",s:"S"}, { faceUp:false });
      m.rotation.x = -Math.PI/2;
      m.castShadow = true;
      cardRoot.add(m);
      botHole[b].push(m);
    }
  }

  function placeHoleCards(seatIndexForYou=0){
    const seat = seatMarkers[seatIndexForYou];
    if (!seat) return;

    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(seat.quaternion).normalize();
    const basePos = seat.position.clone().add(forward.clone().multiplyScalar(CFG.seatCardOffset));
    const yaw = Math.atan2(forward.x, forward.z);

    myHole[0].position.set(basePos.x - 0.12, CFG.tableY + 0.121, basePos.z);
    myHole[1].position.set(basePos.x + 0.12, CFG.tableY + 0.121, basePos.z);
    myHole[0].rotation.z = yaw;
    myHole[1].rotation.z = yaw;

    for (let s=1;s<6;s++){
      const seat2 = seatMarkers[s];
      const f2 = new THREE.Vector3(0,0,-1).applyQuaternion(seat2.quaternion).normalize();
      const p2 = seat2.position.clone().add(f2.multiplyScalar(CFG.seatCardOffset));
      const yaw2 = Math.atan2(f2.x, f2.z);
      const b = s-1;

      botHole[b][0].position.set(p2.x - 0.12, CFG.tableY + 0.121, p2.z);
      botHole[b][1].position.set(p2.x + 0.12, CFG.tableY + 0.121, p2.z);
      botHole[b][0].rotation.z = yaw2;
      botHole[b][1].rotation.z = yaw2;
    }
  }

  function syncFromEngine(){
    const st = engine.getPublicState();

    for (let i=0;i<5;i++){
      if (st.community?.[i]) setCardFace(community[i], st.community[i], true);
      else setCardFace(community[i], {r:"A",s:"S"}, false);
    }

    const mine = engine.getSeatHoleCards(0);
    for (let i=0;i<2;i++){
      if (mine?.[i]) setCardFace(myHole[i], mine[i], true);
    }

    // bots hidden
    for (let b=0;b<5;b++){
      setCardFace(botHole[b][0], {r:"A",s:"S"}, false);
      setCardFace(botHole[b][1], {r:"A",s:"S"}, false);
    }

    placeHoleCards(0);
  }

  engine.onState = syncFromEngine;
  engine.startHand();
  syncFromEngine();
  logLine('✅ Started hand. You can walk around and observe.');

  // Buttons (now guaranteed to work)
  let seated = false;
  const seatIndex = 0;

  document.getElementById('btnReset').onclick = ()=>{
    seated = false;
    rig.position.set(0,0,7);
    rig.rotation.set(0,0,0);
    logLine('Reset position');
  };
  document.getElementById('btnSit').onclick = ()=>{
    seated = true;
    rig.position.x = seatMarkers[seatIndex].position.x;
    rig.position.z = seatMarkers[seatIndex].position.z;
    rig.rotation.y = Math.atan2(-rig.position.x, -rig.position.z);
    logLine('Sit (lock at table)');
  };
  document.getElementById('btnStand').onclick = ()=>{
    seated = false;
    logLine('Stand (free move)');
  };
  document.getElementById('btnNext').onclick = ()=>{
    engine.startHand();
    syncFromEngine();
    logLine('Next hand');
  };
  document.getElementById('btnStore').onclick = ()=>{
    logLine('Store: (stub ready) — next step is full catalog UI');
  };

  // Inputs
  const joyVec = bindJoystick();
  bindLook(rig, camera);

  // Keyboard fallback
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

  window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, { passive:true });

  // Main loop (includes VR stick locomotion)
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(()=>{
    try{
      const dt = clock.getDelta();

      // poker & bots
      if (typeof engine.tick === 'function') engine.tick(dt);
      if (bots && typeof bots.update === 'function') bots.update(dt);

      // movement only when NOT seated
      if (!seated){
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0; forward.normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).normalize();

        let f = 0, s = 0;

        // joystick
        f += (-joyVec.y);
        s += (joyVec.x);

        // keyboard
        if (keys.w) f += 1;
        if (keys.s) f -= 1;
        if (keys.d) s += 1;
        if (keys.a) s -= 1;

        // VR thumbstick
        if (renderer.xr.isPresenting){
          const pads = interactions.getXRGamepads();
          for (const gp of pads){
            const axX = (gp.axes?.[2] ?? gp.axes?.[0] ?? 0);
            const axY = (gp.axes?.[3] ?? gp.axes?.[1] ?? 0);
            s += axX;
            f += -axY;
          }
        }

        const speed = renderer.xr.isPresenting ? CFG.vrSpeed : CFG.speed;
        const desired = rig.position.clone();
        desired.addScaledVector(forward, f*speed*dt);
        desired.addScaledVector(right,   s*speed*dt);
        rig.position.copy(colliders.move(rig.position, desired, CFG.playerRadius));
      } else {
        // seated lock at seat
        rig.position.x = seatMarkers[seatIndex].position.x;
        rig.position.z = seatMarkers[seatIndex].position.z;
      }

      renderer.render(scene, camera);
    } catch (err){
      logLine(`❌ LOOP ERROR: ${err?.message || err}`);
      if (err?.stack) logLine(err.stack);
      renderer.setAnimationLoop(null);
      try{ renderer.xr.getSession()?.end(); }catch(e){}
    }
  });
      }
