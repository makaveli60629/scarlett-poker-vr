// /js/world.js — Scarlett MASTER WORLD v6 (Store + Teleport Arch + Full-body Bots + Proper Chips + Pot HUD)
// ✅ Preserves wall structure concept (solid ring wall + 4 door gaps)
// ✅ Adds: Store room, teleport arch machine, full-body bots, mannequins, chairs, pot HUD, 6-seat chip toss, leather trim
// ✅ GitHub Pages safe: no bare "three" imports

import { PokerSim } from "./poker_sim.js";

export const World = (() => {
  const S = {
    THREE: null, scene: null, renderer: null, camera: null, player: null, controllers: null,
    log: console.log, root: null, colliders: [], t: 0,

    ringIn: 10, ringOut: 18,
    wallR: 20.0, wallH: 9.0,

    pitR: 6.35, pitY: -1.10, rimY: 0.08, rimOut: 9.0,

    tableY: 0, tableTop: null,

    tex: null,

    poker: null,

    // chips & pot
    chipSources: [], // {pos, color}
    chipMeshes: [],  // pooled chips
    potValue: 0,
    potHUD: null,

    // bots
    bots: [],
    mannequins: [],
    storeRoot: null,

    // teleporter arch
    arch: null
  };

  const log = (m) => S.log?.(m);

  function add(obj, collider = false) {
    S.root.add(obj);
    if (collider) S.colliders.push(obj);
    return obj;
  }

  // ---------- materials / textures ----------
  function mkProceduralTexture() {
    const { THREE } = S;
    const c = document.createElement("canvas");
    c.width = 256; c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#0b0d14"; g.fillRect(0,0,256,256);

    g.strokeStyle = "rgba(127,231,255,0.10)";
    g.lineWidth = 2;
    for (let i=0;i<=16;i++){
      const p=i*(256/16);
      g.beginPath(); g.moveTo(p,0); g.lineTo(p,256); g.stroke();
      g.beginPath(); g.moveTo(0,p); g.lineTo(256,p); g.stroke();
    }
    g.strokeStyle = "rgba(255,45,122,0.08)";
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(0,0); g.lineTo(256,256); g.stroke();
    g.beginPath(); g.moveTo(256,0); g.lineTo(0,256); g.stroke();

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2.5, 2.5);
    tex.anisotropy = 4;
    return tex;
  }

  function mat(color, rough=1, metal=0, emissive=0x000000, emiI=0, map=null) {
    const { THREE } = S;
    return new THREE.MeshStandardMaterial({
      color, roughness: rough, metalness: metal,
      emissive: new THREE.Color(emissive), emissiveIntensity: emiI,
      map: map || null
    });
  }

  function makeTextTag(text, color=0x7fe7ff) {
    const { THREE } = S;
    const c = document.createElement("canvas");
    c.width = 512; c.height = 128;
    const g = c.getContext("2d");
    g.clearRect(0,0,c.width,c.height);

    // panel
    g.fillStyle = "rgba(10,12,18,0.75)";
    g.strokeStyle = "rgba(255,255,255,0.12)";
    g.lineWidth = 6;
    roundRect(g, 10, 10, 492, 108, 24);
    g.fill(); g.stroke();

    // accent line
    g.strokeStyle = `rgba(127,231,255,0.9)`;
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(26, 96); g.lineTo(486, 96);
    g.stroke();

    // text
    g.font = "bold 56px system-ui, Arial";
    g.fillStyle = "#e8ecff";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 256, 56);

    const tex = new THREE.CanvasTexture(c);
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.22), m);
    p.userData._tag = true;
    return p;

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x+r, y);
      ctx.arcTo(x+w, y, x+w, y+h, r);
      ctx.arcTo(x+w, y+h, x, y+h, r);
      ctx.arcTo(x, y+h, x, y, r);
      ctx.arcTo(x, y, x+w, y, r);
      ctx.closePath();
    }
  }

  // ---------- lighting ----------
  function buildLights() {
    const { THREE } = S;

    add(new THREE.HemisphereLight(0xffffff, 0x05060a, 1.8));

    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(14, 18, 10);
    add(key);

    // overhead clusters
    const pts = [
      [0, 10.8, 0, 60],
      [12, 9.8, 0, 40],
      [-12, 9.8, 0, 40],
      [0, 9.8, 12, 40],
      [0, 9.8, -12, 40],
      [8, 9.2, 8, 28],
      [-8, 9.2, -8, 28],
    ];
    for (const [x,y,z,i] of pts) {
      const l = new THREE.PointLight(0xffffff, i, 110);
      l.position.set(x,y,z);
      add(l);
    }

    // neon accents
    const aqua = new THREE.PointLight(0x7fe7ff, 16, 65);
    aqua.position.set(0, 3.5, 16);
    add(aqua);

    const pink = new THREE.PointLight(0xff2d7a, 14, 65);
    pink.position.set(-16, 3.5, 0);
    add(pink);

    log("[world] lights ✅ (bright pass)");
  }

  // ---------- structure ----------
  function buildFloorRing() {
    const { THREE } = S;

    const base = new THREE.Mesh(
      new THREE.CircleGeometry(72, 160),
      mat(0x141626, 1, 0, 0x000000, 0, S.tex)
    );
    base.rotation.x = -Math.PI/2;
    add(base, true);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(S.ringIn, S.ringOut, 180),
      mat(0x0f1224, 0.85, 0.08, 0x000000, 0, S.tex)
    );
    ring.rotation.x = -Math.PI/2;
    ring.position.y = 0.03;
    add(ring, true);

    const neon = new THREE.Mesh(
      new THREE.RingGeometry(S.ringOut-0.22, S.ringOut+0.10, 180),
      mat(0x121428, 0.35, 0.25, 0x2dfcff, 1.1)
    );
    neon.rotation.x = -Math.PI/2;
    neon.position.y = 0.06;
    add(neon);

    log("[world] floor + ring ✅");
  }

  function buildOuterWallsPreserved() {
    const { THREE } = S;

    const R = S.wallR;
    const H = S.wallH;
    const gap = Math.PI/6;

    function makeSegment(a0, a1) {
      const segs = 60;
      const inner = R - 0.35;
      const outer = R + 0.35;

      const shape = new THREE.Shape();
      const pts = [];
      for (let i=0;i<=segs;i++){
        const t=i/segs, a=a0+(a1-a0)*t;
        pts.push(new THREE.Vector2(Math.cos(a)*outer, Math.sin(a)*outer));
      }
      shape.moveTo(pts[0].x, pts[0].y);
      for (let i=1;i<pts.length;i++) shape.lineTo(pts[i].x, pts[i].y);
      for (let i=segs;i>=0;i--){
        const t=i/segs, a=a0+(a1-a0)*t;
        shape.lineTo(Math.cos(a)*inner, Math.sin(a)*inner);
      }
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, { depth: H, bevelEnabled:false, curveSegments: 24 });
      geo.rotateX(Math.PI/2);

      const wall = new THREE.Mesh(geo, mat(0x0b0d14, 0.95, 0.07, 0x000000, 0, S.tex));
      wall.position.y = 0;
      add(wall, true);

      // top glow band
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(R, 0.16, 10, 220, Math.abs(a1-a0)),
        mat(0x141a33, 0.45, 0.25, 0xff2d7a, 0.65)
      );
      band.rotation.x = Math.PI/2;
      band.rotation.z = (a0+a1)/2;
      band.position.y = H - 0.35;
      add(band);

      return wall;
    }

    makeSegment(gap, Math.PI/2 - gap);
    makeSegment(Math.PI/2 + gap, Math.PI - gap);
    makeSegment(Math.PI + gap, 3*Math.PI/2 - gap);
    makeSegment(3*Math.PI/2 + gap, 2*Math.PI - gap);

    log("[world] outer walls ✅");
  }

  function buildPitTableRailStairsAndChairs() {
    const { THREE } = S;

    // rim
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(S.pitR, S.rimOut, 200),
      mat(0x0a0c18, 0.85, 0.18, 0x2dfcff, 0.22, S.tex)
    );
    rim.rotation.x = -Math.PI/2;
    rim.position.y = S.rimY;
    add(rim, true);

    // inner wall
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(S.pitR, S.pitR, (S.rimY - S.pitY), 120, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 1, metalness: 0.1, side: THREE.DoubleSide })
    );
    wall.position.y = (S.rimY + S.pitY)/2;
    add(wall, true);

    // pit floor
    const pit = new THREE.Mesh(
      new THREE.CircleGeometry(S.pitR - 0.05, 200),
      mat(0x070812, 1, 0.02, 0x1b2cff, 0.20)
    );
    pit.rotation.x = -Math.PI/2;
    pit.position.y = S.pitY;
    add(pit, true);

    // seam
    const seam = new THREE.Mesh(
      new THREE.RingGeometry(S.pitR - 0.10, S.pitR + 0.10, 200),
      mat(0x121428, 0.35, 0.3, 0x2dfcff, 1.35)
    );
    seam.rotation.x = -Math.PI/2;
    seam.position.y = S.rimY + 0.01;
    add(seam);

    // table
    S.tableY = S.pitY + 1.05;

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(3.05, 3.28, 0.30, 56),
      mat(0x0f6a42, 0.85, 0.05, 0x0f6a42, 0.10)
    );
    top.position.set(0, S.tableY, 0);
    add(top, true);
    S.tableTop = top;

    // leather trim
    const leather = new THREE.Mesh(
      new THREE.TorusGeometry(3.18, 0.11, 14, 120),
      mat(0x3a2518, 0.65, 0.15, 0x3a2518, 0.05) // warm brown leather-ish
    );
    leather.rotation.x = Math.PI/2;
    leather.position.y = S.tableY + 0.16;
    add(leather);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 1.0, 1.1, 26),
      mat(0x10131c, 0.8, 0.22)
    );
    base.position.set(0, S.tableY - 0.75, 0);
    add(base);

    // rail opening + gate + stairs
    const railR = S.rimOut - 0.25;
    const openingCenter = -Math.PI/2;   // south
    const openingHalf = 0.18;

    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(railR, 0.09, 12, 240),
      mat(0x2a2f52, 0.5, 0.35, 0xff2d7a, 0.40)
    );
    rail.rotation.x = Math.PI/2;
    rail.position.y = S.rimY + 1.18;
    // keep it, but posts will leave opening (visual opening reads fine)
    add(rail);

    const postCount = 30;
    for (let i=0;i<postCount;i++){
      const a = (i/postCount)*Math.PI*2;
      const da = Math.atan2(Math.sin(a-openingCenter), Math.cos(a-openingCenter));
      if (Math.abs(da) < openingHalf) continue;

      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 1.08, 12),
        mat(0x1f2440, 0.7, 0.2)
      );
      post.position.set(Math.cos(a)*railR, S.rimY + 0.64, Math.sin(a)*railR);
      add(post);
    }

    const gate = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 1.0, 0.12),
      mat(0x141a33, 0.55, 0.25, 0x2dfcff, 1.1)
    );
    gate.position.set(Math.cos(openingCenter)*railR, S.rimY + 0.80, Math.sin(openingCenter)*railR);
    gate.lookAt(0, gate.position.y, 0);
    add(gate);

    const steps = 10;
    const stepW = 1.9;
    const stepH = (S.rimY - (S.pitY + 0.05)) / steps;
    const stepD = 0.55;

    for (let i=0;i<steps;i++){
      const y = S.rimY - (i+1)*stepH;
      const r = railR - 0.75 - i*0.12;
      const x = Math.cos(openingCenter)*r;
      const z = Math.sin(openingCenter)*r;

      const step = new THREE.Mesh(
        new THREE.BoxGeometry(stepW, Math.max(0.05, stepH), stepD),
        mat(0x111326, 1, 0.08, 0x2dfcff, 0.14, S.tex)
      );
      step.position.set(x, y, z);
      step.lookAt(0, y, 0);
      add(step, true);
    }

    // chairs (6) — placed in pit around table
    const seatN = 6;
    for (let i=0;i<seatN;i++){
      const a = (i/seatN)*Math.PI*2;
      const r = 4.05;
      const x = Math.cos(a)*r;
      const z = Math.sin(a)*r;

      const chair = new THREE.Group();
      chair.position.set(x, S.pitY + 0.12, z);
      chair.lookAt(0, chair.position.y + 0.2, 0);

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.10, 0.62), mat(0x141a33, 0.85, 0.12));
      seat.position.y = 0.55;
      chair.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.10), mat(0x141a33, 0.85, 0.12));
      back.position.set(0, 0.92, -0.26);
      chair.add(back);

      const legMat = mat(0x1f2440, 0.7, 0.25);
      const legGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.55, 10);
      const offsets = [[-0.25, -0.25],[0.25,-0.25],[-0.25,0.25],[0.25,0.25]];
      for (const [ox,oz] of offsets){
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(ox, 0.25, oz);
        chair.add(leg);
      }

      add(chair, true);
    }

    log("[world] pit+table+chairs ✅");
  }

  function buildJumbotronsEmbedded() {
    const { THREE } = S;

    const y = S.wallH - 2.1;
    const R = S.wallR - 0.32;
    const w = 10.8, h = 5.9, thickness = 0.18;

    function screenAt(angle) {
      const x = Math.cos(angle)*R;
      const z = Math.sin(angle)*R;
      const rotY = -angle + Math.PI/2;

      const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, thickness), mat(0x10142a, 0.55, 0.25, 0xff2d7a, 0.20));
      frame.position.set(x, y, z);
      frame.rotation.y = rotY;
      add(frame);

      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(w-0.9, h-0.9),
        new THREE.MeshStandardMaterial({
          color: 0x081027,
          emissive: new THREE.Color(0x1b2cff),
          emissiveIntensity: 1.75,
          roughness: 0.75,
          metalness: 0.1
        })
      );
      screen.position.set(x, y, z + 0.095);
      screen.rotation.y = rotY;
      add(screen);
    }

    screenAt(0);
    screenAt(Math.PI/2);
    screenAt(Math.PI);
    screenAt(3*Math.PI/2);

    log("[world] jumbotrons ✅");
  }

  // ---------- teleport arch machine ----------
  function buildTeleportArchMachine() {
    const { THREE } = S;

    const g = new THREE.Group();
    g.position.set(0, 0, 17.2); // near ring edge

    // arch frame
    const frame = new THREE.Mesh(
      new THREE.TorusGeometry(1.65, 0.12, 18, 80, Math.PI),
      mat(0x141a33, 0.55, 0.35, 0xff2d7a, 0.35)
    );
    frame.rotation.y = Math.PI;
    frame.position.y = 1.3;
    g.add(frame);

    // base platform
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.65, 0.22, 36), mat(0x111326, 0.9, 0.25, 0x2dfcff, 0.15, S.tex));
    base.position.y = 0.11;
    g.add(base);

    // portal plane glow
    const portal = new THREE.Mesh(
      new THREE.CircleGeometry(1.28, 64),
      mat(0x0b0d14, 0.25, 0.15, 0x8a2bff, 1.75) // purple glow
    );
    portal.position.set(0, 1.25, 0.01);
    portal.rotation.y = Math.PI;
    g.add(portal);

    // small lights for pop
    const l1 = new THREE.PointLight(0x8a2bff, 16, 18);
    l1.position.set(0, 1.35, 0.35);
    g.add(l1);

    const l2 = new THREE.PointLight(0xff2d7a, 10, 14);
    l2.position.set(0.8, 0.8, 0.2);
    g.add(l2);

    add(g, true);
    S.arch = { root: g, portal };

    log("[world] teleport arch ✅");
  }

  // ---------- full-body bot (shoulders/waist/hips/knees/feet) ----------
  function makeFullBodyBot(name="Bot", accent=0x7fe7ff) {
    const { THREE } = S;

    const g = new THREE.Group();
    g.name = name;

    // proportions
    const skin = mat(0x141a33, 0.7, 0.25, accent, 0.12);
    const suit = mat(0x111326, 0.9, 0.2, accent, 0.05);
    const limb = mat(0x1f2440, 0.8, 0.2);

    // hips/waist
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.22), suit);
    hips.position.y = 0.92;
    g.add(hips);

    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.38, 12), suit);
    waist.position.y = 1.14;
    g.add(waist);

    // chest + shoulders
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.26), suit);
    chest.position.y = 1.40;
    g.add(chest);

    const shoulderBar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.22), suit);
    shoulderBar.position.y = 1.56;
    g.add(shoulderBar);

    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), skin);
    head.position.y = 1.82;
    g.add(head);

    // legs: thigh -> knee -> calf -> foot
    function leg(side=1) {
      const L = new THREE.Group();
      L.position.set(0.14*side, 0.90, 0);

      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.42, 10), limb);
      thigh.position.y = -0.18;
      L.add(thigh);

      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), mat(0x2a2f52, 0.7, 0.25, accent, 0.10));
      knee.position.y = -0.42;
      L.add(knee);

      const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.40, 10), limb);
      calf.position.y = -0.62;
      L.add(calf);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.22), mat(0x141a33, 0.7, 0.25));
      foot.position.set(0, -0.85, 0.05);
      L.add(foot);

      return L;
    }
    g.add(leg(1));
    g.add(leg(-1));

    // arms: upper -> elbow -> forearm -> hand
    function arm(side=1) {
      const A = new THREE.Group();
      A.position.set(0.34*side, 1.52, 0);

      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.34, 10), limb);
      upper.rotation.z = side * 0.65;
      upper.position.y = -0.12;
      A.add(upper);

      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), mat(0x2a2f52, 0.7, 0.25, accent, 0.12));
      elbow.position.set(0.16*side, -0.30, 0);
      A.add(elbow);

      const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.052, 0.32, 10), limb);
      fore.rotation.z = side * 1.05;
      fore.position.set(0.26*side, -0.44, 0);
      A.add(fore);

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), skin);
      hand.position.set(0.36*side, -0.60, 0);
      A.add(hand);

      return A;
    }
    g.add(arm(1));
    g.add(arm(-1));

    // name tag (real text)
    const tag = makeTextTag(name, accent);
    tag.position.set(0, 2.18, 0);
    g.add(tag);

    // simple “shirt” plane overlay (low-poly clothing layer)
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.42, 0.27), suit);
    shirt.position.y = 1.40;
    shirt.userData._shirt = true;
    g.add(shirt);

    g.userData.accent = accent;
    return g;
  }

  function tryLoadShirtTexture(onDone) {
    // Tries a few likely filenames; falls back if none load.
    const { THREE } = S;
    const loader = new THREE.TextureLoader();

    const candidates = [
      "assets/textures/tshirt.png",
      "assets/textures/tshirt_diffuse.png",
      "assets/textures/shirt.png",
      "assets/textures/shirt_diffuse.png"
    ];

    let idx = 0;
    const next = () => {
      if (idx >= candidates.length) return onDone(null);
      const url = candidates[idx++];
      loader.load(
        url,
        (tex) => { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1,1); onDone(tex); },
        undefined,
        () => next()
      );
    };
    next();
  }

  function buildBotsAndStore() {
    const { THREE } = S;

    // a couple walking bots in lobby
    const walkers = 3;
    for (let i=0;i<walkers;i++){
      const bot = makeFullBodyBot(`Bot_${i+1}`, i%2===0 ? 0x7fe7ff : 0xff2d7a);
      bot.userData.walk = { a: (i/walkers)*Math.PI*2, r: 14.8, speed: 0.22 + i*0.03 };
      add(bot, true);
      S.bots.push(bot);
    }

    // STORE in the North room area (simple bright build)
    const store = new THREE.Group();
    store.name = "StoreRoom";
    store.position.set(0, 0, -32); // north room center
    add(store, true);
    S.storeRoot = store;

    // store floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(20, 0.30, 20), mat(0x0f1224, 0.95, 0.1, 0x2dfcff, 0.10, S.tex));
    floor.position.y = 0.15;
    store.add(floor);

    // store walls (keep it simple)
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(20, 8.5, 20),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 1, metalness: 0.05, transparent: true, opacity: 0.22, map: S.tex })
    );
    walls.position.y = 4.25;
    store.add(walls);

    // store sign
    const sign = makeTextTag("SCARLETT STORE", 0x2dfcff);
    sign.position.set(0, 6.6, 9.8);
    sign.rotation.y = Math.PI;
    store.add(sign);

    // bright store lights
    const sl1 = new THREE.PointLight(0x7fe7ff, 22, 55);
    sl1.position.set(0, 6.8, 0);
    store.add(sl1);

    const sl2 = new THREE.PointLight(0xff2d7a, 16, 45);
    sl2.position.set(-6, 5.8, 4);
    store.add(sl2);

    // display cases: big center with 3 mannequins + 2 side cases near entrance
    function makeCase(w,h,d, x,z) {
      const c = new THREE.Group();
      c.position.set(x, 0, z);

      const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), mat(0x111326, 0.9, 0.2, 0x2dfcff, 0.12));
      base.position.y = 0.125;
      c.add(base);

      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(w-0.2, h, d-0.2),
        new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.1, metalness: 0.05, transparent: true, opacity: 0.12 })
      );
      glass.position.y = h/2 + 0.25;
      c.add(glass);

      const strip = new THREE.Mesh(new THREE.BoxGeometry(w-0.6, 0.08, d-0.6), mat(0x111326, 0.3, 0.2, 0x8a2bff, 1.25));
      strip.position.y = 0.29;
      c.add(strip);

      store.add(c);
      return c;
    }

    const big = makeCase(9.0, 2.6, 2.4, 0, 0);
    const left = makeCase(3.6, 2.4, 1.8, -7.2, 8.2);
    const right = makeCase(3.6, 2.4, 1.8, 7.2, 8.2);

    // mannequins (3 in big case)
    const manColors = [0x7fe7ff, 0xff2d7a, 0x8a2bff];
    for (let i=0;i<3;i++){
      const m = makeFullBodyBot(`Mannequin_${i+1}`, manColors[i]);
      m.position.set(-2.4 + i*2.4, 0, 0);
      m.scale.set(0.95, 0.95, 0.95);
      big.add(m);
      S.mannequins.push(m);
    }

    // one mannequin in each side case
    const ml = makeFullBodyBot("Mannequin_L", 0x2dfcff);
    ml.position.set(0,0,0);
    left.add(ml);
    S.mannequins.push(ml);

    const mr = makeFullBodyBot("Mannequin_R", 0xff2d7a);
    mr.position.set(0,0,0);
    right.add(mr);
    S.mannequins.push(mr);

    // Try to apply a shirt texture to ONE mannequin (demo)
    tryLoadShirtTexture((tex) => {
      if (!tex) { log("[store] shirt texture not found (fallback used)"); return; }
      const shirtMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.02 });
      const target = S.mannequins[0];
      target?.traverse?.((o) => {
        if (o?.isMesh && o.userData?._shirt) o.material = shirtMat;
      });
      log("[store] shirt texture applied ✅ (Mannequin_1)");
    });

    log("[world] store ✅ (3+2 display cases + sign)");
  }

  // ---------- chips + pot HUD ----------
  function buildChipsAndPotHUD() {
    const { THREE } = S;

    // pot HUD above table (visible from far away)
    const hud = new THREE.Group();
    hud.position.set(0, S.tableY + 2.8, 0); // higher so you can see from ring
    add(hud);

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.55),
      new THREE.MeshBasicMaterial({ color: 0x0b0d14, transparent:true, opacity: 0.75 })
    );
    hud.add(panel);

    const label = makeTextTag("POT: 0", 0x2dfcff);
    label.position.set(0, 0, 0.01);
    hud.add(label);

    S.potHUD = { root: hud, label, set: (v) => {
      // rebuild label texture by replacing mesh
      hud.remove(label);
      const next = makeTextTag(`POT: ${v}`, 0x2dfcff);
      next.position.set(0, 0, 0.01);
      hud.add(next);
      S.potHUD.label = next;
    }};

    // chip pool
    const chipGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.035, 18);
    for (let i=0;i<42;i++){
      const chip = new THREE.Mesh(chipGeo, mat(0xff2d7a, 0.6, 0.15));
      chip.visible = true;
      add(chip);
      S.chipMeshes.push(chip);
    }

    // chip sources: 6 seats around table (everyone contributes)
    S.chipSources.length = 0;
    const n = 6;
    for (let i=0;i<n;i++){
      const a = (i/n)*Math.PI*2;
      const r = 2.85; // near felt edge
      const pos = new THREE.Vector3(Math.cos(a)*r, S.tableY + 0.22, Math.sin(a)*r);
      const color = (i%2===0) ? 0x7fe7ff : 0xff2d7a;
      S.chipSources.push({ pos, color });
    }

    log("[world] pot HUD + chip pool ✅");
  }

  function updatePotAndChips(dt) {
    if (!S.tableTop || !S.chipMeshes.length) return;

    // face HUD to camera
    if (S.potHUD?.root && S.camera) {
      S.potHUD.root.lookAt(S.camera.position.x, S.camera.position.y, S.camera.position.z);
    }

    // toss chips from ALL seats in a loop, and stack in the center
    const to = new S.THREE.Vector3(0, S.tableY + 0.22, 0);
    const period = 1.35;
    const totalSeats = S.chipSources.length;

    // use first (seats*5) chips as active tossers, rest as pot stack
    const active = Math.min(S.chipMeshes.length, totalSeats * 5);

    for (let i=0;i<active;i++){
      const seat = i % totalSeats;
      const wave = Math.floor(i / totalSeats); // 0..4
      const src = S.chipSources[seat];

      const t = (S.t / period + seat*0.12 + wave*0.20) % 1;

      // each chip spends part of its time "resting" at seat, then tosses
      const k = smoothstep(0.15, 0.70, t);

      const p = src.pos.clone().lerp(to, k);
      p.y += Math.sin(k*Math.PI) * 0.65;

      const chip = S.chipMeshes[i];
      chip.material = mat(src.color, 0.6, 0.15);
      chip.position.copy(p);
      chip.rotation.set(Math.PI/2, 0, 0); // FLAT (fix)
    }

    // pot stack
    for (let i=active;i<S.chipMeshes.length;i++){
      const idx = i - active;
      const chip = S.chipMeshes[i];
      chip.position.set((idx%5)*0.11 - 0.22, S.tableY + 0.22 + Math.floor(idx/5)*0.04, (Math.floor(idx/5)%2)*0.11 - 0.055);
      chip.rotation.set(Math.PI/2, 0, 0);
    }

    // pot value increases over time (demo)
    const newPot = Math.floor(S.t * 18);
    if (newPot !== S.potValue) {
      S.potValue = newPot;
      S.potHUD?.set?.(S.potValue);
    }

    function smoothstep(a,b,x){
      const t = Math.max(0, Math.min(1, (x-a)/(b-a)));
      return t*t*(3-2*t);
    }
  }

  // ---------- init ----------
  async function init({ THREE, scene, renderer, camera, player, controllers, log: logFn }) {
    S.THREE = THREE; S.scene = scene; S.renderer = renderer; S.camera = camera;
    S.player = player; S.controllers = controllers; S.log = logFn || console.log;

    S.root = new THREE.Group();
    S.root.name = "WorldRoot";
    scene.add(S.root);

    scene.fog = new THREE.Fog(0x05060a, 18, 140);

    S.tex = mkProceduralTexture();

    log("[world] init … v6");

    buildLights();
    buildFloorRing();
    buildOuterWallsPreserved();
    buildPitTableRailStairsAndChairs();
    buildJumbotronsEmbedded();
    buildTeleportArchMachine();
    buildBotsAndStore();

    // PokerSim (real dealing)
    S.poker = PokerSim;
    S.poker.init({
      THREE,
      scene,
      root: S.root,
      log: (m) => log(m),
      tableCenter: new THREE.Vector3(0, 0, 0),
      tableY: S.tableY,
      tableR: 3.05,
      seatCount: 6
    });
    S.poker.startNewHand();
    log("[world] poker sim ✅ (auto-hand started)");

    // Pot + chips + HUD
    buildChipsAndPotHUD();

    // spawn
    if (player) {
      player.position.set(0, 0, 12.5);
      player.rotation.set(0, Math.PI, 0);
    }

    log("[world] build complete ✅ (MASTER v6)");
  }

  function update(dt) {
    S.t += dt;

    // animate walking bots
    for (const bot of S.bots) {
      const w = bot.userData.walk;
      if (!w) continue;
      w.a += dt * w.speed;
      bot.position.set(Math.cos(w.a)*w.r, 0, Math.sin(w.a)*w.r);
      bot.lookAt(0, 1.3, 0);

      // small limb swing
      const s = Math.sin(S.t*2 + w.a*3) * 0.22;
      bot.traverse((o) => {
        if (o?.type === "Group" && o.parent === bot && o.children?.length) o.rotation.x = s*0.15;
      });
    }

    // keep tags facing camera
    for (const b of [...S.bots, ...S.mannequins]) {
      b?.traverse?.((o) => {
        if (o?.userData?._tag && S.camera) o.lookAt(S.camera.position);
      });
    }

    updatePotAndChips(dt);
    S.poker?.update?.(dt);

    // portal pulse
    if (S.arch?.portal) {
      const pulse = 1.55 + Math.sin(S.t*2.2)*0.25;
      S.arch.portal.material.emissiveIntensity = pulse;
    }
  }

  return { init, update, get colliders() { return S.colliders; } };
})();
