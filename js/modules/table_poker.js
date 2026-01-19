// SCARLETT • Table Poker (dealer rotation + seat glow + chip sizing)

function randInt(a,b){return (a + Math.floor(Math.random()*(b-a+1)));}

export function spawnPokerTable(state) {
  const THREE = window.THREE;
  if (!THREE || !state?.scene) return;

  // Root
  const root = new THREE.Group();
  root.name = 'pokerTableRoot';
  root.position.set(0, 0, 0);
  state.scene.add(root);
  state.tableRoot = root;

  // Table base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.65, 1.85, 0.28, 48),
    new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95, metalness: 0.05 })
  );
  base.position.y = 0.72;
  root.add(base);

  // Felt
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(1.42, 1.42, 0.06, 48),
    new THREE.MeshStandardMaterial({ color: 0x0b6b3a, roughness: 1.0, metalness: 0.0 })
  );
  felt.position.y = 0.86;
  root.add(felt);

  // Deck box (improved)
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.18, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x0b0f16, roughness: 0.6, metalness: 0.15 })
  );
  box.position.set(0.95, 0.95, 0.15);
  root.add(box);

  // Deck label
  const label = makeLabelSprite('SCARLETT\n52 CARDS');
  label.position.set(0.95, 1.02, 0.225);
  label.scale.set(0.22, 0.12, 1);
  root.add(label);

  // Seats
  const seatCount = 6;
  const seats = [];
  const seatMeshes = [];
  const r = 2.15;

  for (let i=0;i<seatCount;i++) {
    const ang = (i/seatCount) * Math.PI*2;
    const x = Math.cos(ang)*r;
    const z = Math.sin(ang)*r;
    const pos = new THREE.Vector3(x, 0, z);
    const look = new THREE.Vector3(0, 0.86, 0);
    seats.push({ pos, look, ang });

    // Chair
    const chair = new THREE.Group();
    chair.position.set(x, 0, z);
    chair.lookAt(0, 0.86, 0);
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.06, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.95, metalness: 0.05 })
    );
    seat.position.y = 0.42;

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.42, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95, metalness: 0.05 })
    );
    back.position.set(0, 0.63, -0.18);

    chair.add(seat, back);

    // Seat glow ring (turn indicator)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.02, 10, 36),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0ea5e9, emissiveIntensity: 0.0 })
    );
    ring.rotation.x = Math.PI/2;
    ring.position.y = 0.49;
    chair.add(ring);

    // Nameplate on table edge
    const plate = makeLabelSprite(`SEAT ${i+1}`);
    plate.position.set(0, 0.98, -0.55);
    plate.scale.set(0.30, 0.08, 1);
    chair.add(plate);

    chair.userData.seatIndex = i;
    chair.userData.turnRing = ring;

    root.add(chair);
    seatMeshes.push(chair);
  }

  state.tableSeats = seats;
  state.tableSeatMeshes = seatMeshes;

  // Dealer button
  const dealerBtn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.018, 24),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.6, metalness: 0.1, emissive: 0x332200, emissiveIntensity: 0.35 })
  );
  dealerBtn.position.set(0, 0.93, 0);
  root.add(dealerBtn);
  state.dealerButton = dealerBtn;

  // Chip stacks per seat
  state.chipStacks = state.chipStacks || [];
  const chipMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.7, metalness: 0.05 });
  const chipGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.012, 18);

  const potAnchor = new THREE.Object3D();
  potAnchor.position.set(0, 0.93, 0);
  root.add(potAnchor);
  state.potAnchor = potAnchor;

  for (let i=0;i<seatCount;i++) {
    const ang = seats[i].ang;
    const stackRoot = new THREE.Group();
    stackRoot.position.set(Math.cos(ang)*1.08, 0.90, Math.sin(ang)*1.08);
    root.add(stackRoot);

    const stack = [];
    for (let c=0;c<18;c++) {
      const chip = new THREE.Mesh(chipGeo, chipMat);
      chip.position.y = c * 0.012;
      stackRoot.add(chip);
      stack.push(chip);
    }
    state.chipStacks[i] = { root: stackRoot, chips: stack, stackSize: 18 };
  }

  // Community cards placeholders (upright teaching display)
  const commRoot = new THREE.Group();
  commRoot.position.set(0, 1.08, 0.0);
  root.add(commRoot);
  state.communityRoot = commRoot;

  const commCards = [];
  for (let i=0;i<5;i++) {
    const c = makeCardMesh();
    c.position.set(-0.42 + i*0.21, 0, -0.05);
    c.rotation.x = -0.15;
    commRoot.add(c);
    commCards.push(c);
  }
  state.communityCards = commCards;

  // Mirrored hole cards above each seat (teaching)
  state.mirrorCards = [];
  for (let i=0;i<seatCount;i++) {
    const grp = new THREE.Group();
    const m1 = makeCardMesh();
    const m2 = makeCardMesh();
    m1.position.set(-0.08, 0, 0);
    m2.position.set( 0.08, 0, 0);
    grp.add(m1, m2);
    grp.position.copy(seats[i].pos);
    grp.position.y = 1.35;
    grp.lookAt(0, 1.2, 0);
    root.add(grp);
    state.mirrorCards[i] = [m1, m2, grp];
  }

  // Hand loop state
  state.handIndex = state.handIndex || 0;
  state.activeSeat = state.activeSeat || 0;

  // Start loop
  startDemoLoop(state);
}

