// /js/dealingMix.js — Scarlett DealingMix v1.0 (FIXED EXPORT + REAL 52 DECK + TABLE-CENTERED)
// Exports: DealingMix
// Goals:
// - Always plays ON the table (uses world.tableFocus + world.tableTopY)
// - Real 52-card deck shuffle (no duplicates)
// - Community cards hover and face player
// - Simple "table HUD" canvas sign above community cards
// - Safe: never throws if world missing parts

export const DealingMix = (() => {
  let THREE, scene, world, log;
  let root, commGroup, hudMesh, dealerChip, deckMesh, potChips;
  let playerRig = null, cameraRef = null;

  const state = {
    t: 0,
    running: false,
    deck: [],
    burn: [],
    community: [],
    dealerSeat: 0,
    pot: 150,
    street: "PREFLOP",
    turnName: "LUNA",
  };

  const SUITS = ["♠", "♥", "♦", "♣"];
  const RANKS = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];

  function L(...a){ try{ log?.(...a); } catch { console.log(...a); } }

  function tablePos() {
    const tf = world?.tableFocus || new THREE.Vector3(0,0,-6.5);
    const y  = world?.tableTopY ?? (world?.metrics?.tableY ?? 0.92);
    return { x: tf.x, y, z: tf.z };
  }

  function buildDeck() {
    const d = [];
    for (const s of SUITS) for (const r of RANKS) d.push({ r, s });
    // Fisher–Yates
    for (let i = d.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  }

  function drawCard() {
    if (!state.deck.length) state.deck = buildDeck();
    return state.deck.pop();
  }

  function cardFaceTexture(cs) {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 356;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#f8f8f8";
    ctx.fillRect(0,0,c.width,c.height);

    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 6;
    ctx.strokeRect(6,6,c.width-12,c.height-12);

    const isRed = (cs.s === "♥" || cs.s === "♦");
    ctx.fillStyle = isRed ? "#b6001b" : "#111";

    ctx.font = "bold 54px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(cs.r, 18, 14);
    ctx.font = "bold 60px Arial";
    ctx.fillText(cs.s, 18, 64);

    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.font = "bold 54px Arial";
    ctx.fillText(cs.r, c.width-18, c.height-68);
    ctx.font = "bold 60px Arial";
    ctx.fillText(cs.s, c.width-18, c.height-14);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 140px Arial";
    ctx.fillText(cs.s, c.width/2, c.height/2 + 10);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function makeCardMesh(cs) {
    const geo = new THREE.PlaneGeometry(0.28, 0.40); // bigger than bot cards
    const faceMat = new THREE.MeshStandardMaterial({
      map: cardFaceTexture(cs),
      roughness: 0.55,
      metalness: 0.0,
      emissive: 0x111111,
      emissiveIntensity: 0.18,
      side: THREE.DoubleSide
    });
    const backMat = new THREE.MeshStandardMaterial({
      color: 0xff2d7a,
      roughness: 0.6,
      emissive: 0x220010,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide
    });

    // group (face + back) to avoid flip weirdness
    const g = new THREE.Group();
    const face = new THREE.Mesh(geo, faceMat);
    const back = new THREE.Mesh(geo, backMat);
    face.position.z = 0.002;
    back.position.z = -0.002;
    back.rotation.y = Math.PI;
    g.add(face, back);

    g.renderOrder = 30;
    return g;
  }

  function makeDealerChip() {
    const g = new THREE.CylinderGeometry(0.09, 0.09, 0.012, 32);
    const m = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x222222,
      emissiveIntensity: 0.25,
      roughness: 0.35
    });
    const chip = new THREE.Mesh(g, m);
    chip.rotation.x = Math.PI/2; // flat on table
    chip.name = "DealerChip";
    return chip;
  }

  function makeDeckBlock() {
    const g = new THREE.BoxGeometry(0.12, 0.05, 0.18);
    const m = new THREE.MeshStandardMaterial({
      color: 0x111318,
      roughness: 0.55,
      emissive: 0x120014,
      emissiveIntensity: 0.18
    });
    const d = new THREE.Mesh(g, m);
    d.name = "DeckBlock";
    return d;
  }

  function makePotChips() {
    const group = new THREE.Group();
    group.name = "PotChips";
    for (let i = 0; i < 10; i++) {
      const r = 0.06, h = 0.012;
      const geo = new THREE.CylinderGeometry(r, r, h, 26);
      const denom = i % 3;
      const col = denom === 0 ? 0xff2d7a : (denom === 1 ? 0x7fe7ff : 0xffffff);
      const mat = new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.35,
        emissive: col,
        emissiveIntensity: 0.08
      });
      const c = new THREE.Mesh(geo, mat);
      c.rotation.x = Math.PI/2;
      c.position.set((Math.random()-0.5)*0.22, 0.008 + i*0.003, (Math.random()-0.5)*0.18);
      group.add(c);
    }
    return group;
  }

  function makeHudCanvas() {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 256;
    const ctx = c.getContext("2d");

    ctx.clearRect(0,0,c.width,c.height);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    roundRect(ctx, 18, 18, 988, 220, 26, true);

    ctx.fillStyle = "#7fe7ff";
    ctx.font = "bold 44px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("Scarlett VR Poker • 6-Max", 44, 76);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 38px Arial";
    ctx.fillText(`Table: $10,000`, 44, 140);

    ctx.fillStyle = "#ff2d7a";
    ctx.font = "bold 38px Arial";
    ctx.fillText(`Pot: $${state.pot} • ${state.street} • Turn: ${state.turnName}`, 410, 140);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;

    function roundRect(ctx,x,y,w,h,r,fill){
      ctx.beginPath();
      ctx.moveTo(x+r,y);
      ctx.arcTo(x+w,y,x+w,y+h,r);
      ctx.arcTo(x+w,y+h,x,y+h,r);
      ctx.arcTo(x,y+h,x,y,r);
      ctx.arcTo(x,y,x+w,y,r);
      ctx.closePath();
      if(fill) ctx.fill();
    }
  }

  function makeHudMesh() {
    const tex = makeHudCanvas();
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), mat);
    mesh.name = "TableHUD";
    mesh.renderOrder = 80;
    mesh.userData.refresh = () => {
      mesh.material.map = makeHudCanvas();
      mesh.material.map.needsUpdate = true;
      mesh.material.needsUpdate = true;
    };
    return mesh;
  }

  function facePlayer(obj) {
    if (!obj) return;
    const ref = cameraRef || playerRig;
    if (!ref) return;
    const p = ref.position.clone();
    obj.lookAt(p.x, obj.position.y, p.z);
  }

  function layoutEverything() {
    const { x, y, z } = tablePos();

    // community hover area
    commGroup.position.set(x, y + 0.55, z + 0.10);
    hudMesh.position.set(x, y + 0.95, z - 0.05);

    // dealer chip + deck block (front of dealer)
    dealerChip.position.set(x + 0.45, y + 0.012, z - 0.35);
    deckMesh.position.set(x + 0.30, y + 0.03, z - 0.35);

    // pot chips in middle of table
    potChips.position.set(x, y + 0.012, z + 0.02);
  }

  function clearCommunity() {
    state.community.length = 0;
    while (commGroup.children.length) commGroup.remove(commGroup.children[0]);
  }

  function dealCommunity(count) {
    clearCommunity();
    for (let i = 0; i < count; i++) {
      const cs = drawCard();
      state.community.push(cs);
      const m = makeCardMesh(cs);
      m.position.x = (i - (count-1)/2) * 0.34;
      m.position.y = 0;
      m.position.z = 0;
      commGroup.add(m);
    }
  }

  function nextStreet() {
    if (state.street === "PREFLOP") { state.street = "FLOP"; dealCommunity(3); }
    else if (state.street === "FLOP") { state.street = "TURN"; dealCommunity(4); }
    else if (state.street === "TURN") { state.street = "RIVER"; dealCommunity(5); }
    else { state.street = "PREFLOP"; state.deck = buildDeck(); dealCommunity(0); }
    hudMesh.userData.refresh?.();
  }

  return {
    init({ THREE: _THREE, scene: _scene, log: _log, world: _world } = {}) {
      THREE = _THREE; scene = _scene; world = _world; log = _log;

      if (root) { try { scene.remove(root); } catch {} }
      root = new THREE.Group();
      root.name = "DealingMixRoot";
      scene.add(root);

      commGroup = new THREE.Group();
      commGroup.name = "CommunityCards";
      root.add(commGroup);

      dealerChip = makeDealerChip();
      deckMesh   = makeDeckBlock();
      potChips   = makePotChips();
      hudMesh    = makeHudMesh();

      root.add(dealerChip, deckMesh, potChips, hudMesh);

      state.deck = buildDeck();
      state.street = "PREFLOP";
      state.turnName = "LUNA";
      state.pot = 150;

      layoutEverything();
      L("[DealingMix] init ✅");
      return {
        setPlayerRig(rig, cam){ playerRig = rig || null; cameraRef = cam || null; },
        startHand(){
          state.running = true;
          state.deck = buildDeck();
          state.street = "PREFLOP";
          state.pot = 150;
          dealCommunity(0);
          hudMesh.userData.refresh?.();
          L("[DealingMix] startHand ✅");
        },
        update(dt){
          state.t += dt;
          // subtle float
          const { x, y, z } = tablePos();
          commGroup.position.y = (y + 0.55) + Math.sin(state.t*1.6)*0.02;
          hudMesh.position.y   = (y + 0.95) + Math.sin(state.t*1.2)*0.015;

          // face player
          facePlayer(commGroup);
          facePlayer(hudMesh);

          // idle dealer chip glow
          dealerChip.material.emissiveIntensity = 0.20 + (Math.sin(state.t*3.0)*0.08);

          // auto-advance street slowly (for demo)
          if (state.running) {
            state._acc = (state._acc || 0) + dt;
            if (state._acc > 4.0) {
              state._acc = 0;
              nextStreet();
            }
          }
        },
        root
      };
    }
  };
})();
