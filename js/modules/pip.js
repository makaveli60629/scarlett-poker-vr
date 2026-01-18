// /js/modules/pip.js
// Picture-in-Picture: mini render of the table from a fixed camera into a canvas.

export function installPIP(ctx){
  const { THREE, scene, world } = ctx;
  const dwrite = (m)=>{ try{ window.__scarlettDiagWrite?.(m); }catch(_){ } };

  // Build table + cards + hover cards (teaching mirror)
  const table = buildTable(THREE);
  world.tableSystem = table;
  world.tableAnchor.add(table.group);

  // Offscreen renderer
  const pipCanvas = document.getElementById('pipCanvas');
  const pipRenderer = new THREE.WebGLRenderer({ canvas: pipCanvas, antialias:true, alpha:true, preserveDrawingBuffer:false });
  pipRenderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  const pipScene = scene; // same scene; different camera
  const pipCam = new THREE.PerspectiveCamera(55, 4/3, 0.05, 200);
  pipCam.position.set(0, 3.2, 3.8);
  pipCam.lookAt(0, -0.35, 0);

  function resize(){
    const r = pipCanvas.getBoundingClientRect();
    const w = Math.max(2, Math.floor(r.width));
    const h = Math.max(2, Math.floor(r.height));
    pipRenderer.setSize(w, h, false);
    pipCam.aspect = w/h;
    pipCam.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // Render loop for PIP (decoupled; light cost)
  let last = performance.now();
  function loop(){
    const now = performance.now();
    const dt = Math.min(0.05, (now-last)/1000);
    last = now;

    // Small orbit
    const a = now * 0.00025;
    pipCam.position.set(Math.cos(a)*4.1, 3.0, Math.sin(a)*4.1);
    pipCam.lookAt(0, -0.35, 0);

    pipRenderer.render(pipScene, pipCam);
    requestAnimationFrame(loop);
  }
  loop();

  dwrite('[status] MODULE PIP ✅');
}


function buildTable(THREE){
  const g = new THREE.Group();
  const out = {
    group: g,
    cards: {
      community: { flat: [], hover: [] },
      seats: [] // seats[seatIndex(1..5)] -> { flat:[2], hover:[2] }
    },
    redeal: null,
  };

  // Table base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.6, 0.55, 64),
    new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7, metalness: 0.08 })
  );
  base.position.y = 0.25;
  g.add(base);

  // Felt top
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 0.14, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b3a2a, roughness: 0.95, metalness: 0.0, emissive: 0x04140f, emissiveIntensity: 0.25 })
  );
  felt.position.y = 0.55;
  g.add(felt);

  // Rim
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(2.22, 0.08, 16, 84),
    new THREE.MeshStandardMaterial({ color: 0x1b2534, roughness: 0.55, metalness: 0.18 })
  );
  rim.position.y = 0.63;
  rim.rotation.x = Math.PI/2;
  g.add(rim);

  // Dealer chip
  const chip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.12, 24),
    new THREE.MeshStandardMaterial({ color: 0xff2f6d, roughness: 0.4, metalness: 0.1, emissive: 0xff2f6d, emissiveIntensity: 0.1 })
  );
  chip.position.set(0, 0.70, -0.55);
  g.add(chip);

  const w = 0.22, h = 0.32;
  const flatY = 0.62;
  const hoverY = 1.15;

  const backTex = makeCardBackTexture(THREE);

  const makeCardMesh = () => {
    const m = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.75, metalness: 0.0 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    return mesh;
  };

  // Community cards (5)
  for (let i=0;i<5;i++){
    const card = makeCardMesh();
    card.rotation.x = -Math.PI/2;
    card.position.set(-0.52 + i*0.26, flatY, 0);
    g.add(card);
    out.cards.community.flat.push(card);

    const hover = makeCardMesh();
    hover.position.set(card.position.x, hoverY, card.position.z);
    hover.rotation.y = Math.PI;
    g.add(hover);
    out.cards.community.hover.push(hover);
  }

  // Player hands (5 bots) around 6-seat table (seat 0 reserved for player)
  const seats = 6;
  const radius = 1.65;
  for (let i=1;i<seats;i++){
    const ang = (i/seats)*Math.PI*2;
    const px = Math.cos(ang)*radius;
    const pz = Math.sin(ang)*radius;

    const seat = { flat: [], hover: [] };

    for (let c=0;c<2;c++){
      const card = makeCardMesh();
      card.rotation.x = -Math.PI/2;
      card.position.set(px + (c-0.5)*0.12, flatY, pz);
      card.rotation.z = ang + (c-0.5)*0.12;
      g.add(card);
      seat.flat.push(card);

      const hover = makeCardMesh();
      hover.position.set(px + (c-0.5)*0.12, hoverY, pz);
      hover.rotation.y = Math.PI;
      hover.rotation.z = -ang + (c-0.5)*0.12;
      g.add(hover);
      seat.hover.push(hover);
    }

    out.cards.seats.push(seat);
  }

  // --- Deal loop: retexture the existing meshes with a shuffled deck ---
  const ranks = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
  const suits = ['♠','♥','♦','♣'];

  function shuffle(arr){
    for (let i=arr.length-1;i>0;i--){
      const j = (Math.random()*(i+1))|0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function setCard(mesh, card){
    const tex = makeCardTexture(THREE, card.r, card.s);
    mesh.material.map = tex;
    mesh.material.needsUpdate = true;
  }

  function setBack(mesh){
    mesh.material.map = backTex;
    mesh.material.needsUpdate = true;
  }

  function redeal(){
    const deck = [];
    for (const r of ranks){ for (const s of suits){ deck.push({r,s}); } }
    shuffle(deck);

    // Deal 5 seats x2 (seat index 0..4 in out.cards.seats)
    for (let si=0; si<out.cards.seats.length; si++){
      const seat = out.cards.seats[si];
      const c1 = deck.pop();
      const c2 = deck.pop();
      // flat (bot-facing)
      setCard(seat.flat[0], c1);
      setCard(seat.flat[1], c2);
      // hover (spectator mirror)
      setCard(seat.hover[0], c1);
      setCard(seat.hover[1], c2);
    }

    // Community: show backs first, then reveal in phases
    for (let i=0;i<5;i++){
      setBack(out.cards.community.flat[i]);
      setBack(out.cards.community.hover[i]);
    }

    const comm = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];

    const reveal = (idx) => {
      setCard(out.cards.community.flat[idx], comm[idx]);
      setCard(out.cards.community.hover[idx], comm[idx]);
    };

    // timing (ms)
    setTimeout(() => { reveal(0); reveal(1); reveal(2); }, 1200);
    setTimeout(() => { reveal(3); }, 2400);
    setTimeout(() => { reveal(4); }, 3600);
  }

  out.redeal = redeal;
  redeal();
  setInterval(redeal, 9000);

  return out;
}

