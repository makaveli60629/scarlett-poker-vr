import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { buildWorld } from './world.js';
import { createDiag } from './diag.js';
import { createTouchStick } from './touch.js';
import { StoreCatalog } from './store/catalog.js';
import { PlayerProfile } from './store/profile.js';
import { StoreUI } from './store/ui.js';

const BUILD = 'SCARLETT_UPDATE_1_1_STORE_READY';
const t0 = performance.now();

const ui = {
  enterVR: document.getElementById('btnEnterVR'),
  teleport: document.getElementById('btnTeleport'),
  reset: document.getElementById('btnReset'),
  sit: document.getElementById('btnSit'),
  diag: document.getElementById('btnDiag'),
  deal: document.getElementById('btnDeal'),
  scorpion: document.getElementById('btnScorpion'),
  store: document.getElementById('btnStore'),
  hide: document.getElementById('btnHide'),
  coinCount: document.getElementById('coinCount'),
};

const diag = createDiag(BUILD);

// --- Renderer (black-screen hard fix) ---
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

renderer.domElement.style.position = 'fixed';
renderer.domElement.style.inset = '0';
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
renderer.domElement.style.zIndex = '0';
renderer.domElement.style.background = 'transparent';
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f1a);

// Camera + player rig
const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 2000);
const player = new THREE.Group();
player.name = 'PlayerRoot';
player.position.set(0, 0, 3);
player.add(camera);
camera.position.set(0, 1.65, 0);
scene.add(player);

// Light
scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.0));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(5, 10, 7);
scene.add(dir);

// Debug sanity helpers
const axes = new THREE.AxesHelper(2);
axes.position.set(0, 0.01, 0);
scene.add(axes);

// Store systems
const catalog = StoreCatalog.createDefault();
const profile = PlayerProfile.loadOrCreate();
ui.coinCount.textContent = String(profile.coins);

// Store UI (HTML overlay) + hooks
const storeUI = new StoreUI({
  catalog,
  profile,
  onProfileChanged: () => {
    ui.coinCount.textContent = String(profile.coins);
  }
});

// Build world + store kiosk
const world = buildWorld({ THREE, scene, player, camera, diag, catalog, profile, storeUI });

// Controls state
let teleportOn = true;
let seated = false;

const touch = createTouchStick({
  baseEl: document.getElementById('stickBase'),
  knobEl: document.getElementById('stickKnob'),
});

// Look control (drag anywhere not on joystick)
let looking = false;
let lastX = 0, lastY = 0;
let yaw = 0, pitch = 0;
const lookSpeed = 0.003;

function onPointerDown(e){
  const target = e.target;
  if (target && (target.id === 'stickBase' || target.id === 'stickKnob')) return;
  // if store panel open, don't capture drags
  if (storeUI.isOpen()) return;
  looking = true;
  lastX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
  lastY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;
}
function onPointerMove(e){
  if (!looking) return;
  const x = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? lastX;
  const y = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? lastY;
  const dx = x - lastX;
  const dy = y - lastY;
  lastX = x; lastY = y;
  yaw -= dx * lookSpeed;
  pitch -= dy * lookSpeed;
  pitch = Math.max(-1.2, Math.min(1.2, pitch));
}
function onPointerUp(){ looking = false; }

window.addEventListener('pointerdown', onPointerDown, { passive:true });
window.addEventListener('pointermove', onPointerMove, { passive:true });
window.addEventListener('pointerup', onPointerUp, { passive:true });
window.addEventListener('touchstart', onPointerDown, { passive:true });
window.addEventListener('touchmove', onPointerMove, { passive:true });
window.addEventListener('touchend', onPointerUp, { passive:true });

// Keyboard for desktop debug
const keys = new Set();
window.addEventListener('keydown', (e)=>keys.add(e.key.toLowerCase()));
window.addEventListener('keyup', (e)=>keys.delete(e.key.toLowerCase()));

