// SCARLETT • Avatar Packet v4.8
// world.js: AvatarSystem brain (hand tracking only) + avatar body + clothes + mirror + teleport + MR + export

/*
  Design goals:
  - Single source of truth: #cameraRig for position, scale (calibration), and locomotion.
  - No recalibration loops: uses localStorage key vr_persistent_height.
  - Laser anchored to right hand; pinch = click.
  - Visual haptics: laser color/pulse on hover.
  - Wrist menu anchored to left hand.
  - Teleport: laser hits floor => ring cursor, pinch to move.
  - Mirror: clones avatar body into mirror space (simple, cheap, stable).
  - Clothing: slot-based attachments (fast) with fallback to skinned if you add .glb later.
*/

const AvatarSystem = {
  version: '4.8',

  settings: {
    heightKey: 'vr_persistent_height',
    defaultScale: 1.0,
  },

  hapticSettings: {
    activeColor: '#00FFFF',
    targetColor: '#FF00FF',
    pulseSpeed: 150,
  },

  state: {
    currentScale: 1.0,
    outfitIndex: 0,
    mrEnabled: false,
  },

  el: {
    scene: null,
    rig: null,
    head: null,
    leftHand: null,
    rightHand: null,
    laser: null,
    cursor: null,
    floor: null,
    wristMenu: null,
  },

  // ---------- 1) Calibration / persistence ----------
  initCalibration() {
    const saved = parseFloat(localStorage.getItem(this.settings.heightKey) || String(this.settings.defaultScale));
    this.state.currentScale = Number.isFinite(saved) ? saved : this.settings.defaultScale;
    this.applyScale(this.state.currentScale);
    console.log('[AvatarSystem] calibration restored', this.state.currentScale);
  },

  applyScale(val) {
    const v = Math.max(0.5, Math.min(1.6, Number(val) || this.settings.defaultScale));
    this.state.currentScale = v;
    if (this.el.rig) this.el.rig.setAttribute('scale', `${v} ${v} ${v}`);
    localStorage.setItem(this.settings.heightKey, String(v));
  },

  calibrate(val) {
    this.applyScale(val);
    console.log('[AvatarSystem] calibration saved', this.state.currentScale);
  },

  // ---------- 2) Laser + visual haptics ----------
  initLaser() {
    const right = this.el.rightHand;
    if (!right) return;

    const laser = document.createElement('a-entity');
    laser.setAttribute('id', 'avatar-laser');
    laser.setAttribute('raycaster', 'objects: .interactable; showLine: true; far: 20; interval: 0');
    laser.setAttribute('line', `color: ${this.hapticSettings.activeColor}; opacity: 0.55`);

    // Small forward nudge; stable even if hand mesh origin is palm
    laser.setAttribute('position', '0 0 -0.02');
    right.appendChild(laser);
    this.el.laser = laser;

    // Visual haptics
    laser.addEventListener('raycaster-intersection', () => {
      laser.setAttribute('line', 'color', this.hapticSettings.targetColor);
      laser.setAttribute('line', 'opacity', '1.0');
      laser.setAttribute('animation__pulse', `property: line.opacity; from: 1; to: 0.35; dur: ${this.hapticSettings.pulseSpeed}; loop: true; dir: alternate`);
    });

    laser.addEventListener('raycaster-intersection-cleared', () => {
      laser.setAttribute('line', 'color', this.hapticSettings.activeColor);
      laser.setAttribute('line', 'opacity', '0.55');
      laser.removeAttribute('animation__pulse');
    });

    console.log('[AvatarSystem] laser ready');
  },

  // Pinch -> click (primary interaction)
  initPinchClick() {
    const right = this.el.rightHand;
    if (!right) return;

    right.addEventListener('pinchstarted', () => {
      const laser = this.el.laser;
      if (!laser || !laser.components || !laser.components.raycaster) return;

      // Prefer any interactable hit
      const hits = laser.components.raycaster.intersections || [];
      if (hits.length) {
        const el = hits[0].object?.el;
        if (el) {
          el.emit('click');
          return;
        }
      }

      // Fallback: try A-Frame helper
      try {
        const intersection = laser.components.raycaster.getIntersection();
        if (intersection && intersection.el) intersection.el.emit('click');
      } catch (_) {}
    });

    console.log('[AvatarSystem] pinch->click ready');
  },

  // ---------- 3) Wrist menu (palm look gesture) ----------
  initWristMenu() {
    const menu = this.el.wristMenu;
    const left = this.el.leftHand;
    if (!menu || !left) return;

    // Buttons
    const btnReset = document.querySelector('#btn-reset');
    const btnExport = document.querySelector('#btn-export');
    const btnOutfit = document.querySelector('#btn-outfit');
    const btnMR = document.querySelector('#btn-mr');

    btnReset?.addEventListener('click', () => this.calibrate(1.0));
    btnExport?.addEventListener('click', () => this.exportSystemData());
    btnOutfit?.addEventListener('click', () => this.nextOutfit());
    btnMR?.addEventListener('click', () => this.toggleMR());

    // Palm-facing detection (better than y-rotation checks)
    // We approximate: if palm normal points roughly toward head, show menu.
    const headObj = this.el.head?.object3D;
    const handObj = left.object3D;
    const tmpV1 = new THREE.Vector3();
    const tmpV2 = new THREE.Vector3();
    const palmNormal = new THREE.Vector3(0, 0, 1); // local forward guess

    const tick = () => {
      if (!headObj || !handObj) return;
      handObj.getWorldPosition(tmpV1);
      headObj.getWorldPosition(tmpV2);

      // vector from hand to head
      const toHead = tmpV2.sub(tmpV1).normalize();

      // palm forward in world space
      const palmWorld = palmNormal.clone().applyQuaternion(handObj.getWorldQuaternion(new THREE.Quaternion())).normalize();

      const dot = palmWorld.dot(toHead); // 1 = facing head
      const shouldShow = dot > 0.55; // tuned

      menu.setAttribute('visible', shouldShow ? 'true' : 'false');
    };

    // Lightweight interval (10 fps)
    setInterval(tick, 100);
    console.log('[AvatarSystem] wrist menu ready');
  },

  // ---------- 4) Teleportation ----------
  initTeleport() {
    const laser = this.el.laser;
    const cursor = this.el.cursor;
    const floor = this.el.floor;
    const rig = this.el.rig;
    if (!laser || !cursor || !floor || !rig) return;

    const updateCursor = () => {
      try {
        const hit = laser.components.raycaster.getIntersection(floor);
        if (hit && hit.point) {
          cursor.setAttribute('position', hit.point);
          cursor.setAttribute('visible', 'true');
        } else {
          cursor.setAttribute('visible', 'false');
        }
      } catch (_) {
        cursor.setAttribute('visible', 'false');
      }
    };

    setInterval(updateCursor, 50);

    this.el.rightHand.addEventListener('pinchstarted', () => {
      try {
        const hit = laser.components.raycaster.getIntersection(floor);
        if (hit && hit.point) {
          const p = hit.point;
          // keep rig on ground (y = 0) and preserve head height
          const y = rig.object3D.position.y;
          rig.setAttribute('animation__teleport', {
            property: 'position',
            to: `${p.x} ${y} ${p.z}`,
            dur: 220,
            easing: 'easeOutQuad'
          });
        }
      } catch (_) {}
    });

    console.log('[AvatarSystem] teleport ready');
  },

  // ---------- 5) Mixed Reality / passthrough ----------
  toggleMR(force) {
    const scene = this.el.scene;
    if (!scene) return;

    const next = typeof force === 'boolean' ? force : !this.state.mrEnabled;
    this.state.mrEnabled = next;

    if (next) {
      // Enable transparent renderer and remove background so passthrough can show.
      scene.removeAttribute('background');
      scene.setAttribute('renderer', 'alpha: true; antialias: true');
      console.log('[AvatarSystem] MR enabled');
    } else {
      scene.setAttribute('background', 'color: #111');
      scene.setAttribute('renderer', 'alpha: false; antialias: true');
      console.log('[AvatarSystem] MR disabled');
    }
  },

  initMRPortal() {
    const lens = document.querySelector('#portal-lens');
    if (!lens) return;
    lens.addEventListener('click', () => this.toggleMR());
  },

  // ---------- 6) Export tool ----------
  exportSystemData() {
    const sessionData = {
      version: this.version,
      timestamp: new Date().toISOString(),
      calibration: {
        scale: String(localStorage.getItem(this.settings.heightKey) || this.settings.defaultScale),
      },
      activeModules: [
        'HandTracking',
        'Laser',
        'VisualHaptics',
        'WristMenu',
        'Teleport',
        'MirrorClone',
        'ClothingSlots',
        'PassthroughToggle'
      ],
      manifest: 'Hand-tracking only, modular AvatarSystem',
    };

    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'SCARLETT_VR_Manifest_v4_8.json';
    a.click();

    console.log('[AvatarSystem] exported manifest');
  },

  // ---------- 7) Clothing / outfits ----------
  outfits: [
    { name: 'Hoodie', top: { color: '#2B2B30' }, bottom: { color: '#1E1E22' }, shoes: { color: '#3A3A40' } },
    { name: 'Casino Suit', top: { color: '#111111' }, bottom: { color: '#111111' }, shoes: { color: '#2F2F2F' }, accent: { color: '#FF00FF' } },
    { name: 'Street', top: { color: '#3B4CCA' }, bottom: { color: '#202020' }, shoes: { color: '#EDEDED' } },
    { name: 'VIP', top: { color: '#6A1B9A' }, bottom: { color: '#1A1A1A' }, shoes: { color: '#111111' }, accent: { color: '#00FFFF' } },
  ],

  nextOutfit() {
    this.state.outfitIndex = (this.state.outfitIndex + 1) % this.outfits.length;
    const outfit = this.outfits[this.state.outfitIndex];
    const body = document.querySelector('#avatarBody');
    body?.components?.['avatar-body']?.applyOutfit?.(outfit);
    console.log('[AvatarSystem] outfit', this.state.outfitIndex, outfit.name);
  },

  // ---------- Boot ----------
  boot() {
    this.el.scene = document.querySelector('#scene');
    this.el.rig = document.querySelector('#cameraRig');
    this.el.head = document.querySelector('#head');
    this.el.leftHand = document.querySelector('#left-hand');
    this.el.rightHand = document.querySelector('#right-hand');
    this.el.cursor = document.querySelector('#teleport-cursor');
    this.el.floor = document.querySelector('#floor');
    this.el.wristMenu = document.querySelector('#wrist-menu');

    // expose for debugging
    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.AvatarSystem = this;

    this.initCalibration();
    this.initLaser();
    this.initPinchClick();
    this.initWristMenu();
    this.initTeleport();
    this.initMRPortal();

    // Start on first outfit
    this.nextOutfit();

    console.log('[AvatarSystem] ready ✅');
  },
};