function makeCardBackTexture(THREE){
  const c = document.createElement('canvas');
  c.width = 256; c.height = 384;
  const x = c.getContext('2d');

  x.fillStyle = '#0b1220';
  x.fillRect(0,0,c.width,c.height);

  x.strokeStyle = 'rgba(255,47,109,0.9)';
  x.lineWidth = 10;
  x.strokeRect(12,12,c.width-24,c.height-24);

  x.fillStyle = 'rgba(255,47,109,0.85)';
  x.font = '900 62px system-ui, Arial';
  x.textAlign='center';
  x.textBaseline='middle';
  x.fillText('SCARLETT', 128, 160);

  x.fillStyle = 'rgba(248,250,252,0.9)';
  x.font = '800 44px system-ui, Arial';
  x.fillText('POKER', 128, 220);

  return new THREE.CanvasTexture(c);
}

function makeCardTexture(THREE, rank, suit){
  const c = document.createElement('canvas');
  c.width = 256; c.height = 384;
  const x = c.getContext('2d');

  x.fillStyle = '#f8fafc';
  x.fillRect(0,0,c.width,c.height);
  x.strokeStyle = 'rgba(15,23,42,0.35)';
  x.lineWidth = 10;
  x.strokeRect(12,12,c.width-24,c.height-24);

  const isRed = (suit === '♥' || suit === '♦');

  x.fillStyle = isRed ? 'rgba(239,68,68,0.95)' : 'rgba(15,23,42,0.92)';
  x.font = '900 110px system-ui, Arial';
  x.textAlign='center';
  x.textBaseline='middle';
  x.fillText(String(rank), 128, 165);

  x.fillStyle = isRed ? 'rgba(239,68,68,0.92)' : 'rgba(15,23,42,0.85)';
  x.font = '900 72px system-ui, Arial';
  x.fillText(String(suit), 128, 250);

  // corner pips
  x.font = '800 42px system-ui, Arial';
  x.textAlign='left';
  x.textBaseline='top';
  x.fillText(String(rank), 28, 20);
  x.fillText(String(suit), 28, 62);

  x.textAlign='right';
  x.textBaseline='bottom';
  x.fillText(String(rank), 228, 362);
  x.fillText(String(suit), 228, 320);

  return new THREE.CanvasTexture(c);
}
