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
  seatRadius: 2.05,          // tighter toward table
  seatCardOffset: 0.48,      // how far cards sit in front of seat marker
  table: { radius: 1.35, y: 1.0 },
  dwellSeconds: 5.0,
  move: { speed: 2.2, vrSpeed: 1.8 },
};

// ---------- SAFE TEXTURES ----------
class SafeTex {
  constructor(){
    this.loader = new THREE.TextureLoader();
  }
  mat(textureFile, fallbackColor, repeat=1){
    const path = `assets/textures/${textureFile}`;
    let tex = null;

    try{
      tex = this.loader.load(
        path,
        (t)=>{ t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); },
        undefined,
        ()=>{ /* ignore */ }
      );
    }catch(e){ tex = null; }

    // Use map only if it actually loads — but Three can’t synchronously confirm;
    // we still keep a stable fallback color always.
    const m = new THREE.MeshStandardMaterial({
      color: fallbackColor,
      roughness: 0.92,
      metalness: 0.05
    });
    if (tex) m.map = tex;
    return m;
  }
}

// ---------- SIMPLE COLLIDERS ----------
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

// ---------- HTML HUD (Android joystick + actions) ----------
function ensureHUD(){
  // Root
  let root = document.getElementById('hudRoot');
  if (root) return root;

  root = document.createElement('div');
  root.id = 'hudRoot';
  root.style.position = 'fixed';
  root.style.inset = '0';
  root.style.pointerEvents = 'none';
  root.style.zIndex = '60';

  // Joystick base
  const joy = document.createElement('div');
  joy.id = 'joy';
  joy.style.position = 'absolute';
  joy.style.left = '16px';
  joy.style.bottom = '18px';
  joy.style.width = '120px';
  joy.style.height = '120px';
  joy.style.borderRadius = '999px';
  joy.style.background = 'rgba(255,255,255,0.06)';
  joy.style.border = '1px solid rgba(255,255,255,0.12)';
  joy.style.backdropFilter = 'blur(6px)';
  joy.style.pointerEvents = 'auto';

  const nub = document.createElement('div');
  nub.id = 'joyNub';
  nub.style.position = 'absolute';
  nub.style.left = '50%';
  nub.style.top = '50%';
  nub.style.width = '52px';
  nub.style.height = '52px';
  nub.style.transform = 'translate(-50%,-50%)';
  nub.style.borderRadius = '999px';
  nub.style.background = 'rgba(255,255,255,0.18)';
  joy.appendChild(nub);

  // Action bar
  const actions = document.createElement('div');
  actions.id = 'actions';
  actions.style.position = 'absolute';
  actions.style.left = '50%';
  actions.style.bottom = '14px';
  actions.style.transform = 'translateX(-50%)';
  actions.style.display = 'none';
  actions.style.flexDirection = 'column';
  actions.style.gap = '8px';
  actions.style.width = 'min(580px, 92vw)';
  actions.style.pointerEvents = 'auto';

  const row = document.createElement('div');
  row.style.display='flex';
  row.style.gap='10px';

  const mkBtn = (id, txt) => {
    const b = document.createElement('button');
    b.id = id;
    b.textContent = txt;
    b.style.flex='1';
    b.style.border='0';
    b.style.borderRadius='14px';
    b.style.padding='12px 14px';
    b.style.fontSize='14px';
    b.style.background='rgba(0,0,0,0.55)';
    b.style.color='rgba(255,255,255,0.92)';
    b.style.boxShadow='0 10px 30px rgba(0,0,0,0.35)';
    b.style.backdropFilter='blur(6px)';
    return b;
  };

  row.appendChild(mkBtn('btnFold','Fold'));
  row.appendChild(mkBtn('btnCheck','Check'));
  row.appendChild(mkBtn('btnCall','Call'));
  row.appendChild(mkBtn('btnBetRaise','Bet/Raise'));

  const sliderWrap = document.createElement('div');
  sliderWrap.style.display='flex';
  sliderWrap.style.alignItems='center';
  sliderWrap.style.gap='10px';
  sliderWrap.style.padding='10px 12px';
  sliderWrap.style.borderRadius='14px';
  sliderWrap.style.background='rgba(0,0,0,0.40)';
  sliderWrap.style.backdropFilter='blur(6px)';

  const label = document.createElement('div');
  label.id='raiseLabel';
  label.style.color='rgba(255,255,255,0.88)';
  label.style.fontSize='12px';
  label.style.minWidth='130px';
  label.textContent='Raise To: —';

  const slider = document.createElement('input');
  slider.id='raiseSlider';
  slider.type='range';
  slider.min='0';
  slider.max='100';
  slider.value='0';
  slider.style.width='100%';

  sliderWrap.appendChild(label);
  sliderWrap.appendChild(slider);

  const row2 = document.createElement('div');
  row2.style.display='flex';
  row2.style.gap='10px';

  row2.appendChild(mkBtn('btnSitStand','Sit'));
  row2.appendChild(mkBtn('btnStore','Store'));
  row2.appendChild(mkBtn('btnNextHand','Next Hand'));

  actions.appendChild(row);
  actions.appendChild(sliderWrap);
  actions.appendChild(row2);

  // Log panel
  const log = document.createElement('div');
  log.id='logPanel';
  log.style.position='absolute';
  log.style.right='12px';
  log.style.top='12px';
  log.style.width='46vw';
  log.style.maxWidth='430px';
  log.style.maxHeight='34vh';
  log.style.overflow='auto';
  log.style.padding='10px 12px';
  log.style.borderRadius='14px';
  log.style.background='rgba(0,0,0,0.45)';
  log.style.color='rgba(255,255,255,0.85)';
  log.style.fontSize='12px';
  log.style.lineHeight='1.25';
  log.style.pointerEvents='auto';
  log.style.userSelect='none';
  log.style.backdropFilter='blur(6px)';

  root.appendChild(joy);
  root.appendChild(actions);
  root.appendChild(log);
  document.body.appendChild(root);

  return root;
}

