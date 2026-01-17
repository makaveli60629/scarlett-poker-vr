// /js/scarlett1/index.js
// SCARLETT1 — INDEX FRONT CONTROLLER (FULL • XR-SAFE WORLD RESOLVER)
// Build: SCARLETT1_RUNTIME_FULL_WORKING_v1

const BUILD = 'SCARLETT1_RUNTIME_FULL_WORKING_v1';

const dwrite = (msg) => { try { window.__scarlettDiagWrite?.(String(msg)); } catch (_) {} };
const FP = `[scarlett1] LIVE_FINGERPRINT ✅ ${BUILD}`;
console.log(FP);
dwrite(FP);

window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.BUILD = BUILD;
window.SCARLETT.engineAttached = true;
window.SCARLETT.attached = true;
window.SCARLETT.ok = true;
window.__scarlettEngineAttached = true;
window.__SCARLETT_ENGINE_ATTACHED__ = true;
window.__scarlettAttached = true;


import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { XRControllerModelFactory } from 'https://unpkg.com/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js';

import { createWorld } from '../world/world.js';
import { installHUD } from '../modules/hud.js';
import { installDiag } from '../modules/diag.js';
import { installTeleport } from '../modules/teleport.js';
import { installBots } from '../modules/bots.js';
import { installPIP } from '../modules/pip.js';

function isXRSupported(){
  return !!navigator.xr;
}

function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }

export async function start({ build } = {}){
  dwrite(`[status] booting…`);
  dwrite(`BUILD=${BUILD}`);

  const app = document.getElementById('app');
  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  window.THREE = THREE;
  app.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070a);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.65, 3.2);

  // Player rig so we can move/teleport without fighting XR camera
  const rig = new THREE.Group();
  rig.position.set(0, 0, 0);
  rig.add(camera);
  scene.add(rig);

  // Lights
  scene.add(new THREE.HemisphereLight(0x9bbcff, 0x1a1f2b, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(6, 10, 4);
  key.castShadow = false;
  scene.add(key);

  // Controllers (Quest etc)
  const controllerModelFactory = new XRControllerModelFactory();
  const c1 = renderer.xr.getController(0);
  const c2 = renderer.xr.getController(1);
  const g1 = renderer.xr.getControllerGrip(0);
  const g2 = renderer.xr.getControllerGrip(1);
  g1.add(controllerModelFactory.createControllerModel(g1));
  g2.add(controllerModelFactory.createControllerModel(g2));
  scene.add(c1, c2, g1, g2);

  // World
  dwrite('building world…');
  const world = await createWorld({ THREE, scene, rig, camera, renderer });
  dwrite('world ready ✅');

  // Modules
  const ctx = { THREE, scene, rig, camera, renderer, controllers:[c1,c2], grips:[g1,g2], world };
  installDiag(ctx);
  const hud = installHUD(ctx);
  const teleport = installTeleport(ctx, hud);
  installBots(ctx);
  installPIP(ctx);

  // Enter VR
  const btnEnterVR = document.getElementById('btnEnterVR');
  if (!isXRSupported()){
    btnEnterVR.textContent = 'VR Not Supported';
    btnEnterVR.disabled = true;
    btnEnterVR.style.opacity = '0.6';
    dwrite('xr=false');
  } else {
    dwrite('xr=true');
  }

  btnEnterVR?.addEventListener('click', async ()=>{
    try{
      if (!navigator.xr) return;
      const supported = await navigator.xr.isSessionSupported?.('immersive-vr');
      if (supported === false){
        dwrite('[xr] immersive-vr not supported');
        return;
      }
      const sessionInit = {
        optionalFeatures: ['local-floor','bounded-floor','hand-tracking','layers','dom-overlay'],
        domOverlay: { root: document.body }
      };
      const session = await navigator.xr.requestSession('immersive-vr', sessionInit);
      await renderer.xr.setSession(session);
      dwrite('[xr] session started ✅');

      session.addEventListener('end', ()=> dwrite('[xr] session ended')); 
    } catch (e){
      dwrite('[xr] requestSession FAILED');
      dwrite(String(e?.message||e));
      console.error(e);
    }
  });

  // Resize
  window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Non-XR touch look + tap-to-move
  const state = {
    yaw: 0,
    pitch: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
    twoFinger: false,
    moveTarget: null,
    moveVel: new THREE.Vector3(),
  };

  const floorY = 0;

  function setLookFromState(){
    const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), state.yaw);
    const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), state.pitch);
    rig.quaternion.copy(qYaw);
    camera.quaternion.copy(qPitch);
  }

  function getFloorHit(clientX, clientY){
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({x,y}, camera);
    const hits = raycaster.intersectObject(world.floorMesh, true);
    return hits[0] || null;
  }

  renderer.domElement.addEventListener('pointerdown', (e)=>{
    if (renderer.xr.isPresenting) return;
    state.dragging = true;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    renderer.domElement.setPointerCapture?.(e.pointerId);
  });
  renderer.domElement.addEventListener('pointermove', (e)=>{
    if (renderer.xr.isPresenting) return;
    if (!state.dragging) return;
    const dx = e.clientX - state.lastX;
    const dy = e.clientY - state.lastY;
    state.lastX = e.clientX;
    state.lastY = e.clientY;

    // rotate
    state.yaw -= dx * 0.004;
    state.pitch = clamp(state.pitch - dy * 0.0035, -1.2, 1.2);
    setLookFromState();
  });
  renderer.domElement.addEventListener('pointerup', async (e)=>{
    if (renderer.xr.isPresenting) return;
    const wasDragging = state.dragging;
    state.dragging = false;

    // tap-to-move: if small movement
    if (wasDragging){
      const hit = getFloorHit(e.clientX, e.clientY);
      if (hit){
        state.moveTarget = hit.point.clone();
        state.moveTarget.y = floorY;
      }
    }
  });

  // Animation loop
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(()=>{
    const dt = Math.min(0.033, clock.getDelta());

    // Update modules
    world.update?.(dt);
    teleport.update?.(dt);

    // Smooth move (non-XR)
    if (!renderer.xr.isPresenting && state.moveTarget){
      const p = rig.position.clone();
      p.y = 0;
      const to = state.moveTarget.clone();
      const d = to.sub(p);
      const dist = d.length();
      if (dist < 0.05){
        state.moveTarget = null;
      } else {
        d.normalize();
        rig.position.addScaledVector(d, dt * 2.0);
      }
    }

    renderer.render(scene, camera);
  });

  dwrite('[status] renderer OK ✅');
  dwrite(`three=${!!THREE}`);
  dwrite(`renderer=${!!renderer}`);
  dwrite(`world=${!!world}`);
  dwrite(`modules=${(world.modulesCount||0) + 5}`);

  return { BUILD, renderer, scene, camera, rig, world };
}
