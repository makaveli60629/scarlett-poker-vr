import * as THREE from "three";
import { TextureBank } from "./textures.js";
import { registerCollider } from "./state.js";

export const World = {
  build(scene) {
    // Always visible baseline (no black room)
    scene.fog = new THREE.Fog(0x05060a, 6, 45);

    // ---------- Materials (texture safe) ----------
    // Use URLs if you have them; otherwise fallback colors are used automatically.
    const mats = {
      floor: TextureBank.getFallbackMaterial(0x1f1f1f, 1.0, 0.0),
      wall: TextureBank.getFallbackMaterial(0x2a2a2a, 0.95, 0.0),
      trimGlow: new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.2,
        roughness: 0.4,
        metalness: 0.2
      }),
      couch: TextureBank.getFallbackMaterial(0x444a52, 0.9, 0.0),
      wood: TextureBank.getFallbackMaterial(0x3b2b1f, 0.85, 0.0),
      plant: TextureBank.getFallbackMaterial(0x2e7d32, 0.9, 0.0),
      pot: TextureBank.getFallbackMaterial(0x3a3a3a, 0.95, 0.0),
      water: new THREE.MeshStandardMaterial({
        color: 0x2266ff,
        transparent: true,
        opacity: 0.55,
        roughness: 0.25,
        metalness: 0.05
      }),
      stone: TextureBank.getFallbackMaterial(0x555555, 0.95, 0.0),
    };

    // ---------- Main lobby shell (SOLID) ----------
    const lobby = this._buildRoomShell({
      name: "LobbyRoom",
      w: 18,
      h: 4,
      d: 18,
      floorMat: mats.floor,
      wallMat: mats.wall,
      glowMat: mats.trimGlow
    });
    lobby.position.set(0, 0, 0);
    scene.add(lobby);

    // ---------- Decor + furniture ----------
    this._addLobbyFurniture(scene, mats);

    // ---------- Accent lights ----------
    this._addRoomLighting(scene);
  },

  _buildRoomShell({ name, w, h, d, floorMat, wallMat, glowMat }) {
    const group = new THREE.Group();
    group.name = name;

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = `${name}_Floor`;
    group.add(floor);

    // Ceiling (optional but helps feel like a real room)
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w, d), wallMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = h;
    ceiling.name = `${name}_Ceiling`;
    group.add(ceiling);

    // Walls (box-like, with thickness for “solid” feel)
    const thick = 0.25;
    const halfW = w / 2;
    const halfD = d / 2;

    const wallGeoX = new THREE.BoxGeometry(w, h, thick);
    const wallGeoZ = new THREE.BoxGeometry(thick, h, d);

    const wallN = new THREE.Mesh(wallGeoX, wallMat);
    wallN.position.set(0, h / 2, -halfD);
    wallN.name = `${name}_Wall_N`;
    group.add(wallN);

    const wallS = new THREE.Mesh(wallGeoX, wallMat);
    wallS.position.set(0, h / 2, halfD);
    wallS.name = `${name}_Wall_S`;
    group.add(wallS);

    const wallW = new THREE.Mesh(wallGeoZ, wallMat);
    wallW.position.set(-halfW, h / 2, 0);
    wallW.name = `${name}_Wall_W`;
    group.add(wallW);

    const wallE = new THREE.Mesh(wallGeoZ, wallMat);
    wallE.position.set(halfW, h / 2, 0);
    wallE.name = `${name}_Wall_E`;
    group.add(wallE);

    // Register walls as colliders (future-proof)
    registerCollider(wallN);
    registerCollider(wallS);
    registerCollider(wallW);
    registerCollider(wallE);

    // Glow trim strips along edges (visual luxury)
    const glowH = 0.08;
    const glowT = 0.08;

    const glowTopN = new THREE.Mesh(new THREE.BoxGeometry(w, glowH, glowT), glowMat);
    glowTopN.position.set(0, h - 0.06, -halfD + 0.06);
    group.add(glowTopN);

    const glowTopS = new THREE.Mesh(new THREE.BoxGeometry(w, glowH, glowT), glowMat);
    glowTopS.position.set(0, h - 0.06, halfD - 0.06);
    group.add(glowTopS);

    const glowTopW = new THREE.Mesh(new THREE.BoxGeometry(glowT, glowH, d), glowMat);
    glowTopW.position.set(-halfW + 0.06, h - 0.06, 0);
    group.add(glowTopW);

    const glowTopE = new THREE.Mesh(new THREE.BoxGeometry(glowT, glowH, d), glowMat);
    glowTopE.position.set(halfW - 0.06, h - 0.06, 0);
    group.add(glowTopE);

    return group;
  },

  _addLobbyFurniture(scene, mats) {
    // --- Main couch set ---
    const couch = new THREE.Group();
    couch.name = "LobbyCouchSet";

    const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 1.1), mats.couch);
    base.position.set(0, 0.25, 0);

    const back = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.75, 0.25), mats.couch);
    back.position.set(0, 0.85, -0.42);

    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, 1.1), mats.couch);
    armL.position.set(-1.42, 0.55, 0);

    const armR = armL.clone();
    armR.position.x = 1.42;

    couch.add(base, back, armL, armR);
    couch.position.set(-5.4, 0, -3.6);
    couch.rotation.y = Math.PI / 4;
    scene.add(couch);

    // --- Coffee table ---
    const table = new THREE.Group();
    table.name = "LobbyCoffeeTable";

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.8), mats.wood);
    top.position.y = 0.55;
    table.add(top);

    const legGeo = new THREE.BoxGeometry(0.08, 0.55, 0.08);
    const legMat = mats.wood;
    const legs = [
      [-0.62, 0.275, -0.32],
      [ 0.62, 0.275, -0.32],
      [-0.62, 0.275,  0.32],
      [ 0.62, 0.275,  0.32],
    ];
    for (const [x,y,z] of legs) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, y, z);
      table.add(leg);
    }

    table.position.set(-3.8, 0, -1.8);
    table.rotation.y = Math.PI / 6;
    scene.add(table);

    // --- Indoor plants ---
    this._addPlant(scene, mats, 6.8, 0, 6.4, 0.8);
    this._addPlant(scene, mats, -6.8, 0, 6.4, 1.0);
    this._addPlant(scene, mats, 7.2, 0, -6.8, 1.1);
    this._addPlant(scene, mats, -7.2, 0, -6.8, 0.9);

    // --- Water fountain (simple luxury centerpiece) ---
    const fountain = new THREE.Group();
    fountain.name = "LobbyFountain";

    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.25, 0.4, 24), mats.stone);
    bowl.position.y = 0.2;
    fountain.add(bowl);

    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.7, 18), mats.stone);
    column.position.y = 0.75;
    fountain.add(column);

    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.18, 24), mats.water);
    water.position.y = 0.32;
    fountain.add(water);

    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 12), mats.water);
    spout.position.y = 1.05;
    fountain.add(spout);

    fountain.position.set(4.5, 0, 0.5);
    scene.add(fountain);
  },

  _addPlant(scene, mats, x, y, z, scale = 1) {
    const plant = new THREE.Group();
    plant.name = "Plant";

    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.3, 16), mats.pot);
    pot.position.y = 0.15;
    plant.add(pot);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.55, 12), mats.wood);
    stem.position.y = 0.55;
    plant.add(stem);

    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), mats.plant);
    canopy.position.y = 0.9;
    plant.add(canopy);

    // little extra leaves
    for (let i = 0; i < 3; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), mats.plant);
      leaf.position.set((Math.random() - 0.5) * 0.25, 0.78 + Math.random() * 0.18, (Math.random() - 0.5) * 0.25);
      plant.add(leaf);
    }

    plant.position.set(x, y, z);
    plant.scale.setScalar(scale);
    scene.add(plant);
  },

  _addRoomLighting(scene) {
    // Stronger, comfortable VR lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(7, 10, 5);
    scene.add(key);

    const fill = new THREE.PointLight(0x88ccff, 0.65, 30);
    fill.position.set(-5, 3, -5);
    scene.add(fill);

    const accent1 = new THREE.PointLight(0x00ffaa, 0.55, 18);
    accent1.position.set(6, 2.4, 0);
    scene.add(accent1);

    const accent2 = new THREE.PointLight(0xff66cc, 0.35, 18);
    accent2.position.set(-6, 2.4, 0);
    scene.add(accent2);
  }
};
