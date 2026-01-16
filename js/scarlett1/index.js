// /js/scarlett1/index.js — Scarlett1 Runtime v4.3 (Controls + Hands + Teleport + Snap + Move)

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRControllerModelFactory.js";
import { XRHandModelFactory } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRHandModelFactory.js";

import { World } from "./world.js";

const o = document.getElementById("overlay");
const log = (...a)=> o && (o.textContent += "\n[LOG] " + a.join(" "));
const err = (...a)=> o && (o.textContent += "\n[ERR] " + a.join(" "));

window.addEventListener("error", (e)=> err("window:", e.message));
window.addEventListener("unhandledrejection", (e)=> err("promise:", e.reason?.message || String(e.reason)));

const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const DEAD = 0.18;

function makeLaser(THREE, color=0x33ffcc) {
  const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
  const m = new THREE.LineBasicMaterial({ color });
  const line = new THREE.Line(g, m);
  line.name = "LaserLine";
  line.scale.z = 12;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.24, 48),
    new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.95, side:THREE.DoubleSide })
  );
  ring.name = "TeleportRing";
  ring.rotation.x = -Math.PI/2;
  ring.visible = false;

  return { line, ring };
}

function snapTurn(rig, dirSign) {
  rig.rotation.y += dirSign * (Math.PI/4); // 45°
}

