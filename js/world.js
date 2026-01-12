// /js/world.js — Scarlett MASTER WORLD v3 (Stable + Walls + Stairs + Bots + Chips)
// ✅ NO imports (GitHub Pages safe). Uses injected THREE.
// ✅ Solid outer walls (visible) with 4 door gaps (structure preserved)
// ✅ Bright lighting + neon trims + simple procedural "texture" feel
// ✅ Pit/divot: deeper, inner wall, tight seam; table always visible
// ✅ Rail with an opening + small gate at stair entrance
// ✅ Short stairs down into the pit (guard entrance)
// ✅ Bots: walkers + display case bots (simple elbows)
// ✅ Chips: simple toss animation into pot
// ✅ Cards: aligned on table in a clean dealing loop (not scattered)
import { PokerSim } from "./poker_sim.js";
export const World = (() => {
  const S = {
    THREE: null,
    scene: null,
    renderer: null,
    camera: null,
    player: null,
    controllers: null,
    log: console.log,

    root: null,
    colliders: [],

    t: 0,

    // layout numbers
    ringIn: 10,
    ringOut: 18,
    wallR: 20.0,
    wallH: 9.0,

    pitR: 6.35,
    pitY: -1.10,
    rimY: 0.08,
    rimOut: 9.0,

    tableY: 0,
    tableTop: null,

    cards: [],
    chips: [],
    bots: [],
    cases: [],

    tex: null
  };

  const log = (m) => S.log?.(m);

  function add(obj, collider = false) {
    S.root.add(obj);
    if (collider) S.colliders.push(obj);
    return obj;
  }

  function mkProceduralTexture() {
    const { THREE } = S;
    const c = document.createElement("canvas");
    c.width = 256; c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#0b0d14"; g.fillRect(0,0,256,256);

    // subtle grid
    g.strokeStyle = "rgba(127,231,255,0.12)";
    g.lineWidth = 2;
    for (let i=0; i<=16; i++){
      const p = i*(256/16);
      g.beginPath(); g.moveTo(p,0); g.lineTo(p,256); g.stroke();
      g.beginPath(); g.moveTo(0,p); g.lineTo(256,p); g.stroke();
    }
    // accent diagonals
    g.strokeStyle = "rgba(255,45,122,0.10)";
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
      color,
      roughness: rough,
      metalness: metal,
      emissive: new THREE.Color(emissive),
      emissiveIntensity: emiI,
      map: map || null
    });
  }

  // ---------------- BUILD ----------------
  function buildLights() {
    const { THREE } = S;

    add(new THREE.HemisphereLight(0xffffff, 0x05060a, 1.7));

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(14, 18, 10);
    add(key);

    // overhead clusters
    const pts = [
      [0, 10.5, 0, 55],
      [12, 9.5, 0, 36],
      [-12, 9.5, 0, 36],
      [0, 9.5, 12, 36],
      [0, 9.5, -12, 36],
      [8, 9.0, 8, 26],
      [-8, 9.0, -8, 26],
    ];
    for (const [x,y,z,i] of pts) {
      const l = new THREE.PointLight(0xffffff, i, 95);
      l.position.set(x,y,z);
      add(l);
    }

    // neon ambient accents
    const aqua = new THREE.PointLight(0x7fe7ff, 14, 55);
    aqua.position.set(0, 3.5, 16);
    add(aqua);

    const pink = new THREE.PointLight(0xff2d7a, 12, 55);
    pink.position.set(-16, 3.5, 0);
    add(pink);

    log("[world] lights ✅ (bright)");
  }

  function buildFloorRing() {
    const { THREE } = S;

    const base = new THREE.Mesh(
      new THREE.CircleGeometry(72, 160),
      mat(0x141626, 1, 0, 0x000000, 0, S.tex)
    );
    base.rotation.x = -Math.PI / 2;
    add(base, true);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(S.ringIn, S.ringOut, 180),
      mat(0x0f1224, 0.85, 0.08, 0x000000, 0, S.tex)
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    add(ring, true);

    const neon = new THREE.Mesh(
      new THREE.RingGeometry(S.ringOut-0.22, S.ringOut+0.10, 180),
      mat(0x121428, 0.35, 0.25, 0x2dfcff, 1.0)
    );
    neon.rotation.x = -Math.PI / 2;
    neon.position.y = 0.06;
    add(neon);

    log("[world] floor + ring ✅");
  }

  function buildOuterWallsPreserved() {
    const { THREE } = S;

    // Solid visible wall segments with gaps at N/S/E/W (structure preserved)
    const R = S.wallR;
    const H = S.wallH;
    const gap = Math.PI / 6; // 30° each door gap

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

      const geo = new THREE.ExtrudeGeometry(shape, { depth: H, bevelEnabled: false, curveSegments: 24 });
      geo.rotateX(Math.PI/2);

      const wall = new THREE.Mesh(
        geo,
        mat(0x0b0d14, 0.95, 0.06, 0x000000, 0, S.tex)
      );
      wall.position.y = 0;
      add(wall, true);

      // inner glow band near top
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(R, 0.16, 10, 220, Math.abs(a1-a0)),
        mat(0x141a33, 0.45, 0.25, 0xff2d7a, 0.55)
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

    log("[world] outer walls ✅ (solid, preserved gaps)");
  }

  function buildPitTableRailStairs() {
    const { THREE } = S;

    // Rim
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(S.pitR, S.rimOut, 200),
      mat(0x0a0c18, 0.85, 0.18, 0x2dfcff, 0.22, S.tex)
    );
    rim.rotation.x = -Math.PI/2;
    rim.position.y = S.rimY;
    add(rim, true);

    // Inner wall
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(S.pitR, S.pitR, (S.rimY - S.pitY), 120, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 1, metalness: 0.1, side: THREE.DoubleSide })
    );
    wall.position.y = (S.rimY + S.pitY)/2;
    add(wall, true);

    // Pit floor
    const pit = new THREE.Mesh(
      new THREE.CircleGeometry(S.pitR - 0.05, 200),
      mat(0x070812, 1, 0.02, 0x1b2cff, 0.18)
    );
    pit.rotation.x = -Math.PI/2;
    pit.position.y = S.pitY;
    add(pit, true);

    // Tight seam
    const seam = new THREE.Mesh(
      new THREE.RingGeometry(S.pitR - 0.10, S.pitR + 0.10, 200),
      mat(0x121428, 0.35, 0.3, 0x2dfcff, 1.2)
    );
    seam.rotation.x = -Math.PI/2;
    seam.position.y = S.rimY + 0.01;
    add(seam);

    // Table (always visible)
    S.tableY = S.pitY + 1.05;
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(3.05, 3.28, 0.30, 56),
      mat(0x0f6a42, 0.85, 0.05, 0x0f6a42, 0.08)
    );
    top.position.set(0, S.tableY, 0);
    add(top, true);
    S.tableTop = top;

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 1.0, 1.1, 26),
      mat(0x10131c, 0.8, 0.22)
    );
    base.position.set(0, S.tableY - 0.75, 0);
    add(base);

    // Rail with an opening for stairs + gate
    const railR = S.rimOut - 0.25;
    const openingCenter = -Math.PI/2; // "south" opening (feel free to rotate later)
    const openingHalf = 0.18; // ~20° opening

    function addRailArc(a0, a1) {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(railR, 0.09, 12, 240, Math.abs(a1-a0)),
        mat(0x2a2f52, 0.5, 0.35, 0xff2d7a, 0.38)
      );
      arc.rotation.x = Math.PI/2;
      arc.rotation.z = (a0+a1)/2;
      arc.position.y = S.rimY + 1.18;
      add(arc);
    }

    // Two arcs around the opening
    addRailArc(openingCenter + openingHalf, openingCenter + Math.PI*2 - openingHalf);

    // Posts (skip in opening range)
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

    // Gate (simple)
    const gate = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 1.0, 0.12),
      mat(0x141a33, 0.55, 0.25, 0x2dfcff, 0.9)
    );
    gate.position.set(Math.cos(openingCenter)*railR, S.rimY + 0.80, Math.sin(openingCenter)*railR);
    gate.lookAt(0, gate.position.y, 0);
    add(gate);

    // Short stairs down into pit (inside opening)
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
        mat(0x111326, 1, 0.08, 0x2dfcff, 0.12, S.tex)
      );
      step.position.set(x, y, z);
      step.lookAt(0, y, 0);
      add(step, true);
    }

    // Pit perimeter lights
    const ringLightCount = 18;
    for (let i=0;i<ringLightCount;i++){
      const a = (i/ringLightCount)*Math.PI*2;
      const puck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.05, 16),
        mat(0x111326, 0.3, 0.2, 0x2dfcff, 1.25)
      );
      puck.position.set(Math.cos(a)*(S.pitR+0.55), S.rimY+0.07, Math.sin(a)*(S.pitR+0.55));
      add(puck);
    }

    log("[world] pit + table + rail + stairs ✅");
  }

  function buildJumbotronsEmbedded() {
    const { THREE } = S;

    // Flat "embedded" panels into the wall (flush)
    const y = S.wallH - 2.1;
    const R = S.wallR - 0.32; // slightly inset
    const w = 10.8, h = 5.9, thickness = 0.18;

    function screenAt(angle) {
      const x = Math.cos(angle)*R;
      const z = Math.sin(angle)*R;
      const rotY = -angle + Math.PI/2;

      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, thickness),
        mat(0x10142a, 0.55, 0.25, 0xff2d7a, 0.18)
      );
      frame.position.set(x, y, z);
      frame.rotation.y = rotY;
      add(frame);

      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(w-0.9, h-0.9),
        new THREE.MeshStandardMaterial({
          color: 0x081027,
          emissive: new THREE.Color(0x1b2cff),
          emissiveIntensity: 1.65,
          roughness: 0.75,
          metalness: 0.1
        })
      );
      // Flush to the frame (embedded)
      screen.position.set(x, y, z + 0.095);
      screen.rotation.y = rotY;
      add(screen);

      // Tiny glow strip under
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(w-1.2, 0.10, 0.10),
        mat(0x111326, 0.3, 0.2, 0x2dfcff, 1.35)
      );
      strip.position.set(x, y - h/2 + 0.25, z + 0.11);
      strip.rotation.y = rotY;
      add(strip);
    }

    screenAt(0);
    screenAt(Math.PI/2);
    screenAt(Math.PI);
    screenAt(3*Math.PI/2);

    log("[world] jumbotrons ✅ (embedded/flush)");
  }

  // ---------------- BOTS ----------------
  function makeBot(name="Bot", color=0x7fe7ff) {
    const { THREE } = S;
    const g = new THREE.Group();
    g.name = name;

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.55, 6, 12), mat(0x111326, 0.9, 0.15, color, 0.12));
    body.position.y = 0.95;
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), mat(0x141a33, 0.7, 0.25, color, 0.25));
    head.position.y = 1.55;
    g.add(head);

    // arms w/ elbows
    function arm(side=1) {
      const a = new THREE.Group();
      a.position.set(0.34*side, 1.30, 0);

      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.06,0.32,10), mat(0x1f2440, 0.8, 0.2));
      upper.rotation.z = side * 0.55;
      upper.position.y = -0.10;
      a.add(upper);

      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.06,10,10), mat(0x2a2f52, 0.7, 0.25, color, 0.15));
      elbow.position.set(0.15*side, -0.28, 0);
      a.add(elbow);

      const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.05,0.30,10), mat(0x1f2440, 0.8, 0.2));
      fore.rotation.z = side * 0.95;
      fore.position.set(0.24*side, -0.40, 0);
      a.add(fore);

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055,10,10), mat(0x141a33, 0.6, 0.25, color, 0.35));
      hand.position.set(0.34*side, -0.55, 0);
      a.add(hand);

      return a;
    }
    g.add(arm(1));
    g.add(arm(-1));

    // name tag
    const tag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.16),
      mat(0x0b0d14, 0.4, 0.2, color, 1.2)
    );
    tag.position.set(0, 1.85, 0);
    g.add(tag);

    return g;
  }

  function buildBots() {
    const { THREE } = S;

    // Walking bots around the ring
    const walkers = 5;
    for (let i=0;i<walkers;i++){
      const bot = makeBot(`Walker_${i}`, i%2===0 ? 0x7fe7ff : 0xff2d7a);
      bot.userData.walk = { a: (i/walkers)*Math.PI*2, r: 14.5, speed: 0.22 + i*0.03 };
      add(bot, true);
      S.bots.push(bot);
    }

    // Display cases with bots inside (2 cases)
    function displayCase(angle, labelColor) {
      const R = 17.2;
      const x = Math.cos(angle)*R;
      const z = Math.sin(angle)*R;
      const rotY = -angle + Math.PI/2;

      const caseG = new THREE.Group();
      caseG.position.set(x, 0, z);
      caseG.rotation.y = rotY;

      const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.25, 1.2), mat(0x111326, 0.9, 0.2, labelColor, 0.15));
      base.position.y = 0.125;
      caseG.add(base);

      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 2.4, 1.0),
        new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.1, metalness: 0.05, transparent: true, opacity: 0.12 })
      );
      glass.position.y = 1.35;
      caseG.add(glass);

      const bot = makeBot("CaseBot", labelColor);
      bot.position.set(0, 0, 0);
      caseG.add(bot);

      add(caseG, true);
      S.cases.push(caseG);
    }

    displayCase(Math.PI/4, 0x7fe7ff);
    displayCase(-Math.PI/4, 0xff2d7a);

    log("[world] bots ✅ (walkers + display cases)");
  }

  // ---------------- CARDS + CHIPS ----------------
  function buildCardsAndChips() {
    const { THREE } = S;

    // Cards: 10 clean positions around table edge, facing center
    const cardGeo = new THREE.PlaneGeometry(0.55, 0.78);
    const face = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.10, roughness: 0.6, metalness: 0.05 });
    const back = new THREE.MeshStandardMaterial({ color: 0x1b2cff, emissive: new THREE.Color(0x1b2cff), emissiveIntensity: 0.65, roughness: 0.55, metalness: 0.12 });

    const n = 10;
    for (let i=0;i<n;i++){
      const g = new THREE.Group();
      const front = new THREE.Mesh(cardGeo, face); front.position.z = 0.002; g.add(front);
      const b = new THREE.Mesh(cardGeo, back); b.rotation.y = Math.PI; b.position.z = -0.002; g.add(b);

      g.rotation.x = -Math.PI/2;
      add(g);
      S.cards.push(g);
    }

    // Chips: a small stack that "tosses" to pot
    const chipGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.035, 18);
    for (let i=0;i<18;i++){
      const chip = new THREE.Mesh(
        chipGeo,
        mat(i%2 ? 0xff2d7a : 0x7fe7ff, 0.6, 0.15, 0x000000, 0)
      );
      chip.visible = true;
      add(chip);
      S.chips.push(chip);
    }

    log("[world] cards + chips ✅");
  }

  // ---------------- UPDATE ----------------
  function updateBots(dt) {
    const { THREE } = S;
    for (const bot of S.bots) {
      const w = bot.userData.walk;
      if (!w) continue;
      w.a += dt * w.speed;
      const x = Math.cos(w.a)*w.r;
      const z = Math.sin(w.a)*w.r;
      bot.position.set(x, 0, z);
      bot.lookAt(0, 1.3, 0);

      // tiny arm sway
      const s = Math.sin(S.t*2 + w.a*3) * 0.18;
      bot.rotation.y += 0; // keep lookAt dominant
      bot.children.forEach((ch) => {
        if (ch.type === "Group" && ch.children?.length) ch.rotation.x = s*0.25;
      });
    }
  }

  function updateCards(dt) {
    if (!S.tableTop) return;
    const y = S.tableY + 0.17;
    const r = 2.55;
    const n = S.cards.length;

    // Deal motion: cards slide from "deck" point to seat positions
    const deck = new S.THREE.Vector3(0, y + 0.02, -0.5);
    const phase = (S.t * 0.45) % 1;

    for (let i=0;i<n;i++){
      const a = (i/n) * Math.PI*2;
      const seat = new S.THREE.Vector3(Math.cos(a)*r, y, Math.sin(a)*r);
      const t = (phase + i*0.08) % 1;
      const k = t < 0.5 ? (t/0.5) : (1 - (t-0.5)/0.5); // triangle wave 0..1..0

      const p = deck.clone().lerp(seat, k);
      const c = S.cards[i];
      c.position.copy(p);
      c.rotation.y = -a + Math.PI/2; // face center
    }
  }

  function updateChips(dt) {
    if (!S.tableTop) return;

    // Toss a chip every so often from one side into pot
    const y = S.tableY + 0.20;
    const from = new S.THREE.Vector3(-2.2, y, 0.0);
    const to = new S.THREE.Vector3(0.0, y, 0.0);

    const period = 1.25;
    const t = (S.t % period) / period;

    for (let i=0;i<S.chips.length;i++){
      const chip = S.chips[i];
      const ti = (t + i*0.035) % 1;

      // Only animate first few as active tosses, rest form a pot stack
      if (i < 6) {
        const k = Math.min(1, Math.max(0, (ti - 0.05) / 0.75));
        const p = from.clone().lerp(to, k);
        p.y += Math.sin(k * Math.PI) * 0.55; // arc
        chip.position.copy(p);
        chip.rotation.x = Math.PI/2;
        chip.rotation.y = S.t*6 + i;
      } else {
        // pot stack
        const idx = i - 6;
        chip.position.set(0.0 + (idx%3)*0.12 - 0.12, y + 0.02 + Math.floor(idx/3)*0.04, 0.0);
        chip.rotation.x = Math.PI/2;
        chip.rotation.y = 0;
      }
    }
  }

  // ---------------- INIT ----------------
  async function init({ THREE, scene, renderer, camera, player, controllers, log: logFn }) {
    S.THREE = THREE;
    S.scene = scene;
    S.renderer = renderer;
    S.camera = camera;
    S.player = player;
    S.controllers = controllers;
    S.log = logFn || console.log;

    S.root = new THREE.Group();
    S.root.name = "WorldRoot";
    scene.add(S.root);

    // fog helps depth + richness
    scene.fog = new THREE.Fog(0x05060a, 18, 130);

    S.tex = mkProceduralTexture();

    log("[world] init … v3");

    buildLights();
    buildFloorRing();
    buildOuterWallsPreserved();
    buildPitTableRailStairs();
    buildJumbotronsEmbedded();
    buildBots();
    buildCardsAndChips();

    // Spawn on ring, looking toward center
    if (player) {
      player.position.set(0, 0, 12.5);
      player.rotation.set(0, Math.PI, 0);
    }

    log("[world] build complete ✅ (MASTER v3)");
  }

  function update(dt) {
    S.t += dt;
    updateBots(dt);
    updateCards(dt);
    updateChips(dt);
  }

  return { init, update, get colliders() { return S.colliders; } };
})();
