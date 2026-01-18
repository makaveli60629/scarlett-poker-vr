import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

// /js/scarlett1/index.js
// SCARLETT1 — RUNTIME (FULL WORKING v1.2)
// Player spawns on a pad facing the table, teleport + movement, unique bot cards, brighter lights.

const BUILD = 'SCARLETT1_RUNTIME_FULL_WORKING_v1_4_POKER_DEAL';

const dwrite = (m)=>{ try{ window.__scarlettDiagWrite?.(String(m)); }catch(_){ } };
const FP = `[scarlett1] LIVE_FINGERPRINT ✅ ${BUILD}`;
console.log(FP);
dwrite(FP);

// Hard attach flags
window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.BUILD = BUILD;
window.SCARLETT.engineAttached = true;
window.SCARLETT.attached = true;
window.SCARLETT.ok = true;
window.__scarlettEngineAttached = true;
window.__SCARLETT_ENGINE_ATTACHED__ = true;

// ---------- utilities ----------
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

function makeTextTexture(text, opts={}){
  const w = opts.w || 1024;
  const h = opts.h || 256;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.clearRect(0,0,w,h);
  g.fillStyle = opts.bg || 'rgba(0,0,0,0)';
  g.fillRect(0,0,w,h);
  g.font = `${opts.bold ? '800' : '700'} ${opts.size||96}px system-ui,Segoe UI,Roboto,Arial`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  // glow
  g.shadowColor = opts.glow || 'rgba(255,47,109,0.9)';
  g.shadowBlur = opts.blur ?? 24;
  g.fillStyle = opts.color || '#ffd3e1';
  g.fillText(text, w/2, h/2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeCardTexture(rank, suit){
  const w = 512, h = 712;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  // card
  g.fillStyle = '#f7f7fb';
  g.fillRect(0,0,w,h);
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 10;
  g.strokeRect(12,12,w-24,h-24);
  const isRed = (suit === '♥' || suit === '♦');
  g.fillStyle = isRed ? '#d81b60' : '#111318';
  g.font = '700 78px system-ui,Segoe UI,Roboto,Arial';
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText(rank, 46, 36);
  g.font = '800 76px system-ui,Segoe UI,Roboto,Arial';
  g.fillText(suit, 46, 126);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '900 220px system-ui,Segoe UI,Roboto,Arial';
  g.globalAlpha = 0.10;
  g.fillText(suit, w/2, h/2);
  g.globalAlpha = 1.0;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCardMesh(rank, suit){
  const tex = makeCardTexture(rank, suit);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.0 });
  const geom = new THREE.PlaneGeometry(0.10, 0.14);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = true;
  return mesh;
}

function seededRand(seed){
  let s = seed >>> 0;
  return ()=>{
    // LCG
    s = (1664525 * s + 1013904223) >>> 0;
    return (s / 4294967296);
  };
}

// ---------- core start ----------
export async function start(){
  dwrite('[status] booting…');
  dwrite(`BUILD=${BUILD}`);

  const app = document.getElementById('app');
  const pipCanvas = document.getElementById('pipCanvas');

  // renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio||1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.xr.enabled = true;
  app.appendChild(renderer.domElement);

  // scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070b);
  scene.fog = new THREE.Fog(0x05070b, 6, 22);

  // rig + camera
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.01, 100);
  camera.position.set(0, 1.6, 3.2);

  const rig = new THREE.Group();
  rig.position.set(0, 0, 0);
  rig.add(camera);
  scene.add(rig);



  // --- HARD SPAWN (single definition; safe pad in front of table) ---
  const DEFAULT_SPAWN = { x: 0, y: 0, z: 7.5, yaw: Math.PI }; // farther so you never start on the table
  const forceSpawn = () => {
    try {
      const sp = window.SCARLETT?.SPAWN_PAD;
      const x = (sp?.x ?? DEFAULT_SPAWN.x);
      const y = (sp?.y ?? DEFAULT_SPAWN.y);
      const z = (sp?.z ?? DEFAULT_SPAWN.z);
      const yaw = (sp?.yaw ?? DEFAULT_SPAWN.yaw);
      rig.position.set(x, y, z);
      rig.rotation.set(0, yaw, 0);
      rig.updateMatrixWorld(true);
    } catch (_) {}
  };
  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.playerRig = rig;
  window.SCARLETT.forceSpawn = forceSpawn;
  // assert spawn a few times to defeat init/XR timing
  forceSpawn();
  setTimeout(forceSpawn, 250);
  setTimeout(forceSpawn, 1000);

  // WORLD
  buildWorld(scene);

  // Teleport marker / target
  const teleportState = {
    enabled: false,
    hit: null,
  };

  // Controllers (VR)
  const controller1 = renderer.xr.getController(0);
  const controller2 = renderer.xr.getController(1);
  scene.add(controller1);
  scene.add(controller2);

  const controllerGrip1 = renderer.xr.getControllerGrip(0);
  const controllerGrip2 = renderer.xr.getControllerGrip(1);
  const modelFactory = new XRControllerModelFactory();
  controllerGrip1.add(modelFactory.createControllerModel(controllerGrip1));
  controllerGrip2.add(modelFactory.createControllerModel(controllerGrip2));
  scene.add(controllerGrip1);
  scene.add(controllerGrip2);

  const rayGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0,0,0),
    new THREE.Vector3(0,0,-1)
  ]);
  const rayMat = new THREE.LineBasicMaterial({ transparent:true, opacity:0.65 });
  const ray1 = new THREE.Line(rayGeom, rayMat);
  const ray2 = new THREE.Line(rayGeom, rayMat);
  ray1.scale.z = 8;
  ray2.scale.z = 8;
  controller1.add(ray1);
  controller2.add(ray2);

  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.24, 48),
    new THREE.MeshBasicMaterial({ transparent:true, opacity:0.8 })
  );
  marker.rotation.x = -Math.PI/2;
  marker.visible = false;
  scene.add(marker);

  // Floors to teleport onto
  const teleportSurfaces = [];
  scene.traverse((o)=>{ if (o.userData && o.userData.teleportSurface) teleportSurfaces.push(o); });

  // Simple non‑VR look + move
  const nonVr = createNonVrControls(renderer.domElement, rig, camera);

  // Bots + table + pip target
  const tableCenter = new THREE.Vector3(0, 0.75, 0);
  const { pipTarget } = buildTableAndBots(scene, tableCenter);

  // PIP renderer
  const pipRenderer = new THREE.WebGLRenderer({ canvas: pipCanvas, antialias: true, alpha: true, preserveDrawingBuffer: false });
  pipRenderer.setPixelRatio(Math.min(2, window.devicePixelRatio||1));
  const pipCam = new THREE.PerspectiveCamera(50, 4/3, 0.01, 50);
  pipCam.position.set(0, 3.4, 2.8);
  pipCam.lookAt(pipTarget);

  // Spawn: assert (use the single global forceSpawn)
  try{ window.SCARLETT?.forceSpawn?.(); }catch(_){ }
  setTimeout(()=>{ try{ window.SCARLETT?.forceSpawn?.(); }catch(_){ } }, 250);
  setTimeout(()=>{ try{ window.SCARLETT?.forceSpawn?.(); }catch(_){ } }, 1000);

  // HUD wiring
  wireHud(renderer, teleportState);

  // Teleport events
  const onSelect = ()=>{
    if (!teleportState.enabled || !teleportState.hit) return;
    // Move rig so the viewer goes to hit point
    const p = teleportState.hit;
    rig.position.set(p.x, 0, p.z);
  };
  controller1.addEventListener('select', onSelect);
  controller2.addEventListener('select', onSelect);

  // Menu (Y) hint: map common "button 3" on left controller to toggle HUD
  const hud = document.getElementById('hud');
  function pollGamepads(){
    const session = renderer.xr.getSession?.();
    if (!session) return;
    for (const src of session.inputSources || []){
      const gp = src.gamepad;
      if (!gp) continue;
      // heuristic: button 3 often = Y on left controller
      const b = gp.buttons?.[3];
      if (b && b.pressed && !pollGamepads._lock){
        pollGamepads._lock = true;
        hud.classList.toggle('hidden');
        setTimeout(()=>{ pollGamepads._lock = false; }, 250);
      }
    }
  }

  // Resize
  function onResize(){
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // pip
    const w = pipCanvas.clientWidth || 240;
    const h = pipCanvas.clientHeight || 180;
    pipCam.aspect = w / h;
    pipCam.updateProjectionMatrix();
    pipRenderer.setSize(w, h, false);
  }
  window.addEventListener('resize', onResize);
  onResize();

  // Loop
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(()=>{
    const dt = clamp(clock.getDelta(), 0, 0.05);
    nonVr.update(dt);

    // Teleport raycast
    teleportState.hit = null;
    marker.visible = false;

    if (teleportState.enabled && renderer.xr.isPresenting){
      const hit = getTeleportHit(controller2, teleportSurfaces) || getTeleportHit(controller1, teleportSurfaces);
      if (hit){
        teleportState.hit = hit.point;
        marker.position.copy(hit.point);
        marker.visible = true;
      }
    }

    pollGamepads();

    renderer.render(scene, camera);

    // PIP
    pipCam.lookAt(pipTarget);
    pipRenderer.render(scene, pipCam);
  });

  // Diag summary
  dwrite('[status] renderer OK ✅');
  dwrite('[status] world ready ✅');
  dwrite('[status] MODULE DIAG ✅');
  dwrite('[status] MODULE TELEPORT ✅');
  dwrite('[status] MODULE BOTS ✅');
  dwrite('[status] MODULE PIP ✅');
  dwrite(`xr=${!!navigator.xr}`);
  dwrite('three=true');
  dwrite('renderer=true');
  dwrite('world=true');
  dwrite('modules=5');
}

