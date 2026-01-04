// js/main.js (classic script; NO modules; Android + Quest + GitHub Pages)
(function () {
  // ---- HUD ----
  const statusEl = document.getElementById("status");
  const chipsEl  = document.getElementById("chips");
  const potEl    = document.getElementById("pot");
  const ownedEl  = document.getElementById("owned");
  const seatEl   = document.getElementById("seat");
  const vrBtn    = document.getElementById("vrBtn");
  const audioBtn = document.getElementById("audioBtn");
  const resetBtn = document.getElementById("resetBtn");

  const setStatus = (m) => { if (statusEl) statusEl.textContent = m; };

  // ---- Save ----
  const SAVE_KEY = "scarlett_vr_save_v1";
  const defaultSave = { chips: 10000, pot: 0, owned: [], seatIndex: -1 };

  let save = loadSave();

  // ---- Three state ----
  let scene, camera, renderer, raycaster;
  let floorMesh;
  let teleportMarker, teleportLine;
  let lastTeleportValid = false;
  const teleportPoint = new THREE.Vector3();

  // ---- Android look/move ----
  let yaw = 0, pitch = 0;
  let touchMode = "look";
  let lastX = 0, lastY = 0, lastTouchDist = null;

  // ---- Audio ----
  let listener, bgm, audioReady = false;
  let clickSfx, clickReady = false;
  let slotSfx, slotReady = false;

  // ---- Controllers + Laser UI ----
  let controller0 = null, controller1 = null;
  let laser0 = null, laser1 = null;
  let reticle0 = null, reticle1 = null;

  // ---- Interactables & hover highlight ----
  const interactables = [];
  let hovered = null;

  // ---- Store ----
  let storePage = 0;
  const storePages = [
    [
      { label: "+500 CHIPS", type: "chips", amount: 500, cost: 0 },
      { label: "HAT  -1000", type: "item", name: "Hat", cost: 1000 },
      { label: "HOODIE -2500", type: "item", name: "Hoodie", cost: 2500 },
      { label: "SHADES -1500", type: "item", name: "Shades", cost: 1500 },
    ],
    [
      { label: "BET +10", type: "bet", amount: 10 },
      { label: "BET +100", type: "bet", amount: 100 },
      { label: "PLACE BET", type: "placebet" },
      { label: "RESET COSMETICS", type: "resetcos" },
    ]
  ];
  let betAmount = 0;

  // ---- Poker ----
  let tableGroup;
  const seats = []; // {pos, lookAt, hotspotMesh}
  const chipStacks = []; // interactable
  let seatIndex = save.seatIndex ?? -1;

  // ---- Casino props ----
  let slotMachine;

  // ---- Boot ----
  try {
    boot();
    animate();
    setStatus("Loaded ✅ Casino + Store + Poker (Android + Quest)");
    updateHUD();
    setupVRButton();
    setupAndroidControls();
    setupTapInteractions();
    setupAudio();
    if (resetBtn) resetBtn.addEventListener("click", () => resetSave());
  } catch (e) {
    console.error(e);
    setStatus("BOOT FAILED ❌\n" + (e?.message || String(e)));
  }

  // =========================
  // BOOT + SCENE BUILD
  // =========================
  function boot() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020205);
    scene.fog = new THREE.Fog(0x020205, 10, 70);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 300);
    camera.position.set(0, 1.65, 8);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.xr.enabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();

    // Lighting
    scene.add(new THREE.HemisphereLight(0xffffff, 0x202030, 1.05));

    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(10, 14, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 90;
    key.shadow.camera.left = -28;
    key.shadow.camera.right = 28;
    key.shadow.camera.top = 28;
    key.shadow.camera.bottom = -28;
    scene.add(key);

    addCeilingLight(0, 7, 0);
    addCeilingLight(7, 7, -4);
    addCeilingLight(-7, 7, -4);

    buildRoom();
    buildFloorCarpet();
    buildNeonTrim();
    buildSignage();
    buildLounge();
    buildPokerTableAndSeats();
    buildChipStacks();
    buildStorePanel();
    buildSlotMachine();
    buildTeleportHelpers();

    // If player had a seat saved, snap them near it (Android dev friendly)
    if (seatIndex >= 0 && seatIndex < seats.length) {
      snapToSeat(seatIndex);
    }

    window.addEventListener("resize", onResize);
  }

  function addCeilingLight(x, y, z) {
    const p = new THREE.PointLight(0xfff2e0, 1.0, 30, 2);
    p.position.set(x, y, z);
    scene.add(p);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xfff2e0, emissive: 0xffe2b0, emissiveIntensity: 1.25 })
    );
    bulb.position.copy(p.position);
    scene.add(bulb);
  }

  function buildRoom() {
    const roomW = 24, roomH = 8, roomD = 24;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.95 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.85 });

    // Main walls
    addBox(roomW, roomH, 0.4, 0, roomH/2, -roomD/2, wallMat, true);
    addBox(0.4, roomH, roomD, -roomW/2, roomH/2, 0, wallMat, true);
    addBox(0.4, roomH, roomD, roomW/2, roomH/2, 0, wallMat, true);

    // Front wall w doorway
    const doorW = 6.0, doorH = 3.4;
    const sideW = (roomW - doorW) / 2;
    const topH  = roomH - doorH;

    addBox(sideW, roomH, 0.4, -(doorW/2 + sideW/2), roomH/2, roomD/2, wallMat, true);
    addBox(sideW, roomH, 0.4,  (doorW/2 + sideW/2), roomH/2, roomD/2, wallMat, true);
    addBox(doorW, topH, 0.4, 0, doorH + topH/2, roomD/2, wallMat, true);

    // Ceiling
    addBox(roomW, 0.4, roomD, 0, roomH, 0, trimMat, true);

    // Base trim ring
    const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(roomW - 0.2, 0.25, roomD - 0.2), trimMat);
    baseTrim.position.set(0, 0.12, 0);
    baseTrim.receiveShadow = true;
    scene.add(baseTrim);
  }

  function buildFloorCarpet() {
    // Main floor
    floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(110, 110),
      new THREE.MeshStandardMaterial({ color: 0x232329, roughness: 1.0 })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Carpet pattern (procedural)
    const carpetTex = makeCarpetTexture();
    carpetTex.wrapS = carpetTex.wrapT = THREE.RepeatWrapping;
    carpetTex.repeat.set(3, 3);

    const carpetMat = new THREE.MeshStandardMaterial({
      map: carpetTex,
      color: 0xffffff,
      roughness: 1.0,
      metalness: 0.0
    });

    const carpet = new THREE.Mesh(new THREE.CircleGeometry(8.0, 96), carpetMat);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.y = 0.01;
    carpet.receiveShadow = true;
    scene.add(carpet);
  }

  function makeCarpetTexture() {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    const ctx = c.getContext("2d");

    // base
    ctx.fillStyle = "#16161b";
    ctx.fillRect(0, 0, 512, 512);

    // pattern
    for (let i = 0; i < 1200; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 1 + Math.random() * 2.5;
      const a = 0.04 + Math.random() * 0.09;
      ctx.fillStyle = `rgba(140, 80, 255, ${a})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // subtle diamonds
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 2;
    for (let y = -64; y < 576; y += 64) {
      for (let x = -64; x < 576; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x + 32, y);
        ctx.lineTo(x + 64, y + 32);
        ctx.lineTo(x + 32, y + 64);
        ctx.lineTo(x, y + 32);
        ctx.closePath();
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    tex.anisotropy = 4;
    return tex;
  }

  function buildNeonTrim() {
    // Emissive strips around edges (cheap but effective)
    const neonMat = new THREE.MeshStandardMaterial({
      color: 0x111114,
      emissive: 0x7a2cff,
      emissiveIntensity: 1.25,
      roughness: 0.5
    });

    const y = 3.1;
    const strips = [
      { w: 23.2, h: 0.12, d: 0.12, x: 0,   z: -11.8 },
      { w: 23.2, h: 0.12, d: 0.12, x: 0,   z:  11.8 },
      { w: 0.12, h: 0.12, d: 23.2, x: -11.8, z: 0 },
      { w: 0.12, h: 0.12, d: 23.2, x:  11.8, z: 0 }
    ];
    strips.forEach(s => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.d), neonMat);
      m.position.set(s.x, y, s.z);
      scene.add(m);
    });
  }

  function buildSignage() {
    const tex = makeSignTexture("TEAM NOVA", "CASINO LOBBY", "Store • Poker • Lounge");
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 1.4),
      new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveIntensity: 0.55 })
    );
    sign.position.set(0, 4.6, -11.6);
    scene.add(sign);
  }

  function makeSignTexture(a, b, c) {
    const cnv = document.createElement("canvas");
    cnv.width = 1024; cnv.height = 512;
    const ctx = cnv.getContext("2d");

    ctx.fillStyle = "#08080c";
    ctx.fillRect(0, 0, cnv.width, cnv.height);

    // glow border
    ctx.strokeStyle = "rgba(122,44,255,0.55)";
    ctx.lineWidth = 18;
    ctx.strokeRect(28, 28, cnv.width - 56, cnv.height - 56);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 92px Arial";
    ctx.fillText(a, cnv.width/2, 190);

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 52px Arial";
    ctx.fillText(b, cnv.width/2, 280);

    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.font = "40px Arial";
    ctx.fillText(c, cnv.width/2, 360);

    const tex = new THREE.CanvasTexture(cnv);
    tex.needsUpdate = true;
    tex.anisotropy = 4;
    return tex;
  }

  function buildLounge() {
    // Simple lounge corner (right side)
    const group = new THREE.Group();
    group.position.set(7.5, 0, -6.0);

    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x2b2b33, roughness: 0.95 });
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x3b3b48, roughness: 0.98 });

    // sofa base
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 1.2), sofaMat);
    base.position.set(0, 0.25, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 0.25), sofaMat);
    back.position.set(0, 0.95, -0.48);
    back.castShadow = true;
    group.add(back);

    // cushions
    for (let i = -1; i <= 1; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.9), cushionMat);
      c.position.set(i * 1.05, 0.58, 0.1);
      c.castShadow = true;
      group.add(c);
    }

    // coffee table
    const tbl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.7, 0.12, 28),
      new THREE.MeshStandardMaterial({ color: 0x101014, roughness: 0.85 })
    );
    tbl.position.set(0, 0.06, 1.6);
    tbl.castShadow = true;
    tbl.receiveShadow = true;
    group.add(tbl);

    scene.add(group);
  }

  function buildPokerTableAndSeats() {
    tableGroup = new THREE.Group();

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(3.3, 3.3, 0.25, 48),
      new THREE.MeshStandardMaterial({ color: 0x0e4a2a, roughness: 0.95 })
    );
    top.scale.set(1.4, 1, 1.0);
    top.position.set(0, 1.05, 0);
    top.castShadow = true;
    top.receiveShadow = true;
    tableGroup.add(top);

    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(4.65, 0.22, 18, 80),
      new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.7, metalness: 0.05 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.set(0, 1.12, 0);
    rail.scale.set(1.05, 1, 0.78);
    rail.castShadow = true;
    tableGroup.add(rail);

    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.55, 1.1, 24),
      new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.85 })
    );
    leg.position.set(0, 0.55, 0);
    leg.castShadow = true;
    tableGroup.add(leg);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.8, 0.18, 32),
      new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.9 })
    );
    base.position.set(0, 0.09, 0);
    base.receiveShadow = true;
    tableGroup.add(base);

    scene.add(tableGroup);

    // Chairs + seat hotspots
    const chairFrame = new THREE.MeshStandardMaterial({ color: 0x5a5a5f, roughness: 0.95 });
    const chairSeat = new THREE.MeshStandardMaterial({ color: 0x3a3a3f, roughness: 0.98 });

    const radius = 6.2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.sin(a) * radius;
      const z = Math.cos(a) * radius;

      const chair = buildChair(chairFrame, chairSeat);
      chair.position.set(x, 0, z);
      chair.lookAt(0, 0, 0);
      chair.rotateY(Math.PI);
      scene.add(chair);

      // seat position a bit closer to table
      const seatPos = new THREE.Vector3(Math.sin(a) * (radius - 1.3), 0, Math.cos(a) * (radius - 1.3));

      const hotspot = new THREE.Mesh(
        new THREE.CircleGeometry(0.45, 24),
        new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
      );
      hotspot.rotation.x = -Math.PI / 2;
      hotspot.position.set(seatPos.x, 0.02, seatPos.z);
      hotspot.userData.onInteract = () => {
        snapToSeat(i);
        playClick();
        hapticPulse();
        setStatus(`Seated ✅ Seat ${i + 1}`);
      };
      hotspot.userData.hoverable = true;
      scene.add(hotspot);

      seats.push({ pos: seatPos, hotspotMesh: hotspot });
      interactables.push(hotspot);
    }
  }

  function buildChair(frameMat, seatMat) {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.75), seatMat);
    seat.position.set(0, 0.55, 0);
    seat.castShadow = true;
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.9, 0.12), seatMat);
    back.position.set(0, 1.05, -0.32);
    back.castShadow = true;
    g.add(back);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.55, 16), frameMat);
    post.position.set(0, 0.28, 0);
    post.castShadow = true;
    g.add(post);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 20), frameMat);
    base.position.set(0, 0.03, 0);
    base.receiveShadow = true;
    g.add(base);

    return g;
  }

  function snapToSeat(i) {
    seatIndex = i;
    save.seatIndex = i;
    saveSave();

    const p = seats[i].pos.clone();
    camera.position.set(p.x, camera.position.y, p.z);

    // face toward table center
    const look = new THREE.Vector3(0, 1.4, 0);
    camera.lookAt(look);

    // sync 2D yaw/pitch for Android
    const dir = new THREE.Vector3().subVectors(look, camera.position).normalize();
    yaw = Math.atan2(dir.x, dir.z);
    pitch = 0;
    updateHUD();
  }

  function buildChipStacks() {
    // 4 chip stacks on table (interactable)
    const positions = [
      new THREE.Vector3(1.2, 1.18, 0.6),
      new THREE.Vector3(-1.2, 1.18, 0.6),
      new THREE.Vector3(1.2, 1.18, -0.6),
      new THREE.Vector3(-1.2, 1.18, -0.6)
    ];

    positions.forEach((p, idx) => {
      const stack = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.22, 24),
        new THREE.MeshStandardMaterial({ color: 0x8a2be2, roughness: 0.45, metalness: 0.05, emissive: 0x200020, emissiveIntensity: 0.15 })
      );
      stack.position.copy(p);
      stack.castShadow = true;
      stack.userData.onInteract = () => {
        // quick “take chips” for now
        addChips(100);
        playClick();
        hapticPulse();
        setStatus("Picked up chips ✅ (+100)");
      };
      stack.userData.hoverable = true;
      scene.add(stack);
      chipStacks.push(stack);
      interactables.push(stack);
    });
  }

  function buildStorePanel() {
    const panel = new THREE.Group();
    panel.position.set(-8.8, 1.6, -4.6);
    panel.rotation.y = Math.PI * 0.15;

    const bgTex = makePanelTexture("TEAM NOVA STORE", "Hover to highlight", "Trigger/Tap to select");
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 1.55),
      new THREE.MeshStandardMaterial({ map: bgTex, emissive: 0xffffff, emissiveIntensity: 0.35 })
    );
    panel.add(bg);

    const btnPositions = [0.35, 0.05, -0.25, -0.55];
    for (let i = 0; i < 4; i++) {
      const btn = makeUIButton(0, btnPositions[i], `BTN${i+1}`, () => onStoreAction(i));
      panel.add(btn);
      interactables.push(btn);
    }

    // nav buttons
    const prev = makeUIButton(-0.72, -0.82, "PREV", () => { storePage = (storePage + storePages.length - 1) % storePages.length; refreshStoreButtons(panel); playClick(); });
    const next = makeUIButton(0.72, -0.82, "NEXT", () => { storePage = (storePage + 1) % storePages.length; refreshStoreButtons(panel); playClick(); });
    panel.add(prev); panel.add(next);
    interactables.push(prev, next);

    // page label
    const pageTex = makeSmallLabelTexture(() => `PAGE ${storePage + 1}/${storePages.length}`);
    const pageLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.18),
      new THREE.MeshStandardMaterial({ map: pageTex, emissive: 0xffffff, emissiveIntensity: 0.25, transparent: true })
    );
    pageLabel.position.set(0, -0.82, 0.02);
    panel.add(pageLabel);

    panel.userData.pageLabel = pageLabel;
    panel.userData.pageTex = pageTex;

    scene.add(panel);
    panel.userData.buttonsRoot = panel;

    refreshStoreButtons(panel);
  }

  function refreshStoreButtons(panel) {
    // Update 4 main buttons by walking children that are marked storeButtonIndex
    const page = storePages[storePage];
    let btns = panel.children.filter(o => o.userData && typeof o.userData.storeButtonIndex === "number");
    btns.sort((a,b) => a.userData.storeButtonIndex - b.userData.storeButtonIndex);

    for (let i = 0; i < btns.length; i++) {
      const def = page[i];
      const label = def ? def.label : "—";
      btns[i].userData.label = label;
      btns[i].userData.storeDef = def || null;

      // update texture
      btns[i].material.map = makeButtonTexture(label);
      btns[i].material.needsUpdate = true;
    }

    // update page label
    if (panel.userData.pageTex && panel.userData.pageLabel) {
      panel.userData.pageTex.userData._updateText = `PAGE ${storePage + 1}/${storePages.length}`;
      panel.userData.pageLabel.material.map = panel.userData.pageTex;
      panel.userData.pageLabel.material.needsUpdate = true;
    }

    updateHUD();
    setStatus(`Store page ${storePage + 1} ✅`);
  }

  function onStoreAction(index) {
    const page = storePages[storePage];
    const def = page[index];
    if (!def) return;

    if (def.type === "chips") {
      addChips(def.amount);
      setStatus(`Chips +${def.amount} ✅`);
      return;
    }

    if (def.type === "item") {
      buyItem(def.name, def.cost);
      return;
    }

    if (def.type === "resetcos") {
      save.owned = [];
      saveSave();
      updateHUD();
      setStatus("Cosmetics reset ✅");
      return;
    }

    if (def.type === "bet") {
      betAmount += def.amount;
      setStatus(`Bet queued: ${betAmount.toLocaleString()} ✅`);
      updateHUD();
      return;
    }

    if (def.type === "placebet") {
      if (betAmount <= 0) { setStatus("Bet is 0 ❌"); return; }
      if (save.chips < betAmount) { setStatus("Not enough chips for bet ❌"); return; }
      save.chips -= betAmount;
      save.pot += betAmount;
      betAmount = 0;
      saveSave();
      updateHUD();
      playClick();
      hapticPulse();
      setStatus("Bet placed ✅");
      return;
    }
  }

  function makePanelTexture(line1, line2, line3) {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 512;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#0b0b10";
    ctx.fillRect(0, 0, c.width, c.height);

    ctx.strokeStyle = "rgba(122,44,255,0.55)";
    ctx.lineWidth = 12;
    ctx.strokeRect(18, 18, c.width - 36, c.height - 36);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 72px Arial";
    ctx.textAlign = "center";
    ctx.fillText(line1, c.width / 2, 160);

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 38px Arial";
    ctx.fillText(line2, c.width / 2, 260);

    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.font = "32px Arial";
    ctx.fillText(line3, c.width / 2, 320);

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }

  function makeButtonTexture(label) {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 128;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#141418";
    ctx.fillRect(0, 0, c.width, c.height);

    const g = ctx.createLinearGradient(0, 0, 0, c.height);
    g.addColorStop(0, "rgba(255,255,255,0.10)");
    g.addColorStop(1, "rgba(255,255,255,0.02)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);

    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, c.width - 20, c.height - 20);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 56px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, c.width / 2, c.height / 2);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function makeSmallLabelTexture(getTextFn) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 96;
    const ctx = c.getContext("2d");

    const tex = new THREE.CanvasTexture(c);
    tex.userData._updateText = getTextFn();

    // store updater text on texture
    tex.userData._render = function () {
      const text = tex.userData._updateText || getTextFn();
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, c.width - 20, c.height - 20);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "bold 44px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, c.width/2, c.height/2);
      tex.needsUpdate = true;
    };

    // initial render
    tex.userData._render();
    return tex;
  }

  function makeUIButton(x, y, label, onInteract) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.05, 0.18),
      new THREE.MeshStandardMaterial({ map: makeButtonTexture(label), emissive: 0xffffff, emissiveIntensity: 0.12, transparent: true })
    );
    mesh.position.set(x, y, 0.02);
    mesh.userData.onInteract = () => { pulse(mesh); playClick(); hapticPulse(); onInteract && onInteract(); };
    mesh.userData.hoverable = true;
    mesh.userData.baseEmissive = 0.12;
    mesh.userData.storeButtonIndex = (label.startsWith("BTN") ? (parseInt(label.replace("BTN",""),10)-1) : undefined);
    return mesh;
  }

  function buildSlotMachine() {
    // Left-front corner slot machine
    const g = new THREE.Group();
    g.position.set(-8.3, 0, 5.4);
    g.rotation.y = -0.25;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.6, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x0f0f14, roughness: 0.7, metalness: 0.1 })
    );
    body.position.set(0, 0.8, 0);
    body.castShadow = true;
    g.add(body);

    const screenTex = makeSignTexture("SLOT", "SPIN", "+CHIPS?");
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.45),
      new THREE.MeshStandardMaterial({ map: screenTex, emissive: 0xffffff, emissiveIntensity: 0.45 })
    );
    screen.position.set(0, 1.25, 0.36);
    g.add(screen);

    const btn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.06, 20),
      new THREE.MeshStandardMaterial({ color: 0xff7a00, roughness: 0.4, emissive: 0x552200, emissiveIntensity: 0.35 })
    );
    btn.rotation.x = Math.PI / 2;
    btn.position.set(0, 0.65, 0.36);
    btn.castShadow = true;
    btn.userData.onInteract = () => spinSlot();
    btn.userData.hoverable = true;

    g.add(btn);
    scene.add(g);

    slotMachine = { group: g, button: btn };
    interactables.push(btn, screen, body);
  }

  function spinSlot() {
    playSlot();
    hapticPulse();
    // simple RNG reward
    const roll = Math.random();
    if (roll < 0.05) { addChips(2000); setStatus("JACKPOT ✅ +2000"); return; }
    if (roll < 0.20) { addChips(500);  setStatus("WIN ✅ +500"); return; }
    if (roll < 0.60) { addChips(100);  setStatus("SMALL WIN ✅ +100"); return; }
    setStatus("No win this time ❌");
  }

  function buildTeleportHelpers() {
    teleportMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.28, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    teleportMarker.rotation.x = -Math.PI / 2;
    teleportMarker.position.set(0, 0.02, 0);
    teleportMarker.visible = false;
    scene.add(teleportMarker);

    teleportLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
      new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.85 })
    );
    teleportLine.visible = false;
    scene.add(teleportLine);
  }

  // =========================
  // VR + LASER
  // =========================
  function setupVRButton() {
    if (!vrBtn) return;

    vrBtn.disabled = true;
    vrBtn.textContent = "Checking VR…";

    if (!("xr" in navigator)) {
      vrBtn.textContent = "VR Not Supported";
      vrBtn.disabled = true;
      return;
    }

    navigator.xr.isSessionSupported("immersive-vr").then((ok) => {
      if (!ok) {
        vrBtn.textContent = "VR Not Supported";
        vrBtn.disabled = true;
        return;
      }

      vrBtn.textContent = "ENTER VR";
      vrBtn.disabled = false;

      vrBtn.addEventListener("click", async () => {
        try {
          vrBtn.disabled = true;
          vrBtn.textContent = "Starting VR…";

          const session = await navigator.xr.requestSession("immersive-vr", {
            optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"]
          });

          renderer.xr.setReferenceSpaceType("local-floor");
          await renderer.xr.setSession(session);

          setupControllers();

          session.addEventListener("end", () => {
            vrBtn.textContent = "ENTER VR";
            vrBtn.disabled = false;
            hideTeleport();
            hideLaser();
          });

          setStatus("VR ✅ Laser UI + Teleport active");
          tryStartAudio();
        } catch (e) {
          console.error(e);
          setStatus("VR Start Failed ❌\n" + (e?.message || String(e)));
          vrBtn.textContent = "ENTER VR";
          vrBtn.disabled = false;
        }
      });
    }).catch(() => {
      vrBtn.textContent = "VR Check Failed";
      vrBtn.disabled = true;
    });
  }

  function setupControllers() {
    controller0 = renderer.xr.getController(0);
    controller1 = renderer.xr.getController(1);

    controller0.addEventListener("selectstart", () => onVRSelect(controller0));
    controller1.addEventListener("selectstart", () => onVRSelect(controller1));

    scene.add(controller0);
    scene.add(controller1);

    laser0 = makeLaser();
    laser1 = makeLaser();
    controller0.add(laser0);
    controller1.add(laser1);

    reticle0 = makeReticle();
    reticle1 = makeReticle();
    scene.add(reticle0);
    scene.add(reticle1);
  }

  function makeLaser() {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
    const mat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geo, mat);
    line.scale.z = 8;
    return line;
  }

  function makeReticle() {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.01, 0.018, 24),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
    );
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    return m;
  }

  function hideLaser() {
    if (reticle0) reticle0.visible = false;
    if (reticle1) reticle1.visible = false;
  }

  function onVRSelect(ctrl) {
    const hit = rayFromController(ctrl, interactables);
    if (hit && hit.object && hit.object.userData && typeof hit.object.userData.onInteract === "function") {
      hit.object.userData.onInteract();
      return;
    }

    // teleport if not pointing at UI/props
    if (lastTeleportValid) {
      camera.position.set(teleportPoint.x, camera.position.y, teleportPoint.z);
      setStatus("Teleported ✅");
    }
  }

  // =========================
  // ANDROID CONTROLS + TAP
  // =========================
  function setupAndroidControls() {
    const canvas = renderer.domElement;

    canvas.addEventListener("touchstart", (ev) => {
      if (!ev.touches || ev.touches.length === 0) return;
      if (ev.touches.length === 1) {
        touchMode = "look";
        lastX = ev.touches[0].clientX;
        lastY = ev.touches[0].clientY;
      } else if (ev.touches.length === 2) {
        touchMode = "move";
        lastTouchDist = touchDistance(ev.touches[0], ev.touches[1]);
        lastX = (ev.touches[0].clientX + ev.touches[1].clientX) * 0.5;
        lastY = (ev.touches[0].clientY + ev.touches[1].clientY) * 0.5;
      }
    }, { passive: true });

    canvas.addEventListener("touchmove", (ev) => {
      if (!ev.touches || ev.touches.length === 0) return;
      if (renderer.xr.isPresenting) return;

      if (touchMode === "look" && ev.touches.length === 1) {
        const x = ev.touches[0].clientX;
        const y = ev.touches[0].clientY;
        const dx = x - lastX;
        const dy = y - lastY;
        lastX = x; lastY = y;

        yaw -= dx * 0.005;
        pitch -= dy * 0.005;
        pitch = Math.max(-1.15, Math.min(1.15, pitch));
      }

      if (touchMode === "move" && ev.touches.length === 2) {
        const cx = (ev.touches[0].clientX + ev.touches[1].clientX) * 0.5;
        const cy = (ev.touches[0].clientY + ev.touches[1].clientY) * 0.5;

        const dx = cx - lastX;
        const dy = cy - lastY;
        lastX = cx; lastY = cy;

        const forward = -dy * 0.01;
        const strafe = dx * 0.01;

        const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        const right = new THREE.Vector3(Math.sin(yaw + Math.PI / 2), 0, Math.cos(yaw + Math.PI / 2));

        camera.position.addScaledVector(dir, forward);
        camera.position.addScaledVector(right, strafe);

        const dist = touchDistance(ev.touches[0], ev.touches[1]);
        if (lastTouchDist != null) {
          const pinch = (dist - lastTouchDist) * 0.002;
          camera.position.addScaledVector(dir, -pinch);
        }
        lastTouchDist = dist;
      }
    }, { passive: true });
  }

  function setupTapInteractions() {
    // Android tap/click ray from center screen
    renderer.domElement.addEventListener("click", () => {
      if (renderer.xr.isPresenting) return;
      tryStartAudio();
      raycaster.setFromCamera({ x: 0, y: 0 }, camera);
      const hits = raycaster.intersectObjects(interactables, true);
      if (hits.length) {
        const obj = hits[0].object;
        if (obj.userData && typeof obj.userData.onInteract === "function") obj.userData.onInteract();
      }
    }, { passive: true });

    if (audioBtn) audioBtn.addEventListener("click", () => tryStartAudio(true));
  }

  // =========================
  // AUDIO
  // =========================
  function setupAudio() {
    listener = new THREE.AudioListener();
    camera.add(listener);

    const loader = new THREE.AudioLoader();

    bgm = new THREE.Audio(listener);
    loader.load(
      "assets/audio/lobby_ambience.mp3",
      (buffer) => {
        bgm.setBuffer(buffer);
        bgm.setLoop(true);
        bgm.setVolume(0.35);
        audioReady = true;
        setStatus("Audio ready ✅ (Tap Start Audio)");
      },
      undefined,
      () => setStatus("Audio missing ❌ Put file at assets/audio/lobby_ambience.mp3")
    );

    // Optional: if you later add these, they’ll auto-work:
    // assets/audio/click.mp3
    // assets/audio/slot.mp3
    clickSfx = new THREE.Audio(listener);
    loader.load("assets/audio/click.mp3", (b) => { clickSfx.setBuffer(b); clickSfx.setVolume(0.5); clickReady = true; }, undefined, () => {});
    slotSfx  = new THREE.Audio(listener);
    loader.load("assets/audio/slot.mp3",  (b) => { slotSfx.setBuffer(b);  slotSfx.setVolume(0.55); slotReady = true; }, undefined, () => {});
  }

  function tryStartAudio(force) {
    if (!bgm || !audioReady) return;
    if (bgm.isPlaying) return;
    try {
      bgm.play();
      if (audioBtn) audioBtn.textContent = "Audio Playing ✅";
      setStatus("Audio playing ✅");
    } catch (e) {
      if (force) setStatus("Audio blocked ❌ tap again");
    }
  }

  function playClick() {
    if (clickReady && clickSfx) { try { clickSfx.stop(); clickSfx.play(); } catch(e){} }
  }
  function playSlot() {
    if (slotReady && slotSfx) { try { slotSfx.stop(); slotSfx.play(); } catch(e){} }
  }

  // =========================
  // GAME LOOP + HOVER HIGHLIGHT
  // =========================
  function animate() {
    renderer.setAnimationLoop(() => {
      // 2D camera orientation
      if (!renderer.xr.isPresenting) {
        camera.rotation.order = "YXZ";
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;
      }

      // Hover highlight:
      // - VR: from each controller
      // - Android: from center screen
      if (renderer.xr.isPresenting) {
        updateControllerRay(controller0, laser0, reticle0);
        updateControllerRay(controller1, laser1, reticle1);
      } else {
        updateCenterHover();
      }

      renderer.render(scene, camera);
    });
  }

  function updateCenterHover() {
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const hits = raycaster.intersectObjects(interactables, true);
    if (hits.length) setHovered(hits[0].object);
    else setHovered(null);
  }

  function updateControllerRay(ctrl, laser, reticle) {
    if (!ctrl || !laser) return;

    const origin = new THREE.Vector3().setFromMatrixPosition(ctrl.matrixWorld);
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(ctrl.quaternion).normalize();

    raycaster.set(origin, direction);

    // UI/prop hit
    const hits = raycaster.intersectObjects(interactables, true);
    if (hits.length) {
      const p = hits[0].point;
      laser.scale.z = Math.max(0.5, origin.distanceTo(p));

      if (reticle) {
        reticle.visible = true;
        reticle.position.set(p.x, p.y, p.z);
      }

      setHovered(hits[0].object);

      hideTeleport();
      return;
    } else {
      if (reticle) reticle.visible = false;
      setHovered(null);
    }

    // Teleport on floor
    const floorHit = raycaster.intersectObject(floorMesh, true);
    if (floorHit.length) {
      teleportPoint.copy(floorHit[0].point);
      teleportPoint.y = 0;

      showTeleport(origin, floorHit[0].point);
      laser.scale.z = Math.max(0.5, origin.distanceTo(floorHit[0].point));
      lastTeleportValid = true;
    } else {
      hideTeleport();
      lastTeleportValid = false;
      laser.scale.z = 8;
    }
  }

  function setHovered(obj) {
    if (hovered === obj) return;

    // unhover old
    if (hovered && hovered.material && hovered.userData && hovered.userData.hoverable) {
      hovered.material.emissiveIntensity = hovered.userData.baseEmissive ?? 0.12;
      hovered.scale.copy(hovered.userData._baseScale || hovered.scale);
    }

    hovered = (obj && obj.userData && obj.userData.hoverable) ? obj : null;

    // hover new
    if (hovered && hovered.material) {
      hovered.userData._baseScale = hovered.userData._baseScale || hovered.scale.clone();
      hovered.material.emissiveIntensity = (hovered.userData.baseEmissive ?? 0.12) + 0.35;
      hovered.scale.copy(hovered.userData._baseScale).multiplyScalar(1.03);
    }
  }

  function showTeleport(origin, hitPoint) {
    teleportMarker.visible = true;
    teleportMarker.position.set(teleportPoint.x, 0.02, teleportPoint.z);

    teleportLine.visible = true;
    teleportLine.geometry.setFromPoints([origin.clone(), hitPoint.clone()]);
  }

  function hideTeleport() {
    if (teleportMarker) teleportMarker.visible = false;
    if (teleportLine) teleportLine.visible = false;
  }

  function rayFromController(ctrl, objects) {
    const origin = new THREE.Vector3().setFromMatrixPosition(ctrl.matrixWorld);
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(ctrl.quaternion).normalize();
    raycaster.set(origin, direction);
    const hits = raycaster.intersectObjects(objects, true);
    return hits.length ? hits[0] : null;
  }

  // =========================
  // ECONOMY / INVENTORY
  // =========================
  function addChips(amount) {
    save.chips += amount;
    saveSave();
    updateHUD();
  }

  function buyItem(name, cost) {
    const ownedSet = new Set(save.owned || []);
    if (ownedSet.has(name)) { setStatus(`${name} already owned ✅`); return; }
    if (save.chips < cost) { setStatus(`Not enough chips ❌ Need ${cost.toLocaleString()}`); return; }
    save.chips -= cost;
    ownedSet.add(name);
    save.owned = Array.from(ownedSet);
    saveSave();
    updateHUD();
    setStatus(`Purchased ${name} ✅`);
  }

  function updateHUD() {
    if (chipsEl) chipsEl.textContent = "Chips: " + (save.chips || 0).toLocaleString();
    if (potEl) potEl.textContent = "Pot: " + (save.pot || 0).toLocaleString() + (betAmount ? `  (bet queued: ${betAmount})` : "");
    if (ownedEl) ownedEl.textContent = "Owned: " + ((save.owned && save.owned.length) ? save.owned.join(", ") : "(none)");
    if (seatEl) seatEl.textContent = "Seat: " + ((seatIndex >= 0) ? `Seat ${seatIndex + 1}` : "(not seated)");
  }

  function resetSave() {
    save = JSON.parse(JSON.stringify(defaultSave));
    storePage = 0;
    betAmount = 0;
    seatIndex = -1;
    saveSave();
    updateHUD();
    setStatus("Save reset ✅");
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaultSave));
      const obj = JSON.parse(raw);
      return Object.assign({}, JSON.parse(JSON.stringify(defaultSave)), obj);
    } catch {
      return JSON.parse(JSON.stringify(defaultSave));
    }
  }

  function saveSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {}
  }

  // Simple haptics (Quest) if available
  function hapticPulse() {
    // Only works inside XR session; best effort.
    try {
      const s = renderer.xr.getSession && renderer.xr.getSession();
      if (!s) return;
      const sources = s.inputSources || [];
      for (const src of sources) {
        const gp = src.gamepad;
        if (gp && gp.hapticActuators && gp.hapticActuators.length) {
          gp.hapticActuators[0].pulse(0.6, 60);
        }
      }
    } catch {}
  }

  // =========================
  // UTIL
  // =========================
  function pulse(mesh) {
    if (!mesh) return;
    const s0 = mesh.scale.clone();
    mesh.scale.multiplyScalar(1.06);
    setTimeout(() => mesh.scale.copy(s0), 90);
  }

  function addBox(w, h, d, x, y, z, mat, receiveShadow) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = !!receiveShadow;
    scene.add(m);
    return m;
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function touchDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
})();