(async () => {
  try {
    log("scarlett1 runtime start ✅");

    const host = document.getElementById("app") || document.body;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    renderer.setSize(innerWidth, innerHeight);
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    host.appendChild(renderer.domElement);

    addEventListener("resize", () => renderer.setSize(innerWidth, innerHeight));

    document.body.appendChild(VRButton.createButton(renderer));
    log("VRButton ready ✅");

    const world = new World({ THREE, renderer });
    await world.init();
    log("world.init OK ✅");

    // ===== Player Rig (world already creates rig/camera, but we keep control here) =====
    const rig = world.rig;
    const camera = world.camera;
    const scene = world.scene;

    // ===== Controllers + Hands =====
    const controllerModelFactory = new XRControllerModelFactory();
    const handModelFactory = new XRHandModelFactory();

    const c0 = renderer.xr.getController(0);
    const c1 = renderer.xr.getController(1);
    const g0 = renderer.xr.getControllerGrip(0);
    const g1 = renderer.xr.getControllerGrip(1);

    g0.add(controllerModelFactory.createControllerModel(g0));
    g1.add(controllerModelFactory.createControllerModel(g1));

    rig.add(c0, c1, g0, g1);

    const h0 = renderer.xr.getHand(0);
    const h1 = renderer.xr.getHand(1);
    h0.add(handModelFactory.createHandModel(h0, "mesh"));
    h1.add(handModelFactory.createHandModel(h1, "mesh"));
    rig.add(h0, h1);

    log("controllers + hands installed ✅");

    // ===== Lasers (attached to controllers so they are NEVER stuck in the world) =====
    const L0 = makeLaser(THREE, 0xff4fd8); // left pink
    const L1 = makeLaser(THREE, 0x33a8ff); // right blue

    c0.add(L0.line);
    c1.add(L1.line);
    scene.add(L0.ring);
    scene.add(L1.ring);

    // ===== Raycaster for teleport =====
    const ray = new THREE.Raycaster();
    ray.far = 20;

    function findTeleportHit(fromObj) {
      const origin = new THREE.Vector3();
      const dir = new THREE.Vector3(0,0,-1);

      fromObj.getWorldPosition(origin);
      dir.applyQuaternion(fromObj.getWorldQuaternion(new THREE.Quaternion())).normalize();

      ray.set(origin, dir);

      const hits = ray.intersectObjects(world.teleportSurfaces, true);
      if (!hits || hits.length === 0) return null;
      return hits[0];
    }

    function showRing(ring, hit) {
      ring.visible = true;
      ring.position.copy(hit.point);
      ring.position.y += 0.01;
    }

    function hideRing(ring) { ring.visible = false; }

    function teleportTo(point) {
      // local-floor reference: y=0 is floor.
      rig.position.set(point.x, rig.position.y, point.z);
    }

    // ===== Input State =====
    const state = {
      inXR: false,
      moveSpeed: 2.2,      // meters/sec
      snapCooldown: 0,
      snapDelay: 0.22,
      lastAxes0: [0,0],
      lastAxes1: [0,0],
      wantsTeleport0: false,
      wantsTeleport1: false,
      lastHit0: null,
      lastHit1: null,
    };

    // Trigger teleport (works for both controllers)
    c0.addEventListener("selectstart", () => state.wantsTeleport0 = true);
    c0.addEventListener("selectend",   () => {
      state.wantsTeleport0 = false;
      if (state.lastHit0) teleportTo(state.lastHit0.point);
      state.lastHit0 = null;
      hideRing(L0.ring);
    });

    c1.addEventListener("selectstart", () => state.wantsTeleport1 = true);
    c1.addEventListener("selectend",   () => {
      state.wantsTeleport1 = false;
      if (state.lastHit1) teleportTo(state.lastHit1.point);
      state.lastHit1 = null;
      hideRing(L1.ring);
    });

    // ===== XR session start/end =====
    renderer.xr.addEventListener("sessionstart", () => {
      state.inXR = true;
      log("XR sessionstart ✅");
      // re-attach rings to scene (safe)
      if (!L0.ring.parent) scene.add(L0.ring);
      if (!L1.ring.parent) scene.add(L1.ring);
    });

    renderer.xr.addEventListener("sessionend", () => {
      state.inXR = false;
      hideRing(L0.ring);
      hideRing(L1.ring);
      log("XR sessionend ✅");
    });

    // ===== Main Loop =====
    let lastT = performance.now();

    renderer.setAnimationLoop((t, frame) => {
      try {
        const now = performance.now();
        const dt = clamp((now - lastT) / 1000, 0, 0.05);
        lastT = now;

        world.tick(t, frame);

        // Only process XR controller movement inside XR
        if (state.inXR) {
          // --- Teleport aim rings ---
          if (state.wantsTeleport0) {
            const hit = findTeleportHit(c0);
            state.lastHit0 = hit;
            if (hit) showRing(L0.ring, hit); else hideRing(L0.ring);
          } else hideRing(L0.ring);

          if (state.wantsTeleport1) {
            const hit = findTeleportHit(c1);
            state.lastHit1 = hit;
            if (hit) showRing(L1.ring, hit); else hideRing(L1.ring);
          } else hideRing(L1.ring);

          // --- Thumbstick locomotion + snap turn ---
          const session = renderer.xr.getSession();
          const sources = session?.inputSources || [];

          // Try read axes from each input source safely
          let moveX = 0, moveY = 0;
          let turnX = 0;

          for (const src of sources) {
            const gp = src.gamepad;
            if (!gp || !gp.axes) continue;

            // Oculus: axes[2,3] often right stick on some; but left stick is usually [2,3] or [0,1]
            // We'll merge both: use the stick with larger magnitude.
            const ax0 = gp.axes[0] ?? 0;
            const ay0 = gp.axes[1] ?? 0;
            const ax1 = gp.axes[2] ?? 0;
            const ay1 = gp.axes[3] ?? 0;

            const mag0 = Math.hypot(ax0, ay0);
            const mag1 = Math.hypot(ax1, ay1);

            if (mag0 >= mag1) {
              moveX += ax0;
              moveY += ay0;
              turnX += ax0; // fallback if only one stick exists
            } else {
              moveX += ax1;
              moveY += ay1;
              turnX += ax1;
            }
          }

          // Normalize summed values a bit
          moveX = clamp(moveX, -1, 1);
          moveY = clamp(moveY, -1, 1);
          turnX = clamp(turnX, -1, 1);

          // Deadzones
          if (Math.abs(moveX) < DEAD) moveX = 0;
          if (Math.abs(moveY) < DEAD) moveY = 0;
          if (Math.abs(turnX) < DEAD) turnX = 0;

          // Snap turn on strong left/right push (45°) with cooldown
          state.snapCooldown -= dt;
          if (state.snapCooldown <= 0) {
            if (turnX > 0.72) { snapTurn(rig, -1); state.snapCooldown = state.snapDelay; }
            if (turnX < -0.72) { snapTurn(rig, +1); state.snapCooldown = state.snapDelay; }
          }

          // Forward/back + strafe (camera-relative)
          if (moveX !== 0 || moveY !== 0) {
            const fwd = new THREE.Vector3();
            camera.getWorldDirection(fwd);
            fwd.y = 0;
            fwd.normalize();

            const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0)).normalize();

            // NOTE: gamepad Y is usually negative when pushing forward, so invert
            const v = new THREE.Vector3();
            v.addScaledVector(fwd, -moveY);
            v.addScaledVector(right, moveX);
            v.normalize().multiplyScalar(state.moveSpeed * dt);

            rig.position.add(v);
          }
        }

        renderer.render(scene, camera);

      } catch (e) {
        err("FRAME CRASH ❌", e?.message || String(e));
        renderer.setAnimationLoop(null);
      }
    });

    log("render loop started ✅");

  } catch (e) {
    err("FATAL ❌", e?.message || String(e));
  }
})();