// ---------- world ----------
function buildWorld(scene){
  // ---------- Room shell ----------
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b121a, roughness: 1.0, metalness: 0.0 });
  const wallMat  = new THREE.MeshStandardMaterial({ color: 0x0f1822, roughness: 0.95, metalness: 0.0 });
  const trimMat  = new THREE.MeshStandardMaterial({ color: 0x1b0b10, roughness: 0.85, metalness: 0.15 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(48, 48), floorMat);
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  floor.userData.teleportSurface = true;
  floor.name = 'floor';
  scene.add(floor);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(48, 48), wallMat);
  ceil.rotation.x = Math.PI/2;
  ceil.position.y = 10;
  scene.add(ceil);

  const back  = new THREE.Mesh(new THREE.BoxGeometry(48, 10, 0.6), wallMat); back.position.set(0,5,-24);
  const front = new THREE.Mesh(new THREE.BoxGeometry(48, 10, 0.6), wallMat); front.position.set(0,5, 24);
  const left  = new THREE.Mesh(new THREE.BoxGeometry(0.6,10,48), wallMat);   left.position.set(-24,5,0);
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.6,10,48), wallMat);   right.position.set( 24,5,0);
  for (const w of [back,front,left,right]){ w.receiveShadow = true; scene.add(w); }

  // ---------- Neon signage ----------
  const signTex = makeTextTexture('Scarlett Lobby', { size: 120, glow:'rgba(255,47,109,0.95)', color:'#ffd0df', blur:30 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 1.8), new THREE.MeshBasicMaterial({ map: signTex, transparent:true }));
  sign.position.set(0, 7.8, -23.6);
  scene.add(sign);

  const signTex2 = makeTextTexture('Poker Lobby', { size: 98, glow:'rgba(255,80,200,0.90)', color:'#ffb3ff', blur:22 });
  const sign2 = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 1.35), new THREE.MeshBasicMaterial({ map: signTex2, transparent:true }));
  sign2.position.set(0, 6.5, -23.6);
  scene.add(sign2);

  // ---------- Lighting (brighter) ----------
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));

  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(10, 12, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 60;
  key.shadow.camera.left = -20;
  key.shadow.camera.right = 20;
  key.shadow.camera.top = 20;
  key.shadow.camera.bottom = -20;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.45);
  fill.position.set(-10, 8, -6);
  scene.add(fill);

  const pink = new THREE.PointLight(0xff2f6d, 1.4, 26, 2.0);
  pink.position.set(0, 5.8, -18);
  scene.add(pink);

  const blue = new THREE.PointLight(0x55a7ff, 0.95, 24, 2.0);
  blue.position.set(-10, 5.0, -6);
  scene.add(blue);

  const warm = new THREE.PointLight(0xffd166, 0.85, 22, 2.0);
  warm.position.set(10, 5.0, -6);
  scene.add(warm);

  // ---------- Bar (left) ----------
  const bar = new THREE.Group();
  const barTop = new THREE.Mesh(new THREE.BoxGeometry(8, 0.25, 1.6), trimMat);
  barTop.position.set(-14, 1.1, -6);
  barTop.castShadow = true;
  barTop.receiveShadow = true;
  bar.add(barTop);

  const barBase = new THREE.Mesh(new THREE.BoxGeometry(8, 1.0, 1.4), wallMat);
  barBase.position.set(-14, 0.55, -6);
  barBase.castShadow = true;
  barBase.receiveShadow = true;
  bar.add(barBase);

  const barSignTex = makeTextTexture('BAR', { w:512, h:256, size:140, glow:'rgba(255,209,102,0.9)', color:'#fff2c2', blur:20 });
  const barSign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshBasicMaterial({ map: barSignTex, transparent:true }));
  barSign.position.set(-14, 2.4, -7.1);
  bar.add(barSign);
  scene.add(bar);

  // ---------- Store / kiosk (right) ----------
  const store = new THREE.Group();
  const kiosk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 2.2), wallMat);
  kiosk.position.set(14, 1.1, -6);
  kiosk.castShadow = true;
  kiosk.receiveShadow = true;
  store.add(kiosk);

  const storeSignTex = makeTextTexture('STORE', { w:768, h:256, size:120, glow:'rgba(85,167,255,0.9)', color:'#d7ecff', blur:18 });
  const storeSign = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.0), new THREE.MeshBasicMaterial({ map: storeSignTex, transparent:true }));
  storeSign.position.set(14, 2.7, -7.2);
  store.add(storeSign);
  scene.add(store);

  // ---------- VIP doorway (back-right) ----------
  const vipFrame = new THREE.Mesh(new THREE.BoxGeometry(4.0, 3.2, 0.4), trimMat);
  vipFrame.position.set(16, 1.6, -20);
  scene.add(vipFrame);

  const vipTex = makeTextTexture('VIP', { w:512, h:256, size:140, glow:'rgba(67,243,166,0.85)', color:'#c8ffea', blur:16 });
  const vipSign = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0), new THREE.MeshBasicMaterial({ map: vipTex, transparent:true }));
  vipSign.position.set(16, 3.6, -19.7);
  scene.add(vipSign);

  // ---------- Simple stairs (back-left) ----------
  const stairs = new THREE.Group();
  const stepMat = new THREE.MeshStandardMaterial({ color: 0x151b22, roughness: 1.0 });
  for (let i=0;i<8;i++){
    const step = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.22, 0.8), stepMat);
    step.position.set(-16, 0.11 + i*0.22, -20 + i*0.8);
    step.castShadow = true;
    step.receiveShadow = true;
    stairs.add(step);
  }
  scene.add(stairs);
}


