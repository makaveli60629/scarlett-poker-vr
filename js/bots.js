// /js/bots.js — Tournament Bots + Lobby Wandering + Shirt Atlas
import * as THREE from "./three.js";
import { Avatar } from "./avatar.js";
import { BODY_DIMS } from "./body_dims.js";

export const Bots = {
  scene: null,
  rig: null,
  getSeats: null,
  getLobbyZone: null,

  bots: [],
  state: "seating",
  timer: 0,
  winnerIndex: -1,

  _shirtTex: null,
  _shirtMat: null,

  init({ scene, rig, getSeats, getLobbyZone }) {
    this.scene = scene;
    this.rig = rig;
    this.getSeats = getSeats;
    this.getLobbyZone = getLobbyZone;

    const seats = this.getSeats?.() || [];
    if (!seats.length) {
      console.warn("[Bots] No seats provided. Bots not spawned.");
      return;
    }

    this._ensureShirtMaterial();

    // Create 8 bots total (6 seats + 2 lobby)
    this.bots = [];
    for (let i = 0; i < 8; i++) {
      const a = Avatar.create({ color: i % 2 ? 0x2bd7ff : 0xff2bd6 }); // <-- this is your “blue/pink”
      a.userData.bot = { id: i, seated: false, eliminated: false, target: null, crown: false };

      // add shirt using your atlas texture
      this._addShirt(a);

      this.scene.add(a);
      this.bots.push(a);
    }

    this._seatBots();
    this.state = "playing";
    this.timer = 0;

    console.log("[Bots] Spawned", this.bots.length, "bots.");
  },

  _ensureShirtMaterial() {
    if (this._shirtMat) return;

    const loader = new THREE.TextureLoader();
    this._shirtTex = loader.load(BODY_DIMS.shirt.textureUrl);
    this._shirtTex.colorSpace = THREE.SRGBColorSpace;
    this._shirtTex.anisotropy = 4;
    this._shirtTex.wrapS = THREE.ClampToEdgeWrapping;
    this._shirtTex.wrapT = THREE.ClampToEdgeWrapping;

    this._shirtMat = new THREE.MeshStandardMaterial({
      map: this._shirtTex,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 1.0,
    });
  },

  _addShirt(bot) {
    // remove old
    const old = bot.getObjectByName("bot_shirt");
    if (old) old.parent?.remove(old);

    const shirtGeo = new THREE.BoxGeometry(
      BODY_DIMS.shirt.width,
      BODY_DIMS.shirt.height,
      BODY_DIMS.shirt.depth
    );

    const shirt = new THREE.Mesh(shirtGeo, this._shirtMat);
    shirt.name = "bot_shirt";
    shirt.position.set(0, BODY_DIMS.shirt.centerY, BODY_DIMS.shirt.zOffset);

    bot.add(shirt);
  },

  _seatBots() {
    const seats = this.getSeats?.() || [];
    for (let i = 0; i < this.bots.length; i++) {
      const b = this.bots[i];
      const d = b.userData.bot;

      d.crown = false;
      d.eliminated = false;

      if (i < Math.min(6, seats.length)) {
        const s = seats[i];
        b.position.set(s.position.x, 0, s.position.z);
        b.rotation.y = s.yaw;
        d.seated = true;
      } else {
        d.seated = false;
        this._sendToLobby(b);
      }
    }
  },

  _sendToLobby(bot) {
    const zone = this.getLobbyZone?.();
    const x = zone ? THREE.MathUtils.lerp(zone.min.x, zone.max.x, Math.random()) : (Math.random() * 8 - 4);
    const z = zone ? THREE.MathUtils.lerp(zone.min.z, zone.max.z, Math.random()) : (10 + Math.random() * 3);
    bot.position.set(x, 0, z);
    bot.userData.bot.target = bot.position.clone();
  },

  _pickLobbyTarget() {
    const zone = this.getLobbyZone?.();
    const x = zone ? THREE.MathUtils.lerp(zone.min.x, zone.max.x, Math.random()) : (Math.random() * 10 - 5);
    const z = zone ? THREE.MathUtils.lerp(zone.min.z, zone.max.z, Math.random()) : (10 + Math.random() * 4);
    return new THREE.Vector3(x, 0, z);
  },

  _giveCrown(bot) {
    bot.userData.bot.crown = true;

    const crown = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.05, 10, 16),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        emissive: 0xffd27a,
        emissiveIntensity: 0.45,
        roughness: 0.35,
        metalness: 0.55
      })
    );
    crown.rotation.x = Math.PI / 2;
    crown.position.y = 1.55;
    crown.name = "crown";
    bot.add(crown);
  },

  _removeCrown(bot) {
    const c = bot.getObjectByName("crown");
    if (c) bot.remove(c);
    bot.userData.bot.crown = false;
  },

  update(dt) {
    if (!this.bots.length) return;

    this.timer += dt;

    // Demo tournament: eliminate one seated bot every 12s until 2 remain
    if (this.state === "playing") {
      if (this.timer > 12) {
        this.timer = 0;

        const seated = this.bots.filter(b => b.userData.bot.seated && !b.userData.bot.eliminated);
        if (seated.length > 2) {
          const out = seated[Math.floor(Math.random() * seated.length)];
          out.userData.bot.eliminated = true;
          out.userData.bot.seated = false;
          this._sendToLobby(out);
        } else {
          this.state = "winner_walk";
          const winner = seated[Math.floor(Math.random() * seated.length)];
          this.winnerIndex = winner.userData.bot.id;
          this._giveCrown(winner);

          winner.userData.bot.seated = false;
          this._sendToLobby(winner);
          this.timer = 0;
        }
      }
    }

    if (this.state === "winner_walk") {
      if (this.timer > 60) {
        const w = this.bots.find(b => b.userData.bot.id === this.winnerIndex);
        if (w) this._removeCrown(w);

        this.state = "playing";
        this.timer = 0;
        this._seatBots();
      }
    }

    // Lobby wandering
    for (const b of this.bots) {
      const d = b.userData.bot;
      if (d.seated) continue;

      if (!d.target || b.position.distanceTo(d.target) < 0.2) {
        d.target = this._pickLobbyTarget();
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
  },
};
