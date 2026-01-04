import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js';

import { Interactions } from './interactions.js';
import { GamerTags } from './ui.js';

import { PokerEngine } from './poker.js';
import { BotController } from './bots.js';
import { makeCardMesh, setCardFace } from './cards.js';

const CFG = {
  floorSize: 60,
  table: { radius: 1.35, height: 1.0 },
  player: { radius: 0.28 },
  tag: { dwellSeconds: 5.0 }
};

// ---------- Simple collider world (AABB) ----------
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

// ---------- Minimal DOM action UI ----------
function ensureActionUI(){
  let ui = document.getElementById("actionUI");
  if (ui) return ui;

  ui = document.createElement("div");
  ui.id = "actionUI";
  ui.style.position = "fixed";
  ui.style.left = "50%";
  ui.style.bottom = "14px";
  ui.style.transform = "translateX(-50%)";
  ui.style.display = "flex";
  ui.style.gap = "10px";
  ui.style.zIndex = "30";

  const mkBtn = (id, text) => {
    const b = document.createElement("button");
    b.id = id;
    b.textContent = text;
    b.style.border = "0";
    b.style.borderRadius = "14px";
    b.style.padding = "12px 14px";
    b.style.fontSize = "14px";
    b.style.background = "rgba(0,0,0,0.55)";
    b.style.color = "rgba(255,255,255,0.92)";
    b.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";
    b.style.backdropFilter = "blur(6px)";
    return b;
  };

  ui.appendChild(mkBtn("btnFold","Fold"));
  ui.appendChild(mkBtn("btnCheckCall","Check/Call"));
  ui.appendChild(mkBtn("btnNextHand","Next Hand"));

  document.body.appendChild(ui);
  return ui;
}

function ensureLogPanel(){
  let p = document.getElementById("logPanel");
  if (p) return p;
  p = document.createElement("div");
  p.id = "logPanel";
  p.style.position = "fixed";
  p.style.right = "12px";
  p.style.top = "12px";
  p.style.width = "46vw";
  p.style.maxWidth = "420px";
  p.style.maxHeight = "34vh";
  p.style.overflow = "auto";
  p.style.padding = "10px 12px";
  p.style.borderRadius = "14px";
  p.style.background = "rgba(0,0,0,0.45)";
  p.style.color = "rgba(255,255,255,0.85)";
  p.style.fontSize = "12px";
  p.style.lineHeight = "1.25";
  p.style.zIndex = "25";
  p.style.userSelect = "none";
  document.body.appendChild(p);
  return p;
}

function logLine(panel, txt){
  const div = document.createElement("div");
  div.textContent = txt;
  panel.prepend(div);
  // trim
  while (panel.childNodes.length > 60) panel.removeChild(panel.lastChild);
}

