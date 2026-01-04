import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Bots = {
  group: null,
  seated: [],
  walkers: [],
  nameSprites: [],
  t: 0,

  build(scene) {
    this.group = new THREE.Group();
    this.group.position.set(0, 0, 0);

    const mkBot = (name, color = 0x6699ff) => {
      const g = new THREE.Group();

      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.16, 0.38, 8, 16),
        new THREE.MeshStandardMaterial({ color, roughness: 0.85 })
      );
      body.position.y = 0.62;
      body.castShadow = true;
      g.add(body);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.9 })
      );
      head.position.y = 0.92;
      head.castShadow = true;
      g.add(head);

      const badge = new THREE.Mesh(
        new THREE.CircleGeometry(0.06, 20),
        new THREE.MeshStandardMaterial({ color: 0xC9A24D, metalness: 0.8, roughness: 0.25 })
      );
      badge.position.set(0, 0.78, 0.165);
      g.add(badge);

      const tag = this._makeNameTag(`${name}\nRANK: 1`);
      tag.position.set(0, 1.18, 0);
      g.add(tag);

      return g;
    };

    // 6 seated bots around table
    const seats = [
      { x:  2.05, z:  0.0 },
      { x:  1.1,  z:  1.35 },
      { x: -1.1,  z:  1.35 },
      { x: -2.05, z:  0.0 },
      { x: -1.1,  z: -1.35 },
      { x:  1.1,  z: -1.35 },
    ];

    const names = ["NovaBot", "Blue", "DealerDan", "StackKing", "LuckyAce", "RiverRat"];
    for (let i = 0; i < 6; i++) {
      const b = mkBot(names[i], 0x66aaff + (i * 1200));
      b.position.set(seats[i].x, 0, seats[i].z);
      b.lookAt(0, 0.75, 0);
      this.group.add(b);
      this.seated.push(b);
    }

    // 2 walkers
    const w1 = mkBot("WalkerOne", 0x55ffaa);
    const w2 = mkBot("WalkerTwo", 0xff55aa);
    w1.position.set(-6, 0, 6);
    w2.position.set(-8, 0, -6);
    this.group.add(w1, w2);
    this.walkers.push({ obj: w1, phase: 0.0, radius: 5.0 });
    this.walkers.push({ obj: w2, phase: 1.7, radius: 6.0 });

    scene.add(this.group);
  },

  update(dt) {
    this.t += dt;

    // walkers circle paths
    for (const w of this.walkers) {
      const a = this.t * 0.35 + w.phase;
      const x = Math.cos(a) * w.radius;
      const z = Math.sin(a) * (w.radius * 0.7);
      w.obj.position.x = x;
      w.obj.position.z = z;
      w.obj.lookAt(Math.cos(a + 0.2) * w.radius, 0.6, Math.sin(a + 0.2) * (w.radius * 0.7));
    }
  },

  _makeNameTag(text) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0,0,c.width,c.height);

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 6;
    ctx.strokeRect(10,10,c.width-20,c.height-20);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 48px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const lines = String(text).split("\n");
    const y0 = c.height/2 - (lines.length-1)*28;
    lines.forEach((ln, i) => ctx.fillText(ln, c.width/2, y0 + i*56));

    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(0.9, 0.45, 1);
    spr.center.set(0.5, 0.0);
    // IMPORTANT: keep tag upright (no weird flipping)
    spr.material.depthTest = true;
    return spr;
  }
};
