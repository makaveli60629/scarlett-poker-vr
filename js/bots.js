// /js/bots.js — Scarlett Poker VR Bots (DEPLOY-SAFE)
// - No imports
// - No top-level await
// - No IIFE
// - No CapsuleGeometry (some builds choke on it)
// - Exports Bots.init / Bots.update

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

    // cleanup previous
    for (let i = 0; i < this.bots.length; i++) {
      try { scene.remove(this.bots[i].root); } catch (e) {}
    }
    this.bots = [];
    this.t = 0;

    // make 4 seated bots (seats 1..4)
    for (let i = 1; i <= 4; i++) {
      if (!this.seats[i]) continue;
      const bot = this._makeBot(0x5ac8fa + i * 0x111111);
      this._seatBot(bot, this.seats[i]);
      scene.add(bot.root);
      this.bots.push(bot);
    }

    // make 2 walking lobby bots if lobby zone exists
    if (this.lobbyZone) {
      for (let k = 0; k < 2; k++) {
        const bot = this._makeBot(0xff2d7a);
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

      // tiny idle bob
      b.root.position.y = b.baseY + Math.sin(this.t * 2.2 + b.seed) * 0.01;

      if (!b.isWalking) continue;

      // move toward target
      const dx = b.target.x - b.root.position.x;
      const dz = b.target.z - b.root.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 0.15) {
        this._placeWalking(b);
        continue;
      }

      const nx = dx / (dist || 1);
      const nz = dz / (dist || 1);

      b.root.position.x += nx * dt * 0.55;
      b.root.position.z += nz * dt * 0.55;

      // face movement direction
      b.root.rotation.y = Math.atan2(nx, nz);
    }
  },

  // ---------------- internal helpers ----------------

  _makeBot(color) {
    const THREE = this.THREE;

    const root = new THREE.Group();
    root.name = "Bot";

    const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.85 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf1c7a8, roughness: 0.7 });

    // body (simple cylinder + box so it NEVER breaks)
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.18, 0.55, 14),
      bodyMat
    );
    body.position.y = 0.85;
    root.add(body);

    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.30, 0.22),
      bodyMat
    );
    torso.position.y = 1.05;
    root.add(torso);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 14, 12),
      headMat
    );
    head.position.y = 1.28;
    root.add(head);

    // simple legs (visual only)
    const legMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 });

    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.40, 10), legMat);
    legL.position.set(-0.08, 0.45, 0.03);
    root.add(legL);

    const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.40, 10), legMat);
    legR.position.set(0.08, 0.45, 0.03);
    root.add(legR);

    return {
      root: root,
      target: new THREE.Vector3(),
      isWalking: false,
      seed: Math.random() * 10,
      baseY: 0
    };
  },

  _seatBot(bot, seat) {
    // seat.position is already world space in your world.js v10.3
    bot.root.position.copy(seat.position);
    bot.root.position.y = seat.sitY;  // seat surface height
    bot.baseY = bot.root.position.y;

    bot.root.rotation.y = seat.yaw;

    // tiny pull back so bot isn't inside table
    const back = this.THREE.Vector3 ? new this.THREE.Vector3() : null;
    if (back) {
      back.set(Math.sin(seat.yaw), 0, Math.cos(seat.yaw));
      bot.root.position.addScaledVector(back, -0.10);
    }
  },

  _placeWalking(bot) {
    const THREE = this.THREE;
    const z = this.lobbyZone;

    // pick random start + random target
    const x1 = z.min.x + Math.random() * (z.max.x - z.min.x);
    const z1 = z.min.z + Math.random() * (z.max.z - z.min.z);
    bot.root.position.set(x1, 0, z1);
    bot.baseY = 0;

    const x2 = z.min.x + Math.random() * (z.max.x - z.min.x);
    const z2 = z.min.z + Math.random() * (z.max.z - z.min.z);
    bot.target.set(x2, 0, z2);
  }
};
