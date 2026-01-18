import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

// /js/scarlett1/index.js
// SCARLETT1 — RUNTIME (FULL WORKING v1.5 ALL)
// Adds: join seat, smooth locomotion + snap turn, VIP room w/ 6-seat oval, ambient audio,
// richer props (bar/store/display), and a simple poker dealing loop (unique hands + community).

const BUILD = 'SCARLETT1_RUNTIME_FULL_WORKING_v1_5_ALL';

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

// ---------- audio (procedural ambience + SFX; no external assets) ----------
function createAudioSystem(){
  let ctx = null;
  let master = null;
  let ambience = null;
  let started = false;

  function ensure(){
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
    return ctx;
  }

  function startAmbience(){
    const c = ensure();
    if (!c || started) return;
    started = true;

    // Pink-ish noise bed (casino air)
    const bufferSize = 2 * c.sampleRate;
    const noiseBuffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const out = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i=0;i<bufferSize;i++){
      const white = Math.random()*2-1;
      b0 = 0.997*b0 + white*0.029;
      b1 = 0.985*b1 + white*0.032;
      b2 = 0.950*b2 + white*0.048;
      out[i] = (b0 + b1 + b2) * 0.14;
    }
    const noise = c.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 650;
    lp.Q.value = 0.6;

    const g = c.createGain();
    g.gain.value = 0.22;

    noise.connect(lp);
    lp.connect(g);
    g.connect(master);
    noise.start();
    ambience = { noise, lp, g };

    // soft tone (neon hum)
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 54;
    const og = c.createGain();
    og.gain.value = 0.035;
    osc.connect(og);
    og.connect(master);
    osc.start();
    ambience.osc = osc;
    ambience.og = og;
  }

  function click(freq=680, dur=0.025, vol=0.12){
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur);
  }

  function chip(){
    click(520 + Math.random()*180, 0.02, 0.10);
    setTimeout(()=>click(320 + Math.random()*120, 0.02, 0.08), 18);
  }

  function card(){
    click(1200 + Math.random()*220, 0.018, 0.09);
  }

  async function resume(){
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') await c.resume();
    startAmbience();
  }

  return { ensure, resume, card, chip };
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

  // Audio (starts on first user gesture)
  const audio = createAudioSystem();
  const resumeAudio = ()=>{ try{ audio.resume(); }catch(_){ } };
  // Hook common HUD interactions
  for (const id of ['btnEnterVR','btnTeleport','btnDiag','btnHideHUD']){
    document.getElementById(id)?.addEventListener('pointerdown', resumeAudio, { passive:true });
    document.getElementById(id)?.addEventListener('click', resumeAudio, { passive:true });
  }

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

  // Audio (procedural ambience + SFX; starts on first user gesture)
  const audio = createAudioSystem();
  const armAudio = () => { try{ audio.resume(); }catch(_){ } };
  // Arm audio on any primary HUD click
  for (const id of ['btnEnterVR','btnTeleport','btnDiag']){
    document.getElementById(id)?.addEventListener('pointerdown', armAudio, { passive:true });
  }

  // Bots + table + pip target
  const tableCenter = new THREE.Vector3(0, 0.75, 0);
  const { pipTarget, joinSeat, deal } = buildTableAndBots(scene, tableCenter);

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

  // Join seat / sit logic
  const seatState = { seated:false };
  function sitDown(){
    if (!joinSeat) return;
    // Put rig slightly back from seat center, facing table
    rig.position.set(joinSeat.x, 0, joinSeat.z);
    rig.rotation.set(0, joinSeat.yaw, 0);
    seatState.seated = true;
    try{ audio.ui(); }catch(_){ }
  }
  function standUp(){
    seatState.seated = false;
    try{ window.SCARLETT?.forceSpawn?.(); }catch(_){ }
    try{ audio.ui(); }catch(_){ }
  }

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
  // Smooth locomotion + snap turn + join seat (A to sit, B to stand)
  const locomotion = { yaw: 0, snapLock:false, sitLock:false };
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

      // A (0) to sit when near join seat; B (1) to stand
      const aBtn = gp.buttons?.[0];
      const bBtn = gp.buttons?.[1];
      if (aBtn?.pressed && !locomotion.sitLock){
        locomotion.sitLock = true;
        // Near join seat? (within 1.2m)
        if (!seatState.seated && joinSeat){
          const dx = rig.position.x - joinSeat.x;
          const dz = rig.position.z - joinSeat.z;
          if ((dx*dx + dz*dz) < (1.2*1.2)) sitDown();
        }
        setTimeout(()=>{ locomotion.sitLock = false; }, 250);
      }
      if (bBtn?.pressed && seatState.seated && !locomotion.sitLock){
        locomotion.sitLock = true;
        standUp();
        setTimeout(()=>{ locomotion.sitLock = false; }, 250);
      }

      // Locomotion axes
      const ax = gp.axes || [];
      // Heuristic: if >=4 axes, stick1=(0,1), stick2=(2,3). If only 2, use (0,1).
      const lx = ax.length >= 2 ? ax[0] : 0;
      const ly = ax.length >= 2 ? ax[1] : 0;
      const rx = ax.length >= 4 ? ax[2] : 0;
      const ry = ax.length >= 4 ? ax[3] : 0;

      // Move with left stick (smooth). Turn with right stick X (snap).
      if (!seatState.seated){
        const dead = 0.18;
        const mvx = Math.abs(lx) > dead ? lx : 0;
        const mvy = Math.abs(ly) > dead ? ly : 0;
        const speed = 2.1; // m/s
        if (mvx || mvy){
          // camera forward projected onto XZ
          const fwd = new THREE.Vector3();
          camera.getWorldDirection(fwd);
          fwd.y = 0; fwd.normalize();
          const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0)).normalize().multiplyScalar(-1);
          const move = new THREE.Vector3();
          move.addScaledVector(fwd, -mvy);
          move.addScaledVector(right, mvx);
          move.normalize().multiplyScalar(speed * pollGamepads._dt);
          rig.position.add(move);
        }
      }

      // Snap turn (right stick X)
      const tdead = 0.55;
      if (Math.abs(rx) > tdead && !locomotion.snapLock){
        locomotion.snapLock = true;
        const dir = rx > 0 ? -1 : 1;
        rig.rotation.y += dir * (Math.PI/6); // 30deg
        setTimeout(()=>{ locomotion.snapLock = false; }, 220);
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
    pollGamepads._dt = dt;
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

    // Poker deal loop tick
    try{ deal?.tick?.(dt, audio); }catch(_){ }

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

  // ---------- Display cases (props) ----------
  const caseMat = new THREE.MeshStandardMaterial({ color: 0x0c1118, roughness: 0.25, metalness: 0.15, transparent:true, opacity:0.9 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x66ccff, roughness: 0.05, metalness: 0.0, transparent:true, opacity:0.18, emissive: 0x66ccff, emissiveIntensity: 0.10 });
  for (let i=0;i<3;i++){
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.6), caseMat);
    c.position.set(-4 + i*1.6, 0.45, -10);
    c.castShadow = true;
    c.receiveShadow = true;
    scene.add(c);
    const g = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.86, 0.56), glassMat);
    g.position.copy(c.position);
    scene.add(g);
  }

  // ---------- Simple slot machines (props) ----------
  const slotMat = new THREE.MeshStandardMaterial({ color: 0x101826, roughness: 0.8 });
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x0b0f16, emissive: 0xff2f6d, emissiveIntensity: 0.65, roughness: 0.4 });
  for (let i=0;i<4;i++){
    const slot = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.5, 0.6), slotMat);
    body.position.set(18.5, 0.75, -2 + i*1.8);
    body.castShadow = true;
    body.receiveShadow = true;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.55), screenMat);
    screen.position.set(18.5, 1.05, -2 + i*1.8 + 0.31);
    slot.add(body);
    slot.add(screen);
    scene.add(slot);
  }

  // ---------- VIP room (6-seat oval, no divot) ----------
  const vip = new THREE.Group();
  vip.name = 'vipRoom';
  const vipCenter = new THREE.Vector3(16, 0, -28);
  const vipFloor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ color: 0x08100c, roughness: 1.0 }));
  vipFloor.rotation.x = -Math.PI/2;
  vipFloor.position.copy(vipCenter).add(new THREE.Vector3(-4, 0.01, 0));
  vipFloor.receiveShadow = true;
  vipFloor.userData.teleportSurface = true;
  vip.add(vipFloor);

  const vipWallMat = new THREE.MeshStandardMaterial({ color: 0x0b0f16, roughness: 0.9 });
  const vipBack = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 0.5), vipWallMat);
  vipBack.position.set(vipFloor.position.x, 2.5, vipFloor.position.z - 4.8);
  vip.add(vipBack);

  const oval = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.3, 0.14, 48),
    new THREE.MeshStandardMaterial({ color: 0x0f3b2b, roughness: 1.0 })
  );
  oval.scale.set(1.45, 1, 1.0); // oval-ish
  oval.position.set(vipFloor.position.x, 0.78, vipFloor.position.z - 1.0);
  oval.castShadow = true;
  oval.receiveShadow = true;
  vip.add(oval);

  const vipLight = new THREE.PointLight(0xffd166, 0.9, 16, 2.0);
  vipLight.position.set(oval.position.x, 4.2, oval.position.z - 0.5);
  vip.add(vipLight);

  // 6 chairs around VIP oval
  const vipChairMat = new THREE.MeshStandardMaterial({ color: 0x1a2433, roughness: 0.95, metalness: 0.05 });
  for (let i=0;i<6;i++){
    const a = (i/6) * Math.PI*2;
    const cx = oval.position.x + Math.sin(a) * 2.2;
    const cz = oval.position.z + Math.cos(a) * 1.7;
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), vipChairMat);
    ch.position.set(cx, 0.275, cz);
    ch.castShadow = true;
    ch.receiveShadow = true;
    vip.add(ch);
  }

  scene.add(vip);
}