// ---------- A-Frame components ----------

AFRAME.registerComponent('avatar-body', {
  init() {
    // Attach to cameraRig so it never drifts away from the tracking origin.
    const rig = document.querySelector('#cameraRig');
    if (rig) rig.appendChild(this.el);

    // Build a clean, smooth, low-poly full body (placeholder until you swap in glTF)
    // This is intentionally lightweight (Quest-friendly).
    this.el.setAttribute('position', '0 0 0');

    this.parts = {};
    this.slots = { top: null, bottom: null, shoes: null, accent: null };

    // Body root (torso reference)
    const torso = document.createElement('a-entity');
    torso.setAttribute('id', 'avatar_torso');
    torso.setAttribute('geometry', 'primitive: capsule; radius: 0.14; height: 0.46');
    torso.setAttribute('material', 'color: #FFD2B8; roughness: 0.9; metalness: 0');
    torso.setAttribute('position', '0 1.15 0');
    this.el.appendChild(torso);

    // Head
    const head = document.createElement('a-entity');
    head.setAttribute('geometry', 'primitive: sphere; radius: 0.11; segmentsWidth: 18; segmentsHeight: 14');
    head.setAttribute('material', 'color: #FFD2B8; roughness: 0.8; metalness: 0');
    head.setAttribute('position', '0 1.55 0');
    this.el.appendChild(head);

    // Neck ring accent
    const collar = document.createElement('a-entity');
    collar.setAttribute('geometry', 'primitive: torus; radius: 0.10; radiusTubular: 0.012; segmentsTubular: 24');
    collar.setAttribute('material', 'color: #00FFFF; roughness: 0.6; metalness: 0');
    collar.setAttribute('rotation', '90 0 0');
    collar.setAttribute('position', '0 1.40 0');
    this.el.appendChild(collar);

    // Arms (simple)
    const mkLimb = (pos, rotY) => {
      const limb = document.createElement('a-entity');
      limb.setAttribute('geometry', 'primitive: capsule; radius: 0.05; height: 0.34');
      limb.setAttribute('material', 'color: #FFD2B8; roughness: 0.92; metalness: 0');
      limb.setAttribute('position', pos);
      limb.setAttribute('rotation', `0 ${rotY} 90`);
      return limb;
    };
    this.el.appendChild(mkLimb('0.28 1.20 0', 0));
    this.el.appendChild(mkLimb('-0.28 1.20 0', 0));

    // Legs
    const mkLeg = (x) => {
      const leg = document.createElement('a-entity');
      leg.setAttribute('geometry', 'primitive: capsule; radius: 0.06; height: 0.48');
      leg.setAttribute('material', 'color: #FFD2B8; roughness: 0.92; metalness: 0');
      leg.setAttribute('position', `${x} 0.72 0`);
      return leg;
    };
    this.el.appendChild(mkLeg(0.10));
    this.el.appendChild(mkLeg(-0.10));

    // Clothing anchor entities
    const topSlot = document.createElement('a-entity');
    topSlot.setAttribute('id', 'slot_top');
    topSlot.setAttribute('position', '0 1.15 0');
    this.el.appendChild(topSlot);

    const bottomSlot = document.createElement('a-entity');
    bottomSlot.setAttribute('id', 'slot_bottom');
    bottomSlot.setAttribute('position', '0 0.85 0');
    this.el.appendChild(bottomSlot);

    const shoesSlot = document.createElement('a-entity');
    shoesSlot.setAttribute('id', 'slot_shoes');
    shoesSlot.setAttribute('position', '0 0.45 0');
    this.el.appendChild(shoesSlot);

    const accentSlot = document.createElement('a-entity');
    accentSlot.setAttribute('id', 'slot_accent');
    accentSlot.setAttribute('position', '0 1.40 0');
    this.el.appendChild(accentSlot);

    this.slots.top = topSlot;
    this.slots.bottom = bottomSlot;
    this.slots.shoes = shoesSlot;
    this.slots.accent = accentSlot;

    // Hide body when not in VR? No — keep visible for mirror + presence.
  },

  clearSlot(slotEl) {
    if (!slotEl) return;
    while (slotEl.firstChild) slotEl.removeChild(slotEl.firstChild);
  },

  applyOutfit(outfit) {
    // outfit: {top:{color}, bottom:{color}, shoes:{color}, accent:{color}}
    const top = outfit?.top || { color: '#2B2B30' };
    const bottom = outfit?.bottom || { color: '#1E1E22' };
    const shoes = outfit?.shoes || { color: '#3A3A40' };
    const accent = outfit?.accent || { color: '#00FFFF' };

    // Top (hoodie-like shell)
    this.clearSlot(this.slots.top);
    const topShell = document.createElement('a-entity');
    topShell.setAttribute('geometry', 'primitive: capsule; radius: 0.155; height: 0.50');
    topShell.setAttribute('material', `color: ${top.color}; roughness: 0.98; metalness: 0.0; opacity: 0.98; transparent: true`);
    topShell.setAttribute('position', '0 0 0');
    this.slots.top.appendChild(topShell);

    // Bottom (pants shell)
    this.clearSlot(this.slots.bottom);
    const pants = document.createElement('a-entity');
    pants.setAttribute('geometry', 'primitive: cylinder; radius: 0.18; height: 0.44; segmentsRadial: 14');
    pants.setAttribute('material', `color: ${bottom.color}; roughness: 0.98; metalness: 0.0`);
    pants.setAttribute('position', '0 0 0');
    this.slots.bottom.appendChild(pants);

    // Shoes (simple blocks)
    this.clearSlot(this.slots.shoes);
    const mkShoe = (x) => {
      const shoe = document.createElement('a-box');
      shoe.setAttribute('width', '0.12');
      shoe.setAttribute('height', '0.06');
      shoe.setAttribute('depth', '0.22');
      shoe.setAttribute('material', `color: ${shoes.color}; roughness: 0.9; metalness: 0.0`);
      shoe.setAttribute('position', `${x} -0.05 0.05`);
      return shoe;
    };
    this.slots.shoes.appendChild(mkShoe(0.10));
    this.slots.shoes.appendChild(mkShoe(-0.10));

    // Accent (collar ring override)
    this.clearSlot(this.slots.accent);
    const ring = document.createElement('a-entity');
    ring.setAttribute('geometry', 'primitive: torus; radius: 0.10; radiusTubular: 0.010; segmentsTubular: 24');
    ring.setAttribute('material', `color: ${accent.color}; roughness: 0.6; metalness: 0`);
    ring.setAttribute('rotation', '90 0 0');
    ring.setAttribute('position', '0 0 0');
    this.slots.accent.appendChild(ring);
  }
});

