import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

// MASTER spine: creates renderer, rig, diagnostics, and calls module hooks if present.
export async function start(ctx) {
  const { log, modules } = ctx;

  log(`[XR] navigator.xr = ${!!navigator.xr}`);
  log(`[XR] secureContext = ${window.isSecureContext}`);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f14);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 500);
  // IMPORTANT: camera must start at human height for non-VR preview; in VR local-floor takes over.
  camera.position.set(0, 1.6, 3);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local-floor");
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(VRButton.createButton(renderer));
  log("[XR] VRButton injected ✅ (look for 'ENTER VR')");

  // Player rig so teleport / movement can move the world correctly
  const rig = new THREE.Group();
  rig.name = "player_rig";
  rig.add(camera);
  scene.add(rig);

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x233044, 1.0));
  const dir = new THREE.DirectionalLight(0xffffff, 0.55);
  dir.position.set(3, 8, 4);
  scene.add(dir);

  // Build world (your module OR our default)
  const world = modules.world;
  if (world?.build) {
    try { await world.build({ scene, rig, camera, renderer, THREE, log, ctx }); }
    catch(e){ log(`[world] build failed: ${e.message}`, "err"); console.error(e); }
  } else {
    defaultWorld({ scene, rig, THREE, log });
  }

  // Controls / rays
  let ctl = null;
  if (modules.controls?.setupControls) {
    try { ctl = await modules.controls.setupControls({ scene, rig, camera, renderer, THREE, log, ctx }); }
    catch(e){ log(`[controls] setup failed: ${e.message}`, "err"); console.error(e); }
  } else {
    ctl = defaultControls({ scene, rig, camera, renderer, THREE, log });
  }

  // Teleport wiring
  let tp = null;
  if (modules.teleport?.setupTeleport) {
    try { tp = await modules.teleport.setupTeleport({ scene, rig, camera, renderer, THREE, log, ctx, controls: ctl }); }
    catch(e){ log(`[teleport] setup failed: ${e.message}`, "err"); console.error(e); }
  } else {
    tp = defaultTeleport({ scene, rig, camera, renderer, THREE, log, controls: ctl });
  }

  // UI hook
  if (modules.ui?.init) {
    try { await modules.ui.init({ scene, rig, camera, renderer, THREE, log, ctx, controls: ctl }); }
    catch(e){ log(`[ui] init failed: ${e.message}`, "err"); console.error(e); }
  }

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Animation loop (calls module ticks if provided)
  renderer.setAnimationLoop(() => {
    try { ctl?.tick?.(); } catch {}
    try { tp?.tick?.(); } catch {}
    try { modules.world?.tick?.({ scene, rig, camera, renderer, THREE, log, ctx }); } catch {}
    renderer.render(scene, camera);
  });

  log("✅ XR LOOP RUNNING");
}

function defaultWorld({ scene, rig, THREE, log }) {
  // Floor + grid
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: 0x1d2430, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.name = "floor";
  floor.userData.isFloor = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(30, 30, 0x2a3646, 0x16202b);
  grid.position.y = 0.002;
  scene.add(grid);

  // Spawn marker in front of player
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 20, 20),
    new THREE.MeshStandardMaterial({ color: 0x00ff66 })
  );
  marker.position.set(0, 1.5, -2.0);
  marker.name = "spawn_marker";
  scene.add(marker);

  // Simple "table" placeholder so you feel grounded
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 0.08, 48),
    new THREE.MeshStandardMaterial({ color: 0x0e7c3a, roughness: 0.9 })
  );
  tableTop.position.set(0, 0.95, -4.2);
  scene.add(tableTop);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.35, 0.9, 24),
    new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 1 })
  );
  base.position.set(0, 0.45, -4.2);
  scene.add(base);

  // 6 chairs
  for (let i=0;i<6;i++){
    const ang = (i/6)*Math.PI*2;
    const r = 2.2;
    const x = Math.cos(ang)*r;
    const z = -4.2 + Math.sin(ang)*r;
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.06, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x6f6f6f, roughness: 1 })
    );
    seat.position.set(x, 0.55, z);
    seat.rotation.y = -ang;
    scene.add(seat);
  }

  // Safe spawn (behind marker) using rig
  rig.position.set(0, 0, 0);
  log("[world] default world ready ✅ (floor + table + chairs)");
}

