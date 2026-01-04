// js/world.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

/**
 * World: Builds lobby + store room + poker ambience.
 * IMPORTANT: Build into a parent group (worldRoot) so controllers stay aligned.
 */

export const World = {
  textureLoader: new THREE.TextureLoader(),
  blockers: [],

  safeMat(texFile, fallbackColor, opts = {}) {
    const mat = new THREE.MeshStandardMaterial({
      color: fallbackColor ?? 0x777777,
      roughness: opts.roughness ?? 0.9,
      metalness: opts.metalness ?? 0.05,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 0.0,
    });

    if (!texFile) return mat;

    const path = `assets/textures/${texFile}`;
    try {
      this.textureLoader.load(
        path,
        (tt) => {
          tt.wrapS = tt.wrapT = THREE.RepeatWrapping;
          tt.repeat.set(opts.repeatX ?? 2, opts.repeatY ?? 2);
          tt.colorSpace = THREE.SRGBColorSpace;
          mat.map = tt;
          mat.color.set(0xffffff);
          mat.needsUpdate = true;
        },
        undefined,
        () => console.warn("Texture missing:", path)
      );
    } catch (e) {
      console.warn("Texture load failed:", path, e);
    }
    return mat;
  },

  addBlockerFromMesh(mesh) {
    mesh.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(mesh);
    this.blockers.push({ min: box.min.clone(), max: box.max.clone() });
  },

  build(parent) {
    this.blockers = [];

    // Floor
    const floorMat = this.safeMat(null, 0x5b1017, { roughness: 0.95 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = "floor_lobby";
    parent.add(floor);

    // Carpet strip
    const carpetMat = this.safeMat(null, 0x141018, { roughness: 1.0 });
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), carpetMat);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.002, -3);
    carpet.receiveShadow = true;
    parent.add(carpet);

    // Ceiling
    const ceilMat = this.safeMat(null, 0x0b0c12, { roughness: 1.0 });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, 3.15, 0);
    parent.add(ceil);

    // Walls (solid)
    const wallMat = this.safeMat(null, 0x2b2d3b, { roughness: 0.95 });
    const wallH = 3.1;
    const thick = 0.25;

    const makeWall = (w, h, d, x, y, z, name) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      m.position.set(x, y, z);
      m.receiveShadow = true;
      m.name = name;
      parent.add(m);
      this.addBlockerFromMesh(m);
      return m;
    };

    makeWall(30, wallH, thick, 0, wallH / 2, -15, "wall_north");
    makeWall(30, wallH, thick, 0, wallH / 2, 15, "wall_south");
    makeWall(thick, wallH, 30, -15, wallH / 2, 0, "wall_west");
    makeWall(thick, wallH, 30, 15, wallH / 2, 0, "wall_east");

    // Pillars
    const pillarMat = this.safeMat(null, 0x1b1c26, { roughness: 0.85, metalness: 0.12 });
    const pillar = (x, z) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 3.1, 16), pillarMat);
      p.position.set(x, 1.55, z);
      p.castShadow = true;
      p.receiveShadow = true;
      parent.add(p);
      this.addBlockerFromMesh(p);
    };
    pillar(-13, -13); pillar(13, -13); pillar(-13, 13); pillar(13, 13);

    // Neon strips (visible even without textures)
    const stripMatA = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.85 });
    const stripMatB = new THREE.MeshBasicMaterial({ color: 0xff3c78, transparent: true, opacity: 0.85 });
    const strip = (x, y, z, w, d, mat) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), mat);
      s.position.set(x, y, z);
      parent.add(s);
    };
    strip(0, 2.95, 0, 26, 0.08, stripMatA);
    strip(0, 2.95, -10, 26, 0.08, stripMatB);
    strip(-10, 2.95, 0, 0.08, 26, stripMatB);
    strip(10, 2.95, 0, 0.08, 26, stripMatA);

    // Couches
    const couchMat = this.safeMat(null, 0x131418, { roughness: 1.0 });
    const makeCouch = (x, z, rotY) => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.35, 0.75), couchMat);
      base.position.y = 0.175;
      base.castShadow = true; base.receiveShadow = true;
      g.add(base);

      const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 0.2), couchMat);
      back.position.set(0, 0.62, -0.28);
      back.castShadow = true;
      g.add(back);

      g.position.set(x, 0, z);
      g.rotation.y = rotY;
      parent.add(g);

      this.addBlockerFromMesh(base);
    };
    makeCouch(-6.2, 8.8, Math.PI);
    makeCouch(6.2, 8.8, Math.PI);

    // Store floor + walls (GUARANTEED)
    const storeFloor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), this.safeMat(null, 0x0f1016, { roughness: 1.0 }));
    storeFloor.rotation.x = -Math.PI / 2;
    storeFloor.position.set(9.2, 0.003, 4.0);
    storeFloor.receiveShadow = true;
    storeFloor.name = "floor_store";
    parent.add(storeFloor);

    makeWall(10, wallH, thick, 9.2, wallH/2, -1.0, "store_wall_n");
    makeWall(10, wallH, thick, 9.2, wallH/2,  9.0, "store_wall_s");
    makeWall(thick, wallH, 10, 4.2, wallH/2, 4.0, "store_wall_w");
    makeWall(thick, wallH, 10, 14.2, wallH/2, 4.0, "store_wall_e");

    // Frames (textures optional)
    const frameMat = this.safeMat(null, 0x101018, { roughness: 0.8, metalness: 0.12 });
    const makeFrame = (x, y, z, rotY, tex) => {
      const g = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.08), frameMat);
      g.add(frame);

      const artMat = this.safeMat(tex, 0x2b2b2b, { roughness: 0.95, repeatX: 1, repeatY: 1 });
      const art = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 1.05), artMat);
      art.position.set(0, 0, 0.05);
      g.add(art);

      g.position.set(x, y, z);
      g.rotation.y = rotY;
      parent.add(g);
    };
    makeFrame(0, 1.7, -14.7, 0, "casino_art_1.jpg");
    makeFrame(-8, 1.7, -14.7, 0, "casino_art_2.jpg");

    return { floorY: 0.0, blockers: this.blockers };
  },
};