function setTeleport(on){
  teleportOn = !!on;
  ui.teleport.textContent = `Teleport: ${teleportOn ? 'ON' : 'OFF'}`;
}
function setSeated(on){
  seated = !!on;
  camera.position.y = seated ? 1.15 : 1.65;
  ui.sit.textContent = seated ? 'Stand' : 'Sit/Stand';
}
function resetToSpawn(){
  player.position.set(0, 0, 3);
  yaw = 0; pitch = 0;
}
ui.hide.addEventListener('click', ()=>{
  const hud = document.getElementById('hud');
  const hidden = hud.style.display === 'none';
  hud.style.display = hidden ? '' : 'none';
});

ui.teleport.addEventListener('click', ()=> setTeleport(!teleportOn));
ui.reset.addEventListener('click', resetToSpawn);
ui.sit.addEventListener('click', ()=> setSeated(!seated));
ui.diag.addEventListener('click', ()=> diag.toggle());
ui.deal.addEventListener('click', ()=> world.demoDeal());
ui.scorpion.addEventListener('click', ()=> world.gotoScorpion());
ui.store.addEventListener('click', ()=> {
  storeUI.open();
  diag.log('[store] opened store overlay (mobile/desktop)');
});

// Enter VR
let vrButtonAttached = false;
function ensureVRButton(){
  if (vrButtonAttached) return;
  try{
    const b = VRButton.createButton(renderer);
    b.style.position = 'fixed';
    b.style.left = '-9999px';
    document.body.appendChild(b);
    vrButtonAttached = true;
  }catch(err){
    diag.log(`[xr] VRButton failed: ${err?.message || err}`);
  }
}
ensureVRButton();

ui.enterVR.addEventListener('click', async ()=>{
  if (!navigator.xr){
    diag.log('[xr] navigator.xr not available (non-XR browser)');
    diag.open();
    return;
  }
  try{
    const supported = await navigator.xr.isSessionSupported('immersive-vr');
    diag.log(`[xr] immersive-vr supported=${supported}`);
    if (!supported){ diag.open(); return; }
    const session = await navigator.xr.requestSession('immersive-vr', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['bounded-floor','hand-tracking','layers']
    });
    renderer.xr.setSession(session);
    diag.log('[xr] session started ✅');
  }catch(err){
    diag.log(`[xr] requestSession error: ${err?.message || err}`);
    diag.open();
  }
});

// Resize
window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
const clock = new THREE.Clock();

function step(){
  const dt = Math.min(clock.getDelta(), 0.05);

  // Apply look
  player.rotation.y = yaw;
  camera.rotation.x = pitch;

  // Movement
  let mx = 0, mz = 0;
  mx += touch.x;
  mz += touch.y;

  if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
  if (keys.has('d') || keys.has('arrowright')) mx += 1;
  if (keys.has('w') || keys.has('arrowup')) mz -= 1;
  if (keys.has('s') || keys.has('arrowdown')) mz += 1;

  const speed = seated ? 0.0 : 2.2;
  if (speed > 0){
    const v = new THREE.Vector3(mx, 0, mz);
    if (v.lengthSq() > 0.001){
      v.normalize().multiplyScalar(speed * dt);
      const fwd = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
      const right = new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
      player.position.addScaledVector(right, v.x);
      player.position.addScaledVector(fwd, -v.z);
    }
  }

  world.update(dt);

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(step);

// Initial diag snapshot
diag.setMeta({
  href: location.href,
  secureContext: window.isSecureContext,
  ua: navigator.userAgent,
  touch: ('ontouchstart' in window),
  xr: !!navigator.xr,
});
diag.log(`[0.000] booting… BUILD=${BUILD}`);
diag.log(`[${((performance.now()-t0)/1000).toFixed(3)}] renderer attached ✅`);
diag.log(`[${((performance.now()-t0)/1000).toFixed(3)}] world built ✅`);
diag.log(`[store] catalog items=${catalog.items.length} | coins=${profile.coins}`);
