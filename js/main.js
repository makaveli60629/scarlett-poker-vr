import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js';

import { Interactions } from './interactions.js';
import { GamerTags } from './ui.js';

// =========================
// CONFIG
// =========================
const CFG = {
  floorSize: 60,
  table: { radius: 1.35, height: 1.0 },
  player: { height: 1.65 },
  tag: { dwellSeconds: 5.0 }
};

// =========================
// CHIP SYSTEM (denoms + event chip) - ready
// =========================
const CHIP_SPECS = [
  { value: 1,     name: "$1",     color: 0xffffff, edge: 0x222222, accent: "#bfc7d6" },
  { value: 5,     name: "$5",     color: 0xff3333, edge: 0xffffff, accent: "#ff3333" },
  { value: 10,    name: "$10",    color: 0x2b7bff, edge: 0xffffff, accent: "#2b7bff" },
  { value: 25,    name: "$25",    color: 0x33ff88, edge: 0xffffff, accent: "#33ff88" },
  { value: 50,    name: "$50",    color: 0xff8a1f, edge: 0xffffff, accent: "#ff8a1f" },
  { value: 100,   name: "$100",   color: 0x111111, edge: 0xffffff, accent: "#ffffff" },
  { value: 500,   name: "$500",   color: 0x9b59ff, edge: 0xffffff, accent: "#9b59ff" },
  { value: 1000,  name: "$1K",    color: 0xfff07a, edge: 0x222222, accent: "#ffd84a" },
  { value: 5000,  name: "$5K",    color: 0x00ffd5, edge: 0x111111, accent: "#00ffd5" },
  { value: 10000, name: "$10K",   color: 0xff2fa8, edge: 0xffffff, accent: "#ff2fa8" },
  { value: 25000, name: "$25K",   color: 0x7f8c8d, edge: 0xffffff, accent: "#cfd8dc" },
  { value: 50000, name: "$50K",   color: 0x8b4513, edge: 0xffffff, accent: "#ffb74d" },
  { value: 100000,name: "$100K",  color: 0x00ff3b, edge: 0x111111, accent: "#00ff3b" },
];

const EVENT_CHIP_SPEC = { value: 5, name: "$5 EVENT", color: 0xd6b15f, edge: 0x2b1b00, accent:"#ffd54a", event:true };

function getChipSpec(value, isEvent=false){
  if (isEvent) return EVENT_CHIP_SPEC;
  return CHIP_SPECS.find(s=>s.value===value) || { value, name:`$${value}`, color:0xffffff, edge:0x222222, accent:"#7a2cff" };
}

function makeChipLabelTexture(textMain, textSub, accent="#7a2cff", isEvent=false) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#0b0b10";
  ctx.fillRect(0,0,256,256);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 14;
  ctx.beginPath(); ctx.arc(128,128,108,0,Math.PI*2); ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(128,128,88,0,Math.PI*2); ctx.stroke();

  if (isEvent) {
    ctx.save();
    ctx.translate(128,128);
    ctx.strokeStyle = "rgba(255,213,74,0.65)";
    ctx.lineWidth = 4;
    for (let i=0;i<18;i++){
      ctx.rotate((Math.PI*2)/18);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-110); ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle="rgba(0,0,0,0.55)";
    ctx.fillRect(28,26,200,42);
    ctx.strokeStyle="rgba(255,213,74,0.55)";
    ctx.lineWidth=3;
    ctx.strokeRect(28,26,200,42);

    ctx.fillStyle="#ffd54a";
    ctx.font="bold 26px Arial";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillText("EVENT CHIP", 128, 47);
  }

  ctx.fillStyle="#ffffff";
  ctx.font="bold 56px Arial";
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  ctx.fillText(textMain, 128, 128);

  ctx.fillStyle="rgba(255,255,255,0.78)";
  ctx.font="bold 18px Arial";
  ctx.fillText(textSub || "TEAM NOVA", 128, 170);

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  tex.anisotropy = 2;
  return tex;
}

function makeLowPolyChipBase(color, edgeColor){
  const chip = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22,0.22,0.05,18),
    new THREE.MeshStandardMaterial({ color, roughness:0.55, metalness:0.08 })
  );
  base.castShadow = true;
  base.receiveShadow = true;
  chip.add(base);

  const ringMat = new THREE.MeshStandardMaterial({ color: edgeColor, roughness:0.55, metalness:0.06 });
  const ringTop = new THREE.Mesh(new THREE.TorusGeometry(0.14,0.012,8,18), ringMat);
  ringTop.rotation.x = Math.PI/2;
  ringTop.position.y = 0.026;
  chip.add(ringTop);

  const ringBot = ringTop.clone();
  ringBot.position.y = -0.026;
  chip.add(ringBot);

  const notchMat = new THREE.MeshStandardMaterial({ color: edgeColor, roughness:0.65, metalness:0.03 });
  for (let i=0;i<10;i++){
    const a = (i/10)*Math.PI*2;
    const notch = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.03,0.02), notchMat);
    notch.position.set(Math.sin(a)*0.21, 0, Math.cos(a)*0.21);
    notch.lookAt(0,0,0);
    notch.rotateY(Math.PI/2);
    notch.castShadow = true;
    chip.add(notch);
  }
  return chip;
}

