// /js/bots.js — Bots 9.0 (shirts + chip tags + lobby wander)
// MUST export Bots.init for world.js to detect it.

export const Bots = {
  scene: null,
  getSeats: null,
  getLobbyZone: null,
  tableFocus: null,

  bots: [],
  timer: 0,

  init({ THREE, scene, getSeats, getLobbyZone, tableFocus }) {
    this.THREE = THREE;
    this.scene = scene;
    this.getSeats = getSeats;
    this.getLobbyZone = getLobbyZone;
    this.tableFocus = tableFocus;

    const seats = this.getSeats?.() || [];
    if (!seats.length) {
      console.warn("[bots] no seats provided");
      return;
    }

    this.bots = [];
    for (let i = 0; i < 8; i++) {
      const bot = this._makeBot(i);
      bot.userData.bot = {
        id: i,
        seated: false,
        target: null,
        stack: 1500 + Math.floor(Math.random() * 1500),
      };
      this.scene.add(bot);
      this.bots.push(bot);
    }

    this._seatBots();
    console.log("[bots] init ok ✅ bots=" + this.bots.length);
  },

  _makeBot(i) {
    const THREE = this.THREE;
    const g = new THREE.Group();
    g.name = `Bot_${i}`;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: i % 2 ? 0x2bd7ff : 0xff2bd6,
      roughness: 0.85,
      metalness: 0.05,
    });

    const headMat = new THREE.MeshStandardMaterial({
      color: 0xf2d6c9,
      roughness: 0.85,
    });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.20, 0.60, 7, 14), bodyMat);
    torso.position.y = 0.58;
    torso.name = "torso";
    g.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 16), headMat);
    head.position.y = 1.28;
    head.name = "head";
    g.add(head);

    // Shirt logo (canvas texture)
    const logoTex = makeLogoTexture(THREE, "SCARLETT");
    const logo = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.12),
      new THREE.MeshBasicMaterial({ map: logoTex, transparent: true })
    );
    logo.position.set(0, 1.02, 0.205);
    logo.name = "shirtLogo";
    g.add(logo);

    // Chip tag above head (sprite)
    const tag = makeChipTag(THREE, "CHIPS: 0000");
    tag.position.set(0, 1.62, 0);
    tag.name = "chipTag";
    g.add(tag);

    return g;
  },

  _seatBots() {
    const seats = this.getSeats?.() || [];
    for (let i = 0; i < this.bots.length; i++) {
      const b = this.bots[i];
      const d = b.userData.bot;

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
    const THREE = this.THREE;
    const zone = this.getLobbyZone?.();
    const x = zone ? THREE.MathUtils.lerp(zone.min.x, zone.max.x, Math.random()) : (Math.random() * 8 - 4);
    const z = zone ? THREE.MathUtils.lerp(zone.min.z, zone.max.z, Math.random()) : (10 + Math.random() * 3);
    bot.position.set(x, 0, z);
    bot.userData.bot.target = bot.position.clone();
  },

  _pickLobbyTarget() {
    const THREE = this.THREE;
    const zone = this.getLobbyZone?.();
    const x = zone ? THREE.MathUtils.lerp(zone.min.x, zone.max.x, Math.random()) : (Math.random() * 10 - 5);
    const z = zone ? THREE.MathUtils.lerp(zone.min.z, zone.max.z, Math.random()) : (10 + Math.random() * 4);
    return new THREE.Vector3(x, 0, z);
  },

  setBotStack(id, amount) {
    const b = this.bots.find(x => x.userData.bot.id === id);
    if (!b) return;

    b.userData.bot.stack = Math.max(0, Math.floor(amount));
    const tag = b.getObjectByName("chipTag");
    if (tag?.material?.map) {
      tag.material.map.dispose?.();
      tag.material.map = makeChipTagTexture(this.THREE, `CHIPS: ${b.userData.bot.stack}`);
      tag.material.needsUpdate = true;
    }
  },

  update(dt) {
    if (!this.bots.length) return;
    this.timer += dt;

    for (const b of this.bots) {
      const d = b.userData.bot;

      // seated bots face table
      if (d.seated && this.tableFocus) {
        b.lookAt(this.tableFocus.x, 0.9, this.tableFocus.z);
      }

      // lobby wander
      if (!d.seated) {
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
    }
  },
};

// ---------- textures ----------
function makeLogoTexture(THREE, text) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const ctx = c.getContext("2d");

  ctx.clearRect(0, 0, c.width, c.height);

  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, c.width, c.height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 58px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 110);

  ctx.strokeStyle = "rgba(180, 107, 255, 0.9)";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(120, 170);
  ctx.lineTo(392, 170);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeChipTag(THREE, label) {
  const tex = makeChipTagTexture(THREE, label);
  const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const s = new THREE.Sprite(m);
  s.scale.set(0.75, 0.25, 1);
  return s;
}

function makeChipTagTexture(THREE, label) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const ctx = c.getContext("2d");

  ctx.clearRect(0, 0, c.width, c.height);

  ctx.fillStyle = "rgba(15, 18, 32, 0.75)";
  roundRect(ctx, 40, 70, 432, 116, 38);
  ctx.fill();

  ctx.strokeStyle = "rgba(180, 107, 255, 0.85)";
  ctx.lineWidth = 8;
  roundRect(ctx, 40, 70, 432, 116, 38);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 54px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 256, 128);

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  }
