// /js/world.js — Scarlett MASTER WORLD v13 (FULL)
// ✅ Removes the light-blue circle marker
// ✅ Adds sky + glow + signage so it doesn’t look like a black box
// ✅ Thinner rail
// ✅ Spawn faces table
// ✅ Attempts to load optional modules if they exist (non-fatal)

export const World = {
  room: "lobby",
  group: null,
  colliders: [],
  _billboards: [],
  _ctx: null,

  async init({ THREE, scene, renderer, camera, player, controllers, log, BUILD }) {
    this._ctx = { THREE, scene, renderer, camera, player, controllers, log, BUILD };

    log?.(`[world] init ✅ build=${BUILD}`);

    if (this.group) {
      try { scene.remove(this.group); } catch {}
    }
    this.group = new THREE.Group();
    this.group.name = "WorldRoot";
    scene.add(this.group);

    this.colliders = [];
    this._billboards = [];

    this._installBackdrop(THREE);
    this._installLights(THREE);

    this._buildLobbyShell(THREE);
    this._buildPit(THREE);
    this._buildStairs(THREE);

    this._applyLobbySpawn(THREE);

    // Try optional modules (won’t crash if missing)
    await this._tryLoadModules(log);

    log?.("[world] build complete ✅");
  },

  update(dt) {
    const ctx = this._ctx;
    if (!ctx) return;

    // billboards face camera but stay upright (no tilt)
    const cam = ctx.camera;
    for (const bb of this._billboards) {
      if (!bb) continue;
      bb.lookAt(cam.position.x, bb.position.y, cam.position.z);
    }
  },

  async _tryLoadModules(log) {
    // If these exist in your repo, they’ll attach.
    // If not, we just log and continue.
    const tryImport = async (path, label) => {
      try {
        const m = await import(`${path}?v=${Date.now()}`);
        log?.(`[world] module ${label} ✅`);
        return m;
      } catch (e) {
        log?.(`[world] module ${label} missing (ok) ↪ ${e?.message || e}`);
        return null;
      }
    };

    // Examples — keep safe
    await tryImport("./store_vip.js", "store_vip");
    await tryImport("./poker_presenter.js", "poker_presenter");
    await tryImport("./bot_rig.js", "bot_rig");
  },

  _installBackdrop(THREE) {
    // Big subtle sky sphere (makes it not black)
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(120, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0x05060a, side: THREE.BackSide })
    );
    sky.name = "Sky";
    this.group.add(sky);

    // Neon “ceiling ring”
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(18, 0.10, 10, 96),
      new THREE.MeshBasicMaterial({ color: 0x7fe7ff })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 8.6;
    ring.name = "CeilingRing";
    this.group.add(ring);

    // Big front sign so you instantly know orientation
    const sign = this._makeBillboardPanel(THREE, 6.5, 1.2, "SCARLETT LOBBY");
    sign.position.set(0, 4.3, -18);
    this.group.add(sign);
    this._billboards.push(sign);
  },

  _installLights(THREE) {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x05060a, 0.95);
    hemi.position.set(0, 30, 0);
    this.group.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(10, 18, 8);
    this.group.add(key);

    const glowA = new THREE.PointLight(0x7fe7ff, 0.85, 60);
    glowA.position.set(0, 7.5, 0);
    this.group.add(glowA);

    const glowB = new THREE.PointLight(0xff2d7a, 0.55, 55);
    glowB.position.set(-10, 5.5, -6);
    this.group.add(glowB);
  },

  _buildLobbyShell(THREE) {
    const g = this.group;

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(26, 128),
      new THREE.MeshStandardMaterial({ color: 0x141833, roughness: 1, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.name = "LobbyFloor";
    g.add(floor);
    this.colliders.push(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1e36, roughness: 0.95, metalness: 0.05 });
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(26, 26, 10, 96, 1, true),
      wallMat
    );
    wall.position.y = 5;
    wall.name = "LobbyWall";
    g.add(wall);

    // Neon trims (visual “graphics”)
    const trim1 = new THREE.Mesh(
      new THREE.TorusGeometry(23.5, 0.06, 8, 96),
      new THREE.MeshBasicMaterial({ color: 0x7fe7ff })
    );
    trim1.rotation.x = Math.PI / 2;
    trim1.position.y = 1.1;
    g.add(trim1);

    const trim2 = new THREE.Mesh(
      new THREE.TorusGeometry(23.5, 0.06, 8, 96),
      new THREE.MeshBasicMaterial({ color: 0xff2d7a })
    );
    trim2.rotation.x = Math.PI / 2;
    trim2.position.y = 6.7;
    g.add(trim2);
  },

  _buildPit(THREE) {
    const g = this.group;

    const pitDepth = 1.75;      // deeper
    const pitRadius = 9.2;
    const pitFloorRadius = 8.5;

    const pitFloor = new THREE.Mesh(
      new THREE.CircleGeometry(pitFloorRadius, 96),
      new THREE.MeshStandardMaterial({ color: 0x0c1024, roughness: 1, metalness: 0.05 })
    );
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.y = -pitDepth;
    pitFloor.name = "PitFloor";
    g.add(pitFloor);
    this.colliders.push(pitFloor);

    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitRadius, pitFloorRadius, pitDepth, 96, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x161a33, roughness: 0.95, metalness: 0.05 })
    );
    pitWall.position.y = -pitDepth / 2;
    pitWall.name = "PitWall";
    g.add(pitWall);

    // THINNER rail (you said it was too thick)
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(pitRadius + 0.25, 0.10, 10, 96),
      new THREE.MeshStandardMaterial({ color: 0x30376b, roughness: 0.6, metalness: 0.25 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 0.95;
    rail.name = "PitRail";
    g.add(rail);
    this.colliders.push(rail);

    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.6, 0.22, 48),
      new THREE.MeshStandardMaterial({ color: 0x12361f, roughness: 0.85, metalness: 0.1 })
    );
    table.position.set(0, -pitDepth + 0.9, 0);
    table.name = "PokerTable";
    g.add(table);
    this.colliders.push(table);

    const comm = this._makeBillboardPanel(THREE, 3.3, 0.65, "COMMUNITY");
    comm.position.set(0, table.position.y + 1.25, -1.35);
    g.add(comm);
    this._billboards.push(comm);

    const pot = this._makeBillboardPanel(THREE, 1.9, 0.50, "POT");
    pot.position.set(0, table.position.y + 1.70, 1.55);
    g.add(pot);
    this._billboards.push(pot);

    // Seats + tags
    const seatCount = 6;
    const seatR = 4.0;
    for (let i = 0; i < seatCount; i++) {
      const a = (i / seatCount) * Math.PI * 2;
      const x = Math.cos(a) * seatR;
      const z = Math.sin(a) * seatR;

      const chair = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.22, 0.65),
        new THREE.MeshStandardMaterial({ color: 0x161a2f, roughness: 1, metalness: 0.05 })
      );
      chair.position.set(x, table.position.y + 0.10, z);
      chair.name = `Chair_${i}`;
      chair.lookAt(0, chair.position.y, 0);
      g.add(chair);
      this.colliders.push(chair);

      const tag = this._makeBillboardPanel(THREE, 1.15, 0.32, `BOT_${i}`);
      tag.position.set(x, table.position.y + 2.35, z); // higher than head
      g.add(tag);
      this._billboards.push(tag);

      const hand = this._makeBillboardPanel(THREE, 1.20, 0.36, `HAND_${i}`);
      hand.position.set(x, table.position.y + 3.20, z); // way higher
      g.add(hand);
      this._billboards.push(hand);
    }
  },

  _buildStairs(THREE) {
    const g = this.group;

    const start = new THREE.Vector3(0, 0.0, 10.5);
    const steps = 10;
    const stepH = 0.16;
    const stepD = 0.55;
    const stepW = 2.2;

    const mat = new THREE.MeshStandardMaterial({ color: 0x1b2042, roughness: 1, metalness: 0.05 });

    for (let i = 0; i < steps; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), mat);
      s.position.set(start.x, start.y - i * stepH * 0.95, start.z - i * stepD);
      s.name = `Stair_${i}`;
      g.add(s);
      this.colliders.push(s);
    }

    // NO BLUE CIRCLE MARKER (removed)
  },

  _applyLobbySpawn(THREE) {
    const { player } = this._ctx;

    // Spawn so you can SEE the pit/table immediately
    player.position.set(0, 0, 15.5);
    player.rotation.set(0, 0, 0);
  },

  _makeBillboardPanel(THREE, w, h, label) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const g = c.getContext("2d");

    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = "rgba(10,12,18,0.78)";
    g.fillRect(0, 0, c.width, c.height);

    g.strokeStyle = "rgba(127,231,255,0.45)";
    g.lineWidth = 6;
    g.strokeRect(10, 10, c.width - 20, c.height - 20);

    g.fillStyle = "rgba(232,236,255,0.95)";
    g.font = "bold 64px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(label, c.width / 2, c.height / 2);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.name = `Billboard_${label}`;
    return mesh;
  },
};
