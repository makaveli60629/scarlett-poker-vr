import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { VRButton } from 'https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js';
import { log, setStatus, setHint } from './diag.js';
import { TouchMovement } from './input_touch.js';
import { XRMovement } from './input_xr.js';
import { TeleportSystem } from './teleport.js';

export class Engine {
  constructor({ container }) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x05070a, 6, 80);

    this.clock = new THREE.Clock();

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.02, 400);
    this.camera.position.set(0, 1.65, 3.2);

    this.rig = new THREE.Group();
    this.rig.name = 'playerRig';
    this.rig.position.set(0, 0, 0);
    this.rig.add(this.camera);
    this.scene.add(this.rig);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.xr.enabled = true;

    this.container.appendChild(this.renderer.domElement);

    // Lights
    const hemi = new THREE.HemisphereLight(0x9fb4ff, 0x0b0d12, 0.85);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.65);
    dir.position.set(6, 10, 3);
    this.scene.add(dir);

    // Teleport targets (meshes added by modules via engine.addTeleportTarget)
    this.teleportTargets = [];

    // Systems
    this.teleport = new TeleportSystem({
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
      rig: this.rig,
      targets: this.teleportTargets,
    });
    this.touchMove = new TouchMovement({
      leftEl: document.getElementById("joyLeft"),
      rightEl: document.getElementById("joyRight"),
      jumpEl: document.getElementById("btnTouchJump"),
      rig: this.rig,
      camera: this.camera,
    });
    this.xrMove = new XRMovement({ renderer: this.renderer, rig: this.rig });

    // module registry
    this.modules = [];


    // VR button
    this.vrButton = VRButton.createButton(this.renderer);
    this.vrButton.id = 'threeVRButton';
    this.vrButton.style.zIndex = 0; // keep HUD on top
    document.body.appendChild(this.vrButton);

    // Resize
    window.addEventListener('resize', () => this.onResize());
    this.onResize();

    // XR session events
    this.renderer.xr.addEventListener('sessionstart', () => {
      log('[xr] sessionstart');
      setHint('Quest: thumbsticks move/turn • Trigger teleports when Teleport is ON');
    });
    this.renderer.xr.addEventListener('sessionend', () => {
      log('[xr] sessionend');
      setHint('Android: use joysticks • Non-VR: WASD + mouse');
    });
  }

  addModule(mod) {
    this.modules.push(mod);
    if (typeof mod.init === 'function') mod.init(this);
  }

  addTeleportTarget(mesh) {
    this.teleportTargets.push(mesh);
  }

  setTeleportEnabled(on) {
    this.teleport.setEnabled(!!on);
  }

  toggleTeleport() {
    const next = !this.teleport.enabled;
    this.teleport.setEnabled(next);
    return next;
  }


  enterVR() {
    // VRButton handles the real session request; this is mostly for logging
    try {
      const btn = document.getElementById('threeVRButton');
      btn?.click();
    } catch (_) {}
  }

  resetPlayer() {
    // Reset to spawn pad if present
    const pad = this.scene.getObjectByName('spawnPad');
    if (pad) {
      const p = new THREE.Vector3();
      pad.getWorldPosition(p);
      this.rig.position.set(p.x, 0, p.z);
      this.rig.rotation.set(0, Math.PI, 0);
    } else {
      this.rig.position.set(0, 0, -7.2);
      this.rig.rotation.set(0, Math.PI, 0);
    }
    this.camera.position.set(0, 1.65, 0);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  start() {
    setStatus('building world…');
    log('[engine] start render loop');

    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(this.clock.getDelta(), 0.05);

      // update input systems
      this.touchMove.update(dt);
      this.xrMove.update(dt);
      this.teleport.update(dt);

      // update modules
      for (const m of this.modules) {
        try { m.update?.(dt, this); } catch (e) { /* swallow */ }
      }

      this.renderer.render(this.scene, this.camera);
    });

    setStatus('ready ✅');
  }
}

export { THREE };