function makeChip(value, options={}){
  const isEvent = !!options.event;
  const spec = getChipSpec(value, isEvent);

  const chip = makeLowPolyChipBase(spec.color, spec.edge);

  const labelTex = makeChipLabelTexture(
    spec.name,
    isEvent ? "FOUNDERS EDITION" : "TEAM NOVA",
    spec.accent,
    isEvent
  );

  const labelMat = new THREE.MeshStandardMaterial({
    map: labelTex,
    transparent: true,
    roughness: 0.75,
    metalness: isEvent ? 0.22 : 0.03
  });

  const top = new THREE.Mesh(new THREE.CircleGeometry(0.135,18), labelMat);
  top.rotation.x = -Math.PI/2;
  top.position.y = 0.0265;
  chip.add(top);

  const bot = top.clone();
  bot.rotation.x = Math.PI/2;
  bot.position.y = -0.0265;
  chip.add(bot);

  chip.userData = { type:"chip", value: spec.value, event:isEvent };
  return chip;
}

function makeChipStack(value, count=10, options={}){
  const g = new THREE.Group();
  for (let i=0;i<count;i++){
    const c = makeChip(value, options);
    c.position.y = i*0.053;
    c.rotation.y = (i%2)*0.2;
    g.add(c);
  }
  return g;
}

function spawnChipPile(x,y,z,value,count=12,options={}){
  const pile = new THREE.Group();
  for (let i=0;i<count;i++){
    const c = makeChip(value, options);
    c.position.set((Math.random()-0.5)*0.28, i*0.005, (Math.random()-0.5)*0.28);
    c.rotation.set(0, Math.random()*Math.PI*2, 0);
    pile.add(c);
  }
  pile.position.set(x,y,z);
  return pile;
}

// =========================
// MAIN BOOT
// =========================
export async function boot(){
  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Scene + Camera
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070a12);
  scene.fog = new THREE.Fog(0x070a12, 10, 80);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 200);

  // Player rig
  const rig = new THREE.Group();
  rig.position.set(0, 0, 6);
  rig.add(camera);
  scene.add(rig);

  // Lighting (casino vibe)
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
    new THREE.MeshStandardMaterial({ color: 0x11131c, roughness: 0.95, metalness: 0.0 })
  );
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Simple room boundary (so it doesn’t feel empty)
  const walls = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0e1020, roughness: 0.95 });
  const wallGeo = new THREE.BoxGeometry(40, 8, 0.6);

  const w1 = new THREE.Mesh(wallGeo, wallMat); w1.position.set(0,4,-18); w1.receiveShadow=true;
  const w2 = new THREE.Mesh(wallGeo, wallMat); w2.position.set(0,4,18);  w2.receiveShadow=true;
  const w3 = new THREE.Mesh(new THREE.BoxGeometry(0.6,8,40), wallMat); w3.position.set(-18,4,0);
  const w4 = new THREE.Mesh(new THREE.BoxGeometry(0.6,8,40), wallMat); w4.position.set(18,4,0);

  walls.add(w1,w2,w3,w4);
  scene.add(walls);

  // Poker table (low poly)
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

  // Chairs (6)
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

  // Chip demo (all denoms + event)
  const denoms = [1,5,10,25,50,100,500,1000,5000,10000,25000,50000,100000];
  let x = -2.6;
  for (const v of denoms){
    const st = makeChipStack(v, 7);
    st.position.set(x, CFG.table.height + 0.08, 1.75);
    scene.add(st);
    x += 0.48;
  }
  const eventPile = spawnChipPile(2.2, CFG.table.height + 0.08, 1.25, 5, 14, { event:true });
  scene.add(eventPile);

  // Store kiosk placeholder (next update will make it interactive)
  const kiosk = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.2, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x161a2a, roughness: 0.75, emissive: 0x1d2550, emissiveIntensity: 0.3 })
  );
  kiosk.position.set(-4.2, 0.6, 0);
  kiosk.castShadow = true;
  kiosk.userData.isKiosk = true;
  scene.add(kiosk);

  // Players (placeholder avatars) + identity data + tag anchors
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
      name: `Player${i+1}`,
      team,
      rank,
      bgStyle: (i%2===0) ? "FELT_BLACK" : "NEON_PURPLE",
      badges,
      streak: {
        winsInARow: 0,
        recentWins: [],
        isOnFire: false
      }
    };
    body.userData.tagAnchor = tagAnchor;

    return body;
  }

  // Place 5 players around table (you are the 6th)
  for (let i=0;i<5;i++){
    const p = makePlayer(i);
    const a = ((i+1)/6)*Math.PI*2;
    p.position.set(Math.sin(a)*2.15, 0, Math.cos(a)*2.15);
    p.lookAt(0, 1.2, 0);
    scene.add(p);
    players.push(p);
  }

  // Systems
  const interactions = new Interactions(camera, scene, renderer.domElement);
  const tags = new GamerTags(scene, camera, { dwellSeconds: CFG.tag.dwellSeconds });

  // Register players to tag system
  for (const p of players){
    tags.attachToPlayer(p, p.userData.tagAnchor);
  }

  // Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, { passive:true });

  // Basic touch look-around for Android (no movement yet)
  // (Movement/teleport stays in your VR controls update later.)
  let isTouch = false;
  let lastX = 0, lastY = 0;
  window.addEventListener('touchstart', (e) => {
    if (!e.touches?.length) return;
    isTouch = true;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
  }, { passive:true });

  window.addEventListener('touchmove', (e) => {
    if (!isTouch || !e.touches?.length) return;
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    const dx = (x - lastX) / window.innerWidth;
    const dy = (y - lastY) / window.innerHeight;
    lastX = x; lastY = y;

    rig.rotation.y -= dx * 2.2;
    camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - dy * 1.6, -1.1, 1.1);
  }, { passive:true });

  window.addEventListener('touchend', () => { isTouch = false; }, { passive:true });

  // Animation loop
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    // Raycast target under gaze
    const hit = interactions.raycastPlayers(players);
    tags.update(dt, hit?.object || null);

    renderer.render(scene, camera);
  });
}