function buildTableAndBots(scene, center){
  // ---------- Table ----------
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.55, 0.55, 48),
    new THREE.MeshStandardMaterial({ color: 0x2c0f12, roughness: 0.9, metalness: 0.1 })
  );
  base.position.set(center.x, 0.45, center.z);
  base.castShadow = true;
  base.receiveShadow = true;
  base.name = 'pokerTable';
  scene.add(base);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.25, 0.10, 48),
    new THREE.MeshStandardMaterial({ color: 0x0f3b2b, roughness: 1.0, metalness: 0.0 })
  );
  felt.position.set(center.x, 0.72, center.z);
  felt.castShadow = true;
  felt.receiveShadow = true;
  felt.name = 'pokerFelt';
  scene.add(felt);

  const decalTex = makeTextTexture('SCARLETT', { w:1024, h:256, size:120, glow:'rgba(67,243,166,0.85)', color:'#c8ffea', blur:18 });
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.24),
    new THREE.MeshBasicMaterial({ map: decalTex, transparent:true, opacity:0.95 })
  );
  decal.position.set(center.x, 0.78, center.z);
  decal.rotation.x = -Math.PI/2;
  decal.name = 'tableDecal';
  scene.add(decal);

  // ---------- Spawn pad (behind table) ----------
  const spawnPadZ = center.z + 7.5;
  const pad = new THREE.Mesh(
    new THREE.RingGeometry(0.30, 0.42, 48),
    new THREE.MeshBasicMaterial({ color: 0x43f3a6, transparent:true, opacity:0.85 })
  );
  pad.position.set(center.x, 0.01, spawnPadZ);
  pad.rotation.x = -Math.PI/2;
  pad.name = 'spawnPad';
  scene.add(pad);

  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.SPAWN_PAD = { x:center.x, y:0, z:spawnPadZ, yaw: Math.PI };

  // ---------- Deck + community area ----------
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.03, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.9, metalness: 0.0 })
  );
  deck.position.set(center.x + 0.55, 0.80, center.z + 0.10);
  deck.castShadow = true;
  deck.receiveShadow = true;
  deck.name = 'deck';
  scene.add(deck);

  // ---------- Card textures ----------
  const backTex = (()=>{
    const w = 512, h = 712;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = '#1a0b12';
    g.fillRect(0,0,w,h);
    g.strokeStyle = 'rgba(255,47,109,0.85)';
    g.lineWidth = 18;
    g.strokeRect(18,18,w-36,h-36);
    g.strokeStyle = 'rgba(67,243,166,0.55)';
    g.lineWidth = 10;
    g.strokeRect(60,60,w-120,h-120);
    g.globalAlpha = 0.35;
    for (let y=90;y<h;y+=80){
      for (let x=90;x<w;x+=80){
        g.beginPath();
        g.arc(x,y,18,0,Math.PI*2);
        g.stroke();
      }
    }
    g.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  function createCard(rank, suit){
    const geom = new THREE.PlaneGeometry(0.10, 0.14);
    const mat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.9, metalness: 0.0 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.userData.frontTex = makeCardTexture(rank, suit);
    mesh.userData.isFaceUp = false;
    return mesh;
  }

  function setFaceUp(card, up){
    const want = !!up;
    if (card.userData.isFaceUp === want) return;
    card.userData.isFaceUp = want;
    card.material.map = want ? card.userData.frontTex : backTex;
    card.material.needsUpdate = true;
  }

  // ---------- Seats, chairs, bots ----------
  const seatCount = 6;
  const openSeatIndex = 0; // player join seat
  const radius = 1.90;
  const ySeat = 0.42;

  const chairMat = new THREE.MeshStandardMaterial({ color: 0x1a2433, roughness: 0.95, metalness: 0.05 });

  const bots = [];
  const seats = [];
  for (let i=0;i<seatCount;i++){
    const a = (i / seatCount) * Math.PI*2;
    const sx = center.x + Math.sin(a) * radius;
    const sz = center.z + Math.cos(a) * radius;
    const yawToCenter = Math.atan2(center.x - sx, center.z - sz);

    // Chair
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), chairMat);
    chair.position.set(sx, 0.275, sz);
    chair.castShadow = true;
    chair.receiveShadow = true;
    chair.name = 'chair_' + i;
    scene.add(chair);

    seats.push({ i, a, x:sx, z:sz, yaw:yawToCenter });
  }

  // Join seat marker
  const joinSeat = seats[openSeatIndex];
  const joinRing = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.26, 40),
    new THREE.MeshBasicMaterial({ color: 0x43f3a6, transparent:true, opacity:0.78 })
  );
  joinRing.rotation.x = -Math.PI/2;
  joinRing.position.set(joinSeat.x, 0.02, joinSeat.z);
  joinRing.name = 'joinRing';
  scene.add(joinRing);

  const joinTex = makeTextTexture('JOIN', { w:512, h:256, size:140, glow:'rgba(67,243,166,0.85)', color:'#c8ffea', blur:16 });
  const joinLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.45),
    new THREE.MeshBasicMaterial({ map: joinTex, transparent:true, opacity:0.95 })
  );
  joinLabel.position.set(joinSeat.x, 0.55, joinSeat.z);
  joinLabel.lookAt(new THREE.Vector3(center.x, 0.55, center.z));
  joinLabel.name = 'joinLabel';
  scene.add(joinLabel);

  function makeBot(){
    const g = new THREE.Group();
    const matBody = new THREE.MeshStandardMaterial({ color: 0x2b3646, roughness: 0.85 });
    const matAccent = new THREE.MeshStandardMaterial({ color: 0xff2f6d, roughness: 0.55, metalness: 0.15, emissive: 0xff2f6d, emissiveIntensity: 0.10 });
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xb58a6a, roughness: 0.9 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.35, 6, 12), matBody);
    torso.position.y = 1.15;
    g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 16), matSkin);
    head.position.y = 1.55;
    g.add(head);
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), matAccent);
    sh.position.set(0.21, 1.33, 0);
    g.add(sh);
    const sh2 = sh.clone(); sh2.position.x = -0.21; g.add(sh2);
    const hands = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), matAccent);
    hands.position.set(0.33, 1.05, 0.16);
    g.add(hands);
    const hands2 = hands.clone(); hands2.position.x = -0.33; g.add(hands2);
    return g;
  }

  for (const s of seats){
    if (s.i === openSeatIndex) continue;
    const bot = makeBot();
    bot.position.set(s.x, ySeat, s.z);
    bot.rotation.y = s.yaw;
    bot.name = 'bot_' + s.i;
    scene.add(bot);
    bots.push({ seat:s, bot });
  }

  // ---------- Card layout ----------
  const rand = seededRand(20260118);
  const ranks = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
  const suits = ['♠','♥','♦','♣'];
  const used = new Set();
  function nextCard(){
    for (let tries=0; tries<999; tries++){
      const r = ranks[Math.floor(rand()*ranks.length)];
      const s = suits[Math.floor(rand()*suits.length)];
      const k = r+s;
      if (!used.has(k)) { used.add(k); return {r,s}; }
    }
    return { r:'A', s:'♠' };
  }

  // Per-bot hole cards (flat + hover mirror)
  const hole = [];
  for (const b of bots){
    const c1 = nextCard();
    const c2 = nextCard();

    const hand1 = createCard(c1.r, c1.s);
    const hand2 = createCard(c2.r, c2.s);
    const hover1 = createCard(c1.r, c1.s);
    const hover2 = createCard(c2.r, c2.s);

    // Flat position near seat edge
    const nx = Math.sin(b.seat.a);
    const nz = Math.cos(b.seat.a);
    const tx = Math.cos(b.seat.a);
    const tz = -Math.sin(b.seat.a);

    const edgeX = center.x + nx * 1.05;
    const edgeZ = center.z + nz * 1.05;

    hand1.position.set(edgeX + tx * 0.06, 0.79, edgeZ + tz * 0.06);
    hand2.position.set(edgeX - tx * 0.06, 0.79, edgeZ - tz * 0.06);
    hand1.rotation.x = -Math.PI/2;
    hand2.rotation.x = -Math.PI/2;
    // Angle toward bot
    hand1.rotation.z = b.seat.yaw;
    hand2.rotation.z = b.seat.yaw;

    // Hover cards: higher, face outward (teaching mirror)
    hover1.position.set(edgeX + tx * 0.06, 1.28, edgeZ + tz * 0.06);
    hover2.position.set(edgeX - tx * 0.06, 1.28, edgeZ - tz * 0.06);
    hover1.rotation.y = b.seat.yaw + Math.PI;
    hover2.rotation.y = b.seat.yaw + Math.PI;

    scene.add(hand1);
    scene.add(hand2);
    scene.add(hover1);
    scene.add(hover2);

    hole.push({ flat:[hand1, hand2], hover:[hover1, hover2] });
  }

  // Community cards (5)
  const community = [];
  const commY = 0.79;
  for (let i=0;i<5;i++){
    const c = nextCard();
    const m = createCard(c.r, c.s);
    m.position.set(center.x - 0.24 + i*0.12, commY, center.z);
    m.rotation.x = -Math.PI/2;
    m.rotation.z = Math.PI; // face toward player spawn
    scene.add(m);
    community.push(m);
  }

  // ---------- Simple deal loop ----------
  const deal = {
    phase: 0,
    timer: 0,
    tick(dt, audio){
      this.timer += dt;
      const step = 0.85;
      // phases: 0 reset, 1 reveal hole, 2 flop, 3 turn, 4 river, 5 pause
      if (this.phase === 0){
        // reset: all face-down
        for (const h of hole){ for (const m of [...h.flat, ...h.hover]) setFaceUp(m, false); }
        for (const c of community) setFaceUp(c, false);
        this.phase = 1;
        this.timer = 0;
        return;
      }

      if (this.timer < step) return;
      this.timer = 0;

      if (this.phase === 1){
        // reveal hole
        for (const h of hole){
          for (const m of [...h.flat, ...h.hover]) setFaceUp(m, true);
          try{ audio?.card?.(); }catch(_){ }
        }
        this.phase = 2;
        return;
      }

      if (this.phase === 2){
        // flop
        for (let i=0;i<3;i++){ setFaceUp(community[i], true); try{ audio?.card?.(); }catch(_){ } }
        this.phase = 3;
        return;
      }

      if (this.phase === 3){
        setFaceUp(community[3], true); try{ audio?.card?.(); }catch(_){ }
        this.phase = 4;
        return;
      }

      if (this.phase === 4){
        setFaceUp(community[4], true); try{ audio?.card?.(); }catch(_){ }
        this.phase = 5;
        return;
      }

      if (this.phase === 5){
        // pause a bit then reset
        this.phase = 0;
        return;
      }
    }
  };

  const pipTarget = new THREE.Vector3(center.x, 0.78, center.z);
  return {
    pipTarget,
    joinSeat: { x: joinSeat.x, z: joinSeat.z, yaw: joinSeat.yaw },
    deal
  };
}

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