function startDemoLoop(state) {
  const dwrite = (msg) => { try { window.__scarlettDiagWrite?.(String(msg)); } catch (_) {} };
  dwrite('poker: demo loop start');

  // Every hand: rotate dealer, then run action ticks
  const seatCount = state.tableSeats.length;

  const nextHand = async () => {
    state.handIndex = (state.handIndex || 0) + 1;
    const dealer = (state.handIndex % seatCount);

    // Place dealer button near dealer seat edge
    const s = state.tableSeats[dealer];
    state.dealerButton.position.set(Math.cos(s.ang)*0.85, 0.93, Math.sin(s.ang)*0.85);

    // Reset indicators
    setActiveSeat(state, (dealer + 1) % seatCount);

    // Fake deal visuals (update card faces to random)
    for (let i=0;i<seatCount;i++) {
      const [m1, m2] = state.mirrorCards[i] || [];
      setCardFace(m1, randInt(1,13), randInt(0,3));
      setCardFace(m2, randInt(1,13), randInt(0,3));
    }

    // Reveal community in stages
    // Preflop blank
    state.communityCards.forEach(c => setCardBack(c));

    await sleep(900);
    // Flop
    for (let i=0;i<3;i++) setCardFace(state.communityCards[i], randInt(1,13), randInt(0,3));

    // Action ticks with chips
    for (let t=0;t<4;t++) {
      await runActionRound(state);
    }

    await sleep(800);
    // Turn
    setCardFace(state.communityCards[3], randInt(1,13), randInt(0,3));
    await runActionRound(state);

    await sleep(800);
    // River
    setCardFace(state.communityCards[4], randInt(1,13), randInt(0,3));
    await runActionRound(state);

    // Showdown payout
    await sleep(900);
    const winner = randInt(0, seatCount-1);
    await payoutPotTo(state, winner);

    await sleep(1200);
    nextHand();
  };

  nextHand();
}

async function runActionRound(state) {
  const seatCount = state.tableSeats.length;
  // simple: each seat acts once
  for (let i=0;i<seatCount;i++) {
    setActiveSeat(state, i);
    await sleep(300);

    // random action
    const r = Math.random();
    if (r < 0.55) {
      // check (no chips)
      await sleep(150);
    } else {
      // bet/raise: send multiple chips based on size
      const bet = (r < 0.80) ? 3 : 7;
      await betToPot(state, i, bet);
    }
  }
}

function setActiveSeat(state, idx) {
  state.activeSeat = idx;
  // glow ring intensity
  (state.tableSeatMeshes || []).forEach((m, i) => {
    const ring = m?.userData?.turnRing;
    if (!ring) return;
    ring.material.emissiveIntensity = (i === idx) ? 1.2 : 0.0;
  });
}

async function betToPot(state, seatIdx, chipsToSend=3) {
  const stack = state.chipStacks?.[seatIdx];
  if (!stack) return;

  const send = Math.min(chipsToSend, stack.chips.length);
  for (let i=0;i<send;i++) {
    const chip = stack.chips.pop();
    if (!chip) break;
    await flyChip(chip, stack.root, state.potAnchor);
  }
}

