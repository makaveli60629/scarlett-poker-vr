// js/world.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

/**
 * World: builds lobby + store zone + poker zone look.
 * - Solid walls: collisions handled in main clamp + box blockers list
 * - Textures safe loader (falls back to colors if missing)
 * - Adds plants, couches, frames, ceiling, trims, neon strips
 */

export const World = {
  textureLoader: new THREE.TextureLoader(),
  blockers: [], // axis-aligned boxes { min, max }

  // Safe texture material: if missing, you still see color
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
      const t = this.textureLoader.load(
        path,
        (tt) => {
          tt.wrapS = tt.wrapT = THREE.RepeatWrapping;
          tt.repeat.set(opts.repeatX ?? 2, opts.repeatY ?? 2);
          mat.map = tt;
          mat.color.set(0xffffff);
          mat.needsUpdate = true;
        },
        undefined,
        () => {
          // missing texture -> keep fallback
          console.warn("Texture missing:", path);
        }
      );
      // allow load to swap in later
      void t;
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

  build(scene, playerGroup) {
    // Spawn position (safe open area)
    playerGroup.position.set(0, 0, 4);
    playerGroup.rotation.set(0, Math.PI, 0);

    // Background + fog
    scene.background = new THREE.Color(0x05060c);
    scene.fog = new THREE.Fog(0x05060c, 8, 55);

    // Floor (lobby)
    const floorMat = this.safeMat(null, 0x5b1017, { roughness: 0.95 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = "floor_lobby";
    scene.add(floor);

    // Carpet strip near poker
    const carpetMat = this.safeMat(null, 0x141018, { roughness: 1.0 });
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), carpetMat);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.002, -3);
    carpet.receiveShadow = true;
    scene.add(carpet);

    // Walls (solid)
    const wallMat = this.safeMat(null, 0x2b2d3b, { roughness: 0.95 });
    const wallH = 3.1;
    const thick = 0.25;

    const makeWall = (w, h, d, x, y, z, name) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      m.position.set(x, y, z);
      m.castShadow = false;
      m.receiveShadow = true;
      m.name = name;
      scene.add(m);
      this.addBlockerFromMesh(m);
      return m;
    };

    // outer box
    makeWall(30, wallH, thick, 0, wallH/2, -15, "wall_north");
    makeWall(30, wallH, thick, 0, wallH/2,  15, "wall_south");
    makeWall(thick, wallH, 30, -15, wallH/2, 0, "wall_west");
    makeWall(thick, wallH, 30,  15, wallH/2, 0, "wall_east");

    // Ceiling
    const ceilMat = this.safeMat(null, 0x0b0c12, { roughness: 1.0 });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, 3.15, 0);
    scene.add(ceil);

    // Neon strip lights
    const stripMatA = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.85 });
    const stripMatB = new THREE.MeshBasicMaterial({ color: 0xff3c78, transparent: true, opacity: 0.85 });

    const strip = (x, y, z, w, d, mat) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), mat);
      s.position.set(x, y, z);
      scene.add(s);
    };

    strip(0, 2.95, 0, 26, 0.08, stripMatA);
    strip(0, 2.95, -10, 26, 0.08, stripMatB);
    strip(-10, 2.95, 0, 0.08, 26, stripMatB);
    strip(10, 2.95, 0, 0.08, 26, stripMatA);

    // Pillars / trims
    const pillarMat = this.safeMat(null, 0x1b1c26, { roughness: 0.9, metalness: 0.1 });
    const pillar = (x, z) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 3.1, 16), pillarMat);
      p.position.set(x, 1.55, z);
      p.castShadow = true;
      p.receiveShadow = true;
      scene.add(p);
      this.addBlockerFromMesh(p);
    };
    pillar(-13, -13); pillar(13, -13); pillar(-13, 13); pillar(13, 13);

    // Simple couches
    const couchMat = this.safeMat(null, 0x131418, { roughness: 1.0 });
    const makeCouch = (x, z, rotY) => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.35, 0.75), couchMat);
      base.position.y = 0.175;
      base.castShadow = true; base.receiveShadow = true;
      g.add(base);

      const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 0.2), couchMat);
      back.position.set(0, 0.62, -0.28);
      back.castShadow = true; back.receiveShadow = true;
      g.add(back);

      g.position.set(x, 0, z);
      g.rotation.y = rotY;
      g.name = "couch";
      scene.add(g);

      // block
      this.addBlockerFromMesh(base);
      return g;
    };
    makeCouch(-6.2, 8.8, Math.PI);
    makeCouch( 6.2, 8.8, Math.PI);

    // Plants
    const plantPotMat = this.safeMat(null, 0x2a2b33, { roughness: 0.9 });
    const plantLeafMat = new THREE.MeshStandardMaterial({ color: 0x1fa155, roughness: 0.9, metalness: 0.0 });
    const plant = (x, z) => {
      const g = new THREE.Group();
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.32, 0.42, 14), plantPotMat);
      pot.position.y = 0.21;
      pot.castShadow = true; pot.receiveShadow = true;
      g.add(pot);

      for (let i = 0; i < 10; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 8), plantLeafMat);
        leaf.position.set((Math.random()-0.5)*0.18, 0.55 + Math.random()*0.2, (Math.random()-0.5)*0.18);
        leaf.rotation.y = Math.random() * Math.PI * 2;
        leaf.castShadow = true;
        g.add(leaf);
      }

      g.position.set(x, 0, z);
      g.name = "plant";
      scene.add(g);
      this.addBlockerFromMesh(pot);
    };
    plant(-10.5, -8.5);
    plant(10.5, -8.5);
    plant(-10.5,  8.5);
    plant(10.5,  8.5);

    // Picture frames (use your casino_art_1 / casino_art_2 if present)
    const frameMat = this.safeMat(null, 0x101018, { roughness: 0.8, metalness: 0.15 });
    const makeFrame = (x, y, z, rotY, tex) => {
      const g = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.08), frameMat);
      frame.position.set(0, 0, 0);
      g.add(frame);

      const artMat = this.safeMat(tex, 0x2b2b2b, { roughness: 0.95, repeatX: 1, repeatY: 1 });
      const art = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 1.05), artMat);
      art.position.set(0, 0, 0.05);
      g.add(art);

      g.position.set(x, y, z);
      g.rotation.y = rotY;
      g.name = "frame_art";
      scene.add(g);
    };
    makeFrame(0, 1.7, -14.7, 0, "casino_art_1.jpg");
    makeFrame(-8, 1.7, -14.7, 0, "casino_art_2.jpg");

    // Store "room" hint area (bigger)
    const storeFloor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), this.safeMat(null, 0x0f1016, { roughness: 1.0 }));
    storeFloor.rotation.x = -Math.PI/2;
    storeFloor.position.set(9.2, 0.003, 4.0);
    storeFloor.receiveShadow = true;
    storeFloor.name = "floor_store";
    scene.add(storeFloor);

    // Store walls (blockers)
    makeWall(10, wallH, thick, 9.2, wallH/2, -1.0, "store_wall_n");
    makeWall(10, wallH, thick, 9.2, wallH/2,  9.0, "store_wall_s");
    makeWall(thick, wallH, 10, 4.2, wallH/2, 4.0, "store_wall_w");
    makeWall(thick, wallH, 10, 14.2, wallH/2, 4.0, "store_wall_e");

    // Return useful info for main.js
    return {
      floorY: 0.0,
      blockers: this.blockers
    };
  },
};
