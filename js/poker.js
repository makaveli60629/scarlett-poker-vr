// /js/poker.js — PokerJS System v1.0 (Smooth Deal + Chips)
// Designed to be imported by world.js.
// ✅ Bezier + lerp feel (no teleport)
// ✅ No dependencies on core controls

export const PokerJS = (() => {
  const S = {
    THREE: null,
    root: null,
    scene: null,
    log: console.log,
    tex: { cardBack: null, tableTop: null, chips: null },
    deckPos: null,
    activeAnims: [],
    cards: [],
    chips: [],
    potPos: null,
    community: [],
    winnerDemoDone: false,
    cam: null,
    tmpV: null,
    tmpDir: null,

  };

  function init({ THREE, scene, root, log, deckPos, potPos, textures = {}, camera = null }) {
    S.THREE = THREE;
    S.scene = scene;
    S.root = root;
    S.log = log || console.log;
    S.deckPos = deckPos?.clone?.() || new THREE.Vector3(0, 1.05, 0);
    S.potPos = potPos?.clone?.() || new THREE.Vector3(0, 1.02, 0);
    S.cam = camera;
    S.tmpV = new THREE.Vector3();
    S.tmpDir = new THREE.Vector3();
    S.tex = { ...S.tex, ...textures };

    S.log?.("[poker] PokerJS init ✅");
    return api();
  }

  function api() {
    return {
      createCard,
      dealCardTo,
      createChipStack,
      betToPot,
      update,
      state: S
    };
  }

  function _cardMaterials(frontMap = null) {
    const THREE = S.THREE;
    const edge = new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 0.8, metalness: 0.05 });
    const back = new THREE.MeshStandardMaterial({ map: S.tex.cardBack || null, color: 0xffffff, roughness: 0.6, metalness: 0.1 });
    const front = new THREE.MeshStandardMaterial({ map: frontMap || null, color: 0xffffff, roughness: 0.6, metalness: 0.1 });

    // BoxGeometry material order: +x,-x,+y,-y,+z,-z (varies by three version).
    // We'll set all faces and accept minor mapping differences; visual still good.
    return [edge, edge, front, back, edge, edge];
  }

  function createCard({ frontMap = null } = {}) {
    const THREE = S.THREE;
    const geo = new THREE.BoxGeometry(0.06, 0.0018, 0.09);
    const card = new THREE.Mesh(geo, _cardMaterials(frontMap));
    card.castShadow = true;
    card.receiveShadow = true;
    card.position.copy(S.deckPos);
    card.userData.isCard = true;
    S.root.add(card);
    S.cards.push(card);
    return card;
  }

  function _bezier3(p0, p1, p2, t, out) {
    // quadratic bezier
    const u = 1 - t;
    out.set(
      u*u*p0.x + 2*u*t*p1.x + t*t*p2.x,
      u*u*p0.y + 2*u*t*p1.y + t*t*p2.y,
      u*u*p0.z + 2*u*t*p1.z + t*t*p2.z
    );
    return out;
  }

  function dealCardTo({ card = null, toPos, faceUp = false, duration = 0.55, arcHeight = 0.25 } = {}) {
    const THREE = S.THREE;
    if (!card) card = createCard();

    const from = card.position.clone();
    const to = toPos.clone();
    const mid = from.clone().lerp(to, 0.5);
    mid.y += arcHeight;

    // start face-down; flip near end if faceUp
    card.rotation.set(-Math.PI / 2, 0, 0);
    const tmp = new THREE.Vector3();

    const anim = {
      t: 0,
      duration,
      update(dt) {
        this.t = Math.min(1, this.t + dt / duration);

        _bezier3(from, mid, to, this.t, tmp);
        card.position.copy(tmp);

        // subtle travel spin
        card.rotation.z = (1 - this.t) * 0.25;

        // flip
        if (faceUp) {
          const flipT = Math.max(0, (this.t - 0.65) / 0.35);
          card.rotation.x = -Math.PI / 2 + flipT * (Math.PI);
        }

        if (this.t >= 1) return true;
        return false;
      }
    };

    S.activeAnims.push(anim);
    return card;
  }

  function createChipStack({ pos, count = 10, value = 25 } = {}) {
    const THREE = S.THREE;
    const group = new THREE.Group();
    group.position.copy(pos || new THREE.Vector3(1.0, 1.02, 0.0));
    group.userData.isChipStack = true;
    group.userData.value = value;

    const geo = new THREE.CylinderGeometry(0.022, 0.022, 0.007, 28);
    const mat = new THREE.MeshStandardMaterial({
      color: value >= 100 ? 0xffd36a : value >= 25 ? 0x66ccff : 0xff6bd6,
      emissive: value >= 100 ? 0x553300 : 0x001a33,
      emissiveIntensity: 0.35,
      roughness: 0.35,
      metalness: 0.25
    });

    for (let i = 0; i < count; i++) {
      const chip = new THREE.Mesh(geo, mat);
      chip.position.y = i * 0.0075;
      chip.castShadow = true;
      chip.receiveShadow = true;
      group.add(chip);
    }

    S.root.add(group);
    S.chips.push(group);
    return group;
  }

  function betToPot({ stack, amount = 1 } = {}) {
    const THREE = S.THREE;
    if (!stack || !stack.children?.length) return;

    const chipsToMove = [];
    for (let i = 0; i < amount; i++) {
      const chip = stack.children.pop();
      if (!chip) break;
      chipsToMove.push(chip);
    }
    if (!chipsToMove.length) return;

    const from = new THREE.Vector3();
    stack.getWorldPosition(from);

    const to = S.potPos.clone();
    to.y += 0.01 + (S.root.children.length % 6) * 0.004;

    // move chips as a mini-group
    const g = new THREE.Group();
    g.position.copy(from);
    for (const c of chipsToMove) g.add(c);
    S.root.add(g);

    const mid = from.clone().lerp(to, 0.5);
    mid.y += 0.20;

    const tmp = new THREE.Vector3();
    const anim = {
      t: 0,
      duration: 0.45,
      update(dt) {
        this.t = Math.min(1, this.t + dt / this.duration);
        _bezier3(from, mid, to, this.t, tmp);
        g.position.copy(tmp);
        if (this.t >= 1) {
          // drop chips into pot area (detach)
          const pot = new THREE.Group();
          pot.position.copy(to);
          for (const c of [...g.children]) pot.add(c);
          S.root.add(pot);
          S.root.remove(g);
          return true;
        }
        return false;
      }
    };
    S.activeAnims.push(anim);
  }

  function update(dt) {
    // run animations
    const a = S.activeAnims;
    for (let i = a.length - 1; i >= 0; i--) {
      const done = a[i].update(dt);
      if (done) a.splice(i, 1);
    }
  }

  return { init };
})();
