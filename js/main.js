// js/main.js — FAILSAFE BEACON WORLD (Quest-safe, single boot)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

if (!window.__SKYLARK__) window.__SKYLARK__ = {};
const S = window.__SKYLARK__;

function hudLog(msg) {
  try { window.__HUD__?.log?.(msg); } catch {}
  console.log(msg);
}

export async function boot() {
  if (S.bootPromise) return S.bootPromise;

  S.bootPromise = (async () => {
    if (S.renderer) return;

    const app = document.getElementById("app") || document.body;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070812);
    scene.fog = new THREE.Fog(0x070812, 8, 80);

    // Camera & player rig
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);
    const player = new THREE.Group();
    player.position.set(0, 0, 2);
    player.add(camera);
    scene.add(player);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMappingExposure = 1.6; // BRIGHT on Quest
    renderer.xr.enabled = true;

    app.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // Lights (OVERKILL so it can’t be black)
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const hemi = new THREE.HemisphereLight(0xbad7ff, 0x222233, 0.85);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.35);
    dir.position.set(6, 10, 4);
    scene.add(dir);

    const neon = new THREE.PointLight(0x00ffaa, 2.0, 30);
    neon.position.set(0, 3, -4);
    scene.add(neon);

    // Floor (bright grid-like)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    // Big beacon cube so you ALWAYS see something
    const beacon = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.2, 1.2),
      new THREE.MeshStandardMaterial({
        color: 0xff2f6a,
        emissive: 0xff2f6a,
        emissiveIntensity: 2.5,
        roughness: 0.35
      })
    );
    beacon.position.set(0, 1.2, -3.5);
    scene.add(beacon);

    // Reference poles
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x00ffaa, emissive: 0x00ffaa, emissiveIntensity: 1.6 });
    for (const x of [-6, 6]) {
      for (const z of [-6, 6]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.0, 16), poleMat);
        pole.position.set(x, 1.5, z);
        scene.add(pole);
      }
    }

    // Store singletons
    S.scene = scene;
    S.camera = camera;
    S.player = player;
    S.renderer = renderer;

    // XR events
    renderer.xr.addEventListener("sessionstart", () => {
      window.__HUD__?.xrPill?.classList?.remove("bad");
      window.__HUD__?.xrPill?.classList?.add("ok");
      window.__HUD__?.xrPill && (window.__HUD__.xrPill.textContent = "XR: session started");
      hudLog("XR session started");
    });
    renderer.xr.addEventListener("sessionend", () => {
      window.__HUD__?.xrPill?.classList?.remove("ok");
      window.__HUD__?.xrPill?.classList?.add("bad");
      window.__HUD__?.xrPill && (window.__HUD__.xrPill.textContent = "XR: ended");
      hudLog("XR session ended");
    });

    // Resize
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Animate
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.033);
      beacon.rotation.y += dt * 0.7;
      beacon.rotation.x += dt * 0.3;
      renderer.render(scene, camera);
    });

    hudLog("Failsafe world running. If you see the pink cube, rendering is OK.");
  })();

  return S.bootPromise;
}
