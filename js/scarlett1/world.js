// /js/scarlett1/world.js — minimal proof world (renders on Android + Quest)
// Exports initWorld({ THREE, DIAG })

export async function initWorld({ THREE, DIAG }) {
  const D = DIAG || console;
  D.log('initWorld() start');

  const app = document.getElementById('app');
  if(!app) throw new Error('#app missing');

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  app.innerHTML = '';
  app.appendChild(renderer.domElement);

  // Scene + camera
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 2.5);

  // Light
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223355, 1.0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(3, 6, 2);
  scene.add(dir);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: 0x111824, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI/2;
  scene.add(floor);

  // “Table” marker
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 0.12, 48),
    new THREE.MeshStandardMaterial({ color: 0x0b2a22, roughness: 0.9, metalness: 0.05 })
  );
  table.position.set(0, 1.0, 0);
  scene.add(table);

  // Facing the table
  camera.lookAt(0, 1.0, 0);

  // Resize
  window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, {passive:true});

  // Simple Android touch look (1 finger)
  let yaw = 0, pitch = 0;
  let looking = false;
  let lastX = 0, lastY = 0;

  function applyLook(){
    pitch = Math.max(-1.2, Math.min(1.2, pitch));
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  }

  window.addEventListener('touchstart', (e)=>{
    if(e.touches.length === 1){
      looking = true;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    }
  }, {passive:true});

  window.addEventListener('touchmove', (e)=>{
    if(looking && e.touches.length === 1){
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const dx = x - lastX;
      const dy = y - lastY;
      lastX = x; lastY = y;
      yaw -= dx * 0.004;
      pitch -= dy * 0.004;
      applyLook();
    }
  }, {passive:true});

  window.addEventListener('touchend', ()=>{
    looking = false;
  }, {passive:true});

  // Render loop
  D.log('render loop start ✅');
  function tick(t){
    // rotate table slightly so we know it’s live
    table.rotation.y = t * 0.0004;
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
