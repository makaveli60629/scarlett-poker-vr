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

  const touchUI     = document.getElementById("touchUI");
  const joyBase     = document.getElementById("joyBase");
  const joyStick    = document.getElementById("joyStick");
  const interactBtn = document.getElementById("interactBtn");
  const teleportBtn = document.getElementById("teleportBtn");

  const setStatus = (m) => { if (statusEl) statusEl.textContent = m; };

  // ---- Save ----
  const SAVE_KEY = "scarlett_vr_save_v2";
  const defaultSave = {
    chips: 10000,
    pot: 0,
    owned: [],          // item ids
    equipped: { head:null, eyes:null, neck:null, top:null },
    seatIndex: -1
  };
  let save = loadSave();

  // ---- Three state ----
  let scene, camera, renderer, raycaster;
  let floorMesh;
  let teleportMarker, teleportLine;
  let lastTeleportValid = false;
  const teleportPoint = new THREE.Vector3();

  // ---- Android look/move ----
  let yaw = 0, pitch = 0;
  let lookActive = false;
  let lastLookX = 0, lastLookY = 0;

  // joystick state
  let joyActive = false;
  let joyCenter = { x: 0, y: 0 };
  let joyVec = { x: 0, y: 0 }; // -1..1
  const moveSpeed = 2.2; // units/sec

  // teleport mode for android
  let androidTeleportMode = false;

  // ---- Audio ----
  let listener, bgm, audioReady = false;

  // ---- Controllers + Laser UI ----
  let controller0 = null, controller1 = null;
  let laser0 = null, laser1 = null;
  let reticle0 = null, reticle1 = null;

  // ---- Interactables & hover highlight ----
  const interactables = [];
  let hovered = null;

  // ---- Casino props ----
  let neonPulseT = 0;

  // ---- Poker ----
  const seats = [];
  let seatIndex = save.seatIndex ?? -1;

  // ---- Avatar mannequin & cosmetics meshes ----
  let mannequin = null;
  const cosmeticMeshes = { head:{}, eyes:{}, neck:{}, top:{} };

  // ---- Store ----
  let storePage = 0;
  let storePanel = null;
  let betAmount = 0;

  // 40-item catalog (slots: head/eyes/neck/top + misc)
  const CATALOG = buildCatalog40();

  // ---- Boot ----
  try {
    boot();
    animate();
    setStatus("Loaded ✅ Android + Quest unified (Avatar + Store + Casino)");
    updateHUD();
    setupVRButton();
    setupAndroidUI();
    setupAudio();

    if (resetBtn) resetBtn.addEventListener("click", () => resetSave());
    if (audioBtn) audioBtn.addEventListener("click", () => tryStartAudio(true));
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
    buildStoreKiosk();
    buildMannequinAndMirror();
    buildTeleportHelpers();

    // Apply saved equipment visuals
    applyEquippedVisuals();

    // If seat saved, snap
    if (seatIndex >= 0 && seatIndex < seats.length) snapToSeat(seatIndex);

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

    addBox(roomW, roomH, 0.4, 0, roomH/2, -roomD/2, wallMat, true);
    addBox(0.4, roomH, roomD, -roomW/2, roomH/2, 0, wallMat, true);
    addBox(0.4, roomH, roomD, roomW/2, roomH/2, 0, wallMat, true);

    const doorW = 6.0, doorH = 3.4;
    const sideW = (roomW - doorW) / 2;
    const topH  = roomH - doorH;

    addBox(sideW, roomH, 0.4, -(doorW/2 + sideW/2), roomH/2, roomD/2, wallMat, true);
    addBox(sideW, roomH, 0.4,  (doorW/2 + sideW/2), roomH/2, roomD/2, wallMat, true);
    addBox(doorW, topH, 0.4, 0, doorH + topH/2, roomD/2, wallMat, true);

    addBox(roomW, 0.4, roomD, 0, roomH, 0, trimMat, true);

    const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(roomW - 0.2, 0.25, roomD - 0.2), trimMat);
    baseTrim.position.set(0, 0.12, 0);
    baseTrim.receiveShadow = true;
    scene.add(baseTrim);
  }

  function buildFloorCarpet() {
    floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(110, 110),
      new THREE.MeshStandardMaterial({ color: 0x232329, roughness: 1.0 })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const carpetTex = makeCarpetTexture();
    carpetTex.wrapS = carpetTex.wrapT = THREE.RepeatWrapping;
    carpetTex.repeat.set(3, 3);

    const carpetMat = new THREE.MeshStandardMaterial({ map: carpetTex, color: 0xffffff, roughness: 1.0 });
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

    ctx.fillStyle = "#16161b";
    ctx.fillRect(0, 0, 512, 512);

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
    // Pulsing neon (we'll animate emissiveIntensity)
    const neonMat = new THREE.MeshStandardMaterial({
      color: 0x111114,
      emissive: 0x7a2cff,
      emissiveIntensity: 1.2,
      roughness: 0.45
    });

    const y = 3.1;
    const strips = [
      { w: 23.2, h: 0.12, d: 0.12, x: 0,    z: -11.8 },
      { w: 23.2, h: 0.12, d: 0.12, x: 0,    z:  11.8 },
      { w: 0.12, h: 0.12, d: 23.2, x: -11.8, z: 0 },
      { w: 0.12, h: 0.12, d: 23.2, x:  11.8, z: 0 }
    ];
    strips.forEach(s => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.d), neonMat);
      m.position.set(s.x, y, s.z);
      m.userData.neon = true;
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
    const group = new THREE.Group();
    group.position.set(7.5, 0, -6.0);

    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x2b2b33, roughness: 0.95 });
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x3b3b48, roughness: 0.98 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 1.2), sofaMat);
    base.position.set(0, 0.25, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const back = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 0.25), sofaMat);
    back.position.set(0, 0.95, -0.48);
    back.castShadow = true;
    group.add(back);

    for (let i = -1; i <= 1; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.9), cushionMat);
      c.position.set(i * 1.05, 0.58, 0.1);
      c.castShadow = true;
      group.add(c);
    }

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
    const tableGroup = new THREE.Group();

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

      const seatPos = new THREE.Vector3(Math.sin(a) * (radius - 1.3), 0, Math.cos(a) * (radius - 1.3));
      const hotspot = new THREE.Mesh(
        new THREE.CircleGeometry(0.45, 24),
        new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
      );
      hotspot.rotation.x = -Math.PI / 2;
      hotspot.position.set(seatPos.x, 0.02, seatPos.z);
      hotspot.userData.onInteract = () => {
        snapToSeat(i);
        setStatus(`Seated ✅ Seat ${i + 1}`);
      };
      hotspot.userData.hoverable = true;
      hotspot.userData.baseEmissive = 0.12;

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

  // =========================
  // STORE KIOSK (Buy/Equip)
  // =========================
  function buildStoreKiosk() {
    storePanel = new THREE.Group();
    storePanel.position.set(-8.8, 0, -4.6);
    storePanel.rotation.y = Math.PI * 0.15;

    // kiosk booth frame
    const booth = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 2.2, 1.3),
      new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.7, metalness: 0.05, emissive: 0x140020, emissiveIntensity: 0.25 })
    );
    booth.position.set(0, 1.1, -0.35);
    booth.castShadow = true;
    booth.receiveShadow = true;
    storePanel.add(booth);

    const headerTex = makePanelTexture("TEAM NOVA STORE", "Buy or Equip Items", "Pages • Prices • Slots");
    const header = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 1.55),
      new THREE.MeshStandardMaterial({ map: headerTex, emissive: 0xffffff, emissiveIntensity: 0.35, transparent: true })
    );
    header.position.set(0, 1.35, 0.35);
    storePanel.add(header);

    // 4 item buttons
    const ys = [0.95, 0.70, 0.45, 0.20];
    for (let i = 0; i < 4; i++) {
      const btn = makeUIButton(0, ys[i], `ITEM${i+1}`, () => onStoreSelect(i));
      btn.position.z = 0.36;
      btn.userData.storeIdx = i;
      storePanel.add(btn);
      interactables.push(btn);
    }

    // nav
    const prev = makeUIButton(-0.72, -0.05, "PREV", () => { storePage = (storePage + getStorePageCount() - 1) % getStorePageCount(); refreshStore(); });
    const next = makeUIButton(0.72, -0.05, "NEXT", () => { storePage = (storePage + 1) % getStorePageCount(); refreshStore(); });
    prev.position.z = 0.36; next.position.z = 0.36;
    storePanel.add(prev); storePanel.add(next);
    interactables.push(prev, next);

    // page label
    const pageLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.18),
      new THREE.MeshStandardMaterial({ map: makeSmallLabelTexture(`PAGE ${storePage + 1}/${getStorePageCount()}`), emissive: 0xffffff, emissiveIntensity: 0.25, transparent: true })
    );
    pageLabel.position.set(0, -0.05, 0.36);
    storePanel.add(pageLabel);
    storePanel.userData.pageLabel = pageLabel;

    scene.add(storePanel);
    refreshStore();
  }

  function getStorePageCount() {
    // 4 items per page
    return Math.max(1, Math.ceil(CATALOG.length / 4));
  }

  function getPageItems(page) {
    const start = page * 4;
    return CATALOG.slice(start, start + 4);
  }

  function refreshStore() {
    const items = getPageItems(storePage);

    // Update the 4 item buttons
    storePanel.children.forEach(o => {
      if (o.userData && typeof o.userData.storeIdx === "number") {
        const idx = o.userData.storeIdx;
        const it = items[idx];
        if (!it) {
          o.material.map = makeButtonTexture("—");
          o.material.needsUpdate = true;
          o.userData.itemId = null;
          return;
        }
        const owned = isOwned(it.id);
        const eq = isEquipped(it);
        const action = owned ? (eq ? "EQUIPPED" : "EQUIP") : "BUY";
        const priceTxt = owned ? "" : `-${it.price}`;
        const label = `${it.name}  ${action} ${priceTxt}`.trim();
        o.material.map = makeButtonTexture(label);
        o.material.needsUpdate = true;
        o.userData.itemId = it.id;
      }
    });

    // Update page label texture
    if (storePanel.userData.pageLabel) {
      storePanel.userData.pageLabel.material.map = makeSmallLabelTexture(`PAGE ${storePage + 1}/${getStorePageCount()}`);
      storePanel.userData.pageLabel.material.needsUpdate = true;
    }

    setStatus(`Store page ${storePage + 1} ✅`);
    updateHUD();
  }

  function onStoreSelect(buttonIdx) {
    const items = getPageItems(storePage);
    const it = items[buttonIdx];
    if (!it) return;

    if (!isOwned(it.id)) {
      if (save.chips < it.price) { setStatus(`Not enough chips ❌ Need ${it.price}`); return; }
      save.chips -= it.price;
      save.owned.push(it.id);
      saveSave();
      setStatus(`Purchased ${it.name} ✅`);
    }

    // Equip
    if (it.slot) {
      save.equipped[it.slot] = it.id;
      saveSave();
      applyEquippedVisuals();
      setStatus(`Equipped ${it.name} ✅`);
    } else {
      // misc item just exists in inventory
      setStatus(`Owned ${it.name} ✅`);
    }

    refreshStore();
  }

  // =========================
  // MANNEQUIN + MIRROR
  // =========================
  function buildMannequinAndMirror() {
    // Area near store to preview cosmetics
    const baseX = -5.8, baseZ = -6.0;

    // mirror panel
    const mirror = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 2.6),
      new THREE.MeshStandardMaterial({
        color: 0x0b0b10,
        roughness: 0.25,
        metalness: 0.85,
        emissive: 0x140020,
        emissiveIntensity: 0.25
      })
    );
    mirror.position.set(baseX - 1.2, 1.4, baseZ);
    mirror.rotation.y = Math.PI / 2;
    scene.add(mirror);

    // mannequin body
    mannequin = new THREE.Group();
    mannequin.position.set(baseX, 0, baseZ);
    mannequin.rotation.y = Math.PI * 0.15;

    const skinMat = new THREE.MeshStandardMaterial({ color: 0x7a7a7f, roughness: 0.9 });
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x2b2b33, roughness: 0.9 });

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 24), skinMat);
    head.position.set(0, 1.55, 0);
    head.castShadow = true;
    mannequin.add(head);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.10, 16), skinMat);
    neck.position.set(0, 1.40, 0);
    neck.castShadow = true;
    mannequin.add(neck);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.48, 6, 16), torsoMat);
    torso.position.set(0, 1.05, 0);
    torso.castShadow = true;
    mannequin.add(torso);

    const hip = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.18, 16), torsoMat);
    hip.position.set(0, 0.70, 0);
    hip.castShadow = true;
    mannequin.add(hip);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.55, 0.14, 24),
      new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.85 })
    );
    pedestal.position.set(0, 0.07, 0);
    pedestal.receiveShadow = true;
    mannequin.add(pedestal);

    // Cosmetic anchors (empty groups)
    const headAnchor = new THREE.Group(); headAnchor.position.set(0, 1.62, 0);
    const eyesAnchor = new THREE.Group(); eyesAnchor.position.set(0, 1.55, 0.14);
    const neckAnchor = new THREE.Group(); neckAnchor.position.set(0, 1.36, 0.12);
    const topAnchor  = new THREE.Group(); topAnchor.position.set(0, 1.05, 0);

    mannequin.add(headAnchor); mannequin.add(eyesAnchor); mannequin.add(neckAnchor); mannequin.add(topAnchor);
    mannequin.userData.anchors = { head: headAnchor, eyes: eyesAnchor, neck: neckAnchor, top: topAnchor };

    scene.add(mannequin);

    // Build all cosmetic meshes (hidden by default)
    buildCosmeticMeshes();

    // Interactable "Rotate mannequin" pad
    const rotPad = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 28),
      new THREE.MeshBasicMaterial({ color: 0x7a2cff, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
    );
    rotPad.rotation.x = -Math.PI / 2;
    rotPad.position.set(baseX, 0.02, baseZ + 1.1);
    rotPad.userData.onInteract = () => {
      mannequin.rotation.y += 0.35;
      setStatus("Mannequin rotated ✅");
    };
    rotPad.userData.hoverable = true;
    rotPad.userData.baseEmissive = 0.12;
    scene.add(rotPad);
    interactables.push(rotPad);

    // A label sign for the preview area
    const labelTex = makeSignTexture("AVATAR", "PREVIEW", "Buy • Equip • See it");
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.7),
      new THREE.MeshStandardMaterial({ map: labelTex, emissive: 0xffffff, emissiveIntensity: 0.4 })
    );
    label.position.set(baseX - 0.2, 2.25, baseZ);
    label.rotation.y = Math.PI * 0.15;
    scene.add(label);
  }

  function buildCosmeticMeshes() {
    // Materials
    const black = new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.6, metalness: 0.1 });
    const gold  = new THREE.MeshStandardMaterial({ color: 0xd6b15f, roughness: 0.35, metalness: 0.75, emissive: 0x221500, emissiveIntensity: 0.12 });
    const neon  = new THREE.MeshStandardMaterial({ color: 0x7a2cff, roughness: 0.45, metalness: 0.1, emissive: 0x7a2cff, emissiveIntensity: 0.35 });
    const cloth = new THREE.MeshStandardMaterial({ color: 0x2b2b33, roughness: 0.95 });
    const teeMat= new THREE.MeshStandardMaterial({ map: makeTeeTexture("TEAM NOVA"), color: 0xffffff, roughness: 0.95 });

    // Head: Cap
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.12, 20), black);
    cap.position.set(0, 0.02, 0);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.12), black);
    brim.position.set(0, -0.04, 0.18);
    const capG = new THREE.Group(); capG.add(cap); capG.add(brim);
    capG.visible = false;
    mannequin.userData.anchors.head.add(capG);
    cosmeticMeshes.head["head_cap"] = capG;

    // Head: Crown
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.04, 10, 24), gold);
    crown.rotation.x = Math.PI / 2;
    crown.position.set(0, 0.02, 0);
    crown.visible = false;
    mannequin.userData.anchors.head.add(crown);
    cosmeticMeshes.head["head_crown"] = crown;

    // Eyes: Shades
    const shades = new THREE.Group();
    const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.02), black);
    const lensR = lensL.clone();
    lensL.position.set(-0.08, 0, 0);
    lensR.position.set( 0.08, 0, 0);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.02), black);
    bridge.position.set(0, 0, 0);
    shades.add(lensL, lensR, bridge);
    shades.visible = false;
    mannequin.userData.anchors.eyes.add(shades);
    cosmeticMeshes.eyes["eyes_shades"] = shades;

    // Neck: Chain
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.01, 10, 24), gold);
    chain.rotation.x = Math.PI / 2;
    chain.visible = false;
    mannequin.userData.anchors.neck.add(chain);
    cosmeticMeshes.neck["neck_chain"] = chain;

    // Top: Hoodie (overlay)
    const hoodie = new THREE.Mesh(new THREE.CapsuleGeometry(0.245, 0.50, 6, 16), cloth);
    hoodie.position.set(0, 0, 0);
    hoodie.visible = false;
    mannequin.userData.anchors.top.add(hoodie);
    cosmeticMeshes.top["top_hoodie"] = hoodie;

    // Top: Tee (overlay)
    const tee = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.48, 6, 16), teeMat);
    tee.position.set(0, 0, 0);
    tee.visible = false;
    mannequin.userData.anchors.top.add(tee);
    cosmeticMeshes.top["top_tee"] = tee;

    // Neon scarf as neck cosmetic
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 10, 24), neon);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.set(0, 0.02, 0);
    scarf.visible = false;
    mannequin.userData.anchors.neck.add(scarf);
    cosmeticMeshes.neck["neck_scarf"] = scarf;
  }

  function makeTeeTexture(text) {
    // Procedural t-shirt texture: no files needed
    const c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#101016";
    ctx.fillRect(0,0,512,512);

    // stripes
    ctx.fillStyle = "rgba(122,44,255,0.18)";
    for (let i=0;i<8;i++){
      ctx.fillRect(0, i*64 + 10, 512, 10);
    }

    // logo block
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(90, 170, 332, 170);

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 6;
    ctx.strokeRect(96, 176, 320, 158);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 54px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 250);

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "28px Arial";
    ctx.fillText("Scarlett Poker VR", 256, 300);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    tex.anisotropy = 4;
    return tex;
  }

  function applyEquippedVisuals() {
    if (!mannequin || !mannequin.userData.anchors) return;

    // hide all
    Object.values(cosmeticMeshes.head).forEach(m => m.visible = false);
    Object.values(cosmeticMeshes.eyes).forEach(m => m.visible = false);
    Object.values(cosmeticMeshes.neck).forEach(m => m.visible = false);
    Object.values(cosmeticMeshes.top).forEach(m => m.visible = false);

    // show equipped by mapping item -> mesh id
    const eq = save.equipped || {};
    const map = {
      head_cap:    "head_cap",
      head_crown:  "head_crown",
      eyes_shades: "eyes_shades",
      neck_chain:  "neck_chain",
      neck_scarf:  "neck_scarf",
      top_hoodie:  "top_hoodie",
      top_tee:     "top_tee"
    };

    if (eq.head && map[eq.head] && cosmeticMeshes.head[map[eq.head]]) cosmeticMeshes.head[map[eq.head]].visible = true;
    if (eq.eyes && map[eq.eyes] && cosmeticMeshes.eyes[map[eq.eyes]]) cosmeticMeshes.eyes[map[eq.eyes]].visible = true;
    if (eq.neck && map[eq.neck] && cosmeticMeshes.neck[map[eq.neck]]) cosmeticMeshes.neck[map[eq.neck]].visible = true;
    if (eq.top  && map[eq.top]  && cosmeticMeshes.top[map[eq.top]])   cosmeticMeshes.top[map[eq.top]].visible  = true;
  }

  // =========================
  // TELEPORT HELPERS
  // =========================
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
            // re-enable touch UI after VR ends
            setTouchUIVisible(true);
          });

          // In VR, hide touch UI overlay
          setTouchUIVisible(false);

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
    if (lastTeleportValid) {
      camera.position.set(teleportPoint.x, camera.position.y, teleportPoint.z);
      setStatus("Teleported ✅");
    }
  }

  // =========================
  // ANDROID TOUCH UI (Joystick + Look + Interact + Teleport)
  // =========================
  function setupAndroidUI() {
    // Touch UI is for non-VR mode only
    setTouchUIVisible(true);

    // Look: drag anywhere not on joystick/buttons
    renderer.domElement.addEventListener("touchstart", (ev) => {
      if (renderer.xr.isPresenting) return;
      if (!ev.touches || ev.touches.length !== 1) return;

      // ignore if touching joystick area or button column
      const t = ev.touches[0];
      if (isInsideElement(t.clientX, t.clientY, joyBase) || isInsideElement(t.clientX, t.clientY, interactBtn) || isInsideElement(t.clientX, t.clientY, teleportBtn)) {
        return;
      }

      lookActive = true;
      lastLookX = t.clientX;
      lastLookY = t.clientY;
    }, { passive: true });

    renderer.domElement.addEventListener("touchmove", (ev) => {
      if (renderer.xr.isPresenting) return;
      if (!lookActive) return;
      if (!ev.touches || ev.touches.length !== 1) return;

      const t = ev.touches[0];
      const dx = t.clientX - lastLookX;
      const dy = t.clientY - lastLookY;
      lastLookX = t.clientX;
      lastLookY = t.clientY;

      yaw   -= dx * 0.005;
      pitch -= dy * 0.005;
      pitch = Math.max(-1.15, Math.min(1.15, pitch));
    }, { passive: true });

    renderer.domElement.addEventListener("touchend", () => {
      lookActive = false;
    }, { passive: true });

    // Joystick
    if (joyBase) {
      joyBase.addEventListener("touchstart", (ev) => {
        if (renderer.xr.isPresenting) return;
        joyActive = true;
        androidTeleportMode = false; // moving cancels teleport mode

        const r = joyBase.getBoundingClientRect();
        joyCenter.x = r.left + r.width / 2;
        joyCenter.y = r.top + r.height / 2;

        setJoyFromTouch(ev.touches[0]);
      }, { passive: true });

      joyBase.addEventListener("touchmove", (ev) => {
        if (renderer.xr.isPresenting) return;
        if (!joyActive) return;
        setJoyFromTouch(ev.touches[0]);
      }, { passive: true });

      joyBase.addEventListener("touchend", () => {
        joyActive = false;
        joyVec.x = 0; joyVec.y = 0;
        resetJoystickVisual();
      }, { passive: true });
    }

    // Interact button
    if (interactBtn) {
      interactBtn.addEventListener("touchstart", (ev) => {
        if (renderer.xr.isPresenting) return;
        ev.preventDefault?.();
        androidTeleportMode = false;
        doCenterInteract();
      }, { passive: false });
    }

    // Teleport button toggles teleport mode
    if (teleportBtn) {
      teleportBtn.addEventListener("touchstart", (ev) => {
        if (renderer.xr.isPresenting) return;
        ev.preventDefault?.();
        androidTeleportMode = !androidTeleportMode;
        setStatus(androidTeleportMode ? "Teleport mode ✅ Tap screen to place" : "Teleport mode off");
      }, { passive: false });
    }

    // Tap screen to place teleport (when teleport mode on)
    renderer.domElement.addEventListener("click", () => {
      if (renderer.xr.isPresenting) return;
      if (!androidTeleportMode) return;

      // ray to floor
      raycaster.setFromCamera({ x: 0, y: 0 }, camera);
      const hit = raycaster.intersectObject(floorMesh, true);
      if (hit && hit.length) {
        teleportPoint.copy(hit[0].point);
        teleportPoint.y = 0;
        camera.position.set(teleportPoint.x, camera.position.y, teleportPoint.z);
        setStatus("Teleported ✅");
      }
    }, { passive: true });

    // Hide touchUI if desktop (optional) — keep it for you anyway since you’re Android
  }

  function setTouchUIVisible(on) {
    if (!touchUI) return;
    // if VR is presenting, always hide
    if (renderer && renderer.xr && renderer.xr.isPresenting) {
      touchUI.style.display = "none";
      return;
    }
    touchUI.style.display = on ? "block" : "none";
  }

  function setJoyFromTouch(t) {
    const max = 55; // joystick max radius
    const dx = t.clientX - joyCenter.x;
    const dy = t.clientY - joyCenter.y;
    const len = Math.sqrt(dx*dx + dy*dy);
    const nx = (len > 0) ? dx / len : 0;
    const ny = (len > 0) ? dy / len : 0;
    const clamped = Math.min(max, len);

    const px = nx * clamped;
    const py = ny * clamped;

    joyVec.x = px / max;
    joyVec.y = py / max;

    // move knob
    if (joyStick) {
      joyStick.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
    }
  }

  function resetJoystickVisual() {
    if (joyStick) joyStick.style.transform = "translate(-50%,-50%)";
  }

  function doCenterInteract() {
    tryStartAudio();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const hits = raycaster.intersectObjects(interactables, true);
    if (hits.length) {
      const obj = hits[0].object;
      if (obj.userData && typeof obj.userData.onInteract === "function") obj.userData.onInteract();
    }
  }

  function isInsideElement(x, y, el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
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

  // =========================
  // GAME LOOP (movement + hover + neon pulse)
  // =========================
  let lastTime = performance.now();
  function animate() {
    renderer.setAnimationLoop(() => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      // Non-VR: apply yaw/pitch + joystick movement
      if (!renderer.xr.isPresenting) {
        camera.rotation.order = "YXZ";
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;

        // move in camera-yaw direction
        if (Math.abs(joyVec.x) > 0.02 || Math.abs(joyVec.y) > 0.02) {
          const forward = -joyVec.y * moveSpeed * dt;
          const strafe  =  joyVec.x * moveSpeed * dt;

          const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
          const right = new THREE.Vector3(Math.sin(yaw + Math.PI/2), 0, Math.cos(yaw + Math.PI/2));

          camera.position.addScaledVector(dir, forward);
          camera.position.addScaledVector(right, strafe);
        }

        // Center hover highlight for Android
        updateCenterHover();
        setTouchUIVisible(true);
      } else {
        // VR: update controller rays and hide touch UI
        updateControllerRay(controller0, laser0, reticle0);
        updateControllerRay(controller1, laser1, reticle1);
        setTouchUIVisible(false);
      }

      // Neon pulse
      neonPulseT += dt;
      const pulse = 1.0 + Math.sin(neonPulseT * 1.5) * 0.25;
      scene.traverse((o) => {
        if (o.userData && o.userData.neon && o.material && o.material.emissiveIntensity != null) {
          o.material.emissiveIntensity = 1.1 * pulse;
        }
      });

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

    if (hovered && hovered.material && hovered.userData && hovered.userData.hoverable) {
      hovered.material.emissiveIntensity = hovered.userData.baseEmissive ?? 0.12;
      if (hovered.userData._baseScale) hovered.scale.copy(hovered.userData._baseScale);
    }

    hovered = (obj && obj.userData && obj.userData.hoverable) ? obj : null;

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
  // SEATS
  // =========================
  function snapToSeat(i) {
    seatIndex = i;
    save.seatIndex = i;
    saveSave();

    const p = seats[i].pos.clone();
    camera.position.set(p.x, camera.position.y, p.z);

    const look = new THREE.Vector3(0, 1.4, 0);
    camera.lookAt(look);

    const dir = new THREE.Vector3().subVectors(look, camera.position).normalize();
    yaw = Math.atan2(dir.x, dir.z);
    pitch = 0;

    updateHUD();
  }

  // =========================
  // STORE TEXTURES
  // =========================
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
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, c.width / 2, c.height / 2);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function makeSmallLabelTexture(text) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 96;
    const ctx = c.getContext("2d");

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

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function makeUIButton(x, y, label, onInteract) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.15, 0.20),
      new THREE.MeshStandardMaterial({ map: makeButtonTexture(label), emissive: 0xffffff, emissiveIntensity: 0.12, transparent: true })
    );
    mesh.position.set(x, y, 0.02);
    mesh.userData.onInteract = () => { pulse(mesh); onInteract && onInteract(); };
    mesh.userData.hoverable = true;
    mesh.userData.baseEmissive = 0.12;
    return mesh;
  }

  // =========================
  // CATALOG + OWN/EQUIP HELPERS
  // =========================
  function buildCatalog40() {
    // Prices in chips
    const items = [
      // head (10)
      { id:"head_cap", name:"Nova Cap", slot:"head", price:1000 },
      { id:"head_crown", name:"Nova Crown", slot:"head", price:3500 },
      { id:"head_beanie", name:"Beanie", slot:"head", price:1200 },
      { id:"head_bucket", name:"Bucket Hat", slot:"head", price:1400 },
      { id:"head_fedora", name:"Fedora", slot:"head", price:1800 },
      { id:"head_cowboy", name:"Cowboy Hat", slot:"head", price:1800 },
      { id:"head_headphones", name:"Headphones", slot:"head", price:2200 },
      { id:"head_halo", name:"Halo", slot:"head", price:5000 },
      { id:"head_visor", name:"Cyber Visor", slot:"head", price:2600 },
      { id:"head_flatbrim", name:"Flat Brim", slot:"head", price:1500 },

      // eyes (8)
      { id:"eyes_shades", name:"Shades", slot:"eyes", price:1500 },
      { id:"eyes_aviators", name:"Aviators", slot:"eyes", price:1700 },
      { id:"eyes_neon", name:"Neon Glasses", slot:"eyes", price:2200 },
      { id:"eyes_goggles", name:"Goggles", slot:"eyes", price:2300 },
      { id:"eyes_monocle", name:"Monocle", slot:"eyes", price:2600 },
      { id:"eyes_heart", name:"Heart Glasses", slot:"eyes", price:2000 },
      { id:"eyes_reader", name:"Readers", slot:"eyes", price:900 },
      { id:"eyes_cyber", name:"Cyber Shades", slot:"eyes", price:2800 },

      // neck (8)
      { id:"neck_chain", name:"Gold Chain", slot:"neck", price:2500 },
      { id:"neck_silver", name:"Silver Chain", slot:"neck", price:2200 },
      { id:"neck_pendant", name:"Nova Pendant", slot:"neck", price:3200 },
      { id:"neck_cross", name:"Cross Pendant", slot:"neck", price:2600 },
      { id:"neck_dogtags", name:"Dog Tags", slot:"neck", price:1800 },
      { id:"neck_beads", name:"Beads", slot:"neck", price:1400 },
      { id:"neck_diamond", name:"Diamond Chain", slot:"neck", price:6000 },
      { id:"neck_scarf", name:"Neon Scarf", slot:"neck", price:2000 },

      // top (10)
      { id:"top_tee", name:"Team Nova Tee", slot:"top", price:1200 },
      { id:"top_scarlett", name:"Scarlett Tee", slot:"top", price:1300 },
      { id:"top_hoodie", name:"Hoodie Black", slot:"top", price:2500 },
      { id:"top_hoodie_neon", name:"Hoodie Neon", slot:"top", price:3200 },
      { id:"top_leather", name:"Leather Jacket", slot:"top", price:4200 },
      { id:"top_bomber", name:"Bomber Jacket", slot:"top", price:3800 },
      { id:"top_vest", name:"Vest", slot:"top", price:2200 },
      { id:"top_suit", name:"Suit Top", slot:"top", price:4800 },
      { id:"top_longsleeve", name:"Long Sleeve", slot:"top", price:1600 },
      { id:"top_tank", name:"Tank Top", slot:"top", price:900 },

      // misc/effects (4)
      { id:"misc_eventchip", name:"Event Chip (Founders)", slot:null, price:5000 },
      { id:"misc_vipbadge", name:"VIP Badge", slot:null, price:7500 },
      { id:"misc_adminband", name:"Wristband (Admin)", slot:null, price:9000 },
      { id:"misc_confetti", name:"Confetti Aura", slot:null, price:12000 },
    ];

    // Total should be 40
    return items.slice(0, 40);
  }

  function isOwned(id) {
    return (save.owned || []).includes(id);
  }

  function isEquipped(item) {
    if (!item.slot) return false;
    return save.equipped && save.equipped[item.slot] === item.id;
  }

  // =========================
  // SAVE / HUD
  // =========================
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
    applyEquippedVisuals();
    updateHUD();
    setStatus("Save reset ✅");
    // refresh store label if exists
    if (storePanel) refreshStore();
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
    updateHUD();
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

})();