export async function boot(){
  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070a12);
  scene.fog = new THREE.Fog(0x070a12, 10, 80);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 200);

  const rig = new THREE.Group();
  rig.position.set(0, 0, 6);
  rig.add(camera);
  scene.add(rig);

  // Lighting
  scene.add(new THREE.HemisphereLight(0x9db6ff, 0x0b0b12, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 0.8);
  key.position.set(8, 14, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024,1024);
  scene.add(key);

  const rim = new THREE.PointLight(0x8a6bff, 1.2, 22, 2);
  rim.position.set(0, 3.2, 0);
  scene.add(rim);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(CFG.floorSize, CFG.floorSize),
    new THREE.MeshStandardMaterial({ color: 0x11131c, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Walls
  const walls = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0e1020, roughness: 0.95 });
  const wallGeo = new THREE.BoxGeometry(40, 8, 0.6);

  const w1 = new THREE.Mesh(wallGeo, wallMat); w1.position.set(0,4,-18);
  const w2 = new THREE.Mesh(wallGeo, wallMat); w2.position.set(0,4,18);
  const w3 = new THREE.Mesh(new THREE.BoxGeometry(0.6,8,40), wallMat); w3.position.set(-18,4,0);
  const w4 = new THREE.Mesh(new THREE.BoxGeometry(0.6,8,40), wallMat); w4.position.set(18,4,0);
  walls.add(w1,w2,w3,w4);
  scene.add(walls);

  // Table
  const tableGroup = new THREE.Group();

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(CFG.table.radius, CFG.table.radius, 0.14, 24),
    new THREE.MeshStandardMaterial({ color: 0x0b6a3b, roughness:0.85 })
  );
  felt.position.y = CFG.table.height;
  felt.castShadow = true;
  felt.receiveShadow = true;
  tableGroup.add(felt);

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(CFG.table.radius*0.97, 0.08, 10, 24),
    new THREE.MeshStandardMaterial({ color: 0x2b2a30, roughness:0.75 })
  );
  rail.position.y = CFG.table.height + 0.05;
  rail.rotation.x = Math.PI/2;
  rail.castShadow = true;
  tableGroup.add(rail);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.6, 0.95, 18),
    new THREE.MeshStandardMaterial({ color: 0x1a1d27, roughness:0.9 })
  );
  base.position.y = CFG.table.height - 0.55;
  base.castShadow = true;
  base.receiveShadow = true;
  tableGroup.add(base);

  scene.add(tableGroup);

  // Chairs
  const chairs = new THREE.Group();
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x3a3d48, roughness:0.9 });
  for (let i=0;i<6;i++){
    const a = (i/6)*Math.PI*2;
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.55,0.5), chairMat);
    chair.position.set(Math.sin(a)*2.25, 0.28, Math.cos(a)*2.25);
    chair.castShadow = true;
    chair.receiveShadow = true;
    chairs.add(chair);
  }
  scene.add(chairs);

  // Players (5 bots around table; you are seat 0)
  const players = [];
  const teamList = ["SPADES","HEARTS","CLUBS","DIAMONDS"];
  const ranks = ["BRONZE","SILVER","GOLD","PLATINUM","DIAMOND","LEGEND"];
  const badgePool = ["SHOWDOWN_TOP10","EVENT_WINNER","STREAK_MASTER","FOUNDER","TEAM_MVP","TOURNEY_CHAMP"];

  function makePlayer(i){
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

    const team = teamList[i % teamList.length];
    const rank = ranks[(i*2) % ranks.length];
    const badges = [badgePool[i % badgePool.length], badgePool[(i+2) % badgePool.length]];

    body.userData.isPlayer = true;
    body.userData.identity = {
      id: `p${i}`,
      name: `Bot${i+1}`,
      team, rank,
      bgStyle: (i%2===0) ? "FELT_BLACK" : "NEON_PURPLE",
      badges,
      streak: { winsInARow: 0, recentWins: [], isOnFire: false }
    };
    body.userData.tagAnchor = tagAnchor;
    return body;
  }

  for (let i=0;i<5;i++){
    const p = makePlayer(i);
    const a = ((i+1)/6)*Math.PI*2;
    p.position.set(Math.sin(a)*2.15, 0, Math.cos(a)*2.15);
    p.lookAt(0, 1.2, 0);
    scene.add(p);
    players.push(p);
  }

  // Systems: interactions + tags
  const interactions = new Interactions(camera, scene, renderer.domElement);
  const tags = new GamerTags(scene, camera, { dwellSeconds: CFG.tag.dwellSeconds });
  for (const p of players){
    tags.attachToPlayer(p, p.userData.tagAnchor);
  }

  // Colliders
  const colliders = new ColliderWorld();
  colliders.addBoxFromObject(walls, 0);
  colliders.addBoxFromObject(tableGroup, 0.15);
  colliders.addBoxFromObject(chairs, 0.05);

  // Android movement (tap zones)
  let moveF = 0, moveS = 0;
  window.addEventListener('pointerdown', (e) => {
    const xN = e.clientX / window.innerWidth;
    if (xN < 0.33) moveS = -1;
    else if (xN > 0.66) moveS = 1;
    else moveF = 1;
  }, { passive:true });
  window.addEventListener('pointerup', () => { moveF=0; moveS=0; }, { passive:true });
  window.addEventListener('pointercancel', () => { moveF=0; moveS=0; }, { passive:true });

  // Touch look-around
  let isTouch = false, lastX=0, lastY=0;
  window.addEventListener('touchstart', (e) => {
    if (!e.touches?.length) return;
    isTouch = true;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
  }, { passive:true });
  window.addEventListener('touchmove', (e) => {
    if (!isTouch || !e.touches?.length) return;
    const x = e.touches[0].clientX, y = e.touches[0].clientY;
    const dx = (x-lastX)/window.innerWidth;
    const dy = (y-lastY)/window.innerHeight;
    lastX=x; lastY=y;
    rig.rotation.y -= dx*2.2;
    camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - dy*1.6, -1.1, 1.1);
  }, { passive:true });
  window.addEventListener('touchend', ()=>{ isTouch=false; }, { passive:true });

  window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, { passive:true });

  // ---------- Poker Engine + Bots ----------
  const engine = new PokerEngine({
    maxSeats: 6,
    startStack: 200000,
    smallBlind: 1000,
    bigBlind: 2000,
    ante: 250
  });

  engine.setSeatName(0, "YOU");
  for (let i=1;i<6;i++) engine.setSeatName(i, `Bot${i}`);

  const bots = new BotController(engine, { thinkMin: 0.7, thinkMax: 1.6 });

  // Log + Action UI
  const ui = ensureActionUI();
  const logPanel = ensureLogPanel();

  engine.onLog = (m)=> logLine(logPanel, m);

  // Card meshes: community (5) + local hole (2) + bots (backs)
  const cardRoot = new THREE.Group();
  scene.add(cardRoot);

  const communityMeshes = [];
  for (let i=0;i<5;i++){
    const m = makeCardMesh({r:"A",s:"S"}, { faceUp:false });
    m.position.set(-0.7 + i*0.35, CFG.table.height + 0.12, 0);
    m.rotation.x = -Math.PI/2;
    cardRoot.add(m);
    communityMeshes.push(m);
  }

  // Local hole cards (face up) floating near camera (only you see them)
  const localHole = [];
  for (let i=0;i<2;i++){
    const m = makeCardMesh({r:"A",s:"S"}, { faceUp:true });
    m.position.set(-0.10 + i*0.22, 1.15, -0.65);
    m.rotation.y = 0;
    cardRoot.add(m);
    localHole.push(m);
  }

  // Bot hole cards: show backs near each bot seat
  const botHole = Array.from({length:5}, ()=>[]);
  for (let b=0;b<5;b++){
    const botObj = players[b];
    for (let i=0;i<2;i++){
      const m = makeCardMesh({r:"A",s:"S"}, { faceUp:false });
      m.position.copy(botObj.position).add(new THREE.Vector3(-0.10 + i*0.22, 1.05, 0));
      m.lookAt(0, 1.05, 0);
      cardRoot.add(m);
      botHole[b].push(m);
    }
  }

  // Keep local cards facing camera (billboard-ish)
  function updateLocalCardFacing(){
    for (const m of localHole){
      m.quaternion.copy(camera.quaternion);
    }
  }

  // Render engine state -> update card visuals
  function syncCards(){
    const st = engine.getPublicState();

    // Community
    for (let i=0;i<5;i++){
      const cm = communityMeshes[i];
      if (st.community[i]) {
        setCardFace(cm, st.community[i], true);
      } else {
        // hide by making it a back and slightly dim
        setCardFace(cm, {r:"A",s:"S"}, false);
      }
      cm.material.opacity = 1;
      cm.visible = true;
    }

    // Local hole (seat 0) face-up
    const my = engine.getSeatHoleCards(0);
    for (let i=0;i<2;i++){
      if (my[i]) setCardFace(localHole[i], my[i], true);
    }

    // Bots hole cards stay as backs (no revealing)
    // In later update, at showdown, we can flip only winners or all.
  }

  // Enable/disable action buttons based on turn
  function syncUI(){
    const st = engine.getPublicState();
    const myTurn = (st.turn === 0 && st.street !== "IDLE");
    ui.style.display = myTurn ? "flex" : "none";
  }

  engine.onState = ()=>{ syncCards(); syncUI(); };

  // Button bindings
  document.getElementById("btnFold").onclick = ()=> engine.actFold(0);
  document.getElementById("btnCheckCall").onclick = ()=> engine.actCheckOrCall(0);
  document.getElementById("btnNextHand").onclick = ()=>{
    if (engine.getPublicState().street === "IDLE") engine.startHand();
  };

  // Start first hand
  engine.startHand();

  // Animation loop
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(()=>{
    const dt = clock.getDelta();

    // mobile locomotion + collision
    const speed = 2.0;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0; dir.normalize();
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0,1,0)).normalize();

    const desired = rig.position.clone();
    desired.addScaledVector(dir, moveF*speed*dt);
    desired.addScaledVector(right, moveS*speed*dt);
    rig.position.copy(colliders.tryMove(rig.position, desired, CFG.player.radius));

    // tags raycast
    const hit = interactions.raycastPlayers(players);
    tags.update(dt, hit?.object || null);

    // bots play automatically on their turns
    bots.update(dt);

    updateLocalCardFacing();

    renderer.render(scene, camera);
  });
}
