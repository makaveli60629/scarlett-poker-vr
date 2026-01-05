// js/crown_system.js — Patch 6.7
// Crown System v1 (Boss-only, tournament winners, crown take + trophy wall)
// GitHub-safe. No server required (local simulation).
//
// FEATURES:
// - Boss bots play only at BossTable (show table).
// - Every so often a boss "leaves" and a Crown Event triggers in a random room.
// - Winner receives a Crown (visual + name).
// - If another boss wins later, they "take the crown" (trophy log updates).
// - Leaderboard shows current Crown Holder.
// - Trophy Wall (in-world panel) shows last 8 crown steals.
//
// Notes:
// - This is a simulation scaffold. Later we can swap in your real poker logic.
// - Works without external assets.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

function nowISO() {
  const d = new Date();
  return d.toISOString().replace("T", " ").slice(0, 19);
}

function safeName(n) {
  return String(n || "Boss").slice(0, 22);
}

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const LS_KEY = "scarlett_crown_v1";

export const CrownSystem = {
  scene: null,
  camera: null,

  // state
  data: null,
  // event pacing
  t: 0,
  nextEventIn: 35,        // seconds until first crown event
  minEventGap: 35,
  maxEventGap: 75,

  // crown visuals
  crownGroup: null,
  crownLight: null,
  crownFollow: null,      // object to follow (boss avatar head)
  crownVisible: true,

  // trophy wall
  wall: null,
  wallTex: null,
  wallCtx: null,
  wallCanvas: null,
  wallAnchor: new THREE.Vector3(6.2, 1.55, -4.2),

  // hooks
  getBossBots: null,      // function returning BossBots module (or list)
  getBossHeads: null,     // function returning array of head anchor Object3D for bosses
  getRooms: null,         // function returning array of room ids/anchors
  toast: null,
  onCrownChange: null,    // callback(holderName)

  init(scene, camera, {
    toast,
    getBossBots,
    getBossHeads,
    getRooms,
    onCrownChange
  } = {}) {
    this.scene = scene;
    this.camera = camera;
    this.toast = toast || null;
    this.getBossBots = getBossBots || null;
    this.getBossHeads = getBossHeads || null;
    this.getRooms = getRooms || null;
    this.onCrownChange = onCrownChange || null;

    // load state
    this.data = loadLS(LS_KEY, {
      holder: { id: "boss_0", name: "Boss Alpha" },
      steals: [] // newest first: { at, from, to, room }
    });

    // build visuals + wall
    this._buildCrown();
    this._buildTrophyWall();

    // initial draw
    this._drawTrophyWall();
    this._applyCrownToHolder(true);
  },

  // --- visuals ---
  _buildCrown() {
    // Simple crown ring + spikes + glow
    this.crownGroup = new THREE.Group();
    this.crownGroup.name = "CrownToken";

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffd04a,
      emissive: 0xffd04a,
      emissiveIntensity: 0.8,
      roughness: 0.35,
      metalness: 0.6,
      transparent: true,
      opacity: 0.95
    });

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 10, 18), mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0;

    const spikes = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 10), mat);
      const a = (i / 6) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 0.12, 0.055, Math.sin(a) * 0.12);
      spike.rotation.x = Math.PI;
      spikes.add(spike);
    }

    this.crownLight = new THREE.PointLight(0xffd04a, 0.6, 2.4);
    this.crownLight.position.set(0, 0.08, 0);

    // faint halo disc
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffd04a,
        emissive: 0xffd04a,
        emissiveIntensity: 1.4,
        transparent: true,
        opacity: 0.18,
        roughness: 0.3
      })
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -0.02;

    this.crownGroup.add(ring, spikes, halo, this.crownLight);
    this.crownGroup.visible = true;
    this.scene.add(this.crownGroup);
  },

  _buildTrophyWall() {
    // Canvas wall panel (like Leaderboard)
    this.wall = new THREE.Group();
    this.wall.name = "TrophyWall";

    this.wallCanvas = document.createElement("canvas");
    this.wallCanvas.width = 1024;
    this.wallCanvas.height = 512;
    this.wallCtx = this.wallCanvas.getContext("2d");

    this.wallTex = new THREE.CanvasTexture(this.wallCanvas);
    this.wallTex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({
      map: this.wallTex,
      transparent: true,
      opacity: 0.96,
      roughness: 0.9,
      emissive: 0x121018,
      emissiveIntensity: 0.6
    });

    const backMat = new THREE.MeshStandardMaterial({
      color: 0x06070c,
      transparent: true,
      opacity: 0.35,
      roughness: 1.0
    });

    const back = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 1.02), backMat);
    back.renderOrder = 998;

    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0), mat);
    board.position.z = 0.01;
    board.renderOrder = 999;

    this.wall.add(back, board);
    this.wall.position.copy(this.wallAnchor);
    this.wall.rotation.y = Math.PI;

    this.scene.add(this.wall);
  },

  _drawTrophyWall() {
    const ctx = this.wallCtx;
    if (!ctx) return;

    ctx.clearRect(0, 0, 1024, 512);

    ctx.fillStyle = "rgba(8,10,16,0.92)";
    ctx.fillRect(0, 0, 1024, 512);

    ctx.strokeStyle = "rgba(255,208,74,0.85)";
    ctx.lineWidth = 10;
    ctx.strokeRect(16, 16, 992, 480);

    ctx.strokeStyle = "rgba(0,255,170,0.55)";
    ctx.lineWidth = 6;
    ctx.strokeRect(26, 26, 972, 460);

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,208,74,0.95)";
    ctx.font = "900 54px system-ui";
    ctx.fillText("CROWN TROPHY WALL", 512, 88);

    const holder = this.data?.holder?.name || "None";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "800 30px system-ui";
    ctx.fillText(`Current Crown Holder: ${holder}`, 512, 132);

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = "700 28px system-ui";
    ctx.fillText("Recent Crown Takes", 70, 190);

    const steals = Array.isArray(this.data?.steals) ? this.data.steals : [];
    ctx.font = "600 22px system-ui";
    ctx.fillStyle = "rgba(0,255,170,0.88)";

    for (let i = 0; i < Math.min(steals.length, 8); i++) {
      const s = steals[i];
      const y = 230 + i * 32;
      const line = `${i + 1}. ${safeName(s.to)} took from ${safeName(s.from)} — ${s.room || "Lobby"} — ${s.at || ""}`;
      ctx.fillText(line, 70, y);
    }

    if (steals.length === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText("No crown takes yet. Boss tournaments will create the first Crown Holder.", 70, 260);
    }

    this.wallTex.needsUpdate = true;
  },

  // --- crown logic ---
  _pickRandomRoom() {
    const rooms = (typeof this.getRooms === "function") ? this.getRooms() : null;
    if (Array.isArray(rooms) && rooms.length) {
      return rooms[Math.floor(Math.random() * rooms.length)];
    }
    return "Lobby";
  },

  _pickRandomBoss(exceptId = null) {
    // If BossBots exposes roster, use it. Otherwise fallback to synthetic.
    const bots = (typeof this.getBossBots === "function") ? this.getBossBots() : null;

    // Accept either array of {id,name} or BossBots with list method
    let list = null;
    if (Array.isArray(bots)) list = bots;
    else if (bots?.list) list = bots.list();
    else if (bots?.bots) list = bots.bots;

    if (!Array.isArray(list) || list.length === 0) {
      // synthetic
      const names = ["Boss Alpha", "Boss Beta", "Boss Gamma", "Boss Delta", "Boss Omega"];
      const id = "boss_" + Math.floor(Math.random() * names.length);
      return { id, name: names[parseInt(id.split("_")[1], 10)] || "Boss" };
    }

    const filtered = exceptId ? list.filter(b => b.id !== exceptId) : list.slice();
    if (filtered.length === 0) return list[0];
    return filtered[Math.floor(Math.random() * filtered.length)];
  },

  _pushSteal(fromName, toName, room) {
    const entry = { at: nowISO(), from: fromName, to: toName, room };
    this.data.steals = [entry, ...(this.data.steals || [])].slice(0, 24);
  },

  _setHolder(boss) {
    this.data.holder = { id: boss.id, name: boss.name };
    saveLS(LS_KEY, this.data);
    this.onCrownChange?.(boss.name);
    this._drawTrophyWall();
  },

  // Attach crown to current holder's head if we can find it.
  _applyCrownToHolder(silent = false) {
    const holderId = this.data?.holder?.id;
    if (!holderId) return;

    const heads = (typeof this.getBossHeads === "function") ? this.getBossHeads() : null;
    if (Array.isArray(heads)) {
      // expect entries like {id, head:Object3D} or {id, anchor}
      const match = heads.find(h => h?.id === holderId);
      this.crownFollow = match?.head || match?.anchor || null;
    }

    if (!this.crownFollow) {
      // no head anchors; place crown above boss table center
      this.crownGroup.position.set(0, 1.85, -6.6);
      this.crownGroup.visible = true;
      if (!silent) this.toast?.(`Crown Holder: ${this.data.holder.name}`);
      return;
    }

    if (!silent) this.toast?.(`Crown Holder: ${this.data.holder.name}`);
  },

  // Public: can be called by your poker simulation when a boss wins
  declareWinner(boss, room = "Boss Table") {
    if (!boss) return;
    const current = this.data?.holder?.name || "None";
    const from = current;
    const to = boss.name;

    // If new winner differs, record steal
    if ((this.data?.holder?.id || "") !== boss.id) {
      this._pushSteal(from, to, room);
    }

    this._setHolder(boss);
    this._applyCrownToHolder();
  },

  // Simulated event: a boss leaves & plays a random room tourney
  _runCrownEvent() {
    const room = this._pickRandomRoom();
    const currentId = this.data?.holder?.id || null;

    // Aggressive boss winner skew: 70% chance winner is NOT the current holder
    let winner;
    if (Math.random() < 0.70) winner = this._pickRandomBoss(currentId);
    else winner = this._pickRandomBoss(null);

    this.toast?.(`Boss Tournament: ${room} — Winner: ${winner.name}`);
    this.declareWinner(winner, room);
  },

  update(dt) {
    if (!this.scene) return;

    this.t += dt;

    // Crown follow update
    if (this.crownGroup) {
      if (this.crownFollow) {
        const p = new THREE.Vector3();
        this.crownFollow.getWorldPosition(p);
        this.crownGroup.position.copy(p);
        this.crownGroup.position.y += 0.18;
        this.crownGroup.rotation.y += dt * 0.9;
      } else {
        // idle spin
        this.crownGroup.rotation.y += dt * 0.7;
      }

      // glow pulse
      const pulse = 0.45 + Math.sin(this.t * 2.2) * 0.18;
      if (this.crownLight) this.crownLight.intensity = 0.5 + pulse;
      const halo = this.crownGroup.children?.find(c => c.isMesh && c.geometry?.type === "CircleGeometry");
      if (halo?.material) halo.material.opacity = 0.14 + pulse * 0.12;
    }

    // Schedule crown events
    this.nextEventIn -= dt;
    if (this.nextEventIn <= 0) {
      this._runCrownEvent();
      this.nextEventIn = this.minEventGap + Math.random() * (this.maxEventGap - this.minEventGap);
    }
  }
};
