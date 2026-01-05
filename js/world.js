import * as THREE from "three";
import { TextureBank, Textures } from "./textures.js";

export const World = {
  build(scene) {
    scene.background = new THREE.Color(0x05060a);
    scene.fog = new THREE.Fog(0x05060a, 8, 65);

    // Lights (brighter + softer)
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.85);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(10, 16, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);

    const fill = new THREE.PointLight(0x66ccff, 0.75, 30);
    fill.position.set(-8, 3.5, -2);
    scene.add(fill);

    const warm = new THREE.PointLight(0xffcc88, 0.8, 28);
    warm.position.set(8, 3.5, 2);
    scene.add(warm);

    // Floor (marble fallback)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      TextureBank.standard({
        mapFile: Textures.FLOOR_MARBLE || null,
        color: 0x2c2c2c,
        roughness: 0.95,
        repeat: 2
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Lobby carpet zone
    const carpet = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      TextureBank.standard({
        mapFile: Textures.FLOOR_LOBBY || null,
        color: 0x1b2b1b,
        roughness: 1.0,
        repeat: 2
      })
    );
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.y = 0.01;
    scene.add(carpet);

    // Walls
    const wallMat = TextureBank.standard({
      mapFile: Textures.WALL_BRICK || null,
      color: 0x3b3b3b,
      roughness: 0.95,
      repeat: 2
    });

    const wallH = 4.0;
    const w1 = this.makeWall(0, wallH / 2, -30, 60, wallH, wallMat);
    const w2 = this.makeWall(0, wallH / 2, 30, 60, wallH, wallMat);
    const w3 = this.makeWall(-30, wallH / 2, 0, 60, wallH, wallMat, true);
    const w4 = this.makeWall(30, wallH / 2, 0, 60, wallH, wallMat, true);
    scene.add(w1, w2, w3, w4);

    // Picture frames with glowing edges
    this.addGlowingArt(scene, new THREE.Vector3(-22, 2.2, -29.8), 3.2, 1.8, Textures.CASINO_ART);
    this.addGlowingArt(scene, new THREE.Vector3( 22, 2.2, -29.8), 3.2, 1.8, Textures.CASINO_ART_2);
    this.addGlowingArt(scene, new THREE.Vector3(-22, 2.2,  29.8), 3.2, 1.8, Textures.BRAND);
    this.addGlowingArt(scene, new THREE.Vector3( 22, 2.2,  29.8), 3.2, 1.8, Textures.UI_WINNER);

    // Fountain (simple + classy)
    this.addFountain(scene, 0, 0, 0);

    // Some plants (simple)
    this.addPlant(scene, -6, 0, -6);
    this.addPlant(scene,  6, 0, -6);
    this.addPlant(scene, -6, 0,  6);
    this.addPlant(scene,  6, 0,  6);
  },

  makeWall(x, y, z, w, h, mat, rotate = false) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z);
    if (rotate) mesh.rotation.y = Math.PI / 2;
    mesh.receiveShadow = true;
    return mesh;
  },

  addGlowingArt(scene, pos, w, h, texFile) {
    const frame = new THREE.Group();
    frame.position.copy(pos);

    // art plane
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      TextureBank.standard({
        mapFile: texFile || null,
        color: 0x111111,
        roughness: 0.85,
        repeat: 1
      })
    );
    art.position.z = 0;
    frame.add(art);

    // glow border (thin box)
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.06),
      new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 1.0,
        roughness: 0.4,
        metalness: 0.0
      })
    );
    border.position.z = -0.04;
    frame.add(border);

    scene.add(frame);

    // tiny accent light near frame
    const p = new THREE.PointLight(0x00ffff, 0.45, 6);
    p.position.copy(pos).add(new THREE.Vector3(0, 0, 1.2));
    scene.add(p);
  },

  addFountain(scene, x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.7, 0.45, 32),
      TextureBank.standard({ color: 0x1e1e1e, roughness: 0.9 })
    );
    base.castShadow = true;
    base.receiveShadow = true;
    base.position.y = 0.22;
    g.add(base);

    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.25, 0.35, 32, 1, true),
      TextureBank.standard({ color: 0x2a2a2a, roughness: 0.8 })
    );
    bowl.position.y = 0.62;
    g.add(bowl);

    // water disc
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(1.08, 32),
      new THREE.MeshStandardMaterial({
        color: 0x113344,
        roughness: 0.1,
        metalness: 0.0,
        transparent: true,
        opacity: 0.85,
        emissive: 0x113344,
        emissiveIntensity: 0.35
      })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.81;
    g.add(water);

    // bubble light
    const wl = new THREE.PointLight(0x66ccff, 0.9, 10);
    wl.position.set(0, 1.1, 0);
    g.add(wl);

    scene.add(g);
  },

  addPlant(scene, x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);

    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.45, 0.45, 16),
      TextureBank.standard({ color: 0x2b1b12, roughness: 0.95 })
    );
    pot.position.y = 0.22;
    g.add(pot);

    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1e7a3a, roughness: 0.85 });
    for (let i = 0; i < 10; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), leafMat);
      leaf.position.set((Math.random() - 0.5) * 0.6, 0.65 + Math.random() * 0.6, (Math.random() - 0.5) * 0.6);
      g.add(leaf);
    }

    scene.add(g);
  }
};
