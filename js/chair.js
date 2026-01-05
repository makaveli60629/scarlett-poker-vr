// js/chair.js — VIP Chairs (GLTF if available, fallback geometry if not)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

export const Chair = {
  loader: new GLTFLoader(),
  cachedGltf: null,

  // Optional: set these later if you have chair textures
  styles: {
    vip: {
      seatColor: 0x24262c,
      metalColor: 0x0b0c10,
      emissive: 0x001a14,
      emissiveIntensity: 0.35,
      roughness: 0.65,
    },
    red: {
      seatColor: 0x4a0d16,
      metalColor: 0x0b0c10,
      emissive: 0x120008,
      emissiveIntensity: 0.28,
      roughness: 0.7,
    },
  },

  // If you have a nice chair model, put it here:
  // assets/models/vip_chair.glb
  modelPath: "assets/models/vip_chair.glb",

  async _loadModel() {
    if (this.cachedGltf) return this.cachedGltf;
    return new Promise((resolve, reject) => {
      this.loader.load(
        this.modelPath,
        (gltf) => {
          this.cachedGltf = gltf;
          resolve(gltf);
        },
        undefined,
        (err) => reject(err)
      );
    });
  },

  _applyStyle(obj, styleName = "vip") {
    const s = this.styles[styleName] || this.styles.vip;

    obj.traverse((n) => {
      if (!n.isMesh) return;
      n.castShadow = true;
      n.receiveShadow = true;

      // If the model already has materials, we lightly “VIP” them
      const base = n.material && n.material.color ? n.material.color.getHex() : s.seatColor;

      n.material = new THREE.MeshStandardMaterial({
        color: base,
        roughness: s.roughness,
        metalness: 0.15,
        emissive: s.emissive,
        emissiveIntensity: s.emissiveIntensity,
      });
    });
  },

  _fallbackChair(styleName = "vip") {
    const s = this.styles[styleName] || this.styles.vip;

    const g = new THREE.Group();
    g.name = "VIPChair_Fallback";

    const metal = new THREE.MeshStandardMaterial({
      color: s.metalColor,
      roughness: 0.55,
      metalness: 0.65,
      emissive: 0x000000,
    });

    const seatMat = new THREE.MeshStandardMaterial({
      color: s.seatColor,
      roughness: s.roughness,
      metalness: 0.05,
      emissive: s.emissive,
      emissiveIntensity: s.emissiveIntensity,
    });

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), seatMat);
    seat.position.set(0, 0.48, 0);
    seat.castShadow = true;
    seat.receiveShadow = true;

    // Back
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.08), seatMat);
    back.position.set(0, 0.80, -0.235);
    back.castShadow = true;
    back.receiveShadow = true;

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.48, 10);
    const legOffsets = [
      [-0.23, 0.24, -0.23],
      [ 0.23, 0.24, -0.23],
      [-0.23, 0.24,  0.23],
      [ 0.23, 0.24,  0.23],
    ];
    for (const [x, y, z] of legOffsets) {
      const leg = new THREE.Mesh(legGeo, metal);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      leg.receiveShadow = true;
      g.add(leg);
    }

    // Foot ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.02, 10, 42),
      metal
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.08, 0);
    ring.castShadow = true;
    ring.receiveShadow = true;

    g.add(seat, back, ring);
    return g;
  },

  async make(styleName = "vip") {
    try {
      const gltf = await this._loadModel();
      const obj = gltf.scene.clone(true);
      obj.name = "VIPChair_Model";
      obj.scale.setScalar(1.0);
      this._applyStyle(obj, styleName);
      return obj;
    } catch (e) {
      console.warn("Chair model missing — using fallback chair.", e);
      return this._fallbackChair(styleName);
    }
  },

  // Place chairs in a ring around a center
  async placeRing(scene, center, radius = 3.35, count = 8, styleName = "vip") {
    const group = new THREE.Group();
    group.name = "VIPChairsGroup";

    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;

      const chair = await this.make(styleName);

      const x = center.x + Math.cos(a) * radius;
      const z = center.z + Math.sin(a) * radius;
      chair.position.set(x, 0, z);

      // Face toward table center
      chair.lookAt(new THREE.Vector3(center.x, 0.75, center.z));
      chair.position.y = 0; // floor aligned

      group.add(chair);
    }

    scene.add(group);
    return group;
  },
};
