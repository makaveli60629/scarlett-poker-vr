// /js/index.js — Scarlett Runtime v6.2 (FULL)
// ✅ Android touch controls (Left=Move, Right=Look)
// ✅ Quest/Oculus Touch controller locomotion in VR (thumbstick move + turn)
// ✅ Works with HybridWorld from /js/world.js
// ✅ No VR face panel in world.js (world should not attach VRPanel)

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

export async function startGame(boot = {}) {
  const log  = boot.log  || console.log;
  const ok   = boot.ok   || ((m)=>log("OK",m));
  const warn = boot.warn || ((m)=>log("WARN",m));
  const bad  = boot.bad  || ((m)=>log("BAD",m));

  ok("THREE: module ok");

  // ---------------------------
  // Renderer + base scene
  // ---------------------------
  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  ok("✅ Renderer created");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  scene.add(new THREE.HemisphereLight(0x9fb3ff, 0x0b0d14, 1.0));
  const dirL = new THREE.DirectionalLight(0xffffff, 0.9);
  dirL.position.set(4, 10, 3);
  scene.add(dirL);

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

  ok("✅ PlayerRig + Camera created");

  // XR hands placeholders (still okay even if controllers are used)
  const handLeft = renderer.xr.getHand(0);
  const handRight = renderer.xr.getHand(1);
  player.add(handLeft); player.add(handRight);
  ok("✅ XR Hands placeholders ready");

  // ---------------------------
  // VRButton with explicit sessionInit (helps Quest)
  // ---------------------------
  try {
    const sessionInit = {
      optionalFeatures: [
        "local-floor", "bounded-floor", "local",
        "hand-tracking",
        "layers",
        "dom-overlay"
      ],
      domOverlay: { root: document.body }
    };
    const btn = VRButton.createButton(renderer, sessionInit);
    btn.id = "VRButton";
    document.body.appendChild(btn);
    ok("✅ VRButton appended");
  } catch (e) {
    warn("VRButton failed: " + (e?.message || e));
  }

  window.addEventListener("resize", ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---------------------------
  // Android Touch Controls (non-VR)
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
  const deadzone = (v, dz=0.15)=> (Math.abs(v) < dz ? 0 : v);

  function uiHit(e){
    const t = e.target;
    return !!(t && (t.closest?.("#bar") || t.closest?.("#dbg") || t.closest?.("#dock") || t.closest?.("#uiRoot")));
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

  ok("✅ Android touch controls ready ✅ (Left=Move, Right=Look)");

  // ---------------------------
  // Quest/Oculus Controller Locomotion (VR)
  // ---------------------------
  const xr = {
    c0: null,
    c1: null,
    grip0: null,
    grip1: null,
    lastTurnT: 0
  };

  function installXRControllers(){
    // Controllers (pose targets)
    xr.c0 = renderer.xr.getController(0);
    xr.c1 = renderer.xr.getController(1);
    xr.c0.name = "XRController0";
    xr.c1.name = "XRController1";
    player.add(xr.c0);
    player.add(xr.c1);

    // Grips (models) – optional; safe if not present
    xr.grip0 = renderer.xr.getControllerGrip(0);
    xr.grip1 = renderer.xr.getControllerGrip(1);
    xr.grip0.name = "XRGrip0";
    xr.grip1.name = "XRGrip1";
    player.add(xr.grip0);
    player.add(xr.grip1);

    ok("✅ XR controllers installed (0/1 + grips)");
  }

  function pickAxes(gamepad){
    // Oculus Touch often uses axes[2,3] for thumbstick, but some builds map to [0,1]
    const ax = gamepad?.axes || [];
    const a0 = { x: ax[0] ?? 0, y: ax[1] ?? 0 };
    const a1 = { x: ax[2] ?? 0, y: ax[3] ?? 0 };

    // choose the stick with larger magnitude
    const m0 = Math.hypot(a0.x, a0.y);
    const m1 = Math.hypot(a1.x, a1.y);
    return (m1 > m0) ? a1 : a0;
  }

  function moveRigVR(dt){
    // Use LEFT controller for move; RIGHT for snap turn if you want.
    // If left isn’t present, fall back to right.
    const src = xr.c0 || xr.c1;
    const src2 = xr.c1 || xr.c0;

    const gpMove = src?.inputSource?.gamepad || src?.gamepad; // depending on browser
    const gpTurn = src2?.inputSource?.gamepad || src2?.gamepad;

    if (!gpMove && !gpTurn) return;

    // Movement axes
    const mv = gpMove ? pickAxes(gpMove) : {x:0,y:0};
    let mx = deadzone(mv.x, 0.18);
    let my = deadzone(mv.y, 0.18);

    // Turn axes (use horizontal of other stick if available)
    const tv = gpTurn ? pickAxes(gpTurn) : {x:0,y:0};
    let tx = deadzone(tv.x, 0.25);

    // speed
    const speed = 2.8; // meters/sec
    const turnSpeed = 2.0; // radians/sec (smooth turn)

    // forward/right from player yaw (use camera yaw for "where you look")
    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    // stick Y is usually forward negative
    const fwd = -my;
    const str = mx;

    if (Math.abs(fwd) + Math.abs(str) > 0.001) {
      player.position.addScaledVector(forward, fwd * speed * dt);
      player.position.addScaledVector(right,   str * speed * dt);
      // keep on ground
      player.position.y = Math.max(0.02, player.position.y);
    }

    // Smooth turn (optional)
    if (Math.abs(tx) > 0.001) {
      player.rotation.y -= tx * turnSpeed * dt;
    }
  }

  // Install controllers once XR is presenting
  renderer.xr.addEventListener("sessionstart", ()=>{
    try { installXRControllers(); } catch(e) { warn("XR controller install fail: " + (e?.message||e)); }
  });

  // ---------------------------
  // Safe spawn helpers
  // ---------------------------
  function respawnSafe(){
    player.position.set(0, 0.02, 26);
    player.rotation.set(0,0,0);
    camera.position.set(0,1.65,0);
    camera.rotation.set(0,0,0);
    touch.yaw = 0; touch.pitch = 0;
    ok("[ui] RESPAWN SAFE");
  }
  function snapDown(){
    player.position.y = 0.02;
    camera.position.set(0,1.65,0);
    ok("[ui] SNAP DOWN");
  }
  function gotoTable(){
    player.position.set(0, 0.02, 2.6);
    ok("[ui] GOTO TABLE");
  }
  function gotoStore(){
    player.position.set(0, 0.02, 18.0);
    ok("[ui] GOTO STORE");
  }
  function gotoScorpion(){
    player.position.set(-20.0, 0.02, 1.5);
    ok("[ui] GOTO SCORPION");
  }

  // ---------------------------
  // Import and build HybridWorld
  // ---------------------------
  let HybridWorld = null;
  try{
    const mod = await import(`./world.js?v=7001`);
    HybridWorld = mod?.HybridWorld || null;
    ok("✅ world.js imported ✅");
  }catch(e){
    bad("world.js import FAIL: " + (e?.message||e));
  }

  const WORLD_OPTS = {
    nonvrControls: true,
    allowTeleport: true,
    allowBots: true,
    allowPoker: true,
    allowStream: true,
    safeMode: false,
    enableVRPanel: false,            // IMPORTANT: world.js should honor or simply not create VRPanel
    table: { sunken: true, seats: 8 }
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
      ok("✅ HybridWorld.build ✅");
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

    if (!renderer.xr.isPresenting){
      // Android/Desktop touch look + move (non-VR)
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
    } else {
      // VR locomotion (Oculus Touch)
      moveRigVR(dt);

      // keep grounded while in VR too
      player.position.y = Math.max(0.02, player.position.y);
    }

    // World frame render
    try{
      if (HybridWorld?.frame) HybridWorld.frame({ renderer, camera });
      else renderer.render(scene, camera);
    }catch(e){
      bad("HybridWorld.frame crash: " + (e?.message||e));
      HybridWorld = null;
      renderer.render(scene, camera);
    }
  });

  ok("✅ Animation loop running ✅");

  return { respawnSafe, snapDown, gotoTable, gotoStore, gotoScorpion };
        }
