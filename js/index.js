// /js/index.js — Scarlett Runtime v6.0 (FULL)
// ✅ Creates renderer + base scene (never black)
// ✅ Android touch controls (Left=Move, Right=Look)
// ✅ Imports HybridWorld from world.js and builds it
// ✅ Forces: enableVRPanel = false (removes Quest face panel)
// ✅ Forces: SolidWalls (rooms/hallways) must build if file is correct
// ✅ Requests: sunken table via TableFactory options (if TableFactory is used)

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

export async function startGame(boot = {}) {
  const log  = boot.log  || console.log;
  const ok   = boot.ok   || ((m)=>log("OK",m));
  const warn = boot.warn || ((m)=>log("WARN",m));
  const bad  = boot.bad  || ((m)=>log("BAD",m));

  ok("THREE module ok");

  // ---------------------------
  // Renderer + base scene
  // ---------------------------
  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  ok("Renderer created");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  scene.add(new THREE.HemisphereLight(0x9fb3ff, 0x0b0d14, 1.0));
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(4, 10, 3);
  scene.add(dir);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95, metalness: 0.0 })
  );
  floor.rotation.x = -Math.PI/2;
  floor.position.y = 0;
  floor.name = "Floor";
  scene.add(floor);

  const player = new THREE.Group();
  player.name = "PlayerRig";
  scene.add(player);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 900);
  camera.position.set(0, 1.65, 0);
  player.add(camera);
  ok("PlayerRig + Camera created");

  // XR hands placeholders
  const handLeft = renderer.xr.getHand(0);
  const handRight = renderer.xr.getHand(1);
  player.add(handLeft); player.add(handRight);
  ok("XR Hands placeholders ready");

  // VRButton
  try{
    const btn = VRButton.createButton(renderer);
    btn.id="VRButton";
    document.body.appendChild(btn);
    ok("VRButton appended");
  }catch(e){
    warn("VRButton failed: " + (e?.message||e));
  }

  window.addEventListener("resize", ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---------------------------
  // Android Touch Controls
  // Left side = move, Right side = look
  // ---------------------------
  const touch = {
    moveId: null,
    lookId: null,
    moveStart: new THREE.Vector2(),
    lookStart: new THREE.Vector2(),
    move: new THREE.Vector2(),
    look: new THREE.Vector2(),
    yaw: 0,
    pitch: 0
  };
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

  function uiHit(e){
    const t = e.target;
    return !!(t && (t.closest?.("#dock") || t.closest?.("#bar") || t.closest?.("#dbg")));
  }

  function onDown(e){
    if (uiHit(e)) return;
    const isLeft = e.clientX < window.innerWidth * 0.5;
    if (isLeft && touch.moveId === null){
      touch.moveId = e.pointerId;
      touch.moveStart.set(e.clientX, e.clientY);
      touch.move.set(0,0);
    } else if (!isLeft && touch.lookId === null){
      touch.lookId = e.pointerId;
      touch.lookStart.set(e.clientX, e.clientY);
      touch.look.set(0,0);
    }
  }
  function onMove(e){
    if (e.pointerId === touch.moveId){
      touch.move.set(
        clamp((e.clientX - touch.moveStart.x)/90, -1, 1),
        clamp((e.clientY - touch.moveStart.y)/90, -1, 1)
      );
    }
    if (e.pointerId === touch.lookId){
      touch.look.set(
        clamp((e.clientX - touch.lookStart.x)/110, -1, 1),
        clamp((e.clientY - touch.lookStart.y)/110, -1, 1)
      );
    }
  }
  function onUp(e){
    if (e.pointerId === touch.moveId){ touch.moveId = null; touch.move.set(0,0); }
    if (e.pointerId === touch.lookId){ touch.lookId = null; touch.look.set(0,0); }
  }

  renderer.domElement.addEventListener("pointerdown", onDown, {passive:true});
  renderer.domElement.addEventListener("pointermove", onMove, {passive:true});
  renderer.domElement.addEventListener("pointerup", onUp, {passive:true});
  renderer.domElement.addEventListener("pointercancel", onUp, {passive:true});
  ok("Android touch controls ready ✅ (Left=Move, Right=Look)");

  // ---------------------------
  // Safe spawn helpers
  // ---------------------------
  function respawnSafe(){
    player.position.set(0, 0.02, 26);
    player.rotation.set(0,0,0);
    camera.position.set(0,1.65,0);
    camera.rotation.set(0,0,0);
    touch.yaw = 0; touch.pitch = 0;
    ok("RESPAWN SAFE");
  }
  function snapDown(){
    player.position.y = 0.02;
    camera.position.set(0,1.65,0);
    ok("SNAP DOWN");
  }
  function gotoTable(){
    player.position.set(0, 0.02, 2.6);
    ok("GOTO TABLE");
  }
  function gotoStore(){
    player.position.set(0, 0.02, 18.0);
    ok("GOTO STORE (approx)");
  }
  function gotoScorpion(){
    player.position.set(-20.0, 0.02, 1.5);
    ok("GOTO SCORPION (approx)");
  }

  // ---------------------------
  // Import and build HybridWorld
  // ---------------------------
  let HybridWorld = null;
  try{
    const mod = await import(`./world.js?v=6001`);
    HybridWorld = mod?.HybridWorld || null;
    ok("world.js imported ✅");
  }catch(e){
    bad("world.js import FAIL: " + (e?.message||e));
  }

  // IMPORTANT: force NO VR PANEL and request SUNKEN table via TableFactory options
  const WORLD_OPTS = {
    nonvrControls: true,
    allowTeleport: true,
    allowBots: true,
    allowPoker: true,
    allowStream: true,
    safeMode: false,

    // ✅ remove Quest face panel
    enableVRPanel: false,

    // ✅ pass table preferences for TableFactory (world.js must forward these when calling TableFactory.create)
    table: {
      sunken: true,
      seats: 8
    }
  };

  if (HybridWorld?.build) {
    try{
      await HybridWorld.build({
        THREE,
        renderer,
        camera,
        player,
        controllers: { handLeft, handRight },
        log,
        OPTS: WORLD_OPTS
      });
      ok("HybridWorld.build ✅");
    }catch(e){
      bad("HybridWorld.build FAILED: " + (e?.message||e));
      if (e?.stack) log(e.stack);
    }
  } else {
    warn("HybridWorld missing — running base scene only");
  }

  // ---------------------------
  // Main loop
  // ---------------------------
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(()=>{
    const dt = Math.min(0.05, clock.getDelta());

    // Touch move/look when NOT in XR
    if (!renderer.xr.isPresenting){
      touch.yaw   -= touch.look.x * dt * 2.4;
      touch.pitch -= touch.look.y * dt * 2.0;
      touch.pitch = clamp(touch.pitch, -1.2, 1.2);

      player.rotation.y = touch.yaw;
      camera.rotation.x = touch.pitch;

      const fwd = -touch.move.y;
      const str =  touch.move.x;
      if (Math.abs(fwd) + Math.abs(str) > 0.02){
        const speed = 3.2;
        const dir = new THREE.Vector3();
        player.getWorldDirection(dir);
        dir.y = 0; dir.normalize();
        const right = new THREE.Vector3(dir.z, 0, -dir.x);
        player.position.addScaledVector(dir, fwd * speed * dt);
        player.position.addScaledVector(right, str * speed * dt);
        player.position.y = Math.max(0.02, player.position.y);
      }
    }

    // World frame if available, else render base scene
    try{
      if (HybridWorld?.frame) HybridWorld.frame({ renderer, camera });
      else renderer.render(scene, camera);
    }catch(e){
      bad("HybridWorld.frame crash: " + (e?.message||e));
      HybridWorld = null;
      renderer.render(scene, camera);
    }
  });

  ok("Animation loop running ✅");

  // Return API to boot.js for UI buttons
  return { respawnSafe, snapDown, gotoTable, gotoStore, gotoScorpion };
          }
