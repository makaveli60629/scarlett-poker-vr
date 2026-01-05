// js/main.js
// GitHub Pages-safe: use HTTPS module URLs (no "import from 'three'")

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

export async function boot({ statusEl, errEl, vrCorner } = {}) {
  const log = (msg) => { if (statusEl) statusEl.innerHTML += `<br/>${msg}`; };
  const fail = (e) => {
    const msg = (e && e.stack) ? e.stack : String(e);
    if (errEl) errEl.textContent = msg;
    throw e;
  };

  try {
    log("main.js running ✅");
    log("Three.js loaded ✅");

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Scene + Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060a);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
    camera.position.set(0, 1.6, 3);

    // Basic lighting (so it’s not dark)
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.0);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(5, 8, 5);
    scene.add(dir);

    // Simple “lobby floor” so you see something immediately
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x3b1020, roughness: 0.95, metalness: 0.05 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // A visible table placeholder (so it doesn’t look empty)
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 0.15, 48),
      new THREE.MeshStandardMaterial({ color: 0x0f6b3a, roughness: 0.85 })
    );
    table.position.set(0, 0.9, 0);
    scene.add(table);

    // VR Button (TOP RIGHT)
    const btn = VRButton.createButton(renderer);
    if (vrCorner) vrCorner.appendChild(btn);
    else document.body.appendChild(btn);
    log("VR button added ✅ (top-right)");

    // Controllers (Laser + Models)
    const controllerModelFactory = new XRControllerModelFactory();

    const controller1 = renderer.xr.getController(0);
    const controller2 = renderer.xr.getController(1);
    scene.add(controller1, controller2);

    const grip1 = renderer.xr.getControllerGrip(0);
    grip1.add(controllerModelFactory.createControllerModel(grip1));
    scene.add(grip1);

    const grip2 = renderer.xr.getControllerGrip(1);
    grip2.add(controllerModelFactory.createControllerModel(grip2));
    scene.add(grip2);

    // Laser lines so you can see pointers
    function addLaser(controller) {
      const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -6)];
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({ color: 0x66ccff });
      const line = new THREE.Line(geom, mat);
      line.name = "laser";
      controller.add(line);
    }
    addLaser(controller1);
    addLaser(controller2);

    // Resize
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Render loop
    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });

    log("Boot complete ✅");
  } catch (e) {
    fail(e);
  }
}
