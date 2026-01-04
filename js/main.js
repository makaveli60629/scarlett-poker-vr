import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js';

const CFG = {
  spawn: new THREE.Vector3(0, 0, 8),  // SAFE: away from table
  roomHalf: 18,
  wallH: 7,
  playerRadius: 0.30,
  speed: 2.2
};

function $(id){ return document.getElementById(id); }
function logLine(t){
  const el = $('log');
  if(!el) return;
  el.innerHTML = `${t}<br>` + el.innerHTML;
}
function setStatus(t){
  const el = $('status');
  if(el) el.textContent = `Status: ${t}`;
}

window.addEventListener('error', (e)=>{
  logLine(`❌ ERROR: ${e.message}`);
  if(e.error?.stack) logLine(e.error.stack);
});
window.addEventListener('unhandledrejection', (e)=>{
  logLine(`❌ PROMISE: ${e.reason?.message || e.reason}`);
  if(e.reason?.stack) logLine(e.reason.stack);
});

function bindJoystick(){
  const joy = $('joy'), nub = $('nub');
  const vec = {x:0,y:0};
  if(!joy || !nub) return vec;

  let active=false, cx=0, cy=0;
  const R=42;
  const setN=(dx,dy)=> nub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

  joy.addEventListener('pointerdown',(e)=>{active=true; cx=e.clientX; cy=e.clientY;},{passive:true});
  window.addEventListener('pointermove',(e)=>{
    if(!active) return;
    const dx=e.clientX-cx, dy=e.clientY-cy;
    const len=Math.hypot(dx,dy);
    const cl=Math.min(len,R);
    const nx=len?dx/len:0, ny=len?dy/len:0;
    const px=nx*cl, py=ny*cl;
    setN(px,py);
    vec.x=px/R; vec.y=py/R;
  },{passive:true});
  window.addEventListener('pointerup',()=>{active=false; vec.x=0; vec.y=0; setN(0,0);},{passive:true});
  return vec;
}

class Colliders {
  constructor(){ this.boxes=[]; }
  addBox(obj, pad=0){
    obj.updateWorldMatrix(true,true);
    const b = new THREE.Box3().setFromObject(obj);
    if(pad) b.expandByScalar(pad);
    this.boxes.push(b);
  }
  blocks(p, r){
    for(const b of this.boxes){
      if (p.x >= (b.min.x-r) && p.x <= (b.max.x+r) &&
          p.z >= (b.min.z-r) && p.z <= (b.max.z+r)) return true;
    }
    return false;
  }
  tryMove(cur, next, r){
    if(!this.blocks(next,r)) return next;
    const xOnly = new THREE.Vector3(next.x,next.y,cur.z);
    if(!this.blocks(xOnly,r)) return xOnly;
    const zOnly = new THREE.Vector3(cur.x,next.y,next.z);
    if(!this.blocks(zOnly,r)) return zOnly;
    return cur;
  }
}

(async function main(){
  setStatus('starting…');
  logLine('✅ main.js running (module loaded)');

  // Renderer
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // VR Button (will show ONLY if WebXR supported + HTTPS)
  document.body.appendChild(VRButton.createButton(renderer));
  setTimeout(()=>{
    const b = document.getElementById('VRButton');
    if(b){
      b.style.top='12px'; b.style.right='12px';
      b.style.left='auto'; b.style.bottom='auto';
      b.style.zIndex='10000';
      logLine('✅ VRButton injected');
    } else {
      logLine('⚠️ VRButton not found (WebXR may be unsupported in this browser)');
    }
  }, 50);

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060c);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 200);

  // Player rig
  const rig = new THREE.Group();
  rig.position.copy(CFG.spawn);
  camera.position.set(0, 1.6, 0);     // ALWAYS above floor
  rig.add(camera);
  scene.add(rig);

  // Lights (so it’s never black)
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(8, 12, 6);
  scene.add(dir);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80,80),
    new THREE.MeshStandardMaterial({color:0x111827, roughness:0.95})
  );
  floor.rotation.x = -Math.PI/2;
  scene.add(floor);

  // Walls (solid)
  const walls = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({color:0x1b2440, roughness:0.95});
  const mkWall=(sx,sy,sz,x,y,z)=>{
    const w = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), wallMat);
    w.position.set(x,y,z);
    walls.add(w);
  };
  mkWall(44, CFG.wallH, 0.7, 0, CFG.wallH/2, -CFG.roomHalf);
  mkWall(44, CFG.wallH, 0.7, 0, CFG.wallH/2,  CFG.roomHalf);
  mkWall(0.7, CFG.wallH, 44, -CFG.roomHalf, CFG.wallH/2, 0);
  mkWall(0.7, CFG.wallH, 44,  CFG.roomHalf, CFG.wallH/2, 0);
  scene.add(walls);

  // A very obvious “table” placeholder so you can confirm you’re in the right place
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2,2.2,0.18, 40),
    new THREE.MeshStandardMaterial({color:0x0b5f3c, roughness:0.85})
  );
  table.position.set(0, 1.0, 0);
  scene.add(table);

  // Colliders so you don’t spawn inside objects
  const colliders = new Colliders();
  colliders.addBox(walls, 0);
  colliders.addBox(table, 0.2);

  // Mobile movement joystick
  const joy = bindJoystick();

  // UI buttons
  if($('btnReset')) $('btnReset').onclick = ()=>{
    rig.position.copy(CFG.spawn);
    rig.rotation.set(0,0,0);
    logLine('🔄 Reset position');
  };
  if($('btnAudio')) $('btnAudio').onclick = ()=>{
    logLine('🎵 Audio toggle (hook this into your music later)');
  };
  if($('btnMenu')) $('btnMenu').onclick = ()=>{
    logLine('⌚ Menu toggle (hook this into wrist menu later)');
  };

  // XR session events
  renderer.xr.addEventListener('sessionstart', ()=>{
    logLine('✅ XR session started');
    renderer.setPixelRatio(1); // Quest stability
  });
  renderer.xr.addEventListener('sessionend', ()=>{
    logLine('ℹ️ XR session ended');
  });

  setStatus('running (you should see a green table)');

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(()=>{
    const dt = clock.getDelta();

    // Move with joystick (Android) so you can test without keys
    const f = (-joy.y);
    const s = (joy.x);

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).normalize();

    const desired = rig.position.clone()
      .addScaledVector(forward, f*CFG.speed*dt)
      .addScaledVector(right,   s*CFG.speed*dt);

    rig.position.copy(colliders.tryMove(rig.position, desired, CFG.playerRadius));

    renderer.render(scene, camera);
  });

  window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, {passive:true});

  logLine('✅ If VRButton says "ENTER VR", tap it on Quest browser.');
  logLine('If VRButton says "VR NOT SUPPORTED", you must open on Quest Browser (not some embedded browser).');
})();
