import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { HybridWorld } from "./world.js";

const BUILD_STAMP = Date.now();

const rowsEl = document.getElementById("diagRows");

function logLine(msg, cls="muted") {
  console.log(msg);
  if (!rowsEl) return;
  const d = document.createElement("div");
  d.className = "row " + cls;
  d.textContent = msg;
  rowsEl.appendChild(d);
  rowsEl.parentElement.scrollTop = rowsEl.parentElement.scrollHeight;
}
const ok   = (m)=>logLine("✅ " + m, "ok");
const warn = (m)=>logLine("⚠️ " + m, "warn");
const bad  = (m)=>logLine("❌ " + m, "bad");

function header(){
  logLine(`BUILD_STAMP: ${BUILD_STAMP}`);
  logLine(`HREF: ${location.href}`);
  logLine(`UA: ${navigator.userAgent}`);
  logLine(`NAVIGATOR_XR: ${!!navigator.xr}`);
  logLine(`THREE: ${THREE ? "module ok" : "missing"}`);
}

function createRenderer(){
  logLine("Renderer: create…");
  const r = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  r.setSize(window.innerWidth, window.innerHeight);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.xr.enabled = true;
  document.body.appendChild(r.domElement);
  ok("Renderer created");

  window.addEventListener("resize", ()=>{
    r.setSize(window.innerWidth, window.innerHeight);
  });

  return r;
}

function makeRig(){
  const player = new THREE.Group();
  player.name = "PlayerRig";

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 1200);
  camera.position.set(0, 1.65, 0);
  camera.name = "MainCamera";
  player.add(camera);

  ok("PlayerRig + Camera created");
  return { player, camera };
}

function makeXRHands(renderer){
  const handLeft = renderer.xr.getHand(0);
  const handRight = renderer.xr.getHand(1);
  handLeft.name = "HandLeft";
  handRight.name = "HandRight";
  ok("XR Hands placeholders ready");
  return { handLeft, handRight };
}

function makeControllers(renderer, scene){
  const controller1 = renderer.xr.getController(0);
  const controller2 = renderer.xr.getController(1);
  controller1.name = "XRController0";
  controller2.name = "XRController1";
  scene.add(controller1, controller2);

  // visible rays
  const rayGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
  const rayMat = new THREE.LineBasicMaterial({ color: 0x7fe7ff });
  const line1 = new THREE.Line(rayGeom, rayMat);
  const line2 = new THREE.Line(rayGeom, rayMat);
  line1.scale.z = 10;
  line2.scale.z = 10;
  line1.name = "Laser";
  line2.name = "Laser";
  controller1.add(line1);
  controller2.add(line2);

  ok("Controllers + Lasers ready");
  return { controller1, controller2, line1, line2 };
}

function installQuestLocomotion(renderer, player){
  const dead = 0.18;
  const moveSpeed = 2.35;
  const snap = THREE.MathUtils.degToRad(30);
  let turnCooldown = 0;

  const axis = (v)=> (Math.abs(v) < dead ? 0 : v);

  return {
    update(dt){
      if (!renderer.xr.isPresenting) return;
      const session = renderer.xr.getSession();
      if (!session) return;

      let moveX = 0, moveY = 0, turnX = 0;

      for (const src of session.inputSources){
        const gp = src.gamepad;
        if (!gp) continue;

        const ax = gp.axes || [];
        // Quest commonly: left stick at axes[2],[3], sometimes [0],[1]
        if (src.handedness === "left"){
          moveX = axis(ax[2] ?? ax[0] ?? 0);
          moveY = axis(ax[3] ?? ax[1] ?? 0);
        }
        if (src.handedness === "right"){
          turnX = axis(ax[2] ?? ax[0] ?? 0);
        }
      }

      // move on ground plane
      if (moveX || moveY){
        const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(player.quaternion);
        fwd.y = 0; fwd.normalize();
        const right = new THREE.Vector3(fwd.z, 0, -fwd.x);

        player.position.addScaledVector(fwd, (-moveY) * moveSpeed * dt);
        player.position.addScaledVector(right, (moveX) * moveSpeed * dt);
      }

      // snap turn
      turnCooldown = Math.max(0, turnCooldown - dt);
      if (turnCooldown === 0 && Math.abs(turnX) > 0.6){
        player.rotation.y += (turnX > 0 ? -snap : snap);
        turnCooldown = 0.25;
      }
    }
  };
}

async function boot(){
  try{
    header();

    const renderer = createRenderer();
    const { player, camera } = makeRig();

    // We build controllers into a temp scene first so they exist even if world builds later
    const tempScene = new THREE.Scene();
    const hands = makeXRHands(renderer);
    const ctrls = makeControllers(renderer, tempScene);

    // VRButton
    try{
      document.body.appendChild(VRButton.createButton(renderer));
      ok("VRButton appended");
    }catch(e){
      warn("VRButton failed (non-fatal): " + (e?.message || e));
    }

    // Build WORLD ONLY
    ok("Import world.js ✅");
    await HybridWorld.build({
      THREE,
      renderer,
      camera,
      player,
      controllers: { ...hands, ...ctrls },
      log: (m)=>logLine(String(m), "muted"),
      OPTS: {
        worldOnly: true
      }
    });
    ok("HybridWorld.build ✅");

    const loco = installQuestLocomotion(renderer, player);

    renderer.setAnimationLoop(()=>{
      const dt = 1/60;

      try { loco.update(dt); } catch(e){ bad("locomotion crash: " + (e?.message || e)); }

      try { HybridWorld.frame({ renderer, camera }); }
      catch(e){
        bad("frame crash: " + (e?.message || e));
        renderer.setAnimationLoop(null);
      }
    });

    ok("Animation loop running ✅");
    logLine("Expected view: lobby ring + carpet + sunken table + 2 hallways to store/scorpion.", "muted");
    logLine("Quest controls: LEFT stick move, RIGHT stick snap-turn, aim laser at floor + trigger to teleport.", "muted");
  }catch(e){
    bad("BOOT FAIL: " + (e?.message || e));
    console.error(e);
  }
}

boot();