function defaultControls({ scene, rig, camera, renderer, THREE, log }) {
  const controllers = [];
  const rays = [];
  const last = [{}, {}];

  const makeRay = () => {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const line = new THREE.Line(geom, new THREE.LineBasicMaterial());
    line.scale.z = 6;
    return line;
  };

  for (let i=0;i<2;i++){
    const c = renderer.xr.getController(i);
    c.userData.index = i;
    scene.add(c);
    controllers.push(c);

    const ray = makeRay();
    c.add(ray);
    rays.push(ray);

    c.addEventListener("connected", (e) => {
      c.userData.gamepad = e.data.gamepad || null;
      log(`🎮 Controller ${i} connected: ${e.data.gamepad?.id || "unknown"}`);
    });
    c.addEventListener("disconnected", () => {
      c.userData.gamepad = null;
      log(`🎮 Controller ${i} disconnected`);
    });

    // Standard WebXR events (Quest)
    c.addEventListener("selectstart", () => log(`🧪 pad${i} selectstart`));
    c.addEventListener("selectend",   () => log(`🧪 pad${i} selectend`));
    c.addEventListener("squeezestart",() => log(`🧪 pad${i} squeezestart`));
    c.addEventListener("squeezeend",  () => log(`🧪 pad${i} squeezeend`));
  }

  function tick(){
    // Also poll gamepads to learn button indices (only logs on change)
    for (let i=0;i<controllers.length;i++){
      const gp = controllers[i].userData.gamepad;
      if (!gp?.buttons) continue;
      for (let b=0;b<gp.buttons.length;b++){
        const p = !!gp.buttons[b].pressed;
        if (last[i][b] !== p){
          last[i][b] = p;
          log(`🧪 pad${i} button${b}=${p?"DOWN":"UP"}`);
        }
      }
    }
  }

  log("[controls] default controls ready ✅ (rays + diagnostics)");
  return { controllers, rays, tick };
}

function defaultTeleport({ scene, rig, camera, renderer, THREE, log, controls }) {
  const raycaster = new THREE.Raycaster();
  const tmpMat = new THREE.Matrix4();
  const tmpDir = new THREE.Vector3();
  const tmpPos = new THREE.Vector3();
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.24, 32),
    new THREE.MeshStandardMaterial({ color: 0x00ff66, roughness: 0.6 })
  );
  reticle.rotation.x = -Math.PI/2;
  reticle.visible = false;
  scene.add(reticle);

  const floors = () => scene.children.filter(o => o.userData?.isFloor || o.name==="floor");

  function castFromController(ctrl){
    if (!ctrl) return null;
    tmpMat.identity().extractRotation(ctrl.matrixWorld);
    tmpDir.set(0,0,-1).applyMatrix4(tmpMat).normalize();
    ctrl.getWorldPosition(tmpPos);
    raycaster.set(tmpPos, tmpDir);
    const hits = raycaster.intersectObjects(floors(), true);
    return hits?.[0] || null;
  }

  // Bind teleport to RIGHT controller selectend (typical trigger)
  const right = controls?.controllers?.[1] || renderer.xr.getController(1);
  right.addEventListener("selectend", () => {
    const hit = castFromController(right);
    if (hit){
      rig.position.x = hit.point.x;
      rig.position.z = hit.point.z;
      // keep rig y at 0 for local-floor
      rig.position.y = 0;
      log(`✅ Teleport → x=${hit.point.x.toFixed(2)} z=${hit.point.z.toFixed(2)}`);
    } else {
      log("⚠️ Teleport: no floor hit", "warn");
    }
  });

  function tick(){
    const hit = castFromController(right);
    if (hit){
      reticle.position.copy(hit.point);
      reticle.visible = true;
    } else {
      reticle.visible = false;
    }
  }

  log("[teleport] default teleport ready ✅ (right trigger = teleport)");
  return { tick };
}
