import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { TeleportMachine } from "./teleport_machine.js";

export const World = {
  group: null,
  colliders: [],
  interactables: [],
  textureLoader: new THREE.TextureLoader(),

  safeMat(file, fallbackColor = 0x333344) {
    // GitHub Pages safe loader — if missing, still renders
    try {
      const tex = this.textureLoader.load(`./assets/textures/${file}`);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2,2);
      return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
    } catch {
      return new THREE.MeshStandardMaterial({ color: fallbackColor, roughness: 0.95 });
    }
  },

  build(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    scene.background = new THREE.Color(0x07080b);
    scene.fog = new THREE.Fog(0x07080b, 6, 55);

    // FLOOR
    const floorMat = this.safeMat("carpet_red.jpg", 0x240a12);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 24), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    // WALLS (thick boxes = solid)
    const wallMat = this.safeMat("wall_purple.jpg", 0x2a2a3b);
    const mkWall = (w, h, d, x, z, ry) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      wall.position.set(x, h/2, z);
      wall.rotation.y = ry;
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.group.add(wall);
      this.colliders.push(wall);
      return wall;
    };

    // IMPORTANT: thickness is 0.6 so you can’t slip through
    mkWall(34.4, 3.4, 0.6, 0, -12.2, 0);
    mkWall(34.4, 3.4, 0.6, 0,  12.2, 0);
    mkWall(24.4, 3.4, 0.6, -17.2, 0, Math.PI/2);
    mkWall(24.4, 3.4, 0.6,  17.2, 0, Math.PI/2);

    // CORNER PILLARS/TRIM (also colliders)
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xC9A24D, metalness: 0.8, roughness: 0.25 });
    const pillarGeo = new THREE.BoxGeometry(0.55, 3.4, 0.55);
    const corners = [
      [-16.9, -11.9], [16.9, -11.9], [-16.9, 11.9], [16.9, 11.9]
    ];
    for (const [x,z] of corners) {
      const p = new THREE.Mesh(pillarGeo, goldMat);
      p.position.set(x, 1.7, z);
      p.castShadow = true;
      this.group.add(p);
      this.colliders.push(p);
    }

    // CEILING
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 24),
      new THREE.MeshStandardMaterial({ color: 0x0b0c12, roughness: 1.0, side: THREE.DoubleSide })
    );
    ceiling.rotation.x = Math.PI/2;
    ceiling.position.y = 3.45;
    this.group.add(ceiling);

    // LUXURY LIGHTS (fixtures)
    const amb = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(amb);

    const dir = new THREE.DirectionalLight(0xffffff, 1.25);
    dir.position.set(8, 10, 6);
    dir.castShadow = true;
    scene.add(dir);

    // chandelier discs
    const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x111219, roughness: 0.55, metalness: 0.3 });
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.4 });
    for (let i = -1; i <= 1; i++) {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.10, 24), fixtureMat);
      f.position.set(i*6.0, 3.2, 0);
      this.group.add(f);

      const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.48, 24), lampMat);
      lamp.rotation.x = -Math.PI/2;
      lamp.position.set(i*6.0, 3.14, 0);
      this.group.add(lamp);

      const light = new THREE.PointLight(0xfff2cc, 1.35, 22);
      light.position.set(i*6.0, 2.85, 0);
      scene.add(light);
    }

    // TELEPORT MACHINES (visible devices)
    const m1 = TeleportMachine.build(scene, -12, 0);
    const m2 = TeleportMachine.build(scene,  12, 0);
    this.interactables.push(m1, m2);

    return this.group;
  }
};
