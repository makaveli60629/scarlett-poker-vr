class TeleportSystem {
  constructor(env) {
    this.env = env;
    const { THREE, scene } = env;

    this.raycaster = new THREE.Raycaster();
    this.tmpM = new THREE.Matrix4();
    this.tmpV = new THREE.Vector3();

    const markerGeo = new THREE.RingGeometry(0.25, 0.35, 32);
    const markerMat = new THREE.MeshStandardMaterial({ color: 0x4dd0ff, emissive: 0x103040, emissiveIntensity: 0.8, roughness: 0.25, metalness: 0.2 });
    this.marker = new THREE.Mesh(markerGeo, markerMat);
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.position.set(0, 0.01, 0);
    this.marker.visible = false;
    scene.add(this.marker);

    this.lastHit = null;
    this.enabled = false;
  }

  setEnabled(v) {
    this.enabled = !!v;
    this.marker.visible = this.enabled;
  }

  update() {
    if (!this.enabled) return;

    // when not in XR, use camera forward as ray
    if (!this.env.renderer.xr.isPresenting) {
      const { camera, world } = this.env;
      const origin = this.tmpV.setFromMatrixPosition(camera.matrixWorld);
      const dir = this.env.tmp.v3b.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
      this.raycaster.set(origin, dir);
      const hits = this.raycaster.intersectObject(world.floor, false);
      if (hits.length) this._setHit(hits[0]);
      return;
    }
    // in XR, marker updates from controller rays (try both)
    // (we keep marker where last controller hit was)
  }

  _setHit(hit) {
    this.lastHit = hit;
    this.marker.position.copy(hit.point);
    this.marker.position.y = 0.01;
  }

  tryCommitTeleportFromController(controller) {
    const { THREE, world, rig } = this.env;
    if (!this.enabled) return false;

    // controller ray in world space
    this.tmpM.identity().extractRotation(controller.matrixWorld);
    const origin = this.tmpV.setFromMatrixPosition(controller.matrixWorld);
    const dir = new THREE.Vector3(0, 0, -1).applyMatrix4(this.tmpM).normalize();
    this.raycaster.set(origin, dir);
    const hits = this.raycaster.intersectObject(world.floor, false);
    if (!hits.length) return false;
    this._setHit(hits[0]);
    rig.position.set(this.marker.position.x, 0, this.marker.position.z);
    this.env.__toast?.('teleported');
    return true;
  }

  commitTeleportNonVR() {
    if (!this.enabled || !this.lastHit) return;
    const p = this.marker.position;
    this.env.rig.position.set(p.x, 0, p.z);
  }
}

export const module_teleport_arch = {
  id: 'teleport_arch',
  async init(env) {
    const { THREE, scene } = env;

    // arch near spawn pad
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 0, 4.2);

    const baseGeo = new THREE.BoxGeometry(1.4, 0.15, 0.6);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1f2a36, roughness: 0.7, metalness: 0.1 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.075;
    base.castShadow = true;
    base.receiveShadow = true;
    archGroup.add(base);

    const pilarGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.8, 20);
    const pilarMat = new THREE.MeshStandardMaterial({ color: 0x243242, roughness: 0.55, metalness: 0.15 });
    const left = new THREE.Mesh(pilarGeo, pilarMat);
    left.position.set(-0.55, 0.9, 0);
    left.castShadow = true;
    archGroup.add(left);

    const right = new THREE.Mesh(pilarGeo, pilarMat);
    right.position.set(0.55, 0.9, 0);
    right.castShadow = true;
    archGroup.add(right);

    // arch top
    const torusGeo = new THREE.TorusGeometry(0.62, 0.07, 18, 48, Math.PI);
    const torusMat = new THREE.MeshStandardMaterial({ color: 0x7c4dff, roughness: 0.25, metalness: 0.5, emissive: 0x1b0f44, emissiveIntensity: 0.8 });
    const top = new THREE.Mesh(torusGeo, torusMat);
    top.rotation.z = Math.PI;
    top.position.set(0, 1.65, 0);
    top.castShadow = true;
    archGroup.add(top);

    // portal plane (visual only)
    const portalGeo = new THREE.PlaneGeometry(1.0, 1.4);
    const portalMat = new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 0.25, metalness: 0.2, emissive: 0x0b2a44, emissiveIntensity: 0.75, transparent: true, opacity: 0.85 });
    const portal = new THREE.Mesh(portalGeo, portalMat);
    portal.position.set(0, 1.0, 0);
    portal.castShadow = false;
    archGroup.add(portal);

    scene.add(archGroup);

    const teleport = new TeleportSystem(env);
    env.world.teleport = teleport;
    env.__toast = (m) => window.__scarlettToast?.(m);

    // non-VR click to teleport when Teleport: ON
    const canvas = document.getElementById('c');
    canvas?.addEventListener('click', (e) => {
      if (env.renderer.xr.isPresenting) return;
      if (!env.state.teleportMode) return;
      teleport.commitTeleportNonVR();
    });

    env.log?.('teleport arch ready ✅');

    return {
      handles: { arch: archGroup, teleport },
      update(dt) {
        // portal shimmer
        const t = performance.now() * 0.002;
        portal.material.emissiveIntensity = 0.6 + 0.25 * Math.sin(t);
        teleport.update();
      }
    };
  }
};
