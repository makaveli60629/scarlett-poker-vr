// /js/scarlett1/boot2.js — Scarlett Boot2 (FULL) v2.0
// ✅ No bare "three" imports anywhere except unpkg absolute
// ✅ World gets THREE injected (world.js must NOT import "three")
// ✅ Android controls only when NOT in XR
// ✅ Oculus controllers locomotion supported via /js/core/controls.js
// ✅ Handles failures -> updates HUD status instead of hanging "Booting…"

const DIAG = window.SCARLETT_DIAG || {
  log: (...a)=>console.log("[diag]",...a),
  setStatus: ()=>{},
  setHUDVisible: ()=>{}
};

const log = (...a)=>DIAG.log(...a);

function urlRel(rel){
  return new URL(rel, import.meta.url).toString();
}

async function safeImport(label, u){
  try{
    log(`[boot2] import ${u}`);
    const m = await import(u);
    log(`[boot2] ok ✅ ${label}`);
    return m;
  }catch(e){
    log(`[boot2] fail ❌ ${label} :: ${e?.message||e}`);
    throw e;
  }
}

let THREE, VRButton;
let renderer, scene, camera, player, cameraPitch;
let controllers = { c0:null, c1:null, g0:null, g1:null };
let updateWorld = null;
let controlsMod = null;
let androidMod = null;

function makeRenderer(){
  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", ()=>{
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
}

function makeRig(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070c);

  // Player rig
  player = new THREE.Group();
  scene.add(player);

  cameraPitch = new THREE.Group();
  player.add(cameraPitch);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 600);
  camera.position.set(0, 1.6, 0);
  cameraPitch.add(camera);

  // small ambient to avoid black
  const amb = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(amb);
}

function installControllers(){
  // controller grips / pointers
  controllers.c0 = renderer.xr.getController(0);
  controllers.c1 = renderer.xr.getController(1);
  controllers.g0 = renderer.xr.getControllerGrip(0);
  controllers.g1 = renderer.xr.getControllerGrip(1);

  scene.add(controllers.c0, controllers.c1, controllers.g0, controllers.g1);

  // visible rays
  const rayGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0,0,0),
    new THREE.Vector3(0,0,-1)
  ]);
  const rayMat = new THREE.LineBasicMaterial({ color: 0x66ccff });
  const mkRay = ()=>{
    const line = new THREE.Line(rayGeo, rayMat);
    line.name = "laser";
    line.scale.z = 6;
    return line;
  };
  controllers.c0.add(mkRay());
  controllers.c1.add(mkRay());
}

async function installXRHands(){
  // Optional: hands (won’t crash if not supported)
  try{
    const XRHandModelFactory = (await import("https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRHandModelFactory.js")).XRHandModelFactory;
    const factory = new XRHandModelFactory();

    const hand0 = renderer.xr.getHand(0);
    const hand1 = renderer.xr.getHand(1);
    hand0.add(factory.createHandModel(hand0, "mesh"));
    hand1.add(factory.createHandModel(hand1, "mesh"));
    scene.add(hand0, hand1);

    log("XR hands ready ✅");
  }catch(e){
    log("XR hands skipped (ok) ::", e?.message||e);
  }
}

async function main(){
  DIAG.setStatus("Booting…", null);

  try{
    // THREE
    const threeURL = "https://unpkg.com/three@0.158.0/build/three.module.js";
    THREE = (await safeImport("three", threeURL));
    THREE = THREE.default || THREE;
    log(`[boot2] three import ✅ r${THREE.REVISION||"?"}`);

    // VRButton
    const vrURL = "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";
    ({ VRButton } = await safeImport("VRButton", vrURL));
    log("VRButton ready ✅");

    makeRenderer();
    makeRig();
    installControllers();
    await installXRHands();

    // Add VRButton
    document.body.appendChild(VRButton.createButton(renderer));

    // Core controls (Quest thumbsticks locomotion)
    controlsMod = await safeImport("controls", urlRel("../core/controls.js"));
    log("core controls loaded ✅");

    // Android sticks (only 2D)
    try{
      androidMod = await safeImport("spine_android", urlRel("./spine_android.js"));
    }catch(e){
      androidMod = null;
    }

    // World (must NOT import "three")
    const worldURL = urlRel("./world.js");
    log(`[boot2] world url=${worldURL}`);
    const worldMod = await safeImport("world", worldURL);

    if (!worldMod?.initWorld) throw new Error("world.js missing export initWorld()");
    const out = await worldMod.initWorld({
      THREE,
      scene,
      renderer,
      camera,
      player,
      cameraPitch,
      controllers,
      log
    });

    updateWorld = out?.update || null;

    // Android init
    if (androidMod?.initAndroidSticks){
      androidMod.initAndroidSticks({
        renderer,
        player,
        cameraPitch,
        log,
        setHUDVisible: DIAG.setHUDVisible
      });
      log("Android sticks READY ✅");
    }else{
      log("Android sticks skipped (no initAndroidSticks export)");
    }

    // XR session logging
    renderer.xr.addEventListener("sessionstart", ()=>log("XR session start ✅"));
    renderer.xr.addEventListener("sessionend", ()=>log("XR session end ✅"));

    DIAG.setStatus("World running ✅", true);

    // Render loop
    let last = performance.now();
    renderer.setAnimationLoop((t)=>{
      const now = t || performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Update world
      if (updateWorld) updateWorld(dt);

      // Oculus thumbstick locomotion (only in XR)
      try{
        controlsMod?.Controls?.applyLocomotion?.({
          renderer,
          player,
          controllers,
          camera,
          diagonal45: false // you can turn this on later if you want 45° snapping
        }, dt);
      }catch(e){ /* keep loop alive */ }

      // Android movement (only not in XR)
      try{
        androidMod?.updateAndroidSticks?.(dt);
      }catch(e){ /* keep loop alive */ }

      renderer.render(scene, camera);
    });

    log("render loop start ✅");
    log("[boot2] done ✅");

  }catch(e){
    DIAG.setStatus("BOOT FAILED ❌", false);
    log("BOOT ERROR:", e?.message||e);
    // keep page responsive; do not throw further
  }
}

main();
