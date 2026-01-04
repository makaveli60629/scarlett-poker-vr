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
    scene.fog = new THREE.Fog(0x07080b, 6, 65);

    // ===== FLOOR =====
    const floorMat = this.safeMat("carpet_red.jpg", 0x240a12);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 24), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    // ===== WALLS (solid) =====
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
    mkWall(34.6, 3.4, 0.7, 0, -12.25, 0);
    mkWall(34.6, 3.4, 0.7, 0,  12.25, 0);
    mkWall(24.6, 3.4, 0.7, -17.25, 0, Math.PI/2);
    mkWall(24.6, 3.4, 0.7,  17.25, 0, Math.PI/2);

    // FIX: interior store barrier (prevents “walking through wall into store”)
    // Store zone: right side. We make a “divider wall” with a doorway gap.
    // Divider across z=6.5, gap around x=11
    const dividerH = 3.0;
    const dividerD = 0.65;

    // left piece
    const d1 = new THREE.Mesh(new THREE.BoxGeometry(14.0, dividerH, dividerD), wallMat);
    d1.position.set(3.0, dividerH/2, 6.5);
    d1.castShadow = true; d1.receiveShadow = true;
    this.group.add(d1); this.colliders.push(d1);

    // right piece
    const d2 = new THREE.Mesh(new THREE.BoxGeometry(7.0, dividerH, dividerD), wallMat);
    d2.position.set(15.0, dividerH/2, 6.5);
    d2.castShadow = true; d2.receiveShadow = true;
    this.group.add(d2); this.colliders.push(d2);

    // doorway caps (stops slipping through seam)
    const capMat = new THREE.MeshStandardMaterial({ color: 0x0f1018, roughness: 0.95 });
    const cap1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, dividerH, 1.2), capMat);
    cap1.position.set(11.2, dividerH/2, 6.5);
    this.group.add(cap1); this.colliders.push(cap1);

    // ===== TRIM / PILLARS =====
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xC9A24D, metalness: 0.85, roughness: 0.22 });
    const pillarGeo = new THREE.BoxGeometry(0.6, 3.4, 0.6);
    const corners = [[-16.9,-11.9],[16.9,-11.9],[-16.9,11.9],[16.9,11.9]];
    for (const [x,z] of corners) {
      const p = new THREE.Mesh(pillarGeo, goldMat);
      p.position.set(x, 1.7, z);
      p.castShadow = true;
      this.group.add(p);
      this.colliders.push(p);
    }

    // ===== CEILING =====
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 24),
      new THREE.MeshStandardMaterial({ color: 0x0b0c12, roughness: 1.0, side: THREE.DoubleSide })
    );
    ceiling.rotation.x = Math.PI/2;
    ceiling.position.y = 3.45;
    this.group.add(ceiling);

    // ===== LIGHTING (more luxury) =====
    scene.add(new THREE.AmbientLight(0xffffff, 0.60));

    const dir = new THREE.DirectionalLight(0xffffff, 1.35);
    dir.position.set(8, 10, 6);
    dir.castShadow = true;
    scene.add(dir);

    // extra corner spotlights
    const spots = [
      [-12, 3.1, -8], [12, 3.1, -8],
      [-12, 3.1,  8], [12, 3.1,  8]
    ];
    for (const [x,y,z] of spots) {
      const s = new THREE.SpotLight(0xfff2cc, 1.25, 30, Math.PI/5, 0.25, 1.0);
      s.position.set(x,y,z);
      s.target.position.set(0,0,0);
      s.castShadow = true;
      scene.add(s);
      scene.add(s.target);
    }

    // chandelier discs across center
    const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x111219, roughness: 0.55, metalness: 0.3 });
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.55 });
    for (let i = -1; i <= 1; i++) {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.10, 24), fixtureMat);
      f.position.set(i*6.0, 3.2, 0);
      this.group.add(f);

      const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.54, 24), lampMat);
      lamp.rotation.x = -Math.PI/2;
      lamp.position.set(i*6.0, 3.14, 0);
      this.group.add(lamp);

      const light = new THREE.PointLight(0xfff2cc, 1.55, 24);
      light.position.set(i*6.0, 2.85, 0);
      scene.add(light);
    }

    // ===== TELEPORT MACHINES (visible) =====
    // Lobby telepad (left)
    this.interactables.push(TeleportMachine.build(scene, -12, 0));
    // Store telepad (right)
    this.interactables.push(TeleportMachine.build(scene, 12, 8));
    // Poker spectator telepad (near table)
    this.interactables.push(TeleportMachine.build(scene, 0, -6));

    // ===== LOGO WALL (big back wall sign) =====
    const logo = this._makeLogoSign();
    logo.position.set(0, 1.9, -11.85);
    logo.rotation.y = Math.PI;
    this.group.add(logo);

    // ===== FURNITURE PACK (simple but nice) =====
    this._addSofasAndPlants();
    this._addFrames();
    this._addFountain(scene);

    return this.group;
  },

  _makeLogoSign() {
    // Canvas logo so you don’t need an image file.
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // glass background
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // neon borders
    ctx.strokeStyle = "rgba(0,255,170,0.85)";
    ctx.lineWidth = 20;
    ctx.strokeRect(30,30,canvas.width-60,canvas.height-60);

    ctx.strokeStyle = "rgba(201,162,77,0.85)";
    ctx.lineWidth = 12;
    ctx.strokeRect(70,70,canvas.width-140,canvas.height-140);

    // text
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.font = "bold 140px system-ui";
    ctx.fillText("SCARLETT POKER VR", canvas.width/2, 220);

    ctx.fillStyle = "rgba(255,80,200,0.92)";
    ctx.font = "bold 96px system-ui";
    ctx.fillText("TEAM NOVA CASINO LOBBY", canvas.width/2, 355);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0x101018,
      emissiveIntensity: 0.65,
      transparent: true
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 2.6), mat);
    mesh.castShadow = true;
    return mesh;
  },

  _addSofasAndPlants() {
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x15161d, roughness: 0.85 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xC9A24D, metalness: 0.8, roughness: 0.25 });

    const mkSofa = (x,z,ry=0) => {
      const g = new THREE.Group();
      g.position.set(x,0,z);
      g.rotation.y = ry;

      const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 0.85), sofaMat);
      base.position.y = 0.25; base.castShadow = true;
      g.add(base);

      const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.65, 0.20), sofaMat);
      back.position.set(0, 0.75, -0.33); back.castShadow = true;
      g.add(back);

      const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.55, 0.85), sofaMat);
      arm1.position.set(-1.1, 0.55, 0); arm1.castShadow = true;
      const arm2 = arm1.clone(); arm2.position.x = 1.1;
      g.add(arm1, arm2);

      // gold trim strip
      const trim = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.05, 0.90), trimMat);
      trim.position.y = 0.48;
      g.add(trim);

      this.group.add(g);

      // collider box so you can’t walk through
      const col = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.2, 0.95), new THREE.MeshBasicMaterial({ transparent:true, opacity:0 }));
      col.position.set(x, 0.6, z);
      col.rotation.y = ry;
      this.group.add(col);
      this.colliders.push(col);
    };

    const mkPlant = (x,z) => {
      const potMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.9 });
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x0c6b3f, roughness: 0.8 });

      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.40, 18), potMat);
      pot.position.set(x, 0.20, z); pot.castShadow = true;
      this.group.add(pot);

      const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.40, 14, 14), leafMat);
      leaves.position.set(x, 0.72, z); leaves.castShadow = true;
      this.group.add(leaves);

      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.40, 1.4, 12), new THREE.MeshBasicMaterial({ transparent:true, opacity:0 }));
      col.position.set(x, 0.7, z);
      this.group.add(col);
      this.colliders.push(col);
    };

    // lobby seating
    mkSofa(-9, -6, 0.35);
    mkSofa(-11, -3.2, 1.2);
    mkSofa( 9, -6, -0.35);
    mkSofa( 11, -3.2, -1.2);

    mkPlant(-15.5, -10.5);
    mkPlant( 15.5, -10.5);
    mkPlant(-15.5,  10.5);
    mkPlant( 15.5,  10.5);
  },

  _addFrames() {
    // simple frames (you can swap later with casino_art textures)
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.9 });
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x111222, roughness: 0.95 });

    const mkFrame = (x,y,z,ry) => {
      const g = new THREE.Group();
      g.position.set(x,y,z);
      g.rotation.y = ry;

      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.1, 0.06), frameMat);
      frame.castShadow = true;
      g.add(frame);

      const inner = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.95, 0.02), innerMat);
      inner.position.z = 0.04;
      g.add(inner);

      this.group.add(g);

      // collider so you can’t clip through it
      const col = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.3), new THREE.MeshBasicMaterial({ transparent:true, opacity:0 }));
      col.position.copy(g.position);
      col.rotation.y = ry;
      this.group.add(col);
      this.colliders.push(col);
    };

    mkFrame(-16.9, 1.8, -2, Math.PI/2);
    mkFrame( 16.9, 1.8, -2, -Math.PI/2);
    mkFrame(-16.9, 1.8,  4, Math.PI/2);
    mkFrame( 16.9, 1.8,  4, -Math.PI/2);
  },

  _addFountain(scene) {
    // simple fountain centerpiece
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f1018, roughness: 0.85 });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x00aaff, emissive: 0x003355, emissiveIntensity: 0.9,
      transparent: true, opacity: 0.7, roughness: 0.25
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.35, 28), baseMat);
    base.position.set(0, 0.18, -2.0);
    base.castShadow = true;
    base.receiveShadow = true;
    this.group.add(base);

    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.22, 28), baseMat);
    bowl.position.set(0, 0.45, -2.0);
    bowl.castShadow = true;
    this.group.add(bowl);

    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.08, 28), waterMat);
    water.position.set(0, 0.55, -2.0);
    this.group.add(water);

    const glow = new THREE.PointLight(0x66ccff, 1.25, 10);
    glow.position.set(0, 1.1, -2.0);
    scene.add(glow);

    // collider so you can’t walk through it
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 1.6, 16), new THREE.MeshBasicMaterial({ transparent:true, opacity:0 }));
    col.position.set(0, 0.8, -2.0);
    this.group.add(col);
    this.colliders.push(col);
  }
};
