// /js/cards.js — Physical cards on table + hover "reflection" + community reveal animations

export function createCardSystem({ THREE, scene, camera, tableGroup, log = console.log }) {
  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const rand = (a,b) => a + Math.random()*(b-a);

  // ---------- Basic card materials (placeholder) ----------
  const CARD_W = 0.058;     // ~poker card size in meters
  const CARD_H = 0.082;
  const CARD_T = 0.0012;

  const cardGeo = new THREE.BoxGeometry(CARD_W, CARD_T, CARD_H);
  const backMat = new THREE.MeshStandardMaterial({ color: 0x1b2a5a, roughness: 0.65, metalness: 0.05 });
  const faceMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.85, metalness: 0.0 });

  // Canvas face texture for rank/suit (fast + readable)
  function makeFaceTexture(text) {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 384;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#f2f2f2"; ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle = "#12121a";
    ctx.font = "bold 84px Arial";
    ctx.textAlign = "left";
    ctx.fillText(text, 24, 98);
    ctx.textAlign = "center";
    ctx.font = "bold 140px Arial";
    ctx.fillText(text, 128, 250);
    ctx.strokeStyle = "rgba(0,0,0,.12)";
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, c.width-24, c.height-24);

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }

  function makeCardMesh(cardText = "A♠") {
    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(cardGeo, backMat);
    group.add(body);

    // Face plane (slightly offset so it shows)
    const facePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_W * 0.98, CARD_H * 0.98),
      new THREE.MeshStandardMaterial({ map: makeFaceTexture(cardText), roughness: 0.85 })
    );
    facePlane.rotation.x = -Math.PI / 2; // will be corrected by parent rotation
    facePlane.position.y = CARD_T/2 + 0.0004;
    group.add(facePlane);

    // Back plane
    const backPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_W * 0.98, CARD_H * 0.98),
      new THREE.MeshStandardMaterial({ color: 0x1b2a5a, roughness: 0.65 })
    );
    backPlane.rotation.x = Math.PI / 2;
    backPlane.position.y = -CARD_T/2 - 0.0004;
    group.add(backPlane);

    group.userData.cardText = cardText;
    return group;
  }

  // ---------- Hover "reflection" copy ----------
  function makeHoverCopy(cardMesh) {
    const hover = cardMesh.clone(true);
    // Make it look like a "reflection" / hologram
    hover.traverse(o => {
      if (o.isMesh) {
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = 0.55;
        if (o.material.emissive) o.material.emissiveIntensity = 0.35;
      }
    });
    hover.scale.setScalar(1.08);
    return hover;
  }

  // ---------- Community slots ----------
  const communityGroup = new THREE.Group();
  communityGroup.name = "CommunityCards";
  communityGroup.position.set(0, 0.88, 0); // relative to tableGroup
  if (tableGroup) tableGroup.add(communityGroup);
  else scene.add(communityGroup);

  const communitySlots = [
    new THREE.Vector3(-0.18, 0.0, 0.00),
    new THREE.Vector3(-0.09, 0.0, 0.00),
    new THREE.Vector3( 0.00, 0.0, 0.00),
    new THREE.Vector3( 0.09, 0.0, 0.00),
    new THREE.Vector3( 0.18, 0.0, 0.00),
  ];

  // ---------- Card storage ----------
  const playerCards = new Map(); // botId -> { base:[card1,card2], hover:[h1,h2], anchor:Object3D }
  const communityCards = [];     // mesh refs

  // ---------- Animation helpers ----------
  async function animateMove(obj, from, to, durMs = 650, arc = 0.06) {
    const t0 = now();
    while (now() - t0 < durMs) {
      const t = (now() - t0) / durMs;
      const k = easeOutCubic(t);
      obj.position.lerpVectors(from, to, k);
      obj.position.y += Math.sin(k * Math.PI) * arc;
      await delay(16);
    }
    obj.position.copy(to);
  }

  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

  // ---------- Public API ----------
  function clearAllCards() {
    // players
    for (const entry of playerCards.values()) {
      entry.base.forEach(m => m.parent && m.parent.remove(m));
      entry.hover.forEach(m => m.parent && m.parent.remove(m));
    }
    playerCards.clear();

    // community
    while (communityGroup.children.length) communityGroup.remove(communityGroup.children[0]);
    communityCards.length = 0;
  }

  function ensurePlayerAnchors(bots, chairWorldPosGetter) {
    // anchor = where the hole cards sit on table in front of the bot
    for (const b of bots) {
      if (playerCards.has(b.id)) continue;

      const anchor = new THREE.Object3D();
      anchor.name = `PlayerCardAnchor_${b.id}`;

      // place anchor using chair forward direction so it always sits in front of the player
      // chairWorldPosGetter(botId) should return { pos, quat } for the seat/chair
      const info = chairWorldPosGetter?.(b.id);
      if (info?.pos && info?.quat) {
        anchor.position.copy(info.pos);
        anchor.quaternion.copy(info.quat);

        // put cards on table height
        anchor.position.y = 0.88; // table top approx; adjust if needed

        // nudge toward table center
        const forward = new THREE.Vector3(0,0,-1).applyQuaternion(anchor.quaternion);
        anchor.position.add(forward.multiplyScalar(0.32));
      } else {
        // fallback: in front of camera
        anchor.position.copy(camera.position).add(new THREE.Vector3(0,-0.6,-0.7));
      }

      scene.add(anchor);
      playerCards.set(b.id, { base: [], hover: [], anchor });
    }
  }

  async function dealHoleCardsToPlayer(botId, cardA, cardB, { dealerPos } = {}) {
    const entry = playerCards.get(botId);
    if (!entry) return;

    // remove old
    entry.base.forEach(m => m.parent && m.parent.remove(m));
    entry.hover.forEach(m => m.parent && m.parent.remove(m));
    entry.base.length = 0;
    entry.hover.length = 0;

    const a = makeCardMesh(cardA);
    const b = makeCardMesh(cardB);

    // start at dealer
    const start = dealerPos ? dealerPos.clone() : new THREE.Vector3(0, 1.25, 0);
    a.position.copy(start);
    b.position.copy(start);

    // lay flat on table
    a.rotation.set(-Math.PI/2, 0, 0);
    b.rotation.set(-Math.PI/2, 0, 0);

    scene.add(a); scene.add(b);

    const basePos1 = entry.anchor.position.clone().add(new THREE.Vector3(-0.032, 0.002, 0));
    const basePos2 = entry.anchor.position.clone().add(new THREE.Vector3( 0.032, 0.002, 0));

    await animateMove(a, start, basePos1, 650, 0.09);
    await delay(120);
    await animateMove(b, start, basePos2, 650, 0.09);

    // hover copies (reflection)
    const ha = makeHoverCopy(a);
    const hb = makeHoverCopy(b);
    ha.position.copy(basePos1).add(new THREE.Vector3(0, 0.16, 0));
    hb.position.copy(basePos2).add(new THREE.Vector3(0, 0.16, 0));

    // face toward camera (so YOU can see your hand)
    const look = camera.position.clone();
    ha.lookAt(look);
    hb.lookAt(look);

    scene.add(ha); scene.add(hb);

    entry.base.push(a,b);
    entry.hover.push(ha,hb);
  }

  async function dealFlop(cards3, { dealerPos } = {}) {
    // flop: 3 together, one animation per card but back-to-back quickly
    const start = dealerPos ? dealerPos.clone() : new THREE.Vector3(0, 1.25, 0);

    for (let i=0;i<3;i++) {
      const m = makeCardMesh(cards3[i]);
      m.position.copy(start);
      m.rotation.set(-Math.PI/2, 0, 0);
      communityGroup.add(m);
      const target = communitySlots[i].clone();
      await animateMove(m, start, target, 620, 0.085);
      communityCards.push(m);
      await delay(140);
    }
  }

  async function dealTurn(card, { dealerPos } = {}) {
    const start = dealerPos ? dealerPos.clone() : new THREE.Vector3(0, 1.25, 0);
    const m = makeCardMesh(card);
    m.position.copy(start);
    m.rotation.set(-Math.PI/2, 0, 0);
    communityGroup.add(m);
    const target = communitySlots[3].clone();
    await animateMove(m, start, target, 680, 0.09);
    communityCards.push(m);
  }

  async function dealRiver(card, { dealerPos } = {}) {
    const start = dealerPos ? dealerPos.clone() : new THREE.Vector3(0, 1.25, 0);
    const m = makeCardMesh(card);
    m.position.copy(start);
    m.rotation.set(-Math.PI/2, 0, 0);
    communityGroup.add(m);
    const target = communitySlots[4].clone();
    await animateMove(m, start, target, 680, 0.09);
    communityCards.push(m);
  }

  async function winnerRevealToCommunity(winnerBotId) {
    const entry = playerCards.get(winnerBotId);
    if (!entry) return;

    // animate base cards (from table in front of winner) to the center/community
    const center = new THREE.Vector3(0, 0.88 + 0.04, 0);

    for (let i=0;i<entry.base.length;i++) {
      const card = entry.base[i];
      const from = card.position.clone();
      const to = center.clone().add(new THREE.Vector3(i===0 ? -0.06 : 0.06, 0, -0.12));
      await animateMove(card, from, to, 820, 0.14);
      card.rotation.set(-Math.PI/2, 0, 0);
      await delay(120);
    }
  }

  function updateHoverFacing() {
    // keep hover cards facing camera each frame
    for (const entry of playerCards.values()) {
      for (const h of entry.hover) {
        h.lookAt(camera.position);
      }
    }
  }

  return {
    clearAllCards,
    ensurePlayerAnchors,
    dealHoleCardsToPlayer,
    dealFlop,
    dealTurn,
    dealRiver,
    winnerRevealToCommunity,
    updateHoverFacing,
  };
                      }
