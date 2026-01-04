import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { TeleportMachine } from "./teleport_machine.js";

export const World = {
  group: null,
  colliders: [],
  interactables: [],
  textureLoader: new THREE.TextureLoader(),

  safeMat(file, fallbackColor = 0x333344) {
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
    scene.fog = new THREE.Fog(0x07080b, 6, 70);

    // FLOOR
    const floorMat = this.safeMat("carpet_red.jpg", 0x240a12);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 26), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    // WALLS
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

    // Outer box
    mkWall(36.6, 3.4, 0.7, 0, -13.25, 0);
    mkWall(36.6, 3.4, 0.7, 0,  13.25, 0);
    mkWall(26.6, 3.4, 0.7, -18.25, 0, Math.PI/2);
    mkWall(26.6, 3.4, 0.7,  18.25, 0, Math.PI/2);

    // ✅ STORE DIVIDER (moved forward to make store area deeper + safer spawn)
    // Divider line moved from z=6.5 -> z=4.8 so store area (z>4.8) is bigger and cleaner.
    const dividerH = 3.0;
    const dividerD = 0.65;
    const dividerZ = 4.8;

    // doorway gap centered near x=13 (store entry)
    const gapCenterX = 13.0;
    const gapWidth = 3.2;

    // left segment
    const leftWidth = (gapCenterX - gapWidth/2) - (-18.0);
    const leftCenterX = (-18.0 + (gapCenterX - gapWidth/2)) / 2;
    const d1 = new THREE.Mesh(new THREE.BoxGeometry(leftWidth, dividerH, dividerD), wallMat);
    d1.position.set(leftCenterX, dividerH/2, dividerZ);
    d1.castShadow = true; d1.receiveShadow = true;
    this.group.add(d1); this.colliders.push(d1);

    // right segment
    const rightWidth = (18.0) - (gapCenterX + gapWidth/2);
    const rightCenterX = ((gapCenterX + gapWidth/2) + 18.0) / 2;
    const d2 = new THREE.Mesh(new THREE.BoxGeometry(rightWidth, dividerH, dividerD), wallMat);
    d2.position.set(rightCenterX, dividerH/2, dividerZ);
    d2.castShadow = true; d2.receiveShadow = true;
    this.group.add(d2); this.colliders.push(d2);

    // doorway caps (stop seam slipping)
    const capMat = new THREE.MeshStandardMaterial({ color: 0x0f1018, roughness: 0.95 });
    const cap1 = new THREE.Mesh(new THREE.BoxGeometry(0.85, dividerH, 1.4), capMat);
    cap1.position.set(gapCenterX - gapWidth/2, dividerH/2, dividerZ);
    this.group.add(cap1); this.colliders.push(cap1);

    const cap2 = new THREE.Mesh(new THREE.BoxGeometry(0.85, dividerH, 1.4), capMat);
    cap2.position.set(gapCenterX + gapWidth/2, dividerH/2, dividerZ);
    this.group.add(cap2); this.colliders.push(cap2);

    // TRIM / PILLARS
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xC9A24D, metalness: 0.85, roughness: 0.22 });
    const pillarGeo = new THREE.BoxGeometry(0.6, 3.4, 0.6);
    const corners = [[-17.9,-12.8],[17.9,-12.8],[-17.9,12.8],[17.9,12.8]];
    for (const [x,z] of corners) {
      const p = new THREE.Mesh(pillarGeo, goldMat);
      p.position.set(x, 1.7, z);
      p.castShadow = true;
      this.group.add(p);
      this.colliders.push(p);
    }

    // CEILING
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 26),
      new THREE.MeshStandardMaterial({ color: 0x0b0c12, roughness: 1.0, side: THREE.DoubleSide })
    );
    ceiling.rotation.x = Math.PI/2;
    ceiling.position.y = 3.45;
    this.group.add(ceiling);

    // LIGHTING
    scene.add(new THREE.AmbientLight(0xffffff, 0.72));

    const dir = new THREE.DirectionalLight(0xffffff, 1.55);
    dir.position.set(8, 10, 6);
    dir.castShadow = true;
    scene.add(dir);

    // Lobby spotlights
    const spots = [
      [-12, 3.1, -8], [12, 3.1, -8],
      [-12, 3.1,  0], [12, 3.1,  0],
    ];
    for (const [x,y,z] of spots) {
      const s = new THREE.SpotLight(0xfff2cc, 1.35, 32, Math.PI/5, 0.25, 1.0);
      s.position.set(x,y,z);
      s.target.position.set(0,0,0);
      s.castShadow = true;
      scene.add(s);
      scene.add(s.target);
    }

    // ✅ Extra STORE lighting (brighter store)
    const storeLights = [
      [13.5, 2.9, 10.5],
      [16.0, 2.9,  9.0],
      [11.0, 2.9,  9.0],
    ];
    for (const [x,y,z] of storeLights) {
      const p = new THREE.PointLight(0xffffff, 1.35, 18);
      p.position.set(x,y,z);
      scene.add(p);
    }

    // Teleport pads
    this.interactables.push(TeleportMachine.build(scene, -12, 0));
    this.interactables.push(TeleportMachine.build(scene,  13.5, 9.5));
    this.interactables.push(TeleportMachine.build(scene,  0, -6));

    // Simple logo wall
    const logo = this._makeLogoSign();
    logo.position.set(0, 1.9, -12.85);
    logo.rotation.y = Math.PI;
    this.group.add(logo);

    return this.group;
  },

  _makeLogoSign() {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.strokeStyle = "rgba(0,255,170,0.85)";
    ctx.lineWidth = 20;
    ctx.strokeRect(30,30,canvas.width-60,canvas.height-60);

    ctx.strokeStyle = "rgba(201,162,77,0.85)";
    ctx.lineWidth = 12;
    ctx.strokeRect(70,70,canvas.width-140,canvas.height-140);

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.font = "bold 140px system-ui";
    ctx.fillText("SCARLETT POKER VR", canvas.width/2, 220);

    ctx.fillStyle = "rgba(255,80,200,0.92)";
    ctx.font = "bold 96px system-ui";
    ctx.fillText("TEAM NOVA", canvas.width/2, 355);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0x101018,
      emissiveIntensity: 0.65,
      transparent: true
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(11.2, 2.7), mat);
    mesh.castShadow = true;
    return mesh;
  }
};
