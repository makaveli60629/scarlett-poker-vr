// /js/scarlett1/modules/avatar_manager.js
// Update 4.0 Avatar Module (WebXR-ready)
// NOTE: Native Meta Avatar fetching is Unity-centric. In WebXR we provide:
// - Placeholder avatar (instant)
// - Optional GLB fallback (if you provide a URL)
// - Hand joint binding (hands-only)

export class AvatarManager {
  constructor({ THREE, scene, rig, camera, metaAppId = null, fallbackAvatarUrl = null }) {
    this.THREE = THREE;
    this.scene = scene;
    this.rig = rig;
    this.camera = camera;

    this.metaAppId = metaAppId;
    this.fallbackAvatarUrl = fallbackAvatarUrl;

    this.mode = "loading"; // loading | world
    this.avatarRoot = null;

    this.leftHandAnchor = null;
    this.rightHandAnchor = null;

    this.ready = false;
  }

  async init({ world }) {
    // Create avatar root
    this.avatarRoot = new this.THREE.Group();
    this.avatarRoot.name = "PlayerAvatarRoot";
    this.scene.add(this.avatarRoot);

    // Placeholder body (Quest-safe)
    this._buildPlaceholderAvatar();

    // Bind to hand joints if present
    this._tryBindToHandJoints(world);

    // Future: if Meta provides a web avatar pipeline or IWSDK avatar integration, plug it here.
    // For now we stay stable and never crash.
    this.ready = true;
  }

  setMode(mode) {
    this.mode = mode;
    if (!this.avatarRoot) return;

    if (mode === "loading") {
      // Put avatar slightly in front of user like a “mirror / preview”
      this.avatarRoot.position.set(0, 0, -1.2);
      this.avatarRoot.rotation.y = Math.PI; // face user
      this.camera.add(this.avatarRoot);     // locked to view
    } else {
      // Move avatar into world space near rig (3rd-person anchor feel)
      this.camera.remove(this.avatarRoot);
      this.scene.add(this.avatarRoot);
      this.avatarRoot.position.set(this.rig.position.x, 0, this.rig.position.z);
      this.avatarRoot.rotation.y = this.rig.rotation.y;
    }
  }

  _buildPlaceholderAvatar() {
    const THREE = this.THREE;

    // Torso
    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.22, 0.55, 6, 14),
      new THREE.MeshStandardMaterial({ color: 0x1a2233, roughness: 0.6, metalness: 0.2, emissive: 0x001122, emissiveIntensity: 0.4 })
    );
    torso.position.set(0, 1.35, 0);
    this.avatarRoot.add(torso);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0x222a3a, roughness: 0.65, metalness: 0.15, emissive: 0x001122, emissiveIntensity: 0.25 })
    );
    head.position.set(0, 1.72, 0.03);
    this.avatarRoot.add(head);

    // Left / right hand anchors (we move these to joint tips if available)
    this.leftHandAnchor = new THREE.Group();
    this.rightHandAnchor = new THREE.Group();
    this.leftHandAnchor.position.set(-0.25, 1.25, 0.08);
    this.rightHandAnchor.position.set(0.25, 1.25, 0.08);
    this.avatarRoot.add(this.leftHandAnchor, this.rightHandAnchor);

    const makeHand = (color) => new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 16, 16),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.25, emissive: color, emissiveIntensity: 0.15 })
    );

    this.leftHandAnchor.add(makeHand(0x55aaff));
    this.rightHandAnchor.add(makeHand(0xff55dd));
  }

  _tryBindToHandJoints(world) {
    // Find HandInput module and read its hand objects (three.js hands have joints)
    const handMod = world.bus.mods.find(m => m?.constructor?.name === "HandInput");
    if (!handMod) return;

    this._handMod = handMod;
  }

  update({ dt, t, xrSession, phase }) {
    if (!this.ready) return;

    // Keep avatar aligned in world mode
    if (this.mode === "world") {
      this.avatarRoot.position.x = this.rig.position.x;
      this.avatarRoot.position.z = this.rig.position.z;
      this.avatarRoot.rotation.y = this.rig.rotation.y;
    }

    // If hands exist, slave anchors to index-finger-tip joints
    const hm = this._handMod;
    if (hm?.hands?.length) {
      const left = hm.hands[0];
      const right = hm.hands[1];

      this._applyJoint(left, this.leftHandAnchor);
      this._applyJoint(right, this.rightHandAnchor);
    }
  }

  _applyJoint(hand, anchor) {
    if (!hand?.joints?.["index-finger-tip"] || !anchor) return;
    const jt = hand.joints["index-finger-tip"];

    const p = new this.THREE.Vector3();
    const q = new this.THREE.Quaternion();
    jt.getWorldPosition(p);
    jt.getWorldQuaternion(q);

    // Convert world to avatarRoot local
    this.avatarRoot.worldToLocal(p);
    anchor.position.copy(p);
    anchor.quaternion.copy(q);
  }
}
