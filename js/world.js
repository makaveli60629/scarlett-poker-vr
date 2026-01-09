// world.js — PERMANENT UPDATE 4.0: CYBER-AVATAR SYSTEM (Hands-only)

// Usage expectation:
//   const avatar = new CyberAvatar({ THREE, scene, camera });
//   In XR frame loop: avatar.update(frame, referenceSpace, camera);

export class CyberAvatar {
  constructor({ THREE, scene, camera, textureURL = 'assets/textures/cyber_suit_atlas.png' }) {
    this.THREE = THREE;
    this.scene = scene;
    this.camera = camera;

    this.meshGroup = new THREE.Group();

    this.handMeshes = { left: null, right: null };
    this.helmet = null;
    this.torso = null;

    this._tmpVec3 = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();

    this._loaded = false;
    this._textureURL = textureURL;

    this.init();
  }

  init() {
    const THREE = this.THREE;

    const loader = new THREE.TextureLoader();
    const atlas = loader.load(
      this._textureURL,
      () => { this._loaded = true; },
      undefined,
      (err) => { console.warn('[Avatar4.0] Texture load failed:', this._textureURL, err); }
    );

    // If your renderer sets outputColorSpace, keep this minimal/defensive:
    if (atlas) {
      atlas.flipY = false;
      // atlas.colorSpace = THREE.SRGBColorSpace; // enable if your wrapper exposes it
    }

    const cyberMaterial = new THREE.MeshStandardMaterial({
      map: atlas,
      emissiveMap: atlas,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 2.5,
      metalness: 0.8,
      roughness: 0.2
    });

    // Helmet (blueprint: 0.22, 0.30, 0.25 overall; using sphere radius ~0.15)
    const headGeo = new THREE.SphereGeometry(0.15, 32, 32);
    this.helmet = new THREE.Mesh(headGeo, cyberMaterial);
    this.helmet.frustumCulled = false;

    // Torso (blueprint: 0.50m, 0.75m, 0.25m)
    const torsoGeo = new THREE.BoxGeometry(0.50, 0.75, 0.25);
    this.torso = new THREE.Mesh(torsoGeo, cyberMaterial);
    this.torso.frustumCulled = false;

    // Gloves (blueprint: 0.12m, 0.45m, 0.08m — cylinder is fine)
    const gloveGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.45, 16);
    this.handMeshes.left = new THREE.Mesh(gloveGeo, cyberMaterial);
    this.handMeshes.right = new THREE.Mesh(gloveGeo, cyberMaterial);

    // Align glove mesh length to forward arm vector
    this.handMeshes.left.rotation.x = Math.PI / 2;
    this.handMeshes.right.rotation.x = Math.PI / 2;

    // Default hidden until tracking found
    this.handMeshes.left.visible = false;
    this.handMeshes.right.visible = false;

    this.meshGroup.add(this.helmet, this.torso, this.handMeshes.left, this.handMeshes.right);

    // Add to scene now
    this.scene.add(this.meshGroup);

    console.log('✅ Update 4.0: CyberAvatar initialized (Helmet + Torso + Gloves).');
  }

  update(frame, refSpace, camera = this.camera) {
    if (!frame || !refSpace || !camera) return;

    // 1) Helmet follows camera pose
    this.helmet.position.copy(camera.position);
    this.helmet.quaternion.copy(camera.quaternion);

    // 2) Torso: position below head, yaw-locked to head
    // Place torso center ~0.55m below head (tweak if you want tighter)
    this.torso.position.copy(camera.position);
    this.torso.position.y -= 0.55;

    // Extract yaw only from head quaternion
    const e = new this.THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    e.x = 0;
    e.z = 0;
    this.torso.quaternion.setFromEuler(e);

    // 3) Hands-only: use XR Hand Tracking (wrist joint)
    // If no hand tracking, keep gloves hidden
    let leftSeen = false;
    let rightSeen = false;

    const session = frame.session;
    if (!session || !session.inputSources) return;

    for (const inputSource of session.inputSources) {
      if (!inputSource || !inputSource.hand) continue;

      const handed = inputSource.handedness; // 'left' or 'right'
      const wrist = inputSource.hand.get('wrist');
      if (!wrist) continue;

      const pose = frame.getJointPose(wrist, refSpace);
      if (!pose) continue;

      const mesh = (handed === 'left') ? this.handMeshes.left : this.handMeshes.right;
      if (!mesh) continue;

      // pose.transform.position is a DOMPointReadOnly-like object
      mesh.position.set(
        pose.transform.position.x,
        pose.transform.position.y,
        pose.transform.position.z
      );

      // pose.transform.orientation is a DOMPointReadOnly-like quaternion
      mesh.quaternion.set(
        pose.transform.orientation.x,
        pose.transform.orientation.y,
        pose.transform.orientation.z,
        pose.transform.orientation.w
      );

      mesh.visible = true;

      if (handed === 'left') leftSeen = true;
      if (handed === 'right') rightSeen = true;
    }

    if (!leftSeen) this.handMeshes.left.visible = false;
    if (!rightSeen) this.handMeshes.right.visible = false;
  }
      }