function buildTableAndBots(scene, center){
  // Table base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.55, 0.55, 48),
    new THREE.MeshStandardMaterial({ color: 0x2c0f12, roughness: 0.9, metalness: 0.1 })
  );
  base.position.set(center.x, 0.45, center.z);
  base.castShadow = true;
  base.receiveShadow = true;
  scene.add(base);

  // Felt top
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.25, 0.10, 48),
    new THREE.MeshStandardMaterial({ color: 0x0f3b2b, roughness: 1.0, metalness: 0.0 })
  );
  felt.position.set(center.x, 0.72, center.z);
  felt.castShadow = true;
  felt.receiveShadow = true;
  scene.add(felt);

  // Center decal
  const decalTex = makeTextTexture('SCARLETT', { w:1024, h:256, size:120, glow:'rgba(67,243,166,0.85)', color:'#c8ffea', blur:18 });
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.24),
    new THREE.MeshBasicMaterial({ map: decalTex, transparent:true, opacity:0.95 })
  );
  decal.position.set(center.x, 0.78, center.z);
  decal.rotation.x = -Math.PI/2;
  scene.add(decal);

  // Spawn pad (behind the table)
  const pad = new THREE.Mesh(
    new THREE.RingGeometry(0.30, 0.42, 48),
    new THREE.MeshBasicMaterial({ transparent:true, opacity:0.85 })
  );
  pad.position.set(center.x, 0.01, center.z + 6.0);
  pad.rotation.x = -Math.PI/2;
  scene.add(pad);

  const padLabelTex = makeTextTexture('SPAWN', { w:512, h:256, size:120, glow:'rgba(255,255,255,0.6)', color:'#e9eef5', blur:10 });
  const padLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ map: padLabelTex, transparent:true, opacity:0.95 }));
  padLabel.position.set(center.x, 0.35, center.z + 6.0);
  padLabel.lookAt(new THREE.Vector3(center.x, 0.35, center.z));
  scene.add(padLabel);

  // Bots
  const seats = 5;
  const radius = 1.85; // keep OUTSIDE the table
  const ySeat = 0.42;

  const rand = seededRand(1337);
  const ranks = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
  const suits = ['♠','♥','♦','♣'];
  const used = new Set();

  function nextCard(){
    for (let tries=0; tries<999; tries++){
      const r = ranks[Math.floor(rand()*ranks.length)];
      const s = suits[Math.floor(rand()*suits.length)];
      const key = r+s;
      if (!used.has(key)) { used.add(key); return {r,s}; }
    }
    return { r:'A', s:'♠' };
  }

  for (let i=0; i<seats; i++){
    const a = (i / seats) * Math.PI*2;
    const px = center.x + Math.sin(a) * radius;
    const pz = center.z + Math.cos(a) * radius;

    const bot = new THREE.Group();
    bot.position.set(px, ySeat, pz);
    bot.lookAt(center.x, ySeat, center.z);

    // Chair
    const chair = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.55, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x1a2433, roughness: 0.95, metalness: 0.05 })
    );
    chair.position.set(px, 0.275, pz);
    chair.castShadow = true;
    chair.receiveShadow = true;
    scene.add(chair);

    // Body
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18, 0.32, 6, 16),
      new THREE.MeshStandardMaterial({ color: 0x223449, roughness: 0.95 })
    );
    body.position.set(0, 0.45, 0);
    body.castShadow = true;
    bot.add(body);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0x334a66, roughness: 0.8 })
    );
    head.position.set(0, 0.80, 0);
    head.castShadow = true;
    bot.add(head);

    // "Hands" spheres (what you described)
    const handMat = new THREE.MeshStandardMaterial({ color: 0x4bdfff, roughness: 0.2, metalness: 0.0, emissive: 0x103a44, emissiveIntensity: 0.8 });
    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 12), handMat);
    const handR = handL.clone();
    handL.position.set(-0.20, 0.55, -0.05);
    handR.position.set( 0.20, 0.55, -0.05);
    bot.add(handL);
    bot.add(handR);

    // Floating label "hands"
    const labelTex = makeTextTexture('hands', { w:512, h:256, size:120, glow:'rgba(85,167,255,0.85)', color:'#cfe6ff', blur:16 });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.70, 0.35), new THREE.MeshBasicMaterial({ map: labelTex, transparent:true, opacity:0.95 }));
    label.position.set(0, 1.15, 0);
    label.lookAt(center.x, 1.15, center.z);
    bot.add(label);

    // Unique cards: 2 per bot
    const c1 = nextCard();
    const c2 = nextCard();

    // Flat on table (demo)
    const flat1 = createCardMesh(c1.r, c1.s);
    const flat2 = createCardMesh(c2.r, c2.s);
    const towardCenter = new THREE.Vector3(center.x - px, 0, center.z - pz).normalize();
    const basePos = new THREE.Vector3(px, 0.79, pz).add(towardCenter.clone().multiplyScalar(0.55));

    flat1.position.copy(basePos).add(new THREE.Vector3(-0.06, 0, 0));
    flat2.position.copy(basePos).add(new THREE.Vector3( 0.06, 0, 0));
    flat1.rotation.x = -Math.PI/2;
    flat2.rotation.x = -Math.PI/2;
    flat1.rotation.z = a;
    flat2.rotation.z = a;
    scene.add(flat1);
    scene.add(flat2);

    // Hover mirror above bot hands
    const hov1 = createCardMesh(c1.r, c1.s);
    const hov2 = createCardMesh(c2.r, c2.s);
    hov1.position.set(px - 0.07, 1.05, pz);
    hov2.position.set(px + 0.07, 1.05, pz);
    hov1.lookAt(center.x, 1.05, center.z);
    hov2.lookAt(center.x, 1.05, center.z);
    scene.add(hov1);
    scene.add(hov2);

    scene.add(bot);
  }

  // pip look-at target
  const pipTarget = new THREE.Vector3(center.x, 0.95, center.z);
  return { pipTarget };
}

