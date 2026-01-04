import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js';

import { Interactions } from './interactions.js';
import { GamerTags, makeButtonPanel } from './ui.js';

import { PokerEngine } from './poker.js';
import { BotController } from './bots.js';
import { makeCardMesh, setCardFace } from './cards.js';

const CFG = {
  floorSize: 70,
  playerRadius: 0.28,
  seatRadius: 2.05,
  seatCardOffset: 0.48,
  table: { radius: 1.35, y: 1.0 },
  dwellSeconds: 5.0,
  move: { speed: 2.2, vrSpeed: 1.8 },
};

class SafeTex {
  constructor(){ this.loader = new THREE.TextureLoader(); }
  mat(textureFile, fallbackColor, repeat=1){
    const m = new THREE.MeshStandardMaterial({ color: fallbackColor, roughness: 0.92, metalness: 0.05 });
    if (!textureFile) return m;

    const path = `assets/textures/${textureFile}`;
    this.loader.load(
      path,
      (t)=>{ t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); m.map = t; m.color.set(0xffffff); m.needsUpdate = true; },
      undefined,
      ()=>console.warn(`Texture missing (safe fallback): ${path}`)
    );
    return m;
  }
}

class ColliderWorld {
  constructor(){ this.boxes=[]; }
  addBoxFromObject(obj, pad=0){
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
  tryMove(cur, next, r){
    if (!this.blocks(next,r)) return next;
    const xOnly = new THREE.Vector3(next.x,next.y,cur.z);
    if (!this.blocks(xOnly,r)) return xOnly;
    const zOnly = new THREE.Vector3(cur.x,next.y,next.z);
    if (!this.blocks(zOnly,r)) return zOnly;
    return cur;
  }
}

function ensureHUD(){
  let root = document.getElementById('hudRoot');
  if (root) return root;

  root = document.createElement('div');
  root.id = 'hudRoot';
  root.style.position = 'fixed';
  root.style.inset = '0';
  root.style.pointerEvents = 'none';
  root.style.zIndex = '9999';
  document.body.appendChild(root);

  const log = document.createElement('div');
  log.id='logPanel';
  log.style.position='absolute';
  log.style.right='12px';
  log.style.top='12px';
  log.style.width='46vw';
  log.style.maxWidth='430px';
  log.style.maxHeight='40vh';
  log.style.overflow='auto';
  log.style.padding='10px 12px';
  log.style.borderRadius='14px';
  log.style.background='rgba(0,0,0,0.55)';
  log.style.color='rgba(255,255,255,0.90)';
  log.style.fontSize='12px';
  log.style.lineHeight='1.25';
  log.style.pointerEvents='auto';
  log.style.userSelect='text';
  log.style.backdropFilter='blur(6px)';
  root.appendChild(log);

  return root;
}

function logLine(txt){
  const p = document.getElementById('logPanel');
  if (!p) return;
  const div = document.createElement('div');
  div.textContent = txt;
  p.prepend(div);
  while (p.childNodes.length > 120) p.removeChild(p.lastChild);
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

export async function boot(){
  ensureHUD();
  installCrashCatcher();

  logLine('Booting…');

  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  renderer.xr.enabled = true;
  // Quest is happiest with local-floor
  renderer.xr.setReferenceSpaceType('local-floor');

  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  renderer.xr.addEventListener('sessionstart', ()=>{
    logLine('✅ XR session start');
    // If Quest GPU is choking, shadows can kill XR instantly → reduce load
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

  const rig = new THREE.Group();
  rig.position.set(0, 0, 7);
  rig.add(camera);
  scene.add(rig);

  // lights
  scene.add(new THREE.HemisphereLight(0x9db6ff, 0x0b0b12, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 0.8);
  key.position.set(8, 14, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024,1024);
  scene.add(key);

  const rim = new THREE.PointLight(0x8a6bff, 1.2, 26, 2);
  rim.position.set(0, 3.2, 0);
  scene.add(rim);

  const safe = new SafeTex();

  // floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(CFG.floorSize, CFG.floorSize),
    safe.mat('floor.jpg', 0x10131b, 6)
  );
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  scene.add(floor);

  // walls
  const walls = new THREE.Group();
  const wallMat = safe.mat('wall.jpg', 0x0e1020, 2);
  const w1 = new THREE.Mesh(new THREE.BoxGeometry(44, 8, 0.7), wallMat); w1.position.set(0,4,-20);
  const w2 = new THREE.Mesh(new THREE.BoxGeometry(44, 8, 0.7), wallMat); w2.position.set(0,4,20);
  const w3 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 8, 44), wallMat); w3.position.set(-20,4,0);
  const w4 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 8, 44), wallMat); w4.position.set(20,4,0);
  walls.add(w1,w2,w3,w4);
  scene.add(walls);