function logLine(txt){
  const p = document.getElementById('logPanel');
  if (!p) return;
  const div = document.createElement('div');
  div.textContent = txt;
  p.prepend(div);
  while (p.childNodes.length > 80) p.removeChild(p.lastChild);
}

// ---------- Simple Economy (localStorage) ----------
const ECON_KEY = 'scarlett_econ_v1';
function loadEcon(){
  try{
    const raw = localStorage.getItem(ECON_KEY);
    if (raw) return JSON.parse(raw);
  }catch(e){}
  return {
    chips: 200000,
    eventChips: 0,
    member: false,
    inventory: [],
    equipped: {}
  };
}
function saveEcon(e){ localStorage.setItem(ECON_KEY, JSON.stringify(e)); }

// ---------- Boot ----------
export async function boot(){
  ensureHUD();

  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070a12);
  scene.fog = new THREE.Fog(0x070a12, 10, 90);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 250);

  const rig = new THREE.Group();
  rig.position.set(0, 0, 7);
  rig.add(camera);
  scene.add(rig);

  // Lights
  scene.add(new THREE.HemisphereLight(0x9db6ff, 0x0b0b12, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 0.8);
  key.position.set(8, 14, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024,1024);
  scene.add(key);

  const rim = new THREE.PointLight(0x8a6bff, 1.2, 26, 2);
  rim.position.set(0, 3.2, 0);
  scene.add(rim);

  // Materials
  const safe = new SafeTex();

  // Floor (not gray)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(CFG.floorSize, CFG.floorSize),
    safe.mat('floor.jpg', 0x10131b, 6)
  );
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Walls (solid)
  const walls = new THREE.Group();
  const wallMat = safe.mat('wall.jpg', 0x0e1020, 2);

  const w1 = new THREE.Mesh(new THREE.BoxGeometry(44, 8, 0.7), wallMat); w1.position.set(0,4,-20);
  const w2 = new THREE.Mesh(new THREE.BoxGeometry(44, 8, 0.7), wallMat); w2.position.set(0,4,20);
  const w3 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 8, 44), wallMat); w3.position.set(-20,4,0);
  const w4 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 8, 44), wallMat); w4.position.set(20,4,0);
  walls.add(w1,w2,w3,w4);
  scene.add(walls);

  // Table
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

  // Dealer button
  const dealerButton = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.10, 0.03, 18),
    new THREE.MeshStandardMaterial({ color: 0xf5d76e, roughness:0.45, metalness:0.15, emissive:0x5a4500, emissiveIntensity:0.25 })
  );
  dealerButton.castShadow = true;
  dealerButton.position.set(0, CFG.table.y + 0.11, -0.9);
  scene.add(dealerButton);

  // Seats (tight) + chairs (solid)
  const chairs = new THREE.Group();
  const chairMat = safe.mat('chair.jpg', 0x3a3d48, 1);

  const seatMarkers = [];
  const seatPositions = [];
  for (let i=0;i<6;i++){
    const a = (i/6)*Math.PI*2;

    // chair
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.58,0.55), chairMat);
    chair.position.set(Math.sin(a)*(CFG.seatRadius+0.35), 0.29, Math.cos(a)*(CFG.seatRadius+0.35));
    chair.castShadow = true;
    chair.receiveShadow = true;
    chairs.add(chair);

    // seat marker (invisible collider/anchor)
    const seat = new THREE.Object3D();
    seat.position.set(Math.sin(a)*CFG.seatRadius, 0, Math.cos(a)*CFG.seatRadius);
    seat.lookAt(0, 1.2, 0);
    scene.add(seat);

    seatMarkers.push(seat);
    seatPositions.push(new THREE.Vector3(seat.position.x, CFG.table.y + 0.11, seat.position.z));
  }
  scene.add(chairs);

  // “active turn” ring
  const turnRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.03, 10, 24),
    new THREE.MeshBasicMaterial({ transparent:true, opacity:0.0 })
  );
  turnRing.rotation.x = Math.PI/2;
  turnRing.position.set(0, 0.02, 0);
  scene.add(turnRing);

  // Systems
  const interactions = new Interactions(camera, scene, renderer, rig);
  const tags = new GamerTags(scene, camera, { dwellSeconds: CFG.dwellSeconds });

  // Colliders
  const colliders = new ColliderWorld();
  colliders.addBoxFromObject(walls, 0);
  colliders.addBoxFromObject(tableGroup, 0.18);
  colliders.addBoxFromObject(chairs, 0.08);

  // Bots (visual bodies)
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
    // place bots on seats 1..5
    const seat = seatMarkers[i+1];
    bot.position.copy(seat.position);
    bot.lookAt(0, 1.2, 0);
    scene.add(bot);
    players.push(bot);
    tags.attachToPlayer(bot, bot.userData.tagAnchor);
  }
  interactions.setPlayers(players);

  // --- Poker Engine + Bots ---
  const econ = loadEcon();

  const engine = new PokerEngine({
    maxSeats: 6,
    startStack: econ.chips || 200000,
    smallBlind: 1000,
    bigBlind: 2000,
    ante: 250,
    turnTimeSeconds: 20
  });

  engine.setSeatName(0, "YOU");
  for (let i=1;i<6;i++) engine.setSeatName(i, `Bot${i}`);

  const bots = new BotController(engine, { thinkMin: 0.8, thinkMax: 1.7 });

  engine.onLog = (m)=> logLine(m);

  // --- Cards ---
  const cardRoot = new THREE.Group();
  scene.add(cardRoot);

  // Community cards fixed on center
  const communityMeshes = [];
  for (let i=0;i<5;i++){
    const m = makeCardMesh({r:"A",s:"S"}, { faceUp:false });
    m.position.set(-0.7 + i*0.35, CFG.table.y + 0.12, 0);
    m.rotation.x = -Math.PI/2;
    cardRoot.add(m);
    communityMeshes.push(m);
  }

  // Hole cards FLAT on table in front of seat 0
  const myHoleMeshes = [];
  const myHoleAnchor = new THREE.Group();
  scene.add(myHoleAnchor);

  for (let i=0;i<2;i++){
    const m = makeCardMesh({r:"A",s:"S"}, { faceUp:true });
    m.rotation.x = -Math.PI/2;
    cardRoot.add(m);
    myHoleMeshes.push(m);
  }

  // Bot hole cards (backs) flat near their seats (so it feels real)
  const botHoleMeshes = Array.from({length:5}, ()=>[]);
  for (let b=0;b<5;b++){
    for (let i=0;i<2;i++){
      const m = makeCardMesh({r:"A",s:"S"}, { faceUp:false });
      m.rotation.x = -Math.PI/2;
      cardRoot.add(m);
      botHoleMeshes[b].push(m);
    }
  }

  // --- Sit / Stand lock ---
  let seated = false;
  let seatIndex = 0;
  const seatedYaw = new THREE.Object3D(); // anchor used to keep rig locked

  function sitAtSeat(idx){
    seatIndex = idx;
    const seat = seatMarkers[idx];
    if (!seat) return;

    seated = true;

    // Snap rig to seat and face table
    rig.position.set(seat.position.x, rig.position.y, seat.position.z);
    // align yaw to seat
    rig.rotation.y = Math.atan2(-seat.position.x, -seat.position.z);

    // Disable joystick visually? Keep it but ignore input.
    document.getElementById('btnSitStand').textContent = 'Stand';

    updateMyHoleAnchor();
  }

  function standUp(){
    seated = false;
    document.getElementById('btnSitStand').textContent = 'Sit';
  }

  function updateMyHoleAnchor(){
    const seat = seatMarkers[seatIndex];
    if (!seat) return;

    // card placement: slightly toward center from seat
    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(seat.quaternion).normalize();
    const basePos = seat.position.clone()
      .add(forward.clone().multiplyScalar(CFG.seatCardOffset));

    // place each card flat on felt
    myHoleMeshes[0].position.set(basePos.x - 0.12, CFG.table.y + 0.121, basePos.z);
    myHoleMeshes[1].position.set(basePos.x + 0.12, CFG.table.y + 0.121, basePos.z);

    // face cards toward seat direction (so they feel “yours”)
    const yaw = Math.atan2(forward.x, forward.z);
    myHoleMeshes[0].rotation.z = yaw;
    myHoleMeshes[1].rotation.z = yaw;

    // bot cards
    for (let b=0;b<5;b++){
      const botSeat = seatMarkers[b+1];
      const f2 = new THREE.Vector3(0,0,-1).applyQuaternion(botSeat.quaternion).normalize();
      const p2 = botSeat.position.clone().add(f2.multiplyScalar(CFG.seatCardOffset));

      botHoleMeshes[b][0].position.set(p2.x - 0.12, CFG.table.y + 0.121, p2.z);
      botHoleMeshes[b][1].position.set(p2.x + 0.12, CFG.table.y + 0.121, p2.z);

      const yaw2 = Math.atan2(f2.x, f2.z);
      botHoleMeshes[b][0].rotation.z = yaw2;
      botHoleMeshes[b][1].rotation.z = yaw2;
    }
  }

  // Dealer button placement
  function placeDealerButton(dealerIdx){
    const p = seatPositions[dealerIdx];
    if (!p) return;
    dealerButton.position.set(p.x, p.y, p.z);
  }

  // --- Store (3D kiosk + wrist menu) ---
  const storeState = {
    open: false,
    kioskOpen: false,
    items: buildItems()
  };

  function buildItems(){
    // “40 items scaffold” (you can expand names later)
    const cosmetics = [];
    const names = [
      "Nova Tee","Tournament Tee","Black Felt Tee","Neon Tee","Stripe Tee",
      "Gold Trim Hoodie","Zip Hoodie","Polo","Jacket","Dealer Vest",
      "Cap","Beanie","Visor","Crown","Headband","Fedora","Helmet","Hairpiece",
      "Shades","Aviators","Round Glasses","Mask","Bandana","Poker Visor",
      "Gold Chain","Silver Chain","Pendant","Dog Tag","Bow Tie","Tie",
      "Ring Set","Watch","Bracelet","Gloves",
      "Neon Aura","Fire Aura","Gold Aura","Top10 Badge","Champion Badge","Team Badge"
    ];
    for (let i=0;i<40;i++){
      cosmetics.push({ id:`cos_${i}`, type:'cosmetic', name:names[i] || `Cosmetic ${i+1}`, price: 250000 });
    }

    const bundles = [
      { id:'chips_1', type:'chips', name:'Chip Bundle S', price: 0, give: 100000 },
      { id:'chips_2', type:'chips', name:'Chip Bundle M', price: 0, give: 500000 },
      { id:'chips_3', type:'chips', name:'Chip Bundle L', price: 0, give: 1000000 },
    ];

    const membership = { id:'member_25', type:'membership', name:'Membership $25', priceUSD:25, giveChips: 2500000, giveEvent:1 };

    return { cosmetics, bundles, membership };
  }

  // 3D kiosk near wall
  const kiosk = new THREE.Group();
  kiosk.position.set(-14, 1.2, -10);
  kiosk.rotation.y = Math.PI/4;
  scene.add(kiosk);

  const kioskStand = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 2.2, 0.6),
    safe.mat('kiosk.jpg', 0x14151e, 1)
  );
  kioskStand.castShadow = true;
  kioskStand.receiveShadow = true;
  kiosk.add(kioskStand);

  const kioskButtons = makeButtonPanel([
    { id:'openStore', label:'OPEN STORE', onClick: ()=> toggleStore(true, 'KIOSK') },
    { id:'member', label:'BUY MEMBERSHIP ($25)', onClick: ()=> buyMembership() },
    { id:'bundle', label:'FREE CHIP BUNDLE (DEV)', onClick: ()=> grantChips(500000) }
  ], { width: 1.35, rowHeight: 0.20 });

  kioskButtons.position.set(0, 0.5, 0.31);
  kioskButtons.rotation.y = 0;
  kiosk.add(kioskButtons);

  // Register clickable UI meshes
  interactions.registerClickable(kioskButtons);

  // Wrist watch menu (left controller)
  const watch = new THREE.Group();
  watch.visible = false;
  scene.add(watch);

  const watchPanel = makeButtonPanel([
    { id:'sit', label:'SIT / STAND', onClick: ()=> { seated ? standUp() : sitAtSeat(0); } },
    { id:'store', label:'STORE', onClick: ()=> toggleStore(!storeState.open, 'WATCH') },
    { id:'hand', label:'NEXT HAND', onClick: ()=> { if (engine.getPublicState().street === 'IDLE') engine.startHand(); } },
    { id:'mute', label:'MUTE (HOOK)', onClick: ()=> logLine('Mute is a hook for later (Update E).') },
  ], { width: 1.05, rowHeight: 0.18 });

  watch.add(watchPanel);
  interactions.registerClickable(watchPanel);

  function attachWatchToLeftController(){
    const ctrls = interactions.controllers || [];
    if (!ctrls.length) return;

    // attach to controller 0 by default
    const left = ctrls[0];
    if (!left) return;

    if (watch.parent !== left) left.add(watch);

    watch.position.set(-0.05, 0.05, -0.10);
    watch.rotation.set(-0.55, 0.25, 0);
    watch.visible = true;
  }

  function toggleStore(open, source){
    storeState.open = open;
    logLine(open ? `Store opened (${source})` : `Store closed`);
  }

  function grantChips(amount){
    econ.chips = (econ.chips || 0) + amount;
    saveEcon(econ);
    logLine(`+${amount} chips (DEV). Total: ${econ.chips}`);
  }

  function buyMembership(){
    // In-web build can’t actually charge; this is the logic hook.
    // For now: toggle member true + give rewards so you can test.
    econ.member = true;
    econ.eventChips = (econ.eventChips || 0) + 1;
    econ.chips = (econ.chips || 0) + 2500000;
    saveEcon(econ);
    logLine(`Membership ON: +2,500,000 chips, +1 Event Chip. Event Chips: ${econ.eventChips}`);
  }

  // ---- Android joystick input ----
  const joy = document.getElementById('joy');
  const nub = document.getElementById('joyNub');
  let joyActive = false;
  let joyCenter = { x:0, y:0 };
  let joyVec = { x:0, y:0 }; // -1..1

  const joyRadius = 42;

  const setNub = (dx, dy) => {
    nub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  };

  joy.addEventListener('pointerdown', (e)=>{
    joyActive = true;
    joyCenter = { x: e.clientX, y: e.clientY };
  }, { passive:true });

  window.addEventListener('pointermove', (e)=>{
    if (!joyActive) return;
    const dx = e.clientX - joyCenter.x;
    const dy = e.clientY - joyCenter.y;

    const len = Math.hypot(dx, dy);
    const cl = Math.min(len, joyRadius);
    const nx = (len > 0) ? (dx / len) : 0;
    const ny = (len > 0) ? (dy / len) : 0;

    const px = nx * cl;
    const py = ny * cl;

    setNub(px, py);

    joyVec.x = px / joyRadius;    // strafe
    joyVec.y = py / joyRadius;    // forward/back (inverted later)
  }, { passive:true });

  window.addEventListener('pointerup', ()=>{
    joyActive = false;
    joyVec.x = 0; joyVec.y = 0;
    setNub(0,0);
  }, { passive:true });

  // Touch look-around
  let lookActive = false, lastX=0, lastY=0;
  window.addEventListener('pointerdown', (e)=>{
    // ignore joystick area
    if (e.target && e.target.id === 'joy' || e.target?.id === 'joyNub') return;
    lookActive = true;
    lastX = e.clientX; lastY = e.clientY;
  }, { passive:true });

  window.addEventListener('pointermove', (e)=>{
    if (!lookActive) return;
    const dx = (e.clientX - lastX) / window.innerWidth;
    const dy = (e.clientY - lastY) / window.innerHeight;
    lastX = e.clientX; lastY = e.clientY;

    // yaw on rig, pitch on camera
    rig.rotation.y -= dx * 2.4;
    camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - dy * 1.6, -1.1, 1.1);
  }, { passive:true });

  window.addEventListener('pointerup', ()=>{ lookActive=false; }, { passive:true });

  // Desktop WASD fallback
  const keys = { w:false, a:false, s:false, d:false };
  window.addEventListener('keydown', (e)=>{
    if (e.key === 'w') keys.w = true;
    if (e.key === 'a') keys.a = true;
    if (e.key === 's') keys.s = true;
    if (e.key === 'd') keys.d = true;
  });
  window.addEventListener('keyup', (e)=>{
    if (e.key === 'w') keys.w = false;
    if (e.key === 'a') keys.a = false;
    if (e.key === 's') keys.s = false;
    if (e.key === 'd') keys.d = false;
  });

  // UI bindings
  const actions = document.getElementById('actions');
  const slider = document.getElementById('raiseSlider');
  const label = document.getElementById('raiseLabel');

  slider.addEventListener('input', ()=> label.textContent = `Raise To: ${slider.value}`);

  document.getElementById('btnFold').onclick = ()=> engine.actFold(0);
  document.getElementById('btnCheck').onclick = ()=> engine.actCheck(0);
  document.getElementById('btnCall').onclick = ()=> engine.actCall(0);
  document.getElementById('btnBetRaise').onclick = ()=> engine.actBetRaiseTo(0, parseInt(slider.value,10)||0);

  document.getElementById('btnSitStand').onclick = ()=> { seated ? standUp() : sitAtSeat(0); };
  document.getElementById('btnStore').onclick = ()=> toggleStore(!storeState.open, 'HUD');
  document.getElementById('btnNextHand').onclick = ()=> { if (engine.getPublicState().street === 'IDLE') engine.startHand(); };

  // --- Sync UI, cards, turn glow, pot visuals ---
  // Simple pot chip stack
  const potStack = new THREE.Group();
  potStack.position.set(0, CFG.table.y + 0.12, 0.25);
  scene.add(potStack);

  const chipMat = new THREE.MeshStandardMaterial({ color: 0x1a9cff, roughness:0.55, metalness:0.15 });
  const chipGeo = new THREE.CylinderGeometry(0.06,0.06,0.02, 18);

  function rebuildPotStack(pot){
    potStack.clear();
    const chips = Math.min(26, Math.floor(pot / 20000)); // 1 chip per 20k for visuals
    for (let i=0;i<chips;i++){
      const c = new THREE.Mesh(chipGeo, chipMat);
      c.position.set(0, i*0.018, 0);
      c.castShadow = true;
      potStack.add(c);
    }
  }

  function syncCards(){
    const st = engine.getPublicState();

    // community
    for (let i=0;i<5;i++){
      const cm = communityMeshes[i];
      if (st.community[i]) setCardFace(cm, st.community[i], true);
      else setCardFace(cm, {r:"A",s:"S"}, false);
      cm.visible = true;
    }

    // mine (only you see)
    const my = engine.getSeatHoleCards(0);
    for (let i=0;i<2;i++){
      if (my[i]) setCardFace(myHoleMeshes[i], my[i], true);
    }

    placeDealerButton(st.dealer);
    updateMyHoleAnchor();

    // pot visual
    rebuildPotStack(st.pot || 0);
  }

  function syncHUD(){
    const st = engine.getPublicState();

    const myTurn = (st.turn === 0 && st.street !== 'IDLE');
    actions.style.display = 'flex'; // always show controls for mobile testing

    // turn ring
    const t = st.turn;
    const seat = seatMarkers[t];
    if (seat){
      turnRing.position.set(seat.position.x, 0.02, seat.position.z);
      turnRing.material.opacity = (st.street !== 'IDLE') ? 0.55 : 0.0;
    }

    // betting slider bounds
    const me = st.seats[0];
    const canBet = (st.currentBet === 0);
    const minTo = canBet ? 2000 : (st.minRaiseTo || (st.currentBet + 2000));
    const maxTo = me.streetBet + me.stack;
    slider.min = String(minTo);
    slider.max = String(Math.max(minTo, maxTo));
    slider.value = String(minTo);
    label.textContent = `Raise To: ${slider.value}`;

    // Button enable
    document.getElementById('btnFold').disabled = !myTurn;
    const canCheck = (st.currentBet === me.streetBet);
    document.getElementById('btnCheck').disabled = !myTurn || !canCheck;
    document.getElementById('btnCall').disabled = !myTurn || canCheck;
    document.getElementById('btnBetRaise').disabled = !myTurn;

    // Seat lock hint
    document.getElementById('btnSitStand').textContent = seated ? 'Stand' : 'Sit';
  }

  engine.onState = ()=> { syncCards(); syncHUD(); };

  // Start
  engine.startHand();

  // Resize
  window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, { passive:true });

  // Animation loop
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(()=>{
    const dt = clock.getDelta();

    // Attach watch in VR when session active
    if (renderer.xr.isPresenting) attachWatchToLeftController();

    // Engine timer
    engine.tick(dt);

    // Bots
    bots.update(dt);

    // Movement: disabled if seated (table-lock)
    if (!seated){
      // forward/right vectors
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      dir.y = 0; dir.normalize();
      const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0,1,0)).normalize();

      let f = 0, s = 0;

      // Android joystick
      f += (-joyVec.y); // up = forward
      s += (joyVec.x);

      // WASD
      if (keys.w) f += 1;
      if (keys.s) f -= 1;
      if (keys.d) s += 1;
      if (keys.a) s -= 1;

      // VR thumbstick
      if (renderer.xr.isPresenting){
        const pads = interactions.getXRGamepads();
        for (const gp of pads){
          // typical: axes[2]/axes[3] or axes[0]/axes[1]
          const axX = (gp.axes?.[2] ?? gp.axes?.[0] ?? 0);
          const axY = (gp.axes?.[3] ?? gp.axes?.[1] ?? 0);
          s += axX;
          f += -axY;
        }
      }

      // Apply move
      const speed = renderer.xr.isPresenting ? CFG.move.vrSpeed : CFG.move.speed;
      const desired = rig.position.clone();
      desired.addScaledVector(dir, f*speed*dt);
      desired.addScaledVector(right, s*speed*dt);

      rig.position.copy(colliders.tryMove(rig.position, desired, CFG.playerRadius));
    } else {
      // while seated: keep rig anchored to seat position, allow only look
      const seat = seatMarkers[seatIndex];
      if (seat){
        rig.position.x = seat.position.x;
        rig.position.z = seat.position.z;
      }
    }

    // Tags (dwell look)
    const hit = interactions.raycastPlayers(players);
    tags.update(dt, hit?.object || null);

    renderer.render(scene, camera);
  });
    }