function placePlayerAtSpawn(rig, tableCenter){
  // Put the rig at spawn pad coordinates; keep well away from the table footprint.
  const spawnZ = (tableCenter?.z ?? 0) + 6.0;
  rig.position.set(tableCenter?.x ?? 0, 0, spawnZ);

  // Face table
  const to = new THREE.Vector3(tableCenter?.x ?? 0, 1.6, tableCenter?.z ?? 0);
  const from = new THREE.Vector3(rig.position.x, 1.6, rig.position.z);
  const dir = to.clone().sub(from);
  const yaw = Math.atan2(dir.x, dir.z);
  rig.rotation.set(0, yaw, 0);

  // Expose for other modules and for re-asserting after XR session start
  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.playerRig = rig;
  window.SCARLETT.spawn = { x: rig.position.x, y: rig.position.y, z: rig.position.z, yaw };
}


// ---------- teleport ----------
function getTeleportHit(controller, surfaces){
  if (!controller) return null;
  const tmpMat = new THREE.Matrix4();
  tmpMat.identity().extractRotation(controller.matrixWorld);
  const ray = new THREE.Raycaster();
  ray.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  ray.ray.direction.set(0,0,-1).applyMatrix4(tmpMat);
  ray.far = 12;
  const hits = ray.intersectObjects(surfaces, true);
  return hits && hits.length ? hits[0] : null;
}

