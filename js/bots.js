// js/bots.js — Tournament Bots + Lobby Wandering + Auto Shirt Fit
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { Avatar } from "./avatar.js";

export const Bots = {
  scene: null,
  rig: null,
  getSeats: null,
  getLobbyZone: null,

  bots: [],
  state: "seating",
  timer: 0,
  activeCount: 6, // seated
  winnerIndex: -1,

  // === Shirt settings (edit these) ===
  SHIRT_TEXTURE_URL: "assets/textures/shirt_diffuse.png",
  SHIRT_MODE: "wrap", // "wrap" (3D wrapper) or "off"
  SHIRT_FIT: "normal", // "tight" | "normal" | "loose"
  _shirtTex: null,

  init({ scene, rig, getSeats, getLobbyZone }) {
    this.scene = scene;
    this.rig = rig;
    this.getSeats = getSeats;
    this.getLobbyZone = getLobbyZone;

    const seats = this.getSeats?.() || [];
    if (!seats.length) return;

    // Preload shirt texture once
    this._preloadShirtTexture();

    // Create 8 bots total (6 seats + 2 lobby)
    this.bots = [];
    for (let i = 0; i < 8; i++) {
      const a = Avatar.create({ color: i % 2 ? 0x2bd7ff : 0xff2bd6 });
      a.userData.bot = {
        id: i,
        seated: false,
        eliminated: false,
        target: null,
        crown: false,
      };

      // Auto-fit shirt to this avatar instance (math-based)
      this._applyShirtToAvatar(a);

      this.scene.add(a);
      this.bots.push(a);
    }

    this._seatBots();
    this.state = "playing";
    this.timer = 0;
  },

  _preloadShirtTexture() {
    if (this._shirtTex) return;
    const loader = new THREE.TextureLoader();
    this._shirtTex = loader.load(this.SHIRT_TEXTURE_URL);
    this._shirtTex.colorSpace = THREE.SRGBColorSpace;
    this._shirtTex.anisotropy = 4;
    this._shirtTex.wrapS = THREE.RepeatWrapping;
    this._shirtTex.wrapT = THREE.RepeatWrapping;
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
        emissiveIntensity: 0.35,
        roughness: 0.35,
        metalness: 0.55
      })
    );
    crown.rotation.x = Math.PI / 2;
    crown.position.y = 1.45;
    crown.name = "crown";
    bot.add(crown);
  },

  _removeCrown(bot) {
    const c = bot.getObjectByName("crown");
    if (c) bot.remove(c);
    bot.userData.bot.crown = false;
  },

  // ============================================================
  // Shirt fit logic for Avatar.create() bots (no avatar.js needed)
  // ============================================================

  _applyShirtToAvatar(avatarRoot) {
    if (this.SHIRT_MODE === "off") return;
    this._preloadShirtTexture();

    // Remove old shirt if any
    const old = avatarRoot.getObjectByName("bot_shirt");
    if (old) old.parent?.remove(old);

    // Try to find an explicit torso mesh first (best case)
    const torso =
      avatarRoot.getObjectByName("torso") ||
      avatarRoot.getObjectByName("body") ||
      avatarRoot.getObjectByName("chest") ||
      null;

    let shirtAnchor = torso || avatarRoot;

    // Compute sizing reference using bounding box
    const box = new THREE.Box3().setFromObject(shirtAnchor);
    if (!isFinite(box.min.x) || !isFinite(box.max.x)) return;

    const size = new THREE.Vector3();
    box.getSize(size);

    // If we anchored to the full avatar, focus on mid-body “torso band”
    // (this makes it work even if the avatar is just a single group)
    let torsoHeight = size.y * 0.38;
    let torsoY = box.min.y + size.y * 0.55;

    // If we found torso explicitly, trust it more
    if (torso) {
      torsoHeight = size.y;
      torsoY = (box.min.y + box.max.y) * 0.5;
    }

    // Fit multipliers
    const fitMul =
      this.SHIRT_FIT === "tight" ? 1.03 :
      this.SHIRT_FIT === "loose" ? 1.12 : 1.07;

    const w = Math.max(0.22, size.x * fitMul);
    const d = Math.max(0.16, size.z * fitMul);
    const h = Math.max(0.28, torsoHeight * 1.02);

    // Build a lightweight “shirt wrapper”
    const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({
      map: this._shirtTex,
      transparent: true,
      opacity: 1.0,
      roughness: 0.9,
      metalness: 0.0,
    });

    // Help texture not smear badly on box faces
    if (mat.map) {
      mat.map.repeat.set(1, 1);
      mat.map.offset.set(0, 0);
      mat.map.needsUpdate = true;
    }

    const shirt = new THREE.Mesh(geo, mat);
    shirt.name = "bot_shirt";

    // Position shirt centered on torso band (world -> local)
    // We compute target in world, then convert to avatar local.
    const worldPos = new THREE.Vector3(
      (box.min.x + box.max.x) * 0.5,
      torsoY,
      (box.min.z + box.max.z) * 0.5
    );

    avatarRoot.updateMatrixWorld(true);
    avatarRoot.worldToLocal(worldPos);
    shirt.position.copy(worldPos);

    // Slight forward offset so it doesn’t Z-fight with torso
    shirt.position.z += d * 0.03;

    // Parent under avatar root so it moves with them
    avatarRoot.add(shirt);
  },

  update(dt) {
    if (!this.bots.length) return;

    this.timer += dt;

    // Every 12 seconds, eliminate one seated bot until 2 remain.
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
