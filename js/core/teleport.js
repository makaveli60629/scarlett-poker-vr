import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { log, setHint } from './diag.js';

// TeleportSystem: press trigger on right controller OR tap TELEPORT button then tap ground (non-XR)
export class TeleportSystem {
  constructor({ renderer, scene, camera, rig, targets }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.rig = rig;
    this.targets = targets;

    this.enabled = false;
    this.raycaster = new THREE.Raycaster();
    this.tmpV = new THREE.Vector3();

    // Reticle
    const g = new THREE.RingGeometry(0.15, 0.22, 32);
    const m = new THREE.MeshBasicMaterial({ color: 0x00ffd5, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    this.reticle = new THREE.Mesh(g, m);
    this.reticle.rotation.x = -Math.PI / 2;
    this.reticle.visible = false;
    this.scene.add(this.reticle);

    // XR controllers
    this.c1 = this.renderer.xr.getController(0);
    this.c2 = this.renderer.xr.getController(1);
    this.scene.add(this.c1);
    this.scene.add(this.c2);

    this.onSelectStart = (e) => {
      if (!this.enabled) return;
      this.tryTeleportFromController(e.target);
    };
    this.c1.addEventListener('selectstart', this.onSelectStart);
    this.c2.addEventListener('selectstart', this.onSelectStart);

    // Non-XR pointer teleport when enabled
    this.pointerDown = (ev) => {
      if (!this.enabled) return;
      if (this.renderer.xr.isPresenting) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -(((ev.clientY - rect.top) / rect.height) * 2 - 1)
      );
      this.raycaster.setFromCamera(ndc, this.camera);
      const hit = this.raycaster.intersectObjects(this.targets, true)[0];
      if (hit) this.teleportTo(hit.point);
    };
    window.addEventListener('pointerdown', this.pointerDown, { passive: true });
  }

  setEnabled(on) {
    this.enabled = !!on;
    this.reticle.visible = false;
    setHint(this.enabled ? 'Teleport enabled: point + trigger (VR) or tap ground (2D)' : '');
    log(`[teleport] ${this.enabled ? 'ON' : 'OFF'}`);
  }

  update() {
    if (!this.enabled) {
      this.reticle.visible = false;
      return;
    }

    // Show reticle from right-most controller if in XR
    if (this.renderer.xr.isPresenting) {
      const c = this.c2 || this.c1;
      this.tmpV.set(0, 0, -1).applyQuaternion(c.quaternion).normalize();
      this.raycaster.ray.origin.copy(c.position);
      this.raycaster.ray.direction.copy(this.tmpV);
      const hit = this.raycaster.intersectObjects(this.targets, true)[0];
      if (hit) {
        this.reticle.visible = true;
        this.reticle.position.copy(hit.point);
      } else {
        this.reticle.visible = false;
      }
    }
  }

  tryTeleportFromController(controller) {
    const dir = this.tmpV.set(0, 0, -1).applyQuaternion(controller.quaternion).normalize();
    this.raycaster.ray.origin.copy(controller.position);
    this.raycaster.ray.direction.copy(dir);
    const hit = this.raycaster.intersectObjects(this.targets, true)[0];
    if (hit) this.teleportTo(hit.point);
  }

  teleportTo(point) {
    // move rig so that camera ends up at point (keep head height)
    const head = new THREE.Vector3();
    this.camera.getWorldPosition(head);
    const rigPos = new THREE.Vector3();
    this.rig.getWorldPosition(rigPos);

    const delta = new THREE.Vector3(point.x - head.x, 0, point.z - head.z);
    this.rig.position.add(delta);
  }
}