// ---------- HUD ----------
function wireHud(renderer, teleportState){
  const btnEnterVR = document.getElementById('btnEnterVR');
  const btnTeleport = document.getElementById('btnTeleport');
  const btnHideHUD = document.getElementById('btnHideHUD');
  const btnDiag = document.getElementById('btnDiag');
  const diagHud = document.getElementById('diagHud');
  const hud = document.getElementById('hud');

  const setTeleportLabel = ()=>{
    btnTeleport.textContent = teleportState.enabled ? 'Teleport: ON' : 'Teleport: OFF';
    btnTeleport.classList.toggle('good', teleportState.enabled);
  };
  setTeleportLabel();

  btnTeleport?.addEventListener('click', ()=>{
    teleportState.enabled = !teleportState.enabled;
    setTeleportLabel();
    dwrite(`[teleport] ${teleportState.enabled ? 'ON' : 'OFF'}`);
  });

  btnEnterVR?.addEventListener('click', async ()=>{
    try{
      if (!navigator.xr){ dwrite('navigator.xr missing'); return; }
      const supported = await navigator.xr.isSessionSupported('immersive-vr');
      if (!supported){ dwrite('immersive-vr not supported'); return; }
      const session = await navigator.xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor','hand-tracking','layers']
      });
      renderer.xr.setSession(session);
      dwrite('[xr] session started ✅');
      try{ setTimeout(()=>window.SCARLETT?.forceSpawn?.(), 200); }catch(_){ }
      // XR can reset the reference space; re-assert spawn after session begins
      setTimeout(()=>window.SCARLETT?.forceSpawn?.(), 200);
      setTimeout(()=>window.SCARLETT?.forceSpawn?.(), 800);
    }catch(e){
      dwrite('[xr] session failed ❌');
      dwrite(String(e?.stack||e));
    }
  });

  btnHideHUD?.addEventListener('click', ()=>{
    hud.classList.toggle('hidden');
  });

  btnDiag?.addEventListener('click', ()=>{
    diagHud.classList.toggle('hidden');
  });
}

