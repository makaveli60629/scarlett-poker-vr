// /js/world.js — Scarlett MASTER WORLD v12 (FULL)
// ✅ Restores a full lobby with a deep divot "pit", poker table, rail, sane stairs, and correct spawn facing table.
// ✅ Built to be stable on Android + XR.
// ✅ Includes clear colliders + room/spawn points.
// NOTE: You can layer in store/VIP modules later; this gets the WORLD back to "right".

export const World = {
  room: "lobby",
  group: null,
  colliders: [],
  _billboards: [],
  _ctx: null,

  async init({ THREE, scene, renderer, camera, player, controllers, log, BUILD }) {
    this._ctx = { THREE, scene, renderer, camera, player, controllers, log, BUILD };

    log?.(`[world] init ✅ build=${BUILD}`);

    // reset world container
    if (this.group) {
      try { scene.remove(this.group); } catch {}
    }
    this.group = new THREE.Group();
    this.group.name = "WorldRoot";
    scene.add(this.group);

    this.colliders = [];
    this._billboards = [];

    // Lighting (clean + bright)
    this._installLights(THREE);

    // Build
    this._buildLobbyShell(THREE);
    this._buildPit(THREE);
    this._buildStairs(THREE);

    // Spawn FIX: face the table, not a wall
    this._applyLobbySpawn(THREE);

    log?.("[world] lobby shell + pit + stairs ✅");
    log?.("[world] build complete ✅");
  },

  update(dt) {
    const ctx = this._ctx;
    if (!ctx) return;

    // billboard: face camera, but do NOT tilt (keep upright)
    const cam = ctx.camera;
    for (const bb of this._billboards) {
      if (!bb) continue;
      bb.lookAt(cam.position.x, bb.position.y, cam.position.z); // lock Y
    }
  },

  _installLights(THREE) {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x05060a, 0.95);
    hemi.position.set(0, 30, 0);
    this.group.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(10, 18, 8);
    key.castShadow = false;
    this.group.add(key);

    // subtle glow point
    const p = new THREE.PointLight(0x7fe7ff, 0.55, 80);
    p.position.set(0, 10, 0);
    this.group.add(p);
  },

  _buildLobbyShell(THREE) {
    const g = this.group;

    // main floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(26, 128),
      new THREE.MeshStandardMaterial({ color: 0x12152a, roughness: 1, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = false;
    floor.name = "LobbyFloor";
    g.add(floor);
    this.colliders.push(floor);

    // walls ring (so it feels like a room)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1e36, roughness: 0.95, metalness: 0.05 });
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(26, 26, 10, 96, 1, true),
      wallMat
    );
    wall.position.y = 5;
    wall.name = "LobbyWall";
    g.add(wall);

    // decorative band
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(23.5, 0.25, 10, 96),
      new THREE.MeshStandardMaterial({ color: 0x2a2f56, roughness: 0.7, metalness: 0.2 })
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = 1.2;
    g.add(band);
  },

  _buildPit(THREE) {
    const g = this.group;

    // DEEP DIVOT: build a "sunken disc" + inner floor
    const pitDepth = 1.6;     // << deeper
    const pitRadius = 9.2;
    const pitFloorRadius = 8.5;

    // pit inner floor
    const pitFloor = new THREE.Mesh(
      new THREE.CircleGeometry(pitFloorRadius, 96),
      new THREE.MeshStandardMaterial({ color: 0x0c0f1f, roughness: 1, metalness: 0.05 })
    );
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.y = -pitDepth;
    pitFloor.name = "PitFloor";
    g.add(pitFloor);
    this.colliders.push(pitFloor);

    // pit wall (sloped)
    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitRadius, pitFloorRadius, pitDepth, 96, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x171b33, roughness: 0.95, metalness: 0.05 })
    );
    pitWall.position.y = -pitDepth / 2;
    pitWall.name = "PitWall";
    g.add(pitWall);

    // rail ring at pit edge
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(pitRadius + 0.25, 0.18, 10, 96),
      new THREE.MeshStandardMaterial({ color: 0x30376b, roughness: 0.6, metalness: 0.25 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 0.95;
    rail.name = "PitRail";
    g.add(rail);
    this.colliders.push(rail);

    // table (center)
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.6, 0.22, 48),
      new THREE.MeshStandardMaterial({ color: 0x12361f, roughness: 0.85, metalness: 0.1 })
    );
    table.position.set(0, -pitDepth + 0.9, 0);
    table.name = "PokerTable";
    g.add(table);
    this.colliders.push(table);

    // table rim
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.65, 0.12, 10, 64),
      new THREE.MeshStandardMaterial({ color: 0x2a190f, roughness: 0.7, metalness: 0.15 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.copy(table.position);
    rim.position.y += 0.14;
    g.add(rim);

    // community cards “billboard strip” (placeholder until you wire your real poker presenter)
    const comm = this._makeBillboardPanel(THREE, 2.8, 0.55, "COMMUNITY");
    comm.position.set(0, table.position.y + 1.15, -1.2);
    g.add(comm);
    this._billboards.push(comm);

    // “pot HUD”
    const pot = this._makeBillboardPanel(THREE, 1.6, 0.42, "POT");
    pot.position.set(0, table.position.y + 1.55, 1.35);
    g.add(pot);
    this._billboards.push(pot);

    // simple seats around table (aligned facing center)
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
      chair.lookAt(0, chair.position.y, 0); // face table
      g.add(chair);
      this.colliders.push(chair);

      // “name tag” billboard (higher than head) - placeholder
      const tag = this._makeBillboardPanel(THREE, 1.05, 0.30, `BOT_${i}`);
      tag.position.set(x, table.position.y + 2.25, z);
      g.add(tag);
      this._billboards.push(tag);

      // “cards above head” billboard - placeholder (way higher)
      const hand = this._makeBillboardPanel(THREE, 1.10, 0.34, `HAND_${i}`);
      hand.position.set(x, table.position.y + 3.05, z);
      g.add(hand);
      this._billboards.push(hand);
    }
  },

  _buildStairs(THREE) {
    const g = this.group;

    // Stairs down into the pit (short + reasonable)
    // placed at +Z edge so you see them forward-ish when spawning
    const start = new THREE.Vector3(0, 0.0, 10.5);
    const steps = 10;
    const stepH = 0.16;
    const stepD = 0.55;
    const stepW = 2.2;

    const mat = new THREE.MeshStandardMaterial({ color: 0x1b2042, roughness: 1, metalness: 0.05 });

    for (let i = 0; i < steps; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), mat);
      s.position.set(
        start.x,
        start.y - i * stepH * 0.95,
        start.z - i * stepD
      );
      s.name = `Stair_${i}`;
      g.add(s);
      this.colliders.push(s);
    }

    // side rails
    const railMat = new THREE.MeshStandardMaterial({ color: 0x30376b, roughness: 0.6, metalness: 0.25 });
    const railGeo = new THREE.BoxGeometry(0.08, 1.0, steps * stepD + 0.6);

    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.position.set(-stepW / 2 - 0.25, 0.55 - (steps * stepH) / 2, start.z - (steps * stepD) / 2);
    g.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, railMat);
    rightRail.position.set(stepW / 2 + 0.25, 0.55 - (steps * stepH) / 2, start.z - (steps * stepD) / 2);
    g.add(rightRail);

    this.colliders.push(leftRail, rightRail);

    // entry marker (visual)
    const marker = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.08, 10, 48),
      new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.3, metalness: 0.2 })
    );
    marker.rotation.x = Math.PI / 2;
    marker.position.set(0, 0.05, 12.0);
    marker.name = "StairsEntryMarker";
    g.add(marker);
  },

  _applyLobbySpawn(THREE) {
    const { player } = this._ctx;

    // spawn at lobby level, looking INTO the pit/table
    player.position.set(0, 0, 15.5);

    // face toward center/table
    // yaw 180deg (pi) would face +Z, we want face -Z => yaw = 0
    player.rotation.set(0, 0, 0);

    // small nudge so you’re not staring at a wall immediately
    // (table is near origin; player at +Z so look down -Z)
  },

  _makeBillboardPanel(THREE, w, h, label) {
    // Simple canvas texture so you can SEE text without tilting, faces camera in update()
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const g = c.getContext("2d");

    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = "rgba(10,12,18,0.75)";
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