  // table
  const tableGroup = new THREE.Group();
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(CFG.table.radius, CFG.table.radius, 0.14, 24),
    safe.mat('felt.jpg', 0x0b6a3b, 2)
  );
  felt.position.y = CFG.table.y;
  felt.castShadow = true;
  felt.receiveShadow = true;
  tableGroup.add(felt);

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(CFG.table.radius*0.97, 0.08, 10, 24),
    safe.mat('rail.jpg', 0x2b2a30, 1)
  );
  rail.position.y = CFG.table.y + 0.05;
  rail.rotation.x = Math.PI/2;
  rail.castShadow = true;
  tableGroup.add(rail);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.6, 0.95, 18),
    safe.mat('table_base.jpg', 0x1a1d27, 1)
  );
  base.position.y = CFG.table.y - 0.55;
  base.castShadow = true;
  base.receiveShadow = true;
  tableGroup.add(base);
  scene.add(tableGroup);

  // dealer button
  const dealerButton = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.10, 0.03, 18),
    new THREE.MeshStandardMaterial({ color: 0xf5d76e, roughness:0.45, metalness:0.15, emissive:0x5a4500, emissiveIntensity:0.25 })
  );
  dealerButton.castShadow = true;
  dealerButton.position.set(0, CFG.table.y + 0.11, -0.9);
  scene.add(dealerButton);

  // seats + chairs
  const chairs = new THREE.Group();
  const chairMat = safe.mat('chair.jpg', 0x3a3d48, 1);
  const seatMarkers = [];
  const seatPositions = [];

  for (let i=0;i<6;i++){
    const a = (i/6)*Math.PI*2;
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.58,0.55), chairMat);
    chair.position.set(Math.sin(a)*(CFG.seatRadius+0.35), 0.29, Math.cos(a)*(CFG.seatRadius+0.35));
    chair.castShadow = true;
    chair.receiveShadow = true;
    chairs.add(chair);

    const seat = new THREE.Object3D();
    seat.position.set(Math.sin(a)*CFG.seatRadius, 0, Math.cos(a)*CFG.seatRadius);
    seat.lookAt(0, 1.2, 0);
    scene.add(seat);

    seatMarkers.push(seat);
    seatPositions.push(new THREE.Vector3(seat.position.x, CFG.table.y + 0.11, seat.position.z));
  }
  scene.add(chairs);

  // systems
  const interactions = new Interactions(camera, scene, renderer, rig);
  const tags = new GamerTags(scene, camera, { dwellSeconds: CFG.dwellSeconds });

  // colliders
  const colliders = new ColliderWorld();
  colliders.addBoxFromObject(walls, 0);
  colliders.addBoxFromObject(tableGroup, 0.18);
  colliders.addBoxFromObject(chairs, 0.08);

  // bots visuals + tags
  const players = [];
  function makeBot(i){
    const body = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x7a7f92, roughness:0.85 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.52, 6, 12), mat);
    torso.castShadow = true;
    torso.position.y = 0.95;
    body.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 14), mat);
    head.castShadow = true;
    head.position.y = 1.45;
    body.add(head);

    const tagAnchor = new THREE.Object3D();
    tagAnchor.position.set(0, 1.85, 0);
    body.add(tagAnchor);

    body.userData.identity = { name: `Bot${i+1}` };
    body.userData.tagAnchor = tagAnchor;
    return body;
  }

  for (let i=0;i<5;i++){
    const bot = makeBot(i);
    const seat = seatMarkers[i+1];
    bot.position.copy(seat.position);
    bot.lookAt(0, 1.2, 0);
    scene.add(bot);
    players.push(bot);
    tags.attachToPlayer(bot, bot.userData.tagAnchor);
  }
  interactions.setPlayers(players);

  // poker engine + bots brain
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

  // cards
  const cardRoot = new THREE.Group();
  scene.add(cardRoot);

  const communityMeshes = [];
  for (let i=0;i<5;i++){
    const m = makeCardMesh({r:"A",s:"S"}, { faceUp:false });
    m.position.set(-0.7 + i*0.35, CFG.table.y + 0.12, 0);
    m.rotation.x = -Math.PI/2;
    cardRoot.add(m);
    communityMeshes.push(m);
  }

  const myHoleMeshes = [];
  for (let i=0;i<2;i++){
    const m = makeCardMesh({r:"A",s:"S"}, { faceUp:true });
    m.rotation.x = -Math.PI/2;
    cardRoot.add(m);
    myHoleMeshes.push(m);
  }

  const botHoleMeshes = Array.from({length:5}, ()=>[]);
  for (let b=0;b<5;b++){
    for (let i=0;i<2;i++){
      const m = makeCardMesh({r:"A",s:"S"}, { faceUp:false });
      m.rotation.x = -Math.PI/2;
      cardRoot.add(m);
      botHoleMeshes[b].push(m);
    }
  }

  // seat lock
  let seated = false;
  let seatIndex = 0;

  function updateHolePlacement(){
    const seat = seatMarkers[seatIndex];
    if (!seat) return;

    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(seat.quaternion).normalize();
    const basePos = seat.position.clone().add(forward.clone().multiplyScalar(CFG.seatCardOffset));
    const yaw = Math.atan2(forward.x, forward.z);

    myHoleMeshes[0].position.set(basePos.x - 0.12, CFG.table.y + 0.121, basePos.z);
    myHoleMeshes[1].position.set(basePos.x + 0.12, CFG.table.y + 0.121, basePos.z);
    myHoleMeshes[0].rotation.z = yaw;
    myHoleMeshes[1].rotation.z = yaw;

    for (let b=0;b<5;b++){
      const botSeat = seatMarkers[b+1];
      const f2 = new THREE.Vector3(0,0,-1).applyQuaternion(botSeat.quaternion).normalize();
      const p2 = botSeat.position.clone().add(f2.multiplyScalar(CFG.seatCardOffset));
      const yaw2 = Math.atan2(f2.x, f2.z);

      botHoleMeshes[b][0].position.set(p2.x - 0.12, CFG.table.y + 0.121, p2.z);
      botHoleMeshes[b][1].position.set(p2.x + 0.12, CFG.table.y + 0.121, p2.z);
      botHoleMeshes[b][0].rotation.z = yaw2;
      botHoleMeshes[b][1].rotation.z = yaw2;
    }
  }

  function placeDealerButton(dealerIdx){
    const p = seatPositions[dealerIdx];
    if (!p) return;
    dealerButton.position.set(p.x, p.y, p.z);
  }

  function syncCards(){
    const st = engine.getPublicState();

    for (let i=0;i<5;i++){
      const cm = communityMeshes[i];
      if (st.community[i]) setCardFace(cm, st.community[i], true);
      else setCardFace(cm, {r:"A",s:"S"}, false);
    }

    const my = engine.getSeatHoleCards(0);
    for (let i=0;i<2;i++){
      if (my[i]) setCardFace(myHoleMeshes[i], my[i], true);
    }

    // bots always hidden
    for (let b=0;b<5;b++){
      for (let i=0;i<2;i++){
        setCardFace(botHoleMeshes[b][i], {r:"A",s:"S"}, false);
      }
    }

    placeDealerButton(st.dealer);
    updateHolePlacement();
  }

  engine.onState = syncCards;
  engine.startHand();
  updateHolePlacement();
  logLine('✅ Scene ready. Click ENTER VR (the page button), not the Oculus Home button.');

  // movement inputs (very light)
  let lookActive=false, lastX=0, lastY=0;
  window.addEventListener('pointerdown', (e)=>{ lookActive=true; lastX=e.clientX; lastY=e.clientY; }, { passive:true });
  window.addEventListener('pointermove', (e)=>{
    if (!lookActive) return;
    const dx = (e.clientX-lastX)/window.innerWidth;
    const dy = (e.clientY-lastY)/window.innerHeight;
    lastX=e.clientX; lastY=e.clientY;
    rig.rotation.y -= dx*2.2;
    camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - dy*1.6, -1.1, 1.1);
  }, { passive:true });
  window.addEventListener('pointerup', ()=>{ lookActive=false; }, { passive:true });

  // render loop — XR crash shield
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(()=>{
    try{
      const dt = clock.getDelta();

      // engine + bots
      if (typeof engine.tick === 'function') engine.tick(dt);
      if (bots && typeof bots.update === 'function') bots.update(dt);

      // tags dwell
      const hit = interactions.raycastPlayers(players);
      tags.update(dt, hit?.object || null);

      // keep seated anchored (if you later wire sit buttons)
      if (seated){
        const seat = seatMarkers[seatIndex];
        if (seat){
          rig.position.x = seat.position.x;
          rig.position.z = seat.position.z;
        }
      }

      renderer.render(scene, camera);
    } catch (err){
      logLine(`❌ XR LOOP ERROR: ${err?.message || err}`);
      if (err?.stack) logLine(err.stack);
      // Stop loop so Quest doesn’t hard crash
      renderer.setAnimationLoop(null);
      try{ renderer.xr.getSession()?.end(); }catch(e){}
    }
  });

  window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, { passive:true });
        }