async function payoutPotTo(state, winnerIdx) {
  // For the demo we just regenerate a few chips from pot to winner stack root.
  const winner = state.chipStacks?.[winnerIdx];
  if (!winner) return;

  // Create a handful of chips at pot and fly them to winner
  const THREE = window.THREE;
  const chipMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.7, metalness: 0.05 });
  const chipGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.012, 18);

  for (let i=0;i<10;i++) {
    const chip = new THREE.Mesh(chipGeo, chipMat);
    state.tableRoot.add(chip);
    chip.position.copy(state.potAnchor.position);
    chip.position.y += 0.02 + i*0.002;
    await flyChip(chip, state.tableRoot, winner.root);
    // add to stack (visual)
    chip.position.set(0, winner.chips.length * 0.012, 0);
    winner.root.add(chip);
    winner.chips.push(chip);
  }
}

async function flyChip(chip, fromObj, toObj) {
  // chip is currently child of fromObj; convert to world, animate, then reparent
  const THREE = window.THREE;
  const fromPos = new THREE.Vector3();
  const toPos = new THREE.Vector3();

  chip.getWorldPosition(fromPos);
  toObj.getWorldPosition(toPos);

  // Reparent to scene root for stable world animation
  const scene = window.__THREE_SCENE__ || window.SCARLETT_STATE?.scene;
  if (scene && chip.parent !== scene) {
    scene.add(chip);
    chip.position.copy(fromPos);
  }

  const dur = 280;
  const t0 = performance.now();

  return new Promise(resolve => {
    const tick = () => {
      const t = Math.min(1, (performance.now() - t0) / dur);
      // ease
      const e = t*t*(3-2*t);
      chip.position.lerpVectors(fromPos, toPos, e);
      chip.position.y += Math.sin(e*Math.PI) * 0.18;
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });
}

function makeLabelSprite(text) {
  const THREE = window.THREE;
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0,0,256,96);
  ctx.fillStyle = '#e5e7eb';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = String(text).split('\n');
  if (lines.length === 1) {
    ctx.fillText(lines[0], 128, 48);
  } else {
    ctx.fillText(lines[0], 128, 34);
    ctx.fillText(lines[1], 128, 66);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  return spr;
}

function makeCardMesh() {
  const THREE = window.THREE;
  const geo = new THREE.PlaneGeometry(0.16, 0.22);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.0 });
  const mesh = new THREE.Mesh(geo, mat);
  // store per-card canvas
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 356;
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 2;
  mat.map = tex;
  mat.transparent = true;
  mesh.userData.canvas = canvas;
  mesh.userData.tex = tex;
  setCardBack(mesh);
  return mesh;
}

function setCardBack(mesh) {
  if (!mesh?.userData?.canvas) return;
  const c = mesh.userData.canvas;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#111827';
  ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle = '#ef4444';
  for (let y=0;y<c.height;y+=24) {
    for (let x=0;x<c.width;x+=24) {
      ctx.globalAlpha = 0.12;
      ctx.fillRect(x+6,y+6,12,12);
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#e5e7eb';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText('S', c.width/2, c.height/2);
  mesh.userData.tex.needsUpdate = true;
}

function setCardFace(mesh, rank=1, suit=0) {
  if (!mesh?.userData?.canvas) return;
  const c = mesh.userData.canvas;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,c.width,c.height);

  const suits = ['♠','♥','♦','♣'];
  const suitChar = suits[suit % 4];
  const isRed = (suitChar === '♥' || suitChar === '♦');

  const ranks = {1:'A',11:'J',12:'Q',13:'K'};
  const r = ranks[rank] || String(rank);

  ctx.fillStyle = isRed ? '#dc2626' : '#111827';
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign='left';
  ctx.textBaseline='top';
  ctx.fillText(r, 20, 18);
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText(suitChar, 20, 76);

  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.font = 'bold 160px sans-serif';
  ctx.globalAlpha = 0.85;
  ctx.fillText(suitChar, c.width/2, c.height/2 + 16);
  ctx.globalAlpha = 1;

  // bottom corner
  ctx.save();
  ctx.translate(c.width-20, c.height-18);
  ctx.rotate(Math.PI);
  ctx.textAlign='left';
  ctx.textBaseline='top';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText(r, 0, 0);
  ctx.fillText(suitChar, 0, 58);
  ctx.restore();

  mesh.userData.tex.needsUpdate = true;
}

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
