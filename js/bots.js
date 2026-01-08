// /js/bots.js — Scarlett Poker VR Bots v1.2 (SITTING + SUITS + LOBBY WALKERS)
// Deploy safe: no imports.

export const Bots = {
  THREE: null,
  scene: null,
  bots: [],
  seats: [],
  lobbyZone: null,
  t: 0,

  init(opts) {
    const THREE = (this.THREE = opts.THREE);
    const scene = (this.scene = opts.scene);

    this.seats = (opts.getSeats && opts.getSeats()) || [];
    this.lobbyZone = (opts.getLobbyZone && opts.getLobbyZone()) || null;

    // cleanup
    for (let i = 0; i < this.bots.length; i++) {
      try { scene.remove(this.bots[i].root); } catch (e) {}
    }
    this.bots = [];
    this.t = 0;

    // preload suit textures (your repo paths)
    const loader = new THREE.TextureLoader();
    const suitMale = loader.load("./assets/textures/avatars/suit_male_albedo.png");
    const suitFemale = loader.load("./assets/textures/avatars/suit_female_albedo.png");
    try {
      suitMale.colorSpace = THREE.SRGBColorSpace;
      suitFemale.colorSpace = THREE.SRGBColorSpace;
    } catch (e) {}

    // 4 seated bots (1..4)
    for (let i = 1; i <= 4; i++) {
      if (!this.seats[i]) continue;
      const map = (i % 2 === 0) ? suitFemale : suitMale;
      const bot = this._makeBot({ suitMap: map });
      this._seatBot(bot, this.seats[i]);
      scene.add(bot.root);
      this.bots.push(bot);
    }

    // 3 lobby walkers
    if (this.lobbyZone) {
      for (let k = 0; k < 3; k++) {
        const map = (k % 2 === 0) ? suitMale : suitFemale;
        const bot = this._makeBot({ suitMap: map });
        bot.isWalking = true;
        this._placeWalking(bot);
        scene.add(bot.root);
        this.bots.push(bot);
      }
    }

    try { console.log("[Bots] init ✅ count =", this.bots.length); } catch (e) {}
  },

  update(dt) {
    if (!this.THREE) return;
    this.t += dt;

    for (let i = 0; i < this.bots.length; i++) {
      const b = this.bots[i];

      // idle bob
      b.root.position.y = b.baseY + Math.sin(this.t * 2.0 + b.seed) * 0.01;

      // subtle head wobble
      b.head.rotation.y = Math.sin(this.t * 0.9 + b.seed) * 0.20;

      if (!b.isWalking) continue;

      // walk
      const dx = b.target.x - b.root.position.x;
      const dz = b.target.z - b.root.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 0.18) { this._placeWalking(b); continue; }

      const nx = dx / (dist || 1);
      const nz = dz / (dist || 1);

      b.root.position.x += nx * dt * 0.65;
      b.root.position.z += nz * dt * 0.65;
      b.root.rotation.y = Math.atan2(nx, nz);

      // simple step animation
      const step = Math.sin(this.t * 6.0 + b.seed) * 0.12;
      b.legL.rotation.x = step;
      b.legR.rotation.x = -step;
    }
  },

  _makeBot({ suitMap = null } = {}) {
    const THREE = this.THREE;

    const root = new THREE.Group();
    root.name = "Bot";

    const suitMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: suitMap || null,
      roughness: 0.9,
      metalness: 0.02
    });

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c7a8, roughness: 0.75 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 });

    // Rig group so root stays on FLOOR (fixes “standing on seat”)
    const rig = new THREE.Group();
    rig.name = "BotRig";
    root.add(rig);

    // torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.22), suitMat);
    torso.position.set(0, 0.92, 0);
    rig.add(torso);

    // hips
    const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.18, 12), suitMat);
    hips.position.set(0, 0.70, 0);
    rig.add(hips);

    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), skinMat);
    head.position.set(0, 1.18, 0.03);
    rig.add(head);

    // legs anchored from hips down toward floor
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.48, 10), legMat);
    legL.position.set(-0.08, 0.40, 0.02);
    rig.add(legL);

    const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.48, 10), legMat);
    legR.position.set(0.08, 0.40, 0.02);
    rig.add(legR);

    // feet
    const footL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.04, 0.18), legMat);
    footL.position.set(-0.08, 0.16, 0.10);
    rig.add(footL);

    const footR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.04, 0.18), legMat);
    footR.position.set(0.08, 0.16, 0.10);
    rig.add(footR);

    return {
      root,
      rig,
      head,
      legL,
      legR,
      footL,
      footR,
      target: new THREE.Vector3(),
      isWalking: false,
      seed: Math.random() * 10,
      baseY: 0
    };
  },

  _seatBot(bot, seat) {
    // root at FLOOR position, not seat height
    bot.root.position.set(seat.position.x, 0, seat.position.z);
    bot.root.rotation.y = seat.yaw;

    // Sitting pose: rig moves up to seat, legs forward, feet on floor
    bot.rig.position.y = seat.sitY - 0.02;    // puts hips on the cushion
    bot.rig.position.z = -0.06;              // slightly back so not inside table

    // bend legs forward (visual)
    bot.legL.rotation.x = -0.85;
    bot.legR.rotation.x = -0.85;

    bot.footL.position.z = 0.18;
    bot.footR.position.z = 0.18;

    bot.baseY = bot.root.position.y;
  },

  _placeWalking(bot) {
    const z = this.lobbyZone;

    // start
    const x1 = z.min.x + Math.random() * (z.max.x - z.min.x);
    const z1 = z.min.z + Math.random() * (z.max.z - z.min.z);
    bot.root.position.set(x1, 0, z1);
    bot.baseY = 0;

    // reset to standing pose for walkers
    bot.rig.position.set(0, 0, 0);
    bot.legL.rotation.x = 0;
    bot.legR.rotation.x = 0;

    // target
    const x2 = z.min.x + Math.random() * (z.max.x - z.min.x);
    const z2 = z.min.z + Math.random() * (z.max.z - z.min.z);
    bot.target.set(x2, 0, z2);
  }
};
