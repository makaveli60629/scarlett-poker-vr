// /js/scarlett1/world.js — Scarlett 1.0 World (Core)
// Minimal stable world: floor, lights, placeholder poker table, rig, camera.
// Exposes: createWorld({THREE, diag}) => { renderer, scene, camera, rig, clock, setRigPose, add, update }

export async function createWorld({ THREE, diag }) {
  const app = document.getElementById("app") || document.body;

  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  app.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 400);
  camera.position.set(0, 1.6, 3.2);

  // Rig lets us move camera + controllers together
  const rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.position.set(0, 0, 0);
  rig.add(camera);
  scene.add(rig);

  // Lights
  const hemi = new THREE.HemisphereLight(0x99bbff, 0x101018, 0.9);
  hemi.position.set(0, 10, 0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 2);
  dir.castShadow = false;
  scene.add(dir);

  // Floor
  const floorGeo = new THREE.PlaneGeometry(80, 80);
  const floorMat = new THREE.MeshStandardMaterial({ color:0x10121a, roughness:1, metalness:0 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI/2;
  floor.position.y = 0;
  floor.name = "Floor";
  scene.add(floor);

  // Center marker circle
  const circleGeo = new THREE.RingGeometry(0.95, 1.05, 48);
  const circleMat = new THREE.MeshBasicMaterial({ color:0x2b5bff, transparent:true, opacity:0.6, side:THREE.DoubleSide });
  const circle = new THREE.Mesh(circleGeo, circleMat);
  circle.rotation.x = -Math.PI/2;
  circle.position.set(0, 0.01, 0);
  circle.name = "CenterCircle";
  scene.add(circle);

  // Placeholder poker table (until your real table modules attach)
  const table = new THREE.Group();
  table.name = "PokerTable";

  const topGeo = new THREE.CylinderGeometry(1.15, 1.15, 0.12, 48);
  const topMat = new THREE.MeshStandardMaterial({ color:0x0b3b2e, roughness:0.9, metalness:0.0 });
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.y = 0.78;
  table.add(top);

  const railGeo = new THREE.TorusGeometry(1.12, 0.08, 16, 64);
  const railMat = new THREE.MeshStandardMaterial({ color:0x1c1c1f, roughness:0.7, metalness:0.2 });
  const rail = new THREE.Mesh(railGeo, railMat);
  rail.rotation.x = Math.PI/2;
  rail.position.y = 0.86;
  table.add(rail);

  const legGeo = new THREE.CylinderGeometry(0.15, 0.22, 0.75, 24);
  const legMat = new THREE.MeshStandardMaterial({ color:0x2a2a2f, roughness:0.8, metalness:0.1 });
  const leg = new THREE.Mesh(legGeo, legMat);
  leg.position.y = 0.38;
  table.add(leg);

  scene.add(table);

  // Spawn facing the table
  function setRigPose({ x=0, z=3.2, yaw=0 } = {}) {
    rig.position.set(x, 0, z);
    rig.rotation.set(0, yaw, 0);
  }
  setRigPose({ x:0, z:3.2, yaw:0 });

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  const hooks = { tick: [] };

  function addTick(fn){ if(typeof fn==="function") hooks.tick.push(fn); }

  function update() {
    const dt = clock.getDelta();
    const t = clock.elapsedTime;

    for (const fn of hooks.tick) {
      try { fn({ dt, t }); } catch (e) { diag?.error?.("tick error:", e?.message || e); }
    }
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(update);

  diag?.log?.("[world] created ✅", { w: window.innerWidth, h: window.innerHeight });

  return {
    THREE,
    renderer,
    scene,
    camera,
    rig,
    clock,
    table,
    floor,
    setRigPose,
    add: (obj) => scene.add(obj),
    addTick,
    update
  };
}