// ---------- non‑VR controls ----------
function createNonVrControls(dom, rig, camera){
  const state = {
    yaw: 0,
    pitch: 0,
    drag: false,
    lastX: 0,
    lastY: 0,
    moveVec: new THREE.Vector3(),
    joystick: { active:false, id:null, x:0, y:0 },
  };

  // mouse/touch drag look
  const onDown = (e)=>{
    state.drag = true;
    const p = getPoint(e);
    state.lastX = p.x;
    state.lastY = p.y;
  };
  const onMove = (e)=>{
    if (!state.drag) return;
    const p = getPoint(e);
    const dx = p.x - state.lastX;
    const dy = p.y - state.lastY;
    state.lastX = p.x; state.lastY = p.y;
    state.yaw -= dx * 0.0022;
    state.pitch -= dy * 0.0018;
    state.pitch = clamp(state.pitch, -0.9, 0.9);
  };
  const onUp = ()=>{ state.drag = false; };

  dom.addEventListener('pointerdown', onDown);
  dom.addEventListener('pointermove', onMove);
  dom.addEventListener('pointerup', onUp);
  dom.addEventListener('pointercancel', onUp);

  // tap-to-move (non‑VR)
  dom.addEventListener('click', (e)=>{
    // ignore if dragging
    if (state.drag) return;
    const hit = raycastFloor(e, camera, dom);
    if (!hit) return;
    rig.position.set(hit.x, 0, hit.z);
  });

  // On‑screen joystick for touch devices
  if ('ontouchstart' in window || (navigator.maxTouchPoints||0) > 0){
    attachJoystick(state);
  }

  return {
    setYaw(y){ state.yaw = y; },
    update(dt){
      // Apply look to rig (yaw) and camera (pitch)
      rig.rotation.y = state.yaw;
      camera.rotation.x = state.pitch;

      // Joystick movement (non‑VR)
      const jx = state.joystick.x;
      const jy = state.joystick.y;
      if (Math.abs(jx) > 0.05 || Math.abs(jy) > 0.05){
        const speed = 1.6;
        const forward = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), rig.rotation.y);
        const right = new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0), rig.rotation.y);
        const v = new THREE.Vector3();
        v.addScaledVector(forward, -jy);
        v.addScaledVector(right, jx);
        v.normalize();
        rig.position.addScaledVector(v, speed * dt);
      }
    }
  };
}

