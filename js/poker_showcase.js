// /js/poker_showcase.js — Poker Showcase (FLOP→TURN→RIVER) + HUD + billboarding
// Safe: does not require your PokerSimulation. If you later wire real logic, disable showcase.

export const PokerShowcase = (() => {
  const state = {
    active: true,
    THREE: null,
    scene: null,
    camera: null,
    root: null,
    log: null,

    t: 0,
    phase: 0,         // 0 preflop, 1 flop, 2 turn, 3 river, 4 showdown
    timer: 0,

    hud: null,
    hudCanvas: null,
    hudCtx: null,
    hudTex: null,

    community: [],
    players: [],

    pot: 0,
    turn: 0,
    street: "PREFLOP",

    tablePos: null,

    textures: {
      cardBack: null
    },

    chipMeshes: [],
  };

  function makeHUD(THREE) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.72), mat);
    mesh.renderOrder = 9;

    state.hudCanvas = canvas;
    state.hudCtx = ctx;
    state.hudTex = tex;
    state.hud = mesh;

    return mesh;
  }

  function drawHUD() {
    const g = state.hudCtx;
    if (!g) return;
    const w = state.hudCanvas.width;
    const h = state.hudCanvas.height;

    g.clearRect(0,0,w,h);

    // bg
    g.fillStyle = "rgba(8,10,16,0.72)";
    g.fillRect(0,0,w,h);

    // border
    g.strokeStyle = "rgba(127,231,255,0.95)";
    g.lineWidth = 8;
    g.strokeRect(14,14,w-28,h-28);

    // title
    g.fillStyle = "#e8ecff";
    g.font = "bold 52px system-ui, Segoe UI, Arial";
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.fillText(`POT: ${state.pot}`, 42, 84);

    g.font = "bold 44px system-ui, Segoe UI, Arial";
    g.fillStyle = "#98a0c7";
    g.fillText(`TURN: P${state.turn+1}`, 42, 166);

    g.textAlign = "right";
    g.fillStyle = "#ff2d7a";
    g.fillText(state.street, w - 42, 84);

    g.fillStyle = "#7fe7ff";
    g.font = "bold 38px system-ui, Segoe UI, Arial";
    g.fillText("SHOWCASE MODE", w - 42, 166);

    if (state.hudTex) state.hudTex.needsUpdate = true;
  }

  function makeCard(THREE, w=0.34, h=0.48) {
    const geo = new THREE.PlaneGeometry(w, h);

    // default “card” look (fail-safe)
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.98
    });

    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = 6;
    m.userData.isCard = true;
    return m;
  }

  function labelCard(THREE, mesh, textTopLeft="A♠", textBottomRight="A♠") {
    // Canvas label for big denomination/suit (fail-safe)
    const c = document.createElement("canvas");
    c.width = 512; c.height = 768;
    const g = c.getContext("2d");

    g.fillStyle = "#ffffff";
    g.fillRect(0,0,c.width,c.height);

    g.strokeStyle = "#111";
    g.lineWidth = 14;
    g.strokeRect(16,16,c.width-32,c.height-32);

    g.fillStyle = "#111";
    g.font = "bold 110px system-ui, Segoe UI, Arial";
    g.textAlign = "left";
    g.textBaseline = "top";
    g.fillText(textTopLeft, 52, 44);

    g.textAlign = "right";
    g.textBaseline = "bottom";
    g.fillText(textBottomRight, c.width - 52, c.height - 44);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;

    mesh.material.map = tex;
    mesh.material.color.set(0xffffff);
    mesh.material.needsUpdate = true;
  }

  function billboard(mesh) {
    if (!state.camera) return;
    mesh.lookAt(state.camera.position.x, state.camera.position.y, state.camera.position.z);
  }

  function spawnCommunity() {
    const { THREE, root } = state;
    // big + higher than player cards
    const y = 2.10;
    const z = 0.0;

    const positions = [
      [-0.62, y, z],
      [ 0.00, y, z],
      [ 0.62, y, z],
      [ 1.24, y, z],
      [ 1.86, y, z],
    ];

    state.community = positions.map((p, i) => {
      const card = makeCard(THREE, 0.40, 0.56); // bigger
      card.position.set(p[0], p[1], p[2]);
      card.userData.slot = i;
      card.visible = false;
      root.add(card);
      return card;
    });
  }

  function spawnPlayers() {
    const { THREE, root } = state;

    // 6 seats (simple ring)
    const seatR = 2.65;
    state.players = Array.from({ length: 6 }).map((_, i) => {
      const a = (i / 6) * Math.PI * 2;

      const hand = new THREE.Group();
      hand.position.set(Math.cos(a) * seatR, 1.55, Math.sin(a) * seatR);
      hand.userData.seat = i;
      root.add(hand);

      const c1 = makeCard(THREE, 0.28, 0.40);
      const c2 = makeCard(THREE, 0.28, 0.40);
      c1.position.set(-0.18, 0.0, 0.0);
      c2.position.set( 0.18, 0.0, 0.0);
      hand.add(c1, c2);

      // big readable denomination
      labelCard(THREE, c1, "K♦", "K♦");
      labelCard(THREE, c2, "9♣", "9♣");

      // start face-up so you can SEE it
      c1.visible = true;
      c2.visible = true;

      return { hand, c1, c2 };
    });
  }

  function chipMesh(THREE) {
    const geo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 18);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.45, metalness: 0.25 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = Math.PI/2;
    return m;
  }

  function throwChipsToPot(count=6) {
    const { THREE, root } = state;
    const potPos = new THREE.Vector3(0, 1.12, 0);

    for (let i = 0; i < count; i++) {
      const c = chipMesh(THREE);
      const angle = Math.random() * Math.PI * 2;
      const r = 2.2 + Math.random() * 0.7;

      c.position.set(Math.cos(angle)*r, 1.05, Math.sin(angle)*r);
      c.userData.v = new THREE.Vector3(
        (potPos.x - c.position.x) * (0.8 + Math.random()*0.6),
        1.2 + Math.random()*1.2,
        (potPos.z - c.position.z) * (0.8 + Math.random()*0.6)
      );
      c.userData.life = 1.1 + Math.random()*0.5;
      root.add(c);
      state.chipMeshes.push(c);
    }
  }

  function showFlop() {
    state.street = "FLOP";
    for (let i = 0; i < 3; i++) {
      const c = state.community[i];
      c.visible = true;
      // random readable labels
      const labels = ["A♠","Q♥","7♦","J♣","9♥","2♠","K♦"];
      const t = labels[(Math.random()*labels.length)|0];
      labelCard(state.THREE, c, t, t);
    }
    state.pot += 300;
    throwChipsToPot(10);
  }

  function showTurn() {
    state.street = "TURN";
    const c = state.community[3];
    c.visible = true;
    const labels = ["4♣","T♠","6♥","8♦","Q♣"];
    const t = labels[(Math.random()*labels.length)|0];
    labelCard(state.THREE, c, t, t);
    state.pot += 200;
    throwChipsToPot(6);
  }

  function showRiver() {
    state.street = "RIVER";
    const c = state.community[4];
    c.visible = true;
    const labels = ["A♦","K♠","3♥","5♣","9♦"];
    const t = labels[(Math.random()*labels.length)|0];
    labelCard(state.THREE, c, t, t);
    state.pot += 250;
    throwChipsToPot(8);
  }

  function showWin() {
    state.street = "SHOWDOWN";
    state.pot += 500;

    // Simple “winner burst” ring
    const THREE = state.THREE;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.17, 48),
      new THREE.MeshBasicMaterial({ color: 0xff2d7a, transparent: true, opacity: 0.95 })
    );
    ring.rotation.x = -Math.PI/2;
    ring.position.set(0, 1.02, 0);
    ring.userData.life = 0.8;
    ring.userData.scaleV = 1;
    state.root.add(ring);

    // Banner on HUD
    state.turn = (state.turn + 1) % 6;
  }

  function updateChips(dt) {
    const gravity = 6.2;
    for (let i = state.chipMeshes.length - 1; i >= 0; i--) {
      const c = state.chipMeshes[i];
      c.userData.life -= dt;
      c.userData.v.y -= gravity * dt;

      c.position.x += c.userData.v.x * dt;
      c.position.y += c.userData.v.y * dt;
      c.position.z += c.userData.v.z * dt;

      // bounce on table height ~1.03
      if (c.position.y < 1.03) {
        c.position.y = 1.03;
        c.userData.v.y *= -0.35;
        c.userData.v.x *= 0.65;
        c.userData.v.z *= 0.65;
      }

      if (c.userData.life <= 0) {
        state.root.remove(c);
        state.chipMeshes.splice(i, 1);
      }
    }
  }

  function updateBillboards() {
    // community cards billboard
    for (const c of state.community) if (c.visible) billboard(c);
    // player hands billboard (face viewer)
    for (const p of state.players) billboard(p.hand);
    // HUD billboard
    if (state.hud) billboard(state.hud);
  }

  function stepPhases(dt) {
    state.timer += dt;

    // pacing you asked for:
    // flop at 2s, turn at 7s, river at 12s, showdown at 16s, reset at 22s
    if (state.phase === 0 && state.timer > 2.0) { state.phase = 1; showFlop(); }
    if (state.phase === 1 && state.timer > 7.0) { state.phase = 2; showTurn(); }
    if (state.phase === 2 && state.timer > 12.0){ state.phase = 3; showRiver(); }
    if (state.phase === 3 && state.timer > 16.0){ state.phase = 4; showWin(); }
    if (state.phase === 4 && state.timer > 22.0){
      // reset hand
      state.timer = 0;
      state.phase = 0;
      state.pot = 0;
      state.street = "PREFLOP";
      for (const c of state.community) c.visible = false;
    }
  }

  return {
    init({ THREE, scene, camera, tableWorldPos, log }) {
      state.THREE = THREE;
      state.scene = scene;
      state.camera = camera;
      state.log = log || console.log;

      state.root = new THREE.Group();
      state.root.name = "PokerShowcaseRoot";
      state.root.position.copy(tableWorldPos || new THREE.Vector3(0, 0, 0));
      scene.add(state.root);

      spawnCommunity();
      spawnPlayers();

      const hud = makeHUD(THREE);
      hud.position.set(0, 3.25, 0); // above table so you can read from pit edge
      state.root.add(hud);

      state.log("[PokerShowcase] init ✅");
      drawHUD();
    },

    setActive(v) { state.active = !!v; },

    update(dt) {
      if (!state.active) return;

      stepPhases(dt);
      updateChips(dt);

      // keep readable HUD
      drawHUD();
      updateBillboards();
    }
  };
})();
