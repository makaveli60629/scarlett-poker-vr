import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export const World = {
  _texLoader: new THREE.TextureLoader(),

  // Safe texture load: never crashes if missing
  _safeTexture(path, { repeat = [1, 1], wrap = true } = {}) {
    try {
      const tex = this._texLoader.load(
        path,
        (t) => {
          if (wrap) {
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(repeat[0], repeat[1]);
          }
          t.colorSpace = THREE.SRGBColorSpace;
        },
        undefined,
        () => {
          // missing texture -> null fallback
        }
      );
      return tex;
    } catch (e) {
      return null;
    }
  },

  build(scene) {
    // HARD GUARD: this is the #1 reason your build crashes
    if (!scene || typeof scene.add !== "function") {
      throw new Error(
        `World.build(scene) expected a THREE.Scene, but got: ${Object.prototype.toString.call(scene)}`
      );
    }

    const colliders = [];
    const floorPlanes = [];

    // -------------------------
    // LIGHTING (bright enough)
    // -------------------------
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.05);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(10, 18, 8);
    scene.add(key);

    const warm = new THREE.PointLight(0xffcc88, 0.75, 60);
    warm.position.set(8, 6, 10);
    scene.add(warm);

    const cool = new THREE.PointLight(0x88bbff, 0.8, 60);
    cool.position.set(-8, 6, 10);
    scene.add(cool);

    // -------------------------
    // ROOM DIMENSIONS
    // -------------------------
    const wallH = 4;
    const thick = 0.35;
    const size = 18;

    // -------------------------
    // TEXTURES (optional)
    // -------------------------
    // If these files exist in assets/textures/, they will show.
    // If not, materials fall back to solid colors (NO CRASH).
    const carpetTex = this._safeTexture("assets/textures/lobby_carpet.jpg", {
      repeat: [4, 4],
    });
    const brickTex = this._safeTexture("assets/textures/brickwall.jpg", {
      repeat: [2, 2],
    });
    const ceilingTex = this._safeTexture("assets/textures/ceiling_dome_main.jpg", {
      repeat: [1, 1],
      wrap: false,
    });

    // -------------------------
    // FLOOR
    // -------------------------
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x2a0d15,
      roughness: 0.95,
      metalness: 0.0,
      map: carpetTex || null,
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    floor.name = "floor";
    scene.add(floor);
    floorPlanes.push(floor);

    // Optional subtle grid overlay for debug (leave on for now)
    const grid = new THREE.GridHelper(40, 40, 0x552233, 0x221018);
    grid.position.y = 0.01;
    grid.name = "debug_grid";
    scene.add(grid);

    // -------------------------
    // WALLS (SOLID + COLLIDERS)
    // -------------------------
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x2a2f3a,
      roughness: 0.9,
      metalness: 0.0,
      map: brickTex || null,
    });

    const makeWall = (w, h, d, x, y, z, name) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      m.position.set(x, y, z);
      m.name = name;
      scene.add(m);
      colliders.push(m); // store the MESH, not Box3 snapshot
      return m;
    };

    // 4 walls around lobby
    makeWall(size, wallH, thick, 0, wallH / 2, -size / 2, "wall_back");
    makeWall(size, wallH, thick, 0, wallH / 2,  size / 2, "wall_front");
    makeWall(thick, wallH, size, -size / 2, wallH / 2, 0, "wall_left");
    makeWall(thick, wallH, size,  size / 2, wallH / 2, 0, "wall_right");

    // -------------------------
    // CEILING
    // -------------------------
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x0b0c10,
      roughness: 0.95,
      metalness: 0.0,
      map: ceilingTex || null,
      side: THREE.DoubleSide,
    });

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(size, size), ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, wallH, 0);
    ceiling.name = "ceiling";
    scene.add(ceiling);

    // -------------------------
    // NEON STRIPS (visual only)
    // -------------------------
    const neonMat = new THREE.MeshBasicMaterial({ color: 0x44ccff });

    const neon1 = new THREE.Mesh(
      new THREE.BoxGeometry(size - 1.5, 0.08, 0.08),
      neonMat
    );
    neon1.position.set(0, wallH - 0.25, -size / 2 + 0.35);
    neon1.name = "neon_back";
    scene.add(neon1);

    const neon2 = neon1.clone();
    neon2.position.set(0, wallH - 0.25, size / 2 - 0.35);
    neon2.name = "neon_front";
    scene.add(neon2);

    // -------------------------
    // RETURN FOR LOCOMOTION/COLLISION
    // -------------------------
    return { colliders, floorPlanes, roomSize: size, wallH };
  },
};