function getPoint(e){
  if (e.touches && e.touches.length){
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

function raycastFloor(e, camera, dom){
  const rect = dom.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
  const ray = new THREE.Raycaster();
  ray.setFromCamera({ x, y }, camera);
  // floor is at y=0
  const plane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
  const hit = new THREE.Vector3();
  const ok = ray.ray.intersectPlane(plane, hit);
  return ok ? hit : null;
}

function attachJoystick(state){
  const root = document.createElement('div');
  root.style.position = 'fixed';
  root.style.left = '12px';
  root.style.bottom = '72px';
  root.style.width = '140px';
  root.style.height = '140px';
  root.style.borderRadius = '999px';
  root.style.background = 'rgba(255,255,255,0.06)';
  root.style.border = '1px solid rgba(255,255,255,0.14)';
  root.style.backdropFilter = 'blur(8px)';
  root.style.zIndex = '9996';
  root.style.touchAction = 'none';

  const knob = document.createElement('div');
  knob.style.position = 'absolute';
  knob.style.left = '50%';
  knob.style.top = '50%';
  knob.style.width = '58px';
  knob.style.height = '58px';
  knob.style.transform = 'translate(-50%,-50%)';
  knob.style.borderRadius = '999px';
  knob.style.background = 'rgba(255,47,109,0.18)';
  knob.style.border = '1px solid rgba(255,47,109,0.55)';
  root.appendChild(knob);

  document.body.appendChild(root);

  const center = ()=>{
    const r = root.getBoundingClientRect();
    return { cx: r.left + r.width/2, cy: r.top + r.height/2, rad: r.width/2 };
  };

  const reset = ()=>{
    state.joystick.active = false;
    state.joystick.id = null;
    state.joystick.x = 0;
    state.joystick.y = 0;
    knob.style.transform = 'translate(-50%,-50%)';
  };

  root.addEventListener('pointerdown', (e)=>{
    root.setPointerCapture(e.pointerId);
    state.joystick.active = true;
    state.joystick.id = e.pointerId;
  });

  root.addEventListener('pointermove', (e)=>{
    if (!state.joystick.active || e.pointerId !== state.joystick.id) return;
    const { cx, cy, rad } = center();
    const dx = (e.clientX - cx);
    const dy = (e.clientY - cy);
    const m = Math.min(rad * 0.70, Math.hypot(dx,dy));
    const ang = Math.atan2(dy, dx);
    const kx = (Math.cos(ang) * m) / (rad * 0.70);
    const ky = (Math.sin(ang) * m) / (rad * 0.70);
    state.joystick.x = clamp(kx, -1, 1);
    state.joystick.y = clamp(ky, -1, 1);
    knob.style.transform = `translate(calc(-50% + ${Math.cos(ang)*m}px), calc(-50% + ${Math.sin(ang)*m}px))`;
  });

  root.addEventListener('pointerup', reset);
  root.addEventListener('pointercancel', reset);
}
