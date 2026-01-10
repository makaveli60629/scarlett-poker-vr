// /js/store.js — Scarlett VR Poker StoreSystem v1.2 (Carousel + Gaze Info + Glass/Mirror)
// v1.2 FIXES:
// ✅ init() accepts BOTH: init(ctx) OR init({THREE, scene, world, player, camera, log})
// ✅ setActive(on) added so RoomManager/world can toggle store visibility
// ✅ Store placed on LEFT of lobby focus (as requested)
// ✅ Pointerdown fallback triggers onAction if you're looking at a pad/item

import { StoreCatalog } from "./store_catalog.js";

export const StoreSystem = (() => {
  let THREE = null;
  let scene = null;
  let log = console.log;
  let world = null;

  let player = null;
  let camera = null;

  const state = {
    root: null,
    kiosk: null,
    pads: [],
    uiBillboard: null,
    itemBillboard: null,
    carousel: null,
    mirrorWall: null,

    active: true,
    t: 0,
    lastFocusPad: null,
    lastFocusItem: null,

    wallet: { chips: 100000 },
    owned: new Set(),

    raycaster: null,
    tmpV: null,
    tmpV2: null,

    _boundAction: false,
    _boundPointer: false,
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const L = (...a) => { try { log(...a); } catch { console.log(...a); } };

  function safeColorSpace(tex) {
    try { tex.colorSpace = THREE.SRGBColorSpace; } catch {}
  }

  function makeNeonMat(hex, emissiveHex, intensity = 1.2, opacity = 0.95) {
    return new THREE.MeshStandardMaterial({
      color: hex,
      emissive: emissiveHex,
      emissiveIntensity: intensity,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity
    });
  }

  function makeGlassMat(opacity = 0.18) {
    return new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.05,
      metalness: 0.0,
      transmission: 1.0,
      thickness: 0.08,
      transparent: true,
      opacity,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08
    });
  }

  function makeMirrorGlassMat() {
    return new THREE.MeshStandardMaterial({
      color: 0x0b0d14,
      roughness: 0.05,
      metalness: 0.95,
      emissive: 0x000000,
      transparent: true,
      opacity: 0.22
    });
  }

  function makeSignCanvas(textTop, textBottom, accent = "#7fe7ff") {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const ctx2d = c.getContext("2d");

    ctx2d.clearRect(0, 0, c.width, c.height);

    ctx2d.fillStyle = "rgba(5,6,10,0.72)";
    roundRect(ctx2d, 40, 70, 944, 372, 36, true);

    ctx2d.font = "bold 72px Arial";
    ctx2d.textAlign = "center";
    ctx2d.textBaseline = "middle";
    ctx2d.fillStyle = accent;
    ctx2d.fillText(textTop, 512, 210);

    ctx2d.font = "bold 54px Arial";
    ctx2d.fillStyle = "#ffffff";
    ctx2d.fillText(textBottom, 512, 310);

    ctx2d.strokeStyle = "rgba(127,231,255,0.38)";
    ctx2d.lineWidth = 8;
    roundRect(ctx2d, 40, 70, 944, 372, 36, false);

    function roundRect(ctx3, x, y, w, h, r, fill) {
      ctx3.beginPath();
      ctx3.moveTo(x + r, y);
      ctx3.arcTo(x + w, y, x + w, y + h, r);
      ctx3.arcTo(x + w, y + h, x, y + h, r);
      ctx3.arcTo(x, y + h, x, y, r);
      ctx3.arcTo(x, y, x + w, y, r);
      ctx3.closePath();
      if (fill) ctx3.fill(); else ctx3.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    safeColorSpace(tex);
    return tex;
  }

  function makeBillboard(w, h, top, bottom, accent = "#7fe7ff") {
    const tex = makeSignCanvas(top, bottom, accent);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: true });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.renderOrder = 30;
    return m;
  }

  function makePad(label, color = 0x7fe7ff) {
    const g = new THREE.Group();
    g.name = `Pad_${label}`;

    const base = new THREE.Mesh(
      new THREE.RingGeometry(0.26, 0.40, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.78, side: THREE.DoubleSide })
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = 0.02;
    g.add(base);

    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.02, 28),
      makeNeonMat(0x0b0d14, color, 0.55, 0.95)
    );
    plate.position.y = 0.01;
    g.add(plate);

    const tex = makeSignCanvas(label, "Tap / Trigger", "#7fe7ff");
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(0.92, 0.42),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    sign.position.set(0, 0.62, 0);
    sign.visible = false;
    g.add(sign);

    g.userData = {
      label,
      base,
      sign,
      active: true,
      pulseT: Math.random() * 10,
      onActivate: null
    };

    return g;
  }

  function makeMannequin(sex = "male") {
    const g = new THREE.Group();
    g.name = `Mannequin_${sex}`;

    const skin = new THREE.MeshStandardMaterial({ color: sex === "female" ? 0xd9b6a3 : 0xd2b48c, roughness: 0.65 });
    const suit = new THREE.MeshStandardMaterial({ color: sex === "female" ? 0x1b1020 : 0x111318, roughness: 0.75, metalness: 0.05 });

    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.16), suit);
    hips.position.y = 0.98;
    g.add(hips);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.56, 6, 14), suit);
    torso.position.y = 1.28;
    g.add(torso);

    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.20), suit);
    shoulder.position.y = 1.52;
    g.add(shoulder);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 12), skin);
    head.position.y = 1.72;
    g.add(head);

    const upperArmGeo = new THREE.CapsuleGeometry(0.046, 0.25, 6, 10);
    const foreArmGeo  = new THREE.CapsuleGeometry(0.043, 0.22, 6, 10);
    const handGeo     = new THREE.BoxGeometry(0.065, 0.03, 0.10);

    function arm(side = -1) {
      const root = new THREE.Group();
      root.position.set(0.24 * side, 1.50, 0);

      const upper = new THREE.Mesh(upperArmGeo, suit);
      upper.position.y = -0.14;
      root.add(upper);

      const elbow = new THREE.Group();
      elbow.position.y = -0.30;
      root.add(elbow);

      const fore = new THREE.Mesh(foreArmGeo, suit);
      fore.position.y = -0.11;
      elbow.add(fore);

      const hand = new THREE.Mesh(handGeo, suit);
      hand.position.set(0, -0.28, 0.02);
      elbow.add(hand);

      root.userData = { elbow };
      return root;
    }

    const armL = arm(-1);
    const armR = arm(1);
    g.add(armL, armR);

    const thighGeo = new THREE.CapsuleGeometry(0.058, 0.36, 6, 12);
    const shinGeo  = new THREE.CapsuleGeometry(0.052, 0.32, 6, 12);
    const shoeGeo  = new THREE.BoxGeometry(0.13, 0.05, 0.24);

    function leg(side = -1) {
      const hip = new THREE.Group();
      hip.position.set(0.11 * side, 0.93, 0);

      const thigh = new THREE.Mesh(thighGeo, suit);
      thigh.position.y = -0.20;
      hip.add(thigh);

      const knee = new THREE.Group();
      knee.position.y = -0.44;
      hip.add(knee);

      const shin = new THREE.Mesh(shinGeo, suit);
      shin.position.y = -0.18;
      knee.add(shin);

      const shoe = new THREE.Mesh(shoeGeo, new THREE.MeshStandardMaterial({ color: 0x0b0b0f, roughness: 0.85 }));
      shoe.position.set(0, -0.37, 0.08);
      knee.add(shoe);

      hip.userData = { knee };
      return hip;
    }

    const legL = leg(-1);
    const legR = leg(1);
    g.add(legL, legR);

    g.userData = { armL, armR, legL, legR, sex };
    return g;
  }

  function makeShelf() {
    const g = new THREE.Group();
    g.name = "Shelf";

    const wood = new THREE.MeshStandardMaterial({ color: 0x1b0f0c, roughness: 0.95 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.75, metalness: 0.15 });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.55, 0.35), metal);
    frame.position.y = 0.78;
    g.add(frame);

    for (let i = 0; i < 3; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.06, 0.30), wood);
      plank.position.set(0, 0.38 + i * 0.46, 0);
      g.add(plank);
    }

    return g;
  }

  function makeChipToken(color = 0xff2d7a, accent = 0x7fe7ff) {
    const g = new THREE.Group();
    g.name = "ChipToken";

    const outer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.035, 40),
      new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.2 })
    );
    outer.rotation.x = Math.PI / 2;
    g.add(outer);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.078, 0.012, 10, 40),
      makeNeonMat(accent, accent, 0.6, 0.95)
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.z = 0.020;
    g.add(ring);

    return g;
  }

  function makeCardToken(backColor = 0x141826, edge = 0xff2d7a) {
    const g = new THREE.Group();
    g.name = "CardToken";

    const card = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.22, 0.01),
      new THREE.MeshStandardMaterial({ color: backColor, roughness: 0.55, metalness: 0.05, emissive: edge, emissiveIntensity: 0.12 })
    );
    g.add(card);

    const edgeGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 0.24),
      new THREE.MeshBasicMaterial({ color: edge, transparent: true, opacity: 0.22 })
    );
    edgeGlow.position.z = 0.008;
    g.add(edgeGlow);

    return g;
  }

  function makeProductCarousel() {
    const root = new THREE.Group();
    root.name = "ProductCarousel";

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.80, 0.95, 0.10, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95 })
    );
    base.position.y = 0.05;
    root.add(base);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.86, 0.03, 10, 80),
      makeNeonMat(0x7fe7ff, 0x2bd7ff, 1.1, 0.9)
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.11;
    root.add(rim);

    const items = [];

    const pick = [];
    for (const cat of StoreCatalog.categories) {
      for (const it of cat.items) pick.push({ ...it, cat: cat.id });
    }

    const N = Math.min(8, pick.length);
    for (let i = 0; i < N; i++) {
      const it = pick[i];
      const ang = (i / N) * Math.PI * 2;

      let obj;
      if (it.type === "chip_skin") obj = makeChipToken(0xff2d7a, 0x7fe7ff);
      else if (it.type === "card_back") obj = makeCardToken(0x141826, 0x7fe7ff);
      else if (it.type === "hands") obj = makeChipToken(0x7fe7ff, 0xff2d7a);
      else obj = makeCardToken(0x141826, 0xff2d7a);

      obj.position.set(Math.cos(ang) * 0.65, 0.35, Math.sin(ang) * 0.65);
      obj.rotation.y = -ang;
      obj.userData.storeItem = it;
      obj.userData.spinPhase = Math.random() * 10;
      root.add(obj);
      items.push(obj);
    }

    root.userData.items = items;
    root.userData.spinSpeed = 0.30;

    return root;
  }

  function buildMirrorWall() {
    const root = new THREE.Group();
    root.name = "MirrorWall";

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 0.85, metalness: 0.1 })
    );
    panel.position.set(0, 1.25, -1.35);
    root.add(panel);

    const mirror = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 1.3),
      makeMirrorGlassMat()
    );
    mirror.position.set(0, 1.25, -1.34);
    root.add(mirror);

    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(2.25, 1.35),
      makeGlassMat(0.14)
    );
    glass.position.set(0, 1.25, -1.33);
    root.add(glass);

    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(2.35, 1.45, 0.02),
      makeNeonMat(0x7fe7ff, 0x2bd7ff, 0.9, 0.8)
    );
    trim.position.set(0, 1.25, -1.32);
    root.add(trim);

    root.userData = { mirror, glass };
    return root;
  }

  function buildStoreKiosk({ position, yaw } = {}) {
    const root = new THREE.Group();
    root.name = "StoreKiosk";
    root.position.copy(position);
    root.rotation.y = yaw;

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(2.25, 2.25, 0.10, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95 })
    );
    platform.position.y = 0.05;
    root.add(platform);

    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 2.0, 2.3, 48, 1, true, Math.PI * 0.1, Math.PI * 1.8),
      new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 0.9, metalness: 0.05, side: THREE.DoubleSide })
    );
    shell.position.y = 1.18;
    root.add(shell);

    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 1.75, 1.65, 48, 1, true, Math.PI * 0.15, Math.PI * 0.7),
      makeGlassMat(0.16)
    );
    glass.position.y = 1.22;
    glass.rotation.y = Math.PI * 0.25;
    root.add(glass);

    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(1.92, 0.03, 10, 80),
      makeNeonMat(0x7fe7ff, 0x2bd7ff, 1.25, 0.92)
    );
    trim.rotation.x = Math.PI / 2;
    trim.position.y = 2.12;
    root.add(trim);

    const sign = makeBillboard(1.85, 0.86, "SCARLETT STORE", "Skins • VIP • Cosmetics");
    sign.position.set(0, 2.60, 1.25);
    root.add(sign);

    const man1 = makeMannequin("male");
    man1.position.set(-0.62, 0, -0.40);
    man1.rotation.y = Math.PI * 0.35;
    root.add(man1);

    const man2 = makeMannequin("female");
    man2.position.set(0.62, 0, -0.40);
    man2.rotation.y = -Math.PI * 0.35;
    root.add(man2);

    const shelf = makeShelf();
    shelf.position.set(0, 0, -0.95);
    shelf.rotation.y = Math.PI;
    root.add(shelf);

    const mirrorWall = buildMirrorWall();
    mirrorWall.position.set(0, 0, 0);
    root.add(mirrorWall);
    state.mirrorWall = mirrorWall;

    const carousel = makeProductCarousel();
    carousel.position.set(0, 0, 0.10);
    root.add(carousel);
    state.carousel = carousel;

    const padEnter = makePad("JOIN STORE", 0x7fe7ff);
    padEnter.position.set(0, 0, 1.55);
    root.add(padEnter);

    const padPreview = makePad("PREVIEW", 0xff2d7a);
    padPreview.position.set(-0.9, 0, 1.25);
    root.add(padPreview);

    const padDaily = makePad("DAILY CLAIM", 0xffcc00);
    padDaily.position.set(0.9, 0, 1.25);
    root.add(padDaily);

    padEnter.userData.onActivate = () => openStoreUI();
    padPreview.userData.onActivate = () => previewSpin();
    padDaily.userData.onActivate = () => dailyClaim();

    state.pads.push(padEnter, padPreview, padDaily);

    state.itemBillboard = makeBillboard(1.35, 0.65, "ITEM", "Look at a product");
    state.itemBillboard.name = "StoreItemBillboard";
    state.itemBillboard.position.set(0, 2.15, 0.55);
    state.itemBillboard.visible = false;
    root.add(state.itemBillboard);

    man1.userData.armL.rotation.z = 0.10;
    man1.userData.armR.rotation.z = -0.10;
    man2.userData.armL.rotation.z = 0.10;
    man2.userData.armR.rotation.z = -0.10;

    root.userData = { man1, man2 };

    return root;
  }

  function showItemBillboard(item) {
    if (!state.itemBillboard) return;
    const price = (item?.price != null) ? `${item.price.toLocaleString()} ${StoreCatalog.currencyName}` : "";
    const top = item?.name || "ITEM";
    const bottom = price || "—";
    state.itemBillboard.material.map = makeSignCanvas(top, bottom, "#ff2d7a");
    state.itemBillboard.material.needsUpdate = true;
    state.itemBillboard.visible = true;
    state.itemBillboard.userData.life = 0.25;
  }

  function openStoreUI() {
    L("[store] open UI ✅ (placeholder)");
    showFloatingUI("STORE OPEN", `Wallet: ${state.wallet.chips.toLocaleString()} Chips`);
  }

  function previewSpin() {
    L("[store] preview spin ✅");
    showFloatingUI("PREVIEW", "Rotating showcase…");
    if (state.kiosk) state.kiosk.userData.spinT = 1.4;
  }

  function dailyClaim() {
    const reward = 2500 + Math.floor(Math.random() * 2500);
    state.wallet.chips += reward;
    L("[store] daily claim ✅ +" + reward);
    showFloatingUI("DAILY CLAIM", `+${reward.toLocaleString()} Chips`);
  }

  function showFloatingUI(top, bottom) {
    if (!state.uiBillboard) return;
    state.uiBillboard.material.map = makeSignCanvas(top, bottom, "#7fe7ff");
    state.uiBillboard.material.needsUpdate = true;
    state.uiBillboard.visible = true;
    state.uiBillboard.userData.life = 2.2;
  }

  function buildUIBillboard() {
    const m = makeBillboard(1.5, 0.75, "STORE", "Ready");
    m.name = "StoreBillboardUI";
    m.position.set(0, 2.15, -4.5);
    m.visible = false;
    m.userData.life = 0;
    return m;
  }

  function handlePadFocus(dt) {
    if (!player || !camera) return;

    const camPos = state.tmpV.set(0, 0, 0);
    camera.getWorldPosition(camPos);

    let best = null;
    let bestScore = 0;

    for (const pad of state.pads) {
      if (!pad?.userData?.active) continue;

      const p = state.tmpV2.set(0, 0, 0);
      pad.getWorldPosition(p);

      const d = camPos.distanceTo(p);
      if (d > 4.0) continue;

      const toPad = p.clone().sub(camPos).normalize();
      const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
      const dot = camDir.dot(toPad);

      const score = dot * (1.0 / Math.max(0.25, d));
      if (score > bestScore) { bestScore = score; best = pad; }
    }

    state.lastFocusPad = best || null;

    for (const pad of state.pads) {
      const u = pad.userData;
      u.pulseT += dt;
      const active = (pad === best);

      if (u.base?.material) {
        u.base.material.opacity = active
          ? 0.86 + Math.sin(u.pulseT * 5.0) * 0.10
          : 0.62 + Math.sin(u.pulseT * 3.0) * 0.08;
      }
      if (u.sign) u.sign.visible = active;
    }
  }

  function handleItemGaze(dt) {
    if (!camera || !state.carousel || !state.raycaster) return;

    if (state.itemBillboard?.visible) {
      state.itemBillboard.userData.life -= dt;
      if (state.itemBillboard.userData.life <= 0) state.itemBillboard.visible = false;
    }

    const items = state.carousel.userData.items || [];
    if (!items.length) return;

    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();

    state.raycaster.set(camPos, camDir);
    state.raycaster.far = 6.0;

    const hits = state.raycaster.intersectObjects(items, true);
    if (!hits || !hits.length) {
      state.lastFocusItem = null;
      return;
    }

    let hitObj = hits[0].object;
    while (hitObj && !hitObj.userData?.storeItem && hitObj.parent) hitObj = hitObj.parent;

    if (hitObj?.userData?.storeItem) {
      state.lastFocusItem = hitObj;
      showItemBillboard(hitObj.userData.storeItem);
    } else {
      state.lastFocusItem = null;
    }
  }

  function onAction() {
    if (!state.active) return;

    const pad = state.lastFocusPad;
    if (pad?.userData?.onActivate) return pad.userData.onActivate();

    const it = state.lastFocusItem?.userData?.storeItem;
    if (it) {
      const price = it.price || 0;
      if (state.wallet.chips >= price) {
        state.wallet.chips -= price;
        state.owned.add(it.id);
        showFloatingUI("PURCHASED", `${it.name}`);
        L("[store] purchased ✅", it.id);
      } else {
        showFloatingUI("NOT ENOUGH", `${it.price.toLocaleString()} Chips`);
        L("[store] purchase failed (insufficient) ⚠️", it.id);
      }
    }
  }

  function tick(dt) {
    if (!state.active) return;
    state.t += dt;

    if (state.kiosk?.userData?.spinT > 0) {
      state.kiosk.userData.spinT = Math.max(0, state.kiosk.userData.spinT - dt);
      state.kiosk.rotation.y += dt * 1.6;
    }

    if (state.uiBillboard?.visible) {
      state.uiBillboard.userData.life -= dt;
      if (state.uiBillboard.userData.life <= 0) state.uiBillboard.visible = false;
    }

    if (state.carousel) {
      const sp = state.carousel.userData.spinSpeed || 0.25;
      state.carousel.rotation.y += dt * sp;

      const items = state.carousel.userData.items || [];
      for (const obj of items) {
        const ph = obj.userData.spinPhase || 0;
        obj.position.y = 0.35 + Math.sin(state.t * 2.2 + ph) * 0.03;
        obj.rotation.x = Math.sin(state.t * 1.8 + ph) * 0.08;
      }
    }

    if (state.kiosk?.userData?.man1 && state.kiosk.userData.man2) {
      const { man1, man2 } = state.kiosk.userData;
      const t = state.t;

      man1.userData.armL.rotation.x = -0.20 + Math.sin(t * 1.2) * 0.12;
      man1.userData.armR.rotation.x = -0.20 - Math.sin(t * 1.2) * 0.12;

      man2.userData.armL.rotation.x = -0.22 + Math.sin(t * 1.25 + 1.3) * 0.12;
      man2.userData.armR.rotation.x = -0.22 - Math.sin(t * 1.25 + 1.3) * 0.12;
    }

    handlePadFocus(dt);
    handleItemGaze(dt);
  }

  function _normalizeInitArgs(arg = {}) {
    // Accept init(ctx) OR init({THREE, scene, world, player, camera, log})
    // If caller passed ctx directly, it has THREE/scene/player/camera/log.
    const isCtxShape = !!arg?.THREE && !!arg?.scene && !!arg?.player && !!arg?.camera;
    if (isCtxShape) {
      return {
        THREE: arg.THREE,
        scene: arg.scene,
        world: arg.world || arg,
        player: arg.player,
        camera: arg.camera,
        log: arg.log || console.log,
      };
    }
    return arg;
  }

  function setActive(on) {
    state.active = !!on;
    if (state.root) state.root.visible = !!on;
    if (!on) {
      // hide transient UIs immediately
      if (state.uiBillboard) state.uiBillboard.visible = false;
      if (state.itemBillboard) state.itemBillboard.visible = false;
    }
    L(`[store] setActive(${state.active})`);
  }

  return {
    async init(args = {}) {
      const a = _normalizeInitArgs(args);

      THREE = a.THREE;
      scene = a.scene;
      world = a.world || null;
      log = a.log || console.log;
      player = a.player || null;
      camera = a.camera || null;

      if (!THREE || !scene) throw new Error("StoreSystem.init missing THREE or scene");

      state.raycaster = new THREE.Raycaster();
      state.tmpV = new THREE.Vector3();
      state.tmpV2 = new THREE.Vector3();

      if (state.root) { try { scene.remove(state.root); } catch {} }
      state.root = new THREE.Group();
      state.root.name = "StoreSystem";
      scene.add(state.root);

      state.pads.length = 0;
      state.lastFocusPad = null;
      state.lastFocusItem = null;

      // Determine lobby focus (fallback)
      const tf =
        world?.tableFocus ||
        world?.anchors?.lobby_table_zone?.position ||
        new THREE.Vector3(0, 0, -2.8);

      // ✅ Place store LEFT of lobby focus (as requested)
      state.kiosk = buildStoreKiosk({
        position: new THREE.Vector3(tf.x - 6.2, 0, tf.z),
        yaw: Math.PI / 2
      });
      state.root.add(state.kiosk);

      // floating UI billboard near lobby area
      state.uiBillboard = buildUIBillboard();
      state.root.add(state.uiBillboard);

      if (!state._boundAction) {
        window.addEventListener("scarlett-action", onAction);
        state._boundAction = true;
      }

      // ✅ fallback: pointer click triggers action (helpful if scarlett-action not emitted yet)
      if (!state._boundPointer) {
        window.addEventListener("pointerdown", () => {
          if (!state.active) return;
          // only act if looking at something store-related
          if (state.lastFocusPad || state.lastFocusItem) onAction();
        });
        state._boundPointer = true;
      }

      // visible by default; RoomManager can toggle later
      setActive(true);

      L("[store] init ✅ v1.2 (carousel + gaze + mirror + active toggle)");
      return { tick, onAction, root: state.root, catalog: StoreCatalog, setActive };
    },

    setActive,
    setPlayerRig({ player: p, camera: c } = {}) { player = p || player; camera = c || camera; },

    tick,
    onAction,
    getCatalog() { return StoreCatalog; }
  };
})();
