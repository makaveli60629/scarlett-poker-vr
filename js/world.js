// /js/world.js — Scarlett Poker VR WORLD (FULL + UPDATED + FAIL-SAFE)
// ✅ NO global THREE usage (uses ctx.THREE passed from index.js)
// ✅ VIP spawn (default) + table-facing orientation
// ✅ Circular lobby + sealed floor + sunken pit/divot + smooth ramp/stairs entry
// ✅ Rooms: VIP / STORE / POKER / EVENT (door openings + labels + lights)
// ✅ Storefront: exterior display cases + sign + teleport pad to inside store room
// ✅ Teleport pads: Store / Poker / Event (front) + pads inside rooms
// ✅ Guardrails: ONLY pit/table safety rails (no extra outer rings)
// ✅ Basic poker demo visuals: table, chairs, seated bots, hover cards + table HUD
// ✅ Spatial audio (fail-safe): uses assets/audio/* if present, silently skips if missing
// ✅ Z-fighting/flicker reduction: no overlapping floors, polygonOffset where needed

export const World = {
  async init(ctx) {
    const { THREE, scene, renderer, camera, player, controllers, log } = ctx;

    // ---------- SAFE HELPERS ----------
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

    const safeColorSpace = (tex) => {
      if (!tex) return tex;
      // three r152+ uses colorSpace, older uses encoding
      if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
      if ("encoding" in tex) tex.encoding = THREE.sRGBEncoding;
      tex.needsUpdate = true;
      return tex;
    };

    function makeCanvasLabel(text, {
      w = 512, h = 256,
      bg = "rgba(0,0,0,0.55)",
      fg = "#e8ecff",
      stroke = "rgba(127,231,255,0.9)",
      glow = "rgba(255,45,122,0.35)",
      font = "bold 64px system-ui",
      sub = "",
      subFont = "600 28px system-ui"
    } = {}) {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const g = c.getContext("2d");

      // background panel
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);

      // border
      g.lineWidth = 10;
      g.strokeStyle = stroke;
      g.strokeRect(10, 10, w - 20, h - 20);

      // glow border
      g.lineWidth = 18;
      g.strokeStyle = glow;
      g.strokeRect(14, 14, w - 28, h - 28);

      // title
      g.font = font;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = fg;
      g.fillText(text, w / 2, h * 0.45);

      // sub
      if (sub) {
        g.font = subFont;
        g.fillStyle = "rgba(232,236,255,0.85)";
        g.fillText(sub, w / 2, h * 0.72);
      }

      const tex = new THREE.CanvasTexture(c);
      safeColorSpace(tex);
      tex.anisotropy = 4;
      return tex;
    }

    async function safeImport(path) {
      try { return await import(path); }
      catch (e) { log?.(`[world] (optional) missing ${path}`); return null; }
    }

    // ---------- ROOT ----------
    const root = new THREE.Group();
    root.name = "WorldRoot";
    scene.add(root);

    // ---------- TEXTURES ----------
    const TL = new THREE.TextureLoader();

    const tex = {
      carpet: null,
      wall: null,
      doorStore: null,
      doorPoker: null,
      teleGlow: null,
      tableLeather: null,
      cardBack: null,
      // audio assets in assets/audio/
    };

    function tryLoadTexture(url) {
      return new Promise((resolve) => {
        TL.load(
          url,
          (t) => resolve(safeColorSpace(t)),
          undefined,
          () => resolve(null)
        );
      });
    }

    // These exist per your screenshots (assets/textures/...)
    tex.carpet = await tryLoadTexture("assets/textures/lobby_carpet.jpg");
    tex.wall = await tryLoadTexture("assets/textures/casino_wall_diffuse.jpg");
    tex.doorStore = await tryLoadTexture("assets/textures/scarlett_door_store.png");
    tex.doorPoker = await tryLoadTexture("assets/textures/scarlett_door_poker.png");
    tex.teleGlow = await tryLoadTexture("assets/textures/Teleport glow.jpg");
    tex.tableLeather = await tryLoadTexture("assets/textures/Table leather trim.jpg");
    tex.cardBack = await tryLoadTexture("assets/textures/cards/scarlett_card_back_512.png");

    // repeat helpers
    const setRepeat = (t, rx, ry) => {
      if (!t) return;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      t.needsUpdate = true;
    };
    setRepeat(tex.carpet, 6, 6);
    setRepeat(tex.wall, 4, 2);
    setRepeat(tex.tableLeather, 2, 1);

    // ---------- MATERIALS (BRIGHT + CLEAN) ----------
    const colAqua = 0x7fe7ff;
    const colPink = 0xff2d7a;

    const matFloor = new THREE.MeshStandardMaterial({
      color: 0x30343f,
      map: tex.carpet || null,
      roughness: 0.55,
      metalness: 0.1
    });

    const matPit = new THREE.MeshStandardMaterial({
      color: 0x151824,
      roughness: 0.75,
      metalness: 0.05
    });

    const matWall = new THREE.MeshStandardMaterial({
      color: 0x3b3f4a,
      map: tex.wall || null,
      roughness: 0.65,
      metalness: 0.05
    });

    const matTrim = new THREE.MeshStandardMaterial({
      color: 0x1b1f2b,
      roughness: 0.15,
      metalness: 0.45,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0
    });

    const matNeonA = new THREE.MeshStandardMaterial({
      color: colAqua,
      roughness: 0.25,
      metalness: 0.6,
      emissive: new THREE.Color(colAqua),
      emissiveIntensity: 1.2
    });

    const matNeonP = new THREE.MeshStandardMaterial({
      color: colPink,
      roughness: 0.25,
      metalness: 0.6,
      emissive: new THREE.Color(colPink),
      emissiveIntensity: 1.1
    });

    const matGlass = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.08,
      metalness: 0,
      transparent: true,
      opacity: 0.35,
      transmission: 0.8,
      thickness: 0.15
    });

    // ---------- LIGHTS (SUPER BRIGHT, NO BLACK ROOMS) ----------
    // Global brightness
    const amb = new THREE.AmbientLight(0xffffff, 0.7);
    root.add(amb);

    // 2 big overhead rings of light (as requested)
    function addCeilingRing(y, r, intensity) {
      const ring = new THREE.Group();
      const n = 12;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const l = new THREE.PointLight(0xffffff, intensity, 30, 2);
        l.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
        ring.add(l);

        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 16, 16),
          new THREE.MeshStandardMaterial({ emissive: new THREE.Color(0xffffff), emissiveIntensity: 1.5, color: 0xffffff })
        );
        bulb.position.copy(l.position);
        ring.add(bulb);
      }
      root.add(ring);
    }
    addCeilingRing(7.5, 5.8, 1.35);
    addCeilingRing(7.0, 3.8, 1.15);

    // Pit spotlight focus
    const spot = new THREE.SpotLight(0xffffff, 2.8, 60, Math.PI / 7, 0.35, 1);
    spot.position.set(0, 10.5, 0);
    spot.target.position.set(0, 0, 0);
    root.add(spot);
    root.add(spot.target);

    // ---------- LAYOUT CONSTANTS ----------
    const LOBBY_R = 11.5;     // expanded a bit
    const WALL_H = 4.2;
    const WALL_T = 0.35;

    const PIT_R_OUT = 6.2;
    const PIT_R_IN = 4.25;    // inner open area near table
    const PIT_DEPTH = 1.4;    // how far down the pit feels
    const PIT_FLOOR_Y = -PIT_DEPTH;

    const TABLE_Y = PIT_FLOOR_Y + 0.05;

    // Rooms positions (N/E/S/W)
    const ROOM_SIZE = 7.4;
    const ROOM_H = 3.8;
    const ROOM_OFFSET = 15.0; // center distance from lobby center
    const ROOM = {
      VIP:   { name: "VIP",   pos: v3(0, 0, -ROOM_OFFSET), color: colPink },
      STORE: { name: "STORE", pos: v3(-ROOM_OFFSET, 0, 0), color: colAqua },
      POKER: { name: "POKER", pos: v3(ROOM_OFFSET, 0, 0), color: colPink },
      EVENT: { name: "EVENT", pos: v3(0, 0, ROOM_OFFSET), color: colAqua },
    };

    // ---------- LOBBY FLOOR (SEALED, SINGLE MESH) ----------
    // One big cylinder floor (no overlap) + a pit bowl (separate, lower)
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(LOBBY_R, LOBBY_R, 0.18, 96, 1, false),
      matFloor
    );
    floor.position.set(0, -0.09, 0);
    floor.receiveShadow = false;
    floor.name = "LobbyFloor";
    root.add(floor);

    // Pit floor (lower)
    const pitFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(PIT_R_IN, PIT_R_IN, 0.18, 72, 1, false),
      matPit
    );
    pitFloor.position.set(0, PIT_FLOOR_Y - 0.09, 0);
    pitFloor.name = "PitFloor";
    root.add(pitFloor);

    // Ramp ring between lobby floor and pit floor (smooth)
    // We fake a smooth slope with a truncated cone.
    const ramp = new THREE.Mesh(
      new THREE.CylinderGeometry(PIT_R_OUT, PIT_R_IN, PIT_DEPTH, 96, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x222638,
        roughness: 0.8,
        metalness: 0.05
      })
    );
    ramp.position.set(0, PIT_FLOOR_Y / 2, 0);
    ramp.name = "PitRamp";
    root.add(ramp);

    // Top ring trim
    const topTrim = new THREE.Mesh(
      new THREE.TorusGeometry(LOBBY_R - 0.35, 0.14, 18, 120),
      matTrim
    );
    topTrim.position.set(0, 2.25, 0);
    topTrim.rotation.x = Math.PI / 2;
    root.add(topTrim);

    // Neon crown trim (top + bottom)
    const neonTop = new THREE.Mesh(
      new THREE.TorusGeometry(LOBBY_R - 0.55, 0.06, 18, 160),
      matNeonA
    );
    neonTop.position.set(0, WALL_H + 0.25, 0);
    neonTop.rotation.x = Math.PI / 2;
    root.add(neonTop);

    const neonBottom = new THREE.Mesh(
      new THREE.TorusGeometry(LOBBY_R - 0.55, 0.06, 18, 160),
      matNeonP
    );
    neonBottom.position.set(0, 0.15, 0);
    neonBottom.rotation.x = Math.PI / 2;
    root.add(neonBottom);

    // ---------- LOBBY WALL (SEALED, WITH 4 DOOR OPENINGS) ----------
    // We build 4 wall arcs leaving openings toward the 4 rooms.
    function buildWallSegments() {
      const group = new THREE.Group();
      group.name = "LobbyWalls";

      // angles for openings (toward N/E/S/W)
      const openHalf = 0.26; // width of opening in radians
      const openings = [
        { a: -Math.PI / 2, label: "VIP" },    // north (-Z)
        { a: 0, label: "POKER" },             // east (+X)
        { a: Math.PI / 2, label: "EVENT" },   // south (+Z)
        { a: Math.PI, label: "STORE" },       // west (-X)
      ];

      function isInOpening(a) {
        for (const o of openings) {
          let d = Math.atan2(Math.sin(a - o.a), Math.cos(a - o.a));
          if (Math.abs(d) < openHalf) return true;
        }
        return false;
      }

      const steps = 240;
      const arcStep = (Math.PI * 2) / steps;
      let runStart = null;

      const segments = [];
      for (let i = 0; i <= steps; i++) {
        const a = -Math.PI + i * arcStep;
        const open = isInOpening(a);
        if (!open && runStart === null) runStart = a;
        if ((open || i === steps) && runStart !== null) {
          const runEnd = a;
          segments.push({ a0: runStart, a1: runEnd });
          runStart = null;
        }
      }

      for (const seg of segments) {
        const mid = (seg.a0 + seg.a1) / 2;
        const span = Math.max(0.05, seg.a1 - seg.a0);
        const w = (LOBBY_R * span);
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(w, WALL_H, WALL_T),
          matWall
        );
        // place at radius, rotate to tangent
        const r = LOBBY_R - WALL_T / 2;
        panel.position.set(Math.cos(mid) * r, WALL_H / 2, Math.sin(mid) * r);
        panel.rotation.y = -mid;
        panel.name = "WallPanel";
        group.add(panel);
      }

      root.add(group);
      return group;
    }
    const lobbyWalls = buildWallSegments();

    // ---------- HALLWAY SHORT CONNECTORS (JUST ENTRANCE FRAMES) ----------
    function buildDoorFrame(label, atAngle, color) {
      const r = LOBBY_R - WALL_T - 0.05;
      const cx = Math.cos(atAngle) * r;
      const cz = Math.sin(atAngle) * r;

      const frame = new THREE.Group();
      frame.position.set(cx, 0, cz);
      frame.rotation.y = -atAngle;
      frame.name = `DoorFrame_${label}`;

      const sideMat = new THREE.MeshStandardMaterial({
        color: 0x141724,
        roughness: 0.3,
        metalness: 0.35,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.25
      });

      const w = 3.2, h = 3.0, t = 0.18;

      const left = new THREE.Mesh(new THREE.BoxGeometry(t, h, t), sideMat);
      left.position.set(-w / 2, h / 2, 0);
      frame.add(left);

      const right = new THREE.Mesh(new THREE.BoxGeometry(t, h, t), sideMat);
      right.position.set(w / 2, h / 2, 0);
      frame.add(right);

      const top = new THREE.Mesh(new THREE.BoxGeometry(w + t, t, t), sideMat);
      top.position.set(0, h, 0);
      frame.add(top);

      // label sign
      const labelTex = makeCanvasLabel(label, { sub: "TELEPORT PAD", stroke: "rgba(127,231,255,0.9)" });
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(2.8, 1.1),
        new THREE.MeshBasicMaterial({ map: labelTex, transparent: true })
      );
      sign.position.set(0, h + 0.85, -0.01);
      frame.add(sign);

      root.add(frame);
      return frame;
    }

    const doorVIP = buildDoorFrame("VIP", -Math.PI / 2, colPink);
    const doorPoker = buildDoorFrame("POKER", 0, colPink);
    const doorEvent = buildDoorFrame("EVENT", Math.PI / 2, colAqua);
    const doorStore = buildDoorFrame("STORE", Math.PI, colAqua);

    // ---------- ROOMS (CUBES) ----------
    function buildRoom({ name, pos, color }) {
      const g = new THREE.Group();
      g.name = `Room_${name}`;
      g.position.copy(pos);

      const roomFloor = new THREE.Mesh(
        new THREE.BoxGeometry(ROOM_SIZE, 0.2, ROOM_SIZE),
        new THREE.MeshStandardMaterial({
          color: 0x2a2f3b,
          map: tex.carpet || null,
          roughness: 0.6,
          metalness: 0.05
        })
      );
      roomFloor.position.set(0, -0.1, 0);
      g.add(roomFloor);

      // walls (solid, with an opening toward lobby)
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0x3b3f4a,
        map: tex.wall || null,
        roughness: 0.65,
        metalness: 0.05
      });

      const wT = 0.25;
      const half = ROOM_SIZE / 2;
      const doorW = 2.6;
      const doorH = 2.8;

      // Build 4 walls; the one facing lobby has a doorway cut by making two segments + top
      // Determine lobby direction from room position.
      const toLobby = pos.clone().multiplyScalar(-1).normalize(); // direction from room center to lobby
      // pick primary axis (x or z)
      const face = Math.abs(toLobby.x) > Math.abs(toLobby.z) ? (toLobby.x > 0 ? "posX" : "negX") : (toLobby.z > 0 ? "posZ" : "negZ");

      function addWallZ(z, hasDoor) {
        if (!hasDoor) {
          const wall = new THREE.Mesh(new THREE.BoxGeometry(ROOM_SIZE, ROOM_H, wT), wallMat);
          wall.position.set(0, ROOM_H / 2, z);
          g.add(wall);
          return;
        }
        // left/right + top
        const segL = new THREE.Mesh(new THREE.BoxGeometry((ROOM_SIZE - doorW) / 2, ROOM_H, wT), wallMat);
        segL.position.set(-(doorW / 2 + (ROOM_SIZE - doorW) / 4), ROOM_H / 2, z);
        g.add(segL);

        const segR = new THREE.Mesh(new THREE.BoxGeometry((ROOM_SIZE - doorW) / 2, ROOM_H, wT), wallMat);
        segR.position.set((doorW / 2 + (ROOM_SIZE - doorW) / 4), ROOM_H / 2, z);
        g.add(segR);

        const top = new THREE.Mesh(new THREE.BoxGeometry(doorW, ROOM_H - doorH, wT), wallMat);
        top.position.set(0, (ROOM_H + doorH) / 2, z);
        g.add(top);
      }

      function addWallX(x, hasDoor) {
        if (!hasDoor) {
          const wall = new THREE.Mesh(new THREE.BoxGeometry(wT, ROOM_H, ROOM_SIZE), wallMat);
          wall.position.set(x, ROOM_H / 2, 0);
          g.add(wall);
          return;
        }
        const segL = new THREE.Mesh(new THREE.BoxGeometry(wT, ROOM_H, (ROOM_SIZE - doorW) / 2), wallMat);
        segL.position.set(x, ROOM_H / 2, -(doorW / 2 + (ROOM_SIZE - doorW) / 4));
        g.add(segL);

        const segR = new THREE.Mesh(new THREE.BoxGeometry(wT, ROOM_H, (ROOM_SIZE - doorW) / 2), wallMat);
        segR.position.set(x, ROOM_H / 2, (doorW / 2 + (ROOM_SIZE - doorW) / 4));
        g.add(segR);

        const top = new THREE.Mesh(new THREE.BoxGeometry(wT, ROOM_H - doorH, doorW), wallMat);
        top.position.set(x, (ROOM_H + doorH) / 2, 0);
        g.add(top);
      }

      // Add walls
      addWallZ(-half, face === "negZ"); // doorway on side facing lobby
      addWallZ(half, face === "posZ");
      addWallX(-half, face === "negX");
      addWallX(half, face === "posX");

      // ceiling
      const ceil = new THREE.Mesh(
        new THREE.BoxGeometry(ROOM_SIZE, 0.2, ROOM_SIZE),
        new THREE.MeshStandardMaterial({ color: 0x1a1d28, roughness: 1, metalness: 0 })
      );
      ceil.position.set(0, ROOM_H + 0.1, 0);
      g.add(ceil);

      // room light
      const roomLight = new THREE.PointLight(0xffffff, 2.2, 28, 2);
      roomLight.position.set(0, 3.2, 0);
      g.add(roomLight);

      // label inside
      const labelTex = makeCanvasLabel(name, { sub: "ROOM", stroke: "rgba(255,45,122,0.9)", glow: "rgba(127,231,255,0.25)" });
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(3.6, 1.4),
        new THREE.MeshBasicMaterial({ map: labelTex, transparent: true })
      );
      label.position.set(0, 2.4, -half + 0.05);
      g.add(label);

      root.add(g);
      return g;
    }

    const roomVIP = buildRoom(ROOM.VIP);
    const roomStore = buildRoom(ROOM.STORE);
    const roomPoker = buildRoom(ROOM.POKER);
    const roomEvent = buildRoom(ROOM.EVENT);

    // ---------- STORE FRONT DISPLAY CASES (OUTSIDE LOBBY WALL) ----------
    function buildDisplayCase(atAngle, side = -1) {
      // side = -1 left of door, +1 right of door (in door frame local)
      const r = LOBBY_R - 0.95;
      const cx = Math.cos(atAngle) * r;
      const cz = Math.sin(atAngle) * r;

      const g = new THREE.Group();
      g.position.set(cx, 0, cz);
      g.rotation.y = -atAngle;
      g.name = "StoreDisplayCase";

      // offset to side
      g.position.x += Math.cos(atAngle + Math.PI / 2) * (1.9 * side);
      g.position.z += Math.sin(atAngle + Math.PI / 2) * (1.9 * side);

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.35, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x121522, roughness: 0.25, metalness: 0.35 })
      );
      base.position.set(0, 0.175, 0);
      g.add(base);

      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(1.55, 1.6, 0.85),
        matGlass
      );
      glass.position.set(0, 1.15, 0);
      g.add(glass);

      // mannequin placeholder (tall body)
      const manMat = new THREE.MeshStandardMaterial({ color: 0xe8ecff, roughness: 0.9, metalness: 0.05 });
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 8, 16), manMat);
      torso.position.set(0, 1.0, 0);
      g.add(torso);

      const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 8, 16), manMat);
      legs.position.set(0, 0.45, 0);
      g.add(legs);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), manMat);
      head.position.set(0, 1.55, 0);
      g.add(head);

      // small case light
      const pl = new THREE.PointLight(colAqua, 1.2, 8, 2);
      pl.position.set(0, 1.8, 0);
      g.add(pl);

      root.add(g);
      return g;
    }

    // Store door is at angle PI (west)
    buildDisplayCase(Math.PI, -1);
    buildDisplayCase(Math.PI, +1);

    // ---------- TELEPORT PADS (LOCAL SYSTEM, NO DEPENDENCIES) ----------
    // Ray + trigger from controller: teleport player rig to target.
    const raycaster = new THREE.Raycaster();
    const tmpMat = new THREE.Matrix4();
    const tmpDir = new THREE.Vector3();
    const tmpPos = new THREE.Vector3();
    const pads = [];

    function makePad(label, position, targetPos, targetYaw = 0, color = colAqua) {
      const g = new THREE.Group();
      g.name = `TeleportPad_${label}`;
      g.position.copy(position);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.35, 0.52, 48),
        new THREE.MeshStandardMaterial({
          color,
          emissive: new THREE.Color(color),
          emissiveIntensity: 1.15,
          roughness: 0.3,
          metalness: 0.6,
          transparent: true,
          opacity: 0.95
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      // prevent z-fighting on floor
      ring.material.polygonOffset = true;
      ring.material.polygonOffsetFactor = -2;
      ring.material.polygonOffsetUnits = -2;

      g.add(ring);

      // glow decal
      if (tex.teleGlow) {
        const quad = new THREE.Mesh(
          new THREE.PlaneGeometry(1.3, 1.3),
          new THREE.MeshBasicMaterial({ map: tex.teleGlow, transparent: true, opacity: 0.55, depthWrite: false })
        );
        quad.rotation.x = -Math.PI / 2;
        quad.position.y = 0.021;
        g.add(quad);
      }

      const signTex = makeCanvasLabel(label, { w: 512, h: 192, font: "800 56px system-ui", sub: "PRESS TRIGGER" });
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(1.7, 0.64),
        new THREE.MeshBasicMaterial({ map: signTex, transparent: true })
      );
      sign.position.set(0, 1.05, 0);
      g.add(sign);

      root.add(g);

      pads.push({
        mesh: ring,
        group: g,
        targetPos: targetPos.clone(),
        targetYaw
      });

      return g;
    }

    // Place pads in front of lobby openings (just inside lobby)
    makePad("VIP",   v3(0, 0.01, -LOBBY_R + 1.6),  ROOM.VIP.pos.clone().add(v3(0, 0, 0)),  Math.PI);     // face table when inside VIP? we’ll set inside VIP pad too
    makePad("STORE", v3(-LOBBY_R + 1.6, 0.01, 0),  ROOM.STORE.pos.clone(), -Math.PI / 2, colAqua);
    makePad("POKER", v3(LOBBY_R - 1.6, 0.01, 0),   ROOM.POKER.pos.clone(), Math.PI / 2, colPink);
    makePad("EVENT", v3(0, 0.01, LOBBY_R - 1.6),   ROOM.EVENT.pos.clone(), 0, colAqua);

    // Pads INSIDE rooms (return to lobby center by default)
    makePad("LOBBY", roomVIP.position.clone().add(v3(0, 0.01, 2.6)), v3(0, 1.65, 0), 0, colPink);
    makePad("LOBBY", roomStore.position.clone().add(v3(0, 0.01, 2.6)), v3(0, 1.65, 0), 0, colAqua);
    makePad("LOBBY", roomPoker.position.clone().add(v3(0, 0.01, 2.6)), v3(0, 1.65, 0), 0, colPink);
    makePad("LOBBY", roomEvent.position.clone().add(v3(0, 0.01, 2.6)), v3(0, 1.65, 0), 0, colAqua);

    // Storefront -> Store INSIDE (separate pad slightly outside door frame)
    makePad("ENTER STORE", v3(-LOBBY_R + 2.0, 0.01, 0), ROOM.STORE.pos.clone().add(v3(0, 0, 0)), -Math.PI / 2, colAqua);

    // ---------- PIT SAFETY RAIL (ONLY) ----------
    // Blue/gray combined rail, tightened to pit edge
    const railY = 0.95; // above pit floor
    const railR = PIT_R_OUT - 0.35;

    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(railR, 0.08, 14, 160),
      new THREE.MeshStandardMaterial({
        color: 0x8b93a7,
        roughness: 0.25,
        metalness: 0.65,
        emissive: new THREE.Color(0x1a1f2e),
        emissiveIntensity: 0.25
      })
    );
    rail.position.set(0, railY, 0);
    rail.rotation.x = Math.PI / 2;
    root.add(rail);

    // Secondary neon rail slightly above
    const rail2 = new THREE.Mesh(
      new THREE.TorusGeometry(railR, 0.045, 12, 160),
      matNeonA
    );
    rail2.position.set(0, railY + 0.16, 0);
    rail2.rotation.x = Math.PI / 2;
    root.add(rail2);

    // ---------- STAIRS ENTRY (ONE OPENING ONLY) ----------
    // We create a stair/ramp entrance at angle ~0.4 rad (between Poker/Event side)
    // and ensure it doesn't collide with the seated bot positions (we keep it to one slice).
    const stairAngle = 0.45;
    const stairEntryPos = v3(Math.cos(stairAngle) * (PIT_R_OUT - 0.4), 0, Math.sin(stairAngle) * (PIT_R_OUT - 0.4));

    function buildStairs() {
      const g = new THREE.Group();
      g.name = "PitStairs";
      // Place near pit edge, aimed inward
      g.position.copy(stairEntryPos);
      g.rotation.y = -stairAngle + Math.PI; // face toward center

      const steps = 8;
      const stepH = PIT_DEPTH / steps;
      const stepD = 0.45;
      const stepW = 1.4;

      const stepMat = new THREE.MeshStandardMaterial({ color: 0x2b2f3b, roughness: 0.85, metalness: 0.05, map: tex.carpet || null });
      for (let i = 0; i < steps; i++) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), stepMat);
        s.position.set(0, -stepH * (i + 0.5), -(stepD * (i + 0.5)));
        g.add(s);
      }

      // side rails (short)
      const sideMat = new THREE.MeshStandardMaterial({ color: 0x7d879f, roughness: 0.25, metalness: 0.65 });
      const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.8, steps * stepD), sideMat);
      sideL.position.set(-stepW / 2 - 0.06, -0.4, -steps * stepD / 2);
      g.add(sideL);

      const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.8, steps * stepD), sideMat);
      sideR.position.set(stepW / 2 + 0.06, -0.4, -steps * stepD / 2);
      g.add(sideR);

      // Guard bot at top of stairs
      const guard = makeBot("GUARD", v3(0, 0.0, 0.85), 0, { color: 0x1f2330, accent: colPink });
      guard.position.y = 0;
      g.add(guard);

      root.add(g);
      return g;
    }

    // ---------- TABLE + CHAIRS + BOTS (ALIGNED TO PIT FLOOR) ----------
    // Table materials (felt + leather rim)
    const feltMat = new THREE.MeshStandardMaterial({
      color: 0x135a3a,
      roughness: 0.95,
      metalness: 0.02
    });

    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x2a1a16,
      roughness: 0.65,
      metalness: 0.05,
      map: tex.tableLeather || null
    });

    // table
    const table = new THREE.Group();
    table.name = "PokerTable";
    table.position.set(0, TABLE_Y, 0);

    const top = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.14, 64), leatherMat);
    top.position.y = 0.78;
    table.add(top);

    const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 0.06, 64), feltMat);
    felt.position.y = 0.86;
    felt.material.polygonOffset = true;
    felt.material.polygonOffsetFactor = -1;
    felt.material.polygonOffsetUnits = -1;
    table.add(felt);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 0.85, 32), matTrim);
    stem.position.y = 0.38;
    table.add(stem);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.14, 40), matTrim);
    base.position.y = 0.07;
    table.add(base);

    // table light
    const tableLight = new THREE.PointLight(0xffffff, 2.4, 18, 2);
    tableLight.position.set(0, 3.0, 0);
    table.add(tableLight);

    root.add(table);

    // Chairs + players (6 seats)
    const seatN = 6;
    const seatR = 3.2;

    function makeChair() {
      const g = new THREE.Group();
      g.name = "Chair";

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.7), new THREE.MeshStandardMaterial({ color: 0x202436, roughness: 0.8, metalness: 0.05 }));
      seat.position.y = 0.45;
      g.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.12), new THREE.MeshStandardMaterial({ color: 0x252a3f, roughness: 0.85, metalness: 0.05 }));
      back.position.set(0, 0.85, -0.29);
      g.add(back);

      const legMat = new THREE.MeshStandardMaterial({ color: 0x2b2f3b, roughness: 0.6, metalness: 0.15 });
      const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 12);
      const offs = [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]];
      for (const [x, z] of offs) {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(x, 0.22, z);
        g.add(leg);
      }

      // IMPORTANT: chair legs touch pit floor
      g.position.y = 0; // we place chair group on PIT_FLOOR_Y level externally
      return g;
    }

    function makeBot(name, localPos, yaw = 0, { color = 0xe8ecff, accent = colAqua } = {}) {
      const g = new THREE.Group();
      g.name = `Bot_${name}`;
      g.position.copy(localPos);
      g.rotation.y = yaw;

      const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 });
      const accentMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.3, metalness: 0.6, emissive: new THREE.Color(accent), emissiveIntensity: 0.45 });

      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 8, 16), bodyMat);
      torso.position.set(0, 0.95, 0);
      g.add(torso);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 16), bodyMat);
      head.position.set(0, 1.55, 0);
      g.add(head);

      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.02), accentMat);
      visor.position.set(0, 1.55, 0.17);
      g.add(visor);

      // arms
      const armGeo = new THREE.CapsuleGeometry(0.06, 0.35, 6, 12);
      const armL = new THREE.Mesh(armGeo, bodyMat);
      armL.position.set(-0.26, 1.05, 0.05);
      armL.rotation.z = 0.2;
      g.add(armL);

      const armR = new THREE.Mesh(armGeo, bodyMat);
      armR.position.set(0.26, 1.05, 0.05);
      armR.rotation.z = -0.2;
      g.add(armR);

      return g;
    }

    const chairs = [];
    const bots = [];

    for (let i = 0; i < seatN; i++) {
      const a = (i / seatN) * Math.PI * 2;
      const x = Math.cos(a) * seatR;
      const z = Math.sin(a) * seatR;

      const chair = makeChair();
      chair.position.set(x, PIT_FLOOR_Y, z);

      // Face the table (IMPORTANT: chairs were backwards)
      chair.lookAt(0, PIT_FLOOR_Y, 0);
      // chair back should face outward, so rotate 180 to make seat face inward
      chair.rotation.y += Math.PI;

      root.add(chair);
      chairs.push(chair);

      // bot seated on chair
      const bot = makeBot(`P${i + 1}`, v3(x, PIT_FLOOR_Y, z), 0, { color: 0xe8ecff, accent: (i % 2 ? colPink : colAqua) });
      bot.lookAt(0, PIT_FLOOR_Y + 0.9, 0);
      bot.rotation.y += Math.PI; // face inward

      // sit height alignment (no bouncing)
      bot.position.y = PIT_FLOOR_Y - 0.02; // anchor to floor
      bot.children.forEach(ch => { /* keep */ });

      root.add(bot);
      bots.push(bot);
    }

    // Add stairs after bots so we can avoid stepping into them
    const stairs = buildStairs();

    // ---------- HOVER CARDS + TABLE HUD (DEMO) ----------
    // Community cards: 3 -> 4 -> 5 with timing; always face viewer/camera
    const ui = {
      community: [],
      potText: null,
      turnText: null,
      t: 0,
      phase: 0, // 0=preflop,1=flop(3),2=turn(4),3=river(5)
      phaseTimer: 0,
      pot: 1500,
      turn: 0
    };

    function makeCardPlane(w = 0.42, h = 0.58, faceText = "A♠") {
      const tex = makeCanvasLabel(faceText, { w: 512, h: 768, font: "900 120px system-ui", sub: "", bg: "rgba(10,10,16,0.92)" });
      const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      p.name = "CardPlane";
      return p;
    }

    const communityGroup = new THREE.Group();
    communityGroup.name = "CommunityCards";
    communityGroup.position.set(0, TABLE_Y + 2.05, 0); // higher than player cards
    root.add(communityGroup);

    function setCommunityCount(n) {
      // clear
      for (const c of ui.community) communityGroup.remove(c);
      ui.community = [];

      const spacing = 0.55;
      const start = -((n - 1) * spacing) / 2;

      for (let i = 0; i < n; i++) {
        const card = makeCardPlane(0.55, 0.75, ["K♣", "9♦", "A♠", "2♥", "J♠"][i] || "??");
        card.position.set(start + i * spacing, 0, 0);
        ui.community.push(card);
        communityGroup.add(card);
      }
    }
    setCommunityCount(0);

    // Player hole cards (bigger + higher) over each bot
    const holeCards = [];
    for (let i = 0; i < bots.length; i++) {
      const g = new THREE.Group();
      g.name = `HoleCards_${i}`;
      g.position.copy(bots[i].position).add(v3(0, 2.15, 0)); // higher
      root.add(g);

      const c1 = makeCardPlane(0.42, 0.58, "Q♦");
      const c2 = makeCardPlane(0.42, 0.58, "Q♠");
      c1.position.set(-0.26, 0, 0);
      c2.position.set(0.26, 0, 0);
      g.add(c1); g.add(c2);
      holeCards.push(g);
    }

    // Table HUD panel (pot + turn)
    const hudGroup = new THREE.Group();
    hudGroup.name = "TableHUD";
    hudGroup.position.set(0, TABLE_Y + 1.55, -1.85);
    root.add(hudGroup);

    function makeHudLine(text) {
      const t = makeCanvasLabel(text, { w: 768, h: 256, font: "900 70px system-ui", sub: "" });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.86), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
      return { plane: p, tex: t };
    }

    ui.potText = makeHudLine(`POT: ${ui.pot}`);
    ui.potText.plane.position.set(0, 0.55, 0);
    hudGroup.add(ui.potText.plane);

    ui.turnText = makeHudLine(`TURN: P${ui.turn + 1}`);
    ui.turnText.plane.position.set(0, -0.35, 0);
    hudGroup.add(ui.turnText.plane);

    function updateHud() {
      // rebuild textures (simple, safe)
      ui.potText.plane.material.map.dispose?.();
      ui.potText.plane.material.map = makeCanvasLabel(`POT: ${ui.pot}`, { w: 768, h: 256, font: "900 70px system-ui" });
      ui.potText.plane.material.needsUpdate = true;

      ui.turnText.plane.material.map.dispose?.();
      ui.turnText.plane.material.map = makeCanvasLabel(`TURN: P${ui.turn + 1}`, { w: 768, h: 256, font: "900 70px system-ui" });
      ui.turnText.plane.material.needsUpdate = true;
    }

    // ---------- SPATIAL AUDIO (FAIL-SAFE) ----------
    // Uses THREE.PositionalAudio if available; if missing or file missing => no crash.
    const audio = {
      listener: null,
      loader: null,
      clips: {},
      ambient: null,
      ready: false
    };

    function initAudio() {
      try {
        audio.listener = new THREE.AudioListener();
        camera.add(audio.listener);
        audio.loader = new THREE.AudioLoader();
        audio.ready = true;
        log?.("[world] audio listener ✅");
      } catch (e) {
        log?.("[world] audio disabled (listener) — ok");
        audio.ready = false;
      }
    }

    function loadPositional(name, url, { volume = 0.4, ref = 2.5, loop = false } = {}) {
      return new Promise((resolve) => {
        if (!audio.ready || !audio.loader || !THREE.PositionalAudio) return resolve(null);
        const s = new THREE.PositionalAudio(audio.listener);
        audio.loader.load(
          url,
          (buffer) => {
            s.setBuffer(buffer);
            s.setRefDistance(ref);
            s.setVolume(volume);
            s.setLoop(loop);
            resolve(s);
          },
          undefined,
          () => resolve(null)
        );
      });
    }

    initAudio();

    // Only file confirmed in your repo: assets/audio/lobby_ambience.mp3
    audio.clips.ambient = await loadPositional("ambient", "assets/audio/lobby_ambience.mp3", { volume: 0.18, ref: 14, loop: true });
    if (audio.clips.ambient) {
      root.add(audio.clips.ambient);
      audio.clips.ambient.position.set(0, 2.4, 0);
      try { audio.clips.ambient.play(); } catch {}
      log?.("[world] ambient audio ✅");
    }

    // Optional clips (if you add them later; no crash if missing)
    audio.clips.chip = await loadPositional("chip", "assets/audio/chip_throw.mp3", { volume: 0.55, ref: 4 });
    audio.clips.card = await loadPositional("card", "assets/audio/card_slide.mp3", { volume: 0.45, ref: 3 });

    function playSfx(clip, pos) {
      const s = audio.clips[clip];
      if (!s) return;
      s.position.copy(pos);
      try {
        if (s.isPlaying) s.stop();
        s.play();
      } catch {}
    }

    // ---------- OPTIONAL: TRY HOOKING YOUR EXISTING POKER SIM MODULES ----------
    // If your poker_sim or poker_simulation provides callbacks, we can connect here.
    const PokerSimMod =
      (await safeImport("./poker_simulation.js")) ||
      (await safeImport("./poker_sim.js")) ||
      (await safeImport("./poker.js"));

    if (PokerSimMod?.PokerSim?.init) {
      try {
        PokerSimMod.PokerSim.init({
          THREE, root, table, bots, log,
          onDeal: (pos) => playSfx("card", pos || table.position.clone().add(v3(0, 1.0, 0))),
          onChip: (pos) => playSfx("chip", pos || table.position.clone().add(v3(0, 1.0, 0))),
        });
        log?.("[world] PokerSim.init ✅");
      } catch (e) {
        log?.("[world] PokerSim.init failed (safe) — using demo visuals");
      }
    }

    // ---------- VIP SPAWN (DEFAULT) ----------
    // Spawn you INSIDE VIP room, facing table direction (toward lobby center).
    // Keep standing height always.
    const vipSpawn = ROOM.VIP.pos.clone().add(v3(0, 1.65, 0));
    player.position.copy(vipSpawn);
    player.rotation.set(0, Math.PI, 0); // face toward lobby/table (VIP is at -Z, so yaw PI faces +Z)

    // ---------- UPDATE LOOP ----------
    // Teleport interaction + UI billboard facing + poker demo phases
    let lastTrigger = [false, false];
    const padMeshes = pads.map(p => p.mesh);

    function controllerRayHit(controller) {
      if (!controller) return null;
      tmpMat.identity().extractRotation(controller.matrixWorld);
      tmpDir.set(0, 0, -1).applyMatrix4(tmpMat).normalize();
      tmpPos.setFromMatrixPosition(controller.matrixWorld);

      raycaster.set(tmpPos, tmpDir);
      const hits = raycaster.intersectObjects(padMeshes, false);
      return hits && hits.length ? hits[0] : null;
    }

    function getTriggerPressed(inputSource) {
      const gp = inputSource?.gamepad;
      if (!gp || !gp.buttons || gp.buttons.length === 0) return false;
      // Trigger usually button[0] or button[1] depending device; choose strongest.
      const b0 = gp.buttons[0]?.pressed || gp.buttons[0]?.value > 0.6;
      const b1 = gp.buttons[1]?.pressed || gp.buttons[1]?.value > 0.6;
      return !!(b0 || b1);
    }

    function doTeleport(targetPos, targetYaw) {
      // preserve standing height exactly
      player.position.set(targetPos.x, 1.65, targetPos.z);
      player.rotation.y = targetYaw;
      playSfx("chip", player.position.clone().add(v3(0, 0, 0))); // subtle blip if clip exists
    }

    // Subtle volumetric god-ray over pit (requested earlier)
    const godRay = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 5.1, 12, 32, 1, true),
      new THREE.MeshBasicMaterial({ color: colAqua, transparent: true, opacity: 0.035, side: THREE.DoubleSide, depthWrite: false })
    );
    godRay.position.set(0, 4.2, 0);
    root.add(godRay);

    // Store hologram (in STORE room)
    const holo = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.6, 1),
      new THREE.MeshStandardMaterial({ color: colAqua, wireframe: true, emissive: new THREE.Color(colAqua), emissiveIntensity: 2 })
    );
    holo.position.copy(roomStore.position).add(v3(0, 1.2, 0));
    root.add(holo);

    // Scorpion tank (in EVENT room for now; you can move to scorpion_room.js later)
    const tank = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 4), new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.9 }));
    tank.position.copy(roomEvent.position).add(v3(0, -0.1, 0));
    root.add(tank);

    const tankGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 4),
      new THREE.MeshPhysicalMaterial({ transparent: true, opacity: 0.35, transmission: 0.85, roughness: 0.08, metalness: 0 })
    );
    tankGlass.position.copy(roomEvent.position).add(v3(0, 0.01, 0));
    tankGlass.rotation.x = -Math.PI / 2;
    root.add(tankGlass);

    // Keep a reference for other modules/debug
    ctx.world = {
      root, table, bots, chairs, pads,
      rooms: { roomVIP, roomStore, roomPoker, roomEvent }
    };

    // Attach update
    this.update = (ctx2, dt) => {
      ui.t += dt;

      // Face all labels/cards toward camera
      const camPos = camera.getWorldPosition(new THREE.Vector3());

      // community faces viewer
      communityGroup.lookAt(camPos);

      // hole cards groups face viewer
      for (const g of holeCards) g.lookAt(camPos);

      // table HUD faces viewer
      hudGroup.lookAt(camPos);

      // Hologram rotate
      holo.rotation.y += dt * 0.65;

      // Gentle godRay pulse
      const pulse = 0.03 + 0.01 * Math.sin(ui.t * 1.4);
      godRay.material.opacity = pulse;

      // Demo poker pacing:
      // 0-3s: preflop, then flop, then turn, then river
      ui.phaseTimer += dt;
      if (ui.phase === 0 && ui.phaseTimer > 2.5) {
        ui.phase = 1; ui.phaseTimer = 0;
        setCommunityCount(3);
        playSfx("card", table.position.clone().add(v3(0, 1.0, 0)));
      } else if (ui.phase === 1 && ui.phaseTimer > 3.2) {
        ui.phase = 2; ui.phaseTimer = 0;
        setCommunityCount(4);
        ui.pot += 600;
        ui.turn = (ui.turn + 1) % seatN;
        updateHud();
        playSfx("chip", table.position.clone().add(v3(0, 1.0, 0)));
      } else if (ui.phase === 2 && ui.phaseTimer > 3.2) {
        ui.phase = 3; ui.phaseTimer = 0;
        setCommunityCount(5);
        ui.pot += 900;
        ui.turn = (ui.turn + 1) % seatN;
        updateHud();
        playSfx("chip", table.position.clone().add(v3(0, 1.0, 0)));
      } else if (ui.phase === 3 && ui.phaseTimer > 4.0) {
        // reset demo loop
        ui.phase = 0; ui.phaseTimer = 0;
        setCommunityCount(0);
        ui.pot = 1500;
        ui.turn = 0;
        updateHud();
      }

      // Teleport pad selection
      const session = renderer.xr.getSession?.();
      if (session) {
        const sources = session.inputSources || [];
        // map left/right for trigger handling
        const srcL = sources.find(s => s?.handedness === "left") || null;
        const srcR = sources.find(s => s?.handedness === "right") || null;

        const pressedL = getTriggerPressed(srcL);
        const pressedR = getTriggerPressed(srcR);

        // Find a hit from either controller ray
        const hitL = controllerRayHit(controllers?.[0]);
        const hitR = controllerRayHit(controllers?.[1]);
        const hit = hitL || hitR;

        if (hit) {
          const pad = pads.find(p => p.mesh === hit.object);
          if (pad) {
            // glow the ring slightly when targeted
            pad.mesh.material.emissiveIntensity = 1.6;
          }
        }
        // restore emissive on pads
        for (const p of pads) {
          p.mesh.material.emissiveIntensity = lerp(p.mesh.material.emissiveIntensity, 1.15, 0.08);
        }

        // On rising edge of trigger, teleport
        if ((pressedL && !lastTrigger[0]) || (pressedR && !lastTrigger[1])) {
          if (hit) {
            const pad = pads.find(p => p.mesh === hit.object);
            if (pad) doTeleport(pad.targetPos, pad.targetYaw);
          }
        }

        lastTrigger[0] = pressedL;
        lastTrigger[1] = pressedR;
      }
    };

    log?.("[world] build complete ✅ (VIP spawn + pit + rooms + pads + demo poker)");
  }
};