AFRAME.registerComponent('mirror-clone', {
  schema: {
    target: { type: 'selector' },
    mirror: { type: 'selector' },
  },

  init() {
    this.clone = null;
    this.tmpT = new THREE.Vector3();
    this.tmpM = new THREE.Vector3();
    this.tmpLocal = new THREE.Vector3();
    this.tmpQuat = new THREE.Quaternion();

    // Build a simple clone of target's mesh tree by cloning DOM subtree once.
    // For performance: we clone only the rendered geometry (A-Frame entities) under #avatarBody.
    if (this.data.target) {
      this.clone = this.data.target.cloneNode(true);
      this.clone.setAttribute('id', 'avatarBody_mirrorClone');
      this.clone.removeAttribute('avatar-body'); // avoid rebuilding inside clone
      this.el.appendChild(this.clone);
    }
  },

  tick() {
    if (!this.clone || !this.data.target || !this.data.mirror) return;

    const tgt = this.data.target.object3D;
    const mirror = this.data.mirror.object3D;

    // World positions
    tgt.getWorldPosition(this.tmpT);
    mirror.getWorldPosition(this.tmpM);

    // Convert target position into mirror-local space
    mirror.worldToLocal(this.tmpLocal.copy(this.tmpT));

    // Mirror across plane: flip X in mirror-local space
    this.tmpLocal.x *= -1;

    // Place clone in mirror space (slightly in front of mirror to avoid z-fight)
    const outWorld = this.tmpLocal.clone();
    mirror.localToWorld(outWorld);

    this.clone.object3D.position.copy(outWorld);

    // Orientation: approximate by copying rig yaw (good enough for a “full-body mirror” feel)
    // (True reflection of quaternion is more involved; this is stable and avoids jitter.)
    tgt.getWorldQuaternion(this.tmpQuat);
    this.clone.object3D.quaternion.copy(this.tmpQuat);

    // Scale follows
    this.clone.object3D.scale.copy(tgt.scale);
  }
});

// ---------- Startup ----------
window.addEventListener('load', () => {
  try {
    AvatarSystem.boot();

    // Small demo: click test button
    const btn = document.querySelector('#test-button');
    btn?.addEventListener('click', () => console.log('[AvatarSystem] TEST button clicked ✅'));
  } catch (e) {
    console.error('[AvatarSystem] boot failure', e);
  }
});
