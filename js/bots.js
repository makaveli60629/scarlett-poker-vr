// /js/bots.js — Scarlett VR Poker Bots (seated + lobby walkers + shirt + name tags + chip stacks)
// ✅ NO three import — THREE is passed in.

export const Bots = {
  bots: [],
  seats: [],
  lobbyZone: null,
  tableFocus: null,
  chipsBySeat: [],
  turnRingBySeat: [],
  _t: 0,

  init({ THREE, scene, getSeats, getLobbyZone, tableFocus }) {
    this.seats = getSeats();
    this.lobbyZone = getLobbyZone();
    this.tableFocus = tableFocus;
    this.bots = [];
    this.chipsBySeat = [];
    this.turnRingBySeat = [];
    this._t = 0;

    const texLoader = new THREE.TextureLoader();
    let shirtTex = null;
    try {
      shirtTex = texLoader.load("assets/textures/shirt_diffuse.png", (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
      }, undefined, () => {});
    } catch {}

    const headMat = new THREE.MeshStandardMaterial({ color: 0xf2d6c9, roughness: 0.85 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 1.0 });

    const mkNameTag = (name) => {
      const c = document.createElement("canvas");
      c.width = 512; c.height = 256;
      const ctx = c.getContext("2d");
      ctx.clearRect(0,0,c.width,c.height);
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(30, 60, 452, 140);
      ctx.strokeStyle = "rgba(180,107,255,0.85)";
      ctx.lineWidth = 8;
      ctx.strokeRect(30, 60, 452, 140);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 64px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(name, 256, 130);

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), mat);
      plane.renderOrder = 9999;
      return plane;
    };

    const mkChipStack = () => {
      const g = new THREE.Group();
      const chipMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.0 });
      for (let i = 0; i < 12; i++) {
        const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 18), chipMat);
        chip.position.y = i * 0.021;
        chip.rotation.y = (i * 0.4) % Math.PI;
        g.add(chip);
      }
      return g;
    };

    const mkTurnRing = () => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.18, 0.26, 28),
        new THREE.MeshBasicMaterial({ color: 0xb46bff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      return ring;
    };

    const makeBot = (i) => {
      const g = new THREE.Group();

      const shirtMat = new THREE.MeshStandardMaterial({
        color: i % 2 ? 0x2bd7ff : 0xff2bd6,
        map: shirtTex || null,
        roughness: 0.95,
        metalness: 0.0
      });

      // torso (shirt-friendly)
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.20, 0.72, 18, 1, true),
        shirtMat
      );
      torso.position.y = 0.92;
      g.add(torso);

      // shoulders
      const sL = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 14), shirtMat);
      const sR = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 14), shirtMat);
      sL.position.set(-0.25, 1.18, 0.02);
      sR.position.set( 0.25, 1.18, 0.02);
      g.add(sL, sR);

      // head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), headMat);
      head.position.y = 1.42;
      g.add(head);

      // hips
      const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.22, 14), pantsMat);
      hips.position.y = 0.55;
      g.add(hips);

      // name tag
      const tag = mkNameTag(`BOT ${i+1}`);
      tag.position.set(0, 1.85, 0);
      g.add(tag);

      g.userData.bot = { id: i, seated: false, target: null, seatIndex: -1 };
      scene.add(g);
      return g;
    };

    for (let i = 0; i < 8; i++) this.bots.push(makeBot(i));

    // seat 6, lobby 2
    for (let i = 0; i < this.bots.length; i++) {
      const b = this.bots[i];
      if (i < 6) {
        const s = this.seats[i];
        b.position.set(s.position.x, 0, s.position.z);
        b.rotation.y = s.yaw;
        b.userData.bot.seated = true;
        b.userData.bot.seatIndex = i;

        // chip stack on table (in front of each seat)
        const chip = mkChipStack();
        const dirToTable = new THREE.Vector3(this.tableFocus.x - s.position.x, 0, this.tableFocus.z - s.position.z).normalize();
        const chipPos = new THREE.Vector3(
          s.position.x + dirToTable.x * 0.55,
          1.02,
          s.position.z + dirToTable.z * 0.55
        );
        chip.position.copy(chipPos);
        scene.add(chip);
        this.chipsBySeat[i] = chip;

        // turn ring on felt
        const tr = mkTurnRing();
        tr.position.set(chipPos.x, 1.03, chipPos.z);
        scene.add(tr);
        this.turnRingBySeat[i] = tr;
      } else {
        b.userData.bot.seated = false;
        b.position.set((Math.random() * 10) - 5, 0, 9 + Math.random() * 3);
        b.userData.bot.target = b.position.clone();
      }
    }
  },

  setTurn(seatIndex) {
    for (let i = 0; i < this.turnRingBySeat.length; i++) {
      const r = this.turnRingBySeat[i];
      if (!r) continue;
      r.visible = (i === seatIndex);
    }
  },

  update(dt) {
    this._t += dt;

    // lobby walkers
    for (const b of this.bots) {
      const d = b.userData.bot;
      if (d.seated) continue;

      if (!d.target || b.position.distanceTo(d.target) < 0.2) {
        const z = THREE.MathUtils.lerp(this.lobbyZone.min.z, this.lobbyZone.max.z, Math.random());
        const x = THREE.MathUtils.lerp(this.lobbyZone.min.x, this.lobbyZone.max.x, Math.random());
        d.target = new THREE.Vector3(x, 0, z);
      }

      const dir = d.target.clone().sub(b.position);
      dir.y = 0;
      const dist = dir.length();
      if (dist > 0.001) {
        dir.normalize();
        b.position.addScaledVector(dir, dt * 0.7);
        b.lookAt(d.target.x, b.position.y, d.target.z);
      }
    }
  }
};
