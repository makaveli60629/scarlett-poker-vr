// /js/store.js — Scarlett VR Poker StoreSystem v1.0
// GitHub Pages safe: no "three" import. main/world will pass THREE.
// Builds a store kiosk/showcase area + interactive pads.
// Does NOT require modifying main.js/world.js yet.
// Integration later: call StoreSystem.init({ THREE, scene: world.group, log, world, player, camera })
// or just init it inside world.js when you're ready.

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
    active: true,
    t: 0,
    lastFocusPad: null,
    // simple “wallet” placeholder for now
    wallet: { chips: 100000 },
    // user-owned cosmetics placeholder
    owned: new Set(),
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const L = (...a) => { try { log(...a); } catch { console.log(...a); } };

  function safeColorSpace(tex) {
    try { tex.colorSpace = THREE.SRGBColorSpace; } catch {}
  }

  async function loadTexture(url) {
    return await new Promise((resolve) => {
      try {
        const loader = new THREE.TextureLoader();
        loader.load(
          url,
          (t) => { safeColorSpace(t); resolve(t); },
          undefined,
          () => resolve(null)
        );
      } catch {
        resolve(null);
      }
    });
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

  function makeSignCanvas(textTop, textBottom) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext("2d");

    ctx.clearRect(0, 0, c.width, c.height);

    // background
    ctx.fillStyle = "rgba(5,6,10,0.72)";
    roundRect(ctx, 40, 70, 944, 372, 36, true);

    // top line
    ctx.font = "bold 72px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#7fe7ff";
    ctx.fillText(textTop, 512, 210);

    // bottom line
    ctx.font = "bold 54px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(textBottom, 512, 310);

    // glow border
    ctx.strokeStyle = "rgba(127,231,255,0.38)";
    ctx.lineWidth = 8;
    roundRect(ctx, 40, 70, 944, 372, 36, false);

    function roundRect(ctx, x, y, w, h, r, fill) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      if (fill) ctx.fill(); else ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    safeColorSpace(tex);
    return tex;
  }

  function makeBillboardSign(w = 1.6, h = 0.8, top = "STORE", bottom = "Cosmetics • Skins • VIP") {
    const tex = makeSignCanvas(top, bottom);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: true });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.name = "StoreSign";
    m.renderOrder = 25;
    return m;
  }

  function makePad(label, color = 0x7fe7ff) {
    const g = new THREE.Group();
    g.name = `Pad_${label}`;

    const base = new THREE.Mesh(
      new THREE.RingGeometry(0.26, 0.40, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = 0.02;
    g.add(base);

    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.02, 28),
      makeNeonMat(0x0b0d14, color, 0.55, 0.92)
    );
    plate.position.y = 0.01;
    g.add(plate);

    // label (canvas)
    const tex = makeSignCanvas(label, "Tap / Trigger");
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(0.92, 0.42),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    sign.position.set(0, 0.62, 0);
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

    // low-poly but more human-like proportions
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.14), suit);
    pelvis.position.y = 0.98;
    g.add(pelvis);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.50, 6, 14), suit);
    torso.position.y = 1.25;
    g.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 18, 12), skin);
    head.position.y = 1.62;
    g.add(head);

    // shoulders
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.18), suit);
    shoulder.position.y = 1.45;
    g.add(shoulder);

    // arms with elbows
    const upperArmGeo = new THREE.CapsuleGeometry(0.045, 0.22, 6, 10);
    const foreArmGeo  = new THREE.CapsuleGeometry(0.042, 0.20, 6, 10);
    const handGeo     = new THREE.BoxGeometry(0.06, 0.03, 0.09);

    function arm(side = -1) {
      const root = new THREE.Group();
      root.position.set(0.22 * side, 1.43, 0);

      const upper = new THREE.Mesh(upperArmGeo, suit);
      upper.position.y = -0.12;
      root.add(upper);

      const elbow = new THREE.Group();
      elbow.position.y = -0.26;
      root.add(elbow);

      const fore = new THREE.Mesh(foreArmGeo, suit);
      fore.position.y = -0.10;
      elbow.add(fore);

      const hand = new THREE.Mesh(handGeo, suit);
      hand.position.set(0, -0.25, 0.02);
      elbow.add(hand);

      root.userData = { elbow };
      return root;
    }

    const armL = arm(-1);
    const armR = arm(1);
    g.add(armL, armR);

    // legs + shoes
    const thighGeo = new THREE.CapsuleGeometry(0.055, 0.33, 6, 12);
    const shinGeo  = new THREE.CapsuleGeometry(0.05, 0.30, 6, 12);
    const shoeGeo  = new THREE.BoxGeometry(0.12, 0.05, 0.22);

    function leg(side = -1) {
      const hip = new THREE.Group();
      hip.position.set(0.10 * side, 0.93, 0);

      const thigh = new THREE.Mesh(thighGeo, suit);
      thigh.position.y = -0.18;
      hip.add(thigh);

      const knee = new THREE.Group();
      knee.position.y = -0.40;
      hip.add(knee);

      const shin = new THREE.Mesh(shinGeo, suit);
      shin.position.y = -0.16;
      knee.add(shin);

      const shoe = new THREE.Mesh(shoeGeo, new THREE.MeshStandardMaterial({ color: 0x0b0b0f, roughness: 0.8 }));
      shoe.position.set(0, -0.35, 0.08);
      knee.add(shoe);

      hip.userData = { knee };
      return hip;
    }

    const legL = leg(-1);
    const legR = leg(1);
    g.add(legL, legR);

    // simple “tag”
    const tag = makeBillboardSign(0.9, 0.35, sex === "female" ? "STORE MODEL" : "STORE MODEL", sex === "female" ? "FEMALE" : "MALE");
    tag.position.set(0, 1.95, 0);
    g.add(tag);

    g.userData = { armL, armR, legL, legR, tag, sex };
    return g;
  }

  function makeShelf() {
    const g = new THREE.Group();
    g.name = "Shelf";

    const wood = new THREE.MeshStandardMaterial({ color: 0x1b0f0c, roughness: 0.9 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.75, metalness: 0.15 });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 0.35), metal);
    frame.position.y = 0.75;
    g.add(frame);

    for (let i = 0; i < 3; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.06, 0.30), wood);
      plank.position.set(0, 0.35 + i * 0.45, 0);
      g.add(plank);
    }

    // little “product blocks”
    const pmat = makeNeonMat(0x0b0d14, 0xff2d7a, 0.45, 0.98);
    for (let i = 0; i < 6; i++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.10, 0.12), pmat);
      box.position.set(-0.50 + (i % 3) * 0.50, 0.40 + Math.floor(i / 3) * 0.45, 0.02);
      g.add(box);
    }

    return g;
  }

  function buildStoreKiosk({ position = new THREE.Vector3(6.0, 0, -6.5), yaw = Math.PI / 2 } = {}) {
    const root = new THREE.Group();
    root.name = "StoreKiosk";
    root.position.copy(position);
    root.rotation.y = yaw;

    // platform
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 0.10, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95 })
    );
    platform.position.y = 0.05;
    root.add(platform);

    // back wall (kiosk shell)
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 2.0, 2.2, 48, 1, true, Math.PI * 0.1, Math.PI * 1.8),
      new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 0.9, metalness: 0.05, side: THREE.DoubleSide })
    );
    shell.position.y = 1.15;
    root.add(shell);

    // glass window arc
    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 1.75, 1.6, 48, 1, true, Math.PI * 0.15, Math.PI * 0.7),
      makeGlassMat(0.16)
    );
    glass.position.y = 1.20;
    glass.rotation.y = Math.PI * 0.25;
    root.add(glass);

    // neon trim ring
    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(1.92, 0.03, 10, 80),
      makeNeonMat(0x7fe7ff, 0x2bd7ff, 1.25, 0.95)
    );
    trim.rotation.x = Math.PI / 2;
    trim.position.y = 2.10;
    root.add(trim);

    // store sign
    const sign = makeBillboardSign(1.8, 0.85, "SCARLETT STORE", "Skins • VIP • Cosmetics");
    sign.position.set(0, 2.55, 1.25);
    root.add(sign);

    // mannequins behind glass
    const man1 = makeMannequin("male");
    man1.position.set(-0.55, 0, -0.40);
    man1.rotation.y = Math.PI * 0.35;
    root.add(man1);

    const man2 = makeMannequin("female");
    man2.position.set(0.55, 0, -0.40);
    man2.rotation.y = -Math.PI * 0.35;
    root.add(man2);

    // shelves inside
    const shelf = makeShelf();
    shelf.position.set(0, 0, -0.95);
    shelf.rotation.y = Math.PI;
    root.add(shelf);

    // interactive pads (outside, so player can step up)
    const padEnter = makePad("JOIN STORE", 0x7fe7ff);
    padEnter.position.set(0, 0, 1.55);
    root.add(padEnter);

    const padPreview = makePad("PREVIEW", 0xff2d7a);
    padPreview.position.set(-0.9, 0, 1.25);
    root.add(padPreview);

    const padDaily = makePad("DAILY CLAIM", 0xffcc00);
    padDaily.position.set(0.9, 0, 1.25);
    root.add(padDaily);

    // actions
    padEnter.userData.onActivate = () => openStoreUI();
    padPreview.userData.onActivate = () => previewSpin();
    padDaily.userData.onActivate = () => dailyClaim();

    state.pads.push(padEnter, padPreview, padDaily);

    return root;
  }

  function openStoreUI() {
    L("[store] open UI ✅ (placeholder)");
    // Later: replace with real wrist menu / 3D UI.
    showBillboard(`STORE OPEN`, `Wallet: $${state.wallet.chips.toLocaleString()}`);
  }

  function previewSpin() {
    L("[store] preview spin ✅");
    showBillboard("PREVIEW", "Rotating showcase…");
    // simple effect: spin kiosk for a second
    state.kiosk.userData.spinT = 1.2;
  }

  function dailyClaim() {
    const reward = 2500 + Math.floor(Math.random() * 2500);
    state.wallet.chips += reward;
    L("[store] daily claim ✅ +" + reward);
    showBillboard("DAILY CLAIM", `+${reward.toLocaleString()} Chips`);
  }

  function showBillboard(top, bottom) {
    if (!state.uiBillboard) return;
    try {
      state.uiBillboard.material.map = makeSignCanvas(top, bottom);
      state.uiBillboard.material.needsUpdate = true;
      state.uiBillboard.visible = true;
      state.uiBillboard.userData.life = 2.2;
    } catch {}
  }

  function buildUIBillboard() {
    const tex = makeSignCanvas("STORE", "Ready");
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.7),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    m.name = "StoreBillboardUI";
    m.position.set(0, 2.15, -4.5);
    m.visible = false;
    m.renderOrder = 30;
    m.userData.life = 0;
    return m;
  }

  // Basic “activate pad” if player is near + looking at it
  function handlePadFocus(dt) {
    if (!player || !camera) return;

    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);

    let best = null;
    let bestScore = 0;

    for (const pad of state.pads) {
      if (!pad?.userData?.active) continue;

      const p = new THREE.Vector3();
      pad.getWorldPosition(p);

      const d = camPos.distanceTo(p);
      if (d > 4.0) continue;

      // facing check (dot)
      const toPad = p.clone().sub(camPos).normalize();
      const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
      const dot = camDir.dot(toPad);

      const score = dot * (1.0 / Math.max(0.25, d));
      if (score > bestScore) {
        bestScore = score;
        best = pad;
      }
    }

    state.lastFocusPad = best || null;

    // subtle highlight pulse
    for (const pad of state.pads) {
      const u = pad.userData;
      u.pulseT += dt;
      const active = (pad === best);
      const base = u.base;
      if (base?.material) {
        base.material.opacity = active
          ? 0.82 + Math.sin(u.pulseT * 5.0) * 0.12
          : 0.62 + Math.sin(u.pulseT * 3.0) * 0.10;
      }
      if (u.sign) u.sign.visible = active; // show label only when focused
    }
  }

  function onAction() {
    // called when you press your “action” button later (or by event)
    const pad = state.lastFocusPad;
    if (pad?.userData?.onActivate) {
      pad.userData.onActivate();
    }
  }

  function tick(dt) {
    state.t += dt;

    // kiosk spin preview
    if (state.kiosk?.userData?.spinT > 0) {
      state.kiosk.userData.spinT = Math.max(0, state.kiosk.userData.spinT - dt);
      state.kiosk.rotation.y += dt * 1.6;
    }

    // billboard lifetime
    if (state.uiBillboard?.visible) {
      state.uiBillboard.userData.life -= dt;
      if (state.uiBillboard.userData.life <= 0) state.uiBillboard.visible = false;
    }

    handlePadFocus(dt);
  }

  return {
    async init({ THREE: _THREE, scene: _scene, world: _world, player: _player, camera: _camera, log: _log } = {}) {
      THREE = _THREE;
      scene = _scene;
      world = _world || null;
      log = _log || console.log;
      player = _player || null;
      camera = _camera || null;

      if (!THREE || !scene) throw new Error("StoreSystem.init missing THREE or scene");

      // root
      if (state.root) { try { scene.remove(state.root); } catch {} }
      state.root = new THREE.Group();
      state.root.name = "StoreSystem";
      scene.add(state.root);

      state.pads.length = 0;
      state.lastFocusPad = null;

      // place store on RIGHT side by default (you asked left/right, not front/back)
      // We'll mirror later for poker door too in world.js.
      const tf = world?.tableFocus || new THREE.Vector3(0, 0, -6.5);

      // right side store kiosk
      state.kiosk = buildStoreKiosk({
        position: new THREE.Vector3(tf.x + 6.2, 0, tf.z),
        yaw: -Math.PI / 2
      });
      state.root.add(state.kiosk);

      // floating UI billboard in the “air space” near the table
      state.uiBillboard = buildUIBillboard();
      state.root.add(state.uiBillboard);

      // Listen for a global action event (your index/main already dispatches scarlett-action sometimes)
      window.addEventListener("scarlett-action", onAction);

      L("[store] init ✅ kiosk + pads ready");
      return { tick, onAction, root: state.root, catalog: StoreCatalog };
    },

    setPlayerRig({ player: p, camera: c } = {}) { player = p || player; camera = c || camera; },

    tick,
    onAction,
    getCatalog() { return StoreCatalog; }
  };
})();
